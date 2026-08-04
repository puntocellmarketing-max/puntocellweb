import Link from "next/link";
import { site, whatsappUrl } from "../config/site";

export default function Footer() {
  const wa = whatsappUrl();
  const externalWa = wa.startsWith("http");
  return (
    <footer className="mt-16 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white">PC</span><div><p className="text-lg font-black text-white">{site.name}</p><p className="text-xs text-slate-400">{site.tagline}</p></div></div><p className="mt-5 text-sm leading-6 text-slate-400">Tecnología y soluciones para tu hogar con atención cercana antes y después de la compra.</p></div>
        <div><h3 className="text-sm font-extrabold text-white">Categorías</h3><div className="mt-4 grid gap-3 text-sm"><a href="#celulares" className="hover:text-white">Celulares</a><a href="#electrodomesticos" className="hover:text-white">Electrodomésticos</a><a href="#electrodomesticos" className="hover:text-white">TV y audio</a><a href="#categorias" className="hover:text-white">Informática y accesorios</a></div></div>
        <div><h3 className="text-sm font-extrabold text-white">Información</h3><div className="mt-4 grid gap-3 text-sm"><Link href="/contact" className="hover:text-white">Contacto y horarios</Link><Link href="/privacy" className="hover:text-white">Privacidad</Link><Link href="/terms" className="hover:text-white">Términos y condiciones</Link></div></div>
        <div><h3 className="text-sm font-extrabold text-white">Hablemos</h3><p className="mt-4 text-sm leading-6 text-slate-400">¿Tenés una consulta? Nuestro equipo puede ayudarte a elegir.</p><a href={wa} target={externalWa ? "_blank" : undefined} rel={externalWa ? "noreferrer" : undefined} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white hover:bg-emerald-600">Escribir por WhatsApp</a></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-6"><p>© {new Date().getFullYear()} {site.name}. Todos los derechos reservados.</p><p>{site.city}</p></div></div>
    </footer>
  );
}
