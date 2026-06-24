// Embrulha um magic-link do Supabase numa página intermediária /entrar.
//
// PROBLEMA: o magic-link do Supabase é de USO ÚNICO e é consumido no GET de
// `/auth/v1/verify`. Scanners de e-mail (Gmail, antivírus corporativo) PRÉ-ABREM
// os links pra checar segurança — isso "queima" o token antes da cliente clicar,
// e ela vê "Email link is invalid or has expired" ("não é e-mail").
//
// SOLUÇÃO: o botão do e-mail aponta pra `/entrar?dest=<magic-link>`. A página
// /entrar NÃO consome nada ao ser aberta (um scanner que a abre não faz login);
// o login só dispara no CLIQUE humano do botão (via JS, sem href cru pro token).
// Assim o token sobrevive até a cliente clicar.
//
// Idempotente (embrulhar 2x não muda nada) e só embrulha magic-links REAIS do
// Supabase — fallbacks tipo /obrigado-* passam intactos.
export function magicEntryUrl(url: string | undefined | null): string {
  const u = (url || "").trim();
  if (!u) return "";
  const supa = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const isMagic = u.includes("/auth/v1/verify") || (!!supa && u.startsWith(supa));
  if (!isMagic) return u; // não é magic-link (fallback) ou já embrulhado → intacto
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://atbtartot.com").replace(/\/$/, "");
  return `${site}/entrar?dest=${encodeURIComponent(u)}`;
}

type GenLinkData = {
  properties?: { action_link?: string; hashed_token?: string; verification_type?: string } | null;
} | null;

/**
 * Monta o magic-link 1-toque no formato `token_hash` (verificado NO SERVIDOR pelo
 * /auth/callback via verifyOtp), já embrulhado no /entrar (anti-scanner).
 *
 * PORQUÊ: o `action_link` do Supabase usa fluxo IMPLÍCITO — a sessão volta no
 * fragmento (#access_token) da URL, que o /auth/callback (rota de servidor) NÃO lê
 * → joga todo cliente no /login?error=invalid e ninguém entra (bug de entrega que
 * deixou a Limpeza com 0% de uso). Aqui reaproveitamos o `redirect_to` (que já tem
 * o ?next= certo) e o `hashed_token` pra montar
 * /auth/callback?next=...&token_hash=...&type=..., que o servidor troca por sessão
 * (cookie) antes de redirecionar pro produto.
 *
 * Se faltar token/link, retorna `fallback` (ex.: página /obrigado-*).
 */
export function magicLinkFromGenerate(linkData: GenLinkData, site: string, fallback: string): string {
  const p = linkData?.properties;
  const th = p?.hashed_token;
  const action = p?.action_link;
  if (!th || !action) return fallback;
  let redirectTo = "";
  try {
    redirectTo = new URL(action).searchParams.get("redirect_to") || "";
  } catch {
    return fallback;
  }
  if (!redirectTo) return fallback;
  const vtype = p?.verification_type || "magiclink";
  const sep = redirectTo.includes("?") ? "&" : "?";
  const dest = `${redirectTo}${sep}token_hash=${encodeURIComponent(th)}&type=${encodeURIComponent(vtype)}`;
  const siteClean = (site || "https://atbtartot.com").replace(/\/$/, "");
  return `${siteClean}/entrar?dest=${encodeURIComponent(dest)}`;
}
