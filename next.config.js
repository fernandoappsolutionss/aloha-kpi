/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // La carta fiscal se lee con fs en la ruta de descarga: sin esto no viaja a Vercel.
  outputFileTracingIncludes: {
    '/api/entrenamiento/fiscal/documento': ['./lib/entrenamiento/material/*.docx'],
  },
  // Neon usa `ws` para las transacciones interactivas. Debe cargarse con el
  // require nativo de Node para conservar su fallback de bufferutil.
  serverExternalPackages: ['ws'],
  // Los estados de cuenta en PDF pesan ~0,5 MB; el límite por defecto (1 MB) queda justo.
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
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
