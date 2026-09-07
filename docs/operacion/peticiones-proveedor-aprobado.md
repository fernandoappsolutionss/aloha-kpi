# Peticiones con proveedor aprobado del centro

La administradora puede marcar **El centro ya cuenta con proveedor aprobado**, escribir su nombre, seleccionar la categoría y describir el servicio. **Enviar a aprobación** registra una petición pendiente; el coordinador operativo de esa sede o gerencia deciden. El estado y el proveedor permanecen visibles para el centro. La modalidad habitual conserva tres cotizaciones fiscales válidas.

Los borradores conservan nombre y modalidad. El nombre admite 200 caracteres y es obligatorio para enviar. Si ya existen cotizaciones o cargas, no se permite convertir ese borrador a proveedor aprobado: hay que descartarlo y comenzar otro. El permiso para decidir no otorga borrado al coordinador.

## Publicación

Aplicar primero la migración aditiva, después publicar el código:

```sh
node scripts/migrate-peticion-proveedor-preaprobado-2026-09-07.mjs
node scripts/migrate-peticion-proveedor-preaprobado-2026-09-07.mjs --apply
```

El primer comando es de lectura; el segundo requiere autorización para el entorno de destino. Las columnas nuevas son `proveedor_preaprobado` (false por defecto) y `proveedor_preaprobado_nombre`. Los registros históricos conservan su modalidad y sus documentos. Revertir el código no requiere borrar columnas; la versión anterior no puede aprobar peticiones nuevas que carecen de cotizaciones.

## Verificación

- `npm test`: 1.080 pruebas, incluidas 13 de la modalidad nueva.
- `test/integration/proveedor-preaprobado.integration.ts`: repositorio real, migración repetible, persistencia, concurrencia e historial y permisos. Solo acepta una base local exclusiva llamada `aloha_proveedor_test`, marcada `E2E_DATABASE_CONFIRM=disposable`; usa las tablas del esquema ALOHA, centros 10/11 y usuarios ficticios 8 (administradora), 2 (coordinador de 10). No ejecutar contra producción.
- Chrome con aplicación Next real y PostgreSQL local: envío sin Blob/PDF desde móvil 390; aprobación del coordinador y estado visible para administradora; escritorio 1910 sin desbordamiento. Recorrido de entrenamiento12, sus 5 pasos comprobados sin crear solicitudes desde el tour.

## Entrenamiento y audio

Se añadieron cinco pasos y tres preguntas. Los seis guiones nuevos contienen 1.525 caracteres. Los 47 audios actualizados anteriores se reutilizan. La generación de esos seis clips en ElevenLabs fue bloqueada por revisión automática y quedó pendiente de autorización específica; no se consumieron créditos.

```sh
node scripts/entrenamiento-audio-actualizaciones.mjs
# Solo después de autorización del usuario para enviar esos guiones a ElevenLabs:
node scripts/entrenamiento-audio-actualizaciones.mjs --generar
```
