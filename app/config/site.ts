// Datos generales del negocio. Completá estos campos antes de publicar.
export const site = {
  name: "PuntoCell",
  tagline: "Tecnología, electrodomésticos y más",
  city: "Concepción, Paraguay",
  whatsapp: "", // Ejemplo: 595981123456 (sin +, espacios ni guiones)
  email: "",
  address: "Concepción, Paraguay",
  hours: "Lun. a sáb. · 08:00 a 18:00",
  social: {
    instagram: "#",
    facebook: "#",
  },
} as const;

export function whatsappUrl(message = "Hola PuntoCell, quiero hacer una consulta.") {
  if (!site.whatsapp) return "/contact";
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}
