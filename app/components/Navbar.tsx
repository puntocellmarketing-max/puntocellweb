import Link from "next/link";
import Container from "./Container";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/contact", label: "Contacto" },
  { href: "/privacy", label: "Privacidad" },
  { href: "/terms", label: "Términos" }
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-soft">
              PC
            </span>
            <span>Punto Cell</span>
          </Link>

          <nav className="hidden gap-6 md:flex">
            {nav.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="text-sm text-gray-700 hover:text-black"
              >
                {i.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/contact"
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Escribinos
          </Link>
        </div>
      </Container>
    </header>
  );
}