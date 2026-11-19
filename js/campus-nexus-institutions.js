/* Campus Nexus — Institution Management
 * Uses the existing authenticated Supabase client. Database RLS is authoritative.
 */
(() => {
  const MODULE_GROUPS = [
    ["User portals", [
      ["student_management", "Student portal", "Student accounts, profiles and academic records"],
      ["lecturer_portal", "Lecturer portal", "Lecturer workspace, classes and teaching tools"],
      ["administrator_portal", "Institution administrator portal", "Institution-level administration and oversight"]
    ]],
    ["Academics & assessment", [
      ["academic_management", "Academic management", "Programmes, units, intakes and academic structure"],
      ["examinations", "Examinations", "Exam scheduling, attempts and assessment workflows"],
      ["admin_exams", "Admin Exams", "Administrator exam creation, management and oversight"],
      ["proctoring", "Online proctoring", "Exam monitoring and proctoring tools"],
      ["transcripts_certificates", "Transcripts & certificates", "Results, transcripts and certificate workflows"]
    ]],
    ["Institution operations", [
      ["admissions", "Admissions", "Applicant intake and admission processing"],
      ["attendance", "Attendance management", "Student and staff attendance workflows"],
      ["learning_management", "Learning management system", "Learning resources, lessons and assignments"],
      ["finance", "Finance & payments", "Student accounts, invoices and payments"],
      ["human_resources", "HR & staff management", "Staff records and HR workflows"],
      ["library", "Library", "Library resources and circulation"]
    ]],
    ["Insights & communication", [
      ["analytics_reports", "Analytics & reports", "Institution dashboards and reporting"]
    ]]
  ];
  const MODULES = MODULE_GROUPS.flatMap(([, items]) => items);
  let sb, currentUser, editingId = null, institutions = [];

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const notify = (message, type = "info") => {
    if (typeof window.showNotification === "function") window.showNotification(message, type);
    else alert(message);
  };
  const setBusy = (busy) => {
    const button = $("cnInstitutionSave");
    if (button) { button.disabled = busy; button.textContent = busy ? "Saving…" : (editingId ? "Update institution" : "Add institution"); }
  };

  async function verifyPlatformAdmin() {
    sb = window.sb || window.supabase;
    if (!sb?.auth) throw new Error("The authenticated Supabase client is not available. Reload the page and sign in again.");
    const { data: authData, error: authError } = await sb.auth.getUser();
    if (authError || !authData?.user) throw new Error("Your secure session could not be verified. Please sign in again.");
    currentUser = authData.user;
    const { data: isPlatformAdmin, error } = await sb.rpc("is_current_user_superadmin");
    if (error) throw error;
    if (isPlatformAdmin !== true) {
      throw new Error("Access denied. Institution management is restricted to the central Campus Nexus Platform Super Admin.");
    }
  }

  function renderModuleOptions(selected = []) {
    const host = $("cnModuleOptions");
    if (!host) return;
    host.innerHTML = MODULE_GROUPS.map(([group, items]) =>
      '<section class="cn-module-group"><div class="cn-module-group-title">' + esc(group) +
      '<small>' + items.length + ' options</small></div><div class="cn-module-grid">' +
      items.map(([key,label,description]) =>
        '<label class="cn-module-option"><input type="checkbox" name="cnModule" value="' + esc(key) + '"' +
        (selected.includes(key) ? " checked" : "") + '><span class="cn-module-copy"><strong>' + esc(label) +
        '</strong><small>' + esc(description) + '</small></span><span class="cn-module-check"><i class="fas fa-check"></i></span></label>'
      ).join("") + '</div></section>'
    ).join("");
    const count = host.querySelectorAll('input[name="cnModule"]:checked').length;
    if ($("cnModuleCount")) $("cnModuleCount").textContent = count + " selected";
    host.querySelectorAll('input[name="cnModule"]').forEach(input => input.addEventListener("change", () => {
      const n = host.querySelectorAll('input[name="cnModule"]:checked').length;
      if ($("cnModuleCount")) $("cnModuleCount").textContent = n + " selected";
    }));
  }
  function readBrandColors() {
    return ["cnInstitutionColor","cnInstitutionAccent","cnInstitutionColor3","cnInstitutionColor4","cnInstitutionColor5","cnInstitutionColor6"]
      .map(id => $(id)?.value).filter(Boolean);
  }
  function applyBrandColors(colors = []) {
    const ids = ["cnInstitutionColor","cnInstitutionAccent","cnInstitutionColor3","cnInstitutionColor4","cnInstitutionColor5","cnInstitutionColor6"];
    const defaults = ["#082f49","#0f766e","#d4a017","#2563eb","#7c3aed","#db2777"];
    ids.forEach((id,index) => { if ($(id)) $(id).value = colors[index] || defaults[index]; });
  }

  function resetForm() {
    editingId = null;
    $("cnInstitutionForm")?.reset();
    if ($("cnInstitutionStatus")) $("cnInstitutionStatus").value = "active";
    if ($("cnInstitutionType")) $("cnInstitutionType").value = "college";
    if ($("cnInstitutionAmount")) $("cnInstitutionAmount").value = "5000";
    applyBrandColors();
    if ($("cnInstitutionPortalMode")) $("cnInstitutionPortalMode").value = "campus_nexus";
    if ($("cnInstitutionCustomLogin")) $("cnInstitutionCustomLogin").value = "";
    if ($("cnInstitutionAdminPortal")) $("cnInstitutionAdminPortal").value = "";
    renderModuleOptions(["student_management","lecturer_portal","administrator_portal","learning_management","examinations","admin_exams","proctoring","finance","transcripts_certificates","analytics_reports"]);
    $("cnInstitutionSave").textContent = "Add institution";
    $("cnInstitutionFormTitle").textContent = "Register a new institution";
    $("cnInstitutionCancel").hidden = true;
  }

  function fillForm(item) {
    editingId = item.id;
    const fields = {
      cnInstitutionName:item.name, cnInstitutionCode:item.short_code, cnInstitutionSlug:item.slug,
      cnInstitutionType:item.institution_type, cnInstitutionCountry:item.country,
      cnInstitutionEmail:item.contact_email, cnInstitutionPhone:item.contact_phone,
      cnInstitutionWebsite:item.website_url, cnInstitutionLogo:item.logo_url,
      cnInstitutionDomain:item.portal_domain, cnInstitutionAdmin:item.admin_email, cnInstitutionColor:item.primary_color,
      cnInstitutionAccent:item.secondary_color, cnInstitutionStatus:item.status,
      cnInstitutionPortalMode:item.portal_mode || "campus_nexus",
      cnInstitutionCustomLogin:item.custom_login_url,
      cnInstitutionAdminPortal:item.administrator_portal_url
    };
    Object.entries(fields).forEach(([id,value]) => { if ($(id)) $(id).value = value || ""; });
    applyBrandColors(item.brand_colors || [item.primary_color,item.secondary_color]);
    $("cnInstitutionAmount").value = item._subscription?.amount ?? 5000;
    $("cnInstitutionPlan").value = item._subscription?.plan_name || "Starter";
    $("cnInstitutionCycle").value = item._subscription?.billing_cycle || "monthly";
    $("cnInstitutionAdmin").value = item.admin_email || "";
    $("cnInstitutionPortalMode")?.dispatchEvent(new Event("change"));
    renderModuleOptions(item._modules || []);
    $("cnInstitutionSave").textContent = "Update institution";
    $("cnInstitutionFormTitle").textContent = "Edit institution";
    $("cnInstitutionCancel").hidden = false;
    $("cnInstitutionFormTitle").scrollIntoView({behavior:"smooth",block:"center"});
  }

  function renderRows() {
    const host = $("cnInstitutionRows");
    if (!host) return;
    const query = ($("cnInstitutionSearch")?.value || "").trim().toLowerCase();
    const statusFilter = $("cnInstitutionFilter")?.value || "all";
    const filtered = institutions.filter(i =>
      (statusFilter === "all" || i.status === statusFilter) &&
      [i.name,i.short_code,i.slug,i.contact_email,i.admin_email,i.portal_domain]
        .some(v => String(v || "").toLowerCase().includes(query))
    );
    $("cnInstitutionCount").textContent = String(institutions.length);
    const navBadge = $("cnInstitutionNavBadge");
    if (navBadge) navBadge.textContent = String(institutions.length);
    $("cnInstitutionActive").textContent = String(institutions.filter(i => i.status === "active").length);
    $("cnInstitutionSuspended").textContent = String(institutions.filter(i => i.status === "suspended").length);
    if (!filtered.length) {
      host.innerHTML = '<tr><td colspan="6" class="cn-empty">No institutions match this search. Add an institution using the form.</td></tr>';
      return;
    }
    host.innerHTML = filtered.map(i => {
      const status = i.status === "active" ? "Active" : i.status === "suspended" ? "Suspended" : "Pending";
      const registrationUrl = i._registrationUrl || "";
      return '<tr><td><div class="cn-school"><span class="cn-school-mark" style="background:' + esc(i.primary_color || "#082f49") + '">' +
        (i.logo_url ? '<img src="' + esc(i.logo_url) + '" alt="" onerror="this.style.display=\'none\'">' : '<i class="fas fa-school"></i>') +
        '</span><span><strong>' + esc(i.name) + '</strong><small>' + esc(i.short_code) + ' · ' + esc(i.country || "") + '</small></span></div></td>' +
        '<td><span class="cn-status cn-status-' + esc(i.status) + '">' + status + '</span></td>' +
        '<td>' + esc(i._subscription?.plan_name || "—") + '<small class="cn-subline">' +
        (i._subscription ? esc(i._subscription.currency) + " " + Number(i._subscription.amount).toLocaleString() + " / " + esc(i._subscription.billing_cycle) : "Not configured") + '</small></td>' +
        '<td>' + esc(i.contact_email || "—") + '</td><td>' + (registrationUrl
          ? '<a href="' + esc(registrationUrl) + '" target="_blank" rel="noopener">Registration link</a><button class="cn-row-action" type="button" data-copy-registration="' + esc(i.id) + '">Copy</button>'
          : esc(i.portal_domain || "Domain not configured")) + '</td>' +
        '<td><div class="cn-row-actions"><button class="cn-row-action" type="button" data-edit="' + esc(i.id) + '">Manage</button>' +
        (i.status === "suspended" ? '<button class="cn-row-action" type="button" data-status="' + esc(i.id) + '" data-next="active">Activate</button>' :
        '<button class="cn-row-action cn-row-secondary" type="button" data-status="' + esc(i.id) + '" data-next="suspended">Suspend</button>') +
        '</div></td></tr>';
    }).join("");
    host.querySelectorAll("[data-copy-registration]").forEach(button => button.addEventListener("click", async () => {
      const item = institutions.find(i => i.id === button.dataset.copyRegistration);
      if (!item?._registrationUrl) return;
      try { await navigator.clipboard.writeText(item._registrationUrl); notify("Registration link copied.","success"); }
      catch (_) { notify(item._registrationUrl,"info"); }
    }));
    host.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
      const item = institutions.find(i => i.id === button.dataset.edit);
      if (item) fillForm(item);
    }));
    host.querySelectorAll("[data-status]").forEach(button => button.addEventListener("click", async () => {
      const item = institutions.find(i => i.id === button.dataset.status);
      if (!item) return;
      const nextStatus = button.dataset.next;
      const verb = nextStatus === "suspended" ? "suspend" : "activate";
      if (!window.confirm("Are you sure you want to " + verb + " " + item.name + "?")) return;
      button.disabled = true;
      try {
        const {error} = await sb.from("institutions").update({status:nextStatus,updated_at:new Date().toISOString()}).eq("id",item.id);
        if (error) throw error;
        await writeAudit(item.id,"institution_" + nextStatus,{previous_status:item.status,new_status:nextStatus});
        notify(item.name + " has been " + (nextStatus === "active" ? "activated." : "suspended."),"success");
        await loadInstitutions();
      } catch (error) {
        notify(error.message || "Unable to change institution status.","error");
        button.disabled = false;
      }
    }));
  }

  async function loadInstitutions() {
    const { data, error } = await sb.from("institutions").select("*").order("created_at", {ascending:false});
    if (error) throw error;
    const ids = (data || []).map(i => i.id);
    let modules = [], subscriptions = [], memberships = [], registrationLinks = [];
    if (ids.length) {
      const [m,s,u,l] = await Promise.all([
        sb.from("institution_modules").select("institution_id,module_key,enabled").in("institution_id",ids),
        sb.from("institution_subscriptions").select("id,institution_id,plan_name,amount,currency,billing_cycle,status,starts_at,ends_at").in("institution_id",ids).order("created_at",{ascending:false}),
        sb.from("institution_users").select("institution_id,user_id,role,status").in("institution_id",ids),
        sb.from("institution_registration_links").select("id,institution_id,code,is_active,expires_at").in("institution_id",ids).eq("is_active",true).order("created_at",{ascending:false})
      ]);
      if (m.error) throw m.error;
      if (s.error) throw s.error;
      if (u.error) throw u.error;
      if (l.error) throw l.error;
      modules = m.data || []; subscriptions = s.data || []; memberships = u.data || []; registrationLinks = l.data || [];
    }
    institutions = (data || []).map(i => {
      const sub = subscriptions.find(x => x.institution_id === i.id);
      const member = memberships.find(x => x.institution_id === i.id && x.status === "active");
      const registration = registrationLinks.find(x => x.institution_id === i.id);
      const host = String(i.portal_domain || "").trim().replace(/^https?:\/\//i,"").replace(/\/$/,"");
      const registrationUrl = i.portal_mode === "custom_website" && i.custom_login_url
        ? i.custom_login_url
        : host
          ? "https://" + host + "/register"
          : registration ? window.location.origin + "/registration.html?institution_code=" + encodeURIComponent(registration.code) : "";
      return {...i, _modules:modules.filter(x => x.institution_id === i.id && x.enabled).map(x => x.module_key),
        _subscription:sub || null, _subscriptionId:sub?.id || null, _adminUserId:member?.user_id || null,
        _registrationUrl:registrationUrl, _registrationCode:registration?.code || null};
    });
    renderRows();
  }

  async function writeAudit(institutionId, action, details) {
    const { error } = await sb.from("platform_audit_logs").insert({
      actor_user_id:currentUser.id, institution_id:institutionId || null,
      action, entity_type:"institution", entity_id:institutionId || null, details
    });
    if (error) console.warn("Institution saved; audit log insert failed:", error.message);
  }

  async function saveInstitution(event) {
    event.preventDefault();
    const form = $("cnInstitutionForm");
    if (!form.reportValidity()) return;
    const name = $("cnInstitutionName").value.trim();
    const code = $("cnInstitutionCode").value.trim().toUpperCase();
    const slug = $("cnInstitutionSlug").value.trim().toLowerCase();
    if (!/^[A-Z0-9-]{2,12}$/.test(code)) return notify("Use 2–12 letters, numbers or hyphens for the institution code.", "error");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return notify("Use a URL-friendly slug (lowercase letters, numbers and hyphens).", "error");
    const adminEmail = $("cnInstitutionAdmin").value.trim().toLowerCase();
    const amount = Number($("cnInstitutionAmount").value);
    if (!Number.isFinite(amount) || amount < 0) return notify("Enter a valid subscription amount.", "error");
    const payload = {
      name, short_code:code, slug, institution_type:$("cnInstitutionType").value,
      country:$("cnInstitutionCountry").value.trim() || "Kenya",
      contact_email:$("cnInstitutionEmail").value.trim() || null,
      admin_email:adminEmail || null,
      contact_phone:$("cnInstitutionPhone").value.trim() || null,
      website_url:$("cnInstitutionWebsite").value.trim() || null,
      logo_url:$("cnInstitutionLogo").value.trim() || null,
      portal_domain:$("cnInstitutionDomain").value.trim() || null,
      primary_color:$("cnInstitutionColor").value,
      secondary_color:$("cnInstitutionAccent").value,
      brand_colors:readBrandColors(),
      portal_mode:$("cnInstitutionPortalMode").value,
      custom_login_url:$("cnInstitutionPortalMode").value === "custom_website" ? ($("cnInstitutionCustomLogin").value.trim() || null) : null,
      administrator_portal_url:$("cnInstitutionAdminPortal").value.trim() || null,
      status:$("cnInstitutionStatus").value,
      onboarding_status:"configuring",
      created_by:currentUser.id
    };
    if ($("cnInstitutionPortalMode").value === "custom_website" && !$("cnInstitutionCustomLogin").value.trim()) {
      return notify("Enter the institution's custom login or registration URL.", "error");
    }
    const enabledModules = [...document.querySelectorAll('input[name="cnModule"]:checked')].map(x => x.value);
    setBusy(true);
    try {
      let saved, error;
      if (editingId) {
        ({data:saved,error} = await sb.from("institutions").update({...payload,created_by:undefined,updated_at:new Date().toISOString()}).eq("id",editingId).select("*").single());
      } else {
        ({data:saved,error} = await sb.from("institutions").insert(payload).select("*").single());
      }
      if (error) throw error;

      // Create an institution-specific, unguessable registration link.
      const {data:existingLinks,error:linkReadError} = await sb.from("institution_registration_links")
        .select("id,code").eq("institution_id",saved.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1);
      if (linkReadError) throw linkReadError;
      let registrationCode = existingLinks?.[0]?.code || "";
      if (!registrationCode || registrationCode.length < 40) {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        registrationCode = Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
        if (existingLinks?.[0]?.id) {
          const {error:deactivateError} = await sb.from("institution_registration_links")
            .update({is_active:false}).eq("id",existingLinks[0].id);
          if (deactivateError) throw deactivateError;
        }
        const {error:linkCreateError} = await sb.from("institution_registration_links").insert({
          institution_id:saved.id,code:registrationCode,label:saved.name + " public registration",
          is_active:true,created_by:currentUser.id
        });
        if (linkCreateError) throw linkCreateError;
      }

      const moduleRows = MODULES.map(([module_key]) => ({institution_id:saved.id,module_key,enabled:enabledModules.includes(module_key),updated_at:new Date().toISOString()}));
      const {error:moduleError} = await sb.from("institution_modules").upsert(moduleRows,{onConflict:"institution_id,module_key"});
      if (moduleError) throw moduleError;

      const subPayload = {institution_id:saved.id,plan_name:$("cnInstitutionPlan").value,amount,currency:"KES",
        billing_cycle:$("cnInstitutionCycle").value,status:"active"};
      const existingSub = institutions.find(x => x.id === saved.id)?._subscriptionId;
      const subResult = existingSub
        ? await sb.from("institution_subscriptions").update({...subPayload,updated_at:new Date().toISOString()}).eq("id",existingSub)
        : await sb.from("institution_subscriptions").insert(subPayload);
      if (subResult.error) throw subResult.error;

      let adminNotice = "";
      if (adminEmail) {
        const {data:assignment,error:assignmentError} = await sb.rpc("platform_assign_institution_admin",{
          p_institution_id:saved.id,p_email:adminEmail
        });
        if (assignmentError) throw assignmentError;
        if (!assignment?.assigned) adminNotice = " " + (assignment?.message ||
          "The email is saved. The account will receive institution administrator access after registration and sign-in.");
      }
      await writeAudit(saved.id,editingId ? "institution_updated" : "institution_created",
        {name:saved.name,short_code:saved.short_code,status:saved.status,modules:enabledModules,subscription_plan:subPayload.plan_name,admin_email:adminEmail || null});
      notify((editingId ? "Institution updated." : "Institution created successfully.") + adminNotice,"success");
      resetForm();
      await loadInstitutions();
    } catch (error) {
      console.error("Campus Nexus institution save failed:",error);
      notify(error.message || "Unable to save institution. Check your access and try again.","error");
    } finally { setBusy(false); }
  }

  async function init() {
    const form = $("cnInstitutionForm");
    if (!form) return;
    renderModuleOptions(["student_management","lecturer_portal","administrator_portal","learning_management","examinations","admin_exams","proctoring","finance","transcripts_certificates","analytics_reports"]);
    $("cnInstitutionCancel").addEventListener("click",resetForm);
    $("cnInstitutionSearch").addEventListener("input",renderRows);
    $("cnInstitutionFilter").addEventListener("change",renderRows);
    $("cnInstitutionForm").addEventListener("submit",saveInstitution);
    $("cnInstitutionName").addEventListener("input",() => {
      if (editingId) return;
      const slug = $("cnInstitutionSlug");
      if (!slug.dataset.edited) slug.value = $("cnInstitutionName").value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      const code = $("cnInstitutionCode");
      if (!code.dataset.edited) code.value = $("cnInstitutionName").value.toUpperCase().replace(/[^A-Z0-9]+/g,"").slice(0,8);
    });
    $("cnInstitutionSlug").addEventListener("input",e => e.target.dataset.edited = "1");
    $("cnInstitutionCode").addEventListener("input",e => e.target.dataset.edited = "1");
    $("cnInstitutionRefresh").addEventListener("click",() => loadInstitutions().catch(e => notify(e.message,"error")));
    $("cnInstitutionPortalMode")?.addEventListener("change", () => {
      const custom = $("cnInstitutionPortalMode").value === "custom_website";
      $("cnCustomLoginWrap")?.classList.toggle("is-visible", custom);
      if ($("cnInstitutionCustomLogin")) $("cnInstitutionCustomLogin").required = custom;
    });
    $("cnInstitutionPortalMode")?.dispatchEvent(new Event("change"));
    try {
      await verifyPlatformAdmin();
      await loadInstitutions();
    } catch (error) {
      console.error("Campus Nexus Institution Management:",error);
      $("cnInstitutionAccessError").hidden = false;
      $("cnInstitutionAccessError").textContent = error.message || "Unable to verify platform administrator access.";
      $("cnInstitutionForm").querySelectorAll("input,select,button").forEach(el => el.disabled = true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
