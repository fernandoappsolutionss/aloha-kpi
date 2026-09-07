// Las grabaciones publicadas se conservan. Solo genera contenido nuevo o
// explícitamente actualizado, con la voz natural aprobada por Fernando.
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs'
import {homedir} from 'node:os'
import {dirname,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'
import {MODULOS} from '../lib/entrenamiento/modulos.js'
import {hashDe,RECETAS,saneaVoz} from './entrenamiento-audio.mjs'
const ROOT=fileURLToPath(new URL('../',import.meta.url))
export function clipsActualizados() {
  return MODULOS.flatMap(m=>[
    ...(m.audioActualizado?[{clave:`${m.id}/intro`,texto:m.intro.voz||m.intro.texto}]:[]),
    ...m.pasos.filter(p=>m.audioActualizado||p.audioActualizado).map(p=>({clave:`${m.id}/${p.id}`,texto:p.voz||p.texto})),
  ]).map(c=>({...c,receta:RECETAS.guia,hash:hashDe(c.texto,RECETAS.guia),file:`actualizaciones/${c.clave}-${hashDe(c.texto,RECETAS.guia)}.mp3`}))
}
async function main() {
  const path=join(ROOT,'lib/entrenamiento/audio-manifest-actualizaciones.json')
  const manifest=JSON.parse(readFileSync(path,'utf8'))
  const clips=clipsActualizados(),pendientes=clips.filter(c=>manifest[c.clave]?.hash!==c.hash||!existsSync(join(ROOT,'public/entrenamiento',c.file)))
  console.log(JSON.stringify({total:clips.length,reutilizables:clips.length-pendientes.length,pendientes:pendientes.length,caracteres:pendientes.reduce((n,c)=>n+saneaVoz(c.texto).length,0)}))
  if(!process.argv.includes('--generar')||!pendientes.length)return
  const key=process.env.ELEVENLABS_API_KEY || readFileSync(join(homedir(),'.studio-reels-assembler/credentials.env'),'utf8').match(/^ELEVENLABS_API_KEY=["']?([^"'\n]+)/m)?.[1]
  if(!key)throw new Error('No está configurada la credencial de ElevenLabs.')
  for(const clip of pendientes) {
    const res=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${clip.receta.voiceId}?output_format=${clip.receta.format}`,{
      method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},
      body:JSON.stringify({text:saneaVoz(clip.texto),...clip.receta.settings}),signal:AbortSignal.timeout(90000),
    })
    if(!res.ok)throw new Error(`ElevenLabs respondió ${res.status}; no se reintentó ni se guardó el clip.`)
    if(!res.headers.get('content-type')?.includes('audio'))throw new Error('ElevenLabs no devolvió audio.')
    const bytes=Buffer.from(await res.arrayBuffer())
    if(bytes.length<1000)throw new Error('Audio incompleto.')
    const archivo=join(ROOT,'public/entrenamiento',clip.file);mkdirSync(dirname(archivo),{recursive:true})
    writeFileSync(`${archivo}.tmp`,bytes)
    execFileSync('ffmpeg',['-v','error','-i',`${archivo}.tmp`,'-f','null','-'],{stdio:'pipe'})
    const seconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',`${archivo}.tmp`],{encoding:'utf8'}).trim())
    renameSync(`${archivo}.tmp`,archivo)
    manifest[clip.clave]={file:clip.file,hash:clip.hash,voiceId:clip.receta.voiceId,modelId:clip.receta.settings.model_id,bytes:bytes.length,segundos:seconds,generadoAt:new Date().toISOString()}
    writeFileSync(`${path}.tmp`,JSON.stringify(manifest,null,2)+'\n');renameSync(`${path}.tmp`,path)
    console.log(`${clip.clave}: ${seconds.toFixed(1)} s · verificado`)
  }
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1])main().catch(e=>{console.error(e.message);process.exitCode=1})
