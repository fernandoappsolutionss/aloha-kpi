/** @type {import('next').NextConfig} */
const nextConfig = {
  // Neon usa `ws` para las transacciones interactivas. Debe cargarse con el
  // require nativo de Node para conservar su fallback de bufferutil.
  serverExternalPackages: ['ws'],
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
