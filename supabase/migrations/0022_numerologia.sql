-- 0022_numerologia.sql — produto "Numerologia" R$45. 100% ADITIVO.
--
-- O produto reusa as tabelas orders (product_type='numerologia') + readings.
-- Única coluna nova: marca de quando o e-mail de cobrança de dados foi enviado
-- (cron /api/cron/numerologia-dados cobra nome+nascimento 1h após o pagamento
-- e usa esta coluna pra não re-spammar a cliente).
--
-- Reverter: `alter table public.orders drop column data_request_sent_at;`

alter table public.orders add column if not exists data_request_sent_at timestamptz;

-- Busca do cron: pedidos pagos de numerologia ainda sem data de nascimento.
create index if not exists orders_numerologia_pending_data_idx
  on public.orders (created_at)
  where product_type = 'numerologia' and birth_date is null;
