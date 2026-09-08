import {
  changeUserStatus,
  createUser,
  getUser,
  listUsers,
  updateUser,
} from "../services/user.service.js";

export const list = async (req, res, next) => {
  try {
    const users = await listUsers();

    res.status(200).json({
      success: true,
      message: "Usuarios obtenidos correctamente",
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const user = await createUser(req.body);

    res.status(201).json({
      success: true,
      message: "Usuario creado correctamente",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const user = await updateUser(
      req.params.id,
      req.body,
      req.user.id_usuario
    );

    res.status(200).json({
      success: true,
      message: "Usuario actualizado correctamente",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    const user = await changeUserStatus(
      req.params.id,
      req.body.activo,
      req.user.id_usuario
    );

    res.status(200).json({
      success: true,
      message: req.body.activo
        ? "Usuario reactivado correctamente"
        : "Usuario desactivado correctamente",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};