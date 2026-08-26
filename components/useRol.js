'use client'
import { useState, useEffect } from 'react'

// El rol de la sesión, para esconder botones que el servidor va a rechazar.
// El permiso real lo decide el servidor (lib/current-user.mjs); esto es solo
// para no ofrecer una acción que terminará en error.
export function useRol() {
  const [rol, setRol] = useState('')
  useEffect(() => { try { setRol(localStorage.getItem('aloha_rol') || '') } catch { /* SSR */ } }, [])
  return rol
}

export function useEsAsistente() {
  return useRol() === 'asistente'
}

// Quien tiene panel propio en /dashboard: gerencia y coordinador operativo.
// Dentro de /centro/* solo decide si se muestra "Volver al panel".
export function tienePanel(rol) {
  return rol === 'admin_general' || rol === 'supervisor' || rol === 'coordinador'
}

export const ETIQUETA_ROL = {
  admin_general: 'Administrador General',
  supervisor: 'Supervisor',
  coordinador: 'Coordinador Operativo',
  administradora: 'Administrador de Centro',
  asistente: 'Asistente de Centro',
}
