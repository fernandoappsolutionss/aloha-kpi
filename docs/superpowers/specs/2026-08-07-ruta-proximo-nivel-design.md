# Ruta al Proximo Nivel

## Objetivo

Convertir el historial del centro en un sistema de gestion que explique como
crecer, cuanto falta para el siguiente nivel y que acciones debe ejecutar la
administradora esta semana. El sistema debe separar con claridad ventas,
inicios de clase, retiros y capacidad.

## Regla oficial de nivel

El nivel oficial se determina exclusivamente por los ninos activos al cierre
del trimestre, usando los umbrales vigentes:

- Nivel 1: 170 ninos.
- Nivel 2: 200 ninos.
- Nivel 3: 230 ninos.
- Nivel 4: 325 ninos.
- Nivel 5: 410 ninos.

La desercion, el embudo comercial y la capacidad no cambian el nivel oficial.
Son impulsores de la proyeccion, el riesgo y las recomendaciones.

## Fuentes de datos

- `resumen_mes`: ninos, nuevos activos, grupos, embudo, origenes y motivos.
- `kpi_semanas`: ventas y retiros declarados por semana.
- `estudiantes`, `estudiante_eventos` y `grupos`: poblacion operativa, bajas
  potenciales, reincorporaciones y fechas de inicio de clases.
- `cumplimiento`: controles operativos del manual ALOHA.
- `metas`: objetivos comerciales, de desercion y promedio por grupo.

Los meses cerrados son inmutables. El mes abierto puede usar el calculo vivo
del Cuadro de Negocio.

## Indicadores

1. Brecha al siguiente nivel: umbral menos ninos actuales.
2. Crecimiento neto: nuevos activos + reincorporados - retiros.
3. Pipeline de inicio: ninos vendidos que aun no comienzan clases.
4. Embudo de prueba: invitados, asistencia y matricula.
5. Captacion controlable: referido + centro + activaciones, en cantidad y %.
6. Desercion real: retiros sin graduados.
7. Desercion controlable: perdida de clases + tecnica + horario.
8. Ocupacion y capacidad: promedio por grupo, cupos y aperturas programadas.
9. Velocidad al nivel: crecimiento mensual esperado y trimestre probable.
10. Confianza: alta, media o baja segun cobertura y estabilidad de datos.

El porcentaje de captacion controlable nunca se muestra solo: tambien se
muestra la cantidad absoluta para evitar mejoras falsas por caida de Marketing.

## Motor de proyeccion

La proyeccion inmediata conserva la formula operativa existente:

```text
proximo mes = cierre actual - bajas anunciadas + inicios programados
```

Para meses posteriores, el motor simula mes a mes:

```text
ventas prueba = invitaciones planificadas * tasa asistencia * tasa matricula
ventas no prueba = mediana(max(ventas - matriculados prueba, 0), 6 meses)
nuevos activos = pipeline con fecha de inicio + conversion historica de ventas
retiros = mediana de desercion real de los ultimos 6 meses
ninos final = inicio + nuevos activos + reincorporados - retiros
```

La primera version no usa aprendizaje automatico. Usa reglas auditables y
estadistica robusta porque la base contiene pocos centros y datos mensuales.

### Escenarios

- Conservador: percentil bajo de incorporaciones y alto de retiros.
- Ritmo actual: mediana movil de seis meses.
- Plan de accion: mejora explicita del embudo o de la desercion, limitada por
  capacidad, fechas de inicio y maximos historicos razonables.

Cada escenario devuelve el mes estimado de alcanzar el umbral y el primer
cierre trimestral que podria reconocer el nivel. Si el crecimiento es cero o
negativo, devuelve `sin fecha` y la mejora mensual necesaria.

### Confianza

- Alta: al menos 6 meses cerrados, 90% de campos completos y pipeline fechado.
- Media: 3 a 5 meses utiles o falta parcial de fechas operativas.
- Baja: menos de 3 meses, datos inconsistentes o campos clave ausentes.

Una proyeccion de confianza baja no muestra una fecha puntual.

## Motor de recomendaciones

El motor genera candidatos, estima impacto, aplica reglas del manual y publica
solo las tres acciones de mayor prioridad.

```text
prioridad = impacto estimado en ninos * confianza / esfuerzo
```

Categorias:

- Invitaciones: volumen semanal requerido para la meta de ventas.
- Asistencia: confirmacion y recuperacion de ausentes de clase de prueba.
- Matricula: seguimiento del mismo dia y grupo con fecha concreta de inicio.
- Referidos: pedir recomendacion tras un avance o encuesta positiva.
- Activaciones: alianzas, demostraciones y eventos de la zona.
- Centro: recepcion, QR, brochure, saludo y clase de padres.
- Perdida de clases: alerta de ausencia y contacto preventivo con la familia.
- Tecnica: observacion, certificacion y seguimiento Study/ClassDojo.
- Horario: traslado a un grupo compatible antes de aceptar el retiro.
- Capacidad: llenar, fusionar o abrir grupos segun ocupacion y reglas manuales.
- Calidad de datos: completar fechas o indicadores antes de proyectar.

Cada recomendacion explica el dato que la origino, la meta, el impacto
estimado, el responsable, la fecha objetivo y el estado.

## Experiencia del centro

### Resumen

Una banda `Ruta al Nivel N` muestra:

- ninos actuales, umbral y brecha;
- rango estimado y confianza;
- avance del trimestre;
- principal palanca;
- acceso al plan completo.

### Ruta de Nivel

Nueva pagina del centro con:

- trayectoria y tres escenarios;
- embudo y captacion controlable;
- desercion por causa;
- pipeline y capacidad;
- tres acciones activas y su historial.

### Briefing semanal

Se muestra como modal en el primer ingreso de la semana o ante un cambio
material: nivel alcanzado, proyeccion movida un mes, riesgo nuevo o dato
critico ausente. Nunca aparece mas de una vez por usuario y semana.

Acciones del modal: `Ver plan`, `Entendido` y `Recordar manana`. El estado se
guarda en servidor para funcionar entre dispositivos.

## Experiencia administrativa

El panel general incorpora `Crecimiento` con una fila por centro:

- nivel, brecha y trimestre estimado;
- confianza y tendencia;
- accion principal y estado;
- captacion/desercion controlable;
- error historico de la proyeccion.

El administrador general puede comparar centros, pero las recomendaciones se
calibran con la historia de cada centro y no con una meta unica de conversion.

## Persistencia

Se agregan tres tablas:

- `growth_snapshots`: resultado auditable del motor por centro y fecha.
- `growth_recommendations`: acciones, objetivo, impacto, estado y vigencia.
- `growth_notification_receipts`: mostrado, pospuesto y confirmado por usuario.

La primera version calcula desde agregados existentes. Una fase posterior puede
agregar `origen_comercial` por estudiante y vinculo con la clase de prueba para
mejorar atribucion sin reinterpretar meses cerrados.

## Calibracion y seguridad

- Backtesting con ventana movil: usar meses previos para predecir 1 y 3 meses.
- Comparar contra el baseline `repetir el ultimo mes`.
- Medir error absoluto, sesgo y cobertura del rango.
- No promover un ajuste que empeore el baseline.
- No duplicar matriculados de prueba y ventas directas.
- No contar una venta como activo antes de la fecha de inicio de clases.
- No modificar historicos cerrados.

## Criterios de aceptacion

- La proyeccion del mes siguiente reconcilia con Resumen y Cuadro de Negocio.
- Los tres escenarios respetan capacidad y nunca generan ninos negativos.
- Una recomendacion siempre incluye razon, meta e impacto estimado.
- La administradora puede completar, descartar o posponer una accion.
- El briefing respeta el limite semanal y su estado persiste.
- El panel administrativo puede auditar la formula y el error historico.
- Pruebas, build y verificacion visual pasan en claro/oscuro y movil/escritorio.
