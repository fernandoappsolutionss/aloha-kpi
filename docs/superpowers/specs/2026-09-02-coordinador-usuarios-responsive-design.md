# Coordinador de usuarios y experiencia móvil integral — diseño

**Fecha:** 2026-09-02

**Estado:** Diseño aprobado por Fernando en chat. Esta especificación requiere su revisión final antes de convertirla en plan de implementación.

**Aplicación:** KPI ALOHA Panamá

**Base de trabajo:** `origin/main` en `817ec49`, dentro de un worktree limpio. El checkout local con la sincronización de agosto y sus archivos sin seguimiento queda fuera de este trabajo.

## 1. Resultado esperado

La entrega resuelve dos necesidades en un solo PR:

1. El rol `coordinador` puede administrar las cuentas operativas de los centros que supervisa.
2. Toda la aplicación funciona y se entiende correctamente en teléfonos, tabletas y escritorio, sin contenido cortado, botones fuera de pantalla ni texto ilegible.

La experiencia de escritorio conserva la identidad visual y los flujos actuales. La versión móvil reorganiza la misma información según la prioridad de cada pantalla; no intenta encoger el escritorio completo dentro del teléfono.

## 2. Alcance de usuarios para el coordinador

El coordinador puede gestionar únicamente usuarios con rol `administradora` o `asistente` cuyo `centro_id` pertenezca a su asignación vigente en `usuario_centros`.

Puede:

- ver la lista de esas cuentas;
- crear una cuenta `administradora` o `asistente` en uno de sus centros;
- editar nombre, rol operativo y centro; el correo conserva el comportamiento actual y no se edita;
- mover una cuenta entre dos centros que supervise;
- reenviar o restablecer el acceso de una cuenta autorizada.

No puede:

- ver ni modificar `admin_general`, `supervisor` o `coordinador`;
- crear o promover una cuenta a un rol de gerencia o coordinación;
- gestionar una cuenta de un centro no asignado;
- mover una cuenta hacia un centro no asignado;
- eliminar cuentas;
- cambiar sus propias asignaciones de centros;
- aprovechar un identificador enviado manualmente para saltarse esas restricciones.

Los roles `admin_general` y `supervisor` conservan su alcance global. Pueden eliminar coordinadores, supervisores, administradoras y asistentes, salvo su propia cuenta; no pueden eliminar ninguna cuenta `admin_general`. La interfaz y el servidor aplican la misma regla.

## 3. Matriz de autorización

| Operación | `admin_general` / `supervisor` | `coordinador` | `administradora` / `asistente` |
|---|---:|---:|---:|
| Abrir Gestión de usuarios | Sí | Sí | No |
| Ver gerencia o coordinadores | Sí | No | No |
| Ver administradoras y asistentes | Todos los centros | Solo centros asignados | No |
| Crear `admin_general` o coordinadores | Sí | No | No |
| Crear administradora o asistente | Sí | Solo centros asignados | No |
| Editar cuenta operativa | Sí | Solo centros asignados | No |
| Mover cuenta operativa | Sí | Entre centros asignados | No |
| Reenviar/restablecer acceso | Sí | Solo cuentas autorizadas | No |
| Eliminar cuenta que no sea `admin_general` ni la propia | Sí | No | No |

Ocultar un botón no es autorización. Cada lectura y escritura aplica esta matriz en el servidor.

## 4. Fuente de verdad y límites de seguridad

### 4.1 Actor vigente

Las acciones de Gestión de usuarios releen al actor y sus centros desde Neon en cada operación. No confían únicamente en el rol o la lista de centros guardados en el JWT, porque una cookie puede seguir viva después de que gerencia revoque una asignación.

La revocación de un centro al coordinador tiene efecto inmediato en la siguiente lectura o escritura de usuarios. No requiere cerrar sesión.

### 4.2 Política compartida

`lib/current-user.mjs` será la fuente de verdad de la política. Expondrá funciones puras para responder, como mínimo:

- si el actor puede abrir Gestión de usuarios;
- qué roles puede crear o asignar;
- qué centros puede usar como destino;
- si puede leer o modificar un usuario objetivo;
- qué acciones están disponibles para ese objetivo.

Las server actions y la interfaz consumen la misma política. La interfaz puede explicar una restricción, pero el servidor siempre vuelve a comprobarla.

La página obtiene del servidor el rol efectivo, los centros vigentes y las capacidades que necesita para renderizar. `localStorage` puede recordar preferencias visuales, pero no decide si aparecen opciones privilegiadas ni qué datos se consultan. El Sidebar recibe el contexto autenticado necesario para mostrar `Usuarios` al coordinador sin convertir el navegador en fuente de autoridad.

### 4.3 Guarda de la ruta

`/dashboard/usuarios` se divide en una página servidor y un componente cliente. La página ejecuta una guarda fresca antes de renderizar y entrega al cliente solo el contexto y los registros autorizados. Si el actor ya no puede gestionar usuarios, recibe una denegación completa y no una tabla vacía con controles que fallan después.

El selector de esta página se alimenta del mismo contexto fresco. No reutiliza una lectura que tome las asignaciones del JWT.

### 4.4 Comprobación del objetivo

Toda acción que reciba `usuarioId` sigue este orden:

1. autentica y relee al actor;
2. carga el usuario objetivo desde la base;
3. comprueba que el rol actual del objetivo sea gestionable;
4. comprueba que el centro actual del objetivo pertenezca al actor;
5. valida los valores nuevos;
6. vuelve a comprobar que el rol y el centro resultantes sean permitidos;
7. escribe el cambio.

Así se bloquean tanto el acceso directo a una cuenta ajena como el traslado indirecto fuera del alcance.

Las mutaciones realizan la autorización y la escritura dentro de una transacción `Serializable` mediante `withTransaction()`. La transacción bloquea o vuelve a validar al actor, sus asignaciones y el objetivo antes del cambio. Si hay una revocación, traslado o promoción concurrente, la operación se cancela o se reintenta con el alcance nuevo; nunca escribe basándose en una comprobación vencida.

### 4.5 Respuestas y privacidad

Una operación fuera de alcance devuelve un error uniforme en español, por ejemplo: `No tienes permiso para gestionar este usuario.` No revela si el correo o identificador corresponde a una cuenta de gerencia o a otro centro.

Los listados del coordinador filtran en la consulta de base de datos. No descargan todos los usuarios para ocultarlos después en el navegador.

La creación tampoco permite enumerar correos de gerencia u otros centros. Una colisión con una cuenta que el coordinador no puede ver devuelve el mismo error uniforme que una operación fuera de alcance. Las colisiones de unicidad concurrentes (`23505`) reciben el mismo tratamiento. Si la cuenta duplicada ya aparece en su propio listado, la interfaz sí puede indicarle que ese correo pertenece a un usuario visible.

### 4.6 Integridad de escrituras

La creación valida en el servidor nombre, formato de correo, rol y centro. La edición valida nombre no vacío, identificadores enteros, rol y centro; el correo permanece inmutable. Las mutaciones de Neon que afecten más de una tabla se ejecutan de forma atómica. Una falla no deja una cuenta creada a medias ni una relación de centro incoherente.

El correo se envía después de confirmar la transacción de Neon y se trata como una operación `best effort`: un fallo del proveedor no revierte una cuenta válida ni deja una transacción abierta. La respuesta diferencia `cuenta creada` de `correo enviado` y ofrece la recuperación segura definida en la sección siguiente.

No se necesita migración de base de datos: los roles y la relación N:N `usuario_centros` ya existen, mientras que las cuentas operativas continúan usando `usuarios.centro_id`.

### 4.7 Invitaciones y restablecimiento seguro

Una cuenta sin contraseña usa una invitación. Al crearla o reenviarla, el sistema puede mostrar el enlace de un solo uso para que el coordinador lo comparta con la persona. Emitir una invitación nueva invalida las anteriores de esa cuenta.

Una cuenta activa usa restablecimiento. El enlace se envía únicamente al correo registrado y nunca se devuelve al coordinador ni aparece en el DOM, logs o respuesta de la action. Si el correo falla, la interfaz informa que no se pudo entregar y remite a gerencia; no degrada a un enlace copiable.

Emitir un restablecimiento nuevo invalida los tokens anteriores de esa cuenta. Al fijar o cambiar una contraseña, sea mediante enlace o desde el perfil, el servidor consume el token presentado cuando exista y marca como usados todos los demás tokens vigentes del usuario dentro de una sola transacción. Así un enlace guardado no permite apropiarse de la cuenta más tarde.

Estas reglas se aplican a gerencia y coordinación. Cambian el transporte del restablecimiento activo por seguridad, pero no cambian qué usuarios puede gestionar cada rol.

## 5. Experiencia de Gestión de usuarios

### 5.1 Navegación

El coordinador verá `Usuarios` dentro de Configuración. No verá `Gestión centros`. Los roles de gerencia conservan ambos accesos.

Entrar directamente a `/dashboard/usuarios` aplica el mismo control del servidor. Un rol sin permiso no obtiene datos ni una pantalla parcialmente funcional.

### 5.2 Vista del coordinador

La página muestra:

- título `Usuarios de mis centros`;
- filtro por centro cuando supervise más de uno;
- total de cuentas visibles;
- botón `Crear usuario`;
- solo administradoras y asistentes de los centros asignados;
- acciones `Editar` y `Reenviar acceso` para cuentas pendientes, o `Enviar restablecimiento` para cuentas activas;
- ninguna acción de eliminación.

El formulario ofrece únicamente los roles `Administradora` y `Asistente`. El centro es obligatorio y el selector se consulta con el actor vigente para contener solo asignaciones actuales. Si el coordinador supervisa un solo centro, este aparece preseleccionado sin dejar de validarse en el servidor. Si no conserva ningún centro, recibe una vista vacía con explicación y no puede abrir el formulario de creación.

### 5.3 Vista de gerencia

La página conserva el título, los roles disponibles y el alcance global actuales. El transporte seguro de restablecimientos activos de la sección 4.7 también se aplica a gerencia.

### 5.4 Estados de interfaz

Crear, editar y reenviar acceso tienen estados visibles de carga, éxito y error. Durante una escritura se bloquea la repetición del mismo envío. Al cerrar y reabrir un formulario no quedan datos ni errores de la operación anterior.

En teléfono, la lista se presenta como tarjetas. Nombre y rol forman la cabecera; correo y centro se parten sin desbordar; las acciones ocupan el ancho disponible y mantienen un área táctil cómoda.

## 6. Estrategia responsive

La implementación combina una base común con correcciones específicas por pantalla. Los cambios globales resuelven navegación, espacios, tipografía, controles y contenedores; cada página decide cómo reorganizar tablas, gráficos y formularios según su contenido.

### 6.1 Rangos de diseño

| Ancho | Comportamiento |
|---|---|
| `≥ 1025 px` | Sidebar fijo y composición de escritorio existente |
| `768–1024 px` | Barra superior compacta, menú lateral desplegable y contenido de una o dos columnas |
| `320–767 px` | Una columna, contenido a ancho completo, acciones apiladas y tablas adaptadas |

Los rangos orientan el diseño; los componentes también usan tamaños fluidos y `minmax()` para responder correctamente entre puntos de corte.

### 6.2 Navegación móvil

En anchos de hasta 1024 px, el sidebar fijo se reemplaza por:

- una barra superior con marca ALOHA, contexto de página y botón de menú;
- un drawer lateral con todas las opciones autorizadas;
- el selector `Ir a centro` plenamente visible y operable;
- cierre mediante botón, toque en el fondo y tecla `Escape`;
- bloqueo del scroll de fondo mientras esté abierto;
- foco inicial, ciclo de foco dentro del drawer y devolución del foco al botón que lo abrió;
- respeto de `env(safe-area-inset-*)`.

El contenido principal ocupa todo el ancho disponible. No queda una franja de 64 px ni aparecen iconos sin etiqueta como sustituto permanente del menú.

### 6.3 Contenedores y desbordamiento

- Ninguna ruta puede producir scroll horizontal en `documentElement` a 320 px o más.
- Los hijos de `grid` y `flex` usan `min-width: 0` cuando puedan contener texto largo.
- Correos, nombres y referencias largas pueden partir línea.
- No se permite ocultar un defecto global con `overflow-x: hidden` en `body`.
- Una tabla densa puede usar un scroller local anunciado y visible, pero no empujar el documento.
- Modales, drawers y paneles respetan el ancho y alto útil del viewport dinámico.

### 6.4 Tipografía y densidad

En teléfono:

- texto principal: mínimo 15 px;
- etiquetas de formulario y datos secundarios: mínimo 13 px;
- leyendas y encabezados compactos: mínimo 12 px;
- campos editables: mínimo 16 px para evitar el zoom automático en iOS;
- títulos fluidos con `clamp()` y saltos naturales;
- interlineado suficiente para leer cifras, instrucciones y mensajes de error.

Las cifras KPI conservan jerarquía, pero no obligan a reducir etiquetas por debajo de esos mínimos.

### 6.5 Botones y controles

Todo botón, enlace con función de control, selector e icono interactivo debe:

- permanecer dentro del viewport;
- tener un área táctil mínima de 44 × 44 px en móvil;
- mostrar foco visible con teclado;
- tener etiqueta accesible si solo contiene un icono;
- conservar estados normal, activo, deshabilitado y cargando;
- permitir que el texto salte de línea sin cortar la acción;
- evitar `transition: all` y animaciones que ignoren `prefers-reduced-motion`.

Los grupos de acciones se apilan en móvil. La acción principal aparece primero visualmente; las acciones destructivas conservan separación y confirmación.

### 6.6 Formularios y modales

- Formularios de dos, tres o más columnas pasan a una columna en teléfonos y, como máximo, dos en tabletas.
- Cada campo conserva etiqueta visible, mensaje de ayuda y error cerca del control.
- El teclado apropiado se solicita con `type` o `inputMode`.
- Los pies de modal se apilan o permanecen visibles sin tapar contenido.
- Un modal usa semántica de diálogo, título asociado, foco controlado y `Escape`.
- La altura máxima usa el viewport dinámico y permite scroll interno.
- Los botones de guardar y cancelar nunca quedan fuera de pantalla por abrir el teclado.

## 7. Tablas, tarjetas y gráficos

No todas las tablas deben resolverse igual.

### 7.1 Tablas operativas

Listas donde el usuario actúa sobre una fila se convierten en tarjetas debajo de 768 px. Esta regla se aplica a Usuarios, Gestión de centros, Estado de todos los centros, Alertas, Eventos, grupos/niños y Coach. Cada tarjeta conserva:

- identidad principal primero;
- etiquetas visibles para cada dato;
- estado y alerta cerca del título;
- acciones completas al final;
- orden equivalente al de escritorio.

### 7.2 Comparaciones densas

Matrices cuya utilidad depende de comparar columnas usan un scroller horizontal local debajo de 768 px. Esta regla se aplica a Entrenamiento de gerencia, Historial comparativo, Cuadro y Cumplimiento. La primera columna permanece fija e identificable, el contenedor indica que admite desplazamiento y las acciones esenciales no quedan únicamente al extremo derecho.

### 7.3 Gráficos

- Los gráficos se montan después de conocer el ancho real de su contenedor.
- No fijan un ancho mayor que el viewport.
- Leyendas largas bajan de línea o se mueven debajo del gráfico.
- Dos gráficos en paralelo pasan a una columna en teléfono.
- El dato principal también queda disponible como texto; el color no es la única señal.

## 8. Cobertura por ruta

La auditoría incluye todas las rutas visibles de la aplicación, aunque una ruta no requiera cambios después de comprobarla.

| Área | Rutas | Resultado móvil obligatorio |
|---|---|---|
| Acceso y perfil | `/`, `/login`, `/forgot-password`, `/set-password`, `/perfil` | Tarjeta dentro del viewport, campos de 16 px, teclado correcto y acciones completas a 320 px |
| Panel general | `/dashboard` | KPIs en una columna, alerta legible, centros como tarjetas y gráfico fluido |
| Crecimiento | `/dashboard/crecimiento` | Filtros sin corte, métricas y gráficos apilados |
| Ranking | `/dashboard/ranking` | Podio y tarjetas reordenados sin columnas estrechas |
| Alertas | `/dashboard/alertas` | Tarjetas y acciones apiladas; textos largos visibles |
| Historial | `/dashboard/historial` | Filtros compactos, comparación navegable y sin overflow del documento |
| Reporte | `/dashboard/reporte` | Acciones de exportación visibles, bloques de reporte apilados |
| Metas | `/dashboard/metas` | Formulario de metas de una columna y valores legibles |
| Centros | `/dashboard/centros` | Formulario responsive y listado operativo en tarjetas |
| Usuarios | `/dashboard/usuarios` | Política por rol, formulario de una columna y tarjetas con acciones autorizadas |
| Entrenamiento | `/dashboard/entrenamiento` | Matriz dentro de un scroller local con primera columna fija; controles alcanzables |
| Centro | `/centro/[id]` | Resumen, ruta, metas y embudo apilados según prioridad |
| Ruta de nivel | `/centro/[id]/ruta-nivel` | Barra, escenarios y controles sin texto comprimido |
| KPI | `/centro/[id]/kpi` | Captura mensual, cierre e historial operables con una mano |
| Grupos | `/centro/[id]/grupos` | Lista/panel, pestañas, modales e itinerario sin cortes |
| Cuadro | `/centro/[id]/cuadro` | Comparaciones dentro de scroller local y exportación visible |
| Eventos | `/centro/[id]/eventos` | Métricas, formulario y registros sin tabla desbordada |
| Cumplimiento | `/centro/[id]/cumplimiento` | Matriz navegable, primera referencia identificable |
| FODA | `/centro/[id]/foda` | Cuadrantes en una columna, peticiones y diálogos utilizables |
| Historial del centro | `/centro/[id]/historial` | Filtros y datos sin compresión ni overflow global |
| Entrenamiento del centro | `/centro/[id]/entrenamiento` y módulos | Tarjetas, tour, tarjeta flotante y quiz dentro del viewport |
| Coach | `/coach/[token]` | Lista y acciones con áreas táctiles de 44 px, sin corte de nombres |

Las variantes con datos vacíos, cargas, errores y contenido largo forman parte de la revisión; no basta probar el estado ideal.

## 9. Accesibilidad y contenido

La entrega corrige en el área tocada:

- jerarquía de encabezados;
- nombre accesible de botones de icono;
- asociación entre etiquetas, campos y errores;
- contraste WCAG AA para texto y controles;
- foco visible y orden lógico de tabulación;
- semántica y gestión de foco en diálogos y drawer;
- estados comunicados con texto además de color;
- mensajes breves en español y cifras sin abreviaturas ambiguas en móvil.

El logo, la paleta y la tipografía ALOHA se conservan. La mejora responsive no introduce una estética ajena al producto.

## 10. Pruebas de autorización

Las funciones puras de política y las server actions tendrán cobertura para, como mínimo:

1. gerencia conserva acceso global;
2. el coordinador lista solo administradoras y asistentes de centros asignados;
3. no aparecen usuarios privilegiados en su respuesta;
4. puede crear ambos roles operativos en un centro asignado;
5. se rechaza crear en un centro ajeno;
6. se rechaza crear o promover a `coordinador`, `supervisor` o `admin_general`;
7. se rechaza editar un identificador de otro centro;
8. se rechaza editar una cuenta privilegiada aunque conozca su identificador;
9. puede mover una cuenta entre dos centros asignados;
10. se rechaza moverla hacia un centro ajeno;
11. puede reenviar acceso a una cuenta autorizada;
12. se rechaza reenviar acceso a una cuenta ajena o privilegiada;
13. no puede eliminar usuarios;
14. perder una asignación en la base bloquea la siguiente operación aunque el JWT siga vigente;
15. un coordinador sin centros recibe una lista vacía y nunca cae en una consulta global;
16. los roles sin gestión no pueden abrir la ruta ni llamar sus acciones;
17. se rechazan centro ausente, centro no entero, nombre vacío y correo inválido;
18. una colisión de correo fuera del alcance y una carrera de unicidad no enumeran la cuenta existente;
19. revocar un centro o promover/mover al objetivo durante una mutación hace que la transacción falle sin escritura parcial;
20. una invitación nueva invalida las anteriores de la cuenta pendiente;
21. el restablecimiento de una cuenta activa no devuelve el token y solo intenta enviarlo al correo registrado;
22. fijar o cambiar la contraseña invalida todos los tokens restantes del usuario;
23. gerencia no puede eliminar su propia cuenta ni una cuenta `admin_general`, y conserva las demás eliminaciones actuales.

Las pruebas no dependen solo del texto de la interfaz: verifican filtros y rechazos en el servidor.

## 11. Verificación responsive

### 11.1 Viewports obligatorios

Cada familia de pantallas se comprueba en:

- 320 × 568;
- 375 × 667;
- 390 × 844;
- 430 × 932;
- 768 × 1024;
- un escritorio de al menos 1440 px para detectar regresiones.

### 11.2 Lista de control

Para cada ruta aplicable:

1. `document.documentElement.scrollWidth <= document.documentElement.clientWidth`;
2. ningún botón, campo, menú o acción queda cortado;
3. los botones y controles táctiles cumplen 44 × 44 px en móvil;
4. el texto cumple los mínimos definidos;
5. el drawer abre, cambia de ruta, cierra y devuelve el foco;
6. cada modal abre, permite completar el formulario, muestra errores y cierra;
7. el teclado no oculta la acción final;
8. tablas y gráficos usan la estrategia prevista;
9. estados vacío, carga, error y texto largo permanecen legibles;
10. rotar o redimensionar no deja medidas obsoletas.

La validación se hace con navegador real sobre el preview autenticado. Las capturas sirven como evidencia, pero los criterios geométricos y funcionales deciden si pasa.

## 12. Verificación técnica y entrega

Antes de abrir el PR:

- ejecutar la suite completa con `npm test`;
- ejecutar `npm run build`;
- ejecutar `git diff --check`;
- revisar que no entren archivos del checkout sucio ni datos personales;
- probar los flujos de gerencia, coordinador y centro en el preview de Vercel;
- recorrer la matriz móvil de la sección 11;
- revisar el diff completo como cambio de seguridad y de interfaz.

Después:

1. abrir un PR desde `codex/aloha-coordinator-mobile` hacia `main`;
2. esperar y validar los checks, incluido el preview de Vercel;
3. hacer squash merge, como autorizó Fernando;
4. comprobar producción en escritorio y teléfono;
5. verificar que gerencia mantenga sus capacidades y que un coordinador no salga de sus centros.

No hay migración ni variable de entorno nueva. Si producción muestra una regresión, se revierte el merge; la base de datos no requiere restauración.

## 13. Criterios de aceptación

La entrega está completa solamente cuando se cumplen todos estos puntos:

- un coordinador ve `Usuarios`, pero no `Gestión centros`;
- solo recibe administradoras y asistentes de sus centros vigentes;
- puede crear, editar, mover entre sus centros y reenviar acceso;
- no puede eliminar, elevar roles ni actuar sobre otro centro por interfaz o petición manual;
- gerencia conserva su gestión global;
- no existe scroll horizontal del documento entre 320 y 1024 px en las rutas auditadas;
- ningún botón o control se sale del viewport y los controles móviles alcanzan 44 px;
- campos, etiquetas, cifras y mensajes son legibles con los mínimos acordados;
- el menú móvil ofrece todas las rutas y el selector de centro accesibles;
- formularios, tablas, gráficos, drawers y modales funcionan en los viewports obligatorios;
- las pruebas, el build, el preview y el smoke de producción pasan;
- el PR queda fusionado a `main` sin incluir cambios locales ajenos.

## 14. Fuera de alcance

- Cambiar metas, fórmulas KPI o lógica operativa de los centros.
- Rediseñar la identidad visual de escritorio.
- Permitir que el coordinador gestione otros coordinadores o gerencia.
- Dar eliminación de usuarios al coordinador.
- Cambiar la asignación de centros del coordinador desde su propia cuenta.
- Crear roles nuevos o modificar el esquema de base de datos.
- Convertir la aplicación en una app nativa o agregar funcionamiento sin conexión.
