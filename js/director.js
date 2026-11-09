/* NCHSM Director workspace — authenticated, read-only institutional overview. */
(function(){
'use strict';
const ALLOWED_ROLES=['director','institutional_director','college_director'];
const $=id=>document.getElementById(id);
const sb=()=>window.supabaseClient||window.sb;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
const state={profile:null,view:'overview',metrics:{},submissions:[],marks:[]};
const titles={overview:'Executive Overview',academics:'Academic Performance',teaching:'Teaching & Learning',records:'Records & Compliance',reports:'Institutional Reports'};
function dateLabel(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'});}
function countText(v){return Number(v??0).toLocaleString('en-KE');}
async function countQuery(q){const {count,error}=await q;if(error)throw error;return count??0;}
async function metric(q){try{return await countQuery(q);}catch(e){console.warn('[Director metric]',e.message);return null;}}
async function loadMetrics(client){
 const specs=[
  ['learnersCount',client.from('consolidated_user_profiles_table').select('id',{count:'exact',head:true}).eq('role','student')],
  ['staffCount',client.from('consolidated_user_profiles_table').select('id',{count:'exact',head:true}).in('role',['lecturer','staff'])],
  ['pendingCount',client.from('lecturer_report_submissions').select('id',{count:'exact',head:true}).in('status',['submitted','resubmitted','under_review'])],
  ['publishedCount',client.from('student_marks').select('id',{count:'exact',head:true}).eq('published',true)]
 ];
 await Promise.all(specs.map(async([id,q])=>{const v=await metric(q);state.metrics[id]=v;const e=$(id);if(e){e.textContent=v===null?'Unavailable':countText(v);e.classList.remove('loading');}}));
}
async function fetchSubmissions(client){
 const {data,error}=await client.from('lecturer_report_submissions').select('*').order('submitted_at',{ascending:false,nullsFirst:false}).limit(100);
 if(error)throw error;state.submissions=data||[];return state.submissions;
}
function submissionTable(rows){
 if(!rows.length)return '<div class="empty">No teaching records found for this view.</div>';
 return '<div class="table-wrap"><table><thead><tr><th>Submission</th><th>Lecturer</th><th>Programme</th><th>Type</th><th>Status</th><th>Date</th></tr></thead><tbody>'+rows.map(r=>{
 const status=norm(r.status)||'pending';
 return '<tr><td>'+esc(r.title||r.document_type||r.report_type||'Teaching record')+'</td><td>'+esc(r.lecturer_name||r.lecturer_email||'—')+'</td><td>'+esc(r.program||'—')+'</td><td>'+esc(r.document_type||r.report_type||'—')+'</td><td><span class="status '+esc(status)+'">'+esc((r.status||'pending').replace(/_/g,' '))+'</span></td><td>'+dateLabel(r.submitted_at||r.created_at)+'</td></tr>';
 }).join('')+'</tbody></table></div>';
}
function renderOverview(){
 const c=$('pageContent');
 c.innerHTML=`
 <section class="welcome"><div><div class="eyebrow">Institutional performance & governance</div><h1>Director's Overview</h1><p>A consolidated view of academic delivery, teaching activity and institutional records.</p></div><div class="date-pill"><i class="fa-regular fa-calendar"></i> ${new Date().toLocaleDateString('en-KE',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</div></section>
 <section class="grid" aria-label="Institutional indicators">
  <article class="kpi"><div class="kpi-top">Enrolled learners <span class="kpi-icon"><i class="fa-solid fa-user-graduate"></i></span></div><strong id="learnersCount" class="loading">—</strong><small>Student profiles recorded</small></article>
  <article class="kpi"><div class="kpi-top">Teaching staff <span class="kpi-icon"><i class="fa-solid fa-users"></i></span></div><strong id="staffCount" class="loading">—</strong><small>Lecturer and staff profiles</small></article>
  <article class="kpi"><div class="kpi-top">Awaiting review <span class="kpi-icon"><i class="fa-solid fa-file-circle-exclamation"></i></span></div><strong id="pendingCount" class="loading">—</strong><small>Teaching records submitted for review</small></article>
  <article class="kpi"><div class="kpi-top">Published results <span class="kpi-icon"><i class="fa-solid fa-square-poll-vertical"></i></span></div><strong id="publishedCount" class="loading">—</strong><small>Published student mark records</small></article>
 </section>
 <div class="section-head"><h2>Institutional activity</h2><span>Live data from NCHSM records</span></div>
 <section class="panels"><article class="panel"><h3>Recent teaching & learning submissions</h3><p class="sub">Latest lecturer records submitted for institutional review</p><div id="overviewSubmissions" class="loading">Loading records…</div></article>
 <article class="panel"><h3>Director workspace</h3><p class="sub">Institutional oversight areas</p><div class="quick">
 <button data-section="academics"><i class="fa-solid fa-chart-line"></i><span><b>Academic performance</b><small>Review learner and results indicators</small></span></button>
 <button data-section="teaching"><i class="fa-solid fa-chalkboard-user"></i><span><b>Teaching & learning</b><small>Monitor lecturer submissions and reviews</small></span></button>
 <button data-section="records"><i class="fa-solid fa-folder-open"></i><span><b>Records & compliance</b><small>Track institutional documentation</small></span></button>
 <button data-section="reports"><i class="fa-solid fa-file-lines"></i><span><b>Reports</b><small>Export an institutional snapshot</small></span></button></div>
 <div class="notice"><i class="fa-solid fa-shield-halved"></i> Read-only oversight. Approval, publication and financial actions remain in their authorised workflows.</div></article></section>`;
 Object.entries(state.metrics).forEach(([id,v])=>{const e=$(id);if(e){e.textContent=v===null?'Unavailable':countText(v);e.classList.remove('loading');}});
 $('overviewSubmissions').innerHTML=submissionTable(state.submissions.slice(0,8));
}
async function renderAcademics(client){
 $('pageContent').innerHTML=`<section class="welcome"><div><div class="eyebrow">Learner outcomes</div><h1>Academic Performance</h1><p>Read-only view of recorded student results and publication status.</p></div><button class="logout" data-action="refresh"> <i class="fa-solid fa-rotate"></i> Refresh</button></section><section class="grid">
 <article class="kpi"><div class="kpi-top">Learner profiles</div><strong>${state.metrics.learnersCount===null?'—':countText(state.metrics.learnersCount)}</strong><small>Recorded student accounts</small></article>
 <article class="kpi"><div class="kpi-top">Published marks</div><strong>${state.metrics.publishedCount===null?'—':countText(state.metrics.publishedCount)}</strong><small>Published mark records</small></article>
 </section><div class="section-head"><h2>Recent mark records</h2><span>Latest 40 records available to your account</span></div><article class="panel"><div id="marksTable" class="loading">Loading academic records…</div></article>`;
 try{
  const {data,error}=await client.from('student_marks').select('*').limit(40);
  if(error)throw error;state.marks=data||[];
  const rows=state.marks;
  $('marksTable').innerHTML=rows.length?'<div class="table-wrap"><table><thead><tr><th>Student</th><th>Admission No.</th><th>Unit</th><th>Score</th><th>Grade</th><th>Approval</th><th>Publication</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.student_name||r.full_name||'—')+'</td><td>'+esc(r.admission_number||r.student_id||'—')+'</td><td>'+esc(r.unit_name||r.unit_code||'—')+'</td><td>'+esc(r.marks??r.score??r.total_marks??'—')+'</td><td>'+esc(r.grade||'—')+'</td><td>'+esc(r.approval_status||'—')+'</td><td><span class="status '+(r.published?'approved':'')+'">'+(r.published?'Published':'Not published')+'</span></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No mark records are visible to this account.</div>';
 }catch(e){$('marksTable').innerHTML='<div class="empty error">Academic records could not be loaded: '+esc(e.message)+'</div>';}
}
function renderTeaching(){
 $('pageContent').innerHTML=`<section class="welcome"><div><div class="eyebrow">Academic quality assurance</div><h1>Teaching & Learning</h1><p>Monitor submitted lecturer reports, teaching records and review status.</p></div><button class="logout" data-action="refresh"><i class="fa-solid fa-rotate"></i> Refresh</button></section>
 <div class="section-head"><h2>Lecturer submissions</h2><span id="submissionSummary">${state.submissions.length} records loaded</span></div><article class="panel"><div class="toolbar"><input id="submissionSearch" type="search" placeholder="Search lecturer, title or programme" style="min-width:220px;flex:1;padding:10px;border:1px solid #e1e9ef;border-radius:8px"><select id="submissionStatus" style="padding:10px;border:1px solid #e1e9ef;border-radius:8px"><option value="">All statuses</option><option value="submitted">Submitted</option><option value="resubmitted">Resubmitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="returned">Returned</option><option value="rejected">Rejected</option></select></div><div id="teachingTable">${submissionTable(state.submissions)}</div></article>`;
 const apply=()=>{const q=($('submissionSearch')?.value||'').toLowerCase();const s=$('submissionStatus')?.value||'';const filtered=state.submissions.filter(r=>{const blob=[r.title,r.lecturer_name,r.lecturer_email,r.program,r.document_type,r.report_type].join(' ').toLowerCase();return (!q||blob.includes(q))&&(!s||norm(r.status)===s);});$('teachingTable').innerHTML=submissionTable(filtered);$('submissionSummary').textContent=filtered.length+' of '+state.submissions.length+' records';};
 $('submissionSearch').addEventListener('input',apply);$('submissionStatus').addEventListener('change',apply);
}
function renderRecords(){
 const groups={};state.submissions.forEach(r=>{const k=r.document_type||r.report_type||'Other records';groups[k]??={total:0,approved:0,pending:0,returned:0};groups[k].total++;const s=norm(r.status);if(s==='approved')groups[k].approved++;else if(['submitted','resubmitted','under_review'].includes(s))groups[k].pending++;else if(['returned','rejected'].includes(s))groups[k].returned++;});
 const entries=Object.entries(groups);
 $('pageContent').innerHTML=`<section class="welcome"><div><div class="eyebrow">Governance & accountability</div><h1>Records & Compliance</h1><p>Overview of lecturer-submitted institutional records and their review progress.</p></div><button class="logout" data-action="refresh"><i class="fa-solid fa-rotate"></i> Refresh</button></section>
 <div class="section-head"><h2>Document submission register</h2><span>Based on lecturer report submissions</span></div><article class="panel">${entries.length?'<div class="table-wrap"><table><thead><tr><th>Record type</th><th>Total received</th><th>Approved</th><th>Awaiting review</th><th>Returned / rejected</th></tr></thead><tbody>'+entries.map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v.total+'</td><td>'+v.approved+'</td><td>'+v.pending+'</td><td>'+v.returned+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No compliance records have been submitted yet.</div>'}</article>
 <div class="notice"><i class="fa-solid fa-circle-info"></i> This register reflects records in lecturer_report_submissions. It does not independently certify statutory or regulator compliance.</div>`;
}
function renderReports(){
 const labels=[['Enrolled learners',state.metrics.learnersCount],['Teaching staff',state.metrics.staffCount],['Awaiting review',state.metrics.pendingCount],['Published results',state.metrics.publishedCount]];
 $('pageContent').innerHTML=`<section class="welcome"><div><div class="eyebrow">Institutional intelligence</div><h1>Institutional Reports</h1><p>Generate a dated snapshot of indicators currently visible to the Director workspace.</p></div></section><article class="panel"><h3>Executive indicator snapshot</h3><p class="sub">Counts are sourced from NCHSM database records. Unavailable values are left blank rather than estimated.</p><div class="table-wrap"><table><thead><tr><th>Indicator</th><th>Current value</th></tr></thead><tbody>${labels.map(([k,v])=>'<tr><td>'+k+'</td><td>'+(v===null||v===undefined?'Unavailable':countText(v))+'</td></tr>').join('')}</tbody></table></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="logout" data-action="export"><i class="fa-solid fa-file-csv"></i> Export CSV</button><button class="logout" data-action="refresh"><i class="fa-solid fa-rotate"></i> Refresh data</button></div></article>`;
}
async function showView(key){
 state.view=key in titles?key:'overview';
 document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===state.view));
 $('crumbTitle').textContent=titles[state.view];
 if(state.view==='overview')renderOverview();
 else if(state.view==='academics')await renderAcademics(sb());
 else if(state.view==='teaching')renderTeaching();
 else if(state.view==='records')renderRecords();
 else renderReports();
}
function exportCsv(){
 const rows=[['Indicator','Value'],['Enrolled learners',state.metrics.learnersCount??'Unavailable'],['Teaching staff',state.metrics.staffCount??'Unavailable'],['Awaiting review',state.metrics.pendingCount??'Unavailable'],['Published results',state.metrics.publishedCount??'Unavailable'],['Generated at',new Date().toISOString()]];
 const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='NCHSM_Director_Executive_Snapshot.csv';a.click();URL.revokeObjectURL(url);
}
async function refresh(){
 await Promise.all([loadMetrics(sb()),fetchSubmissions(sb()).catch(e=>{console.error('[Director submissions]',e);state.submissions=[];})]);
 await showView(state.view);
}
async function boot(){
 const client=sb();if(!client?.auth?.getUser){location.replace('login.html');return;}
 const {data:auth,error:authError}=await client.auth.getUser();if(authError||!auth?.user){location.replace('login.html');return;}
 const {data:profile,error:profileError}=await client.from('consolidated_user_profiles_table').select('user_id,full_name,email,role').eq('user_id',auth.user.id).maybeSingle();
 if(profileError){document.body.innerHTML='<main style="font:16px Arial;padding:32px;color:#8b3030">We could not verify your Director profile. Please contact the system administrator. <br><small>'+esc(profileError.message)+'</small></main>';return;}
 const role=norm(profile?.role||auth.user.app_metadata?.role||auth.user.user_metadata?.role);
 if(!ALLOWED_ROLES.includes(role)){document.body.innerHTML='<main style="font:16px Arial;padding:32px;color:#8b3030">Director access is not enabled for this account. Your current role does not grant access to this workspace. Please contact the Super Admin.</main>';return;}
 state.profile=profile;
 const name=profile?.full_name||auth.user.email||'Director';$('userName').textContent=name;$('avatar').textContent=name.trim().charAt(0).toUpperCase();
 $('logoutBtn').addEventListener('click',async()=>{await client.auth.signOut();location.replace('login.html');});
 document.addEventListener('click',async e=>{const section=e.target.closest('[data-section]');if(section){await showView(section.dataset.section);return;}const action=e.target.closest('[data-action]')?.dataset.action;if(action==='refresh')await refresh();if(action==='export')exportCsv();});
 await refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(e=>console.error('[Director]',e)),{once:true});else boot().catch(e=>console.error('[Director]',e));
})();