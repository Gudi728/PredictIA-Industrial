import { apiRequest } from "./apiClient.js";

export class SensitiveUserResponseError extends Error {
  constructor() {
    super("La API devolvió un campo de credenciales; se detuvo el procesamiento.");
    this.name = "SensitiveUserResponseError";
  }
}

const containsCredentialField = (value, visited = new WeakSet()) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (visited.has(value)) {
    return false;
  }

  visited.add(value);

  return Object.entries(value).some(([key, item]) => {
    if (/(contrasena|password|hash)/i.test(key)) {
      return true;
    }

    return containsCredentialField(item, visited);
  });
};

const ensureSafeResponse = (response) => {
  if (containsCredentialField(response)) {
    throw new SensitiveUserResponseError();
  }

  return response;
};

const authenticatedRequest = (path, { token, onUnauthorized, ...options }) =>
  apiRequest(path, {
    ...options,
    authenticated: true,
    token,
    onUnauthorized,
  }).catch((error) => {
    if (containsCredentialField(error?.body)) {
      throw new SensitiveUserResponseError();
    }
    throw error;
  });

export const listUsers = async ({ token, onUnauthorized, signal }) => {
  const response = ensureSafeResponse(
    await authenticatedRequest("/usuarios", { token, onUnauthorized, signal })
  );

  if (!Array.isArray(response?.data)) {
    throw new Error("La respuesta del listado de usuarios no es válida.");
  }

  return response.data;
};

export const getUser = async (userId, { token, onUnauthorized, signal }) => {
  const response = ensureSafeResponse(
    await authenticatedRequest(`/usuarios/${encodeURIComponent(userId)}`, {
      token,
      onUnauthorized,
      signal,
    })
  );

  if (!response?.data || typeof response.data !== "object") {
    throw new Error("La respuesta del usuario no es válida.");
  }

  return response.data;
};

export const updateUser = async (
  userId,
  body,
  { token, onUnauthorized, signal }
) => {
  const response = ensureSafeResponse(
    await authenticatedRequest(`/usuarios/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body,
      token,
      onUnauthorized,
      signal,
    })
  );

  if (!response?.data || typeof response.data !== "object") {
    throw new Error("La respuesta de actualización del usuario no es válida.");
  }

  return response.data;
};
