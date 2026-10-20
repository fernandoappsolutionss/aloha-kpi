import { sql } from './db.js'
import { rangoSemana, semanaAbierta, zonaHorariaCentro } from './semana-cierre.mjs'
import { validarJuego } from './juegos-semana.mjs'

async function exigirSemanaActual(centroId, semanaFin, query, now) {
  rangoSemana(semanaFin)
  const [centro] = await query`SELECT pais FROM centros WHERE id=${centroId}`
  if (!centro || semanaFin !== semanaAbierta(now, zonaHorariaCentro(centro))) throw new Error('Solo puedes cambiar el juego de la semana en curso.')
}

export async function leerJuegoEn(centroId, semanaFin, { query = sql } = {}) {
  rangoSemana(semanaFin)
  const [juego] = await query`SELECT titulo, codigo, meta, participantes, reglas, premio, estado, version, aprobada_at FROM semana_juegos WHERE centro_id=${centroId} AND semana_fin=${semanaFin}`
  return juego || null
}

export async function guardarJuegoEn(centroId, semanaFin, datos, { query = sql, actorId, now = new Date() } = {}) {
  const juego = validarJuego(datos)
  await exigirSemanaActual(centroId, semanaFin, query, now)
  const filas = await query`INSERT INTO semana_juegos (centro_id, semana_fin, titulo, codigo, meta, participantes, reglas, premio, propuesta_por)
    SELECT ${centroId}, ${semanaFin}, ${juego.titulo}, ${juego.codigo}, ${juego.meta}, ${juego.participantes}, ${juego.reglas}, ${juego.premio}, ${actorId}
    WHERE ${juego.version} = 0 OR EXISTS (SELECT 1 FROM semana_juegos WHERE centro_id=${centroId} AND semana_fin=${semanaFin})
    ON CONFLICT (centro_id, semana_fin) DO UPDATE SET titulo=EXCLUDED.titulo, codigo=EXCLUDED.codigo, meta=EXCLUDED.meta,
      participantes=EXCLUDED.participantes, reglas=EXCLUDED.reglas, premio=EXCLUDED.premio, estado='propuesto',
      propuesta_por=EXCLUDED.propuesta_por, aprobada_por=NULL, aprobada_at=NULL, version=semana_juegos.version+1, updated_at=now()
    WHERE semana_juegos.version=${juego.version} RETURNING version`
  if (!filas.length) throw new Error('El juego cambió en otra sesión. Recarga antes de editarlo.')
  return await leerJuegoEn(centroId, semanaFin, { query })
}

export async function aprobarJuegoEn(centroId, semanaFin, version, { query = sql, actorId, now = new Date() } = {}) {
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('Recarga el juego antes de aprobar.')
  await exigirSemanaActual(centroId, semanaFin, query, now)
  const filas = await query`UPDATE semana_juegos SET estado='aprobado', aprobada_por=${actorId}, aprobada_at=now(), version=version+1, updated_at=now()
    WHERE centro_id=${centroId} AND semana_fin=${semanaFin} AND version=${version} AND estado='propuesto' RETURNING version`
  if (!filas.length) throw new Error('El juego cambió o ya fue aprobado. Recarga para revisar su versión actual.')
  return await leerJuegoEn(centroId, semanaFin, { query })
}
