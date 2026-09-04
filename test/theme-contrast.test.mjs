import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8')
const luminance=hex=>hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
test('texto secundario contrasta con las superficies sólidas de ambos temas',()=>{
  for(const selector of [':root','[data-theme="dark"]']) {
    const block=css.slice(css.indexOf(selector+' {')).split('}')[0]
    const token=name=>block.match(new RegExp('--'+name+':\\s*#([a-fA-F0-9]{6})'))?.[1]
    for(const surface of ['bg','surface-1','surface-2','surface-3']) {
      const a=luminance(token('text-dim')),b=luminance(token(surface))
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,selector+' '+surface)
    }
  }
})
test('controles nativos y chrome del navegador siguen el tema elegido',()=>{
  assert.match(css, /color-scheme:\s*light/)
  assert.match(css, /color-scheme:\s*dark/)
  const toggle=readFileSync(new URL('../components/ThemeToggle.js',import.meta.url),'utf8')
  assert.match(toggle,/theme-color/)
})
