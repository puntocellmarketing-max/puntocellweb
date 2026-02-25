// app/page.tsx
import HeroRetail from "./components/HeroRetail";
import BannerCarousel from "./components/BannerCarousel";
import CategoryGrid from "./components/CategoryGrid";
import ProductRow from "./components/ProductRow";
import PromoStrip from "./components/PromoStrip";

export default function Home() {
  return (
    <div className="bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <HeroRetail />

        <div className="mt-6">
          <PromoStrip />
        </div>

        <div className="mt-6">
          <BannerCarousel />
        </div>

        <div id="categorias" className="mt-10">
          <CategoryGrid />
        </div>

        <div className="mt-10">
          <ProductRow title="Ofertas destacadas" />
          <ProductRow title="Celulares" />
          <ProductRow title="Accesorios" />
        </div>
      </main>
    </div>
  );
}