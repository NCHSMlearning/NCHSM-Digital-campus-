/* NCHSM Research Topics Vault — shared student, lecturer and super-admin workspace */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function client(){return [window.supabaseClient,window.supabase,window.db?.supabase,window.db,window.lecturerDB?.supabase,window.lecturerDB?.client].find(x=>x&&typeof x.from==='function');}
let sb=null,user=null,profile=null,rows=[],mode='student',filter='all',search='';
function notify(m){if(window.showNotification)window.showNotification(m,'success');else alert(m);}
function fail(m){if(window.showNotification)window.showNotification(m,'error');else alert(m);}
function role(){return String(profile?.role||user?.user_metadata?.role||'').toLowerCase().replace(/[- ]/g,'_');}
function isStaff(){return ['lecturer','admin','administrator','superadmin','super_admin','hod','head_of_department','nursing_hod','tvet_hod'].includes(role());}
function isSuper(){return ['superadmin','super_admin'].includes(role());}
async function init(){
 sb=client(); if(!sb)return;
 const a=await sb.auth.getUser(); if(a.error||!a.data?.user)return;
 user=a.data.user;
 const p=await sb.from('consolidated_user_profiles_table').select('full_name,role,program,department,intake_year,current_block').eq('user_id',user.id).maybeSingle();
 profile=p.data||user.user_metadata||{};
 mode=isStaff()?'staff':'student';
 mount(); await load();
 if(mode==='student'){
  document.addEventListener('click',e=>{if(e.target.closest('[data-ol-tab="research"]'))setTimeout(()=>{mount();load();},250);});
  const content=$('ol-content');if(content&&window.MutationObserver){new MutationObserver(()=>{if(document.querySelector('#hub-online-learning [data-ol-tab="research"].active')&&!$('research-topic-vault'))setTimeout(mount,80);}).observe(content,{childList:true});}
 }
}
function mount(){
 let root=$('research-topic-vault'); if(root){render();return;}
 const section=$('research-papers-content')||$('research-papers')||$('online-learning-content')||$('hub-online-learning')||$('research-supervision');
 if(section){
  root=document.createElement('section');root.id='research-topic-vault';root.className='rtv-wrap';
  root.style.cssText='margin:18px 0;padding:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;color:#172033';
  section.appendChild(root);
 } else if(isSuper()){
  const main=document.querySelector('main')||document.body;
  root=document.createElement('section');root.id='research-topic-vault';root.className='rtv-wrap';main.appendChild(root);
 } else return;
 render();
}
function render(){
 const root=$('research-topic-vault');if(!root)return;
 const active=rows.filter(r=>['approved','active','completed'].includes(r.status)).length;
 const pending=rows.filter(r=>r.status==='pending'||r.status==='revision_required').length;
 root.innerHTML=`
 <style>
 #research-topic-vault{font-family:Inter,system-ui,Arial,sans-serif}#research-topic-vault *{box-sizing:border-box}
 .rtv-head{padding:22px 24px;background:linear-gradient(120deg,#10243b,#194766);color:#fff;display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}
 .rtv-head h2{margin:0;font-size:20px}.rtv-head p{margin:6px 0 0;color:#cbd5e1;font-size:12px}
 .rtv-body{padding:20px}.rtv-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
 .rtv-stat{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:13px}.rtv-stat b{display:block;font-size:22px;color:#123b5b}.rtv-stat span{font-size:11px;color:#64748b}
 .rtv-tools{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}.rtv-tools input,.rtv-tools select,.rtv-form input,.rtv-form textarea{padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;background:white;color:#172033;min-width:0}
 .rtv-tools input{flex:1;min-width:180px}.rtv-btn{border:0;border-radius:9px;padding:10px 13px;background:#174766;color:white;font-weight:700;cursor:pointer}.rtv-btn.alt{background:#e8eef5;color:#18344e}.rtv-btn.warn{background:#a16207;color:white}
 .rtv-table-wrap{overflow:auto;background:white;border:1px solid #e2e8f0;border-radius:12px}.rtv-table{width:100%;border-collapse:collapse;min-width:760px;font-size:12px}.rtv-table th,.rtv-table td{padding:12px;text-align:left;border-bottom:1px solid #edf1f5}.rtv-table th{background:#f1f5f9;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
 .rtv-pill{padding:5px 8px;border-radius:20px;background:#e0f2fe;color:#075985;font-size:10px;font-weight:800}.rtv-pill.approved,.rtv-pill.active{background:#dcfce7;color:#166534}.rtv-pill.revision_required{background:#fef3c7;color:#92400e}.rtv-pill.rejected,.rtv-pill.released{background:#fee2e2;color:#991b1b}
 .rtv-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;padding:15px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}.rtv-form label{font-size:11px;font-weight:700;color:#475569;display:grid;gap:6px}.rtv-form .wide{grid-column:1/-1}.rtv-form textarea{min-height:75px;resize:vertical}.rtv-empty{padding:28px;text-align:center;color:#64748b}
 @media(max-width:650px){.rtv-body{padding:12px}.rtv-stats{grid-template-columns:1fr 1fr}.rtv-form{grid-template-columns:1fr}.rtv-form .wide{grid-column:auto}.rtv-head{padding:17px}}
 </style>
 <header class="rtv-head"><div><h2><i class="fas fa-book-bookmark"></i> Research Topics Vault</h2><p>College-wide topic registry · duplicate prevention · supervised approvals</p></div><button class="rtv-btn alt" id="rtv-refresh">↻ Refresh</button></header>
 <div class="rtv-body">
 <div class="rtv-stats"><div class="rtv-stat"><b>${rows.length}</b><span>Topics in your register</span></div><div class="rtv-stat"><b>${pending}</b><span>Awaiting review / revision</span></div><div class="rtv-stat"><b>${active}</b><span>Reserved / active / completed</span></div></div>
 ${mode==='student'?`<form id="rtv-submit" class="rtv-form">
 <label class="wide">Proposed research title *<input name="title" minlength="12" maxlength="300" required placeholder="Enter your complete proposed research title"></label>
 <label class="wide">Research objectives<textarea name="objectives" placeholder="List the main objectives"></textarea></label>
 <label class="wide">Rationale / brief description<textarea name="rationale" placeholder="Why is this topic important?"></textarea></label>
 <div class="wide"><button class="rtv-btn" type="submit">Submit topic for review</button></div></form>
 <p style="font-size:11px;color:#64748b;margin:0 0 12px">A topic remains pending until approval. The Vault automatically flags potentially similar titles across all students; flagged topics require reviewer comparison before approval.</p>`:''}
 <div class="rtv-tools"><input id="rtv-search" placeholder="Search title, programme or student…" value="${esc(search)}"><select id="rtv-filter"><option value="all">All statuses</option><option value="pending">Pending</option><option value="revision_required">Revision required</option><option value="approved">Approved / reserved</option><option value="active">Active</option><option value="completed">Completed</option><option value="rejected">Rejected</option><option value="released">Released</option></select></div>
 <div class="rtv-table-wrap"><table class="rtv-table"><thead><tr><th>Research topic</th><th>Student</th><th>Programme</th><th>Supervisor</th><th>Status</th><th>Submitted</th>${mode==='staff'?'<th>Review</th>':''}</tr></thead><tbody id="rtv-rows"><tr><td colspan="7" class="rtv-empty">Loading topics…</td></tr></tbody></table></div>
 </div>`;
 $('rtv-refresh').onclick=load;
 $('rtv-search').oninput=e=>{search=e.target.value;paintRows()};
 $('rtv-filter').onchange=e=>{filter=e.target.value;paintRows()};
 if(mode==='student')$('rtv-submit').onsubmit=submitTopic;
 paintRows();
}
async function load(){
 if(!sb)return;
 const fields='id,student_id,title,objectives,rationale,program,department,intake_year,academic_year,supervisor_user_id,supervisor_name,status,similarity_note,reviewer_comments,created_at,updated_at';
 const q=sb.from('research_topic_vault').select(fields).order('created_at',{ascending:false});
 const r=await q;if(r.error){fail('Could not load topic vault: '+r.error.message);return}
 rows=r.data||[];
 if(mode==='staff'&&rows.length){
  const ids=[...new Set(rows.map(x=>x.student_id).filter(Boolean))];
  const p=await sb.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,program,department').in('user_id',ids);
  if(!p.error){const m=new Map((p.data||[]).map(x=>[x.user_id,x]));rows=rows.map(x=>({...x,student:m.get(x.student_id)||null}));}
 }
 render();
}
async function submitTopic(e){
 e.preventDefault();const f=new FormData(e.currentTarget),title=String(f.get('title')||'').trim();
 if(title.length<12){fail('Please enter a complete research title.');return}
 const payload={student_id:user.id,title,objectives:String(f.get('objectives')||'').trim(),rationale:String(f.get('rationale')||'').trim(),program:profile.program||profile.department||null,department:profile.department||null,intake_year:profile.intake_year||null,status:'pending'};
 const b=e.currentTarget.querySelector('button[type=submit]');b.disabled=true;b.textContent='Checking and submitting…';
 try{
  // Database trigger performs cross-student similarity screening; unique index blocks exact duplicates atomically.
  const ins=await sb.from('research_topic_vault').insert(payload).select('id,similarity_note').single();if(ins.error)throw ins.error;
  e.currentTarget.reset();
  notify(ins.data?.similarity_note?'Topic submitted and flagged for similarity review. It remains pending.':'Topic submitted. It remains pending until reviewer approval.');
  await load();
 }catch(err){fail(err.code==='23505'?'This title is already reserved or awaiting review. Please submit a different title.':(err.message||String(err)))}finally{b.disabled=false;b.textContent='Submit topic for review'}
}
function paintRows(){
 const body=$('rtv-rows');if(!body)return;
 const q=search.toLowerCase();
 const list=rows.filter(r=>(filter==='all'||r.status===filter)&&(!q||[r.title,r.program,r.department,r.student?.full_name,r.student?.student_id,r.supervisor_name].join(' ').toLowerCase().includes(q)));
 body.innerHTML=list.map(r=>`<tr><td><strong>${esc(r.title)}</strong>${(r.similarity_note?'<div style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:7px;margin-top:6px;font-size:11px">⚠ '+esc(r.similarity_note)+'</div>':'')+(r.reviewer_comments?'<div style="color:#64748b;margin-top:4px">'+esc(r.reviewer_comments)+'</div>':'')}</td><td>${esc(r.student?.full_name|| (r.student_id===user?.id?'You':'Student'))}</td><td>${esc(r.program||r.department||'—')}</td><td>${esc(r.supervisor_name||'—')}</td><td><span class="rtv-pill ${esc(r.status)}">${esc(r.status.replace(/_/g,' '))}</span></td><td>${esc(new Date(r.created_at).toLocaleDateString())}</td>${mode==='staff'?'<td><button class="rtv-btn alt" data-review="'+r.id+'">Review</button></td>':''}</tr>`).join('')||'<tr><td colspan="7" class="rtv-empty">No topics match this view.</td></tr>';
 if(mode==='staff')body.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>review(b.dataset.review));
}
async function review(id){
 const r=rows.find(x=>x.id===id);if(!r)return;
 const choices=['approved','revision_required','rejected','active','completed','released'];
 const next=prompt('Set status: '+choices.join(', '),r.status);if(!next)return;
 if(!choices.includes(next)){fail('Invalid status.');return}
 const comments=prompt('Reviewer comments / similarity findings:',r.reviewer_comments||'')||'';
 let supervisor=r.supervisor_name||'';
 if(next==='approved'||next==='active'){supervisor=prompt('Supervisor name (leave blank if not assigned):',supervisor)||supervisor;}
 const now=new Date().toISOString();
 const patch={status:next,reviewer_comments:comments,reviewed_by:user.id,reviewed_at:now,updated_at:now,supervisor_name:supervisor};
 if(next==='approved')patch.approved_at=now;
 if(next==='released')patch.released_at=now;
 const up=await sb.from('research_topic_vault').update(patch).eq('id',id);
 if(up.error){fail('Review failed: '+up.error.message);return}
 notify('Topic status updated.');await load();
}
window.addEventListener('nchsm:research-vault-open',()=>{if(!sb){init();return;}mount();load();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,700),{once:true});else setTimeout(init,700);
})();
