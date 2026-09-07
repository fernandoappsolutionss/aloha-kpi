const READONLY_GLOBAL_ROLES = new Set(['admin_general', 'supervisor'])
const OPERATIVE_WRITE_ROLES = new Set(['admin_master', 'coordinador', 'administradora', 'asistente'])
const OPERATIVE_COMMAND_ROLES = new Set(['admin_master', 'coordinador', 'administradora'])

export const MASTER_ROLE = 'admin_master'
export const FERNANDO_EMAIL = 'fperez@teamsolutionss.com'

export const ROLE_LABELS = Object.freeze({
  admin_master: 'Administrador Master',
  admin_general: 'Administrador General',
  supervisor: 'Supervisor',
  coordinador: 'Coordinador Operativo',
  administradora: 'Administradora',
  asistente: 'Asistente',
  coach: 'Coach',
})
const PANAMA_MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || 'Usuario'
}

export function isMasterRole(role) {
  return role === MASTER_ROLE
}

export function isReadonlyGlobalRole(role) {
  return READONLY_GLOBAL_ROLES.has(role)
}

function booleanCapability(capabilities, names, fallback = false) {
  for (const name of names) {
    if (typeof capabilities?.[name] === 'boolean') return capabilities[name]
  }
  return fallback
}

export function resolveAccess(context = {}) {
  const actor = context?.actor || null
  const role = actor?.role || actor?.rol || ''
  const capabilities = context?.capabilities || {}
  const isMaster = isMasterRole(role)
  const isReadonlyGlobal = isReadonlyGlobalRole(role)
  const isCoordinator = role === 'coordinador'
  const isAssistant = role === 'asistente'
  const canWriteFallback = OPERATIVE_WRITE_ROLES.has(role)
  const canCommandFallback = OPERATIVE_COMMAND_ROLES.has(role)
  const canPanelFallback = isMaster || isReadonlyGlobal || isCoordinator
  const usersFallback = isMaster || isCoordinator

  const writeOperations = booleanCapability(capabilities, ['writeOperations', 'mutateOperations', 'canWriteOperations'], canWriteFallback) && !isReadonlyGlobal
  const closeOperations = booleanCapability(capabilities, ['closeOperations', 'canCloseOperations', 'canCloseMonth'], canCommandFallback) && !isReadonlyGlobal
  const deleteOperations = booleanCapability(capabilities, ['deleteOperations', 'canDeleteOperations'], canCommandFallback) && !isReadonlyGlobal
  const manageUsers = booleanCapability(capabilities, ['manageUsers', 'canManageUsers', 'viewUsers'], usersFallback) && !isReadonlyGlobal
  const createUser = booleanCapability(capabilities, ['createUser', 'canCreateUser'], manageUsers) && !isReadonlyGlobal
  const viewUsersPage = booleanCapability(capabilities, ['viewUsers', 'canViewUsers'], usersFallback || isReadonlyGlobal)
  const manageCenters = booleanCapability(capabilities, ['manageCenters', 'canManageCenters'], isMaster) && !isReadonlyGlobal
  const viewCentersPage = booleanCapability(capabilities, ['viewCenters', 'canViewCenters'], manageCenters || isReadonlyGlobal)
  const manageMetas = booleanCapability(capabilities, ['manageMetas', 'canManageMetas', 'viewMetas'], isMaster) && !isReadonlyGlobal
  const viewMetasPage = booleanCapability(capabilities, ['viewMetas', 'canViewMetas'], manageMetas || isReadonlyGlobal)
  const viewZoho = booleanCapability(capabilities, ['viewZoho', 'canViewZoho', 'manageZoho'], isMaster) && !isReadonlyGlobal
  const viewAdminTraining = booleanCapability(capabilities, ['viewAdminTraining', 'canViewAdminTraining'], isMaster) && !isReadonlyGlobal
  const viewOficio = booleanCapability(capabilities, ['viewOficio', 'canViewOficio', 'viewAdminTraining'], isMaster) && !isReadonlyGlobal

  return {
    actor,
    role,
    roleLabel: roleLabel(role),
    centers: context?.centers || [],
    isMaster,
    isReadonlyGlobal,
    isCoordinator,
    isAssistant,
    isCoach: role === 'coach',
    hasPanel: booleanCapability(capabilities, ['viewPanel', 'canViewPanel'], canPanelFallback),
    canReadGlobal: booleanCapability(capabilities, ['readGlobal', 'canReadGlobal'], isMaster || isReadonlyGlobal || isCoordinator),
    canWriteOperations: writeOperations,
    canCloseOperations: closeOperations,
    canDeleteOperations: deleteOperations,
    canManageUsers: manageUsers,
    canCreateUser: createUser,
    canViewUsersPage: viewUsersPage,
    canBlockUsers: booleanCapability(capabilities, ['blockUsers', 'manageBlocks', 'canBlockUsers'], isMaster) && isMaster,
    canManageCenters: manageCenters,
    canViewCentersPage: viewCentersPage,
    canManageMetas: manageMetas,
    canViewMetasPage: viewMetasPage,
    canViewZoho: viewZoho,
    canViewAdminTraining: viewAdminTraining,
    canViewOficio: viewOficio,
    canOpenOwnOficio: !isReadonlyGlobal && role !== 'desconocido' && role !== '',
  }
}

export function actionAllowed(actions = {}, ...names) {
  return names.some((name) => actions?.[name] === true)
}

export function isProtectedMasterUser(user = {}) {
  const email = String(user.email || '').trim().toLowerCase()
  return user.role === MASTER_ROLE || user.rol === MASTER_ROLE || email === FERNANDO_EMAIL
}

export function userBlockedUntil(user = {}) {
  return user.blockedUntil || user.blocked_until || user.bloqueado_hasta || user.bloqueadoHasta || null
}

export function isUserBlocked(user = {}, now = new Date()) {
  const blockedUntil = userBlockedUntil(user)
  if (!blockedUntil) return false
  const until = new Date(blockedUntil)
  if (Number.isNaN(until.getTime())) return true
  return until.getTime() > now.getTime()
}

export function formatPanamaDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = type => parts.find(p => p.type === type)?.value || '00'
  const month = Number(pick('month'))
  const hour = pick('hour') === '24' ? '00' : pick('hour')
  return `${Number(pick('day'))} ${PANAMA_MONTHS_SHORT[month - 1] || pick('month')} ${pick('year')}, ${hour}:${pick('minute')}`
}

export function defaultPanamaDatetimeLocal(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  const pick = type => parts.find(p => p.type === type)?.value || '00'
  const hour = pick('hour') === '24' ? '00' : pick('hour')
  return `${pick('year')}-${pick('month')}-${pick('day')}T${hour}:${pick('minute')}`
}

export function panamaDatetimeLocalToIso(localValue) {
  if (!localValue) return ''
  const normalized = localValue.length === 16 ? `${localValue}:00` : localValue
  const date = new Date(`${normalized}-05:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
