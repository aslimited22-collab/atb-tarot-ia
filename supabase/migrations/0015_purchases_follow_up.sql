-- Migration 0015 — Coluna para rastrear emails de resgate enviados
--
-- 51% dos compradores nas últimas semanas pagaram mas não criaram conta OU
-- criaram conta e nunca acessaram o produto. Vamos enviar email automático 24h
-- depois da compra pra resgatar essas vendas.
--
-- Esta coluna garante anti-spam: cada purchase recebe NO MÁXIMO 1 follow-up,
-- mesmo que o cron rode múltiplas vezes ou erros aconteçam.

alter table public.purchases
  add column if not exists follow_up_sent_at timestamptz;

comment on column public.purchases.follow_up_sent_at is
  'Timestamp do email de resgate (anti-spam). Setado pelo cron /api/cron/follow-up.';

-- Index parcial: só pra rows com follow-up ainda não enviado.
-- Acelera a query do cron que filtra por created_at + follow_up_sent_at is null.
create index if not exists purchases_follow_up_pending_idx
  on public.purchases (created_at desc)
  where follow_up_sent_at is null;
