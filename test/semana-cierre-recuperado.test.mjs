import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asegurarCierreSemana } from '../lib/estadisticas-semana/servicio.js'
const now = new Date('2026-10-23T10:00:00Z')
function db(estado) {
  const writes = []
  const query = async (s, ...v) => {
    const text = s.join('?')
    if (text.includes('FROM centros')) return [{ pais:'PA' }]
    if (text.includes('SELECT estado')) return estado ? [{estado}] : []
    if (text.includes('INSERT INTO estadisticas_semana')) { writes.push({text,v}); return [] }
    throw new Error(text)
  }
  return {query,writes}
}
test('el viernes recupera población faltante o abierta sin cerrar otras estadísticas', async () => {
  for (const estado of [null,'abierta']) {
    const d=db(estado)
    await asegurarCierreSemana(2,'2026-10-22',{...d,now,calcular:async (id,fin,options)=>{
      assert.equal(id,2);assert.equal(fin,'2026-10-22');assert.equal(options.soloPoblacion,true)
      return {ninos_activos:{valor:131,detalle:{fuente:'registros'}}}
    }})
    assert.equal(d.writes.length,1)
    assert.deepEqual(d.writes[0].v,[2,'2026-10-22',131,'{"fuente":"registros"}'])
    assert.match(d.writes[0].text,/WHERE estadisticas_semana.estado <> 'cerrada'/)
    assert.match(d.writes[0].text,/'ninos_activos'/)
  }
})
test('un cierre ya guardado no se recalcula ni se sobrescribe', async()=>{
  const d=db('cerrada')
  await asegurarCierreSemana(2,'2026-10-22',{...d,now,calcular:()=>assert.fail('No recalcular')})
  assert.equal(d.writes.length,0)
})
test('no cierra el jueves aún abierto ni convierte falta de datos en cero',async()=>{
  const d=db(null)
  await assert.rejects(asegurarCierreSemana(2,'2026-10-22',{...d,now:new Date('2026-10-23T02:00:00Z'),calcular:()=>assert.fail('No calcular')}),/semana cerrada/)
  await assert.rejects(asegurarCierreSemana(2,'2026-10-22',{...d,now,calcular:async()=>({ninos_activos:{valor:null}})}),/No se pudo recuperar/)
  assert.equal(d.writes.length,0)
})
