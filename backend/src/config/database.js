import mysql from "mysql2/promise";

const requiredVariables = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_NAME",
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(`Falta la variable de entorno ${variable}`);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

export const testDatabaseConnection = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
};

export default pool;
