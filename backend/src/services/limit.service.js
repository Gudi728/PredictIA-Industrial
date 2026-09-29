import {
  findAllLimits,
  findLimitById,
  findLimitConflict,
  findLimitConflictExcludingId,
  findMachineById,
  findVariableById,
  insertLimit,
  updateLimitRecord,
} from "../repositories/limit.repository.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validatePositiveInteger = (value, field) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && !/^\d+$/.test(value.trim()))
  ) {
    throw createError(`${field} debe ser un entero positivo`, 400);
  }

  const numberValue = Number(value);

  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw createError(`${field} debe ser un entero positivo`, 400);
  }

  return numberValue;
};

const validateMaximumValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && !value.trim())
  ) {
    throw createError("El valor máximo es obligatorio", 400);
  }

  const normalizedValue =
    typeof value === "string" ? value.trim() : String(value);

  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(normalizedValue)) {
    throw createError(
      "El valor máximo debe ser un número mayor que cero con hasta dos decimales",
      400
    );
  }

  const numberValue = Number(normalizedValue);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 0.01 ||
    numberValue > 99999999.99
  ) {
    throw createError(
      "El valor máximo debe estar entre 0.01 y 99999999.99",
      400
    );
  }

  return numberValue;
};

const normalizeLimit = (limit) => ({
  ...limit,
  valor_maximo: Number(limit.valor_maximo),
});

const validateRelatedEntities = async (machineId, variableId) => {
  const machine = await findMachineById(machineId);

  if (!machine) {
    throw createError("La máquina no existe", 404);
  }

  if (!machine.activo) {
    throw createError("La máquina se encuentra inactiva", 400);
  }

  const variable = await findVariableById(variableId);

  if (!variable) {
    throw createError("La variable no existe", 404);
  }

  if (!variable.activo) {
    throw createError("La variable se encuentra inactiva", 400);
  }
};

const handleDatabaseError = (error) => {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError(
      "Ya existe una configuración para esa máquina y variable",
      409
    );
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    throw createError(
      "La máquina, variable o usuario de actualización no existe",
      400
    );
  }

  if (
    error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
    error.code === "ER_WARN_DATA_OUT_OF_RANGE"
  ) {
    throw createError(
      "El valor máximo no cumple con el rango permitido",
      400
    );
  }

  throw error;
};

export const listLimits = async () => {
  const limits = await findAllLimits();

  return limits.map(normalizeLimit);
};

export const getLimit = async (limitId) => {
  const normalizedLimitId = validatePositiveInteger(limitId, "El ID del límite");
  const limit = await findLimitById(normalizedLimitId);

  if (!limit) {
    throw createError("Configuración de límite no encontrada", 404);
  }

  return normalizeLimit(limit);
};

export const createLimit = async (data = {}, authenticatedUser) => {
  const machineId = validatePositiveInteger(data.id_maquina, "El ID de máquina");
  const variableId = validatePositiveInteger(
    data.id_variable,
    "El ID de variable"
  );
  const maximumValue = validateMaximumValue(data.valor_maximo);

  await validateRelatedEntities(machineId, variableId);

  const conflict = await findLimitConflict(machineId, variableId);

  if (conflict) {
    throw createError(
      "Ya existe una configuración para esa máquina y variable",
      409
    );
  }

  let limitId;

  try {
    limitId = await insertLimit({
      machineId,
      variableId,
      maximumValue,
      userId: authenticatedUser.id_usuario,
    });
  } catch (error) {
    handleDatabaseError(error);
  }

  return getLimit(limitId);
};

export const updateLimit = async (
  limitId,
  data = {},
  authenticatedUser
) => {
  const normalizedLimitId = validatePositiveInteger(limitId, "El ID del límite");
  const existingLimit = await findLimitById(normalizedLimitId);

  if (!existingLimit) {
    throw createError("Configuración de límite no encontrada", 404);
  }

  const machineId = validatePositiveInteger(data.id_maquina, "El ID de máquina");
  const variableId = validatePositiveInteger(
    data.id_variable,
    "El ID de variable"
  );
  const maximumValue = validateMaximumValue(data.valor_maximo);

  await validateRelatedEntities(machineId, variableId);

  const conflict = await findLimitConflictExcludingId(
    machineId,
    variableId,
    normalizedLimitId
  );

  if (conflict) {
    throw createError(
      "Ya existe una configuración para esa máquina y variable",
      409
    );
  }

  try {
    await updateLimitRecord({
      limitId: normalizedLimitId,
      machineId,
      variableId,
      maximumValue,
      userId: authenticatedUser.id_usuario,
    });
  } catch (error) {
    handleDatabaseError(error);
  }

  return getLimit(normalizedLimitId);
};