-- Restrict direct system-wide audit log reads to active/approved Super Admin accounts.
-- Director audit access remains governed by the separate private.is_nchsm_director() policy.
begin;

drop policy if exists "Admins and superadmins can view all audit logs" on public.audit_logs;
drop policy if exists "audit_logs_superadmin_read" on public.audit_logs;

create policy "audit_logs_superadmin_read"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.consolidated_user_profiles_table p
    where p.user_id = auth.uid()
      and lower(coalesce(p.role, '')) in ('super_admin', 'superadmin')
      and lower(coalesce(p.status, 'active')) in ('active', 'approved')
  )
);

commit;
