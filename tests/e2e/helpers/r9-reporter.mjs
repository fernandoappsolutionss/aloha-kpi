import { redactSensitive, createLogRedactor } from './redact-sensitive.mjs'
export default class PrivateReporter {
  constructor() {
    this.out=createLogRedactor(chunk=>process.stdout.write(chunk))
    this.err=createLogRedactor(chunk=>process.stderr.write(chunk))
  }
  onStdOut(chunk) { this.out.write(chunk) }
  onStdErr(chunk) { this.err.write(chunk) }
  onTestEnd(test,result) {
    console.log(`${result.status}: ${test.title}`)
    for(const error of result.errors || []) console.error(redactSensitive(error.stack || error.message || 'Fallo E2E local'))
  }
  onError(error) { console.error(redactSensitive(error.message || 'Error gate local')) }
  onEnd(result) { this.out.end();this.err.end();console.log(`Gate R9: ${result.status}`) }
}
