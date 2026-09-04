import test from 'node:test'
import assert from 'node:assert/strict'
import { redactSensitive, createLogRedactor } from '../tests/e2e/helpers/redact-sensitive.mjs'

test('redacts bearer paths and password query tokens without removing diagnostics', () => {
  for (const input of ['/coach/secret1234567890', '/coach%2Fsecret1234567890', '%2Fcoach%2Fsecret1234567890', '/coach%252Fsecret1234567890', '/set-password?token=secret1234567890&mode=new', '/set-password%3Ftoken%3Dsecret1234567890%26mode%3Dnew']) {
    const result = redactSensitive(`Warning GET ${input} 200\n`)
    assert.ok(!result.includes('secret1234567890'))
    assert.match(result, /Warning GET/)
    assert.match(result, /200/)
  }
  assert.equal(redactSensitive('Warning: inert sidebar\nGET /centro/2/grupos 200\n'), 'Warning: inert sidebar\nGET /centro/2/grupos 200\n')
})
test('redaction survives every chunk boundary and UTF8 splits, including final partial line', () => {
  const source = Buffer.from('Aviso niño\nGET /coach%2Fsecret1234567890 200\nError /set-password?token=secret1234567890')
  for (let split = 0; split <= source.length; split++) {
    let output = ''
    const writer = createLogRedactor(chunk => { output += chunk })
    writer.write(source.subarray(0, split)); writer.write(source.subarray(split)); writer.end()
    assert.ok(!output.includes('secret1234567890'))
    assert.match(output, /Aviso niño\n/)
    assert.match(output, /Error/)
  }
})
