'use client'
import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { tienePanel } from '../../../../components/useRol'
import Sidebar from '../../../../components/Sidebar'
import { loadCuadro, savePedido, deletePedido, sincronizarConKpi } from '../../../actions/cuadro'
import { listarGruposActivos } from '../../../actions/grupos'
import { retirarEstudiante, reincorporarEstudiante } from '../../../actions/estudiantes'
import { ITINERARIOS, MOTIVOS_RETIRO, MOTIVOS_RETIRO_LABELS, PRODUCTOS_MATERIAL, hoyISO } from '../../../../lib/operaciones'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const PRODUCTO_LABELS = { KIT: 'KIT', ABACO: 'ÁBACO', LIBRO: 'LIBRO', SUETER: 'SUÉTER', MOCHILA: 'MOCHILA', OTRO: 'OTRO' }
const EMPTY_PEDIDO = { id: null, fecha: '', numero_oe: '', producto: 'KIT', itinerario: '', nivel: '', grupo_id: '', cantidad: '', monto: '', observaciones: '' }

// DATE de Postgres ('YYYY-MM-DD' o Date) → 'DD/MM/YYYY' sin corrimiento de zona.
const fmtFecha = (d) => {
  if (!d) return '—'
  const s = typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
  const [y, m, day] = s.split('-')
  return `${day}/${m}/${y}`
}
// DATE de Postgres → valor para <input type="date">.
const dateInputVal = (d) => {
  if (!d) return ''
  return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
}
const money = (n) => '$' + Number(n || 0).toFixed(2)

export default function CuadroPage() {
  const { id } = useParams()
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rol, setRol] = useState('usuario')
  const isAdmin = tienePanel(rol)
  const [data, setData] = useState(null)
  const [gruposActivos, setGruposActivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [openGrupo, setOpenGrupo] = useState(null)
  const [pedido, setPedido] = useState(EMPTY_PEDIDO)
  const [savingPedido, setSavingPedido] = useState(false)
  // { tipo: 'retirar' | 'reincorporar', nino } — acción sobre un niño del cuadro.
  const [accionNino, setAccionNino] = useState(null)

  useEffect(() => { setRol(localStorage.getItem('aloha_rol') || 'usuario') }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [res, grps] = await Promise.all([loadCuadro(id, year, month), listarGruposActivos(id)])
      if (res.error) { setStatus('❌ ' + res.error); setData(null) }
      else setData(res)
      setGruposActivos(Array.isArray(grps) ? grps : [])
    } catch (e) { setStatus('❌ ' + e.message); setData(null) }
    setLoading(false)
  }, [id, year, month])
  useEffect(() => { loadData() }, [loadData])

  const cerrado = data?.mesEstado === 'cerrado'
  // Mes cerrado = se muestra la foto congelada al cierre; nada se edita aquí.
  const congelado = !!data?.congelado

  async function handleSincronizar() {
    if (cerrado) return
    if (!confirm(`¿Sincronizar el KPI de ${NOMBRES_MES[month - 1]} ${year} con el cuadro? Se sobreescriben grupos activos, nuevos activos y motivos de deserción en el resumen mensual.`)) return
    setSyncing(true); setStatus('')
    const res = await sincronizarConKpi(id, year, month)
    if (res.error) setStatus('❌ ' + res.error)
    else setStatus(`✅ KPI sincronizado: ${res.aplicado.grupos_activos} grupos activos, ${res.aplicado.nuevos_activos_mes} nuevos activos y motivos de deserción actualizados.`)
    setSyncing(false)
  }

  async function handleGuardarPedido(e) {
    e.preventDefault()
    setSavingPedido(true); setStatus('')
    const res = await savePedido(id, { ...pedido, id: pedido.id || undefined, year, month })
    if (res.error) setStatus('❌ ' + res.error)
    else { setStatus(pedido.id ? '✅ Pedido actualizado.' : '✅ Pedido agregado.'); setPedido(EMPTY_PEDIDO); await loadData() }
    setSavingPedido(false)
  }

  async function handleEliminarPedido(p) {
    if (!confirm('¿Eliminar este pedido de material?')) return
    setStatus('')
    const res = await deletePedido(id, p.id)
    if (res.error) setStatus('❌ ' + res.error)
    else { if (pedido.id === p.id) setPedido(EMPTY_PEDIDO); setStatus('✅ Pedido eliminado.'); await loadData() }
  }

  function editarPedido(p) {
    setPedido({
      id: p.id, fecha: dateInputVal(p.fecha), numero_oe: p.numero_oe || '', producto: p.producto || 'KIT',
      itinerario: p.itinerario || '', nivel: p.nivel ?? '', grupo_id: p.grupo_id == null ? '' : String(p.grupo_id),
      cantidad: p.cantidad ?? '', monto: p.monto ?? '', observaciones: p.observaciones || '',
    })
  }

  const numeroGrupo = (gid) => {
    if (gid == null) return '—'
    const g = gruposActivos.find((x) => String(x.id) === String(gid))
    return g ? 'Grupo ' + g.numero : '—'
  }

  const setP = (k, v) => setPedido((prev) => ({ ...prev, [k]: v }))

  const estadoMesPill = (e) => {
    if (e.esRetirado) return <span className="pill pill--bad"><span className="dot" />Retirado</span>
    if (e.esNuevo) return <span className="pill pill--ok"><span className="dot" />Nuevo</span>
    if (e.esReincorporado) return <span className="pill pill--ok"><span className="dot" />Reincorporado</span>
    if (e.estado === 'baja_potencial') return <span className="pill pill--warn"><span className="dot" />Baja potencial</span>
    return <span className="pill" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Continúa</span>
  }

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-dim)' }}>Cargando…</div>

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')
  const t = data?.totales
  const iniciosDisponibles = Array.isArray(data?.iniciosClase)
  const nuevosActivos = iniciosDisponibles ? data.iniciosClase.length : (t?.nuevos || 0)
  const nuevosLabel = iniciosDisponibles ? 'Nuevos activos' : 'Nuevos históricos'
  const graduados = data ? data.deserciones.filter((d) => d.motivo === 'GRADUADO').length : 0
  const sumMesAnterior = data ? data.controlGrupos.filas.reduce((a, f) => a + f.contadores.mesAnterior, 0) : 0
  const totalCantidad = data ? data.pedidos.reduce((a, p) => a + (parseInt(p.cantidad) || 0), 0) : 0
  const totalMonto = data ? data.pedidos.reduce((a, p) => a + (Number(p.monto) || 0), 0) : 0
  const CARDS = data ? [
    { l: 'Niños a pagar', v: t.aPagar, c: 'var(--text)' },
    { l: nuevosLabel, v: nuevosActivos, c: 'var(--ok)' },
    { l: 'Reincorporados', v: t.reincorporados, c: 'var(--ok)' },
    { l: 'Retirados del mes', v: t.retirados, c: t.retirados > 0 ? 'var(--bad)' : 'var(--text)', s: graduados > 0 ? `de ellos ${graduados} graduado${graduados === 1 ? '' : 's'} 🎓` : undefined },
    { l: 'Grupos activos', v: t.gruposActivos, c: 'var(--text)', s: `prom. ${data.promedios.sinK.toFixed(1)} niños/grupo sin Kinder` },
    { l: 'Royalty total', v: money(data.royalties.totales.totalRoyalty), c: 'var(--ts-green)' },
  ] : []
  const compCols = data ? [
    { l: nuevosLabel, cuadro: nuevosActivos, kpi: data.kpiComparacion.nuevosKpi },
    { l: 'Retirados', cuadro: t.retirados, kpi: data.kpiComparacion.desercionKpi },
    { l: 'Grupos activos', cuadro: t.gruposActivos, kpi: data.kpiComparacion.gruposActivosKpi },
  ] : []

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={data?.nombre || ''} centroId={id} />
      <main className="main">
        {isAdmin && (
          <button onClick={() => router.push('/dashboard')} className="btn" style={{ marginBottom: 18, gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Volver al panel de administrador
          </button>
        )}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Informe mensual</div>
            <h1 className="h-title">Cuadro de Negocio</h1>
            <p className="h-sub">{data?.nombre || ''} — royalties, control de grupos y deserciones del mes</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="period">
              <select className="select" value={month} aria-label="Mes" onChange={(e) => { setStatus(''); setMonth(Number(e.target.value)) }}>
                {NOMBRES_MES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
              </select>
              <select className="select" value={year} aria-label="Año" onChange={(e) => { setStatus(''); setYear(Number(e.target.value)) }}>
                {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {data && (
              <span className={`pill ${cerrado ? 'pill--warn' : 'pill--ok'}`}
                title={congelado ? `Foto congelada al cierre${data.congeladoAt ? ' (' + fmtFecha(String(data.congeladoAt).slice(0, 10)) + ')' : ''}. Los movimientos posteriores no alteran este mes.` : undefined}>
                <span className="dot" />{congelado ? '🔒 Mes cerrado · foto congelada' : (cerrado ? 'Mes KPI cerrado' : 'Mes KPI abierto')}
              </span>
            )}
            <a className="btn btn--primary" href={`/api/centro/${id}/cuadro?year=${year}&month=${month}`} download data-tour="cuadro.excel">⬇ Descargar Excel</a>
            <button onClick={handleSincronizar} disabled={syncing || cerrado} className="btn"
              style={cerrado ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              title={cerrado ? 'Este mes está cerrado en KPI Semanal. Reábrelo para poder sincronizar.' : 'Vuelca grupos activos, nuevos activos y motivos de deserción al KPI mensual'}>
              {syncing ? 'Sincronizando…' : 'Sincronizar con KPI'}
            </button>
          </div>
        </div>

        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)' }}>{statusText}</div>
        )}

        {data && (
          <>
            {/* KPI cards del mes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
              {CARDS.map((c) => (
                <div key={c.l} className="kpi" style={{ padding: '14px 16px' }}>
                  <div className="kpi__top"><span className="label">{c.l}</span></div>
                  <div className="kpi__value num" style={{ fontSize: 24, color: c.c }}>{c.v}</div>
                  {c.s !== undefined && <div className="kpi__sub">{c.s}</div>}
                </div>
              ))}
            </div>

            {/* Comparación con el KPI semanal capturado */}
            <div className="panel" style={{ marginBottom: 20 }} data-tour="cuadro.comparacion">
              <div className="panel__head">
                <h3 className="panel__title">Comparación con KPI semanal</h3>
                <span className="label">Detecta descuadres antes de entregar a la Junta</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Fuente</th>
                      {compCols.map((c) => <th key={c.l} style={{ textAlign: 'center' }}>{c.l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>Cuadro (calculado)</td>
                      {compCols.map((c) => <td key={c.l} className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{c.cuadro}</td>)}
                    </tr>
                    <tr style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>KPI capturado</td>
                      {compCols.map((c) => (
                        <td key={c.l} style={{ textAlign: 'center' }}>
                          {c.kpi == null ? (
                            <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Sin captura</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <span className="num" style={{ fontWeight: 700, color: 'var(--text)' }}>{c.kpi}</span>
                              <span className={`pill ${Number(c.kpi) === Number(c.cuadro) ? 'pill--ok' : 'pill--bad'}`} style={{ fontSize: 10 }}>
                                {Number(c.kpi) === Number(c.cuadro) ? '✓ Coincide' : '≠ Difiere'}
                              </span>
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Royalties por nivel */}
            <div className="panel" style={{ marginBottom: 20 }} data-tour="cuadro.royalties">
              <div className="panel__head">
                <h3 className="panel__title">Royalties</h3>
                <span className="label">× {money(data.royaltyRate)} por niño activo</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr>{['Nivel', nuevosLabel, 'Continúan', 'Total niños', 'Royalty'].map((h, i) => <th key={h} style={i > 0 ? { textAlign: 'center' } : undefined}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.royalties.filas.length === 0 ? (
                      <tr style={{ cursor: 'default' }}><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>Sin niños activos este mes.</td></tr>
                    ) : (
                      <>
                        {data.royalties.filas.map((f) => (
                          <tr key={`${f.itinerario}-${f.nivel}`} style={{ cursor: 'default' }}>
                            <td style={{ fontWeight: 600, color: 'var(--text)' }} className="num">{f.itinerario} {f.nivel}</td>
                            <td className="num" style={{ textAlign: 'center', color: 'var(--ok)' }}>{f.nuevos}</td>
                            <td className="num" style={{ textAlign: 'center' }}>{f.continuan}</td>
                            <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{f.total}</td>
                            <td className="num" style={{ textAlign: 'center' }}>{money(f.royalty)}</td>
                          </tr>
                        ))}
                        <tr style={{ cursor: 'default', background: 'var(--surface-3)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--text)' }}>Total</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ok)' }}>{data.royalties.totales.totalNuevos}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{data.royalties.totales.totalContinuan}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{data.royalties.totales.totalNinos}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ts-green)' }}>{money(data.royalties.totales.totalRoyalty)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Control de grupos (hoja Cantidad de Niños) */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel__head">
                <h3 className="panel__title">Control de grupos</h3>
                <span className="label">Clic en un grupo para ver y gestionar sus niños</span>
              </div>
              <div style={{ padding: '8px 18px', fontSize: 12, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                {congelado ? (
                  <><b style={{ color: 'var(--text)' }}>🔒 Este mes está cerrado:</b> ves la foto congelada al cierre{data.congeladoAt ? ` (${fmtFecha(String(data.congeladoAt).slice(0, 10))})` : ''}. Los retiros y movimientos nuevos van en el mes en curso; para corregir este mes, reábrelo en KPI Semanal.</>
                ) : (
                  <><b style={{ color: 'var(--text)' }}>Continúa</b> = venía del mes anterior y sigue activo. Nuevo, Reincorporado y Retirado salen de los movimientos del mes. Para sacar a un niño del cuadro usa <b style={{ color: 'var(--text)' }}>Retirar</b> en su fila; si fue un error o el niño volvió, <b style={{ color: 'var(--text)' }}>Reincorporar</b>.</>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr>{['Grupo', 'Mes anterior', nuevosLabel, 'Reincorporados', 'Retirados', 'Total del mes'].map((h, i) => <th key={h} style={i > 0 ? { textAlign: 'center' } : undefined}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.controlGrupos.filas.length === 0 ? (
                      <tr style={{ cursor: 'default' }}><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>Sin grupos con movimientos este mes. Apertura grupos e inscribe niños en “Grupos y Fusiones”.</td></tr>
                    ) : (
                      <>
                        {data.controlGrupos.filas.map((f) => (
                          <Fragment key={f.grupo.id}>
                            <tr onClick={() => setOpenGrupo(openGrupo === f.grupo.id ? null : f.grupo.id)}>
                              <td>
                                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Grupo {f.grupo.numero}</span>
                                {f.grupo.estado !== 'activo' && (
                                  <span className="pill pill--warn" style={{ fontSize: 10, marginLeft: 8 }}>{f.grupo.estado === 'fusionado' ? 'Fusionado' : 'Cerrado'}</span>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                                  {f.grupo.itinerario}{f.coach ? ` · ${f.coach.nombre}` : ' · Sin coach'}{f.horarioTexto ? ` · ${f.horarioTexto}` : ''}
                                </div>
                              </td>
                              <td className="num" style={{ textAlign: 'center' }}>{f.contadores.mesAnterior}</td>
                              <td className="num" style={{ textAlign: 'center', color: f.contadores.nuevos > 0 ? 'var(--ok)' : 'var(--text-dim)' }}>{f.contadores.nuevos}</td>
                              <td className="num" style={{ textAlign: 'center', color: f.contadores.reincorporados > 0 ? 'var(--ok)' : 'var(--text-dim)' }}>{f.contadores.reincorporados}</td>
                              <td className="num" style={{ textAlign: 'center', color: f.contadores.retirados > 0 ? 'var(--bad)' : 'var(--text-dim)' }}>{f.contadores.retirados}</td>
                              <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{f.contadores.totalMes}</td>
                            </tr>
                            {openGrupo === f.grupo.id && (
                              <tr style={{ cursor: 'default' }}>
                                <td colSpan={6} style={{ background: 'var(--surface-2)', padding: 0 }}>
                                  <div style={{ padding: '14px 18px' }}>
                                    <table className="table" style={{ background: 'var(--surface-1)' }}>
                                      <thead><tr>{['Niño', 'Nivel', 'Estado del mes', 'Status plataforma', 'Cierre de nivel', 'Representante', 'Contacto', ''].map((h, hi) => <th key={hi}>{h}</th>)}</tr></thead>
                                      <tbody>
                                        {f.porNiño.map((e) => (
                                          <tr key={e.id} style={{ cursor: 'default' }}>
                                            <td style={{ fontWeight: 600, color: 'var(--text)' }}>{e.nombre}</td>
                                            <td className="num" style={{ fontSize: 12 }}>{e.itinerario} {e.nivel}</td>
                                            <td>{estadoMesPill(e)}</td>
                                            <td className="num" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{String(e.status_plataforma || '—').replace('_', ' ')}</td>
                                            <td className="num" style={{ fontSize: 12 }}>{fmtFecha(e.fecha_cierre_nivel)}</td>
                                            <td style={{ fontSize: 12 }}>{e.representante || '—'}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                              {e.telefono || '—'}
                                              <div style={{ color: 'var(--text-faint)' }}>{e.correo || ''}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                              {congelado ? null : e.esRetirado ? (
                                                <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }}
                                                  onClick={() => setAccionNino({ tipo: 'reincorporar', nino: e })}>↩ Reincorporar</button>
                                              ) : (
                                                <button className="btn" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--bad-text)' }}
                                                  onClick={() => setAccionNino({ tipo: 'retirar', nino: e })}>Retirar</button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                        <tr style={{ cursor: 'default', background: 'var(--surface-3)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--text)' }}>Totales del centro <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-dim)' }}>({t.continuan} continúan)</span></td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{sumMesAnterior}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ok)' }}>{t.nuevos}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ok)' }}>{t.reincorporados}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--bad)' }}>{t.retirados}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ts-green)' }}>{t.aPagar} a pagar</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Declaración de inicios operativos del mes */}
            {iniciosDisponibles && <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel__head">
                <h3 className="panel__title">Inicios de clase del mes</h3>
                <span className="label">{data.iniciosClase?.length || 0} nuevo{data.iniciosClase?.length === 1 ? '' : 's'} activo{data.iniciosClase?.length === 1 ? '' : 's'} en {NOMBRES_MES[month - 1]}</span>
              </div>
              {!data.iniciosClase?.length ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Sin inicios de clase en {NOMBRES_MES[month - 1]} {year}.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr>{['Niño', 'Grupo', 'Nivel', 'Fecha de inscripción', 'Inicio del grupo', 'Inicio efectivo', 'Representante'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.iniciosClase.map((inicio) => (
                        <tr key={inicio.estudianteId} style={{ cursor: 'default' }}>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>{inicio.nombre}</td>
                          <td className="num" style={{ fontSize: 12 }}>
                            {inicio.grupoNumero ? `Grupo ${inicio.grupoNumero}` : 'Sin grupo'}
                            {inicio.coachNombre && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{inicio.coachNombre}</div>}
                          </td>
                          <td className="num" style={{ fontSize: 12 }}>{inicio.itinerario || '—'} {inicio.nivel ?? '—'}</td>
                          <td className="num" style={{ fontSize: 12 }}>{fmtFecha(inicio.fechaInscripcion)}</td>
                          <td className="num" style={{ fontSize: 12 }}>{fmtFecha(inicio.fechaInicioGrupo)}</td>
                          <td className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)' }}>{fmtFecha(inicio.fechaInicio)}</td>
                          <td style={{ fontSize: 12 }}>
                            {inicio.representante || '—'}
                            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{[inicio.telefono, inicio.correo].filter(Boolean).join(' · ')}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>}

            {/* Deserciones del mes (hoja Niños Retirados) */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel__head">
                <h3 className="panel__title">Deserciones del mes</h3>
                <span className="label">{data.deserciones.length} retirado{data.deserciones.length === 1 ? '' : 's'} en {NOMBRES_MES[month - 1]}</span>
              </div>
              {data.deserciones.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Sin retiros en {NOMBRES_MES[month - 1]} {year}. 👏</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr>{['Niño', 'Grupo', 'Nivel', 'Motivo', 'Fecha inicio', 'Fecha retiro', 'Última asistencia', 'Representante'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.deserciones.map((d, i) => (
                        <tr key={i} style={{ cursor: 'default' }}>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>{d.nombre}</td>
                          <td className="num" style={{ fontSize: 12 }}>
                            {d.grupo ? `Grupo ${d.grupo}` : '—'}
                            {d.coach && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{d.coach}</div>}
                          </td>
                          <td className="num" style={{ fontSize: 12 }}>{d.itinerario} {d.nivel}</td>
                          <td><span className={`pill ${d.motivo === 'GRADUADO' ? 'pill--ok' : 'pill--bad'}`}><span className="dot" />{MOTIVOS_RETIRO_LABELS[d.motivo] || d.motivo}</span></td>
                          <td className="num" style={{ fontSize: 12 }}>{fmtFecha(d.fechaInicio)}</td>
                          <td className="num" style={{ fontSize: 12 }}>{fmtFecha(d.fechaRetiro)}</td>
                          <td className="num" style={{ fontSize: 12 }}>{fmtFecha(d.ultimaAsistencia)}</td>
                          <td style={{ fontSize: 12 }}>
                            {d.representante || '—'}
                            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{[d.telefono, d.correo].filter(Boolean).join(' · ')}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pedidos de material */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel__head">
                <h3 className="panel__title">Pedidos de material</h3>
                <span className="label">Kits, ábacos y otros del mes (sección de la hoja Royalties)</span>
              </div>
              {data.pedidos.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr>{['Fecha', 'N° O/E', 'Producto', 'Grupo', 'Nivel', 'Cantidad', 'Monto', 'Observaciones', ''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.pedidos.map((p) => (
                        <tr key={p.id} style={{ cursor: 'default' }}>
                          <td className="num" style={{ fontSize: 12 }}>{fmtFecha(p.fecha)}</td>
                          <td className="num" style={{ fontSize: 12 }}>{p.numero_oe || '—'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {PRODUCTO_LABELS[p.producto] || p.producto}
                            {p.itinerario && <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-dim)' }}> · {p.itinerario}</span>}
                          </td>
                          <td className="num" style={{ fontSize: 12 }}>{numeroGrupo(p.grupo_id)}</td>
                          <td className="num" style={{ fontSize: 12, textAlign: 'center' }}>{p.nivel ?? '—'}</td>
                          <td className="num" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>{p.cantidad ?? 0}</td>
                          <td className="num" style={{ fontWeight: 600, color: 'var(--text)' }}>{money(p.monto)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.observaciones || '—'}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {!congelado && (
                              <>
                                <button className="btn" style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => editarPedido(p)}>✏️ Editar</button>
                                {rol !== 'asistente' && (
                                  <button className="btn" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--bad-text)' }} onClick={() => handleEliminarPedido(p)}>🗑</button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ cursor: 'default', background: 'var(--surface-3)' }}>
                        <td colSpan={5} style={{ fontWeight: 700, color: 'var(--text)' }}>Total</td>
                        <td className="num" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{totalCantidad}</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--ts-green)' }}>{money(totalMonto)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {congelado ? (
                <div style={{ padding: '12px 18px', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                  🔒 Mes cerrado: los pedidos quedaron congelados con el cuadro. Reabre el mes en KPI Semanal para modificarlos.
                </div>
              ) : (
              <form onSubmit={handleGuardarPedido} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', padding: '14px 18px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                <span className="label" style={{ width: '100%' }}>{pedido.id ? 'Editar pedido' : 'Nuevo pedido'} — {NOMBRES_MES[month - 1]} {year}</span>
                <div className="field" style={{ flex: '0 1 140px', margin: 0 }}>
                  <label className="label">Fecha</label>
                  <input type="date" className="input" value={pedido.fecha} onChange={(e) => setP('fecha', e.target.value)} />
                </div>
                <div className="field" style={{ flex: '0 1 110px', margin: 0 }}>
                  <label className="label">N° O/E</label>
                  <input className="input" value={pedido.numero_oe} onChange={(e) => setP('numero_oe', e.target.value)} placeholder="OE-…" />
                </div>
                <div className="field" style={{ flex: '0 1 130px', margin: 0 }}>
                  <label className="label">Producto</label>
                  <select className="input" value={pedido.producto} onChange={(e) => setP('producto', e.target.value)}>
                    {PRODUCTOS_MATERIAL.map((p) => <option key={p} value={p}>{PRODUCTO_LABELS[p] || p}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: '0 1 120px', margin: 0 }}>
                  <label className="label">Itinerario</label>
                  <select className="input" value={pedido.itinerario} onChange={(e) => setP('itinerario', e.target.value)}>
                    <option value="">—</option>
                    {ITINERARIOS.map((it) => <option key={it} value={it}>{it}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: '0 1 80px', margin: 0 }}>
                  <label className="label">Nivel</label>
                  <input type="number" min="1" max="10" className="input" value={pedido.nivel} onChange={(e) => setP('nivel', e.target.value)} />
                </div>
                <div className="field" style={{ flex: '0 1 140px', margin: 0 }}>
                  <label className="label">Grupo</label>
                  <select className="input" value={pedido.grupo_id} onChange={(e) => setP('grupo_id', e.target.value)}>
                    <option value="">—</option>
                    {gruposActivos.map((g) => <option key={g.id} value={String(g.id)}>Grupo {g.numero} · {g.itinerario}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: '0 1 90px', margin: 0 }}>
                  <label className="label">Cantidad</label>
                  <input type="number" min="0" className="input" value={pedido.cantidad} onChange={(e) => setP('cantidad', e.target.value)} />
                </div>
                <div className="field" style={{ flex: '0 1 110px', margin: 0 }}>
                  <label className="label">Monto $</label>
                  <input type="number" min="0" step="0.01" className="input" value={pedido.monto} onChange={(e) => setP('monto', e.target.value)} />
                </div>
                <div className="field" style={{ flex: '1 1 180px', margin: 0 }}>
                  <label className="label">Observaciones</label>
                  <input className="input" value={pedido.observaciones} onChange={(e) => setP('observaciones', e.target.value)} placeholder="Ej: repite nivel" />
                </div>
                <button type="submit" className="btn btn--primary" disabled={savingPedido}>{savingPedido ? 'Guardando…' : (pedido.id ? 'Guardar cambios' : '+ Agregar pedido')}</button>
                {pedido.id && <button type="button" className="btn" onClick={() => setPedido(EMPTY_PEDIDO)}>Cancelar</button>}
              </form>
              )}
            </div>
          </>
        )}

        {accionNino?.tipo === 'retirar' && (
          <RetirarModal centroId={id} nino={accionNino.nino}
            onClose={() => setAccionNino(null)}
            onSaved={async (msg) => { setAccionNino(null); setStatus('✅ ' + msg); await loadData() }} />
        )}
        {accionNino?.tipo === 'reincorporar' && (
          <ReincorporarModal centroId={id} nino={accionNino.nino} grupos={gruposActivos}
            onClose={() => setAccionNino(null)}
            onSaved={async (msg) => { setAccionNino(null); setStatus('✅ ' + msg); await loadData() }} />
        )}
      </main>
    </div>
  )
}

// ── Modal: retirar niño desde el cuadro ──────────────────────────────────────
function RetirarModal({ centroId, nino, onClose, onSaved }) {
  const [f, setF] = useState({ motivo: '', fecha: hoyISO(), ultimaAsistencia: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    if (!f.motivo) { setErr('Selecciona el motivo del retiro.'); return }
    setSaving(true); setErr('')
    const res = await retirarEstudiante(centroId, nino.id, {
      motivo: f.motivo, fecha: f.fecha, ultimaAsistencia: f.ultimaAsistencia || undefined,
    })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    let msg = `${nino.nombre} retirado del cuadro.`
    if (res.warn) msg += ` ⚠️ ${res.warn}`
    if (res.grupoVacio) msg += ` El grupo ${res.grupoVacio} quedó sin niños: ciérralo en Grupos y Fusiones si ya no va a operar.`
    onSaved(msg)
  }

  return (
    <Modal title={`Retirar a ${nino.nombre}`} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Retirar del cuadro'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field full label="Motivo del retiro *">
          <select className="input" value={f.motivo} onChange={(e) => set('motivo', e.target.value)}>
            <option value="">Selecciona motivo…</option>
            {MOTIVOS_RETIRO.map((m) => <option key={m} value={m}>{MOTIVOS_RETIRO_LABELS[m] || m}</option>)}
          </select>
        </Field>
        <Field label="Fecha de retiro"><input type="date" className="input" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></Field>
        <Field label="Última asistencia (opcional)"><input type="date" className="input" value={f.ultimaAsistencia} onChange={(e) => set('ultimaAsistencia', e.target.value)} /></Field>
        <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
          El niño cae en las deserciones del mes de la fecha de retiro y deja de contar en “a pagar”. Si vuelve, lo reincorporas desde esta misma tabla.
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: reincorporar niño desde el cuadro ─────────────────────────────────
function ReincorporarModal({ centroId, nino, grupos, onClose, onSaved }) {
  // Por defecto vuelve a su grupo anterior, si sigue activo.
  const anterior = grupos.find((g) => String(g.id) === String(nino.grupo_id))
  const [grupoId, setGrupoId] = useState(anterior ? String(anterior.id) : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!grupoId) { setErr('Selecciona el grupo donde se reincorpora.'); return }
    setSaving(true); setErr('')
    const res = await reincorporarEstudiante(centroId, nino.id, { grupoId })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    const g = grupos.find((x) => String(x.id) === String(grupoId))
    onSaved(`${nino.nombre} reincorporado${g ? ` en el grupo ${g.numero}` : ''}.`)
  }

  return (
    <Modal title={`Reincorporar a ${nino.nombre}`} onClose={onClose}
      footer={(
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Reincorporar'}</button>
        </>
      )}>
      {err && <div className="alert alert--error" style={{ marginBottom: 14 }}>{err}</div>}
      <Field full label="Grupo donde se reincorpora *">
        <select className="input" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
          <option value="">Selecciona grupo…</option>
          {grupos.map((g) => (
            <option key={g.id} value={String(g.id)} disabled={g.inscripcionAbierta === false}>
              Grupo {g.numero} · {g.itinerario}{g.horarioTexto ? ` · ${g.horarioTexto}` : ''} · {g.inscripcionAbierta === false ? '🔒 cerrado a inscripciones' : `quedan ${g.cupos} de 10 cupos`}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-3)', padding: '8px 12px', borderRadius: 'var(--r-sm)' }}>
        Cuenta como reincorporación del mes en curso y vuelve a sumar en “a pagar”.
      </div>
    </Modal>
  )
}

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
