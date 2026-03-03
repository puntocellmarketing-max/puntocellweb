import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { codCliente, telefono, fecha, nota, codCobrador } = await req.json();

    if (!codCliente || !fecha) {
      return NextResponse.json(
        { ok: false, error: "Falta codCliente o fecha" },
        { status: 400 }
      );
    }

    // Insert agenda (DATE)
    await pool.query(
      `INSERT INTO agenda
       (codCliente, FechaAlta, FechaAlerta, Nota, codCobrador, Cobrado, Reagendado)
       VALUES (?, CURDATE(), ?, ?, ?, '0', '0')`,
      [
        codCliente,
        fecha, // YYYY-MM-DD
        (nota && String(nota).trim()) || "Agendado vía WhatsApp",
        codCobrador ?? 1, // por ahora fijo 1 hasta integrarlo con login
      ]
    );

    // Update conversación
    if (telefono) {
      await pool.query(
        `UPDATE conversaciones_whatsapp
         SET estado='PROMESA_PAGO',
             fecha_proxima_accion=?,
             fecha_actualizacion=NOW()
         WHERE telefono=?`,
        [fecha, telefono]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Error servidor" },
      { status: 500 }
    );
  }
}