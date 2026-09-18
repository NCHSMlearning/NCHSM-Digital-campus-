
(function(){
'use strict';

var state={tab:'assignments',assignments:[],submissions:[],results:[],current:null,currentQuestions:[],file:null,bound:false};
var researchState={submissions:[],current:null,file:null,loaded:false};

function client(){
  return (window.db&&window.db.supabase)||window.supabase||window.supabaseClient||null;
}
function uid(){return (window.db&&window.db.currentUserId)||window.currentUserId||null}
function profile(){return (window.db&&window.db.currentUserProfile)||window.currentUserProfile||{}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fmtDate(v){if(!v)return '—';var d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}
function fmtDateTime(v){if(!v)return '—';var d=new Date(v);return isNaN(d)?String(v):d.toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function daysTo(v){if(!v)return null;return Math.ceil((new Date(v).getTime()-Date.now())/86400000)}
function setError(msg){var e=document.getElementById('ol-error');if(!e)return;e.textContent=msg||'';e.hidden=!msg}
function setContent(html){var c=document.getElementById('ol-content');if(c)c.innerHTML=html}
function loading(){setContent('<div class="ol-loading"><i class="fas fa-spinner fa-spin"></i>Loading...</div>')}
function statusPill(s){
  var x=String(s||'').toLowerCase(), cls=x==='released'?'success':(x==='graded'?'success':(x==='submitted'?'':'due'));
  return '<span class="ol-pill '+cls+'">'+esc(s||'Pending')+'</span>';
}
function getSubmission(aid){return state.submissions.find(function(s){return String(s.assignment_id)===String(aid)})||null}
function assignmentStatus(a){
  var s=getSubmission(a.id);
  if(s&&s.result_released)return 'released';
  if(s&&s.status==='graded')return 'graded';
  if(s)return 'submitted';
  return 'pending';
}
function dueLabel(a){
  if(!a.due_at)return '<span class="ol-pill">No due date</span>';
  var n=daysTo(a.due_at);
  if(n<0)return '<span class="ol-pill danger">Past due</span>';
  if(n===0)return '<span class="ol-pill danger">Due today</span>';
  if(n<=3)return '<span class="ol-pill due">Due in '+n+' day'+(n===1?'':'s')+'</span>';
  return '<span class="ol-pill">Due '+esc(fmtDate(a.due_at))+'</span>';
}
function card(a){
  var s=getSubmission(a.id), st=assignmentStatus(a), type=String(a.assignment_type||'assignment');
  var icon=type==='case_study'?'fa-user-doctor':(type==='quiz'?'fa-circle-question':'fa-file-pen');
  var button=s&&s.result_released
    ? '<button class="ol-btn ol-btn-secondary" type="button" data-ol-result="'+esc(s.id)+'"><i class="fas fa-chart-column"></i> View Result</button>'
    : '<button class="ol-btn ol-btn-primary" type="button" data-ol-open="'+esc(a.id)+'"><i class="fas '+(s?'fa-eye':'fa-paper-plane')+'"></i> '+(s?'View Submission':'Open & Submit')+'</button>';
  return '<article class="ol-card"><div class="ol-card-icon"><i class="fas '+icon+'"></i></div><div class="ol-card-main"><h3>'+esc(a.title||'Untitled Assignment')+'</h3><p>'+esc(a.unit_code||'')+(a.unit_name?' — '+esc(a.unit_name):'')+'</p><div class="ol-meta">'+
    '<span class="ol-pill"><i class="fas fa-tag"></i>'+esc(type.replace('_',' '))+'</span>'+
    (a.max_marks?'<span class="ol-pill"><i class="fas fa-award"></i>'+esc(a.max_marks)+' marks</span>':'')+
    dueLabel(a)+statusPill(st)+'</div></div><div class="ol-actions">'+button+'</div></article>';
}
function renderAssignments(){
  var q=(document.getElementById('ol-search')?.value||'').toLowerCase().trim(), f=document.getElementById('ol-status-filter')?.value||'all';
  var arr=state.assignments.filter(function(a){
    var text=[a.title,a.unit_code,a.unit_name,a.instructions,a.assignment_type].join(' ').toLowerCase();
    return (!q||text.includes(q))&&(f==='all'||assignmentStatus(a)===f);
  });
  setContent(arr.length?arr.map(card).join(''):'<div class="ol-empty"><i class="fas fa-inbox"></i><strong>No assignments found</strong><br>Published learning activities for your programme, block and units will appear here.</div>');
}
function renderSubmissions(){
  var arr=state.submissions.slice().sort(function(a,b){return new Date(b.submitted_at||0)-new Date(a.submitted_at||0)});
  if(!arr.length){setContent('<div class="ol-empty"><i class="fas fa-cloud-arrow-up"></i><strong>No submissions yet</strong><br>Your submitted assignments will appear here.</div>');return}
  setContent(arr.map(function(s){
    var a=state.assignments.find(function(x){return String(x.id)===String(s.assignment_id)})||{};
    var file=s.file_name?'<span><i class="fas fa-file"></i> '+esc(s.file_name)+'</span>':'<span>No document</span>';
    var score=s.result_released&&s.marks_obtained!=null?esc(s.marks_obtained)+' / '+esc(s.max_marks||a.max_marks||'—'):'Not released';
    return '<div class="ol-submission-row"><div><strong>'+esc(a.title||s.assignment_title||'Assignment')+'</strong>'+file+'</div><div><strong>Submitted</strong><span>'+esc(fmtDateTime(s.submitted_at))+'</span></div><div><strong>Status</strong><span>'+statusPill(s.result_released?'Released':(s.status||'Submitted'))+'</span></div><div><strong>Result</strong><span>'+score+'</span></div><div class="ol-actions">'+(s.result_released?'<button class="ol-btn ol-btn-secondary" data-ol-result="'+esc(s.id)+'" type="button">View Result</button>':'<span class="ol-pill">Under Review</span>')+'</div></div>';
  }).join(''));
}
function renderResults(){
  var arr=state.results.filter(function(r){return r.result_released});
  if(!arr.length){setContent('<div class="ol-empty"><i class="fas fa-chart-column"></i><strong>No released results</strong><br>Lecturer results will appear here after they are released.</div>');return}
  setContent(arr.map(function(r){
    var a=state.assignments.find(function(x){return String(x.id)===String(r.assignment_id)})||{};
    var pct=r.max_marks?Math.round((Number(r.marks_obtained)/Number(r.max_marks))*100):0;
    return '<div class="ol-result-card"><div class="ol-result-score">'+esc(r.marks_obtained)+'<small style="font-size:8px">/'+esc(r.max_marks)+'</small></div><div style="flex:1"><strong style="font-size:12px;color:#18304d">'+esc(a.title||r.assignment_title||'Assignment')+'</strong><span style="display:block;font-size:10px;color:#71859c;margin-top:4px">'+esc(a.unit_code||'')+' · '+pct+'% · Released '+esc(fmtDate(r.released_at))+'</span></div><button class="ol-btn ol-btn-secondary" data-ol-result="'+esc(r.id)+'" type="button">View</button></div>';
  }).join(''));
}

/* ============================================================
   RESEARCH PAPERS — integrated inside Online Learning
   ============================================================ */
function researchEnsureStyles(){
  if(document.getElementById('ol-research-styles'))return;
  var st=document.createElement('style');st.id='ol-research-styles';
  st.textContent=`
  #hub-online-learning .ol-research-wrap{padding:12px}
  #hub-online-learning .ol-research-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px;border:1px solid #dce8f3;border-radius:12px;background:linear-gradient(135deg,#f7fbff,#ffffff);margin-bottom:10px}
  #hub-online-learning .ol-research-head h3{margin:0;color:#18304d;font-size:15px}
  #hub-online-learning .ol-research-head p{margin:4px 0 0;color:#71859c;font-size:10px}
  #hub-online-learning .ol-research-btn{border:0;border-radius:8px;padding:9px 12px;background:#087bf0;color:#fff;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}
  #hub-online-learning .ol-research-btn:disabled{opacity:.65;cursor:not-allowed}
  #hub-online-learning .ol-research-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
  #hub-online-learning .ol-research-stat{border:1px solid #e1eaf2;border-radius:10px;padding:10px;background:#fff}
  #hub-online-learning .ol-research-stat strong{display:block;font-size:18px;color:#18304d}
  #hub-online-learning .ol-research-stat span{font-size:9px;color:#71859c;font-weight:700}
  #hub-online-learning .ol-research-table{border:1px solid #e1eaf2;border-radius:11px;overflow:hidden;background:#fff}
  #hub-online-learning .ol-research-row{display:grid;grid-template-columns:1.45fr .8fr .85fr .7fr .75fr auto;gap:8px;align-items:center;padding:11px;border-bottom:1px solid #edf2f7;font-size:10px}
  #hub-online-learning .ol-research-row:last-child{border-bottom:0}
  #hub-online-learning .ol-research-row.head{background:#f8fbfe;font-weight:800;color:#526b86}
  #hub-online-learning .ol-research-row strong{display:block;color:#18304d;font-size:11px}
  #hub-online-learning .ol-research-row small{display:block;color:#71859c;margin-top:3px}
  #hub-online-learning .ol-research-status{display:inline-flex;padding:4px 7px;border-radius:99px;font-size:8px;font-weight:900}
  #hub-online-learning .ol-rs-submitted{background:#edf4ff;color:#1761c9}.ol-rs-under{background:#fff4df;color:#a05a00}.ol-rs-revision{background:#ffedf0;color:#b42338}.ol-rs-approved{background:#e9f9f1;color:#087a4d}.ol-rs-rejected{background:#f1f5f9;color:#64748b}
  #hub-online-learning .ol-research-modal{position:fixed;inset:0;background:rgba(5,20,35,.58);z-index:10001;display:none;align-items:center;justify-content:center;padding:15px}
  #hub-online-learning .ol-research-modal.open{display:flex}
  #hub-online-learning .ol-research-dialog{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:15px;box-shadow:0 25px 70px rgba(0,0,0,.25)}
  #hub-online-learning .ol-research-dialog-head{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid #e5edf5;padding:14px 17px;display:flex;align-items:center;justify-content:space-between}
  #hub-online-learning .ol-research-dialog-head h3{margin:0;color:#18304d;font-size:15px}
  #hub-online-learning .ol-research-form{padding:17px;display:grid;grid-template-columns:1fr 1fr;gap:11px}
  #hub-online-learning .ol-research-field{display:flex;flex-direction:column;gap:5px}.ol-research-field.full{grid-column:1/-1}
  #hub-online-learning .ol-research-field label{font-size:10px;font-weight:800;color:#18304d}.ol-research-field label span{color:#e11d48}
  #hub-online-learning .ol-research-field input,#hub-online-learning .ol-research-field select,#hub-online-learning .ol-research-field textarea{width:100%;box-sizing:border-box;border:1px solid #dbe6ef;border-radius:8px;background:#f8fbfe;padding:9px 10px;outline:0;font:500 11px Inter,sans-serif;color:#263e5b}
  #hub-online-learning .ol-research-field textarea{min-height:100px;resize:vertical}
  #hub-online-learning .ol-research-upload{border:2px dashed #bcd2e5;border-radius:10px;padding:18px;text-align:center;background:#f8fbfe;cursor:pointer}
  #hub-online-learning .ol-research-upload i{font-size:25px;color:#087bf0}.ol-research-upload strong{display:block;margin-top:6px;color:#18304d;font-size:11px}.ol-research-upload small{display:block;margin-top:3px;color:#71859c;font-size:9px}
  #hub-online-learning .ol-research-file{margin-top:7px;font-size:10px;color:#0870d6;font-weight:800}
  #hub-online-learning .ol-research-foot{grid-column:1/-1;border-top:1px solid #e5edf5;padding-top:11px;display:flex;justify-content:flex-end;gap:7px}
  #hub-online-learning .ol-research-secondary{border:1px solid #d8e2ee;background:#fff;color:#526783;border-radius:8px;padding:9px 12px;font-size:10px;font-weight:800;cursor:pointer}
  #hub-online-learning .ol-research-detail{padding:17px}.ol-research-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ol-research-detail-box{border:1px solid #e1eaf2;border-radius:10px;padding:11px}.ol-research-detail-box strong{display:block;color:#18304d;font-size:10px}.ol-research-detail-box span,.ol-research-detail-box p{display:block;color:#607994;font-size:10px;line-height:1.5;margin:4px 0 0;white-space:pre-wrap}
  @media(max-width:700px){#hub-online-learning .ol-research-stats{grid-template-columns:1fr 1fr}#hub-online-learning .ol-research-form{grid-template-columns:1fr}#hub-online-learning .ol-research-field.full{grid-column:auto}#hub-online-learning .ol-research-foot{grid-column:auto}#hub-online-learning .ol-research-row{grid-template-columns:1fr 1fr}.ol-research-row.head{display:none}}
  body.dark-mode #hub-online-learning .ol-research-head,body.dark-mode #hub-online-learning .ol-research-stat,body.dark-mode #hub-online-learning .ol-research-table,body.dark-mode #hub-online-learning .ol-research-dialog,body.dark-mode #hub-online-learning .ol-research-dialog-head{background:#0d1b2d!important;border-color:#263d55!important}body.dark-mode #hub-online-learning .ol-research-head h3,body.dark-mode #hub-online-learning .ol-research-row strong,body.dark-mode #hub-online-learning .ol-research-field label,body.dark-mode #hub-online-learning .ol-research-dialog-head h3,body.dark-mode #hub-online-learning .ol-research-stat strong{color:#f1f5f9!important}body.dark-mode #hub-online-learning .ol-research-field input,body.dark-mode #hub-online-learning .ol-research-field select,body.dark-mode #hub-online-learning .ol-research-field textarea,body.dark-mode #hub-online-learning .ol-research-upload{background:#0a1727;color:#e2e8f0;border-color:#334b63}
  `;document.head.appendChild(st);
}
function researchEnsureUI(){
  var hub=document.getElementById('hub-online-learning');if(!hub)return;
  researchEnsureStyles();
  var tabs=hub.querySelector('.ol-tabs');
  if(tabs&&!tabs.querySelector('[data-ol-tab="research"]')){
    var b=document.createElement('button');b.className='ol-tab';b.type='button';b.dataset.olTab='research';b.innerHTML='<i class="fas fa-flask"></i> Research Papers';tabs.appendChild(b);
    b.addEventListener('click',function(){state.tab='research';tabs.querySelectorAll('[data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});loadResearch(true);});
  }
  if(!document.getElementById('ol-research-modal')){
    var m=document.createElement('div');m.className='ol-research-modal';m.id='ol-research-modal';m.setAttribute('aria-hidden','true');
    m.innerHTML='<div class="ol-research-dialog"><div class="ol-research-dialog-head"><h3><i class="fas fa-file-pen"></i> Submit Research Paper</h3><button type="button" class="ol-close" id="ol-research-close"><i class="fas fa-times"></i></button></div><form class="ol-research-form" id="ol-research-form">'+
      '<div class="ol-research-field"><label>Research Title <span>*</span></label><input id="ol-research-title" required maxlength="300" placeholder="Enter your research title"></div>'+
      '<div class="ol-research-field"><label>Research Type <span>*</span></label><select id="ol-research-type" required><option value="">Select research type</option><option value="proposal">Research Proposal</option><option value="final_paper">Final Research Paper</option><option value="correction">Correction / Revised Paper</option></select></div>'+
      '<div class="ol-research-field"><label>Supervisor <span>*</span></label><input id="ol-research-supervisor" required maxlength="200" placeholder="Enter supervisor name"></div>'+
      '<div class="ol-research-field"><label>Version</label><input id="ol-research-version" type="number" min="1" value="1"></div>'+
      '<div class="ol-research-field full"><label>Abstract / Description <span>*</span></label><textarea id="ol-research-abstract" required maxlength="10000" placeholder="Enter a brief abstract or description of your research..."></textarea></div>'+
      '<div class="ol-research-field full"><label>Upload Document <span>*</span></label><label class="ol-research-upload" for="ol-research-file"><i class="fas fa-cloud-arrow-up"></i><strong>Click to upload your research paper</strong><small>PDF or DOCX only • Maximum 10 MB</small><input id="ol-research-file" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" style="display:none"><div id="ol-research-file-name" class="ol-research-file"></div></label></div>'+
      '<div class="ol-research-foot"><button type="button" class="ol-research-secondary" id="ol-research-cancel">Cancel</button><button type="submit" class="ol-research-btn" id="ol-research-submit"><i class="fas fa-paper-plane"></i> Submit Paper</button></div></form></div>';
    hub.appendChild(m);
    document.getElementById('ol-research-close').addEventListener('click',closeResearchModal);document.getElementById('ol-research-cancel').addEventListener('click',closeResearchModal);
    document.getElementById('ol-research-file').addEventListener('change',function(){researchState.file=this.files&&this.files[0]||null;var n=document.getElementById('ol-research-file-name');if(n)n.textContent=researchState.file?researchState.file.name:'';});
    document.getElementById('ol-research-form').addEventListener('submit',submitResearch);
    m.addEventListener('click',function(e){if(e.target===m)closeResearchModal();});
  }
}
function researchStatusLabel(s){var x=String(s||'submitted').toLowerCase();return ({submitted:'Submitted',under_review:'Under Review',revision_required:'Revision Required',approved:'Approved',rejected:'Rejected'})[x]||x.replace(/_/g,' ')}
function researchStatusPill(s){var x=String(s||'submitted').toLowerCase(),c=x==='approved'?'ol-rs-approved':x==='revision_required'?'ol-rs-revision':x==='under_review'?'ol-rs-under':x==='rejected'?'ol-rs-rejected':'ol-rs-submitted';return '<span class="ol-research-status '+c+'">'+esc(researchStatusLabel(x))+'</span>'}
async function loadResearch(force){
  researchEnsureUI();var sb=client(),id=uid();if(!sb||!id)return;
  if(researchState.loaded&&!force){if(state.tab==='research')renderResearch();return;}
  try{
    var r=await sb.from('research_submissions').select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_by,reviewed_at,submitted_at,created_at,updated_at').eq('student_id',id).order('created_at',{ascending:false});
    if(r.error)throw r.error;researchState.submissions=r.data||[];researchState.loaded=true;
    if(state.tab==='research')renderResearch();
  }catch(e){console.error('Research load failed:',e);researchState.submissions=[];researchState.loaded=true;if(state.tab==='research')setContent('<div class="ol-empty"><i class="fas fa-triangle-exclamation"></i><strong>Research submissions could not load</strong><br>'+esc(e.message||e)+'</div>');}
}
function renderResearch(){
  researchEnsureUI();var arr=researchState.submissions||[];
  var counts={total:arr.length,under:arr.filter(x=>x.status==='under_review').length,revision:arr.filter(x=>x.status==='revision_required').length,approved:arr.filter(x=>x.status==='approved').length};
  var rows=arr.length?arr.map(function(s){return '<div class="ol-research-row"><div><strong>'+esc(s.title||'Untitled Research')+'</strong><small>'+esc(s.supervisor_name||'Supervisor not specified')+'</small></div><div>'+esc(s.submission_type==='final_paper'?'Final Research Paper':s.submission_type==='proposal'?'Research Proposal':'Correction / Revised Paper')+'</div><div>v'+esc(s.version_number||1)+'</div><div>'+esc(fmtDate(s.submitted_at||s.created_at))+'</div><div>'+researchStatusPill(s.status)+'</div><div><button type="button" class="ol-btn ol-btn-secondary" data-ol-research-view="'+esc(s.id)+'"><i class="fas fa-eye"></i> View</button></div></div>'}).join(''):'<div class="ol-empty"><i class="fas fa-flask"></i><strong>No research submissions yet</strong><br>Click <b>Submit Research Paper</b> to submit your proposal or paper.</div>';
  setContent('<div class="ol-research-wrap"><div class="ol-research-head"><div><h3><i class="fas fa-flask"></i> Research Papers</h3><p>Submit and track your research proposals and papers without leaving Online Learning.</p></div><button type="button" class="ol-research-btn" id="ol-open-research-submit"><i class="fas fa-plus"></i> Submit Research Paper</button></div><div class="ol-research-stats"><div class="ol-research-stat"><strong>'+counts.total+'</strong><span>Total Submissions</span></div><div class="ol-research-stat"><strong>'+counts.under+'</strong><span>Under Review</span></div><div class="ol-research-stat"><strong>'+counts.revision+'</strong><span>Revision Required</span></div><div class="ol-research-stat"><strong>'+counts.approved+'</strong><span>Approved</span></div></div><div class="ol-research-table"><div class="ol-research-row head"><div>Research Title</div><div>Type</div><div>Version</div><div>Submitted</div><div>Status</div><div>Action</div></div>'+rows+'</div></div>');
  var open=document.getElementById('ol-open-research-submit');if(open)open.addEventListener('click',openResearchModal);
  document.querySelectorAll('#hub-online-learning [data-ol-research-view]').forEach(function(b){b.addEventListener('click',function(){viewResearch(this.dataset.olResearchView)})});
}
function openResearchModal(){researchEnsureUI();var m=document.getElementById('ol-research-modal');if(!m)return;m.classList.add('open');m.setAttribute('aria-hidden','false');setTimeout(function(){document.getElementById('ol-research-title')?.focus()},50)}
function closeResearchModal(){var m=document.getElementById('ol-research-modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}researchState.file=null;var f=document.getElementById('ol-research-form');if(f)f.reset();var n=document.getElementById('ol-research-file-name');if(n)n.textContent='';var v=document.getElementById('ol-research-version');if(v)v.value='1'}
async function submitResearch(e){e.preventDefault();var sb=client(),id=uid();if(!sb||!id){setError('Your secure student session is not ready. Please refresh the portal.');return}
  var title=document.getElementById('ol-research-title')?.value.trim(),type=document.getElementById('ol-research-type')?.value,supervisor=document.getElementById('ol-research-supervisor')?.value.trim(),abstractText=document.getElementById('ol-research-abstract')?.value.trim(),version=Math.max(1,parseInt(document.getElementById('ol-research-version')?.value||'1',10));var file=researchState.file;var btn=document.getElementById('ol-research-submit');
  if(!title||!type||!supervisor||!abstractText||!file){alert('Please complete all required fields and select your research document.');return}
  if(!['proposal','final_paper','correction'].includes(type)){alert('Invalid research type selected.');return}
  if(file.size>10*1024*1024){alert('The selected document is larger than 10 MB.');return}
  var allowed=file.type==='application/pdf'||file.type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||/\.(pdf|docx)$/i.test(file.name);if(!allowed){alert('Only PDF and DOCX files are allowed.');return}
  btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Submitting...';
  try{
    var safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=id+'/'+Date.now()+'_'+safe;var up=await sb.storage.from('research-papers').upload(path,file,{upsert:false,contentType:file.type||undefined});if(up.error)throw up.error;
    var payload={student_id:id,version_number:version,title:title,submission_type:type,supervisor_name:supervisor,abstract:abstractText,status:'submitted',document_name:file.name,document_path:path,submitted_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    var ins=await sb.from('research_submissions').insert(payload).select().single();if(ins.error)throw ins.error;
    researchState.submissions.unshift(ins.data);researchState.loaded=true;closeResearchModal();state.tab='research';document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x.dataset.olTab==='research')});renderResearch();alert('Your research paper has been submitted successfully.');
  }catch(e){console.error('Research submission failed:',e);alert('Research submission failed: '+(e.message||e));}
  finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Paper'}
}
async function viewResearch(id){var s=researchState.submissions.find(function(x){return String(x.id)===String(id)});if(!s)return;researchState.current=s;researchEnsureUI();var existing=document.getElementById('ol-research-view-modal');if(existing)existing.remove();var m=document.createElement('div');m.className='ol-research-modal open';m.id='ol-research-view-modal';m.setAttribute('aria-hidden','false');m.innerHTML='<div class="ol-research-dialog"><div class="ol-research-dialog-head"><h3><i class="fas fa-file-lines"></i> Research Submission Details</h3><button type="button" class="ol-close" id="ol-research-view-close"><i class="fas fa-times"></i></button></div><div class="ol-research-detail"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h3 style="margin:0;color:#18304d;font-size:14px">'+esc(s.title||'Untitled Research')+'</h3><div style="margin-top:6px">'+researchStatusPill(s.status)+' <span class="ol-pill">Version '+esc(s.version_number||1)+'</span></div></div></div><div class="ol-research-detail-grid" style="margin-top:12px"><div class="ol-research-detail-box"><strong>Research Type</strong><span>'+esc(s.submission_type==='final_paper'?'Final Research Paper':s.submission_type==='proposal'?'Research Proposal':'Correction / Revised Paper')+'</span></div><div class="ol-research-detail-box"><strong>Supervisor</strong><span>'+esc(s.supervisor_name||'—')+'</span></div><div class="ol-research-detail-box"><strong>Submitted</strong><span>'+esc(fmtDateTime(s.submitted_at||s.created_at))+'</span></div><div class="ol-research-detail-box"><strong>Document</strong><span>'+esc(s.document_name||'—')+'</span></div><div class="ol-research-detail-box" style="grid-column:1/-1"><strong>Abstract / Description</strong><p>'+esc(s.abstract||'—')+'</p></div><div class="ol-research-detail-box" style="grid-column:1/-1"><strong>Supervisor Feedback</strong><p>'+esc(s.feedback||'No feedback has been added yet.')+'</p></div></div><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:12px"><button type="button" class="ol-research-btn" id="ol-research-doc-view"><i class="fas fa-eye"></i> View Document</button><button type="button" class="ol-research-secondary" id="ol-research-doc-download"><i class="fas fa-download"></i> Download</button></div></div></div>';document.getElementById('hub-online-learning').appendChild(m);document.getElementById('ol-research-view-close').addEventListener('click',function(){m.remove()});m.addEventListener('click',function(e){if(e.target===m)m.remove()});
  async function signed(){if(!s.document_path)throw new Error('No document is attached to this submission.');var r=await client().storage.from('research-papers').createSignedUrl(s.document_path,300);if(r.error)throw r.error;return r.data.signedUrl}
  document.getElementById('ol-research-doc-view').addEventListener('click',async function(){try{var u=await signed();window.open(u,'_blank','noopener')}catch(e){alert('Document could not be opened: '+(e.message||e))}});document.getElementById('ol-research-doc-download').addEventListener('click',async function(){try{var u=await signed();var a=document.createElement('a');a.href=u;a.download=s.document_name||'research-paper';a.target='_blank';a.click()}catch(e){alert('Document could not be downloaded: '+(e.message||e))}});
}
function render(){
  if(state.tab==='assignments'||state.tab==='case-studies')renderAssignments();
  else if(state.tab==='submissions')renderSubmissions();
  else if(state.tab==='results')renderResults();
  else if(state.tab==='research')renderResearch();
  updateStats();
}
function updateStats(){
  var as=state.assignments, sub=state.submissions;
  var avg=state.results.filter(function(r){return r.result_released&&r.max_marks}).map(function(r){return Number(r.marks_obtained)/Number(r.max_marks)*100});
  var due=as.filter(function(a){var n=daysTo(a.due_at);return !getSubmission(a.id)&&n!==null&&n>=0&&n<=7}).length;
  var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v};
  set('ol-stat-assigned',as.length);set('ol-stat-due',due);set('ol-stat-submitted',sub.length);set('ol-stat-average',avg.length?(Math.round(avg.reduce(function(x,y){return x+y},0)/avg.length)+'%'):'—');
}
async function loadData(){
  var sb=client(), id=uid();
  setError('');
  if(!sb||!id){
    setError('Your secure session is not ready yet. Please wait for the portal to finish loading, then refresh this module.');
    return;
  }
  loading();
  try{
    /*
     * IMPORTANT:
     * The lecturer dashboard writes to online_assignments and
     * online_assignment_questions. The secure RPC is now the single
     * source of truth for student targeting and reads those same tables.
     *
     * Do NOT apply the old student_unit_registrations filter here.
     * Lecturer targeting is Program + Intake + Block, and an assignment
     * must not disappear merely because its unit_code is not present in
     * the student's unit-registration list.
     */
    var rr=await sb.rpc('get_student_online_learning');
    if(rr.error)throw rr.error;

    var feed=rr.data||{};

    state.assignments=Array.isArray(feed.assignments)?feed.assignments:[];
    state.submissions=Array.isArray(feed.submissions)?feed.submissions:[];
    state.results=state.submissions.filter(function(s){return !!s.result_released;});

    console.log('NCHSM Online Learning loaded from secure RPC:',{
      student:feed.student||null,
      assignments:state.assignments.length,
      submissions:state.submissions.length
    });

    render();
  }catch(e){
    console.error('Online Learning load failed:',e);
    setError('Online Learning could not load. Details: '+(e.message||e));
    setContent('<div class="ol-empty"><i class="fas fa-database"></i><strong>Learning data is not available yet</strong><br>Once the Online Learning database is configured, your assignments will appear here.</div>');
    updateStats();
  }
}

async function openModal(a){
  state.current=a;state.file=null;
  var m=document.getElementById('ol-assignment-modal'),b=document.getElementById('ol-modal-body'),title=document.getElementById('ol-modal-title'),btn=document.getElementById('ol-submit-btn');
  var existing=getSubmission(a.id);
  title.textContent=a.title||'Assignment';
  var qs=[];
  var html='<div class="ol-notice"><i class="fas fa-circle-info"></i> '+(existing?'You have already submitted this activity. Review your submission below.':'Complete the required work and submit before the due date.')+'</div>';
  try{
    var qr=await client().rpc('get_online_assignment_questions',{p_assignment_id:a.id});
    if(qr.error)throw qr.error;
    qs=qr.data||[];
    state.currentQuestions=qs;
  }catch(qe){
    state.currentQuestions=[];
    console.error('Question load failed:',qe);
    html+='<div class="ol-error" style="display:block;margin-bottom:12px">Questions could not be loaded. Please refresh and try again.</div>';
  }
  html+='<div style="font-size:10px;color:#64748b;margin-bottom:12px"><strong>Unit:</strong> '+esc(a.unit_code||'—')+' &nbsp; <strong>Due:</strong> '+esc(fmtDateTime(a.due_at))+' &nbsp; <strong>Total:</strong> '+esc(a.max_marks||'—')+' marks</div>';
  if(a.instructions)html+='<div style="padding:11px;border-radius:9px;background:#f7fafc;border:1px solid #e4edf5;font-size:11px;line-height:1.55;margin-bottom:12px"><strong>Instructions</strong><br>'+esc(a.instructions).replace(/\n/g,'<br>')+'</div>';
  if(qs.length){
    qs.forEach(function(q,i){
      var ans=existing&&existing.answers?existing.answers.find(function(x){return String(x.question_id)===String(q.id)}):null;
      html+='<div class="ol-question"><div class="ol-question-title">'+(i+1)+'. '+esc(q.question_text||q.text||'Question')+' <span style="color:#8aa0b5;font-weight:600">('+esc(q.marks||0)+' marks)</span></div>';
      if(q.question_type==='mcq'){
        (q.options||[]).forEach(function(o,j){var val=typeof o==='object'?o.value:o;html+='<label class="ol-option"><input type="radio" name="olq_'+esc(q.id)+'" value="'+esc(val)+'" '+(ans&&ans.answer_text===String(val)?'checked':'')+' '+(existing&&!canSubmit?'disabled':'')+'> '+esc(val)+'</label>'});
      }else if(q.question_type==='true_false'){
        ['True','False'].forEach(function(o){html+='<label class="ol-option"><input type="radio" name="olq_'+esc(q.id)+'" value="'+o+'" '+(ans&&ans.answer_text===o?'checked':'')+' '+(existing&&!canSubmit?'disabled':'')+'> '+o+'</label>'});
      }else{
        html+='<textarea class="ol-answer-input" data-ol-question="'+esc(q.id)+'" placeholder="Enter your answer..." '+(existing&&!canSubmit?'disabled':'')+'>'+esc(ans?ans.answer_text:'')+'</textarea>';
      }
      html+='</div>';
    });
  }
  if(a.allow_document_upload!==false){
    html+='<div class="ol-upload"><i class="fas fa-file-arrow-up"></i><strong>Upload your completed work</strong><small>Accepted: Word (.doc, .docx) or PDF (.pdf). Maximum 10 MB.</small><input id="ol-file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" '+(existing&&!canSubmit?'disabled':'')+'><div class="ol-file-name" id="ol-file-name"></div></div>';
  }
  b.innerHTML=html;
  btn.style.display=canSubmit?'inline-flex':'none';
  m.classList.add('open');m.setAttribute('aria-hidden','false');
  var fi=document.getElementById('ol-file');if(fi)fi.onchange=function(){state.file=this.files&&this.files[0]||null;var n=document.getElementById('ol-file-name');if(n)n.textContent=state.file?state.file.name:''};
}
async function submitCurrent(){
  var a=state.current,sb=client(),id=uid(),btn=document.getElementById('ol-submit-btn');
  if(!a||!sb||!id)return;
  if(a.due_at&&new Date(a.due_at).getTime()<Date.now()){setError('This assignment is past its due date and can no longer be submitted.');close('assignment');return}
  if(state.file && state.file.size>10*1024*1024){setError('The selected document is larger than 10 MB.');return}
  btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Submitting...';
  try{
    var payload={assignment_id:a.id,student_id:id,status:'submitted',submitted_at:new Date().toISOString(),result_released:false};
    if(state.file){
      var safe=state.file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=id+'/'+a.id+'/'+Date.now()+'_'+safe;
      var up=await sb.storage.from('assignment-submissions').upload(path,state.file,{upsert:false,contentType:state.file.type||undefined});
      if(up.error)throw up.error;
      payload.file_path=path;payload.file_name=state.file.name;payload.file_type=state.file.type;payload.file_size=state.file.size;
    }
    var answers=[];
    (state.currentQuestions||[]).forEach(function(q){
      var value='';
      if(q.question_type==='mcq'||q.question_type==='true_false'){
        var r=document.querySelector('input[name="olq_'+CSS.escape(String(q.id))+'"]:checked');value=r?r.value:'';
      }else{
        var t=document.querySelector('[data-ol-question="'+CSS.escape(String(q.id))+'"]');value=t?t.value:'';
      }
      answers.push({question_id:q.id,answer_text:value});
    });
    payload.answers=answers;
    var ins=await sb.from('online_submissions').insert(payload).select().single();
    if(ins.error)throw ins.error;
    state.submissions.unshift(ins.data);
    close('assignment');render();
    alert('Your work has been submitted successfully. The result will appear after the lecturer grades and releases it.');
  }catch(e){
    console.error('Submission failed:',e);
    setError('Submission failed: '+(e.message||e));
  }finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Work'}
}
async function viewResult(id){
  var s=state.submissions.find(function(x){return String(x.id)===String(id)})||state.results.find(function(x){return String(x.id)===String(id)});
  if(!s)return;
  var a=state.assignments.find(function(x){return String(x.id)===String(s.assignment_id)})||{};
  var body=document.getElementById('ol-result-body'),pct=s.max_marks?Math.round(Number(s.marks_obtained)/Number(s.max_marks)*100):0;
  body.innerHTML='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:13px"><div style="padding:12px;border:1px solid #e1eaf2;border-radius:9px;text-align:center"><strong style="font-size:20px;color:#087bf0">'+esc(s.marks_obtained??'—')+'</strong><small style="display:block;color:#71859c">Marks</small></div><div style="padding:12px;border:1px solid #e1eaf2;border-radius:9px;text-align:center"><strong style="font-size:20px;color:#087a4d">'+(s.max_marks?pct+'%':'—')+'</strong><small style="display:block;color:#71859c">Percentage</small></div><div style="padding:12px;border:1px solid #e1eaf2;border-radius:9px;text-align:center"><strong style="font-size:13px;color:#18304d">'+esc(fmtDate(s.released_at))+'</strong><small style="display:block;color:#71859c">Released</small></div></div>'+
  '<div class="ol-notice"><strong>'+esc(a.title||'Assignment')+'</strong><br>'+esc(a.unit_code||'')+'</div>'+
  '<div style="padding:12px;border:1px solid #e1eaf2;border-radius:10px"><strong style="font-size:11px;color:#18304d">Lecturer Feedback</strong><p style="font-size:11px;line-height:1.55;color:#607994;white-space:pre-wrap">'+esc(s.feedback||'No feedback was added.')+'</p></div>';
  var m=document.getElementById('ol-result-modal');m.classList.add('open');m.setAttribute('aria-hidden','false');
}
function close(which){var m=document.getElementById(which==='result'?'ol-result-modal':'ol-assignment-modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
function bind(){
  researchEnsureUI();
  if(state.bound)return;state.bound=true;
  document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(b){b.addEventListener('click',function(){state.tab=this.dataset.olTab;document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});render()})});
  document.getElementById('ol-search')?.addEventListener('input',render);
  document.getElementById('ol-status-filter')?.addEventListener('change',render);
  document.getElementById('ol-refresh')?.addEventListener('click',loadData);
  document.getElementById('ol-submit-btn')?.addEventListener('click',submitCurrent);
  document.querySelectorAll('#hub-online-learning [data-ol-close]').forEach(function(b){b.addEventListener('click',function(){close(this.dataset.olClose)})});
  document.getElementById('hub-online-learning').addEventListener('click',function(e){
    var o=e.target.closest('[data-ol-open]');if(o){var a=state.assignments.find(function(x){return String(x.id)===String(o.dataset.olOpen)});if(a)openModal(a);return}
    var r=e.target.closest('[data-ol-result]');if(r){viewResult(r.dataset.olResult);return}
    var rr=e.target.closest('[data-ol-research-view]');if(rr){viewResearch(rr.dataset.olResearchView);return}
  });
  document.querySelectorAll('#hub-online-learning .ol-modal').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)close(m.id==='ol-result-modal'?'result':'assignment')})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){close('assignment');close('result')}});
}
function boot(){researchEnsureUI();bind();loadData()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('appReady',function(){setTimeout(function(){researchEnsureUI();bind();loadData()},300)});
})();
