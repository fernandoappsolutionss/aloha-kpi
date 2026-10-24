# Auditoría ALOHA KPI — ruta semanal y caja

Fecha de trabajo: 23 de octubre de 2026 (sesión terminada el 24 UTC).
Base: PR #210, commit dbc1c98. No se ha publicado esta auditoría ni aplicado sus migraciones en producción.

## Conclusión

El recorrido funciona en una aplicación Next real con PostgreSQL desechable y sesiones separadas de administradora y coordinador: propuesta, aprobación, condición, plan, ejecución, evidencia, juegos e informe. Se corrigieron problemas de visibilidad, confirmación de guardado, cierre pendiente y adjuntos. Caja conserva ahora el detalle de operaciones clasificadas y permite documentar la transferencia al socio sin duplicar su efecto financiero.

El rol `administradora` propone cuotas; `coordinador` asignado al centro y Master aprueban. Esta es la regla vigente, conservada mientras Fernando confirma si quiere autoaprobación. El correo que contiene «admin» no determina el rol. La sesión productiva observada estaba identificada como Coordinador Operativo.

## Hallazgos y resultado

| Punto | Evidencia / causa | Cambio o comprobación |
|---|---|---|
| Botón parece no guardar | PR #210 devuelve errores legibles y libera botones; aún estaba abierto al iniciar esta revisión | Se parte de esa corrección. Guardado y aprobación confirmados en UI y BD local; no se atribuye una causa única al incidente de Carmen sin reproducir su sesión |
| No se ven cuotas | Editor plegado al entrar | Cuotas abiertas y visibles; estados distinguen sugerida, cambio sin guardar, propuesta y aprobada |
| «Última cerrada» confusa | Se mezclaba resultado anterior con meta | Fecha de cierre y fuente por estadística; niños activos es total final. Al escribir menos que el último cierre, se advierte la diferencia entre total y niños a sumar |
| Cálculo automático | La propuesta existía pero no había una acción clara para usarla | Botón «Usar propuesta automática»; copiar no guarda ni aprueba silenciosamente |
| Condición no guarda el viernes | El cierre podía reconstruirse en pantalla sin fila cerrada persistida antes del cron | Se recupera solo la población del jueves a partir del saldo histórico y movimientos. No reemplaza cierres ya cerrados, no inventa cero ni cierra otras estadísticas |
| Plan aglomerado | Preparación incluía Hoy y Alineamiento | Condición y fórmula prepara; Mis acciones ejecuta y adjunta. Mensaje explícito al agregar objetivo y enlace a su ubicación |
| No hay adjunto | Solo había texto de evidencia | Un PDF, PNG o JPG de hasta 2 MB por acción. Tipo validado por firma, descarga autenticada por centro, cabeceras privadas, bloqueo de sustitución si la acción está hecha. Se muestra también en el informe histórico |
| Reunión / aprobación del plan | No existe un estado de «plan aprobado» | Procedimiento visible: revisar datos, condición, completar plan, aprobar cuotas y verificar resultados. «Plan preparado» significa completo; no equivale a aprobación ni ejecución |
| Extractos y gastos | Después de clasificar solo se veía agregado y pendientes | Vista previa completa y listado de movimientos ya clasificados, filtro de salidas y socio, 50 filas por página. Rango temporal indicado; no pretende representar gastos futuros ausentes del extracto |
| Transferencia al socio | La curva ya reserva la participación del dueño | Acción para coordinarla, procedimiento de cuatro pasos y registro posterior del débito como Dueño. No genera otro compromiso ni ejecuta una transferencia bancaria |
| Seis checks del viernes | Texto insuficiente para operarlos | Explicación concreta de qué revisar en cada punto |
| Aviso semanal entre centros | Recibo único por usuario/semana compartía la confirmación entre centros | Clave usuario/centro/semana; migración recupera el centro del snapshot histórico sin borrar recibos |
| Entrenamiento | Mover Hoy y Alineamiento dejaba targets en otra pantalla | Rutas del tour actualizadas y 57 verificaciones de UI completadas |

La pantalla de caja existente es de **13 semanas**. No se cambió a tres semanas ni se alteraron las fórmulas financieras.

## Cómo usarlo

**Administradora**

1. En Avance y cuotas, revisar la fecha y el origen del último cierre. Usar la propuesta automática si corresponde, ajustar y guardar.
2. En Condición y fórmula, revisar tendencia y elegir Normal, Emergencia, Peligro u otra condición con su fundamento. En Peligro, elegir Personal o Para el superior.
3. Agregar acciones bajo cada paso, con responsable, fecha y evidencia esperada. La confirmación indica dónde quedaron. Completar todos los pasos para tener el plan preparado.
4. Abrir Mis acciones. Pasar a Hoy las que se ejecutarán, adjuntar el soporte y escribir el resultado. Registrar realizada respetando el orden de la fórmula.
5. Revisar Mi cumplimiento; imprimir o guardar el PDF. Cambiar una cuota aprobada exige nueva revisión de coordinación.

**Coordinador operativo**

1. En Reunión semanal, abrir el centro y revisar resultados, fuente, condición y acciones.
2. Revisar las cuotas propuestas y pulsar Aprobar cuotas. Recargar para comprobar el estado Aprobada. Las cuotas históricas no se aprueban como si fueran de la semana actual.
3. Revisar los resultados y adjuntos en Mis acciones; verificar cada evidencia. El sistema no tiene un botón separado para aprobar el documento completo del plan.
4. En caja, si su cuenta está autorizada, importar el extracto, revisar todas sus filas y clasificar pendientes. Filtrar Todas las salidas para ver gastos ya clasificados.
5. Coordinar la transferencia al socio con responsable/fecha/monto y soporte. La transferencia efectiva se hace en el banco por la persona autorizada. Conciliar luego su movimiento, sin duplicarlo como gasto programado.

## Pruebas y alcance

| Verificación | Resultado |
|---|---|
| `npm test` | 1.641 pruebas, cero fallos |
| `administradora-e2e.mjs 390` | 14 hitos PASS: login real local, cuotas, cierre recuperado, condición, plan, adjunto, permisos, Hoy, alineamiento, ejecución, juego, aprobación, PDF e histórico; navegación móvil |
| `caja-recorrido-e2e.mjs` | 6 hitos PASS: importación OFX, todas las filas, clasificación persistida, duplicados, plan del socio, escritorio/390/320 px |
| `semana-guiada-ui.mjs` | 57 comprobaciones PASS: pantallas, estados, tours, PDF y responsive; componentes reales con datos/acciones simulados |
| `ruta-automatica-ui.mjs` | 16 comprobaciones PASS: ruta integrada, cuotas visibles, borrador preservado y recarga fallida; datos/acciones simulados |
| `growth-centros-db.mjs` | Acciones reales sobre PostgreSQL: backfill e idempotencia de migración; mostrar/confirmar/posponer independientes por centro; duplicado rechazado |
| Producción | Observación de reunión y ruta con sesión de coordinador. Sin cuotas, condiciones, aprobaciones, archivos ni movimientos de prueba escritos allí |

La suite completa cubre también reglas de matrícula, grupos, KPI mensual, cobranza, caja, peticiones, encuestas, crecimiento, acceso y entrenamiento. **No equivale a haber recorrido manualmente las 47 páginas del programa ni a haber probado todas las integraciones externas en vivo.** No se hizo login productivo con la cuenta de administradora. Los recorridos de escritura de ambos roles usan usuarios ficticios, autenticación real y base local desechable.

No se ejecutó `next build` local: 17–19 GiB disponibles frente al umbral operativo de 40 GiB para compilaciones grandes. Next dev compiló y sirvió las rutas probadas. La compilación remota de la propuesta debe verificarse antes de publicar.

## Publicación y límites

- Esta rama se apoya en PR #210. Integrar primero esa dependencia y luego esta propuesta, con autorización de Fernando.
- Aplicar `db/migrations/2026-10-23-semana-evidencias.sql` antes de servir el nuevo código: crea una tabla, sin modificar objetivos existentes.
- Coordinar `db/migrations/2026-10-23-growth-recibos-centro.sql` con el cambio de versión: la clave antigua usuario/semana deja de ser válida para el código anterior. Usar ventana controlada y comprobar ambos centros después del cambio. No revertir solamente el código a la versión anterior tras migrar esta clave.
- Los adjuntos se guardan en PostgreSQL, uno por acción y hasta 2 MB; sustitución explícita mientras la acción esté abierta. No hay múltiples archivos ni búsqueda por contenido.
- Un cierre sin saldo histórico fiable sigue devolviendo un mensaje de revisión; no se lo fuerza con datos actuales.
- No se amplió el acceso de caja ni la capacidad de autoaprobar cuotas. Falta la definición de Fernando sobre este último punto.
- No se enviaron comunicaciones a Carmen, al equipo ni al socio.

## Evidencia y limpieza

Resultados y capturas locales se archivan en `outputs/auditoria-aloha-kpi-20261023/` del workspace Hermes, sin credenciales ni archivos `runtime.json`. Los scripts cierran sus navegadores y conexiones en `finally`. La pestaña de producción propia 850668503 fue cerrada y su ausencia comprobada; las pestañas personales se conservaron.
