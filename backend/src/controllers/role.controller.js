import { getAllRoles } from "../services/role.service.js";

export const listRoles = async (req, res, next) => {
  try {
    const roles = await getAllRoles();

    res.status(200).json({
      success: true,
      message: "Roles obtenidos correctamente",
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};
