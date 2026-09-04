// Shared observable criteria for CLI and manual CUA verification; no submits.
export const PUBLIC_CASES=Object.freeze([
 {id:'P01',path:'/',finalPath:'/login',state:'ready',heading:'Bienvenido de nuevo',fields:['email','password'],submit:'Ingresar al sistema'},
 {id:'P02',path:'/login',finalPath:'/login',state:'ready',heading:'Bienvenido de nuevo',fields:['email','password'],submit:'Ingresar al sistema'},
 {id:'P03',path:'/forgot-password',finalPath:'/forgot-password',state:'ready',heading:'¿Olvidaste tu contraseña?',fields:['email'],submit:'Enviar enlace',returnPath:'/login'},
 {id:'P04',path:'/set-password',finalPath:'/set-password',state:'error',heading:'Enlace no válido',fields:[],forbidForm:true,returnPath:'/login'},
])

// Executed in the browser by the smoke and its local negative tests.
export function publicPageIsReady({criteria,origin}) {
 if(location.origin!==origin||location.pathname!==criteria.finalPath)return false
 const mains=document.querySelectorAll('main')
 if(mains.length!==1)return false
 const main=mains[0]
 const visible=node=>Boolean(node&&node.getClientRects().length&&getComputedStyle(node).visibility==='visible')
 if(!visible(main)||main.dataset.pageState!==criteria.state)return false
 if(![...main.querySelectorAll('h1,h2')].some(node=>visible(node)&&node.textContent.trim()===criteria.heading))return false
 if(criteria.fields.some(type=>!visible(main.querySelector(`form input[type="${type}"]`))))return false
 if(criteria.submit&&!([...main.querySelectorAll('form button[type="submit"]')].some(node=>visible(node)&&!node.disabled&&node.textContent.trim()===criteria.submit)))return false
 if(criteria.forbidForm&&(main.querySelector('form')||main.querySelector('input[type="password"]')))return false
 if(criteria.returnPath&&!([...main.querySelectorAll('a[href]')].some(node=>visible(node)&&node.getAttribute('href')===criteria.returnPath&&/Volver al inicio de sesión/.test(node.textContent))))return false
 return true
}
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
