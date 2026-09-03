# R3 — Diálogos, drawer y tour responsive

Fecha: 2026-09-03. Rama: `codex/aloha-coordinator-mobile`.
Base aprobada: `9c54a1b5666c64acb73015e5c7ff547f4220969b`.

## Implementado

- Se preservó y completó el dirty R3 recibido; no se revirtió trabajo del implementador anterior.
- `Dialog` compartido para Grupos (adaptador `Modal`, diez formularios), Cuadro, Eventos, PlanNino y GrowthBriefing. Se conservaron payloads, acciones y estado del formulario.
- `closeDisabled` propaga `saving`/`busy`; X expone disabled, Escape y backdrop no cierran durante una operación, Cancelar también queda bloqueado.
- Pila compartida para `Dialog` y drawer: fondo inert, trap de Tab, foco inicial/restaurado, scroll lock con restauración del valor inline original incluso al cerrar un Plan sobre el drawer.
- El body desplazable de `Dialog` es enfocable por teclado; header/footer quedan fuera del scroll. Plan conserva sus acciones dentro del body.
- Growth: cierre neutral sin acknowledge/snooze, conservando el recibo shown; foco inicial en título y tres acciones originales.
- Menú Eventos no modal con menu/menuitem, aria-expanded, medida posterior al render, clamp de 8 px, foco inicial después del commit visible, resize/orientación/visualViewport y Escape con retorno al trigger.
- Drawer Grupos modal con controles de 44 px, safe area y `vista` conservada al rotar. Tour mantiene su implementación custom, título asociado, foco, medidas con ResizeObserver, visualViewport y prioridad de Escape por capas.
- Correcciones demostradas por Chromium: fila de horarios responsive y con nombres accesibles, mínimos táctiles, body de Plan operable con teclado, contraste y tamaños tipográficos de overlays, tabs de Eventos conservados tras rotar.
- Fixture local fail-closed: centros fijos 2/3 y PK propias; colisiones sin marcador abortan, transporte remoto rechazado, manifest y teardown por IDs exactos. No se cambian asignaciones del coordinador.
- CRM local en 127.0.0.1:4317 con token dummy, cuatro comandos de lectura y rechazo de escrituras. Perfil de servidor con allowlist de entorno; spec R3 excluido del smoke remoto normal.

## Evidencia RED → GREEN

La recuperación empezó con la implementación existente: sus unitarios fuente daban 12/12. No se atribuye a esta recuperación un RED fuente anterior que no observó.

RED real ejecutado con Chromium y fixture local:

1. `--project=phone-320 --project=growth-dialog-local`: 2 fallos, 1 paso, 3 no ejecutados. Horarios con select de 30 px y botón fuera del viewport; auditor Growth usaba el estado de otra ruta. Se separaron los casos del inventario para que un fallo no cancelara los siguientes.
2. Corridas posteriores descubrieron tipografía de 11/11.5 px, body de Plan sin acceso por teclado (Axe), checkbox de 43 px en paisaje, foco del menú antes de ser visible y contraste insuficiente de texto sobre insets y del chip MD2.
3. Los tests de borrador usaban `[type="text"]` pero los inputs reales omiten type. Se corrigió el selector, sin tocar datos ni payloads. Growth intentaba observar `documentElement` antes de existir: la instrumentación focusin demostró que nunca enfocaba el trigger; el test ahora observa `document` y usa el enlace real de salto.
4. `node --test test/responsive-ui.test.mjs`: RED por spec R3 incluido en smoke remoto; GREEN tras exclusión de configuración.
5. Mismo comando: RED por gate que admitía transportes remotos; GREEN tras validación local previa a toda consulta.
6. Aislados finales: Plan + sheet pasan; Growth + auth pasan (2/2, 17.7 s). La prueba de petición retenida demuestra cierre bloqueado sin enviar escritura al servidor.

## Gate reproducible

Todos los valores siguientes son credenciales dummy de infraestructura desechable local, nunca productivas. Requiere el PostgreSQL/Neon proxy R2 ya encendido y el admin fixture ya creado. No ejecutar contra una URL remota. Puertos 3000/4317 libres.

```sh
env \
  E2E_R3_DIALOGS=1 \
  E2E_DATABASE_CONFIRM=disposable \
  DATABASE_URL='postgres://postgres:codex_aloha_r2_disposable@aloha-r2-pg:5432/aloha_r2' \
  USUARIOS_TEST_DATABASE_URL='postgres://postgres:codex_aloha_r2_disposable@aloha-r2-pg:5432/aloha_r2' \
  E2E_NEON_HTTP='http://127.0.0.1:4446/sql' \
  E2E_NEON_WSPROXY='127.0.0.1:5435' \
  SESSION_SECRET='codex-aloha-e2e-session-secret-2026-09-02-long' \
  E2E_ADMIN_EMAIL='admin@e2e.invalid' \
  E2E_ADMIN_PASSWORD='AlohaAdminE2E!2026' \
  E2E_DELIVERY_MODE=stub \
  CRM_SERVICE_TOKEN=r3-local-dummy-token \
  npx playwright test tests/e2e/dialogs.spec.js \
    --project=phone-320 --project=phone-390 --project=tablet-768 \
    --project=growth-dialog-local

node --test test/responsive-ui.test.mjs
npm run build
git diff --check
```

Proyectos: `setup` autentica solo al admin; `phone-320`, `phone-390`, `tablet-768` ejecutan 11 casos cada uno. El inventario recorre explícitamente 320×568 y 390×844 → 844×390 → 390×844. `growth-dialog-local` ejecuta únicamente el caso @growth-local, una vez, con un worker. Total: 35 pruebas. Sin test.skip.

Cobertura: seis diálogos reales (Aperturar, Inscribir Grupos, Plan, Crear clase, Inscribir registro, Retirar Cuadro), menú Eventos, sheet con Plan anidado, operación retenida, tour/rotación y Escape formulario→tour. Axe WCAG A/AA, foco y trap bidireccional, geometría, borradores, tabs, locks y recibo neutral. Las escrituras del caso busy se abortan en el navegador; no se guardan los formularios.

## Resultados finales

- Gate Chromium completo: **35/35 passed (2.4m)**, exit 0; ninguno omitido. Incluye `setup`, los tres proyectos responsive y Growth serial una vez.
- `node --test test/responsive-ui.test.mjs`: **14/14 passed**, exit 0.
- `npm run build`: **exit 0**, compilación en 3.9 s; lint/tipos y generación de 17/17 páginas completados.
- `git diff --check`: exit 0.
- Teardown: 6 entidades fixture, 1 snapshot, 2 recomendaciones y 1 recibo limpiados por PK. Comprobación SQL independiente en `codex-aloha-r2-pg`: centros(2,3)=0; grupos(930002)=0; estudiantes(930022)=0; grupo_horarios(930012)=0; centro_eventos(930032)=0; growth_snapshots para centros2/3=0; mes_kpi para centros2/3=0.
- `test-results/r3-fixture-manifest.json` y `tests/e2e/.auth` no existen después del teardown. No se apagó ni alteró la infraestructura Docker R2.

## Límites y handoff aprobado al controlador

- En Growth se audita la superficie modal y se exige fondo inert. El controlador aprobó separar el overflow preexistente de Resumen, correspondiente a R8, sin esconderlo con CSS ni modificar `app/centro/[id]/page.js`.
- Medición final de `/centro/3`: selector `main.main`, clientWidth=390, scrollWidth=1043; document.scrollWidth=1043, viewport=390. La anotación `R8-background-geometry` conserva la misma medida. El modal cabe y su fondo está inert; este overflow del fondo no se oculta ni se da por resuelto.
- R8 también recibe `app/actions/centro.js:85`: `mezclarSemanasPeriodoAutomaticas is not defined`, capturado por el catch de getCentroResumen cuando el CRM responde correctamente. No es causado ni corregido por los overlays.
- Se observan avisos Next sobre múltiples lockfiles y NO_COLOR/FORCE_COLOR, y abortos ECONNRESET de lecturas pendientes cuando Chromium cambia/cierra contextos. No son fallos de los assertions; no se silencian.
- No se ejecutó contra producción, no hubo push, PR ni merge. Docker R2 se deja encendido. Artefactos Playwright y sesiones auth no se agregan a Git.

## Commit

Implementación verificada: `003972d` — `refactor(ui): unificar diálogos y overlays responsive`.
Este reporte se agrega en un commit documental posterior; rango de revisión desde la base aprobada indicada arriba. Sin push, PR ni merge.
