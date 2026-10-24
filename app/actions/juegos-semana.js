'use server'
import { requireCentroAccess, requireCurrentWriteCentro, requireCurrentCoordinacion } from '../../lib/auth.js'
import { puedeCerrarMes } from '../../lib/current-user.mjs'
import { leerJuegoEn, guardarJuegoEn, aprobarJuegoEn } from '../../lib/juegos-semana-servicio.js'
import { fallo } from '../../lib/errores.js'

export async function getJuegoSemana(centroId, semanaFin) {
  const sesion = await requireCentroAccess(centroId)
  if (sesion.rol === 'coach') throw new Error('No autorizado para este centro')
  return await leerJuegoEn(centroId, semanaFin)
}

export async function guardarJuegoSemana(centroId, semanaFin, datos) {
  try {
    const sesion = await requireCurrentWriteCentro(centroId)
    if (!puedeCerrarMes(sesion)) throw new Error('La propuesta del juego corresponde a la administradora o a coordinación.')
    return await guardarJuegoEn(centroId, semanaFin, datos, { actorId: sesion.id })
  } catch (e) { return fallo('guardarJuegoSemana', e) }
}

export async function aprobarJuegoSemana(centroId, semanaFin, version) {
  try {
    const sesion = await requireCurrentCoordinacion(centroId)
    return await aprobarJuegoEn(centroId, semanaFin, version, { actorId: sesion.id })
  } catch (e) { return fallo('aprobarJuegoSemana', e) }
}
