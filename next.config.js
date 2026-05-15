/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Impede clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Impede MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Força HTTPS por 1 ano
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Limita referrer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Desativa features desnecessárias
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Content Security Policy — hardened (sem unsafe-eval)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' ainda necessário pro Next.js inline runtime
              // 'unsafe-eval' REMOVIDO — Next.js 14 prod não precisa
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co https://api.deepseek.com https://api.openai.com https://api.stripe.com https://*.vercel-storage.com wss://*.supabase.co",
              "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          // X-XSS-Protection (legado mas inofensivo)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Cross-Origin policies — isola contexto de browsing
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        ],
      },
      {
        // Webhook não precisa de HSTS rígido mas precisa de proteção
        source: "/api/webhooks/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};
