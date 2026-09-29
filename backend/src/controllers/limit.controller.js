import {
  createLimit,
  getLimit,
  listLimits,
  updateLimit,
} from "../services/limit.service.js";

export const list = async (req, res, next) => {
  try {
    const limits = await listLimits();

    res.status(200).json({
      success: true,
      message: "Límites obtenidos correctamente",
      count: limits.length,
      data: limits,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const limit = await getLimit(req.params.id);

    res.status(200).json({
      success: true,
      data: limit,
    });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const limit = await createLimit(req.body, req.user);

    res.status(201).json({
      success: true,
      message: "Límite creado correctamente",
      data: limit,
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const limit = await updateLimit(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Límite actualizado correctamente",
      data: limit,
    });
  } catch (error) {
    next(error);
  }
};