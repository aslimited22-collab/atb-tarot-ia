-- Migration 0011 — Security hardening + LGPD compliance
--
-- Mudanças:
-- 1. Habilita RLS em `purchases` (gap crítico — qualquer auth user lia tudo)
-- 2. Adiciona policies em `orders` e `readings` (RLS estava ON mas sem policy)
-- 3. Cria tabela `audit_log` pra rastrear eventos LGPD (deletes, exports, logins)
--
-- Service role bypassa RLS, então webhooks Kiwify/Stripe seguem funcionando.

-- ============================================================
-- 1. purchases: RLS + policy
-- ============================================================
alter table if exists public.purchases enable row level security;

drop policy if exists "purchases own data" on public.purchases;
create policy "purchases own data" on public.purchases
  for select using (
    auth.uid() is not null
    and email = (select email from auth.users where id = auth.uid())
  );

-- ============================================================
-- 2. orders: policy faltante (RLS já estava ON em 0007)
-- ============================================================
drop policy if exists "orders own data" on public.orders;
create policy "orders own data" on public.orders
  for select using (
    auth.uid() is not null
    and email = (select email from auth.users where id = auth.uid())
  );

-- ============================================================
-- 3. readings: policy faltante (acessa via order)
-- ============================================================
drop policy if exists "readings via own order" on public.readings;
create policy "readings via own order" on public.readings
  for select using (
    auth.uid() is not null
    and order_id in (
      select id from public.orders
      where email = (select email from auth.users where id = auth.uid())
    )
  );

-- ============================================================
-- 4. audit_log: rastreamento LGPD
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "audit own" on public.audit_log;
create policy "audit own" on public.audit_log
  for select using (user_id = auth.uid());

create index if not exists audit_log_user_id_idx
  on public.audit_log(user_id, created_at desc);

create index if not exists audit_log_event_idx
  on public.audit_log(event, created_at desc);

-- ============================================================
-- 5. Helper: anonimiza dados de cliente em purchases/orders após delete account
--    (mantém registro fiscal mas remove PII — LGPD art. 16 vs obrigação fiscal)
-- ============================================================
create or replace function public.anonymize_user_records(target_email text)
returns void
language plpgsql
security definer
as $$
begin
  -- Anonimiza purchases (mantém registro fiscal)
  update public.purchases
    set email = '[redacted-' || extract(epoch from now())::text || ']',
        name = '[redacted]'
    where lower(email) = lower(target_email);

  -- Anonimiza orders (mantém registro fiscal)
  update public.orders
    set email = '[redacted-' || extract(epoch from now())::text || ']',
        name = '[redacted]',
        phone = null
    where lower(email) = lower(target_email);
end;
$$;

revoke all on function public.anonymize_user_records(text) from public, anon, authenticated;
-- Apenas service_role pode chamar (via createAdminClient no servidor)
