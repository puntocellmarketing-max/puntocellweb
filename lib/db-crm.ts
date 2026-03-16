import mysql from "mysql2/promise";

function required(name: string, value: string | undefined) {
  if (!value || !String(value).trim()) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value;
}

const CRM_DB_HOST =
  process.env.CRM_DB_HOST ||
  process.env.DB_HOST ||
  process.env.MYSQLHOST;

const CRM_DB_PORT = Number(
  process.env.CRM_DB_PORT ||
    process.env.DB_PORT ||
    process.env.MYSQLPORT ||
    3306
);

const CRM_DB_USER =
  process.env.CRM_DB_USER ||
  process.env.DB_USER ||
  process.env.MYSQLUSER;

const CRM_DB_PASS =
  process.env.CRM_DB_PASS ||
  process.env.DB_PASS ||
  process.env.MYSQLPASSWORD;

const CRM_DB_NAME =
  process.env.CRM_DB_NAME ||
  process.env.DB_NAME ||
  process.env.MYSQLDATABASE;

if (!Number.isFinite(CRM_DB_PORT) || CRM_DB_PORT <= 0) {
  throw new Error("CRM_DB_PORT inválido.");
}

export const crmPool = mysql.createPool({
  host: required("CRM_DB_HOST", CRM_DB_HOST),
  port: CRM_DB_PORT,
  user: required("CRM_DB_USER", CRM_DB_USER),
  password: required("CRM_DB_PASS", CRM_DB_PASS),
  database: required("CRM_DB_NAME", CRM_DB_NAME),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});