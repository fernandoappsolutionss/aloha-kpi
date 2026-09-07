'use client'
import { useEffect, useMemo, useState } from 'react'
import { getNavigationContext } from '../app/actions/navigation'
import { resolveAccess } from './access-control.mjs'

export function useCurrentAccess() {
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    getNavigationContext()
      .then((data) => { if (mounted) { setContext(data); setError(null) } })
      .catch((cause) => { if (mounted) { setContext(null); setError(cause) } })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const access = useMemo(() => resolveAccess(context || {}), [context])
  return { ...access, context, loading, error, loaded: !loading }
}

export default useCurrentAccess
