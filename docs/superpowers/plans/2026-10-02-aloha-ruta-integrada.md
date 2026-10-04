# Ruta de Nivel como plan de batalla integrado

## Goal / Spec
Cerrar y publicar las brechas de la auditoría de Fernando: Ruta reúne producto, compromiso mensual, cinco gráficas/cuotas, condición/fórmula y objetivos verificables. Conservar permisos, fórmulas oficiales, datos y firmas. Fuente funcional: petición de Fernando y `outputs/aloha-apoyo-carmen-20261002/verificacion-metodo-hca.md` en Hermes.

## Global Constraints
- Reutilizar PlanSemana, CuotasSemana y TarjetaEstadistica. No duplicar objetivos ni cuotas.
- Un compromiso mensual por centro: cinco metas, diagnóstico y fecha de actualización. El mes de gestión agrupa los cierres de jueves del mes (explicado al usuario), no sustituye el KPI mensual ni primas. Saldos al último jueves; flujos acumulados de esos cierres. El reparto usa resultados cerrados reales y cierres pendientes; faltantes bloquean sugerencias, no se convierten en cero. Guardar compromiso no aprueba cuotas ni modifica cuotas guardadas.
- Administradora/Master/coordinación según permisos vigentes; coach conserva acceso a formación, sin abrir Semana del centro. Coordinación verifica resultados y aprueba cuotas.
- Objetivos nuevos requieren responsable, fecha civil válida y evidencia esperada. Realizar exige resultado/evidencia. Verificar exige coordinación. Históricos incompletos se muestran pendientes, nunca se inventan datos.
- Lectura automática solo gerencia/coordinación, nunca administradora/asistente. Condición humana con fundamento y fórmula canónica, sin generar sanciones.
- Migración aditiva, QA en base ficticia antes de aplicar producción. Publicación ya autorizada; no completar aprendizaje, condiciones ni cuotas productivas por empleados.

## Task 1: Motor, datos y consistencia
**Interfaces:** produce compromiso mensual / propuestas por estadística y validación de objetivos; Task2 los consume. Usa la misma fuente de recomendaciones vigentes que Ruta.
1. Escribir pruebas de reparto para saldos/flujo/inversa, cambio de mes, datos faltantes, cuota guardada; validaciones/evidencias/estados y recomendación que desaparece dentro de la semana. Ejecutar RED.
2. Migración, funciones puras, servicios y actions autorizadas; corregir persistencia de recomendaciones obsoletas sin borrar historial. GREEN.
3. Ejecutar suite y prueba SQL local. Commit.
**Completion:** ninguna escritura sin acceso/validación; reparto explicable; historial intacto; regresión reproducida y resuelta.

## Task 2: Ruta integrada y formación coherente
**Interfaces:** consume Task1; reutiliza paneles de Semana; refresca Ruta/Plan juntos tras decisiones. Produce recorrido de principio a fin para Task3.
1. Reutilizar cinco gráficas, Plan y Cuotas en Ruta. Compromiso mensual y guía de pensamiento, links a formación/puesto; estados preparado/realizado/verificado y evidencias.
2. Actualizar guía visible del entrenamiento sin invalidar firmas ni fórmulas/audios históricos; explicar cierre semanal vs mes natural. Prueba de acceso/navegación y contrato de campos.
3. Comprobar local con distintos roles, datos ficticios, persistencia y móvil. Suite y build. Commit.
**Completion:** desde Ruta se puede preparar el ciclo completo sin ir a una pantalla separada; error de carga/guardado explícito y sin perder borradores.

## Task 3: Revisión, publicación y comprobación
**Interfaces:** toma Task1/2 verdes; migra solo esquema y publica código.
1. Revisión independiente de diff completo; corregir hallazgos importantes con regresión RED/GREEN.
2. Graphify update; suite completa, build, QA final. Preflight migración productiva aditiva, aplicación y postflight sin alterar hechos.
3. Push, PR, adjuntar, merge, confirmar SHA/alias READY. Navegador autenticado producción: Ruta integra compromiso/semana/condición/evidencia/formación sin crear datos ficticios. Informe y memoria.
**Completion:** publicado y verificado; distinguir capacidades listas de ejecución pendiente por personas.

## Review Focus
Datos faltantes y últimos cierres del mes; límites PA/VE; saldos frente a flujos; metas inversas; permisos del servidor; modificaciones posteriores invalidan verificación; resultados concurrentes; recomendaciones retiradas de la misma semana y pospuestas; guardado con recarga fallida; cuotas aprobadas conservadas; no duplicar datos ni firmas.
