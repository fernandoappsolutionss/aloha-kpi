// Next admite imports relativos sin extensión; Node necesita resolverlos al
// probar servicios SQL fuera de Next. No transforma código ni dependencias.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.') || /\.[a-z]+$/i.test(specifier)) throw error
    return nextResolve(`${specifier}.js`, context)
  }
}
