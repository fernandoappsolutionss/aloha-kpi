// Una grabación retirada por cambio de contenido no debe reproducirse ni
// volver al clip anterior. Su guion escrito sigue disponible en el recorrido.
export function audioDisponible(entrada) {
  return entrada?.deshabilitado ? null : entrada ?? null
}
