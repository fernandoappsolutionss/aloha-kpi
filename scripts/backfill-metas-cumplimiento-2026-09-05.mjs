// Backfill de las 3 metas de RESULTADO en `cumplimiento`
// (meta_nuevos_ingresos, meta_desercion, meta_cobranza).
//
// Por qué existe: esas 3 columnas son TEXTO ('si'/'no') que se marcó A MANO
// durante 110 filas, y desde esta rama ya NO se marcan: las calcula
// lib/marcadores.mjs desde la base y app/actions/cumplimiento.js las deriva en
// el servidor al guardar. La pantalla del centro pinta el valor CALCULADO, así
// que la marca vieja es invisible ahí — pero sigue viva en la base y sigue
// sumando en el % del panel del supervisor (app/actions/dashboard.js recorre
// los 33 CUMPLIMIENTO_KEYS). O sea: un 'si' viejo infla la "Disciplina" del
// panel sin que nadie lo vea. Esa es exactamente la forma del bug del 88%.
//
// El detector (lib/discrepancias-metas.mjs) AVISA de esas filas y no se calla
// hasta que coincidan. Este script es la única forma de que coincidan hacia
// atrás. Mismas funciones, misma definición de "marca": los dos leen el mundo
// igual, para que el aviso desaparezca exactamente cuando la fila se corrige.
//
//   node --env-file=.env.local scripts/backfill-metas-cumplimiento-2026-09-05.mjs
//     → DRY-RUN (por defecto). Recalcula P1/P2/P3 por (centro, año, trimestre)
//       con las MISMAS funciones que usa la pantalla (mesesProducto +
//       evaluarProducto) sobre resumen_mes + kpi_semanas + metas, IMPRIME UNA A
//       UNA las celdas que cambiaría con su evidencia numérica y escribe el
//       manifiesto en scripts/out/. NO ESCRIBE NADA.
//
//   node --env-file=.env.local scripts/backfill-metas-cumplimiento-2026-09-05.mjs --apply
//     → vuelve a imprimir el plan ANTES de tocar nada y aplica SOLO el
//       manifiesto del dry-run, en UNA transacción SERIALIZABLE: bloquea cada
//       fila (FOR UPDATE), RE-CALCULA la decisión en vivo y compara contra el
//       fingerprint del dry-run (CAS). Cualquier fila que haya cambiado bajo
//       los pies ⇒ ROLLBACK TOTAL. Al terminar RELEE la base y reimprime el
//       estado: cuántas discrepancias quedan y por qué.
//
// Reglas duras:
//   · Sólo se corrigen las filas que DISCREPAN y son VERIFICABLES.
//   · Una meta que NO se puede juzgar (P = null: trimestre sin datos, sin
//     población base, sin cobranza declarada) NO se escribe. "No se puede
//     saber" no es "no cumple": se deja el valor viejo y se reporta aparte.
//   · Una celda SIN marca explícita (NULL, vacío) tampoco se toca: no discrepa
//     nadie con nadie. Se cuenta y se dice, no se rellena.
//   · Sólo se tocan esas 3 columnas. Los 30 criterios de DISCIPLINA no se
//     rozan: son de la administradora.
//   · El verdicto es TRIMESTRAL (así lo escribe hoy la pantalla), y por eso los
//     3 meses de un trimestre reciben el mismo valor. Si algún día la meta pasa
//     a ser mensual, este script cambia con ella.
//
// Este script NO se ejecuta sin decisión explícita de Fernando.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { withTransaction } from '../lib/db.js'
import { CLAVES_PRODUCTO, evidenciaDeMeta, marca } from '../lib/discrepancias-metas.mjs'
// El evaluador vive ahora en lib/discrepancias-historico.mjs y lo comparten
// este script y el barrido que alimenta la alerta del panel. Dos criterios
// distintos harían que la alerta pidiera corregir algo que este script no
// corrige — y entonces el aviso no se iría nunca.
import { evaluarTrimestre } from '../lib/discrepancias-historico.mjs'

const APLICAR = process.argv.includes('--apply')
const AQUI = path.dirname(fileURLToPath(import.meta.url))
const SALIDA = path.join(AQUI, 'out', 'backfill-metas-cumplimiento-2026-09-05.json')

// Columna de la tabla ↔ verdicto de evaluarProducto. El orden y los nombres
// salen del módulo del detector para que no haya dos listas que mantener.
const CAMPO = { meta_nuevos_ingresos: 'P1', meta_desercion: 'P2', meta_cobranza: 'P3' }
const COLUMNAS = CLAVES_PRODUCTO.map((columna) => [columna, CAMPO[columna]])

const sql = neon(process.env.DATABASE_URL, { fetchOptions: { cache: 'no-store' } })

// Fingerprint del trimestre: si algo de esto cambia entre el dry-run y el
// --apply, el CAS falla y no se escribe nada. Incluye los números que
// sostienen el verdicto, no sólo el verdicto: así un cambio de meta o un
// cierre nuevo aborta en vez de escribir un valor que ya no es el auditado.
const fingerprint = (p) => JSON.stringify({
  P1: p.P1, P2: p.P2, P3: p.P3,
  ventasQ: p.ventasQ, metaQ: p.metaQ,
  peorDes: p.peorDesercion ? [p.peorDesercion.mesNum, Math.round(p.peorDesercion.pct * 100)] : null,
  peorCob: p.peorCobranza ? [p.peorCobranza.mesNum, p.peorCobranza.cobranza] : null,
  meses: p.mesesConDatos,
})

const evidenciaDe = (p, columna) =>
  evidenciaDeMeta(p.detalle.find((d) => d.clave === columna) || { clave: columna })

async function cargarTodo() {
  const query = sql
  const [centros, trimestres, cumplimiento, rsAll, ksAll, metasAll, estados] = await Promise.all([
    query`SELECT id, nombre FROM centros`,
    query`SELECT id, centro_id, anio, trimestre FROM trimestres`,
    query`SELECT trimestre_id, mes, meta_nuevos_ingresos, meta_desercion, meta_cobranza FROM cumplimiento`,
    query`SELECT * FROM resumen_mes`,
    query`SELECT * FROM kpi_semanas`,
    query`SELECT * FROM metas`,
    query`SELECT centro_id, year, month, estado FROM mes_kpi`,
  ])
  return { centros, trimestres, cumplimiento, rsAll, ksAll, metasAll, estados }
}

async function construirManifiesto(hoy) {
  const datos = await cargarTodo()
  const nombreDe = new Map(datos.centros.map((c) => [c.id, c.nombre]))
  const triById = new Map(datos.trimestres.map((t) => [t.id, t]))
  const cache = new Map()
  const cambios = []
  const sinJuzgar = []
  const sinMarca = []
  const huerfanas = []
  let coinciden = 0

  for (const fila of datos.cumplimiento) {
    const t = triById.get(fila.trimestre_id)
    if (!t) { huerfanas.push({ trimestre_id: fila.trimestre_id, mes: fila.mes }); continue }
    const clave = `${t.centro_id}|${t.anio}|${t.trimestre}`
    if (!cache.has(clave)) {
      cache.set(clave, evaluarTrimestre({
        centroId: t.centro_id, anio: Number(t.anio), trimestre: Number(t.trimestre), hoy, ...datos,
      }))
    }
    const p = cache.get(clave)
    for (const [columna, campo] of COLUMNAS) {
      const calculado = p[campo]
      // Misma definición de "marca" que el detector: NULL o vacío es SIN
      // MARCAR, no es un "no". Una celda sin marca no discrepa con nadie.
      const marcado = marca(fila[columna])
      const contexto = {
        centro: nombreDe.get(t.centro_id), anio: t.anio, trimestre: t.trimestre, mes: fila.mes, columna,
      }
      if (marcado === null) { sinMarca.push({ ...contexto, crudo: fila[columna] }); continue }
      if (calculado === null) {
        sinJuzgar.push({
          ...contexto, marcado,
          motivo: p.sinDatos ? 'trimestre sin datos' : 'meta no evaluable con los datos cargados',
        })
        continue
      }
      const valor = calculado ? 'si' : 'no'
      if (valor === marcado) { coinciden++; continue }
      cambios.push({
        ...contexto, centro_id: t.centro_id, trimestre_id: fila.trimestre_id,
        de: marcado, a: valor,
        evidencia: evidenciaDe(p, columna),
        fingerprint: fingerprint(p),
      })
    }
  }
  return { hoy, generado: new Date().toISOString(), cambios, sinJuzgar, sinMarca, huerfanas, coinciden }
}

// ── LO QUE VA A CAMBIAR, UNA POR UNA, ANTES DE TOCAR NADA ───────────────────
function imprimirPlan(manifiesto) {
  const porColumna = {}
  for (const c of manifiesto.cambios) porColumna[c.columna] = (porColumna[c.columna] || 0) + 1
  const orden = (c) => `${c.centro}|${c.anio}|${c.trimestre}|${c.mes}|${c.columna}`
  const lista = [...manifiesto.cambios].sort((a, b) => orden(a).localeCompare(orden(b)))

  console.log('\nCELDAS A CORREGIR (sólo las que discrepan y son verificables)')
  console.log('─'.repeat(100))
  for (const c of lista) {
    console.log(`  ${c.centro.padEnd(16)} ${c.anio}-Q${c.trimestre} m${c.mes}  ${c.columna.padEnd(21)} "${c.de}" → "${c.a}"`)
    console.log(`  ${' '.repeat(16)} ${' '.repeat(9)}  ${c.evidencia}`)
  }
  console.log('─'.repeat(100))
  console.log(`  celdas a corregir : ${manifiesto.cambios.length}`)
  console.log(`  por columna       : ${JSON.stringify(porColumna)}`)
  console.log(`  "si" → "no"       : ${manifiesto.cambios.filter((c) => c.de === 'si').length}`)
  console.log(`  "no" → "si"       : ${manifiesto.cambios.filter((c) => c.de === 'no').length}`)
  console.log(`  ya coincidían     : ${manifiesto.coinciden} (no se tocan)`)
  console.log(`  sin juzgar        : ${manifiesto.sinJuzgar.length} (no evaluables: se dejan como están)`)
  console.log(`  sin marca         : ${manifiesto.sinMarca.length} (NULL o vacío: no discrepan con nadie)`)
  console.log(`  filas huérfanas   : ${manifiesto.huerfanas.length}`)
}

async function aplicar(manifiesto, hoy) {
  const porTrimestre = new Map()
  for (const c of manifiesto.cambios) {
    const clave = `${c.trimestre_id}|${c.mes}`
    const grupo = porTrimestre.get(clave) || { ...c, columnas: {}, previos: {} }
    grupo.columnas[c.columna] = c.a
    grupo.previos[c.columna] = c.de
    porTrimestre.set(clave, grupo)
  }

  return withTransaction(async (query) => {
    const datos = {
      centros: await query`SELECT id, nombre FROM centros`,
      trimestres: await query`SELECT id, centro_id, anio, trimestre FROM trimestres`,
      rsAll: await query`SELECT * FROM resumen_mes`,
      ksAll: await query`SELECT * FROM kpi_semanas`,
      metasAll: await query`SELECT * FROM metas`,
      estados: await query`SELECT centro_id, year, month, estado FROM mes_kpi`,
    }
    const vivo = new Map()
    let escritas = 0

    for (const grupo of porTrimestre.values()) {
      // Bloquea la fila antes de decidir nada sobre ella.
      const [actual] = await query`
        SELECT trimestre_id, mes, meta_nuevos_ingresos, meta_desercion, meta_cobranza
        FROM cumplimiento
        WHERE trimestre_id = ${grupo.trimestre_id} AND mes = ${grupo.mes}
        FOR UPDATE
      `
      if (!actual) throw new Error(`CAS: la fila ${grupo.trimestre_id}/${grupo.mes} ya no existe`)

      const clave = `${grupo.centro_id}|${grupo.anio}|${grupo.trimestre}`
      if (!vivo.has(clave)) {
        vivo.set(clave, evaluarTrimestre({
          centroId: grupo.centro_id, anio: Number(grupo.anio), trimestre: Number(grupo.trimestre), hoy, ...datos,
        }))
      }
      const p = vivo.get(clave)
      if (fingerprint(p) !== grupo.fingerprint) {
        throw new Error(`CAS: ${grupo.centro} ${grupo.anio}-Q${grupo.trimestre} cambió desde el dry-run. Vuelve a correr el dry-run.`)
      }
      for (const [columna, esperado] of Object.entries(grupo.previos)) {
        if (marca(actual[columna]) !== esperado) {
          throw new Error(`CAS: ${grupo.centro} ${grupo.anio}-Q${grupo.trimestre} mes ${grupo.mes} · ${columna} ya no vale "${esperado}" (ahora "${actual[columna]}")`)
        }
      }
      // Sólo las 3 columnas de PRODUCTO. Los 30 criterios de disciplina, jamás.
      // Los `::text` no son adorno: un parámetro NULL sin tipo dentro de un
      // COALESCE tumba la sentencia con "could not determine data type".
      await query`
        UPDATE cumplimiento SET
          meta_nuevos_ingresos = COALESCE(${grupo.columnas.meta_nuevos_ingresos ?? null}::text, meta_nuevos_ingresos),
          meta_desercion       = COALESCE(${grupo.columnas.meta_desercion ?? null}::text, meta_desercion),
          meta_cobranza        = COALESCE(${grupo.columnas.meta_cobranza ?? null}::text, meta_cobranza),
          updated_at           = now()
        WHERE trimestre_id = ${grupo.trimestre_id} AND mes = ${grupo.mes}
      `
      escritas += Object.keys(grupo.columnas).length
    }
    return { filas: porTrimestre.size, celdas: escritas }
  })
}

const hoy = new Date().toISOString().slice(0, 10)

if (!APLICAR) {
  const manifiesto = await construirManifiesto(hoy)
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true })
  fs.writeFileSync(SALIDA, JSON.stringify(manifiesto, null, 2))
  console.log('DRY-RUN · no se escribió nada en la base.')
  imprimirPlan(manifiesto)
  console.log(`  manifiesto        : ${SALIDA}`)
  console.log('\nPara aplicarlo: vuelve a correr el script con --apply.')
  process.exit(0)
}

if (!fs.existsSync(SALIDA)) {
  console.error(`Falta el manifiesto del dry-run (${SALIDA}). Corre el script sin --apply primero.`)
  process.exit(1)
}
const manifiesto = JSON.parse(fs.readFileSync(SALIDA, 'utf8'))
console.log(`APLICAR · manifiesto del ${manifiesto.generado}. Esto es lo que va a cambiar:`)
imprimirPlan(manifiesto)

const resultado = await aplicar(manifiesto, hoy)
console.log(`\nAPLICADO en una transacción: ${resultado.celdas} celdas en ${resultado.filas} filas.`)

// ── ESTADO DESPUÉS ──────────────────────────────────────────────────────────
// No se declara victoria con el número que se pretendía escribir: se RELEE la
// base y se vuelve a comparar. Lo que quede aquí es exactamente lo que el
// detector va a seguir mostrando en pantalla.
const despues = await construirManifiesto(hoy)
console.log('\nESTADO DESPUÉS (releído de la base)')
console.log('─'.repeat(100))
console.log(`  celdas que coinciden      : ${despues.coinciden}`)
console.log(`  discrepancias que quedan  : ${despues.cambios.length}`)
for (const c of despues.cambios) {
  console.log(`    · ${c.centro} ${c.anio}-Q${c.trimestre} m${c.mes} ${c.columna}: "${c.de}" vs "${c.a}"`)
}
console.log(`  sin juzgar (no evaluables): ${despues.sinJuzgar.length} — el aviso las nombra aparte, no se corrigen`)
console.log(`  sin marca (NULL o vacío)  : ${despues.sinMarca.length}`)
console.log(despues.cambios.length === 0
  ? '\nLas dos fuentes coinciden: el aviso de discrepancia desaparece solo.'
  : '\nQuedan discrepancias: el aviso sigue en pantalla hasta que coincidan.')
