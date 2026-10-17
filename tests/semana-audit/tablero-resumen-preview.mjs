// QA local sin base ni acciones productivas. Abrir pestaña propia y cerrarla
// al terminar; detener este servidor. Los datos son una fixture de regresión.
import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
import { build } from 'esbuild'
import { sumarDias } from '../../lib/semana-cierre.mjs'
import { resumenClasesPrueba } from '../../lib/estadisticas-semana/resumen-clases-prueba.mjs'
import { lecturaCondicion } from '../../lib/condiciones/lectura.mjs'
const root=resolve('.'), out=resolve('.scratch/tablero')
await mkdir(out,{recursive:true})
const seeds=[['ANCLAS MALL',[null,125,125,125,126,126,126,128,126,131,132,134]],['BRISAS DEL GOLF',[null,183,183,195,189,189,188,200,208,208,208,208]],['CALLE 50',[null,142,145,145,144,141,141,149,146,146,146,146]],['CENTRO EL VIÑEDO',Array(12).fill(null)],['CONDADO DEL REY',[null,58,58,73,77,77,78,78,90,92,93,93]],['DAVID',[null,163,161,160,160,161,173,173,173,174,174,174]],['LOS NARANJOS',[null,79,79,80,78,77,78,81,96,96,100,100]]]
const centros=seeds.map(([nombre,vs],i)=>({id:i+1,nombre,serie:vs.map((valor,j)=>({valor,semanaFin:sumarDias('2026-08-06',j*7),cuota:i===0&&j===9?140:null})),semanaAbierta:'2026-10-22',ultimaCerrada:'2026-10-15',zonaHoraria:i===3||i===6?'America/Caracas':'America/Panama',abierta:{ninos_activos:vs.at(-1),nuevos_inscritos:0,retiros:0,facturas_vencidas:27,cp_asistidas:0},calculoAbierto:{ninos_activos:true},delta:vs.at(-1)==null?null:vs.at(-1)-vs.at(-2),lectura:lecturaCondicion(vs.slice(0,-1)),preparacion:true,estadoPlan:'sin_condicion'}))
const consolidada=centros[0].serie.map((p,j)=>{const values=centros.map(c=>c.serie[j].valor).filter(v=>v!=null);return {semanaFin:p.semanaFin,valor:values.length===centros.length?values.reduce((a,b)=>a+b,0):null,subtotal:values.length?values.reduce((a,b)=>a+b,0):null,total:centros.length,disponibles:values.length,incompleta:values.length!==centros.length}})
const payload={centros,consolidada,ultimaCerrada:'2026-10-15',semanaAbierta:'2026-10-22'}
const mensual=centros.map((c,i)=>({id:c.id,nombre:c.nombre,admin:'QA',ninos:[128,209,147,null,90,174,95][i],ninosDisponible:i!==3,ninosPeriodoFin:i===3?null:'2026-09-30',ninosFuente:'Dato mensual anterior al período',nuevos:0,nuevosDisponible:false,meta:60,desercion:0,grupos:i===3?0:20,ninosGrupo:7,metaGpn:8,cumpl:null,estado:'Parcial'}))
// Fixtures para agenda, comparación histórica, cero real y fallo CRM.
const evento=(id,total,attended,start_date)=>({id,start_date,status:'published',stats:{total,attended,not_attended:total-attended,pending:0,paid:0,won:Math.floor(attended/2),attended_won:Math.floor(attended/2),total_revenue:0}})
centros.forEach((c,i)=>{c.clasesPrueba=i===4?{error:'CRM no disponible'}:resumenClasesPrueba({
  semanaAbierta:c.semanaAbierta,now:new Date('2026-10-17T18:00:00Z'),timeZone:c.zonaHoraria,
  clases:i===3?[]:[
    evento('septiembre',10,5,'2026-09-20T18:00:00Z'),
    evento('anterior',i===0?24:8,i===0?6:i===1?0:8,'2026-10-14T18:00:00Z'),
    ...(i===6?[evento('actual',3,1,'2026-10-17T16:00:00Z')]:[]),
    evento('proxima',i===0?2:i===1?12:3,0,'2026-10-22T18:00:00Z'),
    ...(i===1?[evento('siguiente',4,0,'2026-10-24T18:00:00Z')]:[]),
  ]})})
const stubs={
  link:`import React from 'react';export default function Link(props){return React.createElement('a',props)}`,
  sidebar:`import React from 'react';export default function Sidebar(){return <aside className="sb" style={{padding:20}}>ALOHA · QA local · Sin conexión a producción</aside>}`,
  mensual:`export async function getCentrosKpiRango(){let datos=${JSON.stringify(mensual)};const scenario=new URLSearchParams(location.search).get('scenario');if(scenario==='empty')return [];if(scenario==='complete')return datos.filter(c=>c.ninosDisponible);if(scenario==='zero')return datos.map(c=>({...c,ninos:c.ninosDisponible?0:null}));if(scenario==='no-data')return datos.map(c=>({...c,ninos:null,ninosDisponible:false}));return datos;}`,
  action:`export async function getTableroSemanal(){const datos=${JSON.stringify(payload)};const scenario=new URLSearchParams(location.search).get('scenario');if(scenario==='empty')return {...datos,centros:[],consolidada:[]};if(scenario==='complete'){datos.centros=datos.centros.filter(c=>c.nombre!=='CENTRO EL VIÑEDO');datos.consolidada=datos.consolidada.map(p=>({...p,total:6,incompleta:p.disponibles!==6,valor:p.disponibles===6?p.subtotal:null}));}if(['zero','no-data'].includes(scenario)){datos.centros=datos.centros.map(c=>({...c,abierta:{...c.abierta,ninos_activos:scenario==='no-data'?null:c.abierta.ninos_activos==null?null:0},serie:c.serie.map(p=>({...p,valor:scenario==='no-data'?null:p.valor==null?null:0}))}));datos.consolidada=datos.consolidada.map(p=>({...p,subtotal:scenario==='no-data'||p.subtotal==null?null:0,valor:null,disponibles:scenario==='no-data'?0:p.disponibles}));}return datos;}`
}
await build({
  stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Page from './app/dashboard/page';createRoot(document.getElementById('root')).render(<Page/>);`,resolveDir:root,loader:'jsx'},
  outfile:resolve(out,'app.js'),bundle:true,loader:{'.js':'jsx'},jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},
  plugins:[{name:'qa',setup(b){
    b.onResolve({filter:/next\/link|components\/Sidebar|actions\/(semana|dashboard)$/},a=>({path:a.path==='next/link'?'link':a.path.includes('Sidebar')?'sidebar':a.path.endsWith('/dashboard')?'mensual':'action',namespace:'qa'}));
    b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:stubs[a.path],loader:'jsx',resolveDir:root}));
  }}]
})
const html='<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><title>QA ALOHA · 6 semanas</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>'
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const [data,type]=p==='/app.js'?[await readFile(resolve(out,'app.js')),'text/javascript']:p==='/globals.css'?[await readFile(resolve(root,'app/globals.css')),'text/css']:p.startsWith('/fonts/')?[await readFile(resolve(root,'public'+p)),'font/ttf']:[html,'text/html'];res.writeHead(200,{'Content-Type':type});res.end(data)}catch{res.writeHead(404);res.end()}})
server.listen(4358,'127.0.0.1',()=>console.log('QA local: http://127.0.0.1:4358'))
process.on('SIGINT',()=>server.close(()=>process.exit(0)))
