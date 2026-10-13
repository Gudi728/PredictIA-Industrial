import pool from "../config/database.js";

const publicFields = `
  a.id_usuario,
  u.nombre_usuario AS nombre_usuario,
  u.nombre,
  u.apellido,
  u.activo AS usuario_activo,
  r.nombre AS rol,
  a.id_maquina,
  m.codigo AS codigo_maquina,
  m.nombre AS nombre_maquina,
  m.activo AS maquina_activa,
  a.activo,
  a.fecha_asignacion
`;

const buildAssignmentFilters = ({ userId, machineId, active }) => {
  const conditions = [];
  const parameters = [];

  if (userId !== undefined) {
    conditions.push("a.id_usuario = ?");
    parameters.push(userId);
  }

  if (machineId !== undefined) {
    conditions.push("a.id_maquina = ?");
    parameters.push(machineId);
  }

  if (active !== undefined) {
    conditions.push("a.activo = ?");
    parameters.push(active);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    parameters,
  };
};

const assignmentJoins = `
  FROM asignaciones_maquinas a
  INNER JOIN usuarios u ON u.id_usuario = a.id_usuario
  INNER JOIN roles r ON r.id_rol = u.id_rol
  INNER JOIN maquinas m ON m.id_maquina = a.id_maquina
`;

export const countAssignments = async (filters) => {
  const { where, parameters } = buildAssignmentFilters(filters);
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     ${assignmentJoins}
     ${where}`,
    parameters
  );

  return Number(rows[0].total);
};

export const findAssignments = async ({
  userId,
  machineId,
  active,
  limit,
  offset,
}) => {
  const { where, parameters } = buildAssignmentFilters({
    userId,
    machineId,
    active,
  });
  const [rows] = await pool.execute(
    `SELECT ${publicFields}
     ${assignmentJoins}
     ${where}
    ORDER BY a.fecha_asignacion DESC, a.id_usuario ASC, a.id_maquina ASC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset]
  );

  return rows;
};

export const findAssignmentUserForUpdate = async (connection, userId) => {
  const [rows] = await connection.execute(
    `SELECT
       u.id_usuario,
       u.activo,
       r.nombre AS rol,
       r.activo AS rol_activo
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?
     LIMIT 1
     FOR UPDATE`,
    [userId]
  );

  return rows[0] || null;
};

export const findAssignmentMachineForUpdate = async (
  connection,
  machineId
) => {
  const [rows] = await connection.execute(
    `SELECT id_maquina, activo
     FROM maquinas
     WHERE id_maquina = ?
     LIMIT 1
     FOR UPDATE`,
    [machineId]
  );

  return rows[0] || null;
};

export const findAssignmentForUpdate = async (
  connection,
  userId,
  machineId
) => {
  const [rows] = await connection.execute(
    `SELECT id_usuario, id_maquina, activo, fecha_asignacion
     FROM asignaciones_maquinas
     WHERE id_usuario = ? AND id_maquina = ?
     LIMIT 1
     FOR UPDATE`,
    [userId, machineId]
  );

  return rows[0] || null;
};

export const insertAssignment = async (
  connection,
  userId,
  machineId
) => {
  const [result] = await connection.execute(
    `INSERT INTO asignaciones_maquinas (id_usuario, id_maquina, activo)
     VALUES (?, ?, TRUE)`,
    [userId, machineId]
  );

  return result;
};

export const updateAssignmentStatus = async (
  connection,
  userId,
  machineId,
  active
) => {
  const [result] = await connection.execute(
    `UPDATE asignaciones_maquinas
     SET activo = ?
     WHERE id_usuario = ? AND id_maquina = ?`,
    [active, userId, machineId]
  );

  return result;
};

export const findAssignmentById = async (
  connection,
  userId,
  machineId
) => {
  const [rows] = await connection.execute(
    `SELECT ${publicFields}
     ${assignmentJoins}
     WHERE a.id_usuario = ? AND a.id_maquina = ?
     LIMIT 1`,
    [userId, machineId]
  );

  return rows[0] || null;
};