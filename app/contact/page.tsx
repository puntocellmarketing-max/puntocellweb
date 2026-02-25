import Container from "../components/Container";

export const metadata = { title: "Contacto" };

export default function Contact() {
  return (
    <Container>
      <section className="py-14">
        <h1 className="text-3xl font-semibold">Contacto</h1>
        <p className="mt-3 text-gray-700">
          Canales oficiales de Punto Cell para soporte y consultas.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-medium">WhatsApp</h2>
            <p className="mt-2 text-sm text-gray-600">
              Atención por WhatsApp Business. (Colocaremos el número oficial aquí.)
            </p>
            <div className="mt-4 text-sm">
              <div><b>Número:</b> +595 XXX XXX XXX</div>
              <div><b>Horario:</b> Lunes a Sábado (a definir)</div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-medium">Email</h2>
            <p className="mt-2 text-sm text-gray-600">
              Para consultas formales o soporte con comprobantes.
            </p>
            <div className="mt-4 text-sm">
              <div><b>Email:</b> soporte@puntocell.com</div>
              <div><b>Ubicación:</b> Paraguay</div>
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
}