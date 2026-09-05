// Los puestos que se entrenan, en un solo lugar.
//
// El BLOQUE A es de TODO CARGO: método, normativa y el paquete del propio
// puesto los estudian los cuatro. El Coordinador Operativo especialmente — su
// puesto existe para vigilar que el Manual se cumpla, y no se puede auditar lo
// que no se estudió.
//
// Vive en cursos/ y no en catalogo.js porque los módulos del bloque A lo
// necesitan: catalogo.js importa cursos/todos.js, así que si la constante
// viviera allá los cursos tendrían que importar hacia arriba y el ciclo dejaría
// TODO_CARGO en zona muerta (TDZ) al evaluarse. Aquí no depende de nada.
//
// Gerencia (supervisor, admin_general) NO va en esta lista: no se entrena,
// firma. Y el personal de aseo tampoco: no recibe cuenta en el sistema, su
// paquete es el bloque C y se firma en tinta.
export const TODO_CARGO = ['administradora', 'asistente', 'coach', 'coordinador']
