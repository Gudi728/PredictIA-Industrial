import pool from "../config/database.js";

export const findAllRoles = async () => {
  const [rows] = await pool.execute(`
    SELECT
      id_rol AS idRol,
      nombre,
      descripcion,
      activo
    FROM roles
    ORDER BY id_rol
  `);

  return rows;
};
