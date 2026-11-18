-- Champs de facturation affichés sur les factures (src/lib/invoice.ts) et
-- éditables dans Admin > Paramètres > Facturation.
-- Run once in Supabase SQL Editor. Tant que ce script n'est pas exécuté,
-- l'onglet Facturation reste en lecture seule et les factures sortent sans ces mentions.

alter table store_settings add column if not exists ninea text;
alter table store_settings add column if not exists rccm text;
alter table store_settings add column if not exists business_address text;
alter table store_settings add column if not exists payment_instructions text;
alter table store_settings add column if not exists payment_link text;
