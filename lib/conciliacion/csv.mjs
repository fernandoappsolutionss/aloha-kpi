// Lector de CSV bancarios. Puro (sin dependencias): entra el texto del archivo
// y salen filas de celdas en crudo. Nada de interpretar fechas ni montos aquí
// — eso vive en columnas.mjs.
//
// Los bancos de Panamá exportan con separadores distintos (Banco General usa
// coma, BAC punto y coma en algunas plantillas) y meten líneas de cabecera
// antes de la tabla real ("Cuenta: xxxx9550", "Estado de cuenta", vacías…).
// Por eso el separador se detecta y las líneas sueltas NO se descartan aquí:
// quien decide dónde arranca la tabla es detectarColumnas().

const SEPARADORES = [',', ';', '\t', '|']

// Quita el BOM de UTF-8 y normaliza saltos de línea CRLF/CR.
export function limpiarTexto(texto) {
  return String(texto || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}

// Cuenta separadores fuera de comillas en una línea.
function contarFuera(linea, sep) {
  let n = 0
  let comillas = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (c === '"') comillas = !comillas
    else if (c === sep && !comillas) n++
  }
  return n
}

// El separador ganador es el que aparece de forma más consistente en las
// líneas con contenido: se premia la mediana, no el total, para que una línea
// de cabecera con muchas comas no se lleve la decisión.
export function detectarSeparador(texto) {
  const lineas = limpiarTexto(texto).split('\n').filter((l) => l.trim() !== '').slice(0, 40)
  if (!lineas.length) return ','
  let mejor = ','
  let mejorPuntaje = -1
  for (const sep of SEPARADORES) {
    const cuentas = lineas.map((l) => contarFuera(l, sep)).filter((n) => n > 0)
    if (!cuentas.length) continue
    cuentas.sort((a, b) => a - b)
    const mediana = cuentas[Math.floor(cuentas.length / 2)]
    // Consistencia: cuántas líneas tienen exactamente la mediana.
    const consistentes = cuentas.filter((n) => n === mediana).length
    const puntaje = consistentes * 10 + mediana
    if (puntaje > mejorPuntaje) { mejorPuntaje = puntaje; mejor = sep }
  }
  return mejor
}

// Parser RFC4180-ish: comillas dobles, comillas escapadas ("" dentro de campo)
// y saltos de línea dentro de un campo entrecomillado (los conceptos de banco
// a veces los traen).
export function parsearCSV(texto, { separador } = {}) {
  const limpio = limpiarTexto(texto)
  const sep = separador || detectarSeparador(limpio)
  const filas = []
  let fila = []
  let campo = ''
  let comillas = false
  let hubo = false

  const cerrarCampo = () => { fila.push(campo); campo = ''; hubo = true }
  const cerrarFila = () => {
    cerrarCampo()
    filas.push(fila.map((c) => c.trim()))
    fila = []
    hubo = false
  }

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (comillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++ }
        else comillas = false
      } else campo += c
      continue
    }
    if (c === '"') { comillas = true; hubo = true; continue }
    if (c === sep) { cerrarCampo(); continue }
    if (c === '\n') { cerrarFila(); continue }
    campo += c
  }
  if (campo !== '' || hubo || fila.length) cerrarFila()

  // Se devuelven también las filas vacías intermedias sin las del final.
  while (filas.length && filas[filas.length - 1].every((c) => c === '')) filas.pop()
  return { filas, separador: sep }
}
