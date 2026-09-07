# Carteles ALOHA para recepción

Los botones descargan un PDF de una sola hoja, en Carta (612 × 792 pt) o A4 (595,28 × 841,89 pt), con el nombre del centro, logo oficial, tipografía Futura y llamado a la acción.

- **Encuesta:** en Encuestas y en el panel mensual de Cumplimiento, «Descargar cartel PDF con QR» sustituye el PNG. Incluye centro, mes y enlace general de la campaña vigente. La primera descarga mantiene el corte de activos existente; la acción se registra como `qr` solo después de preparar el archivo. La meta continúa siendo difusión registrada y más del 50% de respuestas. Un mes cerrado no permite descargar; el cartel indica su vigencia mensual.
- **Google:** junto a «Cartel QR para Google», «Preparar cartel PDF» pide el enlace de reseñas o de su ficha en Maps. Valida HTTPS y los dominios/rutas de Google, permite comprobar el destino y lo recuerda exclusivamente en el navegador para ese centro. No se inventa una ficha ni se resuelve por nombre. «Cuente su experiencia en Google» invita a opinar libremente.
- **WiFi:** junto a «Mensaje WIFI Gratis», descarga directamente un aviso para pedir red y clave en recepción. La opción de incluir la red de invitados añade SSID, clave y QR estándar WPA/WPA2 o red abierta. Los caracteres del SSID se conservan y los delimitadores se escapan. La clave solo vive en el formulario y el archivo generado; no se persiste ni se envía al servidor.

Descargar Google o WiFi no marca Sí: el centro debe imprimir, colocar y comprobar el material. Los formularios no modifican datos de negocio, no necesitan migración y no envían mensajes.

## Diseño y fuentes

Material facilitado por Fernando: [Manual de marca en Drive](https://drive.google.com/drive/folders/1S5_ah2js1BOAK4LyxZatodFFh0LYwopH).

- [Logo original PNG](https://drive.google.com/file/d/1KJ9_p-ovn4jvobGGoW80yAIGirJv4cpb/view): incorporado intacto a `public/carteles/logo-oficial.png`.
- [Manual de uso del logo](https://drive.google.com/file/d/1Nw4XmYcaThiXsacaYm_5O_Wu8rnikKkx/view) y [colores](https://drive.google.com/file/d/1uHhLlxkwQAK73Ac_XmMDnSamkKfiIknh/view). El manual presenta equivalencias hex inconsistentes en algunos colores; se usan sus RGB explícitos: azul 26/60/106, lima 187/229/41 y verde 0/79/0.
- [Tipografía institucional](https://drive.google.com/file/d/1MKbzgMnDp-PMggqS6Fxtzp62VjzpflaT/view): Futura Md BT. Las fuentes existentes coinciden byte a byte con los archivos Normal y Bold de Drive; se reutilizan.
- QR negro vectorial sobre blanco, margen de cuatro módulos, corrección M. Sin logo sobre el código ni dependencia de servicios de QR externos. Los PDF se generan localmente con `pdf-lib` y se descargan como `application/pdf`.

Las instrucciones escritas del recorrido de Encuestas y las ayudas de Google/WiFi están actualizadas. Se conservan las 47 grabaciones vigentes; los tres guiones adicionales están en `carteles-audios-propuestos.md`, pendientes de autorización por el bloqueo de revisión automática.

## Verificación

1. `npm test`: 1.067 pruebas, incluyendo validación de destinos, SSID/contraseñas, bloqueo de enlace individual público y dimensiones de PDF.
2. `npm run build`: compilación de producción.
3. Chromium local: cuatro descargas (encuesta, Google, WiFi recepción y WiFi con QR), difusión solo en encuesta, dominio inválido bloqueado, separación por centro, mes cerrado, fallo de assets sin registrar difusión y vista 1440/390 sin overflow.
4. PDFs renderizados e inspeccionados; lector Vision de macOS decodificó seis QR de Carta/A4 al destino exacto. La encuesta de muestra usa el enlace proporcionado por Fernando. Google y la red WiFi de prueba son ejemplos y no deben colocarse como carteles reales.
5. Sin cambios ni campañas/respuestas ficticias en producción. El arnés de UI usa los componentes reales con datos simulados y está fuera del producto.
