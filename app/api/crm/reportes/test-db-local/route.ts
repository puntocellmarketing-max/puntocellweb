import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const runtime = "nodejs";

let localPool: mysql.Pool | null = null;

function getLocalPool() {
  if (localPool) return localPool;

  localPool = mysql.createPool({
    host: process.env.LOCAL_DB_HOST,
    port: Number(process.env.LOCAL_DB_PORT || 3306),
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASS,
    database: process.env.LOCAL_DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
  });

  return localPool;
}

export async function GET() {
  try {
    const pool = getLocalPool();

    const [rows] = await pool.query(
      `
      SELECT
        codCliente,
        Fecha,
        Total,
        Nrorecibo,
        Estado
      FROM ve_recibo
      ORDER BY Fecha DESC
      LIMIT 5
      `
    );

    return NextResponse.json({
      ok: true,
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}