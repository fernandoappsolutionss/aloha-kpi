// Importador del GLOSARIO del oficio — lo que va a la vista de la barrera de
// la palabra sin aclarar. Herramienta de desarrollo: NO corre en Vercel, no la
// importa la app.
//
// Lee las dos fuentes congeladas en docs/entrenamiento/fuente/
//   glosario-aloha.md  (186 términos, del Manual de Operaciones)
//   glosario-zoho.md   (73 términos, del Curso 2 de Zoho para Asistentes)
// y escribe lib/entrenamiento/oficio/glosario.js con 238 entradas: los 259
// términos de las dos fuentes reconciliando a UNA definición los 21 que
// aparecen en las dos.
//
// RECONCILIACIÓN. Gana la del Manual (glosario-aloha.md): es la fuente
// normativa de la empresa y el glosario de Zoho es una reformulación del
// curso. Los campos que el Manual no trae se completan con los de Zoho, y
// PREFERENCIA lista los pocos casos donde la definición de Zoho es la buena.
// El caso que importa: "deserción" — el Manual la define como el INDICADOR
// (el porcentaje del mes, tope 8 %) y Zoho como el retiro de un niño; se
// publica la del Manual, que además trae el `noConfundir` con "retiro".
//
// QUÉ SE DESCARTA. El campo "Ojo:" del glosario de Zoho: la forma del
// glosario es { termino, variantes, que, ejemplo, noConfundir } (la pinta
// GlosarioOficio.js y la tarjeta de palabras del módulo) y no hay dónde
// pintarlo. Su contenido operativo ya vive en los bloques de los módulos
// of-zoh-*. Si algún día se quiere, se recupera de la fuente.
//
// Ejecuta `node scripts/oficio-glosario-importar.mjs` para regenerar el
// archivo, o `node scripts/oficio-glosario-importar.mjs --verificar` para
// comprobar que el commiteado es exactamente el que producen las fuentes.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const FUENTE = join(ROOT, 'docs/entrenamiento/fuente')
const DESTINO = join(ROOT, 'lib/entrenamiento/oficio/glosario.js')

const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
export const slugify = (s) => sinTildes(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Texto plano: el renderer no interpreta markdown salvo **negrita**, y `que` y
// `ejemplo` se pintan crudos. Solo `noConfundir` conserva la negrita (el
// componente la limpia). Ningún campo puede traer '<' (lo verifica el test).
function limpiar(md, { negrita = false } = {}) {
  let t = String(md || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  if (!negrita) t = t.replace(/\*\*/g, '')
  return t.replace(/</g, '‹')
}

// ── Parser de las dos fuentes ───────────────────────────────────────────────
// Las dos usan `### Término` por entrada. El Manual marca el cuerpo con
// "**Qué es.**"; el de Zoho abre con el párrafo suelto. Los dos usan
// "**Ejemplo:**" / "**Ejemplo.**" y "**No lo confundas con**".
// ── Slugs congelados: cambió el TÉRMINO VISIBLE, no la clave ───────────────
// El vocabulario del método se renombró (Entrenamiento a Bordo): hat → puesto,
// drill → maniobra, masa → lo que va a la vista, y así. El slug es la clave con
// la que los módulos piden un término (`palabras`, `quiz[].repasa`) y el ancla
// del glosario (#t-<slug>): renombrarlo dejaría nueve palabras sin definición y
// rompería enlaces ya repartidos. Así que el término nuevo apunta al slug de
// siempre. Mapa: slug que produciría el término nuevo → slug que se conserva.
const SLUG_FIJO = {
  'puesto-en-cubierta': 'hat',
  'producto-del-puesto': 'producto-final-valioso',
  'lo-que-va-a-la-vista': 'masa',
  'orden-de-los-pasos': 'gradiente',
  maniobra: 'drill',
  'plan-de-puesto': 'checksheet',
  'jefe-entrenador': 'oficial-de-entrenamiento',
  'palabra-sin-aclarar': 'palabra-malentendida',
}
export const slugDe = (termino) => {
  const s = slugify(termino)
  return SLUG_FIJO[s] || s
}
// SLUG_FIJO se indexa por el slug que produce el TÉRMINO VISIBLE, así que
// renombrar el término en el .md sin tocar este mapa hace desaparecer el slug
// viejo en silencio: los módulos que lo piden se quedan sin definición. Ya
// pasó una vez (el término se llamó "Puesto en cubierta" un rato y el slug
// `hat` se evaporó). Esto lo convierte en un error de generación, aquí mismo.
function verificarSlugsFijos(slugs) {
  const faltan = [...new Set(Object.values(SLUG_FIJO))].filter((s) => !slugs.has(s))
  if (faltan.length) {
    throw new Error(
      `SLUG_FIJO promete slugs que las fuentes ya no producen: ${faltan.join(', ')}.\n` +
      'Cambió el término visible en el .md y no se actualizó la clave de SLUG_FIJO.',
    )
  }
}

export function parseGlosario(ruta) {
  const lineas = readFileSync(ruta, 'utf8').split('\n')
  const entradas = []
  let cur = null
  for (const linea of lineas) {
    const h3 = linea.match(/^###\s+(.+?)\s*$/)
    if (h3) { cur = { termino: h3[1].trim(), cuerpo: [] }; entradas.push(cur); continue }
    if (/^#{1,2}\s/.test(linea)) { cur = null; continue }
    if (cur) cur.cuerpo.push(linea)
  }
  return entradas.map((e) => {
    const parrafos = e.cuerpo.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    const campos = {}
    const libres = []
    for (const p of parrafos) {
      if (/^[>|-]/.test(p)) continue
      let m
      if ((m = p.match(/^\*\*Qué es[.:]\*\*\s*([\s\S]*)$/))) campos.que = m[1]
      else if ((m = p.match(/^\*\*Ejemplo[.:]\*\*\s*([\s\S]*)$/))) campos.ejemplo = m[1]
      else if ((m = p.match(/^\*\*No lo confundas con[.:]?\*\*[.:]?\s*([\s\S]*)$/))) campos.noConfundir = m[1]
      // "También lo vas a ver escrito:" — el puente hacia la palabra vieja. Va
      // con UN asterisco (cursiva), no con dos, así que caía en `libres` y se
      // descartaba en silencio: la ficha prometía el puente y la pantalla no lo
      // pintaba. Es el campo que le confirma a las 143 personas ya entrenadas
      // que "Maniobra" y "drill" son la misma cosa.
      else if ((m = p.match(/^\*También lo vas a ver escrito[.:]\*\s*([\s\S]*)$/))) campos.tambien = m[1]
      else if (/^\*\*[^*]+[.:]\*\*/.test(p)) continue // "Ojo:", "Qué haces:", …
      else libres.push(p)
    }
    if (!campos.que && libres.length) campos.que = libres[0]
    return {
      termino: e.termino,
      slug: slugDe(e.termino),
      que: limpiar(campos.que),
      ejemplo: limpiar(campos.ejemplo),
      noConfundir: limpiar(campos.noConfundir, { negrita: true }),
      tambien: limpiar(campos.tambien),
    }
  })
}

// ── Reconciliación de los 21 términos que salen en las dos fuentes ──────────
// Por defecto gana el Manual y Zoho rellena los huecos. Aquí van los casos en
// los que la definición del curso de Zoho es la que hay que publicar.
const PREFERENCIA = {
  // El Manual describe el medio de pago; Zoho dice qué es la transferencia.
  ach: { que: 'zoho' },
  // Zoho dice quién lo confecciona, cuándo, y lo separa del FODA de la
  // Administradora — que es justo lo que la asistente confunde.
  'cuadro-de-negocio': { que: 'zoho', ejemplo: 'zoho' },
}

// ── Variantes para el auto-enlace (marcarTerminos respeta límites de palabra) ─
// Plural español por defecto. Los préstamos del inglés hacen el plural en -s y
// el genérico les pondría "-es", así que van a mano.
const PLURAL_A_MANO = {
  // Préstamos del inglés: plural en -s.
  kit: ['kits'], 'kit-de-reserva': ['kits de reserva'],
  coach: ['coaches'], 'coach-auxiliar': ['coaches auxiliares'],
  'coach-de-planta': ['coaches de planta'], 'master-coach': ['master coaches'],
  'expediente-de-coach': ['expedientes de coach'], 'factura-de-servicio-del-coach': ['facturas de servicio del coach'],
  'mental-day': ['mental days'], 'test-de-velocidad': ['tests de velocidad'],
  'aloha-dolares': ['aloha dólares'],
  // Llanas terminadas en -n: el plural gana la tilde.
  'examen-de-nivel': ['exámenes de nivel'], 'orden-de-entrega': ['órdenes de entrega'],
  'resumen-de-ninos-mensual': ['resúmenes de niños mensual'],
  // Verbos, nombres propios, siglas y locuciones que no pluralizan.
  anular: [], conciliar: [], contabilizar: [], cuadrar: [], registrar: [],
  'convertir-a-factura': [], 'paz-y-salvo': [], 'personal-de-apoyo-y-aseo': [],
  zoho: [], 'zoho-books': [], mailchimp: [], drive: [], nee: [], ach: [],
  'class-dojo': ['classdojo'], 'calendario-y-asistencia': [],
  kids: [], 'tiny-tots': [], flashcards: [], orales: [], kinder: [],
  'aloha-mental-arithmetic': [],
  // Vocabulario del método. El plural genérico no sirve aquí: "Orden de los
  // pasos" daría "ordenes de los pasos" (sin tilde y pisando "orden de
  // entrega"), y los que llevan "sin" o "entrenador" en el medio no pluralizan
  // solos porque el genérico solo cruza preposiciones.
  gradiente: [],
  'palabra-malentendida': ['palabras sin aclarar'],
  'oficial-de-entrenamiento': ['jefes entrenadores'],
}
// Abreviaturas y sinónimos que la gente usa en el Centro y en los módulos.
//
// LAS PALABRAS VIEJAS NO SE BORRAN. Los HTML congelados de
// docs/entrenamiento/fuente/ y el Moodle anterior siguen diciendo "hat",
// "drill" y "masa", y la gente ya entrenada también. Se conservan como
// variantes para que el auto-enlace siga cazándolas: así el cambio de
// vocabulario se vuelve navegable en vez de ruidoso.
//
// NADA DE FORMAS DE UNA PALABRA. 'puesto', 'producto', 'plan', 'orden' y
// 'entrega' a secas están PROHIBIDAS como variante: marcarTerminos enlaza la
// primera aparición del módulo y subrayaría "no se abandona el puesto de
// trabajo", "el producto del kit" o "la orden de entrega firmada", que no
// enseñan nada. Solo formas largas.
const SINONIMOS = {
  'producto-final-valioso': ['pfv', 'producto final valioso', 'productos finales valiosos', 'producto de tu puesto'],
  // 'tu puesto' NO va: en of-met-1 caía sobre "aplicación en tu puesto de
  // trabajo" y se gastaba ahí el único enlace del módulo, dejando sin marcar la
  // frase que sí define. La forma larga "tu puesto a bordo" la caza 'puesto a
  // bordo'.
  hat: ['hat', 'hats'],
  drill: ['drill', 'drills'],
  masa: ['masa', 'masas'],
  gradiente: ['gradiente', 'gradientes'],
  checksheet: ['tu plan de puesto', 'checksheet', 'checksheets'],
  'palabra-malentendida': ['palabra malentendida', 'palabras malentendidas'],
  // Las dos acepciones de "ciclo" se distinguen por una tilde, así que la
  // forma sin tilde tiene que apuntar a la misma tarjeta: si no, cae en
  // 'ciclo' (el del Programa) justo donde se habla de lo que el padre pagó.
  'ciclo-de-matricula': ['ciclo de matricula', 'ciclos de matricula'],
  // Como aparece escrito en el catálogo de Zoho y en la factura del padre.
  'primer-ciclo': ['1er ciclo'],
  'oficial-de-entrenamiento': ['oficial de entrenamiento', 'oficiales de entrenamiento'],
  'caja-menuda': ['caja chica'],
  'informe-de-antiguedad-de-saldos': ['antigüedad de saldos'],
  'ley-81-de-2019': ['ley 81'],
  'caja-de-seguro-social': ['css'],
  'ministerio-de-trabajo': ['mitradel'],
  kpi: ['kpis'],
  foda: ['fodas'],
}

const VOCALES = /[aeiouáéíóú]$/i

// "organización" → "organizaciones", no "organizaciónes": al añadir la sílaba,
// la palabra deja de ser aguda y pierde la tilde.
const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }
function pluralPalabra(p) {
  if (/s$|x$/i.test(p)) return null
  if (/z$/i.test(p)) return `${p.slice(0, -1)}ces`
  if (VOCALES.test(p)) return `${p}s`
  const m = p.match(/^(.*)([áéíóú])([nsr])$/i)
  if (m) return `${m[1]}${SIN_TILDE[m[2].toLowerCase()] || m[2]}${m[3]}es`
  return `${p}es`
}

// "clase de prueba" → "clases de prueba": en español pluraliza el núcleo, no el
// complemento. "cuentas por cobrar" ya viene en plural y no genera nada.
function pluralTermino(t) {
  const partes = t.split(' ')
  if (partes.length === 1) return pluralPalabra(partes[0])
  if (!/^(de|del|por|para|a|en|y|con)$/i.test(partes[1])) return null
  const nucleo = pluralPalabra(partes[0])
  return nucleo ? [nucleo, ...partes.slice(1)].join(' ') : null
}

export function variantesDe(termino, slug) {
  const base = termino.toLowerCase()
  const out = [base]
  if (Object.prototype.hasOwnProperty.call(PLURAL_A_MANO, slug)) out.push(...PLURAL_A_MANO[slug])
  else { const p = pluralTermino(base); if (p) out.push(p) }
  out.push(...(SINONIMOS[slug] || []))
  return [...new Set(out.filter(Boolean))]
}

// ── Construcción ────────────────────────────────────────────────────────────
export function construirGlosario() {
  const aloha = parseGlosario(join(FUENTE, 'glosario-aloha.md'))
  const zoho = parseGlosario(join(FUENTE, 'glosario-zoho.md'))
  const porSlugZoho = new Map(zoho.map((e) => [e.slug, e]))
  const fuera = new Map()

  const mezclar = (base, otro, slug) => {
    const pref = PREFERENCIA[slug] || {}
    const elegir = (campo) => {
      const deZoho = otro?.[campo] || ''
      const deBase = base[campo] || ''
      if (pref[campo] === 'zoho' && deZoho) return deZoho
      return deBase || deZoho
    }
    return { termino: base.termino, que: elegir('que'), ejemplo: elegir('ejemplo'), noConfundir: elegir('noConfundir'), tambien: elegir('tambien') }
  }

  for (const e of aloha) fuera.set(e.slug, mezclar(e, porSlugZoho.get(e.slug), e.slug))
  for (const e of zoho) if (!fuera.has(e.slug)) fuera.set(e.slug, mezclar(e, null, e.slug))

  const orden = [...fuera.keys()].sort((a, b) => fuera.get(a).termino.localeCompare(fuera.get(b).termino, 'es'))
  const salida = {}
  for (const slug of orden) {
    const e = fuera.get(slug)
    salida[slug] = {
      termino: e.termino,
      variantes: variantesDe(e.termino, slug),
      que: e.que,
      ...(e.ejemplo ? { ejemplo: e.ejemplo } : {}),
      ...(e.noConfundir ? { noConfundir: e.noConfundir } : {}),
      ...(e.tambien ? { tambien: e.tambien } : {}),
    }
  }
  return { salida, compartidos: aloha.filter((e) => porSlugZoho.has(e.slug)).map((e) => e.slug) }
}

const lit = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export function renderArchivo({ salida, compartidos }) {
  const slugs = Object.keys(salida)
  verificarSlugsFijos(new Set(slugs))
  const cuerpo = slugs.map((slug) => {
    const e = salida[slug]
    const filas = [
      `    termino: ${lit(e.termino)},`,
      `    variantes: [${e.variantes.map(lit).join(', ')}],`,
      `    que: ${lit(e.que)},`,
    ]
    if (e.ejemplo) filas.push(`    ejemplo: ${lit(e.ejemplo)},`)
    if (e.noConfundir) filas.push(`    noConfundir: ${lit(e.noConfundir)},`)
    if (e.tambien) filas.push(`    tambien: ${lit(e.tambien)},`)
    return `  ${lit(slug)}: {\n${filas.join('\n')}\n  },`
  }).join('\n')

  return `// GLOSARIO del oficio — lo que va a la vista de la barrera de la palabra sin aclarar.
//
// GENERADO por scripts/oficio-glosario-importar.mjs desde las fuentes
// congeladas en docs/entrenamiento/fuente/: glosario-aloha.md (186 términos del
// Manual de Operaciones) y glosario-zoho.md (73 del Curso 2). Son ${slugs.length} entradas:
// los ${compartidos.length} términos que aparecen en las dos fuentes están reconciliados a UNA
// definición, con la del Manual como canónica (la del curso rellena los huecos).
// No se edita a mano: se corrige la fuente y se vuelve a generar.
//
// Forma: { slug: { termino, variantes, que, ejemplo?, noConfundir?, tambien? } }
//   variantes  → para el auto-enlace de marcarTerminos(); respeta límites de
//                palabra, así que "facturación" no dispara "factura".
//   que        → texto plano; el renderer no interpreta markdown aquí.
//   noConfundir→ único campo donde sobrevive **negrita** (el componente la limpia).
//   tambien    → "También lo vas a ver escrito": la palabra vieja. Se PINTA, para
//                que quien ya entrenó con el vocabulario anterior vea en la ficha
//                que "Maniobra" y "drill" son la misma cosa.
//
// Los slugs son la clave con la que los módulos piden un término
// (\`palabras\` y \`quiz[].repasa\`): renombrar uno deja la palabra sin definición.
// Por eso los nueve términos del método conservan su slug viejo (hat, drill,
// masa, gradiente, checksheet…) aunque en pantalla se llamen de otra forma, y
// sus variantes siguen cazando la palabra antigua. El mapa está en
// SLUG_FIJO, dentro del importador.
export const GLOSARIO = {
${cuerpo}
}
`
}

const datos = construirGlosario()
const archivo = renderArchivo(datos)

if (process.argv.includes('--verificar')) {
  const actual = readFileSync(DESTINO, 'utf8')
  if (actual === archivo) {
    console.log(`glosario: ${Object.keys(datos.salida).length} términos · el archivo commiteado es exactamente el que producen las fuentes`)
  } else {
    console.error('glosario: lib/entrenamiento/oficio/glosario.js NO coincide con las fuentes. Corre el importador sin --verificar.')
    process.exitCode = 1
  }
} else {
  writeFileSync(DESTINO, archivo)
  console.log(`glosario: ${Object.keys(datos.salida).length} términos escritos en lib/entrenamiento/oficio/glosario.js (${datos.compartidos.length} reconciliados)`)
}
