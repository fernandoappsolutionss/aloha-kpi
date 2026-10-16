# Entrenamiento, gráficas y planificación semanal

La lectura automática es una referencia operativa ALOHA. Requiere cuatro cierres consecutivos válidos; un historial incompleto no significa Inexistencia. Una subida que aún no supera el máximo de la historia continua disponible se presenta como recuperación y requiere contexto. Los umbrales existentes de ±2% y tres semanas se explicitan como adaptación, sin atribuirlos a la base teórica. La condición la sigue asignando una persona autorizada con fundamento.

Las gráficas de magnitudes no negativas parten de cero y muestran su rango. El máximo sigue adaptándose a los datos; por eso la interfaz advierte que el ángulo visual no asigna condición ni debe compararse entre escalas distintas.

El curso de semana y los recorridos explican los campos reales de evidencia esperada, evidencia del resultado y verificación, además de la edición opcional de metas y cuotas. Los audios modificados se regeneraron y sus manifiestos coinciden con el texto. Se mantiene la semana civil viernes–jueves y el plazo del viernes a las 10:00 en la zona del centro; se explica la diferencia respecto al jueves a las 14:00 de la base teórica. No se recalculan cierres históricos ni se invalidan estudios aprobados.

## Continuidad y ejecución

- Al abrir un plan, se busca el último plan anterior con condición u objetivos; una semana ausente o un contenedor vacío no corta el arrastre. La reparación se ejecuta una vez por versión y no duplica copias existentes.
- Los pendientes conservan fórmula, cierre y paso originales cuando esa información está disponible. Los pasos sin acción se conservan como recordatorios editables.
- Al cambiar de condición, las acciones previas pasan a Urgentes conservando sus resultados y verificaciones. Los pasos faltantes tampoco se pierden.
- Se pueden preparar todos los pasos, pero para registrar la ejecución de uno deben estar realizadas con evidencia todas las acciones anteriores. La fórmula nueva espera a los pendientes identificados de la anterior. El servidor aplica las mismas reglas que la interfaz bajo bloqueo del plan.
- La verificación de coordinación es posterior al registro del resultado; preparar el plan, realizarlo y verificarlo son estados diferentes.

El arrastre sigue siendo una copia al abrir/reparar el plan: no es sincronización continua con posteriores ediciones de semanas pasadas. No se inventa el origen de acciones antiguas que ya lo perdieron. No se asignan condiciones individuales a partir de la estadística del centro.

## Despliegue y pruebas

Aplicar `node scripts/migrate-semana-continuidad.mjs --apply` antes del despliegue. La migración añade `arrastre_version` y `origen_formula`; no borra objetivos. Se despliega junto con la migración de reinicios de oficio. Ante rollback, conservar estas columnas y los archivos históricos.

Validación del 16 de octubre de 2026:

- 1.457 pruebas unitarias aprobadas y compilación Next correcta.
- 3 pruebas PostgreSQL de continuidad: semanas omitidas y apertura concurrente, orden de ejecución y aislamiento por centro, cambio de fórmula incompleta con conservación de evidencia.
- 9 pruebas PostgreSQL de reinicio: permisos, aislamiento, archivo, repetición segura, rollback, concurrencia y nuevo ciclo.
- Navegador sobre aplicación compilada y base local sintética: recuperación 90→94 frente a 100, escala visible, bloqueo/desbloqueo de pasos, verificación, cambio de condición y trazabilidad, cancelación, reinicio e historial a 390px.

Para repetir las pruebas SQL se requiere una base local exclusiva cuyo nombre termine en `_test`, indicada en `ALOHA_SEMANA_TEST_DATABASE_URL` o `ALOHA_REINICIOS_TEST_DATABASE_URL`. Nunca toman automáticamente la URL de producción.
