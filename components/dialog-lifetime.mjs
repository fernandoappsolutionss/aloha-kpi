export function createDialogLifetime() {
  let active = true
  return {
    activate() { active = true },
    dispose() { active = false },
    guard(callback) { return (...args) => active ? callback?.(...args) : undefined },
  }
}
