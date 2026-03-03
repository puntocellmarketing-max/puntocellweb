import mysql from "mysql2/promise";

// Validación simple de env (te ayuda muchísimo en debug)
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME;

if (!DB_NAME) {
  // Si DB_NAME no existe, pool queda undefined en algunos setups o rompe el init
  console.error("Falta DB_NAME en .env.local");
}

export const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Importante para XAMPP/MySQL local
  namedPlaceholders: false,
});