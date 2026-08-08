export async function cargarDatosCuadroExportacion({ estado, snapshot, calcular }) {
  if (estado === 'cerrado') return snapshot?.datos || null
  return calcular()
}

export function grupoPedidoCongelado(pedido, control) {
  if (pedido?.grupoNumero != null) {
    return { id: pedido.grupo_id ?? null, numero: pedido.grupoNumero }
  }
  const fila = (control?.filas || []).find(({ grupo }) =>
    String(grupo?.id ?? '') === String(pedido?.grupo_id ?? '')
  )
  return fila?.grupo || null
}
