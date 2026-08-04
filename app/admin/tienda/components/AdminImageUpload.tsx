"use client";

import { ImagePlus, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export default function AdminImageUpload({ value, onChange, folder = "products" }: { value: string; onChange: (url: string) => void; folder?: string }) {
  const input = useRef<HTMLInputElement>(null); const [uploading, setUploading] = useState(false); const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return; setUploading(true); setError("");
    try { const data = new FormData(); data.append("file", file); data.append("folder", folder); const response = await fetch("/api/admin/ecommerce/upload", { method: "POST", body: data }); const json = await response.json(); if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo subir."); onChange(json.url); }
    catch (e: any) { setError(e?.message || "No se pudo subir la imagen."); } finally { setUploading(false); if (input.current) input.current.value = ""; }
  }
  return <div><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => upload(event.target.files?.[0])} /><button type="button" onClick={() => input.current?.click()} disabled={uploading} className="group relative grid h-40 w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-60">{value ? <><img src={value} alt="Vista previa" className="h-full w-full object-contain p-2" /><span className="absolute bottom-2 rounded-lg bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-white">Cambiar imagen</span></> : <span className="flex flex-col items-center gap-2">{uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}<span className="text-sm font-bold">{uploading ? "Subiendo..." : "Subir fotografía"}</span><span className="text-xs">JPG, PNG, WEBP · máximo 6 MB</span></span>}</button><div className="mt-2 flex gap-2"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="O pegá la URL de la imagen" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-500" /><button type="button" onClick={() => input.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white"><UploadCloud className="h-4 w-4" /></button></div>{error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}</div>;
}

