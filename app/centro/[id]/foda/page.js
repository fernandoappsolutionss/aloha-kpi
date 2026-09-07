'use client'
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import { getCentroNombre } from '../../../actions/centros'
import { loadFoda, saveFoda } from '../../../actions/foda'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../../lib/period'
import PeriodSelector from '../../../../components/PeriodSelector'
import PeticionesPanel from '../../../../components/foda/PeticionesPanel'
import { PREFIJO_GENERADO, edicionesGeneradas, faltantesOportunidad, fusionarGenerado, lineaOportunidad, lineasSinDiagnostico, sinPrefijo } from '../../../../lib/foda-datos.mjs'

const CUADRANTES_VACIOS = { fortalezas: [], debilidades: [], oportunidades: [], amenazas: [] }
const CLAVES = ['fortalezas', 'debilidades', 'oportunidades', 'amenazas']

// Cuadrantes con contrato de acción: una línea sirve si dice quién, cuándo y
// qué número mueve. El resto es un comentario.
const ACCIONABLES = { oportunidades: 'Acción', amenazas: 'Mitigación' }
const DUENOS = ['Administradora', 'Asistente', 'Coach', 'Gerencia']

const hoyISO = () => new Date().toISOString().slice(0, 10)

const lineasDe = (texto) => String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean)

// Compositor de una línea accionable: cuatro campos cortos en una fila, no un
// formulario. Escribir "Dueño · Fecha · Número que mueve" tiene que costar
// menos que escribir un párrafo sin números.
function CompositorAccion({ k, etiqueta, onAdd }) {
  const [accion, setAccion] = useState('')
  const [dueno, setDueno] = useState(DUENOS[0])
  const [fecha, setFecha] = useState('')
  const [mueve, setMueve] = useState('')
  const listo = accion.trim() && fecha.trim() && mueve.trim()
  const campo = { padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 16, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-sans)', minWidth: 0, width: '100%' }
  function agregar() {
    if (!listo) return
    onAdd(lineaOportunidad({ accion, dueno, fecha, mueve }))
    setAccion(''); setMueve(''); setFecha('')
  }
  return (
    <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
      <div className="label" style={{ marginBottom: 8, fontSize: 13 }}>Agregar una {etiqueta.toLowerCase()} accionable</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        <div>
          <label className="label" htmlFor={`${k}-accion`} style={{ fontSize: 13 }}>{etiqueta}</label>
          <input id={`${k}-accion`} name={`${k}-accion`} autoComplete="off" value={accion} onChange={(e) => setAccion(e.target.value)} placeholder="Qué se hace, concreto" style={campo} />
        </div>
        <div>
          <label className="label" htmlFor={`${k}-dueno`} style={{ fontSize: 13 }}>Dueño</label>
          <input id={`${k}-dueno`} name={`${k}-dueno`} list={`${k}-duenos`} autoComplete="off" value={dueno} onChange={(e) => setDueno(e.target.value)} style={campo} />
          <datalist id={`${k}-duenos`}>{DUENOS.map((d) => <option key={d} value={d} />)}</datalist>
        </div>
        <div>
          <label className="label" htmlFor={`${k}-fecha`} style={{ fontSize: 13 }}>Al</label>
          <input id={`${k}-fecha`} name={`${k}-fecha`} type="date" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} style={campo} />
        </div>
        <div>
          <label className="label" htmlFor={`${k}-mueve`} style={{ fontSize: 13 }}>Mueve</label>
          <input id={`${k}-mueve`} name={`${k}-mueve`} autoComplete="off" value={mueve} onChange={(e) => setMueve(e.target.value)} placeholder="ventas de 4,7 a 20/mes" style={campo} />
        </div>
      </div>
      <button type="button" className="btn" onClick={agregar} disabled={!listo} style={{ marginTop: 10 }}>
        Añadir a {etiqueta === 'Acción' ? 'Oportunidades' : 'Amenazas'}
      </button>
      {!listo && <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>Sin dueño, fecha y número que mueve no se añade: eso sería un comentario.</p>}
    </div>
  )
}

export default function FodaPage() {
  const params = useParams()
  const [nombre, setNombre] = useState('Centro')
  useEffect(() => { getCentroNombre(params.id).then((n) => { if (n) setNombre(n) }).catch(() => {}) }, [params.id])
  const [saving, setSaving] = useState(false)
  const [foda, setFoda] = useState({ fortalezas: '', debilidades: '', oportunidades: '', amenazas: '', comentarios: '' })
  // Los cuatro cuadrantes REDACTADOS DESDE LOS DATOS del trimestre.
  const [generado, setGenerado] = useState({ ...CUADRANTES_VACIOS, disponible: false })
  const [estado, setEstado] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  // Período seleccionable (trimestre/año) — compartido con el resto del panel.
  // Permite editar el FODA de trimestres anteriores (p. ej. Junio en Q2).
  const [period, setPeriod] = useState(getCurrentPeriod())
  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  const { year, quarter } = period
  const label = periodLabel(year, quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => {
    if (params.id === 'demo') { setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    loadFoda(params.id, year, quarter).then((d) => {
      if (!active) return
      if (!d) return
      const gen = { ...CUADRANTES_VACIOS, ...(d.generado || {}) }
      setGenerado(gen)
      const row = d.foda
      // Lo guardado manda. Si el cuadrante está vacío se estrena con la
      // propuesta escrita desde los datos (marcada con el prefijo).
      const inicial = {}
      for (const k of CLAVES) {
        const guardado = row?.[k] ?? ''
        inicial[k] = guardado.trim() ? guardado : fusionarGenerado('', gen[k])
      }
      setFoda({ ...inicial, comentarios: row?.comentarios ?? '' })
      setEstado(row?.comentario_estado || '')
    }).catch(() => { if (active) setError('No se pudo cargar el FODA. Intenta nuevamente.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [params.id, year, quarter, retry])

  // Reescribe el cuadrante con los datos de HOY y conserva debajo, intacto,
  // todo lo que escribió la administradora (lo generado lleva el prefijo).
  //
  // Las líneas del sistema SÍ se reescriben —sus números cambian con los
  // datos—, así que si alguien editó una encima, se avisa por su nombre en vez
  // de perderla en silencio: la pantalla promete "lo que escribas tú se
  // conserva" y hay que cumplirlo o decir la verdad.
  const avisoEdiciones = (ks) => {
    const tocadas = ks.flatMap((k) => edicionesGeneradas(foda[k], generado[k]))
    return tocadas.length
      ? ` Ojo: ${tocadas.length} ${tocadas.length === 1 ? 'línea del sistema que habías editado se reescribió' : 'líneas del sistema que habías editado se reescribieron'}; si quieres conservar una nota, escríbela en su propia línea (sin el "·").`
      : ''
  }
  function regenerar(k) {
    const aviso = avisoEdiciones([k])
    setFoda((f) => ({ ...f, [k]: fusionarGenerado(f[k], generado[k]) }))
    setStatus(`Regenerado desde los datos — recuerda guardar.${aviso}`)
  }
  function regenerarTodo() {
    const aviso = avisoEdiciones(CLAVES)
    setFoda((f) => {
      const next = { ...f }
      for (const k of CLAVES) next[k] = fusionarGenerado(f[k], generado[k])
      return next
    })
    setStatus(`Los 4 cuadrantes se reescribieron desde los datos — recuerda guardar.${aviso}`)
  }
  function agregarLinea(k, linea) {
    setFoda((f) => {
      const actuales = lineasDe(f[k])
      if (actuales.some((l) => sinPrefijo(l) === sinPrefijo(linea))) return f
      return { ...f, [k]: [...actuales, linea].join('\n') }
    })
  }

  // Herencia del FODA viejo: se pre-cargaba con las ETIQUETAS del checklist
  // ("Meta de cobranza lograda" como DEBILIDAD). Se detecta por lo que le
  // falta —ningún número— y se ofrece reescribirlo sin borrar nada.
  const heredado = useMemo(() => {
    const sospechosas = ['fortalezas', 'debilidades'].reduce((total, k) => {
      const lineas = lineasDe(foda[k]).filter((l) => !l.startsWith(PREFIJO_GENERADO.trim()))
      const sinDato = lineasSinDiagnostico(lineas.join('\n'))
      return total + (lineas.length >= 3 && sinDato.length === lineas.length ? lineas.length : 0)
    }, 0)
    return sospechosas
  }, [foda.fortalezas, foda.debilidades])

  async function save() {
    if (params.id === 'demo') { setStatus('Modo demo — no se guarda.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await saveFoda(params.id, year, quarter, { ...foda, comentario_estado: estado })
      if (res?.error) throw new Error(res.error)
      setStatus('✓ Guardado'); setTimeout(() => setStatus(''), 3500)
    } catch (e) {
      setStatus('Error al guardar: ' + (e?.message || 'desconocido'))
    }
    setSaving(false)
  }

  // accent = color de la barra superior y del título · tone = color del cuerpo
  // Los CUATRO cuadrantes se escriben desde los datos del trimestre y quedan
  // editables: lo que la administradora escriba encima se respeta.
  const cuads = [
    { t: 'Fortalezas', accent: 'var(--ok)', tone: 'var(--ok-text)', k: 'fortalezas', regla: 'Solo lo que movió un número: metas cumplidas, graduados, coaches que retienen.' },
    { t: 'Debilidades', accent: 'var(--bad)', tone: 'var(--bad-text)', k: 'debilidades', regla: 'Dato, brecha y a dónde lleva. “14 de 60” dice más que “meta no cumplida”.' },
    { t: 'Oportunidades', accent: 'var(--ts-green)', tone: 'var(--text)', k: 'oportunidades', regla: 'Dueño · Fecha · Número que mueve. Si no mueve un número, no es oportunidad.' },
    { t: 'Amenazas', accent: 'var(--warn)', tone: 'var(--warn-text)', k: 'amenazas', regla: 'Lo que no controlas del todo, cuantificado — y con quién y cuándo se mitiga.' },
  ]

  const taStyle = { width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 16, resize: 'vertical', marginTop: 10, outline: 'none', lineHeight: 1.6, color: 'var(--text)', minHeight: 120, fontFamily: 'var(--font-sans)' }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={params.id} />
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main reports-page">
        <CentroNavigation centroId={params.id} />

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Análisis estratégico · {label}</div>
            <h1 className="h-title">FODA Trimestral</h1>
            <p className="h-sub">{nombre} · {label}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={changePeriod} />
            {status && <span role="status" aria-live="polite" style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: status.startsWith('Error') ? 'var(--bad-text)' : 'var(--ok-text)' }}>{status}</span>}
            <button type="button" onClick={save} disabled={saving || loading || Boolean(error)} className="btn btn--primary">{saving ? 'Guardando…' : 'Guardar FODA'}</button>
          </div>
        </div>

        {loading ? <p role="status">Cargando FODA…</p> : error ? <div role="alert">{error}<button type="button" className="btn" onClick={() => setRetry(n => n + 1)}>Reintentar</button></div> : <>
        <div className="alert" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <span style={{ color: 'var(--ts-green)' }}>›</span>{' '}
            Los cuatro cuadrantes se escriben con los <b>números del trimestre</b>: ventas contra meta, deserción real, cobranza, crecimiento y concentración por coach.
            Lo generado lleva “{PREFIJO_GENERADO.trim()}” adelante; lo que escribas tú se conserva debajo y no se toca.
          </span>
          {generado.disponible
            ? <button type="button" className="btn" onClick={regenerarTodo}>Regenerar los 4 cuadrantes</button>
            : <span style={{ color: 'var(--warn-text)' }}>Sin datos del trimestre para proponer líneas.</span>}
        </div>

        {heredado > 0 && (
          <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)', marginBottom: 20 }}>
            Este FODA viene del checklist anterior: {heredado} líneas son nombres de casillas, no diagnósticos
            (por eso una debilidad podía decir “Meta de cobranza lograda”). Regenera para escribir arriba el diagnóstico con números;
            lo que ya estaba se conserva debajo hasta que tú lo borres.
          </div>
        )}

        <div className="reports-grid">
          {cuads.map(({ t, accent, tone, k, regla }) => {
            const sinDiagnostico = lineasSinDiagnostico(foda[k])
            const propuestas = (generado[k] || []).filter((l) => !lineasDe(foda[k]).some((y) => sinPrefijo(y) === l))
            const accionable = ACCIONABLES[k]
            const incompletas = accionable
              ? lineasDe(foda[k]).map((l) => ({ l, faltan: faltantesOportunidad(l) })).filter((x) => x.faltan.length)
              : []
            return (
              <div key={t} className="card" style={{ padding: 18, borderTop: `2px solid ${accent}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 className="label" style={{ color: tone, fontSize: 13 }}><label htmlFor={`foda-${k}`}>{t}</label></h3>
                  <button type="button" onClick={() => regenerar(k)} disabled={!generado.disponible} className="btn" style={{ padding: '4px 10px', fontSize: 13 }}>
                    Regenerar desde los datos
                  </button>
                </div>
                <p className="h-sub" style={{ marginTop: 0, marginBottom: 8 }}>Escrito desde los datos del trimestre · editable</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 3, paddingLeft: 10, borderLeft: '2px solid var(--border-strong)' }}>{regla}</p>
                <textarea id={`foda-${k}`} name={k} autoComplete="off" value={foda[k] ?? ''} onChange={e => setFoda({ ...foda, [k]: e.target.value })} style={taStyle} />

                {sinDiagnostico.length > 0 && (
                  <p style={{ fontSize: 13, color: 'var(--warn-text)', marginTop: 8, marginBottom: 0 }}>
                    {sinDiagnostico.length} {sinDiagnostico.length === 1 ? 'línea sin número que comparar' : 'líneas sin número que comparar'}: no diagnostican. Ej.: “{sinDiagnostico[0].slice(0, 60)}”.
                  </p>
                )}
                {incompletas.length > 0 && (
                  <p style={{ fontSize: 13, color: 'var(--warn-text)', marginTop: 6, marginBottom: 0 }}>
                    {incompletas.length} sin contrato completo — falta {incompletas[0].faltan.join(' y ')} en “{incompletas[0].l.slice(0, 48)}…”.
                  </p>
                )}

                {propuestas.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
                      Propuesta desde los datos ({propuestas.length} {propuestas.length === 1 ? 'línea' : 'líneas'} que no están en el texto)
                    </summary>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                      {propuestas.map((l, i) => (
                        <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                          <button type="button" className="btn" style={{ padding: '2px 10px', fontSize: 13, flexShrink: 0 }} onClick={() => agregarLinea(k, `${PREFIJO_GENERADO}${l}`)}>Añadir</button>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {accionable && <CompositorAccion k={k} etiqueta={accionable} onAdd={(linea) => agregarLinea(k, linea)} />}
              </div>
            )
          })}
        </div>

        {params.id !== 'demo' && (
          <PeticionesPanel
            centroId={params.id}
            anio={year}
            trimestre={quarter}
            onStatus={setStatus}
          />
        )}
        </>}
      </main>
    </div>
  )
}
