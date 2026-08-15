-- 0021_purchases_gclid.sql — click-id do Google Ads em purchases. 100% ADITIVO.
--
-- Continuação da 0020 (que já trouxe utm_source/medium/campaign/content/term em
-- purchases, mas não gclid — Kiwify não reconhece "gclid" como param nativo deles,
-- só src/sck/utm_*/s1/s2/s3). Guardamos gclid/gbraid/wbraid pra permitir upload
-- server-side de conversão pro Google Ads (T1), independente do pixel client-side.
--
-- Reverter: `alter table public.purchases drop column gclid, drop column gbraid, drop column wbraid;`

alter table public.purchases add column if not exists gclid  text;
alter table public.purchases add column if not exists gbraid text;
alter table public.purchases add column if not exists wbraid text;

create index if not exists purchases_gclid_idx on public.purchases (gclid) where gclid is not null;
