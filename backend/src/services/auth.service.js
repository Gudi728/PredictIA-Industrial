import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  findUserByIdentifier,
  findUserById,
} from "../repositories/auth.repository.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validateJwtConfiguration = () => {
  if (!process.env.JWT_SECRET) {
    throw createError(
      "La configuración de autenticación no está disponible",
      500
    );
  }
};

const sanitizeUser = (user) => ({
  id_usuario: user.id_usuario,
  nombre: user.nombre,
  apellido: user.apellido,
  nombre_usuario: user.nombre_usuario,
  correo: user.correo,
  id_rol: user.id_rol,
  rol: user.rol,
});

export const loginUser = async ({ identificador, contrasena }) => {
  if (
    typeof identificador !== "string" ||
    typeof contrasena !== "string" ||
    !identificador.trim() ||
    !contrasena
  ) {
    throw createError(
      "El identificador y la contraseña son obligatorios",
      400
    );
  }

  validateJwtConfiguration();

  const normalizedIdentifier = identificador.trim().toLowerCase();
  const user = await findUserByIdentifier(normalizedIdentifier);

  if (!user) {
    throw createError("Credenciales incorrectas", 401);
  }

  if (!user.activo) {
    throw createError("La cuenta se encuentra inactiva", 403);
  }

  const validPassword = await bcrypt.compare(
    contrasena,
    user.contrasena_hash
  );

  if (!validPassword) {
    throw createError("Credenciales incorrectas", 401);
  }

  const token = jwt.sign(
    {
      sub: String(user.id_usuario),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    }
  );

  return {
    token,
    usuario: sanitizeUser(user),
  };
};

export const getAuthenticatedUser = async (userId) => {
  const user = await findUserById(userId);

  if (!user || !user.activo) {
    throw createError(
      "El usuario asociado al token no está disponible",
      401
    );
  }

  return sanitizeUser(user);
};