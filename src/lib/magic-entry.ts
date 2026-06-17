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
