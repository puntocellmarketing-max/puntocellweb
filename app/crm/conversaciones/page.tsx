"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Conversation = {
  telefono: string;
  cod_cliente: number | null;
  ultimo_mensaje: string | null;
  ultimo_tipo: "IN" | "OUT" | null;
  ultimo_at: string | null;
  unread_count: number;
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function bubbleClass(dir: "IN" | "OUT") {
  if (dir === "OUT") {
    return "ml-auto bg-emerald-100 text-emerald-950 border-emerald-200";
  }
  return "mr-auto bg-slate-100 text-slate-900 border-slate-200";
}

function estadoBadgeClasses(estado: string) {
  switch (estado) {
    case "NUEVO":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "EN_GESTION":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "PROMESA":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "PAGADO":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "NO_RESPONDE":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "ERRONEO":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function CRMConversationsPage() {
  const [convStatus, setConvStatus] = useState("");
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(null);

  const [chatStatus, setChatStatus] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadConvs() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/crm/conversaciones?limit=100", {
        cache: "no-store",
      });
      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error || "No se pudo cargar conversaciones");
      }

      setConvs(data.rows || []);
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
        `/api/crm/historial?telefono=${encodeURIComponent(telefono)}&limit=200`,
        {
          cache: "no-store",
        }
      );
      const data = await res.json();

      if (!data?.ok) {
        throw new Error(data?.error || "No se pudo cargar historial");
      }

      setChat(data.rows || []);
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
      // No interrumpimos la UX si falla
    }
  }

  async function openConversation(c: Conversation) {
    setSelectedPhone(c.telefono);
    setSelectedCodCliente(c.cod_cliente ?? null);

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

      const data = await res.json();

      if (!data?.ok) {
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

  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convs;

    return convs.filter((c) => {
      return (
        String(c.telefono || "").toLowerCase().includes(q) ||
        String(c.ultimo_mensaje || "").toLowerCase().includes(q) ||
        String(c.cod_cliente || "").toLowerCase().includes(q) ||
        String(c.estado || "").toLowerCase().includes(q)
      );
    });
  }, [convs, search]);

  const stats = useMemo(() => {
    return {
      total: convs.length,
      nuevos: convs.filter((c) => c.unread_count > 0).length,
      promesas: convs.filter((c) => c.estado === "PROMESA").length,
      pagados: convs.filter((c) => c.estado === "PAGADO").length,
    };
  }, [convs]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                CRM / Inbox
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Conversaciones
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Desde acá podés ver mensajes entrantes y salientes, revisar el
                historial por teléfono, responder desde el sistema y hacer
                seguimiento operativo de cobranza.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/crm"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Volver al panel
              </Link>

              <button
                onClick={loadConvs}
                disabled={refreshing}
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {refreshing ? "Actualizando..." : "Refrescar"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Total conversaciones
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {stats.total}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Nuevas / no leídas
            </div>
            <div className="mt-2 text-2xl font-semibold text-blue-700">
              {stats.nuevos}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Promesas
            </div>
            <div className="mt-2 text-2xl font-semibold text-violet-700">
              {stats.promesas}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Pagados
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {stats.pagados}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-1 text-sm">
            <label htmlFor="searchInbox" className="text-slate-700">
              Buscar en conversaciones
            </label>
            <input
              id="searchInbox"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por teléfono, mensaje, estado o cod_cliente..."
              className="rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-blue-500"
            />
          </div>
        </section>

        {convStatus ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {convStatus}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Lista de conversaciones
              </h2>
              <span className="text-xs text-slate-500">
                {filteredConvs.length} resultado(s)
              </span>
            </div>

            <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
              {filteredConvs.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  No hay conversaciones para mostrar.
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
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-sm text-slate-900">
                          {c.telefono}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDate(c.ultimo_at)}
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {c.cod_cliente ? `cod_cliente: ${c.cod_cliente}` : "Sin cod_cliente"}
                      </div>

                      <div className="mt-2 line-clamp-2 text-sm text-slate-700">
                        {c.ultimo_mensaje || (
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

                        {c.unread_count > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                            NUEVO ({c.unread_count})
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
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Conversación seleccionada
                </div>
                <div className="mt-1 font-mono text-lg font-semibold text-slate-900">
                  {selectedPhone || "Seleccioná una conversación"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedCodCliente
                    ? `cod_cliente: ${selectedCodCliente}`
                    : "Sin cod_cliente asociado"}
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
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Responder
                </button>

                <button
                  onClick={() => {
                    if (!selectedPhone) return;
                    loadChat(selectedPhone);
                  }}
                  disabled={!selectedPhone}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                >
                  Recargar chat
                </button>
              </div>
            </div>

            <div className="mt-4 h-[620px] overflow-y-auto rounded-2xl bg-slate-50 p-4">
              {!selectedPhone ? (
                <div className="rounded-2xl bg-white p-5 text-sm text-slate-600">
                  Elegí una conversación de la izquierda para ver el historial.
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
                      className={`max-w-[78%] rounded-2xl border px-4 py-3 ${bubbleClass(
                        m.dir
                      )}`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm">
                        {m.texto || (
                          <span className="text-slate-500">(sin texto)</span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-75">
                        <span className="font-mono">{m.dir}</span>
                        <span>{formatDate(m.fecha)}</span>
                      </div>

                      {m.dir === "OUT" && m.estado_out ? (
                        <div className="mt-1 text-[11px] opacity-75">
                          estado: {m.estado_out}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              )}
            </div>
          </div>
        </section>

        {replyOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
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
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm text-slate-700">
                  Mensaje
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  placeholder="Escribí tu respuesta..."
                />
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeReply}
                  disabled={replySaving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  onClick={sendReply}
                  disabled={replySaving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {replySaving ? "Enviando..." : "Enviar respuesta"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}