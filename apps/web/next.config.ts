import type { NextConfig } from 'next';
import path from 'node:path';

// Cabeçalhos de segurança fixos. A CSP é montada por requisição em src/proxy.ts.
const nextConfig: NextConfig = {
  // standalone só na imagem Docker (NEXT_OUTPUT_STANDALONE=1); localmente `next start` funciona normal.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  transpilePackages: [
    '@gutta/ai',
    '@gutta/core',
    '@gutta/db',
    '@gutta/contracts',
    '@gutta/jobs',
    '@gutta/storage',
  ],
  serverExternalPackages: ['@node-rs/argon2', 'pg', 'ioredis'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Módulo 3D das peças (ADR 0025): a peça roda num sandbox sem origem, então o import
        // precisa de CORS. Arquivo versionado no nome, por isso o cache longo.
        source: '/piece-assets/:file*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
