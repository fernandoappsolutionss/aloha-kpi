import test from 'node:test'
import assert from 'node:assert/strict'
import {playwrightEnvironment} from '../tests/e2e/run-playwright.mjs'
test('normaliza color antes del runner sin silenciar warnings ni mutar el padre',()=>{
 const input={NO_COLOR:'1',FORCE_COLOR:'1',OTHER:'keep'}
 const actual=playwrightEnvironment(input)
 assert.equal(actual.NO_COLOR,undefined);assert.equal(actual.FORCE_COLOR,'0');assert.equal(actual.OTHER,'keep')
 assert.equal(actual.NODE_NO_WARNINGS,undefined);assert.equal(input.NO_COLOR,'1')
})
