import {
  findAllMachines,
  findMachineByCode,
  findMachineById,
  findMachineConflictExcludingId,
  insertMachine,
  updateMachineRecord,
  updateMachineStatus,
} from "../repositories/machine.repository.js";

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
