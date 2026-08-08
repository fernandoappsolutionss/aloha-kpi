# CRM ALOHA Registration Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exponer al KPI ALOHA una lectura autenticada, completa y por lote de los registros de las clases de prueba.

**Architecture:** El endpoint servidor-a-servidor existente agrega la accion `list_registrations_by_event_ids`. Antes de consultar registros valida que todos los eventos solicitados existen y pertenecen a una cuenta ALOHA; luego devuelve solo los campos necesarios y excluye cancelados.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Supabase Admin Client, Vitest.

## Global Constraints

- Mantener un solo endpoint autenticado por `x-service-token`.
- Aceptar como maximo 500 IDs unicos por llamada.
- Rechazar el lote completo si falta un evento o pertenece a una cuenta no permitida.
- Excluir `attendance_status = cancelled`.
- No cambiar las acciones existentes del endpoint.

---

### Task 1: Contract test for the batch action

**Files:**
- Create: `app/api/integrations/aloha/route.test.ts`
- Test: `app/api/integrations/aloha/route.test.ts`

**Interfaces:**
- Consumes: `POST(request: Request): Promise<Response>` from `route.ts`.
- Produces: verified JSON contract `{ registrations: RegistrationForAloha[] }`.

- [ ] **Step 1: Write the failing tests**

Build a small Supabase query mock and cover these exact cases:

```ts
it("returns non-cancelled registrations for allowed event ids", async () => {
  const response = await POST(alohaRequest({
    action: "list_registrations_by_event_ids",
    event_ids: ["event-1", "event-2", "event-1"],
  }))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    registrations: [{
      id: "reg-1",
      event_id: "event-1",
      attendance_status: "attended",
      registered_at: "2026-08-01T15:00:00.000Z",
      checked_in_at: "2026-08-06T23:00:00.000Z",
      updated_at: "2026-08-06T23:00:00.000Z",
    }],
  })
})

it("rejects a partial or foreign event batch", async () => {
  const response = await POST(alohaRequest({
    action: "list_registrations_by_event_ids",
    event_ids: ["event-1", "foreign-event"],
  }))
  expect(response.status).toBe(403)
})

it("rejects more than 500 unique event ids", async () => {
  const event_ids = Array.from({ length: 501 }, (_, index) => `event-${index}`)
  const response = await POST(alohaRequest({ action: "list_registrations_by_event_ids", event_ids }))
  expect(response.status).toBe(400)
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm exec vitest run app/api/integrations/aloha/route.test.ts`

Expected: FAIL because `list_registrations_by_event_ids` is an unknown action.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add app/api/integrations/aloha/route.test.ts
git commit -m "test: define ALOHA registration batch contract"
```

---

### Task 2: Implement the authenticated batch action

**Files:**
- Modify: `app/api/integrations/aloha/route.ts`
- Test: `app/api/integrations/aloha/route.test.ts`

**Interfaces:**
- Consumes: `body.event_ids: string[]`.
- Produces: `{ registrations: Array<{ id, event_id, attendance_status, registered_at, checked_in_at, updated_at }> }`.

- [ ] **Step 1: Add strict event-id normalization**

Add a helper outside `POST`:

```ts
function uniqueEventIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids = [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))]
  return ids.length <= 500 ? ids : null
}
```

- [ ] **Step 2: Add the action before `list_registrations`**

```ts
if (action === "list_registrations_by_event_ids") {
  const ids = uniqueEventIds(body.event_ids)
  if (!ids) return bad("event_ids invalido o excede 500 elementos")
  if (ids.length === 0) return NextResponse.json({ registrations: [] })

  const { data: events, error: eventsError } = await db
    .from("crm_events")
    .select("id, account_id")
    .in("id", ids)
  if (eventsError) throw eventsError
  if ((events || []).length !== ids.length) return bad("Evento no encontrado", 404)
  if ((events || []).some((event) => !ALOHA_ACCOUNTS.has(event.account_id))) {
    return bad("Cuenta no permitida", 403)
  }

  const { data, error } = await db
    .from("crm_event_registrations")
    .select("id, event_id, attendance_status, registered_at, checked_in_at, updated_at")
    .in("event_id", ids)
    .neq("attendance_status", "cancelled")
    .order("registered_at", { ascending: true })
  if (error) throw error
  return NextResponse.json({ registrations: data || [] })
}
```

- [ ] **Step 3: Run the focused test and confirm GREEN**

Run: `pnpm exec vitest run app/api/integrations/aloha/route.test.ts`

Expected: all contract tests PASS.

- [ ] **Step 4: Run type checking and the integration test neighborhood**

Run: `pnpm exec tsc --noEmit --pretty false`

Run: `pnpm exec vitest run app/api/integrations/aloha/route.test.ts app/api/integrations/olaempresario/route.test.ts`

Expected: PASS, or document only pre-existing unrelated failures with exact paths.

- [ ] **Step 5: Commit the implementation**

```bash
git add app/api/integrations/aloha/route.ts app/api/integrations/aloha/route.test.ts
git commit -m "feat: expose ALOHA registration batch"
```

---

### Task 3: Publish the CRM prerequisite

**Files:**
- No source changes.

**Interfaces:**
- Produces: deployed CRM endpoint consumed by ALOHA.

- [ ] **Step 1: Verify the branch diff**

Run: `git diff --check origin/main...HEAD`

Run: `git status --short`

Expected: only the route and its test are tracked changes; the worktree is clean after commits.

- [ ] **Step 2: Push and create a ready PR**

```bash
git push -u origin codex/crm-aloha-registration-batch
gh pr create --base main --head codex/crm-aloha-registration-batch --title "Sincronizar registros de clases de prueba con ALOHA" --body-file /tmp/crm-aloha-pr.md
```

- [ ] **Step 3: Wait for checks and merge**

Run: `gh pr checks <PR_NUMBER> --watch`

Run: `gh pr merge <PR_NUMBER> --squash --delete-branch`

Expected: merged to `main`, production deployment healthy before ALOHA starts consuming the action.
