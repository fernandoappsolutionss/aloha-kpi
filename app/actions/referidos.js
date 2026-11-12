'use server'
import { sql } from '../../lib/db'
import { requireAlcanceGerencia, requireCentroAccess, requireCurrentMaster, requireCurrentWriteCentro } from '../../lib/auth'
import { crmAccountForCentro, centrosDeCuenta } from '../../lib/crm'
import { fallo } from '../../lib/errores'
import { isMaster } from '../../lib/current-user.mjs'
import { referidos, enviarWalletDe, baseUrl } from '../../lib/referidos'
import { CUENTAS, aCentavos, nombreCuenta } from '../../lib/referidos/reglas.mjs'
import { objetoGoogleDe } from '../../lib/referidos/wallet-google.mjs'

const POR_PAGINA = [10, 50, 100]

function cuentaDe(centroId) {
  const cuenta = crmAccountForCentro(centroId)
  if (!cuenta) throw new Error('Este centro no tiene cuenta de referidos.')
  return cuenta
}

// El miembro tiene que ser del país del centro que opera.
async function miembroDeCuenta(miembroId, cuenta) {
  const [m] = await sql`SELECT id FROM referidos_miembros WHERE id = ${Number(miembroId)} AND crm_account_id = ${cuenta}`
  if (!m) throw new Error('Miembro no encontrado.')
  return m.id
}

// Lista de miembros. Sin búsqueda: los que se inscribieron en este centro.
// Con búsqueda (nombre, teléfono o código): todo el país, porque una familia
// puede canjear en otro centro.
export async function listarMiembros(centroId, { q = '', pagina = 1, porPagina = 10, sinAbrir = false } = {}) {
  try {
    await requireCentroAccess(centroId)
    const cuenta = cuentaDe(centroId)
    const limite = POR_PAGINA.includes(Number(porPagina)) ? Number(porPagina) : 10
    const desde = (Math.max(1, Number(pagina) || 1) - 1) * limite
    const texto = String(q || '').trim().toLowerCase()
    const digitos = texto.replace(/\D/g, '')
    const filas = await sql`
      SELECT m.id, m.nombre, m.telefono, m.codigo, m.token, m.tarjeta_vista_at, ref.nombre AS referidor,
        (SELECT COALESCE(SUM(monto_cent), 0)::int FROM referidos_movimientos WHERE miembro_id = m.id) AS saldo_cent,
        (SELECT COUNT(*)::int FROM referidos_miembros x WHERE x.referidor_id = m.id) AS referidos,
        COUNT(*) OVER()::int AS total
      FROM referidos_miembros m
      LEFT JOIN referidos_miembros ref ON ref.id = m.referidor_id
      WHERE m.crm_account_id = ${cuenta}
        AND (${texto} <> '' OR EXISTS (SELECT 1 FROM referidos_registros r WHERE r.miembro_id = m.id AND r.centro_id = ${Number(centroId)}))
        AND (${texto} = '' OR lower(m.nombre) LIKE ${'%' + texto + '%'} OR m.codigo = ${texto}
          OR (${digitos} <> '' AND m.telefono_norm LIKE ${'%' + digitos + '%'}))
        AND (NOT ${Boolean(sinAbrir)} OR m.tarjeta_vista_at IS NULL)
      ORDER BY m.id DESC LIMIT ${limite} OFFSET ${desde}`
    return { miembros: filas, total: filas[0]?.total || 0, base: baseUrl() }
  } catch (e) { return fallo('listarMiembros', e) }
}

export async function detalleMiembro(centroId, miembroId) {
  try {
    await requireCentroAccess(centroId)
    const id = await miembroDeCuenta(miembroId, cuentaDe(centroId))
    const movimientos = await sql`
      SELECT mv.tipo, mv.monto_cent, mv.nota, mv.created_at, c.nombre AS centro
      FROM referidos_movimientos mv LEFT JOIN centros c ON c.id = mv.centro_id
      WHERE mv.miembro_id = ${id} ORDER BY mv.id DESC LIMIT 50`
    const suyos = await sql`SELECT nombre, created_at FROM referidos_miembros WHERE referidor_id = ${id} ORDER BY id DESC LIMIT 50`
    return { movimientos, referidos: suyos }
  } catch (e) { return fallo('detalleMiembro', e) }
}

export async function canjearSaldo(centroId, miembroId, { monto, nota, claveOp } = {}) {
  try {
    const sesion = await requireCurrentWriteCentro(centroId)
    const id = await miembroDeCuenta(miembroId, cuentaDe(centroId))
    const montoCent = aCentavos(monto)
    if (!montoCent) return { error: 'Escribe un monto mayor que cero, con hasta dos decimales.' }
    const r = await referidos.moverSaldo({ miembroId: id, tipo: 'canje', montoCent, nota, claveOp, centroId: Number(centroId), creadoPor: sesion?.uid ?? null })
    if (r.ok) await enviarWalletDe([id])
    return r
  } catch (e) { return fallo('canjearSaldo', e) }
}

// Solo después de verificar a la familia en el centro.
export async function reemitirTarjeta(centroId, miembroId) {
  try {
    await requireCurrentWriteCentro(centroId)
    const id = await miembroDeCuenta(miembroId, cuentaDe(centroId))
    const r = await referidos.reemitir(id, { objetoGoogle: objetoGoogleDe })
    return r.ok ? { ok: true, enlace: `${baseUrl()}/tarjeta/${r.token}` } : r
  } catch (e) { return fallo('reemitirTarjeta', e) }
}

// ── Gerencia ─────────────────────────────────────────────────────────────
export async function resumenReferidos() {
  try {
    const { sesion } = await requireAlcanceGerencia()
    const configs = await sql`SELECT *, to_char(activo_desde, 'YYYY-MM-DD') AS activo_desde FROM referidos_config`
    const totales = await sql`
      SELECT m.crm_account_id AS cuenta, COUNT(*)::int AS miembros,
        COUNT(*) FILTER (WHERE m.referidor_id IS NOT NULL)::int AS referidos,
        COUNT(*) FILTER (WHERE m.tarjeta_vista_at IS NOT NULL)::int AS tarjetas_abiertas
      FROM referidos_miembros m GROUP BY 1`
    const dinero = await sql`
      SELECT m.crm_account_id AS cuenta,
        COALESCE(SUM(mv.monto_cent) FILTER (WHERE mv.tipo LIKE 'bono%' OR mv.tipo = 'reverso'), 0)::int AS emitido_cent,
        COALESCE(-SUM(mv.monto_cent) FILTER (WHERE mv.tipo = 'canje'), 0)::int AS canjeado_cent,
        COALESCE(SUM(mv.monto_cent), 0)::int AS pendiente_cent
      FROM referidos_movimientos mv JOIN referidos_miembros m ON m.id = mv.miembro_id GROUP BY 1`
    const cuentas = CUENTAS.map((cuenta) => ({
      cuenta, nombre: nombreCuenta(cuenta),
      config: configs.find((c) => c.crm_account_id === cuenta) || null,
      ...(totales.find((t) => t.cuenta === cuenta) || { miembros: 0, referidos: 0, tarjetas_abiertas: 0 }),
      ...(dinero.find((d) => d.cuenta === cuenta) || { emitido_cent: 0, canjeado_cent: 0, pendiente_cent: 0 }),
      centroId: centrosDeCuenta(cuenta)[0] || null,
    }))
    return { cuentas, esMaster: isMaster(sesion) }
  } catch (e) { return fallo('resumenReferidos', e) }
}

export async function guardarConfigReferidos(cuenta, data = {}) {
  try {
    const sesion = await requireCurrentMaster()
    if (!CUENTAS.includes(cuenta)) return { error: 'Cuenta inválida.' }
    const montos = ['bono_clase_prueba', 'bono_referido_asiste', 'bono_referido_inscrito'].map((k) => {
      const texto = String(data[k] ?? '').trim()
      return texto === '' || Number(texto) === 0 ? 0 : aCentavos(texto)
    })
    if (montos.some((m) => m === null)) return { error: 'Los montos van en dólares, con hasta dos decimales.' }
    const desde = data.activo_desde || null
    if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) return { error: 'Fecha inválida.' }
    const activo = Boolean(data.activo)
    if (activo && !desde) return { error: 'Para encender, elige desde qué fecha de clase se paga.' }
    await sql`
      INSERT INTO referidos_config (crm_account_id, activo, activo_desde, bono_clase_prueba_cent, bono_referido_asiste_cent, bono_referido_inscrito_cent, updated_by, updated_at)
      VALUES (${cuenta}, ${activo}, ${desde}, ${montos[0]}, ${montos[1]}, ${montos[2]}, ${sesion?.uid ?? null}, now())
      ON CONFLICT (crm_account_id) DO UPDATE SET activo = EXCLUDED.activo, activo_desde = EXCLUDED.activo_desde,
        bono_clase_prueba_cent = EXCLUDED.bono_clase_prueba_cent, bono_referido_asiste_cent = EXCLUDED.bono_referido_asiste_cent,
        bono_referido_inscrito_cent = EXCLUDED.bono_referido_inscrito_cent, updated_by = EXCLUDED.updated_by, updated_at = now()`
    return { ok: true }
  } catch (e) { return fallo('guardarConfigReferidos', e) }
}

// Carga histórica de TODA la cuenta. Reanudable: si se corta por tiempo se
// vuelve a pulsar y sigue donde quedó.
export async function cargarHistoricos(cuenta) {
  try {
    await requireCurrentMaster()
    if (!CUENTAS.includes(cuenta)) return { error: 'Cuenta inválida.' }
    const limite = Date.now() + 240000
    const r = await referidos.correrCuenta(cuenta, { desdeDias: null, hasta: () => Date.now() > limite })
    if (r.ocupado) return { error: 'Ya hay una carga corriendo para este país. Espera un minuto.' }
    if (r.error) return { error: r.error }
    await enviarWalletDe(r.miembros)
    return { ok: true, eventos: r.eventos, importados: r.importados, completo: r.completo, movimientos: r.movimientos }
  } catch (e) { return fallo('cargarHistoricos', e) }
}

// Ajuste discrecional (solo el Master). No toca ningún bono y no puede dejar deuda.
export async function ajustarSaldo(centroId, miembroId, { monto, sentido, nota, claveOp } = {}) {
  try {
    const sesion = await requireCurrentMaster()
    const id = await miembroDeCuenta(miembroId, cuentaDe(centroId))
    const montoCent = aCentavos(monto)
    if (!montoCent) return { error: 'Escribe un monto mayor que cero.' }
    const r = await referidos.moverSaldo({ miembroId: id, tipo: 'ajuste', montoCent: sentido === 'restar' ? -montoCent : montoCent, nota, claveOp, creadoPor: sesion?.uid ?? null })
    if (r.ok) await enviarWalletDe([id])
    return r
  } catch (e) { return fallo('ajustarSaldo', e) }
}
