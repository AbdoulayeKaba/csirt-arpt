import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exceljsBrowser = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'node_modules/exceljs/dist/exceljs.min.js'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: '**.gov.gn' },
      { protocol: 'https', hostname: '**.gouv.gn' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
  turbopack: {
    resolveAlias: {
      exceljs: exceljsBrowser,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      exceljs: exceljsBrowser,
    };
    return config;
  },
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ]
    if (process.env.ENABLE_HSTS === 'true') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains',
      })
    }
    return [
      { source: '/:path*', headers },
      {
        source: '/uploads/:path*',
        headers: [
          ...headers,
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/csirt/:path*',
        headers: [
          ...headers,
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        // Anciennes URLs média : redirection permanente vers /uploads/legacy
        source: '/uploads/cms/:path*',
        destination: '/uploads/legacy/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
