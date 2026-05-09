# Checklist Final — atb-tarot-ia

Status do build: ✅ `npm run build` passa · ✅ `npx tsc --noEmit` passa · ✅ zero matches de "tarot" em copy visível.

---

## ✅ Entregue automaticamente

### ETAPA 1 — Auditoria
- `DELIVERY_AUDIT.md` mapeando os 16 pontos de falha silenciosa do pipeline pós-pagamento.

### ETAPA 2 — Entrega blindada
- `src/lib/logger.ts` — logger JSON estruturado (`logInfo`/`logWarn`/`logError`).
- `src/lib/phone.ts` — `toE164BR` + `formatPhoneBR` (máscara BR + normalização).
- `src/lib/zapi.ts` — `sendWhatsAppText` + `buildLimpezaWelcomeMessage` (fail-soft).
- `src/lib/delivery.ts` — `deliverLimpezaOrder` (gera + email + WhatsApp + persiste `delivery_status`).
- `supabase/migrations/0008_add_delivery_status.sql` — colunas `delivery_status`, `delivery_attempts`, `delivery_last_error`, `delivery_email_sent_at`, `delivery_whatsapp_sent_at`.
- `src/app/api/webhooks/stripe/route.ts` — refatorado para usar `deliverLimpezaOrder` + log estruturado em todo passo.
- `src/app/api/webhooks/kiwify/route.ts` — branch V2 Limpeza usa `deliverLimpezaOrder`; agora importa `logInfo`/`logWarn`/`logError` (faltava o import — corrigido).
- `src/app/api/admin/orders/[id]/redeliver/route.ts` — endpoint manual protegido por header `X-Admin-Secret`.
- `scripts/check-pending-deliveries.mjs` — varredura de pedidos pagos sem entrega confirmada nas últimas 72 h.
- `package.json` — script `check:pending` adicionado.

### ETAPA 3 — Reposicionamento espírita (6 idiomas)
- `src/lib/i18n/dict.ts` — `brand`, `hero.*`, `features.chat.desc`, `features.oracle.desc` reescritos em PT/EN/ES/DE/IT/JA.
- `src/app/layout.tsx` — meta `title` + `description`.
- `src/components/Sidebar.tsx` — todas as ocorrências do logo.
- `src/app/page.tsx` — badge hero + footer.
- `src/app/login/page.tsx`, `src/app/cadastro/page.tsx` — H1.
- `src/app/limpeza/page.tsx` — footer.
- `src/app/videochamada/page.tsx` — header + depoimento + FAQ.
- `src/app/dashboard/page.tsx` — descrições dos cards de chat e oráculo.
- `src/app/api/webhooks/kiwify/route.ts` — assinatura nos e-mails de notificação.
- `src/lib/limpeza-v2.ts` — system prompts da V2 Limpeza.
- `src/app/api/oracle/route.ts`, `src/app/api/journal/route.ts`, `src/app/api/addiction/route.ts` — user-prompts de IA não pedem mais "carta de tarot".

### ETAPA 4 — UX 60+
- `src/app/limpeza/LimpezaForm.tsx` — labels de 16 → 18 px; helper de e-mail 13 → 15; **máscara BR ao vivo** + helper "(47) 99999-1234"; mensagem de erro inline 16 px com ícone ⚠️ + `role="alert"`; chips de tema 50 → 64 px de altura, fonte 15 → 17, `role="radio"`/`role="radiogroup"`, contraste maior; selo "Pagamento 100% Seguro" + bandeiras.
- `src/app/limpeza/preview/[orderId]/PreviewClient.tsx` — header da prévia 12 → 14 px, corpo 17 → 19 px, loading hint 15 → 17 px, dots `aria-hidden`.
- `src/app/entrega/[orderId]/EntregaClient.tsx` — bloco "preparando" 17 → 20 px (peso 600) + nova linha "Vai chegar em até 5 minutos. Pode aguardar com calma."; passos 16 → 18 px; CSS adicional `prefers-reduced-motion` para `.typing-dot` + `:focus-visible { outline: 4px solid #f5c860 }`.
- `src/app/obrigado-limpeza/client.tsx` — todos os labels de formulário 16 → 18 px (login + signup pós-pagamento).

---

## ⚠️ Ação manual necessária (humano precisa fazer)

1. **Rodar migration 0008 no Supabase produção**
   - SQL Editor → cole `supabase/migrations/0008_add_delivery_status.sql` → Run.
   - Sem isso, qualquer webhook V2 vai falhar ao gravar `delivery_status`.

2. **Setar `ADMIN_SECRET` na Vercel**
   - `Settings → Environment Variables` → adicionar `ADMIN_SECRET=<string longa aleatória>`.
   - Sem isso o endpoint `/api/admin/orders/[id]/redeliver` retorna 500 ("admin secret not configured").

3. **(Opcional) Setar `ZAPI_*` na Vercel para WhatsApp ativo**
   - `ZAPI_INSTANCE_ID`, `ZAPI_INSTANCE_TOKEN`, `ZAPI_CLIENT_TOKEN`.
   - Sem essas vars, o pipeline pula WhatsApp em silêncio (`zapi_not_configured`) — e-mail e geração continuam normais.

4. **(Opcional) `INTERNAL_GEN_TOKEN`**
   - Token compartilhado entre `deliverLimpezaOrder` e `/api/limpeza/generate`. Se já existe, deixar; senão a geração interna falha com 401.

5. **Inspeção visual** — abrir as 4 telas Limpeza no dev server (`npm run dev`) e confirmar fontes ≥ 20 px no corpo, botões ≥ 64 px, foco visível, contraste alto.

6. **Smoke test do redeliver** após setar `ADMIN_SECRET`:
   ```bash
   curl -X POST https://atbtartot.com/api/admin/orders/<uuid>/redeliver \
        -H "X-Admin-Secret: $ADMIN_SECRET"
   ```

7. **Rodar `npm run check:pending`** após migration 0008 para listar eventuais pedidos travados nas últimas 72 h.

---

## 📝 3 exemplos de copy antes/depois

| Local | Antes | Depois |
|---|---|---|
| `dict.ts` PT `hero.desc` | "Orientação mística, acolhedora e direta — 24 horas por dia. Tarot, ansiedade, relacionamentos e vícios em um só lugar." | "Sessão Espírita Transformadora — acolhedora e direta, 24 horas por dia. Fale com seu Espírito Mentor sobre ansiedade, relacionamentos e vícios." |
| `dict.ts` EN `hero.title_2` | "your Tarot reader" | "your Spirit Guide" |
| `app/page.tsx` badge hero | "✨ TAROT • LIMPEZA ESPIRITUAL • PROTEÇÃO ✨" | "✨ SESSÃO ESPÍRITA • LIMPEZA ESPIRITUAL • PROTEÇÃO ✨" |

---

## 🎨 3 exemplos de UX 60+ antes/depois

| Local | Antes | Depois |
|---|---|---|
| `LimpezaForm.tsx` campo telefone | `<input type="tel">` sem máscara, sem helper, sem feedback de erro | máscara `(47) 99999-1234` ao vivo via `formatPhoneBR`; helper 15 px "Coloque seu WhatsApp com DDD…"; erro inline `role="alert"` 16 px vermelho com ⚠️ quando `toE164BR` rejeita o número |
| `LimpezaForm.tsx` chips de tema | `minHeight: 50px`, `fontSize: 15`, borda 1 px, `gap: 8` | `minHeight: 64px`, `fontSize: 17`, borda 1.5/2.5 px (mais contraste no selecionado), `role="radiogroup"`/`role="radio"`, ícones `aria-hidden` |
| `EntregaClient.tsx` bloco "preparando" | "Sua leitura está sendo preparada…" 17 px + hint 14 px | mensagem 20 px peso 600 + hint 17 px + nova linha "Vai chegar em até 5 minutos. Pode aguardar com calma." 16 px; `@media (prefers-reduced-motion: reduce)` desliga o animação dos dots; `:focus-visible { outline: 4px solid #f5c860 }` em toda a página |
