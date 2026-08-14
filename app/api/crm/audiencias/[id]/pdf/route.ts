import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

type AudienceHeaderRow = RowDataPacket & {
  id_audiencia: number;
  nombre: string;
  descripcion: string | null;
  origen: string;
  total_clientes: number;
  total_validos: number;
  total_invalidos: number;
  creado_por: string | null;
  fecha_creacion: string | null;
  estado: string;
};

type AudienceSummaryRow = RowDataPacket & {
  totalDetalle: number;
  saldoTotal: number;
  clientesConTelefono: number;
  clientesSinTelefono: number;
  clientesTelefonoValido: number;
  clientesRequierenRevision: number;
};

type AudienceDetailRow = RowDataPacket & {
  cod_cliente: number;
  cliente: string;
  telefono: string | null;
  telefono_valido: number;
  requiere_revision: number;
  dias_atraso: number | null;
  ultimo_pago: string | null;
  saldo: number | null;
  categoria: string | null;
  zona: string | null;
  estado_envio: string | null;
};

function formatMoney(value?: number | string | null) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-PY");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function safeText(value: unknown) {
  const s = String(value ?? "").trim();
  return s || "-";
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

function drawFooter(doc: PDFKit.PDFDocument, pageNo: number) {
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#64748B")
    .text(
      `Punto Cell - CRM de Cobranzas - Pagina ${pageNo}`,
      28,
      556,
      { width: 720, align: "center" }
    );
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  const cols = [
    { label: "Cliente", x: 32, w: 146 },
    { label: "Telefono", x: 180, w: 80 },
    { label: "Atraso", x: 262, w: 45 },
    { label: "Ult. pago", x: 309, w: 66 },
    { label: "Saldo", x: 377, w: 82 },
    { label: "Categoria", x: 461, w: 86 },
    { label: "Zona", x: 549, w: 80 },
    { label: "Estado", x: 631, w: 92 },
  ];

  doc.save().fillColor("#F1F5F9").rect(28, y, 720, 24).fill().restore();

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#334155");

  for (const c of cols) {
    doc.text(c.label, c.x, y + 7, {
      width: c.w,
      ellipsis: true,
    });
  }

  doc
    .moveTo(28, y + 24)
    .lineTo(748, y + 24)
    .strokeColor("#CBD5E1")
    .stroke();

  return y + 24;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idAudiencia = Number(id);

    if (!Number.isInteger(idAudiencia) || idAudiencia <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de audiencia invalido." },
        { status: 400 }
      );
    }

    const [audRows] = await crmPool.query<AudienceHeaderRow[]>(
      `
      SELECT
        id_audiencia,
        nombre,
        descripcion,
        origen,
        total_clientes,
        total_validos,
        total_invalidos,
        creado_por,
        fecha_creacion,
        estado
      FROM crm_audiencias
      WHERE id_audiencia = ?
      LIMIT 1
      `,
      [idAudiencia]
    );

    if (!audRows.length) {
      return NextResponse.json(
        { ok: false, error: "Audiencia no encontrada." },
        { status: 404 }
      );
    }

    const [summaryRows] = await crmPool.query<AudienceSummaryRow[]>(
      `
      SELECT
        COUNT(*) AS totalDetalle,
        COALESCE(SUM(saldo), 0) AS saldoTotal,
        COALESCE(SUM(CASE WHEN telefono IS NOT NULL AND telefono <> '' THEN 1 ELSE 0 END), 0) AS clientesConTelefono,
        COALESCE(SUM(CASE WHEN telefono IS NULL OR telefono = '' THEN 1 ELSE 0 END), 0) AS clientesSinTelefono,
        COALESCE(SUM(CASE WHEN telefono_valido = 1 THEN 1 ELSE 0 END), 0) AS clientesTelefonoValido,
        COALESCE(SUM(CASE WHEN requiere_revision = 1 THEN 1 ELSE 0 END), 0) AS clientesRequierenRevision
      FROM crm_audiencia_detalle
      WHERE id_audiencia = ?
      `,
      [idAudiencia]
    );

    const [detailRows] = await crmPool.query<AudienceDetailRow[]>(
      `
      SELECT
        cod_cliente,
        cliente,
        telefono,
        telefono_valido,
        requiere_revision,
        dias_atraso,
        ultimo_pago,
        saldo,
        categoria,
        zona,
        estado_envio
      FROM crm_audiencia_detalle
      WHERE id_audiencia = ?
      ORDER BY cliente ASC
      `,
      [idAudiencia]
    );

    const audiencia = audRows[0];
    const resumen = summaryRows[0] || {
      totalDetalle: 0,
      saldoTotal: 0,
      clientesConTelefono: 0,
      clientesSinTelefono: 0,
      clientesTelefonoValido: 0,
      clientesRequierenRevision: 0,
    };

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 28,
      info: {
        Title: `Audiencia ${idAudiencia} - ${audiencia.nombre}`,
        Author: "Punto Cell CRM",
        Subject: "Listado de clientes de audiencia",
      },
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    let pageNo = 1;

    const drawPageHeader = () => {
      doc
        .font("Helvetica-Bold")
        .fontSize(17)
        .fillColor("#0F172A")
        .text("PUNTO CELL - CRM DE COBRANZAS", 28, 28);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#475569")
        .text(`Audiencia #${audiencia.id_audiencia}`, 28, 52);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#0F172A")
        .text(audiencia.nombre, 28, 67, { width: 720 });

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#475569")
        .text(
          `Estado: ${safeText(audiencia.estado)}  |  Origen: ${safeText(
            audiencia.origen
          )}  |  Creado por: ${safeText(
            audiencia.creado_por
          )}  |  Fecha: ${formatDateTime(audiencia.fecha_creacion)}`,
          28,
          87,
          { width: 720 }
        );

      doc
        .fontSize(8)
        .fillColor("#334155")
        .text(
          `Clientes: ${Number(
            resumen.totalDetalle ?? detailRows.length
          )}  |  Saldo total: Gs. ${formatMoney(
            resumen.saldoTotal
          )}  |  Telefonos validos: ${Number(
            resumen.clientesTelefonoValido ?? 0
          )}  |  Revision: ${Number(
            resumen.clientesRequierenRevision ?? 0
          )}`,
          28,
          104,
          { width: 720 }
        );

      drawFooter(doc, pageNo);
    };

    drawPageHeader();

    let y = drawTableHeader(doc, 130);
    const rowHeight = 27;
    const bottomLimit = 545;

    for (const row of detailRows) {
      if (y + rowHeight > bottomLimit) {
        doc.addPage({
          size: "A4",
          layout: "landscape",
          margin: 28,
        });

        pageNo += 1;
        drawPageHeader();
        y = drawTableHeader(doc, 130);
      }

      doc
        .moveTo(28, y + rowHeight)
        .lineTo(748, y + rowHeight)
        .strokeColor("#E2E8F0")
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(7.4)
        .fillColor("#0F172A")
        .text(truncate(safeText(row.cliente), 33), 32, y + 5, {
          width: 146,
          ellipsis: true,
        });

      doc
        .font("Helvetica")
        .fontSize(6.4)
        .fillColor("#64748B")
        .text(`Cod: ${row.cod_cliente}`, 32, y + 15, {
          width: 146,
        });

      doc
        .font("Helvetica")
        .fontSize(7.1)
        .fillColor("#334155")
        .text(safeText(row.telefono), 180, y + 8, { width: 80 })
        .text(String(row.dias_atraso ?? 0), 262, y + 8, { width: 45 })
        .text(formatDateOnly(row.ultimo_pago), 309, y + 8, { width: 66 })
        .text(`Gs. ${formatMoney(row.saldo)}`, 377, y + 8, { width: 82 })
        .text(truncate(safeText(row.categoria), 18), 461, y + 8, {
          width: 86,
          ellipsis: true,
        })
        .text(truncate(safeText(row.zona), 16), 549, y + 8, {
          width: 80,
          ellipsis: true,
        })
        .text(truncate(safeText(row.estado_envio), 18), 631, y + 8, {
          width: 92,
          ellipsis: true,
        });

      y += rowHeight;
    }

    doc.end();

    const pdfBuffer = await pdfReady;

    const safeName = audiencia.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="audiencia_${idAudiencia}_${
          safeName || "listado"
        }.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("PDF AUDIENCIA ERROR:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
