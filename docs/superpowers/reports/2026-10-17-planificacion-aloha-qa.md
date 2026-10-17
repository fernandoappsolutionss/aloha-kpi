# Planificación integral ALOHA · verificación 2026-10-17

## Entrega

Cuatro unidades nuevas (`of-sem-3` a `of-sem-6`) dentro del recorrido de oficio: estrategia/programas/proyectos; planificación integrada; reunión/control diario; caso integral. Todas incluyen objetivo, temario, materiales, seis conceptos escritos por el alumno, tres láminas, lección, fuentes/páginas, cinco preguntas (cuatro aciertos), maniobra real supervisada y SOP de una página.

Seis formatos con ejemplo ficticio y versión en blanco están incluidos en las lecciones: estrategia/programa, proyecto, matriz semanal, ficha de cuotas, control diario y acta. Son documentos complementarios; no se simula un gestor nuevo de proyectos ni almacenamiento automático de actas.

Administradora y coordinación reciben las cuatro unidades (115 minutos estimados más práctica). Asistente y coach reciben estrategia y contribución propia (25 minutos más práctica). Se conservan los seis módulos semanales anteriores y todos sus IDs. U6 requiere U5 y la práctica específica del rol, tanto en pantalla como en las acciones del servidor. No hay migración ni actualización masiva de progreso.

Primer ciclo derivado del calendario de la aplicación: cierre 22-oct, reunión 23-oct, ejecución 23–29 oct. Las cuotas corresponden al cierre del 29. La condición y las cuotas mantienen sus autoridades diferentes. El caso no se carga en producción.

Correcciones relacionadas: lectura orientativa disponible para Administradora, evidencia esperada/obtenida en el cierre, distinción entre cierre y ejecución, y enlace de los cierres hablados anteriores con la ampliación. El glosario se regenera desde fuentes sincronizadas con las definiciones ya publicadas; se preservan acepciones académicas y variantes de autoenlace anteriores.

## Evidencia de pruebas

- `npm test`: 1501/1501 PASS.
- `node --test test/integration/oficio-reinicios.integration.mjs`, PostgreSQL local exclusivo `aloha_planificacion_test`: 10/10 PASS. Incluye requisito de práctica por rol, rechazo del quiz antes del estudio, aprobación con cuatro de cinco, firma autorizada y conservación exacta de firma previa.
- Navegador Chromium aislado sobre Next local, cinco usuarios ficticios: 18 comprobaciones PASS. Cuatro unidades revisadas por Master sin mutación de progreso; reproducción de cuatro presentaciones; 390 px sin desborde; cuatro SOP PDF A4 con una página cada uno; distribución por cuatro roles; recorrido real de alumno por materiales, conceptos, láminas, lectura y quiz con recarga, sin autofirma.
- 21 clips generados incrementalmente: 16 nuevos y 5 modificados. Voz y configuración existentes. Audio decodificado con FFmpeg, duración obtenida con ffprobe y transcripción automática Scribe comparada con los guiones. No se afirma audición humana. No se detectaron omisiones ni cambios de sentido; una transcripción añadió una muletilla «eh».
- Generación de oficio y guía en seco: ningún clip pendiente; `oficio-glosario-importar.mjs --verificar` coincide con las fuentes.
- `git diff --check` limpio; Graphify actualizado. El analizador SQL no estaba instalado; no se modificó SQL de producción.

La compilación completa se verifica en el despliegue Vercel, evitando una compilación grande local con menos de 40 GiB disponibles. La revisión de producción se registra en el informe de ejecución una vez desplegado.

## Límites y cierre

Las pruebas de escritura se hicieron únicamente con personas y centros ficticios en PostgreSQL local. El curso publicado no implica que los colaboradores ya hayan estudiado o aprobado sus maniobras. Cada jefe debe observar el trabajo real y firmarlo.

Los contextos y el navegador de prueba se cerraron en `finally`; no se tocaron pestañas personales. El informe final registra además cierre del navegador de revisión de producción y detención de servidores propios.
