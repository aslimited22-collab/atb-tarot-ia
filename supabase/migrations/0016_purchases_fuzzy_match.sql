-- Migration 0016: adicionar coluna fuzzy_matched em purchases
--
-- Marca purchases que foram linkadas a um user via fuzzy match (não exact email).
-- Útil pra auditoria: se cliente reclamar "não vi a compra", verificar essa flag
-- e o user_id pra entender se houve mismatch silencioso.
--
-- A coluna é nullable + default false (idempotente, seguro pra re-rodar).

alter table public.purchases
  add column if not exists fuzzy_matched boolean default false;

-- Index pra dashboard de monitoramento (admin pode filtrar "todos os fuzzy do mês")
create index if not exists purchases_fuzzy_matched_idx
  on public.purchases (created_at desc)
  where fuzzy_matched = true;
