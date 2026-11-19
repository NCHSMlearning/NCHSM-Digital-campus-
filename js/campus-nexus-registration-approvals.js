/* Campus Nexus — Institution Registration Approvals
 * The queue is institution-scoped. The database RLS and review RPC are authoritative.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { db:null, user:null, institutionId:null, rows:[], loading:false, initialized:false };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify = (message, type='info') => {
    if (typeof window.showNotification === 'function') window.showNotification(message, type);
    else window.alert(message);
  };
  function message(value, error=false) {
    const el=$('cnRegistrationApprovalMessage');
    if(el){el.textContent=value||'';el.classList.toggle('is-error',!!error);}
  }
  async function verifyInstitutionAdmin() {
    const db=window.sb||window.supabase||window.supabaseClient;
    if(!db?.auth||typeof db.rpc!=='function') throw new Error('The authenticated database client is not ready. Reload the dashboard and try again.');
    const {data:authData,error:authError}=await db.auth.getUser();
    if(authError||!authData?.user) throw new Error('Your session has expired. Sign in again.');
    const user=authData.user;
    const [profileResult,membershipResult]=await Promise.all([
      db.from('consolidated_user_profiles_table').select('role,status,login_enabled').eq('user_id',user.id).limit(1).maybeSingle(),
      db.from('institution_users').select('institution_id,role,status').eq('user_id',user.id).eq('status','active')
    ]);
    if(profileResult.error) throw profileResult.error;
    if(membershipResult.error) throw membershipResult.error;
    const admins=(membershipResult.data||[]).filter(x=>String(x.role||'').toLowerCase()==='institution_admin');
    if(String(profileResult.data?.role||'').toLowerCase()!=='institution_admin' ||
       !['active','approved'].includes(String(profileResult.data?.status||'').toLowerCase()) ||
       profileResult.data?.login_enabled===false || admins.length!==1) {
      throw new Error('This page is available only to an active institution administrator with one institution assignment.');
    }
    state.db=db; state.user=user; state.institutionId=admins[0].institution_id;
  }
  function render() {
    const body=$('cnRegistrationApprovalRows'); if(!body)return;
    const query=($('cnRegistrationApprovalSearch')?.value||'').trim().toLowerCase();
    const role=$('cnRegistrationApprovalRole')?.value||'all';
    const rows=state.rows.filter(r=>(role==='all'||r.role===role) &&
      [r.full_name,r.email,r.program,r.student_id].some(v=>String(v||'').toLowerCase().includes(query)));
    const students=state.rows.filter(r=>r.role==='student').length;
    const lecturers=state.rows.filter(r=>r.role==='lecturer').length;
    if($('cnRegistrationPendingCount'))$('cnRegistrationPendingCount').textContent=String(state.rows.length);
    if($('cnRegistrationStudentCount'))$('cnRegistrationStudentCount').textContent=String(students);
    if($('cnRegistrationLecturerCount'))$('cnRegistrationLecturerCount').textContent=String(lecturers);
    const badge=$('cnRegistrationApprovalBadge');
    if(badge){badge.textContent=String(state.rows.length);badge.style.display=state.rows.length?'inline-flex':'none';}
    if(!rows.length){
      body.innerHTML='<tr><td colspan="5" style="padding:36px 18px;text-align:center;color:#64748b;">'+
        (state.rows.length?'No applications match your search.':'No pending student or lecturer applications. New registrations will appear here.')+'</td></tr>';
      return;
    }
    body.innerHTML=rows.map(r=>{
      const role=r.role==='lecturer'?'Lecturer':'Student';
      const submitted=r.created_at?new Date(r.created_at).toLocaleString():'Date unavailable';
      return '<tr><td><strong>'+esc(r.full_name||'Name not provided')+'</strong><small style="display:block;color:#64748b;">'+esc(r.email||'No email')+'</small>'+
        (r.student_id?'<small style="display:block;color:#64748b;">ID: '+esc(r.student_id)+'</small>':'')+'</td>'+
        '<td><span class="cn-ra-role">'+role+'</span></td><td>'+esc(r.program||'Not specified')+'</td>'+
        '<td>'+esc(submitted)+'</td><td><div class="cn-ra-actions">'+
        '<button type="button" class="cn-ra-approve" data-review="approve" data-user="'+esc(r.user_id)+'">Approve</button>'+
        '<button type="button" class="cn-ra-reject" data-review="reject" data-user="'+esc(r.user_id)+'">Reject</button>'+
        '</div></td></tr>';
    }).join('');
  }
  async function load() {
    if(state.loading)return;
    state.loading=true;message('Loading pending registrations…');
    const body=$('cnRegistrationApprovalRows');
    if(body)body.innerHTML='<tr><td colspan="5" style="padding:30px;text-align:center;color:#64748b;">Loading applications…</td></tr>';
    try{
      if(!state.db||!state.institutionId)await verifyInstitutionAdmin();
      const {data,error}=await state.db.from('consolidated_user_profiles_table')
        .select('user_id,full_name,email,role,status,program,student_id,created_at,institution_id')
        .eq('institution_id',state.institutionId)
        .in('role',['student','lecturer'])
        .in('status',['pending','pending_application'])
        .order('created_at',{ascending:true});
      if(error)throw error;
      state.rows=Array.isArray(data)?data:[];
      render();message('Applications updated '+new Date().toLocaleTimeString()+'.');
    }catch(error){
      console.error('[Campus Nexus registration approvals]',error);
      state.rows=[];render();message(error.message||'Unable to load applications.',true);
    }finally{state.loading=false;}
  }
  async function review(userId,decision,button) {
    const applicant=state.rows.find(r=>r.user_id===userId);
    if(!applicant)return;
    const verb=decision==='approve'?'Approve':'Reject';
    if(!window.confirm(verb+' '+(applicant.full_name||applicant.email||'this application')+' as a '+applicant.role+'?'))return;
    let reason=null;
    if(decision==='reject'){
      reason=window.prompt('Optional reason for rejection (leave blank if not required):');
      if(reason===null)return;
    }
    const original=button.textContent;button.disabled=true;button.textContent='Saving…';
    try{
      const {data,error}=await state.db.rpc('review_institution_registration',{
        p_user_id:userId,p_decision:decision,p_reason:reason||null
      });
      if(error)throw error;
      if(!data?.success)throw new Error(data?.message||'The review was not confirmed.');
      notify((decision==='approve'?'Application approved.':'Application rejected.')+' The account access state has been updated.','success');
      await load();
    }catch(error){
      console.error('[Campus Nexus registration review]',error);
      notify(error.message||'Unable to review this application.','error');
      button.disabled=false;button.textContent=original;
    }
  }
  function init() {
    if(state.initialized)return;
    const section=$('registration-approvals');
    if(!section)return;
    state.initialized=true;
    $('cnRegistrationApprovalRefresh')?.addEventListener('click',load);
    $('cnRegistrationApprovalRole')?.addEventListener('change',render);
    $('cnRegistrationApprovalSearch')?.addEventListener('input',render);
    $('cnRegistrationApprovalRows')?.addEventListener('click',event=>{
      const button=event.target.closest('button[data-review][data-user]');
      if(button)review(button.dataset.user,button.dataset.review,button);
    });
    document.querySelector('#mainNav a[data-tab="registration-approvals"]')?.addEventListener('click',()=>load());
    window.loadInstitutionRegistrationApprovals=load;
    load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();