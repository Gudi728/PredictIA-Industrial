import pool from "../config/database.js";

export const findMachineById = async (machineId) => {
  const [rows] = await pool.execute(
    `SELECT id_maquina, activo
     FROM maquinas
     WHERE id_maquina = ?
     LIMIT 1`,
    [machineId]
  );

  return rows[0] || null;
};

export const findVariableById = async (variableId) => {
  const [rows] = await pool.execute(
    `SELECT id_variable, activo
     FROM variables_monitoreadas
     WHERE id_variable = ?
     LIMIT 1`,
    [variableId]
  );

  return rows[0] || null;
};

export const findConfiguredLimit = async (machineId, variableId) => {
  const [rows] = await pool.execute(
    `SELECT id_limite, valor_maximo
     FROM limites_configurados
     WHERE id_maquina = ? AND id_variable = ?
     LIMIT 1`,
    [machineId, variableId]
  );

  return rows[0] || null;
};

export const insertMeasurement = async ({
  machineId,
  variableId,
  value,
  origin,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO mediciones (
       id_maquina,
       id_variable,
       valor,
       origen
     )
     VALUES (?, ?, ?, ?)`,
    [machineId, variableId, value, origin]
  );

  return result.insertId;
};

export const findMeasurementById = async (measurementId) => {
  const [rows] = await pool.execute(
    `SELECT
       med.id_medicion,
       med.id_maquina,
       m.codigo AS codigo_maquina,
       m.nombre AS nombre_maquina,
       med.id_variable,
       v.nombre AS nombre_variable,
       v.unidad,
       med.valor,
       med.origen,
       med.fecha_hora
     FROM mediciones med
     INNER JOIN maquinas m ON m.id_maquina = med.id_maquina
     INNER JOIN variables_monitoreadas v
       ON v.id_variable = med.id_variable
     WHERE med.id_medicion = ?
     LIMIT 1`,
    [measurementId]
  );

  return rows[0] || null;
};