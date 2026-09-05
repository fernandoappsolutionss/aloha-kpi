'use client'
// La maniobra: el ejercicio práctico que cierra el módulo. No la aprueba el
// sistema — la firma el jefe entrenador (el jefe inmediato) después de
// tomársela. Por eso hay dos vistas: la del alumno (qué le van a pedir) y la de
// quien firma (los criterios observables, uno por uno, y el botón).
//
// LA FIRMA ES DEL MÓDULO, NO DE UNA MANIOBRA SUELTA. entrenamiento_progreso
// tiene un solo drill_firmado_at por (usuario, módulo), así que este panel
// recibe TODAS las maniobras del módulo y pone UN botón con los criterios de
// todas juntas. Pintar un botón por maniobra haría creer que se firman de a una
// cuando en realidad las cuatro reescriben la misma fila.
//
// Recibe todo por props: no importa el catálogo ni el glosario.
import { useState } from 'react'
import { firmarDrill, quitarFirmaDrill } from '../../app/actions/entrenamiento-oficio'

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

// Los criterios de las N maniobras, en una sola lista. Con más de una se dice
// de cuál viene cada criterio para que quien firma no pierda el hilo al tildar.
function criteriosDe(lista) {
  const varios = lista.length > 1
  return lista.flatMap((d, i) => (d.criterios || []).map((c) => ({
    texto: c,
    de: varios ? `Maniobra ${i + 1}` : '',
  })))
}

function Firma({ criterios, usuarioId, moduloId, firmadoAt, firmadoPor }) {
  const [tildados, setTildados] = useState(() => criterios.map(() => false))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [firma, setFirma] = useState({ at: firmadoAt || null, por: firmadoPor || null })
  const todos = tildados.length > 0 && tildados.every(Boolean)

  async function firmar() {
    setGuardando(true); setError('')
    try {
      const r = await firmarDrill(usuarioId, moduloId)
      if (r?.error) { setError(r.error); return }
      setFirma({ at: new Date().toISOString(), por: null })
    } catch { setError('No se pudo firmar. Recarga la página e intenta de nuevo.') } finally { setGuardando(false) }
  }
  async function quitar() {
    setGuardando(true); setError('')
    try {
      const r = await quitarFirmaDrill(usuarioId, moduloId)
      if (r?.error) { setError(r.error); return }
      setFirma({ at: null, por: null })
      setTildados(criterios.map(() => false))
    } catch { setError('No se pudo quitar la firma. Recarga la página e intenta de nuevo.') } finally { setGuardando(false) }
  }

  return (
    <div className="ofi-drill__firma">
      <div className="label">Criterios de aprobación · tíldalos al tomárselo</div>
      <ul className="ofi-drill__criterios">
        {criterios.map((c, i) => (
          <li key={i}>
            <label className="ent-opt">
              <input type="checkbox" checked={tildados[i] || false} disabled={Boolean(firma.at) || guardando}
                onChange={() => setTildados((t) => { const n = [...t]; n[i] = !n[i]; return n })} />
              <span>{c.de ? <><b>{c.de} · </b>{c.texto}</> : c.texto}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {firma.at ? (
        <div className="ofi-drill__acciones">
          <span className="ent-pill ent-pill--ok">✓ Firmado {fmt(firma.at)}{firma.por?.nombre ? ` · ${firma.por.nombre}` : ''}</span>
          <button className="btn" onClick={quitar} disabled={guardando}>Quitar firma</button>
        </div>
      ) : (
        <div className="ofi-drill__acciones">
          <button className="btn btn--primary" onClick={firmar} disabled={!todos || guardando}>
            {guardando ? 'Firmando…' : 'Firmar la maniobra'}
          </button>
          {!todos && <span className="h-sub" style={{ margin: 0 }}>Se firma cuando cumple los {criterios.length} criterios.</span>}
        </div>
      )}
    </div>
  )
}

function Cuerpo({ drill, numero }) {
  return (
    <div className="ofi-drill__uno">
      {numero > 0 && <div className="label" style={{ marginTop: 14 }}>Maniobra {numero} de la lista</div>}
      <h3 className="ofi-sub" style={{ marginTop: numero > 0 ? 4 : 0 }}>{drill.titulo}</h3>
      {drill.proposito && <p className="ofi-p"><b>Para qué:</b> {drill.proposito}</p>}
      {drill.gradiente && <div className="ofi-nota ofi-nota--ojo"><strong>Antes de esta maniobra</strong><p>{drill.gradiente}</p></div>}

      {(drill.masa || []).length > 0 && (
        <>
          <div className="label" style={{ marginTop: 14 }}>Ten esto a la vista</div>
          <ul className="ofi-lista">{drill.masa.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </>
      )}

      {(drill.pasos || []).length > 0 && (
        <>
          <div className="label" style={{ marginTop: 14 }}>Qué vas a hacer</div>
          <ol className="ofi-pasos">{drill.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
        </>
      )}

      {drill.errorTipico && <div className="ofi-nota ofi-nota--alerta"><strong>El error típico</strong><p>{drill.errorTipico}</p></div>}
    </div>
  )
}

export default function PanelDrill({ drills, indice, usuarioId, moduloId, moduloTitulo, firmadoAt, firmadoPor, puedoFirmar, estudiado, oficiales }) {
  const lista = (Array.isArray(drills) ? drills : [drills]).filter(Boolean)
  if (lista.length === 0) return null
  const varios = lista.length > 1
  const criterios = criteriosDe(lista)
  const quien = (oficiales || []).length > 0
    ? `${oficiales.map((o) => o.nombre).join(' o ')} (${oficiales[0].rolNombre || oficiales[0].rol})`
    : ''

  return (
    <section className="card ofi-drill" aria-labelledby={`drill-${indice}`}>
      <div className="label" style={{ marginBottom: 6 }}>
        {varios
          ? `${lista.length} maniobras · se toman las ${lista.length} y se firma una sola vez, porque la firma es del módulo`
          : 'Maniobra · te la toma y la firma tu jefe entrenador'}
      </div>
      <h2 id={`drill-${indice}`} style={{ fontSize: 20, margin: '0 0 8px' }}>
        {varios ? (moduloTitulo || 'Las maniobras de este módulo') : lista[0].titulo}
      </h2>

      {lista.map((d, i) => <Cuerpo key={i} drill={d} numero={varios ? i + 1 : 0} />)}

      {puedoFirmar ? (
        <Firma criterios={criterios} usuarioId={usuarioId} moduloId={moduloId} firmadoAt={firmadoAt} firmadoPor={firmadoPor} />
      ) : (
        <div className="ofi-drill__estado">
          {firmadoAt ? (
            <span className="ent-pill ent-pill--ok">✓ Maniobra firmada {fmt(firmadoAt)}{firmadoPor?.nombre ? ` por ${firmadoPor.nombre}` : ''}</span>
          ) : (
            <>
              <span className="ent-pill ent-pill--mid">Falta que te la firmen</span>
              <p className="h-sub" style={{ margin: '8px 0 0' }}>
                {estudiado
                  ? `Ya lo estudiaste. ${quien ? `Te la toma ${quien}` : 'Pídele a tu jefe entrenador que te la tome'}; los criterios de aprobación son los que va a tildar.`
                  : `Primero estudia el módulo y responde sus preguntas; después ${quien ? `pídele a ${quien}` : 'pídele a tu jefe entrenador'} que te tome la maniobra.`}
              </p>
              {!quien && (
                <p className="h-sub" style={{ margin: '4px 0 0' }}>
                  Todavía no tienes un jefe entrenador asignado en el sistema. Avísale a gerencia: sin él no puedes cerrar ningún módulo con maniobra.
                </p>
              )}
            </>
          )}
          <details className="ofi-drill__criterios-ver">
            <summary>Ver los criterios con los que te van a aprobar</summary>
            <ul className="ofi-lista">{criterios.map((c, i) => <li key={i}>{c.de ? `${c.de} · ${c.texto}` : c.texto}</li>)}</ul>
          </details>
        </div>
      )}
    </section>
  )
}
