/** @type {import('next').NextConfig} */
const nextConfig = {
  // Neon usa `ws` para las transacciones interactivas. Debe cargarse con el
  // require nativo de Node para conservar su fallback de bufferutil.
  serverExternalPackages: ['ws'],
  experimental: {
    serverActions: {
      // El conciliador manda el texto del CSV del banco dentro de la server
      // action. El tope por defecto (1 MB) corta un extracto anual; 3 MB deja
      // margen sobre el límite de 2 MB que valida la propia acción.
      bodySizeLimit: '3mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'alohapanama.com',
      },
    ],
  },
}

module.exports = nextConfig
