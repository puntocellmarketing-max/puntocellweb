import StoreIcon, { type StoreIconName } from "./StoreIcon";

const benefits: { title: string; desc: string; icon: StoreIconName }[] = [
  { title: "Entrega coordinada", desc: "Retiro o entrega según zona", icon: "truck" },
  { title: "Compra respaldada", desc: "Garantía y servicio posventa", icon: "shield" },
  { title: "Opciones de pago", desc: "Consultá contado y financiación", icon: "card" },
  { title: "Estamos para ayudarte", desc: "Asesoramiento por WhatsApp", icon: "headset" },
];

export default function PromoStrip() {
  return (
    <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="Beneficios de compra">
      {benefits.map((item, index) => (
        <div key={item.title} className={`flex items-center gap-3 px-5 py-4 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 lg:border-l" : ""}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><StoreIcon name={item.icon} className="h-6 w-6" /></span>
          <div><p className="text-sm font-bold text-slate-900">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.desc}</p></div>
        </div>
      ))}
    </section>
  );
}
