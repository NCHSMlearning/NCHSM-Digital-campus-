import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}


async function hasAdminPermission(supabaseUrl: string, anonKey: string, accessToken: string, permission: string) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: "Bearer " + accessToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.rpc("check_superadmin_academic_permission", { p_permission: permission });
  return !error && data === true;
}

function normalizedMarks(rows: any[]) {
  return rows.map((r) => ({
    admission_number: String(r.admission_number || "").trim(),
    block: String(r.block || "").trim(),
    subject_name: String(r.subject_name || "").trim(),
    academic_year: String(r.academic_year || "").trim(),
    final_score: r.final_score == null ? "" : String(r.final_score),
    grade: String(r.grade || "").trim(),
    program: String(r.program || "").trim(),
    published: r.published === true,
  })).sort((a, b) =>
    a.block.localeCompare(b.block) ||
    a.subject_name.localeCompare(b.subject_name) ||
    a.academic_year.localeCompare(b.academic_year) ||
    a.final_score.localeCompare(b.final_score) ||
    a.grade.localeCompare(b.grade)
  );
}

async function fingerprint(rows: any[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizedMarks(rows)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeBlock(value: unknown) {
  return String(value || "").trim().toLowerCase()
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ")
    .replace(/^(block|term)\s*(\d+)$/, "$1 $2");
}

function marksForBlock(rows: any[], block: string) {
  if (!block || block === "ALL") return rows;
  const target = normalizeBlock(block);
  return rows.filter((row) => normalizeBlock(row.block) === target);
}


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Verification service is not configured" }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (body.action === "list") {
    const accessToken = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return json({ error: "Sign in to view transcript registry records" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Your session is invalid or expired. Sign in again." }, 401);
    const { data: profile, error: profileError } = await admin.from("consolidated_user_profiles_table")
      .select("role, status").eq("user_id", authData.user.id).maybeSingle();
    if (profileError) return json({ error: "Could not verify your administrative role" }, 500);
    const role = String(profile?.role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!profile || !["superadmin", "super_admin"].includes(role)) return json({ error: "Only authorized Super Admin accounts can view transcript registry records" }, 403);
    if (profile.status && !["active", "approved", "verified"].includes(String(profile.status).toLowerCase())) return json({ error: "Your Super Admin profile is not active" }, 403);
    if (!(await hasAdminPermission(supabaseUrl, anonKey, accessToken, "generate_transcripts"))) {
      return json({ error: "You are not authorized to view transcript registry records. Ask the Primary Super Admin for access." }, 403);
    }
    const { data: records, error: listError } = await admin.from("transcript_verification_registry")
      .select("token,student_id,student_name,program,document_type,status,issued_at,transcript_number,transcript_block")
      .order("issued_at", { ascending: false }).limit(1000);
    if (listError) return json({ error: "Could not load transcript registry records" }, 500);
    return json({ records: records || [], count: (records || []).length });
  }

  if (body.action === "issue") {
    const accessToken = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return json({ error: "Sign in to issue a transcript verification record" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !authData.user) return json({ error: "Your session is invalid or expired. Sign in again." }, 401);
    const { data: requester, error: requesterError } = await admin.from("consolidated_user_profiles_table").select("user_id, role, status, student_id, admission_number, full_name, program, intake_year, current_block, block").eq("user_id", authData.user.id).maybeSingle();
    if (requesterError) return json({ error: "Could not check the signed-in profile" }, 500);
    if (!requester) return json({ error: "Your profile could not be verified" }, 403);
    const role = String(requester.role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const isAdmin = ["superadmin", "super_admin"].includes(role), isStudent = role === "student";
    if (!isAdmin && !isStudent) return json({ error: "Only a student or authorized Super Admin can issue transcript verification" }, 403);
    if (requester.status && !["active", "approved", "verified"].includes(String(requester.status).toLowerCase())) return json({ error: "Your profile is not active for transcript verification" }, 403);
    if (isAdmin) {
      const canViewMarks = await hasAdminPermission(supabaseUrl, anonKey, accessToken, "view_marks");
      const canGenerateTranscripts = await hasAdminPermission(supabaseUrl, anonKey, accessToken, "generate_transcripts");
      if (!canViewMarks || !canGenerateTranscripts) {
        return json({ error: "Transcript generation is restricted. The Primary Super Admin must grant both marks-view and transcript-generation access." }, 403);
      }
    }
    let student = requester;
    if (isAdmin) {
      const requestedAdmission = String(body.admission_number || body.student_id || "").trim();
      if (!requestedAdmission) return json({ error: "Super Admin issuance requires the student admission number" }, 400);
      const { data: target, error: targetError } = await admin.from("consolidated_user_profiles_table").select("user_id, role, status, student_id, admission_number, full_name, program, intake_year, current_block, block").eq("admission_number", requestedAdmission).eq("role", "student").maybeSingle();
      if (targetError) return json({ error: "Could not find the selected student profile" }, 500);
      if (!target) return json({ error: "No student profile matches admission number " + requestedAdmission }, 404);
      if (target.status && !["active", "approved", "verified"].includes(String(target.status).toLowerCase())) return json({ error: "The selected student profile is not active" }, 403);
      student = target;
    }
    const admission = String(student.admission_number || student.student_id || "").trim();
    if (!admission) return json({ error: "The student profile has no admission number" }, 422);
    const requestedBlock = String(body.block || "ALL").trim() || "ALL";
    const { data: allMarks, error: marksError } = await admin.from("student_marks").select("admission_number, block, subject_name, academic_year, final_score, grade, program, published").eq("admission_number", admission).eq("published", true);
    if (marksError) return json({ error: "Could not read published academic results" }, 500);
    const marks = marksForBlock(allMarks || [], requestedBlock);
    if (!marks.length) return json({ error: "No published marks are available for this block" }, 422);
    const snapshotHash = await fingerprint(marks);
    const { data: record, error: issueError } = await admin.rpc("issue_block_transcript_record", { p_student_user_id: student.user_id, p_student_id: admission, p_student_name: String(student.full_name || ""), p_program: String(student.program || ""), p_transcript_block: requestedBlock, p_snapshot_hash: snapshotHash });
    if (issueError || !record || !record.length) { console.error("Transcript registry issue failed", issueError); return json({ error: "Could not safely register this block transcript" }, 500); }
    const issued = record[0];
    return json({ token: issued.token, issued_at: issued.issued_at, transcript_number: issued.transcript_number, transcript_block: issued.transcript_block, document_type: "provisional-transcript", intake_year: student.intake_year ?? null, current_block: student.current_block || student.block || null });
  }

  if (body.action === "verify") {
    const token = String(body.token || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return json({ status: "invalid", message: "The verification reference is invalid." }, 400);
    }
    const { data: record, error: recordError } = await admin
      .from("transcript_verification_registry")
      .select("token, student_id, student_name, program, document_type, snapshot_hash, status, issued_at, transcript_number, transcript_block, student_user_id")
      .eq("token", token)
      .maybeSingle();
    if (recordError) return json({ error: "Could not query the document registry" }, 500);
    if (!record || record.status !== "valid") return json({ status: "invalid", message: "No active transcript record matches this QR code." });

    const { data: studentProfile } = await admin
      .from("consolidated_user_profiles_table")
      .select("intake_year, current_block, block")
      .eq("user_id", record.student_user_id)
      .maybeSingle();

    const { data: marks, error: marksError } = await admin
      .from("student_marks")
      .select("admission_number, block, subject_name, academic_year, final_score, grade, program, published")
      .eq("admission_number", record.student_id)
      .eq("published", true);
    if (marksError) return json({ error: "Could not check the current academic record" }, 500);
    const verifiedMarks = marksForBlock(marks || [], record.transcript_block || "ALL");
    if (!verifiedMarks.length || await fingerprint(verifiedMarks) !== record.snapshot_hash) {
      return json({
        status: "record_changed",
        message: "This transcript record no longer matches the current published academic results. Contact the Academic Office.",
        document_type: record.document_type, transcript_number: record.transcript_number, student_name: record.student_name, student_id: record.student_id,
        program: record.program, issued_at: record.issued_at,
        intake_year: studentProfile?.intake_year ?? null,
        current_block: studentProfile?.current_block || studentProfile?.block || null,
      });
    }
    return json({
      status: "verified",
      message: "This provisional transcript verification record matches the current published academic results.",
      document_type: record.document_type, transcript_number: record.transcript_number, student_name: record.student_name, student_id: record.student_id,
      program: record.program, issued_at: record.issued_at,
      intake_year: studentProfile?.intake_year ?? null,
      current_block: studentProfile?.current_block || studentProfile?.block || null,
      blocks: Array.from(new Set(verifiedMarks.map((r: any) => String(r.block || "").trim()).filter(Boolean)))
        .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })),
    });
  }
  return json({ error: "Unsupported action" }, 400);
});
