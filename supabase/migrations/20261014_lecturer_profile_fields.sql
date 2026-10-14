-- Additive lecturer professional profile fields. Review before running in Supabase SQL Editor.
alter table public.consolidated_user_profiles_table
  add column if not exists professional_bio text,
  add column if not exists qualifications text,
  add column if not exists specialization text;
comment on column public.consolidated_user_profiles_table.professional_bio is 'Lecturer-authored professional biography.';
comment on column public.consolidated_user_profiles_table.qualifications is 'Lecturer academic and professional qualifications.';
comment on column public.consolidated_user_profiles_table.specialization is 'Lecturer teaching or clinical specialization.';
