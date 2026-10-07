import {
  changeAlertStatus,
  getAlertById,
  listAlerts,
} from "../services/alert.service.js";

export const list = async (req, res, next) => {
  try {
    const result = await listAlerts(req.query, {
      userId: req.user.id_usuario,
      role: req.user.rol,
    });

    res.status(200).json({
      success: true,
      message: "Alertas obtenidas correctamente",
      count: result.count,
      pagination: result.pagination,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const alert = await getAlertById(req.params.id, {
      userId: req.user.id_usuario,
      role: req.user.rol,
    });

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const changeStatus = async (req, res, next) => {
  try {
    const result = await changeAlertStatus(
      req.params.id,
      req.body?.estado,
      req.user.id_usuario
    );

    res.status(200).json({
      success: true,
      message: "Estado de la alerta actualizado correctamente",
      data: {
        alerta: result.alerta,
        cambio_estado: result.cambioEstado,
      },
    });
  } catch (error) {
    next(error);
  }
};
