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
  - Un 40001 se reintenta hasta 3 veces con foto nueva, como hace la conciliación del KPI.
- **Con coincidencias** responde `{ error, coincidencias, registroYaInscrito | requiereConfirmacion }` y no escribe nada.
- **«Es otro niño»:** `ficha_nueva: { descartadas, motivo, nota }`.
  - Crea solo si el centro vio TODAS las fichas que coinciden ahora; una que apareció después vuelve a preguntar.
  - El motivo es obligatorio: hermano/a, otro niño con el mismo nombre, u otro con nota.
  - El rastro queda en `detalle.ficha_nueva_confirmada` del evento de venta: descartadas, motivo, nota y quién. El alta pendiente no tiene evento de venta y se queda sin rastro.

### 2. `vincularFichaExistente` (orquestación en `lib/ficha-existente-service.mjs`)

«Es este niño» no crea ficha y deja al niño donde el centro lo quiere por los caminos que ya existen:

- **Retirado:** se reincorpora (`reincorporarEstudiante`) en el grupo elegido, solo si `colocacionInvalida` lo permite. La reincorporación de Grupos no lo valida. Si el nivel no coincide, la pantalla lo avisa.
- **Sin grupo:** primera colocación con «Editar niño» (`actualizarEstudiante({ grupo_id })`). Luego se corrige la venta a la fecha del formulario.
- **En otro grupo:** traslado SOLO si el centro elige «Es este niño y pasa al grupo N». Si no hay semana equivalente, el error sale tal cual.
- **Fecha de venta:** solo si el centro la eligió, con el mismo camino del #150 (`actualizarEstudiante({ fecha_inscripcion })`). Nunca a un mes POSTERIOR al de su venta: eso es «Editar niño», a conciencia. La pantalla solo la ofrece hacia atrás o dentro del mismo mes.
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
  - fecha de venta a elegir, sin opción marcada;
  - enlace «Abrir su ficha en Grupos» (`?ficha=<id>`).
- **Grupos (directo):** «Es este niño» abre «Editar niño» o «Reincorporar» ahí mismo.
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
- `--json` escribe en `scripts/out/` (ignorado por git); `--centro <id>` filtra.

### 5. Tests

- `npm test`:
  - `test/ficha-existente.test.mjs`: reglas y reporte.
  - `test/inscribir-ficha-existente.test.mjs`: server action real con E/S sustituida.
- `npm run test:inscribir:db`: concurrencia contra Postgres real y desechable. El mismo niño inscrito a la vez desde 4 pestañas deja 1 ficha; niños distintos no se frenan entre sí. Con el código de `main` el primer test FALLA (prueba de mutación).

## Validación

- **Ronda 1, revisor independiente:** NO VALIDA, 10 hallazgos. Todos atendidos:
  - Al bloqueante (vincular no dejaba al niño en su grupo) y al de SSI (la lectura amplia dentro de SERIALIZABLE) se respondió con el candado de altas en lugar del re-chequeo por rango de PK que proponía el revisor: el candado no deja locks de predicado sobre las fichas.
  - Diferencias con lo que propuso: el motivo es obligatorio también en las coincidencias «posibles», por el incentivo de inscritos de la prima; y no se deshabilita la corrección por mes cerrado, porque el server responde el error sin tocar nada.
- **Medición en Postgres 16 real** (servidor de la acción, SERIALIZABLE):

| Variante | Mismo niño ×4 a la vez (15 rondas) | Asistencia del coach con altas concurrentes (60 rondas) |
|---|---|---|
| `main` | 45 fichas de más | 23 × 40001 |
| ronda 1 | 0 | 32 × 40001 |
| ronda 2 | 0 | 7 × 40001 |

- **Deadlocks:** aparecieron en las 3 variantes, también en `main`. Es un problema que ya existe: `marcarAsistencia` bloquea el mes y luego el grupo por la FK de `asistencias`, y el alta bloquea el grupo y luego el mes. Queda como tarea aparte.
- **Sol (gpt-6-sol) NO corrió:** la sesión fue en la nube y Codex vive en la Mac. Antes del merge, correr Sol en solo lectura desde la Mac (comando en el PR).
