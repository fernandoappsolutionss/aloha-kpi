import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendientesDesde, estadoPlan, primerPasoSinObjetivo, objetivosAlCambiarCondicion, enriquecerTableroConPlanes, pasoPrevioPendiente, origenFormula, SECCIONES } from '../lib/plan-semana.mjs'

test('secciones del plan', () => {
  assert.deepEqual(SECCIONES, ['formula', 'urgente', 'pendiente', 'orden', 'estrategico'])
})

test('pendientes: lo no hecho y los pasos de fórmula sin ningún objetivo hecho', () => {
  const anterior = {
    condicion: 'emergencia', alcance_peligro: null, variante_afluencia: null,
    objetivos: [
      { id: 1, seccion: 'formula', paso: 0, texto: 'Campaña referidos', responsable: 'Ana', fecha: '2026-09-27', hecho: true },
      { id: 2, seccion: 'formula', paso: 1, texto: 'Nuevo horario sábado', responsable: 'Ana', fecha: null, hecho: false },
      { id: 3, seccion: 'urgente', paso: null, texto: 'Llamar a 5 padres', responsable: null, fecha: null, hecho: false },
    ],
  }
  const nuevos = pendientesDesde(anterior)
  assert.deepEqual(nuevos.map((o) => o.texto), [
    'Nuevo horario sábado',
    'Llamar a 5 padres',
    'Terminar el paso 3 de Emergencia: Economice.',
    'Terminar el paso 4 de Emergencia: Entonces prepárese para dar el servicio.',
    'Terminar el paso 5 de Emergencia: Haga más estricta la disciplina.',
  ])
  assert.ok(nuevos.every((o) => o.seccion === 'pendiente'))
  assert.equal(nuevos[0].origen_objetivo_id, 2)
  assert.equal(pendientesDesde(null).length, 0)
  assert.equal(pendientesDesde({ condicion: null, objetivos: [] }).length, 0)
})

test('estado del plan', () => {
  assert.equal(estadoPlan({ condicion: null, objetivos: [] }), 'sin_condicion')
  const obj = (paso) => ({ seccion: 'formula', paso, texto: 'x', responsable:'Ana',fecha:'2026-10-07', evidencia_esperada:'Registro' })
  assert.equal(estadoPlan({ condicion: 'inexistencia', objetivos: [obj(0), obj(1), obj(2)] }), 'incompleto')
  assert.equal(estadoPlan({ condicion: 'inexistencia', objetivos: [obj(0), obj(1), obj(2), obj(3)] }), 'completo')
})

test('identifica el primer paso de fórmula sin objetivo', () => {
  assert.equal(primerPasoSinObjetivo({ condicion: 'emergencia', objetivos: [{ seccion: 'formula', paso: 0, texto:'Acción', responsable:'Ana', fecha:'2026-10-07', evidencia_esperada:'Registro' }] }), 2)
  assert.equal(primerPasoSinObjetivo({ condicion: null, objetivos: [] }), null)
})

test('al cambiar de condición los objetivos de fórmula pasan a urgentes', () => {
  const r = objetivosAlCambiarCondicion([{ id: 1, seccion: 'formula', paso: 2, texto: 'a' }, { id: 2, seccion: 'orden', paso: null, texto: 'b' }])
  assert.deepEqual(r, [{ id: 1, seccion: 'urgente', paso: null }])
})

test('tablero calcula estado y discrepancia sobre la última semana cerrada', () => {
  const serie = [100, 101, 102, 102].map((valor, i) => ({ semanaFin: `2026-09-${String(3 + i * 7).padStart(2, '0')}`, valor, estado: 'cerrada' }))
  const centros = [{ id: 7, nombre: 'Centro', pais: 'PA', serie }]
  const planes = [{ id: 9, centro_id: 7, condicion: 'normal', semana_fin: '2026-09-24' }]
  const out = enriquecerTableroConPlanes(centros, planes, [], '2026-09-24', new Date('2026-10-01T12:00:00Z'))
  assert.equal(out[0].condicion, 'normal')
  assert.equal(out[0].estadoPlan, 'incompleto')
  assert.equal(out[0].plazoVencido, false)
  assert.equal(out[0].preparacion, true)
  assert.equal(out[0].discrepancia, true)
  assert.equal('lectura' in out[0], false)
})

 test('la secuencia exige todas las acciones previas con evidencia y conserva el orden tras cambiar condición', () => {
  const plan={id:8, semana_fin:'2026-10-01', condicion:'emergencia'}
  const a={id:1,seccion:'formula',paso:0,hecho:true,evidencia_resultado:'Registro'}
  const b={id:2,seccion:'formula',paso:1,hecho:false}
  assert.equal(pasoPrevioPendiente(b,[a,b],plan),null)
  assert.equal(pasoPrevioPendiente(b,[{...a,evidencia_resultado:null},b],plan),1)
  assert.equal(pasoPrevioPendiente(b,[a,{...a,id:3,hecho:false},b],plan),1)
  const cambios=objetivosAlCambiarCondicion([a,b],plan)
  assert.equal(cambios[1].origen_formula.paso,1)
  assert.equal(cambios[1].origen_formula.nombre,'Emergencia')
  const pendientes=[{...a,...cambios[0],hecho:false},{...b,...cambios[1]}]
  assert.equal(pasoPrevioPendiente(pendientes[1],pendientes,plan),1)
  assert.deepEqual(origenFormula(plan,1),cambios[1].origen_formula)
})
