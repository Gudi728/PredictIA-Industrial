import {
  findConfiguredLimit,
  findMachineById,
  findMeasurementById,
  findVariableById,
  insertMeasurement,
  withMeasurementTransaction,
} from "../repositories/measurement.repository.js";
import { analyzeMeasurement } from "./analysis.service.js";

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

const validateRelatedEntities = async (connection, machineId, variableId) => {
  const machine = await findMachineById(connection, machineId);

  if (!machine) {
    throw createError("La máquina no existe", 404);
  }

  if (!machine.activo) {
    throw createError("La máquina se encuentra inactiva", 400);
  }

  const variable = await findVariableById(connection, variableId);

  if (!variable) {
    throw createError("La variable no existe", 404);
  }

  if (!variable.activo) {
    throw createError("La variable se encuentra inactiva", 400);
  }

  const limit = await findConfiguredLimit(connection, machineId, variableId);

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
  if (
    error.code === "ER_NO_REFERENCED_ROW_2" ||
    error.code === "ER_NO_REFERENCED_ROW" ||
    error.code === "ER_ROW_IS_REFERENCED_2"
  ) {
    throw createError("La máquina o variable indicada no existe", 400);
  }

  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Ya existe una alerta asociada a esta medición", 409);
  }

  if (
    error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
    error.code === "ER_WARN_DATA_OUT_OF_RANGE" ||
    error.code === "ER_DATA_OUT_OF_RANGE" ||
    error.code === "ER_DATA_TOO_LONG"
  ) {
    throw createError("El valor de la medición está fuera del rango permitido", 400);
  }

  throw error;
};

const registerMeasurement = async (
  machineId,
  variableId,
  value,
  origin,
  limit,
  connection
) => {
  try {
    const measurementId = await insertMeasurement(connection, {
      machineId,
      variableId,
      value,
      origin,
    });

    const measurement = await findMeasurementById(connection, measurementId);

    if (!measurement) {
      throw createError("No fue posible recuperar la medición registrada", 500);
    }

    const normalizedMeasurement = normalizeMeasurement(measurement);
    const analysis = await analyzeMeasurement({
      connection,
      measurement: normalizedMeasurement,
      limit,
    });

    return {
      ...normalizedMeasurement,
      analisis: analysis,
    };
  } catch (error) {
    handleDatabaseError(error);
  }
};

export const simulateMeasurement = async (data = {}) => {
  return withMeasurementTransaction(async (connection) => {
    const machineId = validatePositiveInteger(data.id_maquina, "El ID de máquina");
    const variableId = validatePositiveInteger(
      data.id_variable,
      "El ID de variable"
    );
    const limit = await validateRelatedEntities(connection, machineId, variableId);
    const maximum = Number(limit.valor_maximo);

    if (!Number.isFinite(maximum) || maximum <= 0) {
      throw createError("El límite configurado no contiene un valor válido", 400);
    }

    const maximumCentsConfigured = Math.round(maximum * 100);
    const minimumCents = Math.ceil(maximumCentsConfigured * 0.5);
    const maximumCents = Math.min(
      Math.floor(maximumCentsConfigured * 1.1),
      Math.round(MAXIMUM_ABSOLUTE_VALUE * 100)
    );
    const cents = minimumCents +
      Math.floor(Math.random() * (maximumCents - minimumCents + 1));
    const value = Math.min(cents / 100, MAXIMUM_ABSOLUTE_VALUE);

    return registerMeasurement(
      machineId,
      variableId,
      value,
      "simulada",
      limit,
      connection
    );
  }).catch(handleDatabaseError);
};

export const createTestMeasurement = async (data = {}) => {
  return withMeasurementTransaction(async (connection) => {
    const machineId = validatePositiveInteger(data.id_maquina, "El ID de máquina");
    const variableId = validatePositiveInteger(
      data.id_variable,
      "El ID de variable"
    );
    const limit = await validateRelatedEntities(connection, machineId, variableId);
    const value = validateMeasurementValue(data.valor);

    return registerMeasurement(
      machineId,
      variableId,
      value,
      "prueba",
      limit,
      connection
    );
  }).catch(handleDatabaseError);
};
