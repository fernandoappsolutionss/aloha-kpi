// Cliente servidor-a-servidor para el CRM de Team Solutionss.
// Llama al endpoint /api/integrations/aloha del CRM con el token de servicio.
// Server-only (usa fetch con el token); nunca exponer el token al cliente.

// Mapeo centro (ALOHA KPI) → cuenta del CRM.
const CENTRO_ACCOUNT = {
  1:  'c0c81438-bb54-4ae0-a019-b54e0bfcf870', // Brisas del Golf  → ALOHA Panamá
  2:  'c0c81438-bb54-4ae0-a019-b54e0bfcf870', // Anclas Mall      → ALOHA Panamá
  3:  'c0c81438-bb54-4ae0-a019-b54e0bfcf870', // Calle 50         → ALOHA Panamá
  5:  'c0c81438-bb54-4ae0-a019-b54e0bfcf870', // David            → ALOHA Panamá
  6:  'c0c81438-bb54-4ae0-a019-b54e0bfcf870', // Condado del Rey  → ALOHA Panamá
  10: '75000259-9e63-4feb-a731-9e6d972f5356', // Los Naranjos     → ALOHA Venezuela
}

export function crmAccountForCentro(centroId) {
  return CENTRO_ACCOUNT[Number(centroId)] || null
}

export function crmConfigured() {
  return Boolean(process.env.CRM_API_URL && process.env.CRM_SERVICE_TOKEN)
}

export function crmBaseUrl() {
  return (process.env.CRM_API_URL || '').replace(/\/$/, '')
}

// Llamada genérica al endpoint de integración del CRM. Siempre con timeout:
// un CRM colgado (socket que acepta y no responde) no puede dejar una server
// action esperando el headersTimeout de undici (~5 min). Los pushes best-effort
// (cupos) pasan un timeoutMs más corto para acotar el peor caso en serie.
export async function crmCall(action, payload = {}, { timeoutMs = 15000 } = {}) {
  const base = crmBaseUrl()
  const token = process.env.CRM_SERVICE_TOKEN
  if (!base || !token) return { error: 'CRM no configurado (faltan CRM_API_URL / CRM_SERVICE_TOKEN).' }
  try {
    const res = await fetch(`${base}/api/integrations/aloha`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-service-token': token },
      body: JSON.stringify({ action, ...payload }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data?.error || `CRM respondió ${res.status}` }
    return data
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return { error: `El CRM no respondió en ${Math.round(timeoutMs / 1000)} s.` }
    return { error: e.message }
  }
}
