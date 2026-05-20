-- Migration 0014 — campos pra Super Numerologia
--
-- Cliente do plano Premium (R$250/mês) tem acesso à Super Numerologia que
-- calcula mapa numerológico pessoal (número do destino, alma, expressão,
-- ano pessoal). Pra isso precisamos do nome completo + data de nascimento.
--
-- Os 6 números da sorte do dia já existem (gerados por user_id apenas).
-- Estes campos novos habilitam o mapa pessoal mais profundo.

alter table public.users
  add column if not exists full_name text,
  add column if not exists birth_date date;

comment on column public.users.full_name is
  'Nome completo do usuário (para cálculo de numerologia pessoal).';

comment on column public.users.birth_date is
  'Data de nascimento (formato date). Usado pelo cálculo de Número do Destino e Ano Pessoal.';
