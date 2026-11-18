/* Campus Nexus — Platform Portfolio Overview
 * Read-only cross-institution summary. RLS remains the authority.
 * Legacy academic records are deliberately not presented as tenant-separated.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const number = (value) => Number(value || 0).toLocaleString("en-KE");
  const client = () => window.sb || window.supabase || window.supabaseClient || null;
  async function platformAdminClient() {
    const db = client();
    if (!db?.auth || typeof db.from !== "function") throw new Error("Secure database session is not available.");
    const { data, error } = await db.auth.getUser();
    if (error || !data?.user) throw new Error("Please sign in again to view platform metrics.");
    const profile = await db.from("consolidated_user_profiles_table").select("role")
      .eq("user_id", data.user.id).limit(1).maybeSingle();
    if (profile.error) throw profile.error;
    if (!["superadmin", "super_admin"].includes(String(profile.data?.role || "").toLowerCase())) {
      throw new Error("Platform administrator access is required.");
    }
    return db;
  }
  async function count(db, table, configure) {
    let query = db.from(table).select("id", { count: "exact", head: true });
    if (configure) query = configure(query);
    const result = await query;
    if (result.error) throw result.error;
    return result.count ?? 0;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function renderInstitutions(rows) {
    const host = $("cnPlatformInstitutionStatusList");
    if (!host) return;
    host.innerHTML = rows.length ? rows.map(item => {
      const status = String(item.status || "pending").toLowerCase();
      return '<div class="cn-platform-institution"><span><strong>' + escapeHtml(item.name || "Unnamed institution") +
        '</strong><small>' + escapeHtml(item.short_code || "") + '</small></span><span class="cn-platform-status ' +
        status.replace(/[^a-z_-]/g,"") + '">' + escapeHtml(status.replace(/_/g," ")) + '</span></div>';
    }).join("") : '<div class="cn-platform-empty">No institutions are registered yet.</div>';
  }
  async function load() {
    const refresh = $("cnPlatformRefresh");
    if (refresh) { refresh.disabled = true; refresh.classList.add("is-loading"); }
    set("cnPlatformMetricsUpdated", "Updating platform figures…");
    try {
      const db = await platformAdminClient();
      const [institutionsResult, users, memberships, enabledModules, subscriptions, auditEvents] = await Promise.all([
        db.from("institutions").select("id,name,short_code,status,onboarding_status").order("name"),
        count(db, "consolidated_user_profiles_table"),
        count(db, "institution_users"),
        count(db, "institution_modules", q => q.eq("enabled", true)),
        count(db, "institution_subscriptions"),
        count(db, "platform_audit_logs")
      ]);
      if (institutionsResult.error) throw institutionsResult.error;
      const rows = institutionsResult.data || [];
      set("cnPlatformInstitutionTotal", number(rows.length));
      set("cnPlatformInstitutionActive", number(rows.filter(x => x.status === "active").length));
      set("cnPlatformInstitutionSuspended", number(rows.filter(x => x.status === "suspended").length));
      set("cnPlatformInstitutionPending", number(rows.filter(x => x.status !== "active" && x.status !== "suspended").length));
      set("cnPlatformUserProfiles", number(users));
      set("cnPlatformAssignedUsers", number(memberships));
      set("cnPlatformEnabledModules", number(enabledModules));
      set("cnPlatformSubscriptions", number(subscriptions));
      set("cnPlatformAuditEvents", number(auditEvents));
      renderInstitutions(rows);
      const warning = $("cnPlatformTenantWarning");
      if (warning) {
        warning.hidden = memberships > 0 && rows.every(x => x.legacy_system === false);
        warning.textContent = memberships === 0
          ? "Institution membership is not configured yet. Existing user profiles and academic records are still global/legacy records; institution-specific academic reporting must wait for the tenant migration."
          : "Some legacy academic records may still be outside institution-level isolation. Review the tenant migration before enabling cross-institution reporting.";
      }
      set("cnPlatformMetricsUpdated", "Updated " + new Intl.DateTimeFormat("en-KE", {hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"Africa/Nairobi"}).format(new Date()));
    } catch (error) {
      console.error("[Campus Nexus portfolio metrics]", error);
      set("cnPlatformMetricsUpdated", "Metrics unavailable: " + (error.message || "Unable to load platform data"));
      renderInstitutions([]);
    } finally {
      if (refresh) { refresh.disabled = false; refresh.classList.remove("is-loading"); }
    }
  }
  window.loadCampusNexusPlatformOverview = load;
  document.addEventListener("DOMContentLoaded", () => {
    $("cnPlatformRefresh")?.addEventListener("click", load);
    load();
    document.querySelectorAll('#mainNav a[data-tab="dashboard"]').forEach(a => a.addEventListener("click", () => setTimeout(load, 80)));
  });
})();