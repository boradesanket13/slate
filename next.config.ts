import type {NextConfig} from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 * - Everything is same-origin: scripts, styles, fonts, images, Monaco, workers.
 * - 'unsafe-inline' for scripts is required by Next.js's inline bootstrap
 *   without per-request nonces (which would make every page dynamic and cost
 *   more compute). The app never renders user-supplied HTML, so the practical
 *   XSS surface is small; connect-src/object-src/base-uri stay locked down.
 * - 'unsafe-eval' is only allowed in development (React Fast Refresh).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {key: "Content-Security-Policy", value: contentSecurityPolicy},
  {key: "X-Content-Type-Options", value: "nosniff"},
  {key: "X-Frame-Options", value: "DENY"},
  {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
  {key: "Cross-Origin-Opener-Policy", value: "same-origin"},
  {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"},
  {key: "X-DNS-Prefetch-Control", value: "on"},
  // Legacy XSS auditors are removed from browsers and can introduce bugs; OWASP recommends disabling.
  {key: "X-XSS-Protection", value: "0"},
  ...(isProd
    ? [{key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains"}]
    : []),
];

// Static files from /public are re-validated on every request by default.
// Longer caching saves bandwidth, which is a metered resource on free tiers.
const staticCache = (maxAgeSeconds: number) => [
  {key: "Cache-Control", value: `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 7}`},
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  // Headless Chromium is loaded at runtime by /api/website-screenshot. Keep it
  // out of the bundle and make sure the compressed browser binary is traced
  // into that function on serverless hosts.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/website-screenshot": ["./node_modules/@sparticuz/chromium/bin/**"],
  },

  // All images are small, pre-optimized files in /public, so the image
  // optimizer is switched off. That avoids the free tier's image-transformation
  // quota entirely and removes a remote-fetch surface.
  images: {unoptimized: true},

  headers: async () => [
    {source: "/:path*", headers: securityHeaders},
    {source: "/backgrounds/:path*", headers: staticCache(86400)},
    {source: "/examples/:path*", headers: staticCache(86400)},
    {source: "/preview/:path*", headers: staticCache(86400)},
    {source: "/monaco/:path*", headers: staticCache(604800)},
    {source: "/og.png", headers: staticCache(86400)},
  ],

  redirects: async () => [{source: "/about", destination: "/", permanent: false}],
};

export default nextConfig;
