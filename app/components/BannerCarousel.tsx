// app/components/BannerCarousel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Banner = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

export default function BannerCarousel() {
  const banners: Banner[] = useMemo(
    () => [
      {
        title: "Ofertas de la semana",
        subtitle: "Tecnología y accesorios con precios especiales.",
        cta: "Ver promos",
        href: "/",
      },
      {
        title: "Atención por WhatsApp",
        subtitle: "Consultas rápidas y seguimiento de pedidos.",
        cta: "Escribinos",
        href: "/contacto",
      },
      {
        title: "Cuotas y financiación",
        subtitle: "Opciones según disponibilidad (consultar).",
        cta: "Consultar",
        href: "/contacto",
      },
    ],
    []
  );

  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners.length]);

  const b = banners[i];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50">
      <div className="grid gap-6 p-7 md:grid-cols-2 md:items-center md:p-10">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
            Punto Cell · Canal oficial
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {b.title}
          </h2>
          <p className="mt-2 text-slate-600">{b.subtitle}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={b.href}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {b.cta}
            </a>
            <a
              href="/privacidad"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Políticas
            </a>
          </div>
        </div>

        {/* panel “promo” */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Canales oficiales</div>
          <div className="mt-3 grid gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">WhatsApp Business</div>
              <div className="text-sm text-slate-600">Soporte y cobranzas.</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Catálogo</div>
              <div className="text-sm text-slate-600">Productos y accesorios (en expansión).</div>
            </div>
          </div>
        </div>
      </div>

      {/* dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              idx === i ? "bg-blue-600" : "bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={`Banner ${idx + 1}`}
          />
        ))}
      </div>

      {/* prev/next */}
      <button
        onClick={() => setI((v) => (v - 1 + banners.length) % banners.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-white"
        aria-label="Anterior"
      >
        ‹
      </button>
      <button
        onClick={() => setI((v) => (v + 1) % banners.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-white"
        aria-label="Siguiente"
      >
        ›
      </button>
    </section>
  );
}