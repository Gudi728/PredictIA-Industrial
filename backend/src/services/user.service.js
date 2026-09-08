import bcrypt from "bcryptjs";
import {
  findActiveRoleById,
  findAllUsers,
  findUserById,
  findUserConflict,
  findUserConflictExcludingId,
  insertUser,
  updateUserRecord,
  updateUserStatus,
} from "../repositories/user.repository.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validateText = (value, field, maxLength) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createError(`${field} es obligatorio`, 400);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw createError(`${field} no puede superar los ${maxLength} caracteres`, 400);
  }

  return normalizedValue;
};

const validatePositiveInteger = (value, field) => {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw createError(`${field} debe ser un entero positivo`, 400);
  }

  return numberValue;
};

export const listUsers = async () => {
  const users = await findAllUsers();

  return users.map((user) => ({
    ...user,
    activo: Boolean(user.activo),
  }));
};

export const getUser = async (userId) => {
  const normalizedUserId = validatePositiveInteger(userId, "El ID");
  const user = await findUserById(normalizedUserId);

  if (!user) {
    throw createError("Usuario no encontrado", 404);
  }

  return {
    ...user,
    activo: Boolean(user.activo),
  };
};

export const createUser = async ({
  nombre,
  apellido,
  nombre_usuario,
  correo,
  contrasena,
  id_rol,
} = {}) => {
  const name = validateText(nombre, "El nombre", 100);
  const surname = validateText(apellido, "El apellido", 100);
  const username = validateText(nombre_usuario, "El nombre de usuario", 50)
    .toLowerCase();
  const email = validateText(correo, "El correo", 150).toLowerCase();
  const roleId = validatePositiveInteger(id_rol, "El rol");

  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw createError(
      "El nombre de usuario solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos",
      400
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError("El correo no tiene un formato válido", 400);
  }

  if (typeof contrasena !== "string" || !contrasena) {
    throw createError("La contraseña es obligatoria", 400);
  }

  if (contrasena.length < 8) {
    throw createError("La contraseña debe contener al menos 8 caracteres", 400);
  }

  const role = await findActiveRoleById(roleId);

  if (!role) {
    throw createError("El rol no existe o se encuentra inactivo", 400);
  }

  const conflict = await findUserConflict(username, email);

  if (conflict) {
    throw createError(
      "El nombre de usuario o correo ya está registrado",
      409
    );
  }

  const passwordHash = await bcrypt.hash(contrasena, 12);

  let userId;

  try {
    userId = await insertUser({
      name,
      surname,
      username,
      email,
      passwordHash,
      roleId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "El nombre de usuario o correo ya está registrado",
        409
      );
    }

    throw error;
  }

  return getUser(userId);
};

export const updateUser = async (userId, data = {}, authenticatedUserId) => {
  const normalizedUserId = validatePositiveInteger(userId, "El ID");
  const currentUser = await findUserById(normalizedUserId);

  if (!currentUser) {
    throw createError("Usuario no encontrado", 404);
  }

  const name = validateText(data.nombre, "El nombre", 100);
  const surname = validateText(data.apellido, "El apellido", 100);
  const username = validateText(
    data.nombre_usuario,
    "El nombre de usuario",
    50
  ).toLowerCase();
  const email = validateText(data.correo, "El correo", 150).toLowerCase();
  const roleId = validatePositiveInteger(data.id_rol, "El rol");
  const authenticatedId = validatePositiveInteger(
    authenticatedUserId,
    "El ID del usuario autenticado"
  );

  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw createError(
      "El nombre de usuario solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos",
      400
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError("El correo no tiene un formato válido", 400);
  }

  if (authenticatedId === normalizedUserId && roleId !== currentUser.id_rol) {
    throw createError("No puede modificar su propio rol", 403);
  }

  const role = await findActiveRoleById(roleId);

  if (!role) {
    throw createError("El rol no existe o se encuentra inactivo", 400);
  }

  const conflict = await findUserConflictExcludingId(
    username,
    email,
    normalizedUserId
  );

  if (conflict) {
    throw createError(
      "El nombre de usuario o correo ya está registrado",
      409
    );
  }

  let passwordHash;

  if (data.contrasena !== undefined) {
    if (typeof data.contrasena !== "string") {
      throw createError("La contraseña debe ser texto", 400);
    }

    if (data.contrasena.length < 8) {
      throw createError("La contraseña debe contener al menos 8 caracteres", 400);
    }

    if (data.contrasena.length > 255) {
      throw createError("La contraseña no puede superar los 255 caracteres", 400);
    }

    passwordHash = await bcrypt.hash(data.contrasena, 12);
  }

  try {
    await updateUserRecord({
      userId: normalizedUserId,
      roleId,
      firstName: name,
      lastName: surname,
      username,
      email,
      passwordHash,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError(
        "El nombre de usuario o correo ya está registrado",
        409
      );
    }

    throw error;
  }

  return getUser(normalizedUserId);
};

export const changeUserStatus = async (
  userId,
  active,
  authenticatedUserId
) => {
  const normalizedUserId = validatePositiveInteger(userId, "El ID");
  const currentUser = await findUserById(normalizedUserId);

  if (!currentUser) {
    throw createError("Usuario no encontrado", 404);
  }

  if (typeof active !== "boolean") {
    throw createError("El estado activo debe ser booleano", 400);
  }

  const authenticatedId = validatePositiveInteger(
    authenticatedUserId,
    "El ID del usuario autenticado"
  );

  if (authenticatedId === normalizedUserId && !active) {
    throw createError("No puede desactivar su propia cuenta", 403);
  }

  if (Boolean(currentUser.activo) === active) {
    throw createError("El usuario ya se encuentra en el estado solicitado", 409);
  }

  await updateUserStatus(normalizedUserId, active);

  return getUser(normalizedUserId);
};