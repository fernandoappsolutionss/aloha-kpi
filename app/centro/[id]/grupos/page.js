'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import {
  loadOperaciones, crearGrupo, actualizarGrupo, cerrarGrupo, reabrirGrupo, siguienteNumero,
  saveCoach, toggleCoach, saveSalon, toggleSalon, sugerenciasFusion, aplicarFusion,
} from '../../../actions/grupos'
import {
  inscribirEstudiante, actualizarEstudiante, graduarTiny, marcarBajaPotencial,
  revertirBajaPotencial, retirarEstudiante, reincorporarEstudiante,
} from '../../../actions/estudiantes'
import {
  ITINERARIOS, NIVEL_MAX, MOTIVOS_RETIRO, MOTIVOS_RETIRO_LABELS, ORIGENES, DIAS, TINYMAP, aperturaMinima, hoyISO,
} from '../../../../lib/operaciones'
import { groupStatus, underMeta, promedios, sugerenciasPara, scoreBand } from '../../../../lib/fusiones'

// Pill por estado de grupo (claves de groupStatus en lib/fusiones).
const ESTADO_PILL = { estable: 'pill--ok', bajo: 'pill--bad', online: 'pill--warn', kinder: 'pill--warn', base: 'pill--warn', cerrado: 'pill--bad', fusionado: 'pill--warn' }
const BANDA_PILL = { Alta: 'pill--ok', Media: 'pill--warn', Baja: 'pill--bad', Bloqueado: 'pill--bad' }
const ORIGEN_LABELS = { clase_prueba: 'Clase de prueba', directo: 'Inscripción directa', traslado: 'Traslado de centro' }
const BTN_XS = { padding: '4px 10px', fontSize: 11 }

// Fechas DATE de Postgres llegan como string 'AAAA-MM-DD' o como Date según el driver.
const isoDia = (d) => {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  const dt = new Date(d)
  return isNaN(dt) ? '' : dt.toISOString().slice(0, 10)
}
const fmtDia = (d) => isoDia(d) || '—'
const horarioTexto = (horarios) =>
  (horarios || []).length ? horarios.map((h) => `${DIAS[h.dia]} ${h.hora_inicio}–${h.hora_fin}`).join(' · ') : 'Sin horario'

// Itinerarios y rangos de nivel presentes en el grupo, p. ej. "TINY 3–5 · KIDS 7".
function nivelesTexto(g) {
  const partes = []
  for (const it of ITINERARIOS) {
    const nvs = g.estudiantes.filter((e) => e.itinerario === it).map((e) => Number(e.nivel))
    if (!nvs.length) continue
    const min = Math.min(...nvs)
    const max = Math.max(...nvs)
    partes.push(`${it} ${min === max ? min : `${min}–${max}`}`)
  }
  return partes.length ? partes.join(' · ') : g.itinerario
}

export default function GruposPage() {
  const { id } = useParams()
  const router = useRouter()
  const [rol, setRol] = useState('usuario')
  const isAdmin = rol === 'admin_general' || rol === 'supervisor'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState('grupos')
  const [filtro, setFiltro] = useState('todos')
  const [openId, setOpenId] = useState(null)
  // Fusiones: se cargan al entrar al tab; se invalidan tras cada mutación.
  const [fus, setFus] = useState(null)
  const [fusLoading, setFusLoading] = useState(false)
  const [origenId, setOrigenId] = useState(null)
  const [busyFusion, setBusyFusion] = useState(null)
  // Modales
  const [grupoModal, setGrupoModal] = useState(null)
  const [inscribir, setInscribir] = useState(false)
  const [editEst, setEditEst] = useState(null)
  const [retiroEst, setRetiroEst] = useState(null)
  const [reincEst, setReincEst] = useState(null)

  useEffect(() => { setRol(localStorage.getItem('aloha_rol') || 'usuario') }, [])

  const load = useCallback(async () => {
    try {
      const res = await loadOperaciones(id)
      setData(res)
    } catch (e) { setStatus('❌ ' + e.message) }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    // fusLoading NO va en las deps ni en el guard: setearlo aquí re-dispararía
    // el efecto y su cleanup (vivo = false) descartaría el resultado en vuelo.
    if (tab !== 'fusiones' || fus) return
    let vivo = true
    setFusLoading(true)
    sugerenciasFusion(id).then((r) => { if (vivo) { setFus(r); setFusLoading(false) } }).catch(() => { if (vivo) setFusLoading(false) })
    return () => { vivo = false }
  }, [tab, fus, id])

  async function refresca() {
    setFus(null)
    await load()
  }

  const metas = data?.metas || { gpnMin: 8, cupoMax: 15 }
  const grupos = data?.grupos || []
  const activos = grupos.filter((g) => g.estado === 'activo')
  const bajoMetaN = activos.filter((g) => underMeta(g, metas.gpnMin)).length
  const prom = promedios(grupos, metas.gpnMin)
  const ninosActivos = grupos.reduce((s, g) => s + g.estudiantes.length, 0) + (data?.sinGrupo?.length || 0)

  const visibles = grupos.filter((g) => {
    const st = groupStatus(g, metas.gpnMin)
    if (filtro === 'todos') return g.estado === 'activo'
    if (filtro === 'bajo') return st.key === 'bajo'
    if (filtro === 'estables') return st.key === 'estable'
    if (filtro === 'kinder') return g.estado === 'activo' && st.key === 'kinder'
    return g.estado !== 'activo'
  })
  const abierto = openId ? grupos.find((g) => String(g.id) === String(openId)) : null

  async function abrirNuevoGrupo() {
    setStatus('')
    const num = await siguienteNumero(id)
    setGrupoModal({ numero: String(num), itinerario: 'TINY', es_online: false, coach_id: '', fecha_apertura: hoyISO(), notas: '', nivel: 1, ninos_iniciales: '', horarios: [{ dia: 1, hora_inicio: '', hora_fin: '', salon_id: '' }] })
  }
  function abrirEditarGrupo(g) {
    setStatus('')
    setGrupoModal({
      id: g.id, numero: String(g.numero), itinerario: g.itinerario, es_online: !!g.es_online,
      coach_id: g.coach_id || '', fecha_apertura: isoDia(g.fecha_apertura), notas: g.notas || '',
      horarios: (g.horarios || []).map((h) => ({ dia: h.dia, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, salon_id: h.salon_id || '' })),
    })
  }
  async function onCerrarGrupo(g) {
    if (!confirm(`¿Cerrar el grupo ${g.numero}? Deja de contar en la rentabilidad del centro.`)) return
    const res = await cerrarGrupo(id, g.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Grupo ${g.numero} cerrado.`); setOpenId(null); refresca() }
  }
  async function onReabrirGrupo(g) {
    if (!confirm(`¿Reabrir el grupo ${g.numero}?`)) return
    const res = await reabrirGrupo(id, g.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Grupo ${g.numero} reabierto.`); refresca() }
  }
  function onBuscarFusion(g) {
    setStatus('')
    setOrigenId(g.id)
    setTab('fusiones')
  }
  async function onGraduar(e) {
    if (!confirm(`¿Graduar a ${e.nombre}? Pasa de TINY 10 a KIDS nivel 5 (regla del manual).`)) return
    const res = await graduarTiny(id, e.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ ${e.nombre} graduado 🎓 — ahora es KIDS nivel 5.`); refresca() }
  }
  async function onBaja(e) {
    if (!confirm(`¿Marcar a ${e.nombre} como baja potencial? Sigue este mes pero se iría el próximo.`)) return
    const res = await marcarBajaPotencial(id, e.id, {})
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ ${e.nombre} marcado como baja potencial.`); refresca() }
  }
  async function onRevertirBaja(e) {
    const res = await revertirBajaPotencial(id, e.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ ${e.nombre} sigue activo.`); refresca() }
  }
  async function retiroGuardado(res, est) {
    setRetiroEst(null)
    let msg = `✅ ${est.nombre} retirado.`
    if (res.grupoVacio && est.grupo_id && confirm(`El grupo ${res.grupoVacio} quedó sin niños. El manual indica cerrarlo para no afectar la rentabilidad. ¿Cerrarlo ahora?`)) {
      const rc = await cerrarGrupo(id, est.grupo_id)
      msg = rc.error ? '❌ ' + rc.error : `✅ ${est.nombre} retirado y grupo ${res.grupoVacio} cerrado.`
    }
    setStatus(msg)
    refresca()
  }
  async function onAplicarFusion(from, to) {
    const n = from.estudiantes.length
    if (!confirm(`¿Fusionar el grupo ${from.numero} (${n} niños) con el grupo ${to.numero}? Los ${n} niños pasan al grupo ${to.numero}.`)) return
    const key = `${from.id}-${to.id}`
    setBusyFusion(key)
    const res = await aplicarFusion(id, { deGrupoId: from.id, aGrupoId: to.id, estudianteIds: from.estudiantes.map((e) => e.id) })
    setBusyFusion(null)
    if (res.error) setStatus('❌ ' + res.error)
    else {
      setStatus(res.cerrado ? `✅ Grupo ${from.numero} fusionado y cerrado. Los niños pasaron al grupo ${to.numero}.` : `✅ Fusión aplicada: los niños pasaron al grupo ${to.numero}.`)
      setOrigenId(null)
      refresca()
    }
  }

  const acciones = {
    editarGrupo: abrirEditarGrupo,
    cerrar: onCerrarGrupo,
    reabrir: onReabrirGrupo,
    buscarFusion: onBuscarFusion,
    editarNino: (e) => { setStatus(''); setEditEst(e) },
    retirar: (e) => { setStatus(''); setRetiroEst(e) },
    graduar: onGraduar,
    baja: onBaja,
    revertirBaja: onRevertirBaja,
  }

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-dim)' }}>Cargando…</div>

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')
  const okProm = prom.sinK >= metas.gpnMin
  const CARDS = [
    { l: 'Prom. niños/grupo (sin Kinder)', v: prom.sinK.toFixed(1), c: okProm ? 'var(--ok)' : 'var(--bad)', s: `${Math.round(prom.pctMeta)}% de la meta (${metas.gpnMin})`, sc: okProm ? 'var(--ok)' : 'var(--bad)' },
    { l: 'Prom. con Kinder', v: prom.conK.toFixed(1), c: 'var(--text)' },
    { l: 'Grupos activos', v: activos.length, c: 'var(--text)' },
    { l: 'Grupos bajo meta', v: bajoMetaN, c: bajoMetaN > 0 ? 'var(--bad)' : 'var(--ok)' },
    { l: 'Niños activos', v: ninosActivos, c: 'var(--text)' },
  ]
  const TABS = [['grupos', 'Grupos'], ['fusiones', 'Fusiones'], ['horarios', 'Horarios'], ['coaches', 'Coaches y salones']]
  const FILTROS = [['todos', 'Todos'], ['bajo', 'Bajo meta'], ['estables', 'Estables'], ['kinder', 'Kinder'], ['cerrados', 'Cerrados']]

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={data?.nombre || 'Centro'} centroId={id} />
      <main className="main">
        {isAdmin && (
          <button onClick={() => router.push('/dashboard')} className="btn" style={{ marginBottom: 18, gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Volver al panel de administrador
          </button>
        )}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Operaciones</div>
            <h1 className="h-title">Grupos y Fusiones</h1>
            <p className="h-sub">{data?.nombre || ''} — grupos, niños, horarios y plan de fusiones según el manual</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => { setStatus(''); setInscribir(true) }}>Inscribir niño</button>
            <button className="btn btn--primary" onClick={abrirNuevoGrupo}>➕ Aperturar grupo</button>
          </div>
        </div>

        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }}>{statusText}</div>
        )}

        {/* KPI cards (siempre visibles) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          {CARDS.map((c) => (
            <div key={c.l} className="kpi" style={{ padding: '14px 16px' }}>
              <div className="kpi__top"><span className="label">{c.l}</span></div>
              <div className="kpi__value num" style={{ fontSize: 26, color: c.c }}>{c.v}</div>
              {c.s && <div className="kpi__sub" style={c.sc ? { color: c.sc } : undefined}>{c.s}</div>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`btn${tab === k ? ' btn--primary' : ''}`} style={{ padding: '8px 16px', fontSize: 13 }}>{l}</button>
          ))}
        </div>

        {tab === 'grupos' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {FILTROS.map(([k, l]) => {
                const on = filtro === k
                return (
                  <button key={k} onClick={() => setFiltro(k)}
                    style={{ padding: '4px 12px', background: on ? 'var(--ts-green-soft)' : 'transparent', color: on ? 'var(--ts-green)' : 'var(--text-dim)', border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-pill)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                    {l}
                  </button>
                )
              })}
            </div>

            {visibles.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                {grupos.length === 0 ? 'Aún no hay grupos. Apertura el primero con “➕ Aperturar grupo”.' : 'Sin grupos para este filtro.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                {visibles.map((g) => {
                  const st = groupStatus(g, metas.gpnMin)
                  const n = g.estudiantes.length
                  const pct = Math.min(100, metas.gpnMin ? (n / metas.gpnMin) * 100 : 0)
                  const activo = String(openId) === String(g.id)
                  return (
                    <div key={g.id} className="card" onClick={() => setOpenId(activo ? null : g.id)}
                      style={{ padding: 16, cursor: 'pointer', borderColor: activo ? 'var(--ts-green-line)' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Grupo {g.numero}</span>
                        <span className={`pill ${ESTADO_PILL[st.key] || 'pill--warn'}`}><span className="dot" />{st.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{g.coach?.nombre || 'Sin coach'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{horarioTexto(g.horarios)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                        <div className="bar"><div className="bar__fill" style={{ width: `${pct}%`, background: n >= metas.gpnMin ? 'var(--ok)' : n > 0 ? 'var(--warn)' : 'var(--bad)' }} /></div>
                        <span className="num" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n}/{metas.cupoMax}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>{nivelesTexto(g)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {abierto && <GrupoDetalle g={abierto} metas={metas} acciones={acciones} />}

            {data?.sinGrupo?.length > 0 && (
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel__head"><h3 className="panel__title">Niños sin grupo ({data.sinGrupo.length})</h3></div>
                <table className="table">
                  <thead><tr>{['Niño', 'Nivel', 'Inscrito', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.sinGrupo.map((e) => (
                      <tr key={e.id} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{e.nombre}</td>
                        <td style={{ fontSize: 12 }}>{e.itinerario} {e.nivel}</td>
                        <td className="num" style={{ fontSize: 12 }}>{fmtDia(e.fecha_inscripcion)}</td>
                        <td style={{ textAlign: 'right' }}><button className="btn" style={BTN_XS} onClick={() => acciones.editarNino(e)}>Asignar grupo</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data?.retirados?.length > 0 && (
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel__head">
                  <h3 className="panel__title">Retirados recientes</h3>
                  <span className="label">Últimos {data.retirados.length}</span>
                </div>
                <table className="table">
                  <thead><tr>{['Niño', 'Nivel', 'Motivo', 'Fecha retiro', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.retirados.map((e) => (
                      <tr key={e.id} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{e.nombre}</td>
                        <td style={{ fontSize: 12 }}>{e.itinerario} {e.nivel}</td>
                        <td><span className="pill pill--bad"><span className="dot" />{MOTIVOS_RETIRO_LABELS[e.motivo_retiro] || e.motivo_retiro || '—'}</span></td>
                        <td className="num" style={{ fontSize: 12 }}>{fmtDia(e.fecha_retiro)}</td>
                        <td style={{ textAlign: 'right' }}><button className="btn" style={BTN_XS} onClick={() => { setStatus(''); setReincEst(e) }}>Reincorporar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'fusiones' && (
          <TabFusiones grupos={grupos} metas={metas} fus={fus} fusLoading={fusLoading}
            origenId={origenId} setOrigenId={setOrigenId} onAplicar={onAplicarFusion} busyFusion={busyFusion} />
        )}

        {tab === 'horarios' && (
          <TabHorarios grupos={grupos} coaches={data?.coaches || []} salones={data?.salones || []} />
        )}

        {tab === 'coaches' && (
          <TabCoaches centroId={id} coaches={data?.coaches || []} salones={data?.salones || []}
            onChanged={refresca} setStatus={setStatus} />
        )}
      </main>

      {grupoModal && (
        <GrupoModal centroId={id} coaches={data?.coaches || []} salones={data?.salones || []} initial={grupoModal}
          onClose={() => setGrupoModal(null)}
          onSaved={(msg, warn) => { setGrupoModal(null); setStatus(warn ? `✅ ${msg} ⚠️ ${warn}` : `✅ ${msg}`); refresca() }} />
      )}
      {inscribir && (
        <InscribirModal centroId={id} grupos={grupos}
          onClose={() => setInscribir(false)}
          onSaved={(msg) => { setInscribir(false); setStatus('✅ ' + msg); refresca() }} />
      )}
      {editEst && (
        <EstudianteModal centroId={id} est={editEst} grupos={grupos}
          onClose={() => setEditEst(null)}
          onSaved={(msg) => { setEditEst(null); setStatus('✅ ' + msg); refresca() }} />
      )}
      {retiroEst && (
        <RetiroModal centroId={id} est={retiroEst}
          onClose={() => setRetiroEst(null)}
          onSaved={(res) => retiroGuardado(res, retiroEst)} />
      )}
      {reincEst && (
        <ReincorporarModal centroId={id} est={reincEst} grupos={grupos}
          onClose={() => setReincEst(null)}
          onSaved={(msg) => { setReincEst(null); setStatus('✅ ' + msg); refresca() }} />
      )}
    </div>
  )
}

// ── Detalle de un grupo: roster y acciones por niño ──────────────────────────
function GrupoDetalle({ g, metas, acciones }) {
  const st = groupStatus(g, metas.gpnMin)
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel__head">
        <div>
          <h3 className="panel__title">Grupo {g.numero} · {g.itinerario}{g.es_online ? ' · Online' : ''} <span className={`pill ${ESTADO_PILL[st.key] || 'pill--warn'}`} style={{ marginLeft: 8, verticalAlign: 'middle' }}><span className="dot" />{st.label}</span></h3>
          <p className="h-sub" style={{ marginTop: 4 }}>
            {g.coach ? `Coach: ${g.coach.nombre}` : 'Sin coach asignado'} · {horarioTexto(g.horarios)}
            {g.fecha_apertura ? ` · Apertura: ${fmtDia(g.fecha_apertura)}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.editarGrupo(g)}>Editar</button>
          {g.estado === 'activo' && (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.buscarFusion(g)}>Buscar fusión</button>
          )}
          {g.estado === 'activo' ? (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--bad)', borderColor: 'var(--bad-line)' }} onClick={() => acciones.cerrar(g)}>Cerrar grupo</button>
          ) : (
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => acciones.reabrir(g)}>Reabrir</button>
          )}
        </div>
      </div>
      {g.notas && <div style={{ padding: '10px 22px', fontSize: 12, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{g.notas}</div>}
      {g.estudiantes.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Este grupo no tiene niños activos.</div>
      ) : (
        <table className="table">
          <thead><tr>{['Niño', 'Nivel', 'Cierre de nivel', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {g.estudiantes.map((e) => (
              <tr key={e.id} style={{ cursor: 'default' }}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {e.nombre}
                  {e.representante && <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-faint)' }}>{e.representante}</div>}
                </td>
                <td><span className="pill" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>{e.itinerario} {e.nivel}</span></td>
                <td className="num" style={{ fontSize: 12 }}>{fmtDia(e.fecha_cierre_nivel)}</td>
                <td>
                  {e.estado === 'baja_potencial'
                    ? <span className="pill pill--warn"><span className="dot" />Baja potencial</span>
                    : <span className="pill pill--ok"><span className="dot" />Activo</span>}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button className="btn" style={BTN_XS} onClick={() => acciones.editarNino(e)}>Editar</button>
                    {e.itinerario === 'TINY' && Number(e.nivel) === 10 && (
                      <button className="btn" style={{ ...BTN_XS, color: 'var(--ts-green)', borderColor: 'var(--ts-green-line)' }} onClick={() => acciones.graduar(e)}>Graduar a Kids 5</button>
                    )}
                    {e.estado === 'activo' ? (
                      <button className="btn" style={{ ...BTN_XS, color: 'var(--warn)', borderColor: 'var(--warn-line)' }} onClick={() => acciones.baja(e)}>Baja potencial</button>
                    ) : (
                      <button className="btn" style={BTN_XS} onClick={() => acciones.revertirBaja(e)}>Sigue activo</button>
                    )}
                    <button className="btn" style={{ ...BTN_XS, color: 'var(--bad)', borderColor: 'var(--bad-line)' }} onClick={() => acciones.retirar(e)}>Retirar</button>
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

// ── Tab Fusiones: bajo meta, destinos por grupo y plan sugerido del mes ──────
function TabFusiones({ grupos, metas, fus, fusLoading, origenId, setOrigenId, onAplicar, busyFusion }) {
  const origen = origenId ? grupos.find((g) => String(g.id) === String(origenId)) : null
  const destinos = origen ? sugerenciasPara(origen, grupos, { MIN: metas.gpnMin, MAX: metas.cupoMax }) : []
  return (
    <div>
      <div className="card" style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16, lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--ts-green)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Reglas del manual:</strong> Exentos: Kinder, Online y grupos base nivel 1–2. El manual permite fusionar desde nivel 3 (Tiny–Tiny ideal desde nivel 4).
      </div>

      {origen && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel__head">
            <h3 className="panel__title">Destinos para el grupo {origen.numero} ({origen.estudiantes.length} niños)</h3>
            <button className="btn" style={BTN_XS} onClick={() => setOrigenId(null)}>✕ Cerrar</button>
          </div>
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            {destinos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 10 }}>Sin grupos candidatos para fusionar con este grupo.</div>
            ) : destinos.slice(0, 6).map((s) => (
              <FusionCard key={s.grupo.id} from={origen} to={s.grupo} analisis={s.analisis} onAplicar={onAplicar} busyFusion={busyFusion} />
            ))}
          </div>
        </div>
      )}

      {fusLoading || !fus ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Calculando fusiones…</div>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel__head"><h3 className="panel__title">Grupos bajo meta ({fus.bajoMeta.length})</h3></div>
            {fus.bajoMeta.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Ningún grupo por debajo de la meta de {metas.gpnMin} niños. 💪</div>
            ) : (
              <table className="table">
                <thead><tr>{['Grupo', 'Niños', 'Coach', 'Horario', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {fus.bajoMeta.map((g) => (
                    <tr key={g.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>Grupo {g.numero} · {g.itinerario}</td>
                      <td className="num" style={{ color: 'var(--bad)', fontWeight: 700 }}>{g.estudiantes.length}/{metas.gpnMin}</td>
                      <td style={{ fontSize: 12 }}>{g.coach?.nombre || 'Sin coach'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{horarioTexto(g.horarios)}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn" style={BTN_XS} onClick={() => setOrigenId(g.id)}>Ver destinos</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <div className="panel__head"><h3 className="panel__title">Fusiones sugeridas del mes</h3></div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              {fus.sugerencias.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: 10 }}>Sin fusiones sugeridas: no hay pares viables este mes.</div>
              ) : fus.sugerencias.map((p) => (
                <FusionCard key={`${p.from.id}-${p.to.id}`} from={p.from} to={p.to} analisis={p.analisis} onAplicar={onAplicar} busyFusion={busyFusion} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FusionCard({ from, to, analisis, onAplicar, busyFusion }) {
  const banda = scoreBand(analisis.score, analisis.blocked)
  const key = `${from.id}-${to.id}`
  const K_ICON = { ok: '✓', mb: '△', no: '✕' }
  const K_COLOR = { ok: 'var(--ok)', mb: 'var(--warn)', no: 'var(--bad)' }
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text)' }}>
          Grupo {from.numero} ({from.estudiantes.length}) → Grupo {to.numero} ({to.estudiantes.length})
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}> · quedaría en {analisis.newN}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`pill ${BANDA_PILL[banda]}`}><span className="dot" />{banda} · {analisis.score} pts</span>
          {!analisis.blocked && (
            <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 12 }} disabled={busyFusion === key} onClick={() => onAplicar(from, to)}>
              {busyFusion === key ? 'Aplicando…' : 'Aplicar fusión'}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {analisis.reasons.map((r, i) => (
          <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>
            <span style={{ color: K_COLOR[r.k], marginRight: 5 }}>{K_ICON[r.k]}</span>{r.t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Tab Horarios: inventario de franjas, coaches y salones libres ────────────
function TabHorarios({ grupos, coaches, salones }) {
  const minutos = (hora) => {
    const [h, m] = String(hora || '').split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const activos = grupos.filter((g) => g.estado === 'activo')
  const coachesActivos = coaches.filter((c) => c.activo)
  const salonesActivos = salones.filter((s) => s.activo)
  const salonPorId = new Map(salones.map((s) => [String(s.id), s]))
  const porFranja = new Map()
  for (const g of activos) {
    for (const h of g.horarios || []) {
      const key = `${h.dia}|${h.hora_inicio}`
      if (!porFranja.has(key)) porFranja.set(key, { key, dia: h.dia, hora_inicio: h.hora_inicio, entradas: [] })
      porFranja.get(key).entradas.push({ g, h })
    }
  }
  const franjas = [...porFranja.values()].sort((a, b) => a.dia - b.dia || minutos(a.hora_inicio) - minutos(b.hora_inicio))
  const conLibre = franjas.filter((f) => {
    const ocupados = new Set(f.entradas.filter((x) => x.g.coach_id).map((x) => String(x.g.coach_id)))
    return coachesActivos.some((c) => !ocupados.has(String(c.id)))
  }).length

  if (!franjas.length) return (
    <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
      Ningún grupo activo tiene horario registrado. Edita los grupos y agrégales sus franjas.
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(160px,240px))', gap: 12, marginBottom: 16 }}>
        <div className="kpi" style={{ padding: '14px 16px' }}>
          <div className="kpi__top"><span className="label">Franjas ocupadas</span></div>
          <div className="kpi__value num" style={{ fontSize: 26 }}>{franjas.length}</div>
        </div>
        <div className="kpi" style={{ padding: '14px 16px' }}>
          <div className="kpi__top"><span className="label">Franjas con coach libre</span></div>
          <div className="kpi__value num" style={{ fontSize: 26, color: conLibre > 0 ? 'var(--ok)' : 'var(--text)' }}>{conLibre}</div>
          <div className="kpi__sub">Ahí se pueden abrir grupos nuevos</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
        {franjas.map((f) => {
          const ocupados = new Set(f.entradas.filter((x) => x.g.coach_id).map((x) => String(x.g.coach_id)))
          const libres = coachesActivos.filter((c) => !ocupados.has(String(c.id)))
          const salonesOcupados = new Set(f.entradas.filter((x) => x.h.salon_id).map((x) => String(x.h.salon_id)))
          const salonesLibres = salonesActivos.filter((s) => !salonesOcupados.has(String(s.id)))
          return (
            <div key={f.key} className="card" style={{ padding: 14 }}>
              <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>{DIAS[f.dia]} · {f.hora_inicio}</div>
              {f.entradas.map(({ g, h }) => (
                <div key={`${g.id}-${h.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>Grupo {g.numero}</span>
                  <span style={{ color: 'var(--text-muted)', flex: 1 }}>{g.coach?.nombre || 'Sin coach'}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{h.salon_id ? (salonPorId.get(String(h.salon_id))?.nombre || 'Salón') : g.es_online ? 'Online' : 'Sin salón'}</span>
                  <span className="num" style={{ color: 'var(--text-muted)' }}>{g.estudiantes.length}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 'var(--r-sm)', fontSize: 12, background: libres.length ? 'var(--ok-bg)' : 'var(--surface-3)', border: `1px solid ${libres.length ? 'var(--ok-line)' : 'var(--border)'}`, color: libres.length ? 'var(--ok)' : 'var(--text-dim)' }}>
                Coaches libres en esta franja: {libres.length ? libres.map((c) => c.nombre).join(', ') : 'ninguno'}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                Salones libres: {salonesLibres.length ? salonesLibres.map((s) => s.nombre).join(', ') : 'ninguno'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab Coaches y salones ────────────────────────────────────────────────────
function TabCoaches({ centroId, coaches, salones, onChanged, setStatus }) {
  const [coachModal, setCoachModal] = useState(null)
  const [salonModal, setSalonModal] = useState(null)
  const [busy, setBusy] = useState(null)

  async function onToggleCoach(c) {
    setBusy('c' + c.id)
    const res = await toggleCoach(centroId, c.id, !c.activo)
    setBusy(null)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Coach ${c.nombre} ${c.activo ? 'desactivado' : 'activado'}.`); onChanged() }
  }
  async function onToggleSalon(s) {
    setBusy('s' + s.id)
    const res = await toggleSalon(centroId, s.id, !s.activo)
    setBusy(null)
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(`✅ Salón ${s.nombre} ${s.activo ? 'desactivado' : 'activado'}.`); onChanged() }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">Coaches</h3>
          <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setCoachModal({})}>+ Agregar coach</button>
        </div>
        {coaches.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Aún no hay coaches registrados.</div>
        ) : (
          <table className="table">
            <thead><tr>{['Coach', 'Certificación', 'Kinder', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} style={{ cursor: 'default', opacity: c.activo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.nombre}</td>
                  <td style={{ fontSize: 12 }}>
                    {c.nivel_kids > 0 ? (
                      <>Kids ≤ {c.nivel_kids}<div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Tiny ≤ {TINYMAP[c.nivel_kids] || 0}</div></>
                    ) : <span style={{ color: 'var(--text-dim)' }}>Sin registrar</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{[c.kinder1 && 'K1', c.kinder23 && 'K2-3'].filter(Boolean).join(' · ') || '—'}</td>
                  <td>
                    {c.activo
                      ? <span className="pill pill--ok"><span className="dot" />Activo</span>
                      : <span className="pill pill--bad"><span className="dot" />Inactivo</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn" style={BTN_XS} onClick={() => setCoachModal(c)}>Editar</button>
                      <button className="btn" style={BTN_XS} disabled={busy === 'c' + c.id} onClick={() => onToggleCoach(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">Salones</h3>
          <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setSalonModal({})}>+ Agregar salón</button>
        </div>
        {salones.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Aún no hay salones registrados.</div>
        ) : (
          <table className="table">
            <thead><tr>{['Salón', 'Híbrido', 'Estado', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {salones.map((s) => (
                <tr key={s.id} style={{ cursor: 'default', opacity: s.activo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.nombre}</td>
                  <td style={{ fontSize: 12 }}>{s.es_hibrido ? 'Sí' : 'No'}</td>
                  <td>
                    {s.activo
                      ? <span className="pill pill--ok"><span className="dot" />Activo</span>
                      : <span className="pill pill--bad"><span className="dot" />Inactivo</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn" style={BTN_XS} onClick={() => setSalonModal(s)}>Editar</button>
                      <button className="btn" style={BTN_XS} disabled={busy === 's' + s.id} onClick={() => onToggleSalon(s)}>{s.activo ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {coachModal && (
        <CoachModal centroId={centroId} initial={coachModal}
          onClose={() => setCoachModal(null)}
          onSaved={(msg) => { setCoachModal(null); setStatus('✅ ' + msg); onChanged() }} />
      )}
      {salonModal && (
        <SalonModal centroId={centroId} initial={salonModal}
          onClose={() => setSalonModal(null)}
          onSaved={(msg) => { setSalonModal(null); setStatus('✅ ' + msg); onChanged() }} />
      )}
    </div>
  )
}

// ── Modal: aperturar / editar grupo ──────────────────────────────────────────
function GrupoModal({ centroId, coaches, salones, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const setH = (i, k, v) => setF((p) => ({ ...p, horarios: p.horarios.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }))
  const minimo = aperturaMinima(f.itinerario, parseInt(f.nivel) || 1)

  async function save() {
    if (!String(f.numero).trim()) { setErr('El número de grupo es requerido.'); return }
    setSaving(true); setErr('')
    const data = {
      numero: String(f.numero).trim(), itinerario: f.itinerario, es_online: f.es_online,
      coach_id: f.coach_id || null, fecha_apertura: f.fecha_apertura || null, notas: f.notas,
      horarios: f.horarios.filter((h) => h.hora_inicio && h.hora_fin).map((h) => ({ dia: parseInt(h.dia), hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, salon_id: h.salon_id || null })),
    }
    if (!isEdit) { data.nivel = parseInt(f.nivel) || 1; data.ninos_iniciales = f.ninos_iniciales }
    const res = isEdit ? await actualizarGrupo(centroId, initial.id, data) : await crearGrupo(centroId, data)
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(isEdit ? `Grupo ${data.numero} actualizado.` : `Grupo ${data.numero} aperturado.`, res.warn)
  }

  return (
    <Modal title={isEdit ? `Editar grupo ${initial.numero}` : 'Aperturar grupo'} width={640} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Aperturar grupo')}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Número de grupo *"><input className="input" value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Ej: 22" /></Field>
        <Field label="Itinerario">
          <select className="input" value={f.itinerario} onChange={(e) => set('itinerario', e.target.value)}>
            {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </Field>
        <Field label="Coach">
          <select className="input" value={f.coach_id || ''} onChange={(e) => set('coach_id', e.target.value)}>
            <option value="">Sin coach</option>
            {coaches.filter((c) => c.activo || String(c.id) === String(f.coach_id)).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha de apertura"><input type="date" className="input" value={f.fecha_apertura} onChange={(e) => set('fecha_apertura', e.target.value)} /></Field>
        {!isEdit && (
          <>
            <Field label="Nivel inicial">
              <input type="number" min="1" max={NIVEL_MAX[f.itinerario]} className="input" value={f.nivel} onChange={(e) => set('nivel', e.target.value)} />
            </Field>
            <Field label="Niños con los que abre">
              <input type="number" min="0" className="input" value={f.ninos_iniciales} onChange={(e) => set('ninos_iniciales', e.target.value)} placeholder="(opcional)" />
            </Field>
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
              Apertura mínima del manual para {f.itinerario} nivel {parseInt(f.nivel) || 1}: <b style={{ color: 'var(--text)' }}>{minimo} niños</b>. Con menos, el grupo queda bajo responsabilidad del centro en niveles superiores.
            </div>
          </>
        )}
        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.es_online} onChange={(e) => set('es_online', e.target.checked)} />
          <span><b style={{ color: 'var(--text)' }}>Grupo online</b><br /><span className="h-sub">Exento de la alerta de fusión y del promedio de niños por grupo</span></span>
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="label" style={{ marginBottom: 8 }}>Horarios</div>
          {f.horarios.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select className="input" style={{ flex: 1 }} value={h.dia} onChange={(e) => setH(i, 'dia', e.target.value)}>
                {DIAS.slice(1).map((d, di) => <option key={di + 1} value={di + 1}>{d}</option>)}
              </select>
              <input type="time" className="input" style={{ width: 110 }} value={h.hora_inicio} onChange={(e) => setH(i, 'hora_inicio', e.target.value)} />
              <input type="time" className="input" style={{ width: 110 }} value={h.hora_fin} onChange={(e) => setH(i, 'hora_fin', e.target.value)} />
              <select className="input" style={{ flex: 1 }} value={h.salon_id || ''} onChange={(e) => setH(i, 'salon_id', e.target.value)}>
                <option value="">Sin salón</option>
                {salones.filter((s) => s.activo || String(s.id) === String(h.salon_id)).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <button className="btn" style={{ padding: '6px 10px' }} onClick={() => set('horarios', f.horarios.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => set('horarios', [...f.horarios, { dia: 1, hora_inicio: '', hora_fin: '', salon_id: '' }])}>+ Agregar horario</button>
        </div>
        <Field full label="Notas"><textarea className="input" rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Modal: inscribir niño ────────────────────────────────────────────────────
function InscribirModal({ centroId, grupos, onClose, onSaved }) {
  const [f, setF] = useState({ nombre: '', itinerario: 'TINY', nivel: 1, grupo_id: '', origen: 'directo', fecha: hoyISO(), fecha_cierre_nivel: '', representante: '', correo: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const activos = grupos.filter((g) => g.estado === 'activo')

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    const res = await inscribirEstudiante(centroId, {
      nombre: f.nombre, itinerario: f.itinerario, nivel: parseInt(f.nivel) || 1, grupo_id: f.grupo_id || null,
      origen: f.origen, fecha: f.fecha, fecha_cierre_nivel: f.fecha_cierre_nivel || null,
      representante: f.representante, correo: f.correo, telefono: f.telefono,
    })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    const g = activos.find((x) => String(x.id) === String(f.grupo_id))
    onSaved(`${f.nombre.trim()} inscrito${g ? ` en el grupo ${g.numero}` : ' (sin grupo asignado)'}.`)
  }

  return (
    <Modal title="Inscribir niño" width={600} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Inscribir'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field full label="Nombre del niño *"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Itinerario">
          <select className="input" value={f.itinerario} onChange={(e) => { const it = e.target.value; setF((p) => ({ ...p, itinerario: it, nivel: Math.min(parseInt(p.nivel) || 1, NIVEL_MAX[it]) })) }}>
            {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </Field>
        <Field label="Nivel">
          <select className="input" value={f.nivel} onChange={(e) => set('nivel', e.target.value)}>
            {Array.from({ length: NIVEL_MAX[f.itinerario] }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
        </Field>
        <Field label="Grupo">
          <select className="input" value={f.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
            <option value="">Sin grupo</option>
            {activos.map((g) => <option key={g.id} value={g.id}>Grupo {g.numero} · {g.itinerario}</option>)}
          </select>
        </Field>
        <Field label="Origen">
          <select className="input" value={f.origen} onChange={(e) => set('origen', e.target.value)}>
            {ORIGENES.map((o) => <option key={o} value={o}>{ORIGEN_LABELS[o] || o}</option>)}
          </select>
        </Field>
        <Field label="Fecha de inscripción"><input type="date" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Cierre de nivel"><input type="date" className="input" value={f.fecha_cierre_nivel} onChange={(e) => set('fecha_cierre_nivel', e.target.value)} /></Field>
        <Field label="Representante"><input className="input" value={f.representante} onChange={(e) => set('representante', e.target.value)} /></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field full label="Correo"><input className="input" value={f.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Modal: editar niño (datos, nivel y grupo) ────────────────────────────────
function EstudianteModal({ centroId, est, grupos, onClose, onSaved }) {
  const [f, setF] = useState({
    nombre: est.nombre || '', itinerario: est.itinerario, nivel: Number(est.nivel) || 1, grupo_id: est.grupo_id || '',
    fecha_cierre_nivel: isoDia(est.fecha_cierre_nivel), representante: est.representante || '', correo: est.correo || '',
    telefono: est.telefono || '', notas: est.notas || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const activos = grupos.filter((g) => g.estado === 'activo' || String(g.id) === String(est.grupo_id))

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    const res = await actualizarEstudiante(centroId, est.id, {
      nombre: f.nombre, itinerario: f.itinerario, nivel: parseInt(f.nivel) || 1, grupo_id: f.grupo_id || null,
      fecha_cierre_nivel: f.fecha_cierre_nivel || null, representante: f.representante, correo: f.correo,
      telefono: f.telefono, notas: f.notas,
    })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(`${f.nombre.trim()} actualizado.`)
  }

  return (
    <Modal title={`Editar a ${est.nombre}`} width={600} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field full label="Nombre *"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Itinerario">
          <select className="input" value={f.itinerario} onChange={(e) => { const it = e.target.value; setF((p) => ({ ...p, itinerario: it, nivel: Math.min(parseInt(p.nivel) || 1, NIVEL_MAX[it]) })) }}>
            {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </Field>
        <Field label="Nivel">
          <select className="input" value={f.nivel} onChange={(e) => set('nivel', e.target.value)}>
            {Array.from({ length: NIVEL_MAX[f.itinerario] }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
        </Field>
        <Field label="Grupo (mover de grupo)">
          <select className="input" value={f.grupo_id} onChange={(e) => set('grupo_id', e.target.value)}>
            <option value="">Sin grupo</option>
            {activos.map((g) => <option key={g.id} value={g.id}>Grupo {g.numero} · {g.itinerario}</option>)}
          </select>
        </Field>
        <Field label="Cierre de nivel"><input type="date" className="input" value={f.fecha_cierre_nivel} onChange={(e) => set('fecha_cierre_nivel', e.target.value)} /></Field>
        <Field label="Representante"><input className="input" value={f.representante} onChange={(e) => set('representante', e.target.value)} /></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field full label="Correo"><input className="input" value={f.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
        <Field full label="Notas"><textarea className="input" rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ── Modal: retiro con motivo (cuadro de deserciones) ─────────────────────────
function RetiroModal({ centroId, est, onClose, onSaved }) {
  const [f, setF] = useState({ motivo: 'ECONOMICO', fecha: hoyISO(), ultimaAsistencia: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setSaving(true); setErr('')
    const res = await retirarEstudiante(centroId, est.id, { motivo: f.motivo, fecha: f.fecha, ultimaAsistencia: f.ultimaAsistencia || null })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(res)
  }

  return (
    <Modal title={`Retirar a ${est.nombre}`} width={480} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Confirmar retiro'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Motivo de retiro *">
          <select className="input" value={f.motivo} onChange={(e) => set('motivo', e.target.value)}>
            {MOTIVOS_RETIRO.map((m) => <option key={m} value={m}>{MOTIVOS_RETIRO_LABELS[m]}</option>)}
          </select>
        </Field>
        <Field label="Fecha de retiro"><input type="date" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Última asistencia"><input type="date" className="input" value={f.ultimaAsistencia} onChange={(e) => set('ultimaAsistencia', e.target.value)} /></Field>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>El niño pasa al cuadro de deserciones del mes de la fecha de retiro y su status en plataforma queda en DESACTIVAR.</div>
      </div>
    </Modal>
  )
}

// ── Modal: reincorporar retirado ─────────────────────────────────────────────
function ReincorporarModal({ centroId, est, grupos, onClose, onSaved }) {
  const [grupoId, setGrupoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const activos = grupos.filter((g) => g.estado === 'activo')

  async function save() {
    if (!grupoId) { setErr('Selecciona el grupo donde se reincorpora.'); return }
    setSaving(true); setErr('')
    const res = await reincorporarEstudiante(centroId, est.id, { grupoId })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    const g = activos.find((x) => String(x.id) === String(grupoId))
    onSaved(`${est.nombre} reincorporado${g ? ` al grupo ${g.numero}` : ''}. Cuenta como reincorporado del mes.`)
  }

  return (
    <Modal title={`Reincorporar a ${est.nombre}`} width={440} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Reincorporar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {est.itinerario} nivel {est.nivel} · retirado el {fmtDia(est.fecha_retiro)} ({MOTIVOS_RETIRO_LABELS[est.motivo_retiro] || est.motivo_retiro || 'sin motivo'})
        </div>
        <Field label="Grupo *">
          <select className="input" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Selecciona un grupo…</option>
            {activos.map((g) => <option key={g.id} value={g.id}>Grupo {g.numero} · {g.itinerario} ({g.estudiantes.length} niños)</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal: coach (certificación según manual) ────────────────────────────────
function CoachModal({ centroId, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [f, setF] = useState({ nombre: initial.nombre || '', nivel_kids: initial.nivel_kids || 0, kinder1: !!initial.kinder1, kinder23: !!initial.kinder23 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const topeTiny = TINYMAP[parseInt(f.nivel_kids) || 0] || 0

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    const res = await saveCoach(centroId, { id: initial.id, nombre: f.nombre, nivel_kids: parseInt(f.nivel_kids) || 0, kinder1: f.kinder1, kinder23: f.kinder23 })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(isEdit ? `Coach ${f.nombre.trim()} actualizado.` : `Coach ${f.nombre.trim()} agregado.`)
  }

  return (
    <Modal title={isEdit ? 'Editar coach' : 'Agregar coach'} width={440} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nombre *"><input className="input" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
        <Field label="Nivel KIDS que domina">
          <select className="input" value={f.nivel_kids} onChange={(e) => set('nivel_kids', e.target.value)}>
            <option value={0}>Sin registrar</option>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Kids hasta nivel {n}</option>)}
          </select>
        </Field>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Tope TINY derivado (manual): {topeTiny > 0 ? `Tiny hasta nivel ${topeTiny}` : 'sin certificación registrada'}.
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.kinder1} onChange={(e) => set('kinder1', e.target.checked)} />
          <span style={{ color: 'var(--text)' }}>Certificado para Kinder 1</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.kinder23} onChange={(e) => set('kinder23', e.target.checked)} />
          <span style={{ color: 'var(--text)' }}>Certificado para Kinder 2–3</span>
        </label>
      </div>
    </Modal>
  )
}

// ── Modal: salón ─────────────────────────────────────────────────────────────
function SalonModal({ centroId, initial, onClose, onSaved }) {
  const isEdit = !!initial.id
  const [f, setF] = useState({ nombre: initial.nombre || '', es_hibrido: !!initial.es_hibrido })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!f.nombre.trim()) { setErr('El nombre es requerido.'); return }
    setSaving(true); setErr('')
    const res = await saveSalon(centroId, { id: initial.id, nombre: f.nombre, es_hibrido: f.es_hibrido })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(isEdit ? `Salón ${f.nombre.trim()} actualizado.` : `Salón ${f.nombre.trim()} agregado.`)
  }

  return (
    <Modal title={isEdit ? 'Editar salón' : 'Agregar salón'} width={400} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Nombre *"><input className="input" value={f.nombre} onChange={(e) => setF((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Salón 3" /></Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.es_hibrido} onChange={(e) => setF((p) => ({ ...p, es_hibrido: e.target.checked }))} />
          <span><b style={{ color: 'var(--text)' }}>Salón híbrido</b><br /><span className="h-sub">Equipado para clases presenciales y online</span></span>
        </label>
      </div>
    </Modal>
  )
}

// ── Base de modales y campos ─────────────────────────────────────────────────
function Modal({ title, width = 560, onClose, children, footer }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width, maxWidth: '100%', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="panel__title">{title}</h3>
          <button className="btn" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 22, maxHeight: '62vh', overflowY: 'auto' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px', borderTop: '1px solid var(--border)' }}>{footer}</div>
      </div>
    </div>
  )
}

function Field({ label, full, children }) {
  return <div className="field" style={full ? { gridColumn: '1 / -1', margin: 0 } : { margin: 0 }}><label className="label">{label}</label>{children}</div>
}
