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