// Condiciones y fórmulas oficiales (material de HCA Venezuela). La fórmula es
// GUÍA: sus pasos no se marcan; debajo de cada paso se escriben objetivos.
// No cambiar el texto sin el documento fuente: lo congela test/condiciones-formulas.test.mjs.
export const CONDICIONES = Object.freeze([
  { codigo: 'inexistencia', nombre: 'Inexistencia', visible: true, color: '#6B7280' },
  { codigo: 'peligro', nombre: 'Peligro', visible: true, color: '#C8423B' },
  { codigo: 'emergencia', nombre: 'Emergencia', visible: true, color: '#E08A1E' },
  { codigo: 'normal', nombre: 'Normal', visible: true, color: '#2E9E5B' },
  { codigo: 'afluencia', nombre: 'Afluencia', visible: true, color: '#385AE2' },
  { codigo: 'poder', nombre: 'Poder', visible: false, color: '#5B3FD1' },
  { codigo: 'cambio_poder', nombre: 'Cambio de Poder', visible: false, color: '#5B3FD1' },
])

export const FORMULAS = Object.freeze({
  inexistencia: [
    'Encuentre una línea de comunicación.',
    'Date a conocer.',
    'Descubra lo que se necesita o se desea.',
    'Hágalo, prodúzcalo y/o preséntelo.',
  ],
  'peligro:personal': [
    'Pase por alto hábitos o rutinas normales.',
    'Resuelva la situación y cualquier peligro que haya en ella.',
    'Asígnese una condición de peligro.',
    'Descubra qué está haciendo que es contrario a los ideales o a los mejores intereses del grupo o actividad y use autodisciplina para corregirlo y vuélvase honesto y recto.',
    'Reorganice su vida para que la situación peligrosa no le esté ocurriendo continuamente.',
    'Formule y adopte una política firme que de aquí en adelante detecte la misma situación e impida que vuelva a ocurrir.',
  ],
  'peligro:superior': [
    'Pase por alto (ignore al subordinado o subordinados que normalmente se encargan del área y resuélvalo personalmente).',
    'Resuelva la situación y cualquier peligro que haya en ella.',
    'Asigne al área en que se tuvo que resolver la situación una condición de peligro.',
    'Asigne a cada individuo relacionado con la condición de peligro una condición de peligro para el subordinado, y haga que sigan la fórmula completamente, asegurándose de que lo hagan.',
    'Reorganice la unidad para que la situación no se repita.',
    'Recomiende cualquier política firme que a partir de entonces detecte la condición o impida que se repita.',
  ],
  emergencia: [
    'Promocione. Eso se aplica a una organización; para un individuo es mejor decir «produzca».',
    'Cambie su forma de actuar.',
    'Economice.',
    'Entonces prepárese para dar el servicio.',
    'Haga más estricta la disciplina.',
  ],
  normal: [
    'La manera de mantener un aumento, cuando se encuentra en un estado de funcionamiento normal, es no cambiar nada.',
    'La ética es muy poco severa. El factor justicia es bastante ligero y bastante razonable. No se toma ninguna medida brutal en particular.',
    'Si una estadística mejora, examínela cuidadosamente y averigüe qué la mejoró, y luego haga eso sin abandonar lo que estaba haciendo antes.',
    'Cada vez que una estadística empeore ligeramente, encuentre rápidamente por qué y remédielo.',
  ],
  'afluencia:financiera': [
    'Economice.',
    'Pague todas sus deudas.',
    'Invierta el resto en mejorar el servicio; haga que sea más factible entregar.',
    'Descubra qué causó la condición de afluencia y refuércelo.',
  ],
  'afluencia:accion': [
    'Economiza en acciones dispersas o innecesarias que no contribuyeron a la condición actual. Economiza financieramente eliminando todo derroche.',
    'Haz que toda acción cuente y no tomes parte en ninguna acción inútil. Cada nueva acción debe contribuir y ser del mismo tipo que la que sí contribuyó.',
    'Consolida todas las ganancias. En cualquier área en que hayamos obtenido una ganancia, la conservamos. No dejes que las cosas se relajen o decaigan o hagan montaña rusa. Cualquier ventaja o ganancia que tengamos, la conservamos, la mantenemos.',
    'Descubre por ti mismo y para ti mismo qué fue lo que causó la condición de afluencia en tu área inmediata y refuérzalo.',
  ],
  poder: [
    'La primera ley de una condición de poder es no desconectarse.',
    'Lo primero que tiene que hacer es elaborar un registro de todas las líneas de comunicación de su trabajo.',
    'La responsabilidad es redactar en detalle todas las funciones y ponerlas en manos de la persona que se va a hacer cargo del puesto.',
    'Haga todo lo posible para hacer que el trabajo o el puesto se pueda ocupar.',
  ],
  cambio_poder: [
    'Cuando asumas un nuevo puesto no cambies nada hasta que te hayas familiarizado totalmente con tu nueva zona de poder.',
  ],
})

export function claveFormula({ condicion, alcancePeligro, varianteAfluencia } = {}) {
  if (condicion === 'peligro') return `peligro:${alcancePeligro === 'superior' ? 'superior' : 'personal'}`
  if (condicion === 'afluencia') return `afluencia:${varianteAfluencia === 'financiera' ? 'financiera' : 'accion'}`
  return condicion
}

export function pasosDe(args = {}) {
  const pasos = FORMULAS[claveFormula(args)]
  if (!pasos) throw new Error(`Condición desconocida: ${args.condicion}`)
  return pasos
}

export function nombreCondicion(codigo) {
  return CONDICIONES.find((c) => c.codigo === codigo)?.nombre || codigo
}

export function colorCondicion(codigo) {
  return CONDICIONES.find((c) => c.codigo === codigo)?.color || '#9CA3AF'
}
