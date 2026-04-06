import mysql from "mysql2/promise";

function required(name: string, value: string | undefined) {
  if (!value || !String(value).trim()) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value;
}

const LOCAL_DB_HOST = process.env.LOCAL_DB_HOST;
const LOCAL_DB_PORT = Number(process.env.LOCAL_DB_PORT || 3306);
const LOCAL_DB_USER = process.env.LOCAL_DB_USER;
const LOCAL_DB_PASS = process.env.LOCAL_DB_PASS;
const LOCAL_DB_NAME = process.env.LOCAL_DB_NAME;

if (!Number.isFinite(LOCAL_DB_PORT) || LOCAL_DB_PORT <= 0) {
  throw new Error("LOCAL_DB_PORT inválido.");
}

export const localPool = mysql.createPool({
  host: required("LOCAL_DB_HOST", LOCAL_DB_HOST),
  port: LOCAL_DB_PORT,
  user: required("LOCAL_DB_USER", LOCAL_DB_USER),
  password: required("LOCAL_DB_PASS", LOCAL_DB_PASS),
  database: required("LOCAL_DB_NAME", LOCAL_DB_NAME),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});