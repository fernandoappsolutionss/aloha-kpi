import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONDICIONES, FORMULAS, pasosDe, claveFormula, colorCondicion } from '../lib/condiciones/formulas.mjs'

const TEXTO_OFICIAL = {
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
}

test('las fórmulas conservan literalmente el texto del plan', () => {
  assert.deepEqual(FORMULAS, TEXTO_OFICIAL)
  assert.equal(FORMULAS.emergencia[1], 'Cambie su forma de actuar.')
  assert.ok(!JSON.stringify(FORMULAS).includes('base de operación'))
})

test('clave de fórmula por alcance y variante', () => {
  assert.equal(claveFormula({ condicion: 'peligro' }), 'peligro:personal')
  assert.equal(claveFormula({ condicion: 'peligro', alcancePeligro: 'superior' }), 'peligro:superior')
  assert.equal(claveFormula({ condicion: 'afluencia' }), 'afluencia:accion')
  assert.equal(claveFormula({ condicion: 'afluencia', varianteAfluencia: 'financiera' }), 'afluencia:financiera')
  assert.equal(pasosDe({ condicion: 'normal' })[0].startsWith('La manera de mantener'), true)
  assert.throws(() => pasosDe({ condicion: 'confusion' }), /Condición desconocida/)
})

test('las cinco condiciones habituales son visibles', () => {
  assert.deepEqual(CONDICIONES.filter((c) => c.visible).map((c) => c.codigo), ['inexistencia', 'peligro', 'emergencia', 'normal', 'afluencia'])
  assert.match(colorCondicion('emergencia'), /^#/)
})
