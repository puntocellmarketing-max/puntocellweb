import type { StoreIconName } from "../components/StoreIcon";

export type Banner = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  badge: string;
  icon: StoreIconName;
  theme: string;
  enabled?: boolean;
};

export const banners: Banner[] = [
  { title: "Renová la tecnología de tu hogar", subtitle: "Encontrá televisores, audio y electrodomésticos con el acompañamiento de nuestro equipo.", cta: "Explorar hogar", href: "#electrodomesticos", badge: "Todo para tu casa", icon: "home", theme: "from-blue-700 via-blue-600 to-cyan-500", enabled: true },
  { title: "Tu próximo celular está en PuntoCell", subtitle: "Te ayudamos a elegir el equipo y los accesorios adecuados para vos.", cta: "Ver celulares", href: "#celulares", badge: "Celulares y accesorios", icon: "phone", theme: "from-slate-950 via-indigo-950 to-blue-700", enabled: true },
];
