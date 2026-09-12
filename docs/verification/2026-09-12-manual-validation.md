# Validación del entrenamiento actualizado — 12 de septiembre de 2026

## Resultado

Actualización implementada con GPT‑5.5 xhigh tras auditar el manual completo y sus seis imágenes. Se corrigieron ciclos educativos, Kinder, referencias de precio y mantenimiento, tabla de puntos y encuesta de cierre. Se incorporaron tres módulos Online con 26 preguntas y 20 enlaces oficiales únicos.

La base es `542907f`, PR #142. Se conserva íntegramente su regla mensual del 30% y su protección de campañas e históricos. Esta actualización no cambia aquella lógica, sus migraciones ni sus funciones de anulación.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| `npm test` | 1.150 pruebas aprobadas, 0 fallos, 0 omitidas |
| `npm run build` | Correcto, sin configuración de base productiva |
| `git diff --check` | Correcto |
| Identidad y asignación de módulos existentes | Los 70 IDs, roles, cursos, órdenes y prerrequisitos originales se conservan |
| Suplemento Online | Solo 3 IDs nuevos: `of-coa-12`, `of-coa-13`, `of-coa-14`; total 73 módulos, 67 digitales y 6 hojas |
| Revisión semántica independiente | Ciclos, mantenimiento, precio y claves de respuesta contrastados con manual; los hallazgos Online se corrigieron |
| Chromium local con administradora ficticia en modo revisión | Los tres módulos responden 200 y estado ready; cero errores de página |
| Escritorio 1440 px y móvil 390 px | Sin desbordamiento horizontal; recursos visibles y legibles |
| Enlaces Online | 20 URLs únicas idénticas al manual, 21 apariciones por reutilización de una presentación; nueva pestaña con `noopener noreferrer` |

La prueba de navegador se hizo contra datos ficticios en PostgreSQL local. No se completaron lecciones ni cuestionarios por usuarios reales, ni se enviaron mensajes o respuestas de encuestas.

## Audio

Fernando autorizó expresamente enviar los guiones internos pendientes a ElevenLabs y consumir su cupo. Se generaron **22 clips**: seis presentaciones, once guías y cinco actualizaciones de encuestas. Texto enviado: **12.941 caracteres**. Duración final: **856,91 segundos**, aproximadamente 14 minutos y 17 segundos; tamaño total: 6.867.818 bytes.

- Misma voz y receta aprobadas; sin regenerar el catálogo completo.
- Los 22 archivos se decodificaron correctamente con FFmpeg y sus duraciones se midieron con FFprobe.
- Hash de guion y entrada de manifest comprobados para cada clip generado.
- 380 de los 385 MP3 previamente existentes permanecen idénticos. Los cinco reemplazos físicos corresponden exactamente a guiones modificados; se añadieron otros 17 archivos.
- No faltan archivos referenciados por los manifests activos.
- Generador oficio/guía en seco: cero pendientes. Actualizaciones: 60 reutilizables, cero pendientes y cero caracteres nuevos.
- Los cinco audios deshabilitados por enseñar el umbral anterior vuelven a estar activos con el contenido correcto.

## Tres decisiones pendientes

La rama no resuelve por su cuenta las contradicciones del manual:

1. Reforzamientos: después de semana 2 para ambos itinerarios frente Kids después de 3 y Tiny después de 4.
2. Tiendita: una por nivel en el segundo Mental Day frente dos canjes por nivel. Se añadió aviso de la contradicción recuperada, conservando la regla preexistente.
3. Primer Mental Day: después de 5, o de 4 en nivel 1, frente después de 6.

Una revisión independiente adicional comprobó que las reglas y respuestas previas de esos conflictos no se sustituyeron arbitrariamente. Online no añade reglas sobre ellos. Los documentos de Drive se enlazan como recursos; su contenido externo no se ha auditado.

## Entrega

PR en borrador sobre la rama de #142 para aislar esta diferencia de contenido. Pendiente resolver las tres decisiones y autorizar una publicación coordinada. No se ha hecho merge, despliegue productivo ni aplicado DDL desde esta tarea.
