'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createDialogLifetime } from './dialog-lifetime.mjs'

// Each mounted form owns a scope. A pending completion retains its old scope,
// so unmounting/replacing it cannot close a later form owned by the same page.
export function useDialogCallback(callback, instanceKey) {
  const scope = useMemo(() => createDialogLifetime(), [instanceKey])
  useEffect(() => {
    scope.activate()
    return () => scope.dispose()
  }, [scope])
  return scope.guard(callback)
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const modalLayers = []
const inertSnapshots = new Map()
let bodyOverflowSnapshot = null

function restoreInert(element) {
  const snapshot = inertSnapshots.get(element)
  if (!snapshot) return
  if (snapshot.present) element.setAttribute('inert', snapshot.value)
  else element.removeAttribute('inert')
}

function syncModalEnvironment() {
  const top = modalLayers.at(-1)
  for (const child of document.body.children) {
    if (!inertSnapshots.has(child)) {
      inertSnapshots.set(child, { present: child.hasAttribute('inert'), value: child.getAttribute('inert') || '' })
    }
    if (child === top) restoreInert(child)
    else child.setAttribute('inert', '')
  }
}

function acquireModalEnvironment(layer) {
  if (modalLayers.length === 0) {
    bodyOverflowSnapshot = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  modalLayers.push(layer)
  syncModalEnvironment()

  return () => {
    const index = modalLayers.lastIndexOf(layer)
    if (index >= 0) modalLayers.splice(index, 1)
    if (modalLayers.length > 0) {
      syncModalEnvironment()
      return
    }
    for (const [element] of inertSnapshots) restoreInert(element)
    inertSnapshots.clear()
    document.body.style.overflow = bodyOverflowSnapshot ?? ''
    bodyOverflowSnapshot = null
  }
}

function visibleFocusables(surface) {
  if (!surface) return []
  return [...surface.querySelectorAll(FOCUSABLE)].filter((node) => (
    node.isConnected
    && node.getClientRects().length > 0
    && !node.closest('[hidden],[aria-hidden="true"],[inert]')
  ))
}

export function useModalLayer({ open, onClose, closeDisabled = false, initialFocusRef, returnFocusRef }) {
  const layerRef = useRef(null)
  const surfaceRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const closeDisabledRef = useRef(closeDisabled)
  const returnTargetRef = useRef(returnFocusRef)
  onCloseRef.current = onClose
  closeDisabledRef.current = closeDisabled
  returnTargetRef.current = returnFocusRef

  useEffect(() => {
    if (!open || !layerRef.current || !surfaceRef.current) return undefined
    const layer = layerRef.current
    const surface = surfaceRef.current
    previousFocusRef.current = document.activeElement
    const releaseEnvironment = acquireModalEnvironment(layer)
    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current || visibleFocusables(surface)[0] || surface
      target.focus()
    })
    const onKeyDown = (event) => {
      if (modalLayers.at(-1) !== layer || event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!closeDisabledRef.current) onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = visibleFocusables(surface)
      if (nodes.length === 0) {
        event.preventDefault()
        surface.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const outsideTabOrder = !nodes.includes(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || outsideTabOrder)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || outsideTabOrder)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      releaseEnvironment()
      const target = returnTargetRef.current?.current
      if (target?.isConnected && target.getClientRects().length > 0
        && !target.closest('[hidden],[aria-hidden="true"],[inert]')
        && !target.matches(':disabled') && getComputedStyle(target).visibility === 'visible') {
        target.focus()
        return
      }
      const previous = previousFocusRef.current
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus()
    }
  }, [open, initialFocusRef])

  const onBackdropPointerDown = (event) => {
    if (event.target !== event.currentTarget || modalLayers.at(-1) !== layerRef.current) return
    event.preventDefault()
    event.stopPropagation()
    if (!closeDisabledRef.current) onCloseRef.current?.()
  }

  return { layerRef, surfaceRef, onBackdropPointerDown }
}

export function ModalPortal({ children }) {
  return typeof document === 'undefined' ? null : createPortal(children, document.body)
}

export default function Dialog({
  open,
  title,
  description,
  onClose,
  initialFocusRef,
  returnFocusRef,
  footer,
  width = 560,
  closeDisabled = false,
  className = '',
  backdropClassName = '',
  children,
}) {
  const titleId = `${useId()}-title`
  const descriptionId = `${useId()}-description`
  const { layerRef, surfaceRef, onBackdropPointerDown } = useModalLayer({
    open,
    onClose,
    closeDisabled,
    initialFocusRef,
    returnFocusRef,
  })

  if (!open) return null

  return (
    <ModalPortal>
      <div ref={layerRef} className={`dialog-backdrop${backdropClassName ? ` ${backdropClassName}` : ''}`} data-modal-layer onPointerDown={onBackdropPointerDown}>
        <section
          ref={surfaceRef}
          className={`dialog${className ? ` ${className}` : ''}`}
          style={{ '--dialog-width': `${width}px` }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          aria-busy={closeDisabled || undefined}
          tabIndex={-1}
        >
          <header className="dialog__header">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && <p id={descriptionId}>{description}</p>}
            </div>
            <button
              type="button"
              className="dialog__close"
              onClick={onClose}
              aria-label="Cerrar diálogo"
              disabled={closeDisabled}
            >
              ×
            </button>
          </header>
          <div className="dialog__body" tabIndex={0}>{children}</div>
          {footer && <footer className="dialog__footer">{footer}</footer>}
        </section>
      </div>
    </ModalPortal>
  )
}
