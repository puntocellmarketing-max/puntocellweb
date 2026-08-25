import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type ConversacionRow = RowDataPacket & {
  telefono: string;
  codCliente: number | null;
  cliente: string | null;
  ultimoMensaje: string | null;
  ultimoTipo: string | null;
  ultimoAt: string | null;
  unreadCount: number | null;
  estado: string | null;

  saldo: number | null;
  diasAtraso: number | null;
  ultimoPago: string | null;
  categoria: string | null;
  zona: string | null;

  idAgenda: number | null;
  estadoAgenda: string | null;
  tipoGestion: string | null;
  prioridadAgenda: string | null;
  fechaRecordatorio: string | null;
  notaAgenda: string | null;
  resultadoAgenda: string | null;
};

function normalizeLikeSearch(value: string) {
  return `%${value.trim()}%`;
}

function seguimientoFromAgenda(row: ConversacionRow) {
  if (!row.idAgenda) return "SIN_AGENDA";

  if (row.estadoAgenda === "PAGADO") return "PAGADO";
  if (row.estadoAgenda === "NO_RESPONDE") return "NO_RESPONDE";
  if (row.estadoAgenda === "ERRONEO") return "ERRONEO";
  if (row.estadoAgenda === "REALIZADO") return "REALIZADO";
  if (row.estadoAgenda === "REAGENDADO") return "REAGENDADO";
  if (row.estadoAgenda === "CANCELADO") return "CANCELADO";

  if (row.estadoAgenda === "PENDIENTE") {
    if (row.fechaRecordatorio) {
      const fecha = new Date(row.fechaRecordatorio);
      const ahora = new Date();

      if (!Number.isNaN(fecha.getTime()) && fecha.getTime() < ahora.getTime()) {
        return "VENCIDO";
      }
    }

    if (row.tipoGestion === "PROMESA_PAGO") return "PROMESA";
    return "PENDIENTE";
  }

  return "AGENDADO";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit") || "50";
    const parsed = parseInt(limitRaw, 10);
    const safeLimit = Number.isFinite(parsed)
      ? Math.max(1, Math.min(200, parsed))
      : 50;

    const q = String(searchParams.get("q") || "").trim();
    const estado = String(searchParams.get("estado") || "").trim().toUpperCase();

    const soloNoLeidos =
      searchParams.get("soloNoLeidos") === "1" ||
      searchParams.get("soloNoLeidos") === "true";

    const agenda = String(searchParams.get("agenda") || "").trim().toUpperCase();

    const where: string[] = ["1=1"];
    const params: any[] = [];

    if (estado && estado !== "TODOS") {
      where.push("c.estado = ?");
      params.push(estado);
    }

    if (soloNoLeidos) {
      where.push("COALESCE(c.unread_count, 0) > 0");
    }

    if (q) {
      const like = normalizeLikeSearch(q);

      where.push(`
        (
          c.telefono LIKE ?
          OR COALESCE(cs.cliente, '') LIKE ?
          OR CAST(COALESCE(cs.cod_cliente, c.cod_cliente) AS CHAR) LIKE ?
          OR COALESCE(c.ultimo_mensaje, '') LIKE ?
          OR COALESCE(cs.zona, '') LIKE ?
          OR COALESCE(cs.categoria, '') LIKE ?
        )
      `);

      params.push(like, like, like, like, like, like);
    }

    if (agenda === "SIN_AGENDA") {
      where.push("ag.id_agenda IS NULL");
    }

    if (agenda === "CON_AGENDA") {
      where.push("ag.id_agenda IS NOT NULL");
    }

    if (agenda === "PENDIENTE") {
      where.push("ag.estado = 'PENDIENTE'");
    }

    if (agenda === "PROMESA") {
      where.push("ag.tipo_gestion = 'PROMESA_PAGO'");
    }

    if (agenda === "VENCIDO") {
      where.push(`
        ag.estado = 'PENDIENTE'
        AND ag.fecha_recordatorio IS NOT NULL
        AND ag.fecha_recordatorio < NOW()
      `);
    }

    const sql = `
      SELECT
        c.telefono AS telefono,
        COALESCE(cs.cod_cliente, c.cod_cliente) AS codCliente,
        COALESCE(cs.cliente, NULL) AS cliente,
        c.ultimo_mensaje AS ultimoMensaje,
        c.ultimo_tipo AS ultimoTipo,
        c.ultimo_at AS ultimoAt,
        c.unread_count AS unreadCount,
        c.estado AS estado,

        cs.saldo AS saldo,
        cs.dias_atraso AS diasAtraso,
        cs.ultimo_pago AS ultimoPago,
        cs.categoria AS categoria,
        cs.zona AS zona,

        ag.id_agenda AS idAgenda,
        ag.estado AS estadoAgenda,
        ag.tipo_gestion AS tipoGestion,
        ag.prioridad AS prioridadAgenda,
        ag.fecha_recordatorio AS fechaRecordatorio,
        ag.nota AS notaAgenda,
        ag.resultado AS resultadoAgenda

      FROM conversaciones c

      LEFT JOIN crm_clientes_sync cs
        ON cs.id_sync = (
          SELECT MAX(cs2.id_sync)
          FROM crm_clientes_sync cs2
          WHERE cs2.telefono_normalizado = c.telefono
        )

      LEFT JOIN (
        SELECT a.*
        FROM agenda_crm a
        INNER JOIN (
          SELECT
            COALESCE(CAST(cod_cliente AS CHAR), telefono) AS agenda_key,
            MAX(id_agenda) AS max_id_agenda
          FROM agenda_crm
          WHERE estado <> 'CANCELADO'
          GROUP BY COALESCE(CAST(cod_cliente AS CHAR), telefono)
        ) ult
          ON ult.max_id_agenda = a.id_agenda
      ) ag
        ON (
          ag.cod_cliente IS NOT NULL
          AND ag.cod_cliente = COALESCE(cs.cod_cliente, c.cod_cliente)
        )
        OR (
          ag.cod_cliente IS NULL
          AND ag.telefono = c.telefono
        )

      WHERE ${where.join(" AND ")}

      ORDER BY
        CASE
          WHEN COALESCE(c.unread_count, 0) > 0 THEN 0
          ELSE 1
        END ASC,
        c.ultimo_at DESC

      LIMIT ${safeLimit}
    `;

    const [rows] = await crmPool.query<ConversacionRow[]>(sql, params);

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => {
        const seguimiento = seguimientoFromAgenda(r);

        return {
          telefono: r.telefono,
          codCliente: r.codCliente !== null ? Number(r.codCliente) : null,
          cliente: r.cliente || null,
          ultimoMensaje: r.ultimoMensaje || null,
          ultimoTipo: r.ultimoTipo || null,
          ultimoAt: r.ultimoAt || null,
          unreadCount: Number(r.unreadCount ?? 0),
          estado: r.estado || "NUEVO",

          saldo: r.saldo !== null && r.saldo !== undefined ? Number(r.saldo) : null,
          diasAtraso:
            r.diasAtraso !== null && r.diasAtraso !== undefined
              ? Number(r.diasAtraso)
              : null,
          ultimoPago: r.ultimoPago || null,
          categoria: r.categoria || null,
          zona: r.zona || null,

          agendado: Boolean(r.idAgenda),
          idAgenda: r.idAgenda !== null ? Number(r.idAgenda) : null,
          estadoAgenda: r.estadoAgenda || null,
          tipoGestion: r.tipoGestion || null,
          prioridadAgenda: r.prioridadAgenda || null,
          fechaRecordatorio: r.fechaRecordatorio || null,
          notaAgenda: r.notaAgenda || null,
          resultadoAgenda: r.resultadoAgenda || null,
          seguimiento,
        };
      }),
    });
  } catch (e: any) {
    console.error("Error /api/crm/conversaciones:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}