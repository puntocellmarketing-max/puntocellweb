"use client";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [limit, setLimit] = useState(5);
  const [send, setSend] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!file) return alert("Seleccioná un CSV");
    setLoading(true);
    setOut(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("limit", String(limit));
    fd.append("send", String(send));

    const res = await fetch("/api/crm/whatsapp/upload-send", { method: "POST", body: fd });
    const data = await res.json();
    setOut(data);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: "30px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>CRM WhatsApp - CSV → Cloud API</h1>
      <p>CSV: <b>phone,cliente,saldo</b></p>

      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center" }}>
        <label>
          Límite:{" "}
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ width: 90 }}
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
          Enviar (si no, solo preview)
        </label>

        <button onClick={run} disabled={loading} style={{ padding: "8px 12px", borderRadius: 8 }}>
          {loading ? "Procesando..." : "Ejecutar"}
        </button>
      </div>

      {out && (
        <pre style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "#0b1020", color: "#d6e1ff" }}>
          {JSON.stringify(out, null, 2)}
        </pre>
      )}
    </div>
  );
}