# Fichas duplicadas al inscribir — plan

**Goal:** que «Inscribir» (clase de prueba y directo) no cree una segunda ficha para un niño que ya la tiene en el centro. El sistema detecta la ficha existente y deja al niño donde el centro lo quiere sin sumar otra venta. Solo crea la ficha nueva cuando el centro confirma, con motivo, que es otro niño.
**Tech Stack:** Next 15.5.19, React 18, Neon PostgreSQL, node:test.
**Fuera de alcance:** limpiar los duplicados que ya existen en producción, que requiere el OK de Fernando y la confirmación de cada centro. Este plan solo entrega el script de SOLO LECTURA que los lista.

## Evidencia (producción, 1-oct-2026, solo lectura)

| Centro | Fichas | Detalle |
|---|---|---|
| David | 907 / 1029 | Valeria Alejandra Gantes Ortíz. 907: directo, creada 01-sep, grupo 121. 1029: clase_prueba, creada 29-sep, grupo 136, con `crm_registration_id`. |
| David | 923 / 1019 | Genesis Linton. Ambas clase_prueba (02-sep, grupo 122; 24-sep, grupo 135), misma representante. Meghan Linton (906) es su HERMANA, con la misma representante. |
| Calle 50 | 946 / 999 | «Luciano Acosta» (retirado) y «Luciano Andrés Acosta Sequera» (21-sep), mismo teléfono 6925-0722. |
| Anclas | 915 / 916 | Angela Maquensi. Ambas clase_prueba, grupo 134, misma representante (Norelvys Gonzalez), creadas el 01-sep. |

El KPI cuenta la venta por FICHA (`lib/kpi-semanal-auto.mjs`). Cada duplicado suma una venta y un «nuevo activo» de más. Si el centro «arregla» el duplicado retirando una de las dos fichas, suma además un retiro espurio.

**Qué dicen las fechas:** solo 1029 (29-sep) es posterior al PR #150 (28-sep); 915/916, 999 y 1019 son anteriores. Antes del #150, «Editar niño» no tenía la fecha de venta, así que reinscribir era la única forma de «corregirla».

El único freno era `crm_registration_id`, que es POR REGISTRO. No ve al niño inscrito directo ni al que se registró dos veces o fue a dos clases de prueba. Ninguno de los 4 pares lo habría frenado.

## Reglas de coincidencia (`lib/ficha-existente.mjs`, puro)

Mismo centro siempre.

1. **Mismo registro de CRM** → `registro`. No se salta nunca.
   - Excepción: la matrícula anulada no coincide. La anulación revirtió la venta, así que el niño vuelve como venta nueva y sin ese registro (el índice único no admite dos fichas con él).
2. **Nombre compatible + contacto en común** (teléfono, correo o representante):
   - `fuerte` si el nombre es el mismo;
   - `posible` si solo se parece.
3. **Mismo nombre sin contacto en común** → `posible`. Aplica solo con 3 o más palabras, o si a una de las fichas le faltan teléfono y correo (las cargadas en bloque). «Sofía Pérez» con otro teléfono es otra Sofía.

### Detalle de cada criterio

- **Nombre:** se normaliza sin acentos, signos, partículas ni iniciales.
  - Compatible = mismas palabras en cualquier orden, o el nombre corto contenido en el largo incluyendo el PRIMER nombre del largo.
  - «Luciano Acosta» y «Acosta Luciano» calzan con «Luciano Andrés Acosta Sequera».
  - No calzan «Andrés Acosta» (puede ser un hermano) ni los hermanos con la misma representante.
- **Teléfono:**
  - Un campo puede traer varios números: se separan por `/ , ; |`, por « - », por palabras, por doble espacio o, si un bloque tiene demasiados dígitos, por espacios.
  - Coincide si un número termina en el otro y lo que sobra delante es nada, `507`, `58` o `580`.
  - Un fijo «225-1234» no calza con el móvil «6225-1234».
- **Representante:** nombre y apellido. Si es igual al nombre del niño, se ignora: el modal de la clase de prueba precarga las dos casillas con el nombre de quien se registró.

## Cambios

### 1. `inscribirEstudiante`

- **Prechequeo** (fuera de la transacción): si hay coincidencias, responde sin abrir transacción ni bloquear grupo ni mes.
- **Dentro de la transacción:**
  - Lo primero es `pg_advisory_xact_lock(20261001, centro)`: un candado de ALTAS por centro. Solo `inscribirEstudiante` crea fichas, y ninguna otra operación toma este candado, así que el orden grupos → mes_kpi → estudiantes no cambia.
  - La búsqueda se repite con la conexión de AFUERA (`sql`). Así ve todo lo confirmado, incluida el alta que acaba de soltar el candado, y no deja locks de predicado SERIALIZABLE sobre las fichas del centro. La ronda 1 los dejaba y hacía abortar la asistencia del coach.
  - Antes del candado va `SET LOCAL lock_timeout = '10s'`: un alta trabada no congela a las demás del centro.
  - Un 40001 (serialización) o un 40P01 (deadlock) se reintenta con foto nueva, hasta 3 intentos, como hace la conciliación del KPI. Si se acaban los intentos o vence el `lock_timeout` (55P03), el centro ve «El centro tuvo varios cambios al mismo tiempo y la inscripción no se guardó. Vuelve a intentarlo.» y no queda nada escrito.
- **Con coincidencias** responde `{ error, coincidencias, registroYaInscrito | requiereConfirmacion }` y no escribe nada.
- **«Es otro niño»:** `ficha_nueva: { descartadas, motivo, nota }`.
  - Crea solo si el centro vio TODAS las fichas que coinciden ahora; una que apareció después vuelve a preguntar.
  - El motivo es obligatorio: hermano/a, otro niño con el mismo nombre, u otro con nota.
  - El rastro queda en `detalle.ficha_nueva_confirmada` del evento de venta: descartadas, motivo, nota y quién. El alta pendiente no tiene evento de venta y se queda sin rastro.

### 2. `vincularFichaExistente` (orquestación en `lib/ficha-existente-service.mjs`)

«Es este niño» no crea ficha y deja al niño donde el centro lo quiere por los caminos que ya existen:

- **Retirado:** se reincorpora (`reincorporarEstudiante`) en el grupo elegido. `reincorporarEstudiante` ahora valida `colocacionInvalida` dentro de su transacción, con el grupo bloqueado, así que cubre también «Reincorporar» de Grupos, que antes no lo validaba. Si el nivel no coincide, la pantalla lo avisa.
- **Sin grupo y sin venta (pendiente puro):** primera colocación con «Editar niño» (`actualizarEstudiante`) en UNA llamada con `grupo_id` y, si aplica, dos datos más:
  - `fecha_inscripcion`, si el centro eligió la fecha del formulario. Un pendiente puro no tiene evento, así que no se bloquea el mes de su ficha vieja, que puede estar cerrado.
  - `origen_venta` del formulario, si la ficha no tiene uno. Sin él, la venta nace «por clasificar».
  - La venta nace hoy (g1-8/g2-1). Si el centro eligió la fecha del formulario, después se corrige por el camino del #150, que solo bloquea el mes de esa fecha y el de hoy.
- **Sin grupo con venta** (salió a «Sin grupo»): vuelve a un grupo como movimiento y la fecha de venta sigue la regla de abajo.
- **En otro grupo:** traslado SOLO si el centro elige «Es este niño y pasa al grupo N». Si no hay semana equivalente, el error sale tal cual.
- **Fecha de venta:** solo si el centro la eligió, con el mismo camino del #150 (`actualizarEstudiante({ fecha_inscripcion })`). Nunca a un mes POSTERIOR al de su venta: eso es «Editar niño», a conciencia. La pantalla solo la ofrece hacia atrás o dentro del mismo mes, y el servicio lo vuelve a frenar. La fecha canónica llega del driver como `Date`: el servicio la normaliza (`iso10`) antes de comparar meses.
- **Vínculo del registro:** va al final, solo si la ficha no tiene uno (CAS `IS NULL`); nunca pisa otro.
- **Orden y fallas:** primero el grupo; si falla, no se toca nada. Si después falla la fecha, el niño ya quedó en su grupo y la respuesta lo dice.

### 3. UI

- **Componente compartido** `components/CoincidenciasFicha.js`:
  - Por ficha: estado, grupo, nivel, venta, retiro o retiro programado, contacto y la evidencia («Mismo registro / Muy probable / Posible»).
  - El título cambia según la evidencia: «Este registro ya fue inscrito», «Este niño ya tiene ficha» o «¿Este niño ya tiene ficha?».
- **Clase de prueba:** por ficha:
  - «colocarlo en el grupo N»;
  - «pasa al grupo N» o «sigue en el grupo X»;
  - «reincorporarlo»;
  - fecha de venta a elegir, sin opción marcada, y el botón no se habilita hasta elegir:
    - con venta: «dejarla así» o «corregirla» (solo hacia atrás o dentro del mismo mes);
    - pendiente sin venta, con una fecha en el formulario distinta de hoy: «Hoy, al colocarlo» o «la de este formulario»;
  - enlace «Abrir su ficha en Grupos» (`?ficha=<id>`).
- **Grupos (directo):** «Es este niño» abre «Editar niño» o «Reincorporar» ahí mismo. El `?ficha=<id>` se quita de la URL al abrir la ficha, así que recargar o volver atrás no reabre el modal.
- **«Es otro niño»:** en ambos modales pide el motivo en pantalla, no con `confirm()`.

### 4. Script SOLO LECTURA `scripts/listar-fichas-duplicadas-2026-10-01.mjs`

- Todas las consultas van en UNA transacción `readOnly` + `RepeatableRead` (encabezado `Neon-Batch-Read-Only`). Ninguna va suelta. No hay `--apply`.
- Grupos por centro (union-find). Los grupos EN CADENA, donde no todos coinciden entre sí, se marcan como «posibles hermanos» y no prometen ventas de más.
- Por ficha: estado, grupo, nivel, origen, registro de CRM, creación, venta canónica con su mes KPI y si ese mes ya no está abierto, asistencias (cantidad, primera y última), retiros y teléfono enmascarado.
- Por grupo:
  - ventas de más;
  - presentes el mismo día en dos fichas;
  - retiros posteriores a la otra ficha (posible retiro espurio);
  - la familia (otras fichas con el mismo teléfono o correo);
  - si el centro ya confirmó «es otro niño».
- Una venta por traslado (origen `traslado`) no cuenta como venta, igual que en el KPI: se muestra aparte («llegó por traslado») y no suma «ventas de más».
- `--json` escribe en `scripts/out/` (ignorado por git); `--centro <id>` filtra.

### 5. Tests

- `npm test`:
  - `test/ficha-existente.test.mjs`: reglas y reporte.
  - `test/inscribir-ficha-existente.test.mjs`: server action real con E/S sustituida.
- `npm run test:inscribir:db`: concurrencia contra Postgres real y desechable.
  - El mismo niño inscrito a la vez desde 4 pestañas deja 1 ficha; niños distintos no se frenan entre sí. Con el código de `main` el primer test FALLA (prueba de mutación).
  - **Primera alta del mes, sin fila de `mes_kpi`:** el candado se retiene hasta que 4 altas de niños distintos lo esperan. La primera crea la fila del mes y las otras 3 chocan con ella (40001), se reintentan y quedan las 4 fichas. Con `INTENTOS_ALTA = 1` este test FALLA (prueba de mutación). El mismo niño ×4 en un mes sin fila deja 1 ficha.

## Validación

- **Ronda 1, revisor independiente:** NO VALIDA, 10 hallazgos. Todos atendidos:
  - Al bloqueante (vincular no dejaba al niño en su grupo) y al de SSI (la lectura amplia dentro de SERIALIZABLE) se respondió con el candado de altas en lugar del re-chequeo por rango de PK que proponía el revisor: el candado no deja locks de predicado sobre las fichas.
  - Diferencias con lo que propuso: el motivo es obligatorio también en las coincidencias «posibles», por el incentivo de inscritos de la prima; y no se deshabilita la corrección por mes cerrado, porque el server responde el error sin tocar nada.
- **Ronda 2, revisor independiente:** NO VALIDA: 1 bloqueante, 1 importante y 4 menores. Todos atendidos en la ronda 3:
  1. **Bloqueante:** el servicio comparaba meses con `String(fecha).slice(0, 10)`, y con un `Date` del driver eso da «Tue Sep 01». El freno de «mes posterior» nunca saltaba, y una venta de septiembre podía pasar a octubre en silencio. Además, «colocarlo» ignoraba la fecha elegida. → `iso10` en el servicio, test con `new Date(...)`, y la UI respeta el radio siempre.
  2. **Importante:** al pendiente sin venta se le retrocedía la venta sin preguntar. Si su ficha era de un mes cerrado, la corrección fallaba siempre. → Elección explícita, y fecha y origen viajan en la misma llamada de colocación.
  3. Reintento también del 40P01, `lock_timeout` antes del candado, y prueba de la primera alta del mes sin fila de `mes_kpi`.
  4. `colocacionInvalida` pasa a `reincorporarEstudiante`, con el grupo bloqueado: cubre los dos caminos.
  5. `?ficha=` se limpia de la URL.
  6. El script excluye las ventas por traslado.
  - Señalado y fuera de alcance: en «Editar niño» de un pendiente, grupo + fecha en un solo guardado hacen nacer la venta hoy, no en la fecha. Ya pasa en `main` (regla g1-8/g2-1), pero el enlace «Abrir su ficha en Grupos» hace que ese camino se use más.
- **Medición en Postgres 16 real** (servidor de la acción, SERIALIZABLE). Por ronda: 3 altas de niños distintos + 6 marcas de asistencia del coach, todas en el mismo grupo y al mismo tiempo (carga sintética, peor que la real):

| Variante | Mismo niño ×4 a la vez (15 rondas): fichas de más | Altas que se guardan (de 180) | Asistencias que se guardan (de 360) | Asistencia: 40001 | Asistencia: 40P01 (deadlock) |
|---|---|---|---|---|---|
| `main` | 45 | 37 | 41 | 23 | 296 |
| ronda 1 | 0 | 57 | 60 | 32 | 268 |
| ronda 2 | 0 | 172 | 59 | 7 | 294 |
| ronda 3 (esta) | 0 | 180 | 60 | 5–6 | 294–295 |

- **Deadlocks:** aparecen en todas las variantes, también en `main`, donde el deadlock tumba 143 de 180 altas y 296 de 360 asistencias. Es un problema que ya existe: `marcarAsistencia` bloquea el mes y luego el grupo por la FK de `asistencias`, y el alta bloquea el grupo y luego el mes. Este PR reintenta el deadlock en el alta (180/180) y no empeora la asistencia. Arreglar el orden de locks de la asistencia es una tarea aparte.
- **Sol (gpt-6-sol) NO corrió:** la sesión fue en la nube y Codex vive en la Mac. Antes del merge, correr Sol en solo lectura desde la Mac (comando en el PR).
