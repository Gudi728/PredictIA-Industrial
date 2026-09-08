import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/database.js";

const requiredVariables = [
  "ADMIN_NOMBRE",
  "ADMIN_APELLIDO",
  "ADMIN_USERNAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

const validateEnvironment = () => {
  for (const variable of requiredVariables) {
    if (!process.env[variable]?.trim()) {
      throw new Error(`Falta la variable de entorno ${variable}`);
    }
  }

  if (process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD debe contener al menos 8 caracteres"
    );
  }
};

const createInitialAdmin = async () => {
  validateEnvironment();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roles] = await connection.execute(
      `SELECT id_rol
       FROM roles
       WHERE nombre = ? AND activo = TRUE
       LIMIT 1`,
      ["administrador"]
    );

    if (roles.length === 0) {
      throw new Error(
        "No existe el rol administrador activo. Ejecutá primero 02_seed.sql"
      );
    }

    const [existingUsers] = await connection.execute(
      `SELECT id_usuario, nombre_usuario, correo
       FROM usuarios
       WHERE nombre_usuario = ? OR correo = ?
       LIMIT 1`,
      [
        process.env.ADMIN_USERNAME.trim(),
        process.env.ADMIN_EMAIL.trim().toLowerCase(),
      ]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      const sameAccount =
        existingUser.nombre_usuario ===
          process.env.ADMIN_USERNAME.trim() &&
        existingUser.correo ===
          process.env.ADMIN_EMAIL.trim().toLowerCase();

      if (!sameAccount) {
        throw new Error(
          "El nombre de usuario o correo ya pertenece a otra cuenta"
        );
      }

      await connection.rollback();

      console.log(
        `El administrador inicial ya existe con id ${existingUser.id_usuario}`
      );

      return;
    }

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    const [result] = await connection.execute(
      `INSERT INTO usuarios (
         id_rol,
         nombre,
         apellido,
         nombre_usuario,
         correo,
         contrasena_hash,
         activo
       )
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        roles[0].id_rol,
        process.env.ADMIN_NOMBRE.trim(),
        process.env.ADMIN_APELLIDO.trim(),
        process.env.ADMIN_USERNAME.trim(),
        process.env.ADMIN_EMAIL.trim().toLowerCase(),
        passwordHash,
      ]
    );

    await connection.commit();

    console.log(
      `Administrador inicial creado correctamente con id ${result.insertId}`
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

try {
  await createInitialAdmin();
} catch (error) {
  console.error(
    "No fue posible crear el administrador inicial:",
    error.message
  );

  process.exitCode = 1;
} finally {
  await pool.end();
}