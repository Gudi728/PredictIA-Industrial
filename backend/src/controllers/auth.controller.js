import { loginUser } from "../services/auth.service.js";

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Inicio de sesión correcto",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};