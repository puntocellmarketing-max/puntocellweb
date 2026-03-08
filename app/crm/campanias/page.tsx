"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CampaignItem = {
  idCampania: number;
  idAudiencia: number | null;
  nombre: string;
  tipo: "VENCIMIENTO" | "ATRASO" | "GENERAL" | null;
  plantilla: string | null;
  idioma: string;
  estado:
    | "BORRADOR"
    | "LISTA"
    | "ENVIANDO"
    | "FINALIZADA"
    | "PAUSADA"
    | "CANCELADA"
    | "ANALIZADA"
    | null;
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
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "BORRADOR", label: "Borrador" },
  { value: "LISTA", label: "Lista" },
  { value: "ENVIANDO", label: "Enviando" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "PAUSADA", label: "Pausada" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "ANALIZADA", label: "Analizada" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatGs(value: number) {
  return `Gs. ${Math.round(value || 0).toLocaleString("es-PY")}`;
}

function statusClasses(status: CampaignItem["estado"]) {
  switch (status) {
    case "BORRADOR":
      return "bg-slate-100 text-slate-800 border-slate-200";
    case "LISTA":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "ENVIANDO":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "FINALIZADA":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PAUSADA":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "CANCELADA":
      return "bg-red-100 text-red-800 border-red-200";
    case "ANALIZADA":
      return "bg-violet-100 text-violet-800 border-violet-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function StatusBadge({ status }: { status: CampaignItem["estado"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
        status
      )}`}
    >
      {status || "SIN ESTADO"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-600">{hint}</div> : null}
    </div>
  );
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");

  async function loadCampaigns() {
    setLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (estado) params.set("estado", estado);
      params.set("limit", "100");

      const res = await fetch(`/api/crm/campanias/list?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo cargar campañas.");
      }

      setRows(data.rows || []);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error cargando campañas.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const borrador = rows.filter((r) => r.estado === "BORRADOR").length;
    const lista = rows.filter((r) => r.estado === "LISTA").length;
    const enviando = rows.filter((r) => r.estado === "ENVIANDO").length;
    const finalizada = rows.filter(
      (r) => r.estado === "FINALIZADA" || r.estado === "ANALIZADA"
    ).length;

    return { total, borrador, lista, enviando, finalizada };
  }, [rows]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Módulo de campañas
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Campañas
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Acá vas a poder visualizar las campañas creadas, revisar su
                estado, su audiencia asociada, la plantilla configurada y las
                métricas operativas iniciales del flujo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/crm"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Volver al panel
              </Link>
            </div>
          </div>
        </section>

        {/* KPI row */}
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total campañas" value={stats.total} />
          <MetricCard label="Borrador" value={stats.borrador} />
          <MetricCard label="Lista" value={stats.lista} />
          <MetricCard label="Enviando" value={stats.enviando} />
          <MetricCard label="Finalizada / Analizada" value={stats.finalizada} />
        </section>

        {/* Filters */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="grid flex-1 gap-1 text-sm">
              <label htmlFor="buscar" className="text-slate-700">
                Buscar campaña
              </label>
              <input
                id="buscar"
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: marzo, recordatorio, 1..."
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none ring-0 transition focus:border-blue-500"
              />
            </div>

            <div className="grid w-full gap-1 text-sm lg:w-72">
              <label htmlFor="estado" className="text-slate-700">
                Estado
              </label>
              <select
                id="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadCampaigns}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Aplicar
              </button>

              <button
                onClick={() => {
                  setQ("");
                  setEstado("");
                  setTimeout(() => {
                    loadCampaigns();
                  }, 0);
                }}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
              Cargando campañas...
            </div>
          ) : errorMsg ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
              {errorMsg}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">
                No hay campañas para mostrar
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Cuando vayas creando campañas desde las audiencias, aparecerán
                acá con su estado y métricas.
              </div>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {rows.map((row) => (
                <article
                  key={row.idCampania}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Campaña #{row.idCampania}
                      </div>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">
                        {row.nombre}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={row.estado} />
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          Tipo: {row.tipo || "—"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          Audiencia: {row.idAudiencia ?? "—"}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-600">
                      <div>
                        <span className="font-medium text-slate-900">Creación:</span>{" "}
                        {formatDate(row.fechaCreacion)}
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-slate-900">Lanzamiento:</span>{" "}
                        {formatDate(row.fechaLanzamiento)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Plantilla
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row.plantilla || "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Idioma: {row.idioma || "es"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Ventana de análisis
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {row.ventanaAnalisisDias} día(s)
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Creado por: {row.creadoPor || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">Audiencia</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {row.totalAudiencia}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">En cola / enviados</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {row.totalEnviados}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">Errores</div>
                      <div className="mt-1 text-lg font-semibold text-red-700">
                        {row.totalError}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Entregados</div>
                      <div className="mt-1 text-base font-semibold text-slate-900">
                        {row.totalEntregados}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Leídos</div>
                      <div className="mt-1 text-base font-semibold text-slate-900">
                        {row.totalLeidos}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Respondieron</div>
                      <div className="mt-1 text-base font-semibold text-slate-900">
                        {row.totalRespondieron}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Pagaron / recuperado</div>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <div className="text-base font-semibold text-slate-900">
                        {row.totalPagaron} cliente(s)
                      </div>
                      <div className="text-sm text-slate-600">
                        {formatGs(row.montoTotalPagado)}
                      </div>
                    </div>
                  </div>

                  {row.observaciones ? (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Observaciones
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">
                        {row.observaciones}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/crm/campanias/${row.idCampania}`}
                      className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Ver detalle
                    </Link>

                    <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
                      Próxima fase: operar cola
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}