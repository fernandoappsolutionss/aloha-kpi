// Componentes reales, datos y acciones simuladas; navegador y servidor propios.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { createServer } from 'node:http'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'
import { extractText } from 'unpdf'
import { ESTADISTICAS_CENTRO as catalogo } from '../../lib/estadisticas-semana/catalogo.mjs'
import { ultimasSemanas } from '../../lib/semana-cierre.mjs'
import { pasosDe } from '../../lib/condiciones/formulas.mjs'
import { MODULOS } from '../../lib/entrenamiento/modulos.js'
import { rutaDePaso } from '../../lib/entrenamiento/progreso.js'
const root=resolve('.'), out=resolve('.scratch/semana-guiada')
await mkdir(out,{recursive:true})
const semanas=ultimasSemanas('2026-10-22',12)
const objetivos=[{id:1,seccion:'formula',paso:0,texto:'Confirmar las clases de prueba pendientes',responsable:'Administradora',fecha:'2026-10-21',evidencia_esperada:'Citas confirmadas en CRM',hecho:false},{id:2,seccion:'pendiente',texto:'Preparar invitaciones del centro',responsable:'Asistente',fecha:'2026-10-22',evidencia_esperada:'Invitaciones aprobadas',hecho:false}]
const datos={centro:{id:2,nombre:'Centro de prueba · ANCLAS',zonaHoraria:'America/Panama'},fechaDatos:'2026-10-20',semanaAbierta:'2026-10-22',ultimaCerrada:'2026-10-15',ultimoCalculo:'2026-10-20T20:43:00Z',semanas,catalogo,
 series:Object.fromEntries(catalogo.map((m,j)=>[m.codigo,semanas.map((semanaFin,i)=>({semanaFin,valor:j===0?120+i:[2,1,12,6][j-1],estado:i===11?'abierta':'cerrada'}))])),
 resumen:Object.fromEntries(catalogo.map((m,i)=>[m.codigo,{abierta:[131,2,1,12,6][i],cerrada:[132,1,0,11,5][i],delta:1}])),
 cuotas:Object.fromEntries(catalogo.map((m,i)=>[m.codigo,{cuota:[136,8,2,7,10][i],propuesta:[136,8,2,7,10][i],estado:i===1?'propuesta':'aprobada'}])),compromiso:null,
 resultadosMes:Object.fromEntries(catalogo.map((m,i)=>[m.codigo,{valor:[131,3,5,12,16][i]}])),
 avanceDiario:Array.from({length:5},(_,i)=>({fecha:`2026-10-${16+i}`,valores:{ninos_activos:131,nuevos_inscritos:i<2?0:2,retiros:i<3?0:1,facturas_vencidas:12,cp_asistidas:i<3?2:6}})),
 puedeEscribir:true,puedeAsignar:true,puedeAprobar:false,
 plan:{plan:{condicion:'normal',fundamento:'Subió de 130 a 132 en dos cierres. Revisar continuidad.',alcance_peligro:null,variante_afluencia:null},pasos:pasosDe({condicion:'normal'}),objetivos,estrategico:[],estado:'incompleto',pasoFaltante:2,preparacion:true,ejecucion:{total:2,realizadas:0,verificadas:0}}}
const stubs={
 navigation:`import {useSyncExternalStore} from 'react';const subscribe=fn=>{window.addEventListener('popstate',fn);return()=>window.removeEventListener('popstate',fn)};export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname);export const useParams=()=>({id:'2'});const router={push:u=>window.__nav(u),replace:u=>window.__nav(u)};export const useRouter=()=>router;`,
 link:`import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props} onClick={e=>{if(!e.ctrlKey&&!e.metaKey){e.preventDefault();window.__nav(href)}}}>{children}</a>}`,
 sidebar:`import React from 'react';export default function Sidebar(){return <aside className="sb" style={{padding:24}}><strong>ALOHA</strong><p>Centro de prueba</p><p>Administradora</p><p>Mi semana</p></aside>}`,
 navctx:`export const getNavigationContext=async()=>({actor:{role:'administradora'}})`,
 oficio:`export const contadorFirmas=async()=>({n:0})`,
 growth:`export const updateGrowthRecommendation=async()=>({status:'completed'})`,
 semana:`import {pasosDe} from '${root}/lib/condiciones/formulas.mjs';
 export const getSemanaCentro=async()=>structuredClone(window.__datos);
 export const actualizarSemanaCentro=getSemanaCentro;
 export const guardarCompromiso=async()=>{};
 export const guardarCuotas=async(id,fin,p)=>{for(const [k,v]of Object.entries(p))window.__datos.cuotas[k]={...window.__datos.cuotas[k],cuota:v,estado:'propuesta'}};
 export const aprobarCuotas=guardarCuotas;
 export const asignarCondicion=async(id,fin,p)=>{window.__datos.plan.plan={...window.__datos.plan.plan,condicion:p.condicion,fundamento:p.fundamento};window.__datos.plan.pasos=pasosDe(p)};
 export const agregarObjetivo=async(id,fin,p)=>{window.__datos.plan.objetivos.push({...p,id:Date.now(),hecho:false});};
 export const editarObjetivo=async()=>{};
 export const eliminarObjetivo=async()=>{};
 export const verificarObjetivo=async()=>{};
 export const marcarObjetivo=async(id,oid,hecho,evidencia)=>{const o=window.__datos.plan.objetivos.find(o=>o.id===oid);o.hecho=hecho;o.evidencia_resultado=evidencia;};
 export const getInformeSemana=async(id,semanaFin)=>{if(window.__falloInforme)throw Error('fallo');return {centro:window.__datos.centro,semanaFin,rango:{desde:'2026-10-09',hasta:semanaFin},referencia:'2026-10-08',cerrado:true,consultado:'2026-10-20T20:43:00Z',...window.__datos.plan,estadisticas:window.__datos.catalogo.map(m=>({...m,valor:2,cuota:3,estadoCuota:'aprobada',cumple:false}))}};`,
 juegos:`export const getJuegoSemana=async()=>{if(window.__falloJuego)throw Error('fallo');return window.__juego};export const guardarJuegoSemana=async(id,fin,p)=>window.__juego={...p,meta:Number(p.meta),version:(window.__juego?.version||0)+1,estado:'propuesto'};export const aprobarJuegoSemana=async()=>window.__juego={...window.__juego,estado:'aprobado',version:window.__juego.version+1};`,
}
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import Semana from './app/centro/[id]/semana/page.js';import {usePathname} from 'next/navigation';window.__nav=u=>{history.pushState(null,'',u);window.dispatchEvent(new Event('popstate'))};function App(){const path=usePathname();const seccion=path.split('/')[4]||'avance';return <Semana key={path} seccion={seccion}/>};createRoot(document.getElementById('root')).render(<App/>);`
await build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},outfile:resolve(out,'app.js'),bundle:true,loader:{'.js':'jsx'},jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/next\/navigation|next\/link|components\/Sidebar|actions\/(semana|juegos-semana|growth|navigation|entrenamiento-oficio)/},a=>{const key=a.path==='next/navigation'?'navigation':a.path==='next/link'?'link':a.path.includes('Sidebar')?'sidebar':a.path.includes('juegos-semana')?'juegos':a.path.includes('actions/semana')?'semana':a.path.includes('growth')?'growth':a.path.includes('actions/navigation')?'navctx':'oficio';return {path:key,namespace:'qa'}});b.onLoad({filter:/.*/,namespace:'qa'},a=>({contents:stubs[a.path],loader:'jsx',resolveDir:root}))}}]})
const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ALOHA · Demostración de semana guiada</title><link rel="stylesheet" href="/globals.css"></head><body><div id="root"></div><script>window.__datos=${JSON.stringify(datos)};window.__juego=null;</script><script src="/app.js"></script></body></html>`
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;const file=p==='/app.js'?resolve(out,'app.js'):p==='/globals.css'?resolve(root,'app/globals.css'):p.startsWith('/fonts/')?resolve(root,'public'+p):null;res.setHeader('Content-Type',file?({'.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream'):'text/html');res.end(file?await readFile(file):html)}catch{res.writeHead(404);res.end()}})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
let browser,context,checks=0;const errores=[]
const check=(v,m)=>{assert.ok(v,m);checks++}
try{
 browser=await chromium.launch({headless:true});check(browser.contexts().length===0,'Navegador propio sin contextos previos')
 context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.on('pageerror',e=>errores.push(e.message))
 await page.goto(`http://127.0.0.1:${server.address().port}/centro/2/semana`)
 const ready=()=>page.locator('[data-page-state="ready"]').waitFor()
 const navegar=async s=>{await page.evaluate(s=>window.__nav('/centro/2/semana'+s),s);await ready()}
 await ready();check(await page.getByRole('navigation',{name:'Pasos de mi semana'}).getByRole('link').count()===5,'Cinco pantallas')
 check(await page.locator('#plan-batalla').count()===0,'Avance no apila el plan')
 check(await page.locator('.semana-diaria tbody tr').count()===7,'Siete días')
 check((await page.locator('.semana-diaria tbody tr').last().textContent()).includes('Por venir'),'Futuro identificado')
 await page.getByRole('button',{name:/Retiros.*Máximo/}).click();check((await page.locator('.semana-diaria').textContent()).includes('Dentro del límite'),'Inversa correcta')
 await page.locator('.semana-ajustes > summary').click();await page.getByRole('spinbutton',{name:'Cuota de Nuevos inscritos',exact:true}).fill('9');await page.getByRole('button',{name:'Guardar cuotas',exact:true}).click();await page.getByText('Cuotas guardadas para aprobación.').waitFor();check(await page.evaluate(()=>window.__datos.cuotas.nuevos_inscritos.cuota)===9,'Guardado de cuota')
 await page.locator('.semana-ajustes > summary').click();await page.screenshot({path:resolve(out,'avance-escritorio.png'),fullPage:true})
 await navegar('/condicion');check(await page.getByText('Fórmula de Normal',{exact:true}).count()===1,'Fórmula titulada')
 check(await page.getByRole('button',{name:'Registrar acción realizada'}).count()===0,'Preparación separada de ejecución')
 await page.getByText('Ver un ejemplo: del paso a una acción comprobable').click();check(await page.getByText('Relación de altas con su origen y decisión de mantener la acción comprobada.').count()===1,'Ejemplo del entrenamiento')
 await page.screenshot({path:resolve(out,'condicion-escritorio.png'),fullPage:true})
 await navegar('/acciones');check(await page.getByRole('button',{name:'Registrar acción realizada'}).count()===2,'Acciones ejecutables')
 await page.getByRole('textbox',{name:'Evidencia del resultado'}).first().fill('Se confirmaron 3 citas en CRM, registro de hoy.')
 await page.getByRole('button',{name:'Registrar acción realizada'}).first().click();await page.getByText('Se confirmaron 3 citas en CRM, registro de hoy.').waitFor();check(await page.getByRole('button',{name:'Reabrir acción'}).count()===1,'Evidencia registrada')
 await navegar('/cumplimiento');check(await page.getByText('Avance provisional · semana en curso').count()===1,'Informe provisional')
 check((await page.locator('.semana-informe tbody tr').nth(1).textContent()).includes('Sin evaluar'),'Cuota propuesta no evaluada')
 await page.emulateMedia({media:'print'});check(await page.getByRole('navigation',{name:'Pasos de mi semana'}).isHidden(),'Impresión sin navegación');check(await page.locator('.semana-informe').isVisible(),'Informe visible al imprimir')
 await page.pdf({path:resolve(out,'cumplimiento-ejemplo.pdf'),format:'A4',printBackground:true,margin:{top:'14mm',bottom:'14mm',left:'14mm',right:'14mm'}})
 const pdf=await extractText(new Uint8Array(await readFile(resolve(out,'cumplimiento-ejemplo.pdf'))),{mergePages:true});check(pdf.text.includes('Fecha de revisión'),'PDF conserva el final');check(pdf.text.includes('Citas confirmadas en CRM'),'PDF conserva evidencia');await page.emulateMedia({media:'screen'})
 await page.getByLabel('Semana del informe').selectOption('2026-10-15');await page.getByText('Semana cerrada · registros guardados').waitFor();check((await page.locator('.semana-informe').textContent()).includes('2026-10-08'),'Plan histórico de referencia correcta')
 await navegar('/juegos');await page.getByLabel('Nombre del juego').fill('Semana de bienvenida');await page.getByLabel('Meta al cierre (entero)').fill('10');await page.getByLabel('Quiénes participan').fill('Administradora y asistente');await page.getByLabel('Reglas: qué cuenta y cómo se comprueba').fill('Asistentes en clases realizadas esta semana, según CRM.');await page.getByLabel('Premio o reconocimiento').fill('Reconocimiento en reunión');await page.getByRole('button',{name:'Guardar propuesta de juego'}).click();await page.getByText('Propuesta pendiente',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Aprobar juego'}).count()===0,'Administradora no aprueba')
 await page.evaluate(()=>window.__datos.puedeAprobar=true);await navegar('');await navegar('/juegos');await page.getByRole('button',{name:'Aprobar juego'}).click();await page.getByText('Aprobado por coordinación').waitFor();check(await page.evaluate(()=>window.__juego.estado)==='aprobado','Coordinación aprueba')
 await page.getByRole('button',{name:'Editar propuesta'}).click();await page.getByLabel('Premio o reconocimiento').fill('Reconocimiento del equipo');await page.getByRole('button',{name:'Guardar propuesta de juego'}).click();await page.getByText('Propuesta pendiente',{exact:true}).waitFor();check(await page.evaluate(()=>window.__juego.estado)==='propuesto','Edición revoca aprobación')
 await page.getByLabel('Semana del juego').selectOption('2026-10-15');await page.getByText('Propuesta pendiente',{exact:true}).waitFor();check(await page.getByRole('button',{name:'Editar propuesta'}).count()===0,'Juego histórico solo lectura')
 for(const width of [390,320,1440]){await page.setViewportSize({width,height:1000});for(const s of ['','/condicion','/acciones','/cumplimiento','/juegos']){await navegar(s);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Sin desborde ${width} ${s}`);if(width===390&&['','/condicion','/juegos'].includes(s))await page.screenshot({path:resolve(out,`movil-${s.slice(1)||'avance'}.png`),fullPage:true})}}
 for(const m of MODULOS.filter(m=>m.id.startsWith('semana-'))){for(let i=1;i<=m.pasos.length;i++){const route=rutaDePaso(m,i).replace('{id}','2');await page.evaluate(u=>window.__nav(u),route);await ready();check(await page.locator(`[data-tour="${m.pasos[i-1].target}"]`).count()===1,`${m.id} paso ${i} target presente en ${route}`)}}
 await navegar('');await page.evaluate(()=>window.__datos.plan={...window.__datos.plan,plan:{condicion:null},pasos:[]});await navegar('/condicion');check(await page.getByText('¿Qué es una condición?').count()===1,'Ayuda sin condición');check(await page.getByText('La fórmula y sus objetivos aparecerán al asignar la condición.').count()===1,'Estado inicial sin fórmula falsa')
 await page.evaluate(()=>window.__falloJuego=true);await navegar('/juegos');await page.getByRole('alert').waitFor();check(await page.getByRole('button',{name:'Guardar propuesta de juego'}).count()===0,'Error de carga impide sobrescribir juego')
 check(errores.length===0,errores.join('; '));await writeFile(resolve(out,'resultado.json'),JSON.stringify({checks,errores,fuentes:'Componentes reales; datos y acciones simulados'},null,2));console.log(`${checks} comprobaciones UI PASS; PDF generado`)
}finally{if(context)await context.close();if(browser){assert.equal(browser.contexts().length,0);await browser.close();assert.equal(browser.isConnected(),false)}await new Promise(r=>server.close(r));console.log('Navegador: pestañas/grupos propios cerrados y comprobados. Servidor propio detenido.')}
