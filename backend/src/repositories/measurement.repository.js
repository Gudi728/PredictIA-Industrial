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

export const findHistoricalMachineById = async (machineId, { userId, role }) => {
  const query =
    role === "operario"
      ? `SELECT
           m.id_maquina,
           m.codigo,
           m.nombre,
           m.activo
         FROM maquinas m
         INNER JOIN asignaciones_maquinas a
           ON a.id_maquina = m.id_maquina
         WHERE m.id_maquina = ?
           AND a.id_usuario = ?
           AND a.activo = TRUE
           AND m.activo = TRUE
         LIMIT 1`
      : `SELECT
           m.id_maquina,
           m.codigo,
           m.nombre,
           m.activo
         FROM maquinas m
         WHERE m.id_maquina = ?
         LIMIT 1`;

  const parameters =
    role === "operario" ? [machineId, userId] : [machineId];

  const [rows] = await pool.execute(query, parameters);

  return rows[0] || null;
};

export const findHistoricalVariableById = async (variableId) => {
  const [rows] = await pool.execute(
    `SELECT
       id_variable,
       nombre,
       unidad,
       activo
     FROM variables_monitoreadas
     WHERE id_variable = ?
     LIMIT 1`,
    [variableId]
  );

  return rows[0] || null;
};

const buildMeasurementHistoryConditions = ({
  userId,
  role,
  machineId,
  variableId,
  dateFrom,
  dateTo,
}) => {
  const conditions = [];
  const parameters = [];

  if (role === "operario") {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM asignaciones_maquinas a
         INNER JOIN maquinas ma
           ON ma.id_maquina = a.id_maquina
         WHERE a.id_maquina = med.id_maquina
           AND a.id_usuario = ?
           AND a.activo = TRUE
           AND ma.activo = TRUE
       )`
    );
    parameters.push(userId);
  }

  if (machineId !== null) {
    conditions.push("med.id_maquina = ?");
    parameters.push(machineId);
  }

  if (variableId !== null) {
    conditions.push("med.id_variable = ?");
    parameters.push(variableId);
  }

  if (dateFrom !== null) {
    conditions.push("med.fecha_hora >= ?");
    parameters.push(dateFrom);
  }

  if (dateTo !== null) {
    conditions.push("med.fecha_hora <= ?");
    parameters.push(dateTo);
  }

  return {
    whereClause:
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    parameters,
  };
};

export const findMeasurementHistory = async ({
  userId,
  role,
  machineId,
  variableId,
  dateFrom,
  dateTo,
  limit,
  offset,
}) => {
  const { whereClause, parameters } =
    buildMeasurementHistoryConditions({
      userId,
      role,
      machineId,
      variableId,
      dateFrom,
      dateTo,
    });

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
       med.fecha_hora,
       l.valor_maximo AS limite_actual
     FROM mediciones med
     INNER JOIN maquinas m
       ON m.id_maquina = med.id_maquina
     INNER JOIN variables_monitoreadas v
       ON v.id_variable = med.id_variable
     LEFT JOIN limites_configurados l
       ON l.id_maquina = med.id_maquina
      AND l.id_variable = med.id_variable
     ${whereClause}
     ORDER BY med.fecha_hora DESC, med.id_medicion DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset]
  );

  return rows;
};

export const countMeasurementHistory = async ({
  userId,
  role,
  machineId,
  variableId,
  dateFrom,
  dateTo,
}) => {
  const { whereClause, parameters } =
    buildMeasurementHistoryConditions({
      userId,
      role,
      machineId,
      variableId,
      dateFrom,
      dateTo,
    });

  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM mediciones med
     ${whereClause}`,
    parameters
  );

  return Number(rows[0].total);
};

export const findCurrentStateMachineById = async (
  machineId,
  { userId, role }
) => {
  const query =
    role === "operario"
      ? `SELECT
           m.id_maquina,
           m.codigo,
           m.nombre,
           m.activo
         FROM maquinas m
         INNER JOIN asignaciones_maquinas a
           ON a.id_maquina = m.id_maquina
         WHERE m.id_maquina = ?
           AND a.id_usuario = ?
           AND a.activo = TRUE
           AND m.activo = TRUE
         LIMIT 1`
      : `SELECT
           m.id_maquina,
           m.codigo,
           m.nombre,
           m.activo
         FROM maquinas m
         WHERE m.id_maquina = ?
         LIMIT 1`;

  const parameters =
    role === "operario" ? [machineId, userId] : [machineId];

  const [rows] = await pool.execute(query, parameters);

  return rows[0] || null;
};

export const findCurrentStateVariables = async (machineId) => {
  const [rows] = await pool.execute(
    `SELECT
       l.id_variable,
       v.nombre AS nombre_variable,
       v.unidad,
       l.valor_maximo AS limite_maximo,
       med.id_medicion,
       med.valor,
       med.origen,
       med.fecha_hora
     FROM limites_configurados l
     INNER JOIN variables_monitoreadas v
       ON v.id_variable = l.id_variable
      AND v.activo = TRUE
     LEFT JOIN mediciones med
       ON med.id_medicion = (
         SELECT med2.id_medicion
         FROM mediciones med2
         WHERE med2.id_maquina = l.id_maquina
           AND med2.id_variable = l.id_variable
         ORDER BY med2.fecha_hora DESC, med2.id_medicion DESC
         LIMIT 1
       )
     WHERE l.id_maquina = ?
     ORDER BY l.id_variable`,
    [machineId]
  );

  return rows;
};
