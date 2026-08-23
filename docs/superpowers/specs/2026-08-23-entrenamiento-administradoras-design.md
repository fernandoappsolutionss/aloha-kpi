# Entrenamiento dentro del sistema KPI — diseño

Fecha: 2026-08-23 · Autor: Hermes · Aprobado por Fernando en chat (formato tour + voz clonada + quiz 3/3, sin bloqueo duro).

## 1. Qué se construye y por qué

Un módulo de **entrenamiento dentro de la app** para administradoras (rol `administradora`; incluye a las asistentes, que usan el mismo rol). Reemplaza al PDF del SOP como forma principal de aprender el sistema. ⚠️ El SOP fuente (HTML + capturas) vive FUERA de este repo — contiene capturas con nombres reales de niños y coaches y este repo es PÚBLICO; nunca commitearlo aquí. Copia de trabajo: la carpeta `docs/sop/` del clon local de la Mac (repos/aloha-kpi, sin commitear).

Tres piezas:

1. **Tour guiado sobre la UI real**: resalta el botón de verdad, lo explica con la voz de Fernando y, donde aplica, espera a que la administradora lo haga ella misma.
2. **Quiz de 3 preguntas por módulo**: un módulo cuenta como completado solo con tour visto **y** 3/3.
3. **Registro de progreso** por usuario, visible para ella (menú con `4/9`, banner en Resumen) y para gerencia (matriz usuarios × módulos).

Más dos páginas de consulta sin quiz: **Errores que más cuestan** y **Preguntas frecuentes**.

Meta pedagógica explícita (módulo 1): el fin de la administradora es **subir de nivel de centro** — 170/200/230/325/410 niños activos al cierre del trimestre (`lib/nivel.js`), con deserción mensual < 8%. Todo el entrenamiento se cuelga de esa meta.

## 2. Decisiones tomadas (no reabrir)

| Decisión | Elegido | Descartado y por qué |
|---|---|---|
| Formato | Tour sobre la app real + audio | Videos renderizados: se desactualizan con cada cambio de UI. Página con capturas: es el PDF otra vez. |
| Motor del tour | Propio, mínimo (~250 líneas) | driver.js u otra librería: su modelo es siguiente/anterior; "hazlo tú" y audio habría que montarlos encima igual, y trae estilos ajenos. |
| Voz | Clon de Fernando en ElevenLabs (`I0uPgrx2Hf3g0QzMYLnq`, `eleven_multilingual_v2`, stability 0.38 / similarity 0.85 / style 0.45, speed 1.0) | Voz neutra. |
| Verificación | Quiz 3 preguntas, exige 3/3, intentos ilimitados | Solo "visto" (no distingue ver de entender). Detectar acción real (obliga a modo práctica con datos). |
| Gate | Suave: banner en Resumen + contador en menú. **No** bloquea el sistema | Bloqueo duro. Queda como flag futuro si Fernando lo pide. |
| Contenido | Como código en `lib/entrenamiento/modulos.js` | CMS o tabla en BD: el contenido cambia con la UI, debe ir en el mismo PR que el botón. |
| Audio | mp3 en `public/entrenamiento/`, generados por script con manifest de hashes en `lib/entrenamiento/audio-manifest.json` | Vercel Blob: una indirección más sin necesidad a ~10 MB. |
| Respuestas del quiz | Archivo solo-servidor `lib/entrenamiento/respuestas.js`, corrección en server action | Mandar la correcta al cliente. |

## 3. Regla de seguridad del tour

**El tour nunca pide confirmar una acción que escriba datos.** Los pasos "hazlo tú" solo son: navegar por el menú, abrir un modal, seleccionar un grupo, cambiar de pestaña, y **cancelar** el modal. Aperturar, inscribir, crear clase de prueba, aplicar fusión, cerrar mes y extender ventana se **muestran**, nunca se ejecutan desde el tour. Así el entrenamiento corre contra el centro real sin ensuciarlo.

## 4. Arquitectura

```
app/centro/[id]/layout.js                 ← nuevo: {children} + <TourHost/>
app/centro/[id]/entrenamiento/page.js     ← índice: módulos, progreso, errores, FAQ
app/centro/[id]/entrenamiento/[modulo]/page.js ← intro + iniciar tour + errores del módulo + quiz
app/dashboard/entrenamiento/page.js       ← gerencia: matriz usuarios × módulos
app/actions/entrenamiento.js              ← server actions (progreso, quiz)
components/tour/TourHost.js               ← motor: lee la URL, resalta, habla, avanza
components/tour/tour.css (o bloque en globals.css)
lib/entrenamiento/modulos.js              ← contenido (módulos, pasos, quiz sin respuestas, errores, FAQ)
lib/entrenamiento/respuestas.js           ← { modulo: [idx, idx, idx] } — solo servidor
lib/entrenamiento/progreso.js             ← cálculo puro: completado, porcentaje, siguiente módulo
scripts/entrenamiento-audio.mjs           ← genera mp3 con ElevenLabs, manifest de hashes
public/entrenamiento/<modulo>/<paso>.mp3 + lib/entrenamiento/audio-manifest.json (importable desde el cliente)
db/schema.sql                             ← tabla entrenamiento_progreso
test/entrenamiento.test.mjs               ← seguro de mantenimiento (sección 10)
```

Atributos `data-tour="<id>"` en 64 elementos reales de las páginas existentes (sección 7; 50 los usa algún paso, el resto queda como contrato). Es el único cambio en páginas actuales, más el ítem de menú en `components/Sidebar.js` y una prop `tour` en `components/PlanNino.js` (`LineaTiempoPlan`, la línea de chips del itinerario).

## 5. Modelo de datos

```sql
CREATE TABLE IF NOT EXISTS entrenamiento_progreso (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL,            -- id del módulo en modulos.js
  tour_visto_at    TIMESTAMPTZ,              -- llegó al último paso del tour
  quiz_aprobado_at TIMESTAMPTZ,              -- 3/3
  intentos         INTEGER NOT NULL DEFAULT 0,
  ultimo_puntaje   INTEGER,                  -- 0..3
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, modulo)
);
```
(El UNIQUE ya indexa `usuario_id` como primera columna; no hace falta índice aparte.)

Completado = `tour_visto_at IS NOT NULL AND quiz_aprobado_at IS NOT NULL`. El progreso es **por usuario**, no por centro: dos administradoras del mismo centro llevan cada una el suyo.

## 6. Esquema del contenido (`lib/entrenamiento/modulos.js`)

```js
export const MODULOS = [
  {
    id: 'meta',                       // slug de URL y clave en BD
    orden: 1,
    titulo: 'Tu meta: subir de nivel',
    duracionMin: 4,                   // estimado mostrado en la tarjeta
    intro: { texto: '…', voz: '…opcional con <break> y MAYÚSCULAS…' },
    inicio: { ruta: '/centro/{id}' }, // a dónde navega "Iniciar recorrido"
    pasos: [
      { id: 'meta-1', tipo: 'mostrar', target: 'resumen.ruta', titulo: '…', texto: '…', voz: '…' },
      { id: 'meta-2', tipo: 'hazlo',   target: 'nav.ruta',     titulo: '…', texto: 'Haz clic en Ruta de Nivel', ruta: '/centro/{id}/ruta-nivel' },
      { id: 'meta-3', tipo: 'mostrar', target: 'ruta.barra', … },
    ],
    quiz: [
      { pregunta: '…', opciones: ['…','…','…','…'], explicacion: '…' },   // SIN índice correcto
      …, …                                                                // exactamente 3
    ],
    errores: [ { sintoma: '…', causa: '…', arreglo: '…' } ],
  },
  …
]
export const ERRORES_GLOBALES = [ { sintoma, causa, arreglo, modulo: 'llenado' } ]  // 10-12
export const FAQ = [ { pregunta, respuesta, modulo } ]                              // 12-15
```

Reglas:
- `tipo` ∈ `mostrar` | `hazlo`. Un paso `hazlo` avanza cuando el usuario hace clic en el `target`; si trae `ruta`, el motor intercepta el clic, navega con `router.push(ruta + '?tour=<modulo>&paso=<n+1>')` y el tour sigue en la página destino.
- `voz` es opcional; si falta, el audio se genera de `texto`. El texto en pantalla **siempre** es `texto` (sin marcas).
- `texto` ≤ 35 palabras por paso (el clon lee lento; 12-15 s por paso).
- Cada módulo: 5-8 pasos, exactamente 3 preguntas de quiz, 1-3 errores propios.
- `{id}` en rutas se sustituye por el `centroId` actual.

### Los 9 módulos (orden fijo)

| # | id | Título | Pantalla del tour | Contenido fuente (SOP) |
|---|---|---|---|---|
| 1 | `meta` | Tu meta: subir de nivel | Resumen → Ruta de Nivel | §1 |
| 2 | `modelo` | El modelo: todo nace del grupo | Grupos (vista general, sin hazlo salvo navegar) | §2 intro |
| 3 | `aperturar` | Aperturar un grupo | Grupos → modal Aperturar (hazlo: abrir; mostrar campos; hazlo: Cancelar) | §2 paso 1 |
| 4 | `clase-prueba` | La clase de prueba amarrada al grupo | Clases de Prueba → modal Nueva (hazlo: abrir; mostrar "Grupo que se va a aperturar"; hazlo: Cancelar) | §2 paso 2 |
| 5 | `inscribir` | Inscribir al niño | Grupos → modal Inscribir (hazlo: abrir; mostrar campos; hazlo: Cancelar) | §2 paso 3 |
| 6 | `llenado` | El llenado que se controla solo | Grupos → hazlo: seleccionar un grupo; mostrar bloque LLENADO, botón gris, Extender ventana | §3 |
| 7 | `itinerario` | Itinerario y lista del coach | Grupos → panel → hazlo: pestaña Itinerario; mostrar línea, Ajustar, Link del coach | §4 |
| 8 | `fusiones` | Fusiones | Grupos → hazlo: pestaña Fusiones; mostrar reglas, bajo meta, sugeridas, Aplicar (solo mostrar) | §6 |
| 9 | `cierre` | Cierre de mes | Cuadro (comparación) → KPI (hazlo: navegar; mostrar Cerrar mes, historial, Reabrir) | §7 |

## 7. Atributos `data-tour` (contrato UI ↔ contenido)

Sidebar: `nav.resumen nav.ruta nav.kpi nav.grupos nav.cuadro nav.eventos nav.entrenamiento`
Resumen: `resumen.ruta resumen.metas resumen.embudo`
Ruta de nivel: `ruta.barra ruta.escenarios`
Grupos: `grupos.aperturar grupos.inscribir grupos.tabs grupos.tab-fusiones grupos.lista grupos.tarjeta` (la primera tarjeta visible) `grupo.panel grupo.inscribir-aqui grupo.cerrar-inscripciones grupo.link-coach grupo.buscar-fusion grupo.llenado grupo.extender-ventana grupo.tab-ninos grupo.tab-itinerario grupo.ajustar-itinerario grupo.itinerario-linea`
Modal aperturar: `aperturar.numero aperturar.itinerario aperturar.coach aperturar.fecha-inicio aperturar.nivel aperturar.online aperturar.cancelar aperturar.confirmar`
Modal inscribir: `inscribir.nombre inscribir.grupo inscribir.origen inscribir.origen-comercial inscribir.fecha inscribir.cierre-override inscribir.cancelar inscribir.confirmar`
Clases de prueba: `eventos.nueva eventos.metricas eventos.lista evento.grupo evento.inicio evento.cancelar evento.crear`
Fusiones: `fusiones.reglas fusiones.bajo-meta fusiones.sugeridas fusiones.aplicar`
Cuadro: `cuadro.comparacion cuadro.royalties cuadro.excel`
KPI: `kpi.config kpi.guardar kpi.cerrar-mes kpi.historial kpi.reabrir`

Un `data-tour` apunta a **un** elemento por pantalla. Si el elemento es condicional (p. ej. `kpi.reabrir` solo en mes cerrado, `grupo.*` solo con grupo seleccionado), el contenido lo ordena para que exista cuando toque, y si aun así no existe aplica el fallback de §8.

## 8. Motor del tour (`TourHost`)

- Montado en `app/centro/[id]/layout.js` (layout de servidor que devuelve `{children}` + `<Suspense><TourHost/></Suspense>`; `useSearchParams` exige el Suspense en Next 15). Lee `?tour=<modulo>&paso=<n>`. Sin `tour` en la URL, no renderiza nada. Como el layout **no se desmonta** al navegar dentro del centro, el estado del tour vive en un hijo `<TourActivo key={tourId}>`: cambiar de módulo monta una instancia limpia; los pasos con `ruta` conservan la key y el tour sobrevive a la navegación.
- Por paso: busca `[data-tour="<target>"]` con reintentos cada 150 ms (el elemento puede aparecer tras un clic o un fetch; las páginas pintan "Cargando…" en frío). Encontrado → `scrollIntoView({block:'center'})`, mide `getBoundingClientRect()`, pinta el **spotlight** (un `div` fijo con `box-shadow: 0 0 0 9999px rgba(0,0,0,.55)`, `pointer-events:none`, borde 2 px verde marca) y la **tarjeta** (título, texto, controles) anclada debajo o encima según espacio, con re-medición en `resize` y `scroll`.
- A los 2,5 s sin encontrarlo → la tarjeta avisa (*"Todavía no veo este elemento. Si la pantalla sigue cargando, espera; si tu centro no tiene datos para mostrarlo, puedes omitir el paso."*) con **Omitir →**, pero **sigue buscando** cada 400 ms hasta que cambie el paso: el aviso no es terminal. Nunca se traba.
- Navegación entre pasos: `irA(n)` resuelve la página del paso con `rutaDePaso(modulo, n)` (la última `ruta` de los pasos anteriores, o `inicio.ruta`): Omitir, Anterior y deep-links caen siempre donde vive el target. Misma página → `history.pushState` (Next actualiza `useSearchParams` sin fetch RSC ni salto de scroll); otra página → `router.push`.
- `mostrar`: botones **Siguiente** y **Anterior** (Anterior desactivado en el paso 1 del módulo). `hazlo`: sin Siguiente; listener `click` en el target (captura, `once`); enlace discreto **Omitir este paso**. Si el paso trae `ruta`, el listener hace `preventDefault`+`stopPropagation` y navega con `irA(paso+1)`.
- **Audio**: `<audio>` con `src=/entrenamiento/<file>` si la clave `<modulo>/<paso>` existe en `lib/entrenamiento/audio-manifest.json` (importado; si el paso no está, no hay reproductor y la tarjeta es solo texto). Autoplay al cambiar de paso; botón ▶/❚❚ y botón **silenciar** (persistido en `localStorage.tour_mute`). Si el navegador bloquea el autoplay, se muestra ▶ y no pasa nada más.
- Controles fijos: **Salir del recorrido** (quita `?tour` de la URL con `pushState`; no marca nada) y contador `paso 3 de 7`.
- Último paso → botón **Terminar**: llama `marcarTourVisto(modulo)` y navega a `/centro/{id}/entrenamiento/<modulo>#quiz`. Si la action falla, muestra el error en la tarjeta y deja volver a pulsar.
- Teclado: `Esc` sale, `→` siguiente (solo en `mostrar`).
- El motor no conoce el contenido: recibe `MODULOS` y trabaja con ids.

## 9. Páginas

**`/centro/[id]/entrenamiento`** — cabecera con anillo de progreso (`n/9` y %), botón **Continuar** (va al primer módulo no completado). Tarjetas de los 9 módulos en orden: título, duración, estado (`Pendiente` · `Tour visto, falta quiz` · `✓ Completado · 22 ago`), botón según estado. Debajo, **Errores que más cuestan** (lista síntoma → causa → cómo se arregla, con enlace al módulo) y **Preguntas frecuentes**.

**`/centro/[id]/entrenamiento/[modulo]`** — intro (texto + reproductor de voz si hay audio), botón **Iniciar recorrido** (`router.push(inicio.ruta + '?tour=<id>&paso=1')`), **Repetir recorrido** si ya lo vio; bloque **Errores típicos de este módulo**; bloque **Quiz** con `id="quiz"`: 3 preguntas de opción única, botón **Corregir** → server action devuelve `{ puntaje, correctas:[bool,bool,bool], explicaciones }`; si 3/3 → ✓ y enlace **Siguiente módulo**; si no → marca las erradas con su explicación, **Intentar de nuevo** (limpia selección). El quiz se puede responder sin haber visto el tour, pero el módulo solo queda completado con ambos.

**`/dashboard/entrenamiento`** (`admin_general`, `supervisor`) — tabla: filas = usuarios con rol `administradora` agrupados por centro; columnas = 9 módulos; celda = `✓ dd/mm` (verde), `tour` (ámbar: visto sin quiz), `—`; última columna `% completado`. Filtro por centro. Sin exportar (YAGNI).

**Sidebar** — ítem `Entrenamiento` (icono `check` existente o nuevo `book`) con badge `n/9` a la derecha; `data-tour="nav.entrenamiento"`. El badge viene de una server action `resumenProgreso()` llamada al montar (igual que `listCentros`).

**Resumen** — si el usuario tiene < 9 completados, banner discreto arriba: *"Tu entrenamiento: 4 de 9 módulos. Continuar →"*; con 9/9 no se muestra nada.

## 10. Server actions (`app/actions/entrenamiento.js`)

Lecturas personales con `requireSession()`; **escrituras** (`marcarTourVisto`, `responderQuiz`) con `requireCurrentUser()` (relee el usuario en BD: una cookie de 7 días de un usuario borrado o revocado no escribe). Siempre sobre `usuario_id` de la sesión, nunca un id recibido del cliente.

- `cargarProgreso()` → `{ [modulo]: { tourVistoAt, quizAprobadoAt, intentos, ultimoPuntaje } }`
- `marcarTourVisto(modulo)` → upsert `tour_visto_at = COALESCE(tour_visto_at, now())`; valida que `modulo` exista en `MODULOS`.
- `responderQuiz(modulo, respuestas:[idx,idx,idx])` → valida módulo y forma; corrige contra `respuestas.js`; `intentos = intentos + 1`, `ultimo_puntaje`, y `quiz_aprobado_at = COALESCE(quiz_aprobado_at, now())` solo si 3/3. Devuelve `{ puntaje, correctas, explicaciones }`.
- `resumenProgreso()` → `{ completados, total, pct }` para el badge y el banner; **`null` para admin_general/supervisor** (gerencia no se entrena, §14; así no ven `0/9`).
- `responderQuiz` valida forma estricta (array de 3 enteros); un payload malformado devuelve `{ error }` y no cuenta como intento.
- `matrizProgreso(centroId?)` → `requireCurrentAdmin()` (relee el rol desde la BD, como `peticiones.js` y `deleteCentro`); valida `centroId` entero; usuarios `administradora` (+centro) × módulos.

Errores: mensajes en español, mismo patrón `{ error }` que el resto de actions; nunca lanzar al cliente.

## 11. Audio (`scripts/entrenamiento-audio.mjs`)

- Lee `MODULOS`; para cada `intro` y cada `paso` calcula `sha1(vozOTexto + JSON(settings))`; compara con `lib/entrenamiento/audio-manifest.json` (`{ "<modulo>/<paso>": { hash, file, seg } }`; vive en `lib/` para importarse desde TourHost y la página del módulo); genera solo los que faltan o cambiaron vía `POST https://api.elevenlabs.io/v1/text-to-speech/I0uPgrx2Hf3g0QzMYLnq` con `model_id: eleven_multilingual_v2`, `voice_settings` de §2, `output_format: mp3_44100_64`; guarda mp3 y actualiza el manifest. API key de `ELEVENLABS_API_KEY` o de `~/.studio-reels-assembler/credentials.env`.
- Flags: `--solo <modulo>`, `--muestra` (genera solo 3 clips de audición: intro de `meta`, un paso `hazlo` de `aperturar`, el paso del botón gris de `llenado`).
- **Gate humano**: Fernando escucha las 3 muestras y aprueba timbre/ritmo **antes** de generar el lote. Hermes no puede oír audio.
- Se corre en la Mac; los mp3 se commitean. Tamaño esperado: ~65 clips × ~150 KB ≈ 10 MB.

## 12. Seguro de mantenimiento (`test/entrenamiento.test.mjs`, `node --test`)

1. Todo `target` de todo paso existe como literal `data-tour="<target>"` en `app/` o `components/` (lee los archivos fuente). Falla con el id y el módulo.
2. Cada módulo tiene exactamente 3 preguntas con 2-4 opciones; `respuestas.js` tiene exactamente 3 índices válidos por módulo; ids de módulo únicos y en `respuestas.js`.
3. Cada `inicio.ruta` y cada `paso.ruta` empieza por `/centro/{id}`.
4. `texto` de cada paso ≤ 35 palabras (advertencia, no fallo: `console.warn`).
5. Para cada clave del manifest existe el mp3 y la clave corresponde a un módulo/paso real; para cada paso sin clip, advertencia (no fallo — PR 1 sale sin audio). Existe desde PR 1 (con manifest vacío pasa trivialmente) porque PR 2 no trae código.
5b. `respuestas.js` solo se importa desde módulos `'use server'`; `matrizProgreso` usa `requireCurrentAdmin()` (tests que leen el fuente).
6. `lib/entrenamiento/progreso.js`: `completado()`, `porcentaje()`, `siguienteModulo()` con casos borde (0/9, 9/9, tour sin quiz).
7. Corrección del quiz (función pura extraída): 3/3 aprueba, 2/3 no, respuestas fuera de rango no aprueban.

Smoke en navegador (manual/Playwright, antes del merge): entrar como administradora, abrir módulo `aperturar`, Iniciar recorrido, verificar spotlight sobre `grupos.aperturar`, hacer clic, ver paso sobre `aperturar.fecha-inicio`, Cancelar, llegar a Terminar, responder quiz 3/3, ver ✓ en índice y en `/dashboard/entrenamiento`.

## 13. Entrega

- **PR 1**: esquema + actions + motor + atributos + páginas + sidebar/banner + contenido completo (texto) + tests. Funciona sin audio.
- **PR 2**: `public/entrenamiento/*.mp3` + manifest, tras el gate de audición. Sin cambios de código (el motor ya lee el manifest).

Pipeline de Fernando para features: Sol valida spec+plan (read-only) → gpt-5.5 xhigh implementa en el worktree `repos/aloha-kpi-entrenamiento` sin git → Hermes corre tests + commitea → Sonnet 5 audita diff y prueba E2E en preview.

## 14. Fuera de alcance

Bloqueo duro del sistema hasta completar · videos · modo práctica con datos ficticios · entrenamiento para `admin_general`/`supervisor` · certificados/PDF de finalización · contenido multi-idioma · tours en móvil optimizados (funciona, no se optimiza).
