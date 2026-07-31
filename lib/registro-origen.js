/**
 * QUIEN registro a una persona en una clase de prueba.
 *
 * Modelo definido por Fernando (2026-07-31), con sus palabras:
 *   "Vendedor registra en clase de prueba interno en el CRM, el agente IA
 *    registra desde el CRM, el administrador desde el link de seguimiento o el
 *    KPI, y promo.alohapanama.com es campaña y va con el icono de web".
 *
 * Espejo de `lib/crm/registration-channel.ts` del CRM
 * (v0-plataforma-teamsolutionss-me), que es quien escribe `registration_source`
 * y `attributed_to`. Si alla se agrega una via, agregala aqui tambien.
 *
 * OJO — esto NO es el credito comercial del CRM (`classifyRegistrationCredit`).
 * Aquella responde "a quien se le acredita la venta"; esta responde "quien lo
 * registro". Son preguntas distintas: emparejarlas rompe una de las dos.
 */

const IA = { icono: '🤖', nombre: 'Agente IA' }
const VENDEDOR = { icono: '👤', nombre: 'Vendedor' }
const ADMIN = { icono: '🛠️', nombre: 'Administrador' }
const WEB = { icono: '🌐', nombre: 'Web' }
const PUBLICA = { icono: '🔗', nombre: 'Página pública' }
const SIN_DATO = { icono: '❓', nombre: 'Sin dato' }

const POR_FUENTE = {
  agente_ia: { ...IA, detalle: 'El agente de IA lo registró desde el CRM' },
  ai_agent: { ...IA, detalle: 'El agente de IA lo registró desde el CRM' },

  vendedor: { ...VENDEDOR, detalle: 'Un vendedor lo registró en la clase de prueba desde el CRM' },

  // El administrador: el botón "Agregar Registro" del link de seguimiento y
  // este mismo panel. En los dos hay alguien del equipo tecleando.
  link_seguimiento: { ...ADMIN, detalle: 'El administrador lo registró desde el link de seguimiento' },
  aloha_kpi: { ...ADMIN, detalle: 'El administrador lo registró desde este panel' },

  // Campaña. SOLO esto es web.
  landing_promo_aloha: { ...WEB, detalle: 'Campaña: se inscribió solo desde promo.alohapanama.com' },

  // El lead se inscribe solo desde un link compartido. Convive con promo desde
  // el 19-jul-2026, así que es otra puerta de entrada, no promo mal etiquetado.
  pagina_publica: { ...PUBLICA, detalle: 'Se inscribió solo desde la página pública del evento' },
  webinar_publico: { ...PUBLICA, detalle: 'Se inscribió solo desde la landing de un webinar' },
  chatbot: { ...PUBLICA, detalle: 'Se inscribió solo desde el chatbot de la web' },

  facebook_lead_ads: { ...SIN_DATO, detalle: 'Importado de Facebook Lead Ads' },
  importado: { ...SIN_DATO, detalle: 'Importado' },
  desconocido: { ...SIN_DATO, detalle: 'Registro histórico: no quedó constancia de quién lo hizo' },
}

/**
 * `{icono, nombre, detalle}` listo para pintar.
 *
 * `attributed_to` manda sobre la fuente: si hay un vendedor acreditado, lo
 * atendió una persona aunque el registro haya entrado por otra vía.
 *
 * Lo que no esté mapeado cae en "Sin dato" a propósito: es preferible decir que
 * no consta a adjudicarle el registro a alguien que quizá no lo hizo.
 */
export function origenDeRegistro(registro) {
  if (registro?.attributed_to) {
    return { ...VENDEDOR, detalle: 'Un vendedor lo atendió y quedó acreditado' }
  }
  const fuente = registro?.registration_source || ''
  return (
    POR_FUENTE[fuente] || {
      ...SIN_DATO,
      detalle: fuente ? `Origen no reconocido: ${fuente}` : 'Sin origen registrado',
    }
  )
}
