# Matrícula anulada y devolución previa al inicio

Pedido de Fernando, 12 de septiembre de 2026. Estado de entrega: código preparado para revisión; no aplicado a producción.

## Regla operativa

| Situación | Registro | Deserción |
| --- | --- | --- |
| Ficha duplicada | Eliminación/fusión de ficha mediante el flujo correspondiente | No |
| Devolución antes de iniciar clases | Matrícula anulada | No |
| Niño que empezó clases y luego se fue | Retirado | Sí, salvo graduación según regla vigente |

En Grupos, en Niños sin grupo y en Retirados recientes aparece la acción de anulación. Se solicita fecha real y motivo. El resultado aparece en la pestaña **Matrículas anuladas**. La ficha conserva su grupo anterior como historial, la identidad CRM y todos sus eventos. Se libera el cupo y se excluye de ventas/nuevos ingresos operativos, inicios, activos, Cuadro, Growth y deserción del centro/coach/comparada.

La acción exige permiso vigente de escritura sobre el centro. Bajo una transacción Serializable comprueba inscripción, grupo, inicio previsto, ancla, nivel, movimientos anteriores y asistencia presente histórica. Tener cero presentes en el mes actual no basta para anular. Los traslados, reincorporaciones y avances requieren revisión histórica. Un retiro registrado por error solo se reclasifica si sus fechas permiten probar que fue anterior al inicio.

No se borran eventos para cuadrar cifras. Los meses de inscripción, inicio, retiro y anulación afectados deben permanecer abiertos. Un mes cerrado bloquea la operación, conserva sus snapshots y requiere una corrección histórica autorizada. No se ejecutó ninguna reparación de Wilson Zúñiga: el nombre del ejemplo no acredita una ficha, fecha ni comprobante actuales.

La identidad CRM retenida evita que una sincronización importe nuevamente la matrícula. El outbox actualiza cupos; **no modifica la oportunidad comercial del CRM**. Los agregados «Ganados en CRM» / `cp_matriculados` siguen siendo la fuente comercial externa y no se restan a ciegas. Los nuevos ingresos operativos sí excluyen las anuladas.

## Constancia del reverso financiero

Desde la matrícula anulada se registran factura, nota de crédito/documento de anulación, referencia de devolución, fecha, importe y moneda. Solo debe utilizarse después de realizar el reverso en Zoho y entregar la devolución. Se conserva el usuario, el momento de registro y el vínculo al evento de anulación. Un reintento idéntico no duplica; una referencia distinta no sobreescribe.

La interfaz muestra «Sin comprobante de reverso» o «Reverso documentado». **Es constancia aportada por el centro, sin verificación automática en Zoho.** La función no emite notas, modifica facturas ni transfiere dinero. El OAuth existente solo tiene lectura de facturas. Se consultó a Fernando si quiere construir el reverso directo; esa decisión sigue pendiente.

No hace falta migración para el estado ni estos eventos: las columnas son TEXT y el detalle JSONB ya existe.

## Encuesta mensual

El cambio asociado usa **30% o más**, redondeando la cantidad de respuestas hacia arriba: 100 activos → 30; 148 → 45. Sigue requiriendo difusión registrada y población positiva. Regla persistida por campaña; al activar se convierte el mes vigente abierto, conservando campañas antiguas y cerradas. No cambia la encuesta semestral al equipo.

La activación requiere `scripts/migrate-encuestas-30.mjs` (solo lectura por defecto; `--apply` para aplicar), antes de publicar el bundle. Ver `docs/encuestas-satisfaccion.md`. Cinco clips con el porcentaje viejo quedan deshabilitados; guiones nuevos preparados, 2.374 caracteres pendientes de generación autorizada.

## Verificación

- Suite unitaria del candidato: 1.144 pruebas aprobadas.
- PostgreSQL 16 local desechable: 5 pruebas de anulación (reclasificación, bloqueo histórico/asistencia, rollback y concurrencia); 21 de encuestas (umbral, difusión, histórico y cierre concurrente, incluida activación).
- Chromium local con datos ficticios: anulación con y sin grupo, ficha fuera del roster y en su pestaña, comprobante registrado y encuesta 3/10 cumplida; viewport móvil 390 sin overflow y escritorio 1440.
- Tres tests antiguos de usuarios utilizaban fechas ya vencidas: reloj de prueba fijado, sin cambios a producto.
- Revisión independiente cerró dos hallazgos de migración y uno del DTO de autenticación del reverso.

Evidencia local no publicada: `.scratch/anulacion/`. No mensajes, pagos, reversos reales ni cambios de alumnos productivos.
