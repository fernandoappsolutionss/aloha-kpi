# Ruta de Nivel: resultados automáticos y plan único

Se elimina la sección de escenarios de crecimiento de la Ruta. Los cinco resultados del mes calendario se calculan desde las fuentes existentes, sin campos de captura. Las cinco gráficas semanales permanecen. Metas mensuales y cuotas se conservan como edición opcional dentro del plan de batalla. Prioridades, resultados por verificar e historial se muestran una sola vez dentro del mismo plan.

## Datos

La vista consulta datos actuales al abrirse. La semana abierta se recalcula; los cierres con valor, incluido cero, se conservan. Los cierres de población sin cifra se reconstruyen para lectura con el saldo mensual previo y los movimientos fechados, sin guardar ni sobrescribir el histórico. Si falta un mes intermedio, se usa el último saldo registrado y se identifica el resultado provisional. Si no existe base o falla una fuente, no se inventa cero.

Las fuentes compartidas y las clases del CRM se cargan una vez por petición para las vistas semanal y mensual. Las fechas respetan la zona del centro y el corte de hoy; inicios posteriores y clases futuras quedan fuera. Las cuotas siguen usando los jueves del mes, expresamente separados del mes calendario de los resultados.

## Validación

- Suite completa: 1.415 pruebas correctas antes de las dos regresiones adicionales; ambas también correctas.
- Diez regresiones nuevas: ancla previa, mes intermedio, saldo cero, cambio de año, calendario, fechas futuras, aislamiento de fallos, fotos cerradas, carga CRM única y enlaces a desplegables.
- `node tests/semana-audit/ruta-automatica-ui.mjs`: 16 controles, componentes reales y acciones simuladas, sin datos de producción. Verifica edición opcional, borradores conservados, prioridades únicas, guardado seguido de fallo de recarga, enlaces y anchos 320/390/1440. Capturas en `.scratch/ruta-automatica/`.
- Consulta productiva de solo lectura, 15-oct: centro 10 con saldo previo 95; activos calculados 96 al 1-oct, 96 al 8-oct y 100 al 15-oct. No se escribieron datos productivos.
- El paso del recorrido que apuntaba a escenarios ahora apunta a resultados automáticos. Su locución antigua está desactivada con el mecanismo existente; no se generó audio ni se consumieron créditos.

No se realizaron migraciones, reparaciones de datos, aprobaciones de cuotas ni cambios de reconocimiento. La lectura formal de condición y el ranking conservan sus fotos oficiales; una cifra reconstruida en la vista no sustituye la conciliación histórica.

Navegador: pestañas/grupos propios cerrados y comprobados. Servidor de QA detenido. Chrome personal no fue utilizado.
