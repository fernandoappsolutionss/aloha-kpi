// Vista de QA: página real, datos ficticios y acciones de solo lectura simuladas.
// No abre navegador. Detener con Ctrl+C después de cerrar las pestañas propias.
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
import { build } from 'esbuild'
const root=resolve('.'), out=resolve('.scratch/historial-hca')
await mkdir(out,{recursive:true})
const rows=Array.from({length:12},(_,i)=>({year:i<2?2025:2026,month:(i+10)%12+1,ninos_inicio_mes:70+i,ninos_final_mes:[74,70,80,95,90,90,85,100,97,108,116,104][i],nuevos_activos_mes:i===2?0:i+1,grupos_activos:15,meta_nuevos_mensual:20,cp_invitados:40,cp_asistieron:20,cp_matriculados:8,orig_referido:2,orig_marketing:8,mot_horario:1})).filter(r=>r.month!==5)
const payload={nombre:'QA HCA · Datos ficticios',resumen:rows,estados:rows.map((r,i)=>({...r,estado:i===rows.length-1?'abierto':'cerrado'})),semanas:rows.map((r,i)=>({...r,nuevos_ingresos_venta:i===2?0:5+i})),cuadros:rows.slice(0,-1).map(r=>({...r,vivo:false,aPagar:r.ninos_final_mes,nuevos:5,reincorporados:1,retirados:2,gruposActivos:15,royalty:1500}))}
const stubs={
 navigation:`export const useParams=()=>({id:'qa-hca'});export const useSearchParams=()=>new URLSearchParams(location.search);`,
 link:`import React from 'react';export default function Link(props){return React.createElement('a',props)}`,
 sidebar:`import React from 'react';export default function Sidebar(){return <aside className="sb" style={{padding:20}}>ALOHA · QA con datos ficticios</aside>}`,
 centroNav:`import React from 'react';export default function Nav(){return <p>Vista de prueba local · Sin conexión a producción</p>}`,
 action:`export const getHistorialCentro=async()=>(${JSON.stringify(payload)});`,
}
await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/centro/[id]/historial/page.js';createRoot(document.getElementById('root')).render(<Page/>);`,resolveDir:root,loader:'jsx'},outfile:resolve(out,'app.js'),bundle:true,loader:{'.js':'jsx'},jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'qa-readonly',setup(b){
 b.onResolve({filter:/next\/navigation|next\/link|components\/Sidebar|components\/CentroNavigation|actions\/centro$/},args=>({path:args.path==='next/navigation'?'navigation':args.path==='next/link'?'link':args.path.includes('Sidebar')?'sidebar':args.path.includes('CentroNavigation')?'centroNav':'action',namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:root}));
}}]})
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><title>QA Historial HCA</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>'
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const [data,type]=p==='/app.js'?[await readFile(resolve(out,'app.js')),'text/javascript']:p==='/globals.css'?[await readFile(resolve(root,'app/globals.css')),'text/css']:p.startsWith('/fonts/')?[await readFile(resolve(root,'public'+p)),'font/ttf']:[html,'text/html'];res.writeHead(200,{'Content-Type':type});res.end(data)}catch{res.writeHead(404);res.end()}})
server.listen(0,'127.0.0.1',()=>console.log(`QA local: http://127.0.0.1:${server.address().port}/centro/qa-hca/historial?rango=12m`))
process.on('SIGINT',()=>server.close(()=>process.exit(0)))
