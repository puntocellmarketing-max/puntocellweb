import type { EcommerceProduct } from "@/lib/ecommerce";

function demo(id: number, name: string, brand: string, categoryName: string, categorySlug: string): EcommerceProduct {
  return { id, categoryId: null, categoryName, categorySlug, sku: "", externalCode: "", source: "MANUAL", name, slug: "", brand, shortDescription: "Catálogo demostrativo pendiente de carga administrativa.", description: "", specs: {}, cashPrice: null, oldPrice: null, stock: null, availability: "CONSULTAR", mainImageUrl: "", featured: true, offer: false, seasonal: false, active: true, sortOrder: 0, creditPlan: null };
}
export const featuredProducts: EcommerceProduct[] = [
  demo(-1,"Smartphone Galaxy","Samsung","Celulares","celulares"),
  demo(-2,'Smart TV UHD 50"',"Smart TV","Televisores","televisores"),
  demo(-3,"Lavarropas automático 9,5 kg","Línea hogar","Electrodomésticos","electrodomesticos"),
  demo(-4,"Parlante Bluetooth portátil","Audio","Audio","audio"),
  demo(-5,"Notebook para estudio y trabajo","Informática","Informática","informatica"),
  demo(-6,"Cargador rápido USB-C","Accesorios","Accesorios","accesorios"),
];
export const phoneProducts=featuredProducts.filter(product=>["celulares","accesorios"].includes(product.categorySlug));
export const homeProducts=featuredProducts.filter(product=>["televisores","electrodomesticos","audio"].includes(product.categorySlug));

