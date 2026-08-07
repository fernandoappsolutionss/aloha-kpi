'use server'

import { requireCentroAccess } from '../../lib/auth'
import { calculateCentroGrowth } from '../../lib/growth/server'

export async function getCentroGrowth(centroId, options = {}) {
  await requireCentroAccess(centroId)
  return calculateCentroGrowth(centroId, { persist: options?.persist !== false })
}
