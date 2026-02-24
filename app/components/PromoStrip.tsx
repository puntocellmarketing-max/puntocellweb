// app/components/PromoStrip.tsx
export default function PromoStrip() {
  const items = [
    { title: "Atención rápida", desc: "Respuestas por WhatsApp" },
    { title: "Productos originales", desc: "Según disponibilidad" },
    { title: "Soporte y seguimiento", desc: "Post-venta y garantías" },
    { title: "Pagos y cuotas", desc: "Consultar opciones" },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-sm font-semibold text-slate-900">{it.title}</div>
          <div className="text-sm text-slate-600">{it.desc}</div>
        </div>
      ))}
    </section>
  );
}