export function sanitizeGrowthPayload(value) {
  if (value == null) return value ?? null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') {
    const number = Number(value)
    return Number.isSafeInteger(number) ? number : String(value)
  }
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') return null
  if (Array.isArray(value)) return value.map(sanitizeGrowthPayload)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, sanitizeGrowthPayload(nested)]),
    )
  }
  return value
}
