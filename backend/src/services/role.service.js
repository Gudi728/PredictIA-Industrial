import { findAllRoles } from "../repositories/role.repository.js";

export const getAllRoles = async () => {
  const roles = await findAllRoles();

  return roles.map((role) => ({
    ...role,
    activo: Boolean(role.activo),
  }));
};
