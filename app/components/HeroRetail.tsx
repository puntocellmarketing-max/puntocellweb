// app/components/HeroRetail.tsx
import Link from "next/link";
import Image from "next/image";
import { site } from "../config/site";

export default function HeroRetail() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {/* Fondo */}
      <div className="absolute inset-0">
        {/* Imagen opcional (si existe) */}
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/hero/hero-bg.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Gradientes corporativos */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-sky-50" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="relative grid gap-10 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        {/* Columna izquierda */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            Punto Cell • Canal oficial
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Tecnología, accesorios y soporte
            <span className="text-blue-700"> con atención por WhatsApp</span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            Consultá stock y precios. Coordinamos entrega/retira. Soporte post-venta y
            garantías según disponibilidad.
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Consultar por WhatsApp
            </a>

            <Link
              href="/contacto"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Ver contacto y horarios
            </Link>
          </div>

          {/* Search mini (retail vibe) */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-3 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-600/20 focus:ring-4"
                placeholder="Buscar: iPhone, Samsung, cargadores, auriculares..."
              />
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Buscar
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">Celulares</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Accesorios</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Audio</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Smart Home</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Computación</span>
            </div>
          </div>

          {/* Badges confianza */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Badge title="Respuesta rápida" desc="Atención por WhatsApp" />
            <Badge title="Post-venta" desc="Soporte y garantías" />
            <Badge title="Envíos/Retiro" desc="Según coordinación" />
          </div>
        </div>

        {/* Columna derecha (tarjetas promo estilo retail) */}
        <div className="grid gap-3">
          <PromoCard
            title="Cuotas y financiación"
            desc="Opciones según disponibilidad (consultar)."
            cta="Consultar"
            href={`https://wa.me/${site.whatsapp}`}
            tone="blue"
          />

          <PromoCard
            title="Catálogo en expansión"
            desc="Productos y accesorios: carga progresiva."
            cta="Ver categorías"
            href="#categorias"
            tone="light"
          />

          <PromoCard
            title="Políticas y privacidad"
            desc="Cumplimiento para integraciones con plataformas externas."
            cta="Ver políticas"
            href="/privacidad"
            tone="light"
          />
        </div>
      </div>
    </section>
  );
}

function Badge({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{desc}</div>
    </div>
  );
}

function PromoCard({
  title,
  desc,
  cta,
  href,
  tone,
}: {
  title: string;
  desc: string;
  cta: string;
  href: string;
  tone: "blue" | "light";
}) {
  const base =
    "rounded-3xl border border-slate-200 p-5 shadow-sm";
  const bg =
    tone === "blue"
      ? "bg-gradient-to-br from-slate-900 via-slate-900 to-blue-800 text-white border-slate-900/10"
      : "bg-white text-slate-900";

  const button =
    tone === "blue"
      ? "bg-white text-slate-900 hover:bg-slate-100"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <div className={`${base} ${bg}`}>
      <div className="text-xs font-semibold opacity-80">Canales oficiales</div>
      <div className="mt-2 text-lg font-extrabold tracking-tight">{title}</div>
      <div className={`mt-2 text-sm ${tone === "blue" ? "text-white/80" : "text-slate-600"}`}>
        {desc}
      </div>

      <a
        href={href}
        className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ${button}`}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
      >
        {cta}
      </a>
    </div>
  );
}