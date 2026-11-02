(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const panels = ["loadingPanel", "signedOutPanel", "signedInPanel", "errorPanel"];
  const show = (id) => panels.forEach((panel) => { $(panel).hidden = panel !== id; });
  const roleMap = {
    student: {label:"Student", links:[["Student Portal","Academic services, classes and records","▣","../student.html"],["Examinations","Assessments and examination access","✎","../exam_dashboard.html"],["Finance","Fees and payment information","K","../finance.html"]]},
    lecturer: {label:"Lecturer", links:[["Lecturer Workspace","Teaching and academic tools","▤","../lecturer.html"],["Examinations","Manage assessments and CATs","✎","../lecturerexams.html"]]},
    admin: {label:"Administrator", links:[["Administration","Institutional administration","⌘","../admin.html"],["Examinations","Examination administration","✎","../adminexams.html"]]},
    super_admin: {label:"Super Administrator", links:[["Super Admin","Institution-wide management","◆","../superadmin.html"]]},
    superadmin: {label:"Super Administrator", links:[["Super Admin","Institution-wide management","◆","../superadmin.html"]]},
    finance_officer: {label:"Finance Officer", links:[["Finance Workspace","Fees and finance operations","K","../finance.html"]]},
    applicant: {label:"Applicant", links:[["Admissions","Application and admission services","↗","../admission.html"]]}
  };
  function normalizeRole(profile) {
    const raw = profile && (profile.role || profile.user_role || profile.account_type || profile.user_type);
    return String(raw || "").trim().toLowerCase().replace(/[ -]+/g, "_");
  }
  function renderWorkspace(role, profile, user) {
    const config = roleMap[role];
    if (!config) {
      throw new Error("Your account is signed in, but its workspace role could not be identified. Please contact the College administrator.");
    }
    const name = profile.full_name || profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || user.email || "NCHSM user";
    $("welcomeName").textContent = "Welcome, " + name.split(" ")[0];
    $("userEmail").textContent = user.email || "";
    $("roleLabel").textContent = config.label;
    $("workspaceGrid").innerHTML = config.links.map(([title, description, icon, href]) =>
      '<a class="workspace-card" href="' + href + '"><span class="workspace-icon" aria-hidden="true">' + icon + '</span><strong>' + title + '</strong><span>' + description + '</span></a>'
    ).join("");
    show("signedInPanel");
  }
  async function checkSession() {
    show("loadingPanel");
    try {
      const client = window.sb || window.supabaseClient;
      if (!client) throw new Error("Secure sign-in service is unavailable. Please refresh or use the standard sign-in page.");
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const user = data && data.session && data.session.user;
      if (!user) { show("signedOutPanel"); return; }
      const { data: profile, error: profileError } = await client
        .from("consolidated_user_profiles_table")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error("Your NCHSM profile was not found. Please contact the College administrator.");
      renderWorkspace(normalizeRole(profile), profile, user);
    } catch (error) {
      $("errorMessage").textContent = error.message || "Unable to verify your account.";
      show("errorPanel");
    }
  }
  $("logoutBtn").addEventListener("click", async () => {
    const client = window.sb || window.supabaseClient;
    $("logoutBtn").disabled = true;
    try { await client.auth.signOut(); window.location.href = "../login.html"; }
    catch (_) { $("logoutBtn").disabled = false; $("errorMessage").textContent = "Sign out could not be completed. Please try again."; show("errorPanel"); }
  });
  $("retryBtn").addEventListener("click", checkSession);
  $("year").textContent = new Date().getFullYear();
  window.addEventListener("pageshow", checkSession);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Mobile service worker unavailable:", error));
  }
  let installPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); installPrompt = event; $("installBtn").hidden = false;
  });
  $("installBtn").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("installBtn").hidden = true;
  });
  checkSession();
})();