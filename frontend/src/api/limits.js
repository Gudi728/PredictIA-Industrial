import { apiRequest } from "./apiClient.js";

const isVariableValid = (variable) =>
  variable !== null &&
  typeof variable === "object" &&
  Number.isSafeInteger(variable.idVariable) &&
  variable.idVariable > 0 &&
  typeof variable.nombre === "string" &&
  typeof variable.unidad === "string" &&
  typeof variable.activo === "boolean";

const isLimitValid = (limit) =>
  limit !== null &&
  typeof limit === "object" &&
  Number.isSafeInteger(limit.id_limite) &&
  limit.id_limite > 0 &&
  Number.isSafeInteger(limit.id_maquina) &&
  limit.id_maquina > 0 &&
  typeof limit.codigo_maquina === "string" &&
  typeof limit.nombre_maquina === "string" &&
  Number.isSafeInteger(limit.id_variable) &&
  limit.id_variable > 0 &&
  typeof limit.nombre_variable === "string" &&
  typeof limit.unidad === "string" &&
  typeof limit.valor_maximo === "number";

export const listVariables = async ({ token, onUnauthorized, signal }) => {
  const response = await apiRequest("/variables", {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!Array.isArray(response?.data) || !response.data.every(isVariableValid)) {
    throw new Error("La respuesta del catálogo de variables no es válida.");
  }

  return response.data;
};

export const listLimits = async ({ token, onUnauthorized, signal }) => {
  const response = await apiRequest("/limites", {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!Array.isArray(response?.data) || !response.data.every(isLimitValid)) {
    throw new Error("La respuesta del listado de límites no es válida.");
  }

  return response.data;
};

export const createLimit = async (body, { token, onUnauthorized, signal }) => {
  const response = await apiRequest("/limites", {
    method: "POST",
    body,
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isLimitValid(response?.data)) {
    throw new Error("La respuesta de creación del límite no es válida.");
  }

  return response.data;
};

export const updateLimit = async (limitId, body, { token, onUnauthorized, signal }) => {
  const response = await apiRequest(`/limites/${encodeURIComponent(limitId)}`, {
    method: "PUT",
    body,
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isLimitValid(response?.data)) {
    throw new Error("La respuesta de actualización del límite no es válida.");
  }

  return response.data;
};
