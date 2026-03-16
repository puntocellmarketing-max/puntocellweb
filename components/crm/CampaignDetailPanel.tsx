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

type Props = {
  idCampania: number;
};

export default function CampaignDetailPanel({ idCampania }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadingGenerate, setLoadingGenerate] = useState(false);

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [audience, setAudience] = useState<AudienceDetail>(null);
  const [queue, setQueue] = useState<QueueSummary | null>(null);

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

  async function reloadAll() {
    setError(null);
    await loadCampaign();
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setMessage(null);
        setError(null);
        await loadCampaign();
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
  }, [idCampania]);

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

      await reloadAll();
    } catch (e: any) {
      setError(e?.message || "Error generando cola.");
    } finally {
      setLoadingGenerate(false);
    }
  }

  const summaryCards = useMemo(() => {
    return [
      { label: "TOTAL AUDIENCIA", value: campaign?.totalAudiencia ?? 0 },
      { label: "TOTAL COLA", value: queue?.totalCola ?? 0 },
      { label: "TOTAL ENVIADOS", value: campaign?.totalEnviados ?? 0 },
      { label: "TOTAL ERROR", value: campaign?.totalError ?? 0 },
      { label: "LEÍDOS", value: campaign?.totalLeidos ?? 0 },
    ];
  }, [campaign, queue]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Cargando detalle de campaña...</p>
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
              Vista administrativa de la campaña y resumen general.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/crm/campanias"
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver a campañas
            </Link>

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

            <Link
              href={`/crm/campanias/${idCampania}/envios`}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Ver operación de envíos
            </Link>
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
              IDIOMA
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {campaign?.idioma || "es"}
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
              ORIGEN
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {audience?.origen || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              VÁLIDOS
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {audience?.totalValidos ?? 0}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              INVÁLIDOS
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {audience?.totalInvalidos ?? 0}
            </p>
          </div>
        </div>

        {campaign?.observaciones ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">
              OBSERVACIONES
            </p>
            <p className="mt-2 text-sm text-slate-700">{campaign.observaciones}</p>
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Resumen general
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
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
      </div>
    </section>
  );
}