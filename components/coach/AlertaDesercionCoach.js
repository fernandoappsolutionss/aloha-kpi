'use client'
// "DÓNDE SE ESTÁ YENDO LA GENTE" — tarjeta del Resumen del centro.
//
// La comparación se consulta también cuando no hay alertas. Los candados
// conservan su referencia local; la global ponderada es una segunda medida.
//
// Lo que se ve nunca es un color pelado: nombre, cuántos retiros, sobre cuántos
// niños, contra qué tasa del centro y en qué periodo. Y los coaches que NO
// disparan alerta quedan listados en el plegable, para que nadie sospeche que
// hay una lista secreta.
import { useEffect, useState } from 'react'
import { getDesercionPorCoach } from '../../app/actions/coach'
import { es1 } from '../../lib/desercion-coach.mjs'
import DetalleCoachActual from './DetalleCoachActual'
import ComparacionDesercion from './ComparacionDesercion'

const tituloSeccion = {
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  margin: 0,
}

const ETIQUETA_ESTADO = {
  seguimiento: 'Por encima del promedio',
  en_rango: 'En el rango del centro',
  sin_muestra: 'Muestra corta · no se evalúa',
}

function Cifra({ l, v, fuerte }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="label" style={{ fontSize: 13 }}>{l}</div>
      <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 3, color: fuerte ? 'var(--bad-text)' : 'var(--text)' }}>{v}</div>
    </div>
  )
}

function Fila({ c, centroId, datos }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <li className="coach-resumen-fila">
      <button type="button" className="recurso-toggle coach-resumen-fila__boton" aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}>
        <span><span aria-hidden="true">{abierto ? '▾' : '▸'}</span> {c.nombre}</span>
        <span className="num">{c.expuestos === 0 ? 'sin niños a cargo' : `${c.bajasReales} de ${c.expuestos} · ${c.pctTexto}`}</span>
        <span className="label">{c.expuestos === 0 ? 'No se evalúa' : (ETIQUETA_ESTADO[c.estado] || '')}</span>
      </button>
      {abierto && <><ComparacionDesercion coach={c} centro={datos.referenciaCentro} global={datos.referenciaGlobal} periodo={datos.periodo} /><DetalleCoachActual centroId={centroId} coachId={c.coachId} /></>}
    </li>
  )
}

export default function AlertaDesercionCoach({ centroId, anio, trimestre }) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [coachAbierto, setCoachAbierto] = useState(null)

  useEffect(() => {
    let vivo = true
    setError('')
    setDatos(null)
    getDesercionPorCoach(centroId, anio, trimestre)
      .then((res) => { if (vivo) setDatos(res) })
      .catch((causa) => {
        console.error('[AlertaDesercionCoach]', causa)
        if (vivo) setError('No se pudo calcular la deserción por coach de este trimestre.')
      })
    return () => { vivo = false }
  }, [centroId, anio, trimestre])

  if (error) {
    return (
      <p role="status" style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-dim)' }}>{error}</p>
    )
  }
  if (!datos) return null

  const resto = datos.coaches.filter((c) => c.estado !== 'alerta')
  const n = datos.alertas.length

  return (
    <section
      className="card"
      aria-labelledby="desercion-coach-titulo"
      style={{ padding: 20, marginBottom: 20, borderLeft: `3px solid var(${n ? '--bad' : '--aloha-petroleo'})` }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <h3 id="desercion-coach-titulo" style={tituloSeccion}>Deserción por coach</h3>
        <span className={`pill${n ? ' pill--bad' : ''}`}>
          <span className="dot" />{n ? `${n} ${n === 1 ? 'coach con alerta' : 'coaches con alerta'}` : 'Sin alertas frente al centro'}
        </span>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Retiros de {datos.periodo}, sin contar graduados. Centro: <b className="num">{datos.referenciaCentro.tasa == null ? 'sin base' : `${es1(datos.referenciaCentro.tasa * 100)}%`}</b> ({datos.referenciaCentro.bajasReales} bajas
        sobre {datos.referenciaCentro.expuestos} niños de base). Global: <b className="num">{datos.referenciaGlobal.tasa == null ? 'sin base' : `${es1(datos.referenciaGlobal.tasa * 100)}%`}</b> de {datos.referenciaGlobal.centros.length} centros registrados.
        Pulsa un coach para ver ambas diferencias y la base de cálculo.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {datos.alertas.map((c) => (
          <div
            key={c.coachId ?? c.nombre}
            style={{ background: 'var(--bad-bg)', border: '1px solid var(--bad-line)', borderRadius: 'var(--r-sm)', padding: '13px 15px' }}
          >
            <button type="button" className="recurso-toggle" aria-expanded={coachAbierto === c.coachId}
              onClick={() => setCoachAbierto(coachAbierto === c.coachId ? null : c.coachId)}><span aria-hidden="true">{coachAbierto === c.coachId ? '▾' : '▸'}</span> {c.titular}<small>Ver promedio, grupos y horario actual</small></button>
            <p style={{ margin: '5px 0 12px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45 }}>{c.detalle}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12 }}>
              <Cifra l="Niños a cargo" v={c.expuestos} />
              <Cifra l="Bajas reales" v={c.bajasReales} />
              <Cifra l="Su tasa" v={c.pctTexto} fuerte />
              <Cifra l="Tasa del centro" v={`${es1(datos.pctCentro)}%`} />
              <Cifra l="Tasa global" v={datos.referenciaGlobal.tasa == null ? 'Sin base' : `${es1(datos.referenciaGlobal.tasa * 100)}%`} />
              <Cifra l="Niños de más" v={`+${es1(c.exceso)}`} fuerte />
            </div>
            {coachAbierto === c.coachId && <><ComparacionDesercion coach={c} centro={datos.referenciaCentro} global={datos.referenciaGlobal} periodo={datos.periodo} /><DetalleCoachActual centroId={centroId} coachId={c.coachId} /></>}
          </div>
        ))}
      </div>

      {resto.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-dim)' }}>
            Ver {n ? 'los otros' : 'los'} {resto.length} {resto.length === 1 ? 'coach' : 'coaches'} del centro
          </summary>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
            {resto.map((c) => <Fila key={c.coachId ?? c.nombre} c={c} centroId={centroId} datos={datos} />)}
          </ul>
        </details>
      )}
      {datos.coaches.length === 0 && <p>No hay coaches activos registrados para consultar en este centro.</p>}

      {datos.sinCoach > 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
          {datos.sinCoach} {datos.sinCoach === 1 ? 'baja del trimestre no tiene' : 'bajas del trimestre no tienen'} coach
          identificable (grupo de origen vacío o coach dado de baja): no se reparten entre nadie.
        </p>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>
        Es un dato para conversar y corregir, no una sanción. Con menos de 15 niños a cargo no se
        evalúa a nadie: un solo retiro movería el porcentaje demasiado.
      </p>
    </section>
  )
}
