'use client'
import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import {
  eventosConfig, opcionesFormulario, listarEventos, crearEvento, actualizarEvento,
  eliminarEvento, duplicarEvento, listarRegistros, agregarInvitado, marcarAsistencia, marcarPago,
} from '../../../actions/eventos'

const ESTADO_PILL = { published: 'pill--ok', draft: 'pill--warn', completed: 'pill--warn', cancelled: 'pill--bad' }
const ESTADO_TXT = { published: 'Publicado', draft: 'Borrador', completed: 'Finalizado', cancelled: 'Cancelado' }
const FUENTE_TXT = { aloha_kpi: 'ALOHA KPI', vendedor: 'Vendedor', public: 'Público', ai_agent: 'Agente IA' }
const TZ_OFFSET = { 'America/Panama': '-05:00', 'America/Caracas': '-04:00' }
const fmtFecha = (d) => d ? new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0

// datetime-local (wall-clock) + zona → ISO con offset.
function localToISO(local, tz) {
  if (!local) return null
  return `${local}:00${TZ_OFFSET[tz] || '-05:00'}`
}
// ISO → valor para <input datetime-local> en la zona del evento.
function isoToLocal(iso, tz) {
  if (!iso) return ''
  const d = new Date(iso)
  const off = (TZ_OFFSET[tz] || '-05:00')
  const sign = off[0] === '-' ? -1 : 1
  const mins = sign * (parseInt(off.slice(1, 3)) * 60 + parseInt(off.slice(4, 6)))
  const shifted = new Date(d.getTime() + mins * 60000)
  return shifted.toISOString().slice(0, 16)
}

const EMPTY = {
  name: '', description: '', timezone: 'America/Panama', startLocal: '', endLocal: '',
  event_type: 'in_person', location: '', meeting_url: '', max_capacity: '',
  is_free: true, price: '', currency: 'USD', status: 'published',
  sales_team_id: '', pipeline_stage_id: '', attended_stage_id: '', won_stage_id: '',
  registration_questions: [],
}

export default function EventosPage() {
  const { id } = useParams()
  const defaultTz = String(id) === '10' ? 'America/Caracas' : 'America/Panama'
  const [rol, setRol] = useState('usuario')
  const [config, setConfig] = useState({ configured: true, baseUrl: '' })
  const [opts, setOpts] = useState({ sales_teams: [], pipeline_stages: [] })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [openId, setOpenId] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [editing, setEditing] = useState(null) // null=cerrado, {}=nuevo, {...}=editar

  useEffect(() => { setRol(localStorage.getItem('aloha_rol') || 'usuario') }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await eventosConfig(); setConfig(cfg)
      const [evRes, opRes] = await Promise.all([listarEventos(id), opcionesFormulario(id)])
      if (evRes.error) setStatus('❌ ' + evRes.error)
      setEvents(evRes.events || [])
      setOpts({ sales_teams: opRes.sales_teams || [], pipeline_stages: opRes.pipeline_stages || [] })
    } catch (e) { setStatus('❌ ' + e.message) }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  // Stats agregadas (tarjetas como en el CRM).
  const agg = events.reduce((a, e) => {
    const s = e.stats || {}
    a.total += s.total || 0; a.attended += s.attended || 0; a.not_attended += s.not_attended || 0
    a.pending += s.pending || 0; a.paid += s.paid || 0; a.revenue += s.total_revenue || 0
    return a
  }, { total: 0, attended: 0, not_attended: 0, pending: 0, paid: 0, revenue: 0 })

  const visible = events.filter((e) =>
    (filterEstado === 'todos' || e.status === filterEstado) &&
    (!q || e.name?.toLowerCase().includes(q.toLowerCase())))

  async function onDelete(ev) {
    setMenuId(null)
    if (!confirm(`¿Eliminar el evento "${ev.name}"? Esta acción no se puede deshacer.`)) return
    setStatus('')
    const res = await eliminarEvento(id, ev.id)
    if (res.error) setStatus('❌ ' + res.error); else { setStatus('✅ Evento eliminado.'); load() }
  }
  async function onDuplicate(ev) {
    setMenuId(null); setStatus('')
    const res = await duplicarEvento(id, ev.id)
    if (res.error) setStatus('❌ ' + res.error); else { setStatus('✅ Evento duplicado (queda en borrador).'); load() }
  }
  function copy(text, msg) {
    setMenuId(null)
    navigator.clipboard?.writeText(text).then(() => setStatus('✅ ' + msg)).catch(() => setStatus('Link: ' + text))
  }
  const regUrl = (e) => `${config.baseUrl}/events/${e.share_token}`
  const segUrl = (e) => `${config.baseUrl}/events/tracking/${e.tracking_token}`

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')
  const CARDS = [
    { l: 'Registrados', v: agg.total, c: 'var(--text)' },
    { l: 'Asistieron', v: `${pct(agg.attended, agg.total)}%`, s: `${agg.attended}`, c: 'var(--ok)' },
    { l: 'No asistieron', v: `${pct(agg.not_attended, agg.total)}%`, s: `${agg.not_attended}`, c: 'var(--bad)' },
    { l: 'Pendientes', v: `${pct(agg.pending, agg.total)}%`, s: `${agg.pending}`, c: 'var(--warn)' },
    { l: 'Pagados', v: `${pct(agg.paid, agg.total)}%`, s: `${agg.paid}`, c: 'var(--ts-green)' },
    { l: 'En compras', v: `$${agg.revenue.toLocaleString()}`, c: 'var(--text)' },
  ]

  return (
    <div className="shell">
      <Sidebar rol={rol} centroId={id} />
      <main className="main" onClick={() => setMenuId(null)}>
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Eventos</div>
            <h1 className="h-title">Eventos</h1>
            <p className="h-sub">Clases de prueba y eventos · sincronizados con el CRM</p>
          </div>
          <button onClick={() => { setStatus(''); setEditing({ ...EMPTY, timezone: defaultTz }) }} className="btn btn--primary" disabled={!config.configured}>+ Nuevo evento</button>
        </div>

        {!config.configured && (
          <div className="alert alert--error" style={{ marginBottom: 16 }}>
            La conexión con el CRM no está configurada (faltan <b>CRM_API_URL</b> / <b>CRM_SERVICE_TOKEN</b>).
          </div>
        )}
        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }}>{statusText}</div>
        )}

        {/* Tarjetas de stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
          {CARDS.map((c, i) => (
            <div key={i} className="kpi" style={{ padding: '14px 16px' }}>
              <div className="kpi__top"><span className="label">{c.l}</span></div>
              <div className="kpi__value" style={{ fontSize: 24, color: c.c }}>{c.v}</div>
              {c.s !== undefined && <div className="kpi__sub">{c.s}</div>}
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 280 }} placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ maxWidth: 200 }} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
            <option value="completed">Finalizado</option>
          </select>
        </div>

        <div className="panel">
          <div style={{ overflowX: 'visible' }}>
            <table className="table">
              <thead><tr>{['Evento', 'Fecha', 'Tipo', 'Estado', 'Registros', 'Precio', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando…</td></tr>
                ) : visible.length === 0 ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>{events.length === 0 ? 'Aún no hay eventos. Crea el primero con “+ Nuevo evento”.' : 'Sin resultados para el filtro.'}</td></tr>
                ) : visible.map((ev) => {
                  const count = ev.stats?.total ?? ev.registration_count ?? 0
                  return (
                    <Fragment key={ev.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setOpenId(openId === ev.id ? null : ev.id)}>
                        <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
                          {ev.name}
                          {ev.location && <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-faint)' }}>📍 {ev.location}</div>}
                        </td>
                        <td className="num" style={{ color: 'var(--text-dim)', fontSize: 12 }}>{fmtFecha(ev.start_date)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.event_type === 'online' ? 'Online' : 'Presencial'}</td>
                        <td><span className={`pill ${ESTADO_PILL[ev.status] || 'pill--warn'}`}><span className="dot" />{ESTADO_TXT[ev.status] || ev.status}</span></td>
                        <td className="num" style={{ fontWeight: 600, color: 'var(--text)' }}>{count}{ev.max_capacity ? `/${ev.max_capacity}` : ''}</td>
                        <td style={{ fontSize: 12 }}>{ev.is_free ? <span className="pill pill--ok" style={{ fontSize: 10 }}>Gratis</span> : `$${ev.price} ${ev.currency}`}</td>
                        <td style={{ textAlign: 'right', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setMenuId(menuId === ev.id ? null : ev.id)} className="btn" style={{ padding: '3px 10px', fontSize: 16, lineHeight: 1 }}>⋯</button>
                          {menuId === ev.id && (
                            <div style={{ position: 'absolute', right: 8, top: '100%', zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', minWidth: 220, padding: 6, textAlign: 'left' }}>
                              {[
                                ['✏️ Editar', () => { setMenuId(null); openEdit(ev, setEditing) }],
                                ['⧉ Duplicar', () => onDuplicate(ev)],
                                ['🔗 Copiar link de registro', () => copy(regUrl(ev), 'Link de registro copiado.')],
                                ['📈 Copiar link de seguimiento', () => copy(segUrl(ev), 'Link de seguimiento copiado.')],
                                ['👁 Ver página pública', () => { setMenuId(null); window.open(regUrl(ev), '_blank') }],
                                ['🗑 Eliminar', () => onDelete(ev), true],
                              ].map(([txt, fn, danger], k) => (
                                <button key={k} onClick={fn}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: danger ? '#FCA5A5' : 'var(--text-muted)', borderRadius: 6 }}>
                                  {txt}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                      {openId === ev.id && (
                        <tr style={{ cursor: 'default' }}>
                          <td colSpan={7} style={{ background: 'var(--surface-2)', padding: 0 }}>
                            <Registrations centroId={id} eventId={ev.id} onChange={load} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {editing && (
        <EventModal centroId={id} opts={opts} initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setStatus('✅ ' + msg); load() }} />
      )}
    </div>
  )
}

function openEdit(ev, setEditing) {
  setEditing({
    id: ev.id, name: ev.name || '', description: ev.description || '', timezone: ev.timezone || 'America/Panama',
    startLocal: isoToLocal(ev.start_date, ev.timezone), endLocal: isoToLocal(ev.end_date, ev.timezone),
    event_type: ev.event_type || 'in_person', location: ev.location || '', meeting_url: ev.meeting_url || '',
    max_capacity: ev.max_capacity || '', is_free: ev.is_free ?? true, price: ev.price || '', currency: ev.currency || 'USD',
    status: ev.status || 'published', sales_team_id: ev.sales_team_id || '', pipeline_stage_id: ev.pipeline_stage_id || '',
    attended_stage_id: ev.attended_stage_id || '', won_stage_id: ev.won_stage_id || '',
    registration_questions: Array.isArray(ev.registration_questions) ? ev.registration_questions : [],
  })
}

function EventModal({ centroId, opts, initial, onClose, onSaved }) {
  const [tab, setTab] = useState('info')
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const isEdit = !!f.id

  async function save() {
    if (!f.name.trim() || !f.startLocal) { setErr('Nombre y fecha de inicio son requeridos.'); setTab('info'); return }
    setSaving(true); setErr('')
    const data = {
      ...f,
      start_date: localToISO(f.startLocal, f.timezone),
      end_date: f.endLocal ? localToISO(f.endLocal, f.timezone) : null,
    }
    const res = isEdit ? await actualizarEvento(centroId, f.id, data) : await crearEvento(centroId, data)
    setSaving(false)
    if (res.error) setErr(res.error); else onSaved(isEdit ? 'Evento actualizado.' : 'Evento creado en el CRM.')
  }

  const stages = opts.pipeline_stages || []
  const TABS = [['info', 'Información'], ['pago', 'Precio y Pago'], ['preg', 'Preguntas']]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 640, maxWidth: '100%', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="panel__title">{isEdit ? 'Editar evento' : 'Crear evento'}</h3>
          <button className="btn" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '12px 22px 0' }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`btn${tab === k ? ' btn--primary' : ''}`} style={{ padding: '6px 14px', fontSize: 13 }}>{l}</button>
          ))}
        </div>

        <div style={{ padding: 22, maxHeight: '62vh', overflowY: 'auto' }}>
          {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}

          {tab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field full label="Nombre del evento *"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Calle 50 — Clase de prueba" /></Field>
              <Field full label="Descripción"><textarea className="input" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
              <Field label="Zona horaria">
                <select className="input" value={f.timezone} onChange={(e) => set('timezone', e.target.value)}>
                  <option value="America/Panama">Panamá (GMT-5)</option>
                  <option value="America/Caracas">Venezuela (GMT-4)</option>
                </select>
              </Field>
              <Field label="Modalidad">
                <select className="input" value={f.event_type} onChange={(e) => set('event_type', e.target.value)}>
                  <option value="in_person">Presencial</option><option value="online">Online</option>
                </select>
              </Field>
              <Field label="Inicio *"><input type="datetime-local" className="input" value={f.startLocal} onChange={(e) => set('startLocal', e.target.value)} /></Field>
              <Field label="Fin"><input type="datetime-local" className="input" value={f.endLocal} onChange={(e) => set('endLocal', e.target.value)} /></Field>
              {f.event_type === 'online'
                ? <Field full label="Link de la reunión"><input className="input" value={f.meeting_url} onChange={(e) => set('meeting_url', e.target.value)} placeholder="https://zoom.us/…" /></Field>
                : <Field full label="Lugar"><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Dirección / salón" /></Field>}
              <Field label="Cupo máximo"><input type="number" min="0" className="input" value={f.max_capacity} onChange={(e) => set('max_capacity', e.target.value)} placeholder="(sin límite)" /></Field>
              <Field label="Estado">
                <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="published">Publicado</option><option value="draft">Borrador</option><option value="completed">Finalizado</option>
                </select>
              </Field>
            </div>
          )}

          {tab === 'pago' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.is_free} onChange={(e) => set('is_free', e.target.checked)} />
                <span><b style={{ color: 'var(--text)' }}>Evento gratuito</b><br /><span className="h-sub">Desactiva para establecer un precio</span></span>
              </label>
              {!f.is_free && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Precio"><input type="number" min="0" className="input" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
                  <Field label="Moneda"><input className="input" value={f.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
                </div>
              )}
              <Field label="Equipo asignado">
                <select className="input" value={f.sales_team_id} onChange={(e) => set('sales_team_id', e.target.value)}>
                  <option value="">Todos los equipos (sin restricción)</option>
                  {opts.sales_teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Automatizaciones de pipeline</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[['pipeline_stage_id', '1. Al registrarse en el evento'], ['attended_stage_id', '2. Al marcar “Asistió”'], ['won_stage_id', '3. Al confirmar pago (ganado)']].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <select className="input" value={f[k]} onChange={(e) => set(k, e.target.value)}>
                        <option value="">Sin etapa</option>
                        {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'preg' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="h-sub" style={{ margin: 0 }}>Preguntas extra del formulario (además de nombre, email y teléfono).</span>
                <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => set('registration_questions', [...f.registration_questions, { label: '', type: 'text', required: false }])}>+ Agregar</button>
              </div>
              {f.registration_questions.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 10 }}>Sin preguntas personalizadas.</div>
              ) : f.registration_questions.map((qq, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="input" style={{ flex: 1 }} placeholder="Pregunta" value={qq.label} onChange={(e) => { const a = [...f.registration_questions]; a[i] = { ...a[i], label: e.target.value }; set('registration_questions', a) }} />
                  <button className="btn" onClick={() => set('registration_questions', f.registration_questions.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear evento')}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, full, children }) {
  return <div className="field" style={full ? { gridColumn: '1 / -1', margin: 0 } : { margin: 0 }}><label className="label">{label}</label>{children}</div>
}

function Registrations({ centroId, eventId, onChange }) {
  const [regs, setRegs] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(null)
  const [showInv, setShowInv] = useState(false)
  const [inv, setInv] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await listarRegistros(centroId, eventId)
    if (res.error) setStatus('❌ ' + res.error)
    setRegs(res.registrations || [])
  }, [centroId, eventId])
  useEffect(() => { load() }, [load])

  async function setAsist(reg, attended) {
    setBusy(reg.id + 'a')
    const res = await marcarAsistencia(centroId, eventId, reg.id, attended)
    if (res.error) setStatus('❌ ' + res.error); else { await load(); onChange && onChange() }
    setBusy(null)
  }
  async function setPagoR(reg, paid) {
    setBusy(reg.id + 'p')
    const res = await marcarPago(centroId, eventId, reg.id, paid)
    if (res.error) setStatus('❌ ' + res.error); else { await load(); onChange && onChange() }
    setBusy(null)
  }
  async function addInv(e) {
    e.preventDefault()
    if (!inv.first_name.trim()) { setStatus('❌ El nombre es requerido.'); return }
    setSaving(true); setStatus('')
    const res = await agregarInvitado(centroId, eventId, inv)
    if (res.error) setStatus('❌ ' + res.error)
    else { setInv({ first_name: '', last_name: '', email: '', phone: '' }); setShowInv(false); await load(); onChange && onChange() }
    setSaving(false)
  }

  return (
    <div style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="label">Registrados {regs ? `(${regs.length})` : ''}</span>
        <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowInv((v) => !v)}>{showInv ? '✕ Cancelar' : '+ Agregar invitado'}</button>
      </div>
      {status && <div className="alert alert--error" style={{ marginBottom: 10 }}>{status.replace(/^❌\s*/, '')}</div>}
      {showInv && (
        <form onSubmit={addInv} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14, padding: 12, background: 'var(--surface-3)', borderRadius: 'var(--r-sm)' }}>
          {[['first_name', 'Nombre *'], ['last_name', 'Apellido'], ['email', 'Correo'], ['phone', 'Teléfono']].map(([k, l]) => (
            <div className="field" style={{ flex: '1 1 130px', margin: 0 }} key={k}><label className="label">{l}</label><input className="input" value={inv[k]} onChange={(e) => setInv({ ...inv, [k]: e.target.value })} /></div>
          ))}
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? '…' : 'Agregar'}</button>
        </form>
      )}
      {regs === null ? <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 8 }}>Cargando…</div>
        : regs.length === 0 ? <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 8 }}>Sin registros todavía.</div>
          : (
            <table className="table" style={{ background: 'var(--surface)' }}>
              <thead><tr>{['Nombre', 'Contacto', 'Origen', 'Pago', 'Asistencia'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{r.email || r.phone || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{FUENTE_TXT[r.registration_source] || r.registration_source || '—'}</td>
                    <td>
                      <button onClick={() => setPagoR(r, r.payment_status !== 'paid')} disabled={busy === r.id + 'p'}
                        className={`pill ${r.payment_status === 'paid' ? 'pill--ok' : 'pill--warn'}`} style={{ fontSize: 10, cursor: 'pointer', border: 'none' }}>
                        {r.payment_status === 'paid' ? 'Pagado' : r.payment_status === 'waived' ? 'Gratis' : 'Pendiente'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setAsist(r, true)} disabled={busy === r.id + 'a'}
                          style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${r.attendance_status === 'attended' ? 'var(--ok-line)' : 'var(--border-strong)'}`, background: r.attendance_status === 'attended' ? 'var(--ok-bg)' : 'transparent', color: r.attendance_status === 'attended' ? 'var(--ok)' : 'var(--text-dim)' }}>✓ Asistió</button>
                        <button onClick={() => setAsist(r, false)} disabled={busy === r.id + 'a'}
                          style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${r.attendance_status === 'no_show' ? 'var(--bad-line)' : 'var(--border-strong)'}`, background: r.attendance_status === 'no_show' ? 'var(--bad-bg)' : 'transparent', color: r.attendance_status === 'no_show' ? '#FCA5A5' : 'var(--text-dim)' }}>No vino</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </div>
  )
}
