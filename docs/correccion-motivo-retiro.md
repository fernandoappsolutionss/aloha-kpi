# Corregir el motivo de un retiro

Pedido de Fernando, 1 de octubre de 2026. Caso que lo originó: en agosto de 2026, en el centro David, no había forma de corregir el motivo de un retiro ya registrado. La administradora retiró, reincorporó y volvió a retirar a dos niños. El Cuadro de Negocio contó 10 retirados donde había 8, con el motivo «Económico» inflado. Los cuatro eventos que sobraron se limpian aparte con un script.

## Regla operativa

| Situación | Qué se usa | Efecto |
| --- | --- | --- |
| El niño se fue y el motivo quedó mal | **Corregir motivo** (Grupos › Sin grupo y retirados) | Cambia solo el motivo del retiro vigente. Sigue contando como retirado en el mismo mes. |
| El retiro fue un error o el niño volvió | Reincorporar | Cuenta como reincorporado del mes en curso. |
| Devolución antes de iniciar clases | Corregir a matrícula anulada | Sale de ingresos y deserción ([matricula-anulada.md](matricula-anulada.md)). |

Reincorporar y volver a retirar para cambiar un motivo suma un retiro y un reincorporado de más. El Cuadro de Negocio ya no lo sugiere, y enlaza a la pestaña donde se corrige.

## Qué hace

- Corrige el **último** evento `retiro` del niño (el vigente, por id) y `estudiantes.motivo_retiro`, en una sola transacción SERIALIZABLE. No crea ni borra eventos.
- Respeta el candado del mes donde cuenta el retiro (`year/month` del evento, `bloquearMesesEditables`). Si ese mes está cerrado, quien cierra el mes tiene que reabrirlo en KPI Mensual, corregir y volver a cerrarlo.
- Pide permiso de escritura en el centro (`requireCurrentWriteCentro`). Gerencia es de solo lectura y no corrige.
- Exige una razón (máximo 500 caracteres). En el `detalle` del evento queda `correcciones_motivo` con motivo anterior y nuevo, razón, quién, cuándo, `evento_id`, `year` y `month`. La lista muestra «Motivo corregido el…» y el modal muestra el historial (sin correos).
- La pantalla manda el retiro y el motivo que mostró. Si cambiaron en otra pestaña o por otra persona, se rechaza y pide recargar. Un reintento de algo ya guardado responde «no había nada que corregir».

## Cuándo se frena (y por qué)

- **Meses anteriores a agosto de 2026**: su KPI de motivos es captura manual. Se corrigen desde KPI Mensual, igual que «Sincronizar con KPI».
- **Historial roto**: no hay evento de retiro, la fecha del evento no coincide con la de la ficha, la fecha cae fuera del mes en que está anotado, o hay una reincorporación posterior al último retiro. Se avisa a Administración y no se adivina.
- **KPI del mes guardado sin conciliar** (hay `resumen_mes` pero no `kpi_auto_ajustes`): primero hay que abrir KPI Mensual y pulsar Guardar. Si no, el primer Guardar tomaría el motivo viejo como «declarado a mano» y dejaría un retiro fantasma.
- **Ajuste manual en el motivo destino** (`kpi_auto_ajustes[mot_x] > 0`): si el niño era uno de los declarados a mano, el KPI lo contaría dos veces. No hay pantalla para revisar el ajuste, así que lo revisa Administración. En la práctica solo agosto de 2026 tiene ajustes de motivo distintos de cero.

Los dos últimos frenos solo aplican si el motivo cambia de campo del KPI. Entre «No confirmó», «Inasistencia», «Cambio de centro» y «Otro» todo cae en `mot_otro`, así que los totales no cambian.

## Después de corregir

- El Cuadro y el KPI de un mes abierto se recalculan en vivo con el motivo del evento.
- Si el KPI de ese mes ya estaba guardado, hay que volver a **Guardar** en KPI Mensual para que el historial (`resumen_mes`) lo refleje. El cierre del mes también lo rehace.
- Si el niño tiene otro retiro en el mismo mes, ese otro sigue contando y el mensaje lo avisa. Puede ser legítimo (se retiró dos veces) o un duplicado como el de David.

## Concurrencia

Toda escritura de retiro o reincorporación actualiza la ficha. Por eso, en SERIALIZABLE, una carrera termina en 40001 y la pantalla dice «La ficha o su mes cambió mientras corregías». `kpi_auto_ajustes` y `resumen_mes` se leen dentro de la transacción a propósito: si un Guardar del mismo mes se solapa, uno de los dos aborta y se reintenta. Nunca se confirma una decisión tomada sobre un resumen que no se vio. Lo prueba `npm run test:motivo-retiro:db` con Postgres local desechable y barreras observadas.
