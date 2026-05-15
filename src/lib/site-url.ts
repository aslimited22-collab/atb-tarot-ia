/**
 * Returns the canonical base URL for the site, without trailing slash.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL env var (set on Vercel — bulletproof)
 *   2. Request `x-forwarded-proto` + `host` headers (per-request — dev/preview)
 *   3. Hardcoded fallback `https://atbtartot.com`
 *
 * Sempre passe o `req` em route handlers — assim localhost e preview URLs continuam corretos.
 */
export function getSiteUrl(req?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  if (req) {
    const host = req.headers.get("host");
    if (host) {
      const proto =
        req.headers.get("x-forwarded-proto") ||
        (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }
  return "https://atbtartot.com";
}
