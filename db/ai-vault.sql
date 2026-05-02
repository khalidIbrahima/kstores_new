-- AI provider switch + Vault-based key storage.
-- Run once in Supabase SQL Editor. Vault must be enabled (Database → Extensions → vault).

-- 1. Provider preference column on store_settings
alter table store_settings
  add column if not exists ai_provider text default 'groq';

-- 2. Helper: read a Vault secret. Service-role only (revoked from anon/authenticated).
create or replace function get_ai_secret(p_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
$$;

-- 3. Helper: create or replace a Vault secret. Whitelisted names only.
create or replace function set_ai_secret(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if p_name not in ('anthropic_api_key', 'groq_api_key') then
    raise exception 'Invalid secret name: %', p_name;
  end if;

  delete from vault.secrets where name = p_name;
  perform vault.create_secret(p_value, p_name);
end;
$$;

-- 4. Helper: check whether a Vault secret exists (without revealing the value).
create or replace function has_ai_secret(p_name text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists(select 1 from vault.secrets where name = p_name);
$$;

-- 5. Lock down: only service_role can call these RPCs.
revoke all on function get_ai_secret(text) from public, anon, authenticated;
revoke all on function set_ai_secret(text, text) from public, anon, authenticated;
revoke all on function has_ai_secret(text) from public, anon, authenticated;
