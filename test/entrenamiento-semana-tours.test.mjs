import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MODULOS, modulosDeRol } from '../lib/entrenamiento/modulos.js'
import { RESPUESTAS } from '../lib/entrenamiento/respuestas.js'
import { porcentaje, siguienteModulo, corregirQuiz } from '../lib/entrenamiento/progreso.js'
import { clipsDeTours } from '../scripts/entrenamiento-audio.mjs'
import { clipsActualizados } from '../scripts/entrenamiento-audio-actualizaciones.mjs'
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const nuevos = MODULOS.filter(m => m.id.startsWith('semana-'))

test('permisos estrictos; graduados históricos conservan sus doce completados y nueva tarea pendiente', () => {
  const historicos = Object.fromEntries(MODULOS.slice(0, 12).map(m => [m.id, { tourVistoAt: 'x', quizAprobadoAt: 'x' }]))
  for (const [rol, total] of [['administradora', 14], ['asistente', 13], ['coordinador', 12], ['admin_master', 12], ['supervisor', 12]]) {
    const plan = modulosDeRol(rol)
    assert.equal(plan.length, total)
    assert.equal(porcentaje(historicos, plan).completados, 12)
    assert.equal(siguienteModulo(historicos, plan), total > 12 ? 'semana-graficas' : null)
  }
  for (const rol of ['coach', null, 'desconocido', 'intruso']) assert.deepEqual(modulosDeRol(rol), [])
})

test('actions rechazan tour y quiz ajenos antes de SQL; aceptan solo el recorrido propio', async () => {
  let actor, writes = 0
  const source = read('app/actions/entrenamiento.js').replace(/^import .* from .*\n/gm, '').replace(/export async function /g, 'async function ')
  const actions = new Function('sql','requireCurrentTraining','MODULOS','modulosDeRol','RESPUESTAS','corregirQuiz','fallo',`${source}\nreturn {marcarTourVisto,responderQuiz};`)(
    async () => { writes++; return [] }, async () => actor, MODULOS, modulosDeRol, RESPUESTAS, corregirQuiz, (_name, e) => ({error:e.message}),
  )
  for (const [rol, id] of [['asistente','semana-plan'], ['coach','semana-graficas'], ['coordinador','semana-plan'], ['coach','meta']]) {
    actor = { id: 3, rol }; writes = 0
    assert.ok((await actions.marcarTourVisto(id)).error)
    assert.ok((await actions.responderQuiz(id, RESPUESTAS[id])).error)
    assert.equal(writes, 0)
  }
  for (const [rol,id] of [['asistente','semana-graficas'],['administradora','semana-plan']]) {
    actor = {id: 3, rol}; writes = 0
    assert.deepEqual(await actions.marcarTourVisto(id), {ok: true})
    assert.equal((await actions.responderQuiz(id, RESPUESTAS[id])).aprobado, true)
    assert.equal(writes, 2)
  }
})

test('guiones usan solo observar; todos los targets están presentes aun sin condición o cuotas guardadas', () => {
  const files = ['app/centro/[id]/semana/page.js','components/semana/PlanSemana.js','components/semana/CuotasSemana.js'].map(read).join('\n')
  for (const m of nuevos) for (const p of m.pasos) {
    assert.equal(p.tipo, 'mostrar')
    assert.ok(files.includes(`data-tour="${p.target}"`), p.target)
    assert.equal(p.ruta, undefined)
  }
  const plan = read('components/semana/PlanSemana.js')
  assert.match(plan, /data-tour="semana.formula">\s*\{sinCondicion && <p/)
  assert.match(plan, /data-tour="semana.condicion">\s*\{!sinCondicion/)
  for (const p of ['app/centro/[id]/entrenamiento/page.js','app/centro/[id]/entrenamiento/[modulo]/page.js','components/tour/TourHost.js']) assert.match(read(p), /modulosDeRol\(/)
})

test('terminar no marca progreso al omitir target ni al entrar directamente en último paso; permite terminar tras carga tardía', async () => {
  const src = read('components/tour/TourHost.js')
  const body = src.match(/const terminar = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[modulo, terminando/)[1]
  const vistosRef = {current: new Set()}
  const modulo = nuevos[0]
  let writes = 0, destino
  const terminar = new Function('modulo','terminando','vistosRef','setErrorGuardar','irA','setTerminando','marcarTourVisto','router','centroId', `return async () => {${body}}`)(
    modulo,false,vistosRef,()=>{},n=>{destino=n},()=>{},async()=>{writes++;return{ok:true}}, {push:()=>{}}, 1,
  )
  await terminar(); assert.equal(writes,0);assert.equal(destino,1)
  modulo.pasos.slice(1).forEach(p=>vistosRef.current.add(p.id))
  await terminar();assert.equal(writes,0);assert.equal(destino,1)
  vistosRef.current.add(modulo.pasos[0].id)
  await terminar();assert.equal(writes,1)
  assert.match(src, /if \(el\) \{\s*targetRef.current = el\s*vistosRef.current.add\(step.id\)/)
})

test('ambos anchors hacen scroll tras carga; no se aceptan IDs arbitrarios', () => {
  const effect = read('app/centro/[id]/semana/page.js').match(/\/\/ Ambos destinos[^\n]*\n([\s\S]*?)\n  \}, \[cargando\]\)/)[1]
  const run = new Function('cargando','window','document',effect)
  const vistos = []
  const document = {getElementById:id=>({scrollIntoView:()=>vistos.push(id)})}
  for (const hash of ['#plan-batalla','#semana-cuotas-title']) {
    run(true,{location:{hash}},document); assert.equal(vistos.length,hash === '#plan-batalla' ? 0 : 1)
    run(false,{location:{hash}},document)
  }
  run(false,{location:{hash:'#otro'}},document)
  assert.deepEqual(vistos,['plan-batalla','semana-cuotas-title'])
})

test('13 clips nuevos van a actualizaciones; manifest y guiones legacy no se sustituyen', () => {
  const clips = clipsActualizados().filter(c=>c.clave.startsWith('semana-'))
  assert.equal(clips.length,13)
  assert.equal(clipsDeTours().some(c=>c.clave.startsWith('semana-')),false)
  for (const c of clips) assert.match(c.file, /^actualizaciones\/semana-/)
  const frozen = JSON.parse(read('lib/entrenamiento/audio-manifest.json'))
  assert.equal(Object.keys(frozen).length, 66)
  for (const clave of Object.keys(frozen)) {
    const [id, paso] = clave.split('/')
    const modulo = MODULOS.find(m => m.id === id)
    assert.ok(modulo && !id.startsWith('semana-'))
    assert.ok(paso === 'intro' || modulo.pasos.some(p => p.id === paso))
  }
})

test('actualización visible enlaza tres lecciones propias sin mandar al coach a Semana', () => {
  const oficio = read('app/centro/[id]/entrenamiento/oficio/page.js')
  assert.match(oficio,/id="actualizacion-semanal"/)
  assert.match(oficio,/plan.filter\(\(m\) => m.curso === 'semana'\)/)
  assert.match(oficio,/pendientesSemana.length \? 'pendiente' : 'completada'/)
  assert.match(oficio,/modulosDeRol\(rol\).filter/)
  assert.match(read('components/entrenamiento/CarrilOficio.js'),/semanal.hatted < semanal.total/)
  assert.match(read('app/centro/[id]/semana/page.js'), /entrenamiento\/oficio#actualizacion-semanal/)
})
