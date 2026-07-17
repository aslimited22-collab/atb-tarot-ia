# Passo a passo — Consertar o tracking de "Compra" no Google Ads

## Por que a Compra mostra 0 vendas
O código está certo, mas a conversão de **Compra** só dispara se a variável de ambiente
`NEXT_PUBLIC_GADS_PURCHASE_LABEL` estiver setada em **produção (Vercel)**. Ela quase certamente
foi esquecida (a variável-irmã do "Iniciar checkout" está setada e funciona; a de compra não).
Sem esse rótulo, o evento de Compra nunca é enviado ao Google → **0 Compras**.

> A tag base e o remarketing já funcionam. Falta só ligar o rótulo da Compra.

---

## Passo 1 — Setar a variável na Vercel  ⭐ (é O conserto)
1. Entre em **vercel.com** → seu projeto (ATB / atbtartot).
2. **Settings → Environment Variables**.
3. **Add New**:
   - **Key:** `NEXT_PUBLIC_GADS_PURCHASE_LABEL`
   - **Value:** `Vn61CImjkcccEPDd_p0q`
   - **Environment:** Production (pode marcar Preview/Development também).
4. Confirme que existe **`NEXT_PUBLIC_GADS_ID` = `AW-11337182960`** (o código tem default, mas deixe explícito).
5. **Save.**
6. **Redeploy** (Deployments → menu "…" do último deploy de produção → **Redeploy**).
   ⚠️ Variáveis `NEXT_PUBLIC_` entram no **build** — sem redeploy, não valem.

---

## Passo 2 — [DESATUALIZADO] Arquitetura real de disparo (17/07/2026)
⚠️ Esta seção dizia que `/obrigado-pergunta` e `/obrigado-videochamada` disparam a conversão
"Compra" no código — **não é mais verdade**. Hoje:

- **BR (Kiwify): Limpeza R$100, Pergunta R$29, Vídeo R$877** → quem dispara a "Compra" é o
  **PIXEL DO GOOGLE ADS configurado no painel de CADA produto no Kiwify** (Pixels/Integrações →
  Google Ads, disparo "ao aprovar cartão/pix"), **não** o código do site. Disparar no código
  também contaria a venda 2×. (Verificado no painel: "Compra Limpeza", "Compra Pergunta",
  "Compra Video" já configurados.)
- **Intl (Stripe): Espírito R$437** → esse SIM dispara no código, via `<GoogleAdsPurchase>` em
  `src/app/obrigado-espirito/page.tsx`.
- Desde 17/07 há também um caminho **server-side redundante** (webhook → API do Google Ads,
  ver `src/lib/google-ads-conversions.ts`) — cobre os produtos BR sem depender do pixel do
  Kiwify, mas precisa das envs `GOOGLE_ADS_*` (setup manual no Google Cloud/Ads, não é "só
  setar env"). Enquanto essas envs não existirem, esse caminho é no-op — o pixel Kiwify
  continua sendo a fonte de verdade pros produtos BR.

No **Kiwify**, o redirect pós-compra continua importando pra ENTREGA (magic-link/acesso), não
pra conversão do Google Ads: confira que cada produto aponta pra `/obrigado-{produto}?order={order_id}`.

---

## Passo 3 — Limpeza R$100 (é via pixel do Kiwify, não pelo código)
De propósito, o código **não** dispara a Compra na Limpeza R$100 (senão contaria 2x). Quem dispara
é o **pixel do Google Ads configurado no Kiwify**:
1. Kiwify → produto **Limpeza** → **Pixels / Integrações** → Google Ads.
2. **Conversion ID:** `AW-11337182960` · **Label:** `Vn61CImjkcccEPDd_p0q` · evento **"ao aprovar" (cartão/pix)**.

---

## Passo 4 — Testar (fecha o ciclo)
1. Faça uma **compra-teste de R$29**.
2. Google Ads → **Metas → Conversões → ação "Compra"**.
3. Em alguns minutos a algumas horas deve aparecer **1 conversão** (relatórios do Google têm atraso).
4. Pra ver na hora: instale a extensão **Google Tag Assistant**, refaça o fluxo e confirme o evento
   `conversion` com `send_to: AW-11337182960/Vn61CImjkcccEPDd_p0q` disparando na página de obrigado.

---

## Depois que a Compra registrar
- Trocar o lance do **Demand Gen** (e das próximas campanhas) de **"Cliques" → "Conversões"**: aí o
  Google otimiza por **venda de verdade**, não por clique.
- Pra otimizar por **receita total** (ROAS): configurar **valores por conversão** (R$29 / 100 / 250 / 877)
  e, pras vendas que acontecem **fora do site** (WhatsApp/orgânico), usar **importação de conversões offline**.

## Já feito no código (por mim)
- `.env.example` agora documenta **todas** as variáveis do Google Ads (ID, purchase label, checkout label,
  lead label) com os valores e avisos — pra nunca mais sumir.

---

### Resumo de 1 linha
Setar `NEXT_PUBLIC_GADS_PURCHASE_LABEL = Vn61CImjkcccEPDd_p0q` na Vercel + **redeploy** → o Google passa a ver as vendas.
