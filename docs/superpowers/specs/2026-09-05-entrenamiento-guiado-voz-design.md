# Módulo de oficio guiado, paso a paso y con la voz de Fernando — diseño (v3)

Fecha: 2026-09-05 · Autor: Hermes · Pedido por Fernando en chat (texto literal en §1).
Rama prevista: `feat/entrenamiento-guiado-voz` (worktree `repos/worktrees/aloha-entrenamiento-guiado`, base comprobada `origin/main = 1628642`).
v3: cierra los 22 hallazgos de Sol en ronda 2 contra el código real de esa base. Arquitectura y alcance funcional permanecen cerrados.

## 1. Qué pidió Fernando

> Quiero hacer el entrenamiento del módulo **progresivo**. Por ejemplo, el "antes de leer" indica que busque ciertas cosas: si no lo presiona todo, no se avanza con la siguiente parte; cuando lo presiona, avanza. En los **conceptos**, que asumo están en todos los módulos, cada concepto deja un espacio para que la persona **escriba con sus propias palabras** lo que entendió, y que **no permita pegar**; eso le ayuda a entender. Si no completa esto no avanza, y así se tiene la sensación de que **se está guiado**. Que la guía sea **con mi voz**, para que el usuario sienta que se le guía en cada paso hasta completar todo el entrenamiento. Importante: mi voz **cero robótica y con ritmo**. Se hace en **todos los módulos**.

Aplicado al módulo de oficio actual (`/centro/[id]/entrenamiento/oficio/[modulo]`):

1. El alumno recorre una sección a la vez y el paso siguiente abre al cumplir el anterior.
2. En **A la vista** tiene que tildar todo antes de seguir.
3. En **Las palabras** escribe con sus palabras cada término vivo del glosario. El cliente bloquea pegar y soltar; el servidor rechaza copia, texto vacío o repetido.
4. Sin las palabras completas no se marca la lección; sin la lección marcada no se responde el cuestionario.
5. La voz de Fernando acompaña cada paso mediante un único reproductor.
6. Aplica a los **64 módulos digitales**: los 70 del catálogo menos los 6 de papel (`roles.length === 0`). El diseño sigue siendo dirigido por datos.

## 2. Decisiones cerradas

| Tema | Contrato v3 |
|---|---|
| Ubicación | La guía vive en la página actual como isla cliente `GuiaModulo`. Recibe slots construidos por el Server Component; no hay ruta ni wizard nuevo. |
| Quién la usa | Solo `esAlumno = !modoRevision && m.roles.includes(rol)` y con `gradienteAbierto`. El jefe entrenador y el alumno que mira un módulo aún cerrado conservan la página plana. |
| Revisión | `?revisar=` solo activa revisión si coincide con una entrada de la allowlist `oficio.revision` **y** el módulo está dentro de `entrada.plan`. En un módulo compartido, esa coincidencia manda sobre `m.roles.includes(rol)` y evita acumular progreso propio. Un valor no autorizado no concede revisión ni acceso. |
| Progreso anterior | Se respeta. Un `tour_visto_at` anterior al cambio sigue contando como lección estudiada aunque no tenga conceptos. La guarda de conceptos se aplica únicamente a la primera marca nueva. |
| Estado | Se deriva de `tour_visto_at`, `quiz_aprobado_at`, filas de conceptos y `localStorage` únicamente para `portada`, `vista` y `laminas`. No se agrega `paso_actual`. |
| Conceptos | Tabla nueva `entrenamiento_conceptos`, con upsert editable y aislamiento por usuario, módulo y slug vivo. |
| Anti-pegar | Cliente: `onPaste`, `onDrop` y `onBeforeInput` para `insertFromPaste`, `insertFromDrop` e `insertFromYank`. Servidor: `validarConcepto`, descrito en §5. |
| Candados | `marcarEstudiado` exige conceptos completos salvo grandfathering; `responderQuizOficio` exige `tour_visto_at` del mismo módulo. Ambas actions mantienen la guarda del gradiente. |
| Guiones | `GUIA[id] = { vista, palabras, cierre }`; `GUIA_GENERAL = { laminas, lectura, preguntas }`. La presentación actual `m.voz` es el audio de `portada`. |
| Audio | MP3 `mp3_44100_64`, en `public/entrenamiento`, con manifests separados para tour, oficio y guía. Los tours se validan y jamás se regeneran. |
| Voz aprobada | Fernando aprobó explícitamente el **5-sep-2026 a las 21:30 UTC** la voz `MUPKcfGINNwjsSaWv8yx` y la receta A: `eleven_multilingual_v2`, stability `0.38`, similarity `0.85`, style `0.45`, speed `1.0`, `use_speaker_boost: true`. También autorizó generar los clips nuevos. Esta identidad queda fijada en código; cambiarla requiere una decisión nueva. |
| Reproducción | Un `<audio>` persistente en `GuiaModulo`; el primer clic **Empezar** lo desbloquea. Una transición que pierda el gesto directo ofrece **▶ Seguir con Fernando**. La guía funciona muda. |

## 3. Pasos y derivación del estado

El Server Component arma un descriptor serializable `{ vista, palabras, laminas, preguntas, drills }`, con cantidades. `pasosDe(descriptor)` omite lo que tenga cantidad cero, salvo `portada`, `lectura` y `cierre`, y conserva este orden:

| # | id | Slot | Se cumple cuando | Clip |
|---|---|---|---|---|
| 0 | `portada` | `PortadaModulo` + **Empezar** + **Continuar** | efímero o cualquier evidencia durable posterior | `oficio/<id>.mp3` |
| 1 | `vista` | `MasaOficio` | lista completa + **Ya lo tengo a la vista**; también se infiere de evidencia durable | `guia/<id>/vista.mp3` |
| 2 | `palabras` | `ConceptosOficio` | todos los slugs vivos guardados; `tourVistoAt` también lo cumple por grandfathering | `guia/<id>/palabras.mp3` |
| 3 | `laminas` | `Diapositivas` + **Continuar** de la guía | efímero, `tourVistoAt` o `quizAprobadoAt` | `guia/general/laminas.mp3` |
| 4 | `lectura` | `BloquesOficio` + `MarcarEstudiado` | `tourVistoAt` | `guia/general/lectura.mp3` |
| 5 | `preguntas` | `QuizOficio` | `quizAprobadoAt` | `guia/general/preguntas.mp3` |
| 6 | `cierre` | `PanelDrill` + navegación | terminal; no se agrega a `hechos` | `guia/<id>/cierre.mp3` |

Funciones puras en `lib/entrenamiento/oficio/guia-pasos.js`, sin imports: `pasosDe`, `hechosDe`, `pasoActual`, `validarConcepto` y `EFIMEROS = ['portada', 'vista', 'laminas']`.

`hechosDe(p, conceptosGuardados, palabrasVivas, efimeros)` aplica estas inferencias exactas:

- algún concepto guardado implica `portada` y `vista`;
- conceptos completos implican además `palabras`;
- `tourVistoAt` implica `portada`, `vista`, `palabras`, `laminas` y `lectura`;
- `quizAprobadoAt` implica `portada`, `vista`, `laminas` y `preguntas`, pero **nunca** infiere `palabras` ni `lectura`;
- los efímeros se intersectan con `EFIMEROS` y con los pasos presentes.

`pasoActual` devuelve el primer paso no cumplido; si todos los pasos anteriores están cumplidos, devuelve `cierre`. Casos obligatorios:

- nuevo, sin datos → `portada`;
- progreso viejo con `tourVistoAt` y sin conceptos → `preguntas`; con quiz aprobado → `cierre`;
- tres de seis conceptos → `palabras`;
- conceptos completos, sin lección, con láminas → `laminas`; sin láminas → `lectura`;
- quiz viejo sin `tourVistoAt` y conceptos incompletos → `palabras`;
- quiz viejo sin `tourVistoAt` y conceptos completos → `lectura`.

## 4. `GuiaModulo` y composición React

### 4.1 Props, slots y contexto

`GuiaModulo` recibe solo props serializables: `usuarioId`, `moduloId`, `pasos: [{ id, titulo, detalle, clip, candado }]`, `hechosServidor: string[]` y los siete slots ReactNode. Pasar Server Components ya renderizados como slots de un Client Component es válido; los clientes dentro de esos slots consumen el provider que `GuiaModulo` coloca alrededor de `children`. Ningún cliente importa `guia.js`, `catalogo`, `cursos` ni `glosario`; `guia-pasos.js` sí está permitido porque no contiene prosa.

El contexto es explícitamente opcional: `useGuia()` devuelve el valor o `null`. `MasaOficio`, `MarcarEstudiado` y `QuizOficio` usan `guia?.completar(...)`; fuera del provider conservan su comportamiento plano sin un no-op oculto.

Composición exacta:

- guía: `MasaOficio` solo completa `vista`; `ConceptosOficio` guarda y completa `palabras`; `MarcarEstudiado` está junto a `BloquesOficio` y completa `lectura`; `QuizOficio` completa `preguntas` solo si `resultado.aprobado`;
- plana: `MasaOficio` conserva la lista local sin botón de avance, `MarcarEstudiado` queda junto a la lectura y llama la action, `QuizOficio` funciona como hoy y no necesita provider; no hay stepper;
- el botón de marcar estudio sale definitivamente de `MasaOficio`, porque tener la masa a la vista y haber leído son dos pasos distintos.

`ConceptosOficio` recibe `moduloId`, `terminos: [{ slug, termino, que, ejemplo, noConfundir }]` e `iniciales: { [slug]: texto }`. Por cada término pinta la ficha completa y un `<textarea autoComplete="off" spellCheck maxLength={700} rows={3}>`, botón **Guardar** y estado accesible de guardado/error. Una respuesta ya guardada sigue editable. `onPaste`, `onDrop` y los `inputType` de pegado/soltado muestran: **“Aquí no se pega: dilo con tus palabras, aunque salga torcido”**. El cliente mantiene lo escrito al fallar y sustituye el valor por `respuesta.texto` al guardar.

### 4.2 Máquina de estados

Estado: `{ hechos: Set, actual, abierto, audio, mute }`, donde `audio` es `idle | playing | paused | blocked`.

| Evento | Contrato |
|---|---|
| `montar` | Une `hechosServidor` con localStorage válido; calcula `actual`; no reproduce. La clave es `ofi-guia:<usuarioId>:<moduloId>`. La lectura JSON va en `try/catch`: JSON inválido o valor no-array produce `[]`; los ids desconocidos se descartan individualmente. |
| `completar(id, { durable = false })` | Ignora ids ausentes. Mantiene un `hechosRef` sincronizado: fuera de cualquier updater construye `nextHechos`, actualiza el ref y el estado, calcula `nextActual` y reproduce **ese** valor. No ejecuta efectos dentro de un updater de React ni usa el `actual` capturado. Persiste solo efímeros. Si `durable`, hace `router.refresh()` después de iniciar la transición. |
| nuevas props | Une evidencia durable nueva y recalcula sin retroceder durante la vida de la isla. |
| `ver(id)` | Abre o cierra un paso cumplido, sin reproducir. |
| `silenciar` | Al activar mute, pausa inmediatamente el audio actual y persiste `ofi_voz_mute`; al desactivar no reproduce solo. |
| `pausar` / `reanudar` | Opera sobre el único elemento; un rechazo al reanudar deja `blocked`. |
| `ended` | Pasa a `idle`. |

Llamadas exactas desde islas:

- `MasaOficio`: `completar('vista')` al pulsar el botón habilitado;
- `ConceptosOficio`: usa `completo` devuelto por el servidor y entonces `completar('palabras', { durable: true })`;
- `MarcarEstudiado`: tras `{ ok: true }`, `completar('lectura', { durable: true })`;
- `QuizOficio`: solo tras respuesta aprobada, `completar('preguntas', { durable: true })`; desaprobar no cambia el paso.

### 4.3 Reproductor único

Toda transición primero ejecuta sobre el audio anterior: `pause()`, `currentTime = 0`, `removeAttribute('src')`, `load()` y estado `idle`. Si el paso nuevo no tiene clip o mute está activo, termina ahí. Si hay clip: asigna `src`, llama `load()`, pone `currentTime = 0` y llama `play()` sin `await` previo. La promesa solo actualiza `playing` o `blocked`. El CTA **▶ Seguir con Fernando** repite la secuencia completa dentro de su propio handler.

`TourHost` está montado en `app/centro/[id]/layout.js` y hoy aporta otro `<audio>`. Se modifica `components/tour/TourHost.js` para devolver `null` en cualquier pathname `/entrenamiento/oficio` antes de montar `TourActivo`, aunque la URL traiga `?tour=`. Así:

- guía: un audio de `GuiaModulo`, sin `.ofi-voz`;
- plana: como máximo el audio de `.ofi-voz`, sin `TourHost`;
- una URL de oficio con `?tour=...` sigue teniendo como máximo un audio.

Accesibilidad: el paso actual lleva `aria-current="step"`; **Ver** lleva `aria-expanded`; las secciones ocultas usan `hidden` sobre `.ofi-guia__paso` y `.ofi-guia__paso[hidden] { display: none !important; }`. `hidden` es presentación; las actions son el candado real.

## 5. Conceptos y actions del servidor

### 5.1 Contratos de datos

`palabrasVivas(m) = [...new Set(m.palabras || [])].filter(slug => GLOSARIO[slug])`. Es la única lista usada para pintar, leer, comparar y contar.

`cargarConceptos(modulo)` devuelve una unión discriminada: `{ conceptos: { [slug]: texto } } | { error }`.

1. `requireCurrentUser()`.
2. Validar `MODULO_IDS_OFICIO.has(modulo)` antes de llamar `moduloOficio`.
3. Exigir `m.roles.includes(u.rol)`; módulo desconocido o ajeno devuelve error y no consulta conceptos.
4. Leer solo con parámetros ligados: `WHERE ec.usuario_id = :usuarioId AND ec.modulo = :modulo AND ec.slug = ANY(:vivos)`.

`page.js` comprueba `resultado.error`; nunca usa el objeto respuesta entero como mapa inicial.

`guardarConcepto(modulo, slug, texto)` devuelve `{ ok: true, texto, completo, faltan } | { error }` y aplica, en este orden:

1. usuario fresco, módulo válido, rol dueño, slug vivo y gradiente abierto;
2. `withTransaction(callback, { isolationLevel: 'ReadCommitted' })`;
3. dentro de la transacción, adquirir primero `pg_advisory_xact_lock(hashtext('conceptos:' || usuario_id || ':' || modulo))`;
4. leer los otros textos con `ec.usuario_id = :usuarioId AND ec.modulo = :modulo AND ec.slug = ANY(:vivos) AND ec.slug <> :slugActual`;
5. validar y hacer el upsert por `(usuario_id, modulo, slug)`;
6. contar después del upsert con los mismos predicados y `COUNT(DISTINCT slug)::int AS n`; normalizar `n = Number(row.n)`;
7. responder `completo = n === vivos.length` y `faltan = Math.max(0, vivos.length - n)`.

`READ COMMITTED` más el advisory lock por usuario y módulo hace que dos pestañas vean la escritura comprometida anterior. No se acepta `SERIALIZABLE` sin reintento completo de `40001`. La UI avanza según `completo` del servidor, no según su copia local.

`marcarEstudiado(modulo)` conserva usuario fresco, módulo/rol y `gradienteAbierto`. Después de leer `previo`:

1. si `previo[modulo]?.tourVistoAt`, devuelve `{ ok: true }` sin exigir conceptos ni volver a escribir: grandfathering idempotente;
2. si es primera marca, cuenta únicamente filas del mismo usuario, mismo módulo y slugs vivos con `COUNT(DISTINCT slug)::int`; convierte con `Number`;
3. si faltan, devuelve `Antes de marcar este módulo escribe con tus palabras las N palabras que faltan.`;
4. si están todas, conserva el upsert actual de `tour_visto_at`.

`responderQuizOficio(modulo, respuestas)` conserva usuario fresco, módulo/rol y gradiente. **Antes** de validar el payload, llamar `corregirQuizOficio` o escribir un intento, exige `progreso[modulo]?.tourVistoAt`; si falta devuelve `Antes de responder marca la lección como realizada.`. Un rechazo no incrementa intentos.

`PortadaModulo` agrega `RESTRICCION_QUIZ = 'la Lección esté marcada como realizada.'`: mientras no haya `tourVistoAt`, el cuestionario muestra ese candado además del bloqueo del gradiente. El test de portada liga ese texto con la guarda anterior de `responderQuizOficio`.

`cargarOficio()` cambia de `requireSession()` a `requireCurrentUser()`, usa `u.id`, `u.rol`, `u.centro_id` y `u.centros`, e incluye `usuarioId: Number(u.id)` en `comun`. Esto evita que la página ofrezca una guía con un rol vencido en la cookie mientras las escrituras ya lo rechazan. Los tests de revisión que hoy buscan `s.rol` se actualizan a `u.rol`; `resumenOficio` queda fuera de este cambio.

### 5.2 Validación pura

`validarConcepto(texto, ficha, otros)` normaliza con `trim`, NFD sin diacríticos, minúsculas, caracteres ajenos a `[a-z0-9ñ]` convertidos en espacio y espacios colapsados. Rechaza, en orden:

1. valor no-string, menos de 8 palabras o menos de 30 caracteres normalizados → `Escribe al menos una frase completa: qué es y para qué sirve.`;
2. `texto.trim().length > 700` → `Con dos o tres frases alcanza.`;
3. menos de 4 palabras distintas → `Eso no explica nada todavía.`;
4. igualdad normalizada con otro texto del mismo usuario y módulo, excluyendo el slug actual → `Ya usaste ese mismo texto para otra palabra.`;
5. copia de la ficha: `A` es el **array** de todas las ventanas de cuatro palabras del texto, con multiplicidad; `B` es el Set de ventanas de la ficha concatenada (`termino`, `que`, `ejemplo`, `noConfundir`, sin markdown). Si `A.filter(g => B.has(g)).length / A.length >= 0.6`, devuelve `Eso está copiado del glosario. Dilo con tus palabras, aunque salga torcido.`.

Ocho palabras garantizan cinco ventanas en el array, aunque se repitan. Si pasa, retorna `{ ok: true, texto: texto.trim() }`; eso mismo se guarda. Una paráfrasis razonable pasa: la comprensión final la verifica el jefe entrenador en la maniobra.

## 6. Página y modo revisión

Carga en dos fases: `Promise.all([getCentroNombre(id), cargarOficio()])`; solo después de resolver identidad y modo se llama `cargarConceptos(m.id)` para `esAlumno && abierto`.

Derivación obligatoria:

```js
const revisionSolicitada = (oficio.revision || []).find((r) =>
  r.rol === sp?.revisar && (r.plan || []).some((x) => x.id === m.id))
const revisionDisponible = (oficio.revision || []).find((r) =>
  (r.plan || []).some((x) => x.id === m.id))
const modoRevision = Boolean(revisionSolicitada)
const esAlumno = !modoRevision && m.roles.includes(oficio.rol)
const esOficial = Boolean(revisionSolicitada || revisionDisponible)
```

El acceso se permite si `esAlumno || esOficial`; nunca se confía solo en `sp.revisar`. Para navegación, `rolPlan = esAlumno ? oficio.rol : (revisionSolicitada || revisionDisponible).rol`. Esto resuelve el módulo compartido: con una revisión permitida explícita se lee plano y no se carga ni escribe progreso propio; sin revisión válida, el dueño sigue en su plan.

Salidas digitales:

1. `esAlumno && abierto`: guía, conceptos y slots, sin `.ofi-voz`;
2. `esAlumno && !abierto`: página plana, lectura libre, `MasaOficio` local, `MarcarEstudiado` bloqueado y quiz bloqueado;
3. `esOficial`: página plana de revisión, sin controles de progreso, con `.ofi-voz` y navegación por la entrada allowlisted.

Los módulos de papel mantienen su salida actual previa a estas ramas. `hechosServidor` se calcula con `hechosDe` y conceptos; `router.refresh()` repinta `PortadaModulo` y `PanelDrill` después de cada mutación durable.

## 7. Modelo de datos y archivos

```sql
CREATE TABLE IF NOT EXISTS entrenamiento_conceptos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo      TEXT NOT NULL,
  slug        TEXT NOT NULL,
  texto       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, modulo, slug)
);
```

La tabla queda en `db/schema.sql` y en la migración idempotente `db/migrations/2026-09-05-entrenamiento-conceptos.sql`. La migración se ejecuta antes del deploy. `reiniciarProgreso` de los nueve tours conserva `modulo NOT LIKE 'of-%'` y no toca esta tabla. Un futuro reinicio de oficio queda fuera de alcance: si debe borrar también los efímeros hará falta versionar la clave de localStorage o guardar una época de progreso; borrar solo filas durables dejaría `portada`, `vista` o `laminas` locales y no se describe como reinicio total.

Archivos nuevos:

```text
lib/entrenamiento/oficio/guia.js
lib/entrenamiento/oficio/guia-pasos.js
lib/entrenamiento/audio-manifest-guia.json
components/entrenamiento/GuiaModulo.js
components/entrenamiento/ConceptosOficio.js
components/entrenamiento/MarcarEstudiado.js
db/migrations/2026-09-05-entrenamiento-conceptos.sql
test/entrenamiento-guia.test.mjs
```

Archivos que se modifican:

```text
app/centro/[id]/entrenamiento/oficio/[modulo]/page.js
app/actions/entrenamiento-oficio.js
components/entrenamiento/MasaOficio.js
components/entrenamiento/QuizOficio.js
components/entrenamiento/PortadaModulo.js
components/tour/TourHost.js
scripts/entrenamiento-audio.mjs
db/schema.sql
app/globals.css
.gitignore
test/entrenamiento-oficio.test.mjs
test/entrenamiento-oficio-revision.test.mjs
test/entrenamiento-oficio-voz.test.mjs
test/entrenamiento-marca-oficio.test.mjs
test/entrenamiento-portada-oficio.test.mjs
```

No se modifican `lib/entrenamiento/modulos.js`, `progreso.js`, `respuestas.js`, los nueve tours, `catalogo.js`, `cursos/*`, `glosario.js`, `Diapositivas`, `PanelDrill`, `BloquesOficio`, `SopHoja`, la cola de firmas ni la matriz.

## 8. Voz y script de generación

### 8.1 Recetas y hash compatible

`RECETAS` conserva objetos completos y orden estable:

```js
const RECETAS = {
  tour: {
    voiceId: 'I0uPgrx2Hf3g0QzMYLnq',
    settings: { model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 1.0 } },
    format: 'mp3_44100_64',
  },
  oficio: {
    voiceId: 'MUPKcfGINNwjsSaWv8yx',
    settings: { model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 1.0 } },
    format: 'mp3_44100_64',
  },
  guia: { /* mismo contenido y orden que oficio */ },
}
export const hashDe = (texto, receta) => sha1(
  texto + JSON.stringify(receta.settings) + receta.voiceId + receta.format)
```

La fórmula es literalmente la legacy actual. No se hashea `JSON.stringify(receta)` ni se reordena `settings`. La prueba recalcula las 66 entradas actuales del manifest de tours; por ejemplo, `meta/intro` conserva su hash actual. Esos 66 MP3 se conservan. El ID nuevo queda fijado: no se usa `ELEVENLABS_VOICE_ID` para esta corrida autorizada.

### 8.2 Familias y módulos elegibles

`clipsDeOficio` conserva el formato de su API y claves, pero filtra explícitamente `m.roles.length > 0`: 64 clips. `export function clipsDeGuia(filtro = null)` usa los mismos 64 módulos y produce tres clips por módulo más tres generales: 195 clips. Sin filtro incluye todo; `filtro = <id-digital>` devuelve solo sus tres clips y `filtro = 'general'` solo los tres generales. Los seis módulos de papel nunca producen audio digital. Los tests actuales que dicen “40 módulos” o comparan contra los 70 se actualizan en conjunto: `un clip por módulo…`, `los guiones de voz…`, `los 40 módulos…`, `manifest…toda entrada…` y `manifest…un clip…` comparan contra `MODULOS_OFICIO.filter(m => m.roles.length > 0)`.

Los guiones de guía cumplen:

- break válido `<break time="0.Ns"/>` y tramo máximo de 135 caracteres;
- reglas de markdown, dígitos, `%`, `B/.`, raya larga, longitud y vocabulario se ejecutan sobre una copia **sin tags `<break>`**; la sintaxis de los tags se valida antes de retirarlos;
- segunda persona y texto visible sin vocabulario viejo;
- largos sin tags: vista 150–450, palabras 200–600, cierre 150–500, generales 150–450;
- `vista` menciona al menos dos elementos de `masa`; `palabras` menciona un término literal y el total en letras;
- `GUIA[id]` participa en el barrido de marca junto a su módulo; `GUIA_GENERAL` se revisa aparte con cupo cero.

### 8.3 Orden de ejecución y CLI

Antes de resolver credenciales o construir una cola generable, el script valida todos los tours seleccionados contra texto, receta, manifest y archivo. Cualquier discrepancia imprime el detalle, pone `process.exitCode = 1` y el clip queda excluido siempre de la cola. `--solo tour` funciona sin API key y con cero llamadas a `fetch`, tanto verde como rojo.

Solo después se resuelven clips de oficio/guía. `--seco` nunca exige key, llama API ni escribe. Una corrida real que tenga clips nuevos seleccionados exige `ELEVENLABS_API_KEY` antes de la primera llamada. La voz y receta ya están fijadas, así que no existe el gate anterior de audición.

Resolución de `--solo`:

| Valor | Selección |
|---|---|
| `tour` o id de tour | valida todos o uno; nunca genera |
| `oficio` | 64 presentaciones |
| id digital `of-…` | su presentación |
| curso | presentaciones digitales de ese curso |
| `guia` | 195 clips: los 64×3 y tres generales |
| `guia:<id-digital>` | solo `vista`, `palabras`, `cierre` de ese módulo; no generales |
| `general` | solo los tres generales |
| `guia:<id-de-papel>` o id de papel | error y código no cero |

`--muestra` es incompatible con `--solo` y falla de forma explícita si se combinan. Solo selecciona tres presentaciones de oficio de cursos distintos y `guia/of-met-1/vista`; escribe bajo `.muestra/`, nunca en `public`, y no lee ni escribe manifests como destino. `.muestra/` queda ignorado por git. La corrida autorizada completa escribe cada manifest de forma atómica e incremental por hash.

Para hacer el CLI comprobable, la lógica exporta `ejecutarAudio({ args, env, fetchImpl, paths })`; el wrapper directo le pasa `process.argv`, `process.env`, `fetch` y las rutas reales. Esto permite probar llamadas y escrituras reales en un directorio temporal sin red.

## 9. Verificación exigida

### 9.1 Unitarias y contratos estáticos útiles

- `pasosDe`, `hechosDe` y `pasoActual`: todos los escenarios de §3, incluidos los dos de quiz viejo sin lección.
- `validarConcepto`: cada error exacto, copia literal, copia con dos palabras cambiadas, secuencia repetitiva de ocho palabras, paráfrasis válida, edición del mismo slug y tipos no-string.
- `GUIA`: exactamente 64 módulos digitales con sus tres textos y tres generales; reglas de guion y marca.
- higiene de bundle: ampliar el test para prohibir en todo `'use client'` `oficio/guia` o `guia.js`, además de catálogo/cursos/glosario, y permitir explícitamente `guia-pasos.js`.
- `test/entrenamiento-oficio-revision.test.mjs`: módulo compartido con `revisar` allowlisted resuelve página plana y plan ajeno; un `revisar` no allowlisted no activa revisión ni concede acceso. El navegador de §9.4 es la prueba conductual decisiva.
- hash: recalcular cada entrada existente del manifest de tours con la fórmula legacy y receta completa.
- los cuatro archivos congelados de tours (`modulos.js`, `progreso.js`, `respuestas.js`, `test/entrenamiento.test.mjs`) permanecen byte-idénticos a `origin/main`.

Los tests estáticos de orden de llamadas se conservan como alarma de regresión, pero no prueban autorización, aislamiento ni concurrencia por sí solos.

### 9.2 Actions y base de datos, conductuales

En la base disposable local y mediante la capa de actions con sesión controlada:

- dos usuarios, dos módulos y una fila de slug obsoleto demuestran que cargar, validar y contar no cruzan `usuario_id`, `modulo` ni slugs vivos;
- módulo desconocido y módulo ajeno devuelven la rama `{ error }` sin consultar conceptos;
- dos guardados concurrentes de slugs distintos terminan completos; dos textos iguales concurrentes dejan uno rechazado, sin `40001` expuesto;
- la respuesta de guardar trae `texto`, `completo` y `faltan`, y una segunda pestaña puede avanzar con la verdad del servidor;
- progreso viejo con `tourVistoAt` y cero conceptos hace `marcarEstudiado` idempotente; usuario nuevo sin conceptos queda bloqueado; con todos, marca;
- quiz sin lección no incrementa intentos; con lección conserva corrección, puntaje y aprobación actuales;
- `cargarOficio` refleja un cambio de rol o usuario eliminado de la base, no el JWT viejo.

### 9.3 CLI de audio, conductual

Con `fetchImpl` espía y filesystem temporal:

- `--solo tour` sin credenciales produce cero fetch; una discrepancia sale no cero y tampoco genera;
- `--seco` no escribe ni llama red;
- cada valor de la tabla de §8.3 selecciona exactamente sus claves; papel falla;
- `--muestra` crea exactamente cuatro mp3 bajo `.muestra` y deja byte-idénticos los tres manifests y `public`;
- una generación de guía usa en URL/body la voz, formato y settings aprobados y actualiza solo el manifest de guía;
- cobertura de manifests: si existe la primera entrada de oficio o guía, se exige la familia digital completa y cada MP3 en disco.

### 9.4 Navegador

Antes del merge, con usuario y base desechables:

1. Alumna abre `of-met-1`: **Empezar** reproduce la portada y queda allí; **Continuar** abre A la vista.
2. El botón de vista permanece deshabilitado hasta tildar todo; luego avanza.
3. Pegar y soltar quedan bloqueados; copiar la ficha tecleándola devuelve error de servidor; una explicación propia guarda.
4. Con la última palabra, incluso si otra pestaña guardó una anterior, avanza usando `completo` del servidor.
5. No puede marcar lectura antes de completar palabras ni responder antes de marcar lectura; los rechazos no escriben progreso incoherente.
6. Aprobar refresca los indicadores y abre cierre; desaprobar permanece en preguntas.
7. Recargar en cada paso cae en el correcto; JSON local corrupto no rompe; mute persiste; el oculto computa `display: none`.
8. En ruta limpia y con `?tour=...`, `document.querySelectorAll('audio').length === 1` para guía y para página plana con clip.
9. Coordinadora/administradora abre con `?revisar=<rol permitido>` un módulo compartido: ve página plana, navegación del plan revisado y ninguna carga/escritura propia. Un `revisar` no autorizado no activa ese modo ni concede acceso.
10. Gerencia revisora y módulo cerrado por orden conservan la página plana; el módulo de papel conserva su hoja.

La prueba manual final en iPhone sigue siendo necesaria para la política real de Safari: Empezar, transición después de Server Action y CTA de recuperación.

## 10. Fuera de alcance y riesgo residual

Quedan fuera: mostrar conceptos al jefe entrenador en la cola o matriz, regenerar tours, y crear un reinicio de progreso de oficio. La falta de permiso `user_read` en la key de ElevenLabs impide consultar saldo, pero no bloquea la generación autorizada. El único riesgo no cerrable en esta Mac es la política exacta de audio de iOS; el CTA cubre el rechazo y la aceptación final se prueba en el teléfono de Fernando.

## 11. Mapa ronda 2 → solución

| Hallazgos | Solución v3 |
|---|---|
| 1 | Quiz viejo infiere solo efímeros y `preguntas`; casos con/sin conceptos separados (§3). |
| 2 | `modoRevision` sale de `oficio.revision` y verifica pertenencia al plan (§6). |
| 3 | Fórmula legacy literal y receta completa con orden estable (§8.1). |
| 4–5 | Predicados SQL exactos, slugs vivos, `COUNT::int` y `Number` (§5.1). |
| 6 | Retorno idempotente antes del conteo para progreso viejo (§5.1). |
| 7 | `READ COMMITTED`, lock primero y prueba concurrente (§5.1, §9.2). |
| 8 | `cargarOficio` usa `requireCurrentUser`, `u.id` y rol fresco (§5.1). |
| 9–11 | Contexto opcional explícito, composición plana, durable exacto, transición con ref sincronizado y respuesta `completo` del servidor (§4). |
| 12–13 | `TourHost` suprimido en oficio y ciclo completo de reset/play/mute (§4.3). |
| 14–15 | Tours se validan antes de credenciales; voz nueva queda fijada y aprobada (§8). |
| 16 | Filtro real `roles.length > 0` y actualización enumerada de tests (§8.2). |
| 17 | Barrido cliente prohíbe `guia.js` y permite solo `guia-pasos.js` (§9.1). |
| 18 | Se validan breaks y luego se retiran para reglas léxicas (§8.2). |
| 19 | Respuesta discriminada y módulo validado antes de dereferenciar (§5.1). |
| 20 | 4-gramas con multiplicidad, sin garantía falsa sobre Sets (§5.2). |
| 21 | `try/catch` de localStorage y futuro reinicio con versión/época (§4.2, §7). |
| 22 | Tabla CLI, papel no cero, incompatibilidad muestra/solo y pruebas en filesystem temporal (§8.3, §9.3). |

VEREDICTO: VALIDA
