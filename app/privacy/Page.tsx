import Container from "../components/Container";

export const metadata = { title: "Política de Privacidad" };

export default function Privacy() {
  return (
    <Container>
      <section className="prose prose-gray max-w-none py-14">
        <h1>Política de Privacidad</h1>
        <p><b>Última actualización:</b> {new Date().toLocaleDateString("es-ES")}</p>

        <p>
          Esta Política de Privacidad describe cómo <b>Punto Cell</b> recopila, usa y protege la información
          personal cuando el usuario visita este sitio o se comunica por canales oficiales (por ejemplo, WhatsApp).
        </p>

        <h2>1. Información que recopilamos</h2>
        <ul>
          <li>Datos de contacto provistos por el usuario (nombre, teléfono, email).</li>
          <li>Mensajes y contenido que el usuario envía a nuestros canales oficiales.</li>
          <li>Datos técnicos básicos (IP, navegador) con fines de seguridad y analítica.</li>
        </ul>

        <h2>2. Finalidad del uso</h2>
        <ul>
          <li>Atender consultas, soporte y seguimiento de pedidos o cobranzas (cuando aplique).</li>
          <li>Mejorar el servicio y la experiencia del usuario.</li>
          <li>Cumplimiento legal y prevención de fraude.</li>
        </ul>

        <h2>3. WhatsApp</h2>
        <p>
          Si el usuario se comunica por WhatsApp, la conversación puede ser registrada para fines de soporte,
          seguimiento y calidad. Para mensajes proactivos, se utilizarán plantillas y reglas de la plataforma,
          cuando corresponda.
        </p>

        <h2>4. Compartición de datos</h2>
        <p>
          No vendemos información personal. Podemos compartir datos con proveedores necesarios para operar
          el servicio (hosting, analítica) o cuando sea requerido por ley.
        </p>

        <h2>5. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas razonables para proteger los datos contra accesos no autorizados.
        </p>

        <h2>6. Derechos del usuario</h2>
        <p>
          El usuario puede solicitar actualización o eliminación de su información contactándonos por los canales indicados
          en la sección <a href="/contact">Contacto</a>.
        </p>

        <h2>7. Contacto</h2>
        <p>
          Para consultas sobre privacidad: <b>soporte@puntocell.com</b>
        </p>
      </section>
    </Container>
  );
}