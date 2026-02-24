import Container from "../components/Container";

export const metadata = { title: "Términos y Condiciones" };

export default function Terms() {
  return (
    <Container>
      <section className="prose prose-gray max-w-none py-14">
        <h1>Términos y Condiciones</h1>
        <p><b>Última actualización:</b> {new Date().toLocaleDateString("es-ES")}</p>

        <h2>1. Uso del sitio</h2>
        <p>
          Este sitio provee información institucional y canales de contacto de <b>Punto Cell</b>.
          Al navegar, el usuario acepta estos términos.
        </p>

        <h2>2. Comunicaciones</h2>
        <p>
          Las comunicaciones por WhatsApp/email se usan para atención al cliente, soporte y gestiones relacionadas.
          El usuario es responsable de la veracidad de la información proporcionada.
        </p>

        <h2>3. Limitación de responsabilidad</h2>
        <p>
          Nos esforzamos por mantener información actualizada, pero el contenido puede cambiar sin aviso.
        </p>

        <h2>4. Cambios</h2>
        <p>
          Podemos modificar estos términos en cualquier momento. La versión vigente estará publicada en esta página.
        </p>

        <h2>5. Contacto</h2>
        <p>
          Para consultas: <b>soporte@puntocell.com</b>
        </p>
      </section>
    </Container>
  );
}