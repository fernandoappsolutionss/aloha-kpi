# Entrenamiento progresivo — evidencia de revisión

Fecha: 2026-09-05. Base: `1628642`. Implementación revisada: `c2bcb55`.

## Resultado comprobado

- 64 módulos digitales usan el recorrido guiado; seis hojas de papel conservan su salida anterior.
- «A la vista» exige todos sus elementos. Cada concepto se guarda individualmente en PostgreSQL, con aislamiento por alumno y módulo.
- El navegador impide pegar; el servidor rechaza copias del glosario, frases insuficientes y duplicados. Lectura y cuestionario vuelven a validar sus requisitos en servidor.
- Los pasos históricos cumplidos se respetan. La revisión del jefe entrenador sigue siendo lectura sin progreso propio.
- Los 64 guiones recuperados producen 195 clips de guía, además de las 64 presentaciones. El generador conserva los 66 clips de tours y reanuda sin repetir los archivos correctos.

## Verificación

| Comprobación | Resultado |
|---|---|
| `npm test` | 993 pruebas: 991 aprobadas, 0 fallidas, 2 omitidas por audios todavía no generados |
| Integración de acciones contra PostgreSQL desechable | 4/4: aislamiento, concurrencia, grandfathering, lectura y quiz |
| `npm run build` | Correcto; 17 páginas estáticas generadas |
| Navegador con administradora ficticia | Portada → lista 3/3 → conceptos 6/6 → lectura → quiz 7/7 → cierre → siguiente módulo |
| Persistencia | Recarga recupera concepto 1/6 y paso actual; siguiente módulo vuelve a portada |
| Entrada de conceptos | Pegar bloqueado; copia tecleada rechazada por el servidor |
| Móvil 390 × 844 | Sin desbordamiento horizontal; controles accesibles |
| Coordinador revisando módulo compartido de administradora | Vista plana, sin guía, campos de conceptos ni acciones que sumen progreso |
| Glosario | Corregida discrepancia de hidratación por Set mutable; recarga limpia y definición abre correctamente |
| Audio, prueba de transporte simulada | Un fallo a 10 ms conserva otros dos resultados a 100 ms; reanudar omite esos dos y genera solo el faltante |
| Revisión independiente de contenido, audio y runtime | Aprobadas, sin hallazgos importantes abiertos |

Los tests de base de datos requieren `E2E_DATABASE_CONFIRM=disposable` y una URL de base de prueba. No se aplicaron migraciones ni se modificaron alumnos en producción.

## Pendiente para cerrar la entrega con voz

1. Autorizar el envío a ElevenLabs de los 259 guiones pendientes (168.471 caracteres), usando la voz aprobada y los créditos existentes. La revisión automática exige confirmación actual y rechazó usar como autorización el historial recuperado.
2. Ejecutar `node scripts/entrenamiento-audio.mjs --concurrencia 3`, comprobar hashes, cobertura y decodificación de todos los MP3, y repetir las pruebas de audio que hoy se omiten.
3. Comprobar reproducción y silencio con los clips reales, incluida la recuperación tras una acción de servidor. La política real de Safari/iPhone necesita prueba en ese dispositivo.
4. Antes de publicar, aplicar `db/migrations/2026-09-05-entrenamiento-conceptos.sql` y luego desplegar. Merge y migración productiva siguen pendientes de la aprobación del resultado.

La rama permanece local y todavía no existe PR: la revisión automática bloqueó también `git push`. Se verificó por API que `fernandoappsolutionss/aloha-kpi` es público y que la cuenta autenticada es su administradora; se solicitó autorización explícita para publicar allí el código y los guiones nuevos.

## Decisiones de implementación

- Auditor disponible independiente en lugar de Sonnet, que estaba sin cuota.
- En cierres compartidos entre puestos, la voz remite al jefe entrenador y al siguiente módulo del propio plan, porque el firmante y el destino cambian por rol.
- Se permitió corregir únicamente el renderizado de `BloquesOficio`, inicialmente fuera del alcance, al comprobar una falla real de hidratación.
