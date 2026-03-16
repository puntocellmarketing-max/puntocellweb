"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Conversation = {
  telefono: string;
  codCliente: number | null;
  cliente: string | null;
  ultimoMensaje: string | null;
  ultimoTipo: "IN" | "OUT" | null;
  ultimoAt: string | null;
  unreadCount: number;
  estado: string;
};

type ChatMsg = {
  id: string;
  dir: "IN" | "OUT";
  telefono: string;
  texto: string | null;
  tipo: string | null;
  id_opcion?: string | null;
  titulo_opcion?: string | null;
  fecha: string;
  estado_out?: string | null;
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

function bubbleClass(dir: "IN" | "OUT") {
  if (dir === "OUT") {
    return "ml-auto border-emerald-200 bg-emerald-100 text-emerald-950";
  }
  return "mr-auto border-slate-200 bg-slate-100 text-slate-900";
}

function estadoBadgeClasses(estado: string) {
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

function outStatusBadgeClasses(status?: string | null) {
  switch (status) {
    case "SENT":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "DELIVERED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "READ":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";
    case "SENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getConversationTitle(c: Conversation) {
  return c.cliente || c.telefono;
}

function getConversationSubtitle(c: Conversation) {
  if (c.codCliente) return `Cliente #${c.codCliente}`;
  return "Sin cliente asociado";
}

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: number;
  color?: "default" | "blue" | "violet" | "emerald";
}) {
  const valueClass =
    color === "blue"
      ? "text-blue-700"
      : color === "violet"
      ? "text-violet-700"
      : color === "emerald"
      ? "text-emerald-700"
      : "text-slate-950";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</div>
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
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadConvs() {
    try {
      setRefreshing(true);

      const params = new URLSearchParams();
      params.set("limit", "150");
      if (search.trim()) params.set("q", search.trim());
      if (estadoFilter && estadoFilter !== "TODOS") {
        params.set("estado", estadoFilter);
      }
      if (onlyUnread) params.set("soloNoLeidos", "1");

      const res = await fetch(`/api/crm/conversaciones?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error || "No se pudo cargar conversaciones");
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
      setConvStatus(e?.message || "Error cargando conversaciones");
    } finally {
      setRefreshing(false);
    }
  }

  async function loadChat(telefono: string) {
    try {
      setChatStatus("Cargando historial...");

      const res = await fetch(
        `/api/crm/historial?telefono=${encodeURIComponent(telefono)}&limit=300`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error || "No se pudo cargar historial");
      }

      setChat(Array.isArray(data.rows) ? (data.rows as ChatMsg[]) : []);
      setChatStatus("");
    } catch (e: any) {
      setChatStatus(e?.message || "Error cargando historial");
      setChat([]);
    }
  }

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
      // no bloquea UX
    }
  }

  async function openConversation(c: Conversation) {
    setSelectedPhone(c.telefono);
    setSelectedCodCliente(c.codCliente ?? null);
    setSelectedCliente(c.cliente ?? null);
    setSelectedEstado(c.estado ?? "");

    await loadChat(c.telefono);
    await marcarLeido(c.telefono);
    await loadConvs();
  }

  function closeReply() {
    if (replySaving) return;
    setReplyOpen(false);
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
      setReplyOpen(false);

      await loadChat(selectedPhone);
      await loadConvs();
    } catch (e: any) {
      alert(`Error: ${e?.message || "No se pudo enviar."}`);
    } finally {
      setReplySaving(false);
    }
  }

  useEffect(() => {
    loadConvs();
    const t = setInterval(loadConvs, 7000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!chat?.length) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadConvs();
    }, 300);

    return () => clearTimeout(t);
  }, [search, estadoFilter, onlyUnread]);

  const filteredConvs = useMemo(() => {
    return convs;
  }, [convs]);

  const selectedConversation = useMemo(() => {
    return convs.find((c) => c.telefono === selectedPhone) || null;
  }, [convs, selectedPhone]);

  const stats = useMemo(() => {
    return {
      total: convs.length,
      nuevos: convs.filter((c) => Number(c.unreadCount || 0) > 0).length,
      promesas: convs.filter((c) => c.estado === "PROMESA").length,
      pagados: convs.filter((c) => c.estado === "PAGADO").length,
    };
  }, [convs]);

  const agendarHref = useMemo(() => {
    if (!selectedPhone) return "#";

    const params = new URLSearchParams();
    params.set("telefono", selectedPhone);

    if (selectedCodCliente !== null && selectedCodCliente !== undefined) {
      params.set("codCliente", String(selectedCodCliente));
    }

    return `/crm/agendar?${params.toString()}`;
  }, [selectedPhone, selectedCodCliente]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Fase 6 · Conversaciones
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Inbox de conversaciones
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Gestioná mensajes entrantes, respuestas manuales y continuidad de
              cobranza desde una sola vista operativa.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/agendar"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Agenda
            </Link>

            <Link
              href="/crm"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Dashboard
            </Link>

            <button
              onClick={loadConvs}
              disabled={refreshing}
              className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {refreshing ? "Actualizando..." : "Refrescar"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total conversaciones" value={stats.total} />
        <StatCard label="Nuevas / no leídas" value={stats.nuevos} color="blue" />
        <StatCard label="Promesas" value={stats.promesas} color="violet" />
        <StatCard label="Pagados" value={stats.pagados} color="emerald" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_220px_180px]">
          <div className="grid gap-1.5 text-sm">
            <label htmlFor="searchInbox" className="text-slate-700">
              Buscar en conversaciones
            </label>
            <input
              id="searchInbox"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por teléfono, cliente, mensaje, estado o codCliente..."
              className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="grid gap-1.5 text-sm">
            <label htmlFor="estadoFilter" className="text-slate-700">
              Estado de gestión
            </label>
            <select
              id="estadoFilter"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
            >
              {ESTADOS_GESTION.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="inline-flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700">
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {convStatus}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[390px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-950">
              Bandeja de conversaciones
            </h3>
            <span className="text-xs text-slate-500">
              {filteredConvs.length} resultado(s)
            </span>
          </div>

          <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
            {filteredConvs.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                No hay conversaciones para mostrar con esos filtros.
              </div>
            ) : (
              filteredConvs.map((c) => {
                const active = selectedPhone === c.telefono;

                return (
                  <button
                    key={c.telefono}
                    onClick={() => openConversation(c)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {getConversationTitle(c)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {getConversationSubtitle(c)}
                        </div>
                        <div className="mt-1 font-mono text-xs text-slate-500">
                          {c.telefono}
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-500">
                        <div>{formatDateShort(c.ultimoAt)}</div>
                        <div>{formatTimeOnly(c.ultimoAt)}</div>
                      </div>
                    </div>

                    <div className="mt-3 line-clamp-2 min-h-[40px] text-sm text-slate-700">
                      {c.ultimoMensaje || (
                        <span className="text-slate-400">(sin mensaje)</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${estadoBadgeClasses(
                          c.estado
                        )}`}
                      >
                        {c.estado}
                      </span>

                      {c.ultimoTipo ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          {c.ultimoTipo}
                        </span>
                      ) : null}

                      {Number(c.unreadCount || 0) > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          NUEVO ({c.unreadCount})
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Conversación seleccionada
              </div>

              <div className="mt-1 text-xl font-semibold text-slate-950">
                {selectedCliente || selectedPhone || "Seleccioná una conversación"}
              </div>

              <div className="mt-1 font-mono text-xs text-slate-500">
                {selectedPhone || "—"}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  {selectedCodCliente
                    ? `Cliente #${selectedCodCliente}`
                    : "Sin cod_cliente"}
                </span>

                {selectedEstado ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${estadoBadgeClasses(
                      selectedEstado
                    )}`}
                  >
                    {selectedEstado}
                  </span>
                ) : null}

                {selectedConversation?.unreadCount ? (
                  <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {selectedConversation.unreadCount} no leído(s)
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-sm text-slate-500">
                Último movimiento: {formatDate(selectedConversation?.ultimoAt || null)}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (!selectedPhone) {
                    alert("Seleccioná una conversación.");
                    return;
                  }
                  setReplyText("");
                  setReplyOpen(true);
                }}
                disabled={!selectedPhone}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Responder
              </button>

              <button
                onClick={() => {
                  if (!selectedPhone) return;
                  loadChat(selectedPhone);
                }}
                disabled={!selectedPhone}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Recargar chat
              </button>

              <Link
                href={agendarHref}
                className={`inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 ${
                  !selectedPhone ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Agendar
              </Link>
            </div>
          </div>

          <div className="mt-4 h-[680px] overflow-y-auto rounded-2xl bg-slate-50 p-4">
            {!selectedPhone ? (
              <div className="rounded-2xl bg-white p-5 text-sm text-slate-600">
                Elegí una conversación de la izquierda para ver el historial completo.
              </div>
            ) : chatStatus ? (
              <div className="rounded-2xl bg-white p-5 text-sm text-slate-600">
                {chatStatus}
              </div>
            ) : chat.length === 0 ? (
              <div className="rounded-2xl bg-white p-5 text-sm text-slate-600">
                Sin mensajes todavía.
              </div>
            ) : (
              <div className="space-y-3">
                {chat.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[82%] rounded-2xl border px-4 py-3 ${bubbleClass(
                      m.dir
                    )}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] opacity-75">{m.dir}</span>

                      {m.dir === "OUT" && m.estado_out ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outStatusBadgeClasses(
                            m.estado_out
                          )}`}
                        >
                          {m.estado_out}
                        </span>
                      ) : null}

                      {m.tipo ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          tipo: {m.tipo}
                        </span>
                      ) : null}
                    </div>

                    <div className="whitespace-pre-wrap break-words text-sm leading-6">
                      {m.texto || <span className="text-slate-500">(sin texto)</span>}
                    </div>

                    {(m.titulo_opcion || m.id_opcion) && (
                      <div className="mt-2 rounded-xl bg-white/60 p-2 text-[11px] text-slate-700">
                        {m.titulo_opcion ? <div>opción: {m.titulo_opcion}</div> : null}
                        {m.id_opcion ? <div>id: {m.id_opcion}</div> : null}
                      </div>
                    )}

                    <div className="mt-3 text-right text-[11px] opacity-75">
                      {formatDate(m.fecha)}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedPhone ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Continuar flujo
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Después de responder o revisar esta conversación, registrá la gestión
                y el seguimiento correspondiente.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={agendarHref}
                className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Ir a agenda
              </Link>

              <Link
                href="/crm/campanias"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Ver campañas
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {replyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  Responder conversación
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500">
                  {selectedPhone}
                </div>
              </div>

              <button
                onClick={closeReply}
                disabled={replySaving}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-1.5">
              <label className="text-sm text-slate-700">Mensaje</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={7}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                placeholder="Escribí una respuesta clara para el cliente..."
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={closeReply}
                disabled={replySaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={sendReply}
                disabled={replySaving}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {replySaving ? "Enviando..." : "Enviar respuesta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}