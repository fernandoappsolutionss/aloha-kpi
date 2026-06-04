'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { eventosConfig, listarEventos, crearEvento, listarRegistros, agregarInvitado, marcarAsistencia } from '../../../actions/eventos'

const ESTADO_PILL = { published: 'pill--ok', draft: 'pill--warn', completed: 'pill--warn', cancelled: 'pill--bad' }
const ESTADO_TXT = { published: 'Publicado', draft: 'Borrador', completed: 'Finalizado', cancelled: 'Cancelado' }
const ASIST_TXT = { attended: 'Asistió', no_show: 'No asistió', registered: 'Registrado', cancelled: 'Cancelado' }
const FUENTE_TXT = { aloha_kpi: 'ALOHA KPI', vendedor: 'Vendedor', public: 'Público', ai_agent: 'Agente IA' }
const fmtFecha = (d) => d ? new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function EventosPage() {
  const { id } = useParams()
  const [rol, setRol] = useState('usuario')
  const [config, setConfig] = useState({ configured: true })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [form, setForm] = useState({ name: '', start_date: '', event_type: 'in_person', location: '', meeting_url: '', max_capacity: '', status: 'published', description: '' })

  useEffect(() => { setRol(localStorage.getItem('aloha_rol') || 'usuario') }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await eventosConfig(); setConfig(cfg)
      const res = await listarEventos(id)
      if (res.error) setStatus('❌ ' + res.error)
      setEvents(res.events || [])
    } catch (e) { setStatus('❌ ' + e.message) }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.start_date) { setStatus('❌ Nombre y fecha son requeridos.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await crearEvento(id, form)
      if (res.error) throw new Error(res.error)
      setStatus('✅ Evento creado y registrado en el CRM.')
      setShowForm(false)
      setForm({ name: '', start_date: '', event_type: 'in_person', location: '', meeting_url: '', max_capacity: '', status: 'published', description: '' })
      load()
    } catch (e) { setStatus('❌ ' + e.message) }
    setSaving(false)
  }

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')

  return (
    <div className="shell">
      <Sidebar rol={rol} centroId={id} />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Eventos</div>
            <h1 className="h-title">Eventos</h1>
            <p className="h-sub">Clases de prueba y eventos · sincronizados con el CRM</p>
          </div>
          <button onClick={() => { setStatus(''); setShowForm(v => !v) }} className={`btn${showForm ? '' : ' btn--primary'}`}>
            {showForm ? '✕ Cancelar' : '+ Nuevo evento'}
          </button>
        </div>

        {!config.configured && (
          <div className="alert alert--error" style={{ marginBottom: 16 }}>
            La conexión con el CRM aún no está configurada (faltan <b>CRM_API_URL</b> / <b>CRM_SERVICE_TOKEN</b>). Los eventos no se podrán crear ni listar hasta configurarla.
          </div>
        )}
        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }}>
            {statusText}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 className="panel__title" style={{ marginBottom: 18 }}>Crear evento</h3>
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Nombre del evento *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Calle 50 — Clase de prueba" />
                </div>
                <div className="field">
                  <label className="label">Fecha y hora de inicio *</label>
                  <input type="datetime-local" className="input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Modalidad</label>
                  <select className="input" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
                    <option value="in_person">Presencial</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                {form.event_type === 'online' ? (
                  <div className="field">
                    <label className="label">Link de la reunión</label>
                    <input className="input" value={form.meeting_url} onChange={e => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://meet…" />
                  </div>
                ) : (
                  <div className="field">
                    <label className="label">Lugar</label>
                    <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Dirección / salón" />
                  </div>
                )}
                <div className="field">
                  <label className="label">Cupo máximo</label>
                  <input type="number" min="0" className="input" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: e.target.value })} placeholder="(sin límite)" />
                </div>
                <div className="field">
                  <label className="label">Estado</label>
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="published">Publicado</option>
                    <option value="draft">Borrador</option>
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Descripción</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={saving || !config.configured}>{saving ? 'Creando…' : 'Crear evento'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Evento', 'Fecha', 'Modalidad', 'Estado', 'Registrados', ''].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando…</td></tr>
                ) : events.length === 0 ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Aún no hay eventos. Crea el primero con “+ Nuevo evento”.</td></tr>
                ) : events.map((ev) => (
                  <EventRow key={ev.id} ev={ev} centroId={id} open={openId === ev.id}
                    onToggle={() => setOpenId(openId === ev.id ? null : ev.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function EventRow({ ev, centroId, open, onToggle }) {
  const count = ev.registrations?.[0]?.count ?? ev.registration_count ?? 0
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{ev.name}</td>
        <td className="num" style={{ color: 'var(--text-dim)', fontSize: 12 }}>{fmtFecha(ev.start_date)}</td>
        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ev.event_type === 'online' ? 'Online' : 'Presencial'}</td>
        <td><span className={`pill ${ESTADO_PILL[ev.status] || 'pill--warn'}`}><span className="dot" />{ESTADO_TXT[ev.status] || ev.status}</span></td>
        <td className="num" style={{ fontWeight: 600, color: 'var(--text)' }}>{count}</td>
        <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: 12 }}>{open ? '▲ Ocultar' : '▼ Registros'}</td>
      </tr>
      {open && (
        <tr style={{ cursor: 'default' }}>
          <td colSpan={6} style={{ background: 'var(--surface-2)', padding: 0 }}>
            <Registrations centroId={centroId} eventId={ev.id} />
          </td>
        </tr>
      )}
    </>
  )
}

function Registrations({ centroId, eventId }) {
  const [regs, setRegs] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(null)
  const [showInv, setShowInv] = useState(false)
  const [inv, setInv] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await listarRegistros(centroId, eventId)
    if (res.error) setStatus('❌ ' + res.error)
    setRegs(res.registrations || [])
  }, [centroId, eventId])
  useEffect(() => { load() }, [load])

  async function setAsist(reg, attended) {
    setBusy(reg.id)
    try {
      const res = await marcarAsistencia(centroId, eventId, reg.id, attended)
      if (res.error) throw new Error(res.error)
      await load()
    } catch (e) { setStatus('❌ ' + e.message) }
    setBusy(null)
  }
  async function addInv(e) {
    e.preventDefault()
    if (!inv.first_name.trim()) { setStatus('❌ El nombre es requerido.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await agregarInvitado(centroId, eventId, inv)
      if (res.error) throw new Error(res.error)
      setInv({ first_name: '', last_name: '', email: '', phone: '', notes: '' }); setShowInv(false)
      await load()
    } catch (e) { setStatus('❌ ' + e.message) }
    setSaving(false)
  }

  return (
    <div style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="label">Registrados {regs ? `(${regs.length})` : ''}</span>
        <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowInv(v => !v)}>
          {showInv ? '✕ Cancelar' : '+ Agregar invitado'}
        </button>
      </div>

      {status && <div className="alert alert--error" style={{ marginBottom: 10 }}>{status.replace(/^❌\s*/, '')}</div>}

      {showInv && (
        <form onSubmit={addInv} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14, padding: 12, background: 'var(--surface-3)', borderRadius: 'var(--r-sm)' }}>
          <div className="field" style={{ flex: '1 1 140px', margin: 0 }}><label className="label">Nombre *</label><input className="input" value={inv.first_name} onChange={e => setInv({ ...inv, first_name: e.target.value })} /></div>
          <div className="field" style={{ flex: '1 1 140px', margin: 0 }}><label className="label">Apellido</label><input className="input" value={inv.last_name} onChange={e => setInv({ ...inv, last_name: e.target.value })} /></div>
          <div className="field" style={{ flex: '1 1 160px', margin: 0 }}><label className="label">Correo</label><input className="input" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} /></div>
          <div className="field" style={{ flex: '1 1 120px', margin: 0 }}><label className="label">Teléfono</label><input className="input" value={inv.phone} onChange={e => setInv({ ...inv, phone: e.target.value })} /></div>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? '…' : 'Agregar'}</button>
        </form>
      )}

      {regs === null ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 8 }}>Cargando registros…</div>
      ) : regs.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 8 }}>Sin registros todavía.</div>
      ) : (
        <table className="table" style={{ background: 'var(--surface)' }}>
          <thead><tr>{['Nombre', 'Contacto', 'Origen', 'Pago', 'Asistencia'].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id} style={{ cursor: 'default' }}>
                <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{r.email || r.phone || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{FUENTE_TXT[r.registration_source] || r.registration_source || '—'}</td>
                <td><span className={`pill ${r.payment_status === 'paid' ? 'pill--ok' : 'pill--warn'}`} style={{ fontSize: 10 }}>{r.payment_status === 'paid' ? 'Pagado' : r.payment_status === 'waived' ? 'Gratis' : 'Pendiente'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setAsist(r, true)} disabled={busy === r.id}
                      style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${r.attendance_status === 'attended' ? 'var(--ok-line)' : 'var(--border-strong)'}`,
                        background: r.attendance_status === 'attended' ? 'var(--ok-bg)' : 'transparent',
                        color: r.attendance_status === 'attended' ? 'var(--ok)' : 'var(--text-dim)' }}>
                      ✓ Asistió
                    </button>
                    <button onClick={() => setAsist(r, false)} disabled={busy === r.id}
                      style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${r.attendance_status === 'no_show' ? 'var(--bad-line)' : 'var(--border-strong)'}`,
                        background: r.attendance_status === 'no_show' ? 'var(--bad-bg)' : 'transparent',
                        color: r.attendance_status === 'no_show' ? '#FCA5A5' : 'var(--text-dim)' }}>
                      No vino
                    </button>
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
