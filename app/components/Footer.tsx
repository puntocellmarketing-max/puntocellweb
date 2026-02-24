import Link from "next/link";
import Container from "./Container";

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-white">
      <Container>
        <div className="flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Punto Cell — Paraguay.
          </div>

          <div className="flex gap-5 text-sm">
            <Link href="/privacy" className="text-gray-600 hover:text-black">Privacidad</Link>
            <Link href="/terms" className="text-gray-600 hover:text-black">Términos</Link>
            <Link href="/contact" className="text-gray-600 hover:text-black">Contacto</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}