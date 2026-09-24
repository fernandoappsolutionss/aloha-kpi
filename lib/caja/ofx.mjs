// OFX 1.x (SGML) de Banco General: las etiquetas de hoja no se cierran.
const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }

function tag(bloque, nombre) {
  const m = bloque.match(new RegExp(`<${nombre}>([^<\\r\\n]*)`))
  return m ? m[1].trim() : null
}

function isoDe(ofxFecha) {
  if (!/^\d{8}/.test(ofxFecha || '')) return null
  return `${ofxFecha.slice(0, 4)}-${ofxFecha.slice(4, 6)}-${ofxFecha.slice(6, 8)}`
}

export function parseOfx(texto) {
  const cuenta = tag(texto, 'ACCTID')
  if (!cuenta) throw new Error('El archivo no es un OFX de cuenta bancaria (falta ACCTID).')
  const movimientos = []
  for (const [, bloque] of texto.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g)) {
    const fecha = isoDe(tag(bloque, 'DTPOSTED'))
    const monto = Number(tag(bloque, 'TRNAMT'))
    const fitid = tag(bloque, 'FITID')
    if (!fecha || !Number.isFinite(monto)) throw new Error('Movimiento OFX con fecha o monto inválido.')
    if (!fitid) throw new Error(`Movimiento OFX del ${fecha} sin FITID: no se puede evitar duplicados.`)
    if (monto === 0) continue
    const memo = (tag(bloque, 'MEMO') || tag(bloque, 'NAME') || '').replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTIDADES[e])
    movimientos.push({ fecha, monto, memo, fitid })
  }
  const bal = texto.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([-\d.]+)[\s\S]*?<DTASOF>(\d{8})/)
  return { cuenta, saldo: bal ? { monto: Number(bal[1]), fecha: isoDe(bal[2]) } : null, movimientos }
}
