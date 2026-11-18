-- Clés Wave saisies depuis Admin > Paramètres > Paiements, stockées dans Supabase Vault.
-- Prérequis : db/ai-vault.sql déjà exécuté (fonctions get_ai_secret / has_ai_secret / set_ai_secret).
-- Run once in Supabase SQL Editor.
--
-- Seul changement : la liste blanche de set_ai_secret accepte aussi les deux secrets Wave.
-- Les droits restent ceux de ai-vault.sql (service_role uniquement).

create or replace function set_ai_secret(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if p_name not in ('anthropic_api_key', 'groq_api_key', 'wave_api_key', 'wave_webhook_secret') then
    raise exception 'Invalid secret name: %', p_name;
  end if;

  delete from vault.secrets where name = p_name;
  perform vault.create_secret(p_value, p_name);
end;
$$;

revoke all on function set_ai_secret(text, text) from public, anon, authenticated;
