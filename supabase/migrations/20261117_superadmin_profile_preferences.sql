-- Persist Super Admin personal preferences in Supabase with strict owner-only access.
create table if not exists public.superadmin_profile_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.superadmin_profile_preferences enable row level security;
revoke all on public.superadmin_profile_preferences from anon, public;
grant select, insert, update on public.superadmin_profile_preferences to authenticated;
drop policy if exists "superadmin_profile_preferences_select_own" on public.superadmin_profile_preferences;
create policy "superadmin_profile_preferences_select_own"
on public.superadmin_profile_preferences for select to authenticated
using (user_id=auth.uid());
drop policy if exists "superadmin_profile_preferences_insert_own" on public.superadmin_profile_preferences;
create policy "superadmin_profile_preferences_insert_own"
on public.superadmin_profile_preferences for insert to authenticated
with check (user_id=auth.uid());
drop policy if exists "superadmin_profile_preferences_update_own" on public.superadmin_profile_preferences;
create policy "superadmin_profile_preferences_update_own"
on public.superadmin_profile_preferences for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
