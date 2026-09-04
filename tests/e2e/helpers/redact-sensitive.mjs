import { StringDecoder } from 'node:string_decoder'

// Local E2E diagnostics only. Decode URL words to catch escaped separators,
// then redact only sensitive routes; all unrelated logs remain untouched.
export function redactSensitive(value) {
  return String(value).replace(/\S+/g, word => {
    let decoded = word
    for (let i = 0; i < 5; i++) {
      try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next } catch { break }
    }
    if (!/\/coach\/|\/set-password[?]/i.test(decoded)) return word
    return decoded.replace(/(\/coach\/)[^\s?#"'<>\x1b]+/gi, '$1[REDACTED]')
      .replace(/(\/set-password\?[^\s]*?\btoken=)[^&\s"'<>\x1b]+/gi, '$1[REDACTED]')
  })
}
export function createLogRedactor(write) {
  const decoder = new StringDecoder('utf8')
  let pending = ''
  function flush(ending = false) {
    const boundary = ending ? pending.length : pending.lastIndexOf('\n') + 1
    if (boundary > 0) { write(redactSensitive(pending.slice(0, boundary))); pending = pending.slice(boundary) }
  }
  return {
    write(chunk) { pending += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); flush() },
    end() { pending += decoder.end(); flush(true) },
  }
}
