"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InitialFilters = {
  bucket?: string;
  q?: string;
  estado?: string;
  prioridad?: string;
  tipoGestion?: string;
  idCobrador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  jobId?: string;
  idAudiencia?: string;
  page?: string;
};

type AgendaItem = {
  id_agenda: number;
  cod_cliente: number | null;
  cliente: string | null;
  telefono: string | null;
  id_cobrador_asignado: number | null;
  cobrador_asignado: string | null;
  id_cobrador_creador: number | null;
  cobrador_creador: string | null;
  tipo_gestion: string;
  estado: string;
  prioridad: string;
  fecha_creacion: string;
  fecha_recordatorio: string;
  fecha_gestion: string | null;
  nota: string | null;
  resultado: string | null;
  creado_por: string | null;
  updated_at: string;
  id_audiencia: number | null;
  job_id: string | null;
  origen_agenda: string;
  saldo: number | null;
  dias_atraso: number | null;
  ultimo_pago_sync: string | null;
  monto_ultimo_pago_sync: number | null;
  ultimo_pago_cliente_sync: string | null;
  requiere_revision: number | null;
  zona: string | null;
  categoria: string | null;
  dias_vencido: number;
};

type Summary = {
  total_filtrados: number;
  hoy: number;
  vencidas: number;
  proximas: number;
  resueltas: number;
  pagadas: number;
  no_responde: number;
};

type Meta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  bucket: string;
};

type CobradorOption = {
  id: number;
  nombre: string;
};

type AgendaResponse = {
  ok: boolean;
  items: AgendaItem[];
  meta: Meta;
  summary: Summary;
  filterOptions: {
    cobradores: CobradorOption[];
  };
  error?: string;
};

type ResolveForm = {
  estado: string;
  resultado: string;
};

type ReagendarForm = {
  fechaRecordatorio: string;
  nota: string;
};

const TIPOS_GESTION = [
  "RECORDATORIO",
  "LLAMAR",
  "WHATSAPP",
  "VISITA",
  "PROMESA_PAGO",
  "SEGUIMIENTO",
];

const ESTADOS = [
  "PENDIENTE",
  "REALIZADO",
  "REAGENDADO",
  "CANCELADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
];

const ESTADOS_RESOLUCION = [
  "REALIZADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
  "CANCELADO",
];

const PRIORIDADES = ["BAJA", "MEDIA", "ALTA"];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(value?: number | null) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("es-PY").format(n);
}

function badgeEstadoClass(estado: string) {
  switch (estado) {
    case "PAGADO":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "NO_RESPONDE":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "ERRONEO":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "REAGENDADO":
      return "bg-sky-100 text-sky-700 border border-sky-200";
    case "REALIZADO":
      return "bg-indigo-100 text-indigo-700 border border-indigo-200";
    case "CANCELADO":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-blue-100 text-blue-700 border border-blue-200";
  }
}

function badgePrioridadClass(prioridad: string) {
  switch (prioridad) {
    case "ALTA":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "MEDIA":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function AgendaDashboardClientPage({
  initialFilters,
}: {
  initialFilters: InitialFilters;
}) {
  const [bucket, setBucket] = useState(initialFilters.bucket || "hoy");
  const [q, setQ] = useState(initialFilters.q || "");
  const [estado, setEstado] = useState(initialFilters.estado || "");
  const [prioridad, setPrioridad] = useState(initialFilters.prioridad || "");
  const [tipoGestion, setTipoGestion] = useState(initialFilters.tipoGestion || "");
  const [idCobrador, setIdCobrador] = useState(initialFilters.idCobrador || "");
  const [fechaDesde, setFechaDesde] = useState(initialFilters.fechaDesde || "");
  const [fechaHasta, setFechaHasta] = useState(initialFilters.fechaHasta || "");
  const [jobId, setJobId] = useState(initialFilters.jobId || "");
  const [idAudiencia, setIdAudiencia] = useState(initialFilters.idAudiencia || "");
  const [page, setPage] = useState(Number(initialFilters.page || 1) || 1);

  const [items, setItems] = useState<AgendaItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_filtrados: 0,
    hoy: 0,
    vencidas: 0,
    proximas: 0,
    resueltas: 0,
    pagadas: 0,
    no_responde: 0,
  });
  const [meta, setMeta] = useState<Meta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
    bucket: "hoy",
  });
  const [cobradores, setCobradores] = useState<CobradorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resolveItem, setResolveItem] = useState<AgendaItem | null>(null);
  const [resolveForm, setResolveForm] = useState<ResolveForm>({
    estado: "REALIZADO",
    resultado: "",
  });
  const [savingResolve, setSavingResolve] = useState(false);

  const [reagendarItem, setReagendarItem] = useState<AgendaItem | null>(null);
  const [reagendarForm, setReagendarForm] = useState<ReagendarForm>({
    fechaRecordatorio: "",
    nota: "",
  });
  const [savingReagendar, setSavingReagendar] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (bucket) p.set("bucket", bucket);
    if (q) p.set("q", q);
    if (estado) p.set("estado", estado);
    if (prioridad) p.set("prioridad", prioridad);
    if (tipoGestion) p.set("tipoGestion", tipoGestion);
    if (idCobrador) p.set("idCobrador", idCobrador);
    if (fechaDesde) p.set("fechaDesde", fechaDesde);
    if (fechaHasta) p.set("fechaHasta", fechaHasta);
    if (jobId) p.set("jobId", jobId);
    if (idAudiencia) p.set("idAudiencia", idAudiencia);
    p.set("page", String(page));
    p.set("pageSize", "20");
    return p.toString();
  }, [bucket, q, estado, prioridad, tipoGestion, idCobrador, fechaDesde, fechaHasta, jobId, idAudiencia, page]);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/crm/agenda?${queryString}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await res.json()) as AgendaResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo cargar la agenda.");
      }

      setItems(data.items || []);
      setSummary(data.summary);
      setMeta(data.meta);
      setCobradores(data.filterOptions?.cobradores || []);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la agenda.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  function resetFilters() {
    setBucket("hoy");
    setQ("");
    setEstado("");
    setPrioridad("");
    setTipoGestion("");
    setIdCobrador("");
    setFechaDesde("");
    setFechaHasta("");
    setJobId("");
    setIdAudiencia("");
    setPage(1);
  }

  function openResolve(item: AgendaItem) {
    setResolveItem(item);
    setResolveForm({
      estado: item.estado === "PAGADO" ? "PAGADO" : "REALIZADO",
      resultado: item.resultado || "",
    });
  }

  function openReagendar(item: AgendaItem) {
    setReagendarItem(item);
    setReagendarForm({
      fechaRecordatorio: formatDate(item.fecha_recordatorio),
      nota: item.nota || "",
    });
  }

  async function handleResolveSubmit() {
    if (!resolveItem) return;

    setSavingResolve(true);
    try {
      const res = await fetch(`/api/crm/agenda/${resolveItem.id_agenda}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveForm),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo actualizar la agenda.");
      }

      setResolveItem(null);
      await fetchAgenda();
    } catch (e: any) {
      alert(e?.message || "No se pudo actualizar la agenda.");
    } finally {
      setSavingResolve(false);
    }
  }

  async function handleReagendarSubmit() {
    if (!reagendarItem) return;

    setSavingReagendar(true);
    try {
      const res = await fetch(`/api/crm/agenda/${reagendarItem.id_agenda}/reagendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reagendarForm),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo reagendar.");
      }

      setReagendarItem(null);
      await fetchAgenda();
    } catch (e: any) {
      alert(e?.message || "No se pudo reagendar.");
    } finally {
      setSavingReagendar(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              CRM · Agenda operativa
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard de agenda</h1>
            <p className="text-sm text-slate-500">
              Controlá alertas del día, vencidas, próximas y resueltas. También podés filtrar por job_id o audiencia.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Total filtrado: <span className="font-semibold text-slate-900">{summary.total_filtrados}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardStat title="Hoy" value={summary.hoy} />
        <CardStat title="Vencidas" value={summary.vencidas} />
        <CardStat title="Próximas" value={summary.proximas} />
        <CardStat title="Resueltas" value={summary.resueltas} />
        <CardStat title="Pagadas" value={summary.pagadas} />
        <CardStat title="No responde" value={summary.no_responde} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
          <p className="text-sm text-slate-500">
            Podés trabajar agenda general o filtrar por audiencia / job.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Buscar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente, teléfono, job, ID..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />
          </Field>

          <Field label="Bucket">
            <select
              value={bucket}
              onChange={(e) => {
                setBucket(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="hoy">Hoy</option>
              <option value="vencidas">Vencidas</option>
              <option value="proximas">Próximas</option>
              <option value="resueltas">Resueltas</option>
              <option value="">Todos</option>
            </select>
          </Field>

          <Field label="Estado">
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Todos</option>
              {ESTADOS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tipo gestión">
            <select
              value={tipoGestion}
              onChange={(e) => {
                setTipoGestion(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Todos</option>
              {TIPOS_GESTION.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prioridad">
            <select
              value={prioridad}
              onChange={(e) => {
                setPrioridad(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Todas</option>
              {PRIORIDADES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cobrador">
            <select
              value={idCobrador}
              onChange={(e) => {
                setIdCobrador(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Todos</option>
              {cobradores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha desde">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />
          </Field>

          <Field label="Fecha hasta">
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />
          </Field>

          <Field label="Job ID">
            <input
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value);
                setPage(1);
              }}
              placeholder="JOB-..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />
          </Field>

          <Field label="ID Audiencia">
            <input
              value={idAudiencia}
              onChange={(e) => {
                setIdAudiencia(e.target.value);
                setPage(1);
              }}
              placeholder="Ej: 15"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setPage(1);
              fetchAgenda();
            }}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Aplicar filtros
          </button>
          <button
            onClick={resetFilters}
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Limpiar
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Listado de agendamientos</h2>
            <p className="text-sm text-slate-500">
              Resolvé, reagendá o revisá el contexto del cliente sin salir del panel.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Página {meta.page} de {meta.totalPages} · Total: {meta.total}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Agenda</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Asignado</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Prioridad</th>
                <th className="px-3 py-2">Fecha recordatorio</th>
                <th className="px-3 py-2">Saldo</th>
                <th className="px-3 py-2">Último pago</th>
                <th className="px-3 py-2">Job / Audiencia</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    Cargando agenda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                    No hay registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id_agenda} className="rounded-2xl bg-slate-50 text-slate-700">
                    <td className="rounded-l-2xl px-3 py-4 align-top">
                      <div className="font-semibold text-slate-900">#{item.id_agenda}</div>
                      <div className="text-xs text-slate-500">
                        {item.dias_vencido > 0 ? `${item.dias_vencido} días vencido` : "Sin atraso operativo"}
                      </div>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div className="font-semibold text-slate-900">{item.cliente || "SIN NOMBRE"}</div>
                      <div className="text-xs text-slate-500">Cod: {item.cod_cliente ?? "—"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Zona: {item.zona || "—"} · Cat: {item.categoria || "—"}
                      </div>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div>{item.telefono || "—"}</div>
                      {Number(item.requiere_revision || 0) === 1 ? (
                        <div className="mt-1 text-xs font-medium text-amber-700">Requiere revisión</div>
                      ) : null}
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div className="font-medium">{item.cobrador_asignado || "—"}</div>
                      <div className="text-xs text-slate-500">
                        Creador: {item.cobrador_creador || item.creado_por || "—"}
                      </div>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {item.tipo_gestion}
                      </span>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeEstadoClass(item.estado)}`}>
                        {item.estado}
                      </span>
                      {item.resultado ? (
                        <div className="mt-2 max-w-[220px] text-xs text-slate-500">{item.resultado}</div>
                      ) : null}
                    </td>

                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgePrioridadClass(item.prioridad)}`}>
                        {item.prioridad}
                      </span>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div>{formatDateTime(item.fecha_recordatorio)}</div>
                      <div className="text-xs text-slate-500">
                        Gestión: {formatDateTime(item.fecha_gestion)}
                      </div>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div className="font-medium">Gs. {formatMoney(item.saldo)}</div>
                      <div className="text-xs text-slate-500">
                        Atraso: {item.dias_atraso ?? 0} días
                      </div>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div>{formatDateTime(item.ultimo_pago_sync || item.ultimo_pago_cliente_sync)}</div>
                      <div className="text-xs text-slate-500">
                        Monto: Gs. {formatMoney(item.monto_ultimo_pago_sync)}
                      </div>
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div className="text-xs text-slate-700">Job: {item.job_id || "—"}</div>
                      <div className="text-xs text-slate-500">Audiencia: {item.id_audiencia ?? "—"}</div>
                    </td>

                    <td className="rounded-r-2xl px-3 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openResolve(item)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => openReagendar(item)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-white"
                        >
                          Reagendar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            disabled={meta.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <div className="text-sm text-slate-500">
            Página {meta.page} / {meta.totalPages}
          </div>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </section>

      {resolveItem ? (
        <Modal title={`Resolver agenda #${resolveItem.id_agenda}`} onClose={() => setResolveItem(null)}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">{resolveItem.cliente || "SIN NOMBRE"}</div>
              <div>Cod cliente: {resolveItem.cod_cliente ?? "—"}</div>
              <div>Teléfono: {resolveItem.telefono || "—"}</div>
              <div>Tipo: {resolveItem.tipo_gestion}</div>
              <div>Recordatorio: {formatDateTime(resolveItem.fecha_recordatorio)}</div>
            </div>

            <Field label="Nuevo estado">
              <select
                value={resolveForm.estado}
                onChange={(e) => setResolveForm((prev) => ({ ...prev, estado: e.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              >
                {ESTADOS_RESOLUCION.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Resultado / observación">
              <textarea
                value={resolveForm.resultado}
                onChange={(e) => setResolveForm((prev) => ({ ...prev, resultado: e.target.value }))}
                rows={4}
                placeholder="Ej: Cliente confirma pago, no responde, número incorrecto, etc."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </Field>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResolveItem(null)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={savingResolve}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingResolve ? "Guardando..." : "Guardar resolución"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {reagendarItem ? (
        <Modal title={`Reagendar agenda #${reagendarItem.id_agenda}`} onClose={() => setReagendarItem(null)}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">{reagendarItem.cliente || "SIN NOMBRE"}</div>
              <div>Cod cliente: {reagendarItem.cod_cliente ?? "—"}</div>
              <div>Teléfono: {reagendarItem.telefono || "—"}</div>
              <div>Fecha actual: {formatDateTime(reagendarItem.fecha_recordatorio)}</div>
            </div>

            <Field label="Nueva fecha">
              <input
                type="date"
                value={reagendarForm.fechaRecordatorio}
                onChange={(e) => setReagendarForm((prev) => ({ ...prev, fechaRecordatorio: e.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </Field>

            <Field label="Nota para la nueva agenda">
              <textarea
                value={reagendarForm.nota}
                onChange={(e) => setReagendarForm((prev) => ({ ...prev, nota: e.target.value }))}
                rows={4}
                placeholder="Ej: Recontactar la próxima semana."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </Field>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReagendarItem(null)}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReagendarSubmit}
                disabled={savingReagendar}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingReagendar ? "Reagendando..." : "Confirmar reagendado"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function CardStat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}