"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CampaignDetail = {
  idCampania: number;
  idAudiencia: number | null;
  nombre: string;
  plantilla: string | null;
  idioma: string;
  estado: string | null;
  fechaLanzamiento: string | null;
  fechaCreacion: string | null;
  ventanaAnalisisDias: number;
  totalAudiencia: number;
  totalEnviados: number;
  totalError: number;
  totalEntregados: number;
  totalLeidos: number;
  totalRespondieron: number;
  totalPagaron: number;
  montoTotalPagado: number;
  creadoPor: string | null;
  observaciones: string | null;
  filtrosJson: string | null;
};

type QueueSummary = {
  totalCola: number;
  totalQueued: number;
  totalSending: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalCanceled: number;
};

type AudienceDetail = {
  idAudiencia: number;
  nombre: string;
  descripcion: string | null;
  origen: string;
  jobIdOrigen: string | null;
  totalClientes: number;
  totalValidos: number;
  totalInvalidos: number;
  estado: string;
  fechaCreacion: string | null;
} | null;

type EnvioItem = {
  idEnvio: number;
  codCliente: number | null;
  cliente?: string | null;
  telefono: string | null;
  plantilla: string | null;
  idioma: string;
  estado: string | null;
  idMensajeWhatsapp: string | null;
  errorMensaje: string | null;
  intentos: number;
  fechaCreacion: string | null;
  fechaEnvio: string | null;
  fechaEntregado: string | null;
  fechaLeido: string | null;
  fechaFallo: string | null;

  idAgenda?: number | null;
  agendado?: boolean;
  estadoAgenda?: string | null;
  tipoGestion?: string | null;
  fechaRecordatorio?: string | null;
  seguimiento?: string | null;
};

type Props = {
  idCampania: number;
};

const estadosFiltro = [
  { value: "", label: "Todos" },
  { value: "QUEUED", label: "En cola" },
  { value: "SENDING", label: "Enviando" },
  { value: "SENT", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "READ", label: "Leído" },
  { value: "FAILED", label: "Fallido" },
  { value: "CANCELED", label: "Cancelado" },
];

const agendaOptions = [
  { value: "TODOS", label: "Todos" },
  { value: "CON_AGENDA", label: "Con agenda" },
  { value: "SIN_AGENDA", label: "Sin agenda" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function estadoEnvioLabel(value: string | null | undefined) {
  switch (value) {
    case "QUEUED":
      return "En cola";
    case "SENDING":
      return "Enviando";
    case "SENT":
      return "Enviado";
    case "DELIVERED":
      return "Entregado";
    case "READ":
      return "Leído";
    case "FAILED":
      return "Fallido";
    case "CANCELED":
      return "Cancelado";
    default:
      return value || "-";
  }
}

function estadoEnvioClasses(value: string | null | undefined) {
  switch (value) {
    case "QUEUED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "SENDING":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "SENT":
      return "border-blue-200 bg-blue-100 text-blue-800";
    case "DELIVERED":
      return "border-cyan-200 bg-cyan-100 text-cyan-800";
    case "READ":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "FAILED":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "CANCELED":
      return "border-slate-300 bg-slate-200 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function seguimientoLabel(value: string | null | undefined) {
  switch (value) {
    case "SIN_AGENDA":
      return "Sin agenda";
    case "AGENDADO":
      return "Agendado";
    case "PENDIENTE":
      return "Pendiente";
    case "REAGENDADO":
      return "Reagendado";
    case "REALIZADO":
      return "Realizado";
    case "PAGADO":
      return "Pagado";
    case "NO_RESPONDE":
      return "No responde";
    case "ERRONEO":
      return "Erróneo";
    case "CANCELADO":
      return "Cancelado";
    default:
      return value || "-";
  }
}

function seguimientoClasses(value: string | null | undefined) {
  switch (value) {
    case "SIN_AGENDA":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "AGENDADO":
      return "border-blue-200 bg-blue-100 text-blue-800";
    case "PENDIENTE":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "REAGENDADO":
      return "border-yellow-200 bg-yellow-100 text-yellow-800";
    case "REALIZADO":
      return "border-violet-200 bg-violet-100 text-violet-800";
    case "PAGADO":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "NO_RESPONDE":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "ERRONEO":
      return "border-red-200 bg-red-100 text-red-800";
    case "CANCELADO":
      return "border-slate-300 bg-slate-200 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function tipoGestionLabel(value: string | null | undefined) {
  switch (value) {
    case "RECORDATORIO":
      return "Recordatorio";
    case "LLAMAR":
      return "Llamar";
    case "WHATSAPP":
      return "WhatsApp";
    case "VISITA":
      return "Visita";
    case "PROMESA_PAGO":
      return "Promesa de pago";
    case "SEGUIMIENTO":
      return "Seguimiento";
    default:
      return value || "-";
  }
}

export default function CampaignOperationsPanel({ idCampania }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingRetry, setLoadingRetry] = useState(false);

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [audience, setAudience] = useState<AudienceDetail>(null);
  const [queue, setQueue] = useState<QueueSummary | null>(null);

  const [items, setItems] = useState<EnvioItem[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [agendaFiltro, setAgendaFiltro] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [batchSize, setBatchSize] = useState(50);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCampaign() {
    const res = await fetch(`/api/crm/campanias/${idCampania}`, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data?.error || "No se pudo cargar la campaña.");
    }

    setCampaign(data.campania);
    setAudience(data.audiencia ?? null);
    setQueue(data.cola);
  }

  async function loadEnvios() {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (estadoFiltro) qs.set("estado", estadoFiltro);
    if (agendaFiltro && agendaFiltro !== "TODOS") {
      qs.set("agenda", agendaFiltro);
    }

    const res = await fetch(
      `/api/crm/campanias/${idCampania}/envios?${qs.toString()}`,
      { cache: "no-store" }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      throw new Error(data?.error || "No se pudo cargar la lista de envíos.");
    }

    setItems(data.items || []);
    setTotalPages(Number(data.pagination?.totalPages || 1));
  }

  async function reloadAll() {
    setError(null);
    await Promise.all([loadCampaign(), loadEnvios()]);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setMessage(null);
        setError(null);
        await Promise.all([loadCampaign(), loadEnvios()]);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Error cargando datos.");
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [idCampania, page, estadoFiltro, agendaFiltro]);

  async function ejecutarLote() {
    try {
      setLoadingRun(true);
      setMessage(null);
      setError(null);

      const res = await fetch(`/api/crm/campanias/${idCampania}/ejecutar-cola`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: batchSize,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "No se pudo ejecutar la cola.");
      }

      setMessage(
        `Lote ejecutado. Procesados: ${data?.resumen?.procesados ?? 0}, enviados: ${
          data?.resumen?.enviados ?? 0
        }, fallidos: ${data?.resumen?.fallidos ?? 0}, pendientes: ${
          data?.resumen?.pendientes ?? 0
        }.`
      );

      setPage(1);
      await reloadAll();
    } catch (e: any) {
      setError(e?.message || "Error ejecutando lote.");
    } finally {
      setLoadingRun(false);
    }
  }

  async function reintentarFallidos() {
    try {
      setLoadingRetry(true);
      setMessage(null);
      setError(null);

      const res = await fetch(
        `/api/crm/campanias/${idCampania}/reintentar-fallidos`,
        {
          method: "POST",
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "No se pudieron reintentar fallidos.");
      }

      setMessage(`Fallidos reencolados: ${data?.resumen?.reprocesados ?? 0}.`);

      setPage(1);
      await reloadAll();
    } catch (e: any) {
      setError(e?.message || "Error reintentando fallidos.");
    } finally {
      setLoadingRetry(false);
    }
  }

  const cards = useMemo(() => {
    return [
      { label: "Total", value: queue?.totalCola ?? 0 },
      { label: "En cola", value: queue?.totalQueued ?? 0 },
      { label: "Enviando", value: queue?.totalSending ?? 0 },
      { label: "Enviado", value: queue?.totalSent ?? 0 },
      { label: "Entregado", value: queue?.totalDelivered ?? 0 },
      { label: "Leído", value: queue?.totalRead ?? 0 },
      { label: "Fallido", value: queue?.totalFailed ?? 0 },
      { label: "Cancelado", value: queue?.totalCanceled ?? 0 },
    ];
  }, [queue]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Cargando operación de envíos...
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {campaign?.nombre || `Campaña #${idCampania}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Operación de envíos, ejecución por lotes y monitoreo de estados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/crm/campanias"
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Campañas
            </Link>

            <Link
              href={`/crm/campanias/${idCampania}`}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver a campaña
            </Link>

            <button
              onClick={reloadAll}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            <button
              onClick={reintentarFallidos}
              disabled={loadingRetry}
              className="rounded-2xl border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
            >
              {loadingRetry ? "Reintentando..." : "Reintentar fallidos"}
            </button>
          </div>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              ID CAMPAÑA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              #{idCampania}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              PLANTILLA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.plantilla || "Sin plantilla"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              ESTADO CAMPAÑA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.estado || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              AUDIENCIA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {audience?.nombre || "-"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Estados de la cola
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-semibold leading-none text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Operación del lote
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Configurá el tamaño de procesamiento, filtrá por estado y ejecutá la
            cola.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Tamaño de lote
              </label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filtrar por estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(e) => {
                  setPage(1);
                  setEstadoFiltro(e.target.value);
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                {estadosFiltro.map((estado) => (
                  <option key={estado.value || "ALL"} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Filtrar por agenda
              </label>
              <select
                value={agendaFiltro}
                onChange={(e) => {
                  setPage(1);
                  setAgendaFiltro(e.target.value);
                }}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                {agendaOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button
              onClick={ejecutarLote}
              disabled={loadingRun || (queue?.totalQueued ?? 0) <= 0}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingRun
                ? "Procesando lote..."
                : `Procesar lote de ${batchSize}`}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Detalle de envíos
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Cod. Cliente</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Plantilla</th>
                <th className="px-4 py-3 font-medium">Estado envío</th>
                <th className="px-4 py-3 font-medium">Seguimiento</th>
                <th className="px-4 py-3 font-medium">Tipo gestión</th>
                <th className="px-4 py-3 font-medium">Recordatorio</th>
                <th className="px-4 py-3 font-medium">Intentos</th>
                <th className="px-4 py-3 font-medium">Fecha envío</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={item.idEnvio} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{item.idEnvio}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.codCliente ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {item.cliente || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.plantilla || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${estadoEnvioClasses(
                          item.estado
                        )}`}
                      >
                        {estadoEnvioLabel(item.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${seguimientoClasses(
                          item.seguimiento
                        )}`}
                      >
                        {seguimientoLabel(item.seguimiento)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {tipoGestionLabel(item.tipoGestion)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(item.fechaRecordatorio)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.intentos}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(item.fechaEnvio)}
                    </td>
                    <td className="px-4 py-3 text-rose-600">
                      {item.errorMensaje || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No hay registros para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Anterior
          </button>

          <p className="text-sm text-slate-500">
            Página {page} de {totalPages}
          </p>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}   