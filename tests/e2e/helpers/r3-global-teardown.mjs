import { rm } from 'node:fs/promises'

import { cleanupR3Fixture } from './r3-fixture.mjs'

export default async function globalTeardown() {
  try {
    const cleaned = await cleanupR3Fixture()
    console.log('R3 fixture limpiado por PK: '+JSON.stringify({fixtureIds:cleaned.fixtureIds,snapshotIds:cleaned.snapshotIds,recommendationIds:cleaned.recommendationIds,receiptIds:cleaned.receiptIds}))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  } finally {
    await rm('tests/e2e/.auth', { recursive: true, force: true })
  }
}
