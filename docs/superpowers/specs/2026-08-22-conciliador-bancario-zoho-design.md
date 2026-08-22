# Conciliador bancario ↔ Zoho Books

**Fecha:** 2026-08-22

**Estado:** Implementado en la rama `claude/zoho-bank-reconciler-r11p9e`; pendiente: migración con `--apply` en producción, variables de Zoho en Vercel y mapeo inicial de cuentas por centro.

**Aplicación:** ALOHA KPI (`/dashboard/conciliacion` y `/centro/[id]/conciliacion`)

## Problema

Los movimientos del banco se pasan a Zoho Books a mano, cuenta por cuenta y
centro por centro. Es lento, se cuela dos veces el mismo depósito cuando alguien
repite el trabajo, y nadie sabe con certeza qué del extracto ya está asentado.
Además ALOHA no tiene una sola organización de Zoho: hay una por sociedad
(Panamá, Santiago, Venezuela, Altavia), y cada centro trabaja contra la suya.

## Resultado esperado

Desde el KPI se adjunta el CSV que exporta la banca en línea y la aplicación
registra en Zoho Books, en la cuenta bancaria del centro, los movimientos que
todavía no están. Lo que ya existe se marca y no se toca.

## Decisiones tomadas con el solicitante

1. **Formato de entrada:** CSV de la cuenta bancaria. PDF queda fuera de alcance.
2. **Clasificación:** automática por reglas sobre la descripción del banco.
3. **Alcance:** lo usan el administrador y el usuario de cada centro.
4. **Mapeo:** hay que ordenar qué organización y qué cuenta de Zoho le
   corresponde a cada centro; eso se configura desde el panel, no en el código.

## Reglas de negocio

1. Una cuenta bancaria de Zoho se asigna a **un** centro. Una cuenta sin centro
   es corporativa y solo la ve un administrador.
2. Un usuario de centro ve, concilia y registra únicamente las cuentas de su
   centro.
3. Las reglas de clasificación pertenecen a una organización de Zoho. Un usuario
   de centro crea y edita reglas atadas a su cuenta; solo un administrador crea
   reglas que apliquen a toda la organización.
4. Gana la regla de mayor prioridad; a igual prioridad, la de patrón más largo
   (la específica le gana a la genérica).
5. Lo que ninguna regla clasifica cae en las **cuentas puente** de la cuenta
   bancaria. Sin puente configurado, el movimiento queda `sin_clasificar` y no
   se puede registrar: nunca se inventa una cuenta contable.
6. Antes de registrar se compara contra lo que Zoho ya tiene en esa cuenta, con
   tolerancia de fechas configurable (3 días por defecto).
7. Una carga con movimientos ya publicados no se puede borrar.

## Diseño

### Capas

| Capa | Archivos | Responsabilidad |
|------|----------|-----------------|
| Núcleo puro | `lib/conciliacion/*.mjs` | Leer CSV, normalizar, clasificar, conciliar, armar el payload. Sin red ni base de datos. |
| Cliente Zoho | `lib/zoho.js` | OAuth con refresh token, paginación, límites, timeouts. Server-only. |
| Datos | `lib/conciliacion-repository.js` | SQL parametrizado, inserción por tandas, candado de publicación. |
| Acciones | `app/actions/conciliacion.js` | Permisos, orquestación, presupuesto de tiempo. Devuelven `{ error }` legible. |
| Interfaz | `components/conciliacion/*` | Carga, revisión, reglas y mapeo. |

### Lectura del CSV

No hay una plantilla por banco: se detectan el separador, la fila de
encabezados y las columnas por sinónimos (`Fecha`, `Fecha de Transacción`,
`Débito (B/.)`, `Concepto`, `Referencia`…). El orden día/mes se decide mirando
**todo** el archivo, no fila por fila. Los montos aceptan `1,234.56`,
`1.234,56`, `(125.40)`, `125.40-` y `B/. 80.00`. Las filas sin fecha o sin monto
(títulos, totales al pie) se descartan y se reportan con su motivo, nunca en
silencio.

El archivo se decodifica en UTF-8 y, si aparece el carácter de reemplazo, se
reintenta en Windows-1252: la banca panameña exporta casi siempre en esa
codificación y esa basura acabaría dentro de la descripción del asiento.

### Antidoble registro

Tres barreras, de la más blanda a la más dura:

1. **Huella por línea:** SHA-1 de fecha, dirección, monto, referencia y
   descripción normalizada, más el número de ocurrencia dentro del archivo. Dos
   pagos idénticos el mismo día siguen siendo dos movimientos; resubir el mismo
   archivo reproduce las mismas huellas y todo se marca *ya importado*.
2. **Cruce contra Zoho:** se traen las transacciones de esa cuenta en el rango
   del extracto (± tolerancia) y se emparejan 1 a 1 por monto, dirección y
   fecha, prefiriendo la misma referencia. Cada transacción de Zoho se consume
   una sola vez.
3. **Índice único parcial** sobre `(cuenta_id, huella)` para los estados
   `publicado` y `publicando`. Cubrir también `publicando` es deliberado: el
   candado tiene que cerrarse **antes** de llamar a Zoho. Si solo cubriera
   `publicado`, dos procesos podrían reclamar la misma línea, ambos crear el
   asiento en Zoho y chocar recién al guardar — con el duplicado ya escrito en
   la contabilidad.

### Publicación

Una server action publica en tandas con presupuesto de 45 s y espaciado de
650 ms entre llamadas (Zoho permite ~100 por minuto y organización). Lo que no
alcanza queda pendiente y la interfaz dice cuántos faltan. Un 429 corta la
tanda: seguir empujando solo consigue más rechazos.

Máquina de estados de un movimiento:

    nuevo ──reclamar──> publicando ──POST ok──> publicado
      │                     │
      │                     └──POST falla──> error ──reconciliar──> nuevo | ya_en_zoho
      ├──sin cuenta──> sin_clasificar ──asignar cuenta──> nuevo
      ├──huella previa──> duplicado
      ├──existe en Zoho──> ya_en_zoho
      └──decisión humana──> ignorado

Si el proceso muere con una fila en `publicando`, *Volver a conciliar* consulta
Zoho de nuevo: si el asiento alcanzó a crearse la fila queda `ya_en_zoho`; si no,
vuelve a `nuevo`. No se adivina.

### Dirección contable

Zoho usa `from_account_id` / `to_account_id`. Una entrada va de la cuenta de
ingreso al banco; una salida, del banco a la cuenta de gasto. Invertirlo
registra el asiento al revés, así que `payloadBancario()` es puro y está
probado en las dos direcciones.

## Fuera de alcance

- Extractos en PDF.
- Crear o emparejar facturas y pagos de clientes (solo transacciones bancarias).
- Alta automática de cuentas contables en Zoho.
- Conciliación programada por cron: hoy la dispara una persona.

## Verificación

- `npm test` — 638 pruebas, incluidas las del núcleo del conciliador:
  lectura de CSV (`test/conciliacion-lectura.test.mjs`), reglas y huellas
  (`test/conciliacion-reglas.test.mjs`), cruce y extremo a extremo
  (`test/conciliacion-cruce.test.mjs`), constructor de SQL
  (`test/conciliacion-insert.test.mjs`) e invariantes del esquema
  (`test/conciliacion-schema.test.mjs`).
- `npm run build` — compila con las dos rutas nuevas registradas.
- Pendiente contra entorno real: `npm run db:migrate:conciliacion -- --apply`,
  variables de Zoho en Vercel y una carga de prueba con el extracto de Banco
  General de un mes.
