# Consistencia de KPI y alertas de datos · 7 de septiembre de 2026

La auditoría abarcó seis centros y 118 períodos registrados. Se cotejaron 96 períodos con sus archivos KPI y los listados recientes de Cuadro de Negocio. Encontró 29 diferencias entre retiros y motivos, 15 campos históricos mal cargados en siete períodos y tres retiros duplicados. Algunas diferencias ya existen en las fuentes originales o en versiones contradictorias y requieren conciliación; no se convierten automáticamente en correcciones.

Este documento público no incluye fichas de niños, respaldos de producción, el manifiesto operativo ni los datos mensuales de cada centro. El informe privado y el CSV de los 118 meses se conservan con la evidencia fuente de la auditoría.

## Comportamiento publicado

- La ausencia de inscripciones individuales solo genera `cp_classification_incomplete` desde septiembre de 2026. Los KPI anteriores no requieren reconstrucción retroactiva de fichas. Se conserva la clasificación individual cuando sí existe y el valor mensual declarado cuando la cobertura es incompleta; la exención histórica no inventa cobertura.
- La alerta se llama «Inscripciones sin vinculación completa». Distingue el tipo de inscripción (clase de prueba/directa) del canal de captación (marketing/referido/etc.) y enlaza a las fichas en Grupos.
- La capacidad se presenta como «Capacidad estimada: … cupos». Explica que son cupos totales calculados por grupos y que falta contrastarlos con salones, horarios y coaches. Conserva el límite real de confianza mientras la plataforma no tenga un mecanismo para validarla.

## Reparación de datos separada del despliegue

`scripts/apply-audit-repair.mjs` recibe un manifiesto privado como argumento. Nunca se ejecuta durante build, deploy, carga de páginas ni migraciones automáticas.

Por defecto usa una transacción de solo lectura. `--apply` requiere autorización operativa específica y realiza una transacción serializable: bloquea las filas, verifica todos los valores esperados, guarda un respaldo local exclusivo con permisos 0600 y `fsync`, y solo después escribe. Si una guarda o una escritura falla, revierte toda la transacción. La lista de tablas, claves y campos permitidos está restringida. Un segundo intento sobre datos ya modificados falla por las guardas, en lugar de repetir efectos.

El manifiesto preparado distingue errores de carga respaldados, retiros repetidos y reincorporaciones administrativas intermedias. Corrige de manera conjunta motivos, celdas semanales, saldo y snapshot cuando hay evidencia suficiente. Las discrepancias de versiones, fechas o listas incompletas permanecen pendientes de conciliación.

### Recuperación

El respaldo contiene el manifiesto y las filas completas anteriores a cualquier escritura. Conservarlo en almacenamiento privado junto al resultado de ejecución. Ante un resultado incierto, releer las filas afectadas antes de reintentar. Una reversión debe comprobar que los valores actuales siguen siendo los producidos por la reparación; no restaurar ciegamente un respaldo sobre cambios posteriores.

## Validación

- Pruebas del corte agosto/septiembre de 2026, años previos y posteriores, resolución de la alerta y meses sin ventas.
- Comparación de ambas versiones del motor sobre la misma captura de 118 períodos: valores calculados intactos, con cambio limitado a esta alerta histórica y su texto.
- Pruebas de alcance por fila, tablas/campos permitidos, `null` distinto de cero, concurrencia, orden del respaldo, modo solo lectura y rollback.
- La ejecución de datos requiere su propia simulación y verificación posterior; un PR fusionado no acredita por sí solo que se haya reparado producción.
