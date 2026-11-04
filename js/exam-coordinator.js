/* NCHSM Exam Coordinator Workspace — separate module; leaves existing lecturer exam scripts untouched. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const S = { permissions:{}, exams:[], lecturers:[], busy:false };
  const sb = () => window.sb;
  function notify(m,t) {
    if (typeof window.showToast === 'function') window.showToast(m,t || 'info');
    else { const n=document.createElement('div'); n.textContent=m; n.style.cssText='position:fixed;z-index:30000;right:16px;top:16px;padding:12px 16px;background:#12344d;color:white;border-radius:9px'; document.body.appendChild(n); setTimeout(()=>n.remove(),4000); }
  }
  async function permissions() {
    const {data,error}=await sb().rpc('current_exam_permissions');
    if(error) throw error;
    S.permissions=data || {};
    return S.permissions;
  }
  function styles() {
    if($('nchsmCoordCss')) return;
    const s=document.createElement('style'); s.id='nchsmCoordCss';
    s.textContent='#nchsmCoordinatorWorkspace{margin:0 0 18px;background:#fff;border:1px solid #dbe3ed;border-radius:15px;overflow:hidden;box-shadow:0 5px 20px #0f172a0d}#nchsmCoordinatorWorkspace .ch{padding:17px 20px;background:linear-gradient(120deg,#102f4d,#155b78);color:white;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}#nchsmCoordinatorWorkspace .ch h3{margin:0;font-size:16px}#nchsmCoordinatorWorkspace .ch p{margin:5px 0 0;color:#dbeafe;font-size:12px}#nchsmCoordinatorWorkspace .cb{padding:15px}#nchsmCoordinatorWorkspace .ctool{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:11px}#nchsmCoordinatorWorkspace input,#nchsmCoordinatorWorkspace select,#nchsmCoordinatorModal input,#nchsmCoordinatorModal select{width:100%;box-sizing:border-box;min-height:38px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;font:inherit;font-size:13px}#nchsmCoordinatorWorkspace .ctool input{flex:1;min-width:180px}#nchsmCoordinatorWorkspace button,#nchsmCoordinatorModal button{border:0;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}#nchsmCoordinatorWorkspace .primary,#nchsmCoordinatorModal .primary{background:#0f5b78;color:#fff}#nchsmCoordinatorWorkspace .secondary,#nchsmCoordinatorModal .secondary{background:#e2e8f0;color:#334155}#nchsmCoordinatorWorkspace .danger,#nchsmCoordinatorModal .danger{background:#b91c1c;color:white}#nchsmCoordinatorWorkspace .ctable{overflow:auto;border:1px solid #e2e8f0;border-radius:9px}#nchsmCoordinatorWorkspace table{width:100%;min-width:680px;border-collapse:collapse;font-size:12px}#nchsmCoordinatorWorkspace th,#nchsmCoordinatorWorkspace td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}#nchsmCoordinatorWorkspace th{background:#f8fafc;color:#475569;font-size:10px;text-transform:uppercase}#nchsmCoordinatorWorkspace .muted{font-size:11px;color:#64748b}#nchsmCoordinatorModal{display:none;position:fixed;inset:0;z-index:29999;background:#0f172ab3;align-items:center;justify-content:center;padding:14px}#nchsmCoordinatorModal .dialog{background:#fff;border-radius:14px;width:min(760px,96vw);max-height:92vh;overflow:auto}#nchsmCoordinatorModal .mh{position:sticky;top:0;background:white;padding:14px 17px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}#nchsmCoordinatorModal .mb{padding:17px}#nchsmCoordinatorModal .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}#nchsmCoordinatorModal label{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px}#nchsmCoordinatorModal .actions{padding:13px 17px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px}@media(max-width:560px){#nchsmCoordinatorModal .grid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }
  function workspace() {
    if($('nchsmCoordinatorWorkspace')) return;
    const host=$('myExams'); if(!host) return;
    const n=document.createElement('section'); n.id='nchsmCoordinatorWorkspace';
    n.innerHTML='<div class="ch"><div><h3><i class="fas fa-user-shield"></i> Examination Coordinator Workspace</h3><p>Global exam administration — permission-verified by Supabase</p></div><button class="primary" id="cwCreate"><i class="fas fa-plus"></i> Create for lecturer</button></div><div class="cb"><div class="ctool"><input id="cwSearch" type="search" placeholder="Search exam, unit, programme or lecturer"><select id="cwProgram"><option value="">All programmes</option></select><button class="secondary" id="cwRefresh"><i class="fas fa-sync"></i> Refresh</button></div><div class="muted" id="cwCount">Loading exams…</div><div class="ctable"><table><thead><tr><th>Exam / unit</th><th>Programme / block</th><th>Exam owner</th><th>Status</th><th>Actions</th></tr></thead><tbody id="cwRows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div></div>';
    const anchor=host.querySelector('.exam-filter-panel') || host.firstElementChild;
    if(anchor) host.insertBefore(n,anchor); else host.prepend(n);
  }
  function modal(title,body,actions) {
    let m=$('nchsmCoordinatorModal');
    if(!m){m=document.createElement('div');m.id='nchsmCoordinatorModal';m.innerHTML='<div class="dialog" role="dialog" aria-modal="true"><div class="mh"><strong id="cwTitle"></strong><button class="secondary" id="cwClose">✕</button></div><div class="mb" id="cwBody"></div><div class="actions" id="cwActions"></div></div>';document.body.appendChild(m);$('cwClose').onclick=closeModal;m.addEventListener('click',e=>{if(e.target===m)closeModal();});}
    $('cwTitle').textContent=title;$('cwBody').innerHTML=body;$('cwActions').innerHTML=actions || '<button class="secondary" id="cwDone">Close</button>';$('cwDone')?.addEventListener('click',closeModal);m.style.display='flex';
  }
  function closeModal(){if($('nchsmCoordinatorModal'))$('nchsmCoordinatorModal').style.display='none';}
  async function loadLecturers(){
    const {data,error}=await sb().from('consolidated_user_profiles_table').select('user_id,full_name,email,program,department,role,status').eq('role','lecturer').eq('status','approved').order('full_name');
    if(error) throw error; S.lecturers=data || [];
  }
  function owner(e){const p=S.lecturers.find(x=>String(x.user_id)===String(e.created_by));return p?(p.full_name||p.email):'Lecturer account';}
  async function loadExams(){
    $('cwRows').innerHTML='<tr><td colspan="5">Loading exams…</td></tr>';
    const {data,error}=await sb().from('exams').select('*').order('id',{ascending:false}).limit(1000);
    if(error) throw error; S.exams=data || [];
    const ps=[...new Set(S.exams.map(e=>e.target_program||e.program_type).filter(Boolean))].sort();
    $('cwProgram').innerHTML='<option value="">All programmes</option>'+ps.map(p=>'<option value="'+esc(p)+'">'+esc(p)+'</option>').join('');
    render();
  }
  function render(){
    const term=($('cwSearch')?.value||'').toLowerCase().trim(), prog=$('cwProgram')?.value||'';
    const rows=S.exams.filter(e=>{const p=e.target_program||e.program_type||'';const text=[e.exam_name,e.title,e.course_code,e.course_name,p,e.block,e.block_term,owner(e)].join(' ').toLowerCase();return (!term||text.includes(term))&&(!prog||prog===p);});
    $('cwCount').textContent='Showing '+rows.length+' of '+S.exams.length+' exams across all programmes.';
    $('cwRows').innerHTML=rows.length?rows.map(e=>'<tr><td><strong>'+esc(e.exam_name||e.title||'Untitled')+'</strong><div class="muted">'+esc(e.course_code||e.unit_code||'')+' · '+esc(e.exam_type||'')+'</div></td><td>'+esc(e.target_program||e.program_type||'—')+'<div class="muted">'+esc(e.block_term||e.block||'Block not set')+' · Intake '+esc(e.intake_year||'—')+'</div></td><td>'+esc(owner(e))+'</td><td>'+esc(e.status||'draft')+'</td><td><button class="primary" data-edit="'+esc(e.id)+'"><i class="fas fa-pen"></i> Edit</button> '+(S.permissions.exam_global_reset?'<button class="secondary" data-attempts="'+esc(e.id)+'"><i class="fas fa-users"></i> Attempts / reset</button>':'')+'</td></tr>').join(''):'<tr><td colspan="5" style="text-align:center;padding:20px">No exams match.</td></tr>';
  }
  function field(label,id,value,type,extra){return '<div><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+esc(value||'')+'" '+(extra||'')+'></div>';}
  function createForm(){
    const options=S.lecturers.map(l=>'<option value="'+esc(l.user_id)+'" data-program="'+esc(l.program||l.department||'')+'">'+esc(l.full_name||l.email)+' · '+esc(l.program||l.department||'Programme not set')+'</option>').join('');
    modal('Create exam on behalf of lecturer','<div class="grid"><div><label for="cwOwner">Exam owner</label><select id="cwOwner"><option value="">Select approved lecturer…</option>'+options+'</select></div>'+field('Exam title','cwExamTitle','','text','required')+'<div><label for="cwExamProgram">Programme</label><input id="cwExamProgram" readonly></div><div><label for="cwExamType">Exam type</label><select id="cwExamType"><option>EXAM</option><option>CAT</option><option>CAT_1</option><option>CAT_2</option><option>ASSIGNMENT</option><option>PRACTICAL</option><option>OSCE</option></select></div>'+field('Unit code','cwCode')+field('Intake year','cwIntake','2026','number')+field('Block','cwBlock')+field('Exam date','cwDate','','date','required')+field('Start time','cwTime','','time')+field('Duration (minutes)','cwDuration','120','number','min="1"')+field('Total marks','cwMarks','100','number','min="1"')+field('Pass mark','cwPass','50','number','min="0"')+'</div><p class="muted">The selected lecturer remains the exam owner. The database records the coordinator as the creating actor.</p>','<button class="secondary" id="cwCancel">Cancel</button><button class="primary" id="cwSave">Create exam</button>');
    $('cwOwner').onchange=e=>$('cwExamProgram').value=e.target.selectedOptions[0]?.dataset.program||'';
    $('cwCancel').onclick=closeModal;$('cwSave').onclick=saveCreate;
  }
  async function saveCreate(){
    if(S.busy)return;
    const ownerId=$('cwOwner').value,title=$('cwExamTitle').value.trim(),program=$('cwExamProgram').value.trim(),date=$('cwDate').value;
    const total=Number($('cwMarks').value),pass=Number($('cwPass').value),duration=Number($('cwDuration').value);
    if(!ownerId||!title||!program||!date||!(total>0)||pass<0||pass>total||!(duration>0)){notify('Complete required fields and verify marks/duration.','warning');return;}
    const payload={exam_name:title,title,exam_type:$('cwExamType').value,target_program:program,program_type:program,course_code:$('cwCode').value.trim()||null,intake_year:$('cwIntake').value?Number($('cwIntake').value):null,block:$('cwBlock').value.trim()||null,block_term:$('cwBlock').value.trim()||null,exam_date:date,exam_start_time:$('cwTime').value||null,duration_minutes:duration,total_marks:total,marks_out_of:total,pass_mark:pass,status:'draft',created_by:ownerId,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    S.busy=true;$('cwSave').disabled=true;
    try{const {error}=await sb().from('exams').insert(payload);if(error)throw error;notify('Exam created for '+(S.lecturers.find(l=>String(l.user_id)===ownerId)?.full_name||'selected lecturer')+'.','success');closeModal();await loadExams();}
    catch(e){notify('Create failed: '+(e.message||e),'error');}finally{S.busy=false;if($('cwSave'))$('cwSave').disabled=false;}
  }
  function editForm(id){
    const e=S.exams.find(x=>String(x.id)===String(id));if(!e)return;
    const types=['draft','pending','published','active','completed','closed'];const status=String(e.status||'draft').toLowerCase();
    modal('Edit exam — '+(e.exam_name||e.title||''),'<div class="grid">'+field('Exam title','cwEditName',e.exam_name||e.title)+ '<div><label for="cwEditStatus">Status</label><select id="cwEditStatus">'+types.map(v=>'<option value="'+v+'" '+(v===status?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+field('Programme','cwEditProgram',e.target_program||e.program_type)+field('Unit code','cwEditCode',e.course_code||e.unit_code)+field('Intake year','cwEditIntake',e.intake_year,'number')+field('Block','cwEditBlock',e.block_term||e.block)+field('Exam date','cwEditDate',e.exam_date?String(e.exam_date).slice(0,10):'','date')+field('Start time','cwEditTime',e.exam_start_time||e.start_time,'time')+field('Duration (minutes)','cwEditDuration',e.duration_minutes||120,'number')+field('Total marks','cwEditMarks',e.total_marks||e.marks_out_of||100,'number')+field('Pass mark','cwEditPass',e.pass_mark??50,'number')+'</div><p class="muted">Owner: '+esc(owner(e))+' — ownership is not changed.</p>','<button class="secondary" id="cwEditCancel">Cancel</button><button class="primary" id="cwEditSave">Save changes</button>');
    $('cwEditCancel').onclick=closeModal;$('cwEditSave').onclick=()=>saveEdit(e);
  }
  async function saveEdit(e){
    const total=Number($('cwEditMarks').value),pass=Number($('cwEditPass').value),duration=Number($('cwEditDuration').value),title=$('cwEditName').value.trim(),date=$('cwEditDate').value;
    if(!title||!date||!(total>0)||pass<0||pass>total||!(duration>0)){notify('Check title, date, marks, pass mark and duration.','warning');return;}
    const changes={exam_name:title,title,status:$('cwEditStatus').value,target_program:$('cwEditProgram').value.trim()||null,program_type:$('cwEditProgram').value.trim()||null,course_code:$('cwEditCode').value.trim()||null,intake_year:$('cwEditIntake').value?Number($('cwEditIntake').value):null,block:$('cwEditBlock').value.trim()||null,block_term:$('cwEditBlock').value.trim()||null,exam_date:date,exam_start_time:$('cwEditTime').value||null,duration_minutes:duration,total_marks:total,marks_out_of:total,pass_mark:pass,updated_at:new Date().toISOString()};
    try{const {data,error}=await sb().from('exams').update(changes).eq('id',e.id).select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('No row updated; database authorization denied the change.');Object.assign(e,changes);closeModal();render();notify('Exam updated.','success');}
    catch(x){notify('Update failed: '+(x.message||x),'error');}
  }
  async function attempts(id){
    const e=S.exams.find(x=>String(x.id)===String(id));if(!e)return;
    modal('Student attempts — '+(e.exam_name||e.title||''),'<p>Loading attempts…</p>');
    try{
      const {data,error}=await sb().from('exam_attempts').select('id,student_id,attempt_number,status,submitted_at,updated_at').eq('exam_id',e.id).order('attempt_number',{ascending:false}).limit(1000);if(error)throw error;
      const ids=[...new Set((data||[]).map(a=>a.student_id).filter(Boolean))];let profiles=[];
      if(ids.length){const r=await sb().from('consolidated_user_profiles_table').select('user_id,full_name,email,student_id').in('user_id',ids);if(r.error)console.warn(r.error.message);profiles=r.data||[];}
      const pmap=new Map(profiles.map(p=>[String(p.user_id),p])),latest=new Map();
      (data||[]).forEach(a=>{const k=String(a.student_id);if(!latest.has(k)||Number(a.attempt_number||0)>Number(latest.get(k).attempt_number||0))latest.set(k,a);});
      const rows=[...latest.values()];
      $('cwBody').innerHTML='<p class="muted">Latest attempt per student. Reset clears saved answers and authorizes a clean restart. Published academic marks are not modified.</p><div style="overflow:auto"><table style="width:100%;min-width:520px;border-collapse:collapse;font-size:12px"><thead><tr><th>Student</th><th>Attempt</th><th>Status</th><th>Action</th></tr></thead><tbody>'+(rows.length?rows.map(a=>{const p=pmap.get(String(a.student_id))||{};return '<tr><td style="padding:8px;border-top:1px solid #e2e8f0"><strong>'+esc(p.full_name||p.student_id||a.student_id)+'</strong><div class="muted">'+esc(p.email||'')+'</div></td><td style="padding:8px;border-top:1px solid #e2e8f0">#'+esc(a.attempt_number||1)+'</td><td style="padding:8px;border-top:1px solid #e2e8f0">'+esc(a.status||'—')+'</td><td style="padding:8px;border-top:1px solid #e2e8f0"><button class="danger" data-reset-student="'+esc(a.student_id)+'" data-reset-name="'+esc(p.full_name||p.student_id||'Student')+'">Clear & reset</button></td></tr>';}).join(''):'<tr><td colspan="4" style="padding:18px;text-align:center">No attempts recorded.</td></tr>')+'</tbody></table></div>';
      $('cwActions').innerHTML='<button class="secondary" id="cwAttemptClose">Close</button>';$('cwAttemptClose').onclick=closeModal;
      $('cwBody').querySelectorAll('[data-reset-student]').forEach(b=>b.onclick=()=>resetAttempt(b.dataset.resetStudent,b.dataset.resetName,e));
    }catch(x){$('cwBody').innerHTML='<p style="color:#b91c1c">Unable to load attempts: '+esc(x.message||x)+'</p>';}
  }
  async function resetAttempt(studentId,name,e){
    if(!confirm('CLEAR SAVED EXAM CHOICES AND AUTHORIZE A CLEAN RESTART?\n\nStudent: '+name+'\nExam: '+(e.exam_name||e.title||'Exam')+'\n\nThis clears question answers for this exam and unlocks the existing attempt for a fresh restart. Published academic marks are not changed. The action is audit-logged.'))return;
    try{const {error}=await sb().rpc('admin_clear_exam_choices',{p_student_id:studentId,p_exam_id:Number(e.id)});if(error)throw error;notify('Attempt reset. Saved choices cleared; published academic marks unchanged.','success');await attempts(e.id);}
    catch(x){notify('Reset denied or failed: '+(x.message||x),'error');}
  }
  function bind(){
    $('cwCreate')?.addEventListener('click',createForm);
    $('cwRefresh')?.addEventListener('click',()=>loadExams().then(()=>notify('Exam list refreshed.','success')).catch(e=>notify(e.message||String(e),'error')));
    $('cwSearch')?.addEventListener('input',render);$('cwProgram')?.addEventListener('change',render);
    $('cwRows')?.addEventListener('click',e=>{const a=e.target.closest('[data-edit]'),b=e.target.closest('[data-attempts]');if(a)editForm(a.dataset.edit);if(b)attempts(b.dataset.attempts);});
  }
  async function init(){
    try{
      const p=await permissions();
      if(!p.exam_global_manage&&!p.exam_global_reset)return;
      styles();workspace();
      if(!p.exam_global_manage)$('cwCreate').style.display='none';
      bind();await loadLecturers();await loadExams();
      console.info('Coordinator dashboard enabled by Supabase permission RPC.',p);
    }catch(e){console.warn('Coordinator dashboard disabled (fail closed):',e.message||e);$('nchsmCoordinatorWorkspace')?.remove();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();