import type { StoreIconName } from "../components/StoreIcon";

export type StoreProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  icon: StoreIconName;
  badge?: string;
  price?: number;
  oldPrice?: number;
  installment?: string;
  accent: string;
};

// Catálogo demostrativo. Sustituir por datos reales o por la respuesta de la API.
export const featuredProducts: StoreProduct[] = [
  { id: 1, name: "Smartphone Galaxy", brand: "Samsung", category: "Celulares", icon: "phone", badge: "Destacado", accent: "from-blue-50 to-indigo-100" },
  { id: 2, name: "Smart TV UHD 50 pulgadas", brand: "Smart TV", category: "Televisores", icon: "tv", badge: "Oferta", accent: "from-slate-100 to-blue-100" },
  { id: 3, name: "Lavarropas automático 9,5 kg", brand: "Línea hogar", category: "Electrodomésticos", icon: "washer", accent: "from-cyan-50 to-sky-100" },
  { id: 4, name: "Parlante Bluetooth portátil", brand: "Audio", category: "Audio", icon: "audio", badge: "Más vendido", accent: "from-violet-50 to-fuchsia-100" },
  { id: 5, name: "Notebook para estudio y trabajo", brand: "Informática", category: "Computación", icon: "notebook", accent: "from-amber-50 to-orange-100" },
  { id: 6, name: "Cargador rápido USB-C", brand: "Accesorios", category: "Accesorios", icon: "accessory", accent: "from-emerald-50 to-teal-100" },
];

export const phoneProducts = featuredProducts.filter((product) => product.icon === "phone" || product.icon === "accessory");
export const homeProducts = featuredProducts.filter((product) => product.icon === "tv" || product.icon === "washer" || product.icon === "audio");
