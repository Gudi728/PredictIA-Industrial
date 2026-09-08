import pool from "../config/database.js";

export const findUserByIdentifier = async (identifier) => {
  const [rows] = await pool.execute(
    `SELECT
       u.id_usuario,
       u.nombre,
       u.apellido,
       u.nombre_usuario,
       u.correo,
       u.contrasena_hash,
       u.activo,
       r.id_rol,
       r.nombre AS rol
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.nombre_usuario = ? OR u.correo = ?
     LIMIT 1`,
    [identifier, identifier]
  );

  return rows[0] || null;
};

export const findUserById = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
       u.id_usuario,
       u.nombre,
       u.apellido,
       u.nombre_usuario,
       u.correo,
       u.activo,
       r.id_rol,
       r.nombre AS rol
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};