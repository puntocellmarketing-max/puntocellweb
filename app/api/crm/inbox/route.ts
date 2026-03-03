import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Number(searchParams.get("limit") || 50));

    // Test conexión simple
    await pool.query("SELECT 1");

    const [rows]: any = await pool.query(
      `SELECT 
         m.id_mensaje,
         m.telefono,
         m.cod_cliente,
         m.tipo,
         m.contenido,
         m.fecha_recibido
       FROM mensajes_entrantes m
       ORDER BY m.fecha_recibido DESC
       LIMIT ?`,
      [limit]
    );

    return NextResponse.json({ ok: true, rows: rows ?? [] });
  } catch (err: any) {
    console.error("INBOX 500 =>", err);
    return NextResponse.json(
      { ok: false, rows: [], error: err?.message || "Error servidor" },
      { status: 500 }
    );
  }
}