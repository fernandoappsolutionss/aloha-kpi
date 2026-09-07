import { sql, withTransaction } from '../db'
import { crearServicioEncuestas } from './service.mjs'
export const encuestas = crearServicioEncuestas({ query:sql, transaction:work => withTransaction(work,{isolationLevel:'ReadCommitted'}) })
