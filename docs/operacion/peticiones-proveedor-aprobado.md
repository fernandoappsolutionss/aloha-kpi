# Peticiones con proveedor aprobado del centro

La administradora marca **El centro ya cuenta con proveedor aprobado**, escribe su nombre, selecciona la categoría y describe el servicio. Pulsa **Continuar: adjuntar cotización** y carga **una cotización del servicio en PDF, de hasta 10 MB**. El envío se habilita después de validar el archivo. No se vuelven a pedir datos fiscales del proveedor aprobado.

**Enviar a aprobación** registra una petición pendiente. El coordinador operativo de esa sede o gerencia pueden descargar la cotización y decidir. Al aprobar, esa única cotización queda asociada a la decisión; no hay que elegir una ganadora entre varios proveedores. El centro ve el proveedor, el estado y el archivo descargable. Tener un proveedor aprobado no autoriza por sí solo el nuevo servicio. La modalidad habitual mantiene tres cotizaciones fiscales válidas.

El nombre admite hasta 200 caracteres. Si ya existen cotizaciones o intentos de carga, no se permite cambiar el proveedor ni la modalidad del borrador: hay que descartarlo y comenzar otro. El PDF puede reemplazarse antes del envío. Después de enviar, el proveedor y su cotización quedan fijados. El coordinador no recibe permiso de borrado.

## Publicación

Aplicar primero la migración y después publicar el código:

```sh
node scripts/migrate-peticion-proveedor-preaprobado-2026-09-07.mjs
node scripts/migrate-peticion-proveedor-preaprobado-2026-09-07.mjs --apply
```

El primer comando es de lectura; el segundo requiere autorización para el entorno de destino. Se añaden modalidad y nombre a la petición, y modalidad a la cotización. Los datos fiscales admiten nulos únicamente en la modalidad preaprobada; una clave foránea impide que la cotización use una modalidad distinta a su petición, y un índice limita el proveedor aprobado a una cotización. Se conserva la validación del PDF y el almacenamiento privado existente. No se alteran las peticiones históricas ni sus documentos. Un rollback de código no debe reactivar la versión intermedia que permitía enviar sin PDF.

## Verificación del requisito corregido

- `npm test`: 1.083 pruebas correctas. `npm run build`: correcto.
- `test/integration/proveedor-preaprobado.integration.ts`: 2 pruebas con PostgreSQL y repositorio reales. Cubren migración repetida; rechazo sin PDF y con firma inválida; reintento; proveedor tomado del servidor; una sola cotización; bloqueo de cambios de proveedor; rechazo si falta el archivo almacenado; envío concurrente; aprobación con archivo asociado; descarga privada y rechazo por rol/centro. El transporte a Blob se sustituye por bytes en memoria, con la inspección y hash reales.
- La integración solo acepta la base local exclusiva `aloha_proveedor_test`, marcada `E2E_DATABASE_CONFIRM=disposable`, centros ficticios 10/11 y usuarios ficticios 8/2. No ejecutarla contra producción.
- Chrome: panel y componentes reales en un entorno local; nombre, categoría, descripción, botón Continuar, una tarjeta PDF y Enviar bloqueado sin cotización comprobados. El selector rechazó adjuntar el archivo de prueba (`fileChooser.setFiles: Not allowed`); no se completó la subida por navegador. La carga/reintento/descarga sí se comprobaron en las pruebas de integración. No se usaron servicios Blob ni correo externos.

## Entrenamiento y audio

Los cinco pasos y tres preguntas reflejan la cotización obligatoria. El dry-run de audio detecta seis clips pendientes, 1.638 caracteres y 47 clips anteriores reutilizables. La generación en ElevenLabs sigue pendiente: la revisión automática rechazó el envío anterior por falta de autorización específica del destino, contenido y voz. No se enviaron los nuevos guiones ni se consumieron créditos.

```sh
node scripts/entrenamiento-audio-actualizaciones.mjs
# Únicamente después de autorización para enviar los guiones actuales:
node scripts/entrenamiento-audio-actualizaciones.mjs --generar
```
