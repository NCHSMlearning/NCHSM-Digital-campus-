-- Institution-specific registration links, custom-domain resolution, and first-admin bootstrap.
begin;

alter table public.institutions
  add column if not exists first_admin_user_id uuid references auth.users(id) on delete set null,
  add column if not exists first_admin_claimed_at timestamptz;

create unique index if not exists institutions_portal_domain_unique
  on public.institutions (lower(regexp_replace(trim(portal_domain), '^https?://|/+$', '', 'gi')))
  where portal_domain is not null and trim(portal_domain) <> '';

create or replace function public.resolve_institution_registration_code(p_host text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select l.code
  from public.institutions i
  join public.institution_registration_links l on l.institution_id=i.id
  where lower(regexp_replace(regexp_replace(trim(coalesce(i.portal_domain,'')), '^https?://', '', 'i'), '/+$', '')) =
        lower(regexp_replace(split_part(trim(coalesce(p_host,'')),':',1), '/+$', ''))
    and i.status='active' and l.is_active
    and (l.expires_at is null or l.expires_at>now())
    and (l.max_uses is null or l.use_count<l.max_uses)
  order by l.created_at desc limit 1;
$$;
revoke all on function public.resolve_institution_registration_code(text) from public;
grant execute on function public.resolve_institution_registration_code(text) to anon, authenticated;

create or replace function public.assign_new_auth_user_institution()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_code text;
  v_institution_id uuid;
  v_link_id uuid;
  v_admin_email text;
  v_claimed_user uuid;
  v_is_first_admin boolean := false;
begin
  v_code := lower(trim(coalesce(new.raw_user_meta_data->>'institution_code','')));
  if v_code = '' then
    v_code := public.resolve_institution_registration_code(new.raw_user_meta_data->>'portal_host');
  end if;
  select l.id,l.institution_id into v_link_id,v_institution_id
  from public.institution_registration_links l
  join public.institutions i on i.id=l.institution_id
  where lower(l.code)=v_code and l.is_active=true
    and (l.expires_at is null or l.expires_at>now())
    and (l.max_uses is null or l.use_count<l.max_uses)
    and i.status='active'
  order by l.created_at desc limit 1;
  if v_institution_id is null then
    raise warning 'No active institution registration link found for registration request';
    return new;
  end if;
  select admin_email,first_admin_user_id into v_admin_email,v_claimed_user
  from public.institutions where id=v_institution_id for update;
  if v_claimed_user is null and v_admin_email is not null
     and lower(trim(v_admin_email))=lower(trim(new.email)) then
    update public.institutions set first_admin_user_id=new.id,first_admin_claimed_at=now(),updated_at=now()
    where id=v_institution_id and first_admin_user_id is null;
    v_is_first_admin := found;
  end if;
  update public.consolidated_user_profiles_table
  set institution_id=v_institution_id,
      role=case when v_is_first_admin then 'admin' else role end,
      status=case when v_is_first_admin then 'active' else status end,
      updated_at=now()
  where user_id=new.id;
  if v_is_first_admin then
    insert into public.institution_users(institution_id,user_id,role,status)
    values(v_institution_id,new.id,'institution_admin','active')
    on conflict(institution_id,user_id) do update set role='institution_admin',status='active';
  end if;
  update public.institution_registration_links set use_count=use_count+1 where id=v_link_id;
  return new;
end;
$$;
revoke all on function public.assign_new_auth_user_institution() from public, anon, authenticated;

commit;
