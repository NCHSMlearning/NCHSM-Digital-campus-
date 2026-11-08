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

-- System-wide audit capture for operational public tables.
create or replace function public.audit_redact_jsonb(p_data jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare result jsonb; item record; k text;
begin
 if p_data is null then return null; end if;
 if jsonb_typeof(p_data)='object' then
  result:='{}'::jsonb;
  for item in select key,value from jsonb_each(p_data) loop
   k:=lower(item.key);
   if k ~ '(password|passwd|secret|token|otp|verification_code|recovery_code|private_key|api_key|access_key|refresh_token|session_token|credential|pin|salt|password_hash|two_factor)' then
    result:=result||jsonb_build_object(item.key,'[REDACTED]');
   else result:=result||jsonb_build_object(item.key,public.audit_redact_jsonb(item.value)); end if;
  end loop; return result;
 elsif jsonb_typeof(p_data)='array' then
  select coalesce(jsonb_agg(public.audit_redact_jsonb(value)),'[]'::jsonb) into result from jsonb_array_elements(p_data); return result;
 end if; return p_data;
end; $$;

create or replace function public.capture_system_audit_log()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; v_actor uuid:=auth.uid();
 v_name text; v_email text; v_role text; v_record_id text; v_action text:=lower(tg_op); v_claims jsonb;
begin
 if tg_op in ('UPDATE','DELETE') then v_old:=public.audit_redact_jsonb(to_jsonb(old)); end if;
 if tg_op in ('INSERT','UPDATE') then v_new:=public.audit_redact_jsonb(to_jsonb(new)); end if;
 v_row:=coalesce(v_new,v_old);
 v_record_id:=coalesce(v_row->>'id',v_row->>'user_id',v_row->>'student_id',v_row->>'submission_id',v_row->>'record_id');
 select p.full_name,p.email,p.role into v_name,v_email,v_role from public.consolidated_user_profiles_table p where p.user_id=v_actor limit 1;
 if v_actor is null then begin v_claims:=nullif(current_setting('request.jwt.claims',true),'')::jsonb; v_actor:=nullif(v_claims->>'sub','')::uuid; exception when others then v_actor:=null; end; end if;
 insert into public.audit_logs("timestamp",user_id,user_email,role,action_type,module,target_table,target_id,description,status,details,user_role,created_at,actor_name,old_data,new_data,source)
 values(now(),v_actor,v_email,v_role,v_action,coalesce(nullif(tg_argv[0],''),'System'),tg_table_name,v_record_id,
 case v_action when 'insert' then 'Created a record in '||tg_table_name when 'update' then 'Updated a record in '||tg_table_name when 'delete' then 'Deleted a record from '||tg_table_name else initcap(v_action)||' on '||tg_table_name end,
 'success',initcap(v_action)||' on '||tg_table_name,v_role,now(),v_name,v_old,v_new,'database_trigger');
 if tg_op='DELETE' then return old; end if; return new;
end; $$;
revoke all on function public.capture_system_audit_log() from public,anon,authenticated;
revoke all on function public.audit_redact_jsonb(jsonb) from public,anon,authenticated;
do $$ declare t record; begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r'
 and c.relname not in ('audit_logs','admin_edit_logs','application_logs','approved_edit_logs','attendance_logs','drms_audit_logs','email_logs','exam_heartbeats','exam_proctoring_logs','failed_login_attempts','finance_audit_logs','finance_stk_logs','geo_attendance_logs','login_history','mark_approval_logs','mark_entry_logs','score_publication_logs','system_activity_log','task_logs','teaching_logs','trigger_errors','user_status_monitor','sync_errors','spatial_ref_sys','auth_users_backup','profile_backup_mercy','profile_backup_mercy_before_restore','student_marks_block0_backup','units_catalog_backup','units_catalog_backup_20250121','hod_tracker_cache','shared_cache','hod_tracker_data')
 and c.relname not like '%_cache' and c.relname not like '%_backup%'
 and not exists(select 1 from pg_trigger tr where tr.tgrelid=c.oid and not tr.tgisinternal and tr.tgname in ('audit_teaching_changes','audit_system_changes'))
 loop execute format('create trigger audit_system_changes after insert or update or delete on public.%I for each row execute function public.capture_system_audit_log(%L)',t.relname,'System'); end loop;
end $$;
drop policy if exists "audit_logs_superadmin_read" on public.audit_logs;
create policy "audit_logs_superadmin_read" on public.audit_logs for select to authenticated
using(exists(select 1 from public.consolidated_user_profiles_table p where p.user_id=auth.uid() and lower(coalesce(p.role,'')) in ('super_admin','superadmin','admin')));
