import {
  getAllVariables,
} from "../services/variable.service.js";

export const listVariables = async (req, res, next) => {
  try {
    const variables = await getAllVariables();

    res.status(200).json({
      success: true,
      message: "Variables monitoreadas obtenidas correctamente",
      count: variables.length,
      data: variables,
    });
  } catch (error) {
    next(error);
  }
};
