# Encuestas de satisfacción mensuales

Implementación inicial del 7 de septiembre de 2026. El 12 de septiembre Fernando cambió la meta a **30% o más de los niños activos**, con difusión registrada. La nueva regla aplica a campañas nuevas y al mes vigente abierto al activar la migración. Las campañas históricas y los centros con el KPI cerrado conservan su regla y resultados anteriores.

## Flujo y reglas

1. En KPI Mensual → Encuestas, la primera copia o descarga del QR crea la encuesta del centro/mes. Leer la pantalla o hacer el entrenamiento no crea campañas ni registra difusión.
2. Ese primer uso fija el padrón: niños activos o con baja potencial, que ya iniciaron clases y aún no tienen retiro efectivo. Las ventas con inicio futuro no entran. El corte, la cantidad y la meta quedan visibles y fijos durante el mes, aunque después haya altas o retiros.
3. El enlace general y el QR abren un formulario sin cuenta. Nombre completo del niño y teléfono registrado validan pertenencia; el enlace individual permite responder cuando faltan datos. Una respuesta por niño, sin duplicados ni sobrescritura por reintentos. Los enlaces individuales deben entregarse solo a su representante.
4. La copia realizada con éxito o la descarga del QR registra usuario, fecha y tipo de acción. Eso acredita la acción en la plataforma; no certifica la entrega por WhatsApp.
5. Cumplimiento se marca automáticamente cuando existe esa difusión y `respuestas >= ceil(activos * 3 / 10)`. Con 100 activos, 30 respuestas ya completan; con 148 activos, 44 no completan y 45 sí. Cero activos nunca completa. La columna `regla_participacion` conserva `50-estricto` en los históricos anteriores al cambio; sus paneles y FODA siguen calculando con esa regla. El servidor y PostgreSQL protegen el criterio frente a formularios abiertos o guardados manuales.
6. El mes se rige por Panamá. Al cambiar de mes, los enlaces mensuales e individuales anteriores dejan de aceptar respuestas; el enlace permanente del centro abre el periodo vigente. El siguiente mes inicia su propio corte, token de campaña, respuestas y difusión. El histórico conserva resultados. El panel se actualiza cada 30 segundos y al recuperar foco; el criterio se persiste en la transacción de respuesta o difusión.
7. Satisfacción es el porcentaje de respuestas generales 4 o 5 entre quienes respondieron; participación es respuestas entre activos del corte. FODA recibe un resumen mensual, sin reemplazar los cuadrantes escritos por el centro.

## Relación con el manual

Fuentes locales: `docs/entrenamiento/fuente/curso-1-administradora.html`, apartado Cierre de Nivel, y `drills-administradora.html`, maniobra de encuestas. El procedimiento indica enviar individualmente, pedir respuesta antes de salir, procesar las opiniones y llevarlas al FODA. El drill original exige más de la mitad del grupo al cierre de nivel. Se conserva como fuente literal. La meta mensual de la plataforma es una regla independiente aprobada por Fernando: 30% o más de todos los activos del corte mensual del centro.

El material consultado **no contiene el cuestionario original**. Esta versión propone cuatro valoraciones de 1 a 5 (general, avance del niño, coach, atención/comunicación) y dos comentarios opcionales (mejorar y destacar). No se presenta como transcripción literal. El formulario es confidencial, no anónimo: hay validación por ficha y el personal autorizado ve quién respondió.

## Entrenamiento y voz

Décimo recorrido, seis pasos de observación y tres preguntas. Incluye introducción y voz por paso, más la corrección del antiguo audio «KPI Semanal» a «KPI Mensual». Ocho MP3 nuevos, 2.883 caracteres generados con el clon disponible de Fernando y receta `guia`: pausas de 0,3–0,5 s, frases cortas, velocidad 1. Los audios anteriores se conservan.

Los archivos nuevos usan hashes reales en `audio-manifest-actualizaciones.json`. `npm run entrenamiento:audio:actualizaciones` revisa pendientes sin generar; `-- --generar` requiere la credencial existente y genera solo piezas faltantes o cuyo guion cambió. El inventario inicial dejó cero pendientes y ocho reutilizables. Con el cambio del 12 de septiembre, quedan cinco locuciones pendientes de regenerar: introducción de Encuestas, pasos en-3 y en-5, paso cu-5 de Cumplimiento y ayuda de encuestas de satisfacción. Sus grabaciones antiguas se conservan con sus hashes reales, pero quedan deshabilitadas en el catálogo y en la ayuda para impedir que reproduzcan el 50%. Los textos y el quiz ya enseñan 30%. Las pruebas comprueban explícitamente estas cinco excepciones y exigen grabaciones vigentes para todos los demás clips. No se consumió ElevenLabs para este cambio. La naturalidad final queda sujeta a la escucha de Fernando; se verificó reproducción y decodificación completas.

## Activación del cambio a 30%

Esta rama no aplica cambios automáticamente a producción. En una instalación que ya tiene encuestas:

1. Ejecutar `node scripts/migrate-encuestas-30.mjs` para revisar el número de campañas y las vigentes abiertas, en solo lectura.
2. Ejecutar `node scripts/migrate-encuestas-30.mjs --apply` al activar el cambio aprobado. Es transaccional, repetible y usa candado y timeout. Guarda la regla anterior de cada campaña, toma el mismo candado mensual que el cierre KPI, convierte solo el mes vigente de Panamá que siga abierto y vuelve a evaluar su evidencia ya recibida dentro de la misma transacción. No modifica meses anteriores, cortes ni respuestas. Los centros que cerraron su KPI conservan su regla; tampoco admiten respuestas o difusión nuevas.
3. Desplegar el código después de la migración. Verificar el umbral en el panel y en Cumplimiento, y que las cinco locuciones retiradas no se reproduzcan. Para completar las locuciones, usar el generador incremental con la voz aprobada cuando se autorice su consumo; el generador sustituye el registro retirado únicamente al verificar el MP3 nuevo.

Fecha de vigencia solicitada: septiembre de 2026. Si se activa en otro mes, la migración adapta únicamente ese mes abierto y preserva septiembre como histórico. Para una instalación nueva, aplicar primero la migración inicial y después la de 30%. No volver a aplicar la migración inicial a una instalación ya actualizada, porque redefine el umbral original.

## Activación original de septiembre (referencia histórica)

Pasos de la instalación inicial del 7 de septiembre, conservados como referencia:

1. En el entorno del proyecto, ejecutar `npm run db:migrate:encuestas`: muestra el número de meses desde septiembre de 2026 y cuántos tienen el criterio marcado, sin modificar nada.
2. Conservar una copia privada de `cumplimiento` y `trimestres` o un punto de restauración antes de aplicar. La migración cambia el criterio de encuestas desde septiembre de 2026 a cálculo automático: los «sí» manuales sin evidencia vuelven a «no». Los criterios anteriores al lanzamiento y el resto del checklist se conservan.
3. Ejecutar `npm run db:migrate:encuestas -- --apply`. La migración es transaccional y repetible, usa candado y timeout de 10 segundos. Crea cinco tablas y las funciones/trigger de sincronización. No crea encuestas ni copia datos de alumnos hasta la primera acción de un centro.
4. Desplegar la rama aprobada y verificar acceso, copia/QR, formulario público y audio. No enviar respuestas ficticias a centros reales para probar.

Las instalaciones nuevas necesitan `db/schema.sql` y esta migración separada. No pasar este SQL por el divisor de punto y coma de `scripts/migrate.mjs`: contiene funciones PL/pgSQL.

Si hay que retirar la función, ocultar sus accesos y detener nuevas respuestas manteniendo tablas y evidencia. Un rollback de código no restaura valores manuales: para ello se necesita la copia previa y una decisión explícita. No eliminar respuestas de familias.

## Verificación del cambio del 12 de septiembre

- 27 pruebas focales correctas de cálculo, ayudas, entrenamiento y protección de audios desactualizados.
- PostgreSQL 16 desechable: 21 pruebas correctas. Incluyen 3 de 10 como umbral exacto, migración repetible, preservación de campañas pasadas y de un centro ya cerrado, rechazo de respuestas/difusión al cierre, cierre concurrente con respuestas y con la migración, alta y cambios manuales de agosto cerrado, guardado automático, difusión obligatoria, respuestas idempotentes y renovación del QR por mes.
- Las pruebas usan datos ficticios y no modifican producción. La compilación y suite completa se verifican con el conjunto de cambios de la rama.

## Verificación original del 7 de septiembre (referencia histórica)

- Suite final del proyecto: 1.044 pruebas aprobadas y compilación de producción correcta, incorporando main `379fd75` (contadores de plataforma y oficio). Se ajustó el contador compacto a 12 px para cumplir el mínimo de lectura existente.
- PostgreSQL 16 local ficticio: 17 pruebas aprobadas, incluyendo apertura concurrente, duplicados, datos futuros/retiros efectivos, umbral exacto, falta de difusión, protección de guardado, histórico de agosto, mes nuevo, repetición de migración y límite de intentos.
- Chrome con 148 niños ficticios: 74 respuestas permanecieron pendientes; la respuesta 75 marcó Cumplimiento sin pulsar Guardar. Copia y descarga registradas; PNG real de 1.200 × 1.200 decodificado al enlace correcto. Flujo general e individual completado; formulario y panel revisados a 390 px sin desbordamiento horizontal; FODA mostró los resultados.
- Audio de introducción reproducido completo en Chrome (38,27 s). Los ocho MP3 decodificados y sus duraciones verificadas. Los seis pasos del recorrido y sus tres respuestas completaron el módulo y guardaron progreso en la cuenta ficticia.

Las pruebas funcionales utilizaron datos ficticios. Tras autorización expresa de Fernando para avanzar y fusionar a main, se aplicó la migración productiva el 7 de septiembre: cinco tablas creadas, 110 checklists históricos y todos sus valores conservados, cero campañas creadas. Se respaldaron cumplimiento y trimestres antes y después. No había registros desde septiembre que requirieran cambiar la marca manual.

## Cartel permanente

El enlace general nuevo usa `/encuesta/centro/[token]` y abre la campaña vigente según Panamá. El primer acceso público del mes puede fijar el padrón; las siguientes visitas lo reutilizan. El PDF de recepción no lleva fecha y se imprime una vez. Cada mes se conserva el requisito de difusión registrada (copiar el mismo enlace al invitar a las familias) y 30% o más del nuevo corte. Los enlaces individuales y las URLs mensuales antiguas siguen cerrando al terminar su mes. Los periodos y respuestas anteriores se conservan.
