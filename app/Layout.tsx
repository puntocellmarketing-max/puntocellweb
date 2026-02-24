// app/layout.tsx
import "./globals.css";
import Header from "./components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="text-slate-900">
        <Header />
        {children}
      </body>
    </html>
  );
}