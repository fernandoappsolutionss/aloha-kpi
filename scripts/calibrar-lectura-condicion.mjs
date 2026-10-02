import { pathToFileURL } from 'node:url'
import { sql } from '../lib/db.js'
import { cargarEnv } from './migrate-caja.mjs'
import { lecturaCondicion } from '../lib/condiciones/lectura.mjs'
import { sumarDias } from '../lib/semana-cierre.mjs'

const iso = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value)

export async function calibrarLectura({ query = sql, log = console.log } = {}) {
  const centros = await query`SELECT id, nombre FROM centros ORDER BY id`
  const porCondicion = {}
  const porCentro = {}
  for (const centro of centros) {
    const filas = await query`SELECT semana_fin, valor FROM estadisticas_semana
      WHERE centro_id = ${centro.id} AND codigo = 'ninos_activos' AND estado = 'cerrada'
      ORDER BY semana_fin`
    porCentro[centro.id] = {}
    if (!filas.length) continue
    const valores = new Map(filas.map((fila) => [iso(fila.semana_fin), fila.valor == null ? null : Number(fila.valor)]))
    const serie = []
    for (let fin = iso(filas[0].semana_fin); fin <= iso(filas.at(-1).semana_fin); fin = sumarDias(fin, 7)) {
      serie.push(valores.get(fin) ?? null)
      const ventana = serie.slice(-12)
      if (ventana.filter((v) => v != null).length < 4) continue
      const lectura = lecturaCondicion(ventana)
      if (!lectura.condicion) continue
      log(`${centro.id}\t${centro.nombre}\t${fin}\t${lectura.condicion}\t${lectura.motivo}`)
      porCondicion[lectura.condicion] = (porCondicion[lectura.condicion] || 0) + 1
      porCentro[centro.id][lectura.condicion] = (porCentro[centro.id][lectura.condicion] || 0) + 1
    }
  }
  log('Distribución por condición: ' + JSON.stringify(porCondicion))
  for (const centro of centros) log(`Distribución ${centro.id} ${centro.nombre}: ${JSON.stringify(porCentro[centro.id])}`)
  return { porCondicion, porCentro }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.length > 2) throw new Error('Uso: node scripts/calibrar-lectura-condicion.mjs')
  cargarEnv()
  await calibrarLectura()
}
