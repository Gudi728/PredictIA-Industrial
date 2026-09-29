import pool from "../config/database.js";

const publicFields = `
  l.id_limite,
  l.id_maquina,
  m.codigo AS codigo_maquina,
  m.nombre AS nombre_maquina,
  l.id_variable,
  v.nombre AS nombre_variable,
  v.unidad,
  l.valor_maximo,
  l.id_usuario_actualizacion,
  l.fecha_creacion,
  l.fecha_actualizacion
`;

export const findAllLimits = async () => {
  const [rows] = await pool.execute(
    `SELECT ${publicFields}
     FROM limites_configurados l
     INNER JOIN maquinas m ON m.id_maquina = l.id_maquina
     INNER JOIN variables_monitoreadas v ON v.id_variable = l.id_variable
     ORDER BY l.id_limite`
  );

  return rows;
};

export const findLimitById = async (limitId) => {
  const [rows] = await pool.execute(
    `SELECT ${publicFields}
     FROM limites_configurados l
     INNER JOIN maquinas m ON m.id_maquina = l.id_maquina
     INNER JOIN variables_monitoreadas v ON v.id_variable = l.id_variable
     WHERE l.id_limite = ?
     LIMIT 1`,
    [limitId]
  );

  return rows[0] || null;
};

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

export const findLimitConflict = async (machineId, variableId) => {
  const [rows] = await pool.execute(
    `SELECT id_limite, id_maquina, id_variable
     FROM limites_configurados
     WHERE id_maquina = ? AND id_variable = ?
     LIMIT 1`,
    [machineId, variableId]
  );

  return rows[0] || null;
};

export const findLimitConflictExcludingId = async (
  machineId,
  variableId,
  limitId
) => {
  const [rows] = await pool.execute(
    `SELECT id_limite, id_maquina, id_variable
     FROM limites_configurados
     WHERE id_maquina = ?
       AND id_variable = ?
       AND id_limite <> ?
     LIMIT 1`,
    [machineId, variableId, limitId]
  );

  return rows[0] || null;
};

export const insertLimit = async ({
  machineId,
  variableId,
  maximumValue,
  userId,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO limites_configurados (
       id_maquina,
       id_variable,
       valor_maximo,
       id_usuario_actualizacion
     )
     VALUES (?, ?, ?, ?)`,
    [machineId, variableId, maximumValue, userId]
  );

  return result.insertId;
};

export const updateLimitRecord = async ({
  limitId,
  machineId,
  variableId,
  maximumValue,
  userId,
}) => {
  const [result] = await pool.execute(
    `UPDATE limites_configurados
     SET id_maquina = ?,
         id_variable = ?,
         valor_maximo = ?,
         id_usuario_actualizacion = ?
     WHERE id_limite = ?`,
    [machineId, variableId, maximumValue, userId, limitId]
  );

  return result;
};