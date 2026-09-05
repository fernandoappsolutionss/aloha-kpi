# Entrenamiento progresivo con voz — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ejecutar sin pausas entre tareas autorizadas, conservando el trabajo recuperado.

**Goal:** Completar los 64 módulos con un recorrido progresivo, conceptos escritos por el alumno y guía hablada con la voz aprobada.

**Architecture:** La página servidora prepara las secciones y entrega slots a una isla cliente. El servidor conserva autoridad sobre conceptos, lectura y cuestionario; localStorage solo recuerda pasos efímeros. Tres familias de audio tienen manifests independientes.

**Tech Stack:** Next 15.5.19, React 18, JavaScript, Neon/Postgres, node:test, ElevenLabs multilingual v2.

**Spec:** `docs/superpowers/specs/2026-09-05-entrenamiento-guiado-voz-design.md`, revisión v3 verificada por Sol antes de implementar runtime.

## Global Constraints

- Conservar byte-idénticos los nueve tours: `lib/entrenamiento/modulos.js`, `lib/entrenamiento/progreso.js`, `lib/entrenamiento/respuestas.js`, `test/entrenamiento.test.mjs` y sus audios.
- No modificar catálogo, cursos ni glosario, ni instalar dependencias nuevas.
- 64 módulos con `roles.length > 0`; los seis de papel no reciben progreso ni audio nuevo.
- Voz aprobada `MUPKcfGINNwjsSaWv8yx`, multilingual v2, stability .38, similarity .85, style .45, speed 1; formato mp3_44100_64.
- Progreso histórico respetado; revisión de otro puesto no cuenta como estudio propio.
- Migración local antes de probar; migración productiva y merge después de aprobación del resultado final.
- Cada agente tiene propiedad exclusiva de los archivos asignados; no revertir cambios de otros.

### Task 1: Recuperar los guiones

**Files:** crear `lib/entrenamiento/oficio/guia.js` y `test/entrenamiento-guia-contenido.test.mjs`.

**Interfaces:** exportar `GUIA[id] = { vista, palabras, cierre }` y `GUIA_GENERAL = { laminas, lectura, preguntas }`; el script de audio los consume, nunca los componentes cliente.

- [ ] Recuperar resultados del workflow de la sesión `12d3a9c3-fb0e-48e8-8403-056a7ad62bc1`; preferir revisión v2 y briefs posteriores a PR #114.
- [ ] Verificar cobertura y reglas con tests de contenido:

```js
assert.deepEqual(Object.keys(GUIA).sort(), MODULOS_OFICIO.filter(m => m.roles.length).map(m => m.id).sort())
for (const g of Object.values(GUIA)) assert.deepEqual(Object.keys(g).sort(), ['cierre', 'palabras', 'vista'])
assert.deepEqual(Object.keys(GUIA_GENERAL).sort(), ['laminas', 'lectura', 'preguntas'])
```

- [ ] Corregir solo guiones inválidos, conservando los específicos de cada módulo. Validar longitud, pausas, vocabulario, cantidad de conceptos y correspondencia con la lista real.
- [ ] Ejecutar `node --test test/entrenamiento-guia-contenido.test.mjs`; entregar informe de recuperación y revisión de contenido.

### Task 2: Recorrido, persistencia y guardas

**Files:** crear `lib/entrenamiento/oficio/guia-pasos.js`, `components/entrenamiento/{GuiaModulo,ConceptosOficio,MarcarEstudiado}.js`, migración conceptos y `test/entrenamiento-guia.test.mjs`. Modificar la página de módulo, actions oficio, MasaOficio, QuizOficio, PortadaModulo, TourHost, esquema, estilos y tests de revisión/portada/aislamiento afectados.

**Interfaces:** contrato completo de las funciones puras y acciones en spec §§3–5. Consumir manifests únicamente para rutas de audio existentes. Contexto opcional fuera del proveedor; `completar(id, { durable: true })` refresca props servidoras.

- [ ] Crear pruebas rojas del orden, grandfathering y validación antes de la implementación:

```js
assert.equal(pasoActual(pasosDe({ vista: true, palabras: true, laminas: false, preguntas: true }), hechosDe({}, {}, ['puesto'], [])), 'portada')
assert.equal(validarConcepto(null, {}, []).ok, undefined)
assert.equal(validarConcepto('Aquí describo mi responsabilidad concreta y explico cómo ayuda diariamente al equipo.', {}, []).ok, true)
```

- [ ] Implementar funciones puras sin imports; pruebas de cada error exacto, copia, repetición y los escenarios históricos del spec.
- [ ] Añadir tabla conceptos y acciones autenticadas con aislamiento por usuario/módulo/slugs vivos, lock y ReadCommitted; completitud retornada por servidor.
- [ ] Montar los slots progresivos, conceptos sin pegar, estados de guardado y audio único con pausa/silencio y recuperación de reproducción bloqueada.
- [ ] Aplicar modo revisión antes de determinar alumno; mantener página plana para revisión y módulos futuros. Suprimir TourHost en estas rutas.
- [ ] Ejecutar pruebas focales, integrar con datos locales ficticios y entregar informe con comandos/resultados. No tocar Task 1 ni Task 3.

### Task 3: Generación de audio incremental

**Files:** modificar `scripts/entrenamiento-audio.mjs`, `.gitignore`, `test/entrenamiento-oficio-voz.test.mjs`, `test/entrenamiento-marca-oficio.test.mjs`; crear `test/entrenamiento-guia-audio.test.mjs` y manifest guía vacío inicial. Audios/manifests finales los genera el coordinador.

**Interfaces:** exportar `RECETAS`, `hashDe(texto, receta)`, `clipsDeGuia(filtro)`; preservar forma de claves de oficio y tres muestras. Hash legacy `sha1(texto + JSON.stringify(settings) + voiceId + format).slice(0,12)` con orden original del objeto.

- [ ] Prueba roja de compatibilidad de cada tour congelado y aislamiento de familias; ningún tour llama fetch.
- [ ] Implementar tabla CLI del spec, muestras independientes en `.muestra/`, identidad de voz aprobada fija y API key requerida únicamente para clips nuevos de una ejecución real.
- [ ] Probar selección64+195, error de papel/filtro inválido, hashes y escritura incremental en destinos temporales con fetch simulado. Las muestras no alteran manifests.
- [ ] Ejecutar tests focales y entregar informe. No generar audios pagados durante tests.

### Task 4: Verificación y entrega

**Files:** audios/manifests generados, informe de evidencia, memoria y PR.

- [ ] Revisar cada frente y reparar bloqueantes antes de generar audio.
- [ ] Generar64 presentaciones y195 guías con voz aprobada, incrementalmente; conservar66 tours. Comprobar MP3s decodificables, cobertura y correspondencia de hashes.
- [ ] Correr `npm test` y `npm run build`. Probar en navegador cuenta local: portada→lista→seis conceptos→lectura→quiz→cierre, recarga parcial, pegar/copia rechazados, silencio, revisión y móvil.
- [ ] Revisión independiente del diff completo y de los hallazgos corregidos.
- [ ] Commit de la rama y PR listo para probar; entregar evidencia y pedir únicamente autorización final de publicación si sigue siendo necesaria.
