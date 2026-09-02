import pool from "../config/database.js";

export const getDatabaseHealth = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        VERSION() AS version,
        DATABASE() AS database_name,
        NOW() AS server_time
    `);

    res.status(200).json({
      success: true,
      message: "Conexión con MySQL establecida correctamente",
      data: {
        status: "OK",
        version: rows[0].version,
        database: rows[0].database_name,
        serverTime: rows[0].server_time,
      },
    });
  } catch (error) {
    next(error);
  }
};
