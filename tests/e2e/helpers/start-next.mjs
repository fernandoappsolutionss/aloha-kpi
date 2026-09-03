import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { buildNextEnvironment } from './next-server-env.mjs'

const profile = process.env.E2E_NEXT_PROFILE
const port = Number(process.env.E2E_NEXT_PORT)
if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error('E2E_NEXT_PORT debe ser un puerto no privilegiado válido.')
}

const child = spawn(process.execPath, [
  resolve(process.cwd(), 'node_modules/next/dist/bin/next'),
  'dev',
  '--hostname',
  '127.0.0.1',
  '--port',
  String(port),
], {
  cwd: process.cwd(),
  env: buildNextEnvironment(process.env, profile),
  shell: false,
  stdio: 'inherit',
})

const forward = (signal) => {
  if (!child.killed) child.kill(signal)
}
const forwardSigint = () => forward('SIGINT')
const forwardSigterm = () => forward('SIGTERM')
process.once('SIGINT', forwardSigint)
process.once('SIGTERM', forwardSigterm)

child.once('error', (error) => {
  throw error
})
child.once('exit', (code) => {
  process.removeListener('SIGINT', forwardSigint)
  process.removeListener('SIGTERM', forwardSigterm)
  process.exitCode = code ?? 1
})
