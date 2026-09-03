'use client'
import { useEffect, useId, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Dialog({ open, title, description, onClose, initialFocusRef, footer, width = 560, children }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = `${useId()}-title`
  const descriptionId = `${useId()}-description`

  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)]
    const frame = requestAnimationFrame(() => {
      ;(initialFocusRef?.current || focusables()[0] || dialog).focus()
    })
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      if (nodes.length === 0) { event.preventDefault(); dialog.focus(); return }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [open, initialFocusRef])

  const onBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  return open ? (
    <div className="dialog-backdrop" onPointerDown={onBackdrop}>
      <section ref={dialogRef} className="dialog" style={{ '--dialog-width': `${width}px` }}
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
        <header className="dialog__header">
          <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Cerrar diálogo">×</button>
        </header>
        <div className="dialog__body">{children}</div>
        {footer && <footer className="dialog__footer">{footer}</footer>}
      </section>
    </div>
  ) : null
}
