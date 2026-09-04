import { notFound } from 'next/navigation'
import PrimitivesHarness from './PrimitivesHarness'

export const dynamic = 'force-dynamic'

export default function E2EPrimitivesPage() {
  const enabled = process.env.NODE_ENV === 'development'
    && process.env.E2E_UI_FIXTURES === '1'
    && process.env.E2E_DATABASE_CONFIRM === 'disposable'

  if (!enabled) notFound()
  return <PrimitivesHarness />
}
