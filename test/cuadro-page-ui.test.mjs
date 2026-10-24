import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const source = read('../app/centro/[id]/cuadro/page.js')

test('Retirar ya no envía ultimaAsistencia: la deriva el servidor', () => {
  const llamada = source.match(/retirarEstudiante\(centroId, nino\.id, \{[^}]*\}\)/)?.[0]
  assert.ok(llamada, 'llamada a retirarEstudiante presente')
  assert.doesNotMatch(llamada, /ultimaAsistencia/)
  assert.doesNotMatch(source, /name="ultimaAsistencia"/)
  assert.doesNotMatch(source, /Última asistencia \(opcional\)/)
  assert.doesNotMatch(source, /useState\(\{ motivo: '', fecha: hoyISO\(\), ultimaAsistencia/)
  // Solo lectura y solo si el niño trae dato.
  assert.match(source, /\{nino\.ultima_asistencia && \(/)
  assert.match(source, /se toma de las asistencias marcadas/)
})

test('Pedidos muestran grupoNumero del servidor y el select de edición no queda vacío con grupo cerrado', () => {
  assert.match(source, /const grupoPedido = \(p\) => \(p\.grupoNumero \? 'Grupo ' \+ p\.grupoNumero : numeroGrupo\(p\.grupo_id\)\)/)
  assert.match(source, /<td className="num" style=\{\{ fontSize: 12 \}\}>\{grupoPedido\(p\)\}<\/td>/)
  assert.doesNotMatch(source, /\{numeroGrupo\(p\.grupo_id\)\}/)
  assert.match(source, /const grupoCerradoPedido = pedido\.grupo_id && !gruposActivos\.some\(/)
  assert.match(source, /<option value=\{pedido\.grupo_id\} disabled>Grupo \{grupoCerradoPedido\} \(cerrado\)<\/option>/)
})

test('el shell de carga solo aparece en la primera carga; el refetch conserva el contenido', () => {
  assert.match(source, /if \(loading && !data\) return \(/)
  assert.doesNotMatch(source, /if \(loading\) return \(/)
  assert.match(source, /<main id="main-content"[^>]*aria-busy=\{loading\}/)
  assert.match(source, /\{loading && data && <span className="label" role="status">Actualizando…<\/span>\}/)
  // Los estados de página que esperan los e2e no cambian.
  assert.match(source, /data-page-state=\{!data \? 'error' : 'ready'\}/)
})

test('loadData descarta respuestas de una revisión vieja (cambio rápido de mes/año)', () => {
  assert.match(source, /import \{ useState, useEffect, useCallback, useRef, Fragment \} from 'react'/)
  assert.match(source, /const revisionRef = useRef\(0\)/)
  const fn = source.match(/const loadData = useCallback\(async \(\) => \{[\s\S]*?\}, \[id, year, month\]\)/)?.[0]
  assert.ok(fn, 'loadData presente')
  assert.match(fn, /const revision = \+\+revisionRef\.current/)
  assert.match(fn, /const vigente = \(\) => revision === revisionRef\.current/)
  // Guardia tanto en el camino feliz como en el catch, y antes de tocar estado.
  assert.equal((fn.match(/if \(!vigente\(\)\) return/g) || []).length, 2)
  assert.ok(fn.indexOf('if (!vigente()) return') < fn.indexOf('setData(res)'))
  assert.ok(fn.lastIndexOf('if (!vigente()) return') < fn.lastIndexOf("setStatus('❌ ' + e.message)"))
})

test('Retirar y Reincorporar reciben el mes visto y avisan si el movimiento cae en otro mes', () => {
  assert.match(source, /<RetirarModal centroId=\{id\} nino=\{accionNino\.nino\} year=\{year\} month=\{month\}/)
  assert.match(source, /<ReincorporarModal centroId=\{id\} nino=\{accionNino\.nino\} grupos=\{gruposActivos\} year=\{year\} month=\{month\}/)
  assert.match(source, /function RetirarModal\(\{ centroId, nino, year, month, onClose, onSaved \}\)/)
  assert.match(source, /function ReincorporarModal\(\{ centroId, nino, grupos, year, month, onClose, onSaved \}\)/)
  assert.match(source, /const mesFecha = f\.fecha\.slice\(0, 7\)/)
  assert.match(source, /const otroMes = \/\^\\d\{4\}-\\d\{2\}\$\/\.test\(mesFecha\) && mesFecha !== ymDe\(year, month\)/)
  assert.match(source, /este retiro quedará registrado en el cuadro de \{nombreMesYM\(mesFecha\)\}/)
  assert.match(source, /const mesActual = hoyISO\(\)\.slice\(0, 7\)/)
  assert.match(source, /la reincorporación se registra en el mes en curso \(\{nombreMesYM\(mesActual\)\}\), no en el mes que ves/)
  // Los avisos son role="status" con la clase de alerta compartida, no texto suelto.
  assert.equal((source.match(/role="status" className="alert alert--warn"/g) || []).length, 2)
})

test('helpers de mes del cuadro son puros y coherentes', () => {
  const lineas = ['const NOMBRES_MES = ', 'const nombreMesYM = ', 'const ymDe = ']
    .map((prefijo) => source.split('\n').find((l) => l.startsWith(prefijo)))
  assert.ok(lineas.every(Boolean), 'helpers definidos a nivel de módulo')
  const { nombreMesYM, ymDe } = runInNewContext(`${lineas.join(';\n')};\n({ nombreMesYM, ymDe })`)
  assert.equal(ymDe(2026, 9), '2026-09')
  assert.equal(ymDe(2026, 10), '2026-10')
  assert.equal(nombreMesYM('2026-09'), 'Septiembre 2026')
  assert.equal(nombreMesYM(ymDe(2027, 1)), 'Enero 2027')
  // La fecha de hoy (octubre) vista desde septiembre dispara el aviso; vista desde octubre no.
  assert.notEqual('2026-10-23'.slice(0, 7), ymDe(2026, 9))
  assert.equal('2026-10-23'.slice(0, 7), ymDe(2026, 10))
})
