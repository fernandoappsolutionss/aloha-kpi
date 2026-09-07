import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {puedeFirmar,rolesQueFirma,rolesQueRevisa} from '../lib/entrenamiento/oficio/progreso.js'

test('Master conserva firmas y revisión global; los Generales no firman ni revisan planes',()=>{
  const roles=['administradora','asistente','coach','coordinador']
  assert.deepEqual(rolesQueFirma('admin_master').sort(),roles)
  assert.deepEqual(rolesQueRevisa('admin_master').sort(),roles)
  for(const rol of roles) assert.equal(puedeFirmar({id:2,rol:'admin_master',centroId:null},{id:33,rol,centroId:1}),true)
  for(const rol of ['admin_general','supervisor']){
    assert.deepEqual(rolesQueFirma(rol),[])
    assert.deepEqual(rolesQueRevisa(rol),[])
    for(const alumno of roles) assert.equal(puedeFirmar({id:5,rol,centroId:null},{id:33,rol:alumno,centroId:1}),false)
  }
})
test('escrituras de entrenamiento exigen actor vigente con permiso de entrenamiento',()=>{
  const source=readFileSync(new URL('../app/actions/entrenamiento.js',import.meta.url),'utf8')
  for(const name of ['marcarTourVisto','responderQuiz']){
    const body=source.split(`export async function ${name}(`)[1].split('export async function ')[0]
    assert.match(body,/await requireCurrentTraining\(\)/)
  }
})
test('middleware normaliza los escapes antes de aplicar permisos de rutas',()=>{
  const source=readFileSync(new URL('../middleware.js',import.meta.url),'utf8')
  assert.match(source,/pathname = decodeURIComponent\(req\.nextUrl\.pathname\)/)
})
