import mysql from "mysql2/promise";

export const crmPool = mysql.createPool({
  host: process.env.CRM_DB_HOST,
  port: Number(process.env.CRM_DB_PORT || 3306),
  user: process.env.CRM_DB_USER,
  password: process.env.CRM_DB_PASS,
  database: process.env.CRM_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});