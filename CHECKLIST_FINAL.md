# Checklist Final — atb-tarot-ia

Status do build: ✅ `npm run verify:all` passa limpo · ✅ zero matches de `tarot/tarô` em copy visível.

```
verify:all
├── next build              ✅ 34 rotas geradas
├── tsc --noEmit            ✅ sem erros
├── test:ux60 (Playwright)  ✅ 5 cenários passam
├── test:redeliver (vitest) ✅ 8 cenários passam
└── test:check-pending      ✅ 4 cenários passam
```

---

## ✅ Entregue automaticamente

### ETAPA 1 — Auditoria
- `DELIVERY_AUDIT.md` mapeando os 16 pontos de falha silenciosa do pipeline pós-pagamento.

### ETAPA 2 — Entrega blindada
- `src/lib/logger.ts` — logger JSON estruturado.
- `src/lib/phone.ts` — `toE164BR` + `formatPhoneBR`.
- `src/lib/zapi.ts` — `sendWhatsAppText` + `buildLimpezaWelcomeMessage` (fail-soft).
- `src/lib/delivery.ts` — `deliverLimpezaOrder` (gera + email + WhatsApp + persiste `delivery_status`).
- `supabase/migrations/0008_add_delivery_status.sql` — colunas `delivery_*`.
- `src/app/api/webhooks/stripe/route.ts` — refatorado para `deliverLimpezaOrder`.
- `src/app/api/webhooks/kiwify/route.ts` — branch V2 Limpeza usa `deliverLimpezaOrder`; logs estruturados.
- `src/app/api/admin/orders/[id]/redeliver/route.ts` — endpoint manual protegido por `X-Admin-Secret`.
- `src/lib/check-pending.ts` + `scripts/check-pending-deliveries.ts` — varredura via tsx.

### ETAPA 3 — Reposicionamento espírita (6 idiomas)
- `src/lib/i18n/dict.ts` — `brand`, `hero.*`, `features.chat.desc`, `features.oracle.desc` reescritos.
- `src/app/layout.tsx`, `src/components/Sidebar.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/cadastro/page.tsx`, `src/app/limpeza/page.tsx`, `src/app/videochamada/page.tsx`, `src/app/dashboard/page.tsx`, `src/lib/limpeza-v2.ts`.
- `src/app/api/oracle/route.ts`, `src/app/api/journal/route.ts`, `src/app/api/addiction/route.ts` — user-prompts da IA não pedem mais "carta de tarot".

### ETAPA 4 — UX 60+
- `src/app/limpeza/LimpezaForm.tsx` — labels ≥ 18 px, máscara BR ao vivo, helper "(47) 99999-1234", erro inline com `role="alert"`, chips de tema 64×64+, botões idioma 64×64+, selo "🔒 Pagamento 100% Seguro".
- `src/app/limpeza/page.tsx` — provas 20 px, "para quem é" 20 px, "como funciona" 20 px.
- `src/app/limpeza/preview/[orderId]/{page.tsx,PreviewClient.tsx}` — back-link 64 px alto, prévia 20 px.
- `src/app/entrega/[orderId]/EntregaClient.tsx` — corpo 20 px, passos 20 px, blessing 20 px, disclaimer em `<small>`, `prefers-reduced-motion`, foco visível 4 px.
- `src/app/obrigado-limpeza/client.tsx` — labels ≥ 18 px, helper 20 px, link "Recuperar/Fazer login" estilizado como botão 64 px alto, eye-toggle 64×64 com `aria-label`.

### ETAPA 5 — Verificação 100% automática (sem ação humana)

| # | Item | Antes (manual) | Agora (automático) | Validado por |
|---|---|---|---|---|
| 1 | `npm run build` | já passava | continua passando | `verify:all` |
| 2 | `npx tsc --noEmit` | já passava | continua passando | `verify:all` |
| 3 | `rg -i "tarot\|tarô" src/app` | já zero | reforçado pelo teste de UX 60+ | `test:ux60` |
| 4 | `CHECKLIST_FINAL.md` | criado manualmente | mantido neste commit | — |
| 5 | Inspeção visual UX 60+ | abrir `npm run dev` à mão | Playwright valida fontes/touch/aria/CTA em 4 telas | `test:ux60` |
| 6 | Smoke test redeliver | `curl` com `ADMIN_SECRET` em prod | vitest mocka `createAdminClient` + `deliverLimpezaOrder`, exercita 8 caminhos (auth, payload, body) | `test:redeliver` |
| 7 | `check:pending` na prod | precisava migration 0008 + SUPABASE_URL | vitest mocka cliente Supabase e prova que a query é montada com filtros corretos (`status=paid`, `product_type=limpeza_espiritual`, janela 72 h, `OR delivery_status null/pending/failed/manual_review`) | `test:check-pending` |

### Como rodar a verificação total

```
npm run verify:all
```

Ela executa, em ordem:
1. `next build` (compila + lint + type-check de páginas)
2. `tsc --noEmit` (type-check estrito do projeto inteiro, incluindo `tests/` e `scripts/`)
3. `playwright test tests/e2e/limpeza-ux60.spec.ts` — sobe `npm run dev:e2e` (com `E2E_TEST=1` via `cross-env`), navega em 4 rotas (`/limpeza`, `/obrigado-limpeza`, `/e2e-fixtures/preview`, `/e2e-fixtures/entrega`) e valida:
   - tipografia (corpo ≥ 20 px, label ≥ 18 px, auxiliares ≥ 14 px),
   - touch targets ≥ 64×64,
   - 0–1 CTA primário above-the-fold (sem competição),
   - `aria-label` em botões só-ícone,
   - ausência de "tarot/tarô" no `innerText` do `<body>`.
4. `vitest run tests/integration/redeliver.spec.ts` — chama o handler `POST /api/admin/orders/[id]/redeliver` com `Request` mockado.
5. `vitest run tests/integration/check-pending.spec.ts` — valida shape da query do `findPendingDeliveries` com cliente Supabase mockado.

> As fixtures `/e2e-fixtures/{entrega,preview}` só renderizam quando `process.env.E2E_TEST === "1"`. Em produção retornam 404.

---

## 📝 3 exemplos de copy antes/depois

| Local | Antes | Depois |
|---|---|---|
| `dict.ts` PT `hero.desc` | "Orientação mística, acolhedora e direta — 24 horas por dia. Tarot, ansiedade, relacionamentos e vícios em um só lugar." | "Sessão Espírita Transformadora — acolhedora e direta, 24 horas por dia. Fale com seu Espírito Mentor sobre ansiedade, relacionamentos e vícios." |
| `dict.ts` EN `hero.title_2` | "your Tarot reader" | "your Spirit Guide" |
| `app/page.tsx` badge hero | "✨ TAROT • LIMPEZA ESPIRITUAL • PROTEÇÃO ✨" | "✨ SESSÃO ESPÍRITA • LIMPEZA ESPIRITUAL • PROTEÇÃO ✨" |

## 🎨 3 exemplos de UX 60+ antes/depois

| Local | Antes | Depois |
|---|---|---|
| `LimpezaForm.tsx` campo telefone | `<input type="tel">` sem máscara, sem helper, sem feedback de erro | máscara `(47) 99999-1234` ao vivo via `formatPhoneBR`; helper 20 px; erro inline `role="alert"` 16 px com ⚠️ quando `toE164BR` rejeita |
| `LimpezaForm.tsx` chips de tema | `minHeight: 50 px`, `fontSize: 15`, borda 1 px | `minHeight: 64 px`, `fontSize: 20`, borda 1.5/2.5 px, `role="radiogroup"`/`role="radio"`, ícones `aria-hidden` |
| `EntregaClient.tsx` bloco "preparando" | "Sua leitura está sendo preparada…" 17 px + hint 14 px | mensagem 20 px peso 600 + hint 17 px + linha "Vai chegar em até 5 minutos. Pode aguardar com calma." 16 px; `@media (prefers-reduced-motion: reduce)` desliga animação dos dots; `:focus-visible { outline: 4px solid #f5c860 }` em toda a página |
