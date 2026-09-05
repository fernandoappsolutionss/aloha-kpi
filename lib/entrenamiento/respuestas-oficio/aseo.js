// SOLO SERVIDOR. Índices correctos (0-based) del cuestionario de cada módulo
// del curso "aseo", en el orden de su `quiz`. Nunca lo importa un componente
// cliente.
//
// SEIS DE LOS SIETE MÓDULOS NO TIENEN CUESTIONARIO, y por eso su clave es `[]`.
// No es un hueco: el personal de apoyo y aseo NO recibe cuenta en el sistema
// (decisión de Fernando), así que nadie puede responder nada en pantalla —
// of-ase-1 … of-ase-6 son hojas imprimibles que se firman en tinta y van al
// file del colaborador. El array vacío existe para que
// Object.keys(RESPUESTAS_OFICIO) siga cuadrando módulo por módulo con el
// catálogo, que es lo que blinda test/entrenamiento-oficio.test.mjs.
//
// El único con cuestionario es of-ase-0, que sí es de pantalla y es de la
// ASISTENTE: le enseña a entregar el paquete, a tomarlo y a archivarlo.
//
// El curso `aseo` no tiene banco GIFT propio en docs/entrenamiento/fuente/: las
// seis preguntas de of-ase-0 se redactaron desde
// plataformas/aloha/training-moodle/curso-6-apoyo-aseo.html y desde el Manual
// de Operaciones (§2.6 y §3), y sus opciones se colocaron con la misma regla
// determinista del resto del oficio,
//   pos = fnv1a32(idDePregunta) % numeroDeOpciones
// con los ids AS-01 … AS-06. Las Verdadero/Falso conservan el orden
// Verdadero (0), Falso (1).
//
// Antidegeneración comprobada: con 6 preguntas el mínimo para aprobar es 5, y
// el índice que más se repite en la clave aparece 3 veces. Marcar siempre la
// misma opción no aprueba.
export const RESPUESTAS_ASEO = {
  'of-ase-0': [2, 0, 3, 1, 1, 1],
  'of-ase-1': [],
  'of-ase-2': [],
  'of-ase-3': [],
  'of-ase-4': [],
  'of-ase-5': [],
  'of-ase-6': [],
}
