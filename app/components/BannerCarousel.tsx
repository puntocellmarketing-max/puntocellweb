"use client";

import { useEffect, useMemo, useState } from "react";
import { banners as allBanners } from "../data/banners";
import StoreIcon from "./StoreIcon";

export default function BannerCarousel() {
  const banners = useMemo(() => allBanners.filter((banner) => banner.enabled !== false), []);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => setCurrent((value) => (value + 1) % banners.length), 5500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;
  const banner = banners[current];

  return (
    <section className={`relative overflow-hidden rounded-[26px] bg-gradient-to-r ${banner.theme} text-white`}>
      <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border-[40px] border-white/10" />
      <div className="relative grid min-h-[280px] items-center gap-7 px-7 py-10 sm:px-10 md:grid-cols-[1.2fr_0.8fr] lg:px-12">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">{banner.badge}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">{banner.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{banner.subtitle}</p>
          <a href={banner.href} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-100">{banner.cta}<StoreIcon name="arrow" className="h-4 w-4" /></a>
        </div>
        <div className="hidden justify-center md:flex"><span className="grid h-44 w-44 rotate-3 place-items-center rounded-[36px] border border-white/20 bg-white/10 shadow-2xl backdrop-blur"><StoreIcon name={banner.icon} className="h-28 w-28 text-white/85" /></span></div>
      </div>
      {banners.length > 1 && <div className="absolute bottom-5 left-7 flex gap-2 sm:left-10 lg:left-12">{banners.map((item, index) => <button key={item.title} type="button" onClick={() => setCurrent(index)} aria-label={`Mostrar promoción ${index + 1}`} className={`h-2 rounded-full transition-all ${current === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`} />)}</div>}
    </section>
  );
}
