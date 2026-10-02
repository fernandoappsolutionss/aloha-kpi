import { pathToFileURL } from 'node:url'
import { sql } from '../lib/db.js'
import { cargarEnv } from './migrate-caja.mjs'
import { CODIGOS_ESTADISTICA } from '../lib/estadisticas-semana/catalogo.mjs'
import { calcularSemanaCentro, guardarSemanaCentro } from '../lib/estadisticas-semana/servicio.js'
import { rangoSemana, semanaAbierta, sumarDias, zonaHorariaCentro } from '../lib/semana-cierre.mjs'

export function semanasParaBackfill(ultimaCerrada, desde = '2026-08-13') {
  rangoSemana(desde)
  if (desde < '2026-08-13') throw new Error('El backfill comienza el 2026-08-13.')
  const semanas = []
  for (let fecha = desde; fecha <= ultimaCerrada; fecha = sumarDias(fecha, 7)) semanas.push(fecha)
  return semanas
}

export async function runBackfill({ apply = false, centroId = null, desde = '2026-08-13', now = new Date(), query = sql, log = console.log } = {}) {
  rangoSemana(desde)
  const centros = centroId == null
    ? await query`SELECT id, nombre, pais FROM centros ORDER BY id`
    : await query`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  log(`Modo: ${apply ? 'aplicar' : 'solo lectura'} · desde ${desde}`)
  for (const centro of centros) {
    const ultimaCerrada = sumarDias(semanaAbierta(now, zonaHorariaCentro(centro)), -7)
    for (const semanaFin of semanasParaBackfill(ultimaCerrada, desde)) {
      const resultados = await calcularSemanaCentro(centro.id, semanaFin, { query, now })
      for (const codigo of CODIGOS_ESTADISTICA) log(`${centro.id}\t${centro.nombre}\t${semanaFin}\t${codigo}\t${resultados[codigo].valor ?? 'sin dato'}\t${resultados[codigo].detalle?.error || ''}`)
      if (apply) await guardarSemanaCentro(centro.id, semanaFin, resultados, { estado: 'cerrada', forzar: true, query })
    }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--apply' && !/^--centro=\d+$/.test(arg) && !/^--desde=\d{4}-\d{2}-\d{2}$/.test(arg))) {
    throw new Error('Uso: node scripts/backfill-estadisticas-semana.mjs [--apply] [--centro=id] [--desde=AAAA-MM-DD]')
  }
  cargarEnv()
  await runBackfill({ apply: args.includes('--apply'), centroId: args.find((arg) => arg.startsWith('--centro='))?.split('=')[1] ?? null, desde: args.find((arg) => arg.startsWith('--desde='))?.split('=')[1] ?? '2026-08-13' })
}
