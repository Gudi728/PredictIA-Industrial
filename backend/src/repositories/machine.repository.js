import pool from "../config/database.js";

const publicFields = `
  m.id_maquina,
  m.codigo,
  m.nombre,
  m.tipo,
  m.descripcion,
  m.ubicacion,
  m.activo,
  m.fecha_creacion,
  m.fecha_actualizacion
`;

export const findAllMachines = async ({ userId, role }) => {
  const query = role === "operario"
    ? `SELECT ${publicFields}
       FROM maquinas m
       INNER JOIN asignaciones_maquinas a
         ON a.id_maquina = m.id_maquina
       WHERE a.id_usuario = ?
         AND a.activo = TRUE
         AND m.activo = TRUE
       ORDER BY m.id_maquina`
    : `SELECT ${publicFields}
       FROM maquinas m
       ORDER BY m.id_maquina`;
  const parameters = role === "operario" ? [userId] : [];

  const [rows] = await pool.execute(query, parameters);

  return rows;
};

export const findMachineById = async (machineId, { userId, role }) => {
  const query = role === "operario"
    ? `SELECT ${publicFields}
       FROM maquinas m
       INNER JOIN asignaciones_maquinas a
         ON a.id_maquina = m.id_maquina
       WHERE m.id_maquina = ?
         AND a.id_usuario = ?
         AND a.activo = TRUE
         AND m.activo = TRUE
       LIMIT 1`
    : `SELECT ${publicFields}
       FROM maquinas m
       WHERE m.id_maquina = ?
       LIMIT 1`;
  const parameters = role === "operario"
    ? [machineId, userId]
    : [machineId];

  const [rows] = await pool.execute(query, parameters);

  return rows[0] || null;
};

export const findMachineByCode = async (code) => {
  const [rows] = await pool.execute(
    `SELECT ${publicFields}
     FROM maquinas m
     WHERE m.codigo = ?
     LIMIT 1`,
    [code]
  );

  return rows[0] || null;
};

export const insertMachine = async ({
  code,
  name,
  type,
  description,
  location,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO maquinas (
       codigo,
       nombre,
       tipo,
       descripcion,
       ubicacion,
       activo
     )
     VALUES (?, ?, ?, ?, ?, TRUE)`,
    [code, name, type, description, location]
  );

  return result.insertId;
};

export const findMachineConflictExcludingId = async (code, machineId) => {
  const [rows] = await pool.execute(
    `SELECT id_maquina, codigo
     FROM maquinas
     WHERE codigo = ?
       AND id_maquina <> ?
     LIMIT 1`,
    [code, machineId]
  );

  return rows[0] || null;
};

export const updateMachineRecord = async ({
  machineId,
  code,
  name,
  type,
  description,
  location,
}) => {
  const [result] = await pool.execute(
    `UPDATE maquinas
     SET codigo = ?,
         nombre = ?,
         tipo = ?,
         descripcion = ?,
         ubicacion = ?
     WHERE id_maquina = ?`,
    [code, name, type, description, location, machineId]
  );

  return result;
};

export const updateMachineStatus = async (machineId, active) => {
  const [result] = await pool.execute(
    `UPDATE maquinas
     SET activo = ?
     WHERE id_maquina = ?`,
    [active, machineId]
  );

  return result;
};

export const findMachineForObservationForUpdate = async (
  connection,
  machineId,
  { userId, role }
) => {
  const accessCondition =
    role === "operario"
      ? `AND EXISTS (
           SELECT 1
           FROM asignaciones_maquinas am
           WHERE am.id_usuario = ?
             AND am.id_maquina = m.id_maquina
             AND am.activo = TRUE
         )`
      : "";
  const parameters =
    role === "operario" ? [machineId, userId] : [machineId];

  const [rows] = await connection.execute(
    `SELECT
       m.id_maquina,
       m.codigo,
       m.nombre,
       m.activo
     FROM maquinas m
     WHERE m.id_maquina = ?
       AND m.activo = TRUE
       ${accessCondition}
     LIMIT 1
     FOR UPDATE`,
    parameters
  );

  return rows[0] || null;
};

export const insertMachineObservation = async (
  connection,
  { machineId, userId, description }
) => {
  const [result] = await connection.execute(
    `INSERT INTO observaciones_maquinas (
       id_maquina,
       id_usuario,
       descripcion
     )
     VALUES (?, ?, ?)`,
    [machineId, userId, description]
  );

  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId,
  };
};

export const findMachineObservationById = async (
  connection,
  observationId
) => {
  const [rows] = await connection.execute(
    `SELECT
       om.id_observacion,
       om.id_maquina,
       m.codigo AS codigo_maquina,
       m.nombre AS nombre_maquina,
       om.id_usuario,
       u.nombre_usuario,
       r.nombre AS rol,
       om.descripcion,
       om.fecha_hora
     FROM observaciones_maquinas om
     INNER JOIN maquinas m
       ON m.id_maquina = om.id_maquina
     INNER JOIN usuarios u
       ON u.id_usuario = om.id_usuario
     INNER JOIN roles r
       ON r.id_rol = u.id_rol
     WHERE om.id_observacion = ?
     LIMIT 1`,
    [observationId]
  );

  return rows[0] || null;
};

const buildMachineObservationConditions = ({
  machineId,
  userId,
  role,
}) => {
  const conditions = ["om.id_maquina = ?"];
  const parameters = [machineId];

  if (role === "operario") {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM asignaciones_maquinas am
         INNER JOIN maquinas m_alcance
           ON m_alcance.id_maquina = am.id_maquina
         WHERE am.id_usuario = ?
           AND am.id_maquina = om.id_maquina
           AND am.activo = TRUE
           AND m_alcance.activo = TRUE
       )`
    );
    parameters.push(userId);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    parameters,
  };
};

export const countMachineObservations = async (accessContext) => {
  const { whereClause, parameters } =
    buildMachineObservationConditions(accessContext);
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM observaciones_maquinas om
     ${whereClause}`,
    parameters
  );

  return Number(rows[0].total);
};

export const findMachineObservations = async ({
  machineId,
  userId,
  role,
  limit,
  offset,
}) => {
  const { whereClause, parameters } = buildMachineObservationConditions({
    machineId,
    userId,
    role,
  });
  const [rows] = await pool.execute(
    `SELECT
       om.id_observacion,
       om.id_maquina,
       m.codigo AS codigo_maquina,
       m.nombre AS nombre_maquina,
       om.id_usuario,
       u.nombre_usuario,
       r.nombre AS rol,
       om.descripcion,
       om.fecha_hora
     FROM observaciones_maquinas om
     INNER JOIN maquinas m
       ON m.id_maquina = om.id_maquina
     INNER JOIN usuarios u
       ON u.id_usuario = om.id_usuario
     INNER JOIN roles r
       ON r.id_rol = u.id_rol
     ${whereClause}
     ORDER BY om.fecha_hora DESC, om.id_observacion DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset]
  );

  return rows;
};
