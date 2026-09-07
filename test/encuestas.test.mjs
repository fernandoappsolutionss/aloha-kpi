import test from 'node:test'
import assert from 'node:assert/strict'
import { resumenEncuesta, validarRespuesta, periodoAbierto, periodoPanama, normalizarNombre, telefonoIdentidad, textoFoda } from '../lib/encuestas/domain.mjs'
const respuesta = { general:4, avance:3, coach:5, atencion:4, consentimiento:true }
test('más del 50% es estricto: 74 de 148 no; 75 sí, con difusión', () => {
  const c = { activos:148, compartida_at:'2026-09-07' }
  assert.equal(resumenEncuesta(c, Array(74).fill(respuesta)).cumple, false)
  assert.equal(resumenEncuesta(c, Array(75).fill(respuesta)).cumple, true)
  assert.equal(resumenEncuesta({...c,compartida_at:null}, Array(148).fill(respuesta)).cumple, false)
  assert.equal(resumenEncuesta(c).cumple, false)
})
test('cero activos no cumple ni divide por cero; población impar redondea hacia arriba', () => {
  assert.equal(resumenEncuesta({activos:0,compartida_at:'x'}).cumple, false)
  assert.equal(resumenEncuesta({activos:5}).necesarias,3)
})
test('satisfacción y participación no son el mismo indicador', () => {
  const r=resumenEncuesta({activos:10,compartida_at:'x'},[{...respuesta,general:1},respuesta])
  assert.equal(r.participacion,20);assert.equal(r.satisfaccion,50)
  assert.match(textoFoda('Septiembre',r),/50%.*2\/10/)
  assert.equal(resumenEncuesta({activos:10}).satisfaccion,null)
})
test('mes por Panamá, el cliente no elige fecha de respuesta', () => {
  const now=new Date('2026-10-01T04:59:59Z')
  assert.deepEqual(periodoPanama(now),{anio:2026,mes:9,hoy:'2026-09-30'})
  assert.equal(periodoAbierto(2026,9,now),true)
  assert.equal(periodoAbierto(2026,9,new Date('2026-10-01T05:00:00Z')),false)
})
test('identidad tolera acentos, espacios y prefijo telefónico; no acepta vacío', () => {
  assert.equal(normalizarNombre('  María   Pérez  '),'maria perez')
  assert.equal(telefonoIdentidad('+507 6123-4567'),'61234567')
  assert.equal(telefonoIdentidad('123'),null)
})
test('valida todas las puntuaciones, consentimiento y límites del comentario', () => {
  assert.equal(validarRespuesta(respuesta).general,4)
  for(const valor of [null,0,6,'5',NaN,3.5]) assert.throws(()=>validarRespuesta({...respuesta,coach:valor}))
  assert.throws(()=>validarRespuesta({...respuesta,consentimiento:false}))
  assert.throws(()=>validarRespuesta({...respuesta,mejorar:'a'.repeat(1001)}))
  assert.throws(()=>validarRespuesta({...respuesta,destacar:{}}))
})
