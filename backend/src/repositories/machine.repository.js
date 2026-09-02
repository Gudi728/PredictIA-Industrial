import pool from "../config/database.js";

export const findAllMachines = async () => {
  const [rows] = await pool.execute(`
    SELECT
      id_maquina AS idMaquina,
      codigo,
      nombre,
      tipo,
      descripcion,
      ubicacion,
      activo,
      fecha_creacion AS fechaCreacion,
      fecha_actualizacion AS fechaActualizacion
    FROM maquinas
    ORDER BY id_maquina
  `);

  return rows;
};
