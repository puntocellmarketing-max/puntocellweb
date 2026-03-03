"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

type Row = { phone: string; cliente: string; saldo: string };

function normalizePhone(v: any) {
  let s = String(v ?? "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "")
    .replace(/[^\d]/g, "");
  if (s.length === 10 && s.startsWith("0")) s = s.slice(1); // 09xxxxxxxx -> 9xxxxxxxx
  if (s.length === 9 && s.startsWith("9")) s = "595" + s;
  return s;
}
function isValidPhone(s: string) {
  return /^\d{8,15}$/.test(s);
}

type Conversation = {
  id_conversacion: number;
  telefono: string;
  cod_cliente: number | null;
  ultimo_mensaje: string | null;
  ultimo_tipo: "IN" | "OUT" | null;
  ultimo_at: string | null;
  unread_count: number;
  estado: string;
  updated_at: string;
};

type ChatRow = {
  id: string;
  dir: "IN" | "OUT";
  telefono: string;
  texto: string | null;
  tipo: string;
  id_opcion: string | null;
  titulo_opcion: string | null;
  fecha: string;
  estado_out: string | null;
};

export default function CRMPage() {
  // =========================
  // CSV / Bulk
  // =========================
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const [log, setLog] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  const invalidCount = useMemo(() => {
    return rows.filter((r) => !isValidPhone(r.phone) || !r.cliente || !r.saldo).length;
  }, [rows]);

  async function previewApi(limit: number) {
    if (!file) return setStatus("Seleccioná un CSV primero.");

    setBusy(true);
    setStatus("Previsualizando…");
    setLog([]);
    setProcessed(0);
    setOkCount(0);
    setFailCount(0);
    setTotal(0);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("send", "false");
      fd.append("limit", String(limit));

      const res = await fetch("/api/whatsapp/bulk", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setStatus("Error: " + (data?.error || "falló la previsualización"));
        return;
      }

      setStatus(
        `Preview OK: ${data.count_preview} fila(s) (de ${data.count_total}). Delimitador: ${data.delimiter}`
      );
      setLog([{ type: "preview", data }]);
    } catch (e: any) {
      setStatus("Error: " + (e?.message || "desconocido"));
    } finally {
      setBusy(false);
    }
  }

  async function sendStream(limit: number) {
    if (!file) return setStatus("Seleccioná un CSV primero.");

    setBusy(true);
    setStatus("Enviando… (stream)");
    setLog([]);
    setProcessed(0);
    setOkCount(0);
    setFailCount(0);
    setTotal(0);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("send", "true");
      fd.append("limit", String(limit));

      const res = await fetch("/api/whatsapp/bulk", {
        method: "POST",
        body: fd,
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t || "sin respuesta"}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.type === "start") {
            setTotal(evt.total ?? 0);
          }
          if (evt.type === "item") {
            setLog((p) => [evt, ...p].slice(0, 200));
          }
          if (evt.type === "progress") {
            setProcessed(evt.processed ?? 0);
            setOkCount(evt.okCount ?? 0);
            setFailCount(evt.failCount ?? 0);
            setTotal(evt.total ?? 0);
          }
          if (evt.type === "done") {
            setProcessed(evt.processed ?? 0);
            setOkCount(evt.okCount ?? 0);
            setFailCount(evt.failCount ?? 0);
            setStatus(`Finalizado: ${evt.okCount} OK, ${evt.failCount} error(es).`);
          }
        }
      }
    } catch (e: any) {
      if (String(e?.name) === "AbortError") {
        setStatus("Envío cancelado.");
      } else {
        setStatus("Error: " + (e?.message || "desconocido"));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  // =========================
  // Conversaciones + Chat (Inbox PRO)
  // =========================
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convStatus, setConvStatus] = useState("");

  const [selectedTel, setSelectedTel] = useState("");
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(null);

  const [chat, setChat] = useState<ChatRow[]>([]);
  const [chatStatus, setChatStatus] = useState("");

  async function loadConvs() {
    try {
      const res = await fetch("/api/crm/conversaciones?limit=50", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "No se pudo cargar conversaciones");
      const list = (data.rows || []) as Conversation[];
      setConvs(list);
      setConvStatus("");

      // Auto-seleccionar primera conversación si no hay selección
      if (!selectedTel && list?.[0]?.telefono) {
        setSelectedTel(list[0].telefono);
        setSelectedCodCliente(list[0].cod_cliente ?? null);
      }
    } catch (e: any) {
      setConvStatus(e?.message || "Error cargando conversaciones");
    }
  }

  async function loadChat(telefono: string) {
    try {
      const res = await fetch(`/api/crm/historial?telefono=${encodeURIComponent(telefono)}&limit=200`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "No se pudo cargar historial");
      setChat((data.rows || []) as ChatRow[]);
      setChatStatus("");
    } catch (e: any) {
      setChatStatus(e?.message || "Error cargando historial");
    }
  }

  async function markRead(telefono: string) {
    try {
      await fetch("/api/crm/marcar_leido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });
      // refrescar conversaciones para ver el badge bajar
      loadConvs();
    } catch {}
  }

  useEffect(() => {
    loadConvs();
    const t = setInterval(loadConvs, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTel) return;
    loadChat(selectedTel);
    markRead(selectedTel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTel]);

  // =========================
  // Modal Responder
  // =========================
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTelefono, setReplyTelefono] = useState("");
  const [replyCodCliente, setReplyCodCliente] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  function closeReply() {
    if (replySaving) return;
    setReplyOpen(false);
  }

  async function sendReply() {
    if (!replyTelefono) return alert("Falta teléfono");
    if (!replyText.trim()) return alert("Escribí un mensaje");

    setReplySaving(true);
    try {
      const res = await fetch("/api/whatsapp/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: replyTelefono,
          mensaje: replyText.trim(),
          cod_cliente: replyCodCliente,
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "No se pudo enviar");

      alert("Mensaje enviado ✅");
      setReplyOpen(false);

      // refrescar chat + sidebar
      if (replyTelefono) {
        await loadChat(replyTelefono);
      }
      await loadConvs();
    } catch (e: any) {
      alert("Error: " + (e?.message || "desconocido"));
    } finally {
      setReplySaving(false);
    }
  }

  // =========================
  // Modal Agendar
  // =========================
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaTelefono, setAgendaTelefono] = useState("");
  const [agendaCodCliente, setAgendaCodCliente] = useState<number | null>(null);
  const [agendaFecha, setAgendaFecha] = useState("");
  const [agendaNota, setAgendaNota] = useState("");
  const [agendaSaving, setAgendaSaving] = useState(false);

  function openAgendaFromChat() {
    if (!selectedTel) return;
    if (!selectedCodCliente) {
      alert("Esta conversación no tiene cod_cliente asociado. Primero vinculá el teléfono a un cliente.");
      return;
    }
    setAgendaTelefono(selectedTel);
    setAgendaCodCliente(selectedCodCliente);
    setAgendaFecha("");
    setAgendaNota("");
    setAgendaOpen(true);
  }

  function closeAgenda() {
    if (agendaSaving) return;
    setAgendaOpen(false);
  }

  async function saveAgenda() {
    if (!agendaCodCliente) return alert("Falta codCliente");
    if (!agendaFecha) return alert("Seleccioná una fecha");

    setAgendaSaving(true);
    try {
      const res = await fetch("/api/crm/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codCliente: agendaCodCliente,
          telefono: agendaTelefono,
          fecha: agendaFecha, // YYYY-MM-DD
          nota: agendaNota,
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "No se pudo agendar");

      alert("Agendado ✅");
      setAgendaOpen(false);

      // refrescar conversaciones por si querés ver estado luego
      loadConvs();
    } catch (e: any) {
      alert("Error: " + (e?.message || "desconocido"));
    } finally {
      setAgendaSaving(false);
    }
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">CRM WhatsApp</h1>
            <p className="mt-1 text-sm text-slate-600">
              Subí un CSV con columnas: <span className="font-mono">phone/celular/telefono</span>,{" "}
              <span className="font-mono">cliente/nombre</span>, <span className="font-mono">saldo/monto</span>.
            </p>
          </div>

          <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">Estado</div>
            <div className="text-sm font-medium text-slate-900">{busy ? "Procesando…" : "Listo"}</div>
          </div>
        </div>

        {/* CSV Card */}
        <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">Archivo CSV</div>
              <div className="mt-1 text-xs text-slate-500">
                Tip: en Excel, guardá como CSV (delimitado por punto y coma) si tu Excel usa “;”.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    setRows([]);
                    setStatus("");
                    setLog([]);
                    setProcessed(0);
                    setOkCount(0);
                    setFailCount(0);
                    setTotal(0);

                    if (!f) return;

                    Papa.parse(f, {
                      header: true,
                      skipEmptyLines: true,
                      complete: (res) => {
                        const data = (res.data as any[]) || [];
                        const mapped: Row[] = data.map((r) => ({
                          phone: normalizePhone(r.phone ?? r.celular ?? r.telefono ?? r.numero ?? r.whatsapp ?? ""),
                          cliente: String(r.cliente ?? r.nombre ?? r.razonsocial ?? "").trim(),
                          saldo: String(r.saldo ?? r.monto ?? r.deuda ?? "").trim(),
                        }));
                        const clean = mapped.filter((x) => x.phone || x.cliente || x.saldo);
                        setRows(clean);
                        setStatus(`CSV cargado: ${clean.length} fila(s).`);
                      },
                      error: (err) => setStatus("Error leyendo CSV: " + err.message),
                    });
                  }}
                />
                <span className="font-medium">Seleccionar</span>
                <span className="text-slate-500">{file?.name ?? "Ningún archivo"}</span>
              </label>

              <button
                onClick={() => previewApi(5)}
                disabled={!file || busy}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Preview (5)
              </button>

              <button
                onClick={() => sendStream(5)}
                disabled={!file || busy}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar prueba (5)
              </button>

              <button
                onClick={() => sendStream(200)}
                disabled={!file || busy}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Enviar (200 máx)
              </button>

              <button
                onClick={cancel}
                disabled={!busy}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>

          {!!rows.length && (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Filas</div>
                <div className="text-lg font-semibold text-slate-900">{rows.length}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Inválidas</div>
                <div className={`text-lg font-semibold ${invalidCount ? "text-red-600" : "text-slate-900"}`}>
                  {invalidCount}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">OK</div>
                <div className="text-lg font-semibold text-emerald-700">{okCount}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Errores</div>
                <div className="text-lg font-semibold text-red-600">{failCount}</div>
              </div>
            </div>
          )}

          {busy && total > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Progreso</span>
                <span className="font-mono">
                  {processed}/{total}
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${Math.min(100, Math.round((processed / total) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-slate-900 p-3 text-sm text-white">
            <span className="font-mono">{status || "Listo para cargar CSV."}</span>
          </div>
        </div>

        {/* Preview Tabla */}
        {!!rows.length && (
          <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Previsualización local</h2>
              <span className="text-xs text-slate-500">Primeras 5 filas</span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">phone</th>
                    <th className="py-2 pr-3">cliente</th>
                    <th className="py-2 pr-3">saldo</th>
                    <th className="py-2 pr-3">val</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => {
                    const ok = isValidPhone(r.phone) && r.cliente && r.saldo;
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-slate-600">{i + 1}</td>
                        <td className="py-2 pr-3 font-mono">{r.phone}</td>
                        <td className="py-2 pr-3">{r.cliente}</td>
                        <td className="py-2 pr-3 font-mono">{r.saldo}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {ok ? "OK" : "INV"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && <div className="mt-3 text-xs text-red-700">Hay filas inválidas.</div>}
          </div>
        )}

        {/* Logs */}
        {!!log.length && (
          <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Logs (últimos eventos)</h2>
              <span className="text-xs text-slate-500">Se muestran los más recientes</span>
            </div>

            <div className="mt-3 space-y-2">
              {log.map((evt, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 text-sm ${
                    evt.type === "item" && evt.ok
                      ? "border-emerald-200 bg-emerald-50"
                      : evt.type === "item" && !evt.ok
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs text-slate-700">
                      {evt.type}
                      {evt.i ? ` #${evt.i}` : ""} {evt.phone ? `→ ${evt.phone}` : ""}
                    </div>
                    {evt.type === "item" && (
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          evt.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {evt.ok ? "ENVIADO" : "ERROR"}
                      </span>
                    )}
                  </div>

                  {evt.cliente && <div className="mt-1 text-slate-800">{evt.cliente}</div>}
                  {evt.messageId && (
                    <div className="mt-1 font-mono text-xs text-slate-700">messageId: {evt.messageId}</div>
                  )}
                  {evt.error && <div className="mt-1 text-xs text-red-800">{evt.error}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversaciones + Chat */}
        <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Conversaciones</h2>
              <p className="mt-1 text-xs text-slate-500">Se refresca cada 5 segundos.</p>
            </div>
            <button
              onClick={() => {
                loadConvs();
                if (selectedTel) loadChat(selectedTel);
              }}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Refrescar
            </button>
          </div>

          {convStatus && <div className="mt-3 text-xs text-red-600">{convStatus}</div>}

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {/* Sidebar */}
            <div className="md:col-span-1 space-y-2">
              {!convs.length ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Sin conversaciones.</div>
              ) : (
                convs.map((c) => {
                  const active = c.telefono === selectedTel;
                  return (
                    <button
                      key={c.id_conversacion}
                      onClick={() => {
                        setSelectedTel(c.telefono);
                        setSelectedCodCliente(c.cod_cliente ?? null);
                      }}
                      className={`w-full rounded-xl border p-3 text-left ${
                        active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-600">
                          <span className="font-mono">{c.telefono}</span>
                          {c.cod_cliente ? <span className="ml-2">• {c.cod_cliente}</span> : null}
                        </div>

                        {c.unread_count > 0 && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                            {c.unread_count}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {c.ultimo_mensaje || <span className="text-slate-400">(sin mensaje)</span>}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">{c.estado}</span>
                        <span>
                          {(c.ultimo_at || c.updated_at)
                            ? new Date(c.ultimo_at || c.updated_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Chat */}
            <div className="md:col-span-2">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-600">Chat</div>
                    <div className="mt-1 font-mono text-sm text-slate-900">
                      {selectedTel || "Seleccioná una conversación"}
                    </div>
                    {selectedCodCliente ? (
                      <div className="mt-1 text-xs text-slate-500">cod_cliente: {selectedCodCliente}</div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">Sin cod_cliente asociado</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!selectedTel) return;
                        setReplyTelefono(selectedTel);
                        setReplyCodCliente(selectedCodCliente);
                        setReplyText("");
                        setReplyOpen(true);
                      }}
                      disabled={!selectedTel}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Responder
                    </button>

                    <button
                      onClick={openAgendaFromChat}
                      disabled={!selectedTel}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Agendar
                    </button>
                  </div>
                </div>

                {chatStatus && <div className="mt-3 text-xs text-red-600">{chatStatus}</div>}

                <div className="mt-4 max-h-[520px] overflow-y-auto space-y-2 pr-1">
                  {!selectedTel ? (
                    <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
                      Elegí una conversación a la izquierda.
                    </div>
                  ) : !chat.length ? (
                    <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Sin historial.</div>
                  ) : (
                    chat.map((m) => {
                      const isIn = m.dir === "IN";
                      return (
                        <div key={m.id} className={`flex ${isIn ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                              isIn ? "bg-white border" : "bg-blue-600 text-white"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{m.texto || "(sin contenido)"}</div>

                            {isIn && m.tipo && m.tipo !== "texto" && (
                              <div className="mt-1 text-[11px] text-slate-500">
                                tipo: {m.tipo}
                                {m.titulo_opcion ? ` • ${m.titulo_opcion}` : ""}
                              </div>
                            )}

                            <div className={`mt-1 text-[11px] ${isIn ? "text-slate-500" : "text-blue-100"}`}>
                              {new Date(m.fecha).toLocaleString()} {!isIn && m.estado_out ? `• ${m.estado_out}` : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Responder */}
        {replyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Responder</div>
                  <div className="mt-1 text-xs text-slate-500 font-mono">{replyTelefono}</div>
                </div>
                <button onClick={closeReply} className="rounded-lg border px-2 py-1 text-xs" disabled={replySaving}>
                  Cerrar
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Mensaje</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Escribí tu respuesta..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={closeReply} className="rounded-xl border px-4 py-2 text-sm" disabled={replySaving}>
                    Cancelar
                  </button>
                  <button
                    onClick={sendReply}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={replySaving}
                  >
                    {replySaving ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Agendar */}
        {agendaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Agendar pago</div>
                  <div className="mt-1 text-xs text-slate-500 font-mono">{agendaTelefono}</div>
                </div>
                <button onClick={closeAgenda} className="rounded-lg border px-2 py-1 text-xs" disabled={agendaSaving}>
                  Cerrar
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Fecha de alerta</label>
                  <input
                    type="date"
                    value={agendaFecha}
                    onChange={(e) => setAgendaFecha(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    Se guardará en <span className="font-mono">agenda.FechaAlerta</span> (solo fecha).
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Nota</label>
                  <textarea
                    value={agendaNota}
                    onChange={(e) => setAgendaNota(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Ej: 'Pasa a pagar en la tarde'..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={closeAgenda} className="rounded-xl border px-4 py-2 text-sm" disabled={agendaSaving}>
                    Cancelar
                  </button>
                  <button
                    onClick={saveAgenda}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={agendaSaving}
                  >
                    {agendaSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}