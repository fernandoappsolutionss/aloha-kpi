export default class RemoteReporter {
  onBegin(config,suite){console.log(`Modo: ${config.projects[0].name}; casos: ${suite.allTests().length}`)}
  onTestEnd(test,result){console.log(`${test.title}: ${result.status}`)}
  onError(){console.error('Fallo de configuración o ejecución remota; sin datos persistidos.')}
  onEnd(result){console.log(`Resultado: ${result.status}`)}
}
