import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildNextEnvironment } from '../tests/e2e/helpers/next-server-env.mjs'
import { requireDisposableGate } from '../tests/e2e/helpers/r3-fixture.mjs'
import { createDialogLifetime } from '../components/dialog-lifetime.mjs'
import { hrefActivo } from '../components/nav-activo.mjs'
import { requireR6Gate } from '../tests/e2e/helpers/r6-fixture.mjs'
import { requireR8Gate } from '../tests/e2e/helpers/r8-fixture.mjs'
import { requireR9Gate } from '../tests/e2e/helpers/r9-fixture.mjs'

test('Tour mide viewport y tarjeta fuera de render', () => {
  const tour = read('../components/tour/TourHost.js')
  const start = tour.indexOf('if (!modulo || !step) return null')
  assert.ok(start > 0)
  assert.doesNotMatch(tour.slice(start), /window\.inner(?:Width|Height)|\.offsetHeight|getBoundingClientRect/)
})

test('R9 nunca registra Coach remoto ni artefactos privados y sus fixtures son exclusivas', () => {
  const env={E2E_R9_OPERATIONS:'1',E2E_DATABASE_CONFIRM:'disposable',DATABASE_URL:'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',USUARIOS_TEST_DATABASE_URL:'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',E2E_NEON_HTTP:'http://127.0.0.1:4446/sql',E2E_NEON_WSPROXY:'127.0.0.1:5435',SESSION_SECRET:'dummy-session'}
  assert.doesNotThrow(()=>requireR9Gate(env))
  for(const override of [{RESPONSIVE_BASE_URL:'https://remote.invalid'},{E2E_R3_DIALOGS:'1'},{E2E_R8_CENTER_CORE:'1'},{E2E_R6_COMPARISONS:'1'},{E2E_RUN_MUTATIONS:'1'},{E2E_CENTRO_ID:'3'}]) assert.throws(()=>requireR9Gate({...env,...override}))
  const inspect=(env,expression)=>JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',`import('./playwright.config.mjs').then(({default:c})=>console.log(JSON.stringify(${expression})))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',env}))
  assert.equal(inspect({RESPONSIVE_BASE_URL:'https://remote.invalid'},"c.projects.find(p=>p.name==='phone-390').testIgnore.test('center-operations.spec.js')"),true)
  const c=inspect(env,'({workers:c.workers,preserve:c.preserveOutput,projects:c.projects})')
  assert.equal(c.workers,1);assert.equal(c.preserve,'never')
  assert.ok(c.projects.every(p=>p.use.trace==='off'&&p.use.screenshot==='off'&&p.use.video==='off'))
})

test('R8 mantiene fixture, autenticación propia y rutas escritoras fuera del gate remoto', () => {
  const env = { E2E_R8_CENTER_CORE:'1', E2E_DATABASE_CONFIRM:'disposable', DATABASE_URL:'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2', USUARIOS_TEST_DATABASE_URL:'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2', E2E_NEON_HTTP:'http://127.0.0.1:4446/sql', E2E_NEON_WSPROXY:'127.0.0.1:5435', SESSION_SECRET:'dummy-long-session' }
  assert.doesNotThrow(()=>requireR8Gate(env))
  for (const overrides of [{RESPONSIVE_BASE_URL:'https://remote.invalid'},{E2E_R3_DIALOGS:'1'},{E2E_R6_COMPARISONS:'1'},{E2E_RUN_MUTATIONS:'1'},{E2E_DATABASE_CONFIRM:''}]) assert.throws(()=>requireR8Gate({...env,...overrides}))
  const inspect = (env, expression) => JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',`import('./playwright.config.mjs').then(({default:c})=>console.log(JSON.stringify(${expression})))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',env}))
  const local = inspect(env,'({workers:c.workers,projects:c.projects.map(p=>({name:p.name,storage:p.use?.storageState}))})')
  assert.equal(local.workers,1)
  assert.equal(local.projects.length,8)
  assert.ok(local.projects.slice(1).every(p=>p.storage === 'tests/e2e/.auth/r8-center.json'))
  assert.equal(inspect({RESPONSIVE_BASE_URL:'https://remote.invalid'},"c.projects.find(p=>p.name==='phone-390').testIgnore.test('center-core.spec.js')"),true)
})

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('R10 FODA confirma descartes y borrados mediante Dialog accesible',()=>{
  for(const path of ['PeticionesList','PeticionDraftForm','CotizacionCard']) {
    const source=read(`../components/foda/${path}.js`)
    assert.match(source, /<Dialog/,path)
    assert.doesNotMatch(source,/\bconfirm\(/,path)
  }
})

// PERMANENCIA DE LAS ALERTAS. Fernando: "la alerta debe mantenerse hasta que se
// corrijan los datos, y la del coach también". Una alerta con botón de cerrar
// está cerrada el primer día y nadie corrige nada; una que recuerda su descarte
// en el navegador es lo mismo con más pasos. Las dos sólo pueden desaparecer
// porque el dato que las levantó ya no está: eso se logra dibujándolas desde
// una función pura sobre los datos y sin ningún estado de "visto".
const sinComentarios = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('R10 las alertas de higiene y de coach no se pueden descartar', () => {
  // Se miran los comentarios fuera: los dos archivos EXPLICAN esta regla en
  // prosa, y un test que se rompe porque el código está bien documentado no
  // vigila nada.
  const codigo = (path) => sinComentarios(read(path))
  for (const path of [
    '../components/higiene/AlertaHigieneDatos.js',
    '../components/coach/AlertaDesercionCoach.js',
    // Las dos de discrepancia de metas faltaban en este bucle, y la frase de
    // Fernando que este test cita ("la alerta debe mantenerse hasta que se
    // corrijan los datos") era sobre ÉSAS. Hoy no tienen botón ni
    // localStorage; sin esta línea, mañana podían tenerlos con los tests en
    // verde.
    '../components/AvisoDiscrepanciaMetas.js',
    '../components/AvisoDiscrepanciaHistorico.js',
  ]) {
    const source = codigo(path)
    assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/, `${path}: no puede recordar un descarte`)
    assert.doesNotMatch(source, /<button/, `${path}: una alerta permanente no lleva control de cierre`)
    assert.doesNotMatch(source, /descart|dismiss|ocultar|snooze/i, `${path}: sin afordancia de descarte`)
  }

  // El aviso pegado a cada meta vive dentro de la pantalla de Cumplimiento, que
  // sí tiene botones (Guardar, pestañas, el checklist). Se aísla la función.
  const pagina = sinComentarios(read('../app/centro/[id]/cumplimiento/page.js'))
  const desde = pagina.indexOf('function AvisoDiscrepancia(')
  assert.ok(desde > 0, 'la pantalla de Cumplimiento debe seguir dibujando el aviso de discrepancia')
  const aviso = pagina.slice(desde, pagina.indexOf('\nfunction ', desde + 1))
  assert.doesNotMatch(aviso, /localStorage|sessionStorage|document\.cookie/, 'AvisoDiscrepancia: no puede recordar un descarte')
  assert.doesNotMatch(aviso, /<button/, 'AvisoDiscrepancia: sin control de cierre')
  assert.doesNotMatch(aviso, /descart|dismiss|ocultar|snooze/i, 'AvisoDiscrepancia: sin afordancia de descarte')
  // Y dice cómo se corrige: una alerta que no se puede descartar y no dice qué
  // hacer es una condena, no un aviso.
  assert.match(aviso, /Guardar/, 'AvisoDiscrepancia: tiene que decir cómo se corrige')
})

test('R10 el histórico de discrepancias no depende del trimestre seleccionado', () => {
  // CAMBIAR DE TRIMESTRE NO PUEDE APAGAR LA ALERTA. El selector guarda el
  // período en localStorage ('ts_period') y lo comparten Panel, Ranking,
  // Reporte y la pantalla del centro: una alerta que sólo mira ese trimestre se
  // apaga sin corregir un dato, que es un descarte persistente con otro nombre.
  const historico = sinComentarios(read('../components/AvisoDiscrepanciaHistorico.js'))
  assert.doesNotMatch(historico, /readStoredPeriod|getCurrentPeriod|period|quarter|trimestre=/i,
    'el histórico no puede recibir ni leer un período')
  assert.match(historico, /getDiscrepanciasHistoricas\(\)/, 'barre todos los trimestres, sin argumentos')

  // Y la página lo monta SIEMPRE, fuera del `!loading && !error` del trimestre.
  const alertas = sinComentarios(read('../app/dashboard/alertas/page.js'))
  assert.match(alertas, /<AvisoDiscrepanciaHistorico \/>/, 'la página tiene que montarlo sin props')

  // La lectura del trimestre ya no se traga en silencio: un fallo se ve
  // distinto de "no hay nada".
  assert.doesNotMatch(alertas, /getMetasMarcadasPanel\([^)]*\)\.catch\(\(\) => \[\]\)/,
    'un catch que devuelve [] hace desaparecer la tarjeta sin decir nada')
  assert.match(alertas, /errorMetas/, 'el fallo de lectura tiene que llegar a la pantalla')
})

test('R10 reportes conservan un main identificado y estados recuperables', () => {
  for (const path of ['cuadro','cumplimiento','foda','historial','entrenamiento','entrenamiento/[modulo]']) {
    const source = read(`../app/centro/[id]/${path}/page.js`)
    assert.match(source, /id="main-content"/, path)
    assert.match(source, /data-page-state=/, path)
    assert.match(source, /role="alert"/, path)
    assert.match(source, /Reintentar/, path)
  }
})

test('R7 no registra mutaciones remotas ni genera artefactos con enlaces de invitación', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const config = env => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', "import('./playwright.config.mjs').then(({default:c})=>console.log(JSON.stringify({projects:c.projects,reporter:c.reporter})))"], { cwd, encoding: 'utf8', env }))
  const remote = config({ RESPONSIVE_BASE_URL: 'https://readonly.invalid', E2E_RUN_MUTATIONS: '1' })
  assert.equal(remote.projects.some(p => p.name === 'users-mutations-local'), false)
  const local = config({ E2E_RUN_MUTATIONS: '1', E2E_DATABASE_CONFIRM: 'disposable', USUARIOS_TEST_DATABASE_URL: 'postgres://fixture:fixture@db.invalid:5432/fixture', E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql', E2E_NEON_WSPROXY: '127.0.0.1:5435', SESSION_SECRET: 'dummy-long-session-secret' })
  const mutant = local.projects.find(p => p.name === 'users-mutations-local')
  assert.deepEqual([mutant.use.trace, mutant.use.screenshot, mutant.use.video], ['off', 'off', 'off'])
  assert.deepEqual(local.reporter, [['line']])
})

export const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/set-password']
export const AUTH_ACCOUNT_ROUTES = ['/perfil']

export const PRODUCT_ROUTE_FILES = ['app/page.js','app/login/page.js','app/forgot-password/page.js','app/set-password/page.js','app/perfil/page.js','app/dashboard/page.js','app/dashboard/alertas/page.js','app/dashboard/centros/page.js','app/dashboard/crecimiento/page.js','app/dashboard/entrenamiento/page.js','app/dashboard/entrenamiento/oficio/page.js','app/dashboard/historial/page.js','app/dashboard/metas/page.js','app/dashboard/ranking/page.js','app/dashboard/reporte/page.js','app/dashboard/usuarios/page.js','app/dashboard/zoho/page.js','app/centro/[id]/page.js','app/centro/[id]/cuadro/page.js','app/centro/[id]/cumplimiento/page.js','app/centro/[id]/entrenamiento/page.js','app/centro/[id]/entrenamiento/[modulo]/page.js','app/centro/[id]/entrenamiento/firmas/page.js','app/centro/[id]/entrenamiento/oficio/page.js','app/centro/[id]/entrenamiento/oficio/[modulo]/page.js','app/centro/[id]/entrenamiento/oficio/[modulo]/sop/page.js','app/centro/[id]/entrenamiento/oficio/glosario/page.js','app/centro/[id]/eventos/page.js','app/centro/[id]/foda/page.js','app/centro/[id]/grupos/page.js','app/centro/[id]/historial/page.js','app/centro/[id]/kpi/page.js','app/centro/[id]/ruta-nivel/page.js','app/coach/[token]/page.js']
export const NON_PRODUCT_ROUTE_FILES = ['app/e2e-primitives/page.js']
test('R10 inventario local completo: 34 producto y una técnica, sin duplicados', () => {
  const all = [...PRODUCT_ROUTE_FILES,...NON_PRODUCT_ROUTE_FILES]
  assert.equal(PRODUCT_ROUTE_FILES.length,34)
  assert.equal(NON_PRODUCT_ROUTE_FILES.length,1)
  assert.equal(new Set(all).size,35)
  const actual = readdirSync(new URL('../app/',import.meta.url),{recursive:true}).map(String).filter(p=>p==='page.js'||p.endsWith('/page.js')).map(p=>`app/${p}`)
  assert.deepEqual(all.sort(),actual.sort())
})
// La regla de "nada por debajo de 12px" solo miraba px, así que se esquivaba
// escribiendo rem: 0.74rem son 11,8 px y pasaban. Esto la cierra.
// 0.75rem = 12px con la raíz en 16, que es el piso de tests/e2e/helpers/audit-page.js.
const REM_ILEGIBLE = /font(?:Size|-size):\s*['"]?0\.(?:[0-6]\d*|7(?:[0-4]\d*)?)(?:rem|em)\b/g
// ÚNICA excepción, y nombrada: el facsímil A4 de la hoja SOP. Eso no es texto
// de pantalla, es la foto de un papel de 210 mm; debajo de 900 px deja de
// dibujarse y el mismo contenido fluye con --mobile-body (app/globals.css).
// El selector de la regla que envuelve la posición i: se busca el '{' que abre
// el bloque y se lee hacia atrás hasta el final de la regla anterior.
const selectorDe = (source, i) => {
  const antes = source.slice(0, i)
  const abre = antes.lastIndexOf('{')
  if (abre < 0) return ''
  const cabecera = antes.slice(0, abre)
  const corte = Math.max(cabecera.lastIndexOf('}'), cabecera.lastIndexOf('{'), cabecera.lastIndexOf(';'))
  return cabecera.slice(corte + 1).trim()
}
test('R10 barrido global no conserva fuentes ilegibles ni interacciones no semánticas', () => {
  const violations=[]
  const pattern = /transition:\s*all|overflowX:\s*['"]visible|<(?:div|span|tr|td)\b[^>]*onClick|font(?:Size|-size):\s*['"]?(?:8|9|10|11)(?:\.\d+)?(?:px)?(?=[^\d.]|$)/g
  for(const root of ['app','components']) for(const path of readdirSync(new URL(`../${root}/`,import.meta.url),{recursive:true})) {
    if(!/\.(?:js|css)$/.test(path)) continue
    const source = read(`../${root}/${path}`)
    for(const match of source.matchAll(pattern)) violations.push(`${root}/${path}:${source.slice(0,match.index).split('\n').length}: ${match[0]}`)
    for(const match of source.matchAll(REM_ILEGIBLE)) {
      if(/\.sop-/.test(selectorDe(source,match.index))) continue
      violations.push(`${root}/${path}:${source.slice(0,match.index).split('\n').length}: ${match[0]} (por debajo de 0.75rem = 12px)`)
    }
  }
  assert.deepEqual(violations,[])
  for(const path of readdirSync(new URL('../tests/e2e/',import.meta.url))) {
    if(!path.endsWith('.spec.js'))continue
    assert.doesNotMatch(read('../tests/e2e/'+path),/disableRules\(\[.*color-contrast/,path)
  }
})

test('R6 limita fixture y Growth automático a base local y modos exclusivos', () => {
  const env = { E2E_R6_COMPARISONS: '1', E2E_DATABASE_CONFIRM: 'disposable', DATABASE_URL: 'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2', USUARIOS_TEST_DATABASE_URL: 'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2', E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql', E2E_NEON_WSPROXY: '127.0.0.1:5435' }
  assert.doesNotThrow(() => requireR6Gate(env))
  for (const overrides of [{ RESPONSIVE_BASE_URL: 'https://remote.invalid' }, { E2E_R3_DIALOGS: '1' }, { E2E_RUN_MUTATIONS: '1' }, { E2E_NEON_HTTP: 'https://remote.invalid/sql' }, { E2E_DATABASE_CONFIRM: '' }, { DATABASE_URL: 'postgres://remote.invalid/db' }]) assert.throws(() => requireR6Gate({ ...env, ...overrides }))
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', "import('./playwright.config.mjs').then(({default:c})=>console.log(JSON.stringify(c.projects.filter(p=>p.name.startsWith('phone-')).map(p=>p.testIgnore.test('dashboard-comparisons.spec.js')))))"], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(output), [true, true, true, true])
})

test('R6 declara estados, regiones y guarda fresca del layout administrativo', () => {
  for (const name of ['crecimiento', 'historial', 'entrenamiento']) {
    const source = read(`../app/dashboard/${name}/page.js`)
    assert.match(source, /id="main-content"/)
    assert.match(source, /data-page-state=/)
    assert.match(source, /role="status"/)
    assert.match(source, /role="alert"/)
    assert.doesNotMatch(source, /router\.push|overflowX:/)
  }
  const layout = read('../app/dashboard/entrenamiento/layout.js')
  assert.match(layout, /getNavigationContext\(\)/)
  assert.match(layout, /viewAdminTraining/)
  assert.match(layout, /force-dynamic/)
})

test('R5 oculta SVG decorativos de KPI, avisos, tendencias y exportación al lector de pantalla', () => {
  for (const path of ['page.js', 'reporte/page.js']) {
    const icons = read(`../app/dashboard/${path}`).match(/<svg\b[^>]*>/g) || []
    assert.ok(icons.length > 0, `${path}: fixture de iconos existente`)
    assert.equal(icons.every(icon => /aria-hidden="true"/.test(icon)), true, `${path}: SVG decorativo sin aria-hidden`)
  }
})

test('R5 permite que los títulos vacíos hereden el mínimo móvil de 15px', () => {
  for (const [path, text] of [['ranking/page.js', 'Aún no hay datos para clasificar'], ['alertas/page.js', 'No hay alertas todavía']]) {
    const source = read(`../app/dashboard/${path}`)
    const tag = source.match(new RegExp(`<div[^>]*>${text}</div>`))?.[0]
    assert.ok(tag, `${path}: rama vacía existente`)
    assert.doesNotMatch(tag, /fontSize:\s*1[0-4](?:\.\d+)?\b/, `${path}: inline impide heredar 15px móvil`)
    assert.match(source, /className="main operations-page"/, `${path}: hereda el mínimo móvil operativo`)
  }
})

test('operación administrativa declara estados explícitos y tablas con alternativas móviles', () => {
  for (const path of ['page.js', 'ranking/page.js', 'alertas/page.js', 'reporte/page.js', 'metas/page.js', 'centros/page.js', 'zoho/page.js']) {
    const source = read(`../app/dashboard/${path}`)
    assert.match(source, /id="main-content"/, path)
    assert.match(source, /data-page-state=/, path)
    assert.match(source, /role="alert"|role=\{.*'alert'/, path)
    assert.doesNotMatch(source, /catch\(\(\) => \{\}\)/, path)
  }
  for (const path of ['page.js', 'ranking/page.js', 'reporte/page.js', 'centros/page.js']) {
    const source = read(`../app/dashboard/${path}`)
    assert.match(source, /<TableScroller/, path)
    assert.match(source, /<OperationalCard/, path)
    assert.match(source, /<caption/, path)
    assert.doesNotMatch(source, /overflowX:\s*['"]auto/, path)
  }
})

test('auditoría R5 separa actor coordinador y no entra en los modos mutantes', () => {
  const script = `import('./playwright.config.mjs').then(({default:c}) => {
    const admin = c.projects.find(p=>p.name==='phone-390');
    const coord = c.projects.find(p=>p.name==='coordinator-audit');
    console.log(JSON.stringify([!admin.testIgnore.test('dashboard-operations.spec.js'), admin.grepInvert.test('@coordinator'), coord.testMatch.test('dashboard-operations.spec.js'), coord.grep.test('coordinator-audit dashboard-operations.spec.js @coordinator acceso'), !coord.grep.test('coordinator-audit dashboard-operations.spec.js lectura'), coord.grep.test('coordinator-audit users-coordinator.spec.js acceso')]));
  })`
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
    env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(output), [true, true, true, true, true, true])
})

test('respuesta tardía de una instancia desmontada no cierra el diálogo nuevo del mismo dueño', async () => {
  let surface = 'primera'
  let resolveSave
  const pending = new Promise((resolve) => { resolveSave = resolve })
  const oldInstance = createDialogLifetime()
  const completion = pending.then(oldInstance.guard(() => { surface = null }))
  oldInstance.dispose()
  surface = 'segunda'
  const currentInstance = createDialogLifetime()
  resolveSave()
  await completion
  assert.equal(surface, 'segunda')
  currentInstance.guard(() => { surface = null })()
  assert.equal(surface, null)
})

test('fixture R3 rechaza transporte remoto antes de cualquier consulta', () => {
  const env = { E2E_R3_DIALOGS: '1', E2E_DATABASE_CONFIRM: 'disposable',
    DATABASE_URL: 'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',
    USUARIOS_TEST_DATABASE_URL: 'postgres://dummy:dummy@aloha-r2-pg:5432/aloha_r2',
    E2E_ADMIN_EMAIL: 'admin@e2e.invalid',
    E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql', E2E_NEON_WSPROXY: '127.0.0.1:5435' }
  assert.doesNotThrow(() => requireDisposableGate(env))
  assert.throws(() => requireDisposableGate({ ...env, E2E_NEON_HTTP: 'https://remote.invalid/sql' }), /local/)
  assert.throws(() => requireDisposableGate({ ...env, E2E_NEON_WSPROXY: 'remote.invalid:5435' }), /local/)
  assert.throws(() => requireDisposableGate({ ...env, RESPONSIVE_BASE_URL: 'https://remote.invalid' }), /local/)
})

test('el CSS global no contiene antipatrones que oculten o animen todo', () => {
  const css = read('../app/globals.css')
  assert.doesNotMatch(css, /transition:\s*all\b/)
  assert.doesNotMatch(css, /body[^}]*overflow-x:\s*hidden/s)
  assert.match(css, /100dvh/)
  assert.match(css, /safe-area-inset/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})

test('existen primitivas accesibles compartidas', () => {
  const dialog = read('../components/Dialog.js')
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(dialog, /Escape/)
  assert.match(dialog, /initialFocusRef/)
  assert.match(dialog, /focus\(\)/)
  const table = read('../components/TableScroller.js')
  assert.match(table, /role="region"/)
  assert.match(table, /tabIndex=\{0\}/)
  assert.match(table, /data-horizontal-scroll/)
  const card = read('../components/OperationalCard.js')
  assert.match(card, /headingLevel\s*=\s*3/)
  assert.match(card, /const Heading/)
})

test('los modales operativos usan Dialog compartido y bloquean el cierre durante escrituras', () => {
  for (const path of [
    '../components/PlanNino.js',
    '../components/growth/GrowthBriefing.js',
    '../app/centro/[id]/grupos/page.js',
    '../app/centro/[id]/cuadro/page.js',
    '../app/centro/[id]/eventos/page.js',
  ]) {
    assert.match(read(path), /from ['"].*Dialog['"]/, `${path} debe consumir Dialog`)
  }

  const dialog = read('../components/Dialog.js')
  assert.match(dialog, /closeDisabled/)
  assert.match(dialog, /stopImmediatePropagation/)
  assert.doesNotMatch(read('../app/centro/[id]/eventos/page.js'), /overflowX:\s*['"]visible/)
})

test('sheet, menú y tour declaran sus contratos responsive y accesibles', () => {
  const grupos = read('../app/centro/[id]/grupos/page.js')
  const eventos = read('../app/centro/[id]/eventos/page.js')
  const tour = read('../components/tour/TourHost.js')
  const css = read('../app/globals.css')

  assert.match(grupos, /mobile-sheet/)
  assert.match(eventos, /role="menu"/)
  assert.match(eventos, /role="menuitem"/)
  assert.match(eventos, /getBoundingClientRect/)
  assert.match(tour, /ResizeObserver/)
  assert.match(tour, /aria-labelledby/)
  assert.match(css, /\.mobile-sheet\s*\{[^}]*max-height:\s*100dvh/s)
  assert.match(css, /\.tour-card\s*\{[^}]*100dvh/s)
})

test('los tokens móviles fijan tipografía y objetivos táctiles', () => {
  const css = read('../app/globals.css')
  assert.match(css, /--mobile-body:\s*15px/)
  assert.match(css, /--mobile-input:\s*16px/)
  assert.match(css, /--touch-target:\s*44px/)
  assert.match(css, /\.btn[^}]*min-height:\s*var\(--touch-target\)/s)
})

test('el layout ofrece salto visible al contenido', () => {
  const layout = read('../app/layout.js')
  assert.match(layout, /href="\#main-content"/)
  assert.match(layout, /Saltar al contenido/)
})

test('el shell móvil declara drawer, breakpoint de tablet y navegación semántica', () => {
  const sidebar = read('../components/Sidebar.js')
  const css = read('../app/globals.css')
  assert.match(sidebar, /matchMedia\('\(max-width: 1024px\)'\)/)
  assert.match(sidebar, /<Link/)
  assert.match(sidebar, /aria-current/)
  assert.match(sidebar, /aria-label="Abrir menú"/)
  assert.match(sidebar, /aria-label="Cerrar menú"/)
  assert.match(css, /\.mobile-bar/)
  assert.match(css, /\.sb--open/)
  assert.match(css, /@media\s*\(max-width:\s*1024px\)/)
})

// UN SOLO "página actual" EN EL MENÚ. La regla vieja (exacta + un caso especial
// de prefijo para el árbol de entrenamiento) marcaba DOS enlaces a la vez en
// /dashboard/entrenamiento/oficio y en /centro/<id>/entrenamiento/firmas, que
// son rutas reales con ítem propio. Dos aria-current="page" no dicen dónde
// estás. Ahora lo decide hrefActivo, y esta es la prueba que no tenía.
test('el menú marca un solo enlace actual, y es el más específico que cubre la ruta', () => {
  const admin = ['/dashboard', '/dashboard/entrenamiento', '/dashboard/entrenamiento/oficio', '/dashboard/usuarios', '/perfil']
  assert.equal(hrefActivo('/dashboard/entrenamiento/oficio', admin), '/dashboard/entrenamiento/oficio', 'gana el ítem propio, no el padre')
  assert.equal(hrefActivo('/dashboard/entrenamiento', admin), '/dashboard/entrenamiento')
  assert.equal(hrefActivo('/dashboard/usuarios', admin), '/dashboard/usuarios', 'un hijo no deja activo a /dashboard')
  assert.equal(hrefActivo('/perfil', admin), '/perfil')

  const centro = ['/centro/2', '/centro/2/kpi', '/centro/2/entrenamiento', '/centro/2/entrenamiento/firmas']
  assert.equal(hrefActivo('/centro/2/entrenamiento/firmas', centro), '/centro/2/entrenamiento/firmas')
  assert.equal(hrefActivo('/centro/2/kpi', centro), '/centro/2/kpi')
  assert.equal(hrefActivo('/centro/2', centro), '/centro/2')
  // El módulo de oficio y su hoja SOP no son ítems del menú: activo se queda
  // Entrenamiento, que es lo más adentro que llega.
  assert.equal(hrefActivo('/centro/2/entrenamiento/oficio/of-cen-1/sop', centro), '/centro/2/entrenamiento')
  assert.equal(hrefActivo('/centro/2/entrenamiento/oficio/glosario', centro), '/centro/2/entrenamiento')

  // Cubrir es por segmento de ruta, no por texto: /centro/21 no es /centro/2.
  assert.equal(hrefActivo('/centro/21/kpi', ['/centro/2', '/centro/2/kpi']), null)
  // Sin enlace que la cubra no se marca nada, en vez de inventar uno.
  assert.equal(hrefActivo('/login', admin), null)
  assert.equal(hrefActivo('', admin), null)
  assert.equal(hrefActivo('/dashboard', []), null)

  // Y el Sidebar no puede volver a decidirlo por su cuenta.
  const sidebar = read('../components/Sidebar.js')
  assert.match(sidebar, /hrefActivo\(path,/, 'el Sidebar tiene que derivar el enlace activo de nav-activo.mjs')
  assert.match(sidebar, /const isActive = \(href\) => href === activo/)
})

test('el selector de tema expone estado presionado y no actúa como submit', () => {
  const toggle = read('../components/ThemeToggle.js')
  assert.match(toggle, /type="button"/)
  assert.match(toggle, /aria-pressed=\{dark\}/)
})

test('el launcher authenticated entrega a Next solo la allowlist del servidor', () => {
  const source = {
    NODE_ENV: 'test',
    DATABASE_URL: 'db',
    USUARIOS_TEST_DATABASE_URL: 'db',
    E2E_DATABASE_CONFIRM: 'disposable',
    E2E_NEON_HTTP: 'http://proxy.invalid/sql',
    E2E_NEON_WSPROXY: 'proxy.invalid:443',
    E2E_DELIVERY_MODE: 'stub',
    SESSION_SECRET: 'session',
    E2E_ADMIN_PASSWORD: 'must-not-pass',
    E2E_VALID_ACCESS_TOKEN: 'must-not-pass',
    UNRELATED_SECRET: 'must-not-pass',
  }
  assert.deepEqual(buildNextEnvironment(source, 'authenticated'), {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: 'db',
    USUARIOS_TEST_DATABASE_URL: 'db',
    E2E_DATABASE_CONFIRM: 'disposable',
    E2E_NEON_HTTP: 'http://proxy.invalid/sql',
    E2E_NEON_WSPROXY: 'proxy.invalid:443',
    E2E_DELIVERY_MODE: 'stub',
    SESSION_SECRET: 'session',
  })
})

test('el launcher primitives no entrega base, sesión ni credenciales a Next', () => {
  const result = buildNextEnvironment({
    E2E_UI_FIXTURES: '1',
    E2E_DATABASE_CONFIRM: 'disposable',
    DATABASE_URL: 'must-not-pass',
    SESSION_SECRET: 'must-not-pass',
    E2E_ADMIN_PASSWORD: 'must-not-pass',
  }, 'primitives')
  assert.deepEqual(result, {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
    E2E_UI_FIXTURES: '1',
    E2E_DATABASE_CONFIRM: 'disposable',
  })
})

test('el launcher ungated inicia el smoke 404 sin heredar ningún secreto', () => {
  assert.deepEqual(buildNextEnvironment({
    DATABASE_URL: 'must-not-pass',
    E2E_UI_FIXTURES: '1',
    E2E_DATABASE_CONFIRM: 'disposable',
    SESSION_SECRET: 'must-not-pass',
  }, 'ungated'), {
    NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1',
  })
})

test('el modo de mutaciones excluye todos los proyectos de auditoría read-only', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url))
  const script = "import('./playwright.config.mjs').then(({ default: config }) => console.log(JSON.stringify(config.projects.map(({ name }) => name))))"
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd,
    encoding: 'utf8',
    env: {
      DATABASE_URL: 'postgres://fixture:fixture@db.invalid:5432/fixture',
      USUARIOS_TEST_DATABASE_URL: 'postgres://fixture:fixture@db.invalid:5432/fixture',
      E2E_DATABASE_CONFIRM: 'disposable',
      E2E_NEON_HTTP: 'http://127.0.0.1:4446/sql',
      E2E_NEON_WSPROXY: '127.0.0.1:5435',
      E2E_DELIVERY_MODE: 'stub',
      SESSION_SECRET: 'fixture-session-secret-with-enough-length',
      E2E_RUN_MUTATIONS: '1',
    },
  })
  assert.deepEqual(JSON.parse(output), ['setup', 'users-mutations-local'])
})

test('los diálogos con fixture nunca entran al smoke remoto', () => {
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval',
    "import('./playwright.config.mjs').then(({default:c}) => console.log(JSON.stringify(c.projects.filter(p=>p.name.startsWith('phone-')).map(p=>p.testIgnore.test('dialogs.spec.js')))))"], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
    env: { RESPONSIVE_BASE_URL: 'https://readonly.invalid' },
  })
  assert.deepEqual(JSON.parse(output), [true, true, true, true])
})

test('acceso y perfil declaran el contrato responsive de estados y campos', () => {
  const home = read('../app/page.js')
  const login = read('../app/login/page.js')
  const forgot = read('../app/forgot-password/page.js')
  const setPassword = read('../app/set-password/page.js')
  const profile = read('../app/perfil/page.js')
  const panelFilter = read('../components/PanelFilter.js')
  const period = read('../components/PeriodSelector.js')
  const playwright = read('../playwright.config.mjs')

  assert.match(home, /redirect\('\/login'\)/)
  assert.doesNotMatch(home, /useRouter|useEffect|['"]use client['"]/)
  for (const [name, source] of Object.entries({ login, forgot, setPassword, profile })) {
    assert.match(source, /<main\b|role="main"/, `${name} expone contenido principal`)
    assert.match(source, /id="main-content"/, `${name} identifica el contenido principal`)
    assert.match(source, /data-page-state=/, `${name} declara su estado de página`)
  }
  for (const source of [login, forgot, setPassword, profile]) {
    assert.match(source, /name=/)
    assert.match(source, /autoComplete=/)
  }
  assert.match(login, /spellCheck=\{false\}/)
  assert.match(login, /role="alert"/)
  assert.match(login, /pending \? 'loading' : error \? 'error' : 'ready'/)
  assert.match(setPassword, /data-page-state="loading"/)
  assert.match(setPassword, /const pageState = loading \|\| info === null \? 'loading' : error \|\| !info\.valid \? 'error' : 'ready'/)
  assert.match(setPassword, /data-page-state=\{pageState\}/)
  assert.match(profile, /hydrated/)
  assert.match(read('../app/globals.css'), /\.profile-page__email[^}]*overflow-wrap:\s*anywhere/s)
  assert.match(panelFilter, /panel-filter__modes/)
  assert.match(panelFilter, /aria-pressed/)
  assert.match(panelFilter, /panel-filter__range/)
  assert.match(period, /role="group"/)
  assert.match(playwright, /grepInvert:\s*\/perfil espera hidratación\|filtros focales\//)
})
