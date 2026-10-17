'use server'
import { requireCurrentCaja } from '../../lib/auth'
import { isMaster } from '../../lib/current-user.mjs'
import { sql, withTransaction } from '../../lib/db'
import { hoyPanama } from '../../lib/caja/semanas.mjs'
import { puedeDirigirCaja, esDirectoraCaja, viernesCiclo } from '../../lib/caja/direccion.mjs'
import { persistirDireccion } from '../../lib/caja/direccion-repo.mjs'
import { getCaja } from './caja'

const fechaValida = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v
const fallo = e => ({ error: /^[0-9A-Z]{5}$/.test(String(e?.code || '')) ? 'No se pudo guardar o cargar el plan. Intenta de nuevo.' : e?.message || 'No se pudo completar la operación.' })
function validarConsulta(empresa, ciclo) {
  if (!['altavia','ff'].includes(empresa) || !fechaValida(ciclo) || viernesCiclo(ciclo) !== ciclo || ciclo > hoyPanama()) throw new Error('Empresa o viernes de cierre inválido.')
}
async function pendientesTotales(empresa) {
  const [r] = await sql`SELECT count(*)::int AS total FROM caja_movimientos m JOIN caja_cuentas c ON c.id=m.cuenta_id WHERE c.empresa=${empresa} AND m.clase='por_clasificar'`
  return r.total
}
export async function cargarDireccionCaja(empresa, ciclo) {
  try {
    const u = await requireCurrentCaja()
    validarConsulta(empresa,ciclo)
    const [[plan], eventos, ciclos, pendientes] = await Promise.all([
      sql`SELECT version,documento,cierre_at,lunes_at,updated_at FROM caja_direccion_ciclos WHERE empresa=${empresa} AND ciclo=${ciclo}::date`,
      sql`SELECT e.id,e.version,e.tipo,e.documento,e.foto,e.created_at,u.nombre AS autor FROM caja_direccion_eventos e LEFT JOIN usuarios u ON u.id=e.usuario_id WHERE e.empresa=${empresa} AND e.ciclo=${ciclo}::date ORDER BY e.version DESC LIMIT 30`,
      sql`SELECT to_char(ciclo,'YYYY-MM-DD') AS ciclo,cierre_at,lunes_at FROM caja_direccion_ciclos WHERE empresa=${empresa} ORDER BY ciclo DESC LIMIT 20`,
      pendientesTotales(empresa),
    ])
    return { plan: plan || null, eventos, ciclos, pendientes, puedeEditar: puedeDirigirCaja(u), master: isMaster(u), formacion: esDirectoraCaja(u) || isMaster(u), centroFormacion: u.centro_id || u.centros?.[0] || 1 }
  } catch(e) { return fallo(e) }
}
export async function guardarDireccionCaja(input) {
  try {
    const u = await requireCurrentCaja()
    if (!puedeDirigirCaja(u)) throw new Error('Solo Dirección Operativa y Master pueden registrar este plan.')
    validarConsulta(input?.empresa,input?.ciclo)
    if (!['guardar','cerrar_viernes','revisar_lunes'].includes(input.tipo)) throw new Error('Operación desconocida.')
    // Validación de forma antes de entrar a la base; la de autorización depende
    // de la versión anterior y se hace dentro de la transacción.
    const datos = await getCaja()
    if (datos.error) return datos
    const cuentas = datos.cuentas.filter(c => c.empresa === input.empresa)
    const pendientes = await pendientesTotales(input.empresa)
    const foto = { hoy: datos.hoy, curva: datos.curvas[input.empresa], resumen: datos.resumen[input.empresa], cuentas: cuentas.map(({numero,...c})=>c), pendientes }
    return await withTransaction(q => persistirDireccion(q,input,u,{ hoy: datos.hoy, cuentas, pendientes, foto }), { isolationLevel: 'ReadCommitted' })
  } catch(e) { return fallo(e) }
}
