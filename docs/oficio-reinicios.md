# Reinicio de toma de puesto

En **Puestos de la gente**, Master puede abrir **Reiniciar puesto** en la fila de una persona. Elige persona nueva, reentrenamiento por tiempo o refuerzo, agrega una nota opcional y confirma la identidad.

Se archivan todos los módulos `of-%`, incluso los retirados del catálogo, con conceptos, intentos, resultados, fechas, firmantes e identidad de la persona y del responsable. Después se elimina únicamente ese avance activo. El entrenamiento del sistema, otras personas y la operación de los centros permanecen intactos. Una cuenta sin avance ni conceptos no necesita reinicio.

El historial muestra los últimos 20 reinicios y el resumen de lo archivado. Los snapshots completos permanecen en `entrenamiento_oficio_reinicios`. El avance sigue siendo por cuenta, como antes; para una cuenta multicentro el diálogo explica el alcance. No se programan reinicios automáticos.

## Publicación

1. Ejecutar `node scripts/migrate-oficio-reinicios.mjs` con el entorno del destino: inspección sin escritura.
2. Aplicar `node scripts/migrate-oficio-reinicios.mjs --apply`. Es una expansión idempotente: crea una tabla y un índice; no reinicia usuarios.
3. Desplegar el código y comprobar como Master que el diálogo abre y cancela. No confirmar reinicios de personas reales durante QA.
4. Ante un rollback del código, conservar la tabla histórica; no restaurar automáticamente el avance de un ciclo anterior sobre uno nuevo.

## Verificación

- `npm test`: 1.453 pruebas aprobadas.
- `npm run build`: correcto.
- `ALOHA_REINICIOS_TEST_DATABASE_URL=postgresql://.../aloha_reinicio_test npm run test:oficio:db`: 9 pruebas sobre PostgreSQL local exclusivo. Incluyen permisos, validación, aislamiento, snapshots, idempotencia, rollback, concurrencia y completar un nuevo ciclo.
- Navegador contra la aplicación compilada y PostgreSQL local: cancelación sin cambios, motivo y confirmación requeridos, reinicio real vía Server Action, historial, conservación de plataforma, escritorio 1440px y móvil 390px. Sin errores JavaScript.
- Navegador: pestañas/grupos propios cerrados y comprobados; contexto de pruebas aislado.

Las escrituras de conceptos, estudio, cuestionarios y firmas toman el mismo bloqueo por usuario que el reinicio. Las validaciones de progreso se ejecutan dentro del bloqueo con aislamiento READ COMMITTED para releer el estado después de esperar. El UUID de cada solicitud permite reintentar una respuesta perdida sin volver a reiniciar el ciclo siguiente.
