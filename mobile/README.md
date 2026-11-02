# NCHSM Digital Campus — Mobile Foundation

This directory introduces a separate, mobile-first installable PWA entry point while preserving the existing production portal.

## Current foundation
- Uses the existing Supabase client created by `../config.js`.
- Checks the signed-in Supabase session and reads the current user's row from `consolidated_user_profiles_table`.
- Provides role-specific launch links for student, lecturer, administrator, super administrator, finance officer and applicant accounts.
- Does not write academic, examination, finance or profile data.
- Leaves authorization to existing portal checks and Supabase Row Level Security; this launcher is navigation, not an authorization boundary.
- Includes a scoped service worker for the mobile shell only. Authenticated pages and API responses are not cached.

## Open locally
Serve the repository root over HTTPS or localhost, then open `/mobile/`. A static file preview opened as `file://` will not support Supabase authentication or service workers.

## Deployment
The entry point is `/mobile/` on the existing site. The current website and existing login routes remain unchanged.

## Before public rollout
1. Confirm the exact role values and profile columns in the production schema.
2. Test each role against the existing portal and RLS policies.
3. Verify the correct dashboard route for each role and campus.
4. Add platform-specific Capacitor projects and native notification/deep-link configuration.
5. Run accessibility, device, security and regression tests before production release.

## Important
The public Supabase anon key is a client identifier, not a secret. Never place a Supabase service-role key or other privileged secret in browser/mobile code.
