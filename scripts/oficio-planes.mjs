#!/usr/bin/env node
// LA PRUEBA QUE IMPORTA, en una sola corrida y a la vista: cada puesto recibe
// SU plan completo, ninguno ve el curso B de otro, y el primer módulo de cada
// plan está ABIERTO para alguien sin una sola fila de progreso.
//
// Existe porque el modo en que este catálogo se rompe no es un error de
// sintaxis: es un curso que no se importa (plan vacío, "tu puesto todavía no
// lleva plan cargado") o un `requiere` que apunta a un id que no existe (el
// plan entero trabado en el primer módulo, para siempre, sin un solo error en
// consola). Las dos cosas pasan en verde para el compilador.
//
//   node scripts/oficio-planes.mjs
//
// Sale 0 si todo cuadra, 1 si algo no. Los tests de test/entrenamiento-oficio.test.mjs
// cubren lo mismo con aserciones; esto lo IMPRIME, que es lo que se le enseña
// a alguien cuando pregunta "¿y qué estudia el Coordinador?".
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'
import { planDeRol, gradienteAbierto, esDePapel, nombreDeRol } from '../lib/entrenamiento/oficio/progreso.js'
import { RESPUESTAS_OFICIO } from '../lib/entrenamiento/respuestas-oficio/todas.js'

// El curso de bloque B de cada puesto: el que NINGÚN otro puesto puede ver.
const CURSO_B_DE = { administradora: 'centro', asistente: 'zoho', coach: 'coach', coordinador: 'coordinacion' }
const BLOQUE_A = ['metodo', 'normativa', 'hat']
// Los puestos salen del catálogo, no de una lista a mano.
const ROLES = [...new Set(MODULOS_OFICIO.flatMap((m) => m.roles || []))].sort()

let fallos = 0
const mal = (s) => { fallos++; console.log(`   ✗ ${s}`) }
const ids = new Set(MODULOS_OFICIO.map((m) => m.id))

console.log(`CATÁLOGO · ${MODULOS_OFICIO.length} módulos · ${MODULOS_OFICIO.filter(esDePapel).length} de papel · ${Object.keys(RESPUESTAS_OFICIO).length} claves de respuesta\n`)

for (const rol of ROLES) {
  const plan = planDeRol(rol, MODULOS_OFICIO)
  const porCurso = {}
  let minutos = 0
  for (const m of plan) { porCurso[m.curso] = (porCurso[m.curso] || 0) + 1; minutos += m.duracionMin }
  const preguntas = plan.reduce((n, m) => n + m.quiz.length, 0)
  const maniobras = plan.reduce((n, m) => n + m.drills.length, 0)
  console.log(`${nombreDeRol(rol).padEnd(26)} ${String(plan.length).padStart(2)} módulos · ${String(minutos).padStart(3)} min · ${String(preguntas).padStart(3)} preguntas · ${maniobras} maniobras`)
  console.log(`   ${Object.entries(porCurso).map(([c, n]) => `${c}=${n}`).join(' · ')}`)

  if (plan.length === 0) mal(`${rol}: PLAN VACÍO — su curso no está enchufado en cursos/todos.js`)
  for (const curso of BLOQUE_A) if (!porCurso[curso]) mal(`${rol}: le falta el bloque A "${curso}"`)
  for (const [otro, curso] of Object.entries(CURSO_B_DE)) {
    if (otro !== rol && plan.some((m) => m.curso === curso)) mal(`${rol} ve el curso "${curso}", que es de ${otro}`)
  }
  for (const m of plan) for (const req of m.requiere || []) {
    if (!ids.has(req)) mal(`${m.id}: requiere "${req}", que NO EXISTE en el catálogo → el plan queda trabado aquí`)
  }
  const abiertos = plan.filter((m) => gradienteAbierto(m, {}))
  if (abiertos.length !== 1) mal(`${rol}: ${abiertos.length} módulos abiertos con progreso vacío; tiene que ser exactamente 1`)
  else if (abiertos[0].id !== plan[0].id) mal(`${rol}: el abierto es ${abiertos[0].id} y el primero del plan es ${plan[0].id}`)
  else console.log(`   abierto sin progreso → ${plan[0].id} · ${plan[0].titulo}`)
  console.log('')
}

// Gerencia no se entrena: firma.
for (const rol of ['supervisor', 'admin_general']) {
  const n = planDeRol(rol, MODULOS_OFICIO).length
  if (n !== 0) mal(`${rol} tiene ${n} módulos y su puesto es firmar, no estudiar`)
}
// Y ningún `requiere` del catálogo entero cuelga, ni siquiera en un módulo de papel.
for (const m of MODULOS_OFICIO) for (const req of m.requiere || []) {
  if (!ids.has(req)) mal(`${m.id}: requiere "${req}", que NO EXISTE`)
}

console.log(fallos === 0 ? '✓ los cuatro planes cargan, están aislados y arrancan abiertos' : `✗ ${fallos} fallo(s)`)
process.exit(fallos === 0 ? 0 : 1)
