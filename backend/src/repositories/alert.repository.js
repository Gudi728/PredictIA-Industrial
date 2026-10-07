import pool from "../config/database.js";

export const insertAlert = async (connection, {
  measurementId,
  machineId,
  variableId,
  reason,
  detail,
  detectedValue,
  appliedLimit,
}) => {
  const [result] = await connection.execute(
    `INSERT INTO alertas (
       id_medicion,
       id_maquina,
       id_variable,
       motivo,
       detalle,
       valor_detectado,
       limite_aplicado,
       estado_actual
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [
      measurementId,
      machineId,
      variableId,
      reason,
      detail,
      detectedValue,
      appliedLimit,
    ]
  );

  return result.insertId;
};

export const findAlertById = async (connection, alertId) => {
  const [rows] = await connection.execute(
    `SELECT
       id_alerta,
       id_medicion,
       id_maquina,
       id_variable,
       motivo,
       detalle,
       valor_detectado,
       limite_aplicado,
       estado_actual,
       fecha_hora
     FROM alertas
     WHERE id_alerta = ?
     LIMIT 1`,
    [alertId]
  );

  return rows[0] || null;
};

export const findAlertByIdForUpdate = async (connection, alertId) => {
  const [rows] = await connection.execute(
    `SELECT
       id_alerta,
       id_medicion,
       id_maquina,
       id_variable,
       motivo,
       detalle,
       valor_detectado,
       limite_aplicado,
       estado_actual,
       fecha_hora
     FROM alertas
     WHERE id_alerta = ?
     LIMIT 1
     FOR UPDATE`,
    [alertId]
  );

  return rows[0] || null;
};

export const updateAlertStatus = async (connection, alertId, status) => {
  const [result] = await connection.execute(
    `UPDATE alertas
     SET estado_actual = ?
     WHERE id_alerta = ?`,
    [status, alertId]
  );

  return result.affectedRows;
};

export const insertAlertStatusHistory = async (
  connection,
  { alertId, userId, previousStatus, newStatus }
) => {
  const [result] = await connection.execute(
    `INSERT INTO historial_estados_alertas (
       id_alerta,
       id_usuario,
       estado_anterior,
       estado_nuevo
     )
     VALUES (?, ?, ?, ?)`,
    [alertId, userId, previousStatus, newStatus]
  );

  return result.insertId;
};

export const findAlertStatusHistoryById = async (connection, historyId) => {
  const [rows] = await connection.execute(
    `SELECT
       id_historial,
       id_alerta,
       id_usuario,
       estado_anterior,
       estado_nuevo,
       fecha_hora
     FROM historial_estados_alertas
     WHERE id_historial = ?
     LIMIT 1`,
    [historyId]
  );

  return rows[0] || null;
};

export const findAlertMachineById = async (machineId, { userId, role }) => {
  const query =
    role === "operario"
      ? `SELECT
           m.id_maquina,
           m.codigo,
           m.nombre,
           m.activo
         FROM maquinas m
         INNER JOIN asignaciones_maquinas am
           ON am.id_maquina = m.id_maquina
         WHERE m.id_maquina = ?
           AND am.id_usuario = ?
           AND am.activo = TRUE
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

export const findAlertVariableById = async (variableId) => {
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

const buildAlertConditions = ({
  userId,
  role,
  machineId,
  variableId,
  motivo,
  estado,
  dateFrom,
  dateTo,
}) => {
  const conditions = [];
  const parameters = [];

  if (role === "operario") {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM asignaciones_maquinas am
         INNER JOIN maquinas ma
           ON ma.id_maquina = am.id_maquina
         WHERE am.id_maquina = a.id_maquina
           AND am.id_usuario = ?
           AND am.activo = TRUE
           AND ma.activo = TRUE
       )`
    );
    parameters.push(userId);
  }

  if (machineId !== null) {
    conditions.push("a.id_maquina = ?");
    parameters.push(machineId);
  }

  if (variableId !== null) {
    conditions.push("a.id_variable = ?");
    parameters.push(variableId);
  }

  if (motivo !== null) {
    conditions.push("a.motivo = ?");
    parameters.push(motivo);
  }

  if (estado !== null) {
    conditions.push("a.estado_actual = ?");
    parameters.push(estado);
  }

  if (dateFrom !== null) {
    conditions.push("a.fecha_hora >= ?");
    parameters.push(dateFrom);
  }

  if (dateTo !== null) {
    conditions.push("a.fecha_hora <= ?");
    parameters.push(dateTo);
  }

  return {
    whereClause:
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    parameters,
  };
};

export const findAlertList = async ({
  userId,
  role,
  machineId,
  variableId,
  motivo,
  estado,
  dateFrom,
  dateTo,
  limit,
  offset,
}) => {
  const { whereClause, parameters } = buildAlertConditions({
    userId,
    role,
    machineId,
    variableId,
    motivo,
    estado,
    dateFrom,
    dateTo,
  });

  const [rows] = await pool.execute(
    `SELECT
       a.id_alerta,
       a.id_medicion,
       a.id_maquina,
       m.codigo AS codigo_maquina,
       m.nombre AS nombre_maquina,
       a.id_variable,
       v.nombre AS nombre_variable,
       v.unidad,
       a.motivo,
       a.detalle,
       a.valor_detectado,
       a.limite_aplicado,
       a.estado_actual,
       a.fecha_hora AS fecha_alerta
     FROM alertas a
     INNER JOIN maquinas m
       ON m.id_maquina = a.id_maquina
     INNER JOIN variables_monitoreadas v
       ON v.id_variable = a.id_variable
     ${whereClause}
     ORDER BY a.fecha_hora DESC, a.id_alerta DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset]
  );

  return rows;
};

export const countAlerts = async ({
  userId,
  role,
  machineId,
  variableId,
  motivo,
  estado,
  dateFrom,
  dateTo,
}) => {
  const { whereClause, parameters } = buildAlertConditions({
    userId,
    role,
    machineId,
    variableId,
    motivo,
    estado,
    dateFrom,
    dateTo,
  });

  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM alertas a
     ${whereClause}`,
    parameters
  );

  return Number(rows[0].total);
};

export const findAlertDetailById = async (alertId, { userId, role }) => {
  const conditions = [];
  const parameters = [alertId];

  if (role === "operario") {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM asignaciones_maquinas am
         INNER JOIN maquinas ma
           ON ma.id_maquina = am.id_maquina
         WHERE am.id_maquina = a.id_maquina
           AND am.id_usuario = ?
           AND am.activo = TRUE
           AND ma.activo = TRUE
       )`
    );
    parameters.push(userId);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE a.id_alerta = ? AND ${conditions.join(" AND ")}`
      : `WHERE a.id_alerta = ?`;

  const [rows] = await pool.execute(
    `SELECT
       a.id_alerta,
       a.id_medicion,
       a.id_maquina,
       m.codigo AS codigo_maquina,
       m.nombre AS nombre_maquina,
       m.activo AS maquina_activa,
       a.id_variable,
       v.nombre AS nombre_variable,
       v.unidad,
       v.activo AS variable_activa,
       a.motivo,
       a.detalle,
       a.valor_detectado,
       a.limite_aplicado,
       a.estado_actual,
       a.fecha_hora AS fecha_alerta,
       med.valor AS medicion_valor,
       med.origen AS medicion_origen,
       med.fecha_hora AS medicion_fecha_hora
     FROM alertas a
     INNER JOIN maquinas m
       ON m.id_maquina = a.id_maquina
     INNER JOIN variables_monitoreadas v
       ON v.id_variable = a.id_variable
     INNER JOIN mediciones med
       ON med.id_medicion = a.id_medicion
     ${whereClause}
     LIMIT 1`,
    parameters
  );

  return rows[0] || null;
};
