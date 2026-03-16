import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type EnvioRow = RowDataPacket & {
  id_envio: number;
  cod_cliente: number | null;
  telefono: string | null;
  plantilla: string | null;
  idioma: string | null;
  estado: string | null;
  id_mensaje_whatsapp: string | null;
  error_mensaje: string | null;
  intentos: number | null;
  fecha_creacion: string | null;
  fecha_envio: string | null;
  fecha_entregado: string | null;
  fecha_leido: string | null;
  fecha_fallo: string | null;
};

function safeInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idCampania = Number(id);

    if (!Number.isInteger(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de campaña inválido." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    const estado = (searchParams.get("estado") || "").trim();
    const page = safeInt(searchParams.get("page"), 1, 1, 100000);
    const pageSize = safeInt(searchParams.get("pageSize"), 20, 1, 200);
    const offset = (page - 1) * pageSize;

    const where: string[] = ["id_campania = ?"];
    const values: Array<string | number> = [idCampania];

    if (estado) {
      where.push("estado = ?");
      values.push(estado);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [countRows] = await crmPool.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS total
      FROM envios_whatsapp
      ${whereSql}
      `,
      values
    );

    const total = Number(countRows[0]?.total ?? 0);

    const [rows] = await crmPool.query<EnvioRow[]>(
      `
      SELECT
        id_envio,
        cod_cliente,
        telefono,
        plantilla,
        idioma,
        estado,
        id_mensaje_whatsapp,
        error_mensaje,
        intentos,
        fecha_creacion,
        fecha_envio,
        fecha_entregado,
        fecha_leido,
        fecha_fallo
      FROM envios_whatsapp
      ${whereSql}
      ORDER BY id_envio DESC
      LIMIT ? OFFSET ?
      `,
      [...values, pageSize, offset]
    );

    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        idEnvio: Number(row.id_envio),
        codCliente: row.cod_cliente !== null ? Number(row.cod_cliente) : null,
        telefono: row.telefono,
        plantilla: row.plantilla,
        idioma: row.idioma || "es",
        estado: row.estado,
        idMensajeWhatsapp: row.id_mensaje_whatsapp,
        errorMensaje: row.error_mensaje,
        intentos: Number(row.intentos ?? 0),
        fechaCreacion: row.fecha_creacion,
        fechaEnvio: row.fecha_envio,
        fechaEntregado: row.fecha_entregado,
        fechaLeido: row.fecha_leido,
        fechaFallo: row.fecha_fallo,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}