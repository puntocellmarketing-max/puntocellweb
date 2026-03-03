// app/lib/db.ts
import mysql from "mysql2/promise";

const url = process.env.MYSQL_URL;

if (!url) {
  throw new Error("Falta MYSQL_URL (Railway). Definí MYSQL_URL en Variables del servicio.");
}

export const pool = mysql.createPool(url);

// Helper seguro: params SIEMPRE array
export async function dbQuery<T = any>(sql: string, params: any[] = []) {
  if (!Array.isArray(params)) {
    throw new Error("dbQuery: params debe ser un array. Ej: dbQuery(sql, [a, b])");
  }
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}