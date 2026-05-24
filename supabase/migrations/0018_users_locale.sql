-- Migration 0018: adicionar coluna locale em users
--
-- S3.1 i18n recovery emails depende dessa coluna. Sem ela, o cron quebrava
-- silenciosamente porque .select("id, locale") retornava erro e o pending=[].
--
-- Default "pt" preserva comportamento atual pro 99% dos clientes BR.
-- Clientes intl podem ter locale "en" ou "es" definido via signup ou admin.

alter table public.users
  add column if not exists locale text default 'pt' check (locale in ('pt','en','es','de','it','ja'));

-- Index pra cron lookups por locale (rare mas barato)
create index if not exists users_locale_idx on public.users (locale) where locale != 'pt';
