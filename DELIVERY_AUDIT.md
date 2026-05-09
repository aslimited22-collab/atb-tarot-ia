# Audit do Fluxo de Entrega da Limpeza Espiritual (V2)

Read-only. Snapshot em `master` antes de qualquer correção.

## 1. Mapa do fluxo atual pós-pagamento

```
[Cliente paga] → Kiwify ou Stripe webhook
     │
     ├── Stripe (src/app/api/webhooks/stripe/route.ts:71)
     │     └── checkout.session.completed
     │           ├── verifica order_id em metadata/client_reference_id
     │           ├── UPDATE orders SET status='paid', payment_id, payment_provider='stripe'
     │           ├── INSERT purchases (espelho admin)
     │           ├── fetch interno → /api/limpeza/generate (com X-Internal-Token)
     │           └── Resend email com link /entrega/{orderId}
     │
     └── Kiwify (src/app/api/webhooks/kiwify/route.ts:138)
           └── order.approved + isUuid(external_reference)
                 ├── UPDATE orders SET status='paid', payment_id
                 ├── INSERT purchases
                 ├── fetch interno → /api/limpeza/generate
                 └── Resend email com link /entrega/{orderId}

[Cliente abre /entrega/{orderId}] (src/app/entrega/[orderId]/page.tsx)
     ├── Server lê orders + readings
     ├── Se status=paid + reading.full_text vazio
     │     → EntregaClient dispara POST /api/limpeza/generate (poll a cada 5s)
     └── /api/limpeza/generate (src/app/api/limpeza/generate/route.ts:18)
           ├── checa orders.status === 'paid'
           ├── checa readings.full_text já existe → retorna cache
           ├── chama generateFullReading() em src/lib/limpeza-v2.ts:48
           │     └── DeepSeek (deepseekComplete em src/lib/deepseek.ts) com FULL_SYSTEM prompt
           └── INSERT/UPDATE readings com full_text + full_json
```

## 2. Captura/validação de telefone e email

| Campo | Onde | Validação | Status |
|---|---|---|---|
| `email` | `/api/limpeza/preview/route.ts:43` | `validateEmail()` (formato + MX whitelist) | ✅ |
| `phone` | `/api/limpeza/preview/route.ts:78` | `safePhone()` strip + len ≥ 8 | ⚠️ Sem normalização E.164 |
| `phone` no webhook Stripe | NÃO LÊ | — | ❌ Stripe Checkout NÃO coleta phone por padrão |
| `phone` no webhook Kiwify | NÃO LÊ | — | ❌ Kiwify customer.phone não é capturado |

## 3. Entrega do conteúdo: como o cliente recebe

| Canal | Implementado? | Onde |
|---|---|---|
| **Email Resend** | ✅ | `kiwify/route.ts:240` e `stripe/route.ts:156` — link para `/entrega/{orderId}` |
| **WhatsApp / Z-API** | ❌ NÃO EXISTE | grep por `zapi`/`z-api`/`z_api`/`wapi` retorna 0 ocorrências de **integração** (apenas links `wa.me/...` em landing) |
| **Página /entrega** | ✅ | `src/app/entrega/[orderId]/page.tsx` — cliente clica e vê leitura |

**🔴 CRÍTICO:** A landing e os emails prometem entrega, mas o único canal real de notificação é o **email Resend**. O texto V1 do dict.ts diz "Vai chegar no seu WhatsApp" — **promessa que o sistema não cumpre**.

## 4. Pontos de falha silenciosa

### 🔴 CRÍTICOS (bloqueiam entrega)

1. **`stripe/route.ts:123-136`** — `try { fetch /api/limpeza/generate } catch {}` engolido sem log. Se a geração falhar, **nada é registrado** e o cliente abre `/entrega` e fica em poll infinito.

2. **`stripe/route.ts:139-171`** — `try { resend.emails.send } catch {}` idem. Se Resend falhar (quota, domínio bloqueado, email inválido), **cliente nunca recebe link**.

3. **`kiwify/route.ts:170-184`** — mesmo padrão de `try {} catch {}` engolindo erro.

4. **`kiwify/route.ts:188-211`** — `try { resend } catch {}` idem.

5. **`generate/route.ts:122-128`** — sucesso retorna 200 mesmo se `INSERT readings` falhar (não há check em `await admin.from('readings').insert(...)` — Supabase devolve `{error}` que é ignorado).

6. **Sem retry/fila**: se o `fetch` interno do webhook → generate falhar (timeout 60s? região cold start?), **não há reprocessamento**. Cliente paga, webhook responde 200, mas leitura nunca é gerada.

### 🟡 MÉDIOS (degradam entrega)

7. **Phone sem E.164**: `safePhone()` em `preview/route.ts:21-25` só faz strip — não normaliza para `+5511999999999`. Se quiser integrar Z-API, qualquer número fica errado.

8. **`generate/route.ts:33-37`** — query `await admin.from('orders').select(...)` retorna `{data, error}` mas só checa `data`. Se houver erro de DB, cai no `if (!order)` e mostra "Pedido não encontrado" — **diagnostico errado**.

9. **`webhook stripe:89-93`** — `select('id, status, email, name, product_type')` mas **NÃO seleciona `phone`**. Se phone foi capturado no preview, o webhook não tem acesso a ele.

10. **Sem campo `delivery_status` na tabela `orders`** (migration 0007 não tem). Não há como rastrear "email enviado", "Z-API enviado", "tentativas".

11. **Webhook não é idempotente em ALL casos**: se cair no meio entre `update orders` e `INSERT purchases`, próxima retry insere 2 rows em `purchases` (não há unique constraint em `kiwify_order_id`).

12. **Sem worker/cron** para reprocessar pedidos travados. Se o `fetch interno` falhar, ninguém percebe.

### 🟢 MELHORIAS (hardening)

13. **Sem validação de retorno do `Resend.send()`** — método retorna `{data, error}`. Erros não checados.
14. **Sem rate limit em `/api/limpeza/generate`** (chamada cliente). Pode ser usada como burner de DeepSeek.
15. **`fetch` interno usa `host` do header** (`req.headers.get("host")`) — em casos de proxy reverso pode resolver errado.
16. **Email HTML sem fallback texto puro** (anti-spam Gmail).

## 5. Schema atual (migration 0007 aplicada?)

```sql
-- supabase/migrations/0007_add_orders_readings.sql
CREATE TABLE orders (
  id uuid, name, email, phone, birth_date, sign, locale,
  theme, question,
  amount integer, currency, status, product_type, payment_provider,
  checkout_url, payment_id,
  created_at, updated_at
);

CREATE TABLE readings (
  id uuid, order_id uuid UNIQUE,
  preview_text, full_text, full_json,
  language, model_used, generation_status, error_message,
  created_at, updated_at
);
```

**Faltam para diagnóstico/retry:**
- `orders.delivery_status` (`pending` | `email_sent` | `whatsapp_sent` | `failed`)
- `orders.delivery_attempts` (int)
- `orders.delivery_last_error` (text)
- `orders.delivery_last_attempt_at` (timestamptz)
- (sem tabela de log estruturada)

## 6. Hipótese mais provável dos 2 clientes "perdidos"

Em ordem de probabilidade:

1. **Resend falhou silenciosamente** (try/catch sem log). Cliente pagou, webhook respondeu 200 ao Stripe/Kiwify, mas email nunca chegou. Cliente não sabe que precisa abrir um link `/entrega/{orderId}` porque nem foi notificado.

2. **`fetch` interno → `/api/limpeza/generate` deu timeout** em cold start. Sem retry, leitura nunca foi gerada. Mesmo se cliente abrir `/entrega/{id}`, vai ficar em poll porque `status=paid` mas `readings` não tem row.

3. **Webhook nunca chegou** — Stripe/Kiwify têm endpoint configurado errado ou `STRIPE_WEBHOOK_SECRET` divergente da Vercel. Sem `delivery_log` não dá pra distinguir.

## 7. O que está sendo corrigido nesta sessão

Veja `CHECKLIST_FINAL.md` ao fim. Resumo:
- Migration 0008 adiciona `phone`, `delivery_status`, `delivery_attempts`, `delivery_last_error`
- Logging estruturado em ambos webhooks
- Helper Z-API (`src/lib/zapi.ts`) — fail-soft se envs ausentes
- Helper E.164 (`src/lib/phone.ts`)
- Endpoint admin de redelivery: `/api/admin/orders/[id]/redeliver`
- Script `scripts/check-pending-deliveries.ts`

**Não corrige sem ação manual:**
- Configurar Z-API instance + token na Vercel
- Validar que `STRIPE_WEBHOOK_SECRET` está correto
- Verificar logs Resend (rate, domínio bloqueado)
