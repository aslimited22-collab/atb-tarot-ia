# MUDANÇAS 10X — acompanhamento da implementação

Execução incremental do plano do `RELATORIO_10X.md`. Branch: `feat/10x-1-attribution`.
Regra: uma mudança por vez · build após cada · caminhos de dinheiro/acesso só com OK do dono · migrations só aditivas.

---

## ✅ #1 — Atribuição de tráfego (UTM): FUNDAÇÃO (pronta, segura)
**O quê:** captura de onde vem o tráfego (o gargalo nº1). Antes: ZERO atribuição.
**Onde:**
- `supabase/migrations/0020_attribution.sql` — tabela `track_events` (aditiva) + colunas `utm_*` em `purchases` (aditivas, nullable).
- `src/app/api/track/route.ts` — endpoint que grava eventos (best-effort, nunca quebra o cliente).
- `src/components/AttributionTracker.tsx` — captura `utm_*`/referrer na entrada (cookie first-touch 90d) + registra `visit` e `cta_click` (clique em qualquer link de checkout, com o plano).
- `src/app/layout.tsx` — injeta o tracker globalmente.

**Não toca em:** checkout, webhooks, auth, plano, WhatsApp. **Build:** ✅ OK.
**Como medir:** `select utm_source, count(*) from track_events where event='cta_click' group by 1 order by 2 desc;` (cliques de checkout por canal). Idem `event='visit'` pra visitas.
**Aplicar a migration** no deploy/merge (aditiva, reversível).

### 🔐 #1.b — Receita por canal (PENDENTE — precisa do OK do dono, mexe em caminho de pagamento)
Pra ligar UTM → RECEITA (e não só visitas/cliques), preciso:
1. `src/app/api/checkout/[plan]/route.ts` — ler o cookie de atribuição e **anexar `?utm_*` na URL de redirect do Kiwify** (Kiwify já rastreia e mostra venda por origem no painel dele) + no `metadata` da sessão Stripe. *Risco: baixo (só acrescenta query params; com try/catch e URL-encode). Não muda produto/preço/fluxo.*
2. `src/app/api/webhooks/kiwify/route.ts` + `stripe/route.ts` — gravar a origem nas colunas `utm_*` de `purchases`. *Aditivo, não altera detecção de plano/crédito/e-mail.*
→ **Aguardando OK** pra mexer nesses arquivos.

---

## ⏳ #2 — AOV: order bump + upsell pós-compra (precisa de decisão de oferta)
- **Order bump:** config nativa no painel Kiwify (você faz — sem código). Ex.: no checkout da Pergunta, oferecer "+ Limpeza por R$X".
- **Upsell pós-compra:** bloco 1-clique nas páginas `/obrigado-*` (eu codo, é seguro — página pós-pagamento, não mexe em dinheiro). **Falta você definir as ofertas** (quem comprou X → oferecer Y por quanto).

## ⏳ #3 — Escalar canal vencedor + reativar base (operacional + envio)
- Escalar o canal que a UTM apontar (anúncios — operacional seu).
- Reativar 358 contas paradas + win-back de assinatura recusada via cron de remarketing (já existe) — **precisa do seu OK pra disparar e-mails**.

---
*Atualizado a cada mudança. Nada foi para produção ainda — está tudo na branch `feat/10x-1-attribution`.*
