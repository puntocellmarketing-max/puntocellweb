"use client";

import { useEffect, useMemo, useState } from "react";

type CampaignOption = {
  idCampania: number;
  nombre: string;
};

type ClosureItem = {
  idCierre: number;
  idCampania: number;
  idAudiencia: number | null;
  nombreCampania: string | null;
  fechaDesde: string;
  fechaHasta: string;
  fechaCierre: string;
  porcentajeComision: number;
  totalNotificados: number;
  totalAgendados: number;
  totalNoAgendados: number;
  totalClientesConPago: number;
  totalClientesComisionables: number;
  totalPagosEncontrados: number;
  montoTotalRecuperado: number;
  montoTotalComisionable: number;
  montoTotalComision: number;
  estado: string;
  observacion: string | null;
  creadoPor: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
};

type ClosureDetailItem = {
  idDetalle: number;
  codCliente: number;
  cliente: string | null;
  telefono: string | null;
  fueNotificado: boolean;
  tieneAgenda: boolean;
  tienePago: boolean;
  esComisionable: boolean;
  estadoEnvio: string | null;
  seguimiento: string | null;
  tipoGestion: string | null;
  fechaRecordatorio: string | null;
  cantidadPagos: number;
  montoTotalPagado: number;
  fechaPrimerPago: string | null;
  fechaUltimoPago: string | null;
  porcentajeComision: number;
  comisionCalculada: number;
  observacion: string | null;
  pagos: Array<{
    idPagoCierre: number;
    codCliente: number;
    nroRecibo: string | null;
    fechaPago: string;
    montoPagado: number;
    referencia: string | null;
    origen: string | null;
  }>;
};

type ClosureDetailResponse = {
  cierre: ClosureItem;
  detalle: ClosureDetailItem[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function formatDateInput(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatGs(value: number) {
  return `Gs. ${Math.round(value || 0).toLocaleString("es-PY")}`;
}

function statusClasses(status: string | null | undefined) {
  switch (status) {
    case "FINALIZADO":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "PROCESANDO":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "ERROR":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "BORRADOR":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function boolBadge(value: boolean, yes = "Sí", no = "No") {
  return value
    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
    : "border-slate-200 bg-slate-100 text-slate-700";
}

function seguimientoClasses(value: string | null | undefined) {
  switch (value) {
    case "PENDIENTE":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "PAGADO":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "REAGENDADO":
      return "border-yellow-200 bg-yellow-100 text-yellow-800";
    case "REALIZADO":
      return "border-violet-200 bg-violet-100 text-violet-800";
    case "NO_RESPONDE":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "SIN_AGENDA":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function MiniCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function CampaignClosuresPanel() {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [closures, setClosures] = useState<ClosureItem[]>([]);
  const [selectedClosure, setSelectedClosure] =
    useState<ClosureDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [idCampania, setIdCampania] = useState("");
  const [fechaHasta, setFechaHasta] = useState(formatDateInput());
  const [porcentajeComision, setPorcentajeComision] = useState("2");
  const [soloConAgenda, setSoloConAgenda] = useState(true);
  const [creadoPor, setCreadoPor] = useState("admin");
  const [observacion, setObservacion] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCampaigns() {
    const res = await fetch("/api/crm/campanias/list?limit=100", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "No se pudieron cargar campañas.");
    }

    const rows = (data.rows || []).map((r: any) => ({
      idCampania: Number(r.idCampania),
      nombre: r.nombre || `Campaña #${r.idCampania}`,
    }));

    setCampaigns(rows);
  }

  async function loadClosures() {
    const res = await fetch("/api/crm/reportes/cierres-campania?limit=20", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "No se pudieron cargar cierres.");
    }

    setClosures(data.rows || []);
  }

  async function loadClosureDetail(idCierre: number) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/crm/reportes/cierres-campania/${idCierre}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo cargar el detalle.");
      }

      setSelectedClosure({
        cierre: data.cierre,
        detalle: data.detalle || [],
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadAll() {
    setError(null);
    await Promise.all([loadCampaigns(), loadClosures()]);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        await loadAll();
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Error cargando pantalla.");
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      cierres: closures.length,
      recuperado: closures.reduce(
        (acc, item) => acc + Number(item.montoTotalRecuperado || 0),
        0
      ),
      comisionable: closures.reduce(
        (acc, item) => acc + Number(item.montoTotalComisionable || 0),
        0
      ),
      comision: closures.reduce(
        (acc, item) => acc + Number(item.montoTotalComision || 0),
        0
      ),
    };
  }, [closures]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/crm/reportes/cierres-campania", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idCampania: Number(idCampania),
          fechaHasta,
          porcentajeComision: Number(porcentajeComision || 0),
          soloConAgenda,
          creadoPor,
          observacion,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo ejecutar el cierre.");
      }

      setMessage(
        `Cierre generado correctamente. Recuperado: ${formatGs(
          data.resumen?.montoTotalRecuperado || 0
        )} · Comisión: ${formatGs(data.resumen?.montoTotalComision || 0)}.`
      );

      await loadClosures();

      if (data?.resumen?.idCierre) {
        await loadClosureDetail(Number(data.resumen.idCierre));
      }
    } catch (e: any) {
      setError(e?.message || "Error ejecutando cierre.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Cargando módulo de cierres de campaña...
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Reportes · Cierre de campaña
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Cierre y cálculo de comisión
            </h1>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Ejecutá el corte de una campaña, cruzá pagos reales dentro de la
              ventana, clasificá clientes agendados y no agendados, y obtené la
              base comisionable con trazabilidad por cliente y por recibo.
            </p>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Cierres registrados" value={summary.cierres} />
        <MiniCard label="Recuperado total" value={formatGs(summary.recuperado)} />
        <MiniCard
          label="Monto comisionable"
          value={formatGs(summary.comisionable)}
        />
        <MiniCard label="Comisión acumulada" value={formatGs(summary.comision)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px,minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              Ejecutar cierre
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Seleccioná campaña, fecha de corte y porcentaje para generar el
              cierre oficial.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Campaña
              </label>
              <select
                value={idCampania}
                onChange={(e) => setIdCampania(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                required
              >
                <option value="">Seleccionar campaña</option>
                {campaigns.map((c) => (
                  <option key={c.idCampania} value={c.idCampania}>
                    #{c.idCampania} · {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Fecha de cierre
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  % Comisión
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={porcentajeComision}
                  onChange={(e) => setPorcentajeComision(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Usuario
              </label>
              <input
                type="text"
                value={creadoPor}
                onChange={(e) => setCreadoPor(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Observación
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                placeholder="Ej: cierre de fin de mes, supervisor Juan..."
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={soloConAgenda}
                onChange={(e) => setSoloConAgenda(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Solo clientes con agenda generan comisión
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  Los clientes notificados sin agenda se mostrarán en el reporte,
                  pero no se incluirán en la base comisionable.
                </div>
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Ejecutando cierre..." : "Ejecutar cierre"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Cierres realizados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimos cierres generados con sus montos recuperados y comisión.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {closures.length ? (
              closures.map((item) => (
                <button
                  key={item.idCierre}
                  type="button"
                  onClick={() => loadClosureDetail(item.idCierre)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Cierre #{item.idCierre}
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-950">
                        {item.nombreCampania || `Campaña #${item.idCampania}`}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Ventana: {item.fechaDesde} a {item.fechaHasta}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                          item.estado
                        )}`}
                      >
                        {item.estado}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        Comisión {item.porcentajeComision}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs text-slate-500">Recuperado</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {formatGs(item.montoTotalRecuperado)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs text-slate-500">Comisionable</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {formatGs(item.montoTotalComisionable)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs text-slate-500">Comisión</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {formatGs(item.montoTotalComision)}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Todavía no hay cierres registrados.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Detalle del cierre
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Resumen ejecutivo, clientes incluidos y pagos encontrados.
            </p>
          </div>
        </div>

        {!selectedClosure ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
            Seleccioná un cierre de la lista para ver su detalle completo.
          </div>
        ) : loadingDetail ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
            Cargando detalle...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cierre #{selectedClosure.cierre.idCierre}
                </div>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {selectedClosure.cierre.nombreCampania ||
                    `Campaña #${selectedClosure.cierre.idCampania}`}
                </h3>
                <div className="mt-2 text-sm text-slate-600">
                  Ventana: {selectedClosure.cierre.fechaDesde} a{" "}
                  {selectedClosure.cierre.fechaHasta}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                    selectedClosure.cierre.estado
                  )}`}
                >
                  {selectedClosure.cierre.estado}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {selectedClosure.cierre.porcentajeComision}% comisión
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <MiniCard
                label="Notificados"
                value={selectedClosure.cierre.totalNotificados}
              />
              <MiniCard
                label="Agendados"
                value={selectedClosure.cierre.totalAgendados}
              />
              <MiniCard
                label="Sin agenda"
                value={selectedClosure.cierre.totalNoAgendados}
              />
              <MiniCard
                label="Con pago"
                value={selectedClosure.cierre.totalClientesConPago}
              />
              <MiniCard
                label="Comisionables"
                value={selectedClosure.cierre.totalClientesComisionables}
              />
              <MiniCard
                label="Pagos encontrados"
                value={selectedClosure.cierre.totalPagosEncontrados}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Recuperado total
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatGs(selectedClosure.cierre.montoTotalRecuperado)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Base comisionable
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatGs(selectedClosure.cierre.montoTotalComisionable)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Comisión total
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {formatGs(selectedClosure.cierre.montoTotalComision)}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Agenda</th>
                      <th className="px-4 py-3 font-medium">Seguimiento</th>
                      <th className="px-4 py-3 font-medium">Tipo gestión</th>
                      <th className="px-4 py-3 font-medium">Pagos</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium">Comisionable</th>
                      <th className="px-4 py-3 font-medium">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClosure.detalle.length ? (
                      selectedClosure.detalle.map((item) => (
                        <tr
                          key={item.idDetalle}
                          className="border-t border-slate-100 align-top"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-950">
                              {item.cliente || `Cliente #${item.codCliente}`}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Cod. {item.codCliente}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${boolBadge(
                                item.tieneAgenda
                              )}`}
                            >
                              {item.tieneAgenda ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${seguimientoClasses(
                                item.seguimiento
                              )}`}
                            >
                              {item.seguimiento || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.tipoGestion || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.cantidadPagos}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatGs(item.montoTotalPagado)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${boolBadge(
                                item.esComisionable
                              )}`}
                            >
                              {item.esComisionable ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-900">
                            {formatGs(item.comisionCalculada)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No hay detalle para este cierre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Trazabilidad de pagos
              </div>
              <div className="mt-3 space-y-3">
                {selectedClosure.detalle
                  .filter((item) => item.pagos.length > 0)
                  .slice(0, 10)
                  .map((item) => (
                    <div
                      key={`pagos-${item.idDetalle}`}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {item.cliente || `Cliente #${item.codCliente}`}
                      </div>
                      <div className="mt-2 grid gap-2">
                        {item.pagos.map((pago) => (
                          <div
                            key={pago.idPagoCierre}
                            className="flex flex-col gap-1 text-sm text-slate-600 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              {pago.referencia || pago.nroRecibo || "Recibo"} ·{" "}
                              {formatDate(pago.fechaPago)}
                            </div>
                            <div className="font-medium text-slate-900">
                              {formatGs(pago.montoPagado)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {!selectedClosure.detalle.some((item) => item.pagos.length > 0) ? (
                  <div className="text-sm text-slate-500">
                    No hay pagos detallados para mostrar.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}