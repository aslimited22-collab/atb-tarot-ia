# ATB Tarot IA

SaaS MVP full-stack de uma tarologa IA chamada **ATB**. Oferece chat com limite por plano, oráculo diário, diário da ansiedade e guia de vícios — com autenticação Supabase, pagamentos Kiwify e IA via DeepSeek.

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (auth + Postgres + RLS)
- DeepSeek (`deepseek-chat`) com streaming SSE
- Kiwify Webhooks (HMAC SHA-256)
- Tailwind CSS
- Pronto para Vercel

## Setup Local

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

App em `http://localhost:3000`.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Authentication → Providers**, habilite **Email** (com ou sem confirmação).
3. Em **SQL Editor**, cole e rode o arquivo `supabase/migrations/0001_init.sql` (tabelas, RLS, trigger de novo usuário).
4. Copie `URL`, `anon key` e `service_role key` das Settings do projeto para `.env.local`.

## Configuração do Webhook da Kiwify

1. No painel Kiwify, em **Configurações → Webhooks**, crie um webhook:
   - URL: `https://SEU_DOMINIO/api/webhooks/kiwify`
   - Secret: mesmo valor de `KIWIFY_WEBHOOK_SECRET`
   - Eventos: `order.approved`, `order.refunded`, `subscription.canceled`
2. Crie 2 produtos (Basic R$29 / Premium R$59) e copie as URLs de checkout para `NEXT_PUBLIC_KIWIFY_BASIC_URL` e `NEXT_PUBLIC_KIWIFY_PREMIUM_URL`.
3. O mapeamento de plano é feito pelo valor da compra: ≤ R$35 → `basic`; > R$35 → `premium`.
4. Importante: o webhook identifica o usuário pelo **email** da compra — o comprador deve usar o mesmo email do cadastro no site.

## Deploy na Vercel

1. Faça push do repositório para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o projeto.
3. Adicione todas as variáveis de ambiente em **Project → Settings → Environment Variables**.
4. Deploy. Atualize a URL do webhook Kiwify para o domínio final.

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (somente server) |
| `DEEPSEEK_API_KEY` | Chave da API DeepSeek |
| `NEXT_PUBLIC_KIWIFY_BASIC_URL` | URL de checkout do plano Basic |
| `NEXT_PUBLIC_KIWIFY_PREMIUM_URL` | URL de checkout do plano Premium |
| `KIWIFY_WEBHOOK_SECRET` | Secret HMAC do webhook Kiwify |

## Estrutura

```
src/
├── app/             rotas (App Router) + API routes
├── components/      Sidebar, ChatBubble, PlanBadge, UpgradeLock, Skeleton
└── lib/             supabase clients, deepseek wrapper, plans, kiwify
supabase/migrations/ SQL inicial
middleware.ts        protege /dashboard/*
```

## Limites por plano

| Plano | Chat/dia | Oráculo | Diário | Guia Vícios |
|---|---|---|---|---|
| Free | 3 | ✅ | ❌ | ❌ |
| Basic | 20 | ✅ | ✅ | ❌ |
| Premium | ∞ | ✅ | ✅ | ✅ |

## Licença

Projeto privado — ATB Tarot IA.
