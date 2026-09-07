# Avance de plataforma y oficio — 7 de septiembre de 2026

El menú y el aviso del resumen mostraban solamente `resumenProgreso`, que cuenta los nueve recorridos de plataforma. Ahora muestran dos líneas independientes, usando también `resumenOficio().avance`. El contador de oficio mide módulos estudiados (lección y cuestionario aprobado), como el índice existente; no equivale a maniobras firmadas.

Los totales provienen de los catálogos existentes. Administradora y asistente ven ambos avances; coach y coordinador ven su plan de oficio. Gerencia mantiene su navegación de revisión. Las firmas pendientes no sustituyen los contadores. Una carga fallida indica «Sin datos» para ese avance, sin inventar un cero ni ocultar el otro.

## Verificación

- 60 pruebas existentes de entrenamiento, oficio, revisión, marca y navegación aprobadas: `node --test test/entrenamiento.test.mjs test/entrenamiento-oficio.test.mjs test/entrenamiento-oficio-revision.test.mjs test/entrenamiento-marca-oficio.test.mjs test/centro-navigation.test.mjs`.
- `npm run build`: salida 0. `git diff --check`: limpio.
- Chrome con componentes y páginas reales empaquetados con esbuild y acciones simuladas; sin base de datos ni sesión productiva. Harness temporal: `/tmp/aloha-progreso-ui/server.cjs`, puerto 4341.
- Resumen y menú: administradora muestra Plataforma 0/9 y Aprende tu oficio 0/26. Escritorio 1920 px: documento 1909 px. Móvil 390 px: documento 390 px, filas dentro de sus contenedores y menú desplegable operativo.
- Avance parcial y firmas: Plataforma 9/9, oficio 7/26 y 3 firmas visibles simultáneamente.
- Asistente: Plataforma 4/9 y oficio 2/27. Coach: únicamente oficio 3/24. Coordinador: únicamente oficio 5/23.
- Fallo simulado de oficio: Plataforma 4/9 se conserva y oficio indica «Sin datos».

Los valores de progreso usados en Chrome son ficticios; los denominadores de cada puesto provienen del catálogo real. No se modificaron cursos, audios, reglas de aprobación, permisos ni progreso guardado. La separación del progreso por centro de una misma cuenta sigue siendo trabajo independiente.
