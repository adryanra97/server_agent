import type { NextConfig } from 'next';
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
// The local browser suite runs FastAPI beside Next.js. Production continues to
// use the existing service routing in vercel.json, without this proxy.
const testBackend = process.env.TWINPEAK_E2E_BACKEND_ORIGIN === 'http://127.0.0.1:8100'
  ? 'http://127.0.0.1:8100'
  : null;
const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(testBackend ? {
    async rewrites() {
      return {
        beforeFiles: [
          ...['/health', '/engines', '/verdict', '/docs', '/openapi.json', '/redoc']
            .map(source => ({ source, destination: testBackend + source })),
          { source: '/api/v1/:path*', destination: testBackend + '/api/v1/:path*' },
        ],
        afterFiles: [],
        fallback: [],
      };
    },
  } : {}),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
