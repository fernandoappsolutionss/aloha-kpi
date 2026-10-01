# Cierre funcional de Semana, Ruta y Ranking

Fecha: 2026-10-01. Base: `0ca5c0c`. Rama: `codex/hca-cierre-funcional`.
Continuación de las fases F1–F5; producción sin modificar.

## Resultado

- Fernando confirmó **cumplir las cinco cuotas** para obtener reconocimiento.
- Ranking usa la última semana cerrada y exige cinco cuotas aprobadas y cinco datos válidos de esa misma semana. No confunde cero con ausencia ni cuotas propuestas con aprobadas. Respeta las estadísticas inversas.
- Los centros que incumplen siguen visibles, con cada resultado, cuota y faltante/exceso. Los que no pueden evaluarse aparecen sin clasificar. Las medallas se reservan a los tres primeros puestos que cumplen las cinco.
- Ruta y Plan estratégico operan sobre las mismas recomendaciones. Desde Semana se puede marcar una acción realizada, posponerla siete días o descartarla. Completar una tarea no certifica el resultado: conserva la verificación del motor de crecimiento.
- Reunión distingue condición asignada, estado del plan y lectura automática. Esta última sigue oculta para administradora y asistente.
- El enlace de Ruta al plan espera la carga de los datos antes de desplazar la pantalla.

Decisión registrada: se desempata por superación relativa de la cuota de niños activos; si ambas métricas son iguales se comparte puesto. Evita premiar solo el tamaño del centro. No altera metas, semáforos, primas ni cierre mensual. Sin nuevas dependencias o migraciones.

## Evidencia

| Verificación | Resultado |
| --- | --- |
| Tests nuevos de ranking | RED 0/5 antes de implementar; GREEN 5/5 |
| Cuotas, ranking, plan, interfaz, crecimiento y notificaciones | 47/47 PASS |
| Suite completa | 1312/1317 PASS; cinco fallos de audio ya presentes en la base |
| Build de Next.js después del ajuste del enlace | PASS |
| PostgreSQL real, `tests/semana-audit/cierre-funcional.mjs` | 2/2 PASS; transacciones con rollback por defecto |
| Ranking con datos ficticios | Norte 5/5, 100%, medalla; Sur 1/5, 20%, sin medalla; Valencia sin cuotas aprobadas, sin clasificar |
| Plan → Ruta | Completar y posponer desde Semana se reflejan en la misma recomendación de Ruta y sobreviven a recargar |
| Permisos en navegador | Gerencia de solo lectura sin acciones; administradora con seguimiento, sin aprobar cuotas ni ver lectura automática |
| Acceso directo al plan | RED: posición 2434 px fuera de pantalla; GREEN: posición 0,047 px tras carga |
| Móvil 390 × 844 | Plan y Ranking sin desborde horizontal; detalle de cuotas accesible |
| Revisión independiente del delta funcional | Sin hallazgos críticos, importantes o menores confirmados; 19/19 tests del revisor |

Recorrido de navegador realizado mediante CUA sobre compilación local, con roles Master, gerencia y administradora. Se agregó la regresión del acceso directo al reproductor `tests/semana-audit/browser.mjs`; ese script completo no se volvió a ejecutar en esta iteración. La auditoría previa F1–F5 conserva sus 13/13 casos SQL y 14/14 de navegador.

Evidencia local: `/tmp/aloha-cierre-tests.log`, `/tmp/aloha-cierre-focal.log`, `/tmp/aloha-cierre-build.log`, `/private/tmp/aloha-cierre-ranking.png` y `/private/tmp/aloha-cierre-ranking-mobile.png`. No contienen credenciales. La demo usa únicamente tres centros ficticios en la base local desechable.

## Pendientes para publicar

1. Audios: el inventario en seco detecta **20 clips pendientes**, los 11 de F5 más 9 faltantes anteriores (17 oficio/guía y 3 actualizaciones). La revisión automática bloqueó la llamada a ElevenLabs por falta de autorización específica para ese destino y esos guiones; se solicitó autorización a Fernando. No se generó ni envió audio. Los cinco tests siguen activos.
2. Revisar y aplicar las tres migraciones preparadas, cargar historia desde el 13/08/2026, conciliar y calibrar con datos reales.
3. Integrar y publicar la cadena completa de PR, seguida de comprobación productiva. F4 corrige F2: no publicar F2 aislada como resultado final.

Los pendientes de audio y producción no impiden revisar el flujo funcional en `http://localhost:4577/dashboard/ranking` y `http://localhost:4577/centro/1/semana#plan-batalla`.
