// Formateo compartido de la vista del conciliador.
export const dinero = (n) =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(Number(n) || 0)

// Las columnas DATE/TIMESTAMPTZ llegan como Date desde el servidor: recortar
// su String() daría "Fri Aug 01" en vez de la fecha.
export const fechaCorta = (valor) => {
  if (!valor) return '—'
  const d = valor instanceof Date ? valor : new Date(valor)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return String(valor).slice(0, 10)
}

export const ESTADOS = {
  nuevo: { texto: 'Por registrar', clase: 'conc-badge--nuevo' },
  sin_clasificar: { texto: 'Sin cuenta', clase: 'conc-badge--pendiente' },
  duplicado: { texto: 'Ya importado', clase: 'conc-badge--neutro' },
  ya_en_zoho: { texto: 'Ya en Zoho', clase: 'conc-badge--ok' },
  publicando: { texto: 'Registrando…', clase: 'conc-badge--pendiente' },
  publicado: { texto: 'Registrado', clase: 'conc-badge--ok' },
  error: { texto: 'Error', clase: 'conc-badge--error' },
  ignorado: { texto: 'Ignorado', clase: 'conc-badge--neutro' },
}

export function etiquetaEstado(estado) {
  return ESTADOS[estado] || { texto: estado, clase: 'conc-badge--neutro' }
}

// Los CSV de banca en línea de Panamá salen casi siempre en Windows-1252: si
// se fuerza UTF-8, "Depósito" llega como "Dep�sito" y esa basura acabaría en
// la descripción del asiento en Zoho. Se decodifica como UTF-8 y, si aparece
// el carácter de reemplazo, se reintenta en Windows-1252.
export async function leerArchivoComoTexto(archivo) {
  const buffer = await archivo.arrayBuffer()
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (!utf8.includes('�')) return utf8
  try {
    return new TextDecoder('windows-1252').decode(buffer)
  } catch {
    return utf8
  }
}

export const ESTADOS_LOTE = {
  borrador: 'Por registrar',
  parcial: 'Registrada en parte',
  conciliado: 'Conciliada',
}

export const etiquetaLote = (estado) => ESTADOS_LOTE[estado] || estado
