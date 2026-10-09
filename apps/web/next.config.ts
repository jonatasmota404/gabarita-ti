import type { NextConfig } from 'next';

// O .env fica na raiz do monorepo (como na API); o ambiente já exportado tem precedência.
try {
  process.loadEnvFile('../../.env');
} catch {
  // sem .env: valem os padrões
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // O service worker precisa ser sempre revalidado para atualizações chegarem.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default config;
