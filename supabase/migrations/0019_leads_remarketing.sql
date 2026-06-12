-- Migration 0019: leads (remarketing) + email_optouts (descadastro LGPD)
--
-- Remarketing automático pra quem NÃO concluiu a compra:
--   - Kiwify: carrinho abandonado / Pix gerado não pago / boleto / compra recusada
--     (gatilhos ativados no painel Kiwify apontando pro webhook existente)
--   - Stripe: checkout.session.expired (checkout intl abandonado)
-- O cron /api/cron/remarketing envia 1 e-mail por lead (e 1 por user grátis sem
-- compra), sempre checando email_optouts antes. Quem compra depois é marcado
-- converted_at pelos webhooks de venda (mede a receita recuperada).
--
-- Idempotente: re-rodar sem efeito (IF NOT EXISTS).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,
  -- kiwify_abandoned | kiwify_pix | kiwify_boleto | kiwify_refused | stripe_expired
  source text not null,
  -- Nome do produto como veio no payload (ex: "Limpeza Espiritual com ATB")
  product_label text,
  -- Link pra concluir a compra (Kiwify manda checkout_link no abandono)
  checkout_url text,
  locale text not null default 'pt',
  amount_cents integer,
  -- `${source}:${email}:${yyyy-mm-dd}` (UTC) — 1 lead por pessoa/origem/dia
  dedup_key text not null unique,
  remarketing_sent_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads (email);

-- Index parcial pro cron buscar pendentes (sem e-mail enviado, sem conversão)
create index if not exists leads_pending_idx
  on public.leads (created_at desc)
  where remarketing_sent_at is null and converted_at is null;

-- Descadastro (LGPD): quem pedir pra sair NUNCA mais recebe remarketing.
create table if not exists public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Marcador "remarketing processado" pra contas grátis sem compra (passada B
-- do cron). NULL = ainda não avaliado. Preenchido tanto pra quem recebeu o
-- e-mail quanto pra quem foi pulado (já comprou/optout) — nunca re-escaneia.
alter table public.users add column if not exists remarketing_sent_at timestamptz;

create index if not exists users_remarketing_pending_idx
  on public.users (created_at desc)
  where remarketing_sent_at is null and plan = 'free';

-- RLS ON sem policies = só service_role acessa (mesmo padrão de orders/0007).
alter table public.leads enable row level security;
alter table public.email_optouts enable row level security;
