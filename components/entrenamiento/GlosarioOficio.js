'use client'
// BARRERA 3 · O · OBSERVAR — LA PALABRA SIN ACLARAR. El glosario completo, buscable y agrupado
// por letra. Recibe los términos por props desde la página (Server Component):
// no importa lib/entrenamiento/oficio/glosario, así el archivo no entra al
// bundle de ninguna otra ruta.
import { useMemo, useState } from 'react'

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function GlosarioOficio({ terminos }) {
  const [q, setQ] = useState('')

  const grupos = useMemo(() => {
    const busca = norm(q).trim()
    const filtrados = busca
      ? terminos.filter((t) => norm(t.termino).includes(busca) || norm(t.que).includes(busca) || (t.variantes || []).some((v) => norm(v).includes(busca)))
      : terminos
    const porLetra = new Map()
    for (const t of filtrados) {
      const letra = (norm(t.termino)[0] || '#').toUpperCase()
      if (!porLetra.has(letra)) porLetra.set(letra, [])
      porLetra.get(letra).push(t)
    }
    return [...porLetra.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [q, terminos])

  const total = grupos.reduce((n, [, xs]) => n + xs.length, 0)

  return (
    <>
      <div className="ofi-glosario__buscador">
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Busca una palabra: saldo, paz y salvo, deserción…" aria-label="Buscar en el glosario" />
        <span className="h-sub" style={{ margin: 0 }} aria-live="polite">{total} de {terminos.length} términos</span>
      </div>

      {total === 0 && (
        <div className="card" style={{ padding: 24 }}>
          <p className="h-sub" style={{ margin: 0 }}>Ninguna palabra coincide. Si la palabra que no entiendes no está aquí, anótala y pásasela a tu jefe entrenador: el glosario se completa con lo que de verdad traba a la gente.</p>
        </div>
      )}

      {grupos.map(([letra, xs]) => (
        <section key={letra} className="ofi-glosario__grupo" aria-labelledby={`letra-${letra}`}>
          <h2 id={`letra-${letra}`} className="ofi-glosario__letra">{letra}</h2>
          <dl className="ofi-glosario__lista">
            {xs.map((t) => (
              <div key={t.slug} className="ofi-glosario__item" id={`t-${t.slug}`}>
                <dt>{t.termino}</dt>
                <dd>
                  <p>{t.que}</p>
                  {t.ejemplo && <p className="h-sub"><i>Ejemplo:</i> {t.ejemplo}</p>}
                  {t.noConfundir && <p className="h-sub"><i>No lo confundas</i> {String(t.noConfundir).replace(/\*\*/g, '')}</p>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  )
}
