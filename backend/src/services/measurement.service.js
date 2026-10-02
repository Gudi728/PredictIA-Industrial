import {
  countMeasurementHistory,
  findConfiguredLimit,
  findCurrentStateMachineById,
  findCurrentStateVariables,
  findHistoricalMachineById,
  findHistoricalVariableById,
  findMachineById,
  findMeasurementById,
  findMeasurementHistory,
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

const validateOptionalPositiveInteger = (value, field) => {
  if (value === undefined) {
    return null;
  }

  return validatePositiveInteger(value, field);
};

const normalizeDateFilter = (value, field, endOfDay = false) => {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw createError(`${field} tiene un formato inválido`, 400);
  }

  const normalizedValue = value.trim();

  const dateOnlyMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);

  const dateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(
      normalizedValue
    );

  const match = dateOnlyMatch || dateTimeMatch;

  if (!match) {
    throw createError(
      `${field} debe tener formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss`,
      400
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = dateTimeMatch ? Number(match[4]) : 0;
  const minute = dateTimeMatch ? Number(match[5]) : 0;
  const second = dateTimeMatch ? Number(match[6]) : 0;

  const validationDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second)
  );

  const validDate =
    validationDate.getUTCFullYear() === year &&
    validationDate.getUTCMonth() === month - 1 &&
    validationDate.getUTCDate() === day &&
    validationDate.getUTCHours() === hour &&
    validationDate.getUTCMinutes() === minute &&
    validationDate.getUTCSeconds() === second;

  if (!validDate) {
    throw createError(`${field} contiene una fecha inexistente`, 400);
  }

  if (dateOnlyMatch) {
    return `${normalizedValue} ${endOfDay ? "23:59:59" : "00:00:00"}`;
  }

  return normalizedValue.replace("T", " ");
};

const normalizeHistoricalMeasurement = (measurement) => ({
  ...measurement,
  valor: Number(measurement.valor),
  limite_actual:
    measurement.limite_actual === null
      ? null
      : Number(measurement.limite_actual),
});

const normalizeCurrentStateVariable = (variable) => ({
  id_variable: variable.id_variable,
  nombre_variable: variable.nombre_variable,
  unidad: variable.unidad,
  limite_maximo: Number(variable.limite_maximo),
  ultima_medicion:
    variable.id_medicion === null
      ? null
      : {
          id_medicion: variable.id_medicion,
          valor: Number(variable.valor),
          origen: variable.origen,
          fecha_hora: variable.fecha_hora,
        },
});

export const getMeasurementHistory = async (
  query = {},
  { userId, role }
) => {
  const machineId = validateOptionalPositiveInteger(
    query.id_maquina,
    "El ID de máquina"
  );

  const variableId = validateOptionalPositiveInteger(
    query.id_variable,
    "El ID de variable"
  );

  const page =
    query.pagina === undefined
      ? 1
      : validatePositiveInteger(query.pagina, "La página");

  const limit =
    query.limite === undefined
      ? 20
      : validatePositiveInteger(query.limite, "El límite");

  if (limit > 100) {
    throw createError("El límite no puede ser mayor a 100", 400);
  }

  const dateFrom = normalizeDateFilter(
    query.fecha_desde,
    "fecha_desde"
  );

  const dateTo = normalizeDateFilter(
    query.fecha_hasta,
    "fecha_hasta",
    true
  );

  if (dateFrom !== null && dateTo !== null && dateFrom > dateTo) {
    throw createError(
      "fecha_desde no puede ser posterior a fecha_hasta",
      400
    );
  }

  if (machineId !== null) {
    const machine = await findHistoricalMachineById(machineId, {
      userId,
      role,
    });

    if (!machine) {
      throw createError("Máquina no encontrada", 404);
    }
  }

  if (variableId !== null) {
    const variable = await findHistoricalVariableById(variableId);

    if (!variable) {
      throw createError("Variable no encontrada", 404);
    }
  }

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw createError("La página solicitada está fuera del rango permitido", 400);
  }

  const filters = {
    userId,
    role,
    machineId,
    variableId,
    dateFrom,
    dateTo,
  };

  const total = await countMeasurementHistory(filters);

  const measurements = await findMeasurementHistory({
    ...filters,
    limit,
    offset,
  });

  const data = measurements.map(normalizeHistoricalMeasurement);

  return {
    count: data.length,
    pagination: {
      pagina: page,
      limite: limit,
      total,
      total_paginas: Math.ceil(total / limit),
    },
    data,
  };
};

export const getCurrentMeasurementState = async (
  query = {},
  { userId, role }
) => {
  if (query.id_maquina === undefined) {
    throw createError("El ID de máquina es obligatorio", 400);
  }

  const machineId = validatePositiveInteger(
    query.id_maquina,
    "El ID de máquina"
  );

  const machine = await findCurrentStateMachineById(machineId, {
    userId,
    role,
  });

  if (!machine) {
    throw createError("Máquina no encontrada", 404);
  }

  if (!machine.activo) {
    throw createError("La máquina se encuentra inactiva", 400);
  }

  const variables = await findCurrentStateVariables(machineId);

  return {
    id_maquina: machine.id_maquina,
    codigo_maquina: machine.codigo,
    nombre_maquina: machine.nombre,
    activo: Boolean(machine.activo),
    variables: variables.map(normalizeCurrentStateVariable),
  };
};
