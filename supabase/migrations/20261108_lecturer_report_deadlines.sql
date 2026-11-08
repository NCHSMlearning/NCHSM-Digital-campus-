-- NCHSM Digital Campus: lecturer teaching-portfolio deadlines
-- Apply in Supabase SQL Editor before using the deadline manager.
create table if not exists public.lecturer_report_deadlines (
  id uuid primary key default gen_random_uuid(),
  school text not null check (school in ('Nursing','TVET')),
  document_type text null,
  unit_code text null,
  due_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists lecturer_report_deadlines_school_due_idx
  on public.lecturer_report_deadlines (school, due_at);
create index if not exists lecturer_report_deadlines_unit_idx
  on public.lecturer_report_deadlines (unit_code) where unit_code is not null;

alter table public.lecturer_report_deadlines enable row level security;

drop policy if exists "Super admins manage lecturer report deadlines"
  on public.lecturer_report_deadlines;
create policy "Super admins manage lecturer report deadlines"
  on public.lecturer_report_deadlines
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.consolidated_user_profiles_table p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) in ('super_admin','superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.consolidated_user_profiles_table p
      where p.user_id = auth.uid()
        and lower(coalesce(p.role, '')) in ('super_admin','superadmin')
    )
  );

grant select, insert, update, delete on public.lecturer_report_deadlines to authenticated;


-- School-specific academic scope for deadline scheduling.
alter table public.lecturer_report_deadlines
  add column if not exists program text null,
  add column if not exists term text null,
  add column if not exists block text null,
  add column if not exists academic_year text null,
  add column if not exists unit_name text null;

create index if not exists lecturer_report_deadlines_scope_idx
  on public.lecturer_report_deadlines (school, program, block, term, due_at);
