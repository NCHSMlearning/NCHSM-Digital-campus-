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
  const state = { institutions: [], moduleMap: {}, snapshot: null, busy: false, refreshQueued: false, metricLock: null, legacyTextSnapshot: {}, access: { platformAdmin: false, userId: null, institutionId: null } };

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
    const ids = ["dashboardOpenTickets","totalDailyCheckIns","overallCheckInCount","dashboardUrgentTickets","activeSessions","totalCourses","totalResources","dashboardTotalPrograms","dashboardTotalUnits","dashboardPendingUnitReg","dashboardUpcomingExams","dashboardPendingMessages","dashboardLecturersCount","dashboardAttendanceToday","dashboardTotalSessions","totalStaffCount","totalStaffCountDisplay","totalResourcesDisplay","krchnCountDisplay","tvetCountDisplay","statsTotalStudents","statsKrchnCount","statsTvetCount","statsProgramCount","statsMaleTotal","statsFemaleTotal","activeProgramsCount","inactiveProgramsCount","totalIntakesCount","totalBlocksCount","dataIntegrityScore","dashboardPendingMarks","dashboardPublishedMarks","dashboardPendingReviews","dashboardSystemAlerts","systemUptime","totalUsers","totalStudents","pendingApprovals"];
    state.snapshot = {};
    ids.forEach(id => {
      const el = $(id);
      if (el) {
        const card=el.closest(".dashboard-card");
        const detail=card?.querySelector(".minor-data") || [...(card?.querySelectorAll("p") || [])].find(node=>node!==el);
        state.snapshot[id]={value:el.textContent,detail:detail?.textContent||null};
      }
    });
    ["userGrowth","pendingGrowth","studentGrowth","ticketGrowth"].forEach(id=>{
      const el=$(id); if(el) state.legacyTextSnapshot[id]=el.textContent;
    });
  }

  function setMetric(id,value,detail) {
    const el = $(id);
    if (el) el.textContent = value;
    if (detail && el) {
      const card=el.closest(".dashboard-card");
      const sub=card?.querySelector(".minor-data") || [...(card?.querySelectorAll("p") || [])].find(node=>node!==el);
      if(sub) sub.textContent=detail;
    }
  }

  function releaseScopedMetricLock() {
    if (state.metricLock?.observer) state.metricLock.observer.disconnect();
    state.metricLock = null;
  }

  // Older dashboard loaders can finish after the tenant query and overwrite
  // these same DOM nodes with global NCHSM totals. Keep tenant-scoped values
  // authoritative while an institution is selected.
  function lockScopedMetrics(entries) {
    releaseScopedMetricLock();
    const targets = [];
    Object.entries(entries).forEach(([id,entry]) => {
      const valueEl = $(id);
      if (!valueEl) return;
      const card = valueEl.closest(".dashboard-card");
      const detailEl = entry.textOnly ? null : (card?.querySelector(".minor-data") || [...(card?.querySelectorAll("p") || [])].find(node => node !== valueEl));
      const apply = () => {
        if (valueEl.textContent !== String(entry.value)) valueEl.textContent = String(entry.value);
        if (detailEl && entry.detail && detailEl.textContent !== entry.detail) detailEl.textContent = entry.detail;
        card?.classList.toggle("cn-scope-unavailable",!!entry.unavailable);
      };
      apply();
      targets.push({ valueEl, detailEl, apply });
    });
    if (!targets.length) return;
    const observer = new MutationObserver(() => targets.forEach(target => target.apply()));
    targets.forEach(({valueEl,detailEl}) => {
      observer.observe(valueEl,{childList:true,subtree:true,characterData:true});
      if (detailEl) observer.observe(detailEl,{childList:true,subtree:true,characterData:true});
    });
    state.metricLock = {observer};
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
    const sub = card?.querySelector(".minor-data") || [...(card?.querySelectorAll("p") || [])].find(node => node !== el);
    if (sub) sub.textContent = reason || "Not yet linked to an institution";
    card?.classList.add("cn-scope-unavailable");
  }

  function restoreLegacyMetrics() {
    if (!state.snapshot) return;
    Object.entries(state.snapshot).forEach(([id,value]) => {
      const el = $(id);
      if (el) {
        el.textContent = value?.value ?? value;
        const card=el.closest(".dashboard-card");
        const detail=card?.querySelector(".minor-data") || [...(card?.querySelectorAll("p") || [])].find(node=>node!==el);
        if(detail && value?.detail!==undefined && value.detail!==null) detail.textContent=value.detail;
        card?.classList.remove("cn-scope-unavailable");
      }
    });
    const labels = {
      totalUsers:"Legacy NCHSM data · not tenant-linked", totalStudents:"Legacy NCHSM data · not tenant-linked",
      pendingApprovals:"Legacy NCHSM data · not tenant-linked", dashboardOpenTickets:"Legacy NCHSM data · not tenant-linked",
      totalDailyCheckIns:"Legacy NCHSM data · not tenant-linked", overallCheckInCount:"Legacy NCHSM data · not tenant-linked",
      dashboardUrgentTickets:"Legacy NCHSM data · not tenant-linked", activeSessions:"Legacy NCHSM data · not tenant-linked",
      totalCourses:"Legacy NCHSM data · not consolidated across institutions",
      totalResources:"Legacy NCHSM data · not consolidated across institutions",
      dashboardTotalPrograms:"Legacy NCHSM data · not consolidated across institutions",
      dashboardTotalUnits:"Legacy NCHSM catalogue · not consolidated across institutions",
      dashboardPendingUnitReg:"Legacy NCHSM registrations · not consolidated across institutions",
      dashboardUpcomingExams:"Legacy NCHSM exam data · not consolidated across institutions",
      dashboardPendingMessages:"Legacy NCHSM messages · not consolidated across institutions",
      dashboardLecturersCount:"Legacy NCHSM staff data · not consolidated across institutions",
      dashboardAttendanceToday:"Legacy NCHSM attendance · not consolidated across institutions",
      dashboardTotalSessions:"Legacy NCHSM sessions · not consolidated across institutions",
      totalStaffCount:"Legacy NCHSM staff data · not consolidated across institutions",
      totalStaffCountDisplay:"Legacy NCHSM staff data · not consolidated across institutions",
      krchnCountDisplay:"Legacy NCHSM programme data · not consolidated across institutions",
      tvetCountDisplay:"Legacy NCHSM programme data · not consolidated across institutions",
      statsKrchnCount:"Legacy NCHSM programme data · not consolidated across institutions",
      statsTvetCount:"Legacy NCHSM programme data · not consolidated across institutions",
      statsProgramCount:"Legacy NCHSM programme data · not consolidated across institutions",
      activeProgramsCount:"Legacy NCHSM programme data · not consolidated across institutions",
      inactiveProgramsCount:"Legacy NCHSM programme data · not consolidated across institutions",
      totalIntakesCount:"Legacy NCHSM intake data · not consolidated across institutions",
      totalBlocksCount:"Legacy NCHSM block data · not consolidated across institutions"
    };
    Object.entries(state.legacyTextSnapshot||{}).forEach(([id,value])=>{const el=$(id);if(el)el.textContent=value;});
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
    const userId = auth.data.user.id;
    const [profile,platform] = await Promise.all([
      client.from("consolidated_user_profiles_table").select("role,status,login_enabled")
        .eq("user_id",userId).limit(1).maybeSingle(),
      client.rpc("is_current_user_superadmin")
    ]);
    if (profile.error) throw profile.error;
    if (platform.error) throw platform.error;
    const platformAdmin = platform.data === true;
    if (platformAdmin) {
      state.access = { platformAdmin:true, userId, institutionId:null };
      return client;
    }
    const memberships = await client.from("institution_users")
      .select("institution_id,role,status").eq("user_id",userId).eq("status","active");
    if (memberships.error) throw memberships.error;
    const adminMemberships = (memberships.data || []).filter(row =>
      String(row.role || "").toLowerCase() === "institution_admin");
    if (String(profile.data?.role || "").toLowerCase() !== "institution_admin" ||
        !["active","approved"].includes(String(profile.data?.status || "").toLowerCase()) ||
        profile.data?.login_enabled === false || adminMemberships.length !== 1) {
      throw new Error("This account is not assigned as an active institution administrator. Contact the Campus Nexus Platform Super Admin.");
    }
    state.access = { platformAdmin:false, userId, institutionId:adminMemberships[0].institution_id };
    return client;
  }

  async function loadPlatform(client) {
    const [institutions,members,modules,subscriptions,audits] = await Promise.all([
      client.from("institutions").select("id,name,short_code,status,onboarding_status").order("name"),
      client.from("institution_users").select("id,institution_id,user_id,role,status"),
      client.from("institution_modules").select("id,institution_id,enabled,module_key"),
      client.from("institution_subscriptions").select("id,institution_id,plan_name,amount,currency,status"),
      client.from("platform_audit_logs").select("id,institution_id")
    ]);
    [institutions,members,modules].forEach(result => { if(result.error) throw result.error; });
    if(state.access.platformAdmin && (subscriptions.error || audits.error)) throw (subscriptions.error || audits.error);
    const safeSubscriptions = subscriptions.error ? [] : (subscriptions.data || []);
    const safeAudits = audits.error ? [] : (audits.data || []);
    state.institutions = institutions.data || [];
    state.moduleMap = {};
    (modules.data || []).forEach(row => {
      if (!state.moduleMap[row.institution_id]) state.moduleMap[row.institution_id] = [];
      if (row.enabled) state.moduleMap[row.institution_id].push(row.module_key);
    });
    const rows = state.institutions;
    setPlatform("institutions",fmt(rows.length),"All registered tenants");
    setPlatform("active",fmt(rows.filter(x=>x.status==="active").length),"Currently enabled");
    setPlatform("suspended",fmt(rows.filter(x=>x.status==="suspended").length),"Access should be reviewed");
    setPlatform("pending",fmt(rows.filter(x=>x.status!=="active"&&x.status!=="suspended").length),"Onboarding / status pending");
    setPlatform("members",fmt((members.data||[]).length),"Membership records");
    setPlatform("modules",fmt((modules.data||[]).filter(x=>x.enabled).length),"Configured service modules");
    setPlatform("subscriptions",fmt(safeSubscriptions.length),state.access.platformAdmin?"Billing configuration records":"Platform billing is managed centrally");
    setPlatform("audits",fmt(safeAudits.length),state.access.platformAdmin?"Recorded platform actions":"Platform audit feed is restricted to the central administrator");
    const select=$("cnGlobalInstitutionFilter");
    if(select){
      const live=select.value||"all";
      let saved=null;try{saved=localStorage.getItem(SCOPE_KEY);}catch(_){}
      const current=live!=="all"?live:(saved||live);
      select.innerHTML='<option value="all">All institutions</option>'+rows.map(row =>
        '<option value="'+row.id.replace(/"/g,"")+'">'+
        String(row.name||"Unnamed institution").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+
        (row.short_code?" ("+String(row.short_code)+")":"")+'</option>'
      ).join("");
      select.value=rows.some(x=>x.id===current)?current:"all";
      try{localStorage.setItem(SCOPE_KEY,select.value);}catch(_){}
    }
    return {members:members.data||[],modules:modules.data||[],subscriptions:safeSubscriptions,audits:safeAudits};
  }


  const SCOPE_KEY = "campusNexus.selectedInstitution";
  function selectedInstitutionId() {
    return $("cnGlobalInstitutionFilter")?.value || "all";
  }
  function selectedInstitution() {
    const id=selectedInstitutionId();
    return state.institutions.find(x=>x.id===id)||null;
  }
  function applyGlobalSidebarScope(detail) {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    const institution = detail?.institution || null;
    const nav = sidebar.querySelector("#mainNav, #navMenu, nav");
    const header = sidebar.querySelector(".sidebar-header, .brand, .sidebar-brand");
    if (header) {
      let scopeLabel = header.querySelector("[data-cn-sidebar-scope]");
      if (!scopeLabel) {
        scopeLabel = document.createElement("small");
        scopeLabel.dataset.cnSidebarScope = "true";
        scopeLabel.style.cssText = "display:block;margin-top:6px;font-size:11px;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        header.appendChild(scopeLabel);
      }
      scopeLabel.textContent = institution?.name || "All institutions";
      scopeLabel.title = scopeLabel.textContent;
    }
    if (!nav) return;
    const enabled = detail?.enabledModules;
    const moduleHints = [
      ["finance",/finance|payment|fee|invoice/i],
      ["human_resources",/human resource|staff management|payroll|leave/i],
      ["learning_management",/learning|course|resource|classroom|lms/i],
      ["examinations",/exam|assessment|question bank|results/i],
      ["proctoring",/proctor|invigilation/i],
      ["transcripts_certificates",/transcript|certificate|graduation/i],
      ["analytics_reports",/analytic|report|performance/i],
      ["student_management",/student|admission|enrol|registration/i]
    ];
    nav.querySelectorAll("a,button,[role='menuitem']").forEach(item => {
      if (!item.dataset.cnOriginalDisplay) item.dataset.cnOriginalDisplay = item.style.display || "";
      let moduleKey = item.dataset.cnModule || "";
      if (!moduleKey) {
        const label = (item.textContent || "").trim();
        moduleKey = moduleHints.find(([key,pattern]) => pattern.test(label))?.[0] || "";
        if (moduleKey) item.dataset.cnModule = moduleKey;
      }
      if (!moduleKey) { item.style.display = item.dataset.cnOriginalDisplay; return; }
      item.style.display = !institution || !Array.isArray(enabled) || enabled.includes(moduleKey)
        ? item.dataset.cnOriginalDisplay : "none";
      item.setAttribute("aria-hidden", item.style.display === "none" ? "true" : "false");
    });
    nav.querySelectorAll(".nav-group, .menu-group").forEach(group => {
      const items = [...group.querySelectorAll("a,button,[role='menuitem']")];
      if (items.length) group.style.display = items.some(item => item.style.display !== "none") ? "" : "none";
    });
    sidebar.dataset.cnInstitutionScope = institution?.id || "all";
  }

  function publishScope() {
    const institution=selectedInstitution();
    const detail={institutionId:institution?.id||null,institution:institution||null,allInstitutions:!institution,
      enabledModules:institution?(state.moduleMap[institution.id]||[]):null};
    window.CampusNexusScope = Object.assign(window.CampusNexusScope||{}, {
      getInstitutionId:()=>selectedInstitutionId()==="all"?null:selectedInstitutionId(),
      getInstitution:()=>selectedInstitution(),
      isGlobal:()=>selectedInstitutionId()==="all",
      subscribe:(callback)=>{
        if(typeof callback!=="function") return ()=>{};
        const handler=event=>callback(event.detail||{});
        window.addEventListener("campusnexus:institution-change",handler);
        return ()=>window.removeEventListener("campusnexus:institution-change",handler);
      },
      apply:(query,column="institution_id")=>{
        const id=selectedInstitutionId();
        return id==="all"?query:query.eq(column,id);
      },
      requireSelection:()=>{
        const id=selectedInstitutionId();
        if(id==="all") throw new Error("Select an institution before loading institution-specific records.");
        return id;
      }
    });
    window.dispatchEvent(new CustomEvent("campusnexus:institution-change",{detail}));
    applyGlobalSidebarScope(detail);
    document.documentElement.dataset.cnInstitutionScope=institution?.id||"all";
    document.querySelectorAll("[data-cn-scope-label]").forEach(el=>{
      el.textContent=institution?.name||"All institutions";
    });
  }

  function updateScopeText(institution) {
    const title=$("cnDashboardScopeTitle");
    const desc=$("cnDashboardScopeDescription");
    if(title) title.textContent=institution?institution.name:"All institutions";
    if(desc) desc.textContent=institution
      ? "Institution-only figures. Legacy academic records are excluded until they are tenant-linked."
      : "Consolidated platform view. Existing academic metrics remain legacy NCHSM data until tenant migration is complete.";
  }

  async function loadGlobalIdentityMetrics(client) {
    const [total,students,pending] = await Promise.all([
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("role","student"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("status","pending")
    ]);
    [total,students,pending].forEach(result=>{if(result.error) throw result.error;});
    setMetric("totalUsers",fmt(total.count||0),"All platform user profiles");
    setMetric("totalStudents",fmt(students.count||0),"All platform student profiles");
    setMetric("pendingApprovals",fmt(pending.count||0),"Pending platform profile approvals");
  }

  function scopeQuery(query,id) { return id ? query.eq("institution_id",id) : query; }

  const dashboardCharts = window.cnDashboardCharts || (window.cnDashboardCharts = {});
  function drawDashboardChart(canvasId,type,labels,values,label) {
    const canvas=$(canvasId);
    if(!canvas || typeof window.Chart!=="function") return;
    if(dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();
    const existing=window.Chart.getChart?.(canvas);
    if(existing && existing!==dashboardCharts[canvasId]) existing.destroy();
    const ctx=canvas.getContext("2d");
    if(!ctx) return;
    dashboardCharts[canvasId]=new window.Chart(ctx,{
      type,
      data:{labels,datasets:[{label,data:values,borderWidth:2,tension:.32,backgroundColor:type==="doughnut"?["#0A3D62","#FDB913","#10b981","#94a3b8"]: "rgba(10,61,98,.18)",borderColor:"#0A3D62",fill:type==="line"}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="doughnut",position:"bottom"}},scales:type==="doughnut"?{}:{y:{beginAtZero:true,ticks:{precision:0}}}}
    });
  }

  function renderTenantCharts(profiles,activityRows,students,krchn,tvet,programRows) {
    const learnerRows=(profiles||[]).filter(p=>String(p.role||"").toLowerCase()==="student");
    const blockCounts={};
    learnerRows.forEach(p=>{const block=String(p.block||"Not assigned").trim()||"Not assigned";blockCounts[block]=(blockCounts[block]||0)+1;});
    const blockLabels=Object.keys(blockCounts).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    drawDashboardChart("enrolmentBlockChart","bar",blockLabels.length?blockLabels:["No block data"],blockLabels.length?blockLabels.map(x=>blockCounts[x]):[0],"Students");
    const genderCounts={"Male":0,"Female":0,"Other / not specified":0};
    learnerRows.forEach(p=>{
      const g=String(p.gender||"").trim().toLowerCase();
      if(["m","male"].includes(g)) genderCounts.Male++;
      else if(["f","female"].includes(g)) genderCounts.Female++;
      else genderCounts["Other / not specified"]++;
    });
    drawDashboardChart("genderDistributionChart","doughnut",Object.keys(genderCounts),Object.values(genderCounts),"Students");
    const catalog=new Map((programRows||[]).map(p=>[String(p.program_code||"").trim().toUpperCase(),p]));
    const byProgram={},categoryCounts={KRCHN:0,TVET:0,Unclassified:0};
    learnerRows.forEach(p=>{
      const code=String(p.program||"").trim().toUpperCase()||"Not assigned";
      const meta=catalog.get(code);
      const type=String(p.program_type||meta?.category||meta?.program_type||"").toLowerCase();
      const category=type.includes("krchn")||code==="KRCHN"?"KRCHN":(type.includes("tvet")||!!meta||type.includes("artisan")||type.includes("certificate")||type.includes("diploma"))?"TVET":"Unclassified";
      categoryCounts[category]++;
      if(!byProgram[code]) byProgram[code]={type:category,total:0,male:0,female:0};
      byProgram[code].total++;
      const gender=String(p.gender||"").trim().toLowerCase();
      if(["m","male"].includes(gender)) byProgram[code].male++;
      if(["f","female"].includes(gender)) byProgram[code].female++;
    });
    drawDashboardChart("programBreakdownChart","doughnut",Object.keys(categoryCounts),Object.values(categoryCounts),"Students");
    const tbody=$("statsProgramBreakdown");
    if(tbody){
      const rows=Object.entries(byProgram).sort((a,b)=>b[1].total-a[1].total);
      const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
      tbody.innerHTML=rows.length?rows.map(([code,item])=>{
        const ratio=item.male+item.female?Math.round(item.male/(item.male+item.female)*100)+":"+Math.round(item.female/(item.male+item.female)*100):"—";
        return '<tr><td style="padding:9px 12px;border-bottom:1px solid #e5e7eb">'+esc(code)+'</td><td style="padding:9px 12px;text-align:center;border-bottom:1px solid #e5e7eb">'+esc(item.type)+'</td><td style="padding:9px 12px;text-align:center;border-bottom:1px solid #e5e7eb">'+item.total+'</td><td style="padding:9px 12px;text-align:center;border-bottom:1px solid #e5e7eb">'+item.male+'</td><td style="padding:9px 12px;text-align:center;border-bottom:1px solid #e5e7eb">'+item.female+'</td><td style="padding:9px 12px;text-align:center;border-bottom:1px solid #e5e7eb">'+ratio+'</td><td style="padding:9px 12px;text-align:center;border-bottom:1px solid #e5e7eb">'+(students?Math.round(item.total/students*100):0)+'%</td></tr>';
      }).join(""):'<tr><td colspan="7" style="padding:18px;text-align:center;color:#94a3b8">No student programme data available.</td></tr>';
    }
    const now=Date.now(),counts=Array.from({length:24},(_,h)=>({label:new Date(now-(23-h)*3600000).toLocaleTimeString("en-KE",{hour:"2-digit",timeZone:"Africa/Nairobi"}),count:0}));
    (activityRows||[]).forEach(row=>{
      const stamp=Date.parse(row.created_at||"");
      if(!Number.isFinite(stamp)) return;
      const age=Math.floor((now-stamp)/3600000);
      if(age>=0&&age<24) counts[23-age].count++;
    });
    drawDashboardChart("performanceChart","line",counts.map(x=>x.label),counts.map(x=>x.count),"Audit events");
    return categoryCounts;
  }


  function renderDashboardBirthdays(profiles) {
    const root=$("birthdayStudentsList");
    if(!root) return;
    const now=new Date(),month=now.getMonth();
    const upcoming=(profiles||[]).filter(p=>String(p.role||"").toLowerCase()==="student"&&p.date_of_birth)
      .map(p=>({name:p.full_name||"Student",program:p.program||"",dob:new Date(p.date_of_birth)}))
      .filter(p=>!Number.isNaN(p.dob.getTime())&&p.dob.getMonth()===month)
      .sort((a,b)=>a.dob.getDate()-b.dob.getDate());
    const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    root.innerHTML=upcoming.length?upcoming.map(p=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 4px;border-bottom:1px solid #e5e7eb"><strong style="font-size:12px;color:#0A3D62">'+esc(p.name)+'</strong><span style="font-size:11px;color:#64748b">'+esc(p.program)+' · '+p.dob.getDate()+'</span></div>').join(""):'<p style="color:#94a3b8;font-size:12px">No student birthdays recorded for this month in the selected scope.</p>';
  }

  function renderDashboardActivity(rows,scopeLabel) {
    const root=$("activityFeed");
    if(!root) return;
    const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const time=value=>value?new Intl.DateTimeFormat("en-KE",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Nairobi"}).format(new Date(value)):"Time unavailable";
    if(!rows?.length){
      root.innerHTML='<div style="padding:18px;text-align:center;color:#94a3b8;font-size:12px">No recorded activity for '+esc(scopeLabel||"this scope")+' yet.</div>';
      return;
    }
    root.innerHTML=rows.slice(0,8).map(row=>{
      const actor=row.actor_name||row.user_email||"Unidentified user";
      const action=[row.action_type,row.module].filter(Boolean).join(" · ")||"System activity";
      const detail=row.description||row.status||"Activity recorded";
      return '<div style="display:flex;gap:10px;padding:9px 2px;border-bottom:1px solid #eef2f7;align-items:flex-start">'+
        '<span style="width:8px;height:8px;margin-top:5px;border-radius:50%;background:#0f766e;flex:0 0 8px"></span>'+
        '<div style="min-width:0;flex:1"><div style="font-size:12px;color:#0f3b53;font-weight:700">'+esc(actor)+'</div>'+
        '<div style="font-size:11px;color:#475569;margin-top:2px">'+esc(action)+'</div>'+
        '<div style="font-size:11px;color:#64748b;margin-top:2px;overflow-wrap:anywhere">'+esc(detail)+'</div></div>'+
        '<time style="font-size:10px;color:#94a3b8;white-space:nowrap">'+esc(time(row.created_at))+'</time></div>';
    }).join("");
    const stamp=$("feedTimestamp");
    if(stamp) stamp.textContent="Updated "+new Intl.DateTimeFormat("en-KE",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nairobi"}).format(new Date());
  }

  async function applyInstitutionScope(client,institution,platform) {
    const id=institution?.id||null;
    const profileQuery=scopeQuery(client.from("consolidated_user_profiles_table")
      .select("id,user_id,role,status,program,program_type,block,gender,created_at,full_name,admission_number,date_of_birth",{count:"exact"}),id).limit(2000);
    const profileResult=await profileQuery;
    if(profileResult.error) throw profileResult.error;
    const members=profileResult.data||[];
    const userIds=[...new Set(members.map(x=>x.user_id).filter(Boolean))];
    const totalUsers=profileResult.count ?? members.length;
    const profileCount=(apply)=>apply(scopeQuery(client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}),id));
    const [studentCount,pendingCount,activeCount,krchnCount,tvetCount,lecturerCount,staffCount,maleCount,femaleCount] = await Promise.all([
      profileCount(q=>q.ilike("role","student")),
      profileCount(q=>q.ilike("status","pending")),
      profileCount(q=>q.ilike("status","active")),
      profileCount(q=>q.ilike("role","student").ilike("program_type","krchn")),
      profileCount(q=>q.ilike("role","student").ilike("program_type","tvet")),
      profileCount(q=>q.ilike("role","lecturer")),
      profileCount(q=>q.not("role","in",'("student","applicant","superadmin","super_admin")')),
      profileCount(q=>q.ilike("role","student").in("gender",["male","m"])),
      profileCount(q=>q.ilike("role","student").in("gender",["female","f"]))
    ]);
    [studentCount,pendingCount,activeCount,krchnCount,tvetCount,lecturerCount,staffCount,maleCount,femaleCount].forEach(result=>{if(result.error) throw result.error;});

    const nairobiDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const todayStart=new Date(nairobiDate+"T00:00:00+03:00").toISOString();
    const todayEnd=new Date(new Date(todayStart).getTime()+86400000).toISOString();
    const [localYear,localMonth,localDay]=nairobiDate.split("-").map(Number);
    const localNoonUtc=Date.UTC(localYear,localMonth-1,localDay,12,0,0);
    const weekday=(new Date(localNoonUtc).getUTCDay()+6)%7;
    const localDateString=(offsetDays)=>{
      const date=new Date(localNoonUtc+(offsetDays-weekday)*86400000);
      return date.getUTCFullYear()+"-"+String(date.getUTCMonth()+1).padStart(2,"0")+"-"+String(date.getUTCDate()).padStart(2,"0");
    };
    const weekStartDate=localDateString(0),weekEndDate=localDateString(7);
    const countQuery=(table)=>scopeQuery(client.from(table).select("id",{count:"exact",head:true}),id);
    const jobs=[];
    const add=(key,promise)=>jobs.push([key,promise]);
    add("attendance",countQuery("geo_attendance_logs"));
    add("todayAttendance",scopeQuery(client.from("geo_attendance_logs").select("student_id").ilike("user_role","student")
      .gte("created_at",todayStart).lt("created_at",todayEnd),id));
    add("courses",countQuery("courses"));
    add("resources",countQuery("resources"));
    add("tickets",scopeQuery(client.from("support_tickets").select("id,status,priority"),id));
    add("pendingUnitRegistrations",scopeQuery(client.from("student_unit_registrations").select("id",{count:"exact",head:true}).ilike("status","pending"),id));
    add("pendingMarks",scopeQuery(client.from("student_marks").select("id",{count:"exact",head:true}).ilike("approval_status","pending").eq("published",false),id));
    add("publishedMarks",scopeQuery(client.from("student_marks").select("id",{count:"exact",head:true}).ilike("approval_status","approved").eq("published",true),id));
    add("pendingMessages",scopeQuery(client.from("messages").select("id",{count:"exact",head:true}).ilike("approval_status","pending"),id));
    add("weeklySessions",scopeQuery(client.from("scheduled_sessions").select("id",{count:"exact",head:true})
      .gte("session_date",weekStartDate).lt("session_date",weekEndDate),id));
    add("programs",countQuery("programs"));
    add("programRows",scopeQuery(client.from("programs").select("program_code,program_name,category,program_type,status"),id));
    add("activePrograms",scopeQuery(client.from("programs").select("id",{count:"exact",head:true}).ilike("status","active"),id));
    add("inactivePrograms",scopeQuery(client.from("programs").select("id",{count:"exact",head:true}).not("status","ilike","active"),id));
    add("units",countQuery("units_catalog"));
    add("intakes",countQuery("program_intakes"));
    add("blocks",countQuery("program_blocks"));
    add("upcomingExams",scopeQuery(client.from("exams").select("id",{count:"exact",head:true})
      .gte("exam_date",nairobiDate).not("status","in",'("cancelled","completed","closed")'),id));
    add("pendingReviews",scopeQuery(client.from("student_reviews").select("id",{count:"exact",head:true}).ilike("status","pending"),id));
    add("systemAlerts",scopeQuery(client.from("exam_proctoring_logs").select("id",{count:"exact",head:true})
      .eq("is_read",false).in("severity",["high","critical","HIGH","CRITICAL"]),id));
    add("activity",scopeQuery(client.from("audit_logs").select("created_at,actor_name,user_email,role,user_role,action_type,module,description,status,ip_address,device_info")
      .order("created_at",{ascending:false}).limit(500),id));
    if(id && userIds.length) add("sessions",client.from("user_sessions").select("id",{count:"exact",head:true}).in("user_id",userIds).eq("is_active",true));
    else if(!id) add("sessions",client.from("user_sessions").select("id",{count:"exact",head:true}).eq("is_active",true));
    const results={};
    const settled=await Promise.all(jobs.map(async ([key,promise])=>[key,await promise]));
    for(const [key,result] of settled){
      if(result.error){console.warn("[Campus Nexus dashboard filter]",key,result.error.message);results[key]={unavailable:true};}
      else results[key]=result;
    }

    const students=studentCount.count||0;
    const programCategoryCounts=renderTenantCharts(members,results.activity?.data||[],students,krchnCount.count||0,tvetCount.count||0,results.programRows?.data||[]);
    const effectiveKrchn=programCategoryCounts.KRCHN||0;
    const effectiveTvet=programCategoryCounts.TVET||0;
    const todayPresent=results.todayAttendance?.unavailable?null:new Set((results.todayAttendance?.data||[]).map(row=>row.student_id).filter(Boolean)).size;
    const attendancePercent=todayPresent===null?null:(students?Math.min(100,Math.round(todayPresent/students*100)):0);
    const scopeLabel=institution?.name||"all institutions";
    const scopeDescription=$("cnDashboardScopeDescription");
    if(scopeDescription) scopeDescription.textContent=institution
      ? "Showing institution-linked records only · "+fmt(totalUsers)+" assigned users"
      : "Consolidated platform view · "+fmt(totalUsers)+" user profiles across all institutions and legacy records.";

    const countValue=(key)=>results[key]?.unavailable?"—":fmt(results[key]?.count||0);
    const metricEntries={
      totalUsers:{value:fmt(totalUsers),detail:institution?"Users assigned to this institution":"All platform user profiles"},
      totalStudents:{value:fmt(students),detail:institution?"Student profiles assigned to this institution":"All platform student profiles"},
      pendingApprovals:{value:fmt(pendingCount.count||0),detail:"Pending user profile approvals"},
      activeSessions:{value:results.sessions?.unavailable?"—":fmt(results.sessions?.count||0),detail:"Active user sessions",unavailable:!!results.sessions?.unavailable},
      totalDailyCheckIns:{value:todayPresent===null?"—":fmt(todayPresent),detail:"Unique student check-ins today · Nairobi time",unavailable:todayPresent===null},
      overallCheckInCount:{value:countValue("attendance"),detail:"Attendance records · all time",unavailable:!!results.attendance?.unavailable},
      totalCourses:{value:countValue("courses"),detail:"Courses in scope",unavailable:!!results.courses?.unavailable},
      totalResources:{value:countValue("resources"),detail:"Learning resources in scope",unavailable:!!results.resources?.unavailable},
      totalResourcesDisplay:{value:countValue("resources"),detail:"Learning resources in scope",unavailable:!!results.resources?.unavailable},
      dashboardPendingUnitReg:{value:countValue("pendingUnitRegistrations"),detail:"Pending unit registrations",unavailable:!!results.pendingUnitRegistrations?.unavailable},
      dashboardPendingMarks:{value:countValue("pendingMarks"),detail:"Marks awaiting approval",unavailable:!!results.pendingMarks?.unavailable},
      dashboardPublishedMarks:{value:countValue("publishedMarks"),detail:"Approved marks published to students",unavailable:!!results.publishedMarks?.unavailable},
      dashboardPendingMessages:{value:countValue("pendingMessages"),detail:"Messages awaiting approval",unavailable:!!results.pendingMessages?.unavailable},
      dashboardLecturersCount:{value:fmt(lecturerCount.count||0),detail:"Lecturer profiles in scope"},
      dashboardAttendanceToday:{value:attendancePercent===null?"—":attendancePercent+"%",detail:todayPresent===null?"Attendance data unavailable":"Unique students present / total students",unavailable:attendancePercent===null},
      dashboardTotalSessions:{value:countValue("weeklySessions"),detail:"Scheduled sessions this week",unavailable:!!results.weeklySessions?.unavailable},
      dashboardTotalPrograms:{value:countValue("programs"),detail:"Programme records with institution ownership",unavailable:!!results.programs?.unavailable},
      dashboardTotalUnits:{value:countValue("units"),detail:"Unit catalogue records with institution ownership",unavailable:!!results.units?.unavailable},
      dashboardUpcomingExams:{value:countValue("upcomingExams"),detail:"Upcoming examinations",unavailable:!!results.upcomingExams?.unavailable},
      dashboardPendingReviews:{value:countValue("pendingReviews"),detail:"Student reviews awaiting moderation",unavailable:!!results.pendingReviews?.unavailable},
      dashboardSystemAlerts:{value:countValue("systemAlerts"),detail:"Unread high-priority proctoring alerts",unavailable:!!results.systemAlerts?.unavailable},
      totalStaffCount:{value:fmt(staffCount.count||0),detail:"Staff profiles · excludes learners and platform super admins"},
      totalStaffCountDisplay:{value:fmt(staffCount.count||0),detail:"Staff profiles in scope"},
      krchnCountDisplay:{value:fmt(effectiveKrchn),detail:"KRCHN students identified by programme records"},
      tvetCountDisplay:{value:fmt(effectiveTvet),detail:"TVET students identified by programme records"},
      statsTotalStudents:{value:fmt(students),detail:"Students in scope"},
      statsKrchnCount:{value:fmt(effectiveKrchn),detail:"KRCHN student profiles"},
      statsTvetCount:{value:fmt(effectiveTvet),detail:"TVET student profiles"},
      statsMaleTotal:{value:fmt(maleCount.count||0),detail:"Student profiles recorded as male"},
      statsFemaleTotal:{value:fmt(femaleCount.count||0),detail:"Student profiles recorded as female"},
      statsMalePercent:{value:(students?Math.round((maleCount.count||0)/students*100):0)+"%",detail:"Male share of all students"},
      statsFemalePercent:{value:(students?Math.round((femaleCount.count||0)/students*100):0)+"%",detail:"Female share of all students"},
      statsProgramCount:{value:countValue("programs"),detail:"Programme catalogue entries"},
      activeProgramsCount:{value:countValue("activePrograms"),detail:"Active programme records",unavailable:!!results.activePrograms?.unavailable},
      inactiveProgramsCount:{value:countValue("inactivePrograms"),detail:"Inactive programme records",unavailable:!!results.inactivePrograms?.unavailable},
      totalIntakesCount:{value:countValue("intakes"),detail:"Programme intake records",unavailable:!!results.intakes?.unavailable},
      totalBlocksCount:{value:countValue("blocks"),detail:"Programme block records",unavailable:!!results.blocks?.unavailable},
      userGrowth:{value:"—",detail:null,textOnly:true},
      pendingGrowth:{value:"—",detail:null,textOnly:true},
      studentGrowth:{value:"—",detail:null,textOnly:true},
      ticketGrowth:{value:"—",detail:null,textOnly:true},
      dataIntegrityScore:{value:"—",detail:"A validated cross-table integrity score is not yet defined",unavailable:true},
      systemUptime:{value:"—",detail:"No verified uptime monitoring source connected",unavailable:true}
    };
    if(results.tickets?.unavailable){
      metricEntries.dashboardOpenTickets={value:"—",detail:"Ticket data unavailable · check permissions",unavailable:true};
      metricEntries.dashboardUrgentTickets={value:"—",detail:"Ticket data unavailable · check permissions",unavailable:true};
    } else {
      const tickets=results.tickets.data||[];
      const open=tickets.filter(t=>!["closed","resolved","complete","completed"].includes(String(t.status||"").toLowerCase()));
      metricEntries.dashboardOpenTickets={value:fmt(open.length),detail:"Open tickets awaiting response"};
      metricEntries.dashboardUrgentTickets={value:fmt(open.filter(t=>["urgent","high","critical"].includes(String(t.priority||"").toLowerCase())).length),detail:"Urgent tickets requiring attention"};
    }
    Object.entries(metricEntries).forEach(([metric,entry])=>{
      setMetric(metric,entry.value,entry.detail);
      if(entry.unavailable) $(metric)?.closest(".dashboard-card")?.classList.add("cn-scope-unavailable");
      else $(metric)?.closest(".dashboard-card")?.classList.remove("cn-scope-unavailable");
    });

    const activityRows=results.activity?.unavailable?[]:(results.activity?.data||[]);
    renderDashboardActivity(activityRows,scopeLabel);
    renderDashboardBirthdays(members);

    if(institution){
      setPlatform("institutions","1","Selected institution");
      setPlatform("active",institution.status==="active"?"1":"0","Institution status: "+institution.status);
      setPlatform("suspended",institution.status==="suspended"?"1":"0","Suspension status");
      setPlatform("pending",institution.onboarding_status==="ready"?"0":"1","Setup: "+institution.onboarding_status);
      setPlatform("members",fmt(totalUsers),fmt(activeCount.count||0)+" active profiles");
      setPlatform("modules",fmt(platform.modules.filter(x=>x.institution_id===id&&x.enabled).length),"Enabled for this institution");
      setPlatform("subscriptions",fmt(platform.subscriptions.filter(x=>x.institution_id===id).length),"Subscriptions for this institution");
      setPlatform("audits",fmt(platform.audits.filter(x=>x.institution_id===id).length),"Audit events for this institution");
    } else {
      setPlatform("institutions",fmt(platform.institutions.length),"All registered tenants");
      setPlatform("active",fmt(platform.institutions.filter(x=>x.status==="active").length),"Currently enabled");
      setPlatform("suspended",fmt(platform.institutions.filter(x=>x.status==="suspended").length),"Suspended institutions");
      setPlatform("pending",fmt(platform.institutions.filter(x=>x.status!=="active"&&x.status!=="suspended").length),"Onboarding / status pending");
      setPlatform("members",fmt(platform.members.length),"Institution membership records");
      setPlatform("modules",fmt(platform.modules.filter(x=>x.enabled).length),"Enabled institution modules");
      setPlatform("subscriptions",fmt(platform.subscriptions.length),"Subscription records");
      setPlatform("audits",fmt(platform.audits.length),"Platform audit events");
    }
    lockScopedMetrics(metricEntries);
  }


  function dashboardExportRows() {
    const ids=["totalUsers","totalStudents","pendingApprovals","dashboardOpenTickets","dashboardUrgentTickets","activeSessions",
      "totalCourses","totalResources","dashboardTotalPrograms","dashboardTotalUnits","dashboardPendingUnitReg","dashboardUpcomingExams",
      "dashboardPendingMessages","dashboardLecturersCount","dashboardPendingMarks","dashboardPublishedMarks","dashboardPendingReviews",
      "dashboardAttendanceToday","dashboardTotalSessions","dashboardSystemAlerts","totalStaffCount","krchnCountDisplay","tvetCountDisplay",
      "statsTotalStudents","statsKrchnCount","statsTvetCount","statsMaleTotal","statsFemaleTotal","statsMalePercent","statsFemalePercent",
      "activeProgramsCount","inactiveProgramsCount","totalIntakesCount","totalBlocksCount","dataIntegrityScore","systemUptime"];
    return ids.map(id=>{
      const el=$(id);
      const card=el?.closest(".dashboard-card");
      const detail=card?.querySelector(".minor-data")||[...(card?.querySelectorAll("p")||[])].find(node=>node!==el);
      return {metric:id,value:el?.textContent?.trim()||"—",detail:detail?.textContent?.trim()||""};
    }).filter(row=>row.value!=="—"||row.detail);
  }
  function dashboardDownload(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  if(typeof window.exportDashboardCSV!=="function") window.exportDashboardCSV=function(){
    const scope=$("cnDashboardScopeTitle")?.textContent||"All institutions";
    const rows=[["Scope",scope],["Generated",new Date().toISOString()],[],["Metric","Value","Description"],
      ...dashboardExportRows().map(row=>[row.metric,row.value,row.detail])];
    const csv="\uFEFF"+rows.map(row=>row.map(value=>'"'+String(value??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
    dashboardDownload(new Blob([csv],{type:"text/csv;charset=utf-8"}),"campus-nexus-dashboard.csv");
  };
  if(typeof window.exportDashboardPDF!=="function") window.exportDashboardPDF=function(){
    const popup=window.open("","_blank");
    if(!popup){window.alert("Please allow pop-ups to print the dashboard report.");return;}
    const scope=$("cnDashboardScopeTitle")?.textContent||"All institutions";
    const rows=dashboardExportRows();
    const charts=["enrolmentBlockChart","genderDistributionChart","programBreakdownChart","performanceChart"]
      .map(id=>$(id)).filter(Boolean).map(canvas=>({id:canvas.id,src:canvas.toDataURL("image/png")}));
    const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    popup.document.open();
    popup.document.write('<!doctype html><html><head><title>Campus Nexus Dashboard Report</title><style>body{font:13px Arial,sans-serif;color:#0f172a;padding:28px}h1{color:#0A3D62;margin:0 0 6px}.muted{color:#64748b;margin:0 0 20px}table{width:100%;border-collapse:collapse;margin:18px 0 26px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0}th{background:#f1f5f9}.charts{display:grid;grid-template-columns:1fr 1fr;gap:18px}.charts img{width:100%;height:230px;object-fit:contain;border:1px solid #e2e8f0}@media print{body{padding:10mm}.charts{break-inside:avoid}}</style></head><body><h1>Campus Nexus Dashboard Report</h1><p class="muted">Scope: '+esc(scope)+' · Generated: '+esc(new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi"}))+'</p><table><thead><tr><th>Metric</th><th>Value</th><th>Description</th></tr></thead><tbody>'+rows.map(row=>'<tr><td>'+esc(row.metric)+'</td><td>'+esc(row.value)+'</td><td>'+esc(row.detail)+'</td></tr>').join("")+'</tbody></table><h2>Dashboard charts</h2><div class="charts">'+charts.map(chart=>'<div><h3>'+esc(chart.id)+'</h3><img src="'+chart.src+'"></div>').join("")+'</div></body></html>');
    popup.document.close();popup.focus();setTimeout(()=>popup.print(),350);
  };
  if(typeof window.exportDashboardPNG!=="function") window.exportDashboardPNG=function(){
    const rows=dashboardExportRows();
    const canvas=document.createElement("canvas");
    canvas.width=1800;canvas.height=1500;
    const ctx=canvas.getContext("2d");
    if(!ctx){window.alert("PNG export is not available in this browser.");return;}
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#0A3D62";ctx.font="bold 42px Arial";ctx.fillText("Campus Nexus Dashboard",70,75);
    ctx.fillStyle="#64748b";ctx.font="22px Arial";ctx.fillText("Scope: "+($("cnDashboardScopeTitle")?.textContent||"All institutions"),70,115);
    ctx.fillText("Generated: "+new Date().toLocaleString("en-KE",{timeZone:"Africa/Nairobi"}),70,150);
    const cardRows=rows.slice(0,24),cols=4,cellW=410,cellH=100,startY=190;
    cardRows.forEach((row,i)=>{
      const x=70+(i%cols)*430,y=startY+Math.floor(i/cols)*cellH;
      ctx.fillStyle="#f1f5f9";ctx.fillRect(x,y,390,82);
      ctx.fillStyle="#64748b";ctx.font="16px Arial";ctx.fillText(row.metric.replace(/([A-Z])/g," $1").slice(0,34),x+14,y+25);
      ctx.fillStyle="#0A3D62";ctx.font="bold 27px Arial";ctx.fillText(row.value.slice(0,22),x+14,y+60);
    });
    const chartY=startY+Math.ceil(cardRows.length/cols)*cellH+20;
    const charts=["enrolmentBlockChart","genderDistributionChart","programBreakdownChart","performanceChart"].map(id=>$(id)).filter(Boolean);
    let pending=charts.length;
    const finish=()=>{if(--pending>0)return;canvas.toBlob(blob=>{if(blob)dashboardDownload(blob,"campus-nexus-dashboard.png");},"image/png");};
    if(!pending){canvas.toBlob(blob=>{if(blob)dashboardDownload(blob,"campus-nexus-dashboard.png");},"image/png");return;}
    charts.forEach((source,i)=>{
      const image=new Image();
      image.onload=()=>{
        const x=70+(i%2)*850,y=chartY+Math.floor(i/2)*300;
        ctx.fillStyle="#0A3D62";ctx.font="bold 18px Arial";ctx.fillText(source.id,x,y+18);
        ctx.drawImage(image,x,y+30,800,240);finish();
      };
      image.onerror=finish;
      image.src=source.toDataURL("image/png");
    });
  };

  async function refresh() {
    if(state.busy) { state.refreshQueued=true; return; }
    state.busy=true;
    releaseScopedMetricLock();
    const button=$("cnPlatformRefresh");
    if(button){button.disabled=true;button.classList.add("is-loading");}
    const updated=$("cnPlatformMetricsUpdated");
    if(updated) updated.textContent="Refreshing institution data…";
    try{
      const client=await getAdminDb();
      const platform=await loadPlatform(client);
      const institutionSelect=$("cnGlobalInstitutionFilter");
      if(!state.access.platformAdmin){
        const own=state.institutions.find(x=>x.id===state.access.institutionId);
        if(!own) throw new Error("Your assigned institution is unavailable or suspended. Contact the Campus Nexus Platform Super Admin.");
        if(institutionSelect){institutionSelect.value=own.id;institutionSelect.disabled=true;}
        const selectorWrap=institutionSelect?.closest(".cn-global-select-wrap");
        if(selectorWrap) selectorWrap.style.display="none";
        const manage=$("cnPlatformOverview")?.querySelector(".cn-global-manage");
        if(manage) manage.style.display="none";
        document.querySelectorAll(".cn-platform-card").forEach(card=>card.style.display="none");
        const eyebrow=$("cnPlatformOverview")?.querySelector(".cn-global-eyebrow");
        if(eyebrow) eyebrow.textContent="CAMPUS NEXUS · INSTITUTION OPERATIONS";
        document.querySelectorAll("#sidebar [onclick*=\"showTab('institutions')\"],#sidebar [onclick*='showTab(\\"institutions\\")'],#sidebar [data-tab='institutions']").forEach(item=>item.style.display="none");
        const navItems=[...document.querySelectorAll("#sidebar a,#sidebar button")];
        navItems.forEach(item=>{
          const label=(item.textContent||"").trim().toLowerCase();
          if(/platform audit|system-wide audit|manage institutions|institution management/.test(label)) item.style.display="none";
        });
      } else {
        if(institutionSelect) institutionSelect.disabled=false;
        const selectorWrap=institutionSelect?.closest(".cn-global-select-wrap");
        if(selectorWrap) selectorWrap.style.display="";
        const manage=$("cnPlatformOverview")?.querySelector(".cn-global-manage");
        if(manage) manage.style.display="";
        document.querySelectorAll(".cn-platform-card").forEach(card=>card.style.display="");
      }
      const selected=state.access.platformAdmin?($("cnGlobalInstitutionFilter")?.value||"all"):state.access.institutionId;
      const institution=state.institutions.find(x=>x.id===selected);
      updateScopeText(institution||null);
      publishScope();
      await applyInstitutionScope(client,institution||null,platform);
      if(updated) updated.textContent="Updated "+new Intl.DateTimeFormat("en-KE",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nairobi"}).format(new Date());
    }catch(error){
      console.error("[Campus Nexus dashboard filter]",error);
      const selectedInstitution = state.institutions.find(x=>x.id===selectedInstitutionId());
      if(selectedInstitution){
        ["totalUsers","totalStudents","pendingApprovals","activeSessions","totalDailyCheckIns","overallCheckInCount","totalCourses","totalResources"].forEach(id=>{
          const el=$(id); if(el) el.textContent="—";
          const detail=el?.closest(".dashboard-card")?.querySelector(".minor-data");
          if(detail) detail.textContent="Institution data unavailable · check permissions";
        });
      }
      if(updated) updated.textContent="Institution data unavailable: "+(error.message||"Check access");
    }finally{
      state.busy=false;
      if(button){button.disabled=false;button.classList.remove("is-loading");}
      if(state.refreshQueued){state.refreshQueued=false;queueMicrotask(refresh);}
    }
  }

  function handleInstitutionChange(event) {
    if(!state.access.platformAdmin && state.access.institutionId){
      if(event?.target) event.target.value=state.access.institutionId;
      return;
    }
    const selected=event?.target?.value || "all";
    try { localStorage.setItem(SCOPE_KEY,selected); } catch(_) {}
    publishScope();
    refresh();
  }

  function init() {
    window.addEventListener("campusnexus:institution-change", event => applyGlobalSidebarScope(event.detail || {}));
    buildUnifiedMetrics();
    // Capture the legacy NCHSM dashboard figures after its original loaders run.
    setTimeout(rememberLegacyMetrics,2400);
    const institutionSelect=$("cnGlobalInstitutionFilter");
    if(institutionSelect){
      try{const saved=localStorage.getItem(SCOPE_KEY);if(saved&&[...institutionSelect.options].some(o=>o.value===saved))institutionSelect.value=saved;}catch(_){}
      institutionSelect.addEventListener("change",handleInstitutionChange);
    }
    $("cnPlatformRefresh")?.addEventListener("click",refresh);
    refresh();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
