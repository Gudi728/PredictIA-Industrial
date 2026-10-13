import {
  createAssignment,
  listAssignments,
  updateAssignmentState,
} from "../services/assignment.service.js";

export const list = async (req, res, next) => {
  try {
    const result = await listAssignments(req.query, req.user);

    res.status(200).json({
      success: true,
      message: "Asignaciones obtenidas correctamente",
      count: result.data.length,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const assignment = await createAssignment(req.body, req.user);

    res.status(201).json({
      success: true,
      message: "Asignación creada correctamente",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateState = async (req, res, next) => {
  try {
    const assignment = await updateAssignmentState(
      req.params.idUsuario,
      req.params.idMaquina,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: req.body.activo
        ? "Asignación activada correctamente"
        : "Asignación desactivada correctamente",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};