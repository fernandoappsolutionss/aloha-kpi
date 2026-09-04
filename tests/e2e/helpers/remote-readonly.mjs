export const PUBLIC_CASES=Object.freeze([{id:'P01',path:'/'},{id:'P02',path:'/login'},{id:'P03',path:'/forgot-password'},{id:'P04',path:'/set-password'}])
export const ADMIN_PATHS=Object.freeze(['/dashboard','/dashboard/alertas','/dashboard/centros','/dashboard/entrenamiento','/dashboard/historial','/dashboard/metas','/dashboard/ranking','/dashboard/reporte','/dashboard/usuarios','/perfil'])
export const COORDINATOR_PATHS=Object.freeze(['/dashboard','/dashboard/usuarios'])
const credentialKeys=['E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD','E2E_COORDINATOR_EMAIL','E2E_COORDINATOR_PASSWORD']
export function allowedPath(path) {return [...PUBLIC_CASES.map(c=>c.path),...ADMIN_PATHS,'/e2e-primitives'].includes(path)}
export function remoteSettings(env=process.env) {
  for(const key of Object.keys(env)) if((key.startsWith('E2E_')&&!credentialKeys.includes(key))||/^(DATABASE_URL|USUARIOS_TEST_DATABASE_URL|PETICIONES_TEST_DATABASE_URL|SESSION_SECRET|CRM_SERVICE_TOKEN|BLOB_READ_WRITE_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET)$/.test(key)) throw new Error('Entorno remoto contiene variables prohibidas.')
  const url=new URL(env.RESPONSIVE_BASE_URL)
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Remoto exige origen HTTP(S) limpio.')
  const mode=env.REMOTE_READONLY_MODE||'public'
  if(!['public','authenticated'].includes(mode))throw new Error('Modo remoto inválido.')
  if(mode==='public')return {baseURL:url.origin,mode}
  if(credentialKeys.some(k=>!env[k]))throw new Error('Authenticated exige ambos actores completos.')
  return {baseURL:url.origin,mode,admin:{email:env.E2E_ADMIN_EMAIL,password:env.E2E_ADMIN_PASSWORD},coordinator:{email:env.E2E_COORDINATOR_EMAIL,password:env.E2E_COORDINATOR_PASSWORD}}
}
