import {
  countAlerts,
  findAlertDetailById,
  findAlertList,
  findAlertMachineById,
  findAlertVariableById,
} from "../repositories/alert.repository.js";

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
    (typeof value === "string" && !/^\d+$/.test(value)) ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    throw createError(
      `${field} debe ser un entero decimal positivo y seguro`,
      400
    );
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw createError(
      `${field} debe ser un entero decimal positivo y seguro`,
      400
    );
  }

  return parsedValue;
};

const validateOptionalPositiveInteger = (value, field) => {
  if (value === undefined) {
    return null;
  }

  return validatePositiveInteger(value, field);
};

const validateOptionalEnum = (value, allowedValues, invalidMessage) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw createError(invalidMessage, 400);
  }

  return value;
};

const normalizeBoolean = (value) =>
  value === true || value === 1 || value === "1";

const validateDateFilter = (value, field, endOfDay = false) => {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string" || value !== value.trim()) {
    throw createError(
      `${field} debe tener formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss`,
      400
    );
  }

  const normalizedValue = value;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedValue);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;

    const utcDate = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    );

    const isValidDate =
      utcDate.getUTCFullYear() === Number(year) &&
      utcDate.getUTCMonth() === Number(month) - 1 &&
      utcDate.getUTCDate() === Number(day);

    if (!isValidDate) {
      throw createError(`${field} tiene una fecha no válida`, 400);
    }

    return endOfDay
      ? `${year}-${month}-${day} 23:59:59`
      : `${year}-${month}-${day} 00:00:00`;
  }

  const dateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(
      normalizedValue
    );

  if (!dateTimeMatch) {
    throw createError(`${field} tiene un formato inválido`, 400);
  }

  const [, year, month, day, hours, minutes, seconds] = dateTimeMatch;

  const utcDate = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    )
  );

  const isValidDate =
    utcDate.getUTCFullYear() === Number(year) &&
    utcDate.getUTCMonth() === Number(month) - 1 &&
    utcDate.getUTCDate() === Number(day) &&
    utcDate.getUTCHours() === Number(hours) &&
    utcDate.getUTCMinutes() === Number(minutes) &&
    utcDate.getUTCSeconds() === Number(seconds);

  if (!isValidDate) {
    throw createError(`${field} tiene una fecha no válida`, 400);
  }

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const normalizeAlertListItem = (alert) => ({
  ...alert,
  valor_detectado: Number(alert.valor_detectado),
  limite_aplicado: Number(alert.limite_aplicado),
});

const normalizeAlertDetail = (alert) => {
  const {
    medicion_valor,
    medicion_origen,
    medicion_fecha_hora,
    ...alertData
  } = alert;

  return {
    ...alertData,
    maquina_activa: normalizeBoolean(alert.maquina_activa),
    variable_activa: normalizeBoolean(alert.variable_activa),
    valor_detectado: Number(alert.valor_detectado),
    limite_aplicado: Number(alert.limite_aplicado),
    medicion: {
      valor: Number(medicion_valor),
      origen: medicion_origen,
      fecha_hora: medicion_fecha_hora,
    },
  };
};

export const listAlerts = async (filters = {}, { userId, role }) => {
  const machineId = validateOptionalPositiveInteger(
    filters.id_maquina,
    "El ID de máquina"
  );

  if (machineId !== null) {
    const machine = await findAlertMachineById(machineId, {
      userId,
      role,
    });

    if (!machine) {
      throw createError(
        role === "operario"
          ? "Alerta no encontrada"
          : "La máquina no existe",
        404
      );
    }
  }

  const variableId = validateOptionalPositiveInteger(
    filters.id_variable,
    "El ID de variable"
  );

  if (variableId !== null) {
    const variable = await findAlertVariableById(variableId);

    if (!variable) {
      throw createError("La variable no existe", 404);
    }
  }

  const motivo = validateOptionalEnum(
    filters.motivo,
    ["superacion_limite", "tendencia_anormal"],
    "El motivo de alerta no es válido"
  );

  const estado = validateOptionalEnum(
    filters.estado,
    ["pendiente", "en_revision", "resuelta"],
    "El estado de alerta no es válido"
  );

  const dateFrom = validateDateFilter(
    filters.fecha_desde,
    "fecha_desde",
    false
  );

  const dateTo = validateDateFilter(
    filters.fecha_hasta,
    "fecha_hasta",
    true
  );

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw createError(
      "La fecha_desde no puede ser mayor que la fecha_hasta",
      400
    );
  }

  const pagina = validatePositiveInteger(
    filters.pagina === undefined ? 1 : filters.pagina,
    "La página"
  );

  const limite = validatePositiveInteger(
    filters.limite === undefined ? 20 : filters.limite,
    "El límite"
  );

  if (limite > 100) {
    throw createError(
      "El límite debe ser un número entero entre 1 y 100",
      400
    );
  }

  const offset = (pagina - 1) * limite;

  if (!Number.isSafeInteger(offset)) {
    throw createError("La página no es válida", 400);
  }

  const total = await countAlerts({
    userId,
    role,
    machineId,
    variableId,
    motivo,
    estado,
    dateFrom,
    dateTo,
  });

  const alerts = await findAlertList({
    userId,
    role,
    machineId,
    variableId,
    motivo,
    estado,
    dateFrom,
    dateTo,
    limit: limite,
    offset,
  });

  return {
    count: alerts.length,
    pagination: {
      pagina,
      limite,
      total,
      total_paginas: total === 0 ? 0 : Math.ceil(total / limite),
    },
    data: alerts.map(normalizeAlertListItem),
  };
};

export const getAlertById = async (alertId, { userId, role }) => {
  const parsedAlertId = validatePositiveInteger(
    alertId,
    "El ID de alerta"
  );

  const alert = await findAlertDetailById(parsedAlertId, {
    userId,
    role,
  });

  if (!alert) {
    throw createError("Alerta no encontrada", 404);
  }

  return normalizeAlertDetail(alert);
};
