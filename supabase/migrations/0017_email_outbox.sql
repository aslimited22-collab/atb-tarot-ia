-- Migration 0017: email_outbox — fila de emails com retry exponencial
--
-- Antes: sendCustomerEmailWithLog disparava direto pro Resend. Se Resend falhava
-- (validation_error, domain not verified, quota, network), o email sumia silenciosamente.
-- Cron follow-up cobre 4h+ depois, mas welcome email imediato ficava perdido.
--
-- Agora: toda send vira enqueue. Worker (cron email-retry) processa com backoff:
--   1ª try imediata, 2ª 1min, 3ª 5min, 4ª 30min, 5ª 2h, 6ª 6h, depois desiste.
--
-- Idempotente: re-rodar sem efeito (defaults seguros, IF NOT EXISTS).

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  -- Destinatário
  to_email text not null,
  -- Conteúdo
  subject text not null,
  html text not null,
  -- Metadata pra debugging
  scope text not null,
  ref_id text,
  -- Estado de tentativas
  attempts integer not null default 0,
  next_try_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  resend_id text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index principal pro worker buscar próximos a tentar
create index if not exists email_outbox_pending_idx
  on public.email_outbox (next_try_at asc)
  where sent_at is null and attempts < 6;

-- Index pra admin dashboard filtrar por status
create index if not exists email_outbox_status_idx
  on public.email_outbox (created_at desc, sent_at);

-- Trigger pra updated_at automático
create or replace function public.email_outbox_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_outbox_updated_at on public.email_outbox;
create trigger email_outbox_updated_at
  before update on public.email_outbox
  for each row execute function public.email_outbox_set_updated_at();
