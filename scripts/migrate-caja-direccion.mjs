import {readFileSync} from 'node:fs'
import {cargarEnv,conCliente} from './migrate-caja.mjs'
cargarEnv()
if(process.argv.slice(2).some(x=>x!=='--apply'))throw Error('Uso: node scripts/migrate-caja-direccion.mjs [--apply]')
await conCliente(async c=>{
 const {rows:[antes]}=await c.query("SELECT to_regclass('public.caja_direccion_ciclos') IS NOT NULL instalada")
 console.log(JSON.stringify({modo:process.argv.includes('--apply')?'aplicar':'solo-lectura',...antes}))
 if(!process.argv.includes('--apply'))return
 await c.query(readFileSync(new URL('../db/migrations/2026-10-17-caja-direccion.sql',import.meta.url),'utf8'))
 const {rows:[r]}=await c.query('SELECT (SELECT count(*)::int FROM caja_direccion_ciclos) ciclos,(SELECT count(*)::int FROM caja_direccion_eventos) eventos')
 console.log(JSON.stringify({ok:true,...r}))
})
