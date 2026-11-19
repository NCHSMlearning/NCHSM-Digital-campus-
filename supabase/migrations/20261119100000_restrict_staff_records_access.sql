-- Restrict staff_records to authorized institutional leadership.
-- Remove legacy permissive policies that allowed ordinary authenticated users
-- to read or modify sensitive staff identity, banking and payroll fields.
ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "director_block_delete" ON public.staff_records;
DROP POLICY IF EXISTS "director_block_insert" ON public.staff_records;
DROP POLICY IF EXISTS "director_block_update" ON public.staff_records;
DROP POLICY IF EXISTS "director_read_all" ON public.staff_records;
DROP POLICY IF EXISTS "director_staff_records_insert" ON public.staff_records;
DROP POLICY IF EXISTS "director_staff_records_update" ON public.staff_records;
DROP POLICY IF EXISTS "legacy_authenticated_non_director_access" ON public.staff_records;
DROP POLICY IF EXISTS "enforce_active_auth_session" ON public.staff_records;
DROP POLICY IF EXISTS "tenant_anon_deny" ON public.staff_records;
DROP POLICY IF EXISTS "tenant_membership_boundary" ON public.staff_records;

DROP POLICY IF EXISTS "staff_records_admin_select" ON public.staff_records;
DROP POLICY IF EXISTS "staff_records_admin_insert" ON public.staff_records;
DROP POLICY IF EXISTS "staff_records_admin_update" ON public.staff_records;
DROP POLICY IF EXISTS "staff_records_superadmin_delete" ON public.staff_records;
DROP POLICY IF EXISTS "staff_records_session_guard" ON public.staff_records;

CREATE POLICY "staff_records_session_guard"
ON public.staff_records AS RESTRICTIVE
FOR ALL TO authenticated
USING (private.is_current_auth_session_valid())
WITH CHECK (private.is_current_auth_session_valid());

CREATE POLICY "staff_records_admin_select"
ON public.staff_records FOR SELECT TO authenticated
USING (public.is_current_user_superadmin() OR private.is_nchsm_director());

CREATE POLICY "staff_records_admin_insert"
ON public.staff_records FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_superadmin() OR private.is_nchsm_director());

CREATE POLICY "staff_records_admin_update"
ON public.staff_records FOR UPDATE TO authenticated
USING (public.is_current_user_superadmin() OR private.is_nchsm_director())
WITH CHECK (public.is_current_user_superadmin() OR private.is_nchsm_director());

CREATE POLICY "staff_records_superadmin_delete"
ON public.staff_records FOR DELETE TO authenticated
USING (public.is_current_user_superadmin());
