import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COMPARATIVA_HCA, CUADRO_HCA, numeroRegistrado, resumenComparativo, mesesConCuadro } from '../lib/historial-graficas-hca.mjs'
import { CAJA_HCA, puntosCaja } from '../lib/caja/graficas-hca.mjs'
import { modeloMensual, puntosMensuales } from '../lib/grafica-mensual-hca.mjs'

test('cada indicador comparativo y del cuadro conserva su sentido propio', () => {
  const comparativas = COMPARATIVA_HCA.flatMap(g => g.series)
  assert.equal(comparativas.length, 12)
  assert.equal(new Set(comparativas.map(s => s.campo)).size, 12)
  assert.deepEqual(comparativas.filter(s=>s.inversa).map(s=>s.campo), ['mot_perdida_clase','mot_economico','mot_tecnica','mot_horario'])
  assert.ok(comparativas.find(s=>s.campo==='grupos_activos').contextual)
  assert.equal(CUADRO_HCA.length, 4)
  assert.ok(CUADRO_HCA.find(s=>s.campo==='cuadro_retirados').inversa)
  assert.ok(CUADRO_HCA.find(s=>s.campo==='cuadro_royalty').contextual)
})

test('ausencia no es cero; cero numérico y textual sí son cifras registradas', () => {
  assert.deepEqual([null,undefined,'','abc',Infinity].map(numeroRegistrado), [null,null,null,null,null])
  assert.equal(numeroRegistrado('0'),0)
  assert.equal(numeroRegistrado(0),0)
})

const fila = (month, values) => ({year:2026, month, ...values})
const embudo = COMPARATIVA_HCA.find(g=>g.id==='clase-prueba')
test('participaciones usan totales de la ventana y el denominador de la misma etapa', () => {
  const rows = [fila(1,{cp_invitados:40,cp_asistieron:20,cp_matriculados:5}),fila(2,{cp_invitados:60,cp_asistieron:30,cp_matriculados:10})]
  assert.deepEqual(resumenComparativo(rows,embudo,'cp_asistieron'),{total:50,completo:true,porcentaje:50})
  assert.equal(resumenComparativo(rows,embudo,'cp_matriculados').porcentaje,15)
  const origen = COMPARATIVA_HCA[0]
  assert.equal(resumenComparativo([fila(1,{orig_referido:1,orig_marketing:2,orig_centro:0,orig_activaciones:1})],origen,'orig_referido').porcentaje,25)
})

test('totales incompletos y meses ausentes no producen porcentajes engañosos', () => {
  const r = fila(1,{cp_invitados:40,cp_asistieron:20,cp_matriculados:5})
  assert.deepEqual(resumenComparativo([r,fila(2,{cp_invitados:50,cp_asistieron:null,cp_matriculados:4})],embudo,'cp_asistieron'), {total:20,completo:false,porcentaje:null})
  assert.equal(resumenComparativo([r,{...r,month:3}],embudo,'cp_asistieron').completo,false)
  assert.equal(resumenComparativo([fila(1,{})],embudo,'cp_asistieron').total,null)
  assert.equal(resumenComparativo([],embudo,'cp_asistieron').total,null)
  assert.equal(resumenComparativo([fila(1,{cp_invitados:0,cp_asistieron:0,cp_matriculados:0})],embudo,'cp_asistieron').porcentaje,null)
})

test('cuadro utiliza solo fotos congeladas y conserva los huecos entre cierres', () => {
  const rows = [fila(1,{cuadro:{vivo:false},cuadro_aPagar:80}),fila(2,{cuadro:{vivo:true},cuadro_aPagar:99}),fila(3,{cuadro:{},cuadro_aPagar:0}),fila(4,{cuadro:null})]
  const cerrados = mesesConCuadro(rows)
  assert.deepEqual(cerrados.map(r=>r.month),[1,3])
  assert.ok(cerrados.every(r=>r.estado==='cerrado'))
  const p = puntosMensuales(cerrados,'cuadro_aPagar')
  assert.deepEqual(p.map(p=>p.valor),[80,null,0])
  assert.equal(modeloMensual({puntos:p}).tramos.length,0)
  assert.equal(rows[0].estado,undefined)
})

const curva = {piso:500,semanas:Array.from({length:13},(_,i)=>({lunes:`2026-10-${String(i+1).padStart(2,'0')}`,domingo:`2026-10-${String(i+7).padStart(2,'0')}`,ingresos:i?1000:0,egresoTotal:600,dueno:100,disponible:300-i*50}))}
test('caja conserva 13 periodos, cero real y egresos positivos incluyendo al dueño', () => {
  assert.equal(CAJA_HCA.length,3)
  const ingresos = puntosCaja(curva,'ingresos'),egresos = puntosCaja(curva,'egresos'),disponible = puntosCaja(curva,'disponible')
  assert.equal(ingresos.length,13)
  assert.equal(ingresos[0].valor,0)
  assert.equal(ingresos.at(-1).etiqueta,'S13')
  assert.ok(egresos.every(p=>p.valor===700 && p.cuota===null))
  assert.ok(disponible.every(p=>p.cuota===500))
  assert.equal(disponible.at(-1).valor,-300)
})

test('caja muestra previsiones neutras; una cifra ausente sigue cortando la línea', () => {
  const p = puntosCaja(curva,'disponible')
  assert.ok(p.every(p=>p.abierto))
  const m = modeloMensual({puntos:p})
  assert.ok(m.tramos.every(t=>t.provisional && t.color==='var(--text-muted)'))
  const falta = {semanas:[{lunes:'2026-10-12',domingo:'2026-10-18',egresoTotal:500,dueno:null}]}
  assert.equal(puntosCaja(falta,'egresos')[0].valor,null)
})

test('referencias financieras incluyen cero y piso incluso con escala manual más estrecha', () => {
  const p = [{valor:800,cuota:500},{valor:900,cuota:500}]
  const m = modeloMensual({puntos:p,escala:{min:700,max:1000},incluirCero:true})
  assert.equal(m.min,0)
  assert.equal(m.expandida,true)
  assert.ok(m.yCero>=m.margen.arriba && m.yCero<=m.alto-m.margen.abajo)
  assert.ok(m.puntos.every(p=>p.yCuota>=m.margen.arriba && p.yCuota<=m.alto-m.margen.abajo))
})
