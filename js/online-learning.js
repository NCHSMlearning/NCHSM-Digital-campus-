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
   RESEARCH CORRECTION WORKFLOW — ORIGINAL FORMAT PRESERVED
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
    '<span id="ol-rce-file-label" style="font-size:11px;color:#64748b">Original document format</span>'+
    '<div style="display:flex;gap:7px"><button type="button" class="ol-btn ol-btn-secondary" id="ol-rce-save"><i class="fas fa-floppy-disk"></i> Save Draft</button>'+
    '<button type="button" class="ol-btn ol-btn-primary" id="ol-rce-submit"><i class="fas fa-paper-plane"></i> Submit Correction for Review</button></div></div>'+
    '</div>';
  document.body.appendChild(m);
  document.getElementById('ol-research-correction-close').onclick=function(){m.classList.remove('open');m.setAttribute('aria-hidden','true')};
  var savedRange=null;
  function saveEditorSelection(){
    var e=document.getElementById('ol-research-correction-editor'),s=window.getSelection();
    if(!e||!s||!s.rangeCount)return;
    var rg=s.getRangeAt(0);
    if(e.contains(rg.commonAncestorContainer))savedRange=rg.cloneRange();
  }
  function restoreEditorSelection(){
    var e=document.getElementById('ol-research-correction-editor');
    if(!e)return;
    e.focus({preventScroll:true});
    if(savedRange){
      var s=window.getSelection();s.removeAllRanges();s.addRange(savedRange);
    }
  }
  function applyEditorColor(cmd,color){
    restoreEditorSelection();
    try{document.execCommand(cmd,false,color)}catch(e){}
    saveEditorSelection();
    markResearchCorrectionDirty();
  }

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
  document.getElementById('ol-rce-file-label').textContent=(rootExt==='docx'?'DOCX':'HTML')+' · Current version V'+(r.version_number||1);
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

function researchFileExtension(item){
  var raw=String((item&&item.document_name)||(item&&item.document_path)||'').toLowerCase();
  var m=raw.match(/\.([a-z0-9]+)(?:[?#].*)?$/);
  return m?m[1]:'';
}

function researchRootVersion(current){
  var group=String((current&&current.research_group_id)||((current&&current.id)||''));
  var versions=(state.research||[]).filter(function(x){
    return String(x.research_group_id||x.id||'')===group;
  }).sort(function(a,b){
    return Number(a.version_number||1)-Number(b.version_number||1);
  });
  return versions[0]||current;
}

async function ensureStudentDocxGenerator(){
  if(window.docx&&window.docx.Document&&window.docx.Packer)return window.docx;
  return await new Promise(function(resolve,reject){
    var existing=document.querySelector('script[data-nchsm-student-docx-generator]');
    if(existing){
      existing.addEventListener('load',function(){
        window.docx?resolve(window.docx):reject(new Error('DOCX generator unavailable.'));
      });
      existing.addEventListener('error',function(){reject(new Error('DOCX generator could not load.'));});
      return;
    }
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/docx@9.5.1/build/index.umd.js';
    s.dataset.nchsmStudentDocxGenerator='1';
    s.onload=function(){window.docx?resolve(window.docx):reject(new Error('DOCX generator unavailable.'));};
    s.onerror=function(){reject(new Error('DOCX generator could not load.'));};
    document.head.appendChild(s);
  });
}

function studentDocxRuns(node,docx){
  var runs=[];
  function walk(n,style){
    style=style||{};
    Array.prototype.forEach.call(n.childNodes||[],function(ch){
      if(ch.nodeType===3){
        if(ch.nodeValue)runs.push(new docx.TextRun({
          text:ch.nodeValue,
          bold:!!style.bold,
          italics:!!style.italics,
          underline:style.underline?'single':undefined,
          strike:!!style.strike,
          color:style.color||undefined,
          highlight:style.highlight||undefined
        }));
        return;
      }
      if(ch.nodeType!==1)return;
      var tag=String(ch.tagName||'').toLowerCase();
      var next={
        bold:style.bold||tag==='strong'||tag==='b',
        italics:style.italics||tag==='em'||tag==='i',
        underline:style.underline||tag==='u',
        strike:style.strike||tag==='s'||tag==='strike',
        color:style.color,
        highlight:style.highlight
      };
      var cs=ch.style||{};
      if(cs.color){
        var c=cs.color.match(/^#([0-9a-f]{6})$/i);
        if(c)next.color=c[1].toUpperCase();
      }
      if(cs.backgroundColor){
        var h=cs.backgroundColor.match(/^#([0-9a-f]{6})$/i);
        if(h)next.highlight=h[1].toUpperCase();
      }
      if(tag==='br'){runs.push(new docx.TextRun({text:'\\n'}));return;}
      walk(ch,next);
    });
  }
  walk(node,{});
  return runs.length?runs:[new docx.TextRun({text:''})];
}

async function researchHtmlToDocxBlob(html,title){
  var docx=await ensureStudentDocxGenerator();
  var parsed=new DOMParser().parseFromString(String(html||''),'text/html');
  var children=[];
  Array.prototype.forEach.call(parsed.body&&parsed.body.children||[],function(el){
    var tag=String(el.tagName||'').toLowerCase();
    var runs=studentDocxRuns(el,docx);
    var opts={children:runs};
    if(/^h[1-6]$/.test(tag)){
      var level=Number(tag.slice(1));
      opts.heading=level===1?docx.HeadingLevel.HEADING_1:
        level===2?docx.HeadingLevel.HEADING_2:
        level===3?docx.HeadingLevel.HEADING_3:
        level===4?docx.HeadingLevel.HEADING_4:
        level===5?docx.HeadingLevel.HEADING_5:
        docx.HeadingLevel.HEADING_6;
    }
    children.push(new docx.Paragraph(opts));
  });
  if(!children.length){
    children.push(new docx.Paragraph({
      children:[new docx.TextRun({text:String(parsed.body&&parsed.body.textContent||'')})]
    }));
  }
  var document=new docx.Document({
    sections:[{properties:{},children:children}]
  });
  return await docx.Packer.toBlob(document);
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

    /* ============================================================
       RESEARCH PAPER VIEWER — TARGET LAYOUT
       Matches the approved visual mockup: centered dialog, large
       document canvas, centered paper, clean right review panel.
       ============================================================ */
    body > #ol-research-modal > #ol-research-dialog{
      width:min(1190px,calc(100vw - 40px))!important;
      max-width:min(1190px,calc(100vw - 40px))!important;
      height:min(92vh,calc(100vh - 40px))!important;
      max-height:calc(100vh - 40px)!important;
      background:#fff!important;
      border-radius:12px!important;
      box-shadow:0 22px 65px rgba(8,32,58,.28)!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-research-dialog-head{
      min-height:68px!important;
      padding:12px 16px!important;
      background:#fff!important;
      border-bottom:1px solid #e2eaf2!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-research-dialog-head h3{
      font-size:16px!important;
      font-weight:800!important;
      color:#102d4e!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-view-actions{
      gap:8px!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-back-online,
    body > #ol-research-modal > #ol-research-dialog .ol-rs-fullscreen-btn{
      height:38px!important;
      padding:0 13px!important;
      border-radius:8px!important;
      font-size:11px!important;
      font-weight:800!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:6px!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-close-paper{
      width:38px!important;
      height:38px!important;
      border-radius:8px!important;
      background:#edf2f7!important;
      color:#334e68!important;
      font-size:15px!important;
    }
    body > #ol-research-modal > #ol-research-dialog > #ol-research-modal-body{
      padding:12px 16px 16px!important;
      background:#fff!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-workspace{
      grid-template-columns:minmax(0,1fr) 320px!important;
      gap:12px!important;
      min-height:0!important;
      height:100%!important;
      align-items:stretch!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-document{
      background:#f3f6f9!important;
      border:1px solid #dbe5ee!important;
      border-radius:10px!important;
      min-height:0!important;
      height:100%!important;
      overflow:auto!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-document-head{
      min-height:48px!important;
      padding:8px 11px!important;
      background:#fff!important;
      border-bottom:1px solid #dbe5ee!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-document-head strong{
      font-size:10px!important;
      color:#173452!important;
      font-weight:800!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-editor-toolbar{
      min-height:43px!important;
      padding:6px 8px!important;
      background:#fff!important;
      border-bottom:1px solid #dbe5ee!important;
      position:sticky!important;
      top:0!important;
      z-index:20!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-correction-actions{
      min-height:48px!important;
      box-sizing:border-box!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-correction-actions .ol-research-btn{
      min-height:34px!important;
      white-space:nowrap!important;
    }
    @media(max-width:760px){
      body > #ol-research-modal > #ol-research-dialog .ol-rs-correction-actions{
        top:43px!important;
        align-items:flex-start!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-correction-actions > div:first-child{
        width:100%!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-correction-actions > div:last-child{
        width:100%!important;
        margin-left:0!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-correction-actions .ol-research-btn{
        flex:1 1 auto!important;
      }
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-tool{
      min-width:30px!important;
      height:30px!important;
      padding:0 8px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      font-size:11px!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-editor{
      width:min(900px,calc(100% - 54px))!important;
      max-width:900px!important;
      min-height:650px!important;
      margin:18px auto 24px!important;
      padding:58px 68px!important;
      background:#fff!important;
      color:#202b38!important;
      box-shadow:0 2px 16px rgba(20,40,60,.09)!important;
      border:1px solid #edf1f5!important;
      line-height:1.7!important;
      font-size:13px!important;
      box-sizing:border-box!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-side{
      background:#fff!important;
      border:1px solid #dbe5ee!important;
      border-radius:10px!important;
      padding:11px!important;
      height:100%!important;
      min-height:0!important;
      overflow:auto!important;
      position:relative!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-side-section{
      padding:10px 0!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-history-item{
      padding:8px!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-document::after{
      content:"";
      display:block;
      height:4px;
    }
    @media(max-width:1050px){
      body > #ol-research-modal > #ol-research-dialog .ol-rs-workspace{
        grid-template-columns:minmax(0,1fr) 285px!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-editor{
        width:min(860px,calc(100% - 30px))!important;
        padding:45px 52px!important;
      }
    }
    @media(max-width:850px){
      body > #ol-research-modal > #ol-research-dialog{
        width:calc(100vw - 16px)!important;
        max-width:calc(100vw - 16px)!important;
        height:calc(100vh - 16px)!important;
        max-height:calc(100vh - 16px)!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-workspace{
        grid-template-columns:1fr!important;
        height:auto!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-side{
        height:auto!important;
        max-height:260px!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-editor{
        width:calc(100% - 20px)!important;
        min-height:600px!important;
        padding:30px 24px!important;
      }
    }
    @media(max-width:620px){
      body > #ol-research-modal > #ol-research-dialog .ol-research-dialog-head{
        align-items:flex-start!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-view-actions{
        flex-wrap:wrap!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-back-online{
        font-size:0!important;
        width:38px!important;
        padding:0!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-back-online i{
        font-size:13px!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-fullscreen-btn{
        font-size:0!important;
        width:38px!important;
        padding:0!important;
      }
      body > #ol-research-modal > #ol-research-dialog .ol-rs-fullscreen-btn i{
        font-size:13px!important;
      }
    }

    /* FINAL RESEARCH VIEWER POSITIONING — viewport centered, independent of sidebar/main */
    body > #ol-research-modal{
      position:fixed!important;
      inset:0!important;
      left:0!important;
      top:0!important;
      right:0!important;
      bottom:0!important;
      width:100vw!important;
      height:100vh!important;
      max-width:100vw!important;
      max-height:100vh!important;
      margin:0!important;
      padding:18px!important;
      box-sizing:border-box!important;
      transform:none!important;
      z-index:2147483000!important;
      align-items:center!important;
      justify-content:center!important;
      overflow:hidden!important;
    }
    body > #ol-research-modal.open{
      display:flex!important;
    }
    body > #ol-research-modal > #ol-research-dialog{
      position:relative!important;
      left:auto!important;
      right:auto!important;
      top:auto!important;
      margin:0 auto!important;
      width:min(1480px,calc(100vw - 36px))!important;
      max-width:min(1480px,calc(100vw - 36px))!important;
      height:min(94vh,calc(100vh - 36px))!important;
      max-height:calc(100vh - 36px)!important;
      min-height:0!important;
      overflow:hidden!important;
      transform:none!important;
      box-sizing:border-box!important;
      display:flex!important;
      flex-direction:column!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-research-dialog-head{
      position:relative!important;
      flex:0 0 auto!important;
      width:100%!important;
      box-sizing:border-box!important;
    }
    body > #ol-research-modal > #ol-research-dialog > #ol-research-modal-body{
      flex:1 1 auto!important;
      min-height:0!important;
      overflow:auto!important;
      width:100%!important;
      box-sizing:border-box!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-workspace{
      width:100%!important;
      max-width:100%!important;
      margin:0 auto!important;
      box-sizing:border-box!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-document{
      min-width:0!important;
      width:100%!important;
      box-sizing:border-box!important;
    }
    body > #ol-research-modal > #ol-research-dialog .ol-rs-editor{
      width:min(100%,1000px)!important;
      max-width:1000px!important;
      margin:14px auto!important;
      box-sizing:border-box!important;
    }
    @media(max-width:850px){
      body > #ol-research-modal{padding:8px!important}
      body > #ol-research-modal > #ol-research-dialog{
        width:calc(100vw - 16px)!important;
        max-width:calc(100vw - 16px)!important;
        height:calc(100vh - 16px)!important;
        max-height:calc(100vh - 16px)!important;
        border-radius:10px!important;
      }
    }

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
    #hub-online-learning .ol-rs-editor[contenteditable="true"]{cursor:text}
    #hub-online-learning .ol-rs-view-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    #hub-online-learning .ol-rs-fullscreen-btn{background:#0b5ed7;color:#fff;border:0;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:800;cursor:pointer}
    #hub-online-learning .ol-rs-back-online{background:#edf4ff;color:#075fb7;border:1px solid #cfe0f1;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:800;cursor:pointer}
    #hub-online-learning .ol-rs-close-paper{background:#eef2f6;color:#334e68;border:0;border-radius:7px;width:32px;height:32px;font-size:14px;cursor:pointer}
    #hub-online-learning .ol-rs-fullscreen-dialog{
      width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;
      border-radius:0!important;margin:0!important;overflow:hidden!important;
    }
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-research-body{
      height:calc(100vh - 62px)!important;max-height:none!important;overflow:hidden!important;padding:10px!important;
    }
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-workspace{
      height:100%!important;min-height:0!important;grid-template-columns:minmax(0,1fr)!important;
    }
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-document{
      height:100%!important;min-height:0!important;overflow:auto!important;
    }
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-side{display:none!important}
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-editor{
      min-height:calc(100vh - 150px)!important;max-width:1000px!important;margin:10px auto!important;
    }
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-pdf{height:calc(100vh - 125px)!important}
    #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-editor-toolbar{
      position:sticky!important;top:0!important;z-index:20!important;
    }
    :fullscreen.ol-research-modal .ol-research-dialog{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border-radius:0!important}
    :fullscreen.ol-research-modal{padding:0!important}
    @media(max-width:700px){
      #hub-online-learning .ol-rs-view-actions{width:100%;justify-content:flex-start}
      #hub-online-learning .ol-rs-fullscreen-dialog .ol-rs-document-head{flex-direction:column;align-items:flex-start}
    }
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
  modal.innerHTML='<div class="ol-research-dialog" id="ol-research-dialog"><div class="ol-research-dialog-head"><div style="min-width:0"><h3 id="ol-research-modal-title">Research Paper</h3><div id="ol-research-modal-subtitle" style="font-size:9px;color:#71859c;margin-top:3px">Online Learning · Research Papers</div></div><div class="ol-rs-view-actions"><button class="ol-rs-back-online" type="button" data-rs-back-online><i class="fas fa-arrow-left"></i> Back to Online Learning</button><button class="ol-rs-fullscreen-btn" type="button" data-rs-fullscreen><i class="fas fa-expand"></i> Full Screen</button><button class="ol-rs-close-paper" type="button" data-research-close title="Close"><i class="fas fa-times"></i></button></div></div><div class="ol-research-body" id="ol-research-modal-body"></div></div>';
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
function closeResearchModal(){var m=document.getElementById('ol-research-modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}state.researchCurrent=null;state.researchFile=null}

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

/* Load the browser DOCX generator only when a DOCX correction is submitted. */
async function ensureDocxGenerator(){
  if(window.docx&&window.docx.Document&&window.docx.Packer)return window.docx;
  return await new Promise(function(resolve,reject){
    var existing=document.querySelector('script[data-ol-docx-generator]');
    if(existing){existing.addEventListener('load',function(){if(window.docx)resolve(window.docx);else reject(new Error('DOCX generator did not load.'))});existing.addEventListener('error',function(){reject(new Error('Could not load the DOCX generator.'))});return}
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/docx@9.5.1/build/index.umd.js';
    s.dataset.olDocxGenerator='1';
    s.onload=function(){if(window.docx&&window.docx.Document&&window.docx.Packer)resolve(window.docx);else reject(new Error('DOCX generator did not load correctly.'))};
    s.onerror=function(){reject(new Error('Could not load the DOCX generator.'))};
    document.head.appendChild(s);
  });
}

function researchDocxTextRuns(node,docx){
  var out=[];
  function walk(n,marks){
    if(n.nodeType===3){
      var text=n.nodeValue||'';if(text)out.push(new docx.TextRun(Object.assign({text:text},marks)));return;
    }
    if(n.nodeType!==1)return;
    var tag=n.tagName.toLowerCase(),m=Object.assign({},marks);
    if(tag==='strong'||tag==='b')m.bold=true;
    if(tag==='em'||tag==='i')m.italics=true;
    if(tag==='u')m.underline={};
    if(tag==='s'||tag==='strike'||tag==='del')m.strike=true;
    Array.prototype.forEach.call(n.childNodes,function(c){walk(c,m)});
  }
  walk(node,{});return out.length?out:[new docx.TextRun({text:''})];
}

async function researchHtmlToDocxBlob(html,title){
  var docx=await ensureDocxGenerator();
  var parser=new DOMParser(),parsed=parser.parseFromString('<!doctype html><html><body>'+html+'</body></html>','text/html'),body=parsed.body;
  var children=[];
  function addNode(node){
    if(node.nodeType===3){if((node.nodeValue||'').trim())children.push(new docx.Paragraph({children:[new docx.TextRun({text:node.nodeValue})]}));return;}
    if(node.nodeType!==1)return;
    var tag=node.tagName.toLowerCase();
    if(/^h[1-6]$/.test(tag)){
      var level=Number(tag.substring(1));
      children.push(new docx.Paragraph({heading:docx.HeadingLevel['HEADING_'+level],children:researchDocxTextRuns(node,docx)}));return;
    }
    if(tag==='ul'||tag==='ol'){
      Array.prototype.forEach.call(node.children,function(li,index){
        var runs=researchDocxTextRuns(li,docx);
        if(tag==='ul')runs.unshift(new docx.TextRun({text:'• '}));
        else runs.unshift(new docx.TextRun({text:(index+1)+'. '}));
        children.push(new docx.Paragraph({children:runs}));
      });return;
    }
    if(tag==='br'){children.push(new docx.Paragraph({children:[new docx.TextRun({text:''})]}));return;}
    if(['p','div','section','article','blockquote'].includes(tag)){
      var runs=researchDocxTextRuns(node,docx);
      var alignment=tag==='blockquote'?docx.AlignmentType.LEFT:undefined;
      children.push(new docx.Paragraph({children:runs,alignment:alignment}));return;
    }
    var runs=researchDocxTextRuns(node,docx);
    if(runs.length)children.push(new docx.Paragraph({children:runs}));
  }
  Array.prototype.forEach.call(body.children,addNode);
  if(!children.length)children=[new docx.Paragraph({children:[new docx.TextRun({text:title||'Research Paper'})]})];
  var documentObj=new docx.Document({sections:[{properties:{},children:children}]});
  return await docx.Packer.toBlob(documentObj);
}

function researchCorrectionFileName(base,next,ext){
  var original=String(base&&base.document_name||'Research Paper').split(/[\/]/).pop();
  var stem=original.replace(/\.(docx?|html?)$/i,'').trim()||String(base&&base.title||'Research Paper').replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Research Paper';
  return stem+'_Correction_V'+next+'.'+ext;
}

async function signedResearchUrl(r){
  var db=researchClient();if(!db||!r?.document_path)throw new Error('Document path is missing.');
  var signed=await db.storage.from('research-papers').createSignedUrl(r.document_path,3600);if(signed.error)throw signed.error;return signed.data?.signedUrl||'';
}
function researchDecodeHtmlEntities(value){
  var t=document.createElement('textarea');
  t.innerHTML=String(value||'');
  return t.value;
}
function researchLooksLikeHtmlSource(value){
  var x=String(value||'').trim().toLowerCase();
  return /^<!doctype\s+html|^<html[\s>]|^<head[\s>]|^<body[\s>]/.test(x) || /<\/?(p|div|h[1-6]|table|strong|em|ul|ol|li|br)\b/i.test(x);
}
function stripHtmlDocument(raw){
  var text=String(raw||'').replace(/^\uFEFF/,'').trim();
  for(var pass=0;pass<3;pass++){
    var bodyMatch=text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if(bodyMatch){
      var body=bodyMatch[1];
      if(researchLooksLikeHtmlSource(body))text=body;
      else return body;
    }else if(researchLooksLikeHtmlSource(text)){
      text=text.replace(/<!doctype[^>]*>/ig,'').replace(/<\/?(?:html|head|meta|title|style)[^>]*>/ig,'').trim();
      if(!researchLooksLikeHtmlSource(text))return text;
    }else{
      return text;
    }
    var decoded=researchDecodeHtmlEntities(text);
    if(decoded===text)break;
    text=decoded.trim();
  }
  var finalBody=text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if(finalBody)return finalBody[1];
  return text.replace(/<!doctype[^>]*>/ig,'').replace(/<\/?(?:html|head|meta|title|style)[^>]*>/ig,'');
}

async function loadResearchInlineDocument(r,editor){
  if(!r?.document_path||!editor)throw new Error('Research document is not available.');
  var url=await signedResearchUrl(r);
  if(researchIsHtml(r)){
    var response=await fetch(url);if(!response.ok)throw new Error('Could not read the corrected document.');
    editor.innerHTML=stripHtmlDocument(await response.text());return 'html';
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


async function researchEnterBrowserFullscreen(){
  var modal=document.getElementById('ol-research-modal');
  var dialog=document.getElementById('ol-research-dialog');
  if(!modal||!dialog)return;
  modal.classList.add('research-browser-fullscreen');
  dialog.classList.add('ol-rs-fullscreen-dialog');
  document.body.classList.add('ol-rs-browser-fullscreen');
  try{
    if(document.fullscreenElement!==modal && modal.requestFullscreen){
      await modal.requestFullscreen({navigationUI:'hide'});
    }
  }catch(e){}
  researchUpdateFullscreenButton();
}

async function researchExitBrowserFullscreen(){
  try{
    if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();
  }catch(e){}
  var modal=document.getElementById('ol-research-modal');
  var dialog=document.getElementById('ol-research-dialog');
  if(modal)modal.classList.remove('research-browser-fullscreen');
  if(dialog)dialog.classList.remove('ol-rs-fullscreen-dialog');
  document.body.classList.remove('ol-rs-browser-fullscreen');
  researchUpdateFullscreenButton();
}

function researchToggleFullscreen(){
  var dialog=document.getElementById('ol-research-dialog');
  if(document.fullscreenElement || dialog?.classList.contains('ol-rs-fullscreen-dialog')) researchExitBrowserFullscreen();
  else researchEnterBrowserFullscreen();
}

function researchUpdateFullscreenButton(){
  var b=document.querySelector('#ol-research-modal [data-rs-fullscreen]');
  if(!b)return;
  var active=!!document.fullscreenElement || !!document.querySelector('#ol-research-dialog.ol-rs-fullscreen-dialog');
  b.innerHTML=active?'<i class="fas fa-compress"></i> Exit Full Screen':'<i class="fas fa-expand"></i> Full Screen';
}

function researchBackToOnlineLearning(){
  if(document.fullscreenElement) researchExitBrowserFullscreen();
  closeResearchModal();
  state.tab='assignments';
  var tabs=document.querySelectorAll('#hub-online-learning [data-ol-tab]');
  tabs.forEach(function(t){t.classList.toggle('active',t.dataset.olTab==='assignments')});
  render();
  var hub=document.getElementById('hub-online-learning');
  if(hub)hub.scrollIntoView({behavior:'smooth',block:'start'});
}

async function openResearchViewer(id,editMode){
  var r=state.research.find(function(x){return String(x.id)===String(id)});if(!r)return;
  state.researchCurrent=r;researchEnsureUI();var body=document.getElementById('ol-research-modal-body'),title=document.getElementById('ol-research-modal-title');if(!body||!title)return;
  title.textContent=(r.title||'Research Paper')+' · Version '+(r.version_number||1);
  var sub=document.getElementById('ol-research-modal-subtitle');
  if(sub)sub.textContent=(r.student_name||r.student_full_name||'Student')+' · '+(r.admission_number||r.student_admission_number||'Research Paper')+' · Version '+(r.version_number||1);
  body.innerHTML=`<div class="ol-rs-workspace"><section class="ol-rs-document"><div class="ol-rs-document-head"><strong id="ol-rs-doc-name">${researchEscape(r.document_name||'Research Document')}</strong><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="ol-research-btn ol-research-secondary" type="button" data-rs-download><i class="fas fa-download"></i> Download</button>${String(r.status||'').toLowerCase()==='revision_required'&&researchIsEditableDocument(r)?'<button class="ol-research-btn ol-research-primary" type="button" data-rs-edit><i class="fas fa-pen-to-square"></i> Edit Inline</button>':''}</div></div><div id="ol-rs-doc-content" style="min-height:520px"></div></section><aside class="ol-rs-side"><h4>Research Review</h4><div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c">Status</div><div style="margin-top:5px">${researchStatusPill(r.status)}</div></div><div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c">Research Type</div><div style="font-size:10px;font-weight:800;color:#18304d;margin-top:4px">${researchEscape(researchTypeLabel(r.submission_type))}</div></div><div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c">Supervisor</div><div style="font-size:10px;font-weight:800;color:#18304d;margin-top:4px">${researchEscape(r.supervisor_name||'—')}</div></div>${r.feedback?`<div class="ol-rs-side-section"><div style="font-size:9px;color:#71859c;font-weight:800">LECTURER FEEDBACK</div><div class="ol-research-feedback" style="margin-top:6px">${researchEscape(r.feedback)}</div></div>`:''}<div class="ol-rs-side-section"><h4 style="margin-bottom:7px">Version History</h4><div class="ol-rs-history" id="ol-rs-history"></div></div><div class="ol-rs-side-section"><div class="ol-rs-note">When a lecturer requests revision, edit the document here and submit the new version. The previous version remains unchanged.</div></div><div id="ol-rs-submit-area"></div></aside></div>`;
  openResearchModal();await renderResearchVersionHistory(r);await loadResearchDocumentForViewer(r,!!editMode);
}

async function loadResearchDocumentForViewer(r,editMode){
  var host=document.getElementById('ol-rs-doc-content');if(!host)return;
  if(String(r.document_name||'').toLowerCase().match(/\.pdf$/)){try{var url=await signedResearchUrl(r);host.innerHTML='<iframe class="ol-rs-pdf" src="'+researchEscape(url)+'" title="Research document"></iframe>'}catch(e){host.innerHTML='<div class="ol-research-empty">Could not open the PDF: '+researchEscape(e.message||e)+'</div>'}return}
  host.innerHTML='<div style="padding:30px;text-align:center;color:#71859c;font-size:10px"><i class="fas fa-spinner fa-spin"></i> Loading document...</div>';
  try{
    var editor=document.createElement('div');editor.id='ol-rs-inline-editor';editor.className='ol-rs-editor';editor.contentEditable=editMode?'true':'false';
    var kind=await loadResearchInlineDocument(r,editor);host.innerHTML='';
    if(editMode){
      var toolbar=document.createElement('div');toolbar.className='ol-rs-editor-toolbar';toolbar.innerHTML='<button class="ol-rs-tool" type="button" data-cmd="bold"><b>B</b></button><button class="ol-rs-tool" type="button" data-cmd="italic"><i>I</i></button><button class="ol-rs-tool" type="button" data-cmd="underline"><u>U</u></button><button class="ol-rs-tool" type="button" data-rce-color>A</button><input type="color" data-rce-color-picker value="#000000" title="Text color" style="width:30px;height:28px;padding:2px"><button class="ol-rs-tool" type="button" data-rce-highlight>▰</button><input type="color" data-rce-highlight-picker value="#ffff00" title="Highlight color" style="width:30px;height:28px;padding:2px"><button class="ol-rs-tool" type="button" data-cmd="insertUnorderedList">• List</button><button class="ol-rs-tool" type="button" data-cmd="insertOrderedList">1. List</button><button class="ol-rs-tool" type="button" data-cmd="justifyLeft">Left</button><button class="ol-rs-tool" type="button" data-cmd="justifyCenter">Center</button><button class="ol-rs-tool" type="button" data-cmd="justifyRight">Right</button><button class="ol-rs-tool" type="button" data-cmd="undo">↶</button><button class="ol-rs-tool" type="button" data-cmd="redo">↷</button>';
      var savedRange=null;
      function saveRange(){var s=window.getSelection();if(s&&s.rangeCount&&editor.contains(s.getRangeAt(0).commonAncestorContainer))savedRange=s.getRangeAt(0).cloneRange()}
      function restoreRange(){editor.focus({preventScroll:true});if(savedRange){var s=window.getSelection();s.removeAllRanges();s.addRange(savedRange)}}
      editor.addEventListener('mouseup',saveRange);editor.addEventListener('keyup',saveRange);editor.addEventListener('touchend',saveRange,{passive:true});
      toolbar.addEventListener('mousedown',function(ev){
        var b=ev.target.closest('[data-cmd]');
        if(b){ev.preventDefault();restoreRange();document.execCommand(b.dataset.cmd,false,null);saveRange();return}
        if(ev.target.closest('[data-rce-color]')||ev.target.closest('[data-rce-highlight]')){ev.preventDefault();saveRange()}
      });
      var cp=toolbar.querySelector('[data-rce-color-picker]'),hp=toolbar.querySelector('[data-rce-highlight-picker]');
      if(cp)cp.addEventListener('input',function(){restoreRange();document.execCommand('foreColor',false,this.value);saveRange()});
      if(hp)hp.addEventListener('input',function(){restoreRange();document.execCommand('hiliteColor',false,this.value);saveRange()});
      host.appendChild(toolbar);
    }
    if(editMode){
      var save=document.createElement('div');
      save.className='ol-rs-correction-actions';
      save.style.cssText='position:sticky;top:43px;z-index:19;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 10px;background:#fff;border-bottom:1px solid #cbd8e5;box-shadow:0 2px 6px rgba(20,40,60,.08)';
      save.innerHTML='<div style="display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;color:#173452"><i class="fas fa-pen-to-square"></i><span>Correction Mode</span><span style="font-size:9px;font-weight:600;color:#71859c">Edit the paper, then submit your corrected version.</span></div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-left:auto"><button class="ol-research-btn ol-research-muted" type="button" data-rs-view-only>View Only</button><button class="ol-research-btn ol-research-primary" type="button" data-rs-submit-correction><i class="fas fa-paper-plane"></i> Submit Correction to Lecturer</button></div>';
      host.appendChild(save);
      host.appendChild(editor);
      editor.addEventListener('input',function(){editor.dataset.dirty='1'});
    }else{
      host.appendChild(editor);
    }
    
    if(!editMode){
      var viewFooter=document.createElement('div');
      viewFooter.className='ol-rs-view-footer';
      viewFooter.style.cssText='display:flex;justify-content:center;align-items:center;gap:18px;padding:8px 10px;background:#fff;border-top:1px solid #dbe5ee;color:#18304d;font-size:10px;font-weight:800;position:sticky;bottom:0;z-index:15';
      viewFooter.innerHTML='<span>Research Paper View</span><span style="font-weight:500;color:#71859c">Use the scroll bar to read the full document</span>';
      host.appendChild(viewFooter);
    }

    if(kind==='docx'&&!editMode){var note=document.createElement('div');note.className='ol-rs-note';note.style.cssText='padding:8px 14px;background:#fff;border-top:1px solid #dbe6ef';note.textContent='Word document preview converted for browser viewing.';host.appendChild(note)}
  }catch(e){host.innerHTML='<div class="ol-research-empty"><i class="fas fa-circle-exclamation"></i><strong>Could not open this document</strong><br>'+researchEscape(e.message||e)+'</div>'}
}

async function saveInlineResearchCorrection(){
  var base=state.researchCurrent,editor=document.getElementById('ol-rs-inline-editor'),db=researchClient(),id=researchUserId();
  if(!base||!editor||!db||!id)return;
  if(String(base.status||'').toLowerCase()!=='revision_required')return alert('This research is not currently awaiting revision.');
  var html=editor.innerHTML.trim();if(!html)return alert('There is no corrected document content to submit.');
  var next=nextResearchVersion(base),now=new Date().toISOString();
  var original=String(base.document_name||base.document_path||'').toLowerCase();
  var isDocx=/\.docx?$/.test(original),isHtml=/\.html?$/.test(original);
  if(!isDocx&&!isHtml)return alert('This document type cannot be submitted through the inline editor.');

  var ext=isDocx?'docx':'html';
  var filename=researchCorrectionFileName(base,next,ext);
  var path=id+'/'+(base.research_group_id||base.id)+'/corrections/'+Date.now()+'_'+filename;
  var fileBlob;
  try{
    if(isDocx){
      /* The browser editor is HTML, but a DOCX submission must be a real DOCX. */
      fileBlob=await researchHtmlToDocxBlob(html,base.title||'Research Paper');
    }else{
      var wrapper='<!doctype html><html><head><meta charset=\"utf-8\"><title>'+researchEscape(base.title||'Research Correction')+'</title><style>body{font-family:Arial,sans-serif;line-height:1.7;max-width:850px;margin:40px auto;padding:0 40px;color:#202b38}img{max-width:100%}</style></head><body>'+html+'</body></html>';
      fileBlob=new Blob([wrapper],{type:'text/html'});
    }
    var upload=await db.storage.from('research-papers').upload(path,fileBlob,{contentType:isDocx?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'text/html',upsert:false});
    if(upload.error)throw upload.error;
    var payload={student_id:id,research_group_id:base.research_group_id||base.id,version_number:next,title:base.title,submission_type:'correction',supervisor_name:base.supervisor_name||null,abstract:base.abstract||null,status:'submitted',document_name:filename,document_path:upload.data.path,feedback:null,reviewed_by:null,reviewed_at:null,submitted_at:now,created_at:now,updated_at:now};
    var ins=await db.from('research_submissions').insert(payload).select().single();
    if(ins.error){try{await db.storage.from('research-papers').remove([path])}catch{};throw ins.error;}
    alert('Correction submitted to the lecturer for review as Version '+next+'.');
    await loadResearch();state.researchCurrent=ins.data;await openResearchViewer(ins.data.id,false);
  }catch(e){
    console.error('Research correction submission failed:',e);
    alert('Correction could not be submitted: '+(e.message||e));
  }
}


async function downloadCurrentResearch(){var r=state.researchCurrent;if(!r)return;try{var url=await signedResearchUrl(r);var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click()}catch(e){alert('Could not download the document: '+(e.message||e))}}

async function viewResearch(id){await openResearchViewer(id,false)}

function bindResearch(){
  researchEnsureUI();
  var modal=document.getElementById('ol-research-modal');
  if(modal&&!modal.dataset.researchViewerControls){
    modal.dataset.researchViewerControls='1';
    modal.addEventListener('click',function(e){
      var fs=e.target.closest('[data-rs-fullscreen]');
      if(fs){e.preventDefault();researchToggleFullscreen();return}
      var back=e.target.closest('[data-rs-back-online]');
      if(back){e.preventDefault();researchBackToOnlineLearning();return}
    });
  }
  if(!document.documentElement.dataset.researchFullscreenKeys){
    document.documentElement.dataset.researchFullscreenKeys='1';
    document.addEventListener('fullscreenchange',function(){
      var d=document.getElementById('ol-research-dialog');
      if(d&&!document.fullscreenElement)d.classList.remove('ol-rs-fullscreen-dialog');
      researchUpdateFullscreenButton();
    });
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      var d=document.getElementById('ol-research-dialog');
      if(document.fullscreenElement){
        e.preventDefault();researchExitBrowserFullscreen();return;
      }
      if(d&&d.classList.contains('ol-rs-fullscreen-dialog')){
        e.preventDefault();researchExitBrowserFullscreen();
      }
    },true);
  }
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
