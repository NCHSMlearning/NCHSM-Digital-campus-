-- NCHSM Digital Campus: Super Admin profile + marks security audit hardening
-- Apply this migration in the linked Supabase project's SQL migration workflow.
-- Row mutations are captured in audit_logs with before/after snapshots. The RPC
-- records application-level views, exports and blocked attempts that triggers cannot see.

do $$
begin
  if to_regclass('public.student_marks') is not null
     and to_regprocedure('public.capture_system_audit_log()') is not null
     and not exists (
       select 1
       from pg_trigger t
       where t.tgrelid = 'public.student_marks'::regclass
         and not t.tgisinternal
         and t.tgfoid = 'public.capture_system_audit_log()'::regprocedure
     ) then
    execute 'create trigger audit_student_marks_changes
      after insert or update or delete on public.student_marks
      for each row execute function public.capture_system_audit_log(''Marks & Results'')';
  end if;
end $$;

create or replace function public.log_marks_security_event(
  p_action text,
  p_target_table text default 'student_marks',
  p_target_id text default null,
  p_description text default null,
  p_status text default 'success',
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
  v_headers jsonb := '{}'::jsonb;
  v_ip text;
  v_ua text;
  v_action text := upper(coalesce(p_action, ''));
  v_status text := lower(coalesce(p_status, 'success'));
  v_details jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if v_action not in (
    'MARKS_VIEWED','MARKS_SEARCHED','MARKS_EXPORT_REQUESTED',
    'MARKS_EXPORTED','MARKS_EXPORT_FAILED','MARKS_EDIT_ATTEMPTED',
    'MARKS_UPDATED','MARKS_DELETE_ATTEMPTED','MARKS_DELETED',
    'MARKS_BULK_UPDATE_ATTEMPTED','MARKS_APPROVED','MARKS_REJECTED',
    'RESULTS_PUBLISHED','RESULTS_UNPUBLISHED','MARKS_ACCESS_BLOCKED',
    'MARKS_DOWNLOAD_REQUESTED'
  ) then
    raise exception 'Unsupported marks audit action';
  end if;

  if v_status not in ('success','failure','blocked','attempted','denied') then
    raise exception 'Unsupported audit status';
  end if;

  select p.email, p.full_name, p.role
    into v_email, v_name, v_role
  from public.consolidated_user_profiles_table p
  where p.user_id = v_actor
  limit 1;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip := coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-real-ip',
                   split_part(coalesce(v_headers->>'x-forwarded-for',''), ',', 1), null);
  v_ua := v_headers->>'user-agent';

  v_details := coalesce(p_details, '{}'::jsonb) ||
    jsonb_build_object(
      'description', coalesce(p_description, v_action),
      'target_table', coalesce(p_target_table, 'student_marks'),
      'target_id', p_target_id,
      'page_path', p_details->>'page_path',
      'request_id', coalesce(p_details->>'request_id', gen_random_uuid()::text),
      'audit_channel', 'marks_security_rpc'
    );

  insert into public.audit_logs (
    "timestamp", created_at, user_id, user_email, actor_name, role, user_role,
    action_type, module, target_table, target_id, description,
    status, details, ip_address, user_agent, device_info, request_id, source
  ) values (
    now(), now(), v_actor, v_email, v_name, v_role, v_role,
    v_action, 'Marks & Results', coalesce(p_target_table,'student_marks'),
    p_target_id, coalesce(p_description,v_action), v_status, v_details::text,
    v_ip, v_ua, p_details->>'device_info', v_details->>'request_id',
    'marks_security_rpc'
  );
end;
$$;

revoke all on function public.log_marks_security_event(text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.log_marks_security_event(text,text,text,text,text,jsonb) to authenticated;


drop policy if exists "audit_logs_insert_self_marks_profile" on public.audit_logs;
create policy "audit_logs_insert_self_marks_profile"
on public.audit_logs for insert to authenticated
with check (
  user_id = auth.uid()
  and user_email = (select p.email from public.consolidated_user_profiles_table p where p.user_id = auth.uid() limit 1)
  and (
    (
      source = 'marks_security_rpc'
      and module = 'Marks & Results'
      and action_type = any(array[
        'MARKS_VIEWED','MARKS_SEARCHED','MARKS_EXPORT_REQUESTED','MARKS_EXPORTED',
        'MARKS_EXPORT_FAILED','MARKS_EDIT_ATTEMPTED','MARKS_UPDATED',
        'MARKS_DELETE_ATTEMPTED','MARKS_DELETED','MARKS_BULK_UPDATE_ATTEMPTED',
        'MARKS_APPROVED','MARKS_REJECTED','RESULTS_PUBLISHED',
        'RESULTS_UNPUBLISHED','MARKS_ACCESS_BLOCKED','MARKS_DOWNLOAD_REQUESTED'
      ])
    )
    or (
      source = 'superadmin_profile'
      and exists (
        select 1 from public.consolidated_user_profiles_table p
        where p.user_id = auth.uid()
          and lower(coalesce(p.role,'')) in ('super_admin','superadmin')
      )
    )
  )
);
