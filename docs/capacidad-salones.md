# Capacidad de niños por salón

En Grupos y Fusiones → Coaches y salones, Agregar/Editar salón permite declarar un entero positivo. Un campo vacío significa «Sin registrar»; no se toma como cero ni se llena automáticamente. El total físico suma únicamente salones activos y se muestra cuando todos tienen capacidad.

Son puestos simultáneos. Tres salones de diez niños dan treinta puestos, pero pueden atender más de treinta alumnos en horarios distintos. Por eso este dato no reemplaza `capacityMax` ni certifica por sí solo el límite de matrícula del motor. El resumen distingue lo que el centro puede completar de la revisión pendiente de horarios y coaches.

Antes de desplegar, ejecutar `scripts/migrate-salon-capacidad.mjs` con el entorno correspondiente: sin argumentos solo inspecciona; `--apply` agrega la columna nullable con restricción positiva dentro de una transacción. Verifica que los datos existentes conserven su huella. No ejecuta reparaciones de retiros ni modifica matrículas.

La acción conserva el control de acceso por centro y el filtro SQL por salón/centro. Un cliente antiguo que omite el campo conserva la capacidad existente; un cliente nuevo que envía explícitamente `null` la deja sin registrar.

Verificación: suite de Node, prueba PostgreSQL desechable de migración/guardado/aislamiento y revisión local de crear/editar, validación, recarga, total y ancho móvil. El arnés visual usa datos ficticios; no se registran capacidades de ejemplo en producción.
