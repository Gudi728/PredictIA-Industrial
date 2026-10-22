import { apiRequest } from "./apiClient.js";

const alertMotivos = ["superacion_limite", "tendencia_anormal"];
const alertEstados = ["pendiente", "en_revision", "resuelta"];

const isAlertListItemValid = (alert) =>
  alert !== null &&
  typeof alert === "object" &&
  Number.isSafeInteger(alert.id_alerta) &&
  Number.isSafeInteger(alert.id_medicion) &&
  Number.isSafeInteger(alert.id_maquina) &&
  typeof alert.codigo_maquina === "string" &&
  typeof alert.nombre_maquina === "string" &&
  Number.isSafeInteger(alert.id_variable) &&
  typeof alert.nombre_variable === "string" &&
  typeof alert.unidad === "string" &&
  alertMotivos.includes(alert.motivo) &&
  (typeof alert.detalle === "string" || alert.detalle === null) &&
  typeof alert.valor_detectado === "number" &&
  typeof alert.limite_aplicado === "number" &&
  alertEstados.includes(alert.estado_actual) &&
  typeof alert.fecha_alerta === "string";

const isAlertListValid = (response) =>
  response !== null &&
  typeof response === "object" &&
  typeof response.count === "number" &&
  response.pagination !== null &&
  typeof response.pagination === "object" &&
  typeof response.pagination.total === "number" &&
  Array.isArray(response.data) &&
  response.data.every(isAlertListItemValid);

const isAlertDetailValid = (alert) =>
  isAlertListItemValid(alert) &&
  typeof alert.maquina_activa === "boolean" &&
  typeof alert.variable_activa === "boolean" &&
  alert.medicion !== null &&
  typeof alert.medicion === "object" &&
  typeof alert.medicion.valor === "number" &&
  typeof alert.medicion.origen === "string" &&
  typeof alert.medicion.fecha_hora === "string";

export const listAlerts = async (filters = {}, { token, onUnauthorized, signal }) => {
  const params = new URLSearchParams({ pagina: "1", limite: "50" });

  if (filters.pagina) {
    params.set("pagina", String(filters.pagina));
  }

  if (filters.limite) {
    params.set("limite", String(filters.limite));
  }

  if (filters.id_maquina) {
    params.set("id_maquina", String(filters.id_maquina));
  }

  if (filters.estado) {
    params.set("estado", filters.estado);
  }

  const response = await apiRequest(`/alertas?${params}`, {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isAlertListValid(response)) {
    throw new Error("La respuesta del listado de alertas no es válida.");
  }

  return response;
};

export const getAlertDetail = async (alertId, { token, onUnauthorized, signal }) => {
  const response = await apiRequest(`/alertas/${encodeURIComponent(alertId)}`, {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isAlertDetailValid(response?.data)) {
    throw new Error("La respuesta del detalle de la alerta no es válida.");
  }

  return response.data;
};

export const changeAlertStatus = async (alertId, estado, { token, onUnauthorized, signal }) => {
  const response = await apiRequest(`/alertas/${encodeURIComponent(alertId)}/estado`, {
    method: "PATCH",
    body: { estado },
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isAlertListItemValid(response?.data?.alerta)) {
    throw new Error("La respuesta del cambio de estado no es válida.");
  }

  return response.data;
};
