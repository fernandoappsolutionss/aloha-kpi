'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  acknowledgeGrowthBriefing,
  getGrowthBriefing,
  markGrowthBriefingShown,
  snoozeGrowthBriefing,
} from '../../app/actions/growth'
import { formatGrowthPeriod } from '../../lib/growth/presenter.mjs'
import Dialog, { useDialogCallback } from '../Dialog'

const requestCache = new Map()

const loadBriefing = (centroId) => {
  const key = String(centroId)
  if (!requestCache.has(key)) {
    requestCache.set(key, getGrowthBriefing(centroId).finally(() => requestCache.delete(key)))
  }
  return requestCache.get(key)
}

export default function GrowthBriefing({ centroId }) {
  const router = useRouter()
  const titleRef = useRef(null)
  const [briefing, setBriefing] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const finish = useDialogCallback((command) => {
    requestCache.delete(String(centroId))
    setBriefing(null)
    if (command === 'plan') router.push(`/centro/${centroId}/ruta-nivel`)
  }, centroId)
  const fail = useDialogCallback(() => setError('No se pudo guardar tu decisión. Intenta nuevamente.'), centroId)
  const releaseBusy = useDialogCallback(() => setBusy(''), centroId)

  useEffect(() => {
    // Guarda: con un recorrido del entrenamiento activo (?tour=) no abrimos la
    // Guía semanal encima (bloquea scroll y atrapa el foco) ni consumimos el recibo.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tour')) return undefined
    let active = true
    loadBriefing(centroId)
      .then((result) => {
        if (active && result.shouldShow) {
          setBriefing(result.briefing)
          markGrowthBriefingShown(centroId).catch((cause) => {
            console.error('[GrowthBriefing shown]', cause)
          })
        }
      })
      .catch((cause) => console.error('[GrowthBriefing]', cause))
    return () => { active = false }
  }, [centroId])

  if (!briefing) return null

  const next = briefing.nextLevel
  const month = briefing.nextMonth
  const recommendation = briefing.topRecommendation

  const act = async (command) => {
    if (busy) return
    setBusy(command)
    setError('')
    try {
      if (command === 'snooze') await snoozeGrowthBriefing(centroId)
      else await acknowledgeGrowthBriefing(centroId)
      finish(command)
    } catch (cause) {
      console.error('[GrowthBriefing action]', cause)
      fail()
    } finally {
      releaseBusy()
    }
  }

  const title = next ? `Faltarían ${next.gap} niños al cierre para el Nivel ${next.level}` : 'El reto ahora es sostener el Nivel 5'
  const summary = briefing.confidence.level === 'low'
    ? 'Primero completa la información operativa para recuperar una fecha de proyección confiable.'
    : 'Esta semana ejecuta la acción prioritaria y comprueba su resultado con los próximos datos.'
  const neutralClose = () => {
    if (!busy) setBriefing(null)
  }

  return (
    <Dialog
      open
      title={<span ref={titleRef} tabIndex={-1}>{title}</span>}
      description={summary}
      onClose={neutralClose}
      closeDisabled={Boolean(busy)}
      initialFocusRef={titleRef}
      width={620}
      className="growth-briefing"
      backdropClassName="growth-briefing-backdrop"
      footer={(
        <>
          <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => act('snooze')}>
            {busy === 'snooze' ? 'Guardando...' : 'Recordar mañana'}
          </button>
          <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => act('acknowledge')}>
            Entendido
          </button>
          <button type="button" className="btn btn--primary" disabled={Boolean(busy)} onClick={() => act('plan')}>
            {busy === 'plan' ? 'Abriendo...' : 'Ver plan'}
          </button>
        </>
      )}
    >
        <div className="growth-briefing__accent" />
        <div className="growth-briefing__body">
          <div className="label">Guía semanal · {briefing.center.nombre}</div>

          {month && (
            <div className="growth-briefing__equation">
              <span><small>Inicio</small><strong className="num">{month.startChildren}</strong></span>
              <i>−</i>
              <span><small>Salidas</small><strong className="num">{month.withdrawals}</strong></span>
              <i>+</i>
              <span><small>Inicios y reincorporaciones</small><strong className="num">{Number(month.newActives || 0) + Number(month.reincorporations || 0)}</strong></span>
              <i>=</i>
              <span><small>{formatGrowthPeriod(month.period)}</small><strong className="num">{month.endChildren}</strong></span>
            </div>
          )}

          <div className="growth-briefing__focus">
            <div>
              <span className="label">Acción prioritaria</span>
              <strong>{recommendation?.title || 'Mantener la disciplina operativa'}</strong>
              <p>{recommendation?.action || 'Revisa semanalmente captación, retención y capacidad.'}</p>
            </div>
            <div className="growth-briefing__target">
              <span className="label">Meta comercial semanal</span>
              <strong className="num">
                {briefing.weeklyInvitations == null ? '—' : briefing.weeklyInvitations}
              </strong>
              <small>invitaciones</small>
            </div>
          </div>

          {error && <div className="alert alert--error">{error}</div>}
        </div>
    </Dialog>
  )
}
