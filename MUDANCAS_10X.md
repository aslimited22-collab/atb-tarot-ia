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

## ✅ #2 — AOV: cross-sell pós-compra (FEITO — PR #5)
**Onde:** `src/lib/welcome-email.ts` (e-mail de boas-vindas, 6 idiomas) + `src/app/api/checkout/[plan]/route.ts` (lê utm da URL, prioridade).
- **Cross-sell no e-mail de entrega:** bloco SUAVE (estilo secundário, não compete com o CTA de acesso) com o próximo produto — comprou **Pergunta → Limpeza R$100**; comprou **Limpeza → Consulta R$250/mês**. Alcança 100% dos compradores no momento certo. *(Coloquei no e-mail, não no `/obrigado-*`, porque a página de pergunta auto-redireciona e os outros estados são pré-acesso — oferecer "compre mais" antes de usar o 1º produto seria ruim.)*
- **Mensurável:** o link leva `utm_campaign=upsell_pergunta`/`upsell_limpeza` e o checkout repassa pro Kiwify/Stripe → venda atribuída à campanha de upsell.
- **Seguro:** template de e-mail; não toca pagamento/acesso. Build ✅.

**Ainda na sua mão (o MAIOR ganho de AOV):** o **order bump no painel do Kiwify** (config, sem código). No checkout de cada produto, ativar "oferta adicional / order bump". Ex.: no checkout da **Pergunta R$29**, marcar "**+ Limpeza por R$80**". É nativo do Kiwify, no momento do pagamento — o lever de AOV nº1. Eu não consigo fazer (é seu painel).

## ✅ #2b — Empurrar one-time → assinatura (MRR) — FEITO (PR #6)
**Onde:** `src/app/dashboard/page.tsx`. Card de cross-sell da **Consulta Completa (R$250/mês)** no dashboard, **só pra quem não é premium** (acima do upsell da Limpeza). Link rastreável (`utm_campaign=upsell_consulta`).
**Por quê:** hoje só 38 assinantes vs 208 pagantes — empurrar o one-time pra recorrência compõe MRR. **Seguro:** dashboard, não toca pagamento/acesso. Build ✅. Clique medido pelo tracker.

## ✅ #4 — Vídeo Chamada ao Vivo (R$877): consertada + surfaçada — FEITO (PR #7)
**Contexto:** venda de R$877 (Clarice) caiu como "premium" (chat) em vez de vídeo — o código detectava vídeo só na faixa R$470–520 (era R$497), mas o Kiwify cobra R$877. A cliente de maior ticket recebeu o e-mail errado e não tem perfil/login ainda.
**Fixes (caminho sagrado — webhook/preço):**
- `pricing.ts` — videochamada 49700 → **87700** (alinha página /videochamada + Stripe ao preço real R$877; corrige isca-e-troca: página mostrava R$497, cobrava R$877).
- `api/webhooks/kiwify/route.ts` — faixa de detecção de vídeo 470–520 → **470–900** (pega R$497 e R$877); o valor SEMPRE vale como fallback. Nenhum outro produto cai na faixa (limpeza 100, perguntas 19–39, consulta 250, espírito 437).
**Surfaçar (topo-de-escada / AOV):**
- `dashboard/page.tsx` — card "Sessão ao Vivo" só pra quem **já é premium** (público mais quente) → leva pra `/videochamada` (página de vendas que já existia, sem link). `utm_campaign=upsell_video`.
- 3 chaves novas em `dict.ts` (6 idiomas).
**Pendente seu:** (1) falar com a **Clarice** pra agendar a sessão; (2) **OK de deploy** (toca webhook = sagrado). Build ✅.

## ⏳ #3 — Escalar canal vencedor + reativar base (operacional + envio)
- Escalar o canal que a UTM apontar (anúncios — operacional seu).
- Reativar 358 contas paradas + win-back de assinatura recusada via cron de remarketing (já existe) — **precisa do seu OK pra disparar e-mails**.

---
*Atualizado a cada mudança. Nada foi para produção ainda — está tudo na branch `feat/10x-1-attribution`.*
