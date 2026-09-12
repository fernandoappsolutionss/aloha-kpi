'use server'
import { requireCurrentCentroAccess, requireCurrentWriteCentro } from '../../lib/auth'
import { encuestas } from '../../lib/encuestas/server'
import { sql } from '../../lib/db'
import { resumenEncuesta, textoFoda, validarPeriodo } from '../../lib/encuestas/domain.mjs'

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
export async function resumenEncuestasTrimestre(centroId,anio,trimestre) {
  return accion(async()=>{
    await acceso(centroId)
    if(!Number.isInteger(trimestre)||trimestre<1||trimestre>4)throw new Error('Trimestre inválido.')
    validarPeriodo(anio,1)
    const desde=(trimestre-1)*3+1
    const [campanas,respuestas]=await Promise.all([
      sql`SELECT id,mes,activos,compartida_at,regla_participacion FROM encuesta_campanas WHERE centro_id=${centroId} AND anio=${anio} AND mes BETWEEN ${desde} AND ${desde+2}`,
      sql`SELECT r.campana_id,r.general,r.avance,r.coach,r.atencion FROM encuesta_respuestas r JOIN encuesta_campanas c ON c.id=r.campana_id WHERE c.centro_id=${centroId} AND c.anio=${anio} AND c.mes BETWEEN ${desde} AND ${desde+2}`,
    ])
    return {meses:[desde,desde+1,desde+2].map(mes=>{
      const c=campanas.find(c=>Number(c.mes)===mes)
      const resumen=resumenEncuesta(c,respuestas.filter(r=>r.campana_id===c?.id))
      const nombre=new Intl.DateTimeFormat('es-PA',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(anio,mes-1,1)))
      return {mes,texto:textoFoda(nombre,resumen)}
    })}
  })
}
