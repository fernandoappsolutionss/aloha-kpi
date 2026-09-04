import PrivateReporter from './r9-reporter.mjs'
export default class R10Reporter extends PrivateReporter {
  onBegin(config,suite) {console.log('Casos locales enumerados: '+suite.allTests().length)}
  onTestBegin(test) {console.log('Inicio: '+test.parent.project().name+': '+test.title)}
  onError(error) { this.err.write((error.stack||error.message||'Fallo R10')+'\n') }
  onTestEnd(test,result) { console.log(`${result.status}: ${test.parent.project().name}: ${test.title}`); for(const error of result.errors||[]) this.err.write((error.stack||error.message||'Fallo local')+'\n') }
  onEnd(result) { this.out.end();this.err.end();console.log(`Gate local: ${result.status}`) }
}
