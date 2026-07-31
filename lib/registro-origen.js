/**
 * De donde vino una inscripcion a clase de prueba — para que el administrador
 * vea de un golpe QUIEN la registro.
 *
 * Lee `registration_source` / `attributed_to`, que escribe el CRM
 * (v0-plataforma-teamsolutionss-me, `lib/crm/registration-source.ts`). Si alla
 * se agrega una via, agregala aqui: lo que no este mapeado se muestra como
 * "Sin dato" en vez de inventarle un dueño.
 *
 * OJO — esto NO es lo mismo que el credito comercial del CRM
 * (`classifyRegistrationCredit`). Alla la pregunta es "a quien se le acredita
 * la venta", y por eso todo lo que no es IA ni autoservicio cae en vendedor.
 * Aqui la pregunta de Fernando es otra: "quien lo registro". Un registro con
 * origen `desconocido` no tiene credito conocido, y decir "Vendedor" seria
 * afirmar algo que no consta.
 */

const IA = { icono: '🤖', nombre: 'Agente IA' }
const VENDEDOR = { icono: '👤', nombre: 'Vendedor' }
const WEB = { icono: '🌐', nombre: 'Web' }
const SIN_DATO = { icono: '❓', nombre: 'Sin dato' }

const POR_FUENTE = {
  agente_ia: { ...IA, detalle: 'El agente de IA lo registro por WhatsApp' },
  ai_agent: { ...IA, detalle: 'El agente de IA lo registro por WhatsApp' },

  vendedor: { ...VENDEDOR, detalle: 'Un vendedor lo registro desde el CRM' },
  aloha_kpi: { ...VENDEDOR, detalle: 'Registrado a mano desde este panel' },

  landing_promo_aloha: { ...WEB, detalle: 'Se inscribio solo desde promo.alohapanama.com' },
  pagina_publica: { ...WEB, detalle: 'Se inscribio solo desde la pagina publica del evento' },
  link_seguimiento: { ...WEB, detalle: 'Se inscribio solo desde el link de seguimiento' },
  webinar_publico: { ...WEB, detalle: 'Se inscribio solo desde la landing de un webinar' },
  chatbot: { ...WEB, detalle: 'Se inscribio solo desde el chatbot de la web' },

  facebook_lead_ads: { ...SIN_DATO, detalle: 'Importado de Facebook Lead Ads' },
  importado: { ...SIN_DATO, detalle: 'Importado' },
  desconocido: { ...SIN_DATO, detalle: 'Registro historico: no quedo constancia de quien lo hizo' },
}

/**
 * `{icono, nombre, detalle}` listo para pintar.
 *
 * `attributed_to` manda sobre la fuente: si hay un vendedor acreditado, lo
 * registro una persona aunque haya entrado por otra via.
 */
export function origenDeRegistro(registro) {
  if (registro?.attributed_to) {
    return { ...VENDEDOR, detalle: 'Un vendedor lo atendio y quedo acreditado' }
  }
  const fuente = registro?.registration_source || ''
  return (
    POR_FUENTE[fuente] || {
      ...SIN_DATO,
      detalle: fuente ? `Origen no reconocido: ${fuente}` : 'Sin origen registrado',
    }
  )
}
