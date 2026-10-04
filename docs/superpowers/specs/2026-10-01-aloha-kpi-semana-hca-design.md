# Semana de cierre con estadísticas, condiciones y cuotas en ALOHA KPI — diseño

**Fecha:** 2026-10-01 · **Aprobado por:** Fernando Pérez (chat, 2026-10-01) · **Rama base:** `origin/main` @ `1af09b4`

## Objetivo

Que ALOHA se dirija con la tecnología administrativa de Hubbard: cada centro tiene estadísticas semanales automáticas, una gráfica que dice en qué condición está, la fórmula de esa condición con objetivos concretos debajo de cada paso, cuotas semanales, y un tablero donde gerencia y coordinadores ven las métricas con claridad. Se elimina el FODA.

## Decisiones de Fernando (no reabrir)

1. **Vocabulario:** términos de la teoría sin marca. Sí: estadística, condición (Inexistencia, Peligro, Emergencia, Normal, Afluencia, Poder, Cambio de Poder), fórmula, cuota, plan de batalla, producto del puesto, semana de cierre. No: "HCA", "Hubbard", "hat", "PFV", "checksheet", "drill" (lo prohíbe `test/entrenamiento-marca-oficio.test.mjs` y sigue vigente).
2. **Condición:** la asigna la administradora. El sistema calcula su propia lectura de la gráfica; la administradora NO la ve; si su condición es MÁS ALTA que la lectura (a su favor), el coordinador y gerencia ven una alerta de discrepancia. Si es igual o más baja, no hay alerta (asignarse una condición más dura no es falsear).
3. **Ritmo:** la semana dirige; el mes paga. El cierre mensual, `resumen_mes`, `mes_kpi`, las metas trimestrales, el semáforo y el pago del KPI NO cambian.
4. **Estadística principal del centro:** niños activos al cierre de la semana.

## Definiciones

### Semana de cierre
- La semana va de **viernes a jueves** (fechas civiles) y se nombra por su **jueves de cierre** (`semana_fin`).
- Los eventos de alumnos tienen fecha sin hora, así que el jueves completo cuenta en la semana que cierra ese jueves. Las clases de prueba (con hora) se cortan por la fecha civil del centro: `America/Caracas` para el centro 10 (Los Naranjos), `America/Panama` para los demás.
- Foto: un cron diario (06:00 Panamá) recalcula la semana abierta y, el viernes, congela la semana que cerró el jueves (`estado='cerrada'`). Una semana cerrada no se recalcula sola; solo Master puede recalcularla.
- La condición de la semana J se asigna después de su foto, con fecha límite el **viernes siguiente al jueves J a las 10:00** (hora del centro). El plan de batalla que sale de esa condición se ejecuta en la semana que cierra J+7.

### Estadísticas del centro (todas automáticas, nadie las digita)

| Código | Nombre visible | Tipo | Inversa | Cómo se calcula |
|---|---|---|---|---|
| `ninos_activos` | Niños activos al cierre | nivel | no | Cierre del mes anterior (`cierreMesAnterior` de `lib/cadena`) + inicios de clase del mes con inicio ≤ jueves + reincorporaciones del mes con fecha ≤ jueves − retiros operativos del mes con fecha ≤ jueves. Es el mismo balance del KPI mensual cortado en el jueves: si el jueves es el último día del mes, debe coincidir con el balance vivo del mes. |
| `nuevos_inscritos` | Nuevos inscritos | flujo | no | Primer evento global de inscripción de cada niño (mismo canónico que `lib/kpi-semanal-auto.mjs`), sin traslados ni matrículas anuladas, con fecha dentro de la semana. |
| `retiros` | Retiros | flujo | sí | Retiros operativos (`retirosActivosMes`) de los meses que toca la semana, con fecha dentro de la semana y motivo distinto de graduado. Un retiro sin fecha cuenta el último día de su mes, igual que en el balance mensual: así la caída de niños activos y el retiro aparecen en la misma semana. |
| `facturas_vencidas` | Facturas de mensualidad vencidas | nivel | sí | El último conteo diario del cron de Zoho dentro de la semana (jueves; si falta, el día hábil anterior más cercano de la misma semana). Se lee de `kpi_semanas.cob_dN` con `semanaDiaKpi`. |
| `cp_asistidas` | Clases de prueba asistidas | flujo | no | Suma de `stats.attended` del CRM en clases realizadas (`published`/`completed`) cuya fecha civil cae dentro de la semana. |

- Una estadística que no se puede calcular (dato roto, CRM caído, Zoho sin datos) queda `valor = NULL` con el motivo en `detalle.error`; la gráfica corta la línea. **Nunca se pinta 0 en lugar de "sin dato".**
- Historia: se reconstruye desde la semana que cierra el **2026-08-13** (primera semana completa posterior al gate del 2026-08-01). La cobranza solo tendrá datos desde que el cron de Zoho empezó a escribir.

### Gráfica semanal (un solo componente para todos)
- 12 semanas. Tramo **azul** si la estadística mejora o se mantiene, **rojo** si empeora.
- En las inversas el eje vertical se invierte: mejorar siempre es subir y siempre es azul. La gráfica lo rotula ("menos es mejor").
- Escala automática: del mínimo al máximo de valores y cuotas de la ventana, con un margen del 10 % del rango (mínimo 1 unidad); si todo es igual, ±1.
- La cuota de cada semana va como marca punteada; la condición asignada, como un punto de color sobre la semana.
- SVG propio a partir de un modelo puro y testeado (no Recharts: no permite color por tramo y el KPI ya tuvo problemas con gráficas medidas en paneles ocultos).

### Condición, fórmula y plan de batalla
- **Una condición por centro y semana**, juzgada sobre la estadística principal.
- Selector visible: Inexistencia, Peligro (con el conmutador personal / para el superior), Emergencia, Normal y Afluencia (financiera / de acción). Poder y Cambio de Poder están detrás de "Más condiciones".
- Al elegir la condición aparece su **fórmula con el texto oficial** del material de HCA Venezuela (en `lib/condiciones/formulas.mjs`, con un test que congela el texto). La fórmula es guía: los pasos no se marcan; **debajo de cada paso se escriben objetivos** (texto, responsable, fecha, hecho).
- Secciones del plan: Fórmula (objetivos por paso), Urgentes, Pendientes, Órdenes del coordinador y Plan estratégico.
- **Pendientes automáticos:** al abrir el plan de la semana J se copian, una sola vez, los objetivos no hechos del plan J−7, y por cada paso de la fórmula anterior que quedó sin ningún objetivo hecho se crea el pendiente "Terminar el paso N de <condición>: <texto del paso>" (se termina la fórmula empezada).
- **Plan estratégico:** muestra las recomendaciones pendientes de "Ruta al próximo nivel" (`growth_recommendations`) del centro; no se duplican en tablas nuevas.
- **Estado del plan:** `sin_condicion` (no hay condición), `incompleto` (hay condición pero algún paso de la fórmula no tiene objetivo), `completo`. Pasado el plazo del viernes 10:00, `sin_condicion` e `incompleto` se pintan en rojo en el tablero.
- Si se cambia la condición después de escribir objetivos de fórmula, esos objetivos pasan a Urgentes con su texto intacto (no se pierden).

### Lectura automática (convención ALOHA, no HCA)
- Se calcula sobre `ninos_activos`, con Δ = valor de la semana − valor de la semana anterior y r = Δ / max(valor anterior, 1):
  - `inexistencia`: menos de 4 semanas con dato, o valor 0.
  - `peligro`: r ≤ −2 %, o 3 semanas seguidas bajando, o 3 lecturas seguidas en Emergencia o peor.
  - `emergencia`: Δ ≤ 0 (sin crecer o bajando poco).
  - `normal`: 0 < r < 2 %.
  - `afluencia`: r ≥ 2 %.
  - Nunca propone Poder ni Cambio de Poder.
- Los umbrales viven como constantes en `lib/condiciones/lectura.mjs`. Antes de encender las alertas se corre `scripts/calibrar-lectura-condicion.mjs` sobre la historia real y se revisa la distribución; si Fernando ajusta un umbral, se cambia la constante.
- La lectura se guarda con la asignación (`lectura_auto`) para auditoría.
- **Seguridad:** el servidor NO devuelve la lectura ni la discrepancia a administradora ni asistente. Ocultarla en la UI no basta.

### Cuotas semanales
- Cuota por centro, estadística y semana de ejecución (J+7), propuesta por el sistema, ajustable por la administradora y **aprobada por el coordinador** (o Master).
- Propuesta (convención ALOHA): flujos y niveles normales → valor de la última semana cerrada + 1. Nuevos inscritos → nunca menos que `ceil(metas.nuevos × 12 / 52)`. Inversas → `max(0, última − 1)` sin pasar el techo de la meta: retiros ≤ `floor(niños activos × metas.desercion / 100 × 12 / 52)`, facturas vencidas ≤ `metas.cobranza` (metas del trimestre vía `normalizarMetas` de `lib/marcadores.mjs`). Sin dato de la semana anterior, no hay propuesta (la administradora la escribe).
- Ritmo (solo flujos, semana abierta): esperado = cuota × días transcurridos / 7, contando viernes = 1 … jueves = 7.
- Se quita del KPI Mensual la cuota semanal "meta ÷ 5" y su columna "¿Cumple?"; en su lugar, un enlace a la pestaña Semana.

### Vistas
- **Pestaña "Semana" del centro** (`/centro/[id]/semana`, en el grupo de pestañas del KPI donde estaba FODA). La ven y usan administradora, asistente, coordinador (sus centros) y gerencia (solo lectura). Arriba las 5 estadísticas con su gráfica, valor de la semana abierta, última cerrada y cuota con ritmo; abajo la condición y el plan. La condición la asignan administradora, coordinador o Master; la asistente puede agregar y marcar objetivos.
- **Reunión semanal** (`/dashboard/reunion-semanal`, en el bloque Panel del Sidebar) para coordinador y gerencia: sus centros ordenados del que más creció en niños activos al que menos (primero se atiende al que va mejor), cada uno con gráfica principal, condición, estado del plan, discrepancia, cuotas propuestas para aprobar y un campo para dejar órdenes en el plan del centro. Gerencia de solo lectura (admin_general, supervisor) la ve sin poder aprobar.
- **Tablero semanal** arriba del Panel general (`/dashboard`): una fila por centro con niños activos (valor, Δ de la semana, minigráfica de 12 semanas), condición, alerta de discrepancia, % de cuotas cumplidas la semana pasada y estado del plan; encima, la gráfica consolidada de niños activos de todos los centros del alcance. Todo sale de **una sola Server Action** (la app serializa las Server Actions y cada viaje cuesta ~300 ms).

### FODA fuera
- Se quita la pestaña FODA y se borran `app/actions/foda.js`, `lib/foda-datos.mjs`, `components/encuestas/EncuestasFoda.js` y sus tests.
- **Peticiones** pasa a su propia pestaña `/centro/[id]/peticiones` con el mismo panel. `/centro/[id]/foda` redirige a `/centro/[id]/peticiones` para que sigan funcionando los correos ya enviados y el tour de peticiones; el enlace del correo y el tour se actualizan a la ruta nueva. Las clases CSS `.foda-*` que usa Peticiones se renombran a `.peticiones-*`.
- La tabla `foda` se conserva como archivo histórico: no se lee, no se escribe y no se borra.
- Entrenamiento: el "informe FODA mensual" de la administradora pasa a ser el **cierre semanal** (estadísticas, condición, fórmula con objetivos, cuotas) que se presenta en la reunión semanal; se actualizan módulos, glosario, quizzes y guía hablada. Los audios afectados quedan listados para regenerarlos con autorización de Fernando.

## Fuera de alcance (después)
Estadísticas por puesto (coach, asistente, administradora), ingreso en dinero desde Zoho, juegos con premios, reemplazar el checklist de Disciplina, cambiar el semáforo trimestral o el pago del KPI, y copiar código de la plataforma HCA (es de HCA por decisión del 2026-09-14: se reimplementa lo poco que hace falta).

## Fases (un PR cada una, apiladas)
- **F1** FODA fuera y Peticiones a su pestaña.
- **F2** Semana de cierre, estadísticas automáticas con historia, gráfica, pestaña Semana en solo lectura y tablero de gerencia.
- **F3** Condición, fórmula, plan de batalla, pendientes, lectura automática y discrepancia.
- **F4** Cuotas, ritmo, Reunión semanal y retiro de la cuota "meta ÷ 5".
- **F5** Entrenamiento y lista de audios.

## Riesgos
- **Población semanal contra balance mensual:** si la fórmula semanal diverge del balance del mes, gerencia verá dos números. Mitigación: test de conciliación y script de solo lectura que compara, en todos los centros, la semana que contiene el fin de mes contra `resumenConCuadroVivo`.
- **Higiene de datos** (grupos sin fecha de inicio, retiros sin fecha): los números semanales heredan esos huecos; el detalle de cada estadística muestra cuántos registros se excluyeron y por qué.
- **Migraciones en Neon de producción:** las aplica Fernando con los scripts `--apply` antes del deploy de cada fase que las necesite (F2, F3, F4).
