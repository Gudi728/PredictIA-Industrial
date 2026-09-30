import {
  findConfiguredLimit,
  findMachineById,
  findMeasurementById,
  findVariableById,
  insertMeasurement,
} from "../repositories/measurement.repository.js";

const MAXIMUM_ABSOLUTE_VALUE = 99999999.99;

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
    (typeof value === "string" && !/^\d+$/.test(value.trim())) ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    throw createError(`${field} debe ser un entero decimal positivo y seguro`, 400);
  }

  const numberValue = Number(value);

  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    throw createError(`${field} debe ser un entero decimal positivo y seguro`, 400);
  }

  return numberValue;
};

const validateMeasurementValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "boolean" ||
    (typeof value === "string" && !value.trim()) ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    throw createError("El valor de la medición es obligatorio y debe ser numérico", 400);
  }

  const normalizedValue =
    typeof value === "string" ? value.trim() : String(value);

  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(normalizedValue)) {
    throw createError(
      "El valor debe ser un número decimal normal con hasta dos decimales",
      400
    );
  }

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > MAXIMUM_ABSOLUTE_VALUE) {
    throw createError(
      "El valor debe estar entre 0.00 y 99999999.99",
      400
    );
  }

  return numberValue;
};

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

  const limit = await findConfiguredLimit(machineId, variableId);

  if (!limit) {
    throw createError(
      "No existe un límite configurado para la máquina y variable indicadas",
      409
    );
  }

  return limit;
};

const normalizeMeasurement = (measurement) => ({
  ...measurement,
  valor: Number(measurement.valor),
});

const handleDatabaseError = (error) => {
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    throw createError("La máquina o variable indicada no existe", 400);
  }

  if (
    error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
    error.code === "ER_WARN_DATA_OUT_OF_RANGE" ||
    error.code === "ER_DATA_OUT_OF_RANGE"
  ) {
    throw createError("El valor de la medición está fuera del rango permitido", 400);
  }

  throw error;
};

const registerMeasurement = async (machineId, variableId, value, origin) => {
  let measurementId;

  try {
    measurementId = await insertMeasurement({
      machineId,
      variableId,
      value,
      origin,
    });
  } catch (error) {
    handleDatabaseError(error);
  }

  const measurement = await findMeasurementById(measurementId);

  if (!measurement) {
    throw createError("No fue posible recuperar la medición registrada", 500);
  }

  return normalizeMeasurement(measurement);
};

export const simulateMeasurement = async (data = {}) => {
  const machineId = validatePositiveInteger(data.id_maquina, "El ID de máquina");
  const variableId = validatePositiveInteger(
    data.id_variable,
    "El ID de variable"
  );
  const limit = await validateRelatedEntities(machineId, variableId);
  const maximum = Number(limit.valor_maximo);

  if (!Number.isFinite(maximum) || maximum <= 0) {
    throw createError("El límite configurado no contiene un valor válido", 400);
  }

  const minimumCents = Math.ceil(maximum * 50 - Number.EPSILON * maximum * 50);
  const maximumCents = Math.floor(
    Math.min(maximum * 110, MAXIMUM_ABSOLUTE_VALUE * 100) +
      Number.EPSILON * maximum * 110
  );
  const cents = minimumCents +
    Math.floor(Math.random() * (maximumCents - minimumCents + 1));
  const value = Math.min(cents / 100, MAXIMUM_ABSOLUTE_VALUE);

  return registerMeasurement(machineId, variableId, value, "simulada");
};

export const createTestMeasurement = async (data = {}) => {
  const machineId = validatePositiveInteger(data.id_maquina, "El ID de máquina");
  const variableId = validatePositiveInteger(
    data.id_variable,
    "El ID de variable"
  );
  const value = validateMeasurementValue(data.valor);

  await validateRelatedEntities(machineId, variableId);

  return registerMeasurement(machineId, variableId, value, "prueba");
};