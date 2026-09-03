import { rm } from 'node:fs/promises'

import { cleanupR3Fixture } from './r3-fixture.mjs'

export default async function globalTeardown() {
  try {
    const cleaned = await cleanupR3Fixture()
    console.log(`R3 fixture limpiado por PK: ${cleaned.fixtureIds.length} entidades, ${cleaned.snapshotIds.length} snapshots, ${cleaned.recommendationIds.length} recomendaciones y ${cleaned.receiptIds.length} recibos.`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  } finally {
    await rm('tests/e2e/.auth', { recursive: true, force: true })
  }
}
