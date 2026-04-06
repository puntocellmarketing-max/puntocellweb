// lib/extractos/getExtractoData.ts
import { pool } from "@/lib/db";

type CuotaRow = {
  codCliente: number;
  cliente: string;
  CodCobrar?: number | null;
  NroCuota: number;
  codVenta: number;
  Fecha: string;
  Total: number | string;
  Saldo: number | string;
  FechaPago: string | null;
  Estado: string;
  FechaVenta: string;
  NroFactura: string;
  TotalVenta: number | string;
  codVendedor: number;
  Vendedor: string;
};

type ArticuloRow = {
  codVenta: number;
  codArticulo: number | string;
  articulo: string;
  Cantidad: number | string;
  PrecioDescuento: number | string;
};

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getExtractoData(codCliente: number) {
  if (!Number.isFinite(codCliente) || codCliente <= 0) {
    throw new Error("Código de cliente inválido.");
  }

  const [rows] = await pool.query<CuotaRow[]>(
    `
    SELECT 
        c.codCliente,
        c.cliente,
        c.CodCobrar,
        c.NroCuota,
        c.codVenta,
        c.Fecha,
        c.Total,
        c.Saldo,
        c.FechaPago,
        c.Estado,
        v.Fecha AS FechaVenta,
        v.NroFactura,
        v.Total AS TotalVenta,
        v.codVendedor,
        vd.Vendedor
    FROM ve_cuentasacobrar c
    INNER JOIN ve_venta v 
        ON c.codVenta = v.codVenta
    INNER JOIN ve_vendedor vd 
        ON v.codVendedor = vd.codVendedor
    WHERE c.codCliente = ?
      AND c.Estado = 'PEN'
    ORDER BY c.codVenta, c.Fecha ASC
    `,
    [codCliente]
  );

  if (!rows.length) {
    throw new Error("Este cliente no tiene facturas pendientes.");
  }

  const codVentas = [...new Set(rows.map((r) => r.codVenta))];

  const placeholders = codVentas.map(() => "?").join(",");

  const [artRows] = await pool.query<ArticuloRow[]>(
    `
    SELECT
      codVenta,
      codArticulo,
      articulo,
      Cantidad,
      PrecioDescuento
    FROM ve_venta_detalle
    WHERE codVenta IN (${placeholders})
    ORDER BY codVenta ASC
    `,
    codVentas
  );

  const articulosPorVenta: Record<number, ArticuloRow[]> = {};
  for (const art of artRows) {
    if (!articulosPorVenta[art.codVenta]) {
      articulosPorVenta[art.codVenta] = [];
    }
    articulosPorVenta[art.codVenta].push(art);
  }

  const facturasMap: Record<
    number,
    {
      codVenta: number;
      nroFactura: string;
      fechaFactura: string;
      vendedor: string;
      totalFactura: number;
      cliente: string;
      codCliente: number;
      cuotas: Array<{
        nroCuota: number;
        fecha: string;
        fechaPago: string | null;
        estado: string;
        importe: number;
        cobrado: number;
        saldo: number;
      }>;
      articulos: Array<{
        codArticulo: number | string;
        articulo: string;
        cantidad: number;
        precio: number;
        subtotal: number;
      }>;
      totalPagado: number;
      saldoReal: number;
    }
  > = {};

  for (const row of rows) {
    if (!facturasMap[row.codVenta]) {
      const articulos = (articulosPorVenta[row.codVenta] || []).map((a) => {
        const cantidad = toNumber(a.Cantidad);
        const precio = toNumber(a.PrecioDescuento);
        return {
          codArticulo: a.codArticulo,
          articulo: a.articulo,
          cantidad,
          precio,
          subtotal: cantidad * precio,
        };
      });

      facturasMap[row.codVenta] = {
        codVenta: row.codVenta,
        nroFactura: row.NroFactura,
        fechaFactura: row.FechaVenta,
        vendedor: row.Vendedor,
        totalFactura: toNumber(row.TotalVenta),
        cliente: row.cliente,
        codCliente: row.codCliente,
        cuotas: [],
        articulos,
        totalPagado: 0,
        saldoReal: 0,
      };
    }

    const importe = toNumber(row.Total);
    const saldo = toNumber(row.Saldo);
    const cobrado = importe - saldo;

    facturasMap[row.codVenta].cuotas.push({
      nroCuota: row.NroCuota,
      fecha: row.Fecha,
      fechaPago: row.FechaPago,
      estado: row.Estado,
      importe,
      cobrado,
      saldo,
    });
  }

  const facturas = Object.values(facturasMap).map((factura) => {
    const totalPagado = factura.cuotas.reduce((acc, c) => acc + c.cobrado, 0);
    const saldoReal = factura.cuotas.reduce((acc, c) => acc + c.saldo, 0);

    return {
      ...factura,
      totalPagado,
      saldoReal,
    };
  });

  const totalFacturadoGeneral = facturas.reduce((acc, f) => acc + f.totalFactura, 0);
  const totalPagadoGeneral = facturas.reduce((acc, f) => acc + f.totalPagado, 0);
  const totalSaldoGeneral = facturas.reduce((acc, f) => acc + f.saldoReal, 0);

  return {
    cliente: rows[0].cliente,
    codCliente: rows[0].codCliente,
    fechaEmision: new Date(),
    cantidadFacturas: facturas.length,
    totalFacturadoGeneral,
    totalPagadoGeneral,
    totalSaldoGeneral,
    facturas,
  };
}