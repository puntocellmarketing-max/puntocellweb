import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CreateCampaignPayload = {
  idAudiencia: number;
  nombre: string;
  tipo?: "VENCIMIENTO" | "ATRASO" | "GENERAL" | null;
  plantilla: string;
  idioma?: string | null;
  creadoPor?: string | null;
  observaciones?: string | null;
  ventanaAnalisisDias?: number | null;
  fechaLanzamiento?: string | null; // YYYY-MM-DD HH:mm:ss opcional
};

type AudienceRow = RowDataPacket & {
  id_audiencia: number;
  nombre: string;
  descripcion: string | null;
  filtros_json: string | null;
  total_clientes: number;
  total_validos: number;
  total_invalidos: number;
  estado: string;
};

function safeInt(value: any, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isValidDateTime(value: string | null): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(value);
}

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as CreateCampaignPayload;

    const idAudiencia = Number(body?.idAudiencia ?? 0);
    const nombre = String(body?.nombre || "").trim();
    const tipo = String(body?.tipo || "GENERAL").trim() as
      | "VENCIMIENTO"
      | "ATRASO"
      | "GENERAL";
    const plantilla = String(body?.plantilla || "").trim();
    const idioma = String(body?.idioma || "es").trim() || "es";
    const creadoPor = String(body?.creadoPor || "").trim() || "SYSTEM";
    const observaciones = String(body?.observaciones || "").trim() || null;
    const ventanaAnalisisDias = safeInt(body?.ventanaAnalisisDias ?? 30, 30, 1, 365);
    const fechaLanzamiento = String(body?.fechaLanzamiento || "").trim() || null;

    if (!Number.isFinite(idAudiencia) || idAudiencia <= 0) {
      return NextResponse.json(
        { ok: false, error: "idAudiencia inválido." },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre de campaña." },
        { status: 400 }
      );
    }

    if (!plantilla) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre de plantilla." },
        { status: 400 }
      );
    }

    if (!["VENCIMIENTO", "ATRASO", "GENERAL"].includes(tipo)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de campaña inválido." },
        { status: 400 }
      );
    }

    if (!isValidDateTime(fechaLanzamiento)) {
      return NextResponse.json(
        {
          ok: false,
          error: "fechaLanzamiento debe tener formato YYYY-MM-DD o YYYY-MM-DD HH:mm:ss.",
        },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1) Verificar audiencia
    const [audRows] = await conn.query<AudienceRow[]>(
      `
      SELECT
        id_audiencia,
        nombre,
        descripcion,
        filtros_json,
        total_clientes,
        total_validos,
        total_invalidos,
        estado
      FROM crm_audiencias
      WHERE id_audiencia = ?
      LIMIT 1
      `,
      [idAudiencia]
    );

    if (!audRows.length) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "Audiencia no encontrada." },
        { status: 404 }
      );
    }

    const audiencia = audRows[0];

    if (Number(audiencia.total_clientes ?? 0) <= 0) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La audiencia no tiene clientes." },
        { status: 400 }
      );
    }

    // 2) Crear campaña
    const [insertCamp] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO campanias (
        id_audiencia,
        nombre,
        tipo,
        plantilla,
        idioma,
        estado,
        total_enviados,
        total_error,
        fecha_creacion,
        creado_por,
        observaciones,
        filtros_json,
        fecha_lanzamiento,
        ventana_analisis_dias,
        total_audiencia,
        total_entregados,
        total_leidos,
        total_respondieron,
        total_pagaron,
        monto_total_pagado
      ) VALUES (
        ?, ?, ?, ?, ?, 'BORRADOR',
        0, 0, NOW(), ?, ?, ?, COALESCE(?, NOW()), ?,
        ?, 0, 0, 0, 0, 0.00
      )
      `,
      [
        idAudiencia,
        nombre,
        tipo,
        plantilla,
        idioma,
        creadoPor,
        observaciones,
        audiencia.filtros_json,
        fechaLanzamiento,
        ventanaAnalisisDias,
        Number(audiencia.total_clientes ?? 0),
      ]
    );

    const idCampania = Number(insertCamp.insertId);

    await conn.commit();

    return NextResponse.json({
      ok: true,
      idCampania,
      message: "Campaña creada correctamente desde la audiencia.",
      resumen: {
        idAudiencia,
        totalAudiencia: Number(audiencia.total_clientes ?? 0),
        totalValidos: Number(audiencia.total_validos ?? 0),
        totalInvalidos: Number(audiencia.total_invalidos ?? 0),
        plantilla,
        idioma,
        tipo,
        ventanaAnalisisDias,
      },
    });
  } catch (e: any) {
    try {
      if (conn) await conn.rollback();
    } catch {}

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}