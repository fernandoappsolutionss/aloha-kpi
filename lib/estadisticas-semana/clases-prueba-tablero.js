import { sql } from '../db.js'
import { crmCall } from '../crm.js'
import { cargarClasesCrm } from '../kpi-auto-server.js'
import { zonaHorariaCentro } from '../semana-cierre.mjs'
import { resumenClasesPrueba } from './resumen-clases-prueba.mjs'

// Los centros ya vienen restringidos por alcancePanel. Ambos conteos proceden
// de la misma lectura CRM; nunca se mezcla asistencia guardada con invitados vivos.
export async function cargarClasesPruebaTablero(centros, periodos, { query = sql, crm = crmCall, now = new Date() } = {}) {
  const lecturas = new Map()
  const crmCompartido = (accion, datos) => {
    const clave = JSON.stringify([accion, datos])
    if (!lecturas.has(clave)) lecturas.set(clave, crm(accion, datos))
    return lecturas.get(clave)
  }
  const entradas = await Promise.all(centros.map(async centro => {
    try {
      const fuente = await cargarClasesCrm(centro.id, { query, crm: crmCompartido })
      if (!fuente.complete) throw new Error('CRM no disponible')
      return [centro.id, resumenClasesPrueba({ clases: fuente.clases, semanaAbierta: periodos[centro.id].semanaAbierta, timeZone: zonaHorariaCentro(centro), now })]
    } catch {
      return [centro.id, { error: 'No se pudo consultar el CRM.' }]
    }
  }))
  return Object.fromEntries(entradas)
}
