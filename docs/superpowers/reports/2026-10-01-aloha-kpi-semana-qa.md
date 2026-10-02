# Semana de cierre ALOHA — aceptación local, 1 de octubre de 2026

## Implementación

Las cinco fases del diseño aprobado están implementadas: Peticiones separadas y FODA retirado; estadísticas de viernes a jueves; condición, fórmula y plan de batalla; cuotas y Reunión semanal; entrenamiento actualizado. El cierre mensual, las metas trimestrales y las primas mantienen su funcionamiento.

Se recuperó el trabajo de la sesión Claude `30f5f50c-6e79-4402-97b9-f4cc506bad84` en el mismo worktree. F1–F3 ya tenían commits; F4 estaba terminada sin commit. Sol completó F5 y los fixes. La auditoría independiente se hizo con gpt-6-astra porque la sesión solicitada de Sonnet había agotado la cuota.

## Verificación

- `npm run build`: PASS, compilación final de Next 15.5.19.
- `npm test`: **1312 pruebas; 1307 PASS y 5 FAIL**, todos de audio. No se deshabilitaron pruebas. Dos fallos de manifiestos completos ya existían por `of-cop-11/12`; los otros tres detectan audios anteriores frente a los guiones nuevos. Detalle y los **11 guiones pendientes** en [audios-pendientes-semana.md](../../entrenamiento/audios-pendientes-semana.md).
- Revisión independiente: tres errores de datos corregidos, fix móvil y entrenamiento aprobados; 75/75 pruebas focales del revisor.
- PostgreSQL real mediante transporte Neon HTTP/WebSocket: **13/13 PASS**. Fixture aislado de tres centros, 466 alumnos y seis roles. Backfill de 105 fotos ejecutado dos veces, seis cierres mensuales conciliados, cierre idempotente, fotos protegidas, ocho aperturas concurrentes sin pendientes duplicados, planes y cuotas persistidos, permisos y error CRM como dato ausente.
- Navegador sobre compilación final: **14/14 PASS**, sin errores JavaScript. Administradora asigna condición y completa objetivos; coordinación aprueba y deja órdenes; cambios de cuota revocan aprobación; gerencia es solo lectura; coach vuelve a sus grupos; accesos cruzados y aprobaciones directas no autorizadas se rechazan. La respuesta de la administradora no contiene lectura automática. Semana y Reunión semanal no desbordan a 390 px. Evidencia: `.scratch/semana-audit/browser-results.json`; recorrido reproducible: `tests/semana-audit/browser.mjs`.

## Correcciones surgidas de la auditoría

1. Se incluyó `ultima_asistencia` en la carga semanal y en la conciliación. La regresión con SQL real ya devuelve 100, igual al mensual, frente a 101 antes del fix.
2. Las clases de prueba se asignan a la semana usando la fecha civil del centro, aunque el evento tenga otra zona horaria.
3. El tablero conserva «Sin dato» en la semana abierta; ya no sustituye un fallo actual por la cifra de la semana anterior.
4. Los campos de cuotas usan `aria-label` directo. Se eliminó el elemento oculto que extendía el documento móvil de 390 a 502 px.

## Decisiones conservadas

- Sin generación pagada de audio ni modificaciones de producción.
- Fuentes HTML/GIFT del manual original se conservan como históricas. El contenido operativo ya no contiene FODA; la nueva fuente vigente es `docs/entrenamiento/fuente/cierre-semanal-aloha.md`.
- El glosario se editó por bloques, sin regenerar su archivo completo; el importador ya divergía de las fuentes.
- Los cálculos usan las reglas mensuales existentes. No se copió código de la plataforma HCA ni se añadieron dependencias.

## Antes de publicar

1. Regenerar y verificar los once audios documentados y resolver los dos manifiestos incompletos previos. Correr de nuevo los tests de audio.
2. Con la conexión productiva correcta, inspeccionar y aplicar las tres migraciones en orden: `node scripts/migrate-semana.mjs`, luego `node scripts/migrate-semana.mjs --apply`. El esquema mensual no se modifica.
3. Ensayar `node scripts/backfill-estadisticas-semana.mjs`; revisar los datos y ejecutar con `--apply` para guardar la historia desde el 13/08/2026.
4. Ejecutar `node scripts/conciliar-poblacion-semanal.mjs` y revisar cada diferencia; ejecutar `node scripts/calibrar-lectura-condicion.mjs` con la historia real antes de habilitar las alertas en el despliegue.
5. Publicar la cadena completa y repetir el recorrido con cuentas reales autorizadas. Producción, calibración real y entrega de audio siguen sin ejecutarse.

Pruebas locales y entorno: [tests/semana-audit/README.md](../../../tests/semana-audit/README.md). No hay credenciales en el repositorio ni en este informe.
