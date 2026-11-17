/* NCHSM Primary Super Admin — Academic Data Access Control */
(function () {
  'use strict';
  const OWNER_ID = '5ce2d893-99a1-42bf-85e4-66f35e5711fd';
  const OWNER_EMAIL = 'tiongikevin99@gmail.com';
  const PERMISSIONS = [
    ['view_marks','View student marks'],['edit_marks','Enter / edit marks'],
    ['approve_marks','Approve / reject marks'],['publish_marks','Publish / unpublish results'],
    ['export_marks','Export / print marks'],['view_gpa','View GPA and progression'],
    ['generate_transcripts','Generate / view transcripts'],['delete_marks','Delete marks records']
  ];
  let sb = null, owner = false, state = null, saving = false;

  function getClient(){return window.supabaseClient||window.sb||window.NCHSMLogin?.supabase||null;}
  function notify(m,t){if(typeof window.showNotification==='function')window.showNotification(m,t||'info');else if(typeof window.showFeedback==='function')window.showFeedback(m,t||'info');else console.info('[Academic Access]',m);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  async function logBlocked(permission,action){
    try{await sb.rpc('log_marks_security_event',{p_action:'MARKS_ACCESS_BLOCKED',p_target_table:'student_marks',p_target_id:null,p_description:'Blocked Super Admin action: '+(action||permission),p_status:'blocked',p_details:{permission,page_path:location.pathname,user_agent:navigator.userAgent,device_info:/Mobile/i.test(navigator.userAgent)?'Mobile':'Desktop'}});}catch(e){console.warn('Could not record blocked marks access',e);}
  }
  async function can(permission){
    if(!sb?.rpc)return false;
    try{const r=await sb.rpc('check_superadmin_academic_permission',{p_permission:permission});if(r.error)throw r.error;return r.data===true;}
    catch(e){console.error('Academic permission check failed closed',permission,e);return false;}
  }
  async function requirePermissions(required,action){
    for(const permission of (Array.isArray(required)?required:[required])){
      if(!(await can(permission))){
        await logBlocked(permission,action);
        notify(permission==='view_marks'?'No published marks available. Access has not been granted by the Primary Super Admin.':'This action is restricted. The Primary Super Admin has not granted the required permission.','warning');
        return false;
      }
    }
    return true;
  }
  window.NCHSMAcademicAccess={can,require:requirePermissions,isPrimaryOwner:()=>owner};

  function wrap(name,permission,label){
    const original=window[name];
    if(typeof original!=='function'||original.__nchsmAcademicAccessWrapped)return;
    const wrapped=async function(){const args=Array.from(arguments);if(!(await requirePermissions(permission,label||name)))return false;return await original.apply(this,args);};
    wrapped.__nchsmAcademicAccessWrapped=true;wrapped.__nchsmOriginal=original;window[name]=wrapped;
  }
  function installGuards(){
    const g={
      loadPublishedMarks:['view_marks','Load published marks'],initPublishedMarks:['view_marks','Open published marks'],viewStudentMarks:['view_marks','View student marks'],
      loadPublishedRetakeData:['view_marks','Load published retake data'],loadRetakeData:['view_marks','Load marks retake data'],
      loadPublishHistory:['view_marks','Load marks publication history'],loadStudentPublishList:['view_marks','Load student publication list'],
      refreshMarksTable:['view_marks','Refresh marks table'],reloadMarksStudentManager:['view_marks','Reload marks student manager'],
      loadMarksEntry:['view_marks','Load marks entry'],refreshMarksData:['view_marks','Refresh marks'],loadMarksStudentManagerData:['view_marks','Load marks student manager'],
      fetchTranscriptMarksForStudents:['view_marks','Fetch transcript marks'],loadTranscriptStudents:['view_marks','Load transcript students'],refreshTranscriptData:['view_marks','Refresh transcript data'],
      showTranscriptPreview:[['view_marks','generate_transcripts'],'Preview transcript'],
      checkAndUnpublishMarksWithRetakes:[['view_marks','publish_marks'],'Unpublish marks for retake'],
      sendMarksPublishedEmail:[['view_marks','publish_marks'],'Send marks publication notice'],openPublishModal:[['view_marks','publish_marks'],'Open marks publication'],
      openStudentPublishModal:[['view_marks','publish_marks'],'Open student publication'],
      publishCurrentUnitMarks:[['view_marks','publish_marks'],'Publish current unit marks'],
      publishSelectedStudents:[['view_marks','publish_marks'],'Publish selected student marks'],
      loadTranscriptIssuanceAnalytics:['generate_transcripts','View transcript registry'],
      generateSelectedTranscript:[['view_marks','generate_transcripts'],'Generate transcript'],
      generateSelectedTranscriptBatch:[['view_marks','generate_transcripts'],'Generate transcript batch'],
      exportAllTranscripts:[['view_marks','generate_transcripts'],'Export transcripts'],
      downloadTranscript:[['view_marks','generate_transcripts'],'Download transcript'],
      printTranscriptDocument:[['view_marks','generate_transcripts'],'Print transcript'],
      publishSingleUnit:[['view_marks','publish_marks'],'Publish marks'],unpublishSingleUnit:[['view_marks','publish_marks'],'Unpublish marks'],
      publishStudentAllMarks:[['view_marks','publish_marks'],'Publish student marks'],unpublishStudentAllMarks:[['view_marks','publish_marks'],'Unpublish student marks'],
      batchPublishSelected:[['view_marks','publish_marks'],'Batch publish marks'],batchUnpublishSelected:[['view_marks','publish_marks'],'Batch unpublish marks'],
      publishAllByAcademicYear:[['view_marks','publish_marks'],'Publish academic-year marks'],
      publishByAcademicYearAndProgram:[['view_marks','publish_marks'],'Publish programme marks'],publishByBlock:[['view_marks','publish_marks'],'Publish block marks'],
      batchPublishMarks:[['view_marks','publish_marks'],'Batch publish marks'],publishAllFilteredMarks:[['view_marks','publish_marks'],'Publish filtered marks'],
      unpublishAllFilteredMarks:[['view_marks','publish_marks'],'Unpublish filtered marks'],confirmPublishMarks:[['view_marks','publish_marks'],'Confirm marks publication'],
      exportPublishedMarksToCSV:[['view_marks','export_marks'],'Export published marks'],printPublishedMarks:[['view_marks','export_marks'],'Print published marks'],
      exportMarksEntry:[['view_marks','export_marks'],'Export marks entry'],downloadCSV:[['view_marks','export_marks'],'Download marks CSV'],
      saveMarksEntry:[['view_marks','edit_marks'],'Save marks'],recordRetakeExam:[['view_marks','edit_marks'],'Record retake marks'],
      saveRetakeExam:[['view_marks','edit_marks'],'Save retake marks'],exportMarksEntry:[['view_marks','export_marks'],'Export marks entry'],
      addSelectedStudentsToUnit:[['view_marks','edit_marks'],'Add students to marks unit'],addStudentToMarksUnit:[['view_marks','edit_marks'],'Add student to marks unit'],
      addAllAvailableStudentsToMarksUnit:[['view_marks','edit_marks'],'Add students to marks unit'],
      dropSelectedEnrolledStudents:[['view_marks','delete_marks'],'Remove students from marks unit'],
      dropSingleEnrolledStudent:[['view_marks','delete_marks'],'Remove student from marks unit'],
      clearAllEnrolledStudents:[['view_marks','delete_marks'],'Clear marks-unit enrolment'],
      dropSelectedStudents:[['view_marks','delete_marks'],'Remove students from marks unit'],
      removeStudentFromMarksUnit:[['view_marks','delete_marks'],'Remove student from marks unit'],
      clearAllStudentsFromMarksUnit:[['view_marks','delete_marks'],'Clear marks-unit students']
    };
    Object.keys(g).forEach(n=>wrap(n,g[n][0],g[n][1]));
  }

  function addStyles(){
    if(document.getElementById('nchsmAcademicAccessStyles'))return;
    const s=document.createElement('style');s.id='nchsmAcademicAccessStyles';
    s.textContent='#nchsmAcademicAccessModal{position:fixed;inset:0;z-index:100500;background:rgba(4,18,36,.74);display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}'+
      '#nchsmAcademicAccessModal.open{display:flex}#nchsmAcademicAccessModal .aa-panel{width:min(1080px,100%);max-height:94vh;overflow:auto;background:#f8fafc;border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.35);color:#0f172a}'+
      '#nchsmAcademicAccessModal .aa-head{position:sticky;top:0;z-index:2;background:#082b49;color:#fff;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px}'+
      '#nchsmAcademicAccessModal h2{font-size:18px;margin:0;font-weight:800}#nchsmAcademicAccessModal .aa-head p{font-size:12px;margin:5px 0 0;color:#cbd5e1}'+
      '#nchsmAcademicAccessModal .aa-close{border:0;background:rgba(255,255,255,.13);color:#fff;border-radius:9px;width:38px;height:38px;font-size:22px;cursor:pointer}'+
      '#nchsmAcademicAccessModal .aa-body{padding:18px;display:grid;gap:14px}#nchsmAcademicAccessModal .aa-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px}'+
      '#nchsmAcademicAccessModal .aa-master{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}#nchsmAcademicAccessModal h3{margin:0 0 5px;font-size:15px;color:#0f2e4a}'+
      '#nchsmAcademicAccessModal .aa-muted{color:#64748b;font-size:12px;line-height:1.5}#nchsmAcademicAccessModal .aa-status{display:inline-flex;font-size:10px;font-weight:800;padding:6px 10px;border-radius:999px;background:#fee2e2;color:#991b1b}'+
      '#nchsmAcademicAccessModal .aa-status.on{background:#dcfce7;color:#166534}#nchsmAcademicAccessModal .aa-btn{border:0;border-radius:9px;padding:10px 13px;font-weight:800;cursor:pointer}'+
      '#nchsmAcademicAccessModal .aa-primary{background:#0f766e;color:white}#nchsmAcademicAccessModal .aa-danger{background:#b91c1c;color:white}#nchsmAcademicAccessModal .aa-neutral{background:#e2e8f0;color:#0f172a}'+
      '#nchsmAcademicAccessModal .aa-admin{border:1px solid #e2e8f0;border-radius:12px;background:white;margin-top:11px;overflow:hidden}#nchsmAcademicAccessModal .aa-admin-head{padding:13px 15px;background:#f1f5f9;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}'+
      '#nchsmAcademicAccessModal .aa-admin-head strong{font-size:13px;color:#0f2e4a}#nchsmAcademicAccessModal .aa-admin-head small{display:block;color:#64748b;font-size:11px;margin-top:3px}'+
      '#nchsmAcademicAccessModal .aa-permissions{padding:13px 15px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}#nchsmAcademicAccessModal .aa-perm{display:flex;align-items:center;gap:8px;font-size:12px;color:#334155}'+
      '#nchsmAcademicAccessModal .aa-perm input{width:16px;height:16px;accent-color:#0f766e}#nchsmAcademicAccessModal .aa-empty{padding:22px;text-align:center;color:#64748b;border:1px dashed #cbd5e1;border-radius:12px;background:#fff;font-size:13px}'+
      '#nchsmAcademicAccessModal .aa-audit{font-size:11px;color:#475569;display:grid;gap:8px}#nchsmAcademicAccessModal .aa-audit-row{border-top:1px solid #e2e8f0;padding-top:8px}'+
      '#nchsmAcademicAccessModal .aa-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}@media(max-width:640px){#nchsmAcademicAccessModal .aa-permissions{grid-template-columns:1fr}#nchsmAcademicAccessModal .aa-body{padding:10px}}';
    document.head.appendChild(s);
  }

  function ensureModal(){
    let m=document.getElementById('nchsmAcademicAccessModal');if(m)return m;addStyles();
    m=document.createElement('div');m.id='nchsmAcademicAccessModal';
    m.innerHTML='<div class="aa-panel" role="dialog" aria-modal="true" aria-labelledby="aaTitle">'+
      '<div class="aa-head"><div><h2 id="aaTitle">Master Academic Results Access</h2><p>Primary-owner controls · NCHSM Digital Campus</p></div><button type="button" class="aa-close" id="aaClose" aria-label="Close">&times;</button></div>'+
      '<div class="aa-body"><div class="aa-card"><div class="aa-master"><div><h3>Global academic access gate</h3><div class="aa-muted">When disabled, every additional Super Admin is denied marks and results access, regardless of individual permissions.</div></div><div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap"><span id="aaGateStatus" class="aa-status">RESTRICTED</span><button type="button" id="aaGateToggle" class="aa-btn aa-primary">Enable controlled access</button></div></div></div>'+
      '<div class="aa-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div><h3>Additional Super Administrators</h3><div class="aa-muted">Grant permissions individually. New administrators start with every sensitive permission disabled.</div></div><span class="aa-muted" id="aaAdminCount">Loading…</span></div><div id="aaAdmins"><div class="aa-empty">Loading administrator permissions…</div></div></div>'+
      '<div class="aa-card"><h3>Recent permission changes</h3><div id="aaAudit" class="aa-audit"><div class="aa-muted">Loading audit history…</div></div></div>'+
      '<div class="aa-footer"><div class="aa-muted">Database RLS and server-side checks enforce these settings.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="aaRefresh" class="aa-btn aa-neutral">Refresh</button><button type="button" id="aaSave" class="aa-btn aa-primary">Save permission changes</button></div></div>'+
      '<div class="aa-muted">Export controls restrict official system exports. Anyone permitted to view marks can still manually copy information they can see.</div></div></div>';
    document.body.appendChild(m);
    m.querySelector('#aaClose').addEventListener('click',()=>m.classList.remove('open'));
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});
    m.querySelector('#aaRefresh').addEventListener('click',loadState);
    m.querySelector('#aaSave').addEventListener('click',()=>saveState(state?.enabled));
    m.querySelector('#aaGateToggle').addEventListener('click',()=>{
      if(!state)return;const next=!state.enabled;
      if(!confirm(next?'Enable controlled access? Only administrators with individually granted permissions will receive access.':'Disable marks and results access for every additional Super Admin immediately?'))return;
      saveState(next);
    });
    return m;
  }

  function renderState(){
    const m=ensureModal();if(!state)return;
    const status=m.querySelector('#aaGateStatus'),toggle=m.querySelector('#aaGateToggle');
    status.textContent=state.enabled?'CONTROLLED ACCESS ON':'RESTRICTED';status.classList.toggle('on',!!state.enabled);
    toggle.textContent=state.enabled?'Disable all access':'Enable controlled access';toggle.className='aa-btn '+(state.enabled?'aa-danger':'aa-primary');
    const admins=Array.isArray(state.admins)?state.admins:[],host=m.querySelector('#aaAdmins');
    m.querySelector('#aaAdminCount').textContent=admins.length+' additional administrator(s)';host.innerHTML='';
    if(!admins.length)host.innerHTML='<div class="aa-empty">No additional Super Admin accounts were found.</div>';
    admins.forEach(admin=>{
      const card=document.createElement('div');card.className='aa-admin';
      const head=document.createElement('div');head.className='aa-admin-head';
      const info=document.createElement('div'),name=document.createElement('strong'),email=document.createElement('small');
      name.textContent=admin.full_name||admin.email||'Super Admin';email.textContent=(admin.email||'')+' · '+(admin.status||'status unknown');info.append(name,email);
      const p=admin.permissions||{},hasAny=PERMISSIONS.some(x=>p[x[0]]===true),badge=document.createElement('span');
      badge.className='aa-status'+(hasAny&&state.enabled?' on':'');badge.textContent=hasAny&&state.enabled?'CUSTOM ACCESS':'NO ACTIVE ACCESS';head.append(info,badge);card.append(head);
      const grid=document.createElement('div');grid.className='aa-permissions';
      PERMISSIONS.forEach(item=>{
        const label=document.createElement('label');label.className='aa-perm';
        const input=document.createElement('input');input.type='checkbox';input.checked=p[item[0]]===true;
        input.addEventListener('change',()=>{
          const target=state.admins.find(x=>x.user_id===admin.user_id);if(!target)return;target.permissions=target.permissions||{};
          target.permissions[item[0]]=input.checked;
          if(item[0]==='view_marks'&&!input.checked)PERMISSIONS.filter(x=>x[0]!=='view_marks').forEach(x=>target.permissions[x[0]]=false);
          else if(input.checked&&item[0]!=='view_marks')target.permissions.view_marks=true;
          renderState();
        });
        const text=document.createElement('span');text.textContent=item[1];label.append(input,text);grid.appendChild(label);
      });
      card.append(grid);host.appendChild(card);
    });
    const audit=m.querySelector('#aaAudit'),entries=Array.isArray(state.audit)?state.audit:[];
    audit.innerHTML=entries.length?entries.map(e=>'<div class="aa-audit-row"><strong>'+esc(e.action||'Permission change')+'</strong> · '+esc(e.actor_email||'Primary owner')+'<div class="aa-muted">'+esc(e.created_at?new Date(e.created_at).toLocaleString():'Time unavailable')+'</div></div>').join(''):'<div class="aa-muted">No permission changes recorded yet.</div>';
  }

  async function loadState(){
    const m=ensureModal();m.classList.add('open');m.querySelector('#aaAdmins').innerHTML='<div class="aa-empty">Loading permissions…</div>';
    try{const r=await sb.rpc('get_superadmin_academic_access');if(r.error)throw r.error;state=r.data||{enabled:false,admins:[],audit:[]};renderState();}
    catch(e){console.error('Could not load academic access',e);m.querySelector('#aaAdmins').innerHTML='<div class="aa-empty">Could not load permissions: '+esc(e.message||'Database error')+'</div>';notify('Unable to load academic access settings.','error');}
  }

  async function saveState(nextEnabled){
    if(!state||saving)return;saving=true;const m=ensureModal(),save=m.querySelector('#aaSave'),toggle=m.querySelector('#aaGateToggle');
    save.disabled=true;save.textContent='Saving…';toggle.disabled=true;
    try{
      const payload=(state.admins||[]).map(a=>{const p=a.permissions||{};return {user_id:a.user_id,view_marks:!!p.view_marks,edit_marks:!!p.edit_marks,approve_marks:!!p.approve_marks,publish_marks:!!p.publish_marks,export_marks:!!p.export_marks,view_gpa:!!p.view_gpa,generate_transcripts:!!p.generate_transcripts,delete_marks:!!p.delete_marks};});
      const r=await sb.rpc('save_superadmin_academic_access',{p_enabled:typeof nextEnabled==='boolean'?nextEnabled:!!state.enabled,p_permissions:payload});
      if(r.error)throw r.error;state=r.data||state;renderState();notify(state.enabled?'Controlled academic access is enabled. Individual permissions now apply.':'Academic access disabled for all additional Super Admins.','success');
    }catch(e){console.error('Could not save academic access',e);notify(e.message||'Could not save academic access settings.','error');}
    finally{saving=false;save.disabled=false;save.textContent='Save permission changes';toggle.disabled=false;}
  }

  function injectOwnerButton(){
    if(!owner||document.getElementById('ownerAcademicAccessButton'))return;
    const nav=document.getElementById('superadmin-nav')||document.querySelector('.sidebar-nav, .sidebar nav, aside nav');
    if(!nav){console.warn('Super Admin navigation container not found');return;}
    const sample=nav.querySelector('a'),button=document.createElement('a');button.id='ownerAcademicAccessButton';button.href='#';button.className=sample?.className||'nav-link';button.style.cursor='pointer';
    button.innerHTML='<i class="fas fa-shield-halved"></i><span>Academic Data Access</span>';
    button.addEventListener('click',e=>{e.preventDefault();loadState();});nav.appendChild(button);
  }

  async function boot(){
    sb=getClient();if(!sb?.auth?.getUser)return;
    try{
      const r=await sb.auth.getUser(),user=r.data?.user;if(r.error||!user)return;
      const role=String(window.currentSuperAdmin?.profile?.role||'').toLowerCase().replace(/[- ]/g,'_');
      const isAdmin=role==='superadmin'||role==='super_admin';
      owner=isAdmin&&user.id===OWNER_ID&&String(user.email||'').toLowerCase()===OWNER_EMAIL;
      if(owner)injectOwnerButton();
      installGuards();
      if(isAdmin&&!owner&&!(await can('view_marks')))console.info('Academic marks access is restricted by the Primary Super Admin.');
    }catch(e){console.error('Academic access module initialization failed',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();