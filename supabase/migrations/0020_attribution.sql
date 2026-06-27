-- 0020_attribution.sql — Atribuição de tráfego (UTM). 100% ADITIVO e reversível.
--
-- Objetivo: medir DE ONDE vem o tráfego (o gargalo do crescimento). Hoje há ZERO
-- atribuição. Esta migration NÃO altera nem apaga nada existente — só cria 1 tabela
-- de eventos e adiciona colunas UTM (nullable) em purchases pra uso futuro.
--
-- Reverter: `drop table public.track_events;` + `alter table public.purchases drop column utm_source ...`.

-- 1) Eventos de tráfego (visita na landing, clique em CTA). Visitor-level, anônimo.
create table if not exists public.track_events (
  id           uuid primary key default gen_random_uuid(),
  visitor_id   text,                 -- id first-party (cookie), anônimo
  event        text not null,        -- 'visit' | 'cta_click'
  plan         text,                 -- plano clicado (quando event='cta_click')
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  referrer     text,
  path         text,
  created_at   timestamptz not null default now()
);

create index if not exists track_events_created_idx  on public.track_events (created_at desc);
create index if not exists track_events_source_idx   on public.track_events (utm_source);
create index if not exists track_events_event_idx    on public.track_events (event);

-- RLS ligado SEM policy pública: só o service-role (server) escreve/lê.
-- O cliente nunca toca a tabela direto — só via POST /api/track (server-side).
alter table public.track_events enable row level security;

-- 2) Colunas UTM aditivas em purchases (preenchidas DEPOIS, quando o webhook passar
--    a gravar a origem — etapa que mexe em caminho de pagamento e precisa do OK do dono).
alter table public.purchases add column if not exists utm_source   text;
alter table public.purchases add column if not exists utm_medium   text;
alter table public.purchases add column if not exists utm_campaign text;
alter table public.purchases add column if not exists utm_content  text;
alter table public.purchases add column if not exists utm_term     text;
alter table public.purchases add column if not exists referrer     text;
