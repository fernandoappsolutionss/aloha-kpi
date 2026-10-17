import test from 'node:test'
import assert from 'node:assert/strict'
import { calidadCaja, diagnosticoCaja, viernesCiclo, validarPlanCaja, validarRitual, asignacionesOficio, CHECKS_VIERNES, CHECKS_LUNES } from '../lib/caja/direccion.mjs'
import { planDeRol, esDelPlan } from '../lib/entrenamiento/oficio/progreso.js'
import { MODULOS_OFICIO } from '../lib/entrenamiento/oficio/catalogo.js'
const carmen={id:4,nombre:'Carmen QA',rol:'coordinador',email:'admin@alohapanama.com'}
const master={id:1,nombre:'Master QA',rol:'admin_master',email:'fperez@teamsolutionss.com'}
const hoy='2026-10-23'
const base=()=>({empresa:'altavia',ciclo:hoy,version:0,documento:{condicion:'sin_asignar',fundamento:'',soportes:'Archivo QA y saldo contrastado',bitacora:'Revisión con evidencia',viernes:Object.fromEntries(Object.keys(CHECKS_VIERNES).map(k=>[k,true])),lunes:Object.fromEntries(Object.keys(CHECKS_LUNES).map(k=>[k,true])),acciones:[{id:'qa-1',tipo:'cobro',objetivo:'Cobrar 100 con soporte',responsable:'QA',fecha:'2026-10-26',semana:'2026-10-26',monto:100,paso:0,estado:'pendiente',evidencia:''}]}})
const contexto={cuentas:[{nombre:'Banco QA',tipo:'operativa',base_fecha:hoy,base:1000}],pendientes:0,hoy,ciclo:hoy}
test('ciclo de caja conserva viernes previo durante lunes y cambia el viernes',()=>{assert.equal(viernesCiclo('2026-10-26'),hoy);assert.equal(viernesCiclo('2026-10-30'),'2026-10-30')})
test('calidad rechaza saldos ausentes, antiguos, futuros y clasificación incompleta',()=>{
 assert.equal(calidadCaja(contexto.cuentas,0,hoy).confiable,true)
 for(const base_fecha of [null,'2026-09-24','2026-10-24']) assert.equal(calidadCaja([{...contexto.cuentas[0],base_fecha}],0,hoy).confiable,false)
 assert.equal(calidadCaja(contexto.cuentas,201,hoy).confiable,false)
 assert.equal(calidadCaja([],0,hoy).confiable,false)
})
test('riesgo distingue caída, faltante para cero y para piso sin condición automática',()=>{
 const r=diagnosticoCaja({piso:2000,semanas:[{lunes:hoy,disponible:3000,semaforo:'verde'},{lunes:'2026-10-26',disponible:-1200,semaforo:'rojo',lineaExcedida:true}]})
 assert.equal(r[1].caida,true);assert.equal(r[1].faltaParaPiso,3200);assert.equal(r[1].faltaParaCero,1200);assert.equal(r[1].variacion,-4200);assert.equal(r[1].condicion,undefined)
})
test('curso individual de Carmen; coordinación genérica no recibe la obligación',()=>{
 const plan=planDeRol(carmen.rol,MODULOS_OFICIO,null,asignacionesOficio(carmen))
 assert.equal(plan.filter(m=>m.curso==='caja').length,4)
 assert.equal(planDeRol('coordinador',MODULOS_OFICIO).some(m=>m.curso==='caja'),false)
 assert.equal(esDelPlan(plan.find(m=>m.curso==='caja'),'coordinador',null,asignacionesOficio({...carmen,email:'otra@example.invalid'})),false)
 assert.deepEqual(asignacionesOficio({...carmen,rol:'asistente'}),[])
})
test('Carmen no se autoaprueba una excepción ni falsifica aprobador',()=>{
 const input=base();Object.assign(input.documento.acciones[0],{tipo:'credito',decision:'aprobada',aprobador:master})
 const d=validarPlanCaja(input,null,carmen,hoy);assert.equal(d.acciones[0].aprobacion,'pendiente');assert.equal(d.acciones[0].aprobador,null)
 input.documento.acciones[0].estado='en_curso';assert.throws(()=>validarPlanCaja(input,null,carmen,hoy),/Master/)
})
test('Master aprueba una propuesta exacta y el cambio de monto requiere nueva decisión',()=>{
 const input=base();Object.assign(input.documento.acciones[0],{tipo:'fuera_presupuesto',decision:'aprobada'})
 const d=validarPlanCaja(input,null,master,hoy);assert.equal(d.acciones[0].aprobacion,'aprobada')
 const copia=structuredClone(input);delete copia.documento.acciones[0].decision
 assert.equal(validarPlanCaja(copia,d,carmen,hoy).acciones[0].aprobacion,'aprobada')
 copia.documento.acciones[0].monto=101
 assert.equal(validarPlanCaja(copia,d,carmen,hoy).acciones[0].aprobacion,'pendiente')
 assert.equal(validarPlanCaja(copia,d,master,hoy).acciones[0].aprobacion,'pendiente','editar como Master no equivale a aprobar')
})
test('plan preserva acciones; Hecho y Cancelada exigen evidencia',()=>{
 const input=base(),d=validarPlanCaja(input,null,carmen,hoy)
 input.documento.acciones=[];assert.throws(()=>validarPlanCaja(input,d,carmen,hoy),/Conserva/)
 for(const estado of ['hecho','cancelada']){const i=base();i.documento.acciones[0].estado=estado;assert.throws(()=>validarPlanCaja(i,null,carmen,hoy))}
})
test('escritura deniega otras personas y valida importes y fechas reales',()=>{
 assert.throws(()=>validarPlanCaja(base(),null,{...carmen,email:'vcampos@alohapanama.com'},hoy),/Solo/)
 for(const monto of [NaN,Infinity,-1,'100']){const i=base();i.documento.acciones[0].monto=monto;assert.throws(()=>validarPlanCaja(i,null,carmen,hoy))}
 const i=base();i.documento.acciones[0].fecha='2026-02-30';assert.throws(()=>validarPlanCaja(i,null,carmen,hoy),/fecha/)
})
test('cierre exige datos al viernes, soportes y todos los controles',()=>{
 const d=validarPlanCaja(base(),null,carmen,hoy);validarRitual('cerrar_viernes',d,contexto)
 assert.throws(()=>validarRitual('cerrar_viernes',d,{...contexto,pendientes:1}),/clasificar/)
 assert.throws(()=>validarRitual('cerrar_viernes',d,{...contexto,cuentas:[{...contexto.cuentas[0],base_fecha:'2026-10-22'}]}),/viernes/)
 assert.throws(()=>validarRitual('cerrar_viernes',{...d,viernes:{...d.viernes,pagos:false}},contexto),/Completa/)
})
test('lunes exige cierre real y fecha no adelantada',()=>{
 const d=validarPlanCaja(base(),null,carmen,hoy)
 assert.throws(()=>validarRitual('revisar_lunes',d,contexto),/Primero/)
 assert.throws(()=>validarRitual('revisar_lunes',d,{...contexto,cierre:true}),/lunes siguiente/)
 validarRitual('revisar_lunes',d,{...contexto,hoy:'2026-10-26',cierre:true})
})
test('fórmula asignada exige fundamento y objetivos de cada paso para cerrar',()=>{
 const i=base();i.documento.condicion='emergencia';assert.throws(()=>validarPlanCaja(i,null,carmen,hoy))
 i.documento.fundamento='Serie real QA con fechas y valores';const d=validarPlanCaja(i,null,carmen,hoy)
 assert.throws(()=>validarRitual('cerrar_viernes',d,contexto),/cada paso/)
 d.acciones=Array.from({length:5},(_,n)=>({...d.acciones[0],id:'qa-'+n,paso:n+1}));validarRitual('cerrar_viernes',d,contexto)
})
