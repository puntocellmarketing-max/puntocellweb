import { whatsappUrl } from "../config/site";
import StoreIcon from "./StoreIcon";

export default function HeroRetail() {
  const wa = whatsappUrl("Hola PuntoCell, quiero conocer las ofertas disponibles.");
  const externalWa = wa.startsWith("http");

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-2xl shadow-slate-900/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(37,99,235,0.48),transparent_34%),radial-gradient(circle_at_25%_100%,rgba(14,165,233,0.22),transparent_36%)]" />
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="absolute -right-2 -top-10 h-52 w-52 rounded-full border border-white/10" />

      <div className="relative grid min-h-[470px] items-center gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-100">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Tecnología para tu día a día
          </div>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Todo lo que buscás,
            <span className="block text-blue-400">en un solo lugar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Celulares, electrodomésticos, informática y accesorios con asesoramiento antes y después de tu compra.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#ofertas" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-500">
              Ver productos <StoreIcon name="arrow" className="h-4 w-4" />
            </a>
            <a href={wa} target={externalWa ? "_blank" : undefined} rel={externalWa ? "noreferrer" : undefined} className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
              Consultar por WhatsApp
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2"><StoreIcon name="shield" className="h-4 w-4 text-emerald-400" /> Garantía y respaldo</span>
            <span className="flex items-center gap-2"><StoreIcon name="card" className="h-4 w-4 text-blue-400" /> Opciones de pago</span>
            <span className="flex items-center gap-2"><StoreIcon name="headset" className="h-4 w-4 text-cyan-400" /> Atención personalizada</span>
          </div>
        </div>

        <div className="relative mx-auto hidden h-[360px] w-full max-w-[510px] lg:block">
          <div className="absolute left-6 top-4 h-72 w-52 rotate-[-7deg] rounded-[38px] border-[8px] border-slate-800 bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-950 p-4 shadow-2xl">
            <div className="h-4 w-16 rounded-full bg-slate-900/80 mx-auto" />
            <div className="mt-16 text-center"><StoreIcon name="phone" className="mx-auto h-20 w-20 text-white/80" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Smartphones</p></div>
          </div>
          <div className="absolute right-0 top-8 w-72 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-blue-950 p-6"><StoreIcon name="tv" className="mx-auto h-24 w-24 text-blue-300" /></div>
            <div className="mt-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-blue-200">Entretenimiento</p><p className="mt-1 font-extrabold">Smart TV y audio</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600"><StoreIcon name="arrow" className="h-4 w-4" /></span></div>
          </div>
          <div className="absolute bottom-0 left-40 rounded-2xl border border-white/20 bg-white px-5 py-4 text-slate-950 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Comprá como prefieras</p>
            <p className="mt-1 text-lg font-black">Consultá formas de pago</p>
          </div>
        </div>
      </div>
    </section>
  );
}
