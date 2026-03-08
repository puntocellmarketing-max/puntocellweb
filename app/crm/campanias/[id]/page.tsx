"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CampaignDetail = {
  idCampania: number;
  idAudiencia: number | null;
  nombre: string;
  tipo: string | null;
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

type Destinatario = {
  idDetalle: number;
  idAudiencia: number;
  codCliente: number;
  cliente: string;
  telefono: string | null;
  telefonoValido: number;
  requiereRevision: number;
  diasAtraso: number;
  ultimoPago: string | null;
  saldo: number;
  categoria: string | null;
  zona: string | null;
  estadoEnvio: string;
  loteNumero: number;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatGs(value: number) {
  return `Gs. ${Math.round(value || 0).toLocaleString("es-PY")}`;
}

function statusClasses(status: string | null) {
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

function StatusBadge({ status }: { status: string | null }) {
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

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [generatingQueue, setGeneratingQueue] = useState(false);
  const [campaignId, setCampaignId] = useState<number | null>(null);

  useEffect(() => {
    async function resolveParamsAndLoad() {
      try {
        const resolved = await params;
        const id = Number(resolved.id);
        setCampaignId(id);

        const res = await fetch(`/api/crm/campanias/${id}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "No se pudo cargar la campaña.");
        }

        setCampaign(data.campaign);
        setDestinatarios(data.destinatarios || []);
      } catch (e: any) {
        setErrorMsg(e?.message || "Error cargando la campaña.");
      } finally {
        setLoading(false);
      }
    }

    resolveParamsAndLoad();
  }, [params]);

  async function reloadCampaign() {
    if (!campaignId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/crm/campanias/${campaignId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo recargar la campaña.");
      }

      setCampaign(data.campaign);
      setDestinatarios(data.destinatarios || []);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error recargando la campaña.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateQueue() {
    if (!campaign?.idCampania) return;

    setGeneratingQueue(true);
    setActionMsg("");

    try {
      const res = await fetch("/api/crm/campanias/generar-cola", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idCampania: campaign.idCampania,
          soloValidos: true,
          sobrescribir: false,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo generar la cola.");
      }

      setActionMsg(
        `Cola generada correctamente. Total generados: ${data?.resumen?.totalGenerados ?? 0}`
      );

      await reloadCampaign();
    } catch (e: any) {
      setActionMsg(`Error: ${e?.message || "No se pudo generar la cola."}`);
    } finally {
      setGeneratingQueue(false);
    }
  }

  const stats = useMemo(() => {
    const total = destinatarios.length;
    const validos = destinatarios.filter((d) => d.telefonoValido === 1).length;
    const revision = destinatarios.filter(
      (d) => d.requiereRevision === 1
    ).length;
    const enCola = destinatarios.filter((d) => d.estadoEnvio === "EN_COLA").length;
    const pendientes = destinatarios.filter(
      (d) => d.estadoEnvio === "PENDIENTE"
    ).length;

    return { total, validos, revision, enCola, pendientes };
  }, [destinatarios]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Cargando detalle de campaña...
          </div>
        ) : errorMsg ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {errorMsg}
          </div>
        ) : !campaign ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            No se encontró la campaña.
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Detalle de campaña
                  </div>

                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    {campaign.nombre}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={campaign.estado} />
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                      ID campaña: {campaign.idCampania}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                      Audiencia: {campaign.idAudiencia ?? "—"}
                    </span>
                  </div>

                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                    Desde esta pantalla vas a poder revisar la campaña, validar
                    su audiencia asociada y operar la generación de cola antes
                    del envío real.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/crm/campanias"
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    Volver a campañas
                  </Link>

                  <button
                    onClick={handleGenerateQueue}
                    disabled={generatingQueue}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatingQueue ? "Generando..." : "Generar cola"}
                  </button>
                </div>
              </div>

              {actionMsg ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {actionMsg}
                </div>
              ) : null}
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Audiencia
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {campaign.totalAudiencia}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  En cola / enviados
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {campaign.totalEnviados}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Errores
                </div>
                <div className="mt-2 text-2xl font-semibold text-red-700">
                  {campaign.totalError}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Leídos
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {campaign.totalLeidos}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Pagaron
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {campaign.totalPagaron}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  Configuración de campaña
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Plantilla
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {campaign.plantilla || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Idioma: {campaign.idioma}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Tipo / Ventana
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {campaign.tipo || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {campaign.ventanaAnalisisDias} día(s)
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Creación
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(campaign.fechaCreacion)}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Creado por: {campaign.creadoPor || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Lanzamiento
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(campaign.fechaLanzamiento)}
                    </div>
                  </div>
                </div>

                {campaign.observaciones ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Observaciones
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">
                      {campaign.observaciones}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Monto recuperado actual
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {formatGs(campaign.montoTotalPagado)}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">
                  Resumen de audiencia
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Destinatarios cargados
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.total}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Teléfonos válidos
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.validos}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Requieren revisión
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.revision}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      En cola
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.enCola}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Pendientes
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {stats.pendientes}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Preview de destinatarios
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Vista previa del detalle de audiencia asociado a esta campaña.
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Teléfono
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Atraso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Saldo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Lote
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinatarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-sm text-slate-500"
                        >
                          No hay destinatarios cargados.
                        </td>
                      </tr>
                    ) : (
                      destinatarios.map((d) => (
                        <tr key={d.idDetalle} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <div className="font-medium">{d.cliente}</div>
                            <div className="text-xs text-slate-500">
                              cod_cliente: {d.codCliente}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {d.telefono || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {d.diasAtraso}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatGs(d.saldo)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                              {d.estadoEnvio}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {d.loteNumero}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}