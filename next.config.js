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
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://api.deepseek.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
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
