-- Notifications Telegram (paiements + stock bas) via triggers Postgres.
-- Run once in Supabase SQL Editor. Prérequis :
--   - Extension pg_net activée (Database → Extensions → pg_net)
--   - Vault activé (Database → Extensions → vault), comme pour ai-vault.sql
--
-- Après ce script, créer les secrets (valeurs dans .env.local — TELEGRAM_BOT_TOKEN
-- et TELEGRAM_CHAT_ID_INFO) :
--   select vault.create_secret('<TELEGRAM_BOT_TOKEN>', 'telegram_bot_token');
--   select vault.create_secret('<TELEGRAM_CHAT_ID_INFO>', 'telegram_chat_id_info');
--
-- Principes : une notif ratée ne casse JAMAIS un flux métier (exception → no-op),
-- secrets absents → no-op, envoi asynchrone via pg_net (ne bloque pas la transaction).

create extension if not exists pg_net;

-- 1. Échappement HTML (parse_mode HTML côté Telegram)
create or replace function telegram_escape_html(s text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(coalesce(s, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

-- 2. Encodage URL (texte prérempli des boutons wa.me)
create or replace function telegram_urlencode(s text)
returns text
language sql
immutable
as $$
  select coalesce(string_agg(
    case
      when t.c ~ '[A-Za-z0-9_.~-]' then t.c
      else regexp_replace(upper(encode(convert_to(t.c, 'UTF8'), 'hex')), '(..)', '%\1', 'g')
    end, '' order by t.ord), '')
  from regexp_split_to_table(coalesce(s, ''), '') with ordinality as t(c, ord);
$$;

-- 3. Normalisation numéro pour wa.me : chiffres uniquement, "00" de tête retiré,
--    préfixe 221 si numéro local sénégalais (9 chiffres commençant par 7).
--    NULL si inexploitable.
create or replace function telegram_wa_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if p_phone is null then
    return null;
  end if;
  d := regexp_replace(p_phone, '\D', '', 'g');
  if left(d, 2) = '00' then
    d := substr(d, 3);
  end if;
  if length(d) = 9 and left(d, 1) = '7' then
    d := '221' || d;
  end if;
  if length(d) < 9 then
    return null;
  end if;
  return d;
end;
$$;

-- 4. Montant formaté FCFA
create or replace function telegram_fmt_xof(n numeric)
returns text
language sql
immutable
as $$
  select replace(to_char(coalesce(n, 0), 'FM999,999,999,990'), ',', ' ') || ' F CFA';
$$;

-- 5. Envoi Telegram. No-op si secrets absents. Ne fait jamais échouer l'appelant.
create or replace function telegram_notify(p_text text, p_buttons jsonb default null)
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_token text;
  v_chat text;
  v_body jsonb;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  select decrypted_secret into v_chat from vault.decrypted_secrets where name = 'telegram_chat_id_info' limit 1;
  if v_token is null or v_chat is null then
    return;
  end if;

  v_body := jsonb_build_object(
    'chat_id', v_chat,
    'text', left(p_text, 4096),
    'parse_mode', 'HTML'
  );
  if p_buttons is not null and jsonb_array_length(p_buttons) > 0 then
    v_body := v_body || jsonb_build_object('reply_markup', jsonb_build_object('inline_keyboard', jsonb_build_array(p_buttons)));
  end if;

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body := v_body,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  null;
end;
$$;

-- 6. Trigger paiements : notif uniquement sur TRANSITION de payment_status
--    (anti-doublon garanti par IS DISTINCT FROM, quel que soit le chemin d'écriture :
--    webhook Wave, admin, etc.)
create or replace function orders_payment_telegram_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text;
  v_amount text;
  v_name text;
  v_wa text;
  v_wa_text text;
  v_buttons jsonb;
  v_view jsonb;
begin
  v_ref := upper(left(new.id::text, 8));
  v_amount := telegram_fmt_xof(new.total);
  v_view := jsonb_build_object('text', '🧾 Voir la commande', 'url', 'https://kapitalstores.com/admin/orders/' || new.id::text);

  if new.payment_status = 'paid' then
    v_name := new.shipping_address ->> 'name';
    v_wa := telegram_wa_phone(new.shipping_address ->> 'phone');
    v_buttons := '[]'::jsonb;
    if v_wa is not null then
      v_wa_text := 'Bonjour' || coalesce(' ' || v_name, '') || ','
        || E'\n\n' || 'Nous vous confirmons la bonne réception de votre paiement pour la commande #' || v_ref
        || ' sur Kapital Stores. Elle est dès à présent en cours de préparation.'
        || E'\n\n' || 'Merci de votre confiance,' || E'\n' || 'L''équipe Kapital Stores';
      v_buttons := v_buttons || jsonb_build_object(
        'text', '💬 WhatsApp client',
        'url', 'https://wa.me/' || v_wa || '?text=' || telegram_urlencode(v_wa_text)
      );
    end if;
    v_buttons := v_buttons || v_view;
    perform telegram_notify('💰 Paiement reçu : ' || v_amount || ' (commande #' || v_ref || ')', v_buttons);
  elsif new.payment_status = 'failed' then
    perform telegram_notify('⚠️ Paiement échoué : ' || v_amount || ' (commande #' || v_ref || ')', jsonb_build_array(v_view));
  elsif new.payment_status = 'expired' then
    perform telegram_notify('⚠️ Paiement expiré : ' || v_amount || ' (commande #' || v_ref || ')', jsonb_build_array(v_view));
  end if;

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_orders_payment_telegram on orders;
create trigger trg_orders_payment_telegram
  after update of payment_status on orders
  for each row
  when (new.payment_status is distinct from old.payment_status)
  execute function orders_payment_telegram_trigger();

-- 7. Trigger stock bas : au décrément réel franchissant le seuil (> 10 → ≤ 10),
--    pour éviter une notif à chaque vente une fois le stock déjà bas.
create or replace function products_stock_telegram_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old integer;
  v_new integer;
begin
  v_old := coalesce(old.stock, old.inventory, 0);
  v_new := coalesce(new.stock, new.inventory, 0);
  if v_new < v_old and v_new <= 10 and v_old > 10 then
    perform telegram_notify(
      '📦 Stock bas : ' || telegram_escape_html(new.name) || ' — ' || v_new || ' restant(s)',
      jsonb_build_array(jsonb_build_object('text', '📦 Voir l''inventaire', 'url', 'https://kapitalstores.com/admin/inventory'))
    );
  end if;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_products_stock_telegram on products;
create trigger trg_products_stock_telegram
  after update on products
  for each row
  when (coalesce(new.stock, new.inventory, 0) < coalesce(old.stock, old.inventory, 0))
  execute function products_stock_telegram_trigger();

-- 8. Lock down : personne ne peut déclencher d'envoi via RPC.
revoke all on function telegram_notify(text, jsonb) from public, anon, authenticated;
