# Auditoría local de Semana — 2026-10-01

`integracion.mjs` ejecuta servicios de F2/F3/F4 contra PostgreSQL real mediante el mismo transporte Neon HTTP/WebSocket de la aplicación. Solo acepta la base desechable `aloha_audit`, host interno `aloha-hca-pg`, los tres centros Demo y los endpoints locales. No llama al CRM externo.

```sh
source /private/tmp/aloha-semana-qa-20261001/env.sh
node --experimental-default-type=module tests/semana-audit/integracion.mjs
```

Se usa el modo ESM nativo de Node porque `tsx` presenta incompatibilidad de imports nombrados `.mjs` → `.js` en este repo sin `type: module`. No requiere instalar paquetes ni cambiar configuración de la aplicación.

El entorno privado y las credenciales están en `/private/tmp/aloha-semana-qa-20261001/`, con permisos de carpeta `0700` y archivos `0600`. No copiar secretos al repo. PostgreSQL directo: `127.0.0.1:5442`; HTTP Neon: `127.0.0.1:4447/sql`; WebSocket: `127.0.0.1:5437`. Los dos transportes de la aplicación usan el host interno `aloha-hca-pg:5432` en la URL, porque el proxy WebSocket resuelve dentro de Docker.

Fixture recuperado: 3 centros ficticios (1 Norte, 2 Sur, 10 Valencia), 466 alumnos, 205 eventos, 42 grupos y seis roles (Master, gerencia, coordinador, administradora, asistente, coach). Solo fue necesario aplicar `2026-10-01-cuotas-semana.sql`.

## Alcance y efectos reproducibles

- Backfill real dos veces: 105 filas = 7 cierres × 3 centros × 5 estadísticas, sin duplicados.
- Conciliación al 31/08 y 30/09 contra `resumen_mes`, balance mensual vivo y cálculo semanal.
- Cron del viernes: cierra 15 estadísticas y una segunda ejecución no vuelve a cerrar. Luego restaura el jueves real del fixture.
- Fotos cerradas protegidas; recálculo explícito permitido y restaurado.
- Permisos de los seis roles con usuarios leídos desde PostgreSQL.
- Planes centro 2, cierres 27/08 y 03/09: condición, completitud, edición, conservación al cambiar condición, aislamiento por centro y eliminación.
- Ocho aperturas simultáneas del plan siguiente: un único conjunto de pendientes.
- Respuesta de servicio sin lectura automática/discrepancia para administradora y asistente.
- Cuotas centro 10, semana 01/10: propuesta, aprobación, conservación al guardar mismo valor, revocación al cambiar y validación.
- Orden del coordinador persistida y protegida contra edición como objetivo; se elimina la orden de prueba.
- Regresión de `ultima_asistencia` ejecutada mediante SQL real en tablas temporales de una sola conexión.
- Clases de prueba con CRM inyectado: fronteras jueves/viernes distintas en Panamá y Caracas, clases canceladas/borradores excluidas y fallo CRM como `NULL` con explicación.

No ejecutar simultáneamente el caso de cron y aserciones de navegador sobre semana abierta/cerrada: el caso modifica y restaura brevemente el estado. Planes y cuotas del navegador del centro 1 quedan fuera de las mutaciones de integración.

## Conciliación del fixture

| Centro | Mes | Semanal al fin de mes | Balance mensual | Fixture |
|---|---|---:|---:|---:|
| Norte | 2026-08 | 140 | 140 | 140 |
| Norte | 2026-09 | 150 | 150 | 150 |
| Sur | 2026-08 | 135 | 135 | 135 |
| Sur | 2026-09 | 128 | 128 | 128 |
| Valencia | 2026-08 | 92 | 92 | 92 |
| Valencia | 2026-09 | 92 | 92 | 92 |

Resultados detallados: `/private/tmp/aloha-semana-qa-20261001/integracion-resultados.json` y `backfill.log`. El resultado JSON y el código de salida constituyen la evidencia vigente; el primer pase encontró la regresión conocida de `ultima_asistencia` (niño sin asistencia cuyo inicio se trasladó a octubre contado erróneamente en septiembre).

## Resultado final y navegador

Tras corregir las regresiones: **13/13 comprobaciones SQL y 14/14 de navegador PASS**. Build final correcto; suite general 1307/1312, con cinco fallos de audio documentados y activos.

Con la app local iniciada contra este entorno (puerto 4577), ejecutar:

```sh
source /private/tmp/aloha-semana-qa-20261001/env.sh
node tests/semana-audit/browser.mjs
```

El navegador usa por defecto `http://localhost:4577` para conservar el origen de las redirecciones de Next. `SEMANA_QA_URL` permite otro origen local; `SEMANA_QA_CREDENTIALS` cambia el archivo privado de credenciales. Crea objetivos y órdenes ficticios en el centro 1 y comprueba guardado, recarga, cuotas, permisos de servidor y móvil de 390 px. Evidencia y capturas en `.scratch/semana-audit/`; no guarda contraseñas ni cookies. El coach no opera Semana: la redirección a sus grupos es el resultado esperado.
