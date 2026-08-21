# Peticiones con cotizaciones en FODA

**Fecha:** 2026-08-21

**Estado:** diseño y controles técnicos aprobados por Fernando el 2026-08-21

**Aplicación:** ALOHA KPI (`/centro/[id]/foda`)

## Problema

La sección “Comentarios y peticiones del administrador” guarda texto y estado. No distingue un comentario de una solicitud formal, no clasifica el gasto y no conserva cotizaciones. Esta estructura impide exigir respaldo documental y medir pedidos por categoría, estado, centro o tiempo de resolución.

## Resultado esperado

La administradora elige entre dos flujos:

- **Comentario:** registra texto sin categoría ni cotizaciones.
- **Petición:** registra una solicitud formal con categoría y al menos tres cotizaciones PDF de proveedores distintos.

Cada proveedor debe tener razón social, empresa constituida y capacidad para emitir factura fiscal. La administradora certifica estos dos requisitos; la aplicación no consulta registros públicos.

La entrega captura datos aptos para un reporte posterior. No construye el tablero de medición.

## Reglas de negocio aprobadas

1. Las categorías son `Reparación`, `Activaciones Mercadeo`, `Contratación`, `Capacitación` y `Otros`.
2. Una petición exige al menos tres proveedores distintos.
3. Cada proveedor entrega un PDF de hasta 10 MB.
4. La aplicación permite agregar más de tres cotizaciones.
5. Vercel Blob privado almacena los PDF; Neon guarda datos y metadatos.
6. La administradora crea comentarios y peticiones. Solo `admin_general` y `supervisor` cambian sus estados.
7. Una petición enviada conserva su contenido. Una administradora autorizada del mismo centro puede añadir cotizaciones mientras la petición siga abierta, pero no sustituir ni eliminar las anteriores.
8. Los borradores pueden descartarse. Las peticiones enviadas se anulan; nunca se borran.
9. Los registros existentes conservan sus datos y visibilidad, aparecen como anteriores y no reciben requisitos documentales retroactivos.
10. El sistema registra cada cambio de estado para medir tiempos y transiciones en el futuro.

## Controles técnicos aprobados

Estos controles surgieron de la revisión de seguridad y forman parte del alcance aprobado:

- Pedir país desde un catálogo ISO 3166-1 real y RUC, RIF o identificación fiscal equivalente para hacer exigible la regla de proveedores distintos. La aplicación rechaza códigos ficticios y detecta duplicados, pero no consulta registros públicos ni puede impedir una declaración deliberadamente falsa.
- Limitar cada petición a diez proveedores y cada cotización a cinco intentos de carga para proteger la cuota.
- Vencer borradores después de 30 días sin actividad, con aviso visible.
- Usar un cron y una cola durable para limpiar cargas inválidas, callbacks obsoletos y borradores vencidos.
- Permitir que la autora corrija un comentario solo mientras siga en `Próximo trimestre`; después lo bloquea.
- Aplicar los permisos nuevos a registros anteriores y convertir su eliminación en `Anulada` para preservar el historial.
- Releer rol, centro y vigencia del usuario desde Neon en cada operación de archivos o estado.
- Bloquear el borrado físico de un centro que tenga peticiones para no destruir la auditoría ni dejar archivos huérfanos.

## Alternativas descartadas

### PDF dentro de Neon

Guardar archivos binarios en PostgreSQL evita un servicio adicional, pero aumenta el tamaño de la base, encarece respaldos y choca con los límites de carga de funciones. Neon debe conservar datos estructurados, no documentos.

### Supabase Storage

Supabase Storage ofrece archivos privados, pero introduciría otro backend, otro SDK y otro modelo de permisos. La aplicación ya usa Neon y Vercel.

### Vercel Blob público

Una URL difícil de adivinar no protege cotizaciones comerciales. Los archivos deben exigir autenticación en cada lectura.

## Arquitectura

```text
FODA
├── Comentario
│   └── crear registro enviado, sin categoría ni archivos
└── Petición
    ├── crear borrador en Neon
    ├── crear proveedor pendiente
    ├── cargar PDF directo a Vercel Blob privado
    ├── validar y registrar archivo
    └── finalizar cuando existan ≥3 proveedores válidos y distintos

Descarga
└── ruta autenticada → comprobar acceso al centro → transmitir Blob privado

Estado
└── acción de admin/supervisor → actualizar petición + registrar transición
```

La carga directa evita enviar tres archivos a través de una función de Vercel. El navegador obtiene un token limitado desde una ruta autenticada y carga el PDF en Blob. El token `BLOB_READ_WRITE_TOKEN` permanece en el servidor.

La emisión y la confirmación de una carga tienen autoridades distintas:

- `onBeforeGenerateToken` recibe la cookie, relee el usuario y el borrador desde Neon, crea un `upload_nonce` de un solo uso y autoriza el `pathname` esperado.
- `onUploadCompleted` es un callback servidor-a-servidor de Vercel y no recibe la cookie. Usa el `tokenPayload` firmado, relee usuario, borrador y cotización, compara `nonce` y `pathname`, y aplica una actualización condicional e idempotente. Justo antes de marcar el PDF como válido vuelve a bloquear petición y actor para ordenar carreras contra cambios de estado, rol o centro. Si el usuario perdió acceso después de recibir el token, encola el blob para limpieza.

La respuesta del navegador nunca valida una carga ni finaliza una petición.

## Modelo de datos

### Cambios en `peticiones`

| Columna | Tipo | Regla |
|---|---|---|
| `tipo` | `TEXT` | `legado`, `comentario` o `peticion` |
| `categoria` | `TEXT NULL` | Obligatoria solo para peticiones nuevas; usa códigos canónicos |
| `created_by` | `INTEGER NULL` | FK a `usuarios`; nulo en filas anteriores |
| `created_by_snapshot` | `JSONB NULL` | Nombre, correo y rol conservados aunque se elimine el usuario |
| `submitted_at` | `TIMESTAMPTZ NULL` | Nulo mientras la petición es borrador |
| `anulada_at` | `TIMESTAMPTZ NULL` | Fecha de anulación formal |
| `draft_expires_at` | `TIMESTAMPTZ NULL` | Vencimiento de borradores; nulo después del envío |

Códigos de categoría:

- `reparacion`
- `activaciones_mercadeo`
- `contratacion`
- `capacitacion`
- `otros`

La interfaz traduce los códigos a sus etiquetas. La base valida `tipo`, `categoria` y `estado` con restricciones nombradas. Una migración dedicada, transaccional y con advisory lock consulta `pg_constraint`, corrige datos conocidos y crea cada restricción ausente. No usa el separador simple de `scripts/migrate.mjs`. Un índice sobre `(centro_id, anio, trimestre, tipo, categoria, estado)` prepara las consultas de medición.

Las filas actuales reciben `tipo = 'legado'` y `submitted_at = COALESCE(created_at, updated_at, now())`. La migración no inventa categorías ni exige archivos antiguos. Los reportes futuros excluirán `tipo = 'legado'` salvo que el usuario lo solicite expresamente. La migración expansiva usa temporalmente `DEFAULT 'legado'` para convivir con instancias viejas; la migración de cierre elimina ese default cuando el nuevo código quede estable.

`created_by` usa `ON DELETE SET NULL`. La FK actual `peticiones.centro_id ... ON DELETE CASCADE` cambia a `ON DELETE RESTRICT`: borrar un centro no puede destruir solicitudes ni dejar blobs huérfanos. La acción de centros devuelve un error claro cuando existe historial; archivar centros queda fuera de este cambio.

### Nueva tabla `peticion_cotizaciones`

| Columna | Propósito |
|---|---|
| `id` | Identificador de la cotización |
| `peticion_id` | FK a `peticiones` con `ON DELETE RESTRICT` |
| `proveedor_razon_social` | Nombre mostrado |
| `proveedor_clave` | Nombre normalizado para detectar variantes triviales |
| `proveedor_pais` | País ISO 3166-1 alfa-2 del proveedor |
| `proveedor_id_fiscal` | RUC, RIF o identificación fiscal mostrada |
| `proveedor_id_fiscal_clave` | Identificación fiscal normalizada para comprobar proveedores distintos |
| `empresa_constituida` | Certificación obligatoria |
| `emite_factura_fiscal` | Certificación obligatoria |
| `blob_pathname` | Ruta privada, única y aleatoria; nula durante la carga |
| `archivo_nombre` | Nombre original saneado; nulo durante la carga |
| `archivo_mime` | Nulo durante la carga; después debe ser `application/pdf` |
| `archivo_bytes` | Nulo durante la carga; después debe estar entre 1 y 10.485.760 bytes |
| `archivo_sha256` | Nulo durante la carga; después evita reutilizar el mismo PDF |
| `upload_nonce` | Versión aleatoria del intento autorizado |
| `expected_pathname` | Ruta fijada por el servidor antes de emitir el token |
| `upload_status` | `pending`, `validating`, `valid`, `invalid` o `cleanup_pending` |
| `upload_attempts` | Contador; máximo cinco tokens por cotización |
| `validation_error` | Causa legible de la última validación fallida; nula al reintentar |
| `uploaded_by` | FK al usuario que cargó el archivo |
| `uploaded_by_snapshot` | Nombre, correo y rol del actor |
| `validada_at` | Nulo hasta completar la validación |
| `created_at` | Auditoría |

Restricciones:

- `proveedor_clave` aplica Unicode NFKD, elimina marcas diacríticas y puntuación, convierte a minúsculas y colapsa espacios. Sirve como señal adicional, no como prueba de identidad.
- `proveedor_id_fiscal_clave` elimina espacios, guiones y puntuación, y convierte letras a mayúsculas. `UNIQUE (peticion_id, proveedor_pais, proveedor_id_fiscal_clave)` exige identificaciones fiscales distintas.
- `proveedor_pais` referencia una tabla canónica de códigos ISO 3166-1 alfa-2 sembrada por la migración; valores inventados como `ZZ` fallan también en la base.
- `UNIQUE (peticion_id, archivo_sha256)` impide presentar el mismo PDF con otro proveedor.
- `expected_pathname` es único globalmente y, cuando existe `blob_pathname`, ambos valores deben coincidir; una limpieza nunca puede borrar un objeto compartido.
- Los dos campos de certificación deben ser verdaderos para que la fila cuente como válida.
- Una petición enviada conserva sus cotizaciones. Solo admite filas nuevas.

La FK hacia `peticiones` usa `ON DELETE RESTRICT`. El descarte de un borrador bloquea la fila, verifica `submitted_at IS NULL`, registra la limpieza, elimina explícitamente sus cotizaciones y después elimina el padre. Ningún `CASCADE` puede afectar una petición enviada.

`uploaded_by` usa `ON DELETE SET NULL`; `uploaded_by_snapshot` conserva la identidad legible. La tabla no guarda ni expone la URL devuelta por Blob.

### Nueva tabla `peticion_estado_historial`

La tabla guarda `peticion_id`, `estado_anterior`, `estado_nuevo`, `changed_by`, `changed_by_snapshot` y `created_at`. `peticion_id` usa `ON DELETE RESTRICT`; `changed_by` usa `ON DELETE SET NULL`. El cambio de estado y el evento se escriben en una transacción.

Estados admitidos:

- `Próximo trimestre`
- `Negado`
- `Aprobado`
- `En proceso`
- `Cumplido`
- `Anulada`

Los administradores pueden corregir un estado; el historial conserva cada cambio. `Cumplido` y `Anulada` son estados terminales en la interfaz, pero el servidor permite que un administrador corrija un error y registra esa corrección.

El borrador conserva técnicamente el estado `Próximo trimestre` para mantener compatibilidad con la columna existente, pero ese estado carece de vigencia hasta que `submitted_at` tenga valor. El evento inicial usa `estado_anterior = NULL` y `estado_nuevo = 'Próximo trimestre'`. Un índice único parcial permite un solo evento inicial por petición.

### Nueva tabla `peticion_blob_cleanup`

La cola durable guarda `blob_pathname` único, motivo, intentos, próximo intento, último error, fecha de creación y fecha de terminación. También conserva generación, `locked_at`, `lock_token` y generación reclamada para cercar workers obsoletos, reclamar lotes con `FOR UPDATE SKIP LOCKED` y reabrir de forma segura una ruta que reciba una nueva obligación después de agotar reintentos. Una tabla singleton conserva el cursor del barrido paginado del store. El descarte de borradores, los PDF inválidos y los callbacks obsoletos registran la ruta en esta tabla dentro de la misma transacción que retira sus metadatos activos.

Un cron diario, protegido por `CRON_SECRET` y con secreto ausente rechazado, realiza tres tareas:

1. descarta borradores sin actividad durante 30 días;
2. borra blobs pendientes mediante operaciones idempotentes y reintentos limitados;
3. reconcilia por prefijo los intentos vencidos que no completaron su callback.

La reconciliación cambia primero los intentos vencidos de `pending` o `validating` a `cleanup_pending` dentro de la misma transacción que encola sus rutas. Un callback tardío ya no puede validar un objeto que el worker esté por borrar. Cada ejecución procesa primero la cola existente y después lee un número acotado de páginas del store; guarda el cursor para continuar en el siguiente cron y libera cualquier claim que no alcance a procesar dentro del presupuesto.

La interfaz limita cada petición a diez cotizaciones y cada cotización a cinco intentos de carga. Estos límites protegen la cuota sin impedir cotizaciones adicionales razonables.

## Flujos de escritura

### Crear comentario

1. La administradora selecciona `Comentario` y escribe el texto.
2. El servidor valida sesión, centro y texto.
3. Inserta `tipo = 'comentario'`, `submitted_at = now()` y estado `Próximo trimestre`; también registra el evento inicial `NULL → Próximo trimestre`.
4. El registro aparece en la lista.

La autora puede corregir el texto mientras el estado siga en `Próximo trimestre`. Después del primer cambio de gerencia, el comentario queda bloqueado. Ningún registro enviado se borra físicamente; un administrador puede marcarlo `Anulada`.

### Crear petición

1. La administradora selecciona `Petición`, categoría y descripción.
2. `createPeticionDraft` valida el centro y crea una fila con `submitted_at = NULL`.
3. La interfaz muestra tres tarjetas de proveedor y permite agregar otras.
4. Antes de cada carga, el servidor crea o actualiza la cotización pendiente y emite un token limitado a esa cotización. El `tokenPayload` incluye identificadores internos, `uid`, `upload_nonce` y `expected_pathname`; nunca acepta un `centro_id` como autoridad.
5. El navegador carga el archivo directo a Blob privado.
6. El callback verificado por `handleUpload` usa el `tokenPayload`, relee borrador y cotización desde Neon, compara `nonce` y `pathname`, comprueba el archivo y aplica un `UPDATE` condicional. Los callbacks repetidos devuelven éxito sin duplicar datos; los obsoletos envían su blob a la cola de limpieza.
7. `submitPeticion` abre una transacción serializable, bloquea el borrador y vuelve a validar texto, categoría, propiedad del borrador, certificaciones, hashes y al menos tres proveedores distintos.
8. La acción vuelve a comprobar los blobs privados asociados, fija `submitted_at = now()`, cambia el estado a `Próximo trimestre` y registra el primer evento. Repetir la acción devuelve la petición ya enviada sin duplicar el evento.

La lista general oculta los borradores. La creadora ve su borrador pendiente y puede continuarlo o descartarlo.

Después del envío, descripción, categoría, país, identificación fiscal y cotizaciones existentes quedan inmutables. Solo se permiten cotizaciones nuevas mientras la petición siga abierta.

### Cambiar estado

1. La interfaz muestra controles de estado solo a `admin_general` y `supervisor`.
2. El servidor aplica `requireCurrentAdmin`, que relee el usuario desde Neon; ocultar botones no constituye autorización.
3. Una transacción bloquea la petición con `SELECT ... FOR UPDATE`, lee el estado anterior, actualiza el estado y agrega el evento histórico.
4. `Anulada` también fija `anulada_at`; cualquier corrección posterior lo limpia.

### Añadir una cotización

Una administradora autorizada del mismo centro puede añadir proveedores después del envío. El servidor aplica las mismas validaciones, pero no permite cambiar ni eliminar las cotizaciones anteriores. La petición conserva la fecha original de envío. `Cumplido` y `Anulada` bloquean nuevas cotizaciones.

### Descartar borrador

1. El servidor abre una transacción, bloquea la petición y confirma que sigue en borrador y pertenece a la creadora o a un administrador.
2. Inserta cada `blob_pathname` y `expected_pathname` en `peticion_blob_cleanup`.
3. Elimina explícitamente las cotizaciones y el borrador dentro de la misma transacción.
4. El worker borra los blobs de forma idempotente y marca la cola. Si Blob falla, la cola conserva el trabajo y lo reintenta sin restaurar un borrador incompleto.

## Validación de PDF

La aplicación valida cada archivo en varias capas:

1. El selector acepta `.pdf`.
2. `upload(..., { access: 'private' })` y el token limitan el MIME a `application/pdf` y el tamaño a 10 MB.
3. El servidor sanea el nombre original y genera un `pathname` aleatorio; nunca usa el nombre como ruta.
4. Después de la carga, el servidor transmite el Blob privado sin cargarlo completo en memoria, confirma la firma `%PDF-`, calcula SHA-256 y verifica el tamaño real.
5. La descarga recibe solo `cotizacionId`, obtiene el `pathname` mediante la base y llama `get(pathname, { access: 'private' })`; nunca recibe ni devuelve una URL Blob.
6. La respuesta usa `Content-Type: application/pdf`, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store`.

Un archivo que falle la validación no cuenta como cotización. El servidor intenta borrarlo y muestra un error específico.

## Autorización

| Operación | Administradora del centro | `supervisor` / `admin_general` |
|---|---:|---:|
| Crear comentario o petición | Sí, en su centro | Sí |
| Continuar o descartar borrador propio | Sí | Sí |
| Añadir cotización | Sí, en su centro | Sí |
| Ver o descargar PDF | Sí, en su centro | Sí |
| Cambiar estado | No | Sí |
| Borrar petición enviada | No | No; debe anularla |

La ruta que emite tokens y cada descarga autentican dentro del handler. El callback de Vercel no tiene cookie: se autoriza mediante el `tokenPayload` firmado y la comprobación idempotente descrita antes. El middleware actual no protege `/api`, por lo que ninguna ruta nueva depende de él. La descarga busca la cotización mediante un `JOIN` con `peticiones` y usa el `centro_id` obtenido de la base; no confía en un centro enviado por el navegador. Un usuario autenticado sin acceso y un identificador inexistente reciben el mismo `404`.

Las operaciones nuevas releen `usuarios` por el `uid` del JWT y exigen que la cuenta conserve `password_hash`. Usan rol y centro actuales de Neon, no las copias que pueden permanecer siete días dentro de la cookie. Un usuario borrado, no activado, reasignado o degradado pierde acceso de inmediato.

La autenticación falla cerrada en producción cuando falta `SESSION_SECRET`. El valor inseguro de desarrollo solo puede existir fuera de producción; una clave ausente nunca permite forjar acceso a documentos privados.

## Interfaz

La tarjeta actual incorpora un selector `Comentario | Petición`.

### Comentario

Muestra el área de texto y el botón `Agregar comentario`. Conserva la lista y los estados actuales, con los permisos nuevos.

### Petición

Muestra:

1. selector de categoría;
2. descripción;
3. tres tarjetas iniciales de cotización;
4. razón social, país elegido de un selector ISO, RUC/RIF/identificación fiscal y dos certificaciones por tarjeta;
5. zona de carga PDF con progreso, éxito, reintento y error;
6. contador `N de 3 cotizaciones válidas`;
7. botón `Agregar otra cotización`;
8. resumen y botón `Enviar petición`.

El botón final permanece deshabilitado y explica cada requisito pendiente. Una carga fallida conserva las demás cotizaciones. Un borrador muestra su fecha de vencimiento y permite continuarlo o descartarlo.

### Lista

Cada fila muestra tipo, categoría, estado, fecha, número de proveedores y archivos descargables. Los registros anteriores muestran `Anterior · sin requisitos documentales`. La carga inicial obtiene `canChangePeticionStatus` desde una acción de servidor que relee el usuario actual; no usa `localStorage` ni el valor fijo del `Sidebar`. Los botones de estado solo aparecen para administradores y el servidor vuelve a validar el rol.

La interfaz conserva los estilos, el tema claro/oscuro y el comportamiento móvil de FODA.

## Errores y recuperación

- Un error de red mantiene el borrador y permite reintentar el archivo afectado.
- Un archivo inválido muestra la causa: tipo, tamaño, firma o duplicado.
- Un intento pendiente o inválido puede retirarse después de encolar sus rutas; una cotización válida nunca se retira después del envío.
- Un proveedor repetido identifica ambas tarjetas.
- Una sesión vencida detiene la carga y solicita iniciar sesión de nuevo.
- Una carrera al finalizar usa `SELECT ... FOR UPDATE`, `UPDATE ... WHERE submitted_at IS NULL`, una clave idempotente para el evento inicial y reintentos acotados de SQLSTATE `40001` y `40P01`. Una segunda petición de envío devuelve el resultado ya enviado sin duplicar eventos.
- Dos administradores que cambien el estado al mismo tiempo se serializan sobre la misma fila; cada evento conserva el estado anterior que realmente sustituyó.
- Blob y Neon no comparten transacción. El diseño valida el Blob antes de finalizar y usa `peticion_blob_cleanup` para conservar y reintentar cada limpieza fallida.
- Las acciones devuelven errores legibles; la interfaz no silencia fallas.

## Compatibilidad y migración

`db/schema.sql` describe el estado final para bases nuevas. Una migración versionada aparte modifica producción con transacción, advisory lock y consultas de catálogo; el migrador general actual divide por `;` y no garantiza atomicidad para este cambio.

La migración versionada ofrece `--dry-run` por defecto y exige `--apply`. Su preflight cuenta filas, enumera estados inesperados y aborta ante valores que no pueda mapear. Al aplicar, toma advisory lock y un `ACCESS EXCLUSIVE` explícito con `lock_timeout` corto dentro de la ventana de mantenimiento; si no puede bloquear, revierte para reintentar en vez de escalar locks y quedar en deadlock. La fase expansiva agrega columnas y tablas, rellena filas `legado`, crea índices y sustituye únicamente la FK de `peticiones.centro_id` por `ON DELETE RESTRICT`. La fase de cierre, ejecutada después del despliegue estable, elimina el `DEFAULT 'legado'` temporal y aplica `NOT NULL` y restricciones cruzadas.

Las restricciones cruzadas exigen:

- categoría solo para `tipo = 'peticion'`;
- `anulada_at` si y solo si el estado es `Anulada`;
- una cotización válida con certificaciones verdaderas, MIME, tamaño, hash, pathname y `validada_at` completos;
- hash SHA-256 con formato fijo;
- `estado_anterior IS NULL` solo en el evento inicial.

Orden de despliegue:

1. contar y respaldar metadatos de `peticiones`;
2. ejecutar el dry-run y después la migración expansiva;
3. verificar filas, tipos, índices y ausencia de pérdida;
4. crear y conectar un Blob Store privado; configurar `BLOB_READ_WRITE_TOKEN` y `CRON_SECRET`, comprobar hostname privado y rechazo de lectura directa anónima;
5. agregar `@vercel/blob` versión `2.8.0` y desplegar código compatible con filas `legado`;
6. probar un comentario, un borrador, tres cargas, una descarga, una limpieza y un cambio de estado;
7. comprobar que los registros anteriores siguen visibles;
8. ejecutar la migración de cierre después de retirar las instancias viejas.

El código debe fallar con un mensaje operativo si falta `BLOB_READ_WRITE_TOKEN`. Los comentarios y la lectura de registros anteriores pueden seguir funcionando; la interfaz bloquea las cargas de peticiones. El cron falla cerrado si falta `CRON_SECRET`.

## Preparación para medición

Esta entrega permite calcular después:

- peticiones por categoría, centro, región, trimestre y estado;
- tasa de aprobación, negación, cumplimiento y anulación;
- tiempo desde envío hasta aprobación y cumplimiento;
- número de cotizaciones por petición;
- cumplimiento documental por proveedor.

El futuro tablero debe vivir en `/dashboard/peticiones`, con filtros y exportación CSV. El historial KPI actual no cambia.

## Pruebas

### Unitarias

- categorías válidas e inválidas;
- normalización y duplicación de razón social e identificación fiscal;
- validación de extensión, MIME, tamaño, firma `%PDF-` y SHA-256 duplicado;
- regla de tres cotizaciones válidas;
- estados permitidos;
- máximo de diez cotizaciones y cinco intentos por cotización.

### Acciones y base de datos

- una administradora solo actúa sobre su centro;
- un cambio de rol, centro o eliminación del usuario revoca el acceso aunque el JWT siga vigente;
- una administradora no cambia estados;
- un administrador cambia el estado y crea un único evento;
- finalizar un borrador incompleto falla sin modificarlo;
- dos finalizaciones concurrentes producen un solo envío;
- comentarios no exigen categoría ni archivos;
- peticiones enviadas no se borran;
- filas `legado` siguen visibles;
- borrar un centro con historial queda bloqueado;
- eliminar un usuario conserva snapshots y deja las FK de actor en nulo;
- el dry-run no escribe y una migración fallida revierte completa.

### Rutas de archivo

- el token exige sesión y acceso al borrador;
- el token limita MIME y tamaño;
- el callback sin cookie acepta solo `tokenPayload`, nonce y pathname vigentes;
- un callback repetido es idempotente y uno obsoleto encola limpieza;
- la respuesta del navegador no puede marcar una carga como válida;
- la descarga exige acceso al centro asociado en la base;
- la respuesta usa cabeceras privadas y `nosniff`;
- un PDF inválido se rechaza y se limpia;
- descartar un borrador registra la limpieza antes de retirar sus datos;
- el cron reintenta fallas y descarta borradores vencidos.

### Interfaz y regresión

- flujo completo de comentario;
- flujo de petición con tres proveedores;
- proveedor o PDF duplicado;
- reintento de una sola carga;
- permisos de botones por rol;
- registros anteriores;
- móvil y escritorio mediante el arnés de navegador local y productivo;
- temas claro y oscuro;
- suite completa y `next build`.

## Criterios de aceptación

1. Una administradora registra un comentario sin cotizaciones.
2. Una administradora no puede enviar una petición con menos de tres identificaciones fiscales distintas.
3. Cada proveedor requiere razón social, país, RUC/RIF/identificación fiscal, ambas certificaciones y un PDF válido de hasta 10 MB.
4. Los PDF solo se descargan después de autenticar y autorizar al usuario.
5. El centro no puede aprobar, negar ni completar su propia petición.
6. Cada cambio de estado conserva actor, fecha, estado anterior y estado nuevo.
7. Una petición enviada no se borra; puede anularse.
8. Las peticiones antiguas siguen visibles sin carga retroactiva.
9. Una falla parcial no elimina cargas válidas ni crea una petición enviada incompleta; la cola durable conserva cada limpieza pendiente.
10. Un cambio de rol, centro o vigencia del usuario se aplica de inmediato a cargas y descargas.
11. La base puede agrupar peticiones nuevas por categoría y reconstruir sus tiempos de estado.

## Fuera de alcance

- tablero `/dashboard/peticiones` y exportación CSV;
- verificación automática del registro mercantil o la capacidad fiscal del proveedor;
- OCR o extracción de montos del PDF;
- comparación automática de precios;
- aprobación electrónica o firma digital;
- análisis antivirus avanzado; los PDF se tratan como archivos no confiables y siempre se descargan como adjuntos;
- archivado de centros; este cambio solo bloquea el borrado físico cuando existe historial;
- notificaciones por correo o WhatsApp.

## Referencias

- [Vercel Blob: almacenamiento privado](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel Blob: cargas desde el cliente](https://vercel.com/docs/vercel-blob/client-upload)
- Flujo actual: `app/centro/[id]/foda/page.js`
- Acciones actuales: `app/actions/foda.js`
- Esquema actual: `db/schema.sql`
