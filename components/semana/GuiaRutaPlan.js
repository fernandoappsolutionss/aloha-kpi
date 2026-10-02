import Link from 'next/link'

export default function GuiaRutaPlan({ centroId }) {
  return <details className="panel" style={{ padding: 20, marginBlock: 16 }}>
    <summary><strong>Cómo trabajar tu ruta, condición y plan de batalla</strong></summary>
    <p>Producto del centro: niños que asisten, aprenden y permanecen, con crecimiento sostenible. Tu producto y responsabilidad específicos están en el entrenamiento de tu puesto.</p>
    <ol>
      <li><strong>Mira los hechos.</strong> Compara varios cierres de las cinco gráficas. Inscritos no significa inicios de clase; “sin dato” no significa cero. En retiros y facturas vencidas, menos es mejor.</li>
      <li><strong>Explica la condición.</strong> Describe qué cambió y qué causa vas a comprobar. Asigna la condición por la tendencia; afluencia es la condición que a veces llamamos abundancia. La lectura automática es una referencia de gerencia.</li>
      <li><strong>Acuerda el mes.</strong> Define cinco metas alcanzables y justifica cómo acercan al siguiente nivel. Se agrupan los jueves de cierre del mes: saldos al último jueves, movimientos acumulados de esas semanas. El KPI mensual conserva el mes calendario.</li>
      <li><strong>Aplica la fórmula en orden.</strong> Por cada paso escribe una acción concreta, una persona responsable, una fecha y la evidencia que demostraría el resultado. Usa las recomendaciones de la ruta para orientar esas acciones; ajusta tu diagnóstico a los datos.</li>
      <li><strong>Revisa las cuotas.</strong> La propuesta reparte lo que falta del mes entre los cierres restantes. Coordinación aprueba. El ranking reconoce el cumplimiento de las cinco cuotas aprobadas de una semana cerrada.</li>
      <li><strong>Ejecuta y comprueba.</strong> Registra evidencia al realizar la acción. Coordinación la verifica. En el siguiente cierre compara resultados y decide qué mantener o corregir; una tarea marcada no garantiza crecimiento.</li>
    </ol>
    <p><Link href={`/centro/${centroId}/entrenamiento/oficio#actualizacion-semanal`}>Estudiar gráficas, condiciones y práctica del puesto</Link> · <Link href={`/centro/${centroId}/entrenamiento`}>Aprender a usar la plataforma</Link></p>
  </details>
}
