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
  const state = { institutions: [], moduleMap: {}, snapshot: null, busy: false, refreshQueued: false, metricLock: null };

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
      const detailEl = card?.querySelector(".minor-data") || [...(card?.querySelectorAll("p") || [])].find(node => node !== valueEl);
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
    setPlatform("subscriptions",fmt((subscriptions.data||[]).length),"Billing configuration records");
    setPlatform("audits",fmt((audits.data||[]).length),"Recorded platform actions");
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
    return {members:members.data||[],modules:modules.data||[],subscriptions:subscriptions.data||[],audits:audits.data||[]};
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

  async function applyInstitutionScope(client,institution,platform) {
    const id=institution.id;
    const profileResult=await client.from("consolidated_user_profiles_table")
      .select("id,user_id,role,status",{count:"exact"}).eq("institution_id",id);
    if(profileResult.error) throw profileResult.error;
    const members=profileResult.data||[];
    const userIds=[...new Set(members.map(x=>x.user_id).filter(Boolean))];
    const totalUsers=profileResult.count ?? members.length;

    const [studentCount,pendingCount,activeCount,krchnCount,tvetCount,lecturerCount,staffCount,maleCount,femaleCount] = await Promise.all([
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("role","student"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("status","pending"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("status","active"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("role","student").ilike("program_type","krchn"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("role","student").ilike("program_type","tvet"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("role","lecturer"),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).not("role","in",'("student","applicant","superadmin","super_admin")'),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("role","student").in("gender",["male","m"]),
      client.from("consolidated_user_profiles_table").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("role","student").in("gender",["female","f"])
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
    const weekStartDate=localDateString(0);
    const weekEndDate=localDateString(7);

    const jobs=[];
    const add=(key,promise)=>jobs.push([key,promise]);
    add("attendance",client.from("geo_attendance_logs").select("id",{count:"exact",head:true}).eq("institution_id",id));
    add("todayAttendance",client.from("geo_attendance_logs").select("student_id").eq("institution_id",id)
      .ilike("user_role","student").gte("created_at",todayStart).lt("created_at",todayEnd));
    add("courses",client.from("courses").select("id",{count:"exact",head:true}).eq("institution_id",id));
    add("resources",client.from("resources").select("id",{count:"exact",head:true}).eq("institution_id",id));
    add("tickets",client.from("support_tickets").select("id,status,priority",{count:"exact"}).eq("institution_id",id));
    add("pendingUnitRegistrations",client.from("student_unit_registrations").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("status","pending"));
    add("pendingMarks",client.from("student_marks").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("approval_status","pending").eq("published",false));
    add("publishedMarks",client.from("student_marks").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("approval_status","approved").eq("published",true));
    add("pendingMessages",client.from("messages").select("id",{count:"exact",head:true}).eq("institution_id",id).ilike("approval_status","pending"));
    add("weeklySessions",client.from("scheduled_sessions").select("id",{count:"exact",head:true}).eq("institution_id",id).gte("session_date",weekStartDate).lt("session_date",weekEndDate));
    if(userIds.length) add("sessions",client.from("user_sessions").select("id",{count:"exact",head:true}).in("user_id",userIds).eq("is_active",true));
    const results={};
    const settled=await Promise.all(jobs.map(async ([key,promise])=>[key,await promise]));
    for(const [key,result] of settled){
      if(result.error){console.warn("[Campus Nexus dashboard filter]",key,result.error.message);results[key]={unavailable:true};}
      else results[key]=result;
    }

    const students=studentCount.count||0;
    const todayPresent=results.todayAttendance?.unavailable?null:new Set((results.todayAttendance?.data||[]).map(row=>row.student_id).filter(Boolean)).size;
    const attendancePercent=todayPresent===null?null:(students?Math.min(100,Math.round(todayPresent/students*100)):0);
    const scopeDescription=$("cnDashboardScopeDescription");
    if(scopeDescription) scopeDescription.textContent=totalUsers
      ? "Showing institution-linked records only · "+fmt(totalUsers)+" assigned users"
      : "No users are assigned to this institution yet. Unlinked legacy records are excluded.";

    const metricEntries={
      totalUsers:{value:fmt(totalUsers),detail:"Users assigned to this institution"},
      totalStudents:{value:fmt(students),detail:"Student profiles assigned to this institution"},
      pendingApprovals:{value:fmt(pendingCount.count||0),detail:"Pending institution profile approvals"},
      activeSessions:{value:results.sessions?.unavailable?"—":fmt(results.sessions?.count||0),detail:"Active sessions for institution members",unavailable:!!results.sessions?.unavailable},
      totalDailyCheckIns:{value:todayPresent===null?"—":fmt(todayPresent),detail:"Unique student check-ins today · Nairobi time",unavailable:todayPresent===null},
      overallCheckInCount:{value:results.attendance?.unavailable?"—":fmt(results.attendance?.count||0),detail:"Institution attendance records · all time",unavailable:!!results.attendance?.unavailable},
      totalCourses:{value:results.courses?.unavailable?"—":fmt(results.courses?.count||0),detail:"Courses linked to this institution",unavailable:!!results.courses?.unavailable},
      totalResources:{value:results.resources?.unavailable?"—":fmt(results.resources?.count||0),detail:"Resources linked to this institution",unavailable:!!results.resources?.unavailable},
      dashboardPendingUnitReg:{value:results.pendingUnitRegistrations?.unavailable?"—":fmt(results.pendingUnitRegistrations?.count||0),detail:"Pending unit registrations for this institution",unavailable:!!results.pendingUnitRegistrations?.unavailable},
      dashboardPendingMarks:{value:results.pendingMarks?.unavailable?"—":fmt(results.pendingMarks?.count||0),detail:"Marks awaiting approval for this institution",unavailable:!!results.pendingMarks?.unavailable},
      dashboardPublishedMarks:{value:results.publishedMarks?.unavailable?"—":fmt(results.publishedMarks?.count||0),detail:"Approved marks published to students",unavailable:!!results.publishedMarks?.unavailable},
      dashboardPendingMessages:{value:results.pendingMessages?.unavailable?"—":fmt(results.pendingMessages?.count||0),detail:"Messages awaiting approval for this institution",unavailable:!!results.pendingMessages?.unavailable},
      dashboardLecturersCount:{value:fmt(lecturerCount.count||0),detail:"Lecturer profiles assigned to this institution"},
      dashboardAttendanceToday:{value:attendancePercent===null?"—":attendancePercent+"%",detail:todayPresent===null?"Attendance data unavailable":"Unique students present / institution student count",unavailable:attendancePercent===null},
      dashboardTotalSessions:{value:results.weeklySessions?.unavailable?"—":fmt(results.weeklySessions?.count||0),detail:"Scheduled sessions this week",unavailable:!!results.weeklySessions?.unavailable},
      totalStaffCount:{value:fmt(staffCount.count||0),detail:"Institution staff profiles · excludes learners and platform super admins"},
      totalStaffCountDisplay:{value:fmt(staffCount.count||0),detail:"Institution staff profiles"},
      totalResourcesDisplay:{value:results.resources?.unavailable?"—":fmt(results.resources?.count||0),detail:"Institution resources",unavailable:!!results.resources?.unavailable},
      krchnCountDisplay:{value:fmt(krchnCount.count||0),detail:"KRCHN student profiles"},
      tvetCountDisplay:{value:fmt(tvetCount.count||0),detail:"TVET student profiles"},
      statsTotalStudents:{value:fmt(students),detail:"Institution students"},
      statsKrchnCount:{value:fmt(krchnCount.count||0),detail:"KRCHN student profiles"},
      statsTvetCount:{value:fmt(tvetCount.count||0),detail:"TVET student profiles"},
      statsMaleTotal:{value:fmt(maleCount.count||0),detail:"Student profiles recorded as male"},
      statsFemaleTotal:{value:fmt(femaleCount.count||0),detail:"Student profiles recorded as female"}
    };
    Object.entries(metricEntries).forEach(([metric,entry])=>setMetric(metric,entry.value,entry.detail));

    if(results.tickets?.unavailable){
      metricEntries.dashboardOpenTickets={value:"—",detail:"Institution ticket data unavailable · check permissions",unavailable:true};
      metricEntries.dashboardUrgentTickets={value:"—",detail:"Institution ticket data unavailable · check permissions",unavailable:true};
    } else {
      const tickets=results.tickets.data||[];
      const open=tickets.filter(t=>!["closed","resolved","complete","completed"].includes(String(t.status||"").toLowerCase()));
      const urgent=open.filter(t=>["urgent","high","critical"].includes(String(t.priority||"").toLowerCase()));
      metricEntries.dashboardOpenTickets={value:fmt(open.length),detail:"Open tickets for this institution"};
      metricEntries.dashboardUrgentTickets={value:fmt(urgent.length),detail:"Urgent tickets for this institution"};
    }
    Object.entries(metricEntries).forEach(([metric,entry])=>setMetric(metric,entry.value,entry.detail));

    // These source tables do not have a trustworthy tenant key. Do not infer
    // ownership through program labels or globally shared exam/question IDs.
    const unavailableMetrics=[
      ["dashboardTotalPrograms","Programme master has no institution ownership field"],
      ["dashboardTotalUnits","Unit catalogue has no institution ownership field"],
      ["dashboardUpcomingExams","Exam records have no institution ownership field"],
      ["dashboardPendingReviews","Student reviews have no institution ownership field"],
      ["dashboardSystemAlerts","System alerts cannot yet be attributed to one institution"],
      ["activeProgramsCount","Programme master has no institution ownership field"],
      ["inactiveProgramsCount","Programme master has no institution ownership field"],
      ["totalIntakesCount","Programme intakes have no institution ownership field"],
      ["totalBlocksCount","Programme blocks have no institution ownership field"],
      ["statsProgramCount","Programme master has no institution ownership field"],
      ["dataIntegrityScore","No verified institution-specific integrity calculation is configured"]
    ];
    unavailableMetrics.forEach(([metric,reason])=>{
      metricEntries[metric]={value:"—",detail:reason,unavailable:true};
      markUnavailable(metric,reason);
    });

    const uptime=$("systemUptime");
    if(uptime){uptime.textContent="—";const detail=uptime.closest(".dashboard-card")?.querySelector("p:last-child");if(detail)detail.textContent="No verified uptime monitoring source connected";}

    setPlatform("institutions","1","Selected institution");
    setPlatform("active",institution.status==="active"?"1":"0","Institution status: "+institution.status);
    setPlatform("suspended",institution.status==="suspended"?"1":"0","Suspension status");
    setPlatform("pending",institution.onboarding_status==="ready"?"0":"1","Setup: "+institution.onboarding_status);
    setPlatform("members",fmt(totalUsers),fmt(activeCount.count||0)+" active profiles");
    setPlatform("modules",fmt(platform.modules.filter(x=>x.institution_id===id&&x.enabled).length),"Enabled for this institution");
    setPlatform("subscriptions",fmt(platform.subscriptions.filter(x=>x.institution_id===id).length),"Subscriptions for this institution");
    setPlatform("audits",fmt(platform.audits.filter(x=>x.institution_id===id).length),"Audit events for this institution");

    lockScopedMetrics(metricEntries);
  }

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
      const selected=$("cnGlobalInstitutionFilter")?.value||"all";
      const institution=state.institutions.find(x=>x.id===selected);
      updateScopeText(institution||null);
      publishScope();
      if(institution) await applyInstitutionScope(client,institution,platform);
      else { restoreLegacyMetrics(); await loadGlobalIdentityMetrics(client); }
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
