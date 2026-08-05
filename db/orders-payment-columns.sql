-- Colonnes de paiement sur orders, attendues par /api/wave/webhook et par les
-- triggers Telegram (db/telegram-notifications.sql). Absentes du schéma initial :
-- sans elles, le webhook Wave échoue à chaque mise à jour de commande.
-- Run once in Supabase SQL Editor (appliqué le 2026-08-05).

alter table orders add column if not exists payment_status text;
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists wave_checkout_id text;
alter table orders add column if not exists updated_at timestamptz;
