import pool from "../config/database.js";
import {
  countAssignments,
  findAssignmentById,
  findAssignmentForUpdate,
  findAssignmentMachineForUpdate,
  findAssignmentUserForUpdate,
  findAssignments,
  insertAssignment,
  updateAssignmentStatus,
} from "../repositories/assignment.repository.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validatePositiveInteger = (value, field) => {
  const isPositiveIntegerNumber =
    typeof value === "number" && Number.isSafeInteger(value) && value > 0;
  const isPositiveIntegerString =
    typeof value === "string" &&
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0;

  if (!isPositiveIntegerNumber && !isPositiveIntegerString) {
    throw createError(`${field} debe ser un entero positivo`, 400);
  }

  return Number(value);
};

const validatePage = (value, field, defaultValue, maximum) => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = validatePositiveInteger(value, field);

  if (normalized > maximum) {
    throw createError(`${field} no puede superar ${maximum}`, 400);
  }

  return normalized;
};

const validateActiveFilter = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return 1;
  }

  if (value === "false") {
    return 0;
  }

  throw createError("El filtro activo debe ser la cadena true o false", 400);
};

const validateBoolean = (value, field) => {
  if (typeof value !== "boolean") {
    throw createError(`${field} debe ser un booleano`, 400);
  }

  return value;
};

const validateObject = (value, field) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createError(`${field} debe ser un objeto`, 400);
  }

  return value;
};

const assertAdministrator = (authenticatedUser) => {
  if (authenticatedUser?.rol !== "administrador") {
    throw createError("No tiene permisos para realizar esta acción", 403);
  }
};

const validateAssignableEntities = (user, machine) => {
  if (!user) {
    throw createError("El usuario no existe", 404);
  }

  if (!user.activo) {
    throw createError("El usuario se encuentra inactivo", 400);
  }

  if (!user.rol_activo) {
    throw createError("El rol del usuario se encuentra inactivo", 400);
  }

  if (user.rol !== "operario") {
    throw createError("Solo se pueden asignar máquinas a usuarios operarios", 400);
  }

  if (!machine) {
    throw createError("La máquina no existe", 404);
  }

  if (!machine.activo) {
    throw createError("La máquina se encuentra inactiva", 400);
  }
};

const normalizeAssignment = (assignment) => {
  if (!assignment) {
    throw createError("No se pudo recuperar la asignación", 500);
  }

  return {
    ...assignment,
    usuario_activo: Boolean(assignment.usuario_activo),
    maquina_activa: Boolean(assignment.maquina_activa),
    activo: Boolean(assignment.activo),
  };
};

const withTransaction = async (operation) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Preserve the original error when rollback itself fails.
    }

    if (error.code === "ER_DUP_ENTRY") {
      throw createError("Ya existe una asignación para ese usuario y máquina", 409);
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw createError("El usuario o la máquina no existe", 400);
    }

    throw error;
  } finally {
    connection.release();
  }
};

export const listAssignments = async (query = {}, authenticatedUser) => {
  assertAdministrator(authenticatedUser);

  const userId =
    query.id_usuario === undefined
      ? undefined
      : validatePositiveInteger(query.id_usuario, "El ID de usuario");
  const machineId =
    query.id_maquina === undefined
      ? undefined
      : validatePositiveInteger(query.id_maquina, "El ID de máquina");
  const active = validateActiveFilter(query.activo);
  const page = validatePage(
    query.pagina,
    "La página",
    1,
    Number.MAX_SAFE_INTEGER
  );
  const limit = validatePage(query.limite, "El límite", 20, 100);

  const filters = { userId, machineId, active };
  const total = await countAssignments(filters);
  const totalPages = Math.ceil(total / limit);
  const assignments =
    page > totalPages
      ? []
      : await findAssignments({
          ...filters,
          limit,
          offset: (page - 1) * limit,
        });

  return {
    data: assignments.map(normalizeAssignment),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const createAssignment = async (data = {}, authenticatedUser) => {
  assertAdministrator(authenticatedUser);
  validateObject(data, "El cuerpo de la solicitud");

  const userId = validatePositiveInteger(data.id_usuario, "El ID de usuario");
  const machineId = validatePositiveInteger(
    data.id_maquina,
    "El ID de máquina"
  );

  return withTransaction(async (connection) => {
    const existingAssignment = await findAssignmentForUpdate(
      connection,
      userId,
      machineId
    );

    if (existingAssignment) {
      throw createError(
        "Ya existe una asignación para ese usuario y máquina",
        409
      );
    }

    const user = await findAssignmentUserForUpdate(connection, userId);
    const machine = await findAssignmentMachineForUpdate(
      connection,
      machineId
    );

    validateAssignableEntities(user, machine);

    const insertResult = await insertAssignment(connection, userId, machineId);

    if (insertResult.affectedRows !== 1) {
      throw createError("No se pudo crear la asignación", 500);
    }

    return normalizeAssignment(
      await findAssignmentById(connection, userId, machineId)
    );
  });
};

export const updateAssignmentState = async (
  rawUserId,
  rawMachineId,
  data = {},
  authenticatedUser
) => {
  assertAdministrator(authenticatedUser);
  validateObject(data, "El cuerpo de la solicitud");

  const userId = validatePositiveInteger(rawUserId, "El ID de usuario");
  const machineId = validatePositiveInteger(
    rawMachineId,
    "El ID de máquina"
  );
  const active = validateBoolean(data.activo, "El estado activo");

  return withTransaction(async (connection) => {
    const assignment = await findAssignmentForUpdate(
      connection,
      userId,
      machineId
    );

    if (!assignment) {
      throw createError("Asignación no encontrada", 404);
    }

    if (Boolean(assignment.activo) === active) {
      throw createError("La asignación ya tiene el estado solicitado", 409);
    }

    if (active) {
      const user = await findAssignmentUserForUpdate(connection, userId);
      const machine = await findAssignmentMachineForUpdate(connection, machineId);
      validateAssignableEntities(user, machine);
    }

    const updateResult = await updateAssignmentStatus(
      connection,
      userId,
      machineId,
      active
    );

    if (updateResult.affectedRows !== 1) {
      throw createError("No se pudo actualizar el estado de la asignación", 500);
    }

    return normalizeAssignment(
      await findAssignmentById(connection, userId, machineId)
    );
  });
};