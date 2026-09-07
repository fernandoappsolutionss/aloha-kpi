'use client'
import { useEffect, useRef, useState } from 'react'

export default function TableScroller({ label, stickyFirstColumn = false, children }) {
  const caja = useRef(null)
  const lienzo = useRef(null)
  const [desborda, setDesborda] = useState(false)

  // ponytail: el aviso solo sirve si de verdad hay algo que deslizar. CSS no
  // tiene forma de preguntar "¿esto desborda?" (no existe @media (overflow)),
  // así que se mide: caja para los cambios de ancho de pantalla, lienzo para
  // cuando la tabla misma crece o encoge (filas que se abren, datos que llegan).
  useEffect(() => {
    const c = caja.current
    const l = lienzo.current
    if (!c || !l) return
    const medir = () => setDesborda(c.scrollWidth > c.clientWidth + 1)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(c)
    ro.observe(l)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={caja} className={`table-scroller${stickyFirstColumn ? ' table-scroller--sticky' : ''}`}
      role="region" aria-label={label} tabIndex={0} data-horizontal-scroll="">
      {desborda && <p className="table-scroller__hint">Desliza para comparar →</p>}
      <div ref={lienzo} className="table-scroller__viewport">{children}</div>
    </div>
  )
}
