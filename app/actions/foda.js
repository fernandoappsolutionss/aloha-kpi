'use server'
import { sql, exec, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { hoyISO } from '../../lib/operaciones'
import { getCentroResumen } from './centro'
import { calculateCentroGrowth } from '../../lib/growth/server'
import { alertasCoachDesdeFilas, construirFoda, evaluarProductoFoda } from '../../lib/foda-datos.mjs'
import { consultarDesercionPorCoach, ventanaTrimestre } from '../../lib/desercion-coach.mjs'
import { getDisciplinaTrimestre } from './cumplimiento'

const Q_MESES = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

const CUADRANTES_VACIOS = { fortalezas: [], debilidades: [], oportunidades: [], amenazas: [] }

// Columnas de `foda` que escribe el guardado. La migración de este proyecto es
// manual (`npm run db:migrate`), así que una base que se creó antes de que se
// agregaran estas columnas se queda sin ellas y el INSERT revienta con 42703
// (undefined_column) — el SELECT del cargado sigue funcionando, por eso la
// página se ve bien y solo falla al guardar.
const FODA_COLUMNAS = [
  ['fortalezas', 'TEXT'],
  ['debilidades', 'TEXT'],
  ['oportunidades', 'TEXT'],
  ['amenazas', 'TEXT'],
  ['comentarios', 'TEXT'],
  ['comentario_estado', 'TEXT'],
  ['updated_at', 'TIMESTAMPTZ DEFAULT now()'],
]

async function agregarColumnasFaltantes() {
  for (const [col, tipo] of FODA_COLUMNAS) {
    await exec(`ALTER TABLE foda ADD COLUMN IF NOT EXISTS ${col} ${tipo}`)
  }
}

// Deserción por COACH del trimestre: se consume el módulo compartido en vez de
// repetir la consulta. La SQL vivía duplicada aquí y en lib/desercion-coach.mjs
// con los umbrales copiados a mano; mover uno dejaba al Resumen y al FODA
// contradiciéndose sobre la misma persona. Solo lectura.
async function desercionPorCoach(centroId, anio, trimestre) {
  const { mesDesde, mesHasta } = ventanaTrimestre(Number(trimestre))
  const { filas, sinCoach } = await consultarDesercionPorCoach(sql, {
    centroId: Number(centroId), anio: Number(anio), mesDesde, mesHasta,
  })
  return alertasCoachDesdeFilas(filas, { sinCoach })
}

// Disciplina del trimestre con su DENOMINADOR de meses. `mesesEsperados` es lo
// que compara lib/foda-datos.mjs para escribir "Cumplimiento a medio registrar":
// sin él, esa línea no se podía escribir nunca.
async function disciplinaDelTrimestre(centroId, anio, trimestre) {
  const d = await getDisciplinaTrimestre(centroId, anio, trimestre)
  return { ...d, mesesEsperados: (Q_MESES[trimestre] || [1, 2, 3]).length }
}

const finDeMes = (iso) => {
  const [y, m] = String(iso).split('-').map(Number)
  return `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

// Los 4 cuadrantes REDACTADOS DESDE LOS DATOS del trimestre. Nunca lanza: si
// una fuente falla, el FODA guardado se sigue pudiendo leer y editar; solo se
// queda sin la propuesta de ese cuadrante.
async function generarDesdeDatos(centroId, anio, trimestre) {
  const [resumen, growth, coach, disciplina] = await Promise.all([
    getCentroResumen(centroId, anio, trimestre).catch((e) => {
      console.error('[foda] no se pudo cargar el resumen del centro:', e)
      return null
    }),
    // persist:false — el FODA solo LEE la ruta de crecimiento; no escribe
    // snapshots ni recomendaciones por abrir la pantalla.
    calculateCentroGrowth(centroId, { persist: false }).catch((e) => {
      console.error('[foda] no se pudo calcular la ruta de crecimiento:', e)
      return null
    }),
    desercionPorCoach(centroId, anio, trimestre).catch((e) => {
      console.error('[foda] no se pudo calcular la deserción por coach:', e)
      return null
    }),
    // `resumen.disciplina` NUNCA existió: getCentroResumen no devuelve esa
    // clave, así que las tres líneas del FODA que dependían de ella —incluida
    // "Cumplimiento a medio registrar", justo la que impide que un trimestre a
    // medio llenar pase por cumplido— no se escribían jamás.
    disciplinaDelTrimestre(centroId, anio, trimestre).catch((e) => {
      console.error('[foda] no se pudo calcular la disciplina:', e)
      return null
    }),
  ])
  if (!resumen) return { ...CUADRANTES_VACIOS, disponible: false }

  const rs = resumen.rs || []
  const producto = evaluarProductoFoda({
    mesesCalc: resumen.meses || [],
    rs, ks: resumen.ks || [], metas: resumen.metas, trimestre,
  })
  const generado = construirFoda({
    producto,
    growth,
    coach,
    // `disciplina` la aporta el marcador de disciplina del Resumen cuando
    // exista; sin ella el FODA simplemente no escribe esas dos líneas.
    disciplina,
    graduacion: resumen.graduacion || null,
    motivos: { economico: rs.reduce((s, r) => s + Number(r.mot_economico || 0), 0) },
    fechaFinDeMes: finDeMes(hoyISO()),
    hoy: hoyISO(),
  })
  return {
    disponible: true,
    fortalezas: generado.fortalezas,
    debilidades: generado.debilidades,
    oportunidades: generado.oportunidades,
    amenazas: generado.amenazas,
    crecimiento: generado.crecimiento,
    monthlyNet: generado.monthlyNet,
    metasFallidas: producto.metasFallidas,
    coachEnAlerta: (coach?.alertas || []).length,
  }
}

// Carga el FODA guardado del trimestre + la propuesta escrita DESDE LOS DATOS
// (los cuatro cuadrantes, no solo dos). Lo guardado manda: la propuesta se
// usa como base cuando no hay texto, y como regeneración cuando la
// administradora la pide.
export async function loadFoda(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  const [row] = await sql`
    SELECT * FROM foda
    WHERE centro_id = ${centroId} AND anio = ${anio} AND trimestre = ${trimestre}
  `
  const generado = await generarDesdeDatos(centroId, anio, trimestre)
  return {
    foda: row || null,
    generado,
    // Compatibilidad con la firma anterior (2 cuadrantes derivados).
    vinculado: generado,
  }
}

export async function saveFoda(centroId, anio, trimestre, data) {
  try {
    await requireCentroAccess(centroId)
    const row = {
      centro_id: Number(centroId), anio: Number(anio), trimestre: Number(trimestre),
      fortalezas: data.fortalezas ?? null,
      debilidades: data.debilidades ?? null,
      oportunidades: data.oportunidades ?? null,
      amenazas: data.amenazas ?? null,
      comentarios: data.comentarios ?? null,
      comentario_estado: data.comentario_estado ?? null,
      updated_at: new Date().toISOString(),
    }
    const claves = ['centro_id', 'anio', 'trimestre']
    try {
      await upsert('foda', row, claves)
    } catch (e) {
      // 42703 = la tabla `foda` de esta base no tiene alguna de las columnas
      // editables. Se agregan (es idempotente) y se reintenta una vez, para no
      // depender de que alguien corra la migración a mano desde su equipo.
      if (e?.code !== '42703') throw e
      console.warn('[foda] faltaban columnas en la tabla foda; aplicando migración y reintentando')
      await agregarColumnasFaltantes()
      await upsert('foda', row, claves)
    }
    return { ok: true }
  } catch (e) {
    return fallo('saveFoda', e)
  }
}
