const configuredApiUrl = import.meta.env.VITE_API_URL;

if (typeof configuredApiUrl !== "string" || !configuredApiUrl.trim()) {
  throw new Error(
    "Falta configurar VITE_API_URL. Copie .env.example a .env y defina la URL de la API."
  );
}

const apiBaseUrl = configuredApiUrl.trim().replace(/\/+$/, "");

export class ApiError extends Error {
  constructor({ status, message, body = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {
  constructor(message = "No fue posible conectar con el servidor.") {
    super(message);
    this.name = "NetworkError";
    this.status = 0;
    this.body = null;
  }
}

const buildUrl = (path) => {
  const [pathPart, ...queryParts] = String(path ?? "").split("?");
  const normalizedPath = pathPart
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^api(?:\/|$)/i, "");
  const query = queryParts.length ? `?${queryParts.join("?")}` : "";
  const suffix = normalizedPath ? `/${normalizedPath}` : "";

  return `${apiBaseUrl}${suffix}${query}`;
};

const parseResponse = async (response) => {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const apiRequest = async (
  path,
  {
    method = "GET",
    body,
    headers: customHeaders,
    signal,
    authenticated = false,
    token,
    onUnauthorized,
  } = {}
) => {
  const headers = new Headers(customHeaders || {});
  headers.set("Accept", "application/json");

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let requestBody;

  if (body !== undefined) {
    if (isFormData) {
      requestBody = body;
    } else {
      headers.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  if (authenticated && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: requestBody,
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new NetworkError();
  }

  const responseBody = await parseResponse(response);

  if (response.status === 401 && authenticated) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    const message =
      typeof responseBody?.message === "string" && responseBody.message.trim()
        ? responseBody.message
        : "La solicitud no pudo completarse.";

    throw new ApiError({
      status: response.status,
      message,
      body: responseBody,
    });
  }

  return responseBody;
};
