import { apiRequest } from "./apiClient.js";

const isCurrentStateValid = (state) =>
  state !== null &&
  typeof state === "object" &&
  Number.isSafeInteger(state.id_maquina) &&
  typeof state.codigo_maquina === "string" &&
  typeof state.nombre_maquina === "string" &&
  typeof state.activo === "boolean" &&
  Array.isArray(state.variables) &&
  state.variables.every((variable) =>
    Number.isSafeInteger(variable.id_variable) &&
    typeof variable.nombre_variable === "string" &&
    typeof variable.unidad === "string" &&
    typeof variable.limite_maximo === "number" &&
    (variable.ultima_medicion === null || (
      typeof variable.ultima_medicion === "object" &&
      Number.isSafeInteger(variable.ultima_medicion.id_medicion) &&
      typeof variable.ultima_medicion.valor === "number" &&
      typeof variable.ultima_medicion.origen === "string" &&
      typeof variable.ultima_medicion.fecha_hora === "string"
    ))
  );

const isHistoryValid = (response) =>
  response !== null &&
  typeof response === "object" &&
  typeof response.count === "number" &&
  Array.isArray(response.data) &&
  response.data.every((measurement) =>
    Number.isSafeInteger(measurement.id_medicion) &&
    Number.isSafeInteger(measurement.id_maquina) &&
    Number.isSafeInteger(measurement.id_variable) &&
    typeof measurement.codigo_maquina === "string" &&
    typeof measurement.nombre_maquina === "string" &&
    typeof measurement.nombre_variable === "string" &&
    typeof measurement.unidad === "string" &&
    typeof measurement.valor === "number" &&
    typeof measurement.origen === "string" &&
    typeof measurement.fecha_hora === "string" &&
    (measurement.limite_actual === null || typeof measurement.limite_actual === "number")
  );

export const getCurrentState = async (machineId, { token, onUnauthorized, signal }) => {
  const response = await apiRequest(`/mediciones/estado-actual?id_maquina=${encodeURIComponent(machineId)}`, {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isCurrentStateValid(response?.data)) {
    throw new Error("La respuesta del estado actual no es válida.");
  }

  return response.data;
};

export const getMeasurementHistory = async (machineId, { token, onUnauthorized, signal, pagina = 1, limite = 20 }) => {
  const params = new URLSearchParams({ id_maquina: String(machineId), pagina: String(pagina), limite: String(limite) });
  const response = await apiRequest(`/mediciones?${params}`, {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isHistoryValid(response)) {
    throw new Error("La respuesta del historial de mediciones no es válida.");
  }

  return response;
};

export const simulateMeasurement = async (body, { token, onUnauthorized, signal }) => {
  const response = await apiRequest("/mediciones/simular", {
    method: "POST",
    body,
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!response?.data || !Number.isSafeInteger(response.data.id_medicion)) {
    throw new Error("La respuesta de la simulación no es válida.");
  }

  return response.data;
};

export const createTestMeasurement = async (body, { token, onUnauthorized, signal }) => {
  const response = await apiRequest("/mediciones/prueba", {
    method: "POST",
    body,
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!response?.data || !Number.isSafeInteger(response.data.id_medicion)) {
    throw new Error("La respuesta del registro de prueba no es válida.");
  }

  return response.data;
};
