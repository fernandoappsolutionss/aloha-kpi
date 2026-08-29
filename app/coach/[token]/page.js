'use client'
// Lista de asistencia del COACH (link compartible, sin sesión): las columnas
// salen del itinerario del nivel (la planificación) y el coach marca cada
// clase — ✓ presente · ✗ ausente · J justificada — y lleva su nota por niño.
// Réplica del formato de la lista de Anclas Mall, amigable para celular.
import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams } from 'next/navigation'
import { loadGrupoCoach, marcarAsistencia, guardarNotaCoach } from '../../actions/coach'

const CICLO = { '': 'presente', presente: 'ausente', ausente: 'justificada', justificada: '' }
const MARCA = {
  presente: { t: '✓', c: 'var(--ok)', bg: 'var(--ok-bg)' },
  ausente: { t: '✗', c: 'var(--bad)', bg: 'var(--bad-bg)' },
  justificada: { t: 'J', c: 'var(--warn)', bg: 'var(--warn-bg)' },
}
const fmtDia = (f) => {
  const [, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}`
}
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

export default function CoachPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [marcas, setMarcas] = useState(new Map())
  const [notaAbierta, setNotaAbierta] = useState(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [guardando, setGuardando] = useState('')

  const load = useCallback(async () => {
    const res = await loadGrupoCoach(token)
    if (res.error) { setErr(res.error); return }
    setData(res)
    setMarcas(new Map(res.asistencias.map((a) => [`${a.estudiante_id}|${a.fecha}`, a.estado])))
  }, [token])
  useEffect(() => { load() }, [load])

  if (err) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--bad)', padding: 24, textAlign: 'center' }}>{err}</div>
  if (!data) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-dim)' }}>Cargando…</div>

  const { grupo, estudiantes } = data
  // Columnas desde el CALENDARIO VERSIONADO del grupo (R2b): `semanas[]` es la
  // verdad aplanada — un cambio de horario post-inicio conserva toda clase ya
  // dada o con asistencia y solo regenera el sufijo futuro, así que las
  // columnas históricas (y sus marcas) nunca desaparecen de esta lista.
  const semanas = grupo.itinerario_clases?.semanas || []
  const fechas = semanas.flatMap((s) => (s.fechas || []).map((f) => ({ fecha: f, corto: s.corto || '', etiqueta: s.etiqueta })))
  const hoyISO = hoy()

  async function clickCelda(est, fecha) {
    const key = `${est.id}|${fecha}`
    const actual = marcas.get(key) || ''
    const nuevo = CICLO[actual] ?? 'presente'
    // Optimista: se pinta ya; si el server falla, se revierte.
    setMarcas((prev) => {
      const m = new Map(prev)
      if (nuevo) m.set(key, nuevo)
      else m.delete(key)
      return m
    })
    const res = await marcarAsistencia(token, est.id, fecha, nuevo || null)
    if (res.error) {
      setMarcas((prev) => {
        const m = new Map(prev)
        if (actual) m.set(key, actual)
        else m.delete(key)
        return m
      })
      setErr('')
      alert(res.error)
    }
  }

  async function guardarNota(est) {
    setGuardando(String(est.id))
    const res = await guardarNotaCoach(token, est.id, notaTexto)
    setGuardando('')
    if (res.error) { alert(res.error); return }
    est.nota_coach = notaTexto.trim() || null
    setNotaAbierta(null)
  }

  // Alerta del manual: seguimiento a niños con 2+ ausencias (las últimas
  // clases ya pasadas, sin contar justificadas).
  const pasadas = fechas.filter((f) => f.fecha <= hoyISO).map((f) => f.fecha)
  const ausencias2 = (est) => {
    let seguidas = 0
    for (let i = pasadas.length - 1; i >= 0; i--) {
      const m = marcas.get(`${est.id}|${pasadas[i]}`)
      if (m === 'ausente') seguidas++
      else if (m === 'presente' || m === 'justificada') break
      if (seguidas >= 2) return true
    }
    return false
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '14px 12px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="label" style={{ marginBottom: 6 }}>ALOHA · {grupo.centro} · Lista del coach</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, margin: 0 }}>Grupo {grupo.numero} · {grupo.itinerario}</h1>
        <p className="h-sub" style={{ marginTop: 4 }}>
          {grupo.coach ? `Coach: ${grupo.coach}` : 'Sin coach asignado'}{grupo.horarioTexto ? ` · ${grupo.horarioTexto}` : ''}
          {grupo.itinerario_clases?.fecha_cierre_estimada ? ` · Cierre: ${fmtDia(grupo.itinerario_clases.fecha_cierre_estimada)}` : ''}
        </p>
        <div style={{ margin: '10px 0 14px', fontSize: 12, color: 'var(--text-dim)' }}>
          Toca la casilla de cada clase: <b style={{ color: 'var(--ok)' }}>✓ presente</b> → <b style={{ color: 'var(--bad)' }}>✗ ausente</b> → <b style={{ color: 'var(--warn)' }}>J justificada</b> → vacío. 📝 abre la nota del niño. Con 2 ausencias seguidas avisa ⚠️ al administrador.
        </div>

        {!fechas.length ? (
          <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)' }}>
            Este grupo aún no tiene itinerario generado. Pídele al administrador que le ponga fecha de inicio y horario.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface-2)', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', minWidth: 150 }}>Niño</th>
                  {fechas.map((f) => (
                    <th key={f.fecha} title={`${f.etiqueta} · ${f.fecha}`}
                      style={{ padding: '4px 4px', borderBottom: '1px solid var(--border)', background: f.fecha === hoyISO ? 'var(--surface-3)' : 'var(--surface-2)', minWidth: 40 }}>
                      <div style={{ fontSize: 10, color: 'var(--ts-green)', fontWeight: 700 }}>{f.corto}</div>
                      <div className="num" style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDia(f.fecha)}</div>
                    </th>
                  ))}
                  <th style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Nota</th>
                </tr>
              </thead>
              <tbody>
                {estudiantes.map((est) => (
                  <Fragment key={est.id}>
                    <tr>
                      <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-1)', padding: '6px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {ausencias2(est) ? <span title="2+ ausencias seguidas: avisar al administrador">⚠️ </span> : ''}{est.nombre}
                        <div style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-dim)' }}>{est.itinerario} {est.nivel}{est.estado === 'baja_potencial' ? ' · baja potencial' : ''}</div>
                      </td>
                      {fechas.map((f) => {
                        const m = marcas.get(`${est.id}|${f.fecha}`)
                        const mk = m ? MARCA[m] : null
                        return (
                          <td key={f.fecha} onClick={() => clickCelda(est, f.fecha)}
                            style={{
                              borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)',
                              textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: 0, height: 34,
                              background: mk ? mk.bg : (f.fecha === hoyISO ? 'var(--surface-3)' : 'transparent'),
                              color: mk ? mk.c : 'var(--text-faint)', fontWeight: 700,
                            }}>
                            {mk ? mk.t : ''}
                          </td>
                        )
                      })}
                      <td style={{ borderBottom: '1px solid var(--border)', borderLeft: '1px solid var(--border)', textAlign: 'center', padding: '0 6px' }}>
                        <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} title={est.nota_coach || 'Sin nota'}
                          onClick={() => { setNotaAbierta(notaAbierta === est.id ? null : est.id); setNotaTexto(est.nota_coach || '') }}>
                          📝{est.nota_coach ? '•' : ''}
                        </button>
                      </td>
                    </tr>
                    {notaAbierta === est.id && (
                      <tr>
                        <td colSpan={fechas.length + 2} style={{ background: 'var(--surface-2)', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                          <div className="label" style={{ marginBottom: 6 }}>Nota de {est.nombre} (puntuación, status, observaciones)</div>
                          <textarea className="input" rows={3} value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
                            style={{ width: '100%', fontSize: 13 }} placeholder="Ej: PUNT 92 · repite S7 · reforzar tablas del 6" />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn btn--primary" style={{ padding: '5px 14px', fontSize: 12 }} disabled={guardando === String(est.id)}
                              onClick={() => guardarNota(est)}>{guardando === String(est.id) ? 'Guardando…' : 'Guardar nota'}</button>
                            <button className="btn" style={{ padding: '5px 14px', fontSize: 12 }} onClick={() => setNotaAbierta(null)}>Cancelar</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ marginTop: 14, fontSize: 11, color: 'var(--text-faint)' }}>
          Los cambios se guardan solos al tocar cada casilla. Si un niño no aparece, el administrador debe revisar su grupo en la plataforma.
        </p>
      </div>
    </div>
  )
}
