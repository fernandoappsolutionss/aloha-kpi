'use client'
import { useEffect, useRef, useState } from 'react'

export default function MeasuredChart({ label, minHeight = 280, children }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const measure = () => setWidth(Math.max(0, Math.round(node.getBoundingClientRect().width)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="measured-chart" role="img" aria-label={label}
    style={{ minHeight }}>
    {width > 0 ? children({ width, height: minHeight }) : null}
  </div>
}
