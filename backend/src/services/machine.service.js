import {
  countMachineObservations,
  findAllMachines,
  findMachineByCode,
  findMachineById,
  findMachineConflictExcludingId,
  findMachineForObservationForUpdate,
  findMachineObservationById,
  findMachineObservations,
  insertMachineObservation,
  insertMachine,
  updateMachineRecord,
  updateMachineStatus,
} from "../repositories/machine.repository.js";
import pool from "../config/database.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validatePositiveInteger = (value) => {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw createError("El ID debe ser un entero positivo", 400);
  }

  return numberValue;
};

const validateStrictPositiveInteger = (value, field) => {
  if (
    typeof value === "boolean" ||
    (typeof value === "string" && !/^\d+$/.test(value)) ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    throw createError(`${field} debe ser un entero decimal positivo`, 400);
  }

  const numberValue = Number(value);

  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw createError(`${field} debe ser un entero decimal positivo`, 400);
  }

  return numberValue;
};

const validateMachineObservationDescription = (description) => {
  if (typeof description !== "string") {
    throw createError("La descripción es obligatoria", 400);
  }

  const normalizedDescription = description.trim();

  if (!normalizedDescription) {
    throw createError("La descripción es obligatoria", 400);
  }

  if (Array.from(normalizedDescription).length > 1000) {
    throw createError(
      "La descripción no puede superar los 1000 caracteres",
      400
    );
  }

  return normalizedDescription;
};

const validateRequiredText = (value, field, maxLength) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createError(`${field} es obligatorio`, 400);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw createError(`${field} no puede superar los ${maxLength} caracteres`, 400);
  }

  return normalizedValue;
};

const validateOptionalText = (value, field, maxLength) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw createError(`${field} debe ser texto`, 400);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw createError(`${field} no puede superar los ${maxLength} caracteres`, 400);
  }

  return normalizedValue || null;
};

const normalizeMachine = (machine) => ({
  ...machine,
  activo: Boolean(machine.activo),
});

export const listMachines = async (authenticatedUser) => {
  const machines = await findAllMachines({
    userId: authenticatedUser.id_usuario,
    role: authenticatedUser.rol,
  });

  return machines.map(normalizeMachine);
};

export const getMachine = async (machineId, authenticatedUser) => {
  const normalizedMachineId = validatePositiveInteger(machineId);
  const machine = await findMachineById(normalizedMachineId, {
    userId: authenticatedUser.id_usuario,
    role: authenticatedUser.rol,
  });

  if (!machine) {
    throw createError("Máquina no encontrada", 404);
  }

  return normalizeMachine(machine);
};

export const createMachine = async (data = {}, authenticatedUser) => {
  const code = validateRequiredText(data.codigo, "El código", 50)
    .toUpperCase();
  const name = validateRequiredText(data.nombre, "El nombre", 100);
  const type = validateRequiredText(data.tipo, "El tipo", 100);
  const description = validateOptionalText(data.descripcion, "La descripción", 500);
  const location = validateOptionalText(data.ubicacion, "La ubicación", 150);

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw createError(
      "El código solo puede contener letras mayúsculas, números, guiones y guiones bajos",
      400
    );
  }

  const existingMachine = await findMachineByCode(code);

  if (existingMachine) {
    throw createError("El código de máquina ya está registrado", 409);
  }

  let machineId;

  try {
    machineId = await insertMachine({
      code,
      name,
      type,
      description,
      location,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError("El código de máquina ya está registrado", 409);
    }

    throw error;
  }

  return getMachine(machineId, authenticatedUser);
};

export const updateMachine = async (
  machineId,
  data = {},
  authenticatedUser
) => {
  const normalizedMachineId = validatePositiveInteger(machineId);
  const currentMachine = await findMachineById(normalizedMachineId, {
    userId: authenticatedUser.id_usuario,
    role: authenticatedUser.rol,
  });

  if (!currentMachine) {
    throw createError("Máquina no encontrada", 404);
  }

  const code = validateRequiredText(data.codigo, "El código", 50)
    .toUpperCase();
  const name = validateRequiredText(data.nombre, "El nombre", 100);
  const type = validateRequiredText(data.tipo, "El tipo", 100);
  const description = validateOptionalText(data.descripcion, "La descripción", 500);
  const location = validateOptionalText(data.ubicacion, "La ubicación", 150);

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw createError(
      "El código solo puede contener letras mayúsculas, números, guiones y guiones bajos",
      400
    );
  }

  const conflict = await findMachineConflictExcludingId(
    code,
    normalizedMachineId
  );

  if (conflict) {
    throw createError("El código de máquina ya está registrado", 409);
  }

  try {
    await updateMachineRecord({
      machineId: normalizedMachineId,
      code,
      name,
      type,
      description,
      location,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError("El código de máquina ya está registrado", 409);
    }

    throw error;
  }

  return getMachine(normalizedMachineId, authenticatedUser);
};

export const changeMachineStatus = async (
  machineId,
  active,
  authenticatedUser
) => {
  const normalizedMachineId = validatePositiveInteger(machineId);
  const currentMachine = await findMachineById(normalizedMachineId, {
    userId: authenticatedUser.id_usuario,
    role: authenticatedUser.rol,
  });

  if (!currentMachine) {
    throw createError("Máquina no encontrada", 404);
  }

  if (typeof active !== "boolean") {
    throw createError("El estado activo debe ser booleano", 400);
  }

  if (Boolean(currentMachine.activo) === active) {
    throw createError(
      "La máquina ya se encuentra en el estado solicitado",
      409
    );
  }

  await updateMachineStatus(normalizedMachineId, active);

  return getMachine(normalizedMachineId, authenticatedUser);
};

export const registerMachineObservation = async (
  machineId,
  description,
  authenticatedUser
) => {
  const normalizedMachineId = validateStrictPositiveInteger(
    machineId,
    "El ID de máquina"
  );
  const normalizedDescription =
    validateMachineObservationDescription(description);

  if (authenticatedUser.rol !== "operario") {
    throw createError("No tiene permisos para realizar esta acción", 403);
  }

  const userId = validateStrictPositiveInteger(
    authenticatedUser.id_usuario,
    "El ID del usuario autenticado"
  );
  let connection;
  let transactionStarted = false;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const machine = await findMachineForObservationForUpdate(
      connection,
      normalizedMachineId,
      { userId, role: authenticatedUser.rol }
    );

    if (!machine) {
      throw createError("Máquina no encontrada", 404);
    }

    const result = await insertMachineObservation(connection, {
      machineId: normalizedMachineId,
      userId,
      description: normalizedDescription,
    });

    if (
      result.affectedRows !== 1 ||
      !Number.isSafeInteger(result.insertId) ||
      result.insertId <= 0
    ) {
      throw createError("No fue posible registrar la observación", 500);
    }

    const observation = await findMachineObservationById(
      connection,
      result.insertId
    );

    if (!observation) {
      throw createError(
        "No fue posible recuperar la observación registrada",
        500
      );
    }

    await connection.commit();
    transactionStarted = false;

    return observation;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original error without exposing transaction details.
      }
    }

    if (error.status) {
      throw error;
    }

    throw createError("No fue posible registrar la observación", 500);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const listMachineObservations = async (
  machineId,
  filters = {},
  authenticatedUser
) => {
  const normalizedMachineId = validateStrictPositiveInteger(
    machineId,
    "El ID de máquina"
  );
  const pagina = validateStrictPositiveInteger(
    filters.pagina === undefined ? 1 : filters.pagina,
    "La página"
  );
  const limite = validateStrictPositiveInteger(
    filters.limite === undefined ? 20 : filters.limite,
    "El límite"
  );

  if (limite > 100) {
    throw createError(
      "El límite debe ser un entero entre 1 y 100",
      400
    );
  }

  const offset = (pagina - 1) * limite;

  if (!Number.isSafeInteger(offset)) {
    throw createError("La página no es válida", 400);
  }

  const machine = await findMachineById(normalizedMachineId, {
    userId: authenticatedUser.id_usuario,
    role: authenticatedUser.rol,
  });

  if (!machine) {
    throw createError("Máquina no encontrada", 404);
  }

  const accessContext = {
    machineId: normalizedMachineId,
    userId: authenticatedUser.id_usuario,
    role: authenticatedUser.rol,
  };
  const total = await countMachineObservations(accessContext);
  const observations = await findMachineObservations({
    ...accessContext,
    limit: limite,
    offset,
  });

  return {
    count: observations.length,
    pagination: {
      pagina,
      limite,
      total,
      total_paginas: total === 0 ? 0 : Math.ceil(total / limite),
    },
    data: observations,
  };
};
