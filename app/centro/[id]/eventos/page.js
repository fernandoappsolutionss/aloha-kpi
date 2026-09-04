'use client'
import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import OperationalCard from '../../../../components/OperationalCard'
import Sidebar from '../../../../components/Sidebar'
import {
  eventosConfig, opcionesFormulario, listarEventos, crearEvento, actualizarEvento,
  eliminarEvento, duplicarEvento, listarRegistros, agregarInvitado, marcarAsistencia, marcarPago,
} from '../../../actions/eventos'
import { listarGruposActivos } from '../../../actions/grupos'
import { inscribirEstudiante } from '../../../actions/estudiantes'
import { origenDeRegistro } from '../../../../lib/registro-origen'
import { ITINERARIOS, NIVEL_MAX, ORIGENES_VENTA, hoyISO } from '../../../../lib/operaciones'
import { NINOS_POR_GRUPO_MODELO } from '../../../../lib/modelo'
import { AVISO_CERRADO_A_NUEVOS, aceptaNuevosEnSelector, etiquetaGrupoSelector, ordenarPorLimiteNuevos } from '../../../../lib/colocacion.mjs'
import Dialog, { useDialogCallback } from '../../../../components/Dialog'
import TableScroller from '../../../../components/TableScroller'

function useMobileCards() {
  const [mobile,setMobile]=useState(false)
  useEffect(()=>{const media=window.matchMedia('(max-width: 767px)');const update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
  return mobile
}
const ESTADO_PILL = { published: 'pill--ok', draft: 'pill--warn', completed: 'pill--warn', cancelled: 'pill--bad' }
const ESTADO_TXT = { published: 'Publicado', draft: 'Borrador', completed: 'Finalizado', cancelled: 'Cancelado' }
const TZ_OFFSET = { 'America/Panama': '-05:00', 'America/Caracas': '-04:00' }
const fmtFecha = (d) => d ? new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0
const ACTION_MENU_WIDTH = 238
const ORIGEN_VENTA_LABELS = {
  referido: 'Referido',
  marketing: 'Marketing',
  centro: 'Centro',
  activaciones: 'Activaciones',
  medios: 'Medios',
}
// Semáforo de cupos del grupo por aperturar: verde >3, ámbar 1–3, rojo 0.
const cupoColor = (n) => n === 0 ? 'var(--bad)' : n <= 3 ? 'var(--warn)' : 'var(--ok)'
const cupoTexto = (n) => n === 0 ? 'grupo lleno' : `quedan ${n} de ${NINOS_POR_GRUPO_MODELO} cupos`
const clamp = (min, value, max) => Math.min(Math.max(value, min), Math.max(min, max))
function positionFloating(trigger, menu) {
  const t = trigger.getBoundingClientRect()
  const m = menu.getBoundingClientRect()
  return {
    left: clamp(8, t.right - m.width, window.innerWidth - m.width - 8),
    top: clamp(8, t.bottom + 6, window.innerHeight - m.height - 8),
  }
}

function monthKey(date, timeZone = 'America/Panama') {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  return year && month ? `${year}-${month}` : ''
}
function eventMonthKey(event, fallbackTz) {
  return event?.start_date ? monthKey(new Date(event.start_date), event.timezone || fallbackTz) : ''
}

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
  is_free: true, price: '', currency: 'USD', status: 'published', grupo_id: '',
  sales_team_id: '', pipeline_stage_id: '', attended_stage_id: '', won_stage_id: '',
  registration_questions: [],
}

export default function EventosPage() {
  const { id } = useParams()
  const mobileCards=useMobileCards()
  const [loadError,setLoadError]=useState('')
  const defaultTz = String(id) === '10' ? 'America/Caracas' : 'America/Panama'
  const [rol, setRol] = useState('usuario')
  // El asistente registra clases de prueba, pero no las elimina.
  const esAsistente = rol === 'asistente'
  const [config, setConfig] = useState({ configured: true, baseUrl: '' })
  const [opts, setOpts] = useState({ sales_teams: [], pipeline_stages: [] })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState('mes_actual')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [openId, setOpenId] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState(null)
  const menuRef = useRef(null)
  const menuTriggerRef = useRef(null)
  const [editing, setEditing] = useState(null) // null=cerrado, {}=nuevo, {...}=editar

  useEffect(() => { setRol(localStorage.getItem('aloha_rol') || 'usuario') }, [])

  const load = useCallback(async () => {
    setLoading(true);setLoadError('')
    try {
      const cfg = await eventosConfig(); setConfig(cfg)
      const [evRes, opRes] = await Promise.all([listarEventos(id), opcionesFormulario(id)])
      if (evRes.error || opRes.error) setLoadError(evRes.error || opRes.error)
      setEvents(evRes.events || [])
      setOpts({ sales_teams: opRes.sales_teams || [], pipeline_stages: opRes.pipeline_stages || [] })
    } catch (e) { setLoadError(e.message || 'No se pudieron cargar las clases.') }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  const currentMonthKey = monthKey(new Date(), defaultTz)
  const periodEvents = events.filter((e) =>
    filterPeriodo === 'todos' || eventMonthKey(e, defaultTz) === currentMonthKey)

  // Stats agregadas (tarjetas como en el CRM).
  const agg = periodEvents.reduce((a, e) => {
    const s = e.stats || {}
    a.total += s.total || 0; a.attended += s.attended || 0; a.not_attended += s.not_attended || 0
    a.pending += s.pending || 0; a.paid += s.paid || 0; a.revenue += s.total_revenue || 0
    return a
  }, { total: 0, attended: 0, not_attended: 0, pending: 0, paid: 0, revenue: 0 })

  const visible = periodEvents.filter((e) =>
    (filterEstado === 'todos' || e.status === filterEstado) &&
    (!q || (e.name || '').toLowerCase().includes(q.toLowerCase())))

  const closeActionMenu = useCallback(({ restoreFocus = true } = {}) => {
    const trigger = menuTriggerRef.current
    if (restoreFocus && trigger?.isConnected) trigger.focus()
    setMenuId(null)
    setMenuPos(null)
  }, [])

  useEffect(() => {
    if (!menuId) return undefined
    const position = () => {
      if (!menuTriggerRef.current?.isConnected || !menuRef.current) return
      setMenuPos(positionFloating(menuTriggerRef.current, menuRef.current))
    }
    const frame = requestAnimationFrame(() => {
      position()
    })
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      closeActionMenu()
    }
    window.addEventListener('resize', position)
    window.addEventListener('orientationchange', position)
    window.visualViewport?.addEventListener('resize', position)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', position)
      window.removeEventListener('orientationchange', position)
      window.visualViewport?.removeEventListener('resize', position)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuId, mobileCards, closeActionMenu])

  const menuVisible = menuPos !== null
  useEffect(() => {
    if (menuVisible) menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true })
  }, [menuId, menuVisible])

  async function onDelete(ev) {
    closeActionMenu()
    if (!confirm(`¿Eliminar la clase de prueba "${ev.name}"? Esta acción no se puede deshacer.`)) return
    setStatus('')
    const res = await eliminarEvento(id, ev.id)
    if (res.error) setStatus('❌ ' + res.error); else { setStatus('✅ Clase de prueba eliminada.'); load() }
  }
  async function onDuplicate(ev) {
    closeActionMenu(); setStatus('')
    const res = await duplicarEvento(id, ev.id)
    if (res.error) setStatus('❌ ' + res.error); else { setStatus('✅ Clase de prueba duplicada (queda en borrador).'); load() }
  }
  function copy(text, msg) {
    closeActionMenu()
    navigator.clipboard?.writeText(text).then(() => setStatus('✅ ' + msg)).catch(() => setStatus('Link: ' + text))
  }
  function toggleActionMenu(e, ev) {
    e.stopPropagation()
    if (menuId === ev.id) { closeActionMenu(); return }
    menuTriggerRef.current = e.currentTarget
    setMenuPos(null)
    setMenuId(ev.id)
  }
  const segUrl = (e) => `${config.baseUrl}/events/tracking/${e.tracking_token}`

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')
  const CARDS = [
    { l: 'Registrados', v: agg.total, c: 'var(--text)' },
    { l: 'Asistieron', v: `${pct(agg.attended, agg.total)}%`, s: `${agg.attended}`, c: 'var(--ok)' },
    { l: 'No asistieron', v: `${pct(agg.not_attended, agg.total)}%`, s: `${agg.not_attended}`, c: 'var(--bad)' },
    { l: 'Pendientes', v: `${pct(agg.pending, agg.total)}%`, s: `${agg.pending}`, c: 'var(--warn)' },
    { l: 'Pagados', v: `${pct(agg.paid, agg.total)}%`, s: `${agg.paid}`, c: 'var(--ok-text)' },
    { l: 'En compras', v: `$${agg.revenue.toLocaleString()}`, c: 'var(--text)' },
  ]
  const eventActions = ev => <button type="button" ref={node=>{if(node && menuId===ev.id)menuTriggerRef.current=node}} onClick={e=>toggleActionMenu(e,ev)} className="btn" style={{padding:'3px 10px',fontSize:16,lineHeight:1,minWidth:44}} aria-label={`Acciones de ${ev.name}`} aria-haspopup="menu" aria-expanded={menuId===ev.id}>⋯</button>
  const registrationButton = ev => <button type="button" className="btn" aria-label={`Ver registros de ${ev.name}`} aria-expanded={openId===ev.id} aria-controls={`registros-${ev.id}`} onClick={()=>setOpenId(openId===ev.id?null:ev.id)}>Ver registros</button>
  const menuEvent = menuId ? events.find((ev) => ev.id === menuId) : null

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroId={id} />
      <main id="main-content" className="main events-page" data-page-state={loading ? 'loading' : loadError ? 'error' : 'ready'}>
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Clases de prueba</div>
            <h1 className="h-title">Clases de Prueba</h1>
            <p className="h-sub">Clases de prueba sincronizadas con el CRM</p>
          </div>
          <button onClick={() => { setStatus(''); setEditing({ ...EMPTY, timezone: defaultTz }) }} className="btn btn--primary" data-tour="eventos.nueva" disabled={!config.configured}>+ Nueva clase de prueba</button>
        </div>

        {loadError && <div role="alert" className="alert alert--error">{loadError} <Link className="btn" href={`/centro/${id}`}>Volver al centro</Link></div>}
        {loading && <div role="status">Cargando clases…</div>}
        {!config.configured && (
          <div className="alert alert--error" style={{ marginBottom: 16 }}>
            La conexión con el CRM no está configurada (faltan <b>CRM_API_URL</b> / <b>CRM_SERVICE_TOKEN</b>).
          </div>
        )}
        {status && (
          <div role={isError ? "alert" : "status"} className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)' }}>{statusText}</div>
        )}

        {/* Tarjetas de stats */}
        <div className="responsive-grid events-metrics" data-tour="eventos.metricas">
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
          <input className="input" style={{ maxWidth: 280 }} name="busqueda" aria-label="Buscar clases por nombre" placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Periodo de las clases" className="input" style={{ maxWidth: 180 }} value={filterPeriodo} onChange={(e) => { setFilterPeriodo(e.target.value); setOpenId(null) }}>
            <option value="mes_actual">Este mes</option>
            <option value="todos">Todos los meses</option>
          </select>
          <select aria-label="Estado de las clases" className="input" style={{ maxWidth: 200 }} value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        {!loadError && <div className="panel" data-tour="eventos.lista">
          {mobileCards ? <div className="operational-list">{visible.map(ev=><OperationalCard headingLevel={2} key={ev.id} title={ev.name} subtitle={ev.location} status={ESTADO_TXT[ev.status]||ev.status} fields={[{label:'Fecha',value:fmtFecha(ev.start_date)},{label:'Tipo',value:ev.event_type==='online'?'Online':'Presencial'},{label:'Grupo',value:ev.grupo?`Grupo ${ev.grupo.numero} · ${ev.grupo.horarioTexto||''} · ${ev.grupo.cerrado?'cerrado a inscripciones':cupoTexto(ev.grupo.cupos)}`:'Sin grupo relacionado'},{label:'Registros',value:`${ev.stats?.total??ev.registration_count??0}${ev.max_capacity?'/'+ev.max_capacity:''}`},{label:'Precio',value:ev.is_free?'Gratis':`${ev.price} ${ev.currency}`}]} actions={<>{registrationButton(ev)}{eventActions(ev)}</>}/>)}</div> : <TableScroller label="Clases de prueba">
            <table className="table">
              <thead><tr>{['Clase de prueba', 'Fecha', 'Tipo', 'Estado', 'Registros', 'Precio', ''].map((h) => <th key={h} data-actions={!h || undefined}>{h || 'Acciones'}</th>)}</tr></thead>
              <tbody>
                {loading ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando…</td></tr>
                ) : visible.length === 0 ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>{events.length === 0 ? 'Aún no hay clases de prueba. Crea la primera con “+ Nueva clase de prueba”.' : 'Sin resultados para el filtro.'}</td></tr>
                ) : visible.map((ev) => {
                  const count = ev.stats?.total ?? ev.registration_count ?? 0
                  return (
                    <Fragment key={ev.id}>
                      <tr>
                        <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
                          {ev.name}<div>{registrationButton(ev)}</div>
                          {ev.location && <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>📍 {ev.location}</div>}
                          {ev.grupo ? (
                            <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>
                              Grupo {ev.grupo.numero}{ev.grupo.horarioTexto ? ` · ${ev.grupo.horarioTexto}` : ''} · <span style={{ color: cupoColor(ev.grupo.cupos), fontWeight: 600 }}>{ev.grupo.cerrado ? '🔒 grupo cerrado a inscripciones' : cupoTexto(ev.grupo.cupos)}</span>
                            </div>
                          ) : (
                            <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>Sin grupo relacionado</div>
                          )}
                        </td>
                        <td className="num" style={{ color: 'var(--text-dim)', fontSize: 13 }}>{fmtFecha(ev.start_date)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{ev.event_type === 'online' ? 'Online' : 'Presencial'}</td>
                        <td><span className={`pill ${ESTADO_PILL[ev.status] || 'pill--warn'}`}><span className="dot" />{ESTADO_TXT[ev.status] || ev.status}</span></td>
                        <td className="num" style={{ fontWeight: 600, color: 'var(--text)' }}>{count}{ev.max_capacity ? `/${ev.max_capacity}` : ''}</td>
                        <td style={{ fontSize: 13 }}>{ev.is_free ? <span className="pill pill--ok" style={{ fontSize: 13 }}>Gratis</span> : `$${ev.price} ${ev.currency}`}</td>
                        <td style={{ textAlign: 'right' }}>
                          {eventActions(ev)}
                        </td>
                      </tr>

                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </TableScroller>}
          {mobileCards && !loading && visible.length===0 && <div role="status" className="empty">Sin clases para estos filtros.</div>}
          {openId && visible.some(ev=>ev.id===openId) && <section id={`registros-${openId}`} aria-label="Registros de la clase"><Registrations key={openId} centroId={id} eventId={openId} grupoId={events.find(ev=>ev.id===openId)?.grupo?.id} onChange={load}/></section>}
        </div>}
      </main>

      {menuId && <section aria-label="Acciones de la clase de prueba">
      <div onPointerDown={() => closeActionMenu()} style={{ position: 'fixed', inset: 0, zIndex: 55 }} />
      {menuEvent && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Acciones de ${menuEvent.name}`}
          style={{ position: 'fixed', left: menuPos?.left ?? 8, top: menuPos?.top ?? 8, visibility: menuPos ? 'visible' : 'hidden', zIndex: 60, background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', boxShadow: '0 18px 42px rgba(0,0,0,0.28)', width: ACTION_MENU_WIDTH, maxWidth: 'calc(100vw - 16px)', padding: 6, textAlign: 'left' }}
        >
          {[
            ['✏️ Editar', () => { closeActionMenu(); openEdit(menuEvent, setEditing) }],
            ['⧉ Duplicar', () => onDuplicate(menuEvent)],
            ['📈 Copiar link de seguimiento', () => copy(segUrl(menuEvent), 'Link de seguimiento copiado.')],
            !esAsistente && ['🗑 Eliminar', () => onDelete(menuEvent), true],
          ].filter(Boolean).map(([txt, fn, danger], k) => (
            <button key={k} type="button" role="menuitem" onClick={fn}
              style={{ display: 'block', width: '100%', minHeight: 44, textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: danger ? 'var(--bad)' : 'var(--text-muted)', borderRadius: 6 }}>
              {txt}
            </button>
          ))}
        </div>
      )}

      </section>}

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
    status: ev.status || 'published', grupo_id: ev.grupo?.id ? String(ev.grupo.id) : '',
    sales_team_id: ev.sales_team_id || '', pipeline_stage_id: ev.pipeline_stage_id || '',
    attended_stage_id: ev.attended_stage_id || '', won_stage_id: ev.won_stage_id || '',
    registration_questions: Array.isArray(ev.registration_questions) ? ev.registration_questions : [],
  })
}

function EventModal({ centroId, opts, initial, onClose, onSaved }) {
  const complete = useDialogCallback(onSaved, centroId)
  const [tab, setTab] = useState('info')
  const [f, setF] = useState(initial)
  const [grupos, setGrupos] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const isEdit = !!f.id

  useEffect(() => {
    listarGruposActivos(centroId).then((gs) => {
      const list = Array.isArray(gs) ? gs : []
      setGrupos(list)
      // Si el grupo del evento ya no está activo, el select queda en "Sin grupo"
      // (lo que se ve es lo que se guarda: al guardar se desvincula).
      setF((p) => (p.grupo_id && !list.some((g) => String(g.id) === String(p.grupo_id)) ? { ...p, grupo_id: '' } : p))
    }).catch(() => setGrupos([]))
  }, [centroId])
  const grupoSel = (grupos || []).find((g) => String(g.id) === String(f.grupo_id)) || null
  // (Defecto 9) El selector solo ofrece grupos que aceptan niños NUEVOS,
  // ordenados por cierre de ventana (el que cierra primero arriba). El vínculo
  // actual cerrado a nuevos queda visible como opción deshabilitada — el
  // server permite CONSERVARLO al editar, nunca se desvincula en silencio;
  // para moverlo hay que reasignar a un grupo abierto.
  const hoy = hoyISO()
  const abiertos = ordenarPorLimiteNuevos((grupos || []).filter((g) => aceptaNuevosEnSelector(g, hoy)))
  const vinculoCerrado = grupoSel && !aceptaNuevosEnSelector(grupoSel, hoy) ? grupoSel : null

  async function save() {
    if (!f.name.trim() || !f.startLocal) { setErr('Nombre y fecha de inicio son requeridos.'); setTab('info'); return }
    setSaving(true); setErr('')
    const data = {
      ...f,
      grupo_id: f.grupo_id ? Number(f.grupo_id) : null,
      start_date: localToISO(f.startLocal, f.timezone),
      end_date: f.endLocal ? localToISO(f.endLocal, f.timezone) : null,
    }
    try {
      const res = isEdit ? await actualizarEvento(centroId, f.id, data) : await crearEvento(centroId, data)
      if (res.error) setErr(res.error); else complete(isEdit ? 'Clase de prueba actualizada.' : 'Clase de prueba creada en el CRM.')
    } catch {
      setErr('No se pudo guardar. Revisa tu conexión e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const stages = opts.pipeline_stages || []
  const TABS = [['info', 'Información'], ['pago', 'Precio y Pago'], ['preg', 'Preguntas']]

  return (
    <Dialog
      open
      title={isEdit ? 'Editar clase de prueba' : 'Crear clase de prueba'}
      width={640}
      onClose={onClose}
      closeDisabled={saving}
      footer={(
        <>
          <button className="btn" data-tour="evento.cancelar" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn--primary" data-tour="evento.crear" onClick={save} disabled={saving}>{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear clase de prueba')}</button>
        </>
      )}
    >
      <div role="tablist" aria-label="Secciones de la clase de prueba" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn${tab === k ? ' btn--primary' : ''}`} style={{ padding: '6px 14px', fontSize: 13 }}>{l}</button>
        ))}
      </div>

      {err && <div role="alert" className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}

      {tab === 'info' && (
            <div className="dialog-form-grid">
              <Field full label="Nombre de la clase de prueba *"><input name="name" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Calle 50 — Clase de prueba" /></Field>
              <Field full label="Descripción"><textarea name="description" className="input" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
              <Field full label="Grupo que se va a aperturar" tour="evento.grupo">
                <select name="grupo_id" className="input" value={f.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
                  <option value="">{grupos === null ? 'Cargando grupos…' : 'Sin grupo'}</option>
                  {vinculoCerrado && (
                    <option value={vinculoCerrado.id} disabled>Grupo {vinculoCerrado.numero} · {vinculoCerrado.itinerario} · 🔒 {AVISO_CERRADO_A_NUEVOS}</option>
                  )}
                  {abiertos.map((g) => <option key={g.id} value={g.id}>{etiquetaGrupoSelector(g, hoy)}</option>)}
                </select>
                {grupoSel && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    {grupoSel.horarioTexto ? `${grupoSel.horarioTexto} · ` : ''}<span style={{ color: cupoColor(grupoSel.cupos), fontWeight: 600 }}>{cupoTexto(grupoSel.cupos)}</span>
                    {vinculoCerrado && <span style={{ color: 'var(--warn)', fontWeight: 600 }}> · 🔒 {AVISO_CERRADO_A_NUEVOS}</span>}
                  </div>
                )}
              </Field>
              <Field label="Zona horaria">
                <select name="timezone" className="input" value={f.timezone} onChange={(e) => set('timezone', e.target.value)}>
                  <option value="America/Panama">Panamá (GMT-5)</option>
                  <option value="America/Caracas">Venezuela (GMT-4)</option>
                </select>
              </Field>
              <Field label="Modalidad">
                <select name="event_type" className="input" value={f.event_type} onChange={(e) => set('event_type', e.target.value)}>
                  <option value="in_person">Presencial</option><option value="online">Online</option>
                </select>
              </Field>
              <Field label="Inicio *" tour="evento.inicio"><input name="start_date" type="datetime-local" className="input" value={f.startLocal} onChange={(e) => set('startLocal', e.target.value)} /></Field>
              <Field label="Fin"><input name="end_date" type="datetime-local" className="input" value={f.endLocal} onChange={(e) => set('endLocal', e.target.value)} /></Field>
              {f.event_type === 'online'
                ? <Field full label="Link de la reunión"><input name="meeting_url" className="input" value={f.meeting_url} onChange={(e) => set('meeting_url', e.target.value)} placeholder="https://zoom.us/…" /></Field>
                : <Field full label="Lugar"><input name="location" className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Dirección / salón" /></Field>}
              <Field label="Cupo máximo"><input name="max_capacity" type="number" min="0" className="input" value={f.max_capacity} onChange={(e) => set('max_capacity', e.target.value)} placeholder="(sin límite)" /></Field>
              <Field label="Estado">
                <select name="status" className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="published">Publicado</option><option value="draft">Borrador</option><option value="completed">Finalizado</option>
                </select>
              </Field>
            </div>
      )}

      {tab === 'pago' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input name="is_free" type="checkbox" checked={f.is_free} onChange={(e) => set('is_free', e.target.checked)} />
                <span><b style={{ color: 'var(--text)' }}>Evento gratuito</b><br /><span className="h-sub">Desactiva para establecer un precio</span></span>
              </label>
              {!f.is_free && (
                <div className="dialog-form-grid">
                  <Field label="Precio"><input name="price" type="number" min="0" className="input" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
                  <Field label="Moneda"><input name="currency" className="input" value={f.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
                </div>
              )}
              <Field label="Equipo asignado">
                <select name="sales_team_id" className="input" value={f.sales_team_id} onChange={(e) => set('sales_team_id', e.target.value)}>
                  <option value="">Todos los equipos (sin restricción)</option>
                  {opts.sales_teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Automatizaciones de pipeline</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[['pipeline_stage_id', '1. Al registrarse en el evento'], ['attended_stage_id', '2. Al marcar “Asistió”'], ['won_stage_id', '3. Al confirmar pago (ganado)']].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <select name={k} className="input" value={f[k]} onChange={(e) => set(k, e.target.value)}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <span className="h-sub" style={{ margin: 0 }}>Preguntas extra del formulario (además de nombre, email y teléfono).</span>
                <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => set('registration_questions', [...f.registration_questions, { label: '', type: 'text', required: false }])}>+ Agregar</button>
              </div>
              {f.registration_questions.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 10 }}>Sin preguntas personalizadas.</div>
              ) : f.registration_questions.map((qq, i) => (
                <fieldset key={i} className="events-question-fields">
                  <legend className="label">Pregunta personalizada {i + 1}</legend>
                  <Field label={`Pregunta ${i + 1}`}><input name={`pregunta_${i + 1}`} className="input" placeholder="Pregunta" value={qq.label} onChange={(e) => { const a = [...f.registration_questions]; a[i] = { ...a[i], label: e.target.value }; set('registration_questions', a) }} /></Field>
                  <button className="btn" aria-label={`Quitar pregunta ${i + 1}`} onClick={() => set('registration_questions', f.registration_questions.filter((_, j) => j !== i))}>✕</button>
                </fieldset>
              ))}
            </div>
      )}
    </Dialog>
  )
}

function Field({ label, full, tour, children }) {
  return <label className="field" data-tour={tour} style={full ? { gridColumn: '1 / -1', margin: 0 } : { margin: 0 }}><span className="label">{label}</span>{children}</label>
}

function Registrations({ centroId, eventId, grupoId, onChange }) {
  const mobileCards=useMobileCards()
  const [regs, setRegs] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(null)
  const [showInv, setShowInv] = useState(false)
  const [inv, setInv] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [inscribir, setInscribir] = useState(null) // registro a inscribir como estudiante
  const inscribirReturnFocusRef = useRef(null)
  const inscribirTriggerRef = (node, id) => { if (node && String(inscribir?.id) === String(id)) inscribirReturnFocusRef.current = node }

  const load = useCallback(async () => {
    try {
      const res = await listarRegistros(centroId, eventId)
      if (res.error) {setStatus('❌ ' + res.error);setRegs([]);return}
      setStatus('');setRegs(res.registrations || [])
    } catch {setStatus('❌ No se pudieron cargar los registros.');setRegs([])}
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
    <div className="events-registrations" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="label">Registrados {regs ? `(${regs.length})` : ''}</span>
        <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowInv((v) => !v)}>{showInv ? '✕ Cancelar' : '+ Agregar invitado'}</button>
      </div>
      {status && (
        <div role={status.includes('❌') ? 'alert' : 'status'} className={`alert${status.includes('❌') ? ' alert--error' : ''}`}
          style={status.includes('❌') ? { marginBottom: 10 } : { marginBottom: 10, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)' }}>
          {status.replace(/^[❌✅]\s*/, '')}
        </div>
      )}
      {showInv && (
        <form onSubmit={addInv} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14, padding: 12, background: 'var(--surface-3)', borderRadius: 'var(--r-sm)' }}>
          {[['first_name', 'Nombre *'], ['last_name', 'Apellido'], ['email', 'Correo'], ['phone', 'Teléfono']].map(([k, l]) => (
            <div className="field" style={{ flex: '1 1 130px', margin: 0 }} key={k}><label className="label" htmlFor={`invite-${k}`}>{l}</label><input id={`invite-${k}`} name={k} autoComplete={{first_name:'given-name',last_name:'family-name',email:'email',phone:'tel'}[k]} type={k==='email'?'email':k==='phone'?'tel':'text'} className="input" value={inv[k]} onChange={(e) => setInv({ ...inv, [k]: e.target.value })} /></div>
          ))}
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? '…' : 'Agregar'}</button>
        </form>
      )}
      {regs === null ? <div role="status" style={{ color: 'var(--text-dim)', fontSize: 12, padding: 8 }}>Cargando…</div>
        : status.includes('❌') ? null : regs.length === 0 ? <div role="status" style={{ color: 'var(--text-dim)', fontSize: 12, padding: 8 }}>Sin registros todavía.</div>
          : mobileCards ? <div className="operational-list">{regs.map(r=><OperationalCard key={r.id} title={[r.first_name,r.last_name].filter(Boolean).join(' ')} fields={[{label:'Teléfono',value:r.phone?<a href={`tel:${r.phone.replace(/[^\d+]/g,'')}`}>{r.phone}</a>:'Sin teléfono'},{label:'Correo',value:r.email||'—'},{label:'Quién lo registró',value:origenDeRegistro(r).nombre},{label:'Pago',value:r.payment_status==='paid'?'Pagado':r.payment_status==='waived'?'Gratis':'Pendiente'},{label:'Asistencia',value:r.attendance_status==='attended'?'Asistió':r.attendance_status==='no_show'?'No vino':r.attendance_status==='cancelled'?'Cancelado':'Pendiente'}]} actions={<>
            <button type="button" className="btn" disabled={busy===r.id+'p'} onClick={()=>setPagoR(r,r.payment_status!=='paid')}>{r.payment_status==='paid'?'Quitar pago':'Marcar pago'}</button>
            <button type="button" className="btn" disabled={busy===r.id+'a'} onClick={()=>setAsist(r,true)}>Asistió</button><button type="button" className="btn" disabled={busy===r.id+'a'} onClick={()=>setAsist(r,false)}>No vino</button><button ref={node => inscribirTriggerRef(node, r.id)} type="button" className="btn" onClick={()=>{setStatus('');setInscribir(r)}}>Inscribir</button>
          </>}/>)}</div> : (
            <TableScroller label="Inscritos en la clase"><table className="table" style={{ background: 'var(--surface)' }}>
              <thead><tr>{['Nombre', 'Teléfono / correo', 'Quién lo registró', 'Pago', 'Asistencia', ''].map((h, i) => <th key={i} data-actions={!h || undefined}>{h || 'Acciones'}</th>)}</tr></thead>
              <tbody>
                {regs.map((r) => {
                  const origen = origenDeRegistro(r)
                  const tel = (r.phone || '').trim()
                  return (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                    {/* Telefono PRIMERO: es por donde se le da seguimiento al lead.
                        Antes la celda era `email || phone`, asi que a quien tenia
                        correo no se le veia nunca el numero. */}
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                      {tel
                        ? <a href={`tel:${tel.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--text)', fontWeight: 600 }}>{tel}</a>
                        : <span style={{ color: 'var(--text-muted)' }}>Sin teléfono</span>}
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email || '—'}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }} title={origen.detalle}>
                      <span style={{ fontSize: 13, marginRight: 4 }}>{origen.icono}</span>{origen.nombre}
                    </td>
                    <td>
                      <button onClick={() => setPagoR(r, r.payment_status !== 'paid')} disabled={busy === r.id + 'p'}
                        className={`pill ${r.payment_status === 'paid' ? 'pill--ok' : 'pill--warn'}`} style={{ fontSize: 13, cursor: 'pointer', border: 'none' }}>
                        {r.payment_status === 'paid' ? 'Pagado' : r.payment_status === 'waived' ? 'Gratis' : 'Pendiente'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {/* Cancelado conserva su etiqueta (cuenta como no asistió en las stats);
                            los botones quedan por si el niño igual se presentó. */}
                        {r.attendance_status === 'cancelled' && (
                          <span className="pill pill--bad" style={{ fontSize: 13 }}>Cancelado</span>
                        )}
                        <button onClick={() => setAsist(r, true)} disabled={busy === r.id + 'a'}
                          style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${r.attendance_status === 'attended' ? 'var(--ok-line)' : 'var(--border-strong)'}`, background: r.attendance_status === 'attended' ? 'var(--ok-bg)' : 'transparent', color: r.attendance_status === 'attended' ? 'var(--ok)' : 'var(--text-dim)' }}>✓ Asistió</button>
                        <button onClick={() => setAsist(r, false)} disabled={busy === r.id + 'a'}
                          style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${r.attendance_status === 'no_show' ? 'var(--bad-line)' : 'var(--border-strong)'}`, background: r.attendance_status === 'no_show' ? 'var(--bad-bg)' : 'transparent', color: r.attendance_status === 'no_show' ? 'var(--bad-text)' : 'var(--text-dim)' }}>No vino</button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button ref={node => inscribirTriggerRef(node, r.id)} onClick={() => { setStatus(''); setInscribir(r) }} className="btn" style={{ padding: '4px 10px', fontSize: 12 }}>Inscribir</button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table></TableScroller>
          )}
      {inscribir && (
        <InscribirModal centroId={centroId} reg={inscribir} grupoId={grupoId}
          returnFocusRef={inscribirReturnFocusRef}
          onClose={() => setInscribir(null)}
          onSaved={(msg) => { setInscribir(null); setStatus('✅ ' + msg) }} />
      )}
    </div>
  )
}

// (Defecto 10) El niño de la clase de prueba entra al nivel VIGENTE del grupo
// vinculado: itinerario y nivel del formulario se inicializan DESDE el grupo
// (antes siempre TINY nivel 1) y se re-sincronizan al elegir otro grupo.
// El nivel viene de itinerario_clases del grupo, acotado al máximo del programa.
const desdeGrupo = (g) => {
  if (!g || !ITINERARIOS.includes(g.itinerario)) return {}
  return { itinerario: g.itinerario, nivel: Math.min(Math.max(1, Number(g.nivel) || 1), NIVEL_MAX[g.itinerario] || 1) }
}

// Pasa un registro de la clase de prueba al módulo de grupos: crea el
// estudiante con origen 'clase_prueba' y el crm_registration_id del registro
// (inscribirEstudiante rechaza el duplicado si ya fue inscrito). Si la clase
// de prueba tiene grupo por aperturar, viene preseleccionado en el select.
function InscribirModal({ centroId, reg, grupoId, onClose, onSaved, returnFocusRef }) {
  const complete = useDialogCallback(onSaved, centroId)
  const nombreReg = [reg.first_name, reg.last_name].filter(Boolean).join(' ')
  const [f, setF] = useState({
    nombre: nombreReg, itinerario: 'TINY', nivel: 1, grupo_id: grupoId ? String(grupoId) : '',
    origen_venta: '', representante: nombreReg, telefono: reg.phone || '', correo: reg.email || '',
  })
  const [grupos, setGrupos] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    listarGruposActivos(centroId).then((g) => {
      const list = Array.isArray(g) ? g : []
      setGrupos(list)
      setF((p) => {
        if (!p.grupo_id) return p
        const sel = list.find((x) => String(x.id) === String(p.grupo_id))
        // El grupo preseleccionado debe seguir activo Y abierto a niños
        // nuevos; si no, vuelve a "Sin grupo" (inscribir ahí lo rechazaría el
        // server de todas formas) y el aviso de abajo explica el porqué.
        if (!sel || !aceptaNuevosEnSelector(sel, hoyISO())) return { ...p, grupo_id: '' }
        // Vínculo vigente: el formulario arranca en el itinerario/nivel del grupo.
        return { ...p, ...desdeGrupo(sel) }
      })
    }).catch(() => setGrupos([]))
  }, [centroId])

  // Mismo criterio del selector del evento: solo grupos abiertos a nuevos,
  // ordenados por cierre de ventana.
  const hoy = hoyISO()
  const abiertos = ordenarPorLimiteNuevos((grupos || []).filter((g) => aceptaNuevosEnSelector(g, hoy)))
  const vinculado = grupoId ? (grupos || []).find((x) => String(x.id) === String(grupoId)) : null
  const vinculoCerrado = vinculado && !aceptaNuevosEnSelector(vinculado, hoy) ? vinculado : null

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre del niño es requerido.'); return }
    if (!f.origen_venta) { setErr('Selecciona el origen del nuevo ingreso.'); return }
    setSaving(true); setErr('')
    try {
      const res = await inscribirEstudiante(centroId, {
        nombre: f.nombre, itinerario: f.itinerario, nivel: f.nivel, grupo_id: f.grupo_id || null,
        origen: 'clase_prueba', origen_venta: f.origen_venta, crm_registration_id: String(reg.id),
        representante: f.representante, telefono: f.telefono, correo: f.correo,
      })
      if (res.error) { setErr(res.error); return }
      const g = (grupos || []).find((x) => String(x.id) === String(f.grupo_id))
      complete(g ? `Inscrito en el grupo ${g.numero}.` : 'Inscrito (sin grupo asignado).')
    } catch {
      setErr('No se pudo guardar. Revisa tu conexión e intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const niveles = Array.from({ length: NIVEL_MAX[f.itinerario] || 1 }, (_, i) => i + 1)
  return (
    <Dialog
      open
      title="Inscribir niño"
      returnFocusRef={returnFocusRef}
      width={480}
      onClose={onClose}
      closeDisabled={saving}
      footer={(
        <>
          <button className="btn" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Inscribiendo…' : 'Inscribir'}</button>
        </>
      )}
    >
      {err && <div role="alert" className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
          <div className="dialog-form-grid">
            <Field full label="Nombre del niño *"><input name="nombre" className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
            <Field label="Itinerario">
              <select name="itinerario" className="input" value={f.itinerario} onChange={(e) => setF((p) => ({ ...p, itinerario: e.target.value, nivel: 1 }))}>
                {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
              </select>
            </Field>
            <Field label="Nivel">
              <select name="nivel" className="input" value={f.nivel} onChange={(e) => set('nivel', parseInt(e.target.value))}>
                {niveles.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field full label="Grupo">
              <select name="grupo_id" className="input" value={f.grupo_id} onChange={(e) => {
                const sel = (grupos || []).find((x) => String(x.id) === String(e.target.value))
                setF((p) => ({ ...p, grupo_id: e.target.value, ...desdeGrupo(sel) }))
              }}>
                <option value="">{grupos === null ? 'Cargando grupos…' : 'Sin grupo (asignar después)'}</option>
                {abiertos.map((g) => <option key={g.id} value={g.id}>{etiquetaGrupoSelector(g, hoy)}</option>)}
              </select>
              {vinculoCerrado && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
                  El grupo {vinculoCerrado.numero} vinculado a esta clase está 🔒 {AVISO_CERRADO_A_NUEVOS}: elige un grupo abierto o deja al niño sin grupo.
                </div>
              )}
            </Field>
            <Field full label="Origen del nuevo ingreso *">
              <select name="origen_venta" className="input" value={f.origen_venta} onChange={(e) => set('origen_venta', e.target.value)}>
                <option value="">Seleccionar origen</option>
                {ORIGENES_VENTA.map((origen) => <option key={origen} value={origen}>{ORIGEN_VENTA_LABELS[origen]}</option>)}
              </select>
            </Field>
            <Field full label="Representante"><input name="representante" className="input" value={f.representante} onChange={(e) => set('representante', e.target.value)} /></Field>
            <Field label="Teléfono"><input type="tel" name="telefono" className="input" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
            <Field label="Correo"><input type="email" name="correo" className="input" value={f.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
          </div>
    </Dialog>
  )
}
