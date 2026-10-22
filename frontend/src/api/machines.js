import { apiRequest } from "./apiClient.js";

const isMachineValid = (machine) =>
  machine !== null &&
  typeof machine === "object" &&
  Number.isSafeInteger(machine.id_maquina) &&
  machine.id_maquina > 0 &&
  typeof machine.codigo === "string" &&
  typeof machine.nombre === "string" &&
  typeof machine.tipo === "string" &&
  typeof machine.activo === "boolean";

export const listMachines = async ({ token, onUnauthorized, signal }) => {
  const response = await apiRequest("/maquinas", {
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!Array.isArray(response?.data) || !response.data.every(isMachineValid)) {
    throw new Error("La respuesta del listado de máquinas no es válida.");
  }

  return response.data;
};

export const createMachine = async (body, { token, onUnauthorized, signal }) => {
  const response = await apiRequest("/maquinas", {
    method: "POST",
    body,
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isMachineValid(response?.data)) {
    throw new Error("La respuesta de creación de máquina no es válida.");
  }

  return response.data;
};

export const updateMachine = async (machineId, body, { token, onUnauthorized, signal }) => {
  const response = await apiRequest(`/maquinas/${encodeURIComponent(machineId)}`, {
    method: "PUT",
    body,
    token,
    onUnauthorized,
    signal,
    authenticated: true,
  });

  if (!isMachineValid(response?.data)) {
    throw new Error("La respuesta de actualización de máquina no es válida.");
  }

  return response.data;
};
