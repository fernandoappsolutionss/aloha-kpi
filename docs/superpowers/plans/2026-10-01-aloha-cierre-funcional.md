# Cierre funcional: Ruta, Plan, Cuotas y Ranking

Continuación aprobada por Fernando en el chat del 2026-10-01 ("ok avanzamos"). Base: `0ca5c0c`, en el mismo worktree aislado. Especificación: este documento complementa el diseño `2026-10-01-aloha-kpi-semana-hca-design.md`.

## Contrato

- Ranking semanal por las cuotas aprobadas para la última semana cerrada de cada centro, respetando zona civil y permisos existentes. No modifica metas, semáforo ni pago mensual.
- Para clasificar se requieren las cinco cuotas aprobadas y cinco estadísticas cerradas con valor válido. Fernando confirmó explícitamente «Cumplir las cinco cuotas». Propuestas, datos ausentes y semanas abiertas no obtienen porcentaje ni medalla. El detalle explica exactamente qué falta.
- Orden: porcentaje de cuotas cumplidas; empate por superación relativa de la cuota principal de niños activos. Igualdad en ambos comparte puesto. Medallas solo para puestos 1–3 que cumplen las cinco; los demás siguen visibles.
- Ruta alimenta Plan estratégico con las mismas recomendaciones, sin copiarlas a objetivos. Desde Semana se podrá marcar realizada, posponer siete días o descartar mediante la Server Action existente, con los mismos permisos. Una tarea realizada no equivale a resultado logrado.
- Rótulos distintos: condición asignada, estado del plan, lectura automática. Acceso directo al plan de batalla desde Semana y Ruta.
- Reutilizar componentes, datos, reglas y estilos. Sin dependencias ni migraciones nuevas. Mantener los cinco fallos de audio preexistentes identificados; audios y producción pertenecen al cierre de publicación pendiente.

## Review Focus

Datos ausentes frente a cero; cuotas propuestas o de otra semana; fotos todavía abiertas; estadísticas inversas y cuota cero; ranking sin ganadores y empates; permisos/alcance de centros; seguimiento desde Semana que actualiza la misma fila de Ruta y respeta fallos de recálculo; no alterar cierre/pago mensual.

### Task 1: Implementar y verificar el cierre funcional

1. Añadir casos ejecutables al test de cuotas para clasificación completa/incompleta, inversas, cero, semana exacta, orden y empates. Ejecutar RED.
2. Implementar evaluación y orden en `lib/cuotas-semana.mjs`, exponerlos con el tablero existente y consumirlos en Ranking. Ejecutar GREEN.
3. Reutilizar `updateGrowthRecommendation` en PlanSemana, feedback de guardado y enlaces entre Ruta y Plan. Aclarar rótulos en Reunión/Tablero.
4. Ejecutar suite, build y recorrido local del resultado con los datos desechables. Comprobar sincronía, permisos, ausencia de podio indebido y móvil. Expected: suite sin regresiones (solo los cinco fallos de audio documentados), build correcto y flujo verificado.
5. Commit, revisión independiente del delta completo y correcciones importantes con pruebas. Guardar reporte y actualizar demostración y PR borrador.
