-- Supporting tables for Teaching & Learning compliance, document versioning and backup history.
create table if not exists public.lecturer_report_requirements (
 id uuid primary key default gen_random_uuid(),
 school text not null check (school in ('Nursing','TVET')),
 program text, intake_year text not null, block text, term text,
 document_type text not null, unit_code text, unit_name text, due_at timestamptz,
 is_required boolean not null default true,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists lecturer_report_requirements_scope_idx on public.lecturer_report_requirements(school,program,intake_year,block,term,document_type);
create table if not exists public.lecturer_report_document_versions (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.lecturer_report_submissions(id) on delete cascade,
 attachment_id uuid references public.lecturer_report_attachments(id) on delete set null,
 version_number integer not null, file_name text not null, storage_path text not null,
 mime_type text, file_size bigint,
 uploaded_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(submission_id,version_number)
);
create index if not exists lecturer_report_document_versions_submission_idx on public.lecturer_report_document_versions(submission_id,version_number desc);
create table if not exists public.lecturer_report_backup_history (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), backup_file_name text not null,
 backup_format text not null default 'json', record_counts jsonb not null default '{}'::jsonb,
 attachment_count integer not null default 0, attachment_bytes bigint not null default 0,
 attachment_failures jsonb not null default '[]'::jsonb,
 checksum text, status text not null default 'completed' check(status in ('completed','partial','failed'))
);
create index if not exists lecturer_report_backup_history_created_idx on public.lecturer_report_backup_history(created_at desc);
alter table public.lecturer_report_requirements enable row level security;
alter table public.lecturer_report_document_versions enable row level security;
alter table public.lecturer_report_backup_history enable row level security;
drop policy if exists "Super admins manage lecturer report requirements" on public.lecturer_report_requirements;
create policy "Super admins manage lecturer report requirements" on public.lecturer_report_requirements for all to authenticated
using (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin')))
with check (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin')));
drop policy if exists "Super admins manage lecturer report document versions" on public.lecturer_report_document_versions;
create policy "Super admins manage lecturer report document versions" on public.lecturer_report_document_versions for all to authenticated
using (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin')))
with check (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin')));
drop policy if exists "Super admins manage lecturer report backup history" on public.lecturer_report_backup_history;
create policy "Super admins manage lecturer report backup history" on public.lecturer_report_backup_history for all to authenticated
using (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin')))
with check (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin')));
grant select,insert,update,delete on public.lecturer_report_requirements,public.lecturer_report_document_versions,public.lecturer_report_backup_history to authenticated;


-- Allow lecturers to create immutable version records only for their own submissions.
create policy "lecturers_insert_own_report_versions"
on public.lecturer_report_document_versions
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.lecturer_report_submissions s
    where s.id = submission_id and s.lecturer_user_id = auth.uid()
  )
);

-- Extend the existing institutional audit log rather than creating a parallel log.
alter table public.audit_logs
  add column if not exists actor_name text,
  add column if not exists old_data jsonb,
  add column if not exists new_data jsonb,
  add column if not exists source text not null default 'application',
  add column if not exists request_id text;
create index if not exists audit_logs_timestamp_idx on public.audit_logs ("timestamp" desc);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index if not exists audit_logs_user_time_idx on public.audit_logs (user_id, "timestamp" desc);

create or replace function public.capture_teaching_audit_log()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_old jsonb; v_new jsonb; v_row jsonb; v_actor uuid := auth.uid();
  v_name text; v_email text; v_role text; v_record_id text; v_action text := lower(tg_op);
begin
  if tg_op in ('UPDATE','DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);
  v_record_id := coalesce(v_row->>'id', v_row->>'submission_id', v_row->>'user_id');
  select p.full_name, p.email, p.role into v_name, v_email, v_role
  from public.consolidated_user_profiles_table p where p.user_id = v_actor limit 1;
  insert into public.audit_logs("timestamp",user_id,user_email,role,action_type,module,target_table,target_id,description,status,details,user_role,created_at,actor_name,old_data,new_data,source)
  values(now(),v_actor,v_email,v_role,v_action,'Teaching & Learning',tg_table_name,v_record_id,initcap(v_action)||' on '||tg_table_name,'success',initcap(v_action)||' on '||tg_table_name,v_role,now(),v_name,v_old,v_new,'database_trigger');
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.capture_teaching_audit_log() from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['lecturer_report_submissions','lecturer_report_reviews','lecturer_report_attachments','lecturer_report_deadlines','lecturer_report_requirements','lecturer_report_document_versions','lecturer_report_backup_history'] loop
    execute format('drop trigger if exists audit_teaching_changes on public.%I',t);
    execute format('create trigger audit_teaching_changes after insert or update or delete on public.%I for each row execute function public.capture_teaching_audit_log()',t);
  end loop;
end $$;
drop policy if exists "audit_logs_superadmin_read" on public.audit_logs;
create policy "audit_logs_superadmin_read" on public.audit_logs for select to authenticated
using (exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin','admin')));
