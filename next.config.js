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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
