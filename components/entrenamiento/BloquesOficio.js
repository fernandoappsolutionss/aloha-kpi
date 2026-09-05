'use client'
// Renderer del vocabulario cerrado de bloques del oficio: sub, p, lista, pasos,
// tabla y nota. Nada de dangerouslySetInnerHTML: el contenido viene de datos
// con texto plano (ningún campo puede contener '<', lo verifica el test) y el
// único énfasis permitido es **negrita**.
//
// No importa el catálogo ni el glosario: recibe por props solo los términos de
// SU módulo. Así la prosa de los 40 módulos nunca entra al bundle del cliente.
import { useState } from 'react'
import { marcarTerminos } from '../../lib/entrenamiento/oficio/progreso'

// "a **b** c" → [{b:false,t:'a '},{b:true,t:'b'},{b:false,t:' c'}]
function partirNegrita(texto) {
  const out = []
  const src = String(texto ?? '')
  let i = 0
  while (i < src.length) {
    const abre = src.indexOf('**', i)
    if (abre === -1) break
    const cierra = src.indexOf('**', abre + 2)
    if (cierra === -1) break
    if (abre > i) out.push({ b: false, t: src.slice(i, abre) })
    out.push({ b: true, t: src.slice(abre + 2, cierra) })
    i = cierra + 2
  }
  if (i < src.length || out.length === 0) out.push({ b: false, t: src.slice(i) })
  return out
}

function Termino({ texto, termino }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <span className="ofi-term">
      <button type="button" className="ofi-term__btn" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}
        title={`Qué significa "${termino.termino}"`}>
        {texto}
      </button>
      {abierto && (
        <span className="ofi-term__pop" role="note">
          <b>{termino.termino}</b>
          <span>{termino.que}</span>
          {termino.ejemplo && <span><i>Ejemplo:</i> {termino.ejemplo}</span>}
          {termino.noConfundir && <span><i>No lo confundas</i> {termino.noConfundir.replace(/\*\*/g, '')}</span>}
        </span>
      )}
    </span>
  )
}

// Texto con **negrita** y auto-enlace del glosario. `ya` es el Set compartido
// del módulo: cada término se marca UNA vez, en su primera aparición.
function renderRico({ texto, terminos, ya }) {
  const slugs = Object.keys(terminos || {})
  const piezas = []
  let k = 0
  for (const trozo of partirNegrita(texto)) {
    const segmentos = slugs.length ? marcarTerminos(trozo.t, terminos, slugs, ya) : [{ t: 'texto', texto: trozo.t }]
    for (const s of segmentos) {
      const nodo = s.t === 'termino' && terminos[s.slug]
        ? <Termino key={`k${k}`} texto={s.texto} termino={terminos[s.slug]} />
        : <span key={`k${k}`}>{s.texto}</span>
      piezas.push(trozo.b ? <b key={`b${k}`}>{nodo}</b> : nodo)
      k++
    }
  }
  return <>{piezas}</>
}

function Tabla({ bloque }) {
  const anchos = bloque.encabezados || []
  return (
    <div className="ofi-tabla">
      {bloque.titulo && <div className="label">{bloque.titulo}</div>}
      <div className="ofi-tabla__scroll">
        <table className="table">
          <thead><tr>{anchos.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>
            {(bloque.filas || []).map((fila, fi) => (
              <tr key={fi}>{fila.map((celda, ci) => <td key={ci} data-col={anchos[ci] || ''}>{celda}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BloquesOficio({ bloques, terminos }) {
  // Un solo Set por render: el auto-enlace no repite el mismo término párrafo
  // tras párrafo, solo la primera vez que aparece en el módulo.
  const ya = new Set()
  return (
    <div className="ofi-bloques">
      {(bloques || []).map((b, i) => {
        switch (b.t) {
          case 'sub':
            return <h3 key={i} className="ofi-sub">{b.texto}</h3>
          case 'p':
            return <p key={i} className="ofi-p">{renderRico({ texto: b.texto, terminos, ya })}</p>
          case 'lista':
            return <ul key={i} className="ofi-lista">{(b.items || []).map((it, j) => <li key={j}>{renderRico({ texto: it, terminos, ya })}</li>)}</ul>
          case 'pasos':
            return <ol key={i} className="ofi-pasos">{(b.items || []).map((it, j) => <li key={j}>{renderRico({ texto: it, terminos, ya })}</li>)}</ol>
          case 'tabla':
            return <Tabla key={i} bloque={b} />
          case 'nota':
            return (
              <div key={i} className={`ofi-nota ofi-nota--${b.tono}`}>
                <strong>{b.titulo}</strong>
                <p>{renderRico({ texto: b.texto, terminos, ya })}</p>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
