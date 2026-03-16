import mysql from "mysql2/promise";

function required(name: string, value: string | undefined) {
  if (!value || !String(value).trim()) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value;
}

const DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST;
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const DB_USER = process.env.DB_USER || process.env.MYSQLUSER;
const DB_PASS = process.env.DB_PASS || process.env.MYSQLPASSWORD;
const DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE;

if (!Number.isFinite(DB_PORT) || DB_PORT <= 0) {
  throw new Error("DB_PORT inválido.");
}

export const pool = mysql.createPool({
  host: required("DB_HOST", DB_HOST),
  port: DB_PORT,
  user: required("DB_USER", DB_USER),
  password: required("DB_PASS", DB_PASS),
  database: required("DB_NAME", DB_NAME),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});