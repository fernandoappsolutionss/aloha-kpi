'use client'
import { useMemo, useState } from 'react'
import { guardarConcepto } from '../../app/actions/entrenamiento-oficio'
import { useGuia } from './GuiaModulo'

const MENSAJE_PEGAR = 'Aquí no se pega: dilo con tus palabras, aunque salga torcido'

function fichaLimpia(s) {
  return String(s || '').replace(/\*\*/g, '')
}

export default function ConceptosOficio({ moduloId, terminos, iniciales }) {
  const guia = useGuia()
  const lista = Array.isArray(terminos) ? terminos : []
  const [valores, setValores] = useState(() => {
    const out = {}
    for (const t of lista) out[t.slug] = iniciales?.[t.slug] || ''
    return out
  })
  const [confirmados, setConfirmados] = useState(() => {
    const out = {}
    for (const t of lista) if (iniciales?.[t.slug]) out[t.slug] = iniciales[t.slug]
    return out
  })
  const [estado, setEstado] = useState({})
  const guardados = useMemo(
    () => lista.filter((t) => confirmados[t.slug]?.trim() && valores[t.slug] === confirmados[t.slug]).length,
    [confirmados, lista, valores],
  )

  function editar(slug, value) {
    setValores((v) => ({ ...v, [slug]: value }))
    setEstado((s) => ({ ...s, [slug]: {} }))
  }

  function bloquearPegado(e) {
    e.preventDefault()
    const slug = e.currentTarget?.dataset?.slug
    if (slug) setEstado((s) => ({ ...s, [slug]: { error: MENSAJE_PEGAR } }))
  }

  function beforeInput(e) {
    if (['insertFromPaste', 'insertFromDrop', 'insertFromYank'].includes(e.nativeEvent?.inputType)) bloquearPegado(e)
  }

  async function guardar(slug) {
    setEstado((s) => ({ ...s, [slug]: { guardando: true } }))
    try {
      const r = await guardarConcepto(moduloId, slug, valores[slug] || '')
      if (r?.error) {
        setEstado((s) => ({ ...s, [slug]: { error: r.error } }))
        return
      }
      setValores((v) => ({ ...v, [slug]: r.texto || '' }))
      setConfirmados((v) => ({ ...v, [slug]: r.texto || '' }))
      setEstado((s) => ({ ...s, [slug]: { ok: true, faltan: r.faltan } }))
      if (r.completo) guia?.completar('palabras', { durable: true })
    } catch {
      setEstado((s) => ({ ...s, [slug]: { error: 'No se pudo guardar. Recarga la página e intenta de nuevo.' } }))
    }
  }

  if (lista.length === 0) return null

  return (
    <section className="ofi-conceptos" aria-labelledby="ofi-conceptos-titulo">
      <div className="label" style={{ marginBottom: 6 }}>Las palabras</div>
      <h2 id="ofi-conceptos-titulo">Explícalas con tus propias palabras</h2>
      <p className="h-sub">
        Guarda cada concepto con una frase tuya. No tiene que sonar bonito: tiene que probar que lo entendiste.
      </p>
      <div className="ofi-conceptos__grid">
        {lista.map((t) => {
          const st = estado[t.slug] || {}
          return (
            <article key={t.slug} className="ofi-concepto">
              <h3>{t.termino}</h3>
              <p>{t.que}</p>
              {t.ejemplo && <p className="h-sub"><b>Ejemplo:</b> {t.ejemplo}</p>}
              {t.noConfundir && <p className="h-sub"><b>No lo confundas:</b> {fichaLimpia(t.noConfundir)}</p>}
              <label>
                <span className="sr-only">Explica {t.termino} con tus palabras</span>
                <textarea
                  data-slug={t.slug}
                  value={valores[t.slug] || ''}
                  autoComplete="off"
                  spellCheck
                  maxLength={700}
                  rows={3}
                  onChange={(e) => editar(t.slug, e.target.value)}
                  onPaste={bloquearPegado}
                  onDrop={bloquearPegado}
                  onBeforeInput={beforeInput}
                />
              </label>
              {st.error && <div className="alert alert--error" role="alert">{st.error}</div>}
              {st.ok && (
                <p className="ent-pill ent-pill--ok" aria-live="polite">
                  Guardado{Number.isInteger(st.faltan) && st.faltan > 0 ? ` · faltan ${st.faltan}` : ''}
                </p>
              )}
              <button type="button" className="btn btn--primary" onClick={() => guardar(t.slug)} disabled={st.guardando}>
                {st.guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </article>
          )
        })}
      </div>
      <p className="h-sub" aria-live="polite">{guardados} de {lista.length} conceptos guardados.</p>
    </section>
  )
}
