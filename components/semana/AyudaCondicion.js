import Link from 'next/link'
import { nombreCondicion } from '../../lib/condiciones/formulas.mjs'

import { significados as GUIA } from '../../lib/condiciones/ayuda.mjs'

export default function AyudaCondicion({ condicion, centroId }) {
  return <aside className="semana-ayuda" aria-label="Ayuda para elegir la condición">
    <h3>{condicion ? `Entender ${nombreCondicion(condicion)}` : '¿Qué es una condición?'}</h3>
    <p>{GUIA[condicion] || 'Es el nombre de la situación que muestra tu estadística y la guía para decidir cómo mejorarla. No es una calificación de tu valor como persona.'}</p>
    <details><summary>Cómo decidir con datos</summary><ol><li>Mira varios cierres de niños activos, no solo el día de hoy.</li><li>Compara valores y fechas: la inclinación de la gráfica depende de su escala.</li><li>Revisa inscritos, retiros, cobranza y clases de prueba para investigar la causa.</li><li>Escribe los datos, tu razonamiento y qué causa vas a comprobar. La referencia automática orienta; tú fundamentas la decisión.</li></ol><p>Esta explicación orienta la aplicación. Los pasos oficiales de la fórmula se conservan completos debajo.</p></details>
    <Link href={`/centro/${centroId}/entrenamiento/oficio#actualizacion-semanal`}>Estudiar la técnica y practicar con mi puesto →</Link>
  </aside>
}
