/* NCHSM Director workspace — authenticated, read-only institutional overview. */
(function(){
'use strict';
const ALLOWED_ROLES=['director','institutional_director','college_director','principal'];
const $=id=>document.getElementById(id);
const client=()=>window.supabaseClient||window.sb;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleOf=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
function setCount(id,value,error){const e=$(id);if(!e)return;e.textContent=error?'Unavailable':Number(value??0).toLocaleString('en-KE');e.classList.toggle('loading',false);if(error)e.title=error;}
function dateLabel(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'});}
async function countQuery(query){const {count,error}=await query;if(error)throw error;return count??0;}
async function loadMetrics(sb){
 const jobs=[
  countQuery(sb.from('consolidated_user_profiles_table').select('id',{count:'exact',head:true}).eq('role','student')),
  countQuery(sb.from('consolidated_user_profiles_table').select('id',{count:'exact',head:true}).in('role',['lecturer','staff'])),
  countQuery(sb.from('lecturer_report_submissions').select('id',{count:'exact',head:true}).in('status',['submitted','resubmitted','under_review'])),
  countQuery(sb.from('student_marks').select('id',{count:'exact',head:true}).eq('published',true))
 ];
 const ids=['learnersCount','staffCount','pendingCount','publishedCount'];
 const values=await Promise.allSettled(jobs);
 values.forEach((r,i)=>setCount(ids[i],r.status==='fulfilled'?r.value:null,r.status==='rejected'?r.reason?.message:null));
}
async function loadSubmissions(sb){
 const body=$('submissionRows');
 try{
  const {data,error}=await sb.from('lecturer_report_submissions').select('id,title,document_type,report_type,lecturer_name,program,status,submitted_at,created_at').order('submitted_at',{ascending:false,nullsFirst:false}).limit(8);
  if(error)throw error;
  if(!data?.length){body.innerHTML='<tr><td colspan="5" class="empty">No teaching records have been submitted yet.</td></tr>';return;}
  body.innerHTML=data.map(r=>{
   const status=roleOf(r.status)||'pending';
   return '<tr><td>'+esc(r.title||r.document_type||r.report_type||'Teaching record')+'</td><td>'+esc(r.lecturer_name||'—')+'</td><td>'+esc(r.program||'—')+'</td><td><span class="status '+esc(status)+'">'+esc((r.status||'pending').replace(/_/g,' '))+'</span></td><td>'+dateLabel(r.submitted_at||r.created_at)+'</td></tr>';
  }).join('');
 }catch(e){body.innerHTML='<tr><td colspan="5" class="empty error">Could not load submissions: '+esc(e.message)+'</td></tr>';}
}
async function boot(){
 const sb=client();
 if(!sb?.auth?.getUser){location.replace('login.html');return;}
 const {data:auth,error:authError}=await sb.auth.getUser();
 if(authError||!auth?.user){location.replace('login.html');return;}
 const {data:profile,error:profileError}=await sb.from('consolidated_user_profiles_table').select('user_id,full_name,email,role').eq('user_id',auth.user.id).maybeSingle();
 if(profileError){document.body.innerHTML='<main style="font:16px Arial;padding:32px;color:#8b3030">We could not verify your Director profile. Please contact the system administrator. <br><small>'+esc(profileError.message)+'</small></main>';return;}
 const role=roleOf(profile?.role||auth.user.app_metadata?.role||auth.user.user_metadata?.role);
 if(!ALLOWED_ROLES.includes(role)){document.body.innerHTML='<main style="font:16px Arial;padding:32px;color:#8b3030">Director access is not enabled for this account. Your current role does not grant access to this workspace. Please contact the Super Admin.</main>';return;}
 const name=profile.full_name||auth.user.email||'Director';
 $('userName').textContent=name;$('avatar').textContent=name.trim().charAt(0).toUpperCase();
 $('todayLabel').textContent=new Date().toLocaleDateString('en-KE',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
 $('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.replace('login.html');});
 document.querySelectorAll('[data-section]').forEach(btn=>btn.addEventListener('click',()=>{
  const key=btn.dataset.section;
  const titles={overview:'Executive Overview',academics:'Academic Performance',teaching:'Teaching & Learning',records:'Records & Compliance',reports:'Institutional Reports'};
  $('crumbTitle').textContent=titles[key]||titles.overview;
  if(key!=='overview'){alert((titles[key]||'This section')+' is being prepared for the next release. The executive overview remains available.');return;}
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.section==='overview'));
 }));
 await Promise.all([loadMetrics(sb),loadSubmissions(sb)]);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(e=>{console.error('[Director]',e);}),{once:true});else boot().catch(e=>console.error('[Director]',e));
})();