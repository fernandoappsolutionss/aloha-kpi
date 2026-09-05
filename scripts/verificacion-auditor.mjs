#!/usr/bin/env node
// AUDITORÍA INDEPENDIENTE — no reusa scripts/oficio-planes.mjs. Ejecuta
// planDeRol/gradienteAbierto de verdad y saca los ids a pantalla.
import { MODULOS_OFICIO, CURSOS } from '../lib/entrenamiento/oficio/catalogo.js'
import { planDeRol, gradienteAbierto, nombreDeRol, esDePapel } from '../lib/entrenamiento/oficio/progreso.js'
import { GLOSARIO } from '../lib/entrenamiento/oficio/glosario.js'
import { RESPUESTAS_OFICIO } from '../lib/entrenamiento/respuestas-oficio/todas.js'

let fallos = 0
const mal = (s) => { fallos++; console.log(`   ✗✗ ${s}`) }
const ids = new Set(MODULOS_OFICIO.map((m) => m.id))

console.log(`CATÁLOGO: ${MODULOS_OFICIO.length} módulos totales | ${MODULOS_OFICIO.filter(esDePapel).length} de papel | ${Object.keys(GLOSARIO).length} entradas glosario | ${Object.keys(RESPUESTAS_OFICIO).length} claves respuesta`)
console.log(`CURSOS declarados: ${Object.keys(CURSOS).join(', ')}`)
const porCursoGlobal = {}
for (const m of MODULOS_OFICIO) porCursoGlobal[m.curso] = (porCursoGlobal[m.curso] || 0) + 1
console.log(`Módulos por curso: ${Object.entries(porCursoGlobal).map(([c, n]) => `${c}=${n}`).join(' · ')}`)
console.log('')

// ── 1) planDeRol de los 5 roles pedidos ────────────────────────────────────
const ROLES = ['coach', 'coordinador', 'administradora', 'asistente', 'admin_general']
const planes = {}
for (const rol of ROLES) {
  const plan = planDeRol(rol, MODULOS_OFICIO)
  planes[rol] = plan
  const porCurso = {}
  for (const m of plan) porCurso[m.curso] = (porCurso[m.curso] || 0) + 1
  const mins = plan.reduce((n, m) => n + (m.duracionMin || 0), 0)
  console.log(`── ${rol} (${nombreDeRol(rol)}): ${plan.length} MÓDULOS · ${mins} min`)
  console.log(`   por curso: ${Object.entries(porCurso).map(([c, n]) => `${c}=${n}`).join(' · ') || '(ninguno)'}`)
  console.log(`   ids: ${plan.map((m) => m.id).join(', ') || '(vacío)'}`)
  const ordenes = plan.map((m) => m.orden)
  if (new Set(ordenes).size !== ordenes.length) mal(`${rol}: órdenes duplicados dentro del plan → ${ordenes.join(',')}`)
  console.log('')
}
if (planes.coach.length === 0) mal('coach: PLAN VACÍO — el trabajo falló')
if (planes.coordinador.length === 0) mal('coordinador: PLAN VACÍO — el trabajo falló')
if (planes.admin_general.length !== 0) mal(`admin_general debería tener 0 módulos y tiene ${planes.admin_general.length}`)

// ── 2) gradienteAbierto con progreso vacío ─────────────────────────────────
console.log('── GRADIENTE con progreso VACÍO {} (alguien que nunca entró):')
for (const rol of ROLES) {
  const plan = planes[rol]
  if (plan.length === 0) { console.log(`   ${rol}: plan vacío, nada que abrir`); continue }
  const abiertos = plan.filter((m) => gradienteAbierto(m, {}))
  const primero = plan[0]
  console.log(`   ${rol}: abiertos=${abiertos.length} → [${abiertos.map((m) => m.id).join(', ')}] | primero del plan = ${primero.id} (requiere: ${JSON.stringify(primero.requiere || [])})`)
  if (!gradienteAbierto(primero, {})) mal(`${rol}: el PRIMER módulo ${primero.id} está CERRADO sin progreso → plan trabado (C2)`)
  if (abiertos.length !== 1) mal(`${rol}: ${abiertos.length} módulos abiertos sin progreso; debe ser exactamente 1`)
}
console.log('')

// requisitos colgantes en TODO el catálogo
console.log('── REQUISITOS colgantes (`requiere` a un id inexistente):')
let colgantes = 0
for (const m of MODULOS_OFICIO) for (const r of m.requiere || []) {
  if (!ids.has(r)) { colgantes++; mal(`${m.id} requiere "${r}" QUE NO EXISTE`) }
}
console.log(`   ${colgantes} requisitos colgantes`)
// y que cada `requiere` esté en el plan del mismo rol (si no, tampoco abre nunca)
for (const rol of ROLES) {
  const plan = planes[rol]
  const enPlan = new Set(plan.map((m) => m.id))
  for (const m of plan) for (const r of m.requiere || []) {
    if (!enPlan.has(r)) mal(`${rol}: ${m.id} requiere ${r}, que NO está en SU plan → trabado para siempre`)
  }
}
console.log('')

// ── 3) aislamiento entre roles ─────────────────────────────────────────────
console.log('── AISLAMIENTO (ningún rol ve el curso B de otro):')
const PREFIJO = { centro: 'of-cen', zoho: 'of-zoh', coach: 'of-coa', coordinacion: 'of-cop' }
const chequeos = [
  ['asistente', ['coach', 'coordinacion', 'centro']],
  ['coach', ['zoho', 'centro', 'coordinacion']],
  ['coordinador', ['zoho', 'centro', 'coach']],
  ['administradora', ['zoho', 'coach', 'coordinacion']],
]
for (const [rol, prohibidos] of chequeos) {
  for (const curso of prohibidos) {
    const intrusos = planes[rol].filter((m) => m.curso === curso)
    const pref = PREFIJO[curso]
    const porId = planes[rol].filter((m) => m.id.startsWith(pref))
    const n = new Set([...intrusos, ...porId]).size
    console.log(`   ${rol} × ${curso} (${pref}-*): ${n} módulos${n ? ' ← FUGA' : ''}`)
    if (n) mal(`${rol} VE ${n} módulos del curso ${curso}: ${[...new Set([...intrusos, ...porId])].map((m) => m.id).join(', ')}`)
  }
}
console.log('')

// ── 4) claves de glosario referenciadas ────────────────────────────────────
console.log('── GLOSARIO: claves referenciadas que no existen')
let refs = 0, huerfanas = 0
const vistas = new Set()
const revisa = (slugs, donde) => {
  for (const s of slugs || []) {
    refs++
    vistas.add(s)
    if (!GLOSARIO[s]) { huerfanas++; mal(`${donde} → slug "${s}" NO existe en GLOSARIO`) }
  }
}
for (const m of MODULOS_OFICIO) {
  revisa(m.palabras, `${m.id}.palabras`)
  for (const [i, q] of (m.quiz || []).entries()) revisa(q.repasa, `${m.id}.quiz[${i}].repasa`)
  for (const [i, d] of (m.drills || []).entries()) {
    revisa(d.palabras, `${m.id}.drills[${i}].palabras`)
    revisa(d.repasa, `${m.id}.drills[${i}].repasa`)
  }
}
console.log(`   ${refs} referencias · ${vistas.size} slugs distintos · ${huerfanas} huérfanas`)
console.log('')

// ── quiz: toda pregunta con su clave de respuesta ──────────────────────────
console.log('── CLAVES DE RESPUESTA:')
let sinClave = 0
for (const m of MODULOS_OFICIO) {
  const nq = (m.quiz || []).length
  if (nq === 0) continue
  const clave = RESPUESTAS_OFICIO[m.id]
  if (!Array.isArray(clave)) { sinClave++; mal(`${m.id}: ${nq} preguntas y SIN clave de respuesta`) ; continue }
  if (clave.length !== nq) mal(`${m.id}: ${nq} preguntas vs ${clave.length} respuestas`)
  for (const [i, c] of clave.entries()) {
    const nOpc = (m.quiz[i]?.opciones || []).length
    if (!Number.isInteger(c) || c < 0 || c >= nOpc) mal(`${m.id}.quiz[${i}]: respuesta ${c} fuera de rango (${nOpc} opciones)`)
  }
}
console.log(`   ${sinClave} módulos con quiz sin clave`)
console.log('')

console.log(fallos === 0 ? '✓✓ AUDITORÍA LIMPIA' : `✗✗ ${fallos} FALLO(S)`)
process.exit(fallos === 0 ? 0 : 1)
