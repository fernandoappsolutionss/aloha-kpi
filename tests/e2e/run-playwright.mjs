import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
export function playwrightEnvironment(source) {
  const env={...source,FORCE_COLOR:'0'}
  delete env.NO_COLOR
  return env
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]||'')).href){
  const child=spawn(process.execPath,[resolve('node_modules/@playwright/test/cli.js'),...process.argv.slice(2)],{stdio:'inherit',env:playwrightEnvironment(process.env)})
  child.on('exit',(code,signal)=>{if(signal)process.kill(process.pid,signal);else process.exitCode=code??1})
  child.on('error',()=>{console.error('No se pudo iniciar Playwright.');process.exitCode=1})
}
