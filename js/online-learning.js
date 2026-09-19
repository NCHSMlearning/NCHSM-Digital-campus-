// NCHSM Student Portal — Online Learning module with integrated Research Papers tab
// Research Papers is an INTERNAL tab under Online Learning. Existing Resources remain untouched.

(function(){
'use strict';

var state={tab:'assignments',assignments:[],submissions:[],results:[],research:[],current:null,currentQuestions:[],file:null,bound:false,researchCurrent:null,researchFile:null};

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
function render(){
  if(state.tab==='assignments'||state.tab==='case-studies')renderAssignments();
  else if(state.tab==='submissions')renderSubmissions();
  else if(state.tab==='research')renderResearch();
  else renderResults();
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
  var canSubmit=!existing && (!a.due_at || new Date(a.due_at).getTime()>=Date.now());
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
    html+='<div class="ol-upload"><i class="fas fa-file-arrow-up"></i><strong>Upload your completed work</strong><small>Accepted: Microsoft Word (.docx) only. Maximum 10 MB.</small><input id="ol-file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" '+(existing&&!canSubmit?'disabled':'')+'><div class="ol-file-name" id="ol-file-name"></div></div>';
  }
  b.innerHTML=html;
  btn.style.display=canSubmit?'inline-flex':'none';
  m.classList.add('open');m.setAttribute('aria-hidden','false');
  var fi=document.getElementById('ol-file');if(fi)fi.onchange=function(){state.file=this.files&&this.files[0]||null;var n=document.getElementById('ol-file-name');if(n)n.textContent=state.file?state.file.name:''};
}

/* ============================================================
   RESEARCH PAPERS — STUDENT SIDE
   ============================================================ */
function researchStatus(s){
  var x=String(s||'submitted').toLowerCase();
  var label={submitted:'Submitted',under_review:'Under Review',revision_required:'Revision Required',approved:'Approved',rejected:'Rejected'}[x]||x.replace(/_/g,' ');
  var cls=x==='approved'?'success':(x==='revision_required'||x==='rejected'?'danger':(x==='under_review'?'review':''));
  return '<span class="ol-pill '+cls+'">'+esc(label)+'</span>';
}
async function loadResearch(){
  var sb=client(),id=uid(); if(!sb||!id)return;
  var r=await sb.from('research_submissions')
    .select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_at,submitted_at,created_at,updated_at')
    .eq('student_id',id).order('created_at',{ascending:false});
  if(r.error){console.error('Research load failed:',r.error);return;}
  state.research=r.data||[];
  if(state.tab==='research')renderResearch();
}
function renderResearch(){
  var rows=state.research||[];
  var html='<div class="ol-card" style="padding:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><h3 style="margin:0">Research Papers</h3><p style="font-size:11px;color:#64748b;margin:5px 0">Track proposals, final papers, revisions and lecturer corrections.</p></div><button class="ol-btn ol-btn-secondary" type="button" id="ol-research-refresh"><i class="fas fa-sync"></i> Refresh</button></div>';
  if(!rows.length){html+='<div class="ol-empty" style="margin-top:12px"><i class="fas fa-file-signature"></i><strong>No research submissions yet</strong></div></div>';setContent(html);return;}
  html+='<div style="overflow:auto;margin-top:12px"><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="text-align:left;padding:8px">Title</th><th>Type</th><th>Version</th><th>Status</th><th>Action</th></tr></thead><tbody>';
  rows.forEach(function(r){
    html+='<tr style="border-top:1px solid #e5e7eb"><td style="padding:9px"><b>'+esc(r.title||'Untitled Research')+'</b><div style="font-size:10px;color:#64748b">'+esc(r.document_name||'No document')+'</div></td><td>'+esc(r.submission_type||'—')+'</td><td>v'+esc(r.version_number||1)+'</td><td>'+researchStatus(r.status)+'</td><td><button class="ol-btn ol-btn-secondary" data-ol-research-view="'+esc(r.id)+'" type="button">View</button></td></tr>';
  });
  html+='</tbody></table></div></div>';
  setContent(html);
  document.getElementById('ol-research-refresh')?.addEventListener('click',loadResearch);
  document.querySelectorAll('[data-ol-research-view]').forEach(function(b){b.addEventListener('click',function(){viewResearch(this.dataset.olResearchView)})});
}
async function viewResearch(id){
  var r=state.research.find(function(x){return String(x.id)===String(id)}); if(!r)return;
  state.researchCurrent=r;
  var body=document.getElementById('ol-research-body'),title=document.getElementById('ol-research-title');
  if(!body)return;
  title.textContent=r.title||'Research Paper';
  body.innerHTML='<div class="ol-loading"><i class="fas fa-spinner fa-spin"></i>Opening document…</div>';
  document.getElementById('ol-research-modal').classList.add('open');
  var html='<div class="ol-notice">'+researchStatus(r.status)+'<br><b>Version:</b> '+esc(r.version_number||1)+' · <b>Type:</b> '+esc(r.submission_type||'—')+'</div>';
  if(r.feedback)html+='<div style="padding:11px;border:1px solid #e2e8f0;border-radius:9px;margin-bottom:10px"><b>Lecturer Feedback</b><div style="white-space:pre-wrap;color:#526b86;margin-top:6px">'+esc(r.feedback)+'</div></div>';
  if(r.abstract)html+='<div style="padding:11px;border:1px solid #e2e8f0;border-radius:9px;margin-bottom:10px"><b>Abstract / Notes</b><div style="white-space:pre-wrap;color:#526b86;margin-top:6px">'+esc(r.abstract)+'</div></div>';
  if(r.document_path){
    var u=await sbSignedResearchUrl(r.document_path);
    if(researchCanCorrect(r)){
      html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="ol-btn ol-btn-primary" type="button" id="ol-start-research-correction"><i class="fas fa-pen-to-square"></i> View & Correct DOCX</button></div>';
    }
    html+='<div><b>Document</b><iframe src="'+esc(u)+'" style="width:100%;height:520px;border:1px solid #dbe6ef;border-radius:9px;margin-top:7px"></iframe><div style="margin-top:7px"><a href="'+esc(u)+'" target="_blank" rel="noopener" class="ol-btn ol-btn-secondary" style="display:inline-block;text-decoration:none">Open / Download</a></div></div>';
  }else html+='<div class="ol-empty">No document attached.</div>';
  body.innerHTML=html;
}

/* ============================================================
   RESEARCH CORRECTION WORKFLOW — DOCX ONLY
   ============================================================ */
function researchCanCorrect(r){
  return String(r.status||'').toLowerCase()==='revision_required';
}
function ensureResearchCorrectionModal(){
  if(document.getElementById('ol-research-correction-modal'))return;
  var m=document.createElement('div');
  m.id='ol-research-correction-modal';m.className='ol-modal';m.setAttribute('aria-hidden','true');
  m.innerHTML='<div class="ol-modal-dialog" style="width:98vw;max-width:1400px;height:94vh">'+
    '<div class="ol-modal-head"><div><h3 id="ol-research-correction-title" style="margin:0">Correct Research Paper</h3>'+
    '<small id="ol-research-correction-state" style="color:#64748b">Loading…</small></div>'+
    '<button class="ol-close" type="button" id="ol-research-correction-close"><i class="fas fa-times"></i></button></div>'+
    '<div style="display:flex;gap:7px;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid #e5edf4">'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="bold"><b>B</b></button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="italic"><i>I</i></button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="underline"><u>U</u></button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="insertUnorderedList">• List</button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="insertOrderedList">1. List</button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="justifyLeft">Left</button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="justifyCenter">Center</button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="justifyRight">Right</button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="undo">Undo</button>'+
    '<button type="button" class="ol-btn ol-btn-secondary" data-rce-cmd="redo">Redo</button>'+
    '</div>'+
    '<div id="ol-research-correction-editor" contenteditable="true" spellcheck="true" style="height:calc(94vh - 180px);overflow:auto;padding:35px;max-width:900px;margin:0 auto;background:#fff;line-height:1.6;font-size:14px;outline:none"></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid #e5edf4;background:#f8fafc">'+
    '<span id="ol-rce-file-label" style="font-size:11px;color:#64748b">DOCX only</span>'+
    '<div style="display:flex;gap:7px"><button type="button" class="ol-btn ol-btn-secondary" id="ol-rce-save"><i class="fas fa-floppy-disk"></i> Save Draft</button>'+
    '<button type="button" class="ol-btn ol-btn-primary" id="ol-rce-submit"><i class="fas fa-paper-plane"></i> Submit Correction for Review</button></div></div>'+
    '</div>';
  document.body.appendChild(m);
  document.getElementById('ol-research-correction-close').onclick=function(){m.classList.remove('open');m.setAttribute('aria-hidden','true')};
  m.querySelectorAll('[data-rce-cmd]').forEach(function(b){
    b.onclick=function(){var e=document.getElementById('ol-research-correction-editor');e.focus();document.execCommand(this.dataset.rceCmd,false,null);markResearchCorrectionDirty()};
  });
  document.getElementById('ol-rce-save').onclick=function(){saveResearchCorrection(false)};
  document.getElementById('ol-rce-submit').onclick=function(){saveResearchCorrection(true)};
}
function researchDraftKey(r){
  return 'nchsm_research_correction_draft_'+String(r.id);
}
async function openResearchCorrection(id){
  var r=state.research.find(function(x){return String(x.id)===String(id)});if(!r)return;
  if(!researchCanCorrect(r)){alert('This research paper is not currently marked Revision Required.');return}
  if(!/\.docx$/i.test(String(r.document_name||''))){
    alert('Only Microsoft Word (.docx) research documents can be corrected online.');
    return;
  }
  ensureResearchCorrectionModal();
  state.researchCurrent=r;
  var m=document.getElementById('ol-research-correction-modal');
  var ed=document.getElementById('ol-research-correction-editor');
  document.getElementById('ol-research-correction-title').textContent=(r.title||'Research Paper')+' — Correction';
  document.getElementById('ol-rce-file-label').textContent='DOCX only · Current version V'+(r.version_number||1);
  document.getElementById('ol-research-correction-state').textContent='Opening document…';
  m.classList.add('open');m.setAttribute('aria-hidden','false');
  try{
    var draft=localStorage.getItem(researchDraftKey(r));
    if(draft){ed.innerHTML=draft;document.getElementById('ol-research-correction-state').textContent='Saved draft restored';return}
    var url=await sbSignedResearchUrl(r.document_path);
    if(window.mammoth){
      var resp=await fetch(url);var ab=await resp.arrayBuffer();
      var out=await window.mammoth.convertToHtml({arrayBuffer:ab});
      ed.innerHTML=out.value||'<p></p>';
    }else{
      ed.innerHTML='<p>Mammoth.js is required to edit DOCX documents. Please load Mammoth before opening the editor.</p>';
    }
    document.getElementById('ol-research-correction-state').textContent='Editing V'+(r.version_number||1)+' · DOCX';
  }catch(e){
    console.error('Research correction open failed:',e);
    ed.innerHTML='<p style="color:#b42318">Could not open this DOCX document. '+esc(e.message||e)+'</p>';
    document.getElementById('ol-research-correction-state').textContent='Unable to open document';
  }
  ed.oninput=markResearchCorrectionDirty;
}
function markResearchCorrectionDirty(){
  var r=state.researchCurrent,ed=document.getElementById('ol-research-correction-editor');if(!r||!ed)return;
  localStorage.setItem(researchDraftKey(r),ed.innerHTML);
  var st=document.getElementById('ol-research-correction-state');if(st)st.textContent='Draft saved locally · unsent changes';
}
async function saveResearchCorrection(submit){
  var r=state.researchCurrent,sb=client(),id=uid(),ed=document.getElementById('ol-research-correction-editor');
  if(!r||!sb||!id||!ed)return;
  var html=ed.innerHTML.trim();
  if(!html||html==='<br>'){alert('Please make the required corrections before submitting.');return}
  var btn=document.getElementById(submit?'ol-rce-submit':'ol-rce-save');
  if(btn)btn.disabled=true;
  try{
    localStorage.setItem(researchDraftKey(r),html);
    if(!submit){
      var st=document.getElementById('ol-research-correction-state');if(st)st.textContent='Draft saved locally';
      alert('Correction draft saved on this device. You can continue editing later.');
      return;
    }
    /*
      A new immutable version is inserted. The original row/document is never
      overwritten. This requires the research_submissions table to permit a
      correction row linked through research_group_id and version_number.
    */
    var next=state.research.filter(function(x){
      return String(x.research_group_id||'')===String(r.research_group_id||r.id);
    }).reduce(function(mx,x){return Math.max(mx,Number(x.version_number)||1)},Number(r.version_number)||1)+1;
    var fileName=(String(r.title||'research').replace(/[^a-zA-Z0-9_-]+/g,'_')+'_V'+next+'.html');
    var path=id+'/'+(r.research_group_id||r.id)+'/'+Date.now()+'_'+fileName;
    var blob=new Blob(['<!doctype html><html><head><meta charset="utf-8"><title>'+esc(r.title||'Research Paper')+'</title></head><body>'+html+'</body></html>'],{type:'text/html'});
    var up=await sb.storage.from('research-papers').upload(path,blob,{upsert:false,contentType:'text/html'});
    if(up.error)throw up.error;
    var payload={
      student_id:id,
      research_group_id:r.research_group_id||r.id,
      version_number:next,
      title:r.title,
      submission_type:'correction',
      supervisor_name:r.supervisor_name||null,
      abstract:r.abstract||null,
      status:'submitted',
      document_name:fileName,
      document_path:path,
      submitted_at:new Date().toISOString(),
      created_at:new Date().toISOString()
    };
    var ins=await sb.from('research_submissions').insert(payload).select().single();
    if(ins.error){
      await sb.storage.from('research-papers').remove([path]);
      throw ins.error;
    }
    localStorage.removeItem(researchDraftKey(r));
    state.research.unshift(ins.data);
    state.researchCurrent=ins.data;
    document.getElementById('ol-research-correction-modal').classList.remove('open');
    document.getElementById('ol-research-correction-modal').setAttribute('aria-hidden','true');
    renderResearch();
    alert('Correction submitted successfully as V'+next+' and sent back for lecturer review.');
  }catch(e){
    console.error('Research correction submission failed:',e);
    alert('Correction could not be submitted: '+(e.message||e));
  }finally{if(btn)btn.disabled=false}
}
async function sbSignedResearchUrl(path){
  var sb=client();var r=await sb.storage.from('research-papers').createSignedUrl(path,3600);
  if(r.error)throw r.error;return r.data.signedUrl;
}
function ensureResearchModal(){
  if(document.getElementById('ol-research-modal'))return;
  var m=document.createElement('div');m.id='ol-research-modal';m.className='ol-modal';m.setAttribute('aria-hidden','true');
  m.innerHTML='<div class="ol-modal-dialog" style="max-width:1200px;width:96vw"><div class="ol-modal-head"><h3 id="ol-research-title">Research Paper</h3><button class="ol-close" type="button" id="ol-research-close"><i class="fas fa-times"></i></button></div><div class="ol-modal-body" id="ol-research-body"></div></div>';
  document.body.appendChild(m);
  document.getElementById('ol-research-close').onclick=function(){m.classList.remove('open');m.setAttribute('aria-hidden','true')};
}
function addResearchTab(){
  var tabs=document.querySelectorAll('#hub-online-learning [data-ol-tab]');
  if(!tabs.length)return;
  var parent=tabs[0].parentElement;
  if(parent && !parent.querySelector('[data-ol-tab="research"]')){
    var b=document.createElement('button');b.type='button';b.className='ol-tab';b.dataset.olTab='research';b.innerHTML='<i class="fas fa-file-signature"></i> Research Papers';parent.appendChild(b);
  }
  ensureResearchModal();
}
async function submitCurrent(){
  var a=state.current,sb=client(),id=uid(),btn=document.getElementById('ol-submit-btn');
  if(!a||!sb||!id)return;
  if(a.due_at&&new Date(a.due_at).getTime()<Date.now()){setError('This assignment is past its due date and can no longer be submitted.');close('assignment');return}
  if(state.file && state.file.size>10*1024*1024){setError('The selected document is larger than 10 MB.');return}
  if(state.file){
    var isDocx=/\.docx$/i.test(state.file.name) || state.file.type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if(!isDocx){setError('Only Microsoft Word (.docx) documents are allowed.');return}
  }
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
  if(state.bound)return;state.bound=true;
  document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(b){b.addEventListener('click',function(){state.tab=this.dataset.olTab;document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});if(state.tab==='research')loadResearch();render()})});
  document.getElementById('ol-search')?.addEventListener('input',render);
  document.getElementById('ol-status-filter')?.addEventListener('change',render);
  document.getElementById('ol-refresh')?.addEventListener('click',loadData);
  document.getElementById('ol-submit-btn')?.addEventListener('click',submitCurrent);
  document.querySelectorAll('#hub-online-learning [data-ol-close]').forEach(function(b){b.addEventListener('click',function(){close(this.dataset.olClose)})});
  document.getElementById('hub-online-learning').addEventListener('click',function(e){
    var o=e.target.closest('[data-ol-open]');if(o){var a=state.assignments.find(function(x){return String(x.id)===String(o.dataset.olOpen)});if(a)openModal(a);return}
    var r=e.target.closest('[data-ol-result]');if(r)viewResult(r.dataset.olResult);
  });
  document.querySelectorAll('#hub-online-learning .ol-modal').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)close(m.id==='ol-result-modal'?'result':'assignment')})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){close('assignment');close('result')}});
}

/* ============================================================
   🔬 RESEARCH PAPERS — INTERNAL ONLINE LEARNING TAB
   Student research workflow with inline document correction.
   ============================================================ */

function researchClient(){ return client(); }
function researchUserId(){ return uid(); }

function researchStatusLabel(s){
  var x=String(s||'submitted').toLowerCase();
  return {submitted:'Submitted',under_review:'Under Review',revision_required:'Revision Required',approved:'Approved',rejected:'Rejected'}[x] || String(s||'Submitted').replace(/_/g,' ');
}
function researchStatusClass(s){
  var x=String(s||'submitted').toLowerCase();
  if(x==='approved') return 'success';
  if(x==='revision_required'||x==='rejected') return 'danger';
  if(x==='under_review') return 'review';
  return 'pending';
}
function researchEscape(v){ return esc(v); }
function researchTypeLabel(v){
  var x=String(v||'').toLowerCase();
  if(x==='proposal') return 'Research Proposal';
  if(x==='final_paper') return 'Research Project / Final Paper';
  if(x==='correction') return 'Correction / Revised Paper';
  return v||'Research Paper';
}
function researchIsEditableDocument(r){
  var n=String(r?.document_name||'').toLowerCase();
  var p=String(r?.document_path||'').toLowerCase();
  return /\.(html?|docx?)($|[?#])/.test(n) || /\.(html?|docx?)($|[?#])/.test(p);
}
function researchIsHtml(r){
  var n=String(r?.document_name||'').toLowerCase();
  var p=String(r?.document_path||'').toLowerCase();
  return /\.html?($|[?#])/.test(n) || /\.html?($|[?#])/.test(p);
}
function researchIsDocx(r){
  var n=String(r?.document_name||'').toLowerCase();
  var p=String(r?.document_path||'').toLowerCase();
  return /\.docx?($|[?#])/.test(n) || /\.docx?($|[?#])/.test(p);
}

function ensureResearchStyles(){
  if(document.getElementById('ol-research-styles')) return;
  var st=document.createElement('style'); st.id='ol-research-styles';
  st.textContent=`
    #hub-online-learning .ol-research-wrap{padding:10px}
    #hub-online-learning .ol-research-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px;border:1px solid #dce8f3;border-radius:11px;background:linear-gradient(135deg,#f7fbff,#fff);margin-bottom:10px}
    #hub-online-learning .ol-research-head h3{margin:0;color:#18304d;font-size:14px}
    #hub-online-learning .ol-research-head p{margin:4px 0 0;color:#71859c;font-size:10px}
    #hub-online-learning .ol-research-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}
    #hub-online-learning .ol-research-stat{border:1px solid #e1eaf2;border-radius:10px;padding:11px;background:#fff}
    #hub-online-learning .ol-research-stat strong{display:block;font-size:18px;color:#132a48}
    #hub-online-learning .ol-research-stat span{display:block;margin-top:3px;font-size:9px;font-weight:800;color:#71859c}
    #hub-online-learning .ol-research-toolbar{display:flex;gap:8px;flex-wrap:wrap;padding:10px;border-bottom:1px solid #edf2f7}
    #hub-online-learning .ol-research-toolbar input,#hub-online-learning .ol-research-toolbar select{border:1px solid #dbe6ef;border-radius:8px;background:#f8fbfe;padding:8px 10px;font-size:10px;color:#263e5b;outline:0}
    #hub-online-learning .ol-research-toolbar input{flex:1;min-width:180px}
    #hub-online-learning .ol-research-list{display:grid;gap:8px;padding:10px}
    #hub-online-learning .ol-research-card{border:1px solid #e1eaf2;border-radius:10px;padding:12px;background:#fff}
    #hub-online-learning .ol-research-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    #hub-online-learning .ol-research-card h4{margin:0;color:#18304d;font-size:12px}
    #hub-online-learning .ol-research-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
    #hub-online-learning .ol-research-pill{padding:4px 7px;border-radius:99px;background:#f1f5f9;color:#526b86;font-size:9px;font-weight:800}
    #hub-online-learning .ol-research-pill.success{background:#e9f9f1;color:#087a4d}
    #hub-online-learning .ol-research-pill.danger{background:#ffedf0;color:#b42338}
    #hub-online-learning .ol-research-pill.review{background:#fff6df;color:#9a6200}
    #hub-online-learning .ol-research-pill.pending{background:#edf4ff;color:#0870d6}
    #hub-online-learning .ol-research-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    #hub-online-learning .ol-research-btn{border:0;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:800;cursor:pointer}
    #hub-online-learning .ol-research-primary{background:#087bf0;color:#fff}
    #hub-online-learning .ol-research-secondary{background:#edf4ff;color:#0870d6}
    #hub-online-learning .ol-research-muted{background:#eef2f5;color:#536b84}
    #hub-online-learning .ol-research-success{background:#0b875b;color:#fff}
    #hub-online-learning .ol-research-empty{padding:38px 15px;text-align:center;color:#71859c;font-size:10px}
    #hub-online-learning .ol-research-modal{position:fixed;inset:0;background:rgba(5,20,35,.62);z-index:10001;display:none;align-items:center;justify-content:center;padding:15px}
    #hub-online-learning .ol-research-modal.open{display:flex}
    #hub-online-learning .ol-research-dialog{width:min(1180px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 25px 70px rgba(0,0,0,.25)}
    #hub-online-learning .ol-research-dialog-head{padding:13px 16px;border-bottom:1px solid #e5edf5;display:flex;justify-content:space-between;gap:10px;align-items:center;position:sticky;top:0;background:#fff;z-index:5}
    #hub-online-learning .ol-research-dialog-head h3{margin:0;font-size:14px;color:#132b48}
    #hub-online-learning .ol-research-body{padding:16px}
    #hub-online-learning .ol-research-field{margin-bottom:10px}
    #hub-online-learning .ol-research-field label{display:block;font-size:10px;font-weight:800;color:#526b86;margin-bottom:5px}
    #hub-online-learning .ol-research-field input,#hub-online-learning .ol-research-field select,#hub-online-learning .ol-research-field textarea{width:100%;box-sizing:border-box;border:1px solid #dbe6ef;border-radius:8px;background:#f8fbfe;padding:9px 10px;font-size:10px;color:#263e5b;outline:0}
    #hub-online-learning .ol-research-field textarea{min-height:90px;resize:vertical}
    #hub-online-learning .ol-research-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    #hub-online-learning .ol-research-file{border:2px dashed #bcd2e5;border-radius:10px;padding:17px;text-align:center;background:#f8fbfe}
    #hub-online-learning .ol-research-file i{font-size:25px;color:#087bf0}
    #hub-online-learning .ol-research-file strong{display:block;margin-top:6px;font-size:11px;color:#18304d}
    #hub-online-learning .ol-research-file small{display:block;margin-top:3px;color:#71859c;font-size:9px}
    #hub-online-learning .ol-research-feedback{padding:11px;border-radius:9px;background:#f7fafc;border:1px solid #e1eaf2;font-size:10px;line-height:1.55;color:#526b86;white-space:pre-wrap}
    #hub-online-learning .ol-rs-workspace{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:12px;min-height:600px}
    #hub-online-learning .ol-rs-document{border:1px solid #dbe6ef;border-radius:10px;background:#f4f7fa;overflow:hidden;min-height:560px}
    #hub-online-learning .ol-rs-document-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 11px;background:#fff;border-bottom:1px solid #dbe6ef;position:sticky;top:0;z-index:3}
    #hub-online-learning .ol-rs-document-head strong{font-size:10px;color:#18304d}
    #hub-online-learning .ol-rs-editor-toolbar{display:flex;gap:4px;flex-wrap:wrap;padding:7px;background:#fff;border-bottom:1px solid #dbe6ef}
    #hub-online-learning .ol-rs-tool{border:1px solid #d8e2eb;background:#f8fbfe;border-radius:6px;padding:6px 8px;font-size:10px;cursor:pointer;color:#334e68}
    #hub-online-learning .ol-rs-tool:hover{background:#edf4ff}
    #hub-online-learning .ol-rs-editor{box-sizing:border-box;background:#fff;min-height:520px;max-width:900px;margin:14px auto;padding:42px;outline:0;line-height:1.7;font-size:13px;color:#202b38;box-shadow:0 2px 12px rgba(20,40,60,.08)}
    #ol-research-modal .ol-rs-workspace{height:100%;min-height:0;overflow:hidden}
    #ol-research-modal #ol-rs-doc-content{min-height:0!important;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    #ol-research-modal .ol-rs-document{min-height:0;display:flex;flex-direction:column;overflow:hidden}
    #ol-research-modal .ol-rs-side{min-height:0;overflow:auto;overscroll-behavior:contain}
    #ol-research-modal .ol-rs-editor{white-space:normal;overflow:visible}
    .ol-gdocs-editor{height:100%;min-height:0;display:flex;flex-direction:column;background:#f1f3f4}
    .ol-gdocs-topbar{flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;background:#fff;border-bottom:1px solid #d9e2ea}
    .ol-gdocs-file{display:flex;align-items:center;gap:9px;min-width:0}
    .ol-gdocs-file>i{font-size:18px;color:#4285f4}
    .ol-gdocs-file strong{display:block;font-size:11px;color:#18304d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px}
    .ol-gdocs-file small{display:block;margin-top:2px;color:#71859c;font-size:8px}
    .ol-gdocs-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .ol-gdocs-save-state{font-size:8px;color:#71859c;white-space:nowrap}
    .ol-gdocs-save-state i{font-size:6px}
    .ol-gdocs-toolbar{flex:0 0 auto;display:flex;align-items:center;gap:2px;flex-wrap:wrap;padding:6px 8px;background:#fff;border-bottom:1px solid #d9e2ea;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    .ol-gdocs-group{display:flex;align-items:center;gap:1px;padding-right:5px;margin-right:4px;border-right:1px solid #e4e9ee}
    .ol-gdocs-group:last-child{border-right:0}
    .ol-gdocs-tool{min-width:29px;height:28px;border:0;border-radius:5px;background:#fff;color:#40566f;cursor:pointer;font-size:11px}
    .ol-gdocs-tool:hover{background:#edf3f9}
    .ol-gdocs-tool:active{background:#e2ebf5}
    .ol-gdocs-select{height:28px;border:1px solid #d7e0e8;border-radius:5px;background:#fff;color:#40566f;font-size:9px;padding:0 7px}
    .ol-gdocs-canvas{flex:1 1 auto;min-height:0;overflow:auto;padding:28px 18px 40px;-webkit-overflow-scrolling:touch}
    .ol-gdocs-page{width:min(850px,100%);min-height:1050px;box-sizing:border-box;margin:0 auto;padding:70px 72px;background:#fff;color:#202b38;outline:0;line-height:1.7;font-size:13px;box-shadow:0 1px 5px rgba(20,40,60,.16)}
    .ol-gdocs-page:focus{box-shadow:0 1px 5px rgba(20,40,60,.16),0 0 0 2px rgba(66,133,244,.12)}
    .ol-gdocs-page img{max-width:100%;height:auto}
    .ol-gdocs-page table{max-width:100%;border-collapse:collapse}
    .ol-gdocs-page td,.ol-gdocs-page th{padding:4px 6px}
    .ol-gdocs-page h1,.ol-gdocs-page h2,.ol-gdocs-page h3{color:#18304d}
    .ol-gdocs-footer{flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;background:#fff;border-top:1px solid #d9e2ea}
    .ol-gdocs-footer>div:first-child{font-size:8px;color:#71859c}
    .ol-gdocs-footer-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .ol-gdocs-main{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 300px;overflow:hidden}
    .ol-gdocs-review-panel{min-width:0;min-height:0;background:#fff;border-left:1px solid #d9e2ea;display:flex;flex-direction:column;overflow:hidden}
    .ol-gdocs-review-tabs{display:flex;flex:0 0 auto;border-bottom:1px solid #e1e8ee}
    .ol-gdocs-review-tabs button{flex:1;border:0;background:#fff;padding:10px 6px;font-size:9px;font-weight:800;color:#71859c;cursor:pointer}
    .ol-gdocs-review-tabs button.active{color:#087bf0;border-bottom:2px solid #087bf0}
    .ol-gdocs-review-content{flex:1;min-height:0;overflow:auto;padding:9px;-webkit-overflow-scrolling:touch}
    .ol-rs-comments-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:10px;color:#18304d}
    .ol-rs-comments-head span{background:#edf4ff;color:#087bf0;border-radius:10px;padding:2px 7px;font-size:8px}
    .ol-rs-comment-card{border:1px solid #dbe6ef;border-radius:8px;padding:9px;margin-bottom:7px;background:#fbfdff;font-size:9px;color:#526b86}
    .ol-rs-comment-card strong{display:block;color:#18304d;font-size:9px}
    .ol-rs-comment-card small{display:block;color:#94a3b8;font-size:7px;margin-top:2px}
    .ol-rs-comment-selection{margin:7px 0;padding:6px;border-left:3px solid #f5c542;background:#fffaf0;color:#526b86;font-size:8px}
    .ol-rs-comment-text{color:#263e5b;line-height:1.5}
    .ol-rs-comments-empty{padding:20px 8px;text-align:center;color:#94a3b8;font-size:9px;line-height:1.5}
    .ol-gdocs-comment-action{border:1px solid #dbe6ef;background:#fff;border-radius:5px;padding:4px 7px;font-size:8px;color:#526b86;cursor:pointer;margin-top:7px}
    .ol-gdocs-comment-action:hover{background:#edf4ff;color:#087bf0}
    .ol-gdocs-suggestion-actions{display:flex;gap:5px}
    .ol-rs-comment-mark{background:#fff1a8;border-bottom:2px solid #e3ad00;cursor:pointer}
    .ol-rs-suggestion del{background:#ffe1e1;color:#a61b1b;text-decoration:line-through}
    .ol-rs-suggestion ins{background:#dcfce7;color:#146c3a;text-decoration:none}
    .ol-gdocs-tool.active{background:#dbeafe;color:#087bf0}
    .ol-gdocs-collaborators{font-size:8px;color:#526b86;white-space:nowrap}
    @media(max-width:1050px){
      .ol-gdocs-main{grid-template-columns:minmax(0,1fr) 260px}
    }
    @media(max-width:800px){
      .ol-gdocs-main{grid-template-columns:1fr}
      .ol-gdocs-review-panel{border-left:0;border-top:1px solid #d9e2ea;max-height:30vh}
    }
    #ol-research-modal .ol-rs-fullscreen{
      position:fixed!important;
      inset:0!important;
      width:100vw!important;
      height:100vh!important;
      max-height:none!important;
      margin:0!important;
      border-radius:0!important;
    }
    #ol-research-modal .ol-rs-fullscreen .ol-gdocs-main{min-height:0}


    @media(max-width:900px){
      .ol-gdocs-topbar{align-items:flex-start;flex-direction:column}
      .ol-gdocs-actions{width:100%;justify-content:space-between}
      .ol-gdocs-file strong{max-width:260px}
      .ol-gdocs-canvas{padding:14px 8px 28px}
      .ol-gdocs-page{min-height:850px;padding:35px 25px;font-size:12px}
      .ol-gdocs-mobile-hide{display:none}
      .ol-gdocs-footer{align-items:stretch;flex-direction:column}
      .ol-gdocs-footer-actions{width:100%}
      .ol-gdocs-footer-actions button{flex:1}
    }


    #hub-online-learning .ol-rs-editor[contenteditable="true"]{cursor:text}
    #hub-online-learning .ol-rs-pdf{width:100%;height:560px;border:0;background:#fff}
    #hub-online-learning .ol-rs-side{border:1px solid #dbe6ef;border-radius:10px;background:#fff;padding:12px;height:max-content;position:sticky;top:0}
    #hub-online-learning .ol-rs-side h4{margin:0 0 9px;color:#18304d;font-size:11px}
    #hub-online-learning .ol-rs-side-section{padding:10px 0;border-top:1px solid #edf2f7}
    #hub-online-learning .ol-rs-side-section:first-of-type{border-top:0}
    #hub-online-learning .ol-rs-history{display:grid;gap:6px}
    #hub-online-learning .ol-rs-history-item{padding:8px;border:1px solid #e1eaf2;border-radius:8px;background:#f8fbfe;cursor:pointer}
    #hub-online-learning .ol-rs-history-item.active{border-color:#087bf0;background:#edf4ff}
    #hub-online-learning .ol-rs-history-item strong{display:block;font-size:10px;color:#18304d}
    #hub-online-learning .ol-rs-history-item small{display:block;margin-top:2px;font-size:8px;color:#71859c}
    #hub-online-learning .ol-rs-note{font-size:9px;color:#71859c;line-height:1.55}
    body.dark-mode #hub-online-learning .ol-research-head,body.dark-mode #hub-online-learning .ol-research-stat,body.dark-mode #hub-online-learning .ol-research-card,body.dark-mode #hub-online-learning .ol-research-dialog,body.dark-mode #hub-online-learning .ol-rs-side{background:#0d1b2d!important;border-color:#263d55!important}
    body.dark-mode #hub-online-learning .ol-research-head h3,body.dark-mode #hub-online-learning .ol-research-stat strong,body.dark-mode #hub-online-learning .ol-research-card h4,body.dark-mode #hub-online-learning .ol-research-dialog-head h3,body.dark-mode #hub-online-learning .ol-research-file strong,body.dark-mode #hub-online-learning .ol-rs-side h4,body.dark-mode #hub-online-learning .ol-rs-history-item strong{color:#f1f5f9}
    body.dark-mode #hub-online-learning .ol-rs-document,body.dark-mode #hub-online-learning .ol-rs-document-head,body.dark-mode #hub-online-learning .ol-rs-editor{background:#111c2b!important;color:#e8eef5}
    @media(max-width:850px){#hub-online-learning .ol-rs-workspace{grid-template-columns:1fr}#hub-online-learning .ol-rs-side{position:static}#hub-online-learning .ol-rs-editor{padding:22px;font-size:12px}}
    @media(max-width:700px){#hub-online-learning .ol-research-stats{grid-template-columns:repeat(2,1fr)}#hub-online-learning .ol-research-grid{grid-template-columns:1fr}#hub-online-learning .ol-research-head{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(st);
}

function researchEnsureUI(){
  ensureResearchStyles();
  var panel=document.querySelector('#hub-online-learning .ol-panel');
  if(!panel)return;
  var tabs=panel.querySelector('.ol-tabs');
  if(tabs&&!tabs.querySelector('[data-ol-tab="research"]')){
    var b=document.createElement('button');b.className='ol-tab';b.type='button';b.dataset.olTab='research';b.innerHTML='<i class="fas fa-file-signature"></i> Research Papers';tabs.appendChild(b);
  }
  if(document.getElementById('ol-research-modal'))return;
  var modal=document.createElement('div');modal.className='ol-research-modal';modal.id='ol-research-modal';modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="ol-research-dialog"><div class="ol-research-dialog-head"><h3 id="ol-research-modal-title">Research Paper</h3><button class="ol-close" type="button" data-research-close><i class="fas fa-times"></i></button></div><div class="ol-research-body" id="ol-research-modal-body"></div></div>';
  document.body.appendChild(modal);
}

async function loadResearch(){
  var db=researchClient(),id=researchUserId();if(!db||!id)return;
  researchEnsureUI();
  var q=await db.from('research_submissions').select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_by,reviewed_at,submitted_at,created_at,updated_at').eq('student_id',id).order('created_at',{ascending:false});
  if(q.error){console.error('Research Papers load error:',q.error);return}
  state.research=q.data||[];
  if(state.tab==='research')renderResearch();
}

function researchStatusPill(s){return '<span class="ol-research-pill '+researchStatusClass(s)+'">'+researchEscape(researchStatusLabel(s))+'</span>'}

function renderResearch(){
  researchEnsureUI();var content=document.getElementById('ol-content');if(!content)return;
  var all=state.research||[],rows=all.slice();
  var search=(document.getElementById('ol-research-search')?.value||'').toLowerCase().trim();
  if(search)rows=rows.filter(function(r){return [r.title,researchTypeLabel(r.submission_type),r.supervisor_name,r.status,r.document_name].join(' ').toLowerCase().includes(search)});
  var counts={total:all.length,review:all.filter(r=>r.status==='under_review').length,revision:all.filter(r=>r.status==='revision_required').length,approved:all.filter(r=>r.status==='approved').length};
  content.innerHTML=`
    <div class="ol-research-wrap">
      <div class="ol-research-head"><div><h3><i class="fas fa-file-signature"></i> Research Papers</h3><p>Submit, receive corrections, edit revisions inline and send them back to your lecturer for review.</p></div><button class="ol-research-btn ol-research-primary" type="button" data-research-new><i class="fas fa-plus"></i> Submit Research</button></div>
      <div class="ol-research-stats"><div class="ol-research-stat"><strong>${counts.total}</strong><span>Total Submissions</span></div><div class="ol-research-stat"><strong>${counts.review}</strong><span>Under Review</span></div><div class="ol-research-stat"><strong>${counts.revision}</strong><span>Revision Required</span></div><div class="ol-research-stat"><strong>${counts.approved}</strong><span>Approved</span></div></div>
      <div class="ol-research-toolbar"><input id="ol-research-search" type="search" placeholder="Search research title, type or supervisor..." value="${researchEscape(search)}"><select id="ol-research-status"><option value="">All Status</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="revision_required">Revision Required</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button class="ol-research-btn ol-research-muted" type="button" data-research-refresh><i class="fas fa-rotate"></i> Refresh</button></div>
      <div class="ol-research-list">${rows.length?rows.map(function(r){return `<article class="ol-research-card"><div class="ol-research-card-top"><div><h4>${researchEscape(r.title||'Untitled Research')}</h4><div class="ol-research-meta"><span class="ol-research-pill">${researchEscape(researchTypeLabel(r.submission_type))}</span><span class="ol-research-pill">Version ${researchEscape(r.version_number||1)}</span><span class="ol-research-pill">${researchEscape(fmtDate(r.submitted_at||r.created_at))}</span>${researchStatusPill(r.status)}</div></div><i class="fas fa-file-signature" style="color:#087bf0;font-size:18px"></i></div>${r.supervisor_name?`<div style="margin-top:7px;font-size:9px;color:#71859c"><strong>Supervisor:</strong> ${researchEscape(r.supervisor_name)}</div>`:''}${r.feedback?`<div style="margin-top:8px"><div style="font-size:9px;font-weight:800;color:#526b86;margin-bottom:4px">LATEST FEEDBACK</div><div class="ol-research-feedback">${researchEscape(r.feedback)}</div></div>`:''}<div class="ol-research-actions"><button class="ol-research-btn ol-research-secondary" type="button" data-research-view="${researchEscape(r.id)}"><i class="fas fa-eye"></i> View</button>${String(r.status||'').toLowerCase()==='revision_required'?`<button class="ol-research-btn ol-research-primary" type="button" data-research-edit="${researchEscape(r.id)}"><i class="fas fa-pen-to-square"></i> Correct Inline</button>`:''}</div></article>`}).join(''):'<div class="ol-research-empty"><i class="fas fa-file-signature" style="font-size:25px;display:block;margin-bottom:8px"></i>No research submissions yet.</div>'}</div>
    </div>`;
  var sf=document.getElementById('ol-research-status');if(sf)sf.value=state.researchStatus||'';
  document.getElementById('ol-research-search')?.addEventListener('input',renderResearch);
  document.getElementById('ol-research-status')?.addEventListener('change',function(){state.researchStatus=this.value;renderResearch()});
}

function openResearchModal(){var m=document.getElementById('ol-research-modal');if(m){m.classList.add('open');m.setAttribute('aria-hidden','false')}}
function closeResearchModal(){
  researchStopCollaboration();var m=document.getElementById('ol-research-modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}state.researchCurrent=null;state.researchFile=null}

function openResearchForm(existing){
  researchEnsureUI();state.researchCurrent=existing||null;state.researchFile=null;
  var body=document.getElementById('ol-research-modal-body'),title=document.getElementById('ol-research-modal-title');if(!body||!title)return;
  title.textContent=existing?'Submit Research Revision':'Submit Research Paper';
  body.innerHTML=`<form id="ol-research-form"><div class="ol-research-grid"><div class="ol-research-field"><label>Research Type</label><select id="ol-research-type" required><option value="proposal">Research Proposal</option><option value="final_paper">Research Project / Final Paper</option><option value="correction">Correction / Revised Paper</option></select></div><div class="ol-research-field"><label>Version</label><input id="ol-research-version" type="number" min="1" value="${researchEscape(existing?(Number(existing.version_number||1)+1):1)}" required></div></div><div class="ol-research-field"><label>Research Title</label><input id="ol-research-title" type="text" value="${researchEscape(existing?.title||'')}" required></div><div class="ol-research-field"><label>Supervisor Name</label><input id="ol-research-supervisor" type="text" value="${researchEscape(existing?.supervisor_name||'')}" placeholder="Supervisor name"></div><div class="ol-research-field"><label>Abstract / Notes</label><textarea id="ol-research-abstract" placeholder="Brief abstract or submission notes...">${researchEscape(existing?.abstract||'')}</textarea></div><div class="ol-research-field"><label>Research Document ${existing?'(upload the revised document)':''}</label><div class="ol-research-file"><i class="fas fa-file-arrow-up"></i><strong>Choose PDF or Word document</strong><small>Accepted: PDF, DOC, DOCX</small><input id="ol-research-file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><div id="ol-research-file-name" style="margin-top:7px;font-size:9px;font-weight:800;color:#0870d6"></div></div></div><div style="display:flex;justify-content:flex-end;gap:7px;margin-top:12px"><button class="ol-research-btn ol-research-muted" type="button" data-research-close>Cancel</button><button class="ol-research-btn ol-research-primary" type="submit"><i class="fas fa-paper-plane"></i> Submit to Lecturer</button></div></form>`;
  var type=document.getElementById('ol-research-type');if(existing?.submission_type&&type)type.value=existing.submission_type==='correction'?'correction':existing.submission_type;
  document.getElementById('ol-research-file')?.addEventListener('change',function(){state.researchFile=this.files?.[0]||null;var n=document.getElementById('ol-research-file-name');if(n)n.textContent=state.researchFile?state.researchFile.name:''});
  document.getElementById('ol-research-form')?.addEventListener('submit',submitResearch);openResearchModal();
}

async function ensureMammoth(){
  if(window.mammoth&&typeof window.mammoth.convertToHtml==='function')return window.mammoth;
  return await new Promise(function(resolve,reject){
    var old=document.querySelector('script[data-ol-mammoth]');if(old){old.addEventListener('load',function(){resolve(window.mammoth)});old.addEventListener('error',reject);return}
    var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';s.dataset.olMammoth='1';s.onload=function(){if(window.mammoth)resolve(window.mammoth);else reject(new Error('Mammoth library did not load.'))};s.onerror=function(){reject(new Error('Could not load the DOCX document editor.'))};document.head.appendChild(s);
  });
}

async function signedResearchUrl(r){
  var db=researchClient();if(!db||!r?.document_path)throw new Error('Document path is missing.');
  var signed=await db.storage.from('research-papers').createSignedUrl(r.document_path,3600);if(signed.error)throw signed.error;return signed.data?.signedUrl||'';
}
function decodeHtmlSourceText(value){
  var s=String(value||'');
  var ta=document.createElement('textarea');
  ta.innerHTML=s;
  return ta.value;
}

function looksLikeHtmlSource(value){
  var s=String(value||'').trim();
  if(!s)return false;
  var d=decodeHtmlSourceText(s).trim();
  return /^<!doctype\s+html/i.test(s)
      || /^<html[\s>]/i.test(s)
      || /<html[\s>][\s\S]*<\/html>/i.test(s)
      || /<body[\s>][\s\S]*<\/body>/i.test(s)
      || /^<!doctype\s+html/i.test(d)
      || /^<html[\s>]/i.test(d)
      || /<html[\s>][\s\S]*<\/html>/i.test(d)
      || /<body[\s>][\s\S]*<\/body>/i.test(d);
}

function stripHtmlDocument(raw){
  var text=String(raw||'').replace(/^\uFEFF/,'').trim();

  /* The lecturer saves a complete HTML document. Some older versions were
     saved again as escaped HTML (&lt;doctype...&gt;). Decode repeatedly first. */
  for(var pass=0;pass<3;pass++){
    var decoded=decodeHtmlSourceText(text);
    if(decoded===text)break;
    if(/^<!doctype\s+html/i.test(decoded.trim()) ||
       /^<html[\s>]/i.test(decoded.trim()) ||
       /<body[\s>][\s\S]*<\/body>/i.test(decoded)){
      text=decoded.trim();
      continue;
    }
    break;
  }

  var bodyMatch=text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if(bodyMatch){
    var body=bodyMatch[1];

    /* Handle legacy corrections where the HTML source was escaped inside body. */
    var decodedBody=decodeHtmlSourceText(body);
    if(looksLikeHtmlSource(decodedBody)){
      var nested=decodedBody.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      body=nested?nested[1]:decodedBody;
    }
    return body;
  }

  var cleaned=text
    .replace(/<!doctype[^>]*>/ig,'')
    .replace(/<\/?(?:html|head|meta|title|style)[^>]*>/ig,'');

  var decodedCleaned=decodeHtmlSourceText(cleaned);
  if(looksLikeHtmlSource(decodedCleaned)){
    var nestedBody=decodedCleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if(nestedBody)return nestedBody[1];
  }

  return cleaned;
}

async function loadResearchInlineDocument(r,editor){
  if(!r?.document_path||!editor)throw new Error('Research document is not available.');
  var url=await signedResearchUrl(r);
  if(researchIsHtml(r)){
    var response=await fetch(url);if(!response.ok)throw new Error('Could not read the corrected document.');
    var rawHtml=await response.text();
    var renderedHtml=stripHtmlDocument(rawHtml);

    /* Final safety net for legacy escaped HTML-source corrections. */
    for(var safety=0;safety<3 && looksLikeHtmlSource(renderedHtml);safety++){
      var decodedHtml=decodeHtmlSourceText(renderedHtml);
      if(decodedHtml===renderedHtml)break;
      renderedHtml=stripHtmlDocument(decodedHtml);
    }

    /* Never display the wrapper/source itself. If extraction still failed,
       show only the document body content. */
    var finalBody=renderedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if(finalBody)renderedHtml=finalBody[1];

    editor.innerHTML=renderedHtml||'<p>No readable content was found in this document.</p>';
    return 'html';
  }
  if(researchIsDocx(r)){
    var resp=await fetch(url);if(!resp.ok)throw new Error('Could not read the Word document.');
    var mammoth=await ensureMammoth(),ab=await resp.arrayBuffer(),converted=await mammoth.convertToHtml({arrayBuffer:ab});
    editor.innerHTML=converted.value||'<p>No editable text was found in this document.</p>';return 'docx';
  }
  throw new Error('This document type cannot be edited inline. PDF files remain view-only; submit a revised PDF when needed.');
}

function nextResearchVersion(base){
  var key=base?.research_group_id?String(base.research_group_id):null;
  var list=(state.research||[]).filter(function(x){
    if(key)return String(x.research_group_id||'')===key;
    return String(x.student_id)===String(base.student_id)&&String(x.title||'').trim().toLowerCase()===String(base.title||'').trim().toLowerCase();
  });
  return Math.max(1,Number(base?.version_number||1),...list.map(function(x){return Number(x.version_number)||1}))+1;
}

async function submitResearch(e){
  e.preventDefault();var db=researchClient(),id=researchUserId(),f=state.researchFile,existing=state.researchCurrent;
  if(!db||!id){alert('Please sign in again and reload the portal.');return}
  if(!f){alert('Please choose your research document.');return}
  var title=document.getElementById('ol-research-title')?.value.trim(),type=document.getElementById('ol-research-type')?.value,version=Number(document.getElementById('ol-research-version')?.value||1),supervisor=document.getElementById('ol-research-supervisor')?.value.trim()||null,abstractText=document.getElementById('ol-research-abstract')?.value.trim()||null;
  if(!title){alert('Research title is required.');return}
  if(!['proposal','final_paper','correction'].includes(type)){alert('Invalid research type selected.');return}
  if(f.size>10*1024*1024){alert('The selected document is larger than 10 MB.');return}
  if(!['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)&&!/\.(pdf|doc|docx)$/i.test(f.name)){alert('Please upload a PDF, DOC or DOCX document.');return}
  var btn=e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Submitting to Lecturer...'}
  try{
    var path=id+'/'+Date.now()+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');var up=await db.storage.from('research-papers').upload(path,f,{upsert:false,contentType:f.type||undefined});if(up.error)throw up.error;
    var row={student_id:id,research_group_id:existing?.research_group_id||null,version_number:version,title:title,submission_type:type,supervisor_name:supervisor,abstract:abstractText,status:'submitted',document_name:f.name,document_path:up.data.path,submitted_at:new Date().toISOString(),updated_at:new Date().toISOString(),created_at:new Date().toISOString()};
    var ins=await db.from('research_submissions').insert(row).select().single();if(ins.error){await db.storage.from('research-papers').remove([up.data.path]);throw ins.error}
    closeResearchModal();await loadResearch();state.tab='research';document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x.dataset.olTab==='research')});renderResearch();alert(existing?'Your corrected research has been submitted to the lecturer for review.':'Your research paper has been submitted successfully.');
  }catch(e2){console.error('Research submission failed:',e2);alert('Research submission failed: '+(e2.message||e2))}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit to Lecturer'}}
}

async function renderResearchVersionHistory(current){
  var box=document.getElementById('ol-rs-history');if(!box||!current)return;
  var group=current.research_group_id?String(current.research_group_id):null;
  var list=(state.research||[]).filter(function(x){return group?String(x.research_group_id||'')===group:String(x.student_id)===String(current.student_id)&&String(x.title||'').trim().toLowerCase()===String(current.title||'').trim().toLowerCase()}).sort(function(a,b){return (Number(a.version_number)||1)-(Number(b.version_number)||1)});
  box.innerHTML=list.map(function(x){return `<button type="button" class="ol-rs-history-item ${String(x.id)===String(current.id)?'active':''}" data-rs-history="${researchEscape(x.id)}"><strong>V${researchEscape(x.version_number||1)} · ${researchEscape(researchTypeLabel(x.submission_type))}</strong><small>${researchEscape(fmtDateTime(x.submitted_at||x.created_at))} · ${researchEscape(researchStatusLabel(x.status))}</small></button>`}).join('')||'<div class="ol-rs-note">No version history available.</div>';
}

async function openResearchViewer(id,editMode){
  var r=state.research.find(function(x){return String(x.id)===String(id)});if(!r)return;
  state.researchCurrent=r;researchEnsureUI();var body=document.getElementById('ol-research-modal-body'),title=document.getElementById('ol-research-modal-title');if(!body||!title)return;
  title.textContent=(r.title||'Research Paper')+' · Version '+(r.version_number||1);
  body.innerHTML=`<div class="ol-rs-workspace"><section class="ol-rs-document"><div class="ol-rs-document-head"><strong id="ol-rs-doc-name">${researchEscape(r.document_name||'Research Document')}</strong><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="ol-research-btn ol-research-secondary" type="button" data-rs-download><i class="fas fa-download"></i> Download</button>${String(r.status||'').toLowerCase()==='revision_required'&&researchIsEditableDocument(r)?'<button class="ol-research-btn ol-research-primary" type="button" data-rs-edit><i class="fas fa-pen-to-square"></i> Edit Inline</button>':''}</div></div><div id="ol-rs-doc-content" style="min-height:520px"></div></section><aside class="ol-rs-side"><h4>Research Review</h4><div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c">Status</div><div style="margin-top:5px">${researchStatusPill(r.status)}</div></div><div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c">Research Type</div><div style="font-size:10px;font-weight:800;color:#18304d;margin-top:4px">${researchEscape(researchTypeLabel(r.submission_type))}</div></div><div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c">Supervisor</div><div style="font-size:10px;font-weight:800;color:#18304d;margin-top:4px">${researchEscape(r.supervisor_name||'—')}</div></div>${r.feedback?`<div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c;font-weight:800">LECTURER FEEDBACK</div><div class="ol-research-feedback" style="margin-top:6px">${researchEscape(r.feedback)}</div></div>`:''}<div class="ol-rs-side-section"><h4 style="margin-bottom:7px">Version History</h4><div class="ol-rs-history" id="ol-rs-history"></div></div><div class="ol-rs-side-section"><div class="ol-rs-note">When a lecturer requests revision, edit the document here and submit the new version. The previous version remains unchanged.</div></div><div id="ol-rs-submit-area"></div></aside></div>`;
  openResearchModal();await renderResearchVersionHistory(r);await loadResearchDocumentForViewer(r,!!editMode);
}

async function loadResearchDocumentForViewer(r,editMode){
  var host=document.getElementById('ol-rs-doc-content');if(!host)return;
  host.innerHTML='<div class="ol-research-empty"><i class="fas fa-spinner fa-spin"></i><strong>Opening document…</strong></div>';

  try{
    var url=await signedResearchUrl(r);
    var kind='';

    if(researchIsHtml(r)){
      var response=await fetch(url);
      if(!response.ok)throw new Error('Could not read the research document.');
      var rawHtml=await response.text();
      var renderedHtml=stripHtmlDocument(rawHtml);
      if(looksLikeHtmlSource(renderedHtml)){
        var decodedHtml=decodeHtmlSourceText(renderedHtml);
        if(looksLikeHtmlSource(decodedHtml))renderedHtml=stripHtmlDocument(decodedHtml);
      }
      kind='html';

      if(editMode){
        renderGoogleDocsEditor(host,r,renderedHtml,'html');
      }else{
        host.innerHTML=
          '<div class="ol-rs-view-page">'+renderedHtml+'</div>';
      }
      return;
    }

    if(researchIsDocx(r)){
      var resp=await fetch(url);
      if(!resp.ok)throw new Error('Could not read the Word document.');
      var mammoth=await ensureMammoth();
      var ab=await resp.arrayBuffer();
      var converted=await mammoth.convertToHtml({arrayBuffer:ab});
      var html=converted.value||'<p>No editable text was found in this document.</p>';
      kind='docx';

      if(editMode){
        renderGoogleDocsEditor(host,r,html,'docx');
      }else{
        host.innerHTML=
          '<div class="ol-rs-view-page">'+html+'</div>';
      }
      return;
    }

    if(/\.pdf($|[?#])/i.test(String(r.document_name||r.document_path||''))){
      host.innerHTML='<iframe class="ol-rs-pdf" title="'+researchEscape(r.document_name||'Research PDF')+'" src="'+researchEscape(url)+'"></iframe>';
      return;
    }

    throw new Error('This document type cannot be edited inline. PDF files remain view-only; submit a revised PDF when needed.');

  }catch(e){
    console.error('Research document viewer:',e);
    host.innerHTML='<div class="ol-research-empty"><i class="fas fa-circle-exclamation"></i><strong>Could not open this document</strong><br>'+researchEscape(e.message||e)+'</div>';
  }
}

function researchEditorDraftKey(r){
  return 'nchsm_research_editor_draft_'+String(r.id);
}

function researchEditorSaveState(r,editor,statusEl){
  if(!r||!editor)return;
  try{
    localStorage.setItem(researchEditorDraftKey(r),editor.innerHTML);
    if(statusEl){
      statusEl.innerHTML='<i class="fas fa-cloud-arrow-up"></i> Draft saved on this device · '+new Date().toLocaleTimeString();
      statusEl.dataset.saved='1';
    }
  }catch(e){
    if(statusEl)statusEl.textContent='Draft could not be saved locally';
  }
}

function researchEditorRestoreDraft(r,editor,statusEl,originalHtml){
  if(!r||!editor)return false;
  try{
    var saved=localStorage.getItem(researchEditorDraftKey(r));
    if(saved && saved!==originalHtml){
      editor.innerHTML=saved;
      if(statusEl)statusEl.innerHTML='<i class="fas fa-clock-rotate-left"></i> Saved draft restored';
      return true;
    }
  }catch(e){}
  return false;
}

function researchEditorClearDraft(r){
  try{localStorage.removeItem(researchEditorDraftKey(r))}catch(e){}
}


/* ================================================================
 * NCHSM RESEARCH — GOOGLE DOCS STYLE COLLABORATION LAYER
 * - comments
 * - suggestions / track changes
 * - live presence
 * - Supabase Realtime document sync
 * - local + broadcast draft persistence
 * - version snapshot support
 * ================================================================ */
var researchCollabState={
  channel:null,
  clientId:'nchsm-'+Math.random().toString(36).slice(2)+Date.now(),
  currentResearchId:null,
  applyingRemote:false,
  lastBroadcast:0,
  presenceTimer:null,
  commentCounter:0
};

function researchCollabKey(r){
  return 'nchsm_research_collab_'+String(r&&r.id||'');
}

function researchCommentsKey(r){
  return researchCollabKey(r)+':comments';
}

function researchSuggestionsKey(r){
  return researchCollabKey(r)+':suggestions';
}

function researchGetStoredArray(key){
  try{
    var x=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(x)?x:[];
  }catch(e){return []}
}

function researchSetStoredArray(key,value){
  try{localStorage.setItem(key,JSON.stringify(value||[]))}catch(e){}
}

function researchGetComments(r){
  return researchGetStoredArray(researchCommentsKey(r));
}

function researchGetSuggestions(r){
  return researchGetStoredArray(researchSuggestionsKey(r));
}

function researchCommentId(){
  researchCollabState.commentCounter++;
  return 'c_'+Date.now()+'_'+researchCollabState.commentCounter+'_'+Math.random().toString(36).slice(2,7);
}

function researchSuggestionId(){
  return 's_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
}

function researchSelectionText(editor){
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount)return '';
  var range=sel.getRangeAt(0);
  if(!editor.contains(range.commonAncestorContainer))return '';
  return String(sel.toString()||'').trim();
}

function researchSelectionOffset(editor){
  var sel=window.getSelection();
  if(!sel||!sel.rangeCount)return null;
  var range=sel.getRangeAt(0);
  if(!editor.contains(range.commonAncestorContainer))return null;
  var pre=document.createRange();
  pre.selectNodeContents(editor);
  pre.setEnd(range.startContainer,range.startOffset);
  var start=pre.toString().length;
  var selected=range.toString().length;
  return {start:start,end:start+selected};
}

function researchRestoreSelectionByOffset(editor,start,end){
  if(!editor||start==null||end==null)return false;
  var walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
  var nodes=[],node;
  while(node=walker.nextNode())nodes.push(node);
  var cursor=0,startNode=null,endNode=null,startOffset=0,endOffset=0;
  for(var i=0;i<nodes.length;i++){
    var len=nodes[i].nodeValue.length;
    if(startNode===null && start>=cursor && start<=cursor+len){
      startNode=nodes[i];startOffset=start-cursor;
    }
    if(endNode===null && end>=cursor && end<=cursor+len){
      endNode=nodes[i];endOffset=end-cursor;
      break;
    }
    cursor+=len;
  }
  if(!startNode||!endNode)return false;
  var range=document.createRange();
  range.setStart(startNode,Math.max(0,Math.min(startOffset,startNode.length)));
  range.setEnd(endNode,Math.max(0,Math.min(endOffset,endNode.length)));
  var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
  return true;
}

function researchEscapeAttr(v){
  return researchEscape(v).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function researchRefreshCommentMarkers(editor,r){
  if(!editor)return;
  var comments=researchGetComments(r);
  editor.querySelectorAll('[data-rs-comment]').forEach(function(n){
    var parent=n.parentNode;
    while(n.firstChild)parent.insertBefore(n.firstChild,n);
    parent.removeChild(n);
  });
  comments.forEach(function(c){
    if(!c||!c.text)return;
    var walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
    var node,found=null;
    while(node=walker.nextNode()){
      var at=node.nodeValue.indexOf(c.text);
      if(at>=0){found={node:node,at:at};break}
    }
    if(!found)return;
    var range=document.createRange();
    range.setStart(found.node,found.at);
    range.setEnd(found.node,found.at+c.text.length);
    var mark=document.createElement('mark');
    mark.dataset.rsComment=c.id;
    mark.className='ol-rs-comment-mark';
    mark.title=c.author_name+': '+c.text_comment;
    try{range.surroundContents(mark)}catch(e){}
  });
}

function researchRenderCommentsPanel(r,editor){
  var panel=document.getElementById('ol-rs-comments-panel');
  if(!panel)return;
  var comments=researchGetComments(r);
  panel.innerHTML=
    '<div class="ol-rs-comments-head"><strong>Comments</strong><span>'+comments.length+'</span></div>'+
    (comments.length?comments.map(function(c){
      return '<div class="ol-rs-comment-card" data-comment-card="'+researchEscapeAttr(c.id)+'">'+
        '<div><strong>'+researchEscape(c.author_name||'User')+'</strong><small>'+researchEscape(c.created_at?new Date(c.created_at).toLocaleString():'')+'</small></div>'+
        '<div class="ol-rs-comment-selection">“'+researchEscape(c.text||'')+'”</div>'+
        '<div class="ol-rs-comment-text">'+researchEscape(c.text_comment||'')+'</div>'+
        '<button type="button" class="ol-gdocs-comment-action" data-comment-delete="'+researchEscapeAttr(c.id)+'">Resolve</button>'+
      '</div>';
    }).join(''):'<div class="ol-rs-comments-empty">No comments yet. Select text and click Comment.</div>');
}

function researchAddComment(r,editor){
  var selected=researchSelectionText(editor);
  var offsets=researchSelectionOffset(editor);
  if(!selected||!offsets)return alert('Select text in the document first.');
  var comment=prompt('Add a comment for the selected text:');
  if(!comment||!comment.trim())return;
  var item={
    id:researchCommentId(),
    text:selected,
    text_comment:comment.trim(),
    start:offsets.start,
    end:offsets.end,
    author_name:researchProfileName(),
    created_at:new Date().toISOString(),
    resolved:false
  };
  var comments=researchGetComments(r);
  comments.push(item);researchSetStoredArray(researchCommentsKey(r),comments);
  researchRefreshCommentMarkers(editor,r);
  researchRenderCommentsPanel(r,editor);
  researchBroadcast(r,{type:'comment-add',comment:item});
}

function researchResolveComment(r,id,editor){
  var comments=researchGetComments(r).filter(function(c){return String(c.id)!==String(id)});
  researchSetStoredArray(researchCommentsKey(r),comments);
  researchRefreshCommentMarkers(editor,r);
  researchRenderCommentsPanel(r,editor);
  researchBroadcast(r,{type:'comment-delete',id:id});
}

function researchSuggestionMode(editor,on){
  if(!editor)return;
  editor.dataset.suggestionMode=on?'1':'0';
  var b=document.querySelector('[data-rs-suggest-toggle]');
  if(b)b.classList.toggle('active',!!on);
}

function researchInsertSuggestion(r,editor){
  var selected=researchSelectionText(editor);
  var offsets=researchSelectionOffset(editor);
  if(!selected||!offsets)return alert('Select text to replace first.');
  var replacement=prompt('Suggested replacement for the selected text:',selected);
  if(replacement===null)return;
  var sug={
    id:researchSuggestionId(),
    old_text:selected,
    new_text:String(replacement),
    start:offsets.start,
    end:offsets.end,
    author_name:researchProfileName(),
    created_at:new Date().toISOString(),
    status:'pending'
  };
  var suggestions=researchGetSuggestions(r);suggestions.push(sug);
  researchSetStoredArray(researchSuggestionsKey(r),suggestions);

  var sel=window.getSelection();
  if(sel&&sel.rangeCount){
    var range=sel.getRangeAt(0);
    var node=document.createElement('span');
    node.className='ol-rs-suggestion';
    node.dataset.rsSuggestion=sug.id;
    node.innerHTML='<del>'+researchEscape(selected)+'</del><ins>'+researchEscape(String(replacement))+'</ins>';
    try{range.deleteContents();range.insertNode(node)}catch(e){}
  }
  researchRenderSuggestionsPanel(r,editor);
  researchBroadcast(r,{type:'suggestion-add',suggestion:sug});
}

function researchRenderSuggestionsPanel(r,editor){
  var panel=document.getElementById('ol-rs-suggestions-panel');
  if(!panel)return;
  var suggestions=researchGetSuggestions(r).filter(function(s){return s.status==='pending'});
  panel.innerHTML=
    '<div class="ol-rs-comments-head"><strong>Suggestions</strong><span>'+suggestions.length+'</span></div>'+
    (suggestions.length?suggestions.map(function(s){
      return '<div class="ol-rs-comment-card">'+
        '<div><strong>'+researchEscape(s.author_name||'User')+'</strong><small>Suggestion</small></div>'+
        '<div><del>'+researchEscape(s.old_text)+'</del> → <ins>'+researchEscape(s.new_text)+'</ins></div>'+
        '<div class="ol-gdocs-suggestion-actions">'+
          '<button type="button" class="ol-gdocs-comment-action" data-suggestion-accept="'+researchEscapeAttr(s.id)+'">Accept</button>'+
          '<button type="button" class="ol-gdocs-comment-action" data-suggestion-reject="'+researchEscapeAttr(s.id)+'">Reject</button>'+
        '</div>'+
      '</div>';
    }).join(''):'<div class="ol-rs-comments-empty">No pending suggestions.</div>');
}

function researchApplySuggestion(r,id,accept,editor){
  var list=researchGetSuggestions(r);
  var s=list.find(function(x){return String(x.id)===String(id)});
  if(!s)return;
  s.status=accept?'accepted':'rejected';
  researchSetStoredArray(researchSuggestionsKey(r),list);

  if(accept){
    var walker=document.createTreeWalker(editor,NodeFilter.SHOW_ELEMENT);
    var node;
    while(node=walker.nextNode()){
      if(node.dataset&&node.dataset.rsSuggestion===String(id)){
        node.outerHTML=researchEscape(s.new_text);
        break;
      }
    }
  }else{
    var nodes=editor.querySelectorAll('[data-rs-suggestion="'+CSS.escape(String(id))+'"]');
    nodes.forEach(function(n){n.outerHTML=researchEscape(s.old_text)});
  }
  researchRenderSuggestionsPanel(r,editor);
  researchBroadcast(r,{type:'suggestion-status',id:id,status:s.status});
}

function researchBroadcast(r,payload){
  var ch=researchCollabState.channel;
  if(!ch||!payload)return;
  try{
    ch.send({type:'broadcast',event:'research-doc',payload:Object.assign({
      sender:researchCollabState.clientId
    },payload)});
  }catch(e){}
}

function researchStartCollaboration(r,editor,statusEl){
  researchStopCollaboration();
  var db=researchClient();
  if(!db||!r||!editor||!db.channel)return;

  researchCollabState.currentResearchId=String(r.id);
  var channelName='nchsm-research-live-'+String(r.id);
  var ch=db.channel(channelName,{config:{broadcast:{self:false},presence:{key:researchCollabState.clientId}}});
  researchCollabState.channel=ch;

  ch.on('broadcast',{event:'research-doc'},function(message){
    var p=message&&message.payload||{};
    if(!p||p.sender===researchCollabState.clientId)return;

    if(p.type==='document-state' && typeof p.html==='string'){
      researchCollabState.applyingRemote=true;
      var current=editor.innerHTML;
      if(p.html!==current){
        editor.innerHTML=p.html;
        editor.dataset.dirty='1';
      }
      researchCollabState.applyingRemote=false;
      if(statusEl)statusEl.innerHTML='<i class="fas fa-users"></i> Live update received';
      return;
    }

    if(p.type==='comment-add'&&p.comment){
      var comments=researchGetComments(r);
      if(!comments.some(function(c){return String(c.id)===String(p.comment.id)})){
        comments.push(p.comment);researchSetStoredArray(researchCommentsKey(r),comments);
        researchRefreshCommentMarkers(editor,r);
        researchRenderCommentsPanel(r,editor);
      }
      return;
    }

    if(p.type==='comment-delete'){
      researchSetStoredArray(researchCommentsKey(r),researchGetComments(r).filter(function(c){return String(c.id)!==String(p.id)}));
      researchRefreshCommentMarkers(editor,r);researchRenderCommentsPanel(r,editor);
      return;
    }

    if(p.type==='suggestion-add'&&p.suggestion){
      var ss=researchGetSuggestions(r);
      if(!ss.some(function(s){return String(s.id)===String(p.suggestion.id)})){
        ss.push(p.suggestion);researchSetStoredArray(researchSuggestionsKey(r),ss);
        researchRenderSuggestionsPanel(r,editor);
      }
      return;
    }

    if(p.type==='suggestion-status'){
      var ss2=researchGetSuggestions(r);
      var found=ss2.find(function(s){return String(s.id)===String(p.id)});
      if(found)found.status=p.status;
      researchSetStoredArray(researchSuggestionsKey(r),ss2);
      researchRenderSuggestionsPanel(r,editor);
    }
  });

  ch.on('presence',{event:'sync'},function(){
    var state=ch.presenceState();
    var count=Object.keys(state||{}).length;
    var el=document.getElementById('ol-gdocs-collaborators');
    if(el)el.textContent=count>1?(count+' people editing'):'Only you editing';
  });

  ch.on('presence',{event:'join'},function(){
    var el=document.getElementById('ol-gdocs-collaborators');
    if(el)el.textContent='Collaborator joined';
  });

  ch.on('presence',{event:'leave'},function(){
    var el=document.getElementById('ol-gdocs-collaborators');
    if(el)el.textContent='Collaborator left';
  });

  ch.subscribe(function(status){
    if(status==='SUBSCRIBED'){
      try{
        ch.track({user_id:researchUserId(),name:researchProfileName(),joined_at:new Date().toISOString()});
      }catch(e){}
      if(statusEl)statusEl.innerHTML='<i class="fas fa-circle" style="color:#18a957"></i> Live editing ready';
    }
  });

  editor.addEventListener('input',function(){
    if(researchCollabState.applyingRemote)return;
    var now=Date.now();
    if(now-researchCollabState.lastBroadcast<180)return;
    researchCollabState.lastBroadcast=now;
    researchBroadcast(r,{type:'document-state',html:editor.innerHTML});
  });

  return ch;
}

function researchStopCollaboration(){
  if(researchCollabState.channel){
    try{researchCollabState.channel.untrack()}catch(e){}
    try{researchClient().removeChannel(researchCollabState.channel)}catch(e){}
  }
  researchCollabState.channel=null;
  researchCollabState.currentResearchId=null;
}

function renderGoogleDocsEditor(host,r,html,kind){
  var originalHtml=String(html||'');
  host.innerHTML=`
    <div class="ol-gdocs-editor">
      <div class="ol-gdocs-topbar">
        <div class="ol-gdocs-file">
          <i class="fas fa-file-lines"></i>
          <div>
            <strong>${researchEscape(r.document_name||'Research Paper')}</strong>
            <small>Version ${researchEscape(r.version_number||1)} · ${kind==='docx'?'Word document':'HTML document'}</small>
          </div>
        </div>
        <div class="ol-gdocs-actions">
          <span class="ol-gdocs-collaborators" id="ol-gdocs-collaborators">Connecting…</span>
          <span class="ol-gdocs-save-state" id="ol-gdocs-save-state"><i class="fas fa-circle"></i> Editing</span>
          <button type="button" class="ol-research-btn ol-research-muted" data-rs-draft-save><i class="fas fa-floppy-disk"></i> Save Draft</button>
        </div>
      </div>

      <div class="ol-gdocs-toolbar" role="toolbar" aria-label="Document formatting toolbar">
        <div class="ol-gdocs-group">
          <button type="button" class="ol-gdocs-tool" data-gcmd="undo" title="Undo">↶</button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="redo" title="Redo">↷</button>
        </div>

        <div class="ol-gdocs-group">
          <select class="ol-gdocs-select" data-gformat="formatBlock" title="Text style">
            <option value="p">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
          </select>
        </div>

        <div class="ol-gdocs-group">
          <button type="button" class="ol-gdocs-tool" data-gcmd="bold" title="Bold"><b>B</b></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="italic" title="Italic"><i>I</i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="underline" title="Underline"><u>U</u></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        </div>

        <div class="ol-gdocs-group">
          <button type="button" class="ol-gdocs-tool" data-gcmd="justifyLeft" title="Align left"><i class="fas fa-align-left"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="justifyCenter" title="Center"><i class="fas fa-align-center"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="justifyRight" title="Align right"><i class="fas fa-align-right"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="justifyFull" title="Justify"><i class="fas fa-align-justify"></i></button>
        </div>

        <div class="ol-gdocs-group">
          <button type="button" class="ol-gdocs-tool" data-gcmd="insertUnorderedList" title="Bulleted list"><i class="fas fa-list-ul"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="insertOrderedList" title="Numbered list"><i class="fas fa-list-ol"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="indent" title="Increase indent"><i class="fas fa-indent"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="outdent" title="Decrease indent"><i class="fas fa-outdent"></i></button>
        </div>

        <div class="ol-gdocs-group">
          <button type="button" class="ol-gdocs-tool" data-gcmd="removeFormat" title="Clear formatting"><i class="fas fa-eraser"></i></button>
          <button type="button" class="ol-gdocs-tool" data-gcmd="createLink" title="Insert link"><i class="fas fa-link"></i></button>
        </div>

        <div class="ol-gdocs-group ol-gdocs-research-tools">
          <button type="button" class="ol-gdocs-tool" data-rs-comment-add title="Add comment"><i class="fas fa-comment"></i></button>
          <button type="button" class="ol-gdocs-tool" data-rs-suggest-toggle title="Suggestion mode"><i class="fas fa-pen-ruler"></i></button>
          <button type="button" class="ol-gdocs-tool" data-rs-suggest-add title="Suggest replacement"><i class="fas fa-highlighter"></i></button>
          <button type="button" class="ol-gdocs-tool" data-rs-fullscreen title="Full screen"><i class="fas fa-expand"></i></button>
        </div>

        <div class="ol-gdocs-group ol-gdocs-mobile-hide">
          <button type="button" class="ol-gdocs-tool" data-gcmd="print" title="Print"><i class="fas fa-print"></i></button>
        </div>
      </div>

      <div class="ol-gdocs-main">
        <div class="ol-gdocs-canvas">
          <article id="ol-rs-inline-editor" class="ol-gdocs-page" contenteditable="true" spellcheck="true" role="textbox" aria-label="Research document editor">${originalHtml}</article>
        </div>

        <aside class="ol-gdocs-review-panel">
          <div class="ol-gdocs-review-tabs">
            <button type="button" class="active" data-rs-panel="comments">Comments</button>
            <button type="button" data-rs-panel="suggestions">Suggestions</button>
          </div>
          <div id="ol-rs-comments-panel" class="ol-gdocs-review-content"></div>
          <div id="ol-rs-suggestions-panel" class="ol-gdocs-review-content" style="display:none"></div>
        </aside>
      </div>

      <div class="ol-gdocs-footer">
        <div id="ol-gdocs-word-count">0 words</div>
        <div class="ol-gdocs-footer-actions">
          <button type="button" class="ol-research-btn ol-research-muted" data-rs-view-only><i class="fas fa-eye"></i> View Only</button>
          <button type="button" class="ol-research-btn ol-research-primary" data-rs-submit-correction><i class="fas fa-paper-plane"></i> Submit Correction to Lecturer</button>
        </div>
      </div>
    </div>`;

  var editor=document.getElementById('ol-rs-inline-editor');
  var statusEl=document.getElementById('ol-gdocs-save-state');
  var countEl=document.getElementById('ol-gdocs-word-count');

  function updateCount(){
    if(!editor||!countEl)return;
    var words=(editor.innerText||'').trim().split(/\s+/).filter(Boolean).length;
    countEl.textContent=words+' '+(words===1?'word':'words');
  }

  var restored=researchEditorRestoreDraft(r,editor,statusEl,originalHtml);
  updateCount();
  researchRefreshCommentMarkers(editor,r);
  researchRenderCommentsPanel(r,editor);
  researchRenderSuggestionsPanel(r,editor);

  editor.addEventListener('input',function(){
    editor.dataset.dirty='1';
    updateCount();
    if(statusEl)statusEl.innerHTML='<i class="fas fa-pen"></i> Unsaved changes';
  });

  var autosaveTimer=null;
  editor.addEventListener('input',function(){
    clearTimeout(autosaveTimer);
    autosaveTimer=setTimeout(function(){
      researchEditorSaveState(r,editor,statusEl);
    },1200);
  });

  host.querySelectorAll('[data-gcmd]').forEach(function(btn){
    btn.addEventListener('mousedown',function(ev){
      ev.preventDefault();
      editor.focus();
      var cmd=this.dataset.gcmd;
      if(cmd==='createLink'){
        var url=prompt('Enter the web address:');
        if(url)document.execCommand('createLink',false,url);
      }else if(cmd==='print'){
        window.print();
      }else{
        document.execCommand(cmd,false,null);
      }
      editor.dataset.dirty='1';
      updateCount();
    });
  });

  host.querySelectorAll('[data-gformat]').forEach(function(sel){
    sel.addEventListener('change',function(){
      editor.focus();
      document.execCommand('formatBlock',false,this.value);
      editor.dataset.dirty='1';
      updateCount();
    });
  });

  var draftBtn=host.querySelector('[data-rs-draft-save]');
  if(draftBtn){
    draftBtn.addEventListener('click',function(){
      researchEditorSaveState(r,editor,statusEl);
      updateCount();
    });
  }

  var commentBtn=host.querySelector('[data-rs-comment-add]');
  if(commentBtn)commentBtn.addEventListener('click',function(){researchAddComment(r,editor)});

  var suggestToggle=host.querySelector('[data-rs-suggest-toggle]');
  if(suggestToggle)suggestToggle.addEventListener('click',function(){
    var on=editor.dataset.suggestionMode!=='1';
    researchSuggestionMode(editor,on);
    this.title=on?'Suggestion mode ON':'Suggestion mode OFF';
  });

  var suggestBtn=host.querySelector('[data-rs-suggest-add]');
  if(suggestBtn)suggestBtn.addEventListener('click',function(){researchInsertSuggestion(r,editor)});

  host.querySelectorAll('[data-rs-fullscreen]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var modal=document.getElementById('ol-research-modal');
      var dialog=modal&&modal.querySelector('.ol-research-dialog');
      if(!dialog)return;
      var is=dialog.classList.toggle('ol-rs-fullscreen');
      btn.innerHTML=is?'<i class="fas fa-compress"></i>':'<i class="fas fa-expand"></i>';
    });
  });

  host.querySelectorAll('[data-rs-panel]').forEach(function(btn){
    btn.addEventListener('click',function(){
      host.querySelectorAll('[data-rs-panel]').forEach(function(x){x.classList.toggle('active',x===btn)});
      var comments=document.getElementById('ol-rs-comments-panel');
      var suggestions=document.getElementById('ol-rs-suggestions-panel');
      var panel=this.dataset.rsPanel;
      if(comments)comments.style.display=panel==='comments'?'block':'none';
      if(suggestions)suggestions.style.display=panel==='suggestions'?'block':'none';
    });
  });

  var reviewPanel=host.querySelector('.ol-gdocs-review-panel');
  if(reviewPanel){
    reviewPanel.addEventListener('click',function(e){
      var del=e.target.closest('[data-comment-delete]');
      if(del){researchResolveComment(r,del.dataset.commentDelete,editor);return}
      var ac=e.target.closest('[data-suggestion-accept]');
      if(ac){researchApplySuggestion(r,ac.dataset.suggestionAccept,true,editor);return}
      var rej=e.target.closest('[data-suggestion-reject]');
      if(rej){researchApplySuggestion(r,rej.dataset.suggestionReject,false,editor);return}
    });
  }

  researchStartCollaboration(r,editor,statusEl);

  if(restored && statusEl){
    statusEl.innerHTML='<i class="fas fa-clock-rotate-left"></i> Saved draft restored';
  }
}

async function saveInlineResearchCorrection(){
  var base=state.researchCurrent,editor=document.getElementById('ol-rs-inline-editor'),db=researchClient(),id=researchUserId();if(!base||!editor||!db||!id)return;
  if(String(base.status||'').toLowerCase()!=='revision_required')return alert('This research is not currently awaiting revision.');
  var html=editor.innerHTML.trim();if(!html)return alert('There is no corrected document content to submit.');
  var next=nextResearchVersion(base),filename=(String(base.title||'Research').replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Research')+'_Student_Correction_V'+next+'.html',path=id+'/corrections/'+Date.now()+'_'+filename;
  var now=new Date().toISOString();
  var wrapper='<!doctype html><html><head><meta charset="utf-8"><title>'+researchEscape(base.title||'Research Correction')+'</title><style>body{font-family:Arial,sans-serif;line-height:1.7;max-width:850px;margin:40px auto;padding:0 40px;color:#202b38}img{max-width:100%}</style></head><body>'+html+'</body></html>';
  var upload=await db.storage.from('research-papers').upload(path,new Blob([wrapper],{type:'text/html'}),{contentType:'text/html',upsert:false});if(upload.error)return alert('Could not upload the corrected document: '+upload.error.message);
  var payload={student_id:id,research_group_id:base.research_group_id||null,version_number:next,title:base.title,submission_type:'correction',supervisor_name:base.supervisor_name||null,abstract:base.abstract||null,status:'submitted',document_name:filename,document_path:path,feedback:null,reviewed_by:null,reviewed_at:null,submitted_at:now,created_at:now,updated_at:now};
  var ins=await db.from('research_submissions').insert(payload).select().single();
  if(ins.error){try{await db.storage.from('research-papers').remove([path])}catch{};return alert('Document uploaded, but the new submission could not be created: '+ins.error.message)}
  alert('Correction submitted to the lecturer for review as Version '+next+'.');
  await loadResearch();
  state.researchCurrent=ins.data;
  await openResearchViewer(ins.data.id,false);
}

async function downloadCurrentResearch(){var r=state.researchCurrent;if(!r)return;try{var url=await signedResearchUrl(r);var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click()}catch(e){alert('Could not download the document: '+(e.message||e))}}

async function viewResearch(id){await openResearchViewer(id,false)}

function bindResearch(){
  researchEnsureUI();
  document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(b){if(b.dataset.researchBound)return;b.dataset.researchBound='1';b.addEventListener('click',function(){if(this.dataset.olTab==='research'){state.tab='research';document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});loadResearch().then(renderResearch)}})});
  var hub=document.getElementById('hub-online-learning');
  if(hub&&!hub.dataset.researchClicks){
    hub.dataset.researchClicks='1';
    hub.addEventListener('click',function(e){
      var n=e.target.closest('[data-research-new]');if(n){openResearchForm();return}
      var v=e.target.closest('[data-research-view]');if(v){viewResearch(v.dataset.researchView);return}
      var ed=e.target.closest('[data-research-edit]');if(ed){openResearchViewer(ed.dataset.researchEdit,true);return}
      var rv=e.target.closest('[data-research-revise]');if(rv){var r=state.research.find(function(x){return String(x.id)===String(rv.dataset.researchRevise)});if(r)openResearchForm(r);return}
      var rf=e.target.closest('[data-research-refresh]');if(rf){loadResearch().then(renderResearch);return}
      var c=e.target.closest('[data-research-close]');if(c){closeResearchModal();return}
      var dl=e.target.closest('[data-rs-download]');if(dl){downloadCurrentResearch();return}
      var ie=e.target.closest('[data-rs-edit]');if(ie){if(state.researchCurrent)loadResearchDocumentForViewer(state.researchCurrent,true);return}
      var so=e.target.closest('[data-rs-submit-correction]');if(so){saveInlineResearchCorrection();return}
      var vo=e.target.closest('[data-rs-view-only]');if(vo){if(state.researchCurrent)loadResearchDocumentForViewer(state.researchCurrent,false);return}
      var vh=e.target.closest('[data-rs-history]');if(vh){openResearchViewer(vh.dataset.rsHistory,false);return}
    });
  }
  var modal=document.getElementById('ol-research-modal');if(modal&&!modal.dataset.researchModalBound){modal.dataset.researchModalBound='1';modal.addEventListener('click',function(e){if(e.target===modal)closeResearchModal()})}
}

function initResearch(){researchEnsureUI();bindResearch();loadResearch()}

var _originalRender=render;
render=function(){if(state.tab==='research'){renderResearch();return}_originalRender.apply(this,arguments)};

function boot(){bind();initResearch();loadData()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('appReady',function(){setTimeout(function(){bind();initResearch();loadData()},300)});
})();
