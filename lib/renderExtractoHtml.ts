// lib/extractos/renderExtractoHtml.ts
function escapeHtml(text: unknown): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatGs(value: number): string {
  return `${new Intl.NumberFormat("es-PY").format(value)} Gs`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-PY");
}

function formatDateTime(value: Date): string {
  return value.toLocaleString("es-PY");
}

function formatQty(value: number): string {
  return value.toLocaleString("es-PY", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

type ExtractoData = Awaited<
  ReturnType<typeof import("./getExtractoData").getExtractoData>
>;

export function renderExtractoHtml(data: ExtractoData) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 10mm 16mm 10mm;
    }

    body {
      font-family: Arial, sans-serif;
      color: #111;
      font-size: 12px;
      margin: 0;
    }

    .header {
      text-align: center;
      margin-bottom: 14px;
    }

    .empresa {
      font-size: 21px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .titulo {
      margin-top: 6px;
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .subtitulo {
      margin-top: 2px;
      font-size: 11px;
      color: #444;
    }

    .box {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .box td {
      border: 1px solid #444;
      padding: 7px 8px;
      vertical-align: top;
    }

    .box .label {
      font-weight: bold;
    }

    .resumen {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
    }

    .resumen td {
      border: 1px solid #333;
      padding: 8px;
    }

    .resumen .label {
      background: #f2f2f2;
      font-weight: bold;
      width: 42%;
    }

    .resumen .valor {
      text-align: right;
      font-weight: bold;
    }

    .bloque-factura {
      margin-top: 16px;
      page-break-inside: avoid;
    }

    .factura-titulo {
      font-size: 12.5px;
      font-weight: bold;
      border-bottom: 2px solid #333;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }

    .tabla {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }

    .tabla th,
    .tabla td {
      border: 1px solid #333;
      padding: 5px 6px;
      font-size: 10.5px;
    }

    .tabla th {
      background: #f1f1f1;
      text-align: center;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .resumen-factura {
      border: 1px solid #333;
      background: #fafafa;
      padding: 8px;
      font-weight: bold;
      font-size: 10.8px;
      margin-bottom: 10px;
    }

    .saldo-final {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .saldo-final td {
      border: 2px solid #111;
      padding: 12px;
    }

    .saldo-final .label {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      width: 60%;
    }

    .saldo-final .valor {
      text-align: right;
      font-size: 20px;
      font-weight: bold;
      width: 40%;
    }

    .pie {
      margin-top: 16px;
      text-align: center;
      font-size: 10px;
      color: #444;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="empresa">PUNTO CELL</div>
    <div class="titulo">Extracto de Saldo del Cliente</div>
    <div class="subtitulo">Documento emitido automáticamente desde el CRM</div>
  </div>

  <table class="box">
    <tr>
      <td><span class="label">Cliente:</span> ${escapeHtml(data.cliente)}</td>
      <td><span class="label">Código:</span> ${escapeHtml(data.codCliente)}</td>
    </tr>
    <tr>
      <td><span class="label">Fecha de emisión:</span> ${escapeHtml(formatDateTime(data.fechaEmision))}</td>
      <td><span class="label">Facturas pendientes:</span> ${data.cantidadFacturas}</td>
    </tr>
  </table>

  <table class="resumen">
    <tr>
      <td class="label">Total facturado</td>
      <td class="valor">${formatGs(data.totalFacturadoGeneral)}</td>
    </tr>
    <tr>
      <td class="label">Total pagado</td>
      <td class="valor">${formatGs(data.totalPagadoGeneral)}</td>
    </tr>
    <tr>
      <td class="label">Saldo pendiente total</td>
      <td class="valor">${formatGs(data.totalSaldoGeneral)}</td>
    </tr>
  </table>

  ${data.facturas
    .map(
      (factura) => `
      <div class="bloque-factura">
        <div class="factura-titulo">
          Factura: ${escapeHtml(factura.nroFactura)} |
          Fecha: ${formatDate(factura.fechaFactura)} |
          Vendedor: ${escapeHtml(factura.vendedor)}
        </div>

        <table class="tabla">
          <tr>
            <th style="width:12%;">Código</th>
            <th style="width:12%;">Cantidad</th>
            <th style="width:44%;">Artículo</th>
            <th style="width:16%;">Precio</th>
            <th style="width:16%;">SubTotal</th>
          </tr>
          ${
            factura.articulos.length
              ? factura.articulos
                  .map(
                    (art) => `
                    <tr>
                      <td class="text-center">${escapeHtml(art.codArticulo)}</td>
                      <td class="text-center">${formatQty(art.cantidad)}</td>
                      <td>${escapeHtml(art.articulo)}</td>
                      <td class="text-right">${formatGs(art.precio)}</td>
                      <td class="text-right">${formatGs(art.subtotal)}</td>
                    </tr>
                  `
                  )
                  .join("")
              : `
                <tr>
                  <td colspan="5" class="text-center">Sin detalle de artículos.</td>
                </tr>
              `
          }
        </table>

        <table class="tabla">
          <tr>
            <th style="width:10%;">Cuota</th>
            <th style="width:16%;">Vencimiento</th>
            <th style="width:16%;">Fecha Pago</th>
            <th style="width:10%;">Estado</th>
            <th style="width:16%;">Importe</th>
            <th style="width:16%;">Cobrado</th>
            <th style="width:16%;">Saldo</th>
          </tr>
          ${factura.cuotas
            .map(
              (cuota) => `
              <tr>
                <td class="text-center">${escapeHtml(cuota.nroCuota)}</td>
                <td class="text-center">${formatDate(cuota.fecha)}</td>
                <td class="text-center">${formatDate(cuota.fechaPago)}</td>
                <td class="text-center">${escapeHtml(cuota.estado)}</td>
                <td class="text-right">${formatGs(cuota.importe)}</td>
                <td class="text-right">${formatGs(cuota.cobrado)}</td>
                <td class="text-right">${formatGs(cuota.saldo)}</td>
              </tr>
            `
            )
            .join("")}
        </table>

        <div class="resumen-factura">
          Total Facturado: ${formatGs(factura.totalFactura)}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          Pagado: ${formatGs(factura.totalPagado)}
          &nbsp;&nbsp;|&nbsp;&nbsp;
          Saldo: ${formatGs(factura.saldoReal)}
        </div>
      </div>
    `
    )
    .join("")}

  <table class="saldo-final">
    <tr>
      <td class="label">SALDO PENDIENTE TOTAL</td>
      <td class="valor">${formatGs(data.totalSaldoGeneral)}</td>
    </tr>
  </table>

  <div class="pie">
    Este extracto refleja los saldos pendientes al momento de su emisión.<br/>
    Si el cliente ya realizó un pago, corresponde validar el comprobante y actualizar el estado.
  </div>
</body>
</html>
`;
}