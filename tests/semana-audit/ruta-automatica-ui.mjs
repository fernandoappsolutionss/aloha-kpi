// QA de los componentes reales con acciones simuladas y datos ficticios.
// Sin conexión a producción. El navegador, contexto y servidor son propios.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'
import { buildGrowthPayload } from '../../lib/growth/engine.mjs'
import { ESTADISTICAS_CENTRO as catalogo } from '../../lib/estadisticas-semana/catalogo.mjs'
import { armarSeries } from '../../lib/estadisticas-semana/presentacion.mjs'
import { ultimasSemanas } from '../../lib/semana-cierre.mjs'
import { prepararCuotas } from '../../lib/cuotas-semana.mjs'
const root = resolve('.')
const out = resolve('.scratch/ruta-automatica')
await mkdir(out, { recursive: true })
const semanas = ultimasSemanas('2026-10-15', 12)
const filas = semanas.flatMap((semana_fin, i) => catalogo.map((meta, n) => ({ codigo: meta.codigo, semana_fin,
  valor: n === 0 ? i === 11 ? 100 : i > 8 ? 96 : 80 + i : [0,5,0,23,5][n], estado: i === 11 ? 'abierta' : 'cerrada',
  detalle: n === 0 && i === 10 ? { reconstruida: true } : {} })))
const vista = armarSeries(semanas, filas)
const cuotas = prepararCuotas({ catalogo, ...vista, filasCuotas: [], metas: {nuevos:20,desercion:8,cobranza:1}, semanaAbierta: '2026-10-15', hoy:'2026-10-15' })
const weekly = { ...vista, ...cuotas, catalogo, centro:{id:10,nombre:'Centro de prueba'}, fechaDatos:'2026-10-15', semanaAbierta:'2026-10-15', ultimaCerrada:'2026-10-08',
  resultadosMes:Object.fromEntries(catalogo.map((m,i)=>[m.codigo,{valor:[100,6,0,23,16][i],detalle:{}}])),
  puedeEscribir:true, puedeAsignar:true, puedeAprobar:true, compromiso:null,
  plan:{ plan:{condicion:null}, estado:'sin_condicion', plazoVencido:false, objetivos:[], pasos:[], estrategico:[], ejecucion:{total:0,realizadas:0,verificadas:0} } }
const growth = buildGrowthPayload({today:'2026-10-15',center:{id:10,nombre:'Centro de prueba'},
  metas:{meta_nuevos_ingresos_mes:20,cp_conversion:50,cupo_max_grupo:15},
  summaries:Array.from({length:6},(_,i)=>({year:2026,month:i+4,ninos_inicio_mes:100,ninos_final_mes:100,nuevos_activos_mes:10,grupos_activos:10,cp_invitados:40,cp_asistieron:20,cp_matriculados:8,mot_graduado:2,mot_tecnica:1,mot_perdida_clase:1,mot_horario:2,mot_economico:4,orig_referido:2,orig_centro:2,orig_marketing:6,orig_activaciones:0})),
  states:Array.from({length:6},(_,i)=>({year:2026,month:i+4,estado:'cerrado'})), weekly:[], reincorporations:[], events:[], salons:[],
  groups:[{id:1,estado:'activo',fecha_inicio_clases:'2026-01-01'}], students:Array.from({length:100},(_,i)=>({id:i+1,estado:'activo',grupo_id:1,fecha_inscripcion:'2026-01-01',created_at:'2026-01-01'})) })
growth.recommendations = growth.recommendations.map((r,i)=>({...r,id:i+1,due_date:'2026-10-21'}))
growth.recommendationHistory=[]
const stubs = {
  navigation: `export const useParams=()=>({id:'10'});`,
  link: `import React from 'react'; export default function Link(props){return React.createElement('a',props)}`,
  sidebar: `import React from 'react'; export default function Sidebar(){return <aside style={{padding:20}}>ALOHA · Prueba local</aside>}`,
  semana: `
    export const getSemanaCentro=async()=>structuredClone(window.__weekly);
    export const guardarCompromiso=async(id,datos)=>{window.__writes.push(['meta',datos]);window.__weekly.compromiso=datos};
    export const guardarCuotas=async(id,fin,datos)=>{window.__writes.push(['cuotas',datos]);for(const [codigo,cuota] of Object.entries(datos))window.__weekly.cuotas[codigo]={...window.__weekly.cuotas[codigo],cuota,estado:'propuesta'}};
    export const aprobarCuotas=guardarCuotas;
    export const asignarCondicion=async()=>{};
    export const agregarObjetivo=async()=>{};
    export const editarObjetivo=async()=>{};
    export const marcarObjetivo=async()=>{};
    export const eliminarObjetivo=async()=>{};
    export const verificarObjetivo=async()=>{};
  `,
  growth:`
    export const getCentroGrowth=async()=>{if(window.__falloRecarga)throw new Error('Recarga simulada falló');return structuredClone(window.__growth)};
    export const updateGrowthRecommendation=async(centro,id,command)=>{
      window.__writes.push(['prioridad',id,command]); const item=window.__growth.recommendations.find(r=>r.id===id);
      item.status=command==='complete'?'completed':command==='postpone'?'postponed':'dismissed';
      if(command==='postpone')item.due_date='2026-10-28';return structuredClone(item)
    };
  `,
}
await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Route from './app/centro/[id]/ruta-nivel/page.js';createRoot(document.getElementById('root')).render(<Route/>);`,resolveDir:root,loader:'jsx'},outfile:resolve(out,'app.js'),bundle:true,loader:{'.js':'jsx'},jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'acciones-qa',setup(b){
  b.onResolve({filter:/next\/navigation|next\/link|components\/Sidebar|actions\/semana|actions\/growth/},args=>{
    const key=args.path.includes('navigation')?'navigation':args.path==='next/link'?'link':args.path.includes('Sidebar')?'sidebar':args.path.includes('semana')?'semana':'growth';return {path:key,namespace:'qa'}
  });
  b.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:root}))
}}]})
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"></head><body><div id="root"></div><script>window.__weekly=${JSON.stringify(weekly)};window.__growth=${JSON.stringify(growth)};window.__writes=[];</script><script src="/app.js"></script></body></html>`
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;let data,type;if(pathname==='/app.js'){data=await readFile(resolve(out,'app.js'));type='text/javascript'}else if(pathname==='/globals.css'){data=await readFile(resolve(root,'app/globals.css'));type='text/css'}else if(pathname.startsWith('/fonts/')){data=await readFile(resolve(root,'public'+pathname));type='font/ttf'}else{data=html;type='text/html'}res.writeHead(200,{'Content-Type':type});res.end(data)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
let browser, context
const errores=[]
let checks=0
const check=(condition,message)=>{assert.ok(condition,message);checks++}
try {
  browser=await chromium.launch({headless:true})
  check(browser.contexts().length===0,'Inventario inicial: navegador propio sin contextos')
  context=await browser.newContext({viewport:{width:1440,height:1000}})
  const page=await context.newPage()
  page.on('pageerror',e=>errores.push(e.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.locator('[data-page-state="ready"]').waitFor()
  await page.locator('#resultados-mes').waitFor()
  check(await page.getByRole('heading',{name:'Escenarios de crecimiento'}).count()===0,'Gráfica de escenarios retirada')
  check(await page.locator('#resultados-mes input').count()===0,'Resultados sin recaptura manual')
  check((await page.locator('#resultados-mes dd').allTextContents()).join(',')==='100,6,0,23,16','Cinco resultados automáticos')
  check(await page.locator('#plan-batalla #actions-title').count()===1,'Prioridades únicas dentro del plan')
  check(await page.locator('#actions-title').count()===1,'Sin duplicación de prioridades')
  check(await page.locator('.semana-ajustes').getAttribute('open')===null,'Edición opcional plegada')
  await page.locator('#resultados-mes').screenshot({path:resolve(out,'resultados.png')})
  await page.locator('.semana-prioridades').screenshot({path:resolve(out,'prioridades.png')})
  const summary=page.locator('.semana-ajustes > summary')
  await summary.click()
  check(await page.getByRole('button',{name:'Guardar meta mensual'}).isVisible(),'Editor de metas accesible')
  await page.getByRole('spinbutton',{name:'Cuota de Nuevos inscritos',exact:true}).fill('12')
  await page.locator('[aria-label^="Seguimiento de"]').first().getByRole('button',{name:'Posponer 7 días'}).click()
  await page.waitForFunction(()=>window.__writes.length===1)
  check(await page.getByRole('spinbutton',{name:'Cuota de Nuevos inscritos',exact:true}).inputValue()==='12','La actualización de una prioridad conserva el borrador de cuota')
  for(const [i,meta] of catalogo.entries())await page.locator(`[name="${meta.codigo}"]`).fill(String([110,20,2,1,40][i]))
  await page.locator('[name="diagnostico"]').fill('Revisar asistencia y confirmar las clases con el equipo.')
  await page.getByRole('button',{name:'Guardar meta mensual'}).click()
  await page.waitForFunction(()=>window.__writes.some(x=>x[0]==='meta'))
  check(await page.getByRole('spinbutton',{name:'Cuota de Nuevos inscritos',exact:true}).inputValue()==='12','Guardar meta conserva cuota editada')
  await summary.click()
  await page.evaluate(()=>window.location.hash='semana-cuotas-title')
  await page.waitForFunction(()=>document.querySelector('.semana-ajustes').open)
  check(await page.getByRole('button',{name:'Guardar cuotas'}).isVisible(),'Enlace directo abre el editor plegado')
  await page.evaluate(()=>window.__falloRecarga=true)
  await page.locator('[aria-label^="Seguimiento de"]').first().getByRole('button',{name:'Marcar tarea realizada'}).click()
  await page.getByText('La decisión se guardó. Actualiza la vista sin repetir la acción.').waitFor()
  check(await page.locator('.growth-action--completed').count()===1,'Guardado visible aunque falle la recarga')
  for(const width of [390,320,1440]){
    await page.setViewportSize({width,height:1000})
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Sin desborde a ${width}px`)
    if(width===390)await page.locator('#resultados-mes').screenshot({path:resolve(out,'resultados-movil.png')})
  }
  check(errores.length===0,errores.join('; '))
  await writeFile(resolve(out,'verificacion.json'),JSON.stringify({checks,errores,datos:'ficticios',acciones:'simuladas'},null,2))
  console.log(`${checks} comprobaciones de interfaz PASS; datos ficticios, componentes reales.`)
} finally {
  if(context)await context.close()
  if(browser){assert.equal(browser.contexts().length,0);await browser.close();assert.equal(browser.isConnected(),false)}
  await new Promise(r=>server.close(r))
  console.log('Navegador: pestañas/grupos propios cerrados y comprobados. Servidor propio detenido.')
}
