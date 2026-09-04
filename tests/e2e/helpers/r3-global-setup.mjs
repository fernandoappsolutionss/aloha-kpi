import { prepareR3Fixture } from './r3-fixture.mjs'

export default async function globalSetup() {
  const manifest = await prepareR3Fixture()
  console.log(`R3 fixture preparado: centros ${manifest.ids.centerOperations}/${manifest.ids.centerGrowth}, mes ${manifest.year}-${String(manifest.month).padStart(2, '0')}.`)
}
