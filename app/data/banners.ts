// app/data/banners.ts
export type Banner = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  badge?: string;
  enabled?: boolean; // ✅ importante
};

export const banners: Banner[] = [
  {
    title: "Ofertas de la semana",
    subtitle: "Tecnología y accesorios con precios especiales.",
    cta: "Ver promos",
    href: "/",
    badge: "Punto Cell · Canal oficial",
    enabled: true,
  },
  {
    title: "Atención por WhatsApp",
    subtitle: "Consultas rápidas y seguimiento de pedidos.",
    cta: "Escribinos",
    href: "/contacto",
    badge: "Soporte",
    enabled: true,
  },
  {
    title: "Cuotas y financiación",
    subtitle: "Opciones según disponibilidad (consultar).",
    cta: "Consultar",
    href: "/contacto",
    badge: "Financiación",
    enabled: true,
  },
];