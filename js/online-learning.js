
(function(){
'use strict';

var state={tab:'assignments',assignments:[],submissions:[],results:[],current:null,currentQuestions:[],file:null,bound:false,research:[],researchProfiles:[],researchFile:null,researchInitialized:false};

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
  else if(state.tab==='results')renderResults();
  else if(state.tab==='research')renderResearch();
  updateStats();
}
function updateStats(){
  var as=state.assignments, sub=state.submissions;
  var avg=state.results.filter(function(r){return r.result_released&&(r.max_marks||r.total_marks||r.percentage!=null)}).map(function(r){return r.percentage!=null?Number(r.percentage):(Number(r.marks_obtained??r.score)/Number(r.max_marks??r.total_marks)*100)});
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
  var marks=s.marks_obtained!=null?s.marks_obtained:s.score;
  var max=s.max_marks!=null?s.max_marks:(s.total_marks!=null?s.total_marks:a.max_marks);
  var pct=s.percentage!=null?Number(s.percentage):(max?Math.round(Number(marks)/Number(max)*100):0);
  var body=document.getElementById('ol-result-body');
  body.innerHTML='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:13px"><div style="padding:12px;border:1px solid #e1eaf2;border-radius:9px;text-align:center"><strong style="font-size:20px;color:#087bf0">'+esc(marks??'—')+'</strong><small style="display:block;color:#71859c">Marks</small></div><div style="padding:12px;border:1px solid #e1eaf2;border-radius:9px;text-align:center"><strong style="font-size:20px;color:#087a4d">'+(max?pct+'%':'—')+'</strong><small style="display:block;color:#71859c">Percentage</small></div><div style="padding:12px;border:1px solid #e1eaf2;border-radius:9px;text-align:center"><strong style="font-size:13px;color:#18304d">'+esc(fmtDate(s.released_at))+'</strong><small style="display:block;color:#71859c">Released</small></div></div>'+
  '<div class="ol-notice"><strong>'+esc(a.title||s.assignment_title||'Assignment')+'</strong><br>'+esc(a.unit_code||'')+'</div>'+
  '<div style="padding:12px;border:1px solid #e1eaf2;border-radius:10px"><strong style="font-size:11px;color:#18304d">Lecturer Feedback</strong><p style="font-size:11px;line-height:1.55;color:#607994;white-space:pre-wrap">'+esc(s.feedback||'No feedback was added.')+'</p></div>';
  var m=document.getElementById('ol-result-modal');m.classList.add('open');m.setAttribute('aria-hidden','false');
}
/* ============================================================
   RESEARCH PAPERS — integrated inside the Online Learning hub
   ============================================================ */
function researchTypeLabel(v){return String(v||'').toLowerCase()==='final_research_paper'?'Final Research Paper':'Research Proposal'}
function researchStatusPill(v){
  var x=String(v||'submitted').toLowerCase();
  var cls=x==='approved'?'success':(x==='revision_required'||x==='rejected'?'danger':(x==='under_review'?'due':''));
  var label=x==='revision_required'?'Revision Required':x==='under_review'?'Under Review':x.charAt(0).toUpperCase()+x.slice(1);
  return '<span class="ol-pill '+cls+'">'+esc(label)+'</span>';
}
function researchStudentId(){
  var p=profile();
  return p.student_id||p.admission_number||p.admission_no||null;
}
function renderResearch(){
  var wrap=document.getElementById('ol-research-content');
  var main=document.getElementById('ol-content');
  if(!wrap)return;
  if(main)main.style.display='none';
  wrap.hidden=false;
  var search=(document.getElementById('ol-research-search')?.value||'').toLowerCase().trim();
  var type=document.getElementById('ol-research-type-filter')?.value||'all';
  var status=document.getElementById('ol-research-status-filter')?.value||'all';
  var arr=state.research.filter(function(r){
    var text=[r.title,r.submission_type,r.supervisor_name,r.abstract].join(' ').toLowerCase();
    return (!search||text.includes(search))&&(type==='all'||r.submission_type===type)&&(status==='all'||r.status===status);
  });
  var list=document.getElementById('ol-research-list');
  if(!list)return;
  if(!arr.length){list.innerHTML='<div class="ol-empty"><i class="fas fa-flask"></i><strong>No research submissions yet</strong><br>Click <b>Submit New Paper</b> to submit your research proposal or final research paper.</div>';return;}
  list.innerHTML=arr.map(function(r){
    return '<div class="ol-research-row"><div><strong>'+esc(r.title||'Untitled Research')+'</strong><span>'+esc(researchTypeLabel(r.submission_type))+' · '+esc(r.supervisor_name||'Supervisor not assigned')+'</span></div><div><strong>Submitted</strong><span>'+esc(fmtDateTime(r.submitted_at||r.created_at))+'</span></div><div><strong>Version</strong><span>v'+esc(r.version_number||1)+'</span></div><div><strong>Status</strong>'+researchStatusPill(r.status)+'</div><div><button type="button" class="ol-btn ol-btn-secondary" data-research-view="'+esc(r.id)+'"><i class="fas fa-eye"></i> View</button></div></div>';
  }).join('');
}
async function loadResearch(){
  var sb=client(),id=uid();
  if(!sb||!id)return;
  var err=document.getElementById('ol-research-error');if(err){err.hidden=true;err.textContent='';}
  var list=document.getElementById('ol-research-list');if(list)list.innerHTML='<div class="ol-loading"><i class="fas fa-spinner fa-spin"></i>Loading your research submissions...</div>';
  try{
    var q=await sb.from('research_submissions').select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_by,reviewed_at,submitted_at,created_at,updated_at').eq('student_id',id).order('created_at',{ascending:false});
    if(q.error)throw q.error;
    state.research=q.data||[];
    var total=state.research.length,review=state.research.filter(function(x){return x.status==='under_review'||x.status==='submitted'}).length,revision=state.research.filter(function(x){return x.status==='revision_required'}).length,approved=state.research.filter(function(x){return x.status==='approved'}).length;
    [['ol-research-total',total],['ol-research-review',review],['ol-research-revision',revision],['ol-research-approved',approved]].forEach(function(x){var e=document.getElementById(x[0]);if(e)e.textContent=x[1]});
    renderResearch();
  }catch(e){
    console.error('Research load failed:',e);
    if(err){err.textContent='Research submissions could not load: '+(e.message||e);err.hidden=false;}
    if(list)list.innerHTML='<div class="ol-empty"><i class="fas fa-database"></i><strong>Research data is not available</strong><br>Please try Refresh again.</div>';
  }
}
async function loadResearchSupervisors(){
  var sb=client(),sel=document.getElementById('ol-research-supervisor');if(!sb||!sel)return;
  sel.innerHTML='<option value="">Loading supervisors...</option>';
  try{
    var q=await sb.from('consolidated_user_profiles_table').select('user_id,full_name').order('full_name');
    if(q.error)throw q.error;
    state.researchProfiles=(q.data||[]).filter(function(p){return p.user_id!==uid()&&p.full_name});
    sel.innerHTML='<option value="">Select your supervisor</option>'+(state.researchProfiles.map(function(p){return '<option value="'+esc(p.full_name)+'">'+esc(p.full_name)+'</option>'}).join(''));
  }catch(e){
    console.warn('Supervisor list could not be loaded:',e);
    sel.innerHTML='<option value="">Enter/select supervisor</option>';
    var p=profile();
    if(p.supervisor_name)sel.innerHTML+='<option selected value="'+esc(p.supervisor_name)+'">'+esc(p.supervisor_name)+'</option>';
  }
}
function openResearchSubmitModal(){
  var m=document.getElementById('ol-research-submit-modal');if(!m)return;
  ['ol-research-title','ol-research-abstract'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  var type=document.getElementById('ol-research-submission-type');if(type)type.value='research_proposal';
  var file=document.getElementById('ol-research-file');if(file)file.value='';
  state.researchFile=null;
  var fn=document.getElementById('ol-research-file-name');if(fn)fn.textContent='';
  m.classList.add('open');m.setAttribute('aria-hidden','false');
  loadResearchSupervisors();
}
function closeResearch(which){var id=which==='details'?'ol-research-details-modal':'ol-research-submit-modal';var m=document.getElementById(id);if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
async function submitResearch(){
  var sb=client(),id=uid(),btn=document.getElementById('ol-research-submit-btn');
  var title=(document.getElementById('ol-research-title')?.value||'').trim();
  var type=document.getElementById('ol-research-submission-type')?.value||'research_proposal';
  var supervisor=(document.getElementById('ol-research-supervisor')?.value||'').trim();
  var abstractText=(document.getElementById('ol-research-abstract')?.value||'').trim();
  var file=state.researchFile;
  if(!sb||!id){alert('Your secure student session is not ready. Please refresh the portal.');return}
  if(!title||!supervisor||!abstractText||!file){alert('Please complete the research title, research type, supervisor, abstract/description and upload the document.');return}
  if(file.size>10*1024*1024){alert('The selected document is larger than 10 MB.');return}
  var allowed=/\.(pdf|doc|docx)$/i.test(file.name);if(!allowed){alert('Only PDF, DOC or DOCX files are allowed.');return}
  btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Submitting...';
  try{
    var safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    var path=id+'/'+Date.now()+'_'+safe;
    var up=await sb.storage.from('research-papers').upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(up.error)throw up.error;
    var payload={student_id:id,title:title,submission_type:type,supervisor_name:supervisor,abstract:abstractText,status:'submitted',version_number:1,document_name:file.name,document_path:path,submitted_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    var ins=await sb.from('research_submissions').insert(payload).select().single();
    if(ins.error){try{await sb.storage.from('research-papers').remove([path]);}catch(ignore){}throw ins.error;}
    state.research.unshift(ins.data);closeResearch('submit');renderResearch();
    alert('Research paper submitted successfully. You can track the review status and supervisor feedback here.');
  }catch(e){console.error('Research submission failed:',e);alert('Research submission failed: '+(e.message||e));}
  finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Paper'}
}
function openResearchDetails(id){
  var r=state.research.find(function(x){return String(x.id)===String(id)});if(!r)return;
  var body=document.getElementById('ol-research-details-body');if(!body)return;
  var m=document.getElementById('ol-research-details-modal');
  var status=researchStatusPill(r.status), file=r.document_name||'Research document';
  var url='';
  if(r.document_path){var pub=client().storage.from('research-papers').getPublicUrl(r.document_path);url=pub&&pub.data?pub.data.publicUrl:'';}
  var download=url?'<a class="ol-btn ol-btn-secondary" href="'+esc(url)+'" target="_blank" rel="noopener"><i class="fas fa-download"></i> View / Download</a>':'<span class="ol-pill">Document unavailable</span>';
  body.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px"><div><h3 style="margin:0;color:#18304d;font-size:16px">'+esc(r.title||'Research Submission')+'</h3><div style="margin-top:6px">'+status+' <span class="ol-pill">Version '+esc(r.version_number||1)+'</span></div></div></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px"><div class="ol-notice"><strong>Supervisor</strong><br>'+esc(r.supervisor_name||'—')+'</div><div class="ol-notice"><strong>Submitted</strong><br>'+esc(fmtDateTime(r.submitted_at||r.created_at))+'</div></div>'+
  '<div style="padding:12px;border:1px solid #e1eaf2;border-radius:10px;margin-bottom:12px"><strong style="font-size:11px;color:#18304d">Abstract / Description</strong><p style="font-size:11px;line-height:1.55;color:#607994;white-space:pre-wrap">'+esc(r.abstract||'No abstract provided.')+'</p></div>'+
  '<div style="padding:12px;border:1px solid #e1eaf2;border-radius:10px;margin-bottom:12px"><strong style="font-size:11px;color:#18304d">Document</strong><p style="font-size:11px;color:#607994">'+esc(file)+'</p>'+download+'</div>'+
  '<div style="padding:12px;border:1px solid #e1eaf2;border-radius:10px;background:#f8fbfe"><strong style="font-size:11px;color:#18304d">Supervisor Feedback</strong><p style="font-size:11px;line-height:1.55;color:#607994;white-space:pre-wrap">'+esc(r.feedback||'No supervisor feedback has been added yet.')+'</p></div>';
  m.classList.add('open');m.setAttribute('aria-hidden','false');
}
function setResearchTab(){
  var main=document.getElementById('ol-content'),toolbar=document.querySelector('#hub-online-learning .ol-toolbar');
  if(main)main.style.display=state.tab==='research'?'none':'';
  if(toolbar)toolbar.style.display=state.tab==='research'?'none':'';
  var rc=document.getElementById('ol-research-content');if(rc)rc.hidden=state.tab!=='research';
  if(state.tab==='research'&&!state.researchInitialized){state.researchInitialized=true;loadResearch();}
  else if(state.tab==='research')renderResearch();
}

function close(which){var m=document.getElementById(which==='result'?'ol-result-modal':'ol-assignment-modal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}}
function bind(){
  if(state.bound)return;state.bound=true;
  document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(b){b.addEventListener('click',function(){
    state.tab=this.dataset.olTab;
    document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});
    setResearchTab();
    render();
  })});
  document.getElementById('ol-search')?.addEventListener('input',render);
  document.getElementById('ol-status-filter')?.addEventListener('change',render);
  document.getElementById('ol-refresh')?.addEventListener('click',loadData);
  document.getElementById('ol-submit-btn')?.addEventListener('click',submitCurrent);
  document.querySelectorAll('#hub-online-learning [data-ol-close]').forEach(function(b){b.addEventListener('click',function(){close(this.dataset.olClose)})});
  document.getElementById('hub-online-learning').addEventListener('click',function(e){
    var o=e.target.closest('[data-ol-open]');if(o){var a=state.assignments.find(function(x){return String(x.id)===String(o.dataset.olOpen)});if(a)openModal(a);return}
    var r=e.target.closest('[data-ol-result]');if(r)viewResult(r.dataset.olResult);
    var rv=e.target.closest('[data-research-view]');if(rv)openResearchDetails(rv.dataset.researchView);
  });
  document.getElementById('ol-research-submit-open')?.addEventListener('click',openResearchSubmitModal);
  document.getElementById('ol-research-submit-btn')?.addEventListener('click',submitResearch);
  document.getElementById('ol-research-refresh')?.addEventListener('click',loadResearch);
  document.getElementById('ol-research-search')?.addEventListener('input',renderResearch);
  document.getElementById('ol-research-type-filter')?.addEventListener('change',renderResearch);
  document.getElementById('ol-research-status-filter')?.addEventListener('change',renderResearch);
  document.querySelectorAll('#hub-online-learning [data-ol-research-close]').forEach(function(b){b.addEventListener('click',function(){closeResearch(this.dataset.olResearchClose)})});
  document.getElementById('ol-research-file')?.addEventListener('change',function(){state.researchFile=this.files&&this.files[0]||null;var n=document.getElementById('ol-research-file-name');if(n)n.textContent=state.researchFile?state.researchFile.name:''});
  document.querySelectorAll('#hub-online-learning .ol-modal').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m){if(m.id==='ol-research-submit-modal')closeResearch('submit');else if(m.id==='ol-research-details-modal')closeResearch('details');else close(m.id==='ol-result-modal'?'result':'assignment')}})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){close('assignment');close('result');closeResearch('submit');closeResearch('details')}});
}

function boot(){bind();setResearchTab();loadData()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('appReady',function(){setTimeout(function(){bind();setResearchTab();loadData()},300)});
})();
