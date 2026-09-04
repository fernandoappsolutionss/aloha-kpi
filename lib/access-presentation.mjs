export function presentAccessNotice({ result, user }) {
  const invitation = result?.kind === 'invitation'
  const rawLink = invitation && typeof result?.link === 'string' ? result.link.trim() : ''
  return {
    kind: invitation ? 'invitation' : 'reset',
    nombre: String(user?.nombre || '').trim(),
    email: String(user?.email || '').trim().toLowerCase(),
    emailSent: Boolean(result?.emailSent),
    link: rawLink || null,
    canCopy: Boolean(rawLink),
  }
}
