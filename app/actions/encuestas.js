'use server'
import { requireCurrentCentroAccess, requireCurrentWriteCentro } from '../../lib/auth'
import { encuestas } from '../../lib/encuestas/server'

async function acceso(centroId, { escritura = false } = {}) {
  if (!Number.isInteger(Number(centroId)) || Number(centroId)<1) throw new Error('Centro inválido.')
  const user = escritura
    ? await requireCurrentWriteCentro(Number(centroId))
    : await requireCurrentCentroAccess(Number(centroId))
  if (user.rol==='coach') throw new Error('Tu puesto no tiene acceso a las encuestas del centro.')
  return user
}
async function accion(work) {
  try { return await work() } catch(e) {
    if (e.code==='42P01' || e.code==='42883') return {error:'Las encuestas aún no están activadas en esta versión. Contacta al administrador.'}
    if (e.code) { console.error('[encuestas]',e.code); return {error:'No se pudo completar la operación. Intenta nuevamente.'} }
    return {error:e.message || 'No se pudo completar la operación.'}
  }
}
export async function cargarEncuesta(centroId, anio, mes) {
  return accion(async()=>{await acceso(centroId);return encuestas.cargar(Number(centroId),anio,mes)})
}
export async function prepararEncuesta(centroId, anio, mes) {
  return accion(async()=>{await acceso(centroId,{escritura:true});return encuestas.preparar(Number(centroId),anio,mes)})
}
export async function registrarDifusionEncuesta(centroId,id,tipo) {
  return accion(async()=>{const user=await acceso(centroId,{escritura:true});return encuestas.registrarDifusion(Number(centroId),Number(id),tipo,user.id)})
}
