# ALOHA: formación semanal y períodos claros

**Goal:** Completar la formación aprobada por Fernando y explicar/corregir el panel que mezcla semanas locales con cifras mensuales declaradas.
**Spec:** /Users/teamsolutionsslatam/Hermes-Agente IA PC/outputs/aloha-entrenamiento-brechas-2026-10-02.md y petición del 2-oct: ejecutar la formación, explicar Los Naranjos y diferencias arriba/abajo.
**Architecture:** Reutilizar catálogo/renderer de oficio, tours, firma/progreso y generación incremental de audio. Reutilizar períodos/series actuales; las cifras semanales y declaradas tienen fuentes distintas y deben identificarse sin alterar cierres.
**Stack:** Next15, React18, JS, node:test, Neon.

## Global Constraints

- No cambiar permisos, fórmulas oficiales, condiciones/planes/cuotas reales ni cierres de producción. Lectura automática solo gerencia/coordinador, nunca administradora/asistente.
- Ranking reconoce únicamente cumplimiento de las cinco cuotas aprobadas en la semana cerrada exacta.
- Sin dato no es cero. Una semana nueva sin cálculo no se rellena silenciosamente con un valor viejo. Fechas y fuentes visibles.
- Nuevas lecciones con nuevos IDs: conservar progreso, firmas y audios anteriores; quienes aprobaron lo anterior deben tener actualización pendiente.
- Las cinco gráficas son del centro; coach solo ve las rutas autorizadas. No crear estadísticas personales ni ampliar accesos.
- Vocabulario visible: condiciones, fórmulas, cuota, plan de batalla, producto del puesto, maniobra. Conservar prohibición de marcas y jerga: HCA, Hubbard, hat, PFV, checksheet, drill, gradiente.
- Sin dependencias nuevas. Mantener respuestas correctas solo servidor y reutilizar componentes y motor de progreso existentes.
- La fuente canónica de fórmulas es lib/condiciones/formulas.mjs. Ejemplos pedagógicos distinguidos del texto oficial y reglas automáticas propias de ALOHA.

### Task 1: Períodos y cobertura del tablero

**Ownership:** components/semana/TableroSemanal.js, lib/estadisticas-semana/presentacion.mjs, app/actions/semana.js si hace falta metadato, app/actions/dashboard.js solo metadatos de fuente, app/dashboard/page.js, tests focalizados.

1. Leer armarTablero y TODOS sus consumidores, getTableroSemanal/cargarTablero y ninosDeclarados. No modificar la semántica local de semana abierta/cerrada usada en ranking, reunión, aprobación o cron.
2. Mostrar fecha de semana en cada centro, zona cuando explica diferencia, y fechas de condición/plan/cuotas que son de la última cerrada. Título/leyenda distingue semana operativa del período mensual/trimestral elegido abajo. Explicar semana nueva todavía sin cálculo frente a cálculo con dato faltante usando metadatos existentes.
3. Consolidado solo dibuja total cuando todos los centros visibles tienen dato. Conservar subtotal separado y conteo disponibles/total para comunicar cobertura y probar que una ausencia no parece descenso. Centros vacíos => null, nunca cero ficticio. GraficaSemanal ya soporta null.
4. En tabla inferior y tarjeta niños identificar 'último dato mensual declarado del período', fecha/fuente por centro cuando sean distintas. ninosDeclarados actual elige último mes declarado y puede omitir proyección viva. No cambiar el cálculo empresarial para hacer coincidir cifras distintas.
5. Pruebas de regresión para medianoche Caracas/Panamá con semana distinta, total incompleto, cero válido y contrato de fechas/metadata; reutilizar tests existentes.
6. Verificar tests focalizados, commit propio y reporte. No publicar ni tocar DB real. Root hará suite/build finales.

### Task 2: Formación común y prácticas por puesto

**Ownership:** lib/entrenamiento/oficio/catalogo.js, cursos/todos.js, nuevo cursos/semana.js, respuestas-oficio/todas.js y nuevo semana.js, guia.js, glosario.js; componentes de oficio solo si falta render mínimo de gráficas de ejemplo; tests oficio.

1. Crear curso 'semana' visible en plan de administradora, asistente, coach y coordinador usando patrón existente TODO_CARGO. Nuevos IDs estables of-sem-* y ampliar validación. No renombrar módulos actuales ni invalidar firmas. Asignar orden/prerrequisitos sin ciclos para que graduados anteriores vean actualización pendiente.
2. Dos lecciones comunes: leer gráficas; condiciones y fórmulas. Gráficas con ejemplos VISUALES accesibles reales (reutilizar GraficaSemanal): subida, estable, caída, recuperación después de caída, estadística inversa, dato faltante, misma escala/período, semana abierta provisional vs cerrada, cuota propuesta vs aprobada. Mostrar valores/texto alternativo, no solo descripción.
3. Condiciones: inexistencia, peligro, emergencia, normal, afluencia, poder, cambio de poder; explicar significado/prudencia contextual, mostrar texto oficial desde fuente canónica y variantes, ejemplo aplicado por fórmula: transformar paso a objetivo concreto, responsable, fecha y evidencia. No inventar que una sola subida decide condición. No enseñar umbral automático como ley de la fuente. 'Sin condición' = pendiente de asignación, no juicio sobre persona.
4. Una lección práctica por cada uno de los cuatro roles: administradora revisa Semana, elige y guarda condición y plan, propone cuotas y ejecuta objetivos; asistente registra y verifica datos dentro de permisos; coordinador revisa condición/plan, aprueba cuotas, reunión y ranking cinco de cinco; coach aplica lectura al trabajo permitido, reporta asistencia/evidencia sin entrar a datos administrativos. Enlaces reales autorizados y pasos concretos de uso; fuente/fechas del panel explicadas.
5. Cada módulo: introducción/voz en español natural, láminas/bloques, términos del glosario, cuestionario con casos y retroalimentación, drill observable con evidencia y firma usando motor existente. Claves separadas en servidor. Reutilizar guías existentes si derivan por defecto; crear específicas donde haga falta enseñar.
6. Pruebas reales de visibilidad por rol, nuevos IDs pendientes para graduados, fuente de fórmulas exacta y quizzes válidos. No generar audio en este task: preparar guiones y listar claves pendientes para root.
7. Autorrevisión, tests focalizados, commit propio, reporte.

### Task 3: Recorridos y cierre integrado

**Ownership:** lib/entrenamiento/modulos.js, respuestas tours, componentes/acciones del tour y páginas con data-tour necesarias, tests tours. Ajustes menores de integración con Task2 por necesidad documentada.

1. Añadir recorridos guiados de las pantallas nuevas según permisos: Semana/lectura de gráficas y Plan/cuotas; coordinación debe tener instrucciones prácticas de Reunión y ranking. Reutilizar motor de tours donde tenga sentido, sin habilitar escritura a roles que no la tienen. Si motor es exclusivamente del centro, implementar esos tours allí y usar guía de oficio con enlaces en coordinación, evitando un segundo motor.
2. Selectores deben existir en pantalla; tour no registra datos reales, solo guía. Nuevos IDs mantienen completados anteriores y aparecen pendientes. Quizzes con respuestas solo servidor. Guiar explícitamente flujo dato -> lectura -> condición -> fórmula -> objetivos -> aprobación -> seguimiento y cinco cuotas para reconocimiento.
3. Integrar entrada visible a actualización de formación desde Semana y curso; personas reconocen qué estudiar para funciones nuevas. Coach mantiene rutas propias; no enlazarle Semana administrativa.
4. Preparar audio para nuevos tours con guiones/manifest incremental existente. Root generará clips aprobados y validará los medios.
5. Tests focalizados, autorrevisión, commit y reporte con comandos de generación por IDs; root hará suite/build/browser/publicación y revisión final.
