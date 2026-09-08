import pool from "../config/database.js";

export const publicFields = `
  u.id_usuario,
  u.nombre,
  u.apellido,
  u.nombre_usuario,
  u.correo,
  u.activo,
  u.fecha_creacion,
  u.fecha_actualizacion,
  r.id_rol,
  r.nombre AS rol,
  r.descripcion AS rol_descripcion
`;

export const findAllUsers = async () => {
  const [rows] = await pool.execute(
    `SELECT ${publicFields}
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     ORDER BY u.id_usuario`
  );

  return rows;
};

export const findUserById = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT ${publicFields}
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};

export const findActiveRoleById = async (roleId) => {
  const [rows] = await pool.execute(
    `SELECT id_rol, nombre, descripcion, activo
     FROM roles
     WHERE id_rol = ? AND activo = TRUE
     LIMIT 1`,
    [roleId]
  );

  return rows[0] || null;
};

export const findUserConflict = async (username, email) => {
  const [rows] = await pool.execute(
    `SELECT id_usuario, nombre_usuario, correo
     FROM usuarios
     WHERE nombre_usuario = ? OR correo = ?
     LIMIT 1`,
    [username, email]
  );

  return rows[0] || null;
};

export const insertUser = async ({
  name,
  surname,
  username,
  email,
  passwordHash,
  roleId,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO usuarios (
       id_rol,
       nombre,
       apellido,
       nombre_usuario,
       correo,
       contrasena_hash,
       activo
     )
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [roleId, name, surname, username, email, passwordHash]
  );

  return result.insertId;
};

export const findUserConflictExcludingId = async (
  username,
  email,
  userId
) => {
  const [rows] = await pool.execute(
    `SELECT id_usuario, nombre_usuario, correo
     FROM usuarios
     WHERE (nombre_usuario = ? OR correo = ?) AND id_usuario <> ?
     LIMIT 1`,
    [username, email, userId]
  );

  return rows[0] || null;
};

export const updateUserRecord = async ({
  userId,
  roleId,
  firstName,
  lastName,
  username,
  email,
  passwordHash,
}) => {
  const fields = [
    "id_rol = ?",
    "nombre = ?",
    "apellido = ?",
    "nombre_usuario = ?",
    "correo = ?",
  ];
  const values = [roleId, firstName, lastName, username, email];

  if (passwordHash) {
    fields.push("contrasena_hash = ?");
    values.push(passwordHash);
  }

  values.push(userId);

  const [result] = await pool.execute(
    `UPDATE usuarios
     SET ${fields.join(", ")}
     WHERE id_usuario = ?`,
    values
  );

  return result;
};

export const updateUserStatus = async (userId, active) => {
  const [result] = await pool.execute(
    `UPDATE usuarios
     SET activo = ?
     WHERE id_usuario = ?`,
    [active, userId]
  );

  return result;
};