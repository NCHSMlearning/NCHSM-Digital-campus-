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
  if(state.bound)return;state.bound=true;
  document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(b){b.addEventListener('click',function(){state.tab=this.dataset.olTab;document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});render()})});
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
   This is intentionally NOT a separate dashboard module.
   It lives inside #hub-online-learning.
   ============================================================ */

function researchClient(){ return client(); }
function researchUserId(){ return uid(); }

function researchStatusLabel(s){
  var x=String(s||'submitted').toLowerCase();
  return {
    submitted:'Submitted',
    under_review:'Under Review',
    revision_required:'Revision Required',
    approved:'Approved',
    rejected:'Rejected'
  }[x] || String(s||'Submitted').replace(/_/g,' ');
}
function researchStatusClass(s){
  var x=String(s||'submitted').toLowerCase();
  if(x==='approved') return 'success';
  if(x==='revision_required'||x==='rejected') return 'danger';
  if(x==='under_review') return 'review';
  return 'pending';
}
function researchEscape(v){ return esc(v); }

function ensureResearchStyles(){
  if(document.getElementById('ol-research-styles')) return;
  var st=document.createElement('style');
  st.id='ol-research-styles';
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
    #hub-online-learning .ol-research-empty{padding:38px 15px;text-align:center;color:#71859c;font-size:10px}
    #hub-online-learning .ol-research-modal{position:fixed;inset:0;background:rgba(5,20,35,.58);z-index:10001;display:none;align-items:center;justify-content:center;padding:15px}
    #hub-online-learning .ol-research-modal.open{display:flex}
    #hub-online-learning .ol-research-dialog{width:min(820px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 25px 70px rgba(0,0,0,.25)}
    #hub-online-learning .ol-research-dialog-head{padding:13px 16px;border-bottom:1px solid #e5edf5;display:flex;justify-content:space-between;gap:10px;align-items:center;position:sticky;top:0;background:#fff;z-index:2}
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
    body.dark-mode #hub-online-learning .ol-research-head,
    body.dark-mode #hub-online-learning .ol-research-stat,
    body.dark-mode #hub-online-learning .ol-research-card,
    body.dark-mode #hub-online-learning .ol-research-dialog{background:#0d1b2d!important;border-color:#263d55!important}
    body.dark-mode #hub-online-learning .ol-research-head h3,
    body.dark-mode #hub-online-learning .ol-research-stat strong,
    body.dark-mode #hub-online-learning .ol-research-card h4,
    body.dark-mode #hub-online-learning .ol-research-dialog-head h3,
    body.dark-mode #hub-online-learning .ol-research-file strong{color:#f1f5f9}
    body.dark-mode #hub-online-learning .ol-research-head p,
    body.dark-mode #hub-online-learning .ol-research-stat span{color:#91a7bd}
    @media(max-width:700px){
      #hub-online-learning .ol-research-stats{grid-template-columns:repeat(2,1fr)}
      #hub-online-learning .ol-research-grid{grid-template-columns:1fr}
      #hub-online-learning .ol-research-head{align-items:flex-start;flex-direction:column}
    }
  `;
  document.head.appendChild(st);
}

function researchEnsureUI(){
  ensureResearchStyles();
  var panel=document.querySelector('#hub-online-learning .ol-panel');
  if(!panel) return;
  var tabs=panel.querySelector('.ol-tabs');
  if(tabs && !tabs.querySelector('[data-ol-tab="research"]')){
    var b=document.createElement('button');
    b.className='ol-tab';
    b.type='button';
    b.dataset.olTab='research';
    b.innerHTML='<i class="fas fa-file-signature"></i> Research Papers';
    tabs.appendChild(b);
  }
  if(document.getElementById('ol-research-modal')) return;
  var modal=document.createElement('div');
  modal.className='ol-research-modal';
  modal.id='ol-research-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`
    <div class="ol-research-dialog">
      <div class="ol-research-dialog-head">
        <h3 id="ol-research-modal-title">Research Paper</h3>
        <button class="ol-close" type="button" data-research-close><i class="fas fa-times"></i></button>
      </div>
      <div class="ol-research-body" id="ol-research-modal-body"></div>
    </div>`;
  document.body.appendChild(modal);
}

async function loadResearch(){
  var db=researchClient(), id=researchUserId();
  if(!db || !id) return;
  researchEnsureUI();
  var {data,error}=await db.from('research_submissions')
    .select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_by,reviewed_at,submitted_at,created_at,updated_at')
    .eq('student_id',id)
    .order('created_at',{ascending:false});
  if(error){
    console.error('Research Papers load error:',error);
    return;
  }
  state.research=data||[];
  if(state.tab==='research') renderResearch();
}

function researchStatusPill(s){
  return '<span class="ol-research-pill '+researchStatusClass(s)+'">'+researchEscape(researchStatusLabel(s))+'</span>';
}

function renderResearch(){
  researchEnsureUI();
  var content=document.getElementById('ol-content');
  if(!content) return;
  var rows=state.research||[];
  var search=(document.getElementById('ol-search')?.value||'').toLowerCase().trim();
  if(search) rows=rows.filter(function(r){
    return [r.title,r.submission_type,r.supervisor_name,r.status].join(' ').toLowerCase().includes(search);
  });
  var counts={
    total:state.research.length,
    review:state.research.filter(r=>r.status==='under_review').length,
    revision:state.research.filter(r=>r.status==='revision_required').length,
    approved:state.research.filter(r=>r.status==='approved').length
  };
  content.innerHTML=`
    <div class="ol-research-wrap">
      <div class="ol-research-head">
        <div><h3><i class="fas fa-file-signature"></i> Research Papers</h3><p>Submit and track your research proposal and final paper from the Online Learning workspace.</p></div>
        <button class="ol-research-btn ol-research-primary" type="button" data-research-new><i class="fas fa-plus"></i> Submit Research</button>
      </div>
      <div class="ol-research-stats">
        <div class="ol-research-stat"><strong>${counts.total}</strong><span>Total Submissions</span></div>
        <div class="ol-research-stat"><strong>${counts.review}</strong><span>Under Review</span></div>
        <div class="ol-research-stat"><strong>${counts.revision}</strong><span>Revision Required</span></div>
        <div class="ol-research-stat"><strong>${counts.approved}</strong><span>Approved</span></div>
      </div>
      <div class="ol-research-toolbar">
        <input id="ol-research-search" type="search" placeholder="Search research title, type or supervisor..." value="${researchEscape(search)}">
        <select id="ol-research-status">
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="revision_required">Revision Required</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button class="ol-research-btn ol-research-muted" type="button" data-research-refresh><i class="fas fa-rotate"></i> Refresh</button>
      </div>
      <div class="ol-research-list">
        ${rows.length ? rows.map(function(r){
          return `<article class="ol-research-card">
            <div class="ol-research-card-top">
              <div>
                <h4>${researchEscape(r.title||'Untitled Research')}</h4>
                <div class="ol-research-meta">
                  <span class="ol-research-pill">${researchEscape(r.submission_type||'Research Paper')}</span>
                  <span class="ol-research-pill">Version ${researchEscape(r.version_number||1)}</span>
                  <span class="ol-research-pill">${researchEscape(fmtDate(r.submitted_at||r.created_at))}</span>
                  ${researchStatusPill(r.status)}
                </div>
              </div>
              <i class="fas fa-file-signature" style="color:#087bf0;font-size:18px"></i>
            </div>
            ${r.supervisor_name?`<div style="margin-top:7px;font-size:9px;color:#71859c"><strong>Supervisor:</strong> ${researchEscape(r.supervisor_name)}</div>`:''}
            ${r.feedback?`<div style="margin-top:8px"><div style="font-size:9px;font-weight:800;color:#526b86;margin-bottom:4px">LATEST FEEDBACK</div><div class="ol-research-feedback">${researchEscape(r.feedback)}</div></div>`:''}
            <div class="ol-research-actions">
              <button class="ol-research-btn ol-research-secondary" type="button" data-research-view="${researchEscape(r.id)}"><i class="fas fa-eye"></i> View</button>
              ${String(r.status||'').toLowerCase()==='revision_required'?`<button class="ol-research-btn ol-research-primary" type="button" data-research-revise="${researchEscape(r.id)}"><i class="fas fa-rotate"></i> Submit Revision</button>`:''}
            </div>
          </article>`;
        }).join(''):'<div class="ol-research-empty"><i class="fas fa-file-signature" style="font-size:25px;display:block;margin-bottom:8px"></i>No research submissions yet.</div>'}
      </div>
    </div>`;
  var sf=document.getElementById('ol-research-status');
  if(sf) sf.value=state.researchStatus||'';
}

function openResearchForm(existing){
  researchEnsureUI();
  state.researchCurrent=existing||null;
  state.researchFile=null;
  var body=document.getElementById('ol-research-modal-body');
  var title=document.getElementById('ol-research-modal-title');
  if(!body||!title) return;
  title.textContent=existing?'Submit Research Revision':'Submit Research Paper';
  body.innerHTML=`
    <form id="ol-research-form">
      <div class="ol-research-grid">
        <div class="ol-research-field"><label>Research Type</label>
          <select id="ol-research-type" required>
            <option value="Research Proposal">Research Proposal</option>
            <option value="Final Research Paper">Final Research Paper</option>
          </select>
        </div>
        <div class="ol-research-field"><label>Version</label>
          <input id="ol-research-version" type="number" min="1" value="${researchEscape(existing?(Number(existing.version_number||1)+1):1)}" required>
        </div>
      </div>
      <div class="ol-research-field"><label>Research Title</label>
        <input id="ol-research-title" type="text" value="${researchEscape(existing?.title||'')}" required>
      </div>
      <div class="ol-research-field"><label>Supervisor Name</label>
        <input id="ol-research-supervisor" type="text" value="${researchEscape(existing?.supervisor_name||'')}" placeholder="Supervisor name">
      </div>
      <div class="ol-research-field"><label>Abstract / Notes</label>
        <textarea id="ol-research-abstract" placeholder="Brief abstract or submission notes...">${researchEscape(existing?.abstract||'')}</textarea>
      </div>
      <div class="ol-research-field">
        <label>Research Document ${existing?'(upload the revised document)':''}</label>
        <div class="ol-research-file">
          <i class="fas fa-file-arrow-up"></i>
          <strong>Choose PDF or Word document</strong>
          <small>Accepted: PDF, DOC, DOCX</small>
          <input id="ol-research-file" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>
          <div id="ol-research-file-name" style="margin-top:7px;font-size:9px;font-weight:800;color:#0870d6"></div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:7px;margin-top:12px">
        <button class="ol-research-btn ol-research-muted" type="button" data-research-close>Cancel</button>
        <button class="ol-research-btn ol-research-primary" type="submit"><i class="fas fa-paper-plane"></i> Submit</button>
      </div>
    </form>`;
  var type=document.getElementById('ol-research-type');
  if(existing?.submission_type && type) type.value=existing.submission_type;
  document.getElementById('ol-research-file')?.addEventListener('change',function(){
    state.researchFile=this.files?.[0]||null;
    var n=document.getElementById('ol-research-file-name');
    if(n) n.textContent=state.researchFile?state.researchFile.name:'';
  });
  document.getElementById('ol-research-form')?.addEventListener('submit',submitResearch);
  openResearchModal();
}

function openResearchModal(){
  var m=document.getElementById('ol-research-modal');
  if(m){m.classList.add('open');m.setAttribute('aria-hidden','false')}
}
function closeResearchModal(){
  var m=document.getElementById('ol-research-modal');
  if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}
  state.researchCurrent=null; state.researchFile=null;
}

async function submitResearch(e){
  e.preventDefault();
  var db=researchClient(), id=researchUserId(), f=state.researchFile;
  if(!db||!id){alert('Please sign in again and reload the portal.');return}
  if(!f){alert('Please choose your research document.');return}
  var title=document.getElementById('ol-research-title')?.value.trim();
  var type=document.getElementById('ol-research-type')?.value;
  var version=Number(document.getElementById('ol-research-version')?.value||1);
  var supervisor=document.getElementById('ol-research-supervisor')?.value.trim()||null;
  var abstractText=document.getElementById('ol-research-abstract')?.value.trim()||null;
  if(!title){alert('Research title is required.');return}
  if(!['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type) && !/\.(pdf|doc|docx)$/i.test(f.name)){
    alert('Please upload a PDF, DOC or DOCX document.');return;
  }
  var btn=e.target.querySelector('button[type="submit"]'); if(btn){btn.disabled=true;btn.textContent='Submitting...'}
  try{
    var path=id+'/'+Date.now()+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    var up=await db.storage.from('research-papers').upload(path,f,{upsert:false,contentType:f.type||undefined});
    if(up.error) throw up.error;
    var row={
      student_id:id,
      version_number:version,
      title:title,
      submission_type:type,
      supervisor_name:supervisor,
      abstract:abstractText,
      status:'submitted',
      document_name:f.name,
      document_path:up.data.path,
      submitted_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
    var ins=await db.from('research_submissions').insert(row).select().single();
    if(ins.error){
      await db.storage.from('research-papers').remove([up.data.path]);
      throw ins.error;
    }
    closeResearchModal();
    await loadResearch();
    state.tab='research';
    document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x.dataset.olTab==='research')});
    renderResearch();
    alert('Research paper submitted successfully.');
  }catch(err){
    console.error('Research submission error:',err);
    alert('Could not submit research paper: '+(err.message||err));
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit'}
  }
}

async function viewResearch(id){
  var r=state.research.find(function(x){return String(x.id)===String(id)});
  if(!r) return;
  researchEnsureUI();
  var body=document.getElementById('ol-research-modal-body');
  var title=document.getElementById('ol-research-modal-title');
  if(!body||!title)return;
  title.textContent=r.title||'Research Paper';
  var db=researchClient();
  var url='';
  if(r.document_path){
    var signed=await db.storage.from('research-papers').createSignedUrl(r.document_path,3600);
    if(!signed.error) url=signed.data.signedUrl||'';
  }
  body.innerHTML=`
    <div class="ol-research-field"><label>Status</label>${researchStatusPill(r.status)}</div>
    <div class="ol-research-grid">
      <div class="ol-research-field"><label>Research Type</label><div>${researchEscape(r.submission_type||'—')}</div></div>
      <div class="ol-research-field"><label>Version</label><div>${researchEscape(r.version_number||1)}</div></div>
      <div class="ol-research-field"><label>Submitted</label><div>${researchEscape(fmtDateTime(r.submitted_at||r.created_at))}</div></div>
      <div class="ol-research-field"><label>Supervisor</label><div>${researchEscape(r.supervisor_name||'—')}</div></div>
    </div>
    ${r.abstract?`<div class="ol-research-field"><label>Abstract / Notes</label><div class="ol-research-feedback">${researchEscape(r.abstract)}</div></div>`:''}
    ${r.feedback?`<div class="ol-research-field"><label>Lecturer / Supervisor Feedback</label><div class="ol-research-feedback">${researchEscape(r.feedback)}</div></div>`:''}
    ${url?`<div class="ol-research-field"><label>Document</label><iframe src="${researchEscape(url)}" style="width:100%;height:420px;border:1px solid #dbe6ef;border-radius:9px" title="Research document"></iframe><div style="margin-top:7px"><a href="${researchEscape(url)}" target="_blank" rel="noopener" class="ol-research-btn ol-research-secondary" style="display:inline-block;text-decoration:none">Open / Download Document</a></div></div>`:''}
    <div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px">
      ${String(r.status||'').toLowerCase()==='revision_required'?`<button class="ol-research-btn ol-research-primary" type="button" data-research-revise="${researchEscape(r.id)}"><i class="fas fa-rotate"></i> Submit Revision</button>`:''}
      <button class="ol-research-btn ol-research-muted" type="button" data-research-close>Close</button>
    </div>`;
  openResearchModal();
}

function bindResearch(){
  researchEnsureUI();
  document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(b){
    if(b.dataset.researchBound) return;
    b.dataset.researchBound='1';
    b.addEventListener('click',function(){
      if(this.dataset.olTab==='research'){
        state.tab='research';
        document.querySelectorAll('#hub-online-learning [data-ol-tab]').forEach(function(x){x.classList.toggle('active',x===b)});
        loadResearch().then(renderResearch);
      }
    });
  });
  var hub=document.getElementById('hub-online-learning');
  if(hub && !hub.dataset.researchClicks){
    hub.dataset.researchClicks='1';
    hub.addEventListener('click',function(e){
      var n=e.target.closest('[data-research-new]');
      if(n){openResearchForm();return}
      var v=e.target.closest('[data-research-view]');
      if(v){viewResearch(v.dataset.researchView);return}
      var rv=e.target.closest('[data-research-revise]');
      if(rv){
        var r=state.research.find(function(x){return String(x.id)===String(rv.dataset.researchRevise)});
        if(r)openResearchForm(r);
        return;
      }
      var rf=e.target.closest('[data-research-refresh]');
      if(rf){loadResearch().then(renderResearch);return}
      var c=e.target.closest('[data-research-close]');
      if(c){closeResearchModal();return}
    });
  }
  var modal=document.getElementById('ol-research-modal');
  if(modal && !modal.dataset.researchModalBound){
    modal.dataset.researchModalBound='1';
    modal.addEventListener('click',function(e){if(e.target===modal)closeResearchModal()});
  }
}

function initResearch(){
  researchEnsureUI();
  bindResearch();
  loadResearch();
}

/* Patch the existing render path so switching to Research works without
   disturbing Assignments, Case Studies, My Submissions or Results. */
var _originalRender=render;
render=function(){
  if(state.tab==='research'){
    renderResearch();
    return;
  }
  _originalRender.apply(this,arguments);
};

function boot(){bind();initResearch();loadData()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('appReady',function(){setTimeout(function(){bind();initResearch();loadData()},300)});
})();
