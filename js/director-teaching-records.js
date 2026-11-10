/* NCHSM Director Teaching Records — read-only institutional oversight workspace.
 * Approval, rejection, returns, backups and record mutation remain with authorised workflows.
 */
(function(w){
'use strict';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v||0).toLocaleString('en-KE');
const dt=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'});};
const TABLE={
 submissions:'lecturer_report_submissions',reviews:'lecturer_report_reviews',attachments:'lecturer_report_attachments',
 deadlines:'lecturer_report_deadlines',requirements:'lecturer_report_requirements',versions:'lecturer_report_document_versions',
 assignments:'lecturer_subject_assignments',audit:'audit_logs',backups:'lecturer_report_backup_history'
};
const SELECT={
 submissions:'id,lecturer_user_id,lecturer_id,lecturer_name,lecturer_email,report_type,report_category,document_type,title,summary,unit_name,subject_code,program,block,academic_year,week_number,period_start,period_end,recipient_role,include_attendance,include_grades,include_activities,include_challenges,status,reviewer_user_id,reviewer_name,reviewer_comments,submitted_at,reviewed_at,approved_at,attachment_count,created_at,updated_at,attachment_name,attachment_type,attachment_size,class_block,document_title',
 reviews:'id,submission_id,reviewer_user_id,reviewer_name,action,comments,created_at',
 attachments:'id,submission_id,file_name,mime_type,file_size,created_at,storage_path',
 deadlines:'id,school,document_type,unit_code,due_at,program,term,block,academic_year,unit_name,intake_year,created_at',
 requirements:'id,school,program,intake_year,block,term,document_type,unit_code,unit_name,due_at,is_required,created_at,updated_at',
 versions:'id,submission_id,attachment_id,version_number,file_name,mime_type,file_size,created_at',
 assignments:'id,lecturer_id,lecturer_name,program,block,subject_name,subject_code,academic_year,department,created_at',audit:'id,timestamp,created_at,actor_name,user_role,role,action_type,module,target_table,target_id,description,status,source,request_id',backups:'id,created_by,created_at,backup_file_name,backup_format,record_counts,attachment_count,attachment_bytes,status'
};
const state={client:null,profile:null,rows:[],reviews:[],deadlines:[],requirements:[],assignments:[],audit:[],backups:[],activeTab:'submissions',filters:{q:'',status:'',program:'',school:'',type:'',from:'',to:''},selected:null,detail:{reviews:[],attachments:[],versions:[]},loading:false};
const $=id=>document.getElementById(id);
function toast(message,type='info'){
 if(typeof w.DirectorToast==='function')return w.DirectorToast(message,type);
 let el=$('directorTeachingToast');if(!el){el=document.createElement('div');el.id='directorTeachingToast';el.style.cssText='position:fixed;right:18px;top:18px;z-index:6000;padding:12px 16px;border-radius:10px;background:#102b45;color:#fff;box-shadow:0 8px 24px #0003;font:600 12px system-ui;max-width:360px';document.body.appendChild(el);}
 el.textContent=message;el.style.borderLeft='4px solid '+(type==='error'?'#dc2626':'#0d9488');clearTimeout(el._timer);el._timer=setTimeout(()=>el.remove(),3800);
}
function status(s){const v=String(s||'unknown').toLowerCase();const c=['approved','complete','completed'].includes(v)?'#15803d':['rejected','overdue'].includes(v)?'#b91c1c':['submitted','resubmitted','under_review','pending'].includes(v)?'#a16207':'#64748b';return '<span class="dtr-badge" style="color:'+c+';background:'+c+'18">'+esc(v.replace(/_/g,' '))+'</span>';}
async function read(key,order='created_at',limit=1500){
 const {data,error}=await state.client.from(TABLE[key]).select(SELECT[key]).order(order,{ascending:false}).limit(limit);
 if(error)throw new Error(TABLE[key]+': '+error.message);return data||[];
}
async function load(){
 state.loading=true;
 const results=await Promise.allSettled([
  read('submissions','submitted_at'),read('deadlines','due_at'),read('requirements','created_at'),
  read('assignments','created_at'),read('reviews','created_at'),read('audit','timestamp'),read('backups','created_at')
 ]);
 const keys=['rows','deadlines','requirements','assignments','reviews','audit','backups'];
 results.forEach((r,i)=>{if(r.status==='fulfilled')state[keys[i]]=r.value;else{state[keys[i]]=[];console.warn('[DirectorTeachingRecords]',keys[i],r.reason);}});
 state.loading=false;
}
function dueState(v){if(!v)return'No deadline';const d=new Date(v);if(Number.isNaN(d.getTime()))return'Unclear';return d.getTime()<Date.now()?'Overdue':'Upcoming';}
function filtered(){
 const f=state.filters,q=f.q.trim().toLowerCase();
 return state.rows.filter(r=>{
  const text=[r.title,r.lecturer_name,r.lecturer_email,r.lecturer_id,r.unit_name,r.subject_code,r.program,r.block,r.report_type,r.report_category,r.document_type,r.academic_year].join(' ').toLowerCase();
  if(q&&!text.includes(q))return false;
  if(f.status&&r.status!==f.status)return false;
  if(f.program&&String(r.program||'')!==f.program)return false;
  if(f.school&&school(r)!==f.school)return false;
  if(f.type&&String(r.report_type||r.document_type||'')!==f.type)return false;
  const date=String(r.submitted_at||r.created_at||'').slice(0,10);
  if(f.from&&(!date||date<f.from))return false;if(f.to&&(!date||date>f.to))return false;
  return true;
 });
}
function school(r){return String(r.program||'').toLowerCase().includes('tvet')?'TVET':String(r.program||'').toLowerCase().includes('nursing')||String(r.program||'').toLowerCase().includes('krchn')?'Nursing':r.department||'Other';}
function countBy(rows,key){const o={};rows.forEach(r=>{const k=String(r[key]||'Unspecified');o[k]=(o[k]||0)+1;});return Object.entries(o).sort((a,b)=>b[1]-a[1]);}
function kpi(label,n,sub){return '<article class="dtr-kpi"><span>'+esc(label)+'</span><strong>'+fmt(n)+'</strong><small>'+esc(sub||'All loaded records')+'</small></article>';}
function options(values,first){return '<option value="">'+first+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');}
function unique(key,rows=state.rows){return [...new Set(rows.map(r=>r[key]).filter(Boolean).map(String))].sort();}
function header(){return '<div class="d-page-head"><div><div class="d-eyebrow">Academic delivery oversight</div><h1>Teaching Records</h1><p>Institutional view of lecturer reports, teaching evidence, compliance and reporting deadlines.</p></div><div class="d-head-actions"><button class="d-btn" data-dtr-refresh><i class="fa-solid fa-rotate"></i> Refresh</button><button class="d-btn primary" data-dtr-export><i class="fa-solid fa-file-csv"></i> Export filtered CSV</button></div></div>';}
function tabs(){return '<nav class="dtr-tabs" aria-label="Teaching records sections">'+[['submissions','Lecturer submissions'],['compliance','Lecturer compliance'],['requirements','Requirements'],['deadlines','Deadlines'],['analytics','Analytics'],['audit','Audit trail'],['backups','Backup history']].map(([id,label])=>'<button type="button" data-dtr-tab="'+id+'" class="'+(state.activeTab===id?'active':'')+'">'+label+'</button>').join('')+'</nav>';}
function renderSubmissions(){
 const rows=filtered();
 const filters='<div class="dtr-filters"><input type="search" id="dtr-q" placeholder="Search lecturer, unit, title or programme" value="'+esc(state.filters.q)+'"><select id="dtr-status">'+options(unique('status'),'All statuses')+'</select><select id="dtr-program">'+options(unique('program'),'All programmes')+'</select><select id="dtr-school">'+options([...new Set(state.rows.map(school))].sort(),'All schools')+'</select><select id="dtr-type">'+options([...new Set(state.rows.map(r=>r.report_type||r.document_type).filter(Boolean).map(String))].sort(),'All report types')+'</select><label>From <input id="dtr-from" type="date" value="'+esc(state.filters.from)+'"></label><label>To <input id="dtr-to" type="date" value="'+esc(state.filters.to)+'"></label><button class="d-btn" data-dtr-clear>Clear</button></div>';
 const table=rows.length?'<div class="d-table-wrap"><table class="d-table"><thead><tr><th>Lecturer</th><th>Report / Evidence</th><th>Unit</th><th>Programme</th><th>Block</th><th>Period</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>'+rows.map(r=>'<tr><td><b>'+esc(r.lecturer_name||'Name unavailable')+'</b><small class="dtr-sub">'+esc(r.lecturer_email||r.lecturer_id||'')+'</small></td><td>'+esc(r.title||r.document_title||r.report_type||r.document_type||'Teaching report')+'<small class="dtr-sub">'+esc(r.report_category||r.report_type||r.document_type||'')+'</small></td><td>'+esc([r.subject_code,r.unit_name].filter(Boolean).join(' · ')||'—')+'</td><td>'+esc(r.program||'—')+'</td><td>'+esc(r.block||r.class_block||'—')+'</td><td>'+esc([r.period_start,r.period_end].filter(Boolean).join(' – ')||('Week '+(r.week_number||'—')) )+'</td><td>'+esc(dt(r.submitted_at||r.created_at))+'</td><td>'+status(r.status)+'</td><td><button class="d-btn" data-dtr-open="'+esc(r.id)+'">View record</button></td></tr>').join('')+'</tbody></table></div>':'<div class="dtr-empty">No lecturer submissions match these filters.</div>';
 return '<section class="dtr-panel"><div class="dtr-panel-head"><div><h2>Lecturer submissions</h2><p>'+fmt(rows.length)+' of '+fmt(state.rows.length)+' submissions</p></div></div>'+filters+table+'</section>';
}
function renderCompliance(){
 const grouped=new Map();
 state.assignments.forEach(a=>{const k=String(a.lecturer_id||a.lecturer_name||'unknown');if(!grouped.has(k))grouped.set(k,{name:a.lecturer_name||'Name unavailable',id:a.lecturer_id,program:a.program||'—',units:[],reports:0,matched:new Set()});grouped.get(k).units.push(a);});
 state.rows.forEach(r=>{const k=String(r.lecturer_id||'');if(!grouped.has(k))return;const person=grouped.get(k);person.reports++;const code=String(r.subject_code||'').trim().toLowerCase(),unit=String(r.unit_name||'').trim().toLowerCase();person.units.forEach((a,index)=>{const aCode=String(a.subject_code||'').trim().toLowerCase(),aUnit=String(a.subject_name||'').trim().toLowerCase();if((code&&aCode&&code===aCode)||(unit&&aUnit&&unit===aUnit))person.matched.add(index);});});
 const people=[...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name));
 const body=people.length?'<div class="d-table-wrap"><table class="d-table"><thead><tr><th>Lecturer</th><th>Staff ID</th><th>Programme</th><th>Assigned units</th><th>Reports submitted</th><th>Units evidenced</th><th>Reporting coverage</th></tr></thead><tbody>'+people.map(p=>{const submitted=p.reports,assigned=p.units.length,matched=p.matched.size,pct=assigned?Math.min(100,Math.round(matched/assigned*100)):0;return '<tr><td><b>'+esc(p.name)+'</b></td><td>'+esc(p.id||'—')+'</td><td>'+esc(p.program)+'</td><td>'+fmt(assigned)+'</td><td>'+fmt(submitted)+'</td><td>'+fmt(matched)+' / '+fmt(assigned)+'</td><td><div class="dtr-progress"><span style="width:'+pct+'%"></span></div><small>'+pct+'% unit match</small></td></tr>';}).join('')+'</tbody></table></div>':'<div class="dtr-empty">Lecturer assignment records are not available to calculate compliance. Check the database access message below.</div>';
 return '<section class="dtr-panel"><div class="dtr-panel-head"><div><h2>Lecturer compliance overview</h2><p>Assignment-to-submission matching is indicative and based on staff ID and unit/document references.</p></div></div>'+body+'</section>';
}
function renderRequirements(){
 const rows=state.requirements;
 return '<section class="dtr-panel"><div class="dtr-panel-head"><div><h2>Teaching documentation requirements</h2><p>'+fmt(rows.length)+' requirements configured in the institutional register</p></div></div>'+(rows.length?'<div class="d-table-wrap"><table class="d-table"><thead><tr><th>School</th><th>Programme</th><th>Intake</th><th>Block / Term</th><th>Document</th><th>Unit</th><th>Due</th><th>Required</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.school||'—')+'</td><td>'+esc(r.program||'—')+'</td><td>'+esc(r.intake_year||'—')+'</td><td>'+esc([r.block,r.term].filter(Boolean).join(' / ')||'—')+'</td><td>'+esc(r.document_type||'—')+'</td><td>'+esc([r.unit_code,r.unit_name].filter(Boolean).join(' · ')||'—')+'</td><td>'+esc(dt(r.due_at))+'</td><td>'+status(r.is_required?'Required':'Optional')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="dtr-empty">No requirements are visible.</div>')+'</section>';
}
function renderDeadlines(){
 const rows=state.deadlines;
 return '<section class="dtr-panel"><div class="dtr-panel-head"><div><h2>Reporting deadlines</h2><p>'+fmt(rows.length)+' deadline records</p></div></div>'+(rows.length?'<div class="d-table-wrap"><table class="d-table"><thead><tr><th>School</th><th>Programme</th><th>Document</th><th>Unit</th><th>Block / Term</th><th>Academic year</th><th>Due date</th><th>Position</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.school||'—')+'</td><td>'+esc(r.program||'—')+'</td><td>'+esc(r.document_type||'—')+'</td><td>'+esc([r.unit_code,r.unit_name].filter(Boolean).join(' · ')||'—')+'</td><td>'+esc([r.block,r.term].filter(Boolean).join(' / ')||'—')+'</td><td>'+esc(r.academic_year||r.intake_year||'—')+'</td><td>'+esc(dt(r.due_at))+'</td><td>'+status(dueState(r.due_at))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="dtr-empty">No reporting deadlines are visible.</div>')+'</section>';
}
function renderAudit(){const rows=state.audit.filter(r=>['lecturer_report_submissions','lecturer_report_reviews','lecturer_report_attachments','lecturer_report_deadlines','lecturer_report_requirements','lecturer_report_document_versions','lecturer_report_backup_history'].includes(String(r.target_table||''))||/lecturer.?report|teaching/i.test(String(r.module||'')));return '<section class="dtr-panel"><div class="dtr-panel-head"><div><h2>Teaching records audit trail</h2><p>'+fmt(rows.length)+' matching audit events. Network addresses and device identifiers are intentionally excluded.</p></div></div>'+(rows.length?'<div class="d-table-wrap"><table class="d-table"><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Module / Table</th><th>Record</th><th>Description</th><th>Status</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(dt(r.timestamp||r.created_at))+'</td><td>'+esc(r.actor_name||'—')+'</td><td>'+esc(r.user_role||r.role||'—')+'</td><td>'+esc(r.action_type||'—')+'</td><td>'+esc(r.module||r.target_table||'—')+'</td><td>'+esc(r.target_id||'—')+'</td><td>'+esc(r.description||'—')+'</td><td>'+status(r.status)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="dtr-empty">No teaching-specific audit events are available.</div>')+'</section>';}
function renderBackups(){const rows=state.backups;return '<section class="dtr-panel"><div class="dtr-panel-head"><div><h2>Teaching records backup history</h2><p>'+fmt(rows.length)+' backup history entries. This is a monitoring view; creating, downloading, restoring or deleting backups is not enabled here.</p></div></div>'+(rows.length?'<div class="d-table-wrap"><table class="d-table"><thead><tr><th>Created</th><th>Backup file</th><th>Format</th><th>Records</th><th>Attachments</th><th>Attachment size</th><th>Status</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(dt(r.created_at))+'</td><td>'+esc(r.backup_file_name||'—')+'</td><td>'+esc(r.backup_format||'—')+'</td><td><code>'+esc(JSON.stringify(r.record_counts||{}))+'</code></td><td>'+fmt(r.attachment_count)+'</td><td>'+fmt(Math.round(Number(r.attachment_bytes||0)/1024))+' KB</td><td>'+status(r.status)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="dtr-empty">No backup history is available.</div>')+'</section>';}
function renderAnalytics(){
 const rows=filtered(),stats=countBy(rows,'status'),programs=countBy(rows,'program');
 const bars=(items)=>items.length?items.slice(0,8).map(([n,v])=>'<div class="dtr-bar-row"><span>'+esc(n)+'</span><b>'+fmt(v)+'</b><i><em style="width:'+Math.max(3,v/Math.max(...items.map(x=>x[1]))*100)+'%"></em></i></div>').join(''):'<div class="dtr-empty">No data for this selection.</div>';
 return '<div class="dtr-analytics"><section class="dtr-panel"><h2>Submission status</h2>'+bars(stats)+'</section><section class="dtr-panel"><h2>Submissions by programme</h2>'+bars(programs)+'</section><section class="dtr-panel"><h2>Reporting snapshot</h2><p>These indicators use the currently filtered submission records. They do not change academic marks or approval states.</p>'+kpi('Filtered submissions',rows.length,'Current filters')+kpi('Lecturers represented',new Set(rows.map(r=>r.lecturer_id||r.lecturer_name).filter(Boolean)).size,'Distinct lecturers')+kpi('With attachments',rows.filter(r=>Number(r.attachment_count||0)>0||r.attachment_name).length,'Submission metadata')+'</section></div>';
}
function render(){
 const root=$('directorContent');if(!root)return;
 const rows=filtered(),pending=state.rows.filter(r=>['submitted','resubmitted','under_review'].includes(String(r.status).toLowerCase())).length;
 const approved=state.rows.filter(r=>String(r.status).toLowerCase()==='approved').length;
 const overdue=state.deadlines.filter(r=>dueState(r.due_at)==='Overdue').length;
 let html=header()+'<section class="dtr-kpis">'+kpi('Total submissions',state.rows.length,'All records visible to Director')+kpi('Awaiting review',pending,'Submitted, resubmitted or under review')+kpi('Approved reports',approved,'Existing workflow status only')+kpi('Overdue deadlines',overdue,'Based on configured due dates')+'</section>'+tabs();
 html+=state.activeTab==='submissions'?renderSubmissions():state.activeTab==='compliance'?renderCompliance():state.activeTab==='requirements'?renderRequirements():state.activeTab==='deadlines'?renderDeadlines():state.activeTab==='audit'?renderAudit():state.activeTab==='backups'?renderBackups():renderAnalytics();
 html+='<p class="dtr-footnote"><i class="fa-solid fa-shield-halved"></i> Director access is institutional oversight and read-only. Approval, rejection, return-for-correction, backup and restore actions remain in their authorised workflows.</p>';
 root.innerHTML=html;
 ['status','program','school','type'].forEach(key=>{const el=$('dtr-'+key);if(el)el.value=state.filters[key];});
}
function bindFilters(){
 const bind=(id,key)=>{const el=$(id);if(el)el.addEventListener('input',()=>{state.filters[key]=el.value;render();});};
 ['q','status','program','school','type','from','to'].forEach(k=>bind('dtr-'+k,k));
}
function csv(){
 const rows=filtered(),cols=['lecturer_name','lecturer_id','lecturer_email','title','report_type','report_category','document_type','unit_name','subject_code','program','block','academic_year','week_number','period_start','period_end','status','submitted_at','reviewer_name','reviewed_at'];
 const lines=[cols,...rows.map(r=>cols.map(k=>String(r[k]??'')))].map(a=>a.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([lines],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='NCHSM_Director_Teaching_Records_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function openRecord(id){
 const row=state.rows.find(r=>String(r.id)===String(id));if(!row)return;
 state.selected=row;
 const root=document.createElement('div');root.className='d-edit-overlay dtr-overlay';root.id='dtr-detail-modal';root.innerHTML='<section class="d-edit-dialog dtr-detail"><header class="d-edit-head"><div><span class="d-edit-kicker">LECTURER TEACHING EVIDENCE</span><h2>'+esc(row.title||row.document_title||row.report_type||'Submission details')+'</h2><p>'+esc(row.lecturer_name||'Name unavailable')+' · '+esc(row.program||'Programme not specified')+'</p></div><button class="d-edit-close" data-dtr-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button></header><div class="d-edit-body"><div class="dtr-detail-grid">'+[['Lecturer ID',row.lecturer_id],['Email',row.lecturer_email],['Report type',row.report_type],['Category',row.report_category],['Document type',row.document_type],['Unit',row.unit_name],['Unit code',row.subject_code],['Block',row.block||row.class_block],['Academic year',row.academic_year],['Week',row.week_number],['Period', [row.period_start,row.period_end].filter(Boolean).join(' – ')],['Status',row.status],['Submitted',dt(row.submitted_at)],['Reviewed',dt(row.reviewed_at)],['Reviewer',row.reviewer_name],['Approved date',dt(row.approved_at)]].map(([k,v])=>'<div><small>'+esc(k)+'</small><b>'+esc(v??'—')+'</b></div>').join('')+'</div><h3>Lecturer summary</h3><p class="dtr-summary">'+esc(row.summary||'No summary was supplied.')+'</p><h3>Attachments</h3><div id="dtr-attachments" class="dtr-detail-list">Loading attachments…</div><h3>Document versions</h3><div id="dtr-versions" class="dtr-detail-list">Loading versions…</div><h3>Review history</h3><div id="dtr-reviews" class="dtr-detail-list">Loading review history…</div><p class="dtr-footnote">This view does not provide approval or editing controls.</p></div><footer class="d-edit-actions"><button class="d-btn" data-dtr-close>Close</button></footer></section>';
 document.body.appendChild(root);root.querySelectorAll('[data-dtr-close]').forEach(b=>b.onclick=()=>root.remove());root.addEventListener('click',e=>{if(e.target===root)root.remove();});
 const [att,vers,rev]=await Promise.allSettled([
  state.client.from(TABLE.attachments).select(SELECT.attachments).eq('submission_id',id).order('created_at',{ascending:false}),
  state.client.from(TABLE.versions).select(SELECT.versions).eq('submission_id',id).order('version_number',{ascending:false}),
  state.client.from(TABLE.reviews).select(SELECT.reviews).eq('submission_id',id).order('created_at',{ascending:false})
 ]);
 const renderList=(id,arr,kind)=>{const el=$(id);if(!el)return;if(!arr.length){el.textContent='No '+kind+' recorded.';return;}el.innerHTML=arr.map(x=>'<div class="dtr-file"><span><b>'+esc(x.file_name||x.action||x.reviewer_name||kind)+'</b><small>'+esc(x.mime_type||x.comments||dt(x.created_at))+'</small></span>'+(kind==='attachments'?'<button class="d-btn" data-dtr-file="'+esc(x.id)+'">Open file</button>':'')+'</div>').join('');};
 const attachments=att.status==='fulfilled'?(att.value.data||[]):[];renderList('dtr-attachments',attachments,'attachments');
 renderList('dtr-versions',vers.status==='fulfilled'?(vers.value.data||[]):[],'versions');
 renderList('dtr-reviews',rev.status==='fulfilled'?(rev.value.data||[]):[],'reviews');
 if(att.status==='rejected'||vers.status==='rejected'||rev.status==='rejected')toast('Some supporting history is unavailable under current database permissions.','error');
 root.querySelectorAll('[data-dtr-file]').forEach(btn=>btn.addEventListener('click',async()=>{
  const file=attachments.find(x=>String(x.id)===btn.dataset.dtrFile);if(!file?.storage_path)return;
  btn.disabled=true;btn.textContent='Preparing…';
  try{const {data,error}=await state.client.storage.from('lecturer-reports').createSignedUrl(file.storage_path,60);if(error)throw error;if(!data?.signedUrl)throw new Error('Secure file link was not returned.');w.open(data.signedUrl,'_blank','noopener');btn.textContent='Opened';}
  catch(e){btn.disabled=false;btn.textContent='Open file';toast('Unable to open attachment: '+e.message,'error');}
 }));
}
async function init(client,profile){
 if(!client)throw new Error('Director Supabase session is unavailable.');
 state.client=client;state.profile=profile||null;state.filters={q:'',status:'',program:'',school:'',type:'',from:'',to:''};state.activeTab='submissions';
 await load();render();
}
function renderTab(tab){state.activeTab=tab;render();}
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-dtr-tab]');if(tab){renderTab(tab.dataset.dtrTab);return;}
 if(e.target.closest('[data-dtr-refresh]')){init(state.client,state.profile).catch(err=>toast(err.message,'error'));return;}
 if(e.target.closest('[data-dtr-export]')){csv();return;}
 if(e.target.closest('[data-dtr-clear]')){state.filters={q:'',status:'',program:'',school:'',type:'',from:'',to:''};render();return;}
 const open=e.target.closest('[data-dtr-open]');if(open)openRecord(open.dataset.dtrOpen);
});
document.addEventListener('input',e=>{if(e.target.id==='dtr-q'){state.filters.q=e.target.value;const pos=e.target.selectionStart;render();const el=$('dtr-q');el?.focus();el?.setSelectionRange(pos,pos);}});
document.addEventListener('change',e=>{const map={'dtr-status':'status','dtr-program':'program','dtr-school':'school','dtr-type':'type','dtr-from':'from','dtr-to':'to'};const key=map[e.target.id];if(key){state.filters[key]=e.target.value;render();}});
w.DirectorTeachingRecords={init,render:()=>render(),getState:()=>({submissionCount:state.rows.length,deadlineCount:state.deadlines.length,requirementCount:state.requirements.length})};
})(window);
