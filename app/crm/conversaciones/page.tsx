"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Conversation = {
  telefono: string;
  codCliente: number | null;
  cliente: string | null;
  ultimoMensaje: string | null;
  ultimoTipo: "IN" | "OUT" | null;
  ultimoAt: string | null;
  unreadCount: number;
  estado: string;

  saldo?: number | null;
  diasAtraso?: number | null;
  ultimoPago?: string | null;
  categoria?: string | null;
  zona?: string | null;

  agendado?: boolean;
  idAgenda?: number | null;
  estadoAgenda?: string | null;
  tipoGestion?: string | null;
  prioridadAgenda?: string | null;
  fechaRecordatorio?: string | null;
  notaAgenda?: string | null;
  resultadoAgenda?: string | null;
  seguimiento?: string | null;
};

type ChatMsg = {
  id: string;
  dir: "IN" | "OUT";
  telefono: string;
  texto: string | null;
  tipo: string | null;
  id_opcion?: string | null;
  titulo_opcion?: string | null;
  fecha: string | null;
  estado_out?: string | null;
  media_id?: string | null;
  mime_type?: string | null;
  media_url?: string | null;
};

const ESTADOS_GESTION = [
  "TODOS",
  "NUEVO",
  "EN_GESTION",
  "PROMESA",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
] as const;

const AGENDA_FILTERS = [
  { value: "TODOS", label: "Todos" },
  { value: "SIN_AGENDA", label: "Sin agenda" },
  { value: "CON_AGENDA", label: "Con agenda" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PROMESA", label: "Promesa" },
  { value: "VENCIDO", label: "Vencido" },
] as const;

const QUICK_REPLIES = [
  {
    label: "Recordatorio amable",
    text: "Buen día, le escribimos para darle seguimiento a su cuenta pendiente. ¿Podría indicarnos cuándo estaría realizando el pago?",
  },
  {
    label: "Agendar promesa",
    text: "Gracias por responder. ¿Podemos agendar su compromiso de pago para una fecha específica?",
  },
  {
    label: "Pedir comprobante",
    text: "Perfecto, quedamos atentos a su comprobante de pago. Muchas gracias.",
  },
  {
    label: "Enviar extracto",
    text: "Le compartimos nuevamente su extracto para que pueda verificar el saldo pendiente.",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function formatDateShort(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGs(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Math.round(Number(value)).toLocaleString("es-PY")} Gs.`;
}

function estadoGestionLabel(value?: string | null) {
  switch (value) {
    case "NUEVO":
      return "Nuevo";
    case "EN_GESTION":
      return "En gestión";
    case "PROMESA":
      return "Promesa";
    case "PAGADO":
      return "Pagado";
    case "NO_RESPONDE":
      return "No responde";
    case "ERRONEO":
      return "Erróneo";
    default:
      return value || "Nuevo";
  }
}

function tipoMensajeLabel(value?: string | null) {
  switch (value) {
    case "IN":
      return "Entrante";
    case "OUT":
      return "Saliente";
    default:
      return "Sin movimiento";
  }
}

function tipoGestionLabel(value?: string | null) {
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
      return value || "—";
  }
}

function seguimientoLabel(value?: string | null) {
  switch (value) {
    case "SIN_AGENDA":
      return "Sin agenda";
    case "AGENDADO":
      return "Agendado";
    case "PENDIENTE":
      return "Pendiente";
    case "PROMESA":
      return "Promesa";
    case "VENCIDO":
      return "Vencido";
    case "REALIZADO":
      return "Realizado";
    case "REAGENDADO":
      return "Reagendado";
    case "PAGADO":
      return "Pagado";
    case "NO_RESPONDE":
      return "No responde";
    case "ERRONEO":
      return "Erróneo";
    case "CANCELADO":
      return "Cancelado";
    default:
      return value || "Sin agenda";
  }
}

function outStatusLabel(value?: string | null) {
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
      return value || "Sin estado";
  }
}

function estadoBadgeClasses(estado?: string | null) {
  switch (estado) {
    case "NUEVO":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "EN_GESTION":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "PROMESA":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "PAGADO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NO_RESPONDE":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "ERRONEO":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function seguimientoBadgeClasses(value?: string | null) {
  switch (value) {
    case "SIN_AGENDA":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "AGENDADO":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "PENDIENTE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "PROMESA":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "VENCIDO":
      return "border-red-200 bg-red-50 text-red-700";
    case "REALIZADO":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "REAGENDADO":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "PAGADO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NO_RESPONDE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "ERRONEO":
      return "border-red-200 bg-red-50 text-red-700";
    case "CANCELADO":
      return "border-slate-300 bg-slate-200 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function outStatusBadgeClasses(status?: string | null) {
  switch (status) {
    case "SENT":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "DELIVERED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "READ":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";
    case "SENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "QUEUED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function directionBadgeClasses(dir?: string | null) {
  if (dir === "IN") return "border-blue-200 bg-blue-50 text-blue-700";
  if (dir === "OUT") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function getConversationTitle(c: Conversation) {
  return c.cliente || c.telefono;
}

function getConversationSubtitle(c: Conversation) {
  if (c.codCliente) return `Cliente #${c.codCliente}`;
  return "Sin cliente asociado";
}

function buildMediaUrl(m: ChatMsg) {
  if (m.media_url && String(m.media_url).trim()) {
    return m.media_url;
  }

  if (m.media_id && String(m.media_id).trim()) {
    return `/api/whatsapp/media/${encodeURIComponent(m.media_id)}`;
  }

  return null;
}

function isImageMessage(m: ChatMsg) {
  return m.tipo === "image" && !!buildMediaUrl(m);
}

function isAudioMessage(m: ChatMsg) {
  return m.tipo === "audio" && !!buildMediaUrl(m);
}

function isVideoMessage(m: ChatMsg) {
  return m.tipo === "video" && !!buildMediaUrl(m);
}

function isDocumentMessage(m: ChatMsg) {
  return m.tipo === "document" && !!buildMediaUrl(m);
}

function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: number;
  helper?: string;
  tone?: "default" | "blue" | "amber" | "violet" | "emerald" | "red";
}) {
  const valueClass =
    tone === "blue"
      ? "text-blue-700"
      : tone === "amber"
      ? "text-amber-700"
      : tone === "violet"
      ? "text-violet-700"
      : tone === "emerald"
      ? "text-emerald-700"
      : tone === "red"
      ? "text-red-700"
      : "text-slate-950";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
          💬
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="text-right font-medium text-slate-950">{value || "—"}</span>
    </div>
  );
}

function renderMessageContent(m: ChatMsg) {
  const mediaUrl = buildMediaUrl(m);

  if (isImageMessage(m) && mediaUrl) {
    return (
      <div className="space-y-2">
        <img
          src={mediaUrl}
          alt={m.texto || "Imagen recibida"}
          className="max-h-[360px] w-auto max-w-full rounded-2xl border border-slate-200 bg-white object-contain"
          loading="lazy"
        />

        {m.texto && m.texto !== "[Imagen recibida]" ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {m.texto}
          </div>
        ) : null}
      </div>
    );
  }

  if (isAudioMessage(m) && mediaUrl) {
    return (
      <div className="space-y-2">
        <audio controls preload="none" className="max-w-full">
          <source src={mediaUrl} type={m.mime_type || "audio/ogg"} />
          Tu navegador no soporta audio.
        </audio>

        {m.texto && m.texto !== "[Audio recibido]" ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {m.texto}
          </div>
        ) : null}
      </div>
    );
  }

  if (isVideoMessage(m) && mediaUrl) {
    return (
      <div className="space-y-2">
        <video
          controls
          preload="metadata"
          className="max-h-[360px] max-w-full rounded-2xl border border-slate-200 bg-black"
        >
          <source src={mediaUrl} type={m.mime_type || "video/mp4"} />
          Tu navegador no soporta video.
        </video>

        {m.texto && m.texto !== "[Video recibido]" ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {m.texto}
          </div>
        ) : null}
      </div>
    );
  }

  if (isDocumentMessage(m) && mediaUrl) {
    return (
      <div className="space-y-2">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Abrir documento
        </a>

        {m.mime_type ? (
          <div className="text-xs text-slate-500">{m.mime_type}</div>
        ) : null}

        {m.texto ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {m.texto}
          </div>
        ) : null}
      </div>
    );
  }

  if (
    (m.tipo === "image" ||
      m.tipo === "audio" ||
      m.tipo === "video" ||
      m.tipo === "document") &&
    !mediaUrl
  ) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Medio recibido, pero sin URL disponible.
        </div>

        <div className="text-xs text-slate-500">
          media_id: {m.media_id || "—"}
        </div>

        {m.texto ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {m.texto}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-6">
      {m.texto || <span className="text-slate-500">(sin texto)</span>}
    </div>
  );
}

export default function CRMConversationsPage() {
  const [convStatus, setConvStatus] = useState("");
  const [convs, setConvs] = useState<Conversation[]>([]);

  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [selectedEstado, setSelectedEstado] = useState("");

  const [chatStatus, setChatStatus] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);

  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [sendingExtract, setSendingExtract] = useState(false);

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [agendaFilter, setAgendaFilter] = useState<string>("TODOS");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = useMemo(() => {
    return convs.find((c) => c.telefono === selectedPhone) || null;
  }, [convs, selectedPhone]);

  const stats = useMemo(() => {
    return {
      total: convs.length,
      noLeidas: convs.filter((c) => Number(c.unreadCount || 0) > 0).length,
      entrantes: convs.filter((c) => c.ultimoTipo === "IN").length,
      sinAgenda: convs.filter((c) => c.seguimiento === "SIN_AGENDA").length,
      promesas: convs.filter((c) => c.seguimiento === "PROMESA").length,
      vencidos: convs.filter((c) => c.seguimiento === "VENCIDO").length,
    };
  }, [convs]);

  const agendarHref = useMemo(() => {
    if (!selectedPhone) return "/crm/agendar";

    const params = new URLSearchParams();
    params.set("telefono", selectedPhone);

    if (selectedCodCliente !== null && selectedCodCliente !== undefined) {
      params.set("codCliente", String(selectedCodCliente));
    }

    if (selectedCliente) {
      params.set("cliente", selectedCliente);
    }

    return `/crm/agendar?${params.toString()}`;
  }, [selectedPhone, selectedCodCliente, selectedCliente]);

  const loadConvs = useCallback(async () => {
    try {
      setRefreshing(true);

      const params = new URLSearchParams();
      params.set("limit", "150");

      if (search.trim()) {
        params.set("q", search.trim());
      }

      if (estadoFilter && estadoFilter !== "TODOS") {
        params.set("estado", estadoFilter);
      }

      if (agendaFilter && agendaFilter !== "TODOS") {
        params.set("agenda", agendaFilter);
      }

      if (onlyUnread) {
        params.set("soloNoLeidos", "1");
      }

      const res = await fetch(`/api/crm/conversaciones?${params.toString()}`, {
        cache: "no-store",
      });

      const text = await res.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("La API respondió un formato inválido.");
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo cargar conversaciones.");
      }

      const rows = Array.isArray(data.rows) ? (data.rows as Conversation[]) : [];

      setConvs(rows);

      if (selectedPhone) {
        const current = rows.find((r) => r.telefono === selectedPhone);

        if (current) {
          setSelectedCodCliente(current.codCliente ?? null);
          setSelectedCliente(current.cliente ?? null);
          setSelectedEstado(current.estado ?? "");
        }
      }

      setConvStatus("");
    } catch (e: any) {
      console.error("Error cargando conversaciones:", e);

      setConvs((currentRows) => {
        if (currentRows.length > 0) {
          setConvStatus("");
          return currentRows;
        }

        setConvStatus(e?.message || "Error cargando conversaciones.");
        return currentRows;
      });
    } finally {
      setRefreshing(false);
    }
  }, [search, estadoFilter, agendaFilter, onlyUnread, selectedPhone]);

  const loadChat = useCallback(async (telefono: string) => {
    try {
      setChatStatus("Cargando historial...");

      const res = await fetch(
        `/api/crm/historial?telefono=${encodeURIComponent(telefono)}&limit=300`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error || "No se pudo cargar historial.");
      }

      setChat(Array.isArray(data.rows) ? (data.rows as ChatMsg[]) : []);
      setChatStatus("");
    } catch (e: any) {
      setChatStatus(e?.message || "Error cargando historial.");
      setChat([]);
    }
  }, []);

  async function marcarLeido(telefono: string) {
    try {
      await fetch("/api/crm/marcar_leido", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ telefono }),
      });
    } catch {
      // No bloquea la UX.
    }
  }

  async function openConversation(c: Conversation) {
    setSelectedPhone(c.telefono);
    setSelectedCodCliente(c.codCliente ?? null);
    setSelectedCliente(c.cliente ?? null);
    setSelectedEstado(c.estado ?? "");
    setReplyText("");

    await loadChat(c.telefono);
    await marcarLeido(c.telefono);
    await loadConvs();
  }

  async function sendReply() {
    if (!selectedPhone) {
      alert("Seleccioná una conversación.");
      return;
    }

    if (!replyText.trim()) {
      alert("Escribí un mensaje.");
      return;
    }

    setReplySaving(true);

    try {
      const res = await fetch("/api/whatsapp/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefono: selectedPhone,
          mensaje: replyText.trim(),
          cod_cliente: selectedCodCliente,
        }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo enviar la respuesta.");
      }

      setReplyText("");

      await loadChat(selectedPhone);
      await loadConvs();
    } catch (e: any) {
      alert(`Error: ${e?.message || "No se pudo enviar."}`);
    } finally {
      setReplySaving(false);
    }
  }

  async function sendExtract() {
    if (!selectedPhone) {
      alert("Seleccioná una conversación.");
      return;
    }

    if (!selectedCodCliente) {
      alert("Esta conversación no tiene código de cliente asociado.");
      return;
    }

    setSendingExtract(true);

    try {
      const res = await fetch("/api/whatsapp/send-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codCliente: selectedCodCliente,
          telefono: selectedPhone,
        }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo enviar el extracto.");
      }

      alert("Extracto enviado correctamente.");

      await loadChat(selectedPhone);
      await loadConvs();
    } catch (e: any) {
      alert(`Error: ${e?.message || "No se pudo enviar el extracto."}`);
    } finally {
      setSendingExtract(false);
    }
  }

  function applyQuickReply(text: string) {
    setReplyText((current) => {
      if (!current.trim()) return text;
      return `${current.trim()}\n\n${text}`;
    });
  }

  useEffect(() => {
    loadConvs();

    const t = setInterval(() => {
      loadConvs();
    }, 10000);

    return () => clearInterval(t);
  }, [loadConvs]);

  useEffect(() => {
    if (!chat?.length) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-6 px-4 pb-8 sm:px-6 xl:px-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white md:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                Fase 6 · Inbox operativo
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-4xl">
                Conversaciones de cobranza
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Revisá respuestas, enviá mensajes, compartí extractos y registrá
                seguimiento desde una sola mesa de trabajo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/crm"
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Dashboard
              </Link>

              <Link
                href="/crm/agenda/dashboard"
                className="inline-flex items-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Agenda dashboard
              </Link>

              <button
                onClick={loadConvs}
                disabled={refreshing}
                className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
              >
                {refreshing ? "Actualizando..." : "Actualizar inbox"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total" value={stats.total} helper="Cargadas" />
          <StatCard label="No leídas" value={stats.noLeidas} tone="blue" />
          <StatCard label="Entrantes" value={stats.entrantes} tone="amber" />
          <StatCard label="Sin agenda" value={stats.sinAgenda} />
          <StatCard label="Promesas" value={stats.promesas} tone="violet" />
          <StatCard label="Vencidos" value={stats.vencidos} tone="red" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_220px_220px_190px]">
          <div className="grid gap-1.5 text-sm">
            <label htmlFor="searchInbox" className="font-medium text-slate-700">
              Buscar conversación
            </label>
            <input
              id="searchInbox"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cliente, teléfono, código o texto del último mensaje..."
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="grid gap-1.5 text-sm">
            <label htmlFor="estadoFilter" className="font-medium text-slate-700">
              Estado de gestión
            </label>
            <select
              id="estadoFilter"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              {ESTADOS_GESTION.map((estado) => (
                <option key={estado} value={estado}>
                  {estado === "TODOS" ? "Todos" : estadoGestionLabel(estado)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5 text-sm">
            <label htmlFor="agendaFilter" className="font-medium text-slate-700">
              Agenda
            </label>
            <select
              id="agendaFilter"
              value={agendaFilter}
              onChange={(e) => setAgendaFilter(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            >
              {AGENDA_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="inline-flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={onlyUnread}
                onChange={(e) => setOnlyUnread(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Solo no leídos
            </label>
          </div>
        </div>
      </section>

      {convStatus ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          No se pudo actualizar el inbox en este momento. Probá recargar nuevamente.
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[370px_minmax(0,1fr)_360px]">
        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Bandeja
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {convs.length} resultado(s)
                </p>
              </div>

              {refreshing ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                  Actualizando
                </span>
              ) : null}
            </div>
          </div>

          <div className="max-h-[760px] space-y-3 overflow-y-auto p-4">
            {convs.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                No hay conversaciones para mostrar con los filtros actuales.
              </div>
            ) : (
              convs.map((c) => {
                const active = selectedPhone === c.telefono;
                const unread = Number(c.unreadCount || 0);

                return (
                  <button
                    key={c.telefono}
                    onClick={() => openConversation(c)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className={`truncate text-sm font-semibold ${
                            active ? "text-white" : "text-slate-950"
                          }`}
                        >
                          {getConversationTitle(c)}
                        </div>

                        <div
                          className={`mt-1 text-xs ${
                            active ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {getConversationSubtitle(c)} · {c.telefono}
                        </div>
                      </div>

                      {unread > 0 ? (
                        <span
                          className={`inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-xs font-bold ${
                            active
                              ? "bg-white text-slate-950"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {unread}
                        </span>
                      ) : null}
                    </div>

                    <p
                      className={`mt-3 line-clamp-2 text-sm leading-5 ${
                        active ? "text-slate-200" : "text-slate-600"
                      }`}
                    >
                      {c.ultimoMensaje || "Sin último mensaje registrado."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          active
                            ? "border-white/15 bg-white/10 text-white"
                            : estadoBadgeClasses(c.estado)
                        }`}
                      >
                        {estadoGestionLabel(c.estado)}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          active
                            ? "border-white/15 bg-white/10 text-white"
                            : directionBadgeClasses(c.ultimoTipo)
                        }`}
                      >
                        {tipoMensajeLabel(c.ultimoTipo)}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          active
                            ? "border-white/15 bg-white/10 text-white"
                            : seguimientoBadgeClasses(c.seguimiento)
                        }`}
                      >
                        {seguimientoLabel(c.seguimiento)}
                      </span>

                      <span
                        className={`ml-auto text-[11px] ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {formatDateShort(c.ultimoAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-slate-950">
                        {getConversationTitle(selectedConversation)}
                      </h2>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${estadoBadgeClasses(
                          selectedConversation.estado
                        )}`}
                      >
                        {estadoGestionLabel(selectedConversation.estado)}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${seguimientoBadgeClasses(
                          selectedConversation.seguimiento
                        )}`}
                      >
                        {seguimientoLabel(selectedConversation.seguimiento)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {getConversationSubtitle(selectedConversation)} ·{" "}
                      {selectedConversation.telefono}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => loadChat(selectedConversation.telefono)}
                      className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      Recargar chat
                    </button>

                    <button
                      onClick={sendExtract}
                      disabled={sendingExtract || !selectedCodCliente}
                      className="inline-flex items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {sendingExtract ? "Enviando..." : "Enviar extracto"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[620px] min-h-[520px] space-y-4 overflow-y-auto bg-slate-50 p-5">
                {chatStatus ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {chatStatus}
                  </div>
                ) : null}

                {!chatStatus && chat.length === 0 ? (
                  <EmptyState
                    title="Sin historial disponible"
                    description="Todavía no se encontraron mensajes entrantes o salientes para esta conversación."
                  />
                ) : null}

                {chat.map((m) => {
                  const isOut = m.dir === "OUT";

                  return (
                    <div
                      key={m.id}
                      className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-3xl border px-4 py-3 shadow-sm ${
                          isOut
                            ? "border-emerald-200 bg-emerald-100 text-emerald-950"
                            : "border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              isOut
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {isOut ? "Sistema" : "Cliente"}
                          </span>

                          {m.tipo ? (
                            <span className="text-[11px] text-slate-500">
                              {m.tipo}
                            </span>
                          ) : null}

                          {m.id_opcion || m.titulo_opcion ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              Respuesta interactiva
                            </span>
                          ) : null}
                        </div>

                        {m.titulo_opcion ? (
                          <div className="mb-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                            Opción: {m.titulo_opcion}
                          </div>
                        ) : null}

                        {renderMessageContent(m)}

                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                          {isOut ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${outStatusBadgeClasses(
                                m.estado_out
                              )}`}
                            >
                              {outStatusLabel(m.estado_out)}
                            </span>
                          ) : null}

                          <span className="text-[11px] text-slate-500">
                            {formatTimeOnly(m.fecha)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={endRef} />
              </div>

              <div className="border-t border-slate-200 p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  {QUICK_REPLIES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => applyQuickReply(item.text)}
                      title={item.text}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    rows={4}
                    placeholder="Escribir respuesta manual al cliente..."
                    className="w-full resize-none rounded-3xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Atajo: Ctrl + Enter para enviar.
                    </p>

                    <button
                      onClick={sendReply}
                      disabled={replySaving || !replyText.trim()}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {replySaving ? "Enviando..." : "Enviar respuesta"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5">
              <EmptyState
                title="Seleccioná una conversación"
                description="Al seleccionar un cliente vas a ver el historial completo, podrás responder, enviar extracto y registrar seguimiento."
              />
            </div>
          )}
        </main>

        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-950">
              Cliente y gestión
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Datos operativos de la conversación seleccionada.
            </p>
          </div>

          {selectedConversation ? (
            <div className="space-y-5 p-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cliente
                </div>

                <div className="mt-3 text-lg font-semibold text-slate-950">
                  {selectedCliente || selectedConversation.telefono}
                </div>

                <div className="mt-2 space-y-2 text-sm text-slate-600">
                  <InfoRow label="Código" value={selectedCodCliente} />
                  <InfoRow label="Teléfono" value={selectedPhone} />
                  <InfoRow
                    label="Último movimiento"
                    value={formatDateShort(selectedConversation.ultimoAt)}
                  />
                  <InfoRow
                    label="Tipo"
                    value={tipoMensajeLabel(selectedConversation.ultimoTipo)}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cobranza
                </div>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <InfoRow label="Saldo" value={formatGs(selectedConversation.saldo)} />
                  <InfoRow
                    label="Días atraso"
                    value={
                      selectedConversation.diasAtraso !== null &&
                      selectedConversation.diasAtraso !== undefined
                        ? `${selectedConversation.diasAtraso} día(s)`
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Último pago"
                    value={formatDateShort(selectedConversation.ultimoPago)}
                  />
                  <InfoRow label="Zona" value={selectedConversation.zona} />
                  <InfoRow label="Categoría" value={selectedConversation.categoria} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Agenda
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${seguimientoBadgeClasses(
                      selectedConversation.seguimiento
                    )}`}
                  >
                    {seguimientoLabel(selectedConversation.seguimiento)}
                  </span>

                  {selectedConversation.prioridadAgenda ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Prioridad {selectedConversation.prioridadAgenda}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <InfoRow
                    label="Estado"
                    value={selectedConversation.estadoAgenda || "Sin agenda"}
                  />
                  <InfoRow
                    label="Tipo gestión"
                    value={tipoGestionLabel(selectedConversation.tipoGestion)}
                  />
                  <InfoRow
                    label="Recordatorio"
                    value={formatDate(selectedConversation.fechaRecordatorio)}
                  />
                </div>

                {selectedConversation.notaAgenda ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Nota
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {selectedConversation.notaAgenda}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Estado actual
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${estadoBadgeClasses(
                      selectedEstado || selectedConversation.estado
                    )}`}
                  >
                    {estadoGestionLabel(selectedEstado || selectedConversation.estado)}
                  </span>

                  {Number(selectedConversation.unreadCount || 0) > 0 ? (
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {selectedConversation.unreadCount} no leído(s)
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Sin pendientes de lectura
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Último mensaje:{" "}
                  <span className="font-medium text-slate-900">
                    {selectedConversation.ultimoMensaje || "Sin mensaje."}
                  </span>
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Acciones rápidas
                </div>

                <div className="mt-4 grid gap-3">
                  <Link
                    href={agendarHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Agendar seguimiento
                  </Link>

                  <button
                    onClick={sendExtract}
                    disabled={sendingExtract || !selectedCodCliente}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {sendingExtract ? "Enviando extracto..." : "Enviar extracto"}
                  </button>

                  <a
                    href={`https://wa.me/${selectedPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Abrir en WhatsApp
                  </a>

                  <button
                    onClick={() => navigator.clipboard?.writeText(selectedPhone)}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Copiar teléfono
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="Sin cliente seleccionado"
                description="Elegí una conversación de la bandeja para ver datos del cliente y acciones rápidas."
              />
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}