# Cohortes correctas y ayuda de fechas para Carmen

## Spec y objetivo
La regla publicada en PR134 y confirmada por Fernando es: cp_matriculados cuenta negocios Ganados de clases celebradas en el mes. Ventas comerciales se agrupan por fecha de venta; pueden venir de clases anteriores. No son medidas intercambiables. Publicar esta corrección junto a la formación semanal autorizada.

## Global Constraints
- Conservar cp_matriculados canónico de clases del mes; no sustituirlo por ventas clasificadas ni exigir igualdad entre cohortes.
- Separar ventas directas/no prueba del embudo de clases. No restar matriculados de clases a ventas comerciales para inferir ventas directas.
- Reutilizar clasificación y utilidades existentes. Datos incompletos/desconocidos no equivalen a cero conocido ni deben elevar confianza artificialmente.
- No escribir datos de producción, reabrir cierres ni alterar fechas históricas con este cambio de código.
- Conservar funcionamiento del itinerario e inicio operativo de alumnos. La apertura histórica de un grupo faltante no demuestra que todos sus alumnos carezcan de inicio.
- Sin dependencias nuevas ni cambios de audio/entrenamiento. Otros trabajos escriben manifests y MP3 en este checkout: no revertir ni incluir esos cambios.

### Task 1: Corregir fuente, métricas y avisos de crecimiento

Responsabilidad: lib/growth/source.mjs, lib/growth/metrics.mjs y consumidores directamente necesarios, lib/higiene-datos.mjs y pruebas existentes relacionadas. Primero trazar todos los callers y el uso de trialFunnel, nonTrialSales, cp_enrollment_conflict. El grafo ya fue actualizado por el controlador; consultarlo antes de lectura amplia.

Leer memoria de regla PR134 en /Users/teamsolutionsslatam/Hermes-Agente IA PC/memoria/aloha-clases-prueba-kpi.md (sección final) y guía /Users/teamsolutionsslatam/Hermes-Agente IA PC/outputs/aloha-apoyo-carmen-20261002/guia-carmen.md.

1. Preservar cp_matriculados por cohorte de clases en fuente y proyección/conversión. No generar alerta de igualdad con ventas comerciales clasificadas.
2. Obtener ventas no prueba mediante clasificación comercial fiable existente. Si no hay cobertura, mantener incertidumbre explícita con mínima modificación compatible; no deducir restando cohortes distintas. Trazar motor y confianza para evitar proyección engañosa.
3. Ajustar ayuda de grupos sin apertura: distinguir registro histórico del inicio operativo individual; reutilizar alumnos realmente sin fecha. No sugerir inventar apertura o fecha del nivel actual. Conservar aviso preventivo de apertura cuando sea útil y verdadero.
4. Regresiones concretas: 11 ventas = 9 prueba + 2 directas, clase mes 6 matrículas, usar 6 conversión y 2 directas; 20 ventas = 18 prueba +2directas, 12 matrículas; matrículas de clases superiores a ventas del mes es válido; desconocidos mantienen calidad baja/no dato. Un grupo sin apertura pero alumnos con fecha efectiva no afirma que todos carecen de fecha. Validar embudo real inválido sigue alertando.
5. Ejecutar pruebas focalizadas, autoverificar, commit solo archivos propios. Informe completo con comandos/resultados, decisiones, alcance y riesgos.

### Task 2: Integrar y publicar

Controlador: generar los 37 audios autorizados con scripts existentes, conservar audios históricos, comprobar hashes/decodificación, suite completa y build; revisión de Task1 y revisión final de integración con formación ya revisada. Validar navegador y desplegar PR165. No considerar conciliados datos empresariales no confirmados. Actualizar guía con lo publicado y lo pendiente de evidencia real.
