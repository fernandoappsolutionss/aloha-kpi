import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import swc from 'next/dist/build/swc/index.js'
import { enriquecerNinos, generarItinerarioVersionado, posicionPlanNino } from '../lib/plan-nino.mjs'
import { montonesConPlan, subgruposSinPlan, siguePlanDelAula } from '../lib/ancla-lote.mjs'

// Ejecuta las vistas reales de la página. Solo sustituye las líneas de tiempo
// (probadas por su propio motor) y el formulario que necesita acciones remotas.
const page = readFileSync(new URL('../app/centro/[id]/grupos/page.js', import.meta.url), 'utf8')
function funcion(nombre) {
  const inicio = page.indexOf(`function ${nombre}(`)
  assert.notEqual(inicio, -1, nombre)
  return page.slice(inicio, page.indexOf('\n}', inicio) + 2)
}
const nombres = ['semanaNinoTexto', 'distribucionSemanas', 'MontonPlan', 'BloqueSinPlanGrupo', 'ItinerarioNivel']
const codigo = swc.transformSync(nombres.map(funcion).join('\n'), {
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } } },
}).code
const isoDia = v => v ? String(v).slice(0, 10) : null
const { ItinerarioNivel, semanaNinoTexto } = vm.runInNewContext(`${codigo}\n;({ ItinerarioNivel, semanaNinoTexto })`, {
  React, useState: React.useState, montonesConPlan, subgruposSinPlan, siguePlanDelAula,
  isoDia, fmtDia: v => isoDia(v) || '—', BTN_XS: {},
  ProgresoPlan: () => null, NotasPlan: () => null, BloqueCrearPlan: () => null,
  LineaTiempoPlan: ({ it }) => React.createElement('div', { 'data-plan-inicio': it.fecha_inicio }, `Calendario ${it.fecha_inicio}`),
})
const hoy = '2026-09-07'
const calendarioVersionado = [{ vigente_desde: null, dias: [6] }]
const base = { id: 41, numero: 41, itinerario: 'TINY', horarios: [{ dia: 6 }] }
const nino = (id, nombre, nivel, inicio, itinerario = 'TINY') => ({
  id, nombre, nivel, itinerario, grupo_id: 41, estado: 'activo', fecha_inicio_nivel: inicio,
})
function vista(ninos, referencia = null, horarios = base.horarios) {
  const g = { ...base, horarios, itinerario_clases: referencia }
  g.estudiantes = enriquecerNinos(ninos, [g], { hoy })
  const antes = JSON.stringify(g)
  const html = renderToStaticMarkup(React.createElement(ItinerarioNivel, {
    centroId: 2, g, it: referencia,
    pos: posicionPlanNino(referencia, hoy), onAjustar() {}, onPlanFijado() {},
  }))
  assert.equal(JSON.stringify(g), antes, 'la vista no cambia fechas ni niveles')
  return html
}

test('aula sin referencia: muestra ambos niveles y sus fechas individuales', () => {
  const html = vista([nino(1, 'Alumna Alfa', 3, '2026-07-04'), nino(2, 'Alumno Beta', 4, '2026-08-01', 'KIDS')])
  for (const texto of ['Alumna Alfa', 'Alumno Beta', 'TINY', 'KIDS', '2026-07-04', '2026-08-01']) assert.ok(html.includes(texto), texto)
})

test('mismo nivel con dos inicios: muestra ambas semanas y sus alumnos sin referencia', () => {
  const html = vista([nino(1, 'Alumna Alfa', 3, '2026-07-04'), nino(2, 'Alumno Beta', 3, '2026-08-01')])
  assert.ok(html.includes('Alumna Alfa') && html.includes('Alumno Beta'))
  assert.ok(html.includes('2026-07-04') && html.includes('2026-08-01'))
})

test('niños sin inicio del mismo nivel tienen entradas individuales aunque falte referencia', () => {
  const html = vista([nino(1, 'Alumna Alfa', 3, null), nino(2, 'Alumno Beta', 3, null)])
  assert.match(html, /Completar inicio de Alumna Alfa/)
  assert.match(html, /Completar inicio de Alumno Beta/)
  assert.match(html, /Todos empezaron el mismo día/)
})

test('referencia existente compartida: no duplica la línea de tiempo', () => {
  const referencia = generarItinerarioVersionado({ fechaInicio: '2026-07-04', nivel: 3, calendarioVersionado })
  const html = vista([nino(1, 'Alumna Alfa', 3, '2026-07-04')], referencia)
  assert.equal((html.match(/data-plan-inicio=/g) || []).length, 1)
})

test('aula sin horario conserva la fecha conocida y explica que falta el calendario', () => {
  const html = vista([nino(1, 'Alumna Alfa', 3, '2026-07-04')], null, [])
  assert.match(html, /2026-07-04/)
  assert.match(html, /horario/)
  assert.doesNotMatch(html, /Completar inicio de Alumna Alfa/)
})

// Tras inducción y repasos, la sexta posición puede ser la cuarta semana del libro.
// El resumen debe coincidir con la actividad que la coach ve en el calendario.
test('el resumen usa la semana del libro y conserva repasos y Mental Day', () => {
  for (const etiqueta of ['Semana 4', 'Repaso 1 · Evaluación', 'Mental Day 1']) {
    assert.equal(semanaNinoTexto({ estado: 'en_curso', indiceSemana: 5, semana: { etiqueta } }), etiqueta)
  }
})
