// Componente de servidor solo para fijar `maxDuration`: la publicación en Zoho
// se hace desde una server action de esta ruta y va en tandas de ~45 s (un POST
// por movimiento, espaciados para no chocar con el límite por minuto de Zoho).
// Con el tope por defecto la función se cortaría a mitad de la tanda.
import VistaCentro from '../../../../components/conciliacion/VistaCentro'

export const maxDuration = 60

export default async function ConciliacionCentroPage({ params }) {
  const { id } = await params
  return <VistaCentro centroId={id} />
}
