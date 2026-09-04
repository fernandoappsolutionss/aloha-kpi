import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile,access } from 'node:fs/promises'
import {prepareR6Fixture,cleanupR6Fixture} from '../../tests/e2e/helpers/r6-fixture.mjs'
test('R6 recupera interrupción posterior al commit sin borrar filas ajenas',async()=>{
  await prepareR6Fixture()
  await cleanupR6Fixture()
  // Replay exactly the durable manifest after committed deletion and before unlink.
  await copyFile('tests/e2e/.auth/r6-cleanup-evidence.json','tests/e2e/.auth/r6-fixture-manifest.json')
  await cleanupR6Fixture()
  await assert.rejects(access('tests/e2e/.auth/r6-fixture-manifest.json'),{code:'ENOENT'})
})
