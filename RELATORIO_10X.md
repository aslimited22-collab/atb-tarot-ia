# RELATÓRIO 10X — Auditoria de growth do ATB Tarot

> Auditoria **100% read-only** (nenhuma alteração de código). Código lido (funil, ofertas, schema) + números reais puxados do Supabase. Período: abr–jun/2026 (~3 meses).
> 10x = empilhar alavancas → **Receita = Tráfego × Conversão × Ticket × Retenção**. 2x em cada ≈ 16x.

---

## 1. Estado atual (código)

- **Funil:** Landing → **1 clique** pro checkout (`/api/checkout/[plan]` decide Kiwify-BR vs Stripe-intl por IP) → paga → webhook cria conta + manda magic-link → `/entrar` → produto. Pós-compra: 3 páginas `/obrigado-*`.
- **Ofertas (8):**
  - **Na landing:** Limpeza R$100 (herói) · Consulta/Premium R$250/mês · Pergunta R$29.
  - **Ocultas:** Basic R$29/mês · Pergunta3 (R$19,90) · Pergunta7 (R$39,90) · **Vídeo R$497** · **Espírito R$437**.
- **Escada de valor com furos:** Pergunta3 (R$19,90) é **mais barata** que Pergunta1 (R$29); Pergunta7 (R$39,90) ≈ Basic (R$29/mês). **Zero order bump / upsell no checkout.** High-ticket (Vídeo/Espírito) escondidos.
- **Instrumentação:** mede receita/recompra/ativação. **NÃO mede:** origem do tráfego (UTM — **ZERO**), churn de assinatura, login/1º acesso, eventos de funil pré-checkout, abertura/clique de e-mail.

## 2. Números reais do funil (abr–jun/2026)

- **566 contas** (557 pt = **98% Brasil**) · **208 pagantes** · **308 compras** · **R$ 18.529** (receita nominal — mistura BRL+USD).

**Receita por oferta:**

| Oferta | Vendas | Receita | Ticket |
|---|---|---|---|
| Limpeza | 67 | R$ 6.501 | R$ 97 |
| Premium (Consulta) | 34 | R$ 6.307 | R$ 185 |
| Pergunta 3 | 72 | R$ 1.894 | R$ 26 |
| Pergunta 7 | 26 | R$ 1.833 | R$ 70 |
| Basic | 45 | R$ 1.311 | R$ 29 |
| Pergunta 1 | 43 | R$ 684 | R$ 16 |
| **Total** | **308** | **R$ 18.529** | **R$ 60** |

→ **Limpeza + Premium = 69% da receita.** Perguntas 1/3/7 = a entrada barata (141 vendas, baixo ticket).

**Outros indicadores:**
- **Recompra: 27,9%** (58/208 compram 2x+) — boa retenção.
- **Assinaturas ativas (aprox): 38** (18 premium + 20 basic) → ~**R$5k MRR** potencial (churn não medido).
- **Abandono de carrinho:** 46 leads, **30 convertidos (65%)**, 21 remarketing enviado — resgate funciona, mas só 46 leads capturados (pouco).
- **Ativação:** 285 contas usaram o chat; limpeza/espírito = 0 uso de chat no banco (limpeza é entregue por e-mail; o resto era o bug de magic-link, **corrigido hoje**). Pagantes que usaram o produto: **53,8%** (sobe muito na coorte de junho).

**★ Os 2 dados que contam a história:**

| Mês | Contas novas | Conversão conta→pago | Receita |
|---|---|---|---|
| Abril | 133 | 14% | R$ 1.051 |
| Maio | **339** | 35% | **R$ 11.137** |
| Junho | **94** ⬇ | **73%** ⬆ | R$ 6.342 (~90% do mês) |

## 3. Diagnóstico — o gargalo é **TRÁFEGO**

- **Conversão NÃO é o gargalo** — está forte e subindo (14% → 35% → **73%**). As correções pegaram.
- **Retenção é decente** (28% recompra, 38 assinantes) — melhorável, mas não é o furo principal.
- **Ticket parado em R$60 com ZERO upsell** — dinheiro na mesa.
- **O furo real:** o volume no topo **caiu ~70% de maio (339) pra junho (94)**, e a receita caiu de R$11k → R$6k **mesmo com a conversão subindo** — porque entrou menos gente. **Maio provou que há demanda (R$11k), mas não se sustentou — e sem UTM, ninguém sabe o que gerou maio pra repetir.** Está-se vendendo bem e **voando cego no canal que mais importa.**

**Folga das alavancas:** Tráfego **2–5x** (no chão) · Ticket **1,5–2x** (sem upsell) · Retenção **1,3–1,5x** · Conversão **~1,2x** (quase no teto). **Empilhado ≈ 8–10x.**

## 4. Plano priorizado (impacto × facilidade)

### Ganhos rápidos (esta semana)
1. **Instrumentar atribuição (UTM)** — pré-requisito do maior lever. *Onde:* migration `utm_*` em `users`+`purchases`; capturar `?utm_*` na landing (`src/app/page.tsx`), repassar em `metadata` no checkout (`src/app/api/checkout/[plan]/route.ts`) e gravar nos webhooks. **Impacto: altíssimo · Esforço: médio.**
2. **Order bump + upsell pós-compra (AOV)** — não existe nenhum. *Onde:* order bump nativo no Kiwify (config) + bloco 1-clique nas `/obrigado-*` (ex.: Pergunta R$29 → "+Limpeza"; Limpeza → "+assinatura"). **Impacto: alto · Esforço: baixo-médio.**
3. **Consertar a escada de valor** — repreçar Pergunta3/7 no Kiwify; surfaçar Basic como "continue conversando". **Impacto: médio · Esforço: baixo.**
4. **Reativar a base parada** — 358 contas sem compra + leads + win-back de assinatura recusada. Disparar o cron de remarketing (já existe). **Impacto: médio-alto · Esforço: baixo.**
5. **Onboarding pós-login** ("comece aqui") agora que a entrega foi corrigida. **Impacto: médio · Esforço: médio.**

### Apostas estruturais (mês)
1. **Escalar o canal que fez o pico de maio (R$11k)** — depois que a UTM revelar qual foi. **Esse é o 10x.**
2. **Empurrar one-time → assinatura** (MRR compõe). Hoje só 38 assinantes vs 208 pagantes.
3. **Surfaçar o high-ticket** (Vídeo R$497, Espírito R$437) como upsell pra quem já engajou.
4. **CRO de confiança** (garantia 7 dias, depoimentos reais, WhatsApp).

## 5. As 3 mudanças de maior alavancagem (prontas pra implementar)

1. **Atribuição UTM ponta-a-ponta** — *por quê:* o gargalo é tráfego e está sem medição; impossível escalar o que não se mede. *Onde:* migration `utm_*` + captura na landing + repasse no checkout + gravação nos webhooks (`page.tsx`, `api/checkout/[plan]/route.ts`, `api/webhooks/kiwify/route.ts`, `stripe/route.ts`).
2. **AOV: order bump (Kiwify) + upsell 1-clique pós-compra** — *por quê:* ticket R$60 sem nenhum upsell = receita imediata sem mais tráfego. *Onde:* painel Kiwify (order bump) + bloco de oferta nas `/obrigado-*`.
3. **Escalar o canal vencedor (pós-UTM) + reativar a base** — *por quê:* o multiplicador real do 10x. *Onde:* operacional (ads no canal que a UTM apontar) + cron de remarketing pros 358 parados + win-back das assinaturas recusadas.

## 6. Instrumentação faltando (pra medir)
- **UTM/origem de tráfego** (crítico — zero hoje).
- **Churn de assinatura** (sem `cancelled_at`; webhook não trata cancelamento).
- **Login / 1º acesso** (sem `first_login_at`/`last_login_at`).
- **Eventos de funil pré-checkout** (page views landing→checkout).
- **Abertura/clique de e-mail** (sem webhooks do Resend).

---
*Gerado por auditoria read-only do código + dados reais do Supabase. Nenhuma alteração foi feita no sistema.*
