'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { loadCumplimiento, saveCumplimiento, getDisciplinaTrimestre, getMetasMarcadas } from '../../../actions/cumplimiento'
import { getCentroNombre } from '../../../actions/centros'
import { getCentroResumen } from '../../../actions/centro'
import { getCentroGrowth } from '../../../actions/growth'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, quarterMonths, periodLabel } from '../../../../lib/period'
import PeriodSelector from '../../../../components/PeriodSelector'
import TableScroller from '../../../../components/TableScroller'
import SemaforoProducto from '../../../../components/SemaforoProducto'
import {
  CUMPLIMIENTO_KEYS, CUMPLIMIENTO_LABELS, DISCIPLINA_GRUPOS, disciplinaPct,
} from '../../../../lib/checklist'
import {
  evaluarProducto, mesesProducto, normalizarMetas, semaforo as calcularSemaforo, verdictoCrecimiento, dec1,
} from '../../../../lib/marcadores.mjs'
import { CLAVES_PRODUCTO, compararMetas, discrepanciasPorClave, NOTA_NEUTRAL } from '../../../../lib/discrepancias-metas.mjs'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Un mes SIN registro arranca en "no". Antes arrancaba con 25 de 33 en "sí"
// prellenados, así que la pantalla enseñaba un 88% de un mes que nadie había
// registrado nunca. Ese era el número que daba la falsa confianza.
const VACIO = Object.fromEntries(CUMPLIMIENTO_KEYS.map((k) => [k, 'no']))

// AVISO DE DISCREPANCIA · pegado a la meta, no en una pantalla aparte.
//
// Se dibuja SÓLO cuando lo guardado en la base contradice el cálculo. No tiene
// botón de descartar a propósito: descartarlo sería volver al punto de partida
// (un valor que nadie ve y que sigue sumando en el panel del supervisor). Se
// va solo cuando las dos fuentes coinciden.
//
// Lo lee la persona que marcó la casilla: dice qué guarda el registro, qué
// dice el cálculo y con qué números. No dice que esté mal.
//
// Y DICE CÓMO SE ARREGLA. Era la única de las tres alertas sin acción: la de
// higiene siempre trae `accion` + `donde` y la del coach cierra con "es un dato
// para conversar y corregir". El arreglo existe y es trivial —volver a pulsar
// Guardar hace que el servidor vuelva a derivar la meta desde la base y pise la
// marca vieja (app/actions/cumplimiento.js)— pero ninguna pantalla lo decía.
// Fernando pidió "debe corregirse, y el sistema lo debe detectar de forma
// automática": la detección estaba; la corrección era un secreto. Y hay que
// pulsar Guardar en CADA mes del trimestre, porque cada fila es un mes.
function AvisoDiscrepancia({ d }) {
  if (!d) return null
  const varios = (d.meses || []).length > 1
  return (
    <div role="note" className="discrepancia">
      <div className="discrepancia__titulo">
        <span aria-hidden="true">⚠</span> {d.titulo}
      </div>
      <p className="discrepancia__detalle">{d.detalle}</p>
      <p className="discrepancia__accion">
        Para corregirlo, pulsa <b>Guardar</b> en este mes: el sistema vuelve a derivar la meta desde la base y
        reemplaza la marca guardada.{' '}
        {varios
          ? `Cada fila es un mes, así que repítelo en las otras pestañas del trimestre (${d.nombresMeses}).`
          : `Afecta a ${d.nombresMeses}: guarda en esa pestaña.`}
      </p>
      <p className="discrepancia__nota">{NOTA_NEUTRAL}</p>
    </div>
  )
}

function CumplePill({ cumple }) {
  if (cumple == null) {
    return <span className="pill" style={{ background: 'var(--surface-3)', borderColor: 'var(--border-strong)', color: 'var(--text-dim)' }}><span className="dot" />Sin datos</span>
  }
  return (
    <span className={`pill ${cumple ? 'pill--ok' : 'pill--bad'}`} style={cumple ? { color: 'var(--text)' } : undefined}>
      <span className="dot" /><span aria-hidden="true">{cumple ? '✓' : '✗'}</span> {cumple ? 'Cumple' : 'No cumple'}
    </span>
  )
}

export default function CumplimientoPage() {
  const params = useParams()
  // Período seleccionable (trimestre/año) — compartido con el resto del panel.
  // Permite registrar/editar el cumplimiento de meses de trimestres anteriores
  // (p. ej. Junio, que cae en Q2, aunque hoy el trimestre actual sea Q3).
  const [period, setPeriod] = useState(getCurrentPeriod())
  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  const { year, quarter } = period
  const label = periodLabel(year, quarter)
  const qMonths = quarterMonths(quarter)
  const [nombre, setNombre] = useState('Centro')
  const centroId = params.id === 'demo' ? null : params.id
  useEffect(() => { if (centroId) getCentroNombre(centroId).then((n) => { if (n) setNombre(n) }).catch(() => {}) }, [centroId])

  const [mes, setMes] = useState(1)
  const [vals, setVals] = useState(VACIO)
  const [existe, setExiste] = useState(true)
  const [trimestreId, setTrimestreId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // Marcador 1 · Producto (trimestral, calculado) y marcador 2 · Disciplina del
  // trimestre. Ninguno de los dos se promedia con el otro.
  const [producto, setProducto] = useState(null)
  const [estado, setEstado] = useState(null)
  const [serie, setSerie] = useState([])
  const [disciplinaQ, setDisciplinaQ] = useState(null)
  // Lo GUARDADO en las 3 metas de resultado, crudo de la base. Es la otra
  // fuente de la comparación: `vals` no sirve porque loadCumplimiento
  // normaliza NULL → 'no' y eso inventaría discrepancias que nadie marcó.
  const [metasMarcadas, setMetasMarcadas] = useState([])

  // Al cambiar de trimestre/año se vuelve al primer mes y se recarga.
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p); setMes(1) }

  useEffect(() => { loadData() }, [mes, centroId, year, quarter])
  useEffect(() => { loadProducto() }, [centroId, year, quarter])

  async function loadData() {
    if (!centroId) { setLoading(false); setExiste(false); return }
    setLoading(true)
    setError('')
    try {
      const { trimestreId, vals: cargados, existe: hayFila } = await loadCumplimiento(centroId, year, quarter, mes)
      setTrimestreId(trimestreId)
      setExiste(Boolean(hayFila))
      setVals(cargados || { ...VACIO })
    } catch (e) { setError('No se pudo cargar el cumplimiento. Intenta nuevamente.') }
    setLoading(false)
  }

  // Producto y disciplina del trimestre son contexto: si fallan, la pantalla
  // sigue sirviendo para registrar el checklist.
  async function loadProducto() {
    if (!centroId) return
    const [resumen, growth, disciplina, marcadas] = await Promise.all([
      getCentroResumen(centroId, year, quarter).catch(() => null),
      getCentroGrowth(centroId).catch(() => null),
      getDisciplinaTrimestre(centroId, year, quarter).catch(() => null),
      getMetasMarcadas(centroId, year, quarter).catch(() => []),
    ])
    setDisciplinaQ(disciplina || null)
    setMetasMarcadas(marcadas || [])
    if (!resumen || resumen.error) { setProducto(null); setEstado(null); setSerie([]); return }
    // Misma normalización que el Resumen: Neon devuelve `numeric` como string.
    const metas = normalizarMetas(resumen.metas)
    const mensual = mesesProducto({
      months: qMonths, rs: resumen.rs, ks: resumen.ks, mesesCalc: resumen.meses,
    })
    const p = evaluarProducto({ meses: mensual, metas, anio: year })
    // El motor de crecimiento siempre proyecta desde HOY: su número sólo vale
    // para el trimestre corriente (ver app/centro/[id]/page.js).
    const actual = getCurrentPeriod()
    const esCorriente = year === actual.year && quarter === actual.quarter
    const netMensual = esCorriente ? (growth?.projection?.scenarios?.base?.monthlyNet ?? null) : null
    setSerie(mensual)
    setProducto(p)
    setEstado(calcularSemaforo({
      metasFallidas: p.metasFallidas,
      metasQueFallan: p.metasQueFallan,
      crecimiento: verdictoCrecimiento(netMensual),
      netMensual,
      confianza: esCorriente ? (growth?.metrics?.confidence?.level ?? null) : null,
      sinDatos: p.sinDatos,
      registroCompleto: p.registroCompleto,
      mesesSinRegistrar: p.mesesSinRegistrar,
      mesesSinCobranza: p.mesesSinCobranza,
      graduadosMedianos: esCorriente ? (growth?.metrics?.medians?.graduates ?? null) : null,
      retirosMedianos: esCorriente ? (growth?.metrics?.medians?.withdrawals ?? null) : null,
    }))
  }

  function toggle(k, v) { setVals(prev => ({ ...prev, [k]: v })) }

  // Las 3 claves de Producto ya NO viajan en el guardado. No es que la
  // pantalla se porte bien: es que el servidor las ignora y las deriva él
  // mismo (app/actions/cumplimiento.js). Mandarlas desde aquí sería sugerir
  // que el cliente puede decidirlas, y es justo lo que se cerró.
  async function save() {
    if (!centroId) { setStatus('Modo demo — conéctate con cuenta real para guardar.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await saveCumplimiento(centroId, year, quarter, mes, vals)
      if (res.error) throw new Error(res.error)
      setExiste(true)
      // LA SALVAGUARDA, CONECTADA. `metasEscritas` existe para que guardar no
      // parezca que confirmó una meta que el sistema no pudo juzgar: si el
      // cálculo falla o el trimestre no es evaluable, la marca vieja sobrevive
      // intacta. La pantalla tiraba ese dato y mostraba un tick verde en el
      // caso exacto que el servidor teme.
      const escritas = (res.metasEscritas || []).length
      setStatus(escritas === CLAVES_PRODUCTO.length
        ? '✅ Guardado. Las 3 metas se recalcularon desde la base.'
        : `✅ Guardado. Se recalcularon ${escritas} de ${CLAVES_PRODUCTO.length} metas; las otras quedaron como estaban porque todavía no se pueden juzgar.`)
      setTimeout(() => setStatus(''), escritas === CLAVES_PRODUCTO.length ? 4000 : 8000)
      loadProducto()
      getDisciplinaTrimestre(centroId, year, quarter).then(setDisciplinaQ).catch(() => {})
    } catch (e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  const nombreMes = NOMBRES_MES[qMonths[mes - 1] - 1]
  const mesDeSerie = serie.find((s) => s.mesNum === qMonths[mes - 1]) || null
  // El número grande de esta pantalla ya no es "el cumplimiento": es la
  // DISCIPLINA del mes, ponderada, y lleva su denominador pegado.
  const discMes = disciplinaPct([vals])
  const metaCobranza = producto?.meta?.cobranza
  const metaDesercion = producto?.meta?.desercion
  const metaVentas = producto?.meta?.nuevos

  const detalleDelMes = (clave) => {
    if (!mesDeSerie) return null
    if (clave === 'meta_nuevos_ingresos') return `${nombreMes}: ${mesDeSerie.ventas} de ${metaVentas}`
    if (clave === 'meta_desercion') return `${nombreMes}: ${mesDeSerie.desReal} de ${mesDeSerie.ninosInicio} = ${dec1(mesDeSerie.desPct)}%`
    return `${nombreMes}: ${mesDeSerie.cobranza} vencidas`
  }

  // ¿LO GUARDADO CONTRADICE LO CALCULADO?
  // Se compara contra las filas del TRIMESTRE entero, no sólo contra el mes
  // visible: el verdicto de Producto es trimestral, así que una marca vieja de
  // otro mes seguiría escondida detrás de una pestaña.
  const comparacion = compararMetas({ producto, filas: metasMarcadas, mesesDelTrimestre: qMonths })
  const discrepancias = discrepanciasPorClave(comparacion)

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={params.id}/>
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main reports-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Checklist operativo · {label}</div>
            <h1 className="h-title">Cumplimiento mensual</h1>
            <p className="h-sub">{nombre} · {label}</p>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={changePeriod} />
            {status && <span role="status" aria-live="polite" style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: status.includes('❌') ? 'var(--bad-text)' : 'var(--ok-text)', fontWeight: 500 }}>{status}</span>}
            <button type="button" onClick={save} disabled={saving||loading||Boolean(error)} className="btn btn--primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* El semáforo del trimestre, en la misma pantalla donde se marcan las
            casillas: para que nadie termine de marcar 30 criterios sin ver que
            el centro está decreciendo. */}
        <SemaforoProducto semaforo={estado} producto={producto} compacto />

        <div role="tablist" aria-label="Mes de cumplimiento" className="reports-tabs" style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid var(--border)', gap: 4 }}>
          {qMonths.map((mAbs,i)=>
            <button type="button" role="tab" id={`mes-tab-${i+1}`} aria-controls="cumplimiento-panel" aria-selected={mes===i+1} tabIndex={mes===i+1 ? 0 : -1} key={mAbs} onClick={()=>setMes(i+1)} onKeyDown={e => { const next = e.key==='ArrowRight' ? mes%3+1 : e.key==='ArrowLeft' ? (mes+1)%3+1 : e.key==='Home' ? 1 : e.key==='End' ? 3 : null; if(next) { e.preventDefault(); setMes(next); document.getElementById(`mes-tab-${next}`)?.focus() } }} style={{ minHeight:44, padding: '10px 20px', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', borderBottom: mes===i+1 ? '2px solid var(--ts-green)' : '2px solid transparent', color: mes===i+1 ? 'var(--text)' : 'var(--text-dim)', fontWeight: mes===i+1 ? 600 : 500, marginBottom: -1 }}>{NOMBRES_MES[mAbs-1]}</button>
          )}
        </div>

        {loading ? <div role="status" style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando…</div> : error ? <div role="alert">{error}<button type="button" className="btn" onClick={loadData}>Reintentar</button></div> : <div role="tabpanel" id="cumplimiento-panel" aria-labelledby={`mes-tab-${mes}`}>

          {/* ── MARCADOR 1 · PRODUCTO ─────────────────────────────────────── */}
          <div className="card" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <h2 className="label" style={{ marginBottom: 6 }}>Producto · calculado, no se marca</h2>
            <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-dim)' }}>
              Estas tres salen de la base —ventas, deserción real y cobranza del trimestre— y son las que pintan el semáforo.
              Fallar una de ellas no es lo mismo que quedarse sin aromatizante: ninguna casilla de abajo la compensa.
            </p>
            {!producto && <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)' }}>No se pudo calcular el producto del trimestre. El checklist de abajo sigue disponible.</p>}
            {producto && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {producto.detalle.map((d) => (
                <div key={d.clave}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{CUMPLIMIENTO_LABELS[d.clave]}</div>
                      <div className="label" style={{ fontSize: 13, marginTop: 3 }}>Meta {d.meta} · {detalleDelMes(d.clave) || 'sin datos del mes'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="num" style={{ fontSize: 18, fontWeight: 600, color: d.cumple === false ? 'var(--bad-text)' : 'var(--text)' }}>{d.valor}</span>
                      <CumplePill cumple={d.cumple} />
                    </div>
                  </div>
                  <AvisoDiscrepancia d={discrepancias[d.clave]} />
                </div>
              ))}
            </div>}
            {producto && !producto.sinDatos && (
              <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-dim)' }}>
                Trimestre: ventas {producto.ventasQ} de {producto.metaQ} · deserción real {producto.desRealQ} de {producto.bajasQ} bajas ({producto.graduadosQ} graduados, que no penalizan) ·
                cobranza fuera de meta en {producto.cobranzaFuera} de {producto.mesesConDatos} {producto.mesesConDatos === 1 ? 'mes' : 'meses'} (meta ≤ {metaCobranza}, deserción &lt; {metaDesercion}%).
              </p>
            )}
            {/* "No se puede saber" no es "no cumple": una meta sin datos para
                juzgar se dice, no se corrige a la brava. */}
            {comparacion.noVerificables.length > 0 && (
              <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-dim)' }}>
                {comparacion.noVerificables.length === 1 ? 'Hay una meta con marca guardada que' : `Hay ${comparacion.noVerificables.length} metas con marca guardada que`} hoy no se {comparacion.noVerificables.length === 1 ? 'puede' : 'pueden'} contrastar:{' '}
                {comparacion.noVerificables.map((n) => `${n.corta} (${n.motivo})`).join(' · ')}. Se conservan como están hasta que haya datos para juzgarlas.
              </p>
            )}
          </div>

          {/* ── MARCADOR 2 · DISCIPLINA ───────────────────────────────────── */}
          {!existe && (
            <div className="disciplina__sin-registrar">
              <b>{nombreMes} sin registrar.</b> Este mes todavía no tiene checklist guardado, así que todo empieza en «No».
              Un mes en blanco no cuenta como cumplido: hasta que guardes, no entra en el porcentaje del trimestre.
            </div>
          )}

          <div className="card disciplina" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <h2 className="label" style={{ marginBottom: 4 }}>Disciplina · lo que registras</h2>
                <div className="disciplina__denominador">
                  {nombreMes}: {discMes.puntos} de {discMes.maximo} puntos en 30 criterios ponderados
                  {disciplinaQ ? ` · trimestre ${disciplinaQ.pct ?? 0}% con ${disciplinaQ.mesesRegistrados} de ${qMonths.length} meses registrados` : ''}
                </div>
              </div>
              <div className="disciplina__valor">{discMes.pct}%</div>
            </div>
            <div className="bar" style={{ height: 10 }}>
              <div className="bar__fill" style={{ width: `${discMes.pct}%`, background: 'var(--text-muted)' }} />
            </div>
            <p className="disciplina__nota">
              Son las actividades de soporte. No pintan el semáforo y no se promedian con el producto: 100% aquí con el semáforo en rojo sigue siendo un centro que no crece.
            </p>
          </div>

          <div className="disciplina__grupos">
          {DISCIPLINA_GRUPOS.map(group => (
            <div key={group.id} className="card" style={{ padding: '16px 20px' }}>
              <h3 className="label" style={{ color: 'var(--ok-text)', marginBottom: 4 }}>
                {nombreMes} · {group.titulo}
                <span className="disciplina__grupo-peso">peso {group.peso} × {group.claves.length}</span>
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-dim)' }}>{group.proposito}</p>
              <TableScroller label={`${nombreMes} · ${group.titulo}`} stickyFirstColumn>
                <table className="table compliance-matrix"><thead><tr><th scope="col">Criterio</th><th scope="col">Sí</th><th scope="col">No</th></tr></thead><tbody>
                  {group.claves.map(k => <tr key={k}><th scope="row">{CUMPLIMIENTO_LABELS[k]}</th>{['si','no'].map(value => <td key={value}><button type="button" className="btn btn--compact" aria-pressed={vals[k]===value} onClick={()=>toggle(k,value)}>{value==='si' ? 'Sí' : 'No'}</button></td>)}</tr>)}
                </tbody></table>
              </TableScroller>
            </div>
          ))}
          </div>
        </div>}
      </main>
    </div>
  )
}
