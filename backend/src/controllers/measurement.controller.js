import {
  createTestMeasurement,
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