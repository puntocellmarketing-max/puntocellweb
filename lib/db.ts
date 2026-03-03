import mysql from "mysql2/promise";

const url = process.env.MYSQL_URL;

if (!url) {
  throw new Error("Falta MYSQL_URL (Railway). Definí MYSQL_URL en Variables del servicio.");
}

export const pool = mysql.createPool(url);