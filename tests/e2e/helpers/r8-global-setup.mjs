import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { prepareR8Fixture } from './r8-fixture.mjs'
export default async function setup() {
  await prepareR8Fixture()
  // Native ESM, like the integration tests; Playwright treats .js as CJS.
  await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', "import('./tests/e2e/helpers/r8-fixture.mjs').then(m=>m.prepareR8Receipt())"], {env:process.env})
}
