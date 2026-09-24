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
