'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getNavigationContext } from '../app/actions/navigation'
import { resolveAccess } from './access-control.mjs'

// Un fallo transitorio (red, arranque en frío) no debe verse como «modo
// consulta»: se reintenta un par de veces con pausa antes de rendirse, y la
// pantalla puede pedir otro intento con reload().
const REINTENTOS_CONTEXTO = 2
const PAUSA_REINTENTO_MS = 800
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function cargarContexto({ cargar = getNavigationContext, esperar = pausa, reintentos = REINTENTOS_CONTEXTO, pausaMs = PAUSA_REINTENTO_MS } = {}) {
  for (let intento = 0; ; intento++) {
    try {
      return await cargar()
    } catch (cause) {
      if (intento >= reintentos) throw cause
      await esperar(pausaMs)
    }
  }
}

export function useCurrentAccess() {
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    cargarContexto()
      .then((data) => { if (mounted) { setContext(data); setError(null) } })
      .catch((cause) => { if (mounted) { setContext(null); setError(cause) } })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [intento])

  const reload = useCallback(() => setIntento((n) => n + 1), [])
  const access = useMemo(() => resolveAccess(context || {}), [context])
  return { ...access, context, loading, error, loaded: !loading, reload }
}

export default useCurrentAccess
