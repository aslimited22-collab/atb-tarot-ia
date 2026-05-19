-- Migration 0013 — Decremento atômico de chat_credits_balance
--
-- Problema: `update users set chat_credits_balance = X - 1` com X lido antes é
-- não-atômico. Duas requests paralelas podiam ler X=3 e ambas escrever 2,
-- gastando só 1 crédito (cliente ganha pergunta de graça) ou perdendo crédito
-- duas vezes (cliente perde dinheiro).
--
-- Fix: SQL `update ... set X = X - 1` é atômico no Postgres. Encapsulamos em RPC
-- para chamar via supabase.rpc() sem precisar de raw SQL no client.

create or replace function public.decrement_chat_credit(p_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  new_balance int;
begin
  update public.users
    set chat_credits_balance = greatest(0, chat_credits_balance - 1)
    where id = p_user_id
    returning chat_credits_balance into new_balance;
  return new_balance;
end;
$$;

-- Apenas service_role pode chamar (via createAdminClient no servidor)
revoke all on function public.decrement_chat_credit(uuid) from public, anon, authenticated;
