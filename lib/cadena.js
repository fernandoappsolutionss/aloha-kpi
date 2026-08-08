// La CADENA de meses del KPI, en un solo lugar.
//
// Regla de Fernando (agosto 2026): «si un administrador indicó que cerró con
// 170 niños, ese debe ser el número con el cual inicia el siguiente mes».
// O sea: el inicio de un mes NO se calcula a partir de ese mes — se ARRASTRA
// del cierre del anterior.
//
// Por qué vive aquí y no dentro de cada action: la regla estaba escrita tres
// veces (guardar KPI, cerrar mes, sincronizar con el cuadro). Se corrigió en
// una y las otras dos siguieron derivando el inicio como
// `continuan + retirados` del propio mes, que le da a cada mes un inicio
// independiente. Con eso, cerrar un mes por error le reescribía el inicio con
// la foto de hoy y partía la cadena sin que nadie lo notara.
import { sql } from './db'

// Cierre del mes anterior de un centro, o null si no hay cadena todavía
// (primer mes del centro). Devuelve también qué mes fue, para poder decirlo
// en pantalla.
export async function cierreMesAnterior(centroId, year, month) {
  const py = month === 1 ? year - 1 : year
  const pm = month === 1 ? 12 : month - 1
  const [prev] = await sql`
    SELECT ninos_final_mes FROM resumen_mes
    WHERE centro_id = ${centroId} AND year = ${py} AND month = ${pm}
  `
  const valor = prev?.ninos_final_mes || 0
  return valor > 0 ? { valor, year: py, month: pm } : null
}

// El inicio que le toca a un mes: el cierre anterior si existe; si no, el
// valor de arranque que traiga quien llama (lo que digitó el administrador en
// el primer mes, o `continuan + retirados` de la foto del cuadro).
export async function inicioDelMes(centroId, year, month, arranque = 0) {
  const arrastrado = await cierreMesAnterior(centroId, year, month)
  return arrastrado ? arrastrado.valor : arranque
}
