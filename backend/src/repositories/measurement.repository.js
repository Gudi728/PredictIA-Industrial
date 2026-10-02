import pool from "../config/database.js";

export const withMeasurementTransaction = async (operation) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const result = await operation(connection);

    await connection.commit();
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original operation or commit error.
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

export const findMachineById = async (connection, machineId) => {
  const [rows] = await connection.execute(
    `SELECT id_maquina, activo
     FROM maquinas
     WHERE id_maquina = ?
     LIMIT 1`,
    [machineId]
  );

  return rows[0] || null;
};

export const findVariableById = async (connection, variableId) => {
  const [rows] = await connection.execute(
    `SELECT id_variable, activo
     FROM variables_monitoreadas
     WHERE id_variable = ?
     LIMIT 1`,
    [variableId]
  );

  return rows[0] || null;
};

export const findConfiguredLimit = async (connection, machineId, variableId) => {
  const [rows] = await connection.execute(
    `SELECT id_limite, valor_maximo
     FROM limites_configurados
     WHERE id_maquina = ? AND id_variable = ?
     LIMIT 1
     FOR UPDATE`,
    [machineId, variableId]
  );

  return rows[0] || null;
};

export const insertMeasurement = async (connection, {
  machineId,
  variableId,
  value,
  origin,
}) => {
  const [result] = await connection.execute(
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

export const findMeasurementById = async (connection, measurementId) => {
  const [rows] = await connection.execute(
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

export const findLastThreeMeasurements = async (
  connection,
  machineId,
  variableId
) => {
  const [rows] = await connection.execute(
    `SELECT id_medicion, valor, fecha_hora
     FROM mediciones
     WHERE id_maquina = ?
       AND id_variable = ?
     ORDER BY fecha_hora DESC, id_medicion DESC
     LIMIT 3`,
    [machineId, variableId]
  );

  return rows.reverse();
};
