import {
  createTestMeasurement,
  getCurrentMeasurementState,
  getMeasurementHistory,
  simulateMeasurement,
} from "../services/measurement.service.js";

const sendCreatedMeasurement = async (operation, req, res, next) => {
  try {
    const measurement = await operation(req.body);

    res.status(201).json({
      success: true,
      message: "Medición registrada correctamente",
      data: measurement,
    });
  } catch (error) {
    next(error);
  }
};

export const simulate = (req, res, next) =>
  sendCreatedMeasurement(simulateMeasurement, req, res, next);

export const createTest = (req, res, next) =>
  sendCreatedMeasurement(createTestMeasurement, req, res, next);

export const getHistory = async (req, res, next) => {
  try {
    const result = await getMeasurementHistory(req.query, {
      userId: req.user.id_usuario,
      role: req.user.rol,
    });

    res.status(200).json({
      success: true,
      message: "Mediciones obtenidas correctamente",
      count: result.count,
      pagination: result.pagination,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentState = async (req, res, next) => {
  try {
    const result = await getCurrentMeasurementState(req.query, {
      userId: req.user.id_usuario,
      role: req.user.rol,
    });

    res.status(200).json({
      success: true,
      message: "Estado actual obtenido correctamente",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
