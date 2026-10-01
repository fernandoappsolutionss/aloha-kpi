'use client'

import { MOTIVOS_FICHA_NUEVA, describirMotivos } from '../lib/ficha-existente.mjs'

// Las fichas del centro que parecen ser el niño que se está inscribiendo
// (respuesta `coincidencias` de inscribirEstudiante). Solo pinta: las acciones
// de cada ficha las decide el modal que la usa (`renderAcciones`).
const ESTADO = { activo: 'Activo', baja_potencial: 'Baja potencial', retirado: 'Retirado', matricula_anulada: 'Matrícula anulada' }
const PILL = { activo: 'pill--ok', baja_potencial: 'pill--warn', retirado: 'pill--bad', matricula_anulada: 'pill--bad' }
// Qué tan seguro es que sea el mismo niño (lib/ficha-existente.mjs).
const FUERZA = { registro: 'Mismo registro de la clase', fuerte: 'Muy probable', posible: 'Posible' }

export const fechaCorta = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—')

export const nivelTexto = (itinerario, nivel) => (itinerario ? `${itinerario}${nivel ? ` ${nivel}` : ''}` : '')

// Título del modal según la evidencia más fuerte: lo "posible" se pregunta.
export function tituloCoincidencias(coincidencias = []) {
  if (coincidencias.some((c) => c.fuerza === 'registro')) return 'Este registro ya fue inscrito'
  if (coincidencias.some((c) => c.fuerza === 'fuerte')) return 'Este niño ya tiene ficha'
  return '¿Este niño ya tiene ficha?'
}

function lineaGrupo(c) {
  const nivel = nivelTexto(c.itinerario, c.nivel)
  if (c.grupo_numero != null) return `Grupo ${c.grupo_numero}${nivel ? ` · ${nivel}` : ''}`
  if (c.estado === 'retirado') return nivel || 'Sin grupo'
  return `Sin grupo${nivel ? ` · ${nivel}` : ''}`
}

function lineaVenta(c) {
  if (c.tiene_venta) return `Venta: ${fechaCorta(c.fecha_venta)}`
  return `Ficha del ${fechaCorta(c.fecha_venta)} (su venta nace al colocarlo en un grupo)`
}

export default function CoincidenciasFicha({ coincidencias = [], renderAcciones }) {
  return (
    <ul aria-label="Fichas que ya existen en el centro" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
      {coincidencias.map((c) => (
        <li key={c.id} style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', padding: '10px 12px', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ color: 'var(--text)' }}>{c.nombre}</b>
            <span className={`pill ${PILL[c.estado] || 'pill--warn'}`} style={{ fontSize: 13 }}>{ESTADO[c.estado] || c.estado}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>
            {lineaGrupo(c)} · {lineaVenta(c)}
            {c.estado === 'retirado' && c.fecha_retiro ? ` · Retirado el ${fechaCorta(c.fecha_retiro)}` : ''}
            {c.retiro_programado_para ? ` · Retiro programado para el ${fechaCorta(c.retiro_programado_para)}` : ''}
            <br />
            Representante: {c.representante || '—'} · Tel.: {c.telefono || '—'}{c.correo ? ` · ${c.correo}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            <b>{FUERZA[c.fuerza] || c.fuerza}</b>: {describirMotivos(c.motivos)}
            {c.motivos.length === 1 && c.motivos[0] === 'mismo_nombre' ? ' (sin teléfono, correo ni representante en común: revísalo bien)' : ''}
          </div>
          {renderAcciones ? renderAcciones(c) : null}
        </li>
      ))}
    </ul>
  )
}

const RADIO = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 44, cursor: 'pointer' }

// "Es otro niño": el motivo es obligatorio y queda en el rastro de la venta.
// `valor` = { motivo, nota }; la pantalla manda además las fichas que vio.
export function ConfirmarFichaNueva({ coincidencias = [], valor, onChange }) {
  const nombres = coincidencias.map((c) => c.nombre).join(' / ')
  return (
    <fieldset style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', padding: '10px 12px', margin: '12px 0 0' }}>
      <legend className="label">¿Por qué es otro niño y no {nombres}?</legend>
      {Object.entries(MOTIVOS_FICHA_NUEVA).map(([clave, texto]) => (
        <label key={clave} style={RADIO}>
          <input type="radio" name="motivo-ficha-nueva" checked={valor.motivo === clave} onChange={() => onChange({ ...valor, motivo: clave })} />
          {texto}
        </label>
      ))}
      {valor.motivo === 'otro' && (
        <label className="field" style={{ margin: '4px 0 0' }}>
          <span className="label">Cuéntalo en una línea</span>
          <input name="nota-ficha-nueva" className="input" maxLength={200} value={valor.nota} onChange={(e) => onChange({ ...valor, nota: e.target.value })} />
        </label>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
        Se crea una ficha nueva y cuenta como una venta más en el KPI. Queda registrado quién lo confirmó y por qué.
      </p>
    </fieldset>
  )
}
