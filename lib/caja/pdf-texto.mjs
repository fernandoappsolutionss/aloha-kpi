import { extractText, getDocumentProxy } from 'unpdf'

export async function textoDePdf(bytes) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: false })
  return text.join('\n')
}
