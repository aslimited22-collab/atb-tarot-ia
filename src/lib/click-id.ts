// Guard contra click-ids DE TESTE poluindo atribuição/conversões.
//
// Contexto (17/07): a QA visitou o site com ?gclid=ATB_REVIEW_TEST_0709 — o
// AttributionTracker persistiu por 90 dias (by design) e todo checkout daquele
// navegador passou a carregar o gclid falso. Se uma compra-teste completar,
// o valor entra em `purchases` e o upload server-side (T1) mandaria conversão
// inválida pro Google Ads.
//
// Convenção do projeto: valores de teste começam com "ATB_" ou "TEST"
// (TESTE123, TESTREFORMA, ATB_REVIEW_TEST_0709...). gclids reais são tokens
// opacos do Google (ex.: "Cj0KCQjw...", "EAIaIQ...") — nunca começam assim.
// Pura e isomórfica: usada no client (AttributionTracker) e no server
// (checkout, funil, webhook).
export function isTestClickId(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^(atb_|test)/i.test(value.trim());
}
