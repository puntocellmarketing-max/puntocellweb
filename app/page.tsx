import BannerCarousel from "./components/BannerCarousel";
import CategoryGrid from "./components/CategoryGrid";
import HeroRetail from "./components/HeroRetail";
import ProductRow from "./components/ProductRow";
import PromoStrip from "./components/PromoStrip";
import { featuredProducts, homeProducts, phoneProducts } from "./data/storefront";

export default function Home() {
  return (
    <div className="bg-[#f6f7fb]">
      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-7 lg:px-6">
        <HeroRetail />
        <div className="relative z-10 -mt-1 sm:-mt-5 sm:px-5"><PromoStrip /></div>
        <div id="categorias" className="scroll-mt-52 pt-14"><CategoryGrid /></div>
        <div id="productos" className="scroll-mt-52 pt-14">
          <div id="ofertas" className="scroll-mt-52"><ProductRow eyebrow="Selección PuntoCell" title="Productos destacados" products={featuredProducts} /></div>
        </div>
        <div className="pt-10"><BannerCarousel /></div>
        <div id="celulares" className="scroll-mt-52 pt-14"><ProductRow eyebrow="Conectate" title="Celulares y accesorios" products={phoneProducts} /></div>
        <div id="electrodomesticos" className="scroll-mt-52 pt-14"><ProductRow eyebrow="Equipá tu casa" title="Tecnología para el hogar" products={homeProducts} /></div>
      </main>
    </div>
  );
}
