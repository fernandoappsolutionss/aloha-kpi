// Un enlace o un recorrido puede apuntar a controles dentro de un desplegable.
export function revelarDestino(elemento) {
  for (let padre = elemento?.parentElement; padre; padre = padre.parentElement) {
    if (padre.tagName === 'DETAILS') padre.open = true
  }
}
