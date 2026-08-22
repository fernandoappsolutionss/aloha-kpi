export const MAX_CLEANUP_ATTEMPTS = 5
export const CLEANUP_BATCH = 20
export const UPLOAD_STALE_MINUTES = 60
export const RECONCILE_PAGE_SIZE = 250
export const RECONCILE_MAX_PAGES = 3
const DELAYS_MS = [5 * 60000, 30 * 60000, 2 * 3600000, 12 * 3600000, 24 * 3600000]

export function retryAt(now, attempts) {
  const index = Math.min(Math.max(1, Number(attempts) || 1), DELAYS_MS.length) - 1
  return new Date(new Date(now).getTime() + DELAYS_MS[index])
}

export function createPeticionCleanupService({ repo, blob, now = () => new Date(), uuid = () => crypto.randomUUID() }) {
  return {
    async run({ budgetMs = 240000 } = {}) {
      blob.assertConfigured()
      const started = Date.now()
      const current = now()
      const expiredDrafts = await repo.expireDrafts(current)
      const lockToken = uuid()
      const rows = await repo.claimCleanup({
        lockToken, limit: CLEANUP_BATCH,
        lockBefore: new Date(current.getTime() - 5 * 60000), maxAttempts: MAX_CLEANUP_ATTEMPTS,
      })
      let processed = 0
      let skippedActive = 0
      let failed = 0
      const settled = new Set()
      try {
        for (const row of rows) {
          if (Date.now() - started >= budgetMs) break
          try {
            if (await repo.isBlobPathActive(row.blob_pathname)) {
              await repo.completeCleanup(row, { note: 'active_reference' })
              settled.add(row.id)
              skippedActive++
              continue
            }
            await blob.delete(row.blob_pathname)
            await repo.completeCleanup(row)
            settled.add(row.id)
            processed++
          } catch (error) {
            await repo.failCleanup(row, { error: String(error?.message || error), retryAt: retryAt(current, row.intentos + 1) })
            settled.add(row.id)
            failed++
          }
        }
      } finally {
        const remaining = rows.filter((row) => !settled.has(row.id))
        if (remaining.length) await repo.releaseCleanup(remaining, { lockToken })
      }

      let reconciled = 0
      if (Date.now() - started < budgetMs) {
        reconciled += await repo.reconcileStaleAttempts(current, {
          staleMinutes: UPLOAD_STALE_MINUTES,
          limit: 100,
        })
      }
      if (Date.now() - started < budgetMs) {
        let cursor = await repo.getReconcileCursor('peticiones')
        for (let pageNumber = 0; pageNumber < RECONCILE_MAX_PAGES; pageNumber++) {
          if (Date.now() - started >= budgetMs) break
          const page = await blob.listPage({ prefix: 'peticiones/', cursor, limit: RECONCILE_PAGE_SIZE })
          const nextCursor = page.hasMore ? page.cursor : null
          reconciled += await repo.reconcileBlobPage(current, {
            checkpoint: 'peticiones', listedBlobs: page.blobs,
            staleMinutes: UPLOAD_STALE_MINUTES, expectedCursor: cursor, nextCursor,
          })
          cursor = nextCursor
          if (!page.hasMore) break
        }
      }
      return { expiredDrafts, reconciled, processed, skippedActive, failed, pending: await repo.countPendingCleanup() }
    },
  }
}
