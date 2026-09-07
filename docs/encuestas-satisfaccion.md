# Encuestas de satisfacción mensuales

Implementación del 7 de septiembre de 2026. Fernando aprobó **más del 50% de los niños activos** para completar el criterio mensual.

## Flujo y reglas

1. En KPI Mensual → Encuestas, la primera copia o descarga del QR crea la encuesta del centro/mes. Leer la pantalla o hacer el entrenamiento no crea campañas ni registra difusión.
2. Ese primer uso fija el padrón: niños activos o con baja potencial, que ya iniciaron clases y aún no tienen retiro efectivo. Las ventas con inicio futuro no entran. El corte, la cantidad y la meta quedan visibles y fijos durante el mes, aunque después haya altas o retiros.
3. El enlace general y el QR abren un formulario sin cuenta. Nombre completo del niño y teléfono registrado validan pertenencia; el enlace individual permite responder cuando faltan datos. Una respuesta por niño, sin duplicados ni sobrescritura por reintentos. Los enlaces individuales deben entregarse solo a su representante.
4. La copia realizada con éxito o la descarga del QR registra usuario, fecha y tipo de acción. Eso acredita la acción en la plataforma; no certifica la entrega por WhatsApp.
5. Cumplimiento se marca automáticamente cuando existe esa difusión y `respuestas >= floor(activos / 2) + 1`. Con 148 activos, 74 respuestas no completan y 75 sí. El servidor y PostgreSQL protegen el criterio frente a formularios abiertos o guardados manuales.
6. El mes se rige por Panamá. Al cambiar de mes, el enlace anterior deja de aceptar respuestas y el siguiente mes inicia su propio corte, enlace, respuestas y difusión. El histórico conserva resultados. El panel se actualiza cada 30 segundos y al recuperar foco; el criterio se persiste en la transacción de respuesta o difusión.
7. Satisfacción es el porcentaje de respuestas generales 4 o 5 entre quienes respondieron; participación es respuestas entre activos del corte. FODA recibe un resumen mensual, sin reemplazar los cuadrantes escritos por el centro.

## Relación con el manual

Fuentes locales: `docs/entrenamiento/fuente/curso-1-administradora.html`, apartado Cierre de Nivel, y `drills-administradora.html`, maniobra de encuestas. El procedimiento indica enviar individualmente, pedir respuesta antes de salir, procesar las opiniones y llevarlas al FODA. El drill exige más de la mitad del grupo; por instrucción de Fernando se adapta a todos los activos del corte mensual del centro.

El material consultado **no contiene el cuestionario original**. Esta versión propone cuatro valoraciones de 1 a 5 (general, avance del niño, coach, atención/comunicación) y dos comentarios opcionales (mejorar y destacar). No se presenta como transcripción literal. El formulario es confidencial, no anónimo: hay validación por ficha y el personal autorizado ve quién respondió.

## Entrenamiento y voz

Décimo recorrido, seis pasos de observación y tres preguntas. Incluye introducción y voz por paso, más la corrección del antiguo audio «KPI Semanal» a «KPI Mensual». Ocho MP3 nuevos, 2.883 caracteres generados con el clon disponible de Fernando y receta `guia`: pausas de 0,3–0,5 s, frases cortas, velocidad 1. Los audios anteriores se conservan.

Los archivos nuevos usan hashes reales en `audio-manifest-actualizaciones.json`. `npm run entrenamiento:audio:actualizaciones` revisa pendientes sin generar; `-- --generar` requiere la credencial existente y genera solo piezas faltantes o cuyo guion cambió. El último inventario dejó cero pendientes y ocho reutilizables. La naturalidad final queda sujeta a la escucha de Fernando; se verificó reproducción y decodificación completas.

## Activación

Esta rama no aplica cambios automáticamente a producción. Antes de desplegar:

1. En el entorno del proyecto, ejecutar `npm run db:migrate:encuestas`: muestra el número de meses desde septiembre de 2026 y cuántos tienen el criterio marcado, sin modificar nada.
2. Conservar una copia privada de `cumplimiento` y `trimestres` o un punto de restauración antes de aplicar. La migración cambia el criterio de encuestas desde septiembre de 2026 a cálculo automático: los «sí» manuales sin evidencia vuelven a «no». Los criterios anteriores al lanzamiento y el resto del checklist se conservan.
3. Ejecutar `npm run db:migrate:encuestas -- --apply`. La migración es transaccional y repetible, usa candado y timeout de 10 segundos. Crea cinco tablas y las funciones/trigger de sincronización. No crea encuestas ni copia datos de alumnos hasta la primera acción de un centro.
4. Desplegar la rama aprobada y verificar acceso, copia/QR, formulario público y audio. No enviar respuestas ficticias a centros reales para probar.

Las instalaciones nuevas necesitan `db/schema.sql` y esta migración separada. No pasar este SQL por el divisor de punto y coma de `scripts/migrate.mjs`: contiene funciones PL/pgSQL.

Si hay que retirar la función, ocultar sus accesos y detener nuevas respuestas manteniendo tablas y evidencia. Un rollback de código no restaura valores manuales: para ello se necesita la copia previa y una decisión explícita. No eliminar respuestas de familias.

## Verificación

- Suite final del proyecto: 1.044 pruebas aprobadas y compilación de producción correcta, incorporando main `74127eb` (ocupación de coaches y salones).
- PostgreSQL 16 local ficticio: 17 pruebas aprobadas, incluyendo apertura concurrente, duplicados, datos futuros/retiros efectivos, umbral exacto, falta de difusión, protección de guardado, histórico de agosto, mes nuevo, repetición de migración y límite de intentos.
- Chrome con 148 niños ficticios: 74 respuestas permanecieron pendientes; la respuesta 75 marcó Cumplimiento sin pulsar Guardar. Copia y descarga registradas; PNG real de 1.200 × 1.200 decodificado al enlace correcto. Flujo general e individual completado; formulario y panel revisados a 390 px sin desbordamiento horizontal; FODA mostró los resultados.
- Audio de introducción reproducido completo en Chrome (38,27 s). Los ocho MP3 decodificados y sus duraciones verificadas. Los seis pasos del recorrido y sus tres respuestas completaron el módulo y guardaron progreso en la cuenta ficticia.

Todo lo anterior utilizó datos ficticios, sin respuestas, migraciones ni cambios de cumplimiento en producción.
