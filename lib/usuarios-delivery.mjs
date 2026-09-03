export function usuariosDeliveryForRuntime({ env = process.env, live }) {
  if (env.E2E_DELIVERY_MODE !== 'stub') return live
  if (env.NODE_ENV !== 'development' || env.E2E_DATABASE_CONFIRM !== 'disposable') {
    throw new Error('E2E_DELIVERY_MODE=stub solo se permite en desarrollo con DB desechable.')
  }
  return async ({ purpose, token }) => ({
    emailSent: true,
    emailReason: 'e2e_stub',
    ...(purpose === 'invite'
      ? { link: `https://e2e.invalid/set-password?token=${token}` }
      : {}),
  })
}
