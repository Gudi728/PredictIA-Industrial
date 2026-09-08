import jwt from "jsonwebtoken";
import { getAuthenticatedUser } from "../services/auth.service.js";

const unauthorized = (message) => {
  const error = new Error(message);
  error.status = 401;
  return error;
};

export const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      throw unauthorized("Token de autenticación requerido");
    }

    if (!process.env.JWT_SECRET) {
      const error = new Error(
        "La configuración de autenticación no está disponible"
      );
      error.status = 500;
      throw error;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      throw unauthorized("Token de autenticación requerido");
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = await getAuthenticatedUser(payload.sub);

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(
        unauthorized("Token inválido o vencido")
      );
    }

    next(error);
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        unauthorized("Usuario no autenticado")
      );
    }

    if (!allowedRoles.includes(req.user.rol)) {
      const error = new Error(
        "No tiene permisos para realizar esta acción"
      );
      error.status = 403;

      return next(error);
    }

    next();
  };
};