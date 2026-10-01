// Ficha existente al inscribir (2026-10-01) — lógica PURA, sin BD.
//
// En producción aparecieron niños con DOS fichas en el mismo centro (David:
// Valeria 907/1029 y Genesis 923/1019; Calle 50: Luciano 946/999; Anclas:
// Angela 915/916). El KPI cuenta la venta por FICHA (primer evento de
// inscripción por estudiante_id, lib/kpi-semanal-auto.mjs): cada duplicado
// suma una venta y un "nuevo activo" de más. El único freno era
// crm_registration_id, que es POR REGISTRO del CRM: no ve al niño inscrito
// directo (sin registro) ni al que se registró dos veces o fue a dos clases.
//
// Reglas (siempre dentro del MISMO centro; el caller filtra):
//   1. Mismo registro de CRM → 'registro'. Fuera de esta regla queda la
//      matrícula anulada: la anulación revirtió la venta y volver a
//      inscribirlo ES una venta nueva (va sin el registro, ver
//      registroEnFichaAnulada).
//   2. Nombre compatible + un contacto en común (teléfono, correo o
//      representante) → 'fuerte' si el nombre es el mismo, 'posible' si solo
//      se parece («María Rodríguez» puede ser «María José Rodríguez» o su
//      hermana: el centro decide).
//   3. Mismo nombre exacto sin contacto en común → 'posible', solo si el
//      nombre tiene 3+ palabras o a una de las dos fichas le faltan teléfono y
//      correo (las cargadas en bloque). «Sofía Pérez» con otro teléfono es
//      otra Sofía.
//
// "Nombre compatible" = mismas palabras en cualquier orden, o las palabras del
// nombre corto contenidas en el largo y entre ellas el PRIMER nombre del largo:
// «Luciano Acosta» y «Acosta Luciano» calzan con «Luciano Andrés Acosta
// Sequera»; «Andrés Acosta» no (puede ser un hermano), ni dos hermanos con la
// misma representante («Meghan Linton» / «Genesis Linton»).

import { matriculaAnulada } from './anulacion-matricula.mjs'

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
const MIN_DIGITOS = 7
const MAX_DIGITOS = 12 // +58 y 10 dígitos de Venezuela
// Lo que puede sobrar delante del número corto: nada o el código de país
// (también «+58 0414…», con el 0 de troncal de más).
const PREFIJOS_PAIS = new Set(['', '507', '58', '580'])

// Minúsculas, sin acentos (la ñ queda como n) y sin signos: solo letras y
// espacios simples.
export function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

// Palabras que identifican a la persona: sin partículas ni iniciales sueltas
// («Ana E. Pérez» y «Ana Pérez» dicen lo mismo).
export function tokensNombre(valor) {
  const texto = normalizarTexto(valor)
  if (!texto) return []
  return texto.split(' ').filter((t) => t.length > 1 && !PARTICULAS.has(t))
}

const mismoConjunto = (sa, sb) => sa.size === sb.size && [...sa].every((t) => sb.has(t))

function compararTokens(ta, tb) {
  if (!ta.length || !tb.length) return null
  const sa = new Set(ta)
  const sb = new Set(tb)
  if (mismoConjunto(sa, sb)) return 'mismo_nombre'
  const [setCorto, largo, setLargo] = sa.size <= sb.size ? [sa, tb, sb] : [sb, ta, sa]
  if (![...setCorto].every((t) => setLargo.has(t))) return null
  return setCorto.has(largo[0]) ? 'nombre_parecido' : null
}

// 'mismo_nombre' | 'nombre_parecido' | null
export function nombresCompatibles(a, b) {
  return compararTokens(tokensNombre(a), tokensNombre(b))
}

const soloDigitos = (texto) => String(texto).replace(/\D/g, '').replace(/^0+/, '')

// Un campo puede traer varios teléfonos: «6925-0722 / 6677-8899»,
// «6925-0722 - 6677-8899», «Mamá 6925-0722 Papá 6677-8899» o
// «6925-0722 6677-8899». Se corta por separadores claros (barra, coma, punto y
// coma, guion con espacios, palabras, doble espacio) y, si un bloque trae más
// dígitos de los que caben en un número, por espacios. Cada número queda en
// dígitos sin ceros a la izquierda; los de menos de 7 no identifican.
export function telefonosDe(valor) {
  const numeros = []
  for (const bloque of String(valor ?? '').split(/[/,;|]|\s[-–]\s|\s{2,}|\p{L}+/u)) {
    const digitos = soloDigitos(bloque)
    if (digitos.length <= MAX_DIGITOS) {
      if (digitos.length >= MIN_DIGITOS) numeros.push(digitos)
      continue
    }
    // Varios números pegados por espacios: se arman de izquierda a derecha.
    // Con código de país delante (507/58) el número es más largo.
    let actual = ''
    for (const pedazo of bloque.trim().split(/\s+/)) {
      actual = soloDigitos(actual + pedazo.replace(/\D/g, ''))
      const minimo = actual.startsWith('507') ? 10 : actual.startsWith('58') ? 12 : MIN_DIGITOS
      if (actual.length >= minimo) {
        numeros.push(actual)
        actual = ''
      }
    }
  }
  return numeros
}

// Mismo número si el largo termina en el corto y lo que sobra delante es nada o
// un código de país (6925-0722 = +507 6925 0722; 0414-1234567 = +58 414
// 1234567). Un fijo de 7 dígitos no calza con un móvil que termina igual.
function mismoNumero(listaA, listaB) {
  return listaA.some((x) => listaB.some((y) => {
    const [largo, corto] = x.length >= y.length ? [x, y] : [y, x]
    return largo.endsWith(corto) && PREFIJOS_PAIS.has(largo.slice(0, largo.length - corto.length))
  }))
}

export function mismoTelefono(a, b) {
  return mismoNumero(telefonosDe(a), telefonosDe(b))
}

const correoDe = (valor) => {
  const c = String(valor ?? '').trim().toLowerCase()
  return c.includes('@') ? c : null
}

export function mismoCorreo(a, b) {
  const ca = correoDe(a)
  return ca != null && ca === correoDe(b)
}

// Representante: mismo criterio de nombre, con al menos nombre y apellido de
// cada lado («Mamá» o un solo nombre no identifican a nadie).
function mismoRepresentanteTokens(ta, tb) {
  if (new Set(ta).size < 2 || new Set(tb).size < 2) return false
  return compararTokens(ta, tb) != null
}

export function mismoRepresentante(a, b) {
  return mismoRepresentanteTokens(tokensNombre(a), tokensNombre(b))
}

const crmDe = (valor) => {
  const v = valor == null ? '' : String(valor).trim()
  return v || null
}

// Lo que se compara de una ficha (o del formulario), normalizado UNA vez: el
// script compara todas las fichas de un centro entre sí. El modal de la clase
// de prueba precarga nombre y representante con el nombre de quien se registró:
// un representante igual al nombre del niño no es un dato aparte y se ignora.
export function perfilFicha(datos = {}) {
  const nombre = tokensNombre(datos.nombre)
  const representante = tokensNombre(datos.representante)
  const telefonos = telefonosDe(datos.telefono)
  const correo = correoDe(datos.correo)
  return {
    crm: crmDe(datos.crm_registration_id),
    anulada: matriculaAnulada(datos),
    nombre,
    telefonos,
    correo,
    representante: representante.length && mismoConjunto(new Set(representante), new Set(nombre)) ? [] : representante,
    sinContacto: telefonos.length === 0 && correo == null,
  }
}

function motivosEntrePerfiles(a, b) {
  if (a.anulada || b.anulada) return []
  if (a.crm && b.crm && a.crm === b.crm) return ['registro_crm']
  const nombre = compararTokens(a.nombre, b.nombre)
  if (!nombre) return []
  const contactos = []
  if (mismoNumero(a.telefonos, b.telefonos)) contactos.push('telefono')
  if (a.correo && a.correo === b.correo) contactos.push('correo')
  if (mismoRepresentanteTokens(a.representante, b.representante)) contactos.push('representante')
  if (contactos.length) return [nombre, ...contactos]
  const palabras = new Set(a.nombre).size
  if (nombre === 'mismo_nombre' && palabras >= 2 && (palabras >= 3 || a.sinContacto || b.sinContacto)) return ['mismo_nombre']
  return []
}

// Motivos por los que `ficha` parece ser el niño del formulario `nuevo`
// (vacío = no coincide). Simétrica: el script la usa par a par.
export function motivosCoincidencia(nuevo, ficha) {
  return motivosEntrePerfiles(perfilFicha(nuevo), perfilFicha(ficha))
}

const CONTACTOS = ['telefono', 'correo', 'representante']

// 'registro' (mismo registro de CRM) > 'fuerte' (mismo nombre + contacto) >
// 'posible' (nombre parecido + contacto, o solo el mismo nombre).
export function fuerzaCoincidencia(motivos = []) {
  if (motivos.includes('registro_crm')) return 'registro'
  if (motivos.includes('mismo_nombre') && motivos.some((m) => CONTACTOS.includes(m))) return 'fuerte'
  return 'posible'
}

const ORDEN_FUERZA = { registro: 0, fuerte: 1, posible: 2 }
const ordenEstado = (estado) => (estado === 'retirado' ? 1 : 0)

// ¿Comparten teléfono o correo? (la familia, para el script).
export function compartenContacto(a, b) {
  const pa = perfilFicha(a)
  const pb = perfilFicha(b)
  return mismoNumero(pa.telefonos, pb.telefonos) || (pa.correo != null && pa.correo === pb.correo)
}

// Fichas del centro que parecen ser el niño del formulario, de la evidencia
// más fuerte a la más débil; a igual fuerza, primero las que siguen en el
// centro y luego la más antigua.
export function buscarFichasCoincidentes(nuevo, fichas = []) {
  const perfilNuevo = perfilFicha(nuevo)
  return (fichas || [])
    .map((ficha) => {
      const motivos = motivosEntrePerfiles(perfilNuevo, perfilFicha(ficha))
      return { ficha, motivos, fuerza: fuerzaCoincidencia(motivos) }
    })
    .filter((c) => c.motivos.length > 0)
    .sort((a, b) =>
      ORDEN_FUERZA[a.fuerza] - ORDEN_FUERZA[b.fuerza] ||
      ordenEstado(a.ficha.estado) - ordenEstado(b.ficha.estado) ||
      Number(a.ficha.id) - Number(b.ficha.id))
}

// El registro de CRM del formulario lo tiene una matrícula ANULADA: el niño
// vuelve como venta nueva, pero el índice único (centro_id,
// crm_registration_id) no admite otra ficha con ese registro. La ficha nueva
// nace sin él.
export function registroEnFichaAnulada(crmId, fichas = []) {
  const crm = crmDe(crmId)
  return crm != null && (fichas || []).some((f) => matriculaAnulada(f) && crmDe(f.crm_registration_id) === crm)
}

const TEXTO_MOTIVO = {
  registro_crm: 'es el mismo registro de la clase de prueba',
  mismo_nombre: 'mismo nombre',
  nombre_parecido: 'nombre parecido',
  telefono: 'mismo teléfono',
  correo: 'mismo correo',
  representante: 'mismo representante',
}

export function describirMotivos(motivos = []) {
  const partes = motivos.map((m) => TEXTO_MOTIVO[m] || m)
  if (partes.length <= 1) return partes[0] || ''
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

// "Es otro niño": por qué el centro crea una ficha pese a las coincidencias.
// Queda en el rastro del evento de venta.
export const MOTIVOS_FICHA_NUEVA = {
  hermano: 'Es hermano o hermana',
  mismo_nombre: 'Es otro niño con el mismo nombre',
  otro: 'Otro motivo',
}

// Lee la confirmación que manda la pantalla: las fichas que el centro VIO y
// descartó, el motivo y (con "otro") una nota. Sin confirmación → vacía.
export function leerConfirmacionFichaNueva(valor) {
  if (valor == null) return { descartadas: [], motivo: null, nota: null }
  const descartadas = [...new Set((Array.isArray(valor.descartadas) ? valor.descartadas : [])
    .map(Number).filter((n) => Number.isInteger(n) && n > 0))]
  const motivo = valor.motivo == null || valor.motivo === '' ? null : String(valor.motivo)
  const nota = String(valor.nota ?? '').trim() || null
  if (!descartadas.length) return { error: 'Indica cuáles fichas revisaste antes de confirmar que es otro niño.' }
  if (!motivo || !Object.hasOwn(MOTIVOS_FICHA_NUEVA, motivo)) return { error: 'Elige por qué es otro niño.' }
  if (motivo === 'otro' && !nota) return { error: 'Escribe por qué es otro niño.' }
  if (nota && nota.length > 200) return { error: 'La nota admite hasta 200 caracteres.' }
  return { descartadas, motivo, nota }
}

// ¿Se puede crear la ficha? El mismo registro de CRM no se salta nunca. Las
// demás coincidencias, solo si el centro confirmó con motivo que es otro niño
// habiendo visto TODAS las fichas que coinciden ahora: una que apareció
// después (otra pestaña, otra administradora) vuelve a pedir confirmación.
export function decidirAlta(coincidencias = [], { descartadas = [], motivo = null, nota = null } = {}) {
  if (!coincidencias.length) return { crear: true, confirmacion: null }
  if (coincidencias.some((c) => c.fuerza === 'registro')) return { crear: false, registroYaInscrito: true }
  const vistas = new Set(descartadas.map(Number))
  const ids = coincidencias.map((c) => Number(c.ficha.id))
  if (motivo && ids.every((id) => vistas.has(id))) {
    return { crear: true, confirmacion: { descartadas: ids, motivo, ...(nota ? { nota } : {}) } }
  }
  return { crear: false, requiereConfirmacion: true }
}

const ESTADO_TEXTO = {
  activo: 'activo',
  baja_potencial: 'baja potencial',
  retirado: 'retirado',
}

function resumenFicha(ficha) {
  const partes = [ESTADO_TEXTO[ficha.estado] || ficha.estado]
  if (ficha.grupo_numero != null) partes.push(`grupo ${ficha.grupo_numero}`)
  else if (ficha.estado !== 'retirado') partes.push('sin grupo')
  return `${ficha.nombre} (${partes.join(', ')})`
}

// Mensaje legible para el `error` de la respuesta: lo muestra cualquier
// pantalla, también una que no sepa pintar la lista de coincidencias.
export function mensajeFichaExistente(coincidencias = []) {
  if (!coincidencias.length) return null
  const registro = coincidencias.find((c) => c.fuerza === 'registro')
  if (registro) {
    return `Este registro ya fue inscrito: es la ficha de ${resumenFicha(registro.ficha)}. Si su fecha de venta está mal, corrígela en esa ficha; no hace falta otra.`
  }
  const [primera] = coincidencias
  const cabeza = coincidencias.length === 1
    ? `${primera.fuerza === 'fuerte' ? '' : 'Puede que '}${resumenFicha(primera.ficha)} ${primera.fuerza === 'fuerte' ? 'ya tiene' : 'ya tenga'} ficha en el centro (${describirMotivos(primera.motivos)}).`
    : `Hay ${coincidencias.length} fichas en el centro que pueden ser este niño: ${coincidencias.map((c) => resumenFicha(c.ficha)).join('; ')}.`
  return `${cabeza} Si es el mismo niño, no crees otra ficha: corrige la que ya tiene. Si es otro niño, confirma por qué.`
}

const iso10 = (v) => (v == null || v === '' ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

// Lo que la pantalla necesita de cada coincidencia (la ficha viene con
// grupo_numero, el nivel vigente del grupo y fecha_venta = evento canónico de
// inscripción, si existe). `fecha_venta` cae a la fecha de la ficha solo para
// el pendiente sin venta.
export function coincidenciasParaPantalla(coincidencias = []) {
  return coincidencias.map(({ ficha: f, motivos, fuerza }) => ({
    id: Number(f.id),
    nombre: f.nombre,
    estado: f.estado,
    grupo_id: f.grupo_id == null ? null : Number(f.grupo_id),
    grupo_numero: f.grupo_numero ?? null,
    itinerario: f.itinerario ?? null,
    nivel: f.nivel == null ? null : Number(f.nivel),
    origen: f.origen ?? null,
    tiene_venta: f.fecha_venta != null,
    fecha_venta: iso10(f.fecha_venta) || iso10(f.fecha_inscripcion),
    fecha_retiro: iso10(f.fecha_retiro),
    retiro_programado_para: iso10(f.retiro_programado_para),
    representante: f.representante ?? null,
    telefono: f.telefono ?? null,
    correo: f.correo ?? null,
    crm_vinculado: crmDe(f.crm_registration_id) != null,
    motivos,
    fuerza,
  }))
}

// Teléfono para listados que salen de la plataforma: solo los 4 últimos
// dígitos alcanzan para que el centro reconozca a la familia.
export function enmascararTelefono(valor) {
  const [primero] = telefonosDe(valor)
  return primero ? `…${primero.slice(-4)}` : '—'
}

// ── Script de solo lectura: fichas que parecen el mismo niño, por centro ──
// Compara cada par de fichas del MISMO centro con las reglas de arriba y une
// los pares en grupos (A~B y B~C ⇒ un solo grupo A, B, C). `completo` dice si
// TODOS los pares del grupo coinciden entre sí: una cadena (A~B~C sin A~C) suele
// ser dos hermanos unidos por un nombre corto, no un mismo niño.
// Devuelve [{ centroId, ids, pares: [{ a, b, motivos, fuerza }], completo }].
export function agruparFichasDuplicadas(fichas = []) {
  const porCentro = new Map()
  for (const ficha of fichas || []) {
    const key = String(ficha.centro_id)
    if (!porCentro.has(key)) porCentro.set(key, [])
    porCentro.get(key).push(ficha)
  }
  const grupos = []
  for (const [centroId, lista] of porCentro) {
    const ordenada = [...lista].sort((a, b) => Number(a.id) - Number(b.id))
    const perfiles = ordenada.map((ficha) => perfilFicha(ficha))
    const padre = ordenada.map((_, i) => i)
    const raiz = (i) => {
      while (padre[i] !== i) {
        padre[i] = padre[padre[i]]
        i = padre[i]
      }
      return i
    }
    const pares = []
    for (let i = 0; i < ordenada.length; i++) {
      for (let j = i + 1; j < ordenada.length; j++) {
        const motivos = motivosEntrePerfiles(perfiles[i], perfiles[j])
        if (!motivos.length) continue
        pares.push({ i, j, motivos, fuerza: fuerzaCoincidencia(motivos) })
        const ri = raiz(i)
        const rj = raiz(j)
        if (ri !== rj) padre[Math.max(ri, rj)] = Math.min(ri, rj)
      }
    }
    const porRaiz = new Map()
    for (const par of pares) {
      const r = raiz(par.i)
      if (!porRaiz.has(r)) porRaiz.set(r, { indices: new Set(), pares: [] })
      const grupo = porRaiz.get(r)
      grupo.indices.add(par.i)
      grupo.indices.add(par.j)
      grupo.pares.push({ a: Number(ordenada[par.i].id), b: Number(ordenada[par.j].id), motivos: par.motivos, fuerza: par.fuerza })
    }
    for (const grupo of porRaiz.values()) {
      const n = grupo.indices.size
      grupos.push({
        centroId: Number(centroId),
        ids: [...grupo.indices].sort((a, b) => a - b).map((i) => Number(ordenada[i].id)),
        pares: grupo.pares,
        completo: grupo.pares.length === (n * (n - 1)) / 2,
      })
    }
  }
  return grupos.sort((a, b) => a.centroId - b.centroId || a.ids[0] - b.ids[0])
}
