# Ventas, nuevos activos y proyeccion mensual

## Objetivo

Separar la captacion comercial de la incorporacion operativa. Una venta puede ocurrir meses antes de que el nino comience clases, por lo que ambas cifras deben conservar su significado en KPI, Historial, Resumen y Cuadro de Negocio.

## Definiciones

- **Nuevos ingresos venta:** suma de `ing_d1` a `ing_d5` en las cinco semanas de `kpi_semanas`. Esta cifra mide ventas y se compara con `meta_nuevos_mensual`.
- **Nuevo activo:** nino que comienza a recibir clases durante el mes consultado. Esta cifra alimenta `resumen_mes.nuevos_activos_mes` y el movimiento de ninos.
- **Baja potencial:** nino que permanece activo durante el mes actual, pero anuncio que se retirara el mes siguiente.

## Fecha operativa de inicio

La fecha operativa de cada nino sera la fecha mas reciente entre su inscripcion y la fecha de inicio de clases del grupo:

```text
fecha operativa = max(fecha_inscripcion, grupo.fecha_inicio_clases)
```

Esta regla cubre dos casos:

- El nino se vende durante el llenado: cuenta como activo cuando inicia el grupo.
- El nino entra en un grupo que ya comenzo: cuenta como activo desde su inscripcion.

Un retiro anterior a la fecha operativa cancela el inicio. Si el nino inicia y se retira durante el mismo mes, aparece tanto en inicios como en retiros. Las reincorporaciones permanecen separadas y no cuentan como nuevos activos.

## Calculos mensuales

El sistema aplicara estas formulas:

```text
nuevos ingresos venta = suma de ventas del KPI semanal
nuevos activos = cantidad de inicios operativos del mes
ninos final = ninos inicio + nuevos activos + reincorporados - retirados
```

Los meses cerrados conservaran sus valores y listas en la foto mensual. La declaracion por fecha operativa comienza en agosto de 2026. Los meses anteriores mantienen sus valores y fotos historicas porque las fechas del cargue inicial no permiten reconstruir inicios confiables.

## Proyeccion del proximo mes

El Resumen del centro mostrara una proyeccion para el siguiente mes calendario:

```text
proyeccion = cierre operativo del mes actual
             - bajas potenciales de grupos ya iniciados
             + ninos que iniciaran clases el proximo mes
```

La tarjeta mostrara el total proyectado y el desglose de cierre actual, bajas anunciadas e inicios programados. Los inicios programados salen de `grupo.fecha_inicio_clases`, no de `grupo.fecha_apertura`.

## Cuadro de Negocio

El Cuadro de Negocio usara los inicios operativos para las columnas `Nuevos`, los royalties y la sincronizacion con KPI. Tambien agregara:

- Una seccion `Inicios de clase del mes` en la pantalla.
- Una hoja `INICIOS DE CLASE` en el Excel.
- Una fila por nino con coach, grupo, itinerario, nivel, fecha de inscripcion, fecha de inicio de clases, representante, correo y telefono.

La lista de inicios tendra el mismo valor declarativo que la lista de retiros enviada a la administracion de la franquicia.

## Cambios de interfaz

- KPI Mensual mostrara `Nuevos ingresos venta` y `Nuevos activos del mes` por separado.
- La meta mensual se aplicara solo a ventas.
- `Ninos final mes` usara nuevos activos, reincorporaciones y retiros.
- Historial mostrara ambas series sin usar una como respaldo de la otra.
- Resumen mostrara la proyeccion del mes siguiente con su desglose.
- Cuadro de Negocio y su Excel mostraran los inicios declarados.

## Compatibilidad y errores

- No se agregara una columna para ventas: `kpi_semanas` ya es su fuente de verdad.
- `resumen_mes.nuevos_activos_mes` conservara su significado operativo original.
- Si un grupo carece de fecha de inicio, la fecha de inscripcion servira como fecha operativa.
- Los grupos sin fecha de inicio no entraran en la proyeccion como grupos futuros.
- Los meses cerrados seguiran siendo inmutables.
- Antes de agosto de 2026 se conserva la clasificacion historica; no se reinterpretan fechas importadas como inicios de clase.

## Pruebas

Las pruebas cubriran:

- Venta dos meses antes del inicio del grupo.
- Inscripcion posterior al inicio de un grupo existente.
- Retiro anterior al inicio.
- Inicio y retiro durante el mismo mes.
- Reincorporacion excluida de nuevos activos.
- Proyeccion con bajas potenciales e inicios del mes siguiente.
- Separacion entre ventas, meta comercial y nuevos activos en Historial.
- Hoja `INICIOS DE CLASE` y totales del Cuadro de Negocio.
