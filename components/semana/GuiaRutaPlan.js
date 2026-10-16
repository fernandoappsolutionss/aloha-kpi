import Link from 'next/link'

export default function GuiaRutaPlan({ centroId }) {
  return <details className="panel" style={{ padding: 20, marginBlock: 16 }}>
    <summary><strong>Cómo trabajar tu ruta, condición y plan de batalla</strong></summary>
    <p>Producto del centro: niños que asisten, aprenden y permanecen, con crecimiento sostenible. Tu producto y responsabilidad específicos están en el entrenamiento de tu puesto.</p>
    <p>Calendario operativo ALOHA: semanas de viernes a jueves, según la zona horaria del centro. Prepara condición y plan antes del viernes a las 10:00. La base teórica usa jueves a las 14:00; aquí trabajamos con el corte civil indicado en la pantalla.</p>
    <p>La condición es del centro. Para evaluar tu puesto, usa su producto y evidencia; el resultado global no sustituye tu desempeño individual.</p>
    <ol>
      <li><strong>Mira los hechos.</strong> Compara varios cierres de las cinco gráficas. Inscritos no significa inicios de clase; “sin dato” no significa cero. En retiros y facturas vencidas, menos es mejor.</li>
      <li><strong>Explica la condición.</strong> Describe qué cambió y qué causa vas a comprobar. Asigna la condición por la tendencia; afluencia es la condición que a veces llamamos abundancia. La lectura automática es una referencia de gerencia.</li>
      <li><strong>Revisa los resultados automáticos.</strong> El resumen toma los registros del mes calendario, sin volver a digitarlos. En el plan de batalla puedes abrir «Metas y cuotas» para acordar objetivos; esas metas agrupan los jueves de cierre del mes.</li>
      <li><strong>Aplica la fórmula en orden.</strong> Por cada paso escribe una acción concreta, una persona responsable, una fecha y la evidencia que demostraría el resultado. Usa las recomendaciones de la ruta para orientar esas acciones; ajusta tu diagnóstico a los datos.</li>
      <li><strong>Revisa las cuotas.</strong> Si hay meta mensual, la propuesta reparte lo que falta entre los cierres restantes; si no, usa las referencias generales. Editar estas metas es opcional para consultar resultados; para el reconocimiento semanal sí se necesitan las cinco cuotas aprobadas. Coordinación aprueba. El ranking reconoce el cumplimiento de las cinco cuotas aprobadas de una semana cerrada.</li>
      <li><strong>Ejecuta y comprueba.</strong> Registra evidencia al realizar la acción. Coordinación la verifica. En el siguiente cierre compara resultados y decide qué mantener o corregir; una tarea marcada no garantiza crecimiento. Los pendientes se recuperan del último plan con trabajo, aunque haya semanas sin plan; conservan su origen. Al cambiar de condición, termina también los pasos anteriores que siguen pendientes.</li>
    </ol>
    <p><Link href={`/centro/${centroId}/entrenamiento/oficio#actualizacion-semanal`}>Estudiar gráficas, condiciones y práctica del puesto</Link> · <Link href={`/centro/${centroId}/entrenamiento`}>Aprender a usar la plataforma</Link></p>
  </details>
}
