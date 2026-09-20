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
    async function loadSubmissions(){
        const db=client();if(!db)return; const filter=$('olSubmissionAssignmentFilter')?.value;
        let q=db.from('online_submissions').select('*, online_assignments(title,unit_code)').order('submitted_at',{ascending:false}); if(filter)q=q.eq('assignment_id',filter);
        const {data,error}=await q; if(error){console.warn('Submission load:',error.message);state.submissions=[];}else state.submissions=data||[];
        const body=$('olSubmissionsTable');if(!body)return; if(!state.submissions.length){body.innerHTML='<tr><td colspan="7" class="ol-empty">No student submissions yet.</td></tr>';updateStats();return;}
        // Resolve profile names through consolidated_user_profiles_table. RLS should permit lecturers/admins.
        const ids=[...new Set(state.submissions.map(s=>s.student_id).filter(Boolean))]; let profiles=[];
        if(ids.length){const r=await db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,email').in('user_id',ids);profiles=r.data||[];}
        const map=new Map(profiles.map(p=>[p.user_id,p]));
        body.innerHTML=state.submissions.map(s=>{const p=map.get(s.student_id)||{};const mark=s.marks_obtained==null?'—':`${s.marks_obtained}/${s.max_marks||'?'}`;const pct=s.marks_obtained==null?'—':formatPercentage(s.marks_obtained,s.max_marks);return `<tr><td><b>${esc(p.full_name||'Student')}</b><div style="font-size:11px;color:#64748b">${esc(p.admission_number||p.student_id||s.student_id||'')}</div></td><td>${esc(s.online_assignments?.title||s.assignment_id)}</td><td>${fmtDate(s.submitted_at)}</td><td>${esc(s.attempt_number||1)}</td><td><b>${mark}</b><div style="font-size:11px;color:#64748b;margin-top:2px">${pct}</div></td><td><span class="ol-badge ${s.result_released?'ol-returned':s.review_required?'ol-review':'ol-draft'}">${s.result_released?'RELEASED':s.review_required?'REVIEW':'SUBMITTED'}</span></td><td><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.reviewSubmission('${s.id}')">Review</button></td></tr>`}).join('');updateStats();
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
        const gradingMode=$('olGradingMode')?.value||'topic_keywords';
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
            notify('Select a formal marking key or switch Grading Mode to Topic / Keywords.','error');
            return false;
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
    const integrityState = { currentSubmission:null, extractedText:'', report:null };
    const INTEGRITY_FUNCTION = window.NCHSM_AI_INTEGRITY_FUNCTION || 'academic-integrity-scan';
    const STORAGE_BUCKET = window.NCHSM_ASSIGNMENT_BUCKET || 'assignment-submissions';

    function ensureStyle(){
        if(document.getElementById('olIntegrityStyles')) return;
        const st=document.createElement('style'); st.id='olIntegrityStyles';
        st.textContent=`
        .ol-document-viewer{position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:100005;display:none;align-items:center;justify-content:center;padding:12px}
        .ol-document-card{background:#fff;width:min(1200px,100%);height:min(94vh,1000px);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.35)}
        .ol-document-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid #e5e7eb}
        .ol-document-body{flex:1;overflow:auto;background:#f1f5f9;padding:16px}.ol-document-frame{width:100%;height:100%;min-height:650px;border:0;background:#fff}.ol-docx{background:#fff;max-width:900px;margin:auto;padding:45px 55px;min-height:90%;box-shadow:0 1px 8px rgba(15,23,42,.08);line-height:1.65}.ol-docx img{max-width:100%}
        .ol-integrity{margin-top:14px;border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc}.ol-integrity-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ol-integrity-stat{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px}.ol-integrity-stat b{display:block;font-size:20px}.ol-integrity-match{padding:9px;border-radius:9px;background:#fff;border:1px solid #e5e7eb;margin-top:7px;font-size:13px}.ol-integrity-note{font-size:12px;color:#64748b;line-height:1.5}@media(max-width:760px){.ol-integrity-grid{grid-template-columns:1fr}.ol-document-viewer{padding:5px}.ol-document-card{height:98vh}.ol-docx{padding:22px}.ol-document-body{padding:6px}}
        `;document.head.appendChild(st);
    }
    function ensureViewer(){
        ensureStyle(); if($('olDocumentViewer')) return;
        const d=document.createElement('div'); d.id='olDocumentViewer'; d.className='ol-document-viewer';
        d.innerHTML=`<div class="ol-document-card"><div class="ol-document-head"><div><b id="olDocumentTitle">Uploaded Work</b><div id="olDocumentMeta" style="font-size:11px;color:#64748b"></div></div><div style="display:flex;gap:6px"><button class="ol-btn ol-muted" id="olDocumentDownload">Download</button><button class="ol-btn ol-danger" onclick="LecturerOnlineLearning.closeDocumentViewer()">Close</button></div></div><div class="ol-document-body" id="olDocumentBody"><div class="ol-empty">Loading document…</div></div></div>`;
        document.body.appendChild(d);
    }
    async function signedDocumentUrl(s){
        const db=client(); if(!db || !s?.file_path) throw new Error('No uploaded document is attached to this submission.');
        const r=await db.storage.from(STORAGE_BUCKET).createSignedUrl(s.file_path,3600);
        if(r.error) throw r.error; return r.data?.signedUrl;
    }
    function extOf(name=''){ const x=name.toLowerCase().split('.').pop(); return x==='jpeg'?'jpg':x; }
    function loadScriptOnce(src,id){return new Promise((resolve,reject)=>{if(id&&document.getElementById(id))return resolve();const s=document.createElement('script');s.src=src;if(id)s.id=id;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load '+src));document.head.appendChild(s);});}
    async function renderDocument(s){
        ensureViewer(); const url=await signedDocumentUrl(s); const body=$('olDocumentBody'); const ext=extOf(s.file_name||s.file_path||'');
        $('olDocumentTitle').textContent=s.file_name||'Uploaded Work'; $('olDocumentMeta').textContent=`${s.online_assignments?.title||'Submission'} · ${fmtDate(s.submitted_at)}`;
        $('olDocumentDownload').onclick=()=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();};
        body.innerHTML='<div class="ol-empty">Opening document…</div>';
        if(['pdf'].includes(ext)){body.innerHTML=`<iframe class="ol-document-frame" title="${esc(s.file_name||'PDF')}" src="${esc(url)}"></iframe>`;return;}
        if(['doc','docx'].includes(ext)){
            const blob=await (await fetch(url)).blob();
            await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','olMammoth');
            const ab=await blob.arrayBuffer(); const r=await window.mammoth.convertToHtml({arrayBuffer:ab}); body.innerHTML=`<article class="ol-docx">${r.value||'<p>No readable text found.</p>'}</article>`; if(r.messages?.length) body.insertAdjacentHTML('beforeend',`<div class="ol-integrity-note" style="padding:10px">Some document formatting may not be reproduced exactly in browser preview.</div>`); return;
        }
        if(['txt','csv','md'].includes(ext)){const txt=await (await fetch(url)).text();body.innerHTML=`<pre style="white-space:pre-wrap;background:#fff;padding:24px;max-width:1000px;margin:auto;line-height:1.6">${esc(txt)}</pre>`;return;}
        if(['png','jpg','gif','webp'].includes(ext)){body.innerHTML=`<div style="text-align:center"><img src="${esc(url)}" style="max-width:100%;max-height:85vh;object-fit:contain;background:#fff;padding:8px;border-radius:10px"></div>`;return;}
        body.innerHTML=`<div class="ol-empty">Browser preview is not available for <b>${esc(ext||'this file type')}</b>. Use Download to open the complete original document.</div>`;
    }
    async function viewSubmissionDocument(id){
        try{const s=state.submissions.find(x=>x.id===id);if(!s)throw new Error('Submission not found.');await renderDocument(s);$('olDocumentViewer').style.display='flex';}
        catch(e){console.error(e);notify('Could not open the uploaded document: '+e.message,'error');}
    }
    function closeDocumentViewer(){if($('olDocumentViewer'))$('olDocumentViewer').style.display='none';}

    function normalizeText(t){return String(t||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}
    function shingles(t,n=8){const w=normalizeText(t).split(' ').filter(Boolean), out=[];for(let i=0;i<=w.length-n;i++)out.push(w.slice(i,i+n).join(' '));return [...new Set(out)];}
    async function extractSubmissionText(s){
        const url=await signedDocumentUrl(s), ext=extOf(s.file_name||s.file_path||'');
        if(['txt','csv','md'].includes(ext)) return await (await fetch(url)).text();
        if(['doc','docx'].includes(ext)){const blob=await (await fetch(url)).blob();await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','olMammoth');const r=await window.mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()});return r.value||'';}
        if(ext==='pdf'){
            await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','olPdfJs');
            if(!window.pdfjsLib) throw new Error('PDF text extraction library is unavailable.');
            const pdf=await window.pdfjsLib.getDocument(url).promise; let text=''; for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i);const c=await pg.getTextContent();text+=c.items.map(x=>x.str).join(' ')+'\n';} return text;
        }
        return '';
    }
    async function localSimilarity(s,text){
        const db=client(); if(!db || !text) return {score:0,matches:[],source:'local'};
        const {data}=await db.from('online_submissions').select('id,student_id,assignment_id,submitted_at,answers').eq('assignment_id',s.assignment_id).neq('id',s.id).limit(100);
        const sourceShingles=shingles(text,8); const set=new Set(sourceShingles); const matches=[];
        for(const other of (data||[])){const otherText=Object.values(other.answers||{}).join(' ');const osh=shingles(otherText,8);let hit=0;for(const x of osh)if(set.has(x))hit++;if(hit>=2)matches.push({submission_id:other.id,student_id:other.student_id,matched_phrases:hit});}
        matches.sort((a,b)=>b.matched_phrases-a.matched_phrases);return {score:sourceShingles.length?Math.min(100,Math.round(((matches[0]?.matched_phrases||0)/Math.max(1,sourceShingles.length))*10000)/100):0,matches:matches.slice(0,10),source:'institutional-submission-similarity'};
    }
    async function runIntegrityScan(id){
        const s=state.submissions.find(x=>x.id===id);
        if(!s)return;

        const btn=$('olIntegrityBtn');
        if(btn){
            btn.disabled=true;
            btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Scanning…';
        }

        try{
            const extracted=await extractSubmissionText(s);
            integrityState.currentSubmission=s;
            integrityState.extractedText=extracted;

            if(!extracted.trim()){
                throw new Error(
                    'No extractable text was found. Image-only/scanned PDFs require OCR before AI analysis.'
                );
            }

            const payload={
                submission_id:s.id,
                assignment_id:s.assignment_id,
                student_id:s.student_id,
                assignment_title:s.online_assignments?.title||'',
                student_name:'',
                text:extracted.slice(0,120000),
                file_name:s.file_name||''
            };

            let report=null;
            let serviceError=null;

            /*
             * Prefer the secure dashboard bridge when it is available.
             * This keeps provider/authentication details inside the Edge
             * Function and lets the JS remain provider-independent.
             */
            if(typeof window.runAcademicIntegrityScan==='function'){
                try{
                    report=await window.runAcademicIntegrityScan(payload);
                }catch(e){
                    serviceError=e;
                    console.error('Academic Integrity bridge error:',e);
                }
            }else{
                /*
                 * Backward-compatible fallback for dashboards that do not
                 * yet contain the secure bridge.
                 */
                const db=client();
                if(db?.functions?.invoke){
                    const r=await db.functions.invoke(INTEGRITY_FUNCTION,{body:payload});
                    if(r.error){
                        serviceError=r.error;
                        console.error('Academic Integrity Edge Function error:',r.error);
                    }else{
                        report=r.data;
                    }
                }else{
                    serviceError=new Error(
                        'Supabase Functions client is unavailable.'
                    );
                }
            }

            /*
             * Do not silently replace a real AI/provider error with a local
             * similarity result. Local similarity is useful only when the
             * AI service is genuinely unavailable and the user can see that
             * the result is local/institutional only.
             */
            if(!report){
                const local=await localSimilarity(s,extracted);

                if(serviceError){
                    local.provider_error=serviceError.message||String(serviceError);
                    local.notice=
                        'AI analysis was unavailable. The displayed result is institutional submission similarity only.';
                    local.status='LOCAL_ONLY';
                }

                report=local;
            }

            integrityState.report=report;
            renderIntegrityReport(report,extracted);

        }catch(e){
            console.error('Integrity scan:',e);
            notify(
                'Integrity scan could not be completed: '+(e?.message||String(e)),
                'error'
            );
        }finally{
            if(btn){
                btn.disabled=false;
                btn.innerHTML='<i class="fas fa-shield-alt"></i> Run Integrity Scan';
            }
        }
    }
    function renderIntegrityReport(r,text){
        const box=$('olIntegrityReport');if(!box)return;const sim=Number(r.similarity_score??r.similarity??r.score??0);const ai=r.ai_probability??r.ai_score??null;const matches=r.matches||r.sources||[];
        const localOnly=r.status==='LOCAL_ONLY';
        const statusText=localOnly?'LOCAL ONLY':(r.status||r.analysis?.overall_signal||'REVIEW');
        const analysis=r.analysis||r;
        const analysisSim=analysis.similarity_signal?.level||'';
        const analysisAi=analysis.ai_writing_signal?.level||'';

        box.innerHTML=`<div class="ol-integrity"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b><i class="fas fa-shield-alt"></i> Academic Integrity Agent</b><span class="ol-badge ${localOnly?'ol-draft':sim>=40?'ol-review':'ol-published'}">${esc(statusText)}</span></div><div class="ol-integrity-grid" style="margin-top:10px"><div class="ol-integrity-stat"><small>Similarity</small><b>${sim}%</b></div><div class="ol-integrity-stat"><small>AI signal</small><b>${ai==null?(analysisAi?esc(analysisAi):'—'):esc(ai)+'%'}</b></div><div class="ol-integrity-stat"><small>Words scanned</small><b>${text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()}</b></div></div>${analysis.summary?`<div style="margin-top:12px;padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:9px"><b>AI Review Summary</b><div style="margin-top:5px;line-height:1.5">${esc(analysis.summary)}</div></div>`:''}${matches.length?`<div style="margin-top:12px"><b>Potential matches</b>${matches.slice(0,8).map(m=>`<div class="ol-integrity-match"><b>${esc(m.source_title||m.title||m.student_id||m.source||'Possible matching submission')}</b><div>${esc(m.matched_phrases??m.match_count??m.similarity??'')} ${m.matched_phrases?'matching phrase(s)':''}</div></div>`).join('')}</div>`:''}${analysis.evidence?.length?`<div style="margin-top:12px"><b>AI Evidence Flags</b>${analysis.evidence.slice(0,8).map(e=>`<div class="ol-integrity-match"><b>${esc(e.type||'Review point')} · ${esc(e.severity||'')}</b><div style="margin-top:4px">${esc(e.reason||'')}</div>${e.excerpt?`<div style="margin-top:5px;color:#64748b">“${esc(e.excerpt)}”</div>`:''}</div>`).join('')}</div>`:''}<p class="ol-integrity-note">This is an academic-integrity screening aid, not a final plagiarism finding. Similarity is not proof of plagiarism, and AI-writing signals can produce false positives. ${localOnly?'The AI provider was unavailable, so this result is based only on institutional submission similarity. ':''}${r.notice?esc(r.notice):''} ${r.source?'Scan source: '+esc(r.source)+'.':''}</p></div>`;
    }

    function collectSubmissionQuestions(questions,answers){
        return (questions||[]).map((q,i)=>({
            id:q.id, question_order:q.question_order||i+1, question_text:q.question_text||'', question_type:q.question_type||'short_answer',
            marks:Number(q.marks)||0, correct_answer:q.correct_answer||null, accepted_answers:q.accepted_answers||[], keywords:q.keywords||[], keyword_marks:Number(q.keyword_marks)||0,
            answer:answers?.[q.id] ?? answers?.[String(q.id)] ?? ''
        }));
    }
    // ============================================================
    // SUPABASE-DRIVEN ASSIGNMENT GRADING
    // Formal marking keys are stored in online_marking_keys.
    // Ordinary assignments use topic/keywords/expected topics.
    // ============================================================
    const markingKeyState = { keys: [], loaded:false };

    function parseJsonArray(value){
        if(Array.isArray(value)) return value;
        if(value == null || value === '') return [];
        try{
            const parsed=JSON.parse(value);
            return Array.isArray(parsed)?parsed:[];
        }catch(e){
            return String(value).split(',').map(x=>x.trim()).filter(Boolean);
        }
    }

    async function loadMarkingKeys(){
        const db=client(); if(!db) return [];
        const r=await db.from('online_marking_keys')
            .select('id,title,description,max_marks,criteria,keywords,expected_topics,grading_guidance,version,is_active,created_by')
            .eq('is_active',true)
            .order('title',{ascending:true});
        if(r.error){
            console.warn('Marking keys could not load:',r.error.message);
            markingKeyState.keys=[];
            return [];
        }
        markingKeyState.keys=r.data||[];
        markingKeyState.loaded=true;
        return markingKeyState.keys;
    }

    async function ensureAssignmentGradingFields(){
        let wrap=$('olAssignmentGradingFields');
        if(wrap) return wrap;

        const anchor=$('olInstructions');
        if(!anchor) return null;
        const host=anchor.closest('.ol-form') || anchor.parentElement?.parentElement || anchor.parentElement;
        if(!host) return null;

        wrap=document.createElement('div');
        wrap.id='olAssignmentGradingFields';
        wrap.className='ol-full';
        wrap.style.cssText='margin-top:12px;padding:14px;border:1px solid #dbe3ee;border-radius:12px;background:#f8fafc';
        wrap.innerHTML=`
          <div style="font-weight:800;color:#18304d;margin-bottom:4px">
            <i class="fas fa-robot"></i> AI Grading Configuration
          </div>
          <div style="font-size:11px;color:#64748b;margin-bottom:12px">
            Use a formal marking key when one applies. Otherwise the AI grades from the assignment topic, instructions, keywords and expected topics.
          </div>
          <div class="ol-form">
            <div>
              <label>Grading Mode</label>
              <select id="olGradingMode">
                <option value="topic_keywords">Topic / Keywords</option>
                <option value="marking_key">Formal Marking Key</option>
              </select>
            </div>
            <div>
              <label>Formal Marking Key</label>
              <select id="olMarkingKeyId">
                <option value="">No marking key</option>
              </select>
            </div>
            <div class="ol-full">
              <label>Keywords / Key Concepts <span style="font-weight:400;color:#64748b">(comma separated)</span></label>
              <textarea id="olGradingKeywords" rows="2" placeholder="e.g. family assessment, home visiting, health education, intervention, evaluation"></textarea>
            </div>
            <div class="ol-full">
              <label>Expected Topics / Areas <span style="font-weight:400;color:#64748b">(one per line)</span></label>
              <textarea id="olExpectedTopics" rows="3" placeholder="Family health status&#10;Identification of health needs&#10;Planning interventions&#10;Evaluation"></textarea>
            </div>
            <div class="ol-full">
              <label>Grading Guidance</label>
              <textarea id="olGradingGuidance" rows="2" placeholder="Explain what a good answer should demonstrate and any special marking instructions."></textarea>
            </div>
          </div>`;
        host.parentElement?.insertBefore(wrap,host.nextSibling) || host.appendChild(wrap);

        const mode=$('olGradingMode'), key=$('olMarkingKeyId');
        mode?.addEventListener('change',()=>{
            const formal=mode.value==='marking_key';
            if(key) key.disabled=!formal;
        });
        key?.addEventListener('change',()=>{
            const selected=markingKeyState.keys.find(k=>String(k.id)===String(key.value));
            if(!selected) return;
            if(mode) mode.value='marking_key';
            $('olMaxMarks').value=selected.max_marks||$('olMaxMarks').value;
            const criteria=Array.isArray(selected.criteria)?selected.criteria:[];
            $('olGradingKeywords').value=(Array.isArray(selected.keywords)?selected.keywords:[]).join(', ');
            $('olExpectedTopics').value=(Array.isArray(selected.expected_topics)?selected.expected_topics:[]).join('\n');
            $('olGradingGuidance').value=selected.grading_guidance||'';
        });
        await loadMarkingKeys();
        key.innerHTML='<option value="">No marking key</option>'+markingKeyState.keys.map(k=>`<option value="${esc(k.id)}">${esc(k.title)}${k.version?` — v${esc(k.version)}`:''}</option>`).join('');
        return wrap;
    }

    async function populateAssignmentGradingFields(a=null){
        await ensureAssignmentGradingFields();
        const mode=$('olGradingMode'), key=$('olMarkingKeyId');
        if(!mode||!key)return;
        mode.value=a?.grading_mode||((a?.marking_key_id)?'marking_key':'topic_keywords');
        key.value=a?.marking_key_id||'';
        key.disabled=mode.value!=='marking_key';
        $('olGradingKeywords').value=parseJsonArray(a?.grading_keywords||a?.keywords).join(', ');
        $('olExpectedTopics').value=parseJsonArray(a?.expected_topics).join('\n');
        $('olGradingGuidance').value=a?.grading_guidance||'';
    }

    async function getAssignmentGradingConfig(assignment){
        const db=client();
        let markingKey=null;
        if(assignment?.marking_key_id){
            const r=await db.from('online_marking_keys')
                .select('id,title,description,max_marks,criteria,keywords,expected_topics,grading_guidance,version,is_active')
                .eq('id',assignment.marking_key_id)
                .maybeSingle();
            if(r.error) console.warn('Marking key lookup:',r.error.message);
            markingKey=r.data||null;
        }
        return {
            mode:assignment?.grading_mode||'topic_keywords',
            markingKey,
            keywords:parseJsonArray(assignment?.grading_keywords||assignment?.keywords),
            expectedTopics:parseJsonArray(assignment?.expected_topics),
            guidance:String(assignment?.grading_guidance||'')
        };
    }

    // ============================================================
    // DIRECT SUPABASE MARKING-KEY FETCH FOR SUBMISSION REVIEW
    // ============================================================
    async function fetchSubmissionMarkingKey(id){
        const db=client();
        const s=state.submissions.find(x=>x.id===id);
        if(!s) throw new Error('Submission could not be found.');
        const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
        const box=$('olSubmissionMarkingKey');
        const btn=$('olFetchMarkingKeyBtn');
        if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Fetching…';}
        try{
            if(!assignment.marking_key_id){
                throw new Error('No marking key is attached to this assignment. Edit the assignment and select a Formal Marking Key first.');
            }
            const r=await db.from('online_marking_keys')
                .select('id,title,description,max_marks,criteria,keywords,expected_topics,grading_guidance,version,is_active,created_by')
                .eq('id',assignment.marking_key_id)
                .eq('is_active',true)
                .maybeSingle();
            if(r.error) throw r.error;
            const key=r.data;
            if(!key) throw new Error('The attached marking key was not found or is inactive.');
            if(box){
                const criteria=Array.isArray(key.criteria)?key.criteria:parseJsonArray(key.criteria);
                const keywords=Array.isArray(key.keywords)?key.keywords:parseJsonArray(key.keywords);
                const topics=Array.isArray(key.expected_topics)?key.expected_topics:parseJsonArray(key.expected_topics);
                box.innerHTML=`<div style="font-weight:800;color:#18304d;font-size:14px"><i class="fas fa-clipboard-check"></i> ${esc(key.title||'Marking Key')}</div>
                  <div style="font-size:12px;color:#64748b;margin-top:3px">Version ${esc(key.version||'1')} · Maximum ${esc(key.max_marks||100)} marks</div>
                  ${key.description?`<div style="margin-top:8px">${esc(key.description)}</div>`:''}
                  <details open style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Marking Criteria (${esc(criteria.length)})</summary><div style="margin-top:7px">${criteria.length?criteria.map((c,i)=>{const title=c?.criterion||c?.title||c?.description||c?.name||String(c);const marks=c?.marks??c?.max_marks??c?.score??'';return `<div style="padding:7px 0;border-bottom:1px solid #e5e7eb"><b>${esc(i+1)}. ${esc(title)}</b>${marks!==''?` <span style="color:#64748b">(${esc(marks)} marks)</span>`:''}</div>`}).join(''):'<span style="color:#64748b">No structured criteria stored.</span>'}</div></details>
                  ${keywords.length?`<div style="margin-top:9px"><b>Keywords:</b> ${esc(keywords.join(', '))}</div>`:''}
                  ${topics.length?`<div style="margin-top:7px"><b>Expected topics:</b> ${esc(topics.join(' · '))}</div>`:''}
                  ${key.grading_guidance?`<div style="margin-top:9px"><b>Grading guidance:</b><div style="white-space:pre-wrap;margin-top:3px">${esc(key.grading_guidance)}</div></div>`:''}`;
                box.dataset.keyId=key.id;
            }
            window._activeSubmissionMarkingKey=key;
            window._activeSubmissionMarkingKeyId=key.id;
            notify(`Marking key fetched from Supabase: ${key.title}`,'success');
            return key;
        }catch(e){
            console.error('Fetch marking key:',e);
            if(box) box.innerHTML=`<div style="color:#b91c1c"><b>Could not fetch marking key.</b><div style="margin-top:4px">${esc(e.message||e)}</div></div>`;
            notify(e.message||'Could not fetch marking key.','error');
            return null;
        }finally{
            if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-database"></i> Fetch Marking Key from Supabase';}
        }
    }

    function localObjectiveGrade(items){
        let earned=0,max=0; const grades=[];
        for(const q of items){
            const qm=Number(q.marks)||0; max+=qm; const a=String(q.answer??'').trim().toLowerCase();
            let e=null;
            if(['mcq','true_false'].includes(String(q.question_type).toLowerCase()) && q.correct_answer){
                const c=String(q.correct_answer).trim().toLowerCase(); e=(a&&c&&a===c)?qm:0;
                grades.push({question_id:q.id,marks_awarded:e,max_marks:qm,method:'objective',reason:e?'Correct answer matched.':'Answer did not match the configured correct answer.'}); earned+=e;
            }
        }
        return {earned,max,grades};
    }
    async function autoGradeUsingMarkingKey(id){
        const db=client();
        const sub=state.submissions.find(x=>x.id===id);
        if(!sub)return;
        const assignment=state.assignments.find(x=>x.id===sub.assignment_id)||{};
        const btn=$('olAutoGradeBtn');
        if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Fetching Key & Grading…';}
        try{
            let key=window._activeSubmissionMarkingKey;
            if(!key || String(window._activeSubmissionMarkingKeyId)!==String(assignment.marking_key_id||'')){
                key=await fetchSubmissionMarkingKey(id);
            }
            if(!key)throw new Error('No marking key is linked to this assignment. Select a marking key in the assignment first.');
            const graded=await aiGradeSubmission(id);
            if(!graded) throw new Error('Automatic grading did not produce a grade.');
            notify('Work automatically graded using the Supabase marking key. Review the suggested mark before saving or releasing.','success');
        }catch(e){
            console.error('Automatic marking-key grading:',e);
            notify(e.message||'Automatic grading failed.','error');
        }finally{
            if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-wand-magic-sparkles"></i> Automatically Grade Using Marking Key';}
        }
    }

    async function aiGradeSubmission(id){
        const db=client(); const s=state.submissions.find(x=>x.id===id); if(!s)return;
        const btn=$('olAIGradeBtn');
        if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> AI Grading…';}
        try{
            let questions=[];
            const qr=await db.from('online_assignment_questions').select('*').eq('assignment_id',s.assignment_id).order('question_order');
            if(qr.error)throw qr.error;
            questions=qr.data||[];
            const answers=s.answers||{};
            const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};

            let documentText='';
            if(s.file_path){
                try{documentText=await extractSubmissionText(s);}catch(e){console.warn('AI grade document extraction:',e);}
            }

            let grading=await getAssignmentGradingConfig(assignment);
            let markingKey=grading.markingKey;
            if(window._activeSubmissionMarkingKey && String(window._activeSubmissionMarkingKeyId)===String(assignment.marking_key_id||'')) markingKey=window._activeSubmissionMarkingKey;
            if(assignment.marking_key_id && !markingKey) markingKey=await fetchSubmissionMarkingKey(id);
            if(markingKey){
                grading={...grading,mode:'marking_key',markingKey,keywords:parseJsonArray(markingKey.keywords),expectedTopics:parseJsonArray(markingKey.expected_topics),guidance:String(markingKey.grading_guidance||'')};
            }
            const maxMarks=Number(assignment.max_marks||s.max_marks||markingKey?.max_marks||0);
            if(!maxMarks)throw new Error('Assignment maximum marks are not configured.');

            const payload={
                mode:'assignment_grading',
                submission_id:s.id,
                assignment_id:s.assignment_id,
                student_id:s.student_id,
                grading_mode:grading.mode,
                marking_key_id:markingKey?.id||assignment.marking_key_id||null,
                assignment:{
                    title:String(assignment.title||s.online_assignments?.title||''),
                    unit_code:assignment.unit_code||'',
                    instructions:assignment.instructions||'',
                    max_marks:maxMarks,
                    grading_mode:grading.mode,
                    grading_keywords:grading.keywords,
                    expected_topics:grading.expectedTopics,
                    grading_guidance:grading.guidance
                },
                questions:collectSubmissionQuestions(questions,answers),
                extracted_text:String(documentText||'').slice(0,120000),
                existing_feedback:s.feedback||''
            };

            let report=null;
            if(typeof window.runAIAssignmentGrade==='function') report=await window.runAIAssignmentGrade(payload);
            else if(db?.functions?.invoke){
                const r=await db.functions.invoke('ai-grade-assignment',{body:payload});
                if(r.error)throw r.error;
                report=r.data;
            }else throw new Error('Secure AI grading service is unavailable.');

            if(!report || !Number.isFinite(Number(report.marks_awarded)))throw new Error('AI grading service returned no valid marks.');

            const marks=clampMarks(report.marks_awarded,maxMarks);
            const pct=formatPercentage(marks,maxMarks);
            $('olReviewMarks').value=marks;
            if($('olReviewPercentage'))$('olReviewPercentage').textContent=pct;
            if($('olReviewFeedback') && report.feedback)$('olReviewFeedback').value=report.feedback;

            const box=$('olAIGradeReport');
            if(box){
                const evidence=Array.isArray(report.rubric_grades)?report.rubric_grades:
                    Array.isArray(report.topic_grades)?report.topic_grades:[];
                box.innerHTML=`<div style="margin-top:10px;padding:12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:9px;font-size:12px;color:#3730a3">
                  <b>AI grading suggestion:</b> ${esc(marks)}/${esc(maxMarks)} (${esc(pct)})
                  ${report.confidence!=null?` · Confidence ${esc(report.confidence)}%`:''}
                  <div style="margin-top:7px;color:#475569">${esc(report.note||'Review the score and marking evidence before saving or releasing.')}</div>
                  ${evidence.length?`<div style="margin-top:9px;color:#334155"><b>Marking evidence:</b><ul style="margin:5px 0 0 18px">${evidence.slice(0,20).map(x=>`<li>${esc(x.criterion||x.topic||'Area')}: ${esc(x.marks_awarded??x.marks??0)}/${esc(x.max_marks??x.maximum??0)} — ${esc(x.evidence||x.reason||'')}</li>`).join('')}</ul></div>`:''}
                </div>`;
            }
            notify(`AI score: ${marks}/${maxMarks} (${pct}). Review the score and marking evidence before saving or releasing.`,'success');
            return true;
        }catch(e){
            console.error('AI grading:',e);
            notify('AI grading could not be completed: '+(e?.message||String(e)),'error');
            return false;
        }finally{
            if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-robot"></i> AI Grade Work';}
        }
    }
    async function reviewSubmission(id){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;let questions=[];const qr=await db.from('online_assignment_questions').select('*').eq('assignment_id',s.assignment_id).order('question_order');questions=qr.data||[];const answers=s.answers||{};const profiles=await db.from('consolidated_user_profiles_table').select('full_name,student_id,admission_number,email').eq('user_id',s.student_id).maybeSingle();const p=profiles.data||{};const maxMarks=Number(s.max_marks||state.assignments.find(a=>a.id===s.assignment_id)?.max_marks||0);const currentPct=formatPercentage(s.marks_obtained,maxMarks);const body=$('olSubmissionBody');body.innerHTML=`<div class="ol-submission-grid"><div><h3 style="margin-top:0">${esc(s.online_assignments?.title||'Submission')}</h3><p style="color:#64748b">${esc(p.full_name||'Student')} · ${esc(p.admission_number||p.student_id||'')}</p><div>${questions.length?questions.map((q,i)=>`<div class="ol-q"><b>Q${i+1}. ${esc(q.question_text)}</b><div style="margin-top:8px;background:#f8fafc;padding:10px;border-radius:8px;white-space:pre-wrap">${esc(answers[q.id]??answers[String(q.id)]??'No answer')}</div><small style="color:#64748b">${esc(q.marks)} marks</small></div>`).join(''):'<div class="ol-empty">No structured questions. Review the uploaded document if provided.</div>'}</div></div><div><div class="ol-card" style="margin:0"><div style="color:#64748b;font-size:12px">CURRENT RESULT</div><div class="ol-mark">${esc(s.marks_obtained??0)}/${esc(maxMarks||'—')}</div><div id="olReviewPercentage" style="font-size:18px;font-weight:800;color:#4C1D95;margin-top:4px">${esc(currentPct)}</div><label>Marks Awarded</label><input id="olReviewMarks" type="number" min="0" max="${esc(maxMarks||'')}" step="0.01" value="${esc(s.marks_obtained??0)}" oninput="LecturerOnlineLearning.updateGradePercentage()" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px"><div id="olAIGradeReport"></div><div id="olSubmissionMarkingKey" style="margin-top:14px;padding:12px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc"><div style="font-weight:700;color:#475569">Marking Key</div><div style="font-size:11px;color:#64748b;margin-top:3px">Fetch the institutional marking key directly from Supabase before grading.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px"><button id="olFetchMarkingKeyBtn" class="ol-btn" style="background:#0f766e;color:#fff" onclick="LecturerOnlineLearning.fetchSubmissionMarkingKey('${s.id}')"><i class="fas fa-database"></i> Fetch Marking Key from Supabase</button></div><label style="display:block;margin-top:12px">Feedback</label><textarea id="olReviewFeedback" rows="6" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px">${esc(s.feedback||'')}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button id="olAutoGradeBtn" class="ol-btn" style="background:#7c3aed;color:#fff" onclick="LecturerOnlineLearning.autoGradeUsingMarkingKey('${s.id}')"><i class="fas fa-wand-magic-sparkles"></i> Automatically Grade Using Marking Key</button><button id="olAIGradeBtn" class="ol-btn" style="background:#64748b;color:#fff" onclick="LecturerOnlineLearning.aiGradeSubmission('${s.id}')"><i class="fas fa-robot"></i> AI Grade Work</button><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',false)">Save Grade</button><button class="ol-btn ol-success" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',true)">Grade & Release</button></div>${s.file_path?`<div style="margin-top:15px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc"><div style="font-size:12px;color:#64748b;margin-bottom:8px"><i class="fas fa-paperclip"></i> ${esc(s.file_name||'Uploaded document')}</div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.viewSubmissionDocument('${s.id}')"><i class="fas fa-eye"></i> View Entire Work</button><button id="olIntegrityBtn" class="ol-btn ol-muted" onclick="LecturerOnlineLearning.runIntegrityScan('${s.id}')"><i class="fas fa-shield-alt"></i> Run Integrity Scan</button></div><div id="olIntegrityReport"></div></div>`:''}</div></div></div>`;$('olSubmissionModal').dataset.submissionId=id;$('olSubmissionModal').style.display='flex';}
    function updateGradePercentage(){const s=state.submissions.find(x=>x.id===$('olSubmissionModal')?.dataset?.submissionId);const max=Number(s?.max_marks||state.assignments.find(a=>a.id===s?.assignment_id)?.max_marks||0);const pct=formatPercentage($('olReviewMarks')?.value,max);if($('olReviewPercentage'))$('olReviewPercentage').textContent=pct;}
    // ============================================================
    // 📧 ASSIGNMENT RESULT EMAIL NOTIFICATION
    // Sends only when the lecturer RELEASES the graded result.
    // The email intentionally contains no marks/percentage.
    // ============================================================
    async function sendAssignmentResultNotification(submission, assignment){
        try{
            const db=client();
            if(!db || !submission?.student_id) return false;

            let student=null;
            const lookup=await db.from('consolidated_user_profiles_table')
                .select('user_id,full_name,student_id,admission_number,email,program,intake_year,current_block,block')
                .eq('user_id',submission.student_id)
                .maybeSingle();
            if(!lookup.error) student=lookup.data;

            if(!student?.email){
                console.warn('⚠️ No email found for assignment student:',submission.student_id);
                return false;
            }

            const name=esc(student.full_name||'Student');
            const title=esc(assignment?.title||submission?.online_assignments?.title||'Assignment');
            const unit=esc(assignment?.unit_code||submission?.online_assignments?.unit_code||'');
            const portalUrl='https://nchsm.co.ke';

            const html=`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Assignment Result Released</title>
<style>
body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f0f4f8;color:#243447}.container{max-width:580px;margin:0 auto;padding:20px}.card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#0A3D62,#1a5276);padding:30px 35px;text-align:center;color:#fff}.header img{width:70px;height:70px;border-radius:50%;background:#fff;padding:5px;margin-bottom:10px}.header h1{margin:0;font-size:24px}.header p{margin:4px 0 0;opacity:.82}.body{padding:30px 35px}.notice{background:#EFF6FF;border:2px solid #3B82F6;border-radius:16px;padding:22px;text-align:center;margin:18px 0}.notice .icon{font-size:2.6rem;display:block;margin-bottom:8px}.notice .message{font-size:1.08rem;color:#0A3D62;font-weight:700}.notice .sub{color:#5a6c7d;font-size:.94rem;margin-top:5px}.info{background:#f8fafc;border-radius:14px;padding:20px 24px;margin:18px 0;border-left:4px solid #0A3D62}.info p{margin:7px 0;font-size:14px}.label{color:#64748b;font-weight:500}.value{color:#0A3D62;font-weight:650}.btn{display:inline-block;background:linear-gradient(135deg,#0A3D62,#1a5276);color:#fff!important;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;margin:8px 0}.footer{background:#f8fafc;padding:22px 35px;text-align:center;border-top:1px solid #eef2f7}.footer p{font-size:12px;color:#8a9aa8;margin:4px 0}@media(max-width:480px){.header{padding:22px 18px}.body{padding:22px 18px}.footer{padding:18px}}
</style></head><body><div class="container"><div class="card">
<div class="header"><img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo"><h1>📊 Assignment Result Released</h1><p>Nakuru College of Health Sciences and Management</p></div>
<div class="body"><p>Dear <strong>${name}</strong>,</p><p>Your lecturer has completed grading your assignment and your result is now available on the NCHSM Student Portal.</p>
<div class="notice"><span class="icon">🔐</span><div class="message">Your Assignment Result Is Ready</div><div class="sub">Log in to the Student Portal to view your result and lecturer feedback securely.</div></div>
<div class="info"><p><span class="label">📝 Assignment</span><br><span class="value">${title}</span></p>${unit?`<p><span class="label">📚 Unit</span><br><span class="value">${unit}</span></p>`:''}${student.program?`<p><span class="label">🎓 Program</span><br><span class="value">${esc(student.program)}</span></p>`:''}<p><span class="label">👤 Student</span><br><span class="value">${name}</span></p></div>
<div style="text-align:center;margin:25px 0 10px"><a class="btn" href="${portalUrl}">🔑 View Assignment Result</a></div>
<div style="background:#fef9e7;border-left:4px solid #f39c12;border-radius:10px;padding:13px 16px;margin-top:18px"><p style="margin:0;font-size:13px;color:#7d6608">💡 <strong>Note:</strong> This is a result notification only. Your marks and lecturer feedback are available securely in the Student Portal.</p></div>
</div><div class="footer"><p><strong>Nakuru College of Health Sciences and Management</strong></p><p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p><p>This is an automated notification. Please do not reply to this email.</p></div>
</div></div></body></html>`;

            const result=await db.functions.invoke('send-email',{body:{
                to:student.email,
                subject:`📊 Assignment Result Released - ${assignment?.title||submission?.online_assignments?.title||'Assignment'}`,
                html,
                from:'NCHSM Academic Office <admin@nchsm.co.ke>'
            }});
            if(result.error){
                console.error('❌ Assignment result email failed:',result.error);
                return false;
            }
            if(result.data && result.data.success===false){
                console.error('❌ Assignment result email rejected:',result.data.error||result.data);
                return false;
            }
            console.log(`✅ Assignment result notification sent to ${student.email}`);
            return true;
        }catch(e){
            console.error('❌ Assignment result notification error:',e);
            return false;
        }
    }

    async function gradeSubmission(id,release){
        const db=client();
        const s=state.submissions.find(x=>x.id===id);
        if(!s)return;
        const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
        const maxMarks=Number(s.max_marks||assignment.max_marks||0);
        const marks=clampMarks($('olReviewMarks').value,maxMarks);
        const feedback=$('olReviewFeedback').value.trim()||null;
        const percentage=Number(formatPercentage(marks,maxMarks).replace('%',''));

        // ALWAYS show the exact score before a release can happen.
        if(release){
            const confirmed=window.confirm(
                `RELEASE RESULT\n\nStudent: ${s.student_id||'Student'}\nAssignment: ${assignment.title||s.online_assignments?.title||'Assignment'}\nScore: ${marks}/${maxMarks}\nPercentage: ${percentage}%\n\nThe student will be notified by email after release.\n\nClick OK to release this exact score, or Cancel to return to the review.`
            );
            if(!confirmed)return;
        }

        const now=new Date().toISOString();
        let payload={marks_obtained:marks,feedback,status:'graded',graded_by:state.userId,graded_at:now,result_released:release,released_at:release?now:null,review_required:false};
        let {error}=await db.from('online_submissions').update({...payload,percentage}).eq('id',id);
        if(error){const retry=await db.from('online_submissions').update(payload).eq('id',id);error=retry.error;}
        if(error){notify(error.message,'error');return;}

        if(release){
            const emailSent=await sendAssignmentResultNotification(s,assignment);
            notify(emailSent
                ? `Released: ${marks}/${maxMarks} (${percentage}%). Student email notification sent.`
                : `Released: ${marks}/${maxMarks} (${percentage}%), but the student email notification could not be sent.`,
                emailSent?'success':'warning');
        }else{
            notify(`Grade saved: ${marks}/${maxMarks} (${percentage}%).`,'success');
        }
        closeModal('olSubmissionModal');
        await loadSubmissions();
        updateStats();
    }
    async function runAIAssignmentGrade(payload){
        const db=client();
        if(typeof window.runAIAssignmentGrade==='function' && window.runAIAssignmentGrade!==runAIAssignmentGrade) return window.runAIAssignmentGrade(payload);
        if(db?.functions?.invoke){const r=await db.functions.invoke('ai-grade-assignment',{body:payload});if(r.error)throw r.error;return r.data;}
        throw new Error('Secure AI grading service is unavailable.');
    }

    function closeModal(id){const m=$(id);if(m)m.style.display='none';}

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

    async function initResearch() {
        if (researchState.initialized) return;
        researchState.initialized = true;
        researchEnsureUI();
        await loadResearch();
    }

    return {loadMarkingKeys,getAssignmentGradingConfig,fetchSubmissionMarkingKey,autoGradeUsingMarkingKey,init,load,renderAssignments,loadSubmissions,openAssignmentModal,editAssignment,saveAssignment,saveAndPublish,addQuestionEditor,renumberQuestions,togglePublish,deleteAssignment,reviewSubmission,aiGradeSubmission,updateGradePercentage,gradeSubmission,closeModal,viewSubmissionDocument,closeDocumentViewer,runIntegrityScan,initResearch,loadResearch,openResearchReview,saveResearchReview,closeResearchModal,loadAssignmentTargeting,refreshIntakesForProgram,refreshBlocksForProgramIntake};
})();
;
