// app/components/Header.tsx
import Link from "next/link";
import { site } from "../config/site";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white font-bold">
            PC
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-slate-900">{site.name}</div>
            <div className="text-xs text-slate-500">{site.tagline}</div>
          </div>
        </Link>

        <div className="ml-auto hidden w-[420px] items-center gap-2 md:flex">
          <div className="relative w-full">
            <input
              placeholder="Buscar productos, marcas, accesorios..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
            />
          </div>
          <a
            href={`https://wa.me/${site.whatsapp}`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>

        <nav className="ml-2 hidden items-center gap-5 text-sm text-slate-600 md:flex">
          <Link className="hover:text-slate-900" href="/contacto">Contacto</Link>
          <Link className="hover:text-slate-900" href="/privacidad">Privacidad</Link>
          <Link className="hover:text-slate-900" href="/terminos">Términos</Link>
        </nav>
      </div>

      {/* buscador mobile */}
      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <div className="flex gap-2">
          <input
            placeholder="Buscar..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
          />
          <a
            href={`https://wa.me/${site.whatsapp}`}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            target="_blank"
            rel="noreferrer"
          >
            WA
          </a>
        </div>
      </div>
    </header>
  );
}