-- Enforce institution boundaries on tenant-owned application data.
-- Applied to Supabase project lwhtjozfsmbyihenfunw on 2026-11-18.

begin;

create or replace function private.has_active_institution_access(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select
    p_institution_id is not null
    and auth.uid() is not null
    and (
      public.is_current_user_superadmin()
      or exists (
        select 1
        from public.institution_users iu
        where iu.user_id = auth.uid()
          and iu.institution_id = p_institution_id
          and lower(coalesce(iu.status, '')) = 'active'
      )
    );
$$;

revoke all on function private.has_active_institution_access(uuid) from public;
grant execute on function private.has_active_institution_access(uuid) to authenticated;

-- Remove permissive policies that bypass intended ownership/role checks.
drop policy if exists authenticated_read_all on public.consolidated_user_profiles_table;
drop policy if exists "Enable authenticated access for student_marks" on public.student_marks;

drop policy if exists "Allow authenticated delete" on public.finance_student_accounts;
drop policy if exists "Allow authenticated insert" on public.finance_student_accounts;
drop policy if exists "Allow authenticated update" on public.finance_student_accounts;
drop policy if exists "Allow public read access" on public.finance_student_accounts;

drop policy if exists "Allow insert for authenticated users" on public.resources;
drop policy if exists "Authenticated users can insert resources" on public.resources;
drop policy if exists "Authenticated users can update resources" on public.resources;
drop policy if exists "Authenticated users can view resources" on public.resources;
drop policy if exists "Student can view resources" on public.resources;
drop policy if exists "Students can view resources" on public.resources;

drop policy if exists "All: Read Messages" on public.messages;

drop policy if exists "Admins can manage announcements" on public.announcements;
drop policy if exists "Anyone can view active announcements" on public.announcements;

drop policy if exists anon_can_view_attendance on public.attendance;

drop policy if exists allow_insert on public.classes;
drop policy if exists allow_select on public.classes;
drop policy if exists allow_update on public.classes;
drop policy if exists legacy_anon_public_read on public.classes;

-- Restrictive policies are ANDed with existing role/ownership policies.
-- This preserves legitimate role-specific rules while enforcing tenant ownership.
do $$
declare
  t text;
  tenant_tables text[] := array[
    'announcements','attendance','cats','classes',
    'consolidated_user_profiles_table','courses','exam_attempts',
    'finance_student_accounts','geo_attendance_logs','messages',
    'resources','scheduled_sessions','student_marks',
    'student_unit_registrations','support_tickets','user_documents'
  ];
begin
  foreach t in array tenant_tables loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='institution_id'
    ) then
      execute format('drop policy if exists tenant_membership_boundary on public.%I', t);
      execute format(
        'create policy tenant_membership_boundary on public.%I as restrictive for all to authenticated using (private.has_active_institution_access(institution_id)) with check (private.has_active_institution_access(institution_id))',
        t
      );
      execute format('drop policy if exists tenant_anon_deny on public.%I', t);
      execute format(
        'create policy tenant_anon_deny on public.%I as restrictive for all to anon using (false) with check (false)',
        t
      );
    end if;
  end loop;
end $$;

-- Keep student marks private to the student until published; institution staff
-- may access marks for their own institution. Existing Super Admin permission gates remain.
drop policy if exists student_marks_student_read_published on public.student_marks;
create policy student_marks_student_read_published
on public.student_marks for select to authenticated
using (student_id = auth.uid() and coalesce(published,false) = true);

drop policy if exists student_marks_staff_read on public.student_marks;
create policy student_marks_staff_read
on public.student_marks for select to authenticated
using (exists (
  select 1 from public.consolidated_user_profiles_table p
  where p.user_id = auth.uid()
    and lower(trim(coalesce(p.role,''))) in ('admin','lecturer','nursing_hod','hod')
));

drop policy if exists student_marks_staff_insert on public.student_marks;
create policy student_marks_staff_insert
on public.student_marks for insert to authenticated
with check (exists (
  select 1 from public.consolidated_user_profiles_table p
  where p.user_id = auth.uid()
    and lower(trim(coalesce(p.role,''))) in ('admin','lecturer','nursing_hod','hod')
));

drop policy if exists student_marks_staff_update on public.student_marks;
create policy student_marks_staff_update
on public.student_marks for update to authenticated
using (exists (
  select 1 from public.consolidated_user_profiles_table p
  where p.user_id = auth.uid()
    and lower(trim(coalesce(p.role,''))) in ('admin','lecturer','nursing_hod','hod')
))
with check (exists (
  select 1 from public.consolidated_user_profiles_table p
  where p.user_id = auth.uid()
    and lower(trim(coalesce(p.role,''))) in ('admin','lecturer','nursing_hod','hod')
));

-- Administrative authorization must come from the protected profile table,
-- never user-editable auth metadata.
create or replace function public.is_admin_or_superadmin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.consolidated_user_profiles_table p
    where p.user_id = auth.uid()
      and lower(trim(coalesce(p.role, ''))) in ('admin','superadmin','super_admin')
  );
$$;
revoke all on function public.is_admin_or_superadmin() from public;
grant execute on function public.is_admin_or_superadmin() to authenticated;

commit;
