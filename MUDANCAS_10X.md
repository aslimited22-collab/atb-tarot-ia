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

### ✅ #1.b — Receita por canal (FEITO — PR #4, com OK do dono)
**Onde:** `src/app/api/checkout/[plan]/route.ts` (ÚNICO arquivo). Lê o cookie `atb_attr` e **anexa `utm_*` na URL do Kiwify** (o Kiwify atribui a venda ao canal no painel dele) + no `metadata` da sessão Stripe. **Puramente aditivo:** não muda produto/preço/fluxo; qualquer falha cai no redirect original (try/catch). **Não toquei no webhook nem na detecção de plano.**
**Como medir:** painel Kiwify → Vendas com filtro/coluna de UTM (origem por venda); Stripe → metadata da sessão. As colunas `purchases.utm_*` (criadas na migration 0020) ficam prontas pra um relatório in-app de receita-por-canal depois — não precisei do webhook agora, porque Kiwify e Stripe já atribuem nativamente.
**Build:** ✅ OK.

---

## ⏳ #2 — AOV: order bump + upsell pós-compra (precisa de decisão de oferta)
- **Order bump:** config nativa no painel Kiwify (você faz — sem código). Ex.: no checkout da Pergunta, oferecer "+ Limpeza por R$X".
- **Upsell pós-compra:** bloco 1-clique nas páginas `/obrigado-*` (eu codo, é seguro — página pós-pagamento, não mexe em dinheiro). **Falta você definir as ofertas** (quem comprou X → oferecer Y por quanto).

## ⏳ #3 — Escalar canal vencedor + reativar base (operacional + envio)
- Escalar o canal que a UTM apontar (anúncios — operacional seu).
- Reativar 358 contas paradas + win-back de assinatura recusada via cron de remarketing (já existe) — **precisa do seu OK pra disparar e-mails**.

---
*Atualizado a cada mudança. Nada foi para produção ainda — está tudo na branch `feat/10x-1-attribution`.*
