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
      return "border-slate-200 bg-slate-100 text-slate-800";
    case "LISTA":
      return "border-blue-200 bg-blue-100 text-blue-800";
    case "ENVIANDO":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "FINALIZADA":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "PAUSADA":
      return "border-orange-200 bg-orange-100 text-orange-800";
    case "CANCELADA":
      return "border-red-200 bg-red-100 text-red-800";
    case "ANALIZADA":
      return "border-violet-200 bg-violet-100 text-violet-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function StatusBadge({ status }: { status: CampaignItem["estado"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-600">{hint}</div> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-lg font-semibold text-slate-950">
        No hay campañas para mostrar
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-600">
        Cuando se creen campañas desde una audiencia, aparecerán acá con su
        estado, audiencia asociada y métricas iniciales.
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/crm/audiencias"
          className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Ir a audiencias
        </Link>

        <Link
          href="/crm"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [rows, setRows] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");

  async function loadCampaigns(nextQ?: string, nextEstado?: string) {
    setLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams();

      const searchText = (nextQ ?? q).trim();
      const statusValue = nextEstado ?? estado;

      if (searchText) params.set("q", searchText);
      if (statusValue) params.set("estado", statusValue);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Fase 4 · Campañas
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Gestión de campañas
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Revisá campañas creadas, su audiencia asociada, estado operativo,
              plantilla configurada y métricas iniciales del flujo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/audiencias"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Audiencias
            </Link>

            <Link
              href="/crm"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total campañas" value={stats.total} />
        <MetricCard label="Borrador" value={stats.borrador} />
        <MetricCard label="Lista" value={stats.lista} />
        <MetricCard label="Enviando" value={stats.enviando} />
        <MetricCard label="Finalizada / Analizada" value={stats.finalizada} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-1.5 text-sm">
            <label htmlFor="buscar" className="text-slate-700">
              Buscar campaña
            </label>
            <input
              id="buscar"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej: marzo, recordatorio, atraso..."
              className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="grid w-full gap-1.5 text-sm lg:w-72">
            <label htmlFor="estado" className="text-slate-700">
              Estado
            </label>
            <select
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
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
              type="button"
              onClick={() => loadCampaigns()}
              className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Aplicar
            </button>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setEstado("");
                loadCampaigns("", "");
              }}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      <section>
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Cargando campañas...
          </div>
        ) : errorMsg ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {errorMsg}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {rows.map((row) => (
              <article
                key={row.idCampania}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Campaña #{row.idCampania}
                    </div>

                    <h3 className="mt-1 text-xl font-semibold text-slate-950">
                      {row.nombre}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
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
                      <span className="font-medium text-slate-900">
                        Lanzamiento:
                      </span>{" "}
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
                  <MiniStat label="Audiencia" value={row.totalAudiencia} />
                  <MiniStat label="Enviados" value={row.totalEnviados} />
                  <MiniStat label="Errores" value={row.totalError} tone="danger" />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Entregados" value={row.totalEntregados} />
                  <MiniStat label="Leídos" value={row.totalLeidos} />
                  <MiniStat label="Respondieron" value={row.totalRespondieron} />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Pagaron / recuperado
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="text-base font-semibold text-slate-950">
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
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Ver detalle
                  </Link>

                  <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500">
                    Siguiente paso: cola y envío
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold ${
          tone === "danger" ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}