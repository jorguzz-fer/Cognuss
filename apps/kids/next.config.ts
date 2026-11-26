import type { NextConfig } from 'next';
import path from 'node:path';

// Cognuss Kids (ADR 0022). Mesmos cabeçalhos do Cognuss; a CSP é montada em src/proxy.ts.
const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  transpilePackages: ['@gutta/core', '@gutta/db-kids', '@gutta/ui'],
  serverExternalPackages: ['@node-rs/argon2', 'pg'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Microfone liberado só para a própria origem: resposta por áudio (SPEC Kids 6.3).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
