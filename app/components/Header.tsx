import Link from "next/link";
import { site, whatsappUrl } from "../config/site";
import StoreIcon from "./StoreIcon";

const categories = [
  { label: "Ofertas", href: "#ofertas", featured: true },
  { label: "Celulares", href: "#celulares" },
  { label: "Electrodomésticos", href: "#electrodomesticos" },
  { label: "TV y audio", href: "#electrodomesticos" },
  { label: "Informática", href: "#categorias" },
  { label: "Accesorios", href: "#celulares" },
];

export default function Header() {
  const wa = whatsappUrl();
  const externalWa = wa.startsWith("http");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-[0_2px_14px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-[11px] font-medium sm:text-xs lg:px-6">
          <p>Compra fácil · Atención personalizada · Garantía</p>
          <p className="hidden text-slate-300 sm:block">{site.city} · {site.hours}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex h-[72px] items-center gap-3 lg:gap-7">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="PuntoCell - Inicio">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-lg font-black tracking-tight text-white shadow-lg shadow-blue-600/20">PC</span>
            <span className="hidden leading-none sm:block">
              <span className="block text-lg font-black tracking-tight text-slate-950">PuntoCell</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tecnología y hogar</span>
            </span>
          </Link>

          <form action="/#productos" className="order-3 hidden min-w-0 flex-1 md:flex" role="search">
            <label className="relative flex w-full items-center">
              <span className="sr-only">Buscar productos</span>
              <StoreIcon name="search" className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
              <input name="q" placeholder="¿Qué estás buscando?" className="h-12 w-full rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
              <button type="submit" className="h-12 rounded-r-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700">Buscar</button>
            </label>
          </form>

          <Link href="/contact" className="ml-auto hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 lg:flex">
            <StoreIcon name="headset" className="h-6 w-6 text-blue-600" />
            <span><span className="block text-[10px] font-medium text-slate-400">¿Necesitás ayuda?</span>Contactanos</span>
          </Link>

          <a href={wa} target={externalWa ? "_blank" : undefined} rel={externalWa ? "noreferrer" : undefined} className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-600">
            WhatsApp
          </a>
        </div>

        <form action="/#productos" className="pb-3 md:hidden" role="search">
          <label className="relative flex items-center">
            <span className="sr-only">Buscar productos</span>
            <StoreIcon name="search" className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
            <input name="q" placeholder="Buscar celulares, TV, electrodomésticos..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
          </label>
        </form>
      </div>

      <nav className="border-t border-slate-100 bg-white" aria-label="Categorías principales">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 lg:px-6">
          <a href="#categorias" className="flex shrink-0 items-center gap-2 border-r border-slate-200 py-3 pr-5 text-sm font-bold text-slate-900">
            <StoreIcon name="menu" className="h-5 w-5" /> Categorías
          </a>
          {categories.map((item) => (
            <a key={item.label} href={item.href} className={`shrink-0 px-4 py-3 text-sm font-semibold transition hover:text-blue-600 ${item.featured ? "text-rose-600" : "text-slate-600"}`}>
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
