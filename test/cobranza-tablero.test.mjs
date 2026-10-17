import test from 'node:test'
import assert from 'node:assert/strict'
import { superponerCobranzaTablero } from '../lib/estadisticas-semana/cobranza-tablero.js'
import { armarTablero } from '../lib/estadisticas-semana/presentacion.mjs'
const centros = [{id:1,nombre:'Brisas'}, {id:11,nombre:'Viñedo'}]
const periodos = {1:{semanaAbierta:'2026-10-22',hoy:'2026-10-17'},11:{semanaAbierta:'2026-10-22',hoy:'2026-10-17'}}
const guardadas = [
 {centro_id:1,semana_fin:'2026-10-15',codigo:'facturas_vencidas',valor:11,estado:'cerrada'},
 {centro_id:1,semana_fin:'2026-10-22',codigo:'facturas_vencidas',valor:40,estado:'abierta',detalle:{fecha:'2026-10-16'}},
 {centro_id:1,semana_fin:'2026-10-22',codigo:'ninos_activos',valor:208,estado:'abierta'},
]
const queryCon = diaria => async strings => strings.join('').includes('FROM cobranza_diaria') ? diaria : []
test('el panel muestra el nuevo conteo y fecha sin esperar el cron de estadísticas', async () => {
 const filas = await superponerCobranzaTablero(centros,periodos,guardadas,{query:queryCon([
   {centro_id:1,fecha:'2026-10-16',vencidas:40}, {centro_id:1,fecha:'2026-10-17',vencidas:41},
 ])})
 const tablero=armarTablero(centros,['2026-10-15','2026-10-22'],filas)
 assert.equal(tablero.centros[0].abierta.facturas_vencidas,41)
 assert.equal(tablero.centros[0].cobranza.detalle.fecha,'2026-10-17')
 assert.equal(tablero.centros[0].cerrada.facturas_vencidas,11)
 assert.equal(tablero.centros[0].abierta.ninos_activos,208)
 assert.equal(tablero.centros[1].abierta.facturas_vencidas,null)
 assert.equal(guardadas[1].valor,40)
})
test('cero de Zoho es real y datos futuros nunca adelantan el conteo', async () => {
 const filas=await superponerCobranzaTablero(centros,periodos,guardadas,{query:queryCon([
  {centro_id:1,fecha:'2026-10-17',vencidas:0},{centro_id:1,fecha:'2026-10-19',vencidas:5},
 ])})
 const fila=filas.find(f=>f.codigo==='facturas_vencidas'&&f.estado==='abierta'&&f.centro_id===1)
 assert.equal(fila.valor,0);assert.equal(fila.detalle.fecha,'2026-10-17')
})
test('si falla la fuente no hace pasar la foto vieja por un conteo actual', async () => {
 const filas=await superponerCobranzaTablero(centros,periodos,guardadas,{query:async()=>{throw new Error('DB')}})
 const fila=filas.find(f=>f.codigo==='facturas_vencidas'&&f.estado==='abierta'&&f.centro_id===1)
 assert.equal(fila.valor,null);assert.match(fila.detalle.error,/último conteo/)
 assert.equal(filas.find(f=>f.codigo==='ninos_activos').valor,208)
})
