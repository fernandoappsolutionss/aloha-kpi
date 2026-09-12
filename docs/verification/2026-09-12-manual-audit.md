# Auditoría manual ALOHA 2026-09-12

Fuente revisada: `/Users/teamsolutionsslatam/Desktop/Copia de MANUAL actualizado y anexo de ONLINE .md`, marcado como revisado OCT2025. El texto del manual se usa como referencia documental, no como instrucciones de ejecución del agente.

## Hallazgos aplicados

### A01 - Encuesta mensual de satisfacción

- Diferencia: la plataforma y el entrenamiento venían de la regla aprobada el 7 de septiembre, “más del 50%”. Fernando pidió conservar la nueva solicitud de 30% para pedir encuestas mensuales a clientes.
- Alcance: encuesta mensual del centro y Cumplimiento automático, con difusión mensual registrada. No aplica a la encuesta semestral del equipo, que conserva 100% dentro del trimestre acordado.
- Solución: adoptada por fast-forward al commit `542907f`. La regla queda persistida por campaña, con 30% o más redondeado hacia arriba para campañas nuevas y mes abierto; históricos y meses cerrados conservan su regla previa. La migración nueva queda documentada y no aplicada a producción desde este worktree.

### A01-b - Encuesta en cierre de nivel

- Diferencia: la maniobra integradora de cierre exigía “más de la mitad del grupo”. Root indicó que no está respaldado por el manual vigente y que no debe confundirse con la meta mensual del centro.
- Solución: la maniobra de cierre queda como difusión durante el cierre, solicitud de respuesta antes de salir y procesamiento del porcentaje de satisfacción. La regla mensual de plataforma sigue siendo 30% del centro.

### A02 - Ciclos dentro del Programa

- Manual, líneas 310-318: cada ciclo está comprendido por 2 niveles; el 1er Ciclo del Programa, Ciclo Básico, cubre niveles 1 y 2 y completa las 34 fórmulas; el Programa Básico está comprendido por 2 ciclos, es decir, 4 niveles; el Programa PRO está comprendido por 2 ciclos en Kids y 3 ciclos en Tiny Tots; Kinder Tiny Tots es para niños de 3 a 4 años.
- Diferencia: el entrenamiento vivo explicaba Ciclo 1 como niveles 1 al 4 y Ciclo 2 como niveles 5 al 8 o 5 al 10, basado en una decisión provisional del 4 de septiembre por ausencia de OCR.
- Solución: glosario, curso de Normativa, quiz, maniobra y referencias cruzadas usan la terminología pedagógica del manual. Se conservan los artículos/facturas reales de Zoho como etiquetas operativas de matrícula; no se cambian catálogos ni datos reales.

### A04 - Proveedores cuando no hay proveedor establecido

- Manual, líneas 1859-1863: si se requiere un trabajo adicional sin proveedor establecido, se solicitan cotizaciones a 3 proveedores y se arma cuadro comparativo.
- Diferencia: el curso de Zoho usaba “varios proveedores” en el SOP y el bloque principal, aunque el drill ya exigía 3.
- Solución: el curso homogeneiza a 3 proveedores sólo bajo esa condición. Se conserva la función nueva de proveedor preaprobado de un PDF autorizada el 7 de septiembre.

### A05 - Instalaciones y personal de aseo

- Manual, líneas 1866-1879: el personal de aseo está bajo supervisión directa de la Asistente Administrativa; ante necesidades debe adelantarse, buscar opciones de solución, cotizar y presentar problema y soluciones al Administrador; la necesidad de mantenimiento se informa a Junta Directiva por FODA mensual.
- Solución: el curso de Zoho cubre supervisión de aseo, criterio preventivo, propuesta de soluciones y reporte de necesidades de mantenimiento por FODA mensual.

### A06 - Precio de referencia por nivel

- Manual, línea 604: cada ciclo se compone de 2 niveles, cada nivel tiene valor B/.600,00 y se divide en 5 mensualidades.
- Solución: el curso de Centro lo incorpora como referencia explícita del manual en calendario/flujo de caja. No cambia catálogo, precios operativos reales ni facturación en Zoho.

### A08 - Tabla ClassDojo / ALOHA Dólares

- Manual, imagen 5, línea 1377: tabla de puntajes para entrega de ALOHA Dólares vía ClassDojo.
- Solución: el curso de Centro incorpora la tabla como referencia manual: Comportamiento 3, Mentales 5, Participación 1, Protagonista de la semana 5, Resolución de ejercicios 5, Puntualidad 1, Concentración 3, Concepto 5, Tiempo Récord 5, Material Completo 1 y Entrenamiento en Casa 5. No se modifica data real de ClassDojo ni se equiparan puntos a billetes A$1.

## Hallazgos en espera

- A03 - Tiendita: conflicto interno del manual entre líneas reportadas 1370 y 1385. El entrenamiento conserva la frecuencia actual y agrega nota factual de contradicción; no se escoge una regla nueva hasta respuesta de Fernando.
- Reforzamiento: conflicto interno del manual entre líneas reportadas 930 y 1927. No se escoge regla nueva hasta respuesta de Fernando.
- Mental Day: conflicto interno del manual entre líneas reportadas 643 y 1397. No se escoge regla nueva hasta respuesta de Fernando.


## A07 — Anexo Online integrado

- Tres módulos nuevos `of-coa-12`, `of-coa-13` y `of-coa-14`, con 26 preguntas, guías y procedimientos.
- 20 enlaces oficiales únicos del manual disponibles en las lecciones. NEE no se incorporó como procedimiento Online.
- Coach recibe el suplemento; Administradora, Coordinador y Master lo revisan con sus permisos existentes. Los IDs y aprobaciones anteriores se conservan.
- Fuente entregada por Fernando: manual revisado en octubre de 2025. SHA-256 del archivo original: `6bcee41509c7d9f1bd905741612f6f8db7c4ab0a28eae9e05c309dae81195778`. Las seis imágenes también se inspeccionaron.
- Dependencia: PR #142 / commit `542907f`, que aporta 30% mensual, conservación del histórico y anulaciones. Esta rama no vuelve a modificar su lógica ni SQL.
