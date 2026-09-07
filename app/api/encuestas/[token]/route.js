import { NextResponse } from 'next/server'
import { encuestas } from '../../../../lib/encuestas/server'
export const runtime='nodejs'
export async function POST(req,{params}) {
  const {token}=await params
  if (req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin) return NextResponse.json({error:'Origen no permitido.'},{status:403})
  try {
    if (Number(req.headers.get('content-length') || 0)>12000) return NextResponse.json({error:'Formulario demasiado largo.'},{status:413})
    const body=await req.text()
    if (body.length>12000) return NextResponse.json({error:'Formulario demasiado largo.'},{status:413})
    const input=JSON.parse(body)
    const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    return NextResponse.json(await encuestas.responder(token,input,ip),{headers:{'Cache-Control':'no-store'}})
  } catch(e) {
    const mensaje=e.code ? 'No se pudo guardar. Intenta nuevamente.' : e instanceof SyntaxError ? 'Formulario inválido.' : e.message
    return NextResponse.json({error:mensaje},{status:400,headers:{'Cache-Control':'no-store'}})
  }
}
