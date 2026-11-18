/* Campus Nexus — Global Institution Dashboard Scope
 * Institution-filtered metrics use explicit tenant membership links.
 * Legacy tables without an institution relationship are never presented
 * as institution-specific data.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const db = () => window.sb || window.supabaseClient || window.supabase || null;
  const fmt = (n) => Number(n || 0).toLocaleString("en-KE");
  const state = { institutions: [], snapshot: null, busy: false };

  const metricDefs = [
    ["institutions","Registered institutions","0","All registered tenants","fa-building","#0f766e","#f0fdfa"],
    ["active","Active institutions","0","Currently enabled","fa-circle-check","#059669","#ecfdf5"],
    ["suspended","Suspended institutions","0","Access should be reviewed","fa-ban","#dc2626","#fef2f2"],
    ["pending","Pending setup","0","Onboarding / status pending","fa-hourglass-half","#d97706","#fffbeb"],
    ["members","Institution user assignments","0","Membership records","fa-users","#2563eb","#eff6ff"],
    ["modules","Enabled institution modules","0","Configured service modules","fa-layer-group","#0d9488","#f0fdfa"],
    ["subscriptions","Subscription records","0","Billing configuration records","fa-receipt","#7c3aed","#f5f3ff"],
    ["audits","Platform audit events","0","Recorded platform actions","fa-shield-halved","#b45309","#fffbeb"]
  ];

  function findGrid(id) {
    let node = $(id);
    while (node && node !== document.body) {
      const style = node.getAttribute && node.getAttribute("style") || "";
      if (/display\s*:\s*grid/i.test(style) && /grid-template-columns/i.test(style)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function buildUnifiedMetrics() {
    const first = findGrid("totalUsers");
    const second = findGrid("totalDailyCheckIns");
    const third = findGrid("systemUptime");
    if (!first) return null;
    first.classList.add("cn-dashboard-metrics-grid");
    [second, third].forEach(grid => {
      if (grid && grid !== first && !first.contains(grid)) {
        Array.from(grid.children).forEach(child => first.appendChild(child));
        grid.remove();
      }
    });
    const portfolio = $("cnPlatformOverview");
    const oldPortfolioCards = portfolio?.querySelectorAll(".cn-platform-card") || [];
    oldPortfolioCards.forEach(card => card.remove());
    metricDefs.forEach(([key,label,value,detail,icon,accent,tint]) => {
      const card = document.createElement("article");
      card.className = "cn-platform-card dashboard-card";
      card.dataset.platformMetric = key;
      card.style.setProperty("--cn-accent",accent);
      card.style.setProperty("--cn-tint",tint);
      card.innerHTML =
        '<span class="cn-platform-icon"><i class="fas ' + icon + '"></i></span>' +
        '<small>' + label + '</small><strong id="cnMetric_' + key + '">' + value + '</strong>' +
        '<em id="cnMetricDetail_' + key + '">' + detail + '</em>';
      first.appendChild(card);
    });
    return first;
  }

  function rememberLegacyMetrics() {
    const ids = ["totalUsers","pendingApprovals","totalStudents","dashboardOpenTickets",
      "totalDailyCheckIns","overallCheckInCount","dashboardUrgentTickets","activeSessions",
      "totalCourses","totalResources","dashboardTotalPrograms"];
    state.snapshot = {};
    ids.forEach(id => {
      const el = $(id);
      if (el) state.snapshot[id] = el.textContent;
    });
  }

  function setMetric(id,value,detail) {
    const el = $(id);
    if (el) el.textContent = value;
    if (detail && el) {
      const card = el.closest(".dashboard-card");
      const sub = card?.querySelector(".minor-data");
      if (sub) sub.textContent = detail;
    }
  }

  function setPlatform(key,value,detail) {
    const el = $("cnMetric_" + key);
    const sub = $("cnMetricDetail_" + key);
    if (el) el.textContent = value;
    if (sub) sub.textContent = detail;
  }

  function markUnavailable(id,reason) {
    const el = $(id);
    if (!el) return;
    el.textContent = "—";
    const card = el.closest(".dashboard-card");
    const sub = card?.querySelector(".minor-data");
    if (sub) sub.textContent = reason || "Not yet linked to an institution";
    card?.classList.add("cn-scope-unavailable");
  }

  function restoreLegacyMetrics() {
    if (!state.snapshot) return;
    Object.entries(state.snapshot).forEach(([id,value]) => {
      const el = $(id);
      if (el) {
        el.textContent = value;
        el.closest(".dashboard-card")?.classList.remove("cn-scope-unavailable");
      }
    });
    const labels = {
      totalUsers:"All system users", totalStudents:"Active students",
      pendingApprovals:"Waiting for approval", dashboardOpenTickets:"Open awaiting response",
      totalDailyCheckIns:"Check-ins today", overallCheckInCount:"All-time records",
      dashboardUrgentTickets:"High priority", activeSessions:"Currently online",
      totalCourses:"Across all programs", totalResources:"Total available",
      dashboardTotalPrograms:"Available programs"
    };
    Object.entries(labels).forEach(([id,label]) => {
      const el=$(id); const sub=el?.closest(".dashboard-card")?.querySelector(".minor-data");
      if(sub) sub.textContent=label;
    });
  }

  async function getAdminDb() {
    const client = db();
    if (!client?.auth || typeof client.from !== "function") throw new Error("Database session is not available.");
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data?.user) throw new Error("Please sign in again.");
    const profile = await client.from("consolidated_user_profiles_table")
      .select("role").eq("user_id",auth.data.user.id).limit(1).maybeSingle();
    if (profile.error) throw profile.error;
    if (!["superadmin","super_admin"].includes(String(profile.data?.role || "").toLowerCase())) {
      throw new Error("Super Admin access is required.");
    }
    return client;
  }

  async function loadPlatform(client) {
    const [institutions,members,modules,subscriptions,audits] = await Promise.all([
      client.from("institutions").select("id,name,short_code,status,onboarding_status").order("name"),
      client.from("institution_users").select("id,institution_id,user_id,role,status"),
      client.from("institution_modules").select("id,institution_id,enabled"),
      client.from("institution_subscriptions").select("id,institution_id,plan_name,amount,currency,status"),
      client.from("platform_audit_logs").select("id,institution_id")
    ]);
    [institutions,members,modules,subscriptions,audits].forEach(result => { if(result.error) throw result.error; });
    state.institutions = institutions.data || [];
    const rows = state.institutions;
    setPlatform("institutions",fmt(rows.length),"All registered tenants");
    setPlatform("active",fmt(rows.filter(x=>x.status==="active").length),"Currently enabled");
    setPlatform("suspended",fmt(rows.filter(x=>x.status==="suspended").length),"Access should be reviewed");
    setPlatform("pending",fmt(rows.filter(x=>x.status!=="active"&&x.status!=="suspended").length),"Onboarding / status pending");
    setPlatform("members",fmt((members.data||[]).length),"Membership records");
    setPlatform("modules",fmt((modules.data||[]).filter(x=>x.enabled).length),"Configured service modules");
    setPlatform("subscriptions",fmt((subscriptions.data||[]).length),"Billing configuration records");
    setPlatform("audits",fmt((audits.data||[]).length),"Recorded platform actions");
    const select=$("cnInstitutionFilter");
    if(select){
      const current=select.value||"all";
      select.innerHTML='<option value="all">All institutions</option>'+rows.map(row =>
        '<option value="'+row.id.replace(/"/g,"")+'">'+
        String(row.name||"Unnamed institution").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+
        (row.short_code?" ("+String(row.short_code)+")":"")+'</option>'
      ).join("");
      select.value=rows.some(x=>x.id===current)?current:"all";
    }
    return {members:members.data||[],modules:modules.data||[],subscriptions:subscriptions.data||[],audits:audits.data||[]};
  }

  function updateScopeText(institution) {
    const title=$("cnDashboardScopeTitle");
    const desc=$("cnDashboardScopeDescription");
    if(title) title.textContent=institution?institution.name:"All institutions";
    if(desc) desc.textContent=institution
      ? "Institution-only figures. Legacy academic records are excluded until they are tenant-linked."
      : "Consolidated platform view. Existing academic metrics remain legacy NCHSM data until tenant migration is complete.";
  }

  async function applyInstitutionScope(client,institution,platform) {
    const id=institution.id;
    const members=platform.members.filter(x=>x.institution_id===id);
    const userIds=[...new Set(members.map(x=>x.user_id).filter(Boolean))];
    const profileResult=userIds.length
      ? await client.from("consolidated_user_profiles_table").select("id,user_id,role").in("user_id",userIds)
      : {data:[],error:null};
    if(profileResult.error) throw profileResult.error;
    const profiles=profileResult.data||[];
    const profileIds=profiles.map(x=>x.id).filter(Boolean);
    const today=new Date(); today.setHours(0,0,0,0);
    const todayIso=today.toISOString();
    const jobs=[];
    const add=(key,promise)=>jobs.push([key,promise]);
    if(userIds.length){
      add("sessions",client.from("user_sessions").select("id",{count:"exact",head:true}).in("user_id",userIds).eq("is_active",true));
      add("attendance",client.from("geo_attendance_logs").select("id,created_at",{count:"exact"}).in("user_id",userIds));
      add("todayAttendance",client.from("geo_attendance_logs").select("id",{count:"exact",head:true}).in("user_id",userIds).gte("created_at",todayIso));
      add("courses",client.from("courses").select("id",{count:"exact",head:true}).in("created_by",userIds));
      add("resources",client.from("resources").select("id",{count:"exact",head:true}).in("uploaded_by",userIds));
    }
    if(profileIds.length) add("tickets",client.from("support_tickets").select("id,status,priority").in("student_id",profileIds));
    const results={};
    for(const [key,promise] of jobs){
      const result=await promise;
      if(result.error) { console.warn("[Campus Nexus dashboard filter]",key,result.error.message); results[key]={unavailable:true}; }
      else results[key]=result;
    }

    const activeMembers=members.filter(x=>x.status==="active");
    const students=members.filter(x=>String(x.role||"").toLowerCase()==="student");
    const pending=members.filter(x=>x.status==="pending");
    setMetric("totalUsers",fmt(members.length),"Users assigned to this institution");
    setMetric("totalStudents",fmt(students.length),"Student memberships in this institution");
    setMetric("pendingApprovals",fmt(pending.length),"Pending institution memberships");
    setMetric("activeSessions",results.sessions?.unavailable?"—":fmt(results.sessions?.count||0),"Active sessions for institution members");
    setMetric("totalDailyCheckIns",results.todayAttendance?.unavailable?"—":fmt(results.todayAttendance?.count||0),"Institution members · today");
    setMetric("overallCheckInCount",results.attendance?.unavailable?"—":fmt(results.attendance?.count||0),"Institution members · all time");
    setMetric("totalCourses",results.courses?.unavailable?"—":fmt(results.courses?.count||0),"Courses created by institution members");
    setMetric("totalResources",results.resources?.unavailable?"—":fmt(results.resources?.count||0),"Resources uploaded by institution members");

    if(results.tickets?.unavailable){markUnavailable("dashboardOpenTickets","Ticket ownership could not be verified");markUnavailable("dashboardUrgentTickets","Ticket ownership could not be verified");}
    else {
      const tickets=results.tickets?.data||[];
      const open=tickets.filter(t=>!["closed","resolved","complete","completed"].includes(String(t.status||"").toLowerCase()));
      const urgent=open.filter(t=>["urgent","high","critical"].includes(String(t.priority||"").toLowerCase()));
      setMetric("dashboardOpenTickets",fmt(open.length),"Open tickets for institution students");
      setMetric("dashboardUrgentTickets",fmt(urgent.length),"Urgent tickets for institution students");
    }
    markUnavailable("dashboardTotalPrograms","Program records do not yet carry an institution link");
    // Institution users and role memberships are the only valid basis for these counts.
    setPlatform("institutions","1","Selected institution");
    setPlatform("active",institution.status==="active"?"1":"0","Institution status: "+institution.status);
    setPlatform("suspended",institution.status==="suspended"?"1":"0","Suspension status");
    setPlatform("pending",institution.onboarding_status==="ready"?"0":"1","Setup: "+institution.onboarding_status);
    setPlatform("members",fmt(members.length),fmt(activeMembers.length)+" active memberships");
    setPlatform("modules",fmt(platform.modules.filter(x=>x.institution_id===id&&x.enabled).length),"Enabled for this institution");
    setPlatform("subscriptions",fmt(platform.subscriptions.filter(x=>x.institution_id===id).length),"Subscriptions for this institution");
    setPlatform("audits",fmt(platform.audits.filter(x=>x.institution_id===id).length),"Audit events for this institution");
    const profilesCard=$("totalUsers")?.closest(".dashboard-card");
    if(profilesCard) profilesCard.classList.remove("cn-scope-unavailable");
  }

  async function refresh() {
    if(state.busy) return;
    state.busy=true;
    const button=$("cnPlatformRefresh");
    if(button){button.disabled=true;button.classList.add("is-loading");}
    const updated=$("cnPlatformMetricsUpdated");
    if(updated) updated.textContent="Refreshing institution data…";
    try{
      const client=await getAdminDb();
      const platform=await loadPlatform(client);
      const selected=$("cnInstitutionFilter")?.value||"all";
      const institution=state.institutions.find(x=>x.id===selected);
      updateScopeText(institution||null);
      if(institution) await applyInstitutionScope(client,institution,platform);
      else restoreLegacyMetrics();
      if(updated) updated.textContent="Updated "+new Intl.DateTimeFormat("en-KE",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nairobi"}).format(new Date());
    }catch(error){
      console.error("[Campus Nexus dashboard filter]",error);
      if(updated) updated.textContent="Institution data unavailable: "+(error.message||"Check access");
    }finally{
      state.busy=false;
      if(button){button.disabled=false;button.classList.remove("is-loading");}
    }
  }

  function init() {
    buildUnifiedMetrics();
    // Capture the legacy NCHSM dashboard figures after its original loaders run.
    setTimeout(rememberLegacyMetrics,1600);
    $("cnInstitutionFilter")?.addEventListener("change",refresh);
    $("cnPlatformRefresh")?.addEventListener("click",refresh);
    refresh();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
