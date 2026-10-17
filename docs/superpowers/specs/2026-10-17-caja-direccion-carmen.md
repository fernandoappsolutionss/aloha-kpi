# Caja y entrenamiento de Dirección Operativa

Fernando pidió verificar la curva, entrenar a Carmen en su uso y completar los rituales del viernes y lunes, plan de batalla, bitácora, lectura de riesgo/caída y reducción de costos. Confirmó mantener las facultades actuales y escalar excepciones. La herramienta existente es de 13 semanas; no se reduce el horizonte a tres.

## Alcance implementado

- Curso individual para la cuenta existente de Carmen (`admin@alohapanama.com`, coordinador), cuatro módulos `of-caj-1..4`, 95 minutos nominales de estudio más práctica; 24 conceptos, 12 láminas, 20 preguntas, 16 clips, cuatro SOP y cuatro maniobras. Se conserva el motor de estudio/progreso/firma. Master revisa; los otros coordinadores no reciben esta obligación.
- Caja: calidad de saldos y conteo completo de movimientos sin clasificar; semanas rojas, ámbar y en caída; faltante para cero y para el piso. Se mantienen el cálculo de 13 semanas, los baldes, reservas y permisos de caja existentes.
- Por empresa y viernes: lista de cierre, soportes, condición fundamentada, fórmula canónica, acciones con responsable/fecha/semana/importe/evidencia, bitácora y revisión del lunes. El consolidado conserva su función de consulta.
- Excepciones en el plan (fuera de presupuesto, nuevo compromiso, crédito): solo Master aprueba/rechaza; se invalida la aprobación si cambia la propuesta. La programación de una salida no implica autorizarla ni efectuarla. No se introducen límites monetarios.
- Versiones con bloqueo transaccional, historial y foto de caja. No se eliminan acciones: se cancelan con motivo. El cierre exige datos suficientes y todos los controles; la revisión del lunes requiere cierre y fecha válida.
- El rojo es riesgo de liquidez; caída es variación proyectada. Ninguno asigna automáticamente condición. La condición exige fundamento con estadísticas realizadas; su fórmula exige objetivos por paso. Sin datos suficientes se mantiene pendiente.

## Límites y calendario

El importador existente admite OFX de Banco General y XLS/PDF de St. Georges. No marca automáticamente facturas pagadas en Zoho ni ejecuta pagos. Los originales permanecen en el archivo autorizado de la empresa; la bitácora conserva referencias, documentos de decisión y foto, no el binario bancario original.

Caja proyecta lunes–domingo; primera semana parcial desde mañana. Ritual viernes/lunes por instrucción de Fernando, separado del cierre estadístico de centros. Preparación/reunión 23-oct; primera revisión posterior 26-oct. Estudio y ensayo pueden hacerse antes; las maniobras se firman solo tras operaciones reales observadas. Los casos de las unidades son ficticios y no se cargan en producción.

## Evidencia inicial y fuentes

Consulta productiva de solo lectura 17-oct: Carmen ID4 y correo anterior confirmados; 10 importaciones, última fecha bancaria 24-sep; 126 pendientes (Altavia50/F&F76). La información financiera requiere actualización humana antes de cerrar. No se alteraron saldos, movimientos, compromisos ni estudio de personas reales durante desarrollo.

Material aportado: fórmulas, estadísticas y guías del Consejo Asesor, con fórmulas canónicas existentes. Memoria histórica 24-sep confirma finalidad de conciliación y planificación de pagos para Altavia/F&F. Referencia complementaria y alcance de cada unidad en `docs/entrenamiento/fuente/caja-direccion-aloha.md`.

## Migración

`node scripts/migrate-caja-direccion.mjs` inspecciona; `--apply` crea dos tablas aditivas con historial. Aplicar antes de publicar la interfaz. La migración no crea ciclos, acciones, pagos ni firmas. Probada dos veces sobre PostgreSQL local desechable.
