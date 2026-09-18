(function(){
'use strict';

var state={tab:'assignments',assignments:[],submissions:[],results:[],current:null,currentQuestions:[],file:null,bound:false};

function client(){
  return (window.db&&window.db.supabase)||window.supabase||window.supabaseClient||null;
}
function uid(){
  return (window.db&&window.db.currentUserId) ||
         window.currentUserId ||
         window.authUserId ||
         null;
}
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
    var pct=(r.percentage!==undefined && r.percentage!==null)
      ? Number(r.percentage)
      : (r.max_marks?Math.round((Number(r.marks_obtained)/Number(r.max_marks))*100):0);
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
  var avg=state.results.filter(function(r){
    return r.result_released && (
      (r.percentage!==undefined && r.percentage!==null) ||
      (r.marks_obtained!==undefined && r.marks_obtained!==null && Number(r.max_marks)>0)
    );
  }).map(function(r){
    return (r.percentage!==undefined && r.percentage!==null)
      ? Number(r.percentage)
      : Number(r.marks_obtained)/Number(r.max_marks)*100;
  });
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

    /*
     * RESULT FIELD COMPATIBILITY FIX
     * get_student_online_learning() returns:
     *   score
     *   total_marks
     *   percentage
     *
     * The existing student UI historically used:
     *   marks_obtained
     *   max_marks
     *
     * Normalize the RPC response here so every existing result screen,
     * submission list, statistics card and View Result modal receives
     * the correct values.
     */
    state.submissions=(Array.isArray(feed.submissions)?feed.submissions:[]).map(function(s){
      var marks = s.marks_obtained;
      if(marks===undefined || marks===null) marks=s.score;

      var max = s.max_marks;
      if(max===undefined || max===null) max=s.total_marks;

      var percentage = s.percentage;
      if((percentage===undefined || percentage===null) && marks!==null && marks!==undefined && Number(max)>0){
        percentage=Math.round((Number(marks)/Number(max))*10000)/100;
      }

      return Object.assign({},s,{
        marks_obtained:marks,
        max_marks:max,
        percentage:percentage
      });
    });

    state.results=state.submissions.filter(function(s){
      return s.result_released===true || String(s.result_released).toLowerCase()==='true';
    });

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
  var body=document.getElementById('ol-result-body'),
      pct=(s.percentage!==undefined && s.percentage!==null)
        ? Number(s.percentage)
        : (s.max_marks?Math.round((Number(s.marks_obtained)/Number(s.max_marks))*100):0);
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
function boot(){bind();loadData()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('appReady',function(){setTimeout(function(){bind();loadData()},300)});
})();
