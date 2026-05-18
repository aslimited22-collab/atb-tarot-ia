-- 0012_chat_credits.sql
-- Saldo de "perguntas avulsas" (créditos one-time) no chat ATB.
-- Independente do messages_month (que é cota mensal do plano basic/premium).
--
-- Produtos relacionados:
--   pergunta1 (R$14,90) → +1 crédito
--   pergunta3 (R$19,90) → +3 créditos
--   pergunta7 (R$39,90) → +7 créditos
--
-- Webhook Kiwify/Stripe faz `chat_credits_balance += N` ao confirmar pagamento.
-- /api/chat decrementa 1 a cada resposta completa da ATB (antes de cair na cota mensal do plano).

alter table public.users
  add column if not exists chat_credits_balance integer not null default 0;

alter table public.users
  add column if not exists chat_credits_total_purchased integer not null default 0;

comment on column public.users.chat_credits_balance is
  'Saldo de perguntas avulsas (one-time). Decrementa 1 a cada resposta da ATB no /api/chat.';

comment on column public.users.chat_credits_total_purchased is
  'Total histórico de créditos comprados (auditoria — não decrementa). Útil pra detectar fraude/refund.';
