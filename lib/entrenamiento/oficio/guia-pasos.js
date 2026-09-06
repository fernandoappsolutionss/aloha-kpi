// Motor puro de la guia progresiva del oficio. Sin React, sin BD y sin prosa
// del catalogo: este archivo si puede viajar al navegador.

export const EFIMEROS = ['portada', 'vista', 'laminas']

const n = (valor) => {
  if (typeof valor === 'number') return valor
  return valor ? 1 : 0
}

export function pasosDe(descriptor = {}) {
  const pasos = [
    {
      id: 'portada',
      titulo: 'Objetivo del módulo',
      detalle: 'Mira qué vas a lograr y qué actividades trae.',
    },
  ]
  if (n(descriptor.vista) > 0) {
    pasos.push({
      id: 'vista',
      titulo: 'A la vista',
      detalle: 'Ten delante lo que el módulo pide antes de leer.',
    })
  }
  if (n(descriptor.palabras) > 0) {
    pasos.push({
      id: 'palabras',
      titulo: 'Las palabras',
      detalle: 'Escribe cada concepto con tus propias palabras.',
    })
  }
  if (n(descriptor.laminas) > 0) {
    pasos.push({
      id: 'laminas',
      titulo: 'Las láminas',
      detalle: 'Repasa la explicación visual antes de entrar al texto.',
    })
  }
  pasos.push({
    id: 'lectura',
    titulo: 'La lección',
    detalle: 'Lee el módulo completo y marca que lo estudiaste.',
  })
  if (n(descriptor.preguntas) > 0) {
    pasos.push({
      id: 'preguntas',
      titulo: 'Las preguntas',
      detalle: 'Comprueba que estudiaste antes de cerrar.',
    })
  }
  pasos.push({
    id: 'cierre',
    titulo: 'Cierre',
    detalle: n(descriptor.drills) > 0
      ? 'Coordina la maniobra con tu jefe entrenador.'
      : 'Revisa que el módulo quedó completo.',
  })
  return pasos
}

function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0
}

export function hechosDe(progreso = {}, conceptosGuardados = {}, palabrasVivas = [], efimeros = []) {
  const hechos = new Set()
  const vivos = Array.isArray(palabrasVivas) ? [...new Set(palabrasVivas)] : []
  const conceptos = conceptosGuardados && typeof conceptosGuardados === 'object' ? conceptosGuardados : {}
  const alguno = vivos.some((slug) => textoValido(conceptos[slug]))
  const completos = vivos.length > 0 && vivos.every((slug) => textoValido(conceptos[slug]))

  if (alguno) {
    hechos.add('portada')
    hechos.add('vista')
  }
  if (completos) hechos.add('palabras')

  if (progreso?.tourVistoAt) {
    hechos.add('portada')
    hechos.add('vista')
    hechos.add('palabras')
    hechos.add('laminas')
    hechos.add('lectura')
  }

  if (progreso?.quizAprobadoAt) {
    hechos.add('portada')
    hechos.add('vista')
    hechos.add('laminas')
    hechos.add('preguntas')
  }

  const permitidos = new Set(EFIMEROS)
  for (const id of Array.isArray(efimeros) ? efimeros : []) {
    if (permitidos.has(id)) hechos.add(id)
  }

  return new Set(['portada', 'vista', 'palabras', 'laminas', 'lectura', 'preguntas']
    .filter((id) => hechos.has(id)))
}

export function pasoActual(pasos = [], hechos = new Set()) {
  const cumplidos = hechos instanceof Set ? hechos : new Set(Array.isArray(hechos) ? hechos : [])
  for (const paso of pasos || []) {
    const id = typeof paso === 'string' ? paso : paso?.id
    if (!id) continue
    if (id === 'cierre') return 'cierre'
    if (!cumplidos.has(id)) return id
  }
  return 'cierre'
}

const ERROR_FRASE = 'Escribe al menos una frase completa: qué es y para qué sirve.'
const ERROR_LARGO = 'Con dos o tres frases alcanza.'
const ERROR_VACIO = 'Eso no explica nada todavía.'
const ERROR_REPETIDO = 'Ya usaste ese mismo texto para otra palabra.'
const ERROR_COPIA = 'Eso está copiado del glosario. Dilo con tus palabras, aunque salga torcido.'

function normalizar(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/n\u0303/g, 'ñ')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function palabrasDe(valor) {
  const norm = normalizar(valor)
  return norm ? norm.split(' ') : []
}

function ventanas4(palabras) {
  const out = []
  for (let i = 0; i <= palabras.length - 4; i++) out.push(palabras.slice(i, i + 4).join(' '))
  return out
}

function textoFicha(ficha = {}) {
  return [ficha.termino, ficha.que, ficha.ejemplo, ficha.noConfundir].filter(Boolean).join(' ')
}

export function validarConcepto(texto, ficha = {}, otros = []) {
  if (typeof texto !== 'string') return { error: ERROR_FRASE }
  const limpio = texto.trim()
  const norm = normalizar(limpio)
  const palabras = norm ? norm.split(' ') : []
  if (palabras.length < 8 || norm.length < 30) return { error: ERROR_FRASE }
  if (limpio.length > 700) return { error: ERROR_LARGO }
  if (new Set(palabras).size < 4) return { error: ERROR_VACIO }

  const repetido = (Array.isArray(otros) ? otros : [])
    .some((otro) => typeof otro === 'string' && normalizar(otro) === norm)
  if (repetido) return { error: ERROR_REPETIDO }

  const a = ventanas4(palabras)
  const b = new Set(ventanas4(palabrasDe(textoFicha(ficha))))
  if (a.length > 0 && b.size > 0) {
    const copiados = a.filter((grama) => b.has(grama)).length
    if (copiados / a.length >= 0.6) return { error: ERROR_COPIA }
  }

  return { ok: true, texto: limpio }
}

// ── EL ORDEN ES UN CANDADO, NO UN AVISO ───────────────────────────────────
// Decisión de Fernando (2026-09-06): un módulo cuyo anterior no está estudiado
// NO SE ABRE. Antes se leía igual y solo se bloqueaban las escrituras; eso
// dejaba saltarse el paso, que es exactamente lo que el método existe para
// impedir.
//
// `abierto` viene de gradienteAbierto(m, progreso) —la MISMA función que
// aplican las actions en el servidor— y `p` es el progreso de ESE módulo.
//
// La red de seguridad es `p.tourVistoAt`: quien ya marcó el módulo alguna vez
// puede releerlo siempre. Sin eso, un módulo anterior que se reabra le cerraría
// a alguien un módulo que ya estudió, que es quitarle trabajo hecho.
//
// Solo aplica al ALUMNO. Quien revisa el plan de otro puesto no se está
// entrenando: necesita leer el módulo entero para poder tomar la maniobra.
export function puertaCerrada(esAlumno, abierto, p) {
  return Boolean(esAlumno) && !abierto && !p?.tourVistoAt
}
