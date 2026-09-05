'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { alcancePanel } from '../../lib/alcance'
import { CUMPLIMIENTO_KEYS, disciplinaPct } from '../../lib/checklist'
import { CLAVES_PRODUCTO, clavesDisciplina } from '../../lib/discrepancias-metas.mjs'
import { barrerHistorico } from '../../lib/discrepancias-historico.mjs'
import { evaluarProducto, mesesProducto, normalizarMetas } from '../../lib/marcadores.mjs'
import { quarterMonths } from '../../lib/period'
import { hoyISO } from '../../lib/operaciones'
import { getCentroResumen } from './centro'

// Los 30 criterios que SÍ marca la administradora. Se derivan de la lista
// completa en vez de escribirse a mano: si mañana el checklist gana un
// criterio, entra solo; si gana una meta de resultado, se suma a
// CLAVES_PRODUCTO y queda fuera del formulario por construcción.
const CLAVES_DISCIPLINA = clavesDisciplina(CUMPLIMIENTO_KEYS)

async function ensureTrimestre(centroId, anio, trimestre) {
  const [t] = await sql`SELECT id FROM trimestres WHERE centro_id = ${centroId} AND anio = ${anio} AND trimestre = ${trimestre}`
  if (t) return t.id
  const [nt] = await sql`INSERT INTO trimestres (centro_id, anio, trimestre) VALUES (${centroId}, ${anio}, ${trimestre}) RETURNING id`
  return nt.id
}

export async function loadCumplimiento(centroId, anio, trimestre, mes) {
  await requireCentroAccess(centroId)
  const trimestreId = await ensureTrimestre(centroId, anio, trimestre)
  const [row] = await sql`SELECT * FROM cumplimiento WHERE trimestre_id = ${trimestreId} AND mes = ${mes}`
  // `existe` es el que mata el 88% fantasma: un mes SIN fila no es un mes con
  // 29 de 33 criterios cumplidos, es un mes sin registrar. La UI lo dibuja como
  // tal y el % del trimestre no lo cuenta en el denominador.
  if (!row) return { trimestreId, existe: false, vals: null }
  const vals = {}
  for (const k of CUMPLIMIENTO_KEYS) vals[k] = row[k] || 'no'
  return { trimestreId, existe: true, vals }
}

// Marcador 2 del trimestre: disciplina ponderada + cuántos meses hay realmente
// registrados. El denominador viaja siempre con el porcentaje para que
// "Disciplina 100%" no pueda leerse sin su "2 de 3 meses registrados".
export async function getDisciplinaTrimestre(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  const rows = await sql`
    SELECT cu.* FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.centro_id = ${centroId} AND t.anio = ${anio} AND t.trimestre = ${trimestre}
    ORDER BY cu.mes
  `
  return { ...disciplinaPct(rows), mesesRegistradosLista: rows.map((r) => Number(r.mes)) }
}

// ── LO QUE HAY GUARDADO EN LAS 3 METAS DE RESULTADO ─────────────────────────
// Se devuelve el valor CRUDO de la base, sin el `|| 'no'` de loadCumplimiento:
// un NULL disfrazado de "no" haría que el detector inventara una discrepancia
// que nadie marcó. Es la fuente "registro" de la comparación; la fuente
// "cálculo" la pone lib/marcadores.mjs.
export async function getMetasMarcadas(centroId, anio, trimestre) {
  await requireCentroAccess(centroId)
  const rows = await sql`
    SELECT cu.mes, cu.meta_nuevos_ingresos, cu.meta_desercion, cu.meta_cobranza
    FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.centro_id = ${centroId} AND t.anio = ${anio} AND t.trimestre = ${trimestre}
    ORDER BY cu.mes
  `
  return rows.map((r) => ({ ...r, mes: Number(r.mes) }))
}

// Lo mismo para TODOS los centros del alcance del panel: una sola consulta,
// sin motor de crecimiento. El supervisor compara estas filas contra el
// `producto` que ya trae getCentrosKpi, así que la comparación no vuelve a
// calcular nada ni puede discrepar del semáforo que está viendo al lado.
export async function getMetasMarcadasPanel(anio, trimestre) {
  const { centros } = await alcancePanel()
  const ids = centros.map((c) => Number(c.id))
  if (!ids.length) return []
  const rows = await sql`
    SELECT t.centro_id, cu.mes, cu.meta_nuevos_ingresos, cu.meta_desercion, cu.meta_cobranza
    FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
    WHERE t.anio = ${anio} AND t.trimestre = ${trimestre} AND t.centro_id = ANY(${ids}::int[])
    ORDER BY t.centro_id, cu.mes
  `
  return rows.map((r) => ({ ...r, centro_id: Number(r.centro_id), mes: Number(r.mes) }))
}

// ── TODAS LAS METAS GUARDADAS, DE TODOS LOS TRIMESTRES ─────────────────────
// La tarjeta del panel leía sólo el trimestre seleccionado, y ese trimestre
// sale de localStorage ('ts_period'), compartido con Panel, Ranking y Reporte.
// Con eso, cambiar de trimestre APAGABA la alerta sin corregir un solo dato —
// un descarte persistente en el navegador con otro nombre. Fernando: "la
// alerta debe mantenerse hasta que se corrijan los datos".
//
// Esta lectura no recibe año ni trimestre A PROPÓSITO: barre todo lo que tenga
// filas en `cumplimiento` dentro del alcance de quien mira. Sólo SELECT.
//
// ponytail: trae las tablas de apoyo enteras (resumen_mes, kpi_semanas, metas,
// mes_kpi) y evalúa en memoria, igual que el backfill. Techo: con muchos más
// centros habría que acotar por año. Salida: hoy son 6 centros y ~600 filas de
// kpi_semanas, y una sola consulta por tabla es más barata que un motor de
// crecimiento por trimestre — que es lo que costaría reusar getCentrosKpi.
export async function getDiscrepanciasHistoricas() {
  const { centros } = await alcancePanel()
  const ids = centros.map((c) => Number(c.id))
  if (!ids.length) {
    return { ...barrerHistorico({}), centrosMirados: 0 }
  }
  const [trimestres, cumplimiento, rsAll, ksAll, metasAll, estados] = await Promise.all([
    sql`SELECT id, centro_id, anio, trimestre FROM trimestres WHERE centro_id = ANY(${ids}::int[])`,
    sql`
      SELECT cu.trimestre_id, cu.mes, cu.meta_nuevos_ingresos, cu.meta_desercion, cu.meta_cobranza
      FROM cumplimiento cu JOIN trimestres t ON t.id = cu.trimestre_id
      WHERE t.centro_id = ANY(${ids}::int[])
    `,
    sql`SELECT * FROM resumen_mes WHERE centro_id = ANY(${ids}::int[])`,
    sql`SELECT * FROM kpi_semanas WHERE centro_id = ANY(${ids}::int[])`,
    sql`SELECT * FROM metas`,
    sql`SELECT centro_id, year, month, estado FROM mes_kpi WHERE centro_id = ANY(${ids}::int[])`,
  ])
  return barrerHistorico({
    centros, trimestres, cumplimiento, rsAll, ksAll, metasAll, estados, hoy: hoyISO(),
  })
}

// Las 3 metas de PRODUCTO, calculadas EN EL SERVIDOR por el mismo camino que
// la pantalla (getCentroResumen → mesesProducto → evaluarProducto). Devuelve
// sólo las que se pueden juzgar: una meta con verdicto `null` no se escribe.
//
// ponytail: se reutiliza getCentroResumen entero, que es caro (superposición
// viva, cuadro del mes abierto, conciliación del KPI automático) para lo que
// aquí hace falta. Es deliberado: es EXACTAMENTE la fuente que pinta la
// pantalla, y cualquier atajo que cargara menos podría escribir un verdicto
// distinto del que el usuario está viendo — que es el problema que estamos
// cerrando, no uno nuevo. Es además el mismo camino que la pantalla ya corre
// al abrirse, así que no estrena efectos: sólo los repite al guardar.
// Techo: un guardado tarda lo que tarda un resumen completo. Salida: extraer
// de getCentroResumen la parte "serie mensual del trimestre" y llamar sólo a
// eso desde aquí y desde la pantalla.
async function metasCalculadas(centroId, anio, trimestre) {
  const resumen = await getCentroResumen(centroId, anio, trimestre)
  if (!resumen || resumen.error) return null
  const mensual = mesesProducto({
    months: quarterMonths(trimestre), rs: resumen.rs, ks: resumen.ks, mesesCalc: resumen.meses,
  })
  const p = evaluarProducto({ meses: mensual, metas: normalizarMetas(resumen.metas), anio })
  if (p.sinDatos) return {}
  return Object.fromEntries(
    [['meta_nuevos_ingresos', p.P1], ['meta_desercion', p.P2], ['meta_cobranza', p.P3]]
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, v ? 'si' : 'no'])
  )
}

// LA PUERTA CERRADA.
//
// Antes esta acción escribía las 33 claves con `incoming?.[k] === 'si' ? 'si'
// : 'no'`. La pantalla ya mandaba las 3 de Producto calculadas, pero eso es
// cortesía del cliente, no una garantía: una server action es un endpoint
// HTTP, y cualquiera con acceso al centro podía mandar `meta_cobranza:'si'` en
// el cuerpo y auto-aprobarse la meta. Peor: si el cálculo fallaba, la pantalla
// no mandaba nada y el `'si'` viejo se RE-GUARDABA tal cual, así que la marca
// vieja tampoco se moría sola.
//
// Ahora las 3 claves de Producto se IGNORAN de `incoming` —no hay forma de
// escribirlas a mano desde ninguna parte— y se derivan aquí de la base. Si el
// cálculo no está disponible o la meta no es evaluable, la columna NO se toca:
// se conserva lo que hubiera, y el detector (lib/discrepancias-metas.mjs) lo
// reporta hasta que se corrija. Un valor viejo visible es mejor que un valor
// nuevo inventado.
export async function saveCumplimiento(centroId, anio, trimestre, mes, incoming) {
  await requireCentroAccess(centroId)
  const trimestreId = await ensureTrimestre(centroId, anio, trimestre)
  const row = { trimestre_id: trimestreId, mes }
  for (const k of CLAVES_DISCIPLINA) row[k] = incoming?.[k] === 'si' ? 'si' : 'no'

  let producto = null
  try {
    producto = await metasCalculadas(centroId, anio, trimestre)
  } catch (e) {
    console.error(`[saveCumplimiento] no se pudieron calcular las metas de ${centroId} ${anio}-Q${trimestre}:`, e)
  }
  for (const k of CLAVES_PRODUCTO) if (producto?.[k]) row[k] = producto[k]

  row.updated_at = new Date().toISOString()
  await upsert('cumplimiento', row, ['trimestre_id', 'mes'])
  // `metasEscritas` deja ver en la UI cuáles se derivaron y cuáles quedaron
  // como estaban: guardar no puede parecer que confirmó una meta que el
  // sistema no pudo juzgar.
  return { ok: true, metasEscritas: CLAVES_PRODUCTO.filter((k) => producto?.[k]) }
}
