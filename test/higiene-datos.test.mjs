import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  PATRON_BLOQUEA,
  PESOS_CONFIANZA,
  POR_QUE,
  etiquetaGrupo,
  fuerzaConfianzaBaja,
  higieneDeDatos,
  mesLargo,
} from '../lib/higiene-datos.mjs'

const leer = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const growth = ({ confidence = {}, window: ventana = {}, issues = [], months = [], operational = {} } = {}) => ({
  metrics: {
    confidence: { level: 'low', months: 6, completeness: 1, pipelineCoverage: 1, ...confidence },
    window: { expectedMonths: 6, months: 6, missingPeriods: [], ...ventana },
    issues,
    months,
  },
  operational: { capacityEstimate: { groups: 17, perGroup: 15, total: 255, verified: false }, ...operational },
})

const claves = (resultado) => resultado.puntos.map((punto) => punto.clave)
const punto = (resultado, clave) => resultado.puntos.find((item) => item.clave === clave)

test('enrollment warning distinguishes individual linkage from the monthly acquisition channel', () => {
  const resultado = higieneDeDatos({ centroId: 6, growth: growth({ issues: [{
    code: 'cp_classification_incomplete', severity: 'warning', period: '2026-09',
  }] }) })
  const aviso = punto(resultado, 'issue:cp_classification_incomplete')
  assert.match(aviso.titulo, /inscripciones/i)
  assert.match(aviso.accion, /septiembre de 2026/)
  assert.match(aviso.accion, /ficha/)
  assert.match(aviso.accion, /clase de prueba/)
  assert.match(aviso.accion, /canal de captación/)
  assert.deepEqual(aviso.items, ['Septiembre 2026'])
  assert.equal(aviso.donde.href, '/centro/6/grupos')
  assert.equal(aviso.bloquea, false)
})

test('un centro con todo cargado no dibuja nada', () => {
  const resultado = higieneDeDatos({ growth: growth(), centroId: 6 })
  assert.equal(resultado.hay, false)
  assert.equal(resultado.total, 0)
  assert.match(resultado.cierre, /completos para proyectar/)
})

test('sin payload del motor todavía se reclama lo que se puede ver en la base', () => {
  const resultado = higieneDeDatos({
    growth: null,
    centroId: 10,
    gruposSinFecha: [{ id: 1, numero: '4' }],
  })
  assert.equal(resultado.hay, true)
  assert.deepEqual(claves(resultado), ['grupos-sin-fecha'])
  assert.equal(resultado.confianza.techo, 'high', 'sin issue de capacidad no se puede afirmar el techo medio')
})

test('CALLE 50: una sola issue de conflicto basta para clavar la confianza en BAJA', () => {
  // Caso verificado en producción: completitud 1, pipeline 1, seis cierres, y
  // aun así LOW por `cp_enrollment_conflict` sin resolver.
  const resultado = higieneDeDatos({
    centroId: 3,
    growth: growth({
      issues: [{
        code: 'cp_enrollment_conflict', severity: 'warning', resolved: false,
        message: 'Matrícula de prueba declarada: 5; ventas clasificadas de prueba: 3.',
      }],
    }),
  })
  const conflicto = punto(resultado, 'issue:cp_enrollment_conflict')
  assert.ok(conflicto)
  assert.equal(conflicto.bloquea, true)
  assert.equal(resultado.bloqueantes, 1)
  assert.equal(conflicto.gananciaTexto, 'Mientras esté, la confianza queda en BAJA')
  assert.equal(conflicto.donde.href, '/centro/3/kpi')
  assert.match(resultado.cierre, /no puede ponerse en verde/)
  assert.equal(resultado.porQue, POR_QUE)
})

test('lo que bloquea va primero, y dentro de eso lo más corto', () => {
  const resultado = higieneDeDatos({
    centroId: 1,
    growth: growth({
      confidence: { months: 5, pipelineCoverage: 0.5 },
      window: { months: 5, missingPeriods: ['2026-08'] },
      issues: [
        { code: 'stock_balance', severity: 'error', message: 'junio no cuadra.' },
        { code: 'stock_balance', severity: 'error', message: 'julio no cuadra.' },
        { code: 'population_mismatch', severity: 'error', message: 'saldo 217 vs padrón 202.' },
        { code: 'capacity_unverified', severity: 'warning', message: 'capacidad sin verificar.' },
      ],
    }),
    alumnosSinInicio: [{ id: 949, nombre: 'Guadalupe Ponte', grupoNumero: null, alta: '2026-09-03' }],
    gruposSinFecha: [{ id: 7, numero: '25' }],
  })

  assert.deepEqual(claves(resultado), [
    'issue:population_mismatch', // bloquea, 1 mensaje
    'issue:stock_balance',       // bloquea, 2 mensajes
    'alumnos-sin-inicio',        // 10 puntos
    'cierres',                   // 7 puntos
    'grupos-sin-fecha',          // preventivo, 0 puntos
    'capacidad',                 // de Dirección: siempre al final
  ])
  assert.equal(resultado.bloqueantes, 2)
  assert.equal(resultado.confianza.techo, 'medium')
  assert.equal(punto(resultado, 'capacidad').dueno, 'direccion')
  assert.equal(punto(resultado, 'capacidad').gananciaTexto, 'Techo del sistema: no lo resuelve el centro')
})

test('cada punto dice cuánta confianza recupera, con la fórmula del motor', () => {
  const resultado = higieneDeDatos({
    centroId: 2,
    growth: growth({
      confidence: { months: 5, completeness: 0.8, pipelineCoverage: 0.5 },
      window: { months: 5, missingPeriods: ['2026-08'] },
      months: [{ year: 2026, month: 7, completeness: 0.75 }],
    }),
    alumnosSinInicio: [{ id: 882, nombre: 'Wilson Zuñiga', grupoNumero: null, alta: '2026-08-21' }],
  })
  // cobertura 0,5 → (1 − 0,5) × 0,2 = 10 puntos
  assert.equal(punto(resultado, 'alumnos-sin-inicio').gananciaPuntos, 10)
  // completitud 0,8 → (1 − 0,8) × 0,4 = 8 puntos
  assert.equal(punto(resultado, 'indicadores').gananciaPuntos, 8)
  // 5 de 6 cierres → (6/6 − 5/6) × 0,4 ≈ 7 puntos
  assert.equal(punto(resultado, 'cierres').gananciaPuntos, 7)
  assert.equal(punto(resultado, 'cierres').gananciaTexto, 'Recupera 7 puntos de confianza')
  assert.equal(resultado.recuperable, 25)
  assert.match(resultado.cierre, /se recuperan 25 puntos/)
  assert.match(punto(resultado, 'indicadores').items[0], /Julio 2026 · 2 de 8 indicadores sin cargar/)
})

test('los cierres traen el mes por nombre y el enlace al mes exacto', () => {
  const resultado = higieneDeDatos({
    centroId: 5,
    growth: growth({
      confidence: { months: 5 },
      window: { months: 5, missingPeriods: ['2026-05'] },
    }),
    mesesAbiertos: ['2026-05'],
  })
  const cierres = punto(resultado, 'cierres')
  assert.equal(cierres.titulo, '1 cierre de mes sin hacer')
  assert.deepEqual(cierres.items, ['Mayo 2026 · abierto, falta cerrarlo'])
  assert.deepEqual(cierres.enlaces, [{ texto: 'Mayo 2026', href: '/centro/5/kpi?year=2026&month=5' }])
})

test('un mes sin fila se distingue del mes abierto', () => {
  const resultado = higieneDeDatos({
    centroId: 5,
    growth: growth({ confidence: { months: 4 }, window: { months: 4, missingPeriods: ['2026-05', '2026-06'] } }),
    mesesAbiertos: ['2026-05'],
  })
  assert.deepEqual(punto(resultado, 'cierres').items, [
    'Mayo 2026 · abierto, falta cerrarlo',
    'Junio 2026 · sin datos cargados',
  ])
})

test('los nombres y los números llegan enteros a la pantalla', () => {
  const resultado = higieneDeDatos({
    centroId: 10,
    growth: growth(),
    alumnosSinInicio: [{ id: 889, nombre: 'Freanny Porras', grupoNumero: null, alta: '2026-08-24' }],
    gruposSinFecha: [{ id: 1, numero: '4' }, { id: 2, numero: 'KINDER 1A' }],
  })
  assert.equal(punto(resultado, 'alumnos-sin-inicio').items[0], 'Freanny Porras · sin grupo · alta 2026-08-24')
  assert.deepEqual(punto(resultado, 'grupos-sin-fecha').items, ['#4', 'KINDER 1A'])
  assert.equal(punto(resultado, 'grupos-sin-fecha').titulo, '2 grupos activos sin fecha de inicio de clases')
})

test('una issue sin ficha en el catálogo no se pierde: conserva el mensaje del motor', () => {
  const resultado = higieneDeDatos({
    centroId: 4,
    growth: growth({ issues: [{ code: 'codigo_nuevo_del_motor', severity: 'error', message: 'Algo que aún no traducimos.' }] }),
  })
  const desconocido = punto(resultado, 'issue:codigo_nuevo_del_motor')
  assert.ok(desconocido)
  assert.deepEqual(desconocido.items, ['Algo que aún no traducimos.'])
  assert.equal(desconocido.bloquea, true)
})

test('una issue ya resuelta no bloquea ni inventa trabajo', () => {
  assert.equal(fuerzaConfianzaBaja({ code: 'cp_enrollment_conflict', severity: 'warning', resolved: true }), false)
  assert.equal(fuerzaConfianzaBaja({ code: 'cp_classification_incomplete', severity: 'warning' }), false)
  assert.equal(fuerzaConfianzaBaja({ code: 'stock_balance', severity: 'error' }), true)
})

test('el resumen accesible cuenta lo que hay sin depender del color', () => {
  const resultado = higieneDeDatos({
    centroId: 1,
    growth: growth({ issues: [{ code: 'invalid_funnel', severity: 'error', message: 'embudo imposible.' }] }),
    gruposSinFecha: [{ id: 1, numero: '9' }],
  })
  assert.equal(resultado.resumen, 'Higiene de datos: 2 puntos por cargar en este centro, de los cuales 1 mantiene la confianza en baja.')
})

test('los tres detectores de continuidad son UN punto, no tres tarjetas', () => {
  // LOS NARANJOS en producción: `history_continuity` y `stock_discontinuity`
  // hablaban de los mismos meses en dos tarjetas distintas. La corrección es
  // una sola, así que el punto es uno solo.
  const resultado = higieneDeDatos({
    centroId: 10,
    growth: growth({
      issues: [
        { code: 'history_continuity', severity: 'error', message: 'El resumen de 2026-02 termina en 77 y 2026-03 empieza en 73.' },
        { code: 'stock_discontinuity', severity: 'error', message: 'El inicio de 2026-04 difiere del cierre anterior.' },
        { code: 'open_month_discontinuity', severity: 'error', message: 'El mes anterior sigue abierto.' },
      ],
    }),
  })
  assert.deepEqual(claves(resultado), ['issue:continuidad'])
  const continuidad = punto(resultado, 'issue:continuidad')
  assert.equal(continuidad.titulo, 'El mes no empieza donde terminó el anterior')
  assert.equal(continuidad.donde.href, '/centro/10/historial')
  assert.equal(continuidad.items.length, 3)
})

test('las issues con contador se redactan aquí: "1 fichas activas" no sale a pantalla', () => {
  const resultado = higieneDeDatos({
    centroId: 5,
    growth: growth({
      issues: [{
        code: 'active_students_in_blocked_groups', severity: 'warning', count: 1,
        message: '1 fichas activas siguen asignadas a grupos cerrados o fusionados.',
      }],
    }),
  })
  assert.deepEqual(
    punto(resultado, 'issue:active_students_in_blocked_groups').items,
    ['1 ficha activa en un grupo cerrado o fusionado'],
  )
})

test('sin contador manda el mensaje del motor, con su número dentro', () => {
  const resultado = higieneDeDatos({
    centroId: 5,
    growth: growth({
      issues: [{
        code: 'undated_current_movements', severity: 'error',
        message: '3 movimientos de este mes no tienen fecha diaria; falta conciliar los activos al día.',
      }],
    }),
  })
  assert.match(punto(resultado, 'issue:sin_fecha').items[0], /^3 movimientos de este mes no tienen fecha/)
})

test('CONDADO: cuando nada baja la confianza, no se promete recuperar cero', () => {
  const resultado = higieneDeDatos({
    centroId: 6,
    growth: growth({ confidence: { level: 'medium' } }),
    gruposSinFecha: [{ id: 3, numero: '3' }],
  })
  assert.equal(resultado.bloqueantes, 0)
  assert.equal(resultado.recuperable, 0)
  assert.equal(resultado.cierre, 'Nada de esto baja la confianza hoy: son los datos que evitan que vuelva a bajar el mes que viene.')
  assert.equal(resultado.confianza.texto, 'MEDIA')
})

test('etiquetas de mes y de grupo', () => {
  assert.equal(mesLargo('2026-01'), 'Enero 2026')
  assert.equal(mesLargo('2026-13'), '2026-13', 'un periodo inválido se muestra crudo, no se maquilla')
  assert.equal(etiquetaGrupo('66'), '#66')
  assert.equal(etiquetaGrupo('KINDER RAQUEL'), 'KINDER RAQUEL')
  assert.equal(etiquetaGrupo(null, 12), 'grupo id 12')
})

// La ganancia prometida y el "esto bloquea" se calculan con la fórmula de
// lib/growth/metrics.mjs, que no la exporta. Si allá cambia, aquí se estaría
// prometiendo un número falso: este test es el candado de esa duplicación.
test('los pesos y el patrón de bloqueo siguen siendo los del motor', () => {
  const motor = leer('../lib/growth/metrics.mjs')
  assert.match(
    motor,
    /\(historyScore \* 0\.4\) \+ \(completeness \* 0\.4\) \+ \(pipelineCoverage \* 0\.2\)/,
    'cambiaron los pesos de confianza en lib/growth/metrics.mjs: actualiza PESOS_CONFIANZA',
  )
  assert.deepEqual(PESOS_CONFIANZA, { historia: 0.4, completitud: 0.4, cobertura: 0.2 })
  assert.ok(
    motor.includes(PATRON_BLOQUEA.source),
    'cambió el patrón que fuerza confianza baja en lib/growth/metrics.mjs: actualiza PATRON_BLOQUEA',
  )
  assert.match(motor, /months >= 6 && completeness >= 0\.9 && pipelineCoverage >= 0\.9/)
})

// ── LOS DOS ESTADOS DEL CONFLICTO DE MATRÍCULA ──────────────────────────────

test('un conflicto YA RESUELTO no puede pedir que quites un override que no existe', () => {
  // En lib/growth/source.mjs el conflicto llega con `resolved: useDerived`, y
  // `useDerived = reliable && !hasOverride`. O sea que resolved:true significa
  // justamente que NO hay número forzado que quitar y que las ventas YA están
  // clasificadas. Verificado en producción: DAVID y LOS NARANJOS traían
  // resolved:true y la alerta les pintaba "Quita el número forzado o clasifica
  // las ventas que faltan" — una instrucción imposible de cumplir, y el punto
  // no se iba nunca. Es el papel tapiz que este módulo dice combatir.
  const conIssue = (resolved) => higieneDeDatos({
    centroId: 5,
    growth: growth({
      confidence: { level: 'medium' },
      issues: [{
        code: 'cp_enrollment_conflict', severity: 'warning', resolved, period: '2026-08',
        message: 'Matrícula de prueba declarada: 10; ventas clasificadas de prueba: 8.',
      }],
    }),
  })

  const resuelto = punto(conIssue(true), 'issue:cp_enrollment_conflict')
  assert.ok(resuelto)
  assert.equal(resuelto.bloquea, false, 'resuelto no clava la confianza en baja')
  assert.doesNotMatch(resuelto.accion, /Quita el número forzado/,
    'no hay override que quitar cuando el motor ya usó la cifra clasificada')
  assert.match(resuelto.accion, /cuadrar la matrícula de prueba declarada/)

  const vivo = punto(conIssue(false), 'issue:cp_enrollment_conflict')
  assert.equal(vivo.bloquea, true)
  assert.match(vivo.accion, /Quita el número forzado o clasifica las ventas que faltan/)

  // Y los dos casos se distinguen EN LA LÍNEA DEL MES: en un mismo punto puede
  // haber un mes resuelto y otro con override vivo, y antes se veían idénticos.
  assert.notEqual(resuelto.items[0], vivo.items[0])
  assert.match(resuelto.items[0], /ya usa la cifra clasificada/)
  assert.match(vivo.items[0], /pisa el cálculo/)
})

test('cuando sólo queda trabajo de Dirección, la sección se calma y no se contradice', () => {
  // `capacity_unverified` la empuja SIEMPRE lib/growth/source.mjs, así que la
  // lista NUNCA llega a cero para nadie. Un centro impecable salía con la caja
  // de aviso completa y un resumen que decía "0 puntos por cargar" bajo el
  // título "Lo que falta por cargar en este centro".
  const resultado = higieneDeDatos({
    centroId: 6,
    growth: growth({
      confidence: { level: 'medium' },
      issues: [{ code: 'capacity_unverified', severity: 'warning', message: 'capacidad sin verificar.' }],
    }),
  })
  assert.equal(resultado.hay, true, 'el punto se sigue diciendo: esconderlo sería mentir')
  assert.equal(resultado.total, 1)
  assert.equal(resultado.delCentro, 0)
  assert.equal(resultado.bloqueantes, 0)
  assert.equal(resultado.soloDireccion, true, 'la pantalla lo pinta en gris, sin borde de aviso')
  assert.doesNotMatch(resultado.resumen, /0 puntos por cargar/)
  assert.match(resultado.resumen, /no tiene nada pendiente por cargar; 1 punto depende de Dirección/)
  assert.equal(resultado.cierre, 'Lo que queda no lo resuelve el centro.')
  assert.equal(resultado.confianza.techo, 'medium')

  // Con trabajo del centro pendiente NO se calma: ahí sí hay algo que hacer.
  const conPendiente = higieneDeDatos({
    centroId: 6,
    gruposSinFecha: [{ id: 1, numero: '4' }],
    growth: growth({
      issues: [{ code: 'capacity_unverified', severity: 'warning', message: 'capacidad sin verificar.' }],
    }),
  })
  assert.equal(conPendiente.soloDireccion, false)
  assert.match(conPendiente.resumen, /^Higiene de datos: 1 punto por cargar en este centro\.$/)
  // Y sin nada de nada, ni siquiera capacidad, tampoco es "soloDireccion".
  assert.equal(higieneDeDatos({ growth: growth(), centroId: 6 }).soloDireccion, false)
})

test('el resumen accesible se RENDERIZA, no sólo se calcula', () => {
  // El comentario prometía que "la sección entera se resume en su aria-label" y
  // la sección sólo tenía aria-labelledby apuntando al h3. `higiene.resumen` se
  // calculaba y se testeaba pero no llegaba al documento: quien usa lector de
  // pantalla entraba sin saber cuántos puntos había ni cuántos bloqueaban.
  const componente = leer('../components/higiene/AlertaHigieneDatos.js')
  assert.match(componente, /\{higiene\.resumen\}/, 'el resumen tiene que ir en el documento')
  assert.match(componente, /higiene__resumen/)
  // Y el estado sereno llega al DOM para que el CSS pueda bajarle el tono.
  assert.match(componente, /higiene--sereno/)
  assert.match(componente, /data-higiene-sereno/)
  const estilos = leer('../app/globals.css')
  assert.match(estilos, /\.higiene--sereno \{ border-left-color: var\(--border-strong\); \}/)
  // El borde de la sección deja de decir ámbar cuando el contenido es rojo.
  assert.match(estilos, /\.higiene\[data-higiene-bloqueantes\]:not\(\[data-higiene-bloqueantes="0"\]\) \{\s*border-left-color: var\(--bad\);/)
  assert.match(estilos, /border-left: 6px solid var\(--warn\);\s*\n\s*border-radius: var\(--r\);/,
    'el borde de la higiene baja a 6px: no puede competir en peso con el semáforo')
})
