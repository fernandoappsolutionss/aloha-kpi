import original from './audio-manifest.json'
import actualizaciones from './audio-manifest-actualizaciones.json'
import { audioDisponible } from './audio-disponible.mjs'
export default Object.fromEntries(Object.entries({...original,...actualizaciones}).map(([clave, entrada]) => [clave, audioDisponible(entrada)]))
