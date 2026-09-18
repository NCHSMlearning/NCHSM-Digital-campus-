// NCHSM Lecturer Dashboard — Online Learning module
// Externalized from the lecturer dashboard; uses the existing Supabase client and RLS policies.
window.LecturerOnlineLearning = (() => {
    const state = { assignments: [], submissions: [], targetStudents: [], assignedUnits: [], initialized:false, client:null, userId:null, profile:null, publishAfterSave:false };
    const $ = id => document.getElementById(id);
    const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    function client(){
        if(state.client) return state.client;
        const candidates=[window.supabaseClient,window.supabase,window.db?.supabase,window.lecturerDB?.supabase,window.lecturerDB?.client];
        state.client=candidates.find(x=>x && typeof x.from==='function');
        return state.client;
    }
    async function resolveUser(){
        const p=window.lecturerDB?.getCurrentUserProfile?.() || JSON.parse(localStorage.getItem('userProfile')||'null') || JSON.parse(localStorage.getItem('lecturerData')||'null') || {};
        state.profile=p;
        state.userId=p.user_id || p.auth_user_id || p.id || JSON.parse(localStorage.getItem('staffSession')||'null')?.user_id;
        return state.userId;
    }
    function notify(msg,type='info'){ if(window.showNotification) window.showNotification(msg,type); else alert(msg); }
    function fmtDate(v){ if(!v)return '—'; const d=new Date(v); return isNaN(d)?'—':d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'}); }
    function statusBadge(a){return a.published?'<span class="ol-badge ol-published">PUBLISHED</span>':'<span class="ol-badge ol-draft">DRAFT</span>';}
    async function init(){ if(state.initialized && state.assignments.length) return load(); state.initialized=true; await resolveUser(); await loadTargetOptions(); await load(); }
    async function load(){
        const db=client(); if(!db){ notify('Supabase client is not available. Check lecturer-database.js/config.js.','error'); return; }
        await resolveUser();
        const {data,error}=await db.from('online_assignments').select('*').order('created_at',{ascending:false});
        if(error){ console.error(error); notify('Could not load Online Learning assignments: '+error.message,'error'); return; }
        state.assignments=data||[];
        await loadSubmissions(); renderAssignments(); updateStats(); populateAssignmentFilter();
    }
    function updateStats(){
        const total=state.assignments.length,pub=state.assignments.filter(a=>a.published).length;
        $('olTotal')&&($('olTotal').textContent=total); $('olPublished')&&($('olPublished').textContent=pub); $('olAssignmentBadge')&&($('olAssignmentBadge').textContent=pub);
        $('olSubmissions')&&($('olSubmissions').textContent=state.submissions.length); $('olToReview')&&($('olToReview').textContent=state.submissions.filter(s=>s.review_required || ['submitted','graded'].includes(s.status)&&!s.result_released).length);
    }
    function renderAssignments(){
        const body=$('olAssignmentsTable'); if(!body)return;
        const q=($('olSearch')?.value||'').toLowerCase(), f=$('olStatusFilter')?.value||'';
        const rows=state.assignments.filter(a=>(!f||(f==='published'?a.published:!a.published)) && (!q||`${a.title} ${a.unit_code} ${a.unit_name}`.toLowerCase().includes(q)));
        if(!rows.length){body.innerHTML='<tr><td colspan="7" class="ol-empty">No assignments found. Click <b>Create Assignment</b> to create the first one.</td></tr>';return;}
        body.innerHTML=rows.map(a=>`<tr><td><b>${esc(a.title)}</b><div style="font-size:11px;color:#94a3b8">${esc(a.assignment_type||'assignment')}</div></td><td>${esc(a.unit_code)}<div style="font-size:11px;color:#64748b">${esc(a.unit_name||'')}</div></td><td>${esc(a.program||'Any')}<div style="font-size:11px;color:#64748b">Intake ${esc(a.intake||a.intake_year||'Any')} · ${esc(a.block||'Any block')}</div></td><td>${fmtDate(a.due_at)}</td><td><span id="olqcount-${a.id}">—</span></td><td>${statusBadge(a)}</td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="ol-btn ol-muted" onclick="LecturerOnlineLearning.editAssignment('${a.id}')">Edit</button>${a.published?`<button class="ol-btn ol-warning" onclick="LecturerOnlineLearning.togglePublish('${a.id}',false)">Unpublish</button>`:`<button class="ol-btn ol-success" onclick="LecturerOnlineLearning.togglePublish('${a.id}',true)">Publish</button>`}<button class="ol-btn ol-danger" onclick="LecturerOnlineLearning.deleteAssignment('${a.id}')">Delete</button></div></td></tr>`).join('');
        rows.forEach(a=>loadQuestionCount(a.id));
    }
    async function loadQuestionCount(id){ const db=client(); const {count}=await db.from('online_assignment_questions').select('*',{count:'exact',head:true}).eq('assignment_id',id); const el=$(`olqcount-${id}`); if(el)el.textContent=count??0; }
    function populateAssignmentFilter(){const s=$('olSubmissionAssignmentFilter');if(!s)return;const cur=s.value;s.innerHTML='<option value="">All assignments</option>'+state.assignments.map(a=>`<option value="${esc(a.id)}">${esc(a.title)}</option>`).join('');s.value=cur;}
    async function loadSubmissions(){
        const db=client();if(!db)return; const filter=$('olSubmissionAssignmentFilter')?.value;
        let q=db.from('online_submissions').select('*, online_assignments(title,unit_code)').order('submitted_at',{ascending:false}); if(filter)q=q.eq('assignment_id',filter);
        const {data,error}=await q; if(error){console.warn('Submission load:',error.message);state.submissions=[];}else state.submissions=data||[];
        const body=$('olSubmissionsTable');if(!body)return; if(!state.submissions.length){body.innerHTML='<tr><td colspan="7" class="ol-empty">No student submissions yet.</td></tr>';updateStats();return;}
        // Resolve profile names through consolidated_user_profiles_table. RLS should permit lecturers/admins.
        const ids=[...new Set(state.submissions.map(s=>s.student_id).filter(Boolean))]; let profiles=[];
        if(ids.length){const r=await db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,email').in('user_id',ids);profiles=r.data||[];}
        const map=new Map(profiles.map(p=>[p.user_id,p]));
        body.innerHTML=state.submissions.map(s=>{const p=map.get(s.student_id)||{};const mark=s.marks_obtained==null?'—':`${s.marks_obtained}/${s.max_marks||'?'}`;return `<tr><td><b>${esc(p.full_name||'Student')}</b><div style="font-size:11px;color:#64748b">${esc(p.admission_number||p.student_id||s.student_id||'')}</div></td><td>${esc(s.online_assignments?.title||s.assignment_id)}</td><td>${fmtDate(s.submitted_at)}</td><td>${esc(s.attempt_number||1)}</td><td><b>${mark}</b></td><td><span class="ol-badge ${s.result_released?'ol-returned':s.review_required?'ol-review':'ol-draft'}">${s.result_released?'RELEASED':s.review_required?'REVIEW':'SUBMITTED'}</span></td><td><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.reviewSubmission('${s.id}')">Review</button></td></tr>`}).join('');updateStats();
    }
    function resetQuestionEditors(questions=[]){const c=$('olQuestions');if(!c)return;c.innerHTML='';(questions.length?questions:[{}]).forEach(q=>addQuestionEditor(q));}
    function addQuestionEditor(q={}){const c=$('olQuestions');if(!c)return;const n=c.children.length+1;const d=document.createElement('div');d.className='ol-q';d.dataset.index=n;d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>Question ${n}</b><button type="button" class="ol-btn ol-danger" onclick="this.closest('.ol-q').remove();LecturerOnlineLearning.renumberQuestions()"><i class="fas fa-trash"></i></button></div><div class="ol-form" style="margin-top:10px"><div class="ol-full"><label>Question *</label><textarea class="ol-q-text" rows="3" required>${esc(q.question_text||'')}</textarea></div><div><label>Type *</label><select class="ol-q-type"><option value="mcq" ${q.question_type==='mcq'?'selected':''}>MCQ</option><option value="true_false" ${q.question_type==='true_false'?'selected':''}>True / False</option><option value="short_answer" ${q.question_type==='short_answer'?'selected':''}>Short Answer</option><option value="case_study" ${q.question_type==='case_study'?'selected':''}>Case Study</option></select></div><div><label>Marks *</label><input class="ol-q-marks" type="number" min="0.1" step="0.1" value="${esc(q.marks??1)}"></div><div class="ol-full"><label>Options (MCQ only, one per line)</label><textarea class="ol-q-options" rows="3" placeholder="A. ...\nB. ...\nC. ...\nD. ...">${esc(Array.isArray(q.options)?q.options.join('\n'):(q.options||''))}</textarea></div><div><label>Correct Answer / Expected Answer</label><input class="ol-q-correct" value="${esc(q.correct_answer||'')}"></div><div><label>Accepted Answers (comma separated)</label><input class="ol-q-accepted" value="${esc(Array.isArray(q.accepted_answers)?q.accepted_answers.join(', '):(q.accepted_answers||''))}"></div><div><label>Keywords (comma separated)</label><input class="ol-q-keywords" value="${esc(Array.isArray(q.keywords)?q.keywords.join(', '):(q.keywords||''))}"></div><div><label>Keyword Marks</label><input class="ol-q-keywordmarks" type="number" min="0" step="0.1" value="${esc(q.keyword_marks??0)}"></div></div>`;c.appendChild(d);}
    function renumberQuestions(){document.querySelectorAll('#olQuestions .ol-q').forEach((q,i)=>q.querySelector('b').textContent='Question '+(i+1));}
    function collectQuestions(){return [...document.querySelectorAll('#olQuestions .ol-q')].map((el,i)=>{const type=el.querySelector('.ol-q-type').value;const opts=el.querySelector('.ol-q-options').value.split('\n').map(x=>x.trim()).filter(Boolean);return {question_order:i+1,question_text:el.querySelector('.ol-q-text').value.trim(),question_type:type,marks:Number(el.querySelector('.ol-q-marks').value)||1,options:type==='mcq'?opts:null,correct_answer:el.querySelector('.ol-q-correct').value.trim()||null,accepted_answers:el.querySelector('.ol-q-accepted').value.split(',').map(x=>x.trim()).filter(Boolean),keywords:el.querySelector('.ol-q-keywords').value.split(',').map(x=>x.trim()).filter(Boolean),keyword_marks:Number(el.querySelector('.ol-q-keywordmarks').value)||0};}).filter(q=>q.question_text);}
    function normalizeKey(v){ return String(v ?? '').trim(); }
    function studentProgram(s){ return normalizeKey(s.program || s.program_code || s.program_name || ''); }
    function studentIntake(s){ return normalizeKey(s.intake_year || s.admission_year || s.intake || ''); }
    function studentBlock(s){ return normalizeKey(s.block || s.current_block || s.block_term || s.term || ''); }
    function isStudentEligible(s){ return String(s.role||'').toLowerCase()==='student' && ['active','approved'].includes(String(s.status||'').toLowerCase()); }
    function prettyBlock(v){
        const x=normalizeKey(v); if(!x)return 'All blocks';
        const m=x.match(/^Y(\d+)T(\d+)$/i);
        if(m){ const names={1:'First',2:'Second',3:'Third'}; return `Year ${m[1]} ${names[m[2]]||`Term ${m[2]}`} Term (${x})`; }
        return x;
    }
    async function loadTargetOptions(){
        const db=client(); if(!db)return;
        const p=state.profile||{};
        const program=normalizeKey(p.program||p.program_code||'');
        let q=db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,program,program_type,intake_year,admission_year,block,current_block,status,role');
        q=q.eq('role','student').in('status',['active','approved']);
        if(program && String(p.department||'').toUpperCase()!=='TVET') q=q.eq('program',program);
        else if(String(p.department||'').toUpperCase()==='TVET') q=q.eq('program_type','TVET');
        const {data,error}=await q.order('full_name',{ascending:true});
        if(error){ console.error('Online Learning target lookup:',error); state.targetStudents=[]; notify('Could not load student intake/block options: '+error.message,'error'); return; }
        state.targetStudents=(data||[]).filter(isStudentEligible);
        populateTargetSelects();
        console.log(`🎯 Online Learning: ${state.targetStudents.length} eligible students used for target options`);
    }
    function populateTargetSelects(selected={}){
        const programEl=$('olProgram'), intakeEl=$('olIntake'), blockEl=$('olBlock'); if(!programEl||!intakeEl||!blockEl)return;
        const p=state.profile||{};
        const programs=[...new Set(state.targetStudents.map(studentProgram).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        const selectedProgram=normalizeKey(selected.program ?? programEl.value ?? p.program ?? '');
        const programValues=programs.length?programs:[selectedProgram].filter(Boolean);
        if(programEl.tagName==='SELECT'){
            programEl.innerHTML='<option value="">Select program</option>'+programValues.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
            if(selectedProgram && programValues.includes(selectedProgram)) programEl.value=selectedProgram;
        }
        const effectiveProgram=normalizeKey(programEl.value||selectedProgram);
        const byProgram=state.targetStudents.filter(s=>!effectiveProgram||studentProgram(s)===effectiveProgram);
        const intakes=[...new Set(byProgram.map(studentIntake).filter(Boolean))].sort((a,b)=>String(b).localeCompare(String(a),undefined,{numeric:true}));
        const selectedIntake=normalizeKey(selected.intake ?? intakeEl.value ?? p.intake_year ?? p.admission_year ?? '');
        if(intakeEl.tagName==='SELECT'){
            intakeEl.innerHTML='<option value="">Select intake</option>'+intakes.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
            if(selectedIntake && intakes.includes(selectedIntake)) intakeEl.value=selectedIntake;
        }
        const effectiveIntake=normalizeKey(intakeEl.value||selectedIntake);
        const byIntake=byProgram.filter(s=>!effectiveIntake||studentIntake(s)===effectiveIntake);
        const blocks=[...new Set(byIntake.map(studentBlock).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
        const selectedBlock=normalizeKey(selected.block ?? blockEl.value ?? p.block ?? p.current_block ?? '');
        if(blockEl.tagName==='SELECT'){
            blockEl.innerHTML='<option value="">All blocks / terms</option>'+blocks.map(v=>`<option value="${esc(v)}">${esc(prettyBlock(v))}</option>`).join('');
            if(selectedBlock && blocks.includes(selectedBlock)) blockEl.value=selectedBlock;
        }
    }
    function bindTargetSelectors(){
        const p=$('olProgram'),i=$('olIntake'),b=$('olBlock');
        if(!p||!i||!b)return;
        if(p.dataset.olBound)return; p.dataset.olBound='1';
        p.addEventListener('change',()=>populateTargetSelects({program:p.value,intake:'',block:''}));
        i.addEventListener('change',()=>populateTargetSelects({program:p.value,intake:i.value,block:''}));
    }
    async function fillProfileDefaults(){
        const p=state.profile||{}; bindTargetSelectors(); populateTargetSelects({program:p.program||p.program_type||'',intake:p.intake_year||p.admission_year||'',block:p.block||p.current_block||''});
    }
    function targetHasStudents(program,intake,block){
        const P=normalizeKey(program), I=normalizeKey(intake), B=normalizeKey(block);
        return state.targetStudents.some(s=>studentProgram(s)===P && studentIntake(s)===I && (!B || studentBlock(s)===B));
    }
    async function openAssignmentModal(a=null){$('olAssignmentId').value=a?.id||'';$('olAssignmentModalTitle').textContent=a?'Edit Assignment':'Create Assignment';$('olTitle').value=a?.title||'';$('olType').value=a?.assignment_type||'assignment';$('olUnitCode').value=a?.unit_code||'';$('olUnitName').value=a?.unit_name||'';$('olProgram').value=a?.program||'';$('olIntake').value=a?.intake||a?.intake_year||'';$('olBlock').value=a?.block||'';$('olDueAt').value=a?.due_at?new Date(a.due_at).toISOString().slice(0,16):'';$('olMaxMarks').value=a?.max_marks||20;$('olMaxAttempts').value=a?.max_attempts||1;$('olInstructions').value=a?.instructions||'';$('olAllowUpload').checked=a?.allow_document_upload!==false;$('olAllowResubmit').checked=!!a?.allow_resubmission;bindTargetSelectors();populateTargetSelects({program:a?.program||'',intake:a?.intake||a?.intake_year||'',block:a?.block||''});if(!a)await fillProfileDefaults();$('olAssignmentModal').style.display='flex';resetQuestionEditors([]);}
    async function editAssignment(id){const a=state.assignments.find(x=>x.id===id);if(!a)return;const db=client();const {data}=await db.from('online_assignment_questions').select('*').eq('assignment_id',id).order('question_order');openAssignmentModal(a);resetQuestionEditors(data||[]);}
    async function saveAssignment(e,forcePublish=false){e?.preventDefault();const db=client();if(!db)return false;await resolveUser();if(!state.userId){notify('Lecturer user ID could not be resolved.','error');return false;}
        const id=$('olAssignmentId').value; const targetProgram=$('olProgram').value.trim(); const targetIntake=$('olIntake').value.trim(); const targetBlock=$('olBlock').value.trim()||null; if(!targetProgram||!targetIntake){notify('Select a program and intake that exist among current students.','warning');return false;} if(!targetHasStudents(targetProgram,targetIntake,targetBlock)){notify('The selected program/intake/block combination does not match any active student. Choose a target from the available Supabase student data.','warning');return false;} const payload={title:$('olTitle').value.trim(),assignment_type:$('olType').value,unit_code:$('olUnitCode').value.trim(),unit_name:$('olUnitName').value.trim()||null,program:targetProgram,intake:targetIntake,block:targetBlock,due_at:($('olDueAt').value ? new Date($('olDueAt').value).toISOString() : null),max_marks:Number($('olMaxMarks').value),max_attempts:Number($('olMaxAttempts').value)||1,instructions:$('olInstructions').value.trim()||null,allow_document_upload:$('olAllowUpload').checked,allow_resubmission:$('olAllowResubmit').checked,published:!!forcePublish};
        let assignment,err;if(id){ const existing=state.assignments.find(a=>a.id===id); if(existing && !forcePublish) payload.published=!!existing.published; const r=await db.from('online_assignments').update(payload).eq('id',id).select().single(); assignment=r.data; err=r.error; }else{ payload.created_by=state.userId; const r=await db.from('online_assignments').insert(payload).select().single(); assignment=r.data; err=r.error; }if(err){console.error(err);notify('Could not save assignment: '+err.message,'error');return false;}
        await db.from('online_assignment_questions').delete().eq('assignment_id',assignment.id);const qs=collectQuestions();if(qs.length){const rows=qs.map(q=>({...q,assignment_id:assignment.id}));const r=await db.from('online_assignment_questions').insert(rows);if(r.error){notify('Assignment saved, but questions failed: '+r.error.message,'warning');return false;}}
        closeModal('olAssignmentModal');notify(forcePublish?'Assignment published.':'Assignment saved as draft.','success');await load();return true;
    }
    async function saveAndPublish(){return saveAssignment(null,true);}
    async function togglePublish(id,publish){const db=client();const {error}=await db.from('online_assignments').update({published:publish}).eq('id',id);if(error)notify(error.message,'error');else{notify(publish?'Published to eligible students.':'Assignment unpublished.','success');load();}}
    async function deleteAssignment(id){if(!confirm('Delete this assignment and its questions? This should only be done before student submissions exist.'))return;const db=client();const {error}=await db.from('online_assignments').delete().eq('id',id);if(error)notify(error.message,'error');else{notify('Assignment deleted.','success');load();}}
    async function reviewSubmission(id){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;let questions=[];const qr=await db.from('online_assignment_questions').select('id,question_order,question_text,question_type,marks').eq('assignment_id',s.assignment_id).order('question_order');questions=qr.data||[];const answers=s.answers||{};const profiles=await db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,email').eq('user_id',s.student_id).maybeSingle();const p=profiles.data||{};const body=$('olSubmissionBody');body.innerHTML=`<div class="ol-submission-grid"><div><h3 style="margin-top:0">${esc(s.online_assignments?.title||'Submission')}</h3><p style="color:#64748b">${esc(p.full_name||'Student')} · ${esc(p.admission_number||p.student_id||'')}</p><div>${questions.length?questions.map((q,i)=>`<div class="ol-q"><b>Q${i+1}. ${esc(q.question_text)}</b><div style="margin-top:8px;background:#f8fafc;padding:10px;border-radius:8px;white-space:pre-wrap">${esc(answers[q.id]??answers[String(q.id)]??'No answer')}</div><small style="color:#64748b">${q.marks} marks</small></div>`).join(''):'<div class="ol-empty">No structured questions. Review the uploaded document if provided.</div>'}</div></div><div><div class="ol-card" style="margin:0"><div style="color:#64748b;font-size:12px">CURRENT MARK</div><div class="ol-mark">${s.marks_obtained??0}/${s.max_marks??'—'}</div><label>Marks Awarded</label><input id="olReviewMarks" type="number" min="0" step="0.01" value="${s.marks_obtained??0}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px"><label style="display:block;margin-top:12px">Feedback</label><textarea id="olReviewFeedback" rows="6" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px">${esc(s.feedback||'')}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',false)">Save Grade</button><button class="ol-btn ol-success" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',true)">Grade & Release</button></div>${s.file_path?`<p style="font-size:12px;color:#64748b;margin-top:15px"><i class="fas fa-paperclip"></i> ${esc(s.file_name||'Uploaded document')}</p>`:''}</div></div></div>`;$('olSubmissionModal').style.display='flex';}
    async function gradeSubmission(id,release){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;const marks=Number($('olReviewMarks').value);const max=Number(s.max_marks);if(!Number.isFinite(marks)||marks<0||(Number.isFinite(max)&&marks>max)){notify(`Marks must be between 0 and ${Number.isFinite(max)?max:'the maximum mark'}.`,'error');return;}const feedback=$('olReviewFeedback').value.trim()||null;const {error}=await db.from('online_submissions').update({marks_obtained:marks,feedback,status:'graded',graded_by:state.userId,graded_at:new Date().toISOString(),result_released:release,released_at:release?new Date().toISOString():null,review_required:false}).eq('id',id);if(error){notify(error.message,'error');return;}notify(release?'Grade saved and result released.':'Grade saved.','success');closeModal('olSubmissionModal');await loadSubmissions();updateStats();}
    function closeModal(id){const m=$(id);if(m)m.style.display='none';}
    return {init,load,renderAssignments,loadSubmissions,openAssignmentModal,editAssignment,saveAssignment,saveAndPublish,addQuestionEditor,renumberQuestions,togglePublish,deleteAssignment,reviewSubmission,gradeSubmission,closeModal,loadTargetOptions};
})();
console.log('✅ Lecturer Online Learning module loaded');


/* ============================================================
   NCHSM ONLINE LEARNING — STUDENT TARGET DROPDOWNS
   Final browser-safe patch
   Source: consolidated_user_profiles_table
   ============================================================ */
(function () {
    'use strict';

    function getSB() {
        const candidates = [
            window.supabaseClient,
            window.supabase,
            window.lecturerDB && window.lecturerDB.supabase
        ];
        return candidates.find(c => c && typeof c.from === 'function') || null;
    }

    function el(id) { return document.getElementById(id); }

    function setSelect(select, items, placeholder) {
        if (!select) return;
        const old = select.value;
        select.innerHTML = '';
        const first = document.createElement('option');
        first.value = '';
        first.textContent = placeholder;
        select.appendChild(first);

        [...new Set(items.filter(v => v !== null && v !== undefined && String(v).trim() !== '').map(String))]
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .forEach(v => {
                const option = document.createElement('option');
                option.value = v;
                option.textContent = v;
                select.appendChild(option);
            });

        if ([...select.options].some(o => o.value === old)) select.value = old;
    }

    function studentProgram(s) {
        return String(s.program || s.program_type || s.department || '').trim();
    }

    function studentIntake(s) {
        return String(s.intake_year || s.admission_year || '').trim();
    }

    function studentBlock(s) {
        return String(s.block || s.current_block || '').trim();
    }

    async function loadStudentTargetOptions() {
        const program = el('olProgram');
        const intake = el('olIntake');
        const block = el('olBlock');
        if (!program || !intake || !block) return;

        const sb = getSB();
        if (!sb) {
            console.error('Online Learning: Supabase client unavailable for target dropdowns.');
            return;
        }

        try {
            const { data, error } = await sb
                .from('consolidated_user_profiles_table')
                .select('program,program_type,department,intake_year,admission_year,block,current_block')
                .eq('role', 'student')
                .in('status', ['active', 'approved']);

            if (error) throw error;

            const students = data || [];
            const programs = students.map(studentProgram);

            const currentProgram = program.value;
            setSelect(program, programs, '-- Select Program --');

            if (currentProgram && [...program.options].some(o => o.value === currentProgram)) {
                program.value = currentProgram;
            } else if (program.options.length === 2) {
                program.selectedIndex = 1;
            }

            function refreshIntakes() {
                const p = program.value;
                const rows = students.filter(s => !p || studentProgram(s) === p);
                const current = intake.value;
                setSelect(intake, rows.map(studentIntake), '-- Select Intake Year --');
                if (current && [...intake.options].some(o => o.value === current)) intake.value = current;
                refreshBlocks();
            }

            function refreshBlocks() {
                const p = program.value;
                const i = intake.value;
                const rows = students.filter(s =>
                    (!p || studentProgram(s) === p) &&
                    (!i || studentIntake(s) === i)
                );
                const current = block.value;
                setSelect(block, rows.map(studentBlock), '-- Select Block / Term --');
                if (current && [...block.options].some(o => o.value === current)) block.value = current;
            }

            program.onchange = refreshIntakes;
            intake.onchange = refreshBlocks;

            refreshIntakes();

            // Keep the assignment form deterministic: these are selections only.
            [program, intake, block].forEach(select => {
                select.setAttribute('readonly', 'readonly');
                select.setAttribute('aria-readonly', 'true');
            });

            console.log('✅ Student target dropdowns loaded:', {
                programs: program.options.length - 1,
                intakes: intake.options.length - 1,
                blocks: block.options.length - 1
            });
        } catch (err) {
            console.error('❌ Failed loading student target dropdowns:', err);
        }
    }

    // Convert the existing three fields to SELECT controls if the HTML still has INPUTs.
    function convertTargetFields() {
        const definitions = [
            ['olProgram', '-- Select Program --'],
            ['olIntake', '-- Select Intake Year --'],
            ['olBlock', '-- Select Block / Term --']
        ];

        definitions.forEach(([id, placeholder]) => {
            const old = el(id);
            if (!old || old.tagName === 'SELECT') return;

            const select = document.createElement('select');
            select.id = id;
            select.name = old.name || id;
            select.className = old.className || '';
            select.required = old.required;
            select.style.cssText = old.style.cssText;
            select.innerHTML = `<option value="">${placeholder}</option>`;
            old.replaceWith(select);
        });
    }

    function initTargetDropdowns() {
        convertTargetFields();
        if (el('olProgram') && el('olIntake') && el('olBlock')) {
            loadStudentTargetOptions();
        }
    }

    window.NCHSMOnlineLearningTargetDropdowns = {
        init: initTargetDropdowns,
        reload: loadStudentTargetOptions
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTargetDropdowns);
    } else {
        initTargetDropdowns();
    }
})();
