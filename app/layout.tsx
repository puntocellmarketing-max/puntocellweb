import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "PuntoCell | Tecnología, celulares y electrodomésticos",
  description: "Celulares, electrodomésticos, informática, audio y accesorios en Concepción, Paraguay.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="bg-[#f6f7fb] text-slate-900 antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
