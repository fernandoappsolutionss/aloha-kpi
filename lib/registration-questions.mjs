// El CRM (components/crm/event-form-dialog.tsx) espera { id, question, type,
// required, options } por pregunta. Eventos creados aquí antes de este fix
// guardaban el texto en `label`: se recupera al leer para que preguntas viejas
// no se vean en blanco en el formulario público de registro.
export function normalizeQuestion(q) {
  return {
    id: q.id || crypto.randomUUID(),
    question: q.question ?? q.label ?? '',
    type: q.type || 'text',
    required: !!q.required,
    options: Array.isArray(q.options) ? q.options : [],
  }
}
