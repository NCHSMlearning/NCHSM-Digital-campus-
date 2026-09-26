/* NCHSM Lecturer Online Learning — integrated latest Research workflow + Assignment Targeting */
// NCHSM Lecturer Dashboard — Online Learning module
// Externalized from the lecturer dashboard; uses the existing Supabase client and RLS policies.
// NCHSM Lecturer Dashboard — Online Learning module
// Externalized from the lecturer dashboard; uses the existing Supabase client and RLS policies.
window.LecturerOnlineLearning = (() => {
    const state = { assignments: [], submissions: [], initialized:false, client:null, userId:null, profile:null, publishAfterSave:false };
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
    function formatPercentage(marks,maxMarks){const m=Number(marks),mx=Number(maxMarks);if(!Number.isFinite(m)||!Number.isFinite(mx)||mx<=0)return '—';return `${Math.round(Math.max(0,Math.min(100,(m/mx)*100))*100)/100}%`;}
    function clampMarks(marks,maxMarks){const m=Number(marks),mx=Number(maxMarks);return Number.isFinite(mx)&&mx>0?Math.max(0,Math.min(Number.isFinite(m)?m:0,mx)):Math.max(0,Number.isFinite(m)?m:0);}
    function statusBadge(a){return a.published?'<span class="ol-badge ol-published">PUBLISHED</span>':'<span class="ol-badge ol-draft">DRAFT</span>';}
    async function init(){ if(state.initialized && state.assignments.length){ wireAssignmentTargeting(); await load(); setTimeout(initResearch,150); return; } state.initialized=true; await resolveUser(); wireAssignmentTargeting(); await load(); setTimeout(initResearch,150); }
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
    function resolveSubmissionMaxMarks(submission,assignment={}){
        const candidates=[
            submission?.max_marks,
            assignment?.max_marks,
            assignment?.marking_key?.max_marks,
            submission?.online_assignments?.max_marks,
            window._activeSubmissionMarkingKey?.max_marks
        ];
        for(const value of candidates){
            const n=Number(value);
            if(Number.isFinite(n)&&n>0) return n;
        }
        return 0;
    }

    async function syncSubmissionMaximumMarks(){
        const db=client();
        if(!db || !Array.isArray(state.submissions) || !state.submissions.length) return;
        const updates=[];
        for(const s of state.submissions){
            const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
            const maxMarks=resolveSubmissionMaxMarks(s,assignment);
            if(maxMarks>0 && Number(s.max_marks)!==maxMarks){
                updates.push({id:s.id,max_marks:maxMarks});
            }
        }
        for(const item of updates){
            const r=await db.from('online_submissions').update({max_marks:item.max_marks}).eq('id',item.id);
            if(r.error) console.warn('Could not backfill submission max_marks:',r.error.message);
            else {
                const local=state.submissions.find(s=>s.id===item.id);
                if(local) local.max_marks=item.max_marks;
            }
        }
    }

    async function loadSubmissions(){
        const db=client();if(!db)return; const filter=$('olSubmissionAssignmentFilter')?.value;
        let q=db.from('online_submissions').select('*, online_assignments(title,unit_code)').order('submitted_at',{ascending:false}); if(filter)q=q.eq('assignment_id',filter);
        const {data,error}=await q; if(error){console.warn('Submission load:',error.message);state.submissions=[];}else state.submissions=data||[];
        await syncSubmissionMaximumMarks();
        const body=$('olSubmissionsTable');if(!body)return; if(!state.submissions.length){body.innerHTML='<tr><td colspan="7" class="ol-empty">No student submissions yet.</td></tr>';updateStats();return;}
        // Resolve profile names through consolidated_user_profiles_table. RLS should permit lecturers/admins.
        const ids=[...new Set(state.submissions.map(s=>s.student_id).filter(Boolean))]; let profiles=[];
        if(ids.length){const r=await db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,email').in('user_id',ids);profiles=r.data||[];}
        const map=new Map(profiles.map(p=>[p.user_id,p]));
        body.innerHTML=state.submissions.map(s=>{
            const p=map.get(s.student_id)||{};
            const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
            const maxMarks=resolveSubmissionMaxMarks(s,assignment);
            const mark=s.marks_obtained==null?'—':`${s.marks_obtained}/${maxMarks||'?'}`;
            const pct=s.marks_obtained==null?'—':formatPercentage(s.marks_obtained,maxMarks);
            return `<tr><td><b>${esc(p.full_name||'Student')}</b><div style="font-size:11px;color:#64748b">${esc(p.admission_number||p.student_id||s.student_id||'')}</div></td><td>${esc(s.online_assignments?.title||assignment.title||s.assignment_id)}</td><td>${fmtDate(s.submitted_at)}</td><td>${esc(s.attempt_number||1)}</td><td><b>${mark}</b><div style="font-size:11px;color:#64748b;margin-top:2px">${pct}</div></td><td><span class="ol-badge ${s.result_released?'ol-returned':s.review_required?'ol-review':'ol-draft'}">${s.result_released?'RELEASED':s.review_required?'REVIEW':'SUBMITTED'}</span></td><td><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.reviewSubmission('${s.id}')">Review</button></td></tr>`;
        }).join('');updateStats();
    }
    function resetQuestionEditors(questions=[]){const c=$('olQuestions');if(!c)return;c.innerHTML='';(questions.length?questions:[{}]).forEach(q=>addQuestionEditor(q));}
    function addQuestionEditor(q={}){const c=$('olQuestions');if(!c)return;const n=c.children.length+1;const d=document.createElement('div');d.className='ol-q';d.dataset.index=n;d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>Question ${n}</b><button type="button" class="ol-btn ol-danger" onclick="this.closest('.ol-q').remove();LecturerOnlineLearning.renumberQuestions()"><i class="fas fa-trash"></i></button></div><div class="ol-form" style="margin-top:10px"><div class="ol-full"><label>Question *</label><textarea class="ol-q-text" rows="3" required>${esc(q.question_text||'')}</textarea></div><div><label>Type *</label><select class="ol-q-type"><option value="mcq" ${q.question_type==='mcq'?'selected':''}>MCQ</option><option value="true_false" ${q.question_type==='true_false'?'selected':''}>True / False</option><option value="short_answer" ${q.question_type==='short_answer'?'selected':''}>Short Answer</option><option value="case_study" ${q.question_type==='case_study'?'selected':''}>Case Study</option></select></div><div><label>Marks *</label><input class="ol-q-marks" type="number" min="0.1" step="0.1" value="${esc(q.marks??1)}"></div><div class="ol-full"><label>Options (MCQ only, one per line)</label><textarea class="ol-q-options" rows="3" placeholder="A. ...\nB. ...\nC. ...\nD. ...">${esc(Array.isArray(q.options)?q.options.join('\n'):(q.options||''))}</textarea></div><div><label>Correct Answer / Expected Answer</label><input class="ol-q-correct" value="${esc(q.correct_answer||'')}"></div><div><label>Accepted Answers (comma separated)</label><input class="ol-q-accepted" value="${esc(Array.isArray(q.accepted_answers)?q.accepted_answers.join(', '):(q.accepted_answers||''))}"></div><div><label>Keywords (comma separated)</label><input class="ol-q-keywords" value="${esc(Array.isArray(q.keywords)?q.keywords.join(', '):(q.keywords||''))}"></div><div><label>Keyword Marks</label><input class="ol-q-keywordmarks" type="number" min="0" step="0.1" value="${esc(q.keyword_marks??0)}"></div></div>`;c.appendChild(d);}
    function renumberQuestions(){document.querySelectorAll('#olQuestions .ol-q').forEach((q,i)=>q.querySelector('b').textContent='Question '+(i+1));}
    function collectQuestions(){return [...document.querySelectorAll('#olQuestions .ol-q')].map((el,i)=>{const type=el.querySelector('.ol-q-type').value;const opts=el.querySelector('.ol-q-options').value.split('\n').map(x=>x.trim()).filter(Boolean);return {question_order:i+1,question_text:el.querySelector('.ol-q-text').value.trim(),question_type:type,marks:Number(el.querySelector('.ol-q-marks').value)||1,options:type==='mcq'?opts:null,correct_answer:el.querySelector('.ol-q-correct').value.trim()||null,accepted_answers:el.querySelector('.ol-q-accepted').value.split(',').map(x=>x.trim()).filter(Boolean),keywords:el.querySelector('.ol-q-keywords').value.split(',').map(x=>x.trim()).filter(Boolean),keyword_marks:Number(el.querySelector('.ol-q-keywordmarks').value)||0};}).filter(q=>q.question_text);}
    // ============================================================
    // ASSIGNMENT TARGETING — PROGRAM / INTAKE / BLOCK
    // Loads real active student targeting data from
    // consolidated_user_profiles_table instead of relying on the
    // lecturer profile. Program, intake and block are cascading.
    // ============================================================
    const targetingState = { rows: [], programs: [], intakes: [], blocks: [], loaded:false };

    function normalizeTarget(v){ return String(v ?? '').trim(); }
    function uniqueSorted(values){
        return [...new Set(values.map(normalizeTarget).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
    }
    function populateSelect(id, values, placeholder, selected=''){
        const el=$(id); if(!el) return;
        const current=normalizeTarget(selected || el.value);
        el.innerHTML=`<option value="">${esc(placeholder)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
        if(current && values.some(v=>normalizeTarget(v)===current)) el.value=current;
    }
    function getStudentTargetRows(){ return Array.isArray(targetingState.rows) ? targetingState.rows : []; }
    function refreshIntakesForProgram(selectedIntake=''){
        const program=normalizeTarget($('olProgram')?.value);
        const rows=getStudentTargetRows().filter(r=>!program || normalizeTarget(r.program)===program);
        const values=uniqueSorted(rows.map(r=>r.intake_year));
        targetingState.intakes=values;
        populateSelect('olIntake',values,values.length?'Select intake':'No intakes found',selectedIntake);
        refreshBlocksForProgramIntake('');
    }
    function refreshBlocksForProgramIntake(selectedBlock=''){
        const program=normalizeTarget($('olProgram')?.value);
        const intake=normalizeTarget($('olIntake')?.value);
        const rows=getStudentTargetRows().filter(r=>(!program || normalizeTarget(r.program)===program)&&(!intake || normalizeTarget(r.intake_year)===intake));
        const values=uniqueSorted(rows.map(r=>r.block));
        targetingState.blocks=values;
        populateSelect('olBlock',values,'All blocks / terms',selectedBlock);
    }
    async function loadAssignmentTargeting(preferred={}){
        const db=client(); if(!db) return false;
        const programEl=$('olProgram'), intakeEl=$('olIntake'), blockEl=$('olBlock');
        if(!programEl || !intakeEl || !blockEl) return false;
        programEl.disabled=true; intakeEl.disabled=true; blockEl.disabled=true;
        programEl.innerHTML='<option value="">Loading programs...</option>';
        intakeEl.innerHTML='<option value="">Loading intakes...</option>';
        blockEl.innerHTML='<option value="">Loading blocks...</option>';
        try{
            // Do not assume a separate students table. This is the same
            // consolidated profile source used by the Online Learning UI.
            let result=await db.from('consolidated_user_profiles_table')
                .select('program,intake_year,block,role,is_active');
            if(result.error){
                console.warn('Targeting query with is_active failed; retrying without optional status columns:',result.error.message);
                result=await db.from('consolidated_user_profiles_table').select('program,intake_year,block,role');
            }
            if(result.error) throw result.error;
            let rows=(result.data||[]).map(r=>({
                program:normalizeTarget(r.program),
                intake_year:normalizeTarget(r.intake_year),
                block:normalizeTarget(r.block),
                role:normalizeTarget(r.role).toLowerCase(),
                is_active:r.is_active
            })).filter(r=>r.program || r.intake_year || r.block);
            // Prefer active student rows when role/status data is available.
            const studentRows=rows.filter(r=>!r.role || r.role==='student' || r.role==='learner');
            const activeRows=studentRows.filter(r=>r.is_active===undefined || r.is_active===null || r.is_active===true || String(r.is_active).toLowerCase()==='active');
            if(activeRows.length) rows=activeRows; else if(studentRows.length) rows=studentRows;
            targetingState.rows=rows;
            targetingState.loaded=true;
            targetingState.programs=uniqueSorted(rows.map(r=>r.program));
            const preferredProgram=normalizeTarget(preferred.program);
            const preferredIntake=normalizeTarget(preferred.intake);
            const preferredBlock=normalizeTarget(preferred.block);
            populateSelect('olProgram',targetingState.programs,targetingState.programs.length?'Select program':'No programs found',preferredProgram);
            if(preferredProgram && targetingState.programs.includes(preferredProgram)) $('olProgram').value=preferredProgram;
            refreshIntakesForProgram(preferredIntake);
            if(preferredIntake) $('olIntake').value=preferredIntake;
            refreshBlocksForProgramIntake(preferredBlock);
            if(preferredBlock) $('olBlock').value=preferredBlock;
            programEl.disabled=false; intakeEl.disabled=false; blockEl.disabled=false;
            return true;
        }catch(err){
            console.error('Assignment targeting load failed:',err);
            programEl.disabled=false; intakeEl.disabled=false; blockEl.disabled=false;
            programEl.innerHTML='<option value="">Unable to load programs</option>';
            intakeEl.innerHTML='<option value="">Unable to load intakes</option>';
            blockEl.innerHTML='<option value="">All blocks / terms</option>';
            notify('Could not load Program / Intake / Block from student records: '+(err.message||err),'error');
            return false;
        }
    }
    function wireAssignmentTargeting(){
        const p=$('olProgram'), i=$('olIntake');
        if(p && !p.dataset.targetingBound){
            p.dataset.targetingBound='1';
            p.addEventListener('change',()=>{ refreshIntakesForProgram(); });
        }
        if(i && !i.dataset.targetingBound){
            i.dataset.targetingBound='1';
            i.addEventListener('change',()=>{ refreshBlocksForProgramIntake(); });
        }
    }
    function fillProfileDefaults(){
        const p=state.profile||{};
        const program=normalizeTarget(p.program||p.program_type||p.department||'');
        const intake=normalizeTarget(p.intake_year||p.admission_year||'');
        const block=normalizeTarget(p.block||p.current_block||'');
        if($('olProgram') && program) $('olProgram').value=program;
        if($('olIntake') && intake) $('olIntake').value=intake;
        if($('olBlock') && block) $('olBlock').value=block;
    }
    async function openAssignmentModal(a=null){
        await resolveUser();
        wireAssignmentTargeting();
        const preferred={
            program:a?.program||state.profile?.program||state.profile?.program_type||state.profile?.department||'',
            intake:a?.intake||a?.intake_year||state.profile?.intake_year||state.profile?.admission_year||'',
            block:a?.block||state.profile?.block||state.profile?.current_block||''
        };
        $('olAssignmentId').value=a?.id||'';
        $('olAssignmentModalTitle').textContent=a?'Edit Assignment':'Create Assignment';
        $('olTitle').value=a?.title||'';
        $('olType').value=a?.assignment_type||'assignment';
        $('olUnitCode').value=a?.unit_code||'';
        $('olUnitName').value=a?.unit_name||'';
        $('olDueAt').value=a?.due_at?new Date(a.due_at).toISOString().slice(0,16):'';
        $('olMaxMarks').value=a?.max_marks||20;
        $('olMaxAttempts').value=a?.max_attempts||1;
        $('olInstructions').value=a?.instructions||'';
        $('olAllowUpload').checked=a?.allow_document_upload!==false;
        $('olAllowResubmit').checked=!!a?.allow_resubmission;
        resetQuestionEditors([]);
        $('olAssignmentModal').style.display='flex';
        await loadAssignmentTargeting(preferred);
        await populateAssignmentGradingFields(a);
    }
    async function editAssignment(id){const a=state.assignments.find(x=>x.id===id);if(!a)return;const db=client();const {data}=await db.from('online_assignment_questions').select('*').eq('assignment_id',id).order('question_order');openAssignmentModal(a);resetQuestionEditors(data||[]);}
    async function saveAssignment(e,forcePublish=false){
        e?.preventDefault();
        const db=client(); if(!db)return false;
        await resolveUser();
        if(!state.userId){notify('Lecturer user ID could not be resolved.','error');return false;}

        const id=$('olAssignmentId').value;
        const gradingMode=$('olGradingMode')?.value||'manual';
        const markingKeyId=$('olMarkingKeyId')?.value||null;
        const keywords=parseJsonArray($('olGradingKeywords')?.value||'');
        const expectedTopics=String($('olExpectedTopics')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
        const guidance=$('olGradingGuidance')?.value.trim()||null;

        const dueValue=$('olDueAt').value;
        const dueDate=dueValue?new Date(dueValue):null;
        if(!dueDate || Number.isNaN(dueDate.getTime())){notify('Please enter a valid due date/time.','error');return false;}

        const payload={
            title:$('olTitle').value.trim(),
            assignment_type:$('olType').value,
            unit_code:$('olUnitCode').value.trim(),
            unit_name:$('olUnitName').value.trim()||null,
            program:$('olProgram').value.trim(),
            intake:$('olIntake').value.trim(),
            block:$('olBlock').value.trim()||null,
            due_at:dueDate.toISOString(),
            max_marks:Number($('olMaxMarks').value),
            max_attempts:Number($('olMaxAttempts').value)||1,
            instructions:$('olInstructions').value.trim()||null,
            allow_document_upload:$('olAllowUpload').checked,
            allow_resubmission:$('olAllowResubmit').checked,
            grading_mode:gradingMode,
            marking_key_id:gradingMode==='marking_key'?markingKeyId:null,
            grading_keywords:keywords,
            expected_topics:expectedTopics,
            grading_guidance:guidance,
            created_by:state.userId,
            published:!!forcePublish
        };

        if(gradingMode==='marking_key' && !markingKeyId){
            notify('Select an institutional marking key before saving this assignment.','error');
            return false;
        }
        if(gradingMode==='marking_key'){
            if(!markingKeyState.loaded) await loadMarkingKeys();
            const verified=markingKeyState.keys.find(k=>String(k.id)===String(markingKeyId));
            if(!verified){
                notify('The selected marking key could not be verified from Supabase.','error');
                return false;
            }
            if(String(verified.validation_status||'').toLowerCase()!=='verified'){
                notify('Only a VERIFIED institutional marking key can be used for a marking-key assignment.','error');
                return false;
            }
        }

        let assignment,err;
        if(id){
            const r=await db.from('online_assignments').update(payload).eq('id',id).select().single();
            assignment=r.data;err=r.error;
        }else{
            const r=await db.from('online_assignments').insert(payload).select().single();
            assignment=r.data;err=r.error;
        }
        if(err){console.error(err);notify('Could not save assignment: '+err.message,'error');return false;}

        await db.from('online_assignment_questions').delete().eq('assignment_id',assignment.id);
        const qs=collectQuestions();
        if(qs.length){
            const rows=qs.map(q=>({...q,assignment_id:assignment.id}));
            const r=await db.from('online_assignment_questions').insert(rows);
            if(r.error){notify('Assignment saved, but questions failed: '+r.error.message,'warning');return false;}
        }
        closeModal('olAssignmentModal');
        notify(forcePublish?'Assignment published.':'Assignment saved as draft.','success');
        await load();
        return true;
    }
    async function saveAndPublish(){return saveAssignment(null,true);}
    async function togglePublish(id,publish){const db=client();const {error}=await db.from('online_assignments').update({published:publish}).eq('id',id);if(error)notify(error.message,'error');else{notify(publish?'Published to eligible students.':'Assignment unpublished.','success');load();}}
    async function deleteAssignment(id){if(!confirm('Delete this assignment and its questions? This should only be done before student submissions exist.'))return;const db=client();const {error}=await db.from('online_assignments').delete().eq('id',id);if(error)notify(error.message,'error');else{notify('Assignment deleted.','success');load();}}
    // ============================================================
    // DOCUMENT VIEWER + ACADEMIC INTEGRITY AGENT
    // ============================================================
    function collectSubmissionQuestions(questions,answers){
        return (questions||[]).map((q,i)=>({
            id:q.id, question_order:q.question_order||i+1, question_text:q.question_text||'', question_type:q.question_type||'short_answer',
            marks:Number(q.marks)||0, correct_answer:q.correct_answer||null, accepted_answers:q.accepted_answers||[], keywords:q.keywords||[], keyword_marks:Number(q.keyword_marks)||0,
            answer:answers?.[q.id] ?? answers?.[String(q.id)] ?? ''
        }));
    }
    // ============================================================

    // ============================================================
    // DETERMINISTIC INSTITUTIONAL GRADING WORKSPACE
    // ============================================================
    // No AI / LLM / provider is used anywhere in this grading path.
    // The browser selects the institutional key and submits the document
    // text to the secure Edge Function. The server-side deterministic
    // rubric engine is authoritative. The browser is presentation only.
    // ============================================================

    const markingKeyState = { keys: [], loaded:false };
    const gradingState = {
        submission:null,
        assignment:null,
        key:null,
        criteria:[],
        grades:new Map(),
        automaticReport:null,
        selectedCriterionIndex:0,
        loaded:false
    };

    function parseJsonArray(value){
        if(Array.isArray(value)) return value;
        if(value==null || value==='') return [];
        try{
            const parsed=JSON.parse(value);
            return Array.isArray(parsed)?parsed:[];
        }catch(e){
            return String(value).split(',').map(x=>x.trim()).filter(Boolean);
        }
    }

    function criterionNodes(criteria,parent=''){
        const out=[];
        const mark=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;};
        for(const c of (Array.isArray(criteria)?criteria:[])){
            if(!c || typeof c!=='object') continue;
            const name=String(c.criterion||c.title||c.name||'').trim();
            const description=String(c.description||'').trim();
            const max=mark(c.max_marks) ?? mark(c.marks) ?? mark(c.allocated_marks);
            const path=parent ? `${parent} > ${name}` : name;
            const requirements=Array.isArray(c.requirements) ? c.requirements.map((r,i)=>({
                ...r,
                id:String(r?.id||`requirement_${i+1}`),
                description:String(r?.description||r?.title||r?.name||r?.id||`Requirement ${i+1}`),
                evidence_terms:Array.isArray(r?.evidence_terms)?r.evidence_terms.map(String):
                    Array.isArray(r?.keywords)?r.keywords.map(String):[],
                max_marks:mark(r?.max_marks) ?? mark(r?.marks) ?? mark(r?.allocated_marks),
                weight:Number.isFinite(Number(r?.weight))?Number(r.weight):null
            })):[];
            if(max!==null){
                out.push({criterion:name||path,description,max_marks:max,path,source:c,requirements});
            }else if(Array.isArray(c.subcriteria)){
                out.push(...criterionNodes(c.subcriteria,path));
            }
        }
        return out;
    }

    async function loadMarkingKeys(){
        const db=client(); if(!db)return [];
        const r=await db.from('online_marking_keys')
            .select('id,title,description,max_marks,criteria,keywords,expected_topics,grading_guidance,version,is_active,created_by,grading_schema_version,source_document,source_notes,allocated_marks,validation_status')
            .eq('is_active',true)
            .order('title',{ascending:true});
        if(r.error) throw r.error;
        markingKeyState.keys=r.data||[];
        markingKeyState.loaded=true;
        return markingKeyState.keys;
    }

    function markingKeyVersionsFor(id){
        return markingKeyState.keys.filter(k=>String(k.id)===String(id));
    }

    function renderKeyStatus(key){
        const status=$('olMarkingKeyStatus');
        if(!status)return;
        if(!key){
            status.innerHTML='<span class="ol-badge ol-draft">Not selected</span>';
            return;
        }
        const ok=String(key.validation_status||'').toLowerCase()==='verified';
        status.innerHTML=`<span class="ol-badge ${ok?'ol-published':'ol-review'}">${esc(key.validation_status||'UNVERIFIED')}</span>`;
    }

    async function populateAssignmentGradingFields(a=null){
        const key=$('olMarkingKeyId'), version=$('olMarkingKeyVersion'), mode=$('olGradingMode');
        if(!key)return;
        await loadMarkingKeys();
        const currentId=a?.marking_key_id||'';
        key.innerHTML='<option value="">Select verified marking key</option>'+
            markingKeyState.keys.map(k=>`<option value="${esc(k.id)}">${esc(k.title||'Marking Key')}</option>`).join('');
        key.value=currentId;
        if(version){
            const selected=markingKeyState.keys.find(k=>String(k.id)===String(currentId));
            version.innerHTML=selected?
                `<option value="${esc(selected.version||'1')}">Version ${esc(selected.version||'1')}</option>`:
                '<option value="">Select version</option>';
            version.value=selected?String(selected.version||'1'):'';
        }
        renderKeyStatus(markingKeyState.keys.find(k=>String(k.id)===String(currentId))||null);
        if(mode) mode.value=a?.grading_mode||'manual';

        if(!key.dataset.gradingBound){
            key.dataset.gradingBound='1';
            key.addEventListener('change',()=>{
                const selected=markingKeyState.keys.find(k=>String(k.id)===String(key.value));
                if(version){
                    version.innerHTML=selected?
                        `<option value="${esc(selected.version||'1')}">Version ${esc(selected.version||'1')}</option>`:
                        '<option value="">Select version</option>';
                    version.value=selected?String(selected.version||'1'):'';
                }
                renderKeyStatus(selected);
                if(selected && $('olMaxMarks')) $('olMaxMarks').value=selected.max_marks||$('olMaxMarks').value;
                const validation=$('olMarkingKeyValidation');
                if(validation){
                    const verified=String(selected?.validation_status||'').toLowerCase()==='verified';
                    validation.className='ol-validation '+(verified?'ok':'warn');
                    validation.innerHTML=verified?
                        '<i class="fas fa-circle-check"></i><div>Verified institutional marking key selected.</div>':
                        '<i class="fas fa-circle-info"></i><div>Select a verified marking key before publishing.</div>';
                }
            });
        }
        if(mode && !mode.dataset.gradingBound){
            mode.dataset.gradingBound='1';
            mode.addEventListener('change',()=>{
                const panel=$('olAssignmentMarkingKeyPanel');
                if(panel) panel.style.display=mode.value==='marking_key'?'block':'none';
            });
        }
        const panel=$('olAssignmentMarkingKeyPanel');
        if(panel) panel.style.display=mode?.value==='marking_key'?'block':'block';
    }

    async function getAssignmentGradingConfig(assignment){
        const db=client();
        if(!assignment?.marking_key_id) return {mode:assignment?.grading_mode||'manual',markingKey:null};
        const r=await db.from('online_marking_keys')
            .select('id,title,description,max_marks,criteria,keywords,expected_topics,grading_guidance,version,is_active,created_by,grading_schema_version,source_document,source_notes,allocated_marks,validation_status')
            .eq('id',assignment.marking_key_id).eq('is_active',true).maybeSingle();
        if(r.error) throw r.error;
        return {mode:assignment?.grading_mode||'marking_key',markingKey:r.data||null};
    }

    async function fetchSubmissionMarkingKey(id){
        const s=state.submissions.find(x=>x.id===id);
        if(!s) throw new Error('Submission could not be found.');
        const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
        const cfg=await getAssignmentGradingConfig(assignment);
        if(cfg.mode!=='marking_key'||!cfg.markingKey){
            throw new Error('This assignment does not have an active institutional marking key.');
        }
        gradingState.submission=s;
        gradingState.assignment=assignment;
        gradingState.key=cfg.markingKey;
        gradingState.criteria=criterionNodes(parseJsonArray(cfg.markingKey.criteria));
        window._activeSubmissionMarkingKey=cfg.markingKey;
        window._activeSubmissionMarkingKeyId=cfg.markingKey.id;
        return cfg.markingKey;
    }

    function closeModal(id){
        const el=$(id);
        if(!el)return;
        el.style.display='none';
        el.setAttribute('aria-hidden','true');
        if(id==='olSubmissionModal'){
            gradingState.selectedCriterionIndex=0;
            gradingState.documentText='';
        }
    }

    async function populateGradingWorkspaceKeySelectors(key){
        const keySelect=$('olGradeMarkingKey');
        const versionSelect=$('olGradeMarkingKeyVersion');
        if(!keySelect || !versionSelect || !key)return;
        try{
            const keys=await loadMarkingKeys();
            const matching=keys.filter(k=>String(k.id)===String(key.id));
            keySelect.innerHTML=(matching.length?matching:keys).map(k=>
                `<option value="${esc(k.id)}">${esc(k.title||'Marking Key')} · Version ${esc(k.version||'1')}</option>`
            ).join('');
            keySelect.value=String(key.id);
            versionSelect.innerHTML=`<option value="${esc(key.version||'1')}">Version ${esc(key.version||'1')}</option>`;
            versionSelect.value=String(key.version||'1');
            // A submission inherits the marking key locked to its assignment.
            // Changing it here would make the final RPC inconsistent with the assignment.
            keySelect.disabled=true;
            versionSelect.disabled=true;
            keySelect.title='Marking key is locked to the assignment.';
            versionSelect.title='Version is locked to the assignment marking key.';
        }catch(err){
            console.warn('Could not populate grading-key selectors:',err);
            keySelect.innerHTML=`<option value="${esc(key.id)}">${esc(key.title||'Marking Key')} · Version ${esc(key.version||'1')}</option>`;
            keySelect.value=String(key.id);
            versionSelect.innerHTML=`<option value="${esc(key.version||'1')}">Version ${esc(key.version||'1')}</option>`;
            keySelect.disabled=true;
            versionSelect.disabled=true;
        }
    }

    function renderGradingKeyHeader(key){
        const title=$('olGradeKeyTitle'), meta=$('olGradeKeyMeta'), max=$('olGradeMaxMarks');
        if(title) title.textContent=key?.title||'Marking key not selected';
        if(meta) meta.textContent=key ?
            `Version ${key.version||'1'} · ${key.validation_status||'unverified'} · Institutional rubric` :
            'Select the institutional marking key assigned to this assessment.';
        if(max) max.textContent=key?.max_marks!=null?String(key.max_marks):'—';
        const keySelect=$('olGradeMarkingKey');
        if(keySelect && key) keySelect.value=key.id;
        const version=$('olGradeMarkingKeyVersion');
        if(version){
            version.innerHTML=key?`<option value="${esc(key.version||'1')}">Version ${esc(key.version||'1')}</option>`:'<option value="">Select version</option>';
            if(key)version.value=String(key.version||'1');
        }
    }

    function renderRubricNavigation(){
        const panel=$('olRubricPanel');
        if(!panel)return;
        const grades=gradingState.grades;
        panel.innerHTML=gradingState.criteria.length ? gradingState.criteria.map((c,i)=>{
            const g=grades.get(i);
            const finalMark=g?.final_mark ?? g?.automatic_mark ?? null;
            const complete=finalMark!==null && finalMark!==undefined;
            const max=Number(c.max_marks)||0;
            return `<button type="button" class="ol-rubric-item ${i===gradingState.selectedCriterionIndex?'active':''}" data-rubric-index="${i}" style="display:block;width:100%;text-align:left;border:0;border-radius:9px;padding:10px;margin-bottom:5px;background:${i===gradingState.selectedCriterionIndex?'#f1f5ff':'transparent'};cursor:pointer">
                <div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(c.criterion||`Criterion ${i+1}`)}</strong><span style="font-size:10px;color:${complete?'#059669':'#94a3b8'}">${complete?'✓ ':''}${finalMark??'—'}/${max}</span></div>
                <div style="font-size:10px;color:#64748b;margin-top:3px">${esc(c.description||'')}</div>
            </button>`;
        }).join(''):'<div class="ol-empty" style="padding:35px 10px">No criteria found in this marking key.</div>';
        panel.querySelectorAll('[data-rubric-index]').forEach(btn=>btn.addEventListener('click',()=>{
            gradingState.selectedCriterionIndex=Number(btn.dataset.rubricIndex)||0;
            renderRubricNavigation();
            renderSelectedCriterion();
        }));
        const totalMax=gradingState.criteria.reduce((s,c)=>s+Number(c.max_marks||0),0);
        const done=[...grades.values()].filter(g=>g?.final_mark!==null&&g?.final_mark!==undefined).length;
        if($('olRubricTotal')) $('olRubricTotal').textContent=`${done} / ${gradingState.criteria.length}`;
    }

    function renderSelectedCriterion(){
        const i=gradingState.selectedCriterionIndex;
        const c=gradingState.criteria[i];
        const g=gradingState.grades.get(i)||{};
        if(!c){
            if($('olSelectedCriterionTitle'))$('olSelectedCriterionTitle').textContent='—';
            if($('olEvidencePanel'))$('olEvidencePanel').innerHTML='<div class="ol-empty" style="padding:25px 10px">Select a criterion.</div>';
            return;
        }
        const auto=Number(g.automatic_mark??0), final=Number(g.final_mark??auto);
        const max=Number(c.max_marks)||0;
        if($('olSelectedCriterionTitle'))$('olSelectedCriterionTitle').textContent=c.criterion||`Criterion ${i+1}`;
        if($('olCriterionAutomaticMark'))$('olCriterionAutomaticMark').value=auto;
        if($('olCriterionFinalMark')){
            $('olCriterionFinalMark').value=final;
            $('olCriterionFinalMark').max=max;
        }
        if($('olCriterionProgressText'))$('olCriterionProgressText').textContent=`${final} / ${max}`;
        if($('olCriterionProgressBar'))$('olCriterionProgressBar').style.width=(max?Math.max(0,Math.min(100,final/max*100)):0)+'%';
        if($('olCriterionStatus')) $('olCriterionStatus').textContent=g.manual_adjusted?'MANUAL ADJUSTMENT':(g.evidence?.length?'EVIDENCE FOUND':'NOT GRADED');
        const ep=$('olEvidencePanel');
        if(ep){
            const reqs=g.requirements||[];
            ep.innerHTML=reqs.length?reqs.map(r=>{
                const score=Math.round(Number(r.score||0)*100);
                const marks=Math.round(Number(r.allocated_marks||0)*Number(r.score||0)*100)/100;
                const state=score>=85?'FULL':score>0?'PARTIAL':'NOT DEMONSTRATED';
                return `<div class="ol-evidence-item"><i class="fas ${state==='FULL'?'fa-circle-check':state==='PARTIAL'?'fa-circle-half-stroke':'fa-circle-xmark'}"></i><b>${esc(r.description||r.id)}</b><div style="font-size:10px;color:#64748b;margin-top:3px">${esc(state)} · ${esc(marks)}/${esc(r.allocated_marks||0)}</div>${r.matched?.length?`<div style="font-size:10px;color:#475569;margin-top:3px">Matched: ${esc(r.matched.join(', '))}</div>`:''}${r.evidence_excerpt?`<div style="margin-top:5px;padding:6px;background:#fff;border-radius:6px;font-size:10px;color:#475569">${esc(r.evidence_excerpt)}</div>`:''}</div>`;
            }).join(''):'<div class="ol-empty" style="padding:25px 10px">No evidence report yet. Run Auto Grade.</div>';
        }
        if($('olCriterionComment')) $('olCriterionComment').value=g.comment||'';
    }

    function renderGradingTotals(){
        const max=Number(gradingState.key?.max_marks||gradingState.assignment?.max_marks||100);
        const auto=[...gradingState.grades.values()].reduce((s,g)=>s+Number(g?.automatic_mark||0),0);
        const final=[...gradingState.grades.values()].reduce((s,g)=>s+Number(g?.final_mark??g?.automatic_mark??0),0);
        const autoClamped=Math.min(max,Math.max(0,auto));
        const finalClamped=Math.min(max,Math.max(0,final));
        if($('olAutomaticGradeTotal'))$('olAutomaticGradeTotal').textContent=autoClamped.toFixed(2);
        if($('olAutomaticGradeMax'))$('olAutomaticGradeMax').textContent=max;
        if($('olFinalGradeTotal'))$('olFinalGradeTotal').textContent=finalClamped.toFixed(2);
        if($('olFinalGradeMax'))$('olFinalGradeMax').textContent=max;
        if($('olFinalGradePercentage'))$('olFinalGradePercentage').textContent=(max?((finalClamped/max)*100).toFixed(2):'0.00')+'%';
        if($('olGradeAdjustmentNote')){
            const adjusted=Math.abs(finalClamped-autoClamped)>0.0001;
            $('olGradeAdjustmentNote').style.display=adjusted?'inline':'none';
            $('olGradeAdjustmentNote').textContent=adjusted?'Manual adjustments applied':'';
        }
        return {auto:autoClamped,final:finalClamped,max};
    }


    // ============================================================
    // DOCUMENT VIEWER COMPATIBILITY LAYER
    // ============================================================
    // Assignment uploads use the student portal's assignment-submissions
    // storage bucket. The fallback list keeps older deployments compatible.
    const ONLINE_ASSIGNMENT_BUCKETS = [
        window.NCHSM_ONLINE_LEARNING_BUCKET,
        window.ONLINE_LEARNING_STORAGE_BUCKET,
        window.ASSIGNMENT_SUBMISSIONS_BUCKET,
        'assignment-submissions',
        'online-learning',
        'online_submissions'
    ].filter(Boolean);

    function extOf(name=''){
        const raw=String(name||'').toLowerCase().split('?')[0];
        const ext=raw.includes('.')?raw.split('.').pop():'';
        return ext==='jpeg'?'jpg':ext;
    }

    function loadScriptOnce(src,id){
        return new Promise((resolve,reject)=>{
            if(id && document.getElementById(id)) return resolve();
            const script=document.createElement('script');
            script.src=src;
            if(id)script.id=id;
            script.onload=()=>resolve();
            script.onerror=()=>reject(new Error('Could not load '+src));
            document.head.appendChild(script);
        });
    }

    async function signedDocumentUrl(s){
        const db=client();
        if(!db) throw new Error('Supabase client is unavailable.');
        if(!s?.file_path) throw new Error('No uploaded document is attached to this submission.');

        let lastError=null;
        for(const bucket of [...new Set(ONLINE_ASSIGNMENT_BUCKETS)]){
            try{
                const r=await db.storage.from(bucket).createSignedUrl(s.file_path,3600);
                if(!r.error && r.data?.signedUrl) return r.data.signedUrl;
                lastError=r.error||lastError;
            }catch(e){
                lastError=e;
            }
        }
        throw new Error(lastError?.message || 'Could not create a secure document viewing link.');
    }

    function ensureDocumentViewer(){
        let viewer=$('olDocumentViewer');
        if(viewer)return viewer;

        const styleId='nchsmOnlineDocumentViewerStyles';
        if(!$(styleId)){
            const st=document.createElement('style');
            st.id=styleId;
            st.textContent=`
                #olDocumentViewer{
                    position:fixed;inset:0;z-index:100050;
                    display:none;align-items:center;justify-content:center;
                    padding:12px;background:rgba(15,23,42,.78);
                }
                #olDocumentViewer .ol-document-card{
                    width:min(1400px,98vw);height:min(94vh,980px);
                    background:#fff;border-radius:14px;overflow:hidden;
                    box-shadow:0 25px 80px rgba(0,0,0,.28);
                    display:flex;flex-direction:column;
                }
                #olDocumentViewer .ol-document-head{
                    display:flex;align-items:center;justify-content:space-between;
                    gap:12px;padding:12px 16px;border-bottom:1px solid #e2e8f0;
                    background:#f8fafc;flex:0 0 auto;
                }
                #olDocumentViewer .ol-document-body{
                    flex:1;overflow:auto;background:#eef2f7;padding:10px;
                }
                #olDocumentViewer .ol-document-frame{
                    width:100%;height:100%;min-height:680px;border:0;background:#fff;
                }
                #olDocumentViewer .ol-docx{
                    max-width:900px;margin:0 auto;padding:42px 52px;
                    background:#fff;min-height:100%;line-height:1.65;
                }
            `;
            document.head.appendChild(st);
        }

        viewer=document.createElement('div');
        viewer.id='olDocumentViewer';
        viewer.innerHTML=`
            <div class="ol-document-card">
                <div class="ol-document-head">
                    <div>
                        <b id="olDocumentTitle">Uploaded Work</b>
                        <div id="olDocumentMeta" style="font-size:11px;color:#64748b;margin-top:2px"></div>
                    </div>
                    <div style="display:flex;gap:6px">
                        <button type="button" class="ol-btn ol-muted" id="olDocumentDownload">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button type="button" class="ol-btn ol-danger" id="olDocumentClose">
                            <i class="fas fa-xmark"></i> Close
                        </button>
                    </div>
                </div>
                <div class="ol-document-body" id="olDocumentBody">
                    <div class="ol-empty">Loading document…</div>
                </div>
            </div>`;
        document.body.appendChild(viewer);

        $('olDocumentClose')?.addEventListener('click',closeDocumentViewer);
        viewer.addEventListener('click',e=>{
            if(e.target===viewer)closeDocumentViewer();
        });
        return viewer;
    }

    async function renderDocument(s){
        const viewer=ensureDocumentViewer();
        const body=$('olDocumentBody');
        if(!s?.file_path){
            if(body)body.innerHTML='<div class="ol-empty">No uploaded document was attached to this submission.</div>';
            viewer.style.display='flex';
            return;
        }

        const url=await signedDocumentUrl(s);
        const ext=extOf(s.file_name||s.file_path||'');

        if($('olDocumentTitle'))$('olDocumentTitle').textContent=s.file_name||'Uploaded Work';
        if($('olDocumentMeta'))$('olDocumentMeta').textContent=
            `${s.online_assignments?.title||'Submission'} · ${fmtDate(s.submitted_at)}`;

        if($('olDocumentDownload')){
            $('olDocumentDownload').onclick=()=>{
                const a=document.createElement('a');
                a.href=url;a.target='_blank';a.rel='noopener';a.download=s.file_name||'submission';
                a.click();
            };
        }

        if(body)body.innerHTML='<div class="ol-empty"><i class="fas fa-spinner fa-spin"></i> Opening document…</div>';

        if(ext==='pdf'){
            body.innerHTML=`<iframe class="ol-document-frame" title="${esc(s.file_name||'PDF')}" src="${esc(url)}"></iframe>`;
        }else if(ext==='docx'||ext==='doc'){
            const response=await fetch(url);
            if(!response.ok)throw new Error(`Could not download the submitted document (${response.status}).`);
            const blob=await response.blob();
            await loadScriptOnce(
                'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
                'olMammoth'
            );
            const arrayBuffer=await blob.arrayBuffer();
            const converted=await window.mammoth.convertToHtml({arrayBuffer});
            body.innerHTML=
                `<article class="ol-docx">${converted.value||'<p>No readable text found.</p>'}</article>`;
        }else if(['txt','md','csv'].includes(ext)){
            const response=await fetch(url);
            if(!response.ok)throw new Error(`Could not download the submitted document (${response.status}).`);
            const raw=await response.text();
            body.innerHTML=
                `<pre style="white-space:pre-wrap;background:#fff;padding:28px;max-width:1000px;margin:0 auto;min-height:100%;line-height:1.6">${esc(raw)}</pre>`;
        }else if(['png','jpg','gif','webp'].includes(ext)){
            body.innerHTML=
                `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:20px">
                    <img src="${esc(url)}" alt="${esc(s.file_name||'Uploaded work')}"
                         style="max-width:100%;max-height:90%;object-fit:contain;background:#fff;border-radius:8px">
                 </div>`;
        }else{
            body.innerHTML=
                `<div class="ol-empty">
                    Browser preview is unavailable for <b>${esc(ext||'this file type')}</b>.
                    Use <b>Download</b> to open the original document.
                 </div>`;
        }

        viewer.style.display='flex';
    }

    async function viewSubmissionDocument(id){
        try{
            const s=state.submissions.find(x=>String(x.id)===String(id));
            if(!s)throw new Error('Submission not found.');
            await renderDocument(s);
        }catch(e){
            console.error('View submission document:',e);
            notify('Could not open the uploaded document: '+(e.message||e),'error');
        }
    }

    function closeDocumentViewer(){
        const viewer=$('olDocumentViewer');
        if(viewer)viewer.style.display='none';
    }

    async function loadSubmissionDocumentIntoWorkspace(s){
        const box=$('olDocumentPreview');
        if(!box || !s?.file_path){
            if(box)box.innerHTML='<div class="ol-doc-placeholder"><i class="fas fa-file-circle-question"></i><div>No uploaded document.</div></div>';
            return;
        }
        box.innerHTML='<div class="ol-empty">Opening student document…</div>';
        try{
            const url=await signedDocumentUrl(s);
            const ext=extOf(s.file_name||s.file_path||'');
            $('olOpenDocumentBtn')?.addEventListener('click',()=>window.open(url,'_blank','noopener'),{once:true});
            if($('olDownloadDocumentBtn')){
                $('olDownloadDocumentBtn').onclick=()=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();};
            }
            if(ext==='pdf'){
                box.innerHTML=`<iframe class="ol-document-frame" style="width:100%;height:620px;border:0" src="${esc(url)}" title="Student submission"></iframe>`;
            }else if(ext==='docx'||ext==='doc'){
                const blob=await (await fetch(url)).blob();
                await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','olMammoth');
                const out=await window.mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});
                box.innerHTML=`<article class="ol-docx" style="max-width:850px;margin:0 auto;padding:38px 48px;line-height:1.65;background:#fff;min-height:100%">${out.value||'<p>No readable text found.</p>'}</article>`;
                gradingState.documentText=await window.mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()}).then(r=>r.value||'');
            }else if(['txt','md','csv'].includes(ext)){
                const text=await (await fetch(url)).text();
                gradingState.documentText=text;
                box.innerHTML=`<pre style="white-space:pre-wrap;background:#fff;padding:25px;max-width:900px;margin:0 auto;min-height:100%;line-height:1.6">${esc(text)}</pre>`;
            }else if(['png','jpg','jpeg','gif','webp'].includes(ext)){
                box.innerHTML=`<div style="padding:20px;text-align:center"><img src="${esc(url)}" style="max-width:100%;max-height:700px;object-fit:contain"></div>`;
            }else{
                box.innerHTML=`<div class="ol-empty">Preview unavailable for ${esc(ext||'this file type')}. Use Open or Download.</div>`;
            }
        }catch(e){
            console.error('Document workspace:',e);
            box.innerHTML=`<div class="ol-empty" style="color:#b91c1c">${esc(e.message||e)}</div>`;
        }
    }

    async function runDeterministicGrade(){
        const s=gradingState.submission;
        const key=gradingState.key;
        if(!s||!key)return notify('Open a submission and select its institutional marking key first.','warning');
        const btn=$('olRunAutoGradeBtn');
        if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> Auto Grading…';}
        if($('olGradingStatusBadge')) $('olGradingStatusBadge').textContent='GRADING';
        try{
            if(!gradingState.documentText){
                const url=await signedDocumentUrl(s);
                const ext=extOf(s.file_name||s.file_path||'');
                if(ext==='docx'||ext==='doc'){
                    const blob=await (await fetch(url)).blob();
                    await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','olMammoth');
                    const r=await window.mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()});
                    gradingState.documentText=r.value||'';
                }else if(ext==='txt'||ext==='md'||ext==='csv'){
                    gradingState.documentText=await (await fetch(url)).text();
                }else if(ext==='pdf'){
                    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','olPdfJs');
                    const pdf=await window.pdfjsLib.getDocument(url).promise;
                    let t='';
                    for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i);const c=await pg.getTextContent();t+=c.items.map(x=>x.str).join(' ')+'\n';}
                    gradingState.documentText=t;
                }
            }
            if(!String(gradingState.documentText||'').trim()) throw new Error('No readable document text was extracted.');
            const db=client();
            if(!db?.functions?.invoke) throw new Error('Deterministic grading service is unavailable.');
            const result=await db.functions.invoke('grade-online-submission',{
                body:{
                    submission_id:s.id,
                    assignment_id:s.assignment_id,
                    marking_key_id:key.id,
                    document_text:String(gradingState.documentText)
                }
            });
            if(result.error)throw result.error;
            const report=result.data?.report||result.data;
            if(!report||report.marks_awarded===undefined)throw new Error('The grading service returned an invalid deterministic report.');
            gradingState.automaticReport=report;
            gradingState.grades.clear();
            (report.rubric_grades||[]).forEach((g,i)=>{
                gradingState.grades.set(i,{
                    automatic_mark:Number(g.marks_awarded||0),
                    final_mark:Number(g.marks_awarded||0),
                    requirements:g.requirements||[],
                    evidence:g.evidence||'',
                    rationale:g.rationale||'',
                    comment:''
                });
            });
            renderRubricNavigation();renderSelectedCriterion();renderGradingTotals();
            if($('olGradingStatusBadge'))$('olGradingStatusBadge').textContent='AUTO GRADED';
            notify(`Automatic rubric grade completed: ${report.marks_awarded}/${report.max_marks} (${report.percentage}%). Review each criterion, adjust Lecturer Final where necessary, then Save Draft or Submit Final Grade.`,'success');
        }catch(e){
            console.error('Deterministic grading:',e);
            if($('olGradingStatusBadge'))$('olGradingStatusBadge').textContent='ERROR';
            notify(e.message||'Deterministic grading failed.','error');
        }finally{
            if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-bolt"></i> Auto Grade';}
        }
    }

    function saveCriterionMark(){
        const i=gradingState.selectedCriterionIndex;
        const c=gradingState.criteria[i];
        if(!c)return;
        const g=gradingState.grades.get(i)||{automatic_mark:0};
        const final=clampMarks($('olCriterionFinalMark')?.value,c.max_marks);
        g.final_mark=final;
        g.manual_adjusted=Math.abs(final-Number(g.automatic_mark||0))>0.0001;
        g.comment=$('olCriterionComment')?.value.trim()||'';
        gradingState.grades.set(i,g);
        renderRubricNavigation();renderSelectedCriterion();renderGradingTotals();
        notify(`Criterion saved: ${final}/${c.max_marks}`,'success');
    }

    function gradingReportPayload(){
        const totals=renderGradingTotals();
        const rubric_grades=gradingState.criteria.map((c,i)=>{
            const g=gradingState.grades.get(i)||{};
            return {
                criterion:c.criterion,
                max_marks:Number(c.max_marks||0),
                automatic_mark:Number(g.automatic_mark||0),
                final_mark:Number(g.final_mark??g.automatic_mark??0),
                manual_adjusted:!!g.manual_adjusted,
                comment:g.comment||'',
                requirements:g.requirements||[],
                evidence:g.evidence||'',
                rationale:g.rationale||''
            };
        });
        return { ...totals, rubric_grades };
    }

    async function saveGradingDraft(){
        const s=gradingState.submission;
        if(!s)return;
        const db=client();
        const report=gradingReportPayload();
        if(!db)throw new Error('Supabase client unavailable.');
        const rpc=await db.rpc('save_online_submission_grade',{
            p_submission_id:s.id,
            p_assignment_id:s.assignment_id,
            p_marking_key_id:gradingState.key?.id||null,
            p_marks_awarded:report.final,
            p_max_marks:report.max,
            p_percentage:report.max?Number(((report.final/report.max)*100).toFixed(2)):0,
            p_confidence:gradingState.automaticReport?.confidence??null,
            p_report:report,
            p_model:null,
            p_grader_version:'SUPABASE_DETERMINISTIC_RUBRIC_ENGINE_V10',
            p_release:false
        });
        if(rpc.error)throw rpc.error;
        const local=state.submissions.find(x=>x.id===s.id);
        if(local){local.marks_obtained=report.final;local.max_marks=report.max;local.feedback=report.rubric_grades.map(g=>g.comment).filter(Boolean).join('\n')||local.feedback;local.status='graded';local.result_released=false;}
        renderGradingTotals();
        notify(`Draft saved: ${report.final}/${report.max}.`,'success');
        await loadSubmissions();
    }

    async function returnSubmission(){
        const s=gradingState.submission;if(!s)return;
        const reason=prompt('Enter the reason / correction required for returning this submission:');
        if(reason===null)return;
        const db=client();if(!db)throw new Error('Supabase client unavailable.');
        const report=gradingReportPayload();
        const r=await db.rpc('save_online_submission_grade',{
            p_submission_id:s.id,p_assignment_id:s.assignment_id,p_marking_key_id:gradingState.key?.id||null,
            p_marks_awarded:report.final,p_max_marks:report.max,
            p_percentage:report.max?Number(((report.final/report.max)*100).toFixed(2)):0,
            p_confidence:gradingState.automaticReport?.confidence??null,
            p_report:{...report,return_reason:reason},
            p_model:null,p_grader_version:'SUPABASE_DETERMINISTIC_RUBRIC_ENGINE_V10',p_release:false
        });
        if(r.error)throw r.error;
        await db.from('online_submissions').update({review_required:true,status:'submitted',feedback:reason}).eq('id',s.id);
        notify('Submission returned for revision.','success');
        closeModal('olSubmissionModal');await loadSubmissions();
    }

    async function submitFinalGrade(){
        const s=gradingState.submission;if(!s)return;
        const report=gradingReportPayload();
        if(String(gradingState.assignment?.grading_mode||'manual')==='marking_key'){
            const incomplete=gradingState.criteria.some((c,i)=>{
                const g=gradingState.grades.get(i);
                return !g || g.final_mark===null || g.final_mark===undefined || Number(g.final_mark)<0;
            });
            if(incomplete){
                notify('Complete and save every rubric criterion before submitting the final grade.','warning');
                return;
            }
        }
        const confirmed=confirm(`Submit final grade ${report.final}/${report.max} (${report.max?((report.final/report.max)*100).toFixed(2):0}%)?\\n\\nThis will release the final lecturer grade to the student.`);
        if(!confirmed)return;
        const db=client();
        const r=await db.rpc('save_online_submission_grade',{
            p_submission_id:s.id,p_assignment_id:s.assignment_id,p_marking_key_id:gradingState.key?.id||null,
            p_marks_awarded:report.final,p_max_marks:report.max,
            p_percentage:report.max?Number(((report.final/report.max)*100).toFixed(2)):0,
            p_confidence:gradingState.automaticReport?.confidence??null,
            p_report:report,p_model:null,p_grader_version:'SUPABASE_DETERMINISTIC_RUBRIC_ENGINE_V10',p_release:true
        });
        if(r.error)throw r.error;

        // Release first, then send the student result notification.
        // The notification service intentionally does not expose marks in the email.
        const releasedSubmission={...s,marks_obtained:report.final,max_marks:report.max,percentage:report.max?Number(((report.final/report.max)*100).toFixed(2)):0,result_released:true};
        const notificationSent=await sendAssignmentResultNotification(releasedSubmission,gradingState.assignment||{});
        if(notificationSent){
            notify('Final grade saved, released, and result notification sent to the student.','success');
        }else{
            notify('Final grade was saved and released, but the student email notification could not be confirmed. Check the notification service.','warning');
        }
        closeModal('olSubmissionModal');await loadSubmissions();
    }

    async function openSubmissionDocument(){
        const s=gradingState.submission;if(!s)return;
        await loadSubmissionDocumentIntoWorkspace(s);
    }

    async function downloadSubmissionDocument(){
        const s=gradingState.submission;if(!s)return;
        const url=await signedDocumentUrl(s);
        const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();
    }

    async function reviewSubmission(id){
        try{
            const db=client();
            const s=state.submissions.find(x=>x.id===id);
            if(!s)throw new Error('Submission not found.');
            const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
            gradingState.submission=s;gradingState.assignment=assignment;gradingState.documentText='';gradingState.automaticReport=null;
            gradingState.grades=new Map();gradingState.selectedCriterionIndex=0;gradingState.loaded=true;

            if(String(assignment.grading_mode||'manual')==='marking_key'){
                await fetchSubmissionMarkingKey(id);
            }else{
                const max=resolveSubmissionMaxMarks(s,assignment)||100;
                gradingState.key={
                    id:null,
                    title:'Manual Marking',
                    version:'—',
                    validation_status:'manual',
                    max_marks:max,
                    criteria:[{criterion:'Final Manual Grade',description:'Lecturer-entered final mark',max_marks:max,requirements:[]}]
                };
                gradingState.criteria=criterionNodes(gradingState.key.criteria);
                window._activeSubmissionMarkingKey=null;
                window._activeSubmissionMarkingKeyId=null;
                if($('olGradeMarkingKey')){ $('olGradeMarkingKey').innerHTML='<option value="">Manual marking</option>'; $('olGradeMarkingKey').disabled=true; }
                if($('olGradeMarkingKeyVersion')){ $('olGradeMarkingKeyVersion').innerHTML='<option value="">—</option>'; $('olGradeMarkingKeyVersion').disabled=true; }
            }
            if(String(assignment.grading_mode||'manual')==='marking_key') await populateGradingWorkspaceKeySelectors(gradingState.key);
            renderGradingKeyHeader(gradingState.key);
            renderRubricNavigation();
            renderSelectedCriterion();
            renderGradingTotals();

            const profiles=await db.from('consolidated_user_profiles_table')
                .select('full_name,student_id,admission_number,email')
                .eq('user_id',s.student_id).maybeSingle();
            const p=profiles.data||{};
            if($('olGradingStudentMeta'))$('olGradingStudentMeta').textContent=
                `${p.full_name||'Student'} · ${p.admission_number||p.student_id||s.student_id||''} · ${assignment.title||s.online_assignments?.title||'Assignment'}`;
            if($('olGradingStatusBadge'))$('olGradingStatusBadge').textContent=s.result_released?'RELEASED':(s.review_required?'REVIEW':(String(assignment.grading_mode||'manual')==='marking_key'?'DRAFT':'MANUAL'));

            // Load prior deterministic report if it exists.
            if(s.grading_report && typeof s.grading_report==='object'){
                const prior=s.grading_report.rubric_grades||[];
                prior.forEach((g,i)=>gradingState.grades.set(i,g));
                gradingState.automaticReport=s.grading_report;
            }
            renderRubricNavigation();renderSelectedCriterion();renderGradingTotals();
            $('olSubmissionModal').dataset.submissionId=id;
            $('olSubmissionModal').style.display='flex';
            await loadSubmissionDocumentIntoWorkspace(s);
        }catch(e){
            console.error('Review submission:',e);
            notify(e.message||'Could not open grading workspace.','error');
        }
    }

    function updateGradePercentage(){ renderGradingTotals(); }

    // ============================================================
    // RESEARCH SUBMISSIONS — LECTURER REVIEW MODULE
    // Uses public.research_submissions and private research-papers bucket.
    // ============================================================
    const researchState = {
        submissions: [],
        profiles: new Map(),
        initialized: false,
        filterStatus: '',
        search: '',
        current: null
    };

    function researchStatusLabel(status) {
        return String(status || 'submitted').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function researchStatusClass(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'approved') return 'approved';
        if (s === 'revision_required') return 'revision';
        if (s === 'under_review') return 'review';
        if (s === 'rejected') return 'rejected';
        return 'submitted';
    }

    function researchEnsureStyles() {
        if ($('nchsmResearchStyles')) return;
        const st = document.createElement('style');
        st.id = 'nchsmResearchStyles';
        st.textContent = `
          #nchsmResearchModule{padding:20px;max-width:100%;box-sizing:border-box}
          .rs-head{background:linear-gradient(135deg,#0A3D62,#1a5a7a);color:#fff;border-radius:16px;padding:22px 24px;margin-bottom:18px;box-shadow:0 4px 20px rgba(10,61,98,.18)}
          .rs-head h2{margin:0;font-size:21px;display:flex;align-items:center;gap:10px}
          .rs-head p{margin:7px 0 0;opacity:.9;font-size:13px}
          .rs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:15px}
          .rs-stat{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:15px;box-shadow:0 2px 8px rgba(15,23,42,.04)}
          .rs-stat b{display:block;font-size:24px;color:#0A3D62}.rs-stat span{font-size:11px;color:#64748b}
          .rs-toolbar{display:flex;gap:8px;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px}
          .rs-toolbar input,.rs-toolbar select{min-height:38px;border:1px solid #dbe3ec;border-radius:8px;padding:7px 10px;box-sizing:border-box}
          .rs-toolbar input{flex:1;min-width:220px}
          .rs-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
          .rs-table{width:100%;border-collapse:collapse;font-size:12px}.rs-table th{background:#f8fafc;color:#475569;text-align:left;font-size:11px;padding:11px;border-bottom:1px solid #e2e8f0}.rs-table td{padding:11px;border-bottom:1px solid #eef2f7;vertical-align:top}
          .rs-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;background:#eef2f7;color:#475569}.rs-badge.approved{background:#dcfce7;color:#166534}.rs-badge.revision{background:#fef3c7;color:#92400e}.rs-badge.review{background:#dbeafe;color:#1d4ed8}.rs-badge.rejected{background:#fee2e2;color:#991b1b}.rs-badge.submitted{background:#e0f2fe;color:#0369a1}
          .rs-btn{border:0;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:11px;font-weight:700}.rs-primary{background:#0A3D62;color:#fff}.rs-secondary{background:#eef2f7;color:#334155}.rs-success{background:#166534;color:#fff}.rs-warning{background:#b45309;color:#fff}.rs-danger{background:#991b1b;color:#fff}
          .rs-empty{padding:35px;text-align:center;color:#64748b}
          .rs-modal{position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100020;display:none;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;overflow:hidden}
          .rs-dialog{background:#fff;width:min(1500px,100%);height:min(95vh,980px);max-height:95vh;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.35)}
          .rs-dialog.rs-fullscreen{width:100vw;height:100vh;max-height:none;border-radius:0}\n           :fullscreen.rs-dialog{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;border-radius:0!important;margin:0!important}.rs-browser-research-fullscreen body{overflow:hidden!important}.rs-browser-research-fullscreen #rsReviewModal{z-index:999999!important}
          .rs-dialog-head{flex:0 0 auto;padding:11px 14px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;align-items:center;background:#fff;z-index:3}
          .rs-dialog-body{display:grid;grid-template-columns:minmax(0,1fr) 340px;flex:1;min-height:0;overflow:hidden}
          .rs-preview{background:#f1f5f9;min-width:0;min-height:0;overflow:hidden;padding:0;display:flex;flex-direction:column}
          .rs-side{min-width:0;min-height:0;border-left:1px solid #e2e8f0;padding:14px;overflow:auto;background:#fff}
          .rs-frame{width:100%;height:100%;min-height:600px;border:0;background:#fff}
          .rs-docx{background:#fff;max-width:850px;margin:14px auto;padding:40px 50px;min-height:90%;line-height:1.65;box-shadow:0 1px 7px rgba(0,0,0,.08)}
          .rs-side label{display:block;font-size:11px;font-weight:700;color:#475569;margin:12px 0 5px}.rs-side select,.rs-side textarea{width:100%;box-sizing:border-box;border:1px solid #dbe3ec;border-radius:8px;padding:9px}.rs-side textarea{min-height:150px;resize:vertical}
          .rs-meta{font-size:12px;color:#64748b;line-height:1.6}.rs-title{font-size:17px;font-weight:800;color:#18304d;margin-bottom:5px}

          .rs-review-toolbar{flex:0 0 auto;display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:6px 8px;background:#fff;border-bottom:1px solid #dbe3ec}
          .rs-review-toolbar button{min-width:29px;height:28px;border:0;border-radius:5px;background:#fff;color:#40566f;cursor:pointer;font-size:11px}
          .rs-review-toolbar button:hover{background:#edf3f9}\n           .rs-review-toolbar .rs-color-btn{display:inline-flex;align-items:center;justify-content:center;gap:3px;padding:0 5px!important}.rs-review-toolbar .rs-highlight-btn{min-width:34px!important}.rs-review-toolbar .rs-color-indicator{flex:0 0 auto}
          .rs-review-toolbar button.active{background:#dbeafe;color:#087bf0}
          .rs-review-toolbar .rs-color-btn{min-width:31px;height:28px;border:1px solid #d7e0e8;border-radius:5px;background:#fff;color:#40566f;cursor:pointer;font-size:11px;font-weight:700}.rs-color-btn .rs-color-indicator{display:inline-block;width:16px;height:3px;vertical-align:middle;margin-left:3px;border-radius:2px}.rs-highlight-btn .rs-color-indicator{height:8px}.rs-color-popover{position:absolute;z-index:100060;background:#fff;border:1px solid #d7e0e8;border-radius:8px;padding:7px;box-shadow:0 10px 30px rgba(0,0,0,.18);display:grid;grid-template-columns:repeat(8,22px);gap:5px}.rs-color-swatch{width:22px;height:22px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;padding:0}.rs-color-swatch:hover{outline:2px solid #2563eb;outline-offset:1px}.rs-review-toolbar select{height:28px;border:1px solid #d7e0e8;border-radius:5px;background:#fff;color:#40566f;font-size:9px;padding:0 7px}
          .rs-review-status{margin-left:auto;font-size:8px;color:#71859c;white-space:nowrap}
          .rs-editor-wrap{flex:1;min-height:0;overflow:auto;padding:26px 18px 40px;background:#f1f3f4;-webkit-overflow-scrolling:touch;position:relative;z-index:1;user-select:text;-webkit-user-select:text}
          .rs-editor-page{width:min(850px,100%);min-height:1050px;margin:0 auto;padding:70px 72px;box-sizing:border-box;background:#fff;color:#202b38;outline:0;line-height:1.7;font-size:13px;box-shadow:0 1px 6px rgba(20,40,60,.16);position:relative;z-index:2;pointer-events:auto!important;user-select:text!important;-webkit-user-select:text!important;cursor:text;caret-color:#111827;-webkit-touch-callout:default;touch-action:manipulation}
          .rs-editor-page:focus{box-shadow:0 1px 6px rgba(20,40,60,.16),0 0 0 2px rgba(66,133,244,.12)}
          .rs-editor-page *{user-select:text!important;-webkit-user-select:text!important;cursor:text}
          .rs-editor-page img,.rs-editor-page table,.rs-editor-page td,.rs-editor-page th{user-select:text!important;-webkit-user-select:text!important}
          .rs-editor-page img{max-width:100%;height:auto}.rs-editor-page table{max-width:100%;border-collapse:collapse}.rs-editor-page td,.rs-editor-page th{padding:4px 6px}
          .rs-editor-page h1,.rs-editor-page h2,.rs-editor-page h3{color:#18304d}
          .rs-review-main{flex:1;min-height:0;display:flex;flex-direction:column}
          .rs-comments-panel{border-top:1px solid #e2e8f0;max-height:34vh;overflow:auto;padding:8px;background:#fff}
          .rs-comment-tabs{display:flex;border-bottom:1px solid #e2e8f0;margin:-8px -8px 8px}
          .rs-comment-tabs button{flex:1;border:0;background:#fff;padding:8px;font-size:9px;font-weight:800;color:#71859c;cursor:pointer}
          .rs-comment-tabs button.active{color:#087bf0;border-bottom:2px solid #087bf0}
          .rs-comment-card{border:1px solid #dbe6ef;border-radius:8px;padding:8px;margin-bottom:6px;background:#fbfdff;font-size:9px;color:#526b86}
          .rs-comment-card strong{display:block;color:#18304d}.rs-comment-card small{display:block;color:#94a3b8;font-size:7px;margin-top:2px}
          .rs-comment-selection{margin:6px 0;padding:5px;border-left:3px solid #f5c542;background:#fffaf0}
          .rs-comment-action{border:1px solid #dbe6ef;background:#fff;border-radius:5px;padding:4px 7px;font-size:8px;color:#526b86;cursor:pointer;margin-top:6px}
          .rs-comment-mark{background:#fff1a8;border-bottom:2px solid #e3ad00}
          .rs-suggestion del{background:#ffe1e1;color:#a61b1b}.rs-suggestion ins{background:#dcfce7;color:#146c3a;text-decoration:none}
          .rs-bottom-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
          .rs-bottom-actions .rs-btn{flex:1}
          @media(max-width:900px){
            .rs-stats{grid-template-columns:repeat(2,1fr)}
            .rs-dialog-body{grid-template-columns:1fr}
            .rs-side{border-left:0;border-top:1px solid #e2e8f0;max-height:36vh}
            .rs-editor-page{padding:35px 25px;font-size:12px;min-height:850px}
            .rs-editor-wrap{padding:14px 8px 28px}
          }
          @media(max-width:520px){
            #nchsmResearchModule{padding:10px}.rs-table{min-width:900px}.rs-card{overflow-x:auto}
            .rs-dialog{height:100vh;max-height:none;border-radius:0}.rs-modal{padding:0}
            .rs-side{max-height:42vh}
          }
        `;
        document.head.appendChild(st);
    }

    function researchEnsureUI() {
        researchEnsureStyles();

        const section = $('online-learning-content');
        if (!section) return;

        // Research is intentionally a SUB-TAB inside the existing Online Learning section.
        // It must never become a separate sidebar/top-level dashboard section.
        let hubTabs = section.querySelector('.ol-hub-tabs');
        let learningView = section.querySelector('#ol-learning-view');
        let root = $('nchsmResearchModule');

        if (!hubTabs) {
            hubTabs = document.createElement('div');
            hubTabs.className = 'ol-hub-tabs';
            hubTabs.innerHTML = `
              <button type="button" class="ol-hub-tab active" data-ol-hub-view="learning"><i class="fas fa-laptop-code"></i> Online Learning</button>
              <button type="button" class="ol-hub-tab" data-ol-hub-view="research"><i class="fas fa-file-signature"></i> Research Papers</button>
            `;
            section.insertBefore(hubTabs, section.firstChild);
        }

        if (!learningView) {
            learningView = document.createElement('div');
            learningView.id = 'ol-learning-view';
            const children = Array.from(section.children).filter(el => el !== hubTabs);
            children.forEach(el => learningView.appendChild(el));
            section.appendChild(learningView);
        }

        if (!root) {
            root = document.createElement('div');
            root.id = 'nchsmResearchModule';
            root.style.display = 'none';
            section.appendChild(root);
        }

        hubTabs.querySelectorAll('[data-ol-hub-view]').forEach(btn => {
            if (btn.dataset.bound === '1') return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                const view = btn.dataset.olHubView;
                hubTabs.querySelectorAll('[data-ol-hub-view]').forEach(x => x.classList.toggle('active', x === btn));
                learningView.style.display = view === 'learning' ? 'block' : 'none';
                root.style.display = view === 'research' ? 'block' : 'none';
                if (view === 'research') loadResearch();
            });
        });

        const rootWasRendered = root.dataset.rendered === '1';
        if (rootWasRendered) return;
        if (!root || root.dataset.rendered === '1') return;
        root.dataset.rendered = '1';
        root.innerHTML = `
          <div class="rs-head">
            <h2><i class="fas fa-file-signature"></i> Research Submissions</h2>
            <p>Review student research proposals, final papers and corrected submissions. Open documents, provide feedback and update the review status.</p>
          </div>
          <div class="rs-stats">
            <div class="rs-stat"><b id="rsTotal">0</b><span>Total Submissions</span></div>
            <div class="rs-stat"><b id="rsReview">0</b><span>Under Review</span></div>
            <div class="rs-stat"><b id="rsRevision">0</b><span>Revision Required</span></div>
            <div class="rs-stat"><b id="rsApproved">0</b><span>Approved</span></div>
          </div>
          <div class="rs-toolbar">
            <input id="rsSearch" placeholder="Search student, admission number or research title…">
            <select id="rsStatus">
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="revision_required">Revision Required</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button class="rs-btn rs-secondary" type="button" id="rsRefresh"><i class="fas fa-sync"></i> Refresh</button>
          </div>
          <div class="rs-card">
            <div id="rsLoading" class="rs-empty">Loading research submissions…</div>
            <div style="overflow-x:auto">
              <table class="rs-table" id="rsTable" style="display:none">
                <thead><tr><th>Student</th><th>Research Title</th><th>Type</th><th>Version</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="rsBody"></tbody>
              </table>
            </div>
          </div>
          <div class="rs-modal" id="rsReviewModal" aria-hidden="true">
            <div class="rs-dialog">
              <div class="rs-dialog-head">
                <div><div class="rs-title" id="rsModalTitle">Research Submission</div><div class="rs-meta" id="rsModalMeta"></div></div>
                <button class="rs-btn rs-secondary" type="button" id="rsClose">Close</button>
              </div>
              <div class="rs-dialog-body">
                <div class="rs-preview" id="rsPreview"><div class="rs-empty">Select a submission.</div></div>
                <div class="rs-side">
                  <div id="rsStudentMeta" class="rs-meta"></div>
                  <label>Review Status</label>
                  <select id="rsReviewStatus">
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="revision_required">Revision Required</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <label>Supervisor / Lecturer Feedback</label>
                  <textarea id="rsFeedback" placeholder="Enter feedback, required corrections, recommendations or approval comments…"></textarea>
                  <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
                    <button class="rs-btn rs-success" type="button" id="rsSaveReview">Save Review</button>
                    <button class="rs-btn rs-warning" type="button" id="rsSendCorrection">Send Correction to Student</button>
                    <button class="rs-btn rs-secondary" type="button" id="rsDownload">Download</button>
                  </div>
                  <div id="rsFileInfo" class="rs-meta" style="margin-top:14px"></div>
                </div>
              </div>
            </div>
          </div>`;
        $('rsSearch').addEventListener('input', e => { researchState.search = e.target.value.toLowerCase().trim(); renderResearch(); });
        $('rsStatus').addEventListener('change', e => { researchState.filterStatus = e.target.value; renderResearch(); });
        $('rsRefresh').addEventListener('click', loadResearch);
        $('rsClose').addEventListener('click', closeResearchModal);
        $('rsReviewModal').addEventListener('click', e => { if (e.target === $('rsReviewModal')) closeResearchModal(); });
        $('rsSaveReview').addEventListener('click', saveResearchReview);
        $('rsSendCorrection').addEventListener('click', saveLecturerCorrection);
        $('rsDownload').addEventListener('click', downloadCurrentResearch);
        setTimeout(lecturerInstallResearchEditorEnhancements,50);
    }

    async function loadResearch() {
        researchEnsureUI();
        const db = client();
        if (!db) return notify('Supabase client is not available for Research.', 'error');

        const loading = $('rsLoading');
        const table = $('rsTable');
        if (loading) loading.style.display = 'block';
        if (table) table.style.display = 'none';

        try {
            const { data, error } = await db.from('research_submissions')
                .select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_by,reviewed_at,submitted_at,created_at,updated_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            researchState.submissions = data || [];

            const ids = [...new Set(researchState.submissions.map(x => x.student_id).filter(Boolean))];
            researchState.profiles = new Map();
            if (ids.length) {
                const r = await db.from('consolidated_user_profiles_table')
                    .select('user_id,full_name,student_id,admission_number,email,program,intake_year,current_block,block')
                    .in('user_id', ids);
                if (r.error) console.warn('Research profile lookup:', r.error.message);
                (r.data || []).forEach(p => researchState.profiles.set(p.user_id, p));
            }
            renderResearch();
        } catch (e) {
            console.error('Research load failed:', e);
            if (loading) loading.textContent = 'Research submissions could not load: ' + (e.message || e);
            notify('Could not load Research submissions: ' + (e.message || e), 'error');
            return;
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    function renderResearch() {
        researchEnsureUI();
        const all = researchState.submissions || [];
        const q = researchState.search;
        const status = researchState.filterStatus;
        const rows = all.filter(s => {
            const p = researchState.profiles.get(s.student_id) || {};
            const hay = `${p.full_name || ''} ${p.student_id || ''} ${p.admission_number || ''} ${p.email || ''} ${s.title || ''}`.toLowerCase();
            return (!status || s.status === status) && (!q || hay.includes(q));
        });

        const total = $('rsTotal'), review = $('rsReview'), revision = $('rsRevision'), approved = $('rsApproved');
        if (total) total.textContent = all.length;
        if (review) review.textContent = all.filter(s => s.status === 'under_review').length;
        if (revision) revision.textContent = all.filter(s => s.status === 'revision_required').length;
        if (approved) approved.textContent = all.filter(s => s.status === 'approved').length;

        const loading = $('rsLoading'), table = $('rsTable'), body = $('rsBody');
        if (!body) return;
        if (!rows.length) {
            table.style.display = 'none';
            loading.style.display = 'block';
            loading.innerHTML = '<i class="fas fa-file-circle-check" style="font-size:24px;display:block;margin-bottom:8px"></i>No research submissions match the current filter.';
            return;
        }
        loading.style.display = 'none';
        table.style.display = 'table';
        body.innerHTML = rows.map(s => {
            const p = researchState.profiles.get(s.student_id) || {};
            return `<tr>
              <td><b>${esc(p.full_name || 'Student')}</b><div style="font-size:10px;color:#64748b">${esc(p.admission_number || p.student_id || s.student_id || '')}</div></td>
              <td><b>${esc(s.title || 'Untitled Research')}</b><div style="font-size:10px;color:#64748b">${esc(s.document_name || 'No document')}</div></td>
              <td>${esc(String(s.submission_type || 'research').replace(/_/g,' '))}</td>
              <td>V${esc(s.version_number || 1)}</td>
              <td>${fmtDate(s.submitted_at || s.created_at)}</td>
              <td><span class="rs-badge ${researchStatusClass(s.status)}">${esc(researchStatusLabel(s.status))}</span></td>
              <td><button class="rs-btn rs-primary" type="button" data-research-review="${esc(s.id)}"><i class="fas fa-eye"></i> Review</button></td>
            </tr>`;
        }).join('');
        body.querySelectorAll('[data-research-review]').forEach(btn => btn.addEventListener('click', () => openResearchReview(btn.dataset.researchReview)));
    }

    async function researchSignedUrl(s) {
        const db = client();
        if (!db || !s?.document_path) throw new Error('No research document is attached.');
        const r = await db.storage.from('research-papers').createSignedUrl(s.document_path, 3600);
        if (r.error) throw r.error;
        if (!r.data?.signedUrl) throw new Error('Could not create a secure document URL.');
        return r.data.signedUrl;
    }



    /* ============================================================
       RESEARCH EDITOR — COLOR / HIGHLIGHT / SELECTION HELPERS
       ============================================================ */
    let lecturerSavedSelection = null;

    function lecturerGetEditor(){
        return document.querySelector('#rsPreview .rs-editor-page[contenteditable="true"]');
    }

    function lecturerSaveSelection(){
        const editor = lecturerGetEditor();
        const sel = window.getSelection();
        if(!editor || !sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        if(!editor.contains(range.commonAncestorContainer)) return;
        lecturerSavedSelection = range.cloneRange();
    }

    function lecturerRestoreSelection(){
        const editor = lecturerGetEditor();
        if(!editor) return false;
        editor.focus({preventScroll:true});
        if(!lecturerSavedSelection) return false;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lecturerSavedSelection);
        return true;
    }

    function lecturerExec(command,value){
        const editor = lecturerGetEditor();
        if(!editor) return false;
        if(!lecturerRestoreSelection()) return false;
        let applied=false;
        try{
            document.execCommand('styleWithCSS',false,true);
            applied=document.execCommand(command,false,value);
            if(!applied && command==='hiliteColor') applied=document.execCommand('backColor',false,value);
        }catch(e){
            if(command==='hiliteColor'){
                try{ applied=document.execCommand('backColor',false,value); }catch(_e){}
            }
        }
        editor.focus({preventScroll:true});
        editor.dispatchEvent(new Event('input',{bubbles:true}));
        lecturerSaveSelection();
        return applied!==false;
    }

    const NCHSM_RESEARCH_COLORS = [
      '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#ffffff',
      '#980000','#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff',
      '#9900ff','#ff00ff','#e6b8af','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3',
      '#c9daf8','#cfe2f3','#d9d2e9','#ead1dc','#e06666','#f6b26b','#ffd966','#93c47d',
      '#76a5af','#6d9eeb','#8e7cc3','#c27ba0'
    ];

    function lecturerCloseColorPopovers(){
        document.querySelectorAll('.rs-color-popover').forEach(x=>x.remove());
    }

    function lecturerOpenColorPopover(button,command){
        lecturerCloseColorPopovers();
        lecturerSaveSelection();
        const pop = document.createElement('div');
        pop.className='rs-color-popover';
        pop.addEventListener('mousedown',e=>e.preventDefault());
        NCHSM_RESEARCH_COLORS.forEach(function(color){
            const sw=document.createElement('button');
            sw.type='button';
            sw.className='rs-color-swatch';
            sw.style.background=color;
            sw.title=color;
            sw.addEventListener('mousedown',function(e){
                e.preventDefault();
                e.stopPropagation();
                lecturerRestoreSelection();
                lecturerExec(command,color);
                lecturerCloseColorPopovers();
            });
            pop.appendChild(sw);
        });
        document.body.appendChild(pop);
        const r=button.getBoundingClientRect();
        pop.style.left=Math.max(6,Math.min(window.innerWidth-pop.offsetWidth-6,r.left))+'px';
        pop.style.top=Math.min(window.innerHeight-pop.offsetHeight-6,r.bottom+4)+'px';
    }

    function lecturerInstallColorTools(toolbar){
        if(!toolbar || toolbar.dataset.colorsInstalled==='1') return;
        toolbar.dataset.colorsInstalled='1';

        function bindButton(button,command){
            if(!button || button.dataset.colorBound==='1') return;
            button.dataset.colorBound='1';
            button.addEventListener('mousedown',function(e){
                e.preventDefault();
                e.stopPropagation();
                lecturerOpenColorPopover(button,command);
            });
        }

        bindButton(toolbar.querySelector('[data-rs-text-color]'),'foreColor');
        bindButton(toolbar.querySelector('[data-rs-highlight-color]'),'hiliteColor');

        // Fallback for an older cached toolbar without the new buttons.
        if(!toolbar.querySelector('[data-rs-text-color]')){
            const b=document.createElement('button');
            b.type='button';
            b.className='rs-color-btn';
            b.dataset.rsTextColor='1';
            b.title='Text color';
            b.innerHTML='<b>A</b><span class="rs-color-indicator" style="background:#000"></span>';
            toolbar.appendChild(b);
            bindButton(b,'foreColor');
        }
        if(!toolbar.querySelector('[data-rs-highlight-color]')){
            const b=document.createElement('button');
            b.type='button';
            b.className='rs-color-btn rs-highlight-btn';
            b.dataset.rsHighlightColor='1';
            b.title='Highlight color';
            b.innerHTML='<i class="fas fa-highlighter"></i><span class="rs-color-indicator" style="background:#ffff00"></span>';
            toolbar.appendChild(b);
            bindButton(b,'hiliteColor');
        }

        if(!document.documentElement.dataset.nchsmColorPopoverClose){
            document.documentElement.dataset.nchsmColorPopoverClose='1';
            document.addEventListener('mousedown',function(e){
                if(!e.target.closest('.rs-color-popover') && !e.target.closest('.rs-color-btn')){
                    lecturerCloseColorPopovers();
                }
            });
        }
    }

    function lecturerInstallEditorProtection(){
        const editor=lecturerGetEditor();
        if(!editor || editor.dataset.editorProtectionInstalled==='1') return;
        editor.dataset.editorProtectionInstalled='1';
        editor.contentEditable='true';
        editor.setAttribute('spellcheck','true');
        editor.style.userSelect='text';
        editor.style.webkitUserSelect='text';
        editor.style.pointerEvents='auto';
        editor.style.cursor='text';
        editor.addEventListener('mouseup',lecturerSaveSelection);
        editor.addEventListener('keyup',lecturerSaveSelection);
        editor.addEventListener('touchend',lecturerSaveSelection,{passive:true});
        editor.addEventListener('input',function(){
            lecturerResearchCollab.localEditing=true;
            editor.dataset.dirty='1';
        });
    }


    function lecturerResearchDialog(){
        return document.querySelector('#rsReviewModal .rs-dialog') ||
               document.querySelector('.rs-dialog.rs-research-dialog') ||
               document.querySelector('.rs-dialog');
    }

    async function lecturerEnterResearchFullscreen(){
        const dialog=lecturerResearchDialog();
        if(!dialog) return;
        dialog.classList.add('rs-fullscreen');
        document.documentElement.classList.add('rs-browser-research-fullscreen');
        document.body.classList.add('rs-browser-research-fullscreen');
        try{
            if(document.fullscreenElement!==dialog && dialog.requestFullscreen){
                await dialog.requestFullscreen({navigationUI:'hide'});
            }
        }catch(e){
            // CSS fullscreen remains active as a reliable fallback.
        }
        lecturerUpdateResearchFullscreenButton();
    }

    async function lecturerExitResearchFullscreen(){
        try{
            if(document.fullscreenElement && document.exitFullscreen){
                await document.exitFullscreen();
            }
        }catch(e){}
        const dialog=lecturerResearchDialog();
        if(dialog) dialog.classList.remove('rs-fullscreen');
        document.documentElement.classList.remove('rs-browser-research-fullscreen');
        document.body.classList.remove('rs-browser-research-fullscreen');
        lecturerUpdateResearchFullscreenButton();
    }

    function lecturerToggleResearchFullscreen(){
        const dialog=lecturerResearchDialog();
        if(!dialog) return;
        if(document.fullscreenElement || dialog.classList.contains('rs-fullscreen')){
            lecturerExitResearchFullscreen();
        }else{
            lecturerEnterResearchFullscreen();
        }
    }

    function lecturerUpdateResearchFullscreenButton(){
        const btn=document.querySelector('#rsReviewModal [data-rs-fullscreen], #rsReviewModal .rs-fullscreen-btn');
        if(!btn) return;
        const active=!!document.fullscreenElement ||
          !!document.querySelector('#rsReviewModal .rs-dialog.rs-fullscreen');
        btn.innerHTML=active
          ? '<i class="fas fa-compress"></i> Exit Full Screen'
          : '<i class="fas fa-expand"></i> Full Screen';
        btn.title=active?'Exit full screen':'Open research paper full screen';
    }

    function lecturerInstallTrueFullscreen(){
        const btn=document.querySelector('#rsReviewModal [data-rs-fullscreen], #rsReviewModal .rs-fullscreen-btn');
        if(btn && btn.dataset.trueFullscreenBound!=='1'){
            btn.dataset.trueFullscreenBound='1';
            btn.addEventListener('click',function(e){
                e.preventDefault();
                e.stopPropagation();
                lecturerToggleResearchFullscreen();
            },true);
        }
        if(!document.documentElement.dataset.nchsmFullscreenBound){
            document.documentElement.dataset.nchsmFullscreenBound='1';
            document.addEventListener('fullscreenchange',function(){
                const dialog=lecturerResearchDialog();
                if(dialog && !document.fullscreenElement) dialog.classList.remove('rs-fullscreen');
                lecturerUpdateResearchFullscreenButton();
            });
            document.addEventListener('keydown',function(e){
                if(e.key!=='Escape') return;
                if(document.fullscreenElement){
                    e.preventDefault();
                    lecturerExitResearchFullscreen();
                    return;
                }
                const dialog=lecturerResearchDialog();
                if(dialog && dialog.classList.contains('rs-fullscreen')){
                    e.preventDefault();
                    lecturerExitResearchFullscreen();
                }
            },true);
        }
        lecturerUpdateResearchFullscreenButton();
    }

    function lecturerInstallResearchEditorEnhancements(){
        const toolbar=document.querySelector('#rsReviewModal .rs-review-toolbar');
        if(toolbar) lecturerInstallColorTools(toolbar);
        lecturerInstallEditorProtection();
        lecturerInstallTrueFullscreen();
        const editor=lecturerGetEditor();
        if(editor && editor.dataset.nchsmSelectionBound!=='1'){
            editor.dataset.nchsmSelectionBound='1';
            editor.addEventListener('mouseup',lecturerSaveSelection);
            editor.addEventListener('keyup',lecturerSaveSelection);
            editor.addEventListener('touchend',lecturerSaveSelection,{passive:true});
            document.addEventListener('selectionchange',function(){
                const active=lecturerGetEditor();
                if(!active) return;
                const sel=window.getSelection();
                if(sel && sel.rangeCount && active.contains(sel.getRangeAt(0).commonAncestorContainer)) lecturerSavedSelection=sel.getRangeAt(0).cloneRange();
            });
        }
    }

    const lecturerResearchCollab = {
        channel:null,
        clientId:'lecturer-'+Math.random().toString(36).slice(2)+Date.now(),
        currentId:null,
        applyingRemote:false,
        lastBroadcast:0
    ,localEditing:false,pendingRemoteHtml:null};

    function lecturerResearchName(){
        const p=state.profile||{};
        return p.full_name||p.name||state.userEmail||'Lecturer';
    }

    function lecturerResearchKey(s){
        return 'nchsm_lecturer_research_'+String(s&&s.id||'');
    }

    function lecturerResearchCommentsKey(s){return lecturerResearchKey(s)+':comments'}
    function lecturerResearchSuggestionsKey(s){return lecturerResearchKey(s)+':suggestions'}

    function lecturerStoredArray(key){
        try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}
    }

    function lecturerSaveArray(key,value){
        try{localStorage.setItem(key,JSON.stringify(value||[]))}catch(e){}
    }

    function lecturerSelection(editor){
        const sel=window.getSelection();
        if(!sel||!sel.rangeCount)return null;
        const range=sel.getRangeAt(0);
        if(!editor.contains(range.commonAncestorContainer))return null;
    
    const nchsmResearchEditorObserver = new MutationObserver(function(){
        if(document.getElementById('rsReviewModal')) lecturerInstallResearchEditorEnhancements();
    });
    if(document.body) nchsmResearchEditorObserver.observe(document.body,{childList:true,subtree:true});

    return {text:String(sel.toString()||'').trim(),range:range};
    }

    function lecturerSelectionOffsets(editor){
        const sel=window.getSelection();
        if(!sel||!sel.rangeCount)return null;
        const range=sel.getRangeAt(0);
        if(!editor.contains(range.commonAncestorContainer))return null;
        const pre=document.createRange();
        pre.selectNodeContents(editor);
        pre.setEnd(range.startContainer,range.startOffset);
        const start=pre.toString().length;
        return {start:start,end:start+range.toString().length};
    }

    function lecturerCommentId(){
        return 'lc_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
    }

    function lecturerSuggestionId(){
        return 'ls_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
    }

    function lecturerBroadcast(payload){
        if(!lecturerResearchCollab.channel)return;
        try{
            lecturerResearchCollab.channel.send({
                type:'broadcast',
                event:'research-doc',
                payload:Object.assign({sender:lecturerResearchCollab.clientId},payload)
            });
        }catch(e){}
    }

    function lecturerRefreshCommentMarks(editor,s){
        if(!editor)return;
        editor.querySelectorAll('[data-rs-comment]').forEach(function(n){
            const p=n.parentNode;
            while(n.firstChild)p.insertBefore(n.firstChild,n);
            p.removeChild(n);
        });
        lecturerStoredArray(lecturerResearchCommentsKey(s)).forEach(function(c){
            if(!c.text)return;
            const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
            let node,found=null;
            while(node=walker.nextNode()){
                const at=node.nodeValue.indexOf(c.text);
                if(at>=0){found={node:node,at:at};break}
            }
            if(!found)return;
            const range=document.createRange();
            range.setStart(found.node,found.at);
            range.setEnd(found.node,found.at+c.text.length);
            const mark=document.createElement('mark');
            mark.className='rs-comment-mark';
            mark.dataset.rsComment=c.id;
            mark.title=(c.author_name||'Lecturer')+': '+c.comment;
            try{range.surroundContents(mark)}catch(e){}
        });
    }

    function lecturerRenderComments(s,editor){
        const panel=document.getElementById('rsCommentsList');
        if(!panel)return;
        const comments=lecturerStoredArray(lecturerResearchCommentsKey(s));
        panel.innerHTML=comments.length?comments.map(function(c){
            return '<div class="rs-comment-card"><strong>'+esc(c.author_name||'Lecturer')+'</strong><small>'+esc(c.created_at?new Date(c.created_at).toLocaleString():'')+'</small><div class="rs-comment-selection">“'+esc(c.text||'')+'”</div><div>'+esc(c.comment||'')+'</div><button type="button" class="rs-comment-action" data-rs-comment-resolve="'+esc(c.id)+'">Resolve</button></div>';
        }).join(''):'<div class="rs-empty" style="padding:16px;font-size:9px">No comments. Select text and click Comment.</div>';
    }

    function lecturerAddComment(s,editor){
        const sel=lecturerSelection(editor);
        const offsets=lecturerSelectionOffsets(editor);
        if(!sel||!sel.text||!offsets)return notify('Select text in the document first.','warning');
        const comment=prompt('Add a comment for the selected text:');
        if(!comment||!comment.trim())return;
        const item={id:lecturerCommentId(),text:sel.text,comment:comment.trim(),start:offsets.start,end:offsets.end,author_name:lecturerResearchName(),created_at:new Date().toISOString()};
        const list=lecturerStoredArray(lecturerResearchCommentsKey(s));
        list.push(item);lecturerSaveArray(lecturerResearchCommentsKey(s),list);
        lecturerRefreshCommentMarks(editor,s);lecturerRenderComments(s,editor);
        lecturerBroadcast({type:'comment-add',comment:item});
    }

    function lecturerResolveComment(s,id,editor){
        lecturerSaveArray(lecturerResearchCommentsKey(s),lecturerStoredArray(lecturerResearchCommentsKey(s)).filter(function(c){return String(c.id)!==String(id)}));
        lecturerRefreshCommentMarks(editor,s);lecturerRenderComments(s,editor);
        lecturerBroadcast({type:'comment-delete',id:id});
    }

    function lecturerAddSuggestion(s,editor){
        const sel=lecturerSelection(editor);
        const offsets=lecturerSelectionOffsets(editor);
        if(!sel||!sel.text||!offsets)return notify('Select text to suggest a replacement.','warning');
        const replacement=prompt('Suggested replacement:',sel.text);
        if(replacement===null)return;
        const item={id:lecturerSuggestionId(),old_text:sel.text,new_text:String(replacement),start:offsets.start,end:offsets.end,status:'pending',author_name:lecturerResearchName(),created_at:new Date().toISOString()};
        const list=lecturerStoredArray(lecturerResearchSuggestionsKey(s));list.push(item);lecturerSaveArray(lecturerResearchSuggestionsKey(s),list);
        const range=sel.range;
        const span=document.createElement('span');span.className='rs-suggestion';span.dataset.rsSuggestion=item.id;span.innerHTML='<del>'+esc(sel.text)+'</del><ins>'+esc(String(replacement))+'</ins>';
        try{range.deleteContents();range.insertNode(span)}catch(e){}
        lecturerRenderSuggestions(s,editor);lecturerBroadcast({type:'suggestion-add',suggestion:item});
    }

    function lecturerRenderSuggestions(s,editor){
        const panel=document.getElementById('rsSuggestionsList');
        if(!panel)return;
        const list=lecturerStoredArray(lecturerResearchSuggestionsKey(s)).filter(function(x){return x.status==='pending'});
        panel.innerHTML=list.length?list.map(function(x){
            return '<div class="rs-comment-card"><strong>'+esc(x.author_name||'Lecturer')+'</strong><small>Suggestion</small><div><del>'+esc(x.old_text)+'</del> → <ins>'+esc(x.new_text)+'</ins></div><div style="display:flex;gap:5px"><button type="button" class="rs-comment-action" data-rs-suggestion-accept="'+esc(x.id)+'">Accept</button><button type="button" class="rs-comment-action" data-rs-suggestion-reject="'+esc(x.id)+'">Reject</button></div></div>';
        }).join(''):'<div class="rs-empty" style="padding:16px;font-size:9px">No pending suggestions.</div>';
    }

    function lecturerApplySuggestion(s,id,accept,editor){
        const list=lecturerStoredArray(lecturerResearchSuggestionsKey(s));
        const item=list.find(function(x){return String(x.id)===String(id)});
        if(!item)return;
        item.status=accept?'accepted':'rejected';
        lecturerSaveArray(lecturerResearchSuggestionsKey(s),list);
        const nodes=Array.from(editor.querySelectorAll('[data-rs-suggestion]')).filter(function(n){return String(n.dataset.rsSuggestion)===String(id)});
        nodes.forEach(function(n){n.outerHTML=accept?esc(item.new_text):esc(item.old_text)});
        lecturerRenderSuggestions(s,editor);
        lecturerBroadcast({type:'suggestion-status',id:id,status:item.status});
    }

    function lecturerStartCollab(s,editor,statusEl){
        lecturerStopCollab();
        const db=client();
        if(!db||!db.channel||!s||!editor)return;
        lecturerResearchCollab.currentId=String(s.id);
        const channel=db.channel('nchsm-research-live-'+String(s.id),{config:{broadcast:{self:false},presence:{key:lecturerResearchCollab.clientId}}});
        lecturerResearchCollab.channel=channel;

        channel.on('broadcast',{event:'research-doc'},function(message){
            const p=message&&message.payload||{};
            if(!p||p.sender===lecturerResearchCollab.clientId)return;

            if(p.type==='document-state'&&typeof p.html==='string'){
                // Never replace the DOM while the lecturer is placing a caret, selecting text,
                // or typing. Replacing innerHTML during a selection destroys the selection and
                // makes the editor appear impossible to click/edit. Queue remote updates instead.
                if(lecturerResearchCollab.localEditing || document.activeElement===editor){
                    lecturerResearchCollab.pendingRemoteHtml=p.html;
                    if(statusEl)statusEl.textContent='Live update queued while you edit';
                    return;
                }
                lecturerResearchCollab.applyingRemote=true;
                if(editor.innerHTML!==p.html)editor.innerHTML=p.html;
                lecturerResearchCollab.applyingRemote=false;
                if(statusEl)statusEl.textContent='Live update received';
                return;
            }
            if(p.type==='comment-add'&&p.comment){
                const list=lecturerStoredArray(lecturerResearchCommentsKey(s));
                if(!list.some(function(x){return String(x.id)===String(p.comment.id)})){
                    list.push(p.comment);lecturerSaveArray(lecturerResearchCommentsKey(s),list);
                    lecturerRefreshCommentMarks(editor,s);lecturerRenderComments(s,editor);
                }
                return;
            }
            if(p.type==='comment-delete'){
                lecturerSaveArray(lecturerResearchCommentsKey(s),lecturerStoredArray(lecturerResearchCommentsKey(s)).filter(function(x){return String(x.id)!==String(p.id)}));
                lecturerRefreshCommentMarks(editor,s);lecturerRenderComments(s,editor);
                return;
            }
            if(p.type==='suggestion-add'&&p.suggestion){
                const list=lecturerStoredArray(lecturerResearchSuggestionsKey(s));
                if(!list.some(function(x){return String(x.id)===String(p.suggestion.id)})){
                    list.push(p.suggestion);lecturerSaveArray(lecturerResearchSuggestionsKey(s),list);lecturerRenderSuggestions(s,editor);
                }
                return;
            }
            if(p.type==='suggestion-status'){
                const list=lecturerStoredArray(lecturerResearchSuggestionsKey(s));
                const found=list.find(function(x){return String(x.id)===String(p.id)});
                if(found)found.status=p.status;
                lecturerSaveArray(lecturerResearchSuggestionsKey(s),list);lecturerRenderSuggestions(s,editor);
            }
        });

        channel.on('presence',{event:'sync'},function(){
            const stateNow=channel.presenceState();
            const count=Object.keys(stateNow||{}).length;
            const el=document.getElementById('rsCollaborators');
            if(el)el.textContent=count>1?count+' people editing':'Only you editing';
        });

        channel.subscribe(function(status){
            if(status==='SUBSCRIBED'){
                try{channel.track({user_id:state.userId,name:lecturerResearchName(),joined_at:new Date().toISOString()})}catch(e){}
                if(statusEl)statusEl.innerHTML='<i class="fas fa-circle" style="color:#18a957"></i> Live editing ready';
            }
        });

        editor.addEventListener('input',function(){
            if(lecturerResearchCollab.applyingRemote)return;
            const now=Date.now();
            if(now-lecturerResearchCollab.lastBroadcast<180)return;
            lecturerResearchCollab.lastBroadcast=now;
            lecturerBroadcast({type:'document-state',html:editor.innerHTML});
        });
    }

    function lecturerStopCollab(){
        if(lecturerResearchCollab.channel){
            try{lecturerResearchCollab.channel.untrack()}catch(e){}
            try{client().removeChannel(lecturerResearchCollab.channel)}catch(e){}
        }
        lecturerResearchCollab.channel=null;
        lecturerResearchCollab.currentId=null;
        lecturerResearchCollab.localEditing=false;
        lecturerResearchCollab.pendingRemoteHtml=null;
    }

    async function lecturerLoadDocument(s,editor){
        const url=await researchSignedUrl(s);
        const ext=String(s.document_name||s.document_path||'').toLowerCase().split('.').pop();
        if(ext==='pdf'){
            throw new Error('PDF documents are view-only for inline editing. Upload/send a revised PDF when correction is required.');
        }
        if(ext==='docx'||ext==='doc'){
            const resp=await fetch(url);
            if(!resp.ok)throw new Error('Could not read the Word document.');
            if(!window.mammoth){
                await new Promise((resolve,reject)=>{
                    const sc=document.createElement('script');
                    sc.src='https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
                    sc.onload=resolve;sc.onerror=()=>reject(new Error('Could not load DOCX editor library.'));
                    document.head.appendChild(sc);
                });
            }
            const out=await window.mammoth.convertToHtml({arrayBuffer:await resp.arrayBuffer()});
            editor.innerHTML=out.value||'<p></p>';
            return 'docx';
        }
        if(ext==='html'){
            const resp=await fetch(url);
            if(!resp.ok)throw new Error('Could not read the HTML document.');
            const raw=await resp.text();
            const match=raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            editor.innerHTML=match?match[1]:raw;
            return 'html';
        }
        throw new Error('This file type cannot be edited inline.');
    }

    async function ensureLecturerDocxGenerator(){
        if(window.docx&&window.docx.Document&&window.docx.Packer)return window.docx;
        return await new Promise(function(resolve,reject){
            var existing=document.querySelector('script[data-nchsm-docx-generator]');
            if(existing){
                existing.addEventListener('load',function(){if(window.docx&&window.docx.Document&&window.docx.Packer)resolve(window.docx);else reject(new Error('DOCX generator did not load.'))},{once:true});
                existing.addEventListener('error',function(){reject(new Error('Could not load the DOCX generator.'))},{once:true});
                return;
            }
            var sc=document.createElement('script');
            sc.src='https://cdn.jsdelivr.net/npm/docx@9.5.1/build/index.umd.js';
            sc.dataset.nchsmDocxGenerator='1';
            sc.onload=function(){if(window.docx&&window.docx.Document&&window.docx.Packer)resolve(window.docx);else reject(new Error('DOCX generator did not load correctly.'))};
            sc.onerror=function(){reject(new Error('Could not load the DOCX generator.'))};
            document.head.appendChild(sc);
        });
    }

    async function lecturerHtmlToDocxBlob(html,title){
        const docx=await ensureLecturerDocxGenerator();
        const host=document.createElement('div');
        host.innerHTML=html||'';
        const children=[];
        function runs(node,marks){
            const out=[];
            function walk(n,m){
                if(n.nodeType===3){
                    if(n.nodeValue)out.push(new docx.TextRun(Object.assign({text:n.nodeValue},m)));
                    return;
                }
                if(n.nodeType!==1)return;
                const tag=n.tagName.toLowerCase();
                const nm=Object.assign({},m);
                if(['strong','b'].includes(tag))nm.bold=true;
                if(['em','i'].includes(tag))nm.italics=true;
                if(tag==='u')nm.underline={};
                if(['s','strike','del'].includes(tag))nm.strike=true;
                Array.from(n.childNodes).forEach(function(c){walk(c,nm)});
            }
            walk(node,marks||{});
            return out;
        }
        Array.from(host.children).forEach(function(el){
            const tag=el.tagName.toLowerCase();
            if(/^h[1-6]$/.test(tag)){
                children.push(new docx.Paragraph({heading:docx.HeadingLevel['HEADING_'+tag.slice(1)],children:runs(el,{bold:true})}));
            }else if(tag==='li'){
                children.push(new docx.Paragraph({bullet:{level:0},children:runs(el,{})}));
            }else if(tag==='hr'){
                children.push(new docx.Paragraph({children:[new docx.TextRun({text:'____________________________'})]}));
            }else{
                const rr=runs(el,{});
                if(rr.length)children.push(new docx.Paragraph({children:rr}));
            }
        });
        if(!children.length)children.push(new docx.Paragraph({children:[new docx.TextRun({text:title||'Research Paper'})]}));
        const d=new docx.Document({sections:[{properties:{},children:children}]});
        return await docx.Packer.toBlob(d);
    }

    function lecturerCorrectionFileName(s,next,ext){
        const original=String(s.document_name||s.document_path||'Research Paper').split(/[\\/]/).pop();
        const stem=original.replace(/\.(docx?|html?)$/i,'').trim()||String(s.title||'Research').replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Research';
        return stem+'_Lecturer_Correction_V'+next+'.'+ext;
    }


    function lecturerResearchExtension(s){
        const raw=String(s?.document_name||s?.document_path||'').toLowerCase();
        const m=raw.match(/\.([a-z0-9]+)(?:[?#].*)?$/);
        return m?m[1]:'';
    }

    function lecturerResearchRootDocument(current){
        const group=current?.research_group_id||current?.id;
        const versions=(researchState.submissions||[]).filter(x=>
            String(x.research_group_id||x.id)===String(group)
        ).sort((a,b)=>
            Number(a.version_number||1)-Number(b.version_number||1)
        );
        return versions[0]||current;
    }

    async function ensureLecturerDocxGenerator(){
        if(window.docx?.Document && window.docx?.Packer) return window.docx;
        return await new Promise(function(resolve,reject){
            const old=document.querySelector('script[data-nchsm-docx-generator]');
            if(old){
                old.addEventListener('load',()=>resolve(window.docx));
                old.addEventListener('error',()=>reject(new Error('DOCX generator could not load.')));
                return;
            }
            const s=document.createElement('script');
            s.src='https://cdn.jsdelivr.net/npm/docx@9.5.1/build/index.umd.js';
            s.dataset.nchsmDocxGenerator='1';
            s.onload=()=>window.docx?resolve(window.docx):reject(new Error('DOCX generator unavailable.'));
            s.onerror=()=>reject(new Error('DOCX generator could not load.'));
            document.head.appendChild(s);
        });
    }

    function lecturerDocxTextRuns(node,docx){
        const out=[];
        function walk(n,style={}){
            n.childNodes?.forEach(function(ch){
                if(ch.nodeType===3){
                    if(ch.nodeValue) out.push(new docx.TextRun({
                        text:ch.nodeValue,
                        bold:!!style.bold,
                        italics:!!style.italics,
                        underline:style.underline?'single':undefined,
                        strike:!!style.strike
                    }));
                    return;
                }
                if(ch.nodeType!==1)return;
                const tag=ch.tagName.toLowerCase();
                const next=Object.assign({},style,{
                    bold:style.bold||tag==='strong'||tag==='b',
                    italics:style.italics||tag==='em'||tag==='i',
                    underline:style.underline||tag==='u',
                    strike:style.strike||tag==='s'||tag==='strike'
                });
                if(['br'].includes(tag)){out.push(new docx.TextRun({text:'\\n'}));return;}
                walk(ch,next);
            });
        }
        walk(node);
        return out.length?out:[new docx.TextRun({text:''})];
    }

    async function lecturerHtmlToDocxBlob(html,title){
        const docx=await ensureLecturerDocxGenerator();
        const parsed=new DOMParser().parseFromString(String(html||''),'text/html');
        const children=[];
        [...(parsed.body?.children||[])].forEach(function(el){
            const tag=el.tagName.toLowerCase();
            const runs=lecturerDocxTextRuns(el,docx);
            if(/^h[1-6]$/.test(tag)){
                const level=Math.min(6,Number(tag.slice(1)));
                children.push(new docx.Paragraph({
                    children:runs,
                    heading:level===1?docx.HeadingLevel.HEADING_1:
                            level===2?docx.HeadingLevel.HEADING_2:
                            level===3?docx.HeadingLevel.HEADING_3:
                            level===4?docx.HeadingLevel.HEADING_4:
                            level===5?docx.HeadingLevel.HEADING_5:
                            docx.HeadingLevel.HEADING_6
                }));
            }else{
                children.push(new docx.Paragraph({children:runs}));
            }
        });
        if(!children.length) children.push(new docx.Paragraph({children:[new docx.TextRun({text:String(parsed.body?.textContent||'')})]}));
        const document=new docx.Document({
            sections:[{
                properties:{},
                children
            }]
        });
        return await docx.Packer.toBlob(document);
    }

    // ============================================================
    // 📧 RESEARCH REVISION EMAIL NOTIFICATION
    // Sends a notification only — no grades/scores are included.
    // Uses the existing Supabase Edge Function: send-email.
    // ============================================================
    async function sendResearchRevisionNotification(submission, profile, feedback){
        try{
            const db=client();
            if(!db) return false;

            let student=profile||{};
            if(!student.email && submission?.student_id){
                const lookup=await db.from('consolidated_user_profiles_table')
                    .select('user_id,full_name,student_id,admission_number,email,program,intake_year,current_block,block')
                    .eq('user_id',submission.student_id)
                    .maybeSingle();
                if(!lookup.error && lookup.data) student=lookup.data;
            }

            if(!student?.email){
                console.warn('⚠️ No email found for research student:',submission?.student_id);
                return false;
            }

            const name=esc(student.full_name||'Student');
            const title=esc(submission.title||'Research Paper');
            const type=esc(String(submission.submission_type||'research').replace(/_/g,' '));
            const version=esc(submission.version_number||1);
            const safeFeedback=feedback ? esc(feedback) : '';
            const portalUrl='https://nchsm.co.ke';

            const html=`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Research Corrections Required</title>
<style>
body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f0f4f8;color:#243447}.container{max-width:580px;margin:0 auto;padding:20px}.card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#0A3D62,#1a5276);padding:30px 35px;text-align:center;color:#fff}.header img{width:70px;height:70px;border-radius:50%;background:#fff;padding:5px;margin-bottom:10px}.header h1{margin:0;font-size:24px}.header p{margin:4px 0 0;opacity:.82}.body{padding:30px 35px}.notice{background:#FFF7ED;border:2px solid #F59E0B;border-radius:16px;padding:22px;text-align:center;margin:18px 0}.notice .icon{font-size:2.6rem;display:block;margin-bottom:8px}.notice .message{font-size:1.08rem;color:#92400E;font-weight:700}.notice .sub{color:#7C5A2B;font-size:.94rem;margin-top:5px}.info{background:#f8fafc;border-radius:14px;padding:20px 24px;margin:18px 0;border-left:4px solid #0A3D62}.info p{margin:7px 0;font-size:14px}.label{color:#64748b;font-weight:500}.value{color:#0A3D62;font-weight:650}.feedback{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;margin:18px 0}.feedback h3{margin:0 0 8px;color:#1E40AF;font-size:14px}.feedback p{margin:0;white-space:pre-wrap;line-height:1.6;font-size:14px;color:#334155}.btn{display:inline-block;background:linear-gradient(135deg,#0A3D62,#1a5276);color:#fff!important;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;margin:8px 0}.footer{background:#f8fafc;padding:22px 35px;text-align:center;border-top:1px solid #eef2f7}.footer p{font-size:12px;color:#8a9aa8;margin:4px 0}@media(max-width:480px){.header{padding:22px 18px}.body{padding:22px 18px}.footer{padding:18px}}
</style></head><body><div class="container"><div class="card">
<div class="header"><img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo"><h1>📝 Research Corrections Required</h1><p>Nakuru College of Health Sciences and Management</p></div>
<div class="body"><p>Dear <strong>${name}</strong>,</p><p>Your lecturer has reviewed your research submission and has provided <strong>corrections that require your attention</strong>.</p>
<div class="notice"><span class="icon">📝</span><div class="message">Research Corrections Are Ready</div><div class="sub">Log in to the NCHSM Student Portal to view your lecturer's corrections and submit your revised research document.</div></div>
<div class="info"><p><span class="label">📚 Research Title</span><br><span class="value">${title}</span></p><p><span class="label">📄 Submission Type</span><br><span class="value">${type}</span></p><p><span class="label">🔢 Version</span><br><span class="value">V${version}</span></p>${student.program?`<p><span class="label">🎓 Program</span><br><span class="value">${esc(student.program)}</span></p>`:''}</div>
${safeFeedback?`<div class="feedback"><h3>💬 Lecturer Feedback</h3><p>${safeFeedback}</p></div>`:''}
<div style="text-align:center;margin:25px 0 10px"><a class="btn" href="${portalUrl}">🔑 Open Student Portal</a></div>
<p style="font-size:12px;color:#64748b;text-align:center">Please review every correction provided by your lecturer, make the required changes, and submit the corrected version through the Research Papers section of the Online Learning portal.</p>
</div><div class="footer"><p><strong>Nakuru College of Health Sciences and Management</strong></p><p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p><p>This is an automated notification. Please do not reply to this email.</p></div>
</div></div></body></html>`;

            const result=await db.functions.invoke('send-email',{body:{
                to:student.email,
                subject:`📝 Research Corrections Required - ${submission.title||'Research Paper'}`,
                html,
                from:'NCHSM Research Office <admin@nchsm.co.ke>'
            }});
            if(result.error){
                console.error('❌ Research revision email failed:',result.error);
                return false;
            }
            if(result.data && result.data.success===false){
                console.error('❌ Research revision email failed:',result.data.error||result.data);
                return false;
            }
            console.log(`✅ Research revision notification sent to ${student.email}`);
            return true;
        }catch(error){
            console.error('❌ Research revision email error:',error);
            return false;
        }
    }

    async function saveLecturerCorrection(){
        const s=researchState.current;
        const editor=document.getElementById('rsInlineEditor');
        const db=client();
        if(!s||!editor||!db)return;
        const html=editor.innerHTML.trim();
        if(!html||html==='<br>')return notify('There is no corrected document content to send.','warning');
        const feedback=($('rsFeedback')?.value||'').trim()||null;
        const btn=$('rsSendCorrection');
        if(btn)btn.disabled=true;
        let path=null;
        try{
            await resolveUser();
            if(!state.userId)throw new Error('Lecturer user ID could not be resolved.');
            const group=s.research_group_id||s.id;
            const rows=researchState.submissions.filter(function(x){
                return String(x.research_group_id||x.id)===String(group);
            });
            const next=rows.reduce(function(mx,x){return Math.max(mx,Number(x.version_number)||1)},Number(s.version_number)||1)+1;
            const original=String(s.document_name||s.document_path||'').toLowerCase();
            const isDocx=/\.docx?$/.test(original);
            const isHtml=/\.html?$/.test(original);
            if(!isDocx&&!isHtml)throw new Error('This document type cannot be corrected inline. PDF files remain view-only.');
            const ext=isDocx?'docx':'html';
            const filename=lecturerCorrectionFileName(s,next,ext);
            path=state.userId+'/'+group+'/lecturer-corrections/'+Date.now()+'_'+filename;

            let blob,contentType;
            if(isDocx){
                blob=await lecturerHtmlToDocxBlob(html,s.title||'Research Paper');
                contentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            }else{
                const wrapper='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(s.title||'Research Correction')+'</title><style>body{font-family:Arial,sans-serif;line-height:1.7;max-width:850px;margin:40px auto;padding:0 40px;color:#202b38}img{max-width:100%}</style></head><body>'+html+'</body></html>';
                blob=new Blob([wrapper],{type:'text/html'});
                contentType='text/html';
            }
            const upload=await db.storage.from('research-papers').upload(path,blob,{upsert:false,contentType:contentType});
            if(upload.error)throw upload.error;
            const now=new Date().toISOString();
            const payload={
                student_id:s.student_id,
                research_group_id:group,
                version_number:next,
                title:s.title,
                submission_type:'correction',
                supervisor_name:s.supervisor_name||null,
                abstract:s.abstract||null,
                status:'revision_required',
                document_name:filename,
                document_path:path,
                feedback:feedback,
                reviewed_by:state.userId,
                reviewed_at:now,
                submitted_at:now,
                created_at:now,
                updated_at:now
            };
            const ins=await db.from('research_submissions').insert(payload).select().single();
            if(ins.error){
                try{await db.storage.from('research-papers').remove([path])}catch(e){}
                throw ins.error;
            }
            const insertedSubmission=ins.data||payload;
            const studentProfile=researchState.profiles.get(s.student_id)||{};
            const emailSent=await sendResearchRevisionNotification(insertedSubmission,studentProfile,feedback);
            notify(emailSent
                ? 'Research corrections sent as Version '+next+' ('+ext.toUpperCase()+'). Student email notification sent.'
                : 'Research corrections saved as Version '+next+' ('+ext.toUpperCase()+'), but the student email notification could not be sent.',
                emailSent?'success':'warning');
            await loadResearch();
            closeResearchModal();
        }catch(e){
            if(path){try{await db.storage.from('research-papers').remove([path])}catch(ignore){}}
            console.error('Lecturer correction failed:',e);
            notify('Could not send correction: '+(e.message||e),'error');
        }finally{
            if(btn)btn.disabled=false;
        }
    }

    async function openResearchReview(id) {
        const s = researchState.submissions.find(x => String(x.id) === String(id));
        if (!s) return notify('Research submission not found.', 'error');
        researchState.current = s;
        const p = researchState.profiles.get(s.student_id) || {};
        researchEnsureUI();

        $('rsModalTitle').textContent = s.title || 'Research Submission';
        $('rsModalMeta').textContent = `${p.full_name || 'Student'} · ${p.admission_number || p.student_id || ''} · Version ${s.version_number || 1}`;
        $('rsStudentMeta').innerHTML =
            `<b>${esc(p.full_name || 'Student')}</b><br>${esc(p.admission_number || p.student_id || '')}<br>${esc(p.email || '')}<br>${esc(p.program || '')}${p.intake_year ? ' · Intake ' + esc(p.intake_year) : ''}${p.current_block || p.block ? ' · ' + esc(p.current_block || p.block) : ''}` +
            `<hr style="border:0;border-top:1px solid #e2e8f0;margin:12px 0"><b>Research Type:</b> ${esc(String(s.submission_type || 'research').replace(/_/g,' '))}<br><b>Supervisor:</b> ${esc(s.supervisor_name || 'Not specified')}<br><b>Submitted:</b> ${esc(fmtDate(s.submitted_at || s.created_at))}`;

        $('rsReviewStatus').value = s.status || 'submitted';
        $('rsFeedback').value = s.feedback || '';
        $('rsFileInfo').innerHTML = `<b>Document:</b> ${esc(s.document_name || 'Not attached')}<br><b>Current status:</b> ${esc(researchStatusLabel(s.status))}`;

        $('rsPreview').innerHTML = `
          <div class="rs-review-main">
            <div class="rs-review-toolbar">
              <button type="button" data-rs-cmd="undo" title="Undo">↶</button>
              <button type="button" data-rs-cmd="redo" title="Redo">↷</button>
              <select data-rs-format title="Text style">
                <option value="p">Normal text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option>
              </select>
              <button type="button" data-rs-cmd="bold"><b>B</b></button>
              <button type="button" data-rs-cmd="italic"><i>I</i></button>
              <button type="button" data-rs-cmd="underline"><u>U</u></button>
              <button type="button" class="rs-color-btn" data-rs-text-color title="Text color"><b>A</b><span class="rs-color-indicator" style="background:#000"></span></button>
              <button type="button" class="rs-color-btn rs-highlight-btn" data-rs-highlight-color title="Highlight color"><i class="fas fa-highlighter"></i><span class="rs-color-indicator" style="background:#ffff00"></span></button>
              <button type="button" data-rs-cmd="justifyLeft"><i class="fas fa-align-left"></i></button>
              <button type="button" data-rs-cmd="justifyCenter"><i class="fas fa-align-center"></i></button>
              <button type="button" data-rs-cmd="justifyRight"><i class="fas fa-align-right"></i></button>
              <button type="button" data-rs-cmd="insertUnorderedList"><i class="fas fa-list-ul"></i></button>
              <button type="button" data-rs-cmd="insertOrderedList"><i class="fas fa-list-ol"></i></button>
              <button type="button" data-rs-comment-add title="Comment"><i class="fas fa-comment"></i></button>
              <button type="button" data-rs-suggestion-add title="Suggest change"><i class="fas fa-pen-ruler"></i></button>
              <button type="button" data-rs-fullscreen title="Full Screen"><i class="fas fa-expand"></i></button>
              <span class="rs-review-status" id="rsCollaborators">Connecting…</span>
            </div>
            <div class="rs-editor-wrap">
              <article id="rsInlineEditor" class="rs-editor-page" contenteditable="true" spellcheck="true"></article>
            </div>
            <div class="rs-comments-panel">
              <div class="rs-comment-tabs">
                <button type="button" class="active" data-rs-comment-tab="comments">Comments</button>
                <button type="button" data-rs-comment-tab="suggestions">Suggestions</button>
              </div>
              <div id="rsCommentsList"></div>
              <div id="rsSuggestionsList" style="display:none"></div>
            </div>
          </div>`;

        const modal=$('rsReviewModal');
        const dialog=modal.querySelector('.rs-dialog');
        modal.style.display='flex';
        modal.setAttribute('aria-hidden','false');

        const editor=$('rsInlineEditor');
        const statusEl=$('rsCollaborators');

        // Force a real browser editing surface. This prevents parent CSS, touch handlers,
        // or collaboration updates from making the document feel read-only.
        editor.setAttribute('contenteditable','true');
        editor.contentEditable='true';
        editor.spellcheck=true;
        editor.style.pointerEvents='auto';
        editor.style.userSelect='text';
        editor.style.webkitUserSelect='text';
        editor.style.cursor='text';
        editor.onfocus=function(){
            lecturerResearchCollab.localEditing=true;
        };
        editor.onblur=function(){
            lecturerResearchCollab.localEditing=false;
            if(lecturerResearchCollab.pendingRemoteHtml!==null && lecturerResearchCollab.pendingRemoteHtml!==undefined){
                const pending=lecturerResearchCollab.pendingRemoteHtml;
                lecturerResearchCollab.pendingRemoteHtml=null;
                if(editor.innerHTML!==pending){
                    lecturerResearchCollab.applyingRemote=true;
                    editor.innerHTML=pending;
                    lecturerResearchCollab.applyingRemote=false;
                }
            }
        };
        editor.addEventListener('mousedown',function(e){
            // Never cancel normal mouse selection/caret placement inside the document.
            e.stopPropagation();
        });
        editor.addEventListener('pointerdown',function(e){
            e.stopPropagation();
        });

        try{
            const kind=await lecturerLoadDocument(s,editor);
            if(statusEl)statusEl.textContent='Loaded · '+kind.toUpperCase();
            lecturerRefreshCommentMarks(editor,s);
            lecturerRenderComments(s,editor);
            lecturerRenderSuggestions(s,editor);
            lecturerStartCollab(s,editor,statusEl);
        }catch(e){
            console.error('Research document editor:',e);
            editor.innerHTML='<p style="color:#b42318">'+esc(e.message||e)+'</p>';
            if(statusEl)statusEl.textContent='View only';
        }

        modal.querySelectorAll('[data-rs-cmd]').forEach(btn=>{
            btn.addEventListener('mousedown',e=>{
                e.preventDefault();editor.focus();document.execCommand(btn.dataset.rsCmd,false,null);
            });
        });

        const fmt=modal.querySelector('[data-rs-format]');
        if(fmt)fmt.addEventListener('change',function(){editor.focus();document.execCommand('formatBlock',false,this.value)});

        const commentBtn=modal.querySelector('[data-rs-comment-add]');
        if(commentBtn)commentBtn.onclick=()=>lecturerAddComment(s,editor);

        const suggestionBtn=modal.querySelector('[data-rs-suggestion-add]');
        if(suggestionBtn)suggestionBtn.onclick=()=>lecturerAddSuggestion(s,editor);


        modal.querySelectorAll('[data-rs-comment-tab]').forEach(btn=>btn.onclick=function(){
            modal.querySelectorAll('[data-rs-comment-tab]').forEach(x=>x.classList.toggle('active',x===btn));
            $('rsCommentsList').style.display=btn.dataset.rsCommentTab==='comments'?'block':'none';
            $('rsSuggestionsList').style.display=btn.dataset.rsCommentTab==='suggestions'?'block':'none';
        });

        const panel=modal.querySelector('.rs-comments-panel');
        if(panel)panel.onclick=function(e){
            const resolve=e.target.closest('[data-rs-comment-resolve]');
            if(resolve){lecturerResolveComment(s,resolve.dataset.rsCommentResolve,editor);return}
            const accept=e.target.closest('[data-rs-suggestion-accept]');
            if(accept){lecturerApplySuggestion(s,accept.dataset.rsSuggestionAccept,true,editor);return}
            const reject=e.target.closest('[data-rs-suggestion-reject]');
            if(reject){lecturerApplySuggestion(s,reject.dataset.rsSuggestionReject,false,editor);return}
        };
    }

    async function downloadCurrentResearch() {
        const s = researchState.current;
        if (!s) return;
        try {
            const url = await researchSignedUrl(s);
            const a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener';
            a.click();
        } catch (e) {
            notify('Could not download the research document: ' + (e.message || e), 'error');
        }
    }

    async function saveResearchReview() {
        const s = researchState.current;
        const db = client();
        if (!s || !db) return;
        await resolveUser();
        if (!state.userId) return notify('Lecturer user ID could not be resolved.', 'error');

        const status = $('rsReviewStatus').value;
        const feedback = $('rsFeedback').value.trim() || null;
        const payload = {
            status,
            feedback,
            reviewed_by: state.userId,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const { error } = await db.from('research_submissions').update(payload).eq('id', s.id);
        if (error) {
            console.error('Research review update:', error);
            return notify('Could not save Research review: ' + error.message, 'error');
        }
        const previousStatus=s.status;
        Object.assign(s, payload);
        if(status==='revision_required' && previousStatus!=='revision_required'){
            const studentProfile=researchState.profiles.get(s.student_id)||{};
            const emailSent=await sendResearchRevisionNotification(s,studentProfile,feedback);
            notify(emailSent
                ? 'Research review saved. Research corrections notification sent to the student.'
                : 'Research review saved, but the research corrections email notification could not be sent.',
                emailSent?'success':'warning');
        }else{
            notify('Research review saved successfully.', 'success');
        }
        closeResearchModal();
        await loadResearch();
    }

    function closeResearchModal() {
        lecturerStopCollab();
        const m = $('rsReviewModal');
        const dialog=m&&m.querySelector('.rs-dialog');
        if(dialog)dialog.classList.remove('rs-fullscreen');
        if (m) {
            m.style.display = 'none';
            m.setAttribute('aria-hidden', 'true');
        }
        researchState.current = null;
    }

    if(!window.__nchsmLecturerResearchEscBound){
        window.__nchsmLecturerResearchEscBound=true;
        document.addEventListener('keydown',function(e){
            if(e.key!=='Escape')return;
            const m=$('rsReviewModal');
            const d=m&&m.querySelector('.rs-dialog');
            if(!m||m.style.display==='none')return;
            if(d&&d.classList.contains('rs-fullscreen')){
                lecturerExitResearchFullscreen();
                const b=m.querySelector('[data-rs-fullscreen]');
                if(b)b.innerHTML='<i class="fas fa-expand"></i>';
                e.preventDefault();
            }else{
                closeResearchModal();
                e.preventDefault();
            }
        });
    }

    // ============================================================
    // 📧 ASSIGNMENT RESULT EMAIL NOTIFICATION
    // Sends only when the lecturer RELEASES the graded result.
    // The email intentionally contains no marks/percentage.
    // ============================================================
    async function initResearch() {
        if (researchState.initialized) return;
        researchState.initialized = true;
        researchEnsureUI();
        await loadResearch();
    }


    // ============================================================
    // MARKING KEY MANAGER
    // ============================================================
    let managerSelectedKeyId=null;

    function renderMarkingKeyList(){
        const list=$('olMarkingKeyList');
        if(!list)return;
        if(!markingKeyState.keys.length){
            list.innerHTML='<div class="ol-empty" style="padding:30px 10px">No active institutional marking keys found.</div>';
            return;
        }
        list.innerHTML=markingKeyState.keys.map(k=>{
            const active=String(k.id)===String(managerSelectedKeyId);
            const verified=String(k.validation_status||'').toLowerCase()==='verified';
            return `<button type="button" data-key-id="${esc(k.id)}" style="display:block;width:100%;text-align:left;border:1px solid ${active?'#a5b4fc':'#e5e7eb'};background:${active?'#f5f3ff':'#fff'};border-radius:10px;padding:11px;margin-bottom:7px;cursor:pointer">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
                    <strong style="font-size:12px;color:#0f172a">${esc(k.title||'Untitled Key')}</strong>
                    <span class="ol-badge ${verified?'ol-published':'ol-review'}">${esc(k.validation_status||'UNVERIFIED')}</span>
                </div>
                <div style="font-size:10px;color:#64748b;margin-top:4px">v${esc(k.version||'1')} · ${esc(k.max_marks||0)} marks</div>
            </button>`;
        }).join('');
        list.querySelectorAll('[data-key-id]').forEach(b=>b.addEventListener('click',()=>{
            managerSelectedKeyId=b.dataset.keyId;
            previewMarkingKey(managerSelectedKeyId);
            renderMarkingKeyList();
        }));
    }

    function renderMarkingKeyEditor(key){
        const title=$('olKeyEditorTitle'),meta=$('olKeyEditorMeta'),body=$('olCriteriaEditorBody'),summary=$('olKeyValidationSummary');
        if(!key){
            if(title)title.textContent='Select a marking key';
            if(meta)meta.textContent='No key selected.';
            if(body)body.innerHTML='<div class="ol-empty">Choose a marking key from the left.</div>';
            if(summary)summary.className='ol-validation warn';
            return;
        }
        if(title)title.textContent=key.title||'Marking Key';
        if(meta)meta.textContent=`Version ${key.version||'1'} · ${key.max_marks||0} marks · ${key.source_document||'Institutional source'}`;
        const criteria=criterionNodes(parseJsonArray(key.criteria));
        const sum=criteria.reduce((n,c)=>n+Number(c.max_marks||0),0);
        const verified=String(key.validation_status||'').toLowerCase()==='verified';
        if(summary){
            summary.className='ol-validation '+(verified?'ok':'warn');
            summary.innerHTML=verified
                ? `<i class="fas fa-circle-check"></i><div><b>Verified</b> · ${criteria.length} criteria · ${sum} structured marks.</div>`
                : `<i class="fas fa-circle-info"></i><div><b>${esc(key.validation_status||'Unverified')}</b> · ${criteria.length} criteria · ${sum} structured marks.</div>`;
        }
        if(body){
            body.innerHTML=criteria.map((c,i)=>{
                const reqs=c.requirements||[];
                return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:9px;background:#fff">
                    <div style="display:flex;justify-content:space-between;gap:10px"><strong>${i+1}. ${esc(c.criterion)}</strong><strong>${esc(c.max_marks)} marks</strong></div>
                    ${c.description?`<div style="font-size:11px;color:#64748b;margin-top:4px">${esc(c.description)}</div>`:''}
                    ${reqs.length?`<div style="margin-top:8px">${reqs.map(r=>`<div style="padding:6px 8px;border-left:3px solid #c7d2fe;margin:4px 0;background:#f8fafc;font-size:11px"><b>${esc(r.description)}</b><span style="float:right">${esc(r.max_marks??r.weight??'—')}</span>${r.evidence_terms?.length?`<div style="color:#64748b;margin-top:2px">${esc(r.evidence_terms.join(' · '))}</div>`:''}</div>`).join('')}</div>`:'<div style="font-size:11px;color:#94a3b8;margin-top:7px">No sub-requirements configured.</div>'}
                </div>`;
            }).join('')||'<div class="ol-empty">No structured criteria.</div>';
        }
    }

    async function openMarkingKeyManager(){
        try{
            await loadMarkingKeys();
            managerSelectedKeyId=markingKeyState.keys[0]?.id||null;
            renderMarkingKeyList();
            previewMarkingKey(managerSelectedKeyId);
            $('olMarkingKeyModal').style.display='flex';
        }catch(e){console.error(e);notify('Could not load marking keys: '+(e.message||e),'error');}
    }

    async function previewMarkingKey(id){
        const key=markingKeyState.keys.find(k=>String(k.id)===String(id));
        if(!key)return;
        managerSelectedKeyId=key.id;
        renderMarkingKeyEditor(key);
    }

    async function previewAssignmentMarkingKey(){
        const id=$('olMarkingKeyId')?.value;
        const key=markingKeyState.keys.find(k=>String(k.id)===String(id));
        if(!key)return notify('Select a marking key first.','warning');
        renderMarkingKeyEditor(key);
        const title=key.title||'Marking Key';
        alert(`${title}\nVersion ${key.version||'1'}\nStatus: ${key.validation_status||'unverified'}\nMaximum: ${key.max_marks||0} marks\n\nThe full criteria are shown in the Marking Key Manager.`);
    }

    async function duplicateMarkingKey(){
        const source=markingKeyState.keys.find(k=>String(k.id)===String(managerSelectedKeyId));
        if(!source)return notify('Select a marking key first.','warning');
        const next=Number(source.version||1)+1;
        const title=prompt('Title for the new marking-key version:',`${source.title} v${next}`);
        if(title===null)return;
        const db=client();if(!db)throw new Error('Supabase client unavailable.');
        await resolveUser();
        const payload={
            title:title.trim()||source.title,
            description:source.description||null,
            max_marks:source.max_marks,
            criteria:source.criteria,
            keywords:source.keywords||[],
            expected_topics:source.expected_topics||[],
            grading_guidance:source.grading_guidance||null,
            version:next,
            is_active:false,
            created_by:state.userId,
            grading_schema_version:source.grading_schema_version||2,
            source_document:source.source_document||null,
            source_notes:source.source_notes||null,
            allocated_marks:source.allocated_marks||source.max_marks,
            validation_status:'draft'
        };
        const r=await db.from('online_marking_keys').insert(payload).select().single();
        if(r.error)throw r.error;
        notify(`Created marking-key version ${next} as a draft. It must be validated/published according to institutional workflow.`,'success');
        await loadMarkingKeys();managerSelectedKeyId=r.data.id;renderMarkingKeyList();renderMarkingKeyEditor(r.data);
    }

    async function createMarkingKey(){
        const title=prompt('New institutional marking key title:');
        if(title===null||!title.trim())return;
        const db=client();if(!db)throw new Error('Supabase client unavailable.');
        await resolveUser();
        const r=await db.from('online_marking_keys').insert({
            title:title.trim(),
            description:null,max_marks:100,criteria:[],keywords:[],expected_topics:[],
            grading_guidance:null,version:1,is_active:false,created_by:state.userId,
            grading_schema_version:2,source_document:null,source_notes:null,
            allocated_marks:100,validation_status:'draft'
        }).select().single();
        if(r.error)throw r.error;
        notify('Draft marking key created. Add the institutional criteria in the manager/editor workflow.','success');
        await loadMarkingKeys();managerSelectedKeyId=r.data.id;renderMarkingKeyList();renderMarkingKeyEditor(r.data);
    }

    async function validateMarkingKey(){
        const key=markingKeyState.keys.find(k=>String(k.id)===String(managerSelectedKeyId));
        if(!key)return notify('Select a marking key first.','warning');
        const criteria=criterionNodes(parseJsonArray(key.criteria));
        const total=criteria.reduce((n,c)=>n+Number(c.max_marks||0),0);
        const declared=Number(key.allocated_marks??key.max_marks??0);
        const max=Number(key.max_marks??0);
        const missing=criteria.filter(c=>!c.criterion||Number(c.max_marks)<=0);
        const summary=$('olKeyValidationSummary');
        const problems=[];
        if(!criteria.length)problems.push('No structured criteria are configured.');
        if(max<=0)problems.push('Maximum marks must be greater than zero.');
        if(total!==max)problems.push(`Structured criteria total ${total}, declared maximum ${max}.`);
        if(declared>0&&total!==declared)problems.push(`Allocated marks field is ${declared}, while structured criteria total ${total}.`);
        if(missing.length)problems.push('One or more criteria have missing marks.');
        if(summary){
            summary.className='ol-validation '+(problems.length?'warn':'ok');
            summary.innerHTML=problems.length
                ? `<i class="fas fa-triangle-exclamation"></i><div><b>Validation review required</b><br>${esc(problems.join(' '))}</div>`
                : `<i class="fas fa-circle-check"></i><div><b>Structurally valid</b> · ${criteria.length} criteria · ${total} marks.</div>`;
        }
        renderMarkingKeyEditor(key);
        return {valid:!problems.length,problems,total,max};
    }

    return {
        syncSubmissionMaximumMarks,
        resolveSubmissionMaxMarks,
        init,
        load,
        renderAssignments,
        loadSubmissions,
        openAssignmentModal,
        editAssignment,
        saveAssignment,
        saveAndPublish,
        addQuestionEditor,
        renumberQuestions,
        togglePublish,
        deleteAssignment,
        loadAssignmentTargeting,
        refreshIntakesForProgram,
        refreshBlocksForProgramIntake,
        loadMarkingKeys,
        markingKeyState,
        openMarkingKeyManager,
        previewMarkingKey,
        previewAssignmentMarkingKey,
        duplicateMarkingKey,
        validateMarkingKey,
        createMarkingKey,
        getAssignmentGradingConfig,
        fetchSubmissionMarkingKey,
        populateAssignmentGradingFields,
        reviewSubmission,
        runDeterministicGrade,
        autoGradeUsingMarkingKey: runDeterministicGrade,
        saveCriterionMark,
        saveGradingDraft,
        returnSubmission,
        submitFinalGrade,
        openSubmissionDocument,
        downloadSubmissionDocument,
        updateGradePercentage,
        closeModal,
        viewSubmissionDocument,
        closeDocumentViewer,
        initResearch,
        loadResearch,
        openResearchReview,
        saveResearchReview,
        closeResearchModal
    };

})();
;
