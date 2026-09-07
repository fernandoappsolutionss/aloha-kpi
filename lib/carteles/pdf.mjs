import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import { FORMATOS, datosWifi, enlaceGoogle } from './domain.mjs'

// RGB explícitos del manual ALOHA. Logo original y Futura incrustada.
const azul = rgb(26/255, 60/255, 106/255), lima = rgb(187/255, 229/255, 41/255)
const verde = rgb(0, 79/255, 0), negro = rgb(0, 0, 0), blanco = rgb(1, 1, 1)
export async function crearCartelPdf({ tipo, centro, enlace, anio, mes, formato = 'carta', red = '', clave = '' }, assets) {
  if (!['encuesta', 'google', 'wifi'].includes(tipo)) throw new Error('Cartel no disponible.')
  if (!FORMATOS[formato]) throw new Error('Elige papel Carta o A4.')
  if (!String(centro || '').trim() || String(centro).length > 120) throw new Error('No se pudo cargar el nombre del centro. Recarga la página.')
  const wifi = tipo === 'wifi' ? datosWifi(red, clave) : null
  let destino = tipo === 'wifi' ? wifi.qr : tipo === 'google' ? enlaceGoogle(enlace) : enlace
  if (tipo === 'encuesta') {
    const url = new URL(enlace)
    if (!['https:', 'http:'].includes(url.protocol) || !/^\/encuesta\/[a-f0-9]{48}$/.test(url.pathname) || url.search || url.hash) throw new Error('Enlace de encuesta inválido.')
    if (!Number.isInteger(anio) || anio < 2026 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error('Periodo inválido.')
  }
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const [regular, bold, logo] = await Promise.all([
    doc.embedFont(assets.regular, { subset: true }), doc.embedFont(assets.bold, { subset: true }), doc.embedPng(assets.logo),
  ])
  const [w, h] = FORMATOS[formato], page = doc.addPage([w, h])
  doc.setTitle(`ALOHA · ${centro} · ${tipo === 'encuesta' ? 'Encuesta de satisfacción' : tipo === 'google' ? 'Reseñas en Google' : 'WiFi gratis'}`)
  doc.setAuthor('ALOHA Mental Arithmetic')
  const caracteres = new Set(regular.getCharacterSet())
  const limpio = texto => {
    const valor = String(texto).replace(/[\r\n\x00-\x1f]/g, ' ')
    if ([...valor].some(c => !caracteres.has(c.codePointAt(0)))) throw new Error('El texto contiene un símbolo que la tipografía ALOHA no puede imprimir. Usa letras, números y signos comunes.')
    return valor
  }
  function texto(value, y, size = 18, font = regular, color = azul, maxWidth = w - 80) {
    const line = limpio(value)
    while (font.widthOfTextAtSize(line, size) > maxWidth && size > 9) size -= 0.5
    if (font.widthOfTextAtSize(line, size) > maxWidth) throw new Error('El texto es demasiado largo para el cartel.')
    page.drawText(line, { x: (w - font.widthOfTextAtSize(line, size))/2, y, size, font, color })
  }
  // Papel blanco y margen de seguridad de 12 mm. El logo se coloca intacto,
  // con su espacio blanco original; el QR no lleva decoración ni superposición.
  page.drawImage(logo, { x: w/2 - 130, y: h - 228, width: 260, height: 260 })
  page.drawRectangle({ x: 36, y: h - 32, width: w - 72, height: 5, color: lima })
  texto(centro.toUpperCase(), h - 164, 14, bold)
  const titulos = tipo === 'encuesta' ? ['Su opinión nos', 'ayuda a mejorar.'] : tipo === 'google' ? ['Cuente su experiencia', 'en Google.'] : ['WiFi gratis.', 'Siéntase en casa.']
  titulos.forEach((line, i) => texto(line, h - 222 - i*44, 38, bold))
  texto(tipo === 'encuesta' ? 'Responda nuestra encuesta de satisfacción.' : tipo === 'google' ? 'Su reseña ayuda a otras familias a conocernos.' : destino ? 'Conéctese a nuestra red de invitados.' : 'Un espacio para acompañar, aprender y conectar.', h - 301, 16)
  if (destino) {
    const matrix = QRCode.create(destino, { errorCorrectionLevel: 'M' }).modules
    const size = tipo === 'wifi' ? 210 : 254, unit = size/(matrix.size+8), x = (w-size)/2, y = h-326-size
    page.drawRectangle({ x, y, width: size, height: size, color: blanco })
    for (let row=0; row<matrix.size; row++) for (let col=0; col<matrix.size; col++) if (matrix.get(row,col)) {
      page.drawRectangle({ x:x+(col+4)*unit, y:y+(matrix.size-row+3)*unit, width:unit, height:unit, color:negro })
    }
  } else {
    // Símbolo WiFi vectorial: arcos concéntricos, legible a distancia.
    for (const r of [48, 83, 118]) {
      page.drawSvgPath(`M ${-r*0.82} ${-r*0.57} Q 0 ${-r*1.43} ${r*0.82} ${-r*0.57}`, {x:w/2, y:h-494, borderWidth:12, borderColor:azul})
    }
    page.drawCircle({ x:w/2, y:h-491, size:11, color:verde })
  }
  if (tipo === 'wifi' && destino) {
    texto(`Red: ${wifi.red}`, h-566, 18, bold)
    texto(wifi.clave ? `Clave: ${wifi.clave}` : 'Red abierta · sin contraseña', h-592, 16)
  }
  page.drawRectangle({ x: 56, y: h-641, width:w-112, height:40, color:lima })
  texto(destino ? tipo === 'wifi' ? 'Escanee el QR para conectarse' : 'Escanee el QR con su cámara' : 'Pida la red y clave en recepción', h-627, 19, bold, verde)
  if (tipo === 'encuesta') {
    const periodo=new Intl.DateTimeFormat('es-PA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(anio,mes-1,1)))
    texto(`Encuesta de ${periodo}`, h-676, 16, bold)
    texto('Use el nombre de su hijo y el teléfono registrado en ALOHA.', h-699, 13)
    texto('Si necesita ayuda, consulte en recepción. Válida durante este mes.', h-719, 12)
  } else if (tipo === 'google') {
    texto('Comparta su opinión con libertad.', h-676, 17, bold)
    texto('Gracias por ser parte de la familia ALOHA.', h-702, 15)
  } else {
    texto('¿Necesita ayuda para conectarse?', h-676, 17, bold)
    texto('Con gusto le atendemos en recepción.', h-702, 15)
  }
  page.drawLine({start:{x:36,y:48},end:{x:w-36,y:48},thickness:1,color:lima})
  texto('ALOHA MENTAL ARITHMETIC', 31, 10, bold)
  return doc.save()
}
