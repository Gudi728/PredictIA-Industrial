import pool from "../config/database.js";

export const findAllVariables = async () => {
  const [rows] = await pool.execute(`
    SELECT
      id_variable AS idVariable,
      nombre,
      unidad,
      descripcion,
      activo
    FROM variables_monitoreadas
    ORDER BY id_variable
  `);

  return rows;
};
