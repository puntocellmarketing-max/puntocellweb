"use client";

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
};

type Props = {
  idCampania: number;
};

const estadosFiltro = [
  "",
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "CANCELED",
];

export default function CampaignSendPanel({ idCampania }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingRetry, setLoadingRetry] = useState(false);

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [audience, setAudience] = useState<AudienceDetail>(null);
  const [queue, setQueue] = useState<QueueSummary | null>(null);

  const [items, setItems] = useState<EnvioItem[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState("");
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
  }, [idCampania, page, estadoFiltro]);

  async function generarCola() {
    try {
      setLoadingGenerate(true);
      setMessage(null);
      setError(null);

      const res = await fetch(`/api/crm/campanias/${idCampania}/generar-cola`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "No se pudo generar la cola.");
      }

      setMessage(
        `Cola generada correctamente. Registros creados: ${
          data?.resumen?.totalGenerados ?? 0
        }.`
      );

      setPage(1);
      await reloadAll();
    } catch (e: any) {
      setError(e?.message || "Error generando cola.");
    } finally {
      setLoadingGenerate(false);
    }
  }

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

      setMessage(
        `Fallidos reencolados: ${data?.resumen?.reprocesados ?? 0}.`
      );

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
      { label: "TOTAL COLA", value: queue?.totalCola ?? 0 },
      { label: "QUEUED", value: queue?.totalQueued ?? 0 },
      { label: "SENDING", value: queue?.totalSending ?? 0 },
      { label: "SENT", value: queue?.totalSent ?? 0 },
      { label: "DELIVERED", value: queue?.totalDelivered ?? 0 },
      { label: "READ", value: queue?.totalRead ?? 0 },
      { label: "FAILED", value: queue?.totalFailed ?? 0 },
      { label: "CANCELED", value: queue?.totalCanceled ?? 0 },
    ];
  }, [queue]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Cargando administración de envíos...
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
              Campaña #{idCampania}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Administración integral de cola y envíos por lotes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={reloadAll}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Actualizar
            </button>

            <button
              onClick={generarCola}
              disabled={loadingGenerate || (queue?.totalCola ?? 0) > 0}
              className="rounded-2xl border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              {loadingGenerate ? "Generando..." : "Generar cola"}
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
              CAMPAÑA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.nombre || `Campaña #${idCampania}`}
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
              ESTADO
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

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              TOTAL AUDIENCIA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.totalAudiencia ?? 0}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              TOTAL ENVIADOS
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.totalEnviados ?? 0}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              TOTAL ERROR
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.totalError ?? 0}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              LEÍDOS
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.totalLeidos ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-4 text-4xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2">
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
                  <option key={estado || "ALL"} value={estado}>
                    {estado || "TODOS"}
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
              {loadingRun ? "Ejecutando lote..." : `Ejecutar lote de ${batchSize}`}
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
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Plantilla</th>
                <th className="px-4 py-3 font-medium">Estado</th>
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
                      {item.telefono || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.plantilla || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                        {item.estado || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.intentos}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.fechaEnvio || "-"}
                    </td>
                    <td className="px-4 py-3 text-rose-600">
                      {item.errorMensaje || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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