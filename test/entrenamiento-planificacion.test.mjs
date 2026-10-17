import test from 'node:test'
import assert from 'node:assert/strict'
import { MODULOS_OFICIO, metadatosOficio } from '../lib/entrenamiento/oficio/catalogo.js'
import { PLANIFICACION, AVISO_PRIMER_CICLO } from '../lib/entrenamiento/oficio/cursos/planificacion.js'
import { FORMULAS } from '../lib/condiciones/formulas.mjs'
import { PRIMER_CIERRE_REUNION, calendarioPlan } from '../lib/reunion-semanal.mjs'
import { planDeRol, requisitosDe, gradienteAbierto, avanceOficio, corregirQuizOficio, minimoAprobacion } from '../lib/entrenamiento/oficio/progreso.js'
import { puertaCerrada } from '../lib/entrenamiento/oficio/guia-pasos.js'
import { RESPUESTAS_OFICIO } from '../lib/entrenamiento/respuestas-oficio/todas.js'
const done = { tourVistoAt: '2026-10-01', quizAprobadoAt: '2026-10-01', drillFirmadoAt: '2026-10-02', drillFirmadoPor: 77 }

test('la ampliación suma solo los módulos de cada puesto y conserva progreso anterior', () => {
  for (const rol of ['administradora','asistente','coach','coordinador']) {
    const plan = planDeRol(rol, MODULOS_OFICIO, 1)
    const nuevos = plan.filter(m => PLANIFICACION.some(n => n.id === m.id))
    assert.deepEqual(nuevos.map(m => m.id), ['of-sem-3', ...(['administradora','coordinador'].includes(rol) ? ['of-sem-4','of-sem-5','of-sem-6'] : [])])
    const previo = plan.filter(m => !nuevos.includes(m))
    const p = Object.fromEntries(previo.map(m => [m.id, {...done}]))
    const copia = structuredClone(p)
    assert.equal(avanceOficio(plan,p).hatted, previo.length)
    assert.equal(avanceOficio(plan,p).total, previo.length + nuevos.length)
    for (const m of nuevos) { assert.equal(gradienteAbierto(m,p,rol),true); p[m.id]={...done} }
    for (const m of previo) assert.deepEqual(p[m.id],copia[m.id])
  }
})

test('caso integral exige su propia práctica: ni otro rol ni falta de rol abren la puerta', () => {
  const m=PLANIFICACION.find(m=>m.id==='of-sem-6')
  for (const [rol,propia,ajena] of [['administradora','of-sem-adm','of-sem-cop'],['coordinador','of-sem-cop','of-sem-adm']]) {
    const p={'of-sem-5':done,[ajena]:done}
    assert.equal(gradienteAbierto(m,p,rol),false)
    assert.equal(gradienteAbierto(m,p),false)
    assert.equal(gradienteAbierto(m,p,'coach'),false)
    assert.equal(puertaCerrada(true,false,done),false,'la relectura de lo ya estudiado no se bloquea')
    p[propia]=done
    assert.equal(gradienteAbierto(m,p,rol),true)
    assert.deepEqual(requisitosDe(m,rol),['of-sem-5',propia])
    assert.equal(gradienteAbierto(metadatosOficio(m),p,rol),true,'el índice recibe la misma regla')
    delete p['of-sem-5']
    assert.equal(gradienteAbierto(m,p,rol),false)
  }
})

test('nuevas evaluaciones: cuatro de cinco, respuestas solo servidor, no basta marcar siempre igual', () => {
  for (const m of PLANIFICACION) {
    const key=RESPUESTAS_OFICIO[m.id]
    assert.equal(m.quiz.length,5); assert.equal(minimoAprobacion(5),4)
    assert.ok(m.quiz.every(q=>!Object.hasOwn(q,'correcta')))
    const uno=key.map((v,i)=>i===0?(v+1)%3:v)
    const dos=key.map((v,i)=>i<2?(v+1)%3:v)
    assert.equal(corregirQuizOficio(uno,key,4).aprobado,true)
    assert.equal(corregirQuizOficio(dos,key,4).aprobado,false)
    for(let n=0;n<3;n++) assert.equal(corregirQuizOficio(Array(5).fill(n),key,4).aprobado,false)
  }
})

test('seis formatos completos y en blanco, fórmula canónica y calendario compartido', () => {
  const bloques=PLANIFICACION.flatMap(m=>m.bloques)
  assert.equal(bloques.filter(b=>b.t==='sub'&&/^Formato \d/.test(b.texto)).length,6)
  const ejemplos=bloques.filter(b=>b.t==='tabla'&&b.titulo.startsWith('Ejemplo completado'))
  const vacios=bloques.filter(b=>b.t==='tabla'&&b.titulo.startsWith('Tu ejercicio'))
  assert.equal(ejemplos.length,6); assert.equal(vacios.length,6)
  ejemplos.forEach((e,i)=>assert.deepEqual(e.filas.map(f=>f[0]),vacios[i].filas.map(f=>f[0])))
  assert.strictEqual(bloques.find(b=>b.formula==='emergencia').items,FORMULAS.emergencia)
  for(const fecha of Object.values(calendarioPlan(PRIMER_CIERRE_REUNION))) assert.ok(AVISO_PRIMER_CICLO.includes(fecha))
})
