/* NCHSM Lecturer Online Learning — standalone module */
/* Research Papers is now a separate LecturerResearch module. */
// NCHSM Lecturer Dashboard — Online Learning module
// Externalized from the lecturer dashboard; uses the existing Supabase client and RLS policies.
// NCHSM Lecturer Dashboard — Online Learning module
// Externalized from the lecturer dashboard; uses the existing Supabase client and RLS policies.
window.LecturerOnlineLearning = (() => {
    const state = { assignments: [], submissions: [], initialized:false, client:null, userId:null, profile:null, publishAfterSave:false };
    // Submission storage bucket; portal can override with NCHSM_ASSIGNMENT_BUCKET.
    const STORAGE_BUCKET = window.NCHSM_ASSIGNMENT_BUCKET || 'assignment-submissions';
    const $ = id => document.getElementById(id);
    const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    function client(){
        if(state.client) return state.client;
        const candidates=[window.sb,window.supabaseClient,window.supabase,window.db?.supabase,window.lecturerDB?.supabase,window.lecturerDB?.client];
        state.client=candidates.find(x=>x && typeof x.from==='function');
        return state.client;
    }
    function safeJson(key,fallback=null){
        try{return JSON.parse(localStorage.getItem(key)||'null') ?? fallback;}catch(_){return fallback;}
    }
    async function resolveUser(){
        let p={};
        try{
            const candidate=window.lecturerDB?.getCurrentUserProfile?.();
            p=candidate && typeof candidate.then==='function' ? (await candidate) : (candidate || {});
        }catch(_){}
        if(!p || typeof p!=='object' || Array.isArray(p)) p={};
        p=Object.keys(p).length?p:(safeJson('userProfile',null)||safeJson('lecturerData',null)||{});
        state.profile=p;
        const session=safeJson('staffSession',{})||{};
        state.userId=p.user_id || p.auth_user_id || p.id || session.user_id || null;
        return state.userId;
    }
    function notify(msg,type='info'){ if(window.showNotification) window.showNotification(msg,type); else alert(msg); }
    function fmtDate(v){ if(!v)return '—'; const d=new Date(v); return isNaN(d)?'—':d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'}); }
    function formatPercentage(marks,maxMarks){const m=Number(marks),mx=Number(maxMarks);if(!Number.isFinite(m)||!Number.isFinite(mx)||mx<=0)return '—';return `${Math.round(Math.max(0,Math.min(100,(m/mx)*100))*100)/100}%`;}
    function clampMarks(marks,maxMarks){const m=Number(marks),mx=Number(maxMarks);return Number.isFinite(mx)&&mx>0?Math.max(0,Math.min(Number.isFinite(m)?m:0,mx)):Math.max(0,Number.isFinite(m)?m:0);}
    function statusBadge(a){return a.published?'<span class="ol-badge ol-published">PUBLISHED</span>':'<span class="ol-badge ol-draft">DRAFT</span>';}

    function ensureDynamicStyles(){
        if($('nchsmOnlineLearningDynamicStyles')) return;
        const st=document.createElement('style');
        st.id='nchsmOnlineLearningDynamicStyles';
        st.textContent=`
          .ol-q{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:10px 0;box-shadow:0 2px 8px rgba(15,23,42,.04)}
          .ol-q>div:first-child{color:#18304d}
          .ol-rubric-item{transition:.16s ease;border:1px solid transparent!important;background:#fff!important}
          .ol-rubric-item:hover{background:#f8fafc!important;border-color:#dbeafe!important;transform:translateY(-1px)}
          .ol-rubric-item.active{background:#eff6ff!important;border-color:#bfdbfe!important;box-shadow:0 2px 7px rgba(37,99,235,.08)}
          .ol-evidence-item{border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:11px;margin:7px 0;box-shadow:0 1px 4px rgba(15,23,42,.03)}
          .ol-evidence-item>i{margin-right:6px}
          .ol-last-grading-summary{background:linear-gradient(135deg,#f8fafc,#fff);border:1px solid #e2e8f0;border-radius:12px;padding:13px;margin:12px 0}
          .ol-key-row{border:1px solid #e2e8f0;border-radius:11px;padding:11px;margin-bottom:8px;background:#fff;transition:.16s ease}
          .ol-key-row:hover{border-color:#c4b5fd;box-shadow:0 3px 10px rgba(76,29,149,.06)}
          .ol-criteria-card{border:1px solid #e2e8f0;border-radius:11px;padding:12px;margin-bottom:9px;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.03)}
          .ol-criteria-requirement{padding:7px 9px;border-left:3px solid #c4b5fd;margin:5px 0;background:#f8fafc;border-radius:0 7px 7px 0;font-size:11px}
          .ol-loading-state{display:flex;align-items:center;justify-content:center;gap:9px;min-height:130px;color:#64748b}
          .ol-loading-state i{color:#4c1d95}
          @media(max-width:760px){
            .ol-q{padding:11px}.ol-evidence-item{font-size:12px}
          }
        `;
        document.head.appendChild(st);
    }

    async function init(){
        ensureDynamicStyles();
        if(state.initialized && state.assignments.length){ wireAssignmentTargeting(); await load(); return; }
        state.initialized=true;
        await resolveUser();
        wireAssignmentTargeting();
        await load();
    }
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
        if(!rows.length){body.innerHTML='<tr><td colspan="8" class="ol-empty">No assignments found. Click <b>Create Assignment</b> to create the first one.</td></tr>';return;}
        body.innerHTML=rows.map(a=>`<tr><td><b>${esc(a.title)}</b><div style="font-size:11px;color:#94a3b8">${esc(a.assignment_type||'assignment')}</div></td><td>${esc(a.unit_code)}<div style="font-size:11px;color:#64748b">${esc(a.unit_name||'')}</div></td><td>${esc(a.program||'Any')}<div style="font-size:11px;color:#64748b">Intake ${esc(a.intake||a.intake_year||'Any')} · ${esc(a.block||'Any block')}</div></td><td>${fmtDate(a.due_at)}</td><td><span id="olqcount-${a.id}">—</span></td><td>${esc(a.grading_mode==='marking_key'?'Marking Key':'Manual')}</td><td>${statusBadge(a)}</td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="ol-btn ol-muted" onclick="LecturerOnlineLearning.editAssignment('${a.id}')">Edit</button>${a.published?`<button class="ol-btn ol-warning" onclick="LecturerOnlineLearning.togglePublish('${a.id}',false)">Unpublish</button>`:`<button class="ol-btn ol-success" onclick="LecturerOnlineLearning.togglePublish('${a.id}',true)">Publish</button>`}<button class="ol-btn ol-danger" onclick="LecturerOnlineLearning.deleteAssignment('${a.id}')">Delete</button></div></td></tr>`).join('');
        rows.forEach(a=>loadQuestionCount(a.id));
    }
    async function loadQuestionCount(id){ const db=client(); const {count}=await db.from('online_assignment_questions').select('*',{count:'exact',head:true}).eq('assignment_id',id); const el=$(`olqcount-${id}`); if(el)el.textContent=count??0; }
    function populateAssignmentFilter(){const s=$('olSubmissionAssignmentFilter');if(!s)return;const cur=s.value;s.innerHTML='<option value="">All assignments</option>'+state.assignments.map(a=>`<option value="${esc(a.id)}">${esc(a.title)}</option>`).join('');s.value=cur;}
    function resolveSubmissionMaxMarks(submission,assignment={}){
        // The assignment / institutional marking key is authoritative.
        // A stale online_submissions.max_marks value must not override it.
        const candidates=[
            assignment?.max_marks,
            assignment?.marking_key?.max_marks,
            submission?.online_assignments?.max_marks,
            window._activeSubmissionMarkingKey?.max_marks,
            submission?.max_marks
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
        const body=$('olSubmissionsTable');if(!body)return; if(!state.submissions.length){body.innerHTML='<tr><td colspan="8" class="ol-empty">No student submissions yet.</td></tr>';updateStats();return;}
        // Resolve profile names through consolidated_user_profiles_table. RLS should permit lecturers/admins.
        const ids=[...new Set(state.submissions.map(s=>s.student_id).filter(Boolean))]; let profiles=[];
        if(ids.length){const r=await db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,email').in('user_id',ids);profiles=r.data||[];}
        const map=new Map(profiles.map(p=>[p.user_id,p]));
        body.innerHTML=state.submissions.map(s=>{
            const p=map.get(s.student_id)||{};
            const assignment=state.assignments.find(a=>a.id===s.assignment_id)||{};
            const maxMarks=resolveSubmissionMaxMarks(s,assignment);
            const report=(s.grading_report && typeof s.grading_report==='object') ? s.grading_report : {};
            const automaticMark=Number(
                report.total ??
                report.marks_obtained ??
                s.automatic_marks ??
                s.auto_mark ??
                s.marks_obtained
            );
            const finalMark=Number(
                report.final ??
                s.final_mark ??
                s.lecturer_final_mark ??
                s.marks_obtained ??
                automaticMark
            );
            const hasAutomatic=Number.isFinite(automaticMark);
            const hasFinal=Number.isFinite(finalMark);
            const automaticDisplay=hasAutomatic?`${automaticMark}/${maxMarks||'?'}`:'—';
            const automaticPct=hasAutomatic?formatPercentage(automaticMark,maxMarks):'—';
            const finalDisplay=hasFinal?`${finalMark}/${maxMarks||'?'}`:'—';
            const finalPct=hasFinal?formatPercentage(finalMark,maxMarks):'—';
            return `<tr><td><b>${esc(p.full_name||'Student')}</b><div style="font-size:11px;color:#64748b">${esc(p.admission_number||p.student_id||s.student_id||'')}</div></td><td>${esc(s.online_assignments?.title||assignment.title||s.assignment_id)}</td><td>${fmtDate(s.submitted_at)}</td><td>${esc(s.attempt_number||1)}</td><td><b>${automaticDisplay}</b><div style="font-size:11px;color:#64748b;margin-top:2px">${automaticPct}</div></td><td><b>${finalDisplay}</b><div style="font-size:11px;color:#64748b;margin-top:2px">${finalPct}</div></td><td><span class="ol-badge ${s.result_released?'ol-returned':s.review_required?'ol-review':'ol-draft'}">${s.result_released?'RELEASED':s.review_required?'REVIEW':'SUBMITTED'}</span></td><td><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.reviewSubmission('${s.id}')">Review</button></td></tr>`;
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

    // ===== Submission document helpers =====
    function extOf(name=''){
        const clean=String(name||'').toLowerCase().split('?')[0].split('#')[0];
        const x=clean.includes('.')?clean.split('.').pop():'';
        return x==='jpeg'?'jpg':x;
    }

    function loadScriptOnce(src,id){
        return new Promise((resolve,reject)=>{
            if(id && document.getElementById(id)) return resolve();
            const s=document.createElement('script');
            s.src=src;
            if(id)s.id=id;
            s.onload=resolve;
            s.onerror=()=>reject(new Error('Could not load '+src));
            document.head.appendChild(s);
        });
    }

    async function signedDocumentUrl(s){
        const db=client();
        if(!db) throw new Error('Supabase client is unavailable.');
        if(!s?.file_path) throw new Error('No uploaded document is attached to this submission.');

        const buckets=[...new Set([
            window.NCHSM_ASSIGNMENT_BUCKET,
            STORAGE_BUCKET,
            'assignment-submissions',
            'online-learning',
            'online_submissions'
        ].filter(Boolean))];

        let lastError=null;
        for(const bucket of buckets){
            try{
                const r=await db.storage.from(bucket).createSignedUrl(s.file_path,3600);
                if(!r.error && r.data?.signedUrl) return r.data.signedUrl;
                lastError=r.error||null;
            }catch(e){
                lastError=e;
            }
        }
        throw new Error(lastError?.message || 'Unable to create a signed document URL. Check the storage bucket and file path.');
    }

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
        const max=Number(
            gradingState.key?.max_marks||
            gradingState.assignment?.max_marks||
            resolveSubmissionMaxMarks(gradingState.submission,gradingState.assignment)||
            100
        );
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
    // LAST GRADING STATE — shows the most recently saved marks/state
    // when a lecturer opens Review. This does not change grading data.
    // ============================================================
    function renderLastGradingSummary(s, assignment){
        const host=$('olLastGradingSummary');
        if(!host || !s)return;

        const report=(s.grading_report && typeof s.grading_report==='object') ? s.grading_report : {};
        const max=Number(
            report.max ??
            report.max_marks ??
            s.max_marks ??
            assignment?.max_marks ??
            100
        ) || 100;

        const finalRaw=report.final ?? report.marks_awarded ?? s.final_mark ?? s.lecturer_final_mark ?? s.marks_obtained;
        const autoRaw=report.automatic ?? report.automatic_marks ?? report.marks_obtained ?? s.automatic_marks ?? s.auto_mark;
        const final=Number(finalRaw);
        const automatic=Number(autoRaw);

        const stage=s.result_released
            ? 'Released'
            : s.review_required
                ? 'Returned for Revision'
                : (Number.isFinite(final) || report.rubric_grades?.length)
                    ? 'Grading Saved'
                    : 'Not Yet Graded';

        const stageIcon=s.result_released?'fa-circle-check':s.review_required?'fa-rotate-left':(stage==='Grading Saved'?'fa-floppy-disk':'fa-hourglass-start');
        const timestamp=s.graded_at || s.last_graded_at || s.updated_at || s.created_at || s.submitted_at;
        const criteria=Array.isArray(report.rubric_grades)?report.rubric_grades:[];
        const savedCriteria=criteria.filter(g=>g && (g.final_mark!==undefined || g.automatic_mark!==undefined)).length;

        const markText=Number.isFinite(final) ? `${final}/${max}` : '—';
        const autoText=Number.isFinite(automatic) ? `${automatic}/${max}` : '—';

        host.innerHTML=`
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em">
                <i class="fas ${stageIcon}"></i> Last grading state
              </div>
              <div style="font-size:14px;font-weight:800;color:#17324d;margin-top:3px">${esc(stage)}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span style="background:#f1f5f9;border-radius:10px;padding:7px 10px;font-size:11px">
                <b>Final:</b> ${esc(markText)}
              </span>
              <span style="background:#f1f5f9;border-radius:10px;padding:7px 10px;font-size:11px">
                <b>Automatic:</b> ${esc(autoText)}
              </span>
              ${savedCriteria?`<span style="background:#f1f5f9;border-radius:10px;padding:7px 10px;font-size:11px"><b>Criteria saved:</b> ${savedCriteria}/${criteria.length}</span>`:''}
            </div>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:7px">
            ${timestamp?`Last grading update: <b>${esc(fmtDate(timestamp))}</b>`:'Last grading update: <b>Not recorded</b>'}
          </div>`;
    }

    // ============================================================
    // ASSIGNMENT DOCUMENT COMMENTS — same interaction pattern as
    // Research Papers: select text, add a comment, highlight it,
    // review comments and resolve them. Stored locally per submission
    // just like the current Research commenting workflow.
    // ============================================================
    function assignmentCommentKey(s){return 'nchsm_lecturer_assignment_'+String(s?.id||'')+':comments'}
    function assignmentStoredComments(s){
        try{
            const x=JSON.parse(localStorage.getItem(assignmentCommentKey(s))||'[]');
            return Array.isArray(x)?x:[];
        }catch(e){return []}
    }
    function assignmentSaveComments(s,list){
        try{localStorage.setItem(assignmentCommentKey(s),JSON.stringify(list||[]))}catch(e){}
    }
    function assignmentCommentId(){
        return 'ac_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
    }
    function assignmentGetEditor(){
        return document.querySelector('#olDocumentPreview .ol-assignment-editor[contenteditable="true"]');
    }
    function assignmentSaveSelection(){
        const editor=assignmentGetEditor(),sel=window.getSelection();
        if(!editor||!sel||!sel.rangeCount)return null;
        const range=sel.getRangeAt(0);
        if(!editor.contains(range.commonAncestorContainer))return null;
        return range.cloneRange();
    }
    function assignmentSelectionText(){
        const editor=assignmentGetEditor(),sel=window.getSelection();
        if(!editor||!sel||!sel.rangeCount)return '';
        const range=sel.getRangeAt(0);
        return editor.contains(range.commonAncestorContainer)?String(sel.toString()||'').trim():'';
    }
    function assignmentRefreshCommentMarks(s){
        const editor=assignmentGetEditor();
        if(!editor)return;
        editor.querySelectorAll('[data-ol-assignment-comment]').forEach(n=>{
            const parent=n.parentNode;
            while(n.firstChild)parent.insertBefore(n.firstChild,n);
            parent.removeChild(n);
        });
        assignmentStoredComments(s).forEach(c=>{
            if(!c.text)return;
            const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
            let node,found=null;
            while(node=walker.nextNode()){
                const at=String(node.nodeValue||'').indexOf(c.text);
                if(at>=0){found={node,at};break;}
            }
            if(!found)return;
            const range=document.createRange();
            range.setStart(found.node,found.at);
            range.setEnd(found.node,found.at+c.text.length);
            const mark=document.createElement('mark');
            mark.dataset.olAssignmentComment=c.id;
            mark.style.background='#fff1a8';
            mark.style.borderBottom='2px solid #e3ad00';
            mark.title=(c.author_name||'Lecturer')+': '+c.comment;
            try{range.surroundContents(mark)}catch(e){}
        });
    }
    function assignmentRenderComments(s){
        const panel=$('olAssignmentCommentsList');
        if(!panel)return;
        const comments=assignmentStoredComments(s);
        panel.innerHTML=comments.length ? comments.map(c=>`
          <div style="border:1px solid #dbe6ef;border-radius:9px;padding:9px;margin-bottom:7px;background:#fbfdff;font-size:11px">
            <strong style="display:block;color:#18304d">${esc(c.author_name||'Lecturer')}</strong>
            <small style="display:block;color:#94a3b8;margin:2px 0 6px">${esc(c.created_at?new Date(c.created_at).toLocaleString():'')}</small>
            <div style="background:#fffaf0;border-left:3px solid #f5c542;padding:6px;margin-bottom:6px">“${esc(c.text||'')}”</div>
            <div style="color:#475569;line-height:1.5">${esc(c.comment||'')}</div>
            <button type="button" class="ol-btn ol-muted" style="margin-top:7px;font-size:10px" data-ol-resolve-comment="${esc(c.id)}">Resolve</button>
          </div>`).join('') :
          '<div class="ol-empty" style="padding:15px 8px;font-size:11px">No comments yet. Select text in the document and click <b>Comment</b>.</div>';

        panel.querySelectorAll('[data-ol-resolve-comment]').forEach(btn=>{
            btn.onclick=()=>{
                const list=assignmentStoredComments(s).filter(c=>String(c.id)!==String(btn.dataset.olResolveComment));
                assignmentSaveComments(s,list);
                assignmentRefreshCommentMarks(s);
                assignmentRenderComments(s);
            };
        });
    }
    function assignmentAddComment(s){
        const editor=assignmentGetEditor();
        const range=assignmentSaveSelection();
        const text=assignmentSelectionText();
        if(!editor||!range||!text)return notify('Select text in the student document first.','warning');
        const comment=prompt('Add a comment for the selected text:');
        if(!comment||!comment.trim())return;
        const profile=state.profile||{};
        const item={
            id:assignmentCommentId(),
            text,
            comment:comment.trim(),
            author_name:profile.full_name||profile.name||state.userEmail||'Lecturer',
            created_at:new Date().toISOString()
        };
        const list=assignmentStoredComments(s);
        list.push(item);
        assignmentSaveComments(s,list);
        assignmentRefreshCommentMarks(s);
        assignmentRenderComments(s);
    }
    function assignmentInstallCommentTools(s){
        const editor=assignmentGetEditor();
        if(!editor)return;
        if(editor.dataset.commentToolsInstalled!=='1'){
            editor.dataset.commentToolsInstalled='1';
            editor.addEventListener('mouseup',()=>{});
            editor.addEventListener('keyup',()=>{});
        }
        assignmentRefreshCommentMarks(s);
        assignmentRenderComments(s);
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
                box.innerHTML=`<div style="border-bottom:1px solid #e2e8f0;padding:8px;background:#fff">
                    <span style="font-size:11px;color:#64748b"><i class="fas fa-info-circle"></i> PDF preview is available here. Text comments are currently enabled for DOC/DOCX and text-based submissions.</span>
                  </div>
                  <iframe class="ol-document-frame" style="width:100%;height:620px;border:0" src="${esc(url)}" title="Student submission"></iframe>`;
            }else if(ext==='docx'||ext==='doc'){
                const blob=await (await fetch(url)).blob();
                await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','olMammoth');
                const out=await window.mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});
                box.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
                    <div style="flex:1 1 680px;min-width:0">
                      <div style="position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e2e8f0;padding:8px;display:flex;gap:7px;align-items:center;flex-wrap:wrap">
                        <button type="button" class="ol-btn ol-warning" id="olAssignmentCommentBtn"><i class="fas fa-comment-dots"></i> Comment</button>
                        <span style="font-size:11px;color:#64748b">Select text in the document, then click Comment.</span>
                      </div>
                      <article class="ol-docx ol-assignment-editor" contenteditable="true" spellcheck="false" style="max-width:850px;margin:0 auto;padding:38px 48px;line-height:1.65;background:#fff;min-height:100%">${out.value||'<p>No readable text found.</p>'}</article>
                    </div>
                    <aside style="flex:0 0 300px;max-width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:10px;position:sticky;top:10px;max-height:620px;overflow:auto">
                      <div style="font-weight:800;color:#18304d;margin-bottom:8px"><i class="fas fa-comments"></i> Document Comments</div>
                      <div id="olAssignmentCommentsList"></div>
                    </aside>
                  </div>`;
                const commentBtn=$('olAssignmentCommentBtn');
                if(commentBtn) commentBtn.onclick=()=>assignmentAddComment(s);
                gradingState.documentText=await window.mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()}).then(r=>r.value||'');
                assignmentInstallCommentTools(s);
            }else if(['txt','md','csv'].includes(ext)){
                const text=await (await fetch(url)).text();
                gradingState.documentText=text;
                box.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
                  <div style="flex:1 1 680px;min-width:0">
                    <div style="position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e2e8f0;padding:8px">
                      <button type="button" class="ol-btn ol-warning" id="olAssignmentCommentBtn"><i class="fas fa-comment-dots"></i> Comment</button>
                      <span style="font-size:11px;color:#64748b;margin-left:6px">Select text, then comment.</span>
                    </div>
                    <article class="ol-assignment-editor" contenteditable="true" style="white-space:pre-wrap;background:#fff;padding:25px;max-width:900px;margin:0 auto;min-height:100%;line-height:1.6">${esc(text)}</article>
                  </div>
                  <aside style="flex:0 0 300px;max-width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:10px;position:sticky;top:10px;max-height:620px;overflow:auto">
                    <div style="font-weight:800;color:#18304d;margin-bottom:8px"><i class="fas fa-comments"></i> Document Comments</div>
                    <div id="olAssignmentCommentsList"></div>
                  </aside>
                </div>`;
                const commentBtn=$('olAssignmentCommentBtn');
                if(commentBtn) commentBtn.onclick=()=>assignmentAddComment(s);
                assignmentInstallCommentTools(s);
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
                    const response=await fetch(url);
                    if(!response.ok) throw new Error(`Could not download the submitted document (${response.status}).`);
                    const blob=await response.blob();
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
            notify(`Deterministic grade completed: ${report.marks_awarded}/${report.max_marks} (${report.percentage}%). Review before submitting.`,'success');
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
        const emailSent=await sendAssignmentCorrectionNotification(s,gradingState.assignment,reason);
        if(emailSent) notify('Submission returned for revision. Student correction notification sent.','success');
        else notify('Submission returned for revision, but the student notification could not be sent.','warning');
        closeModal('olSubmissionModal');await loadSubmissions();
    }

    // ============================================================
    // 📧 ASSIGNMENT RESULT NOTIFICATION
    // Notification only — no marks, percentages or grades are sent.
    // Uses the same Supabase send-email service as Research.
    // ============================================================
    async function sendAssignmentResultNotification(submission, assignment){
        try{
            const db=client();
            if(!db) return false;

            let student=null;
            if(submission?.student_id){
                const lookup=await db.from('consolidated_user_profiles_table')
                    .select('user_id,full_name,student_id,admission_number,email,program,intake_year,current_block,block')
                    .eq('user_id',submission.student_id)
                    .maybeSingle();
                if(!lookup.error && lookup.data) student=lookup.data;
            }

            if(!student?.email){
                console.warn('⚠️ No email found for assignment student:',submission?.student_id);
                return false;
            }

            const name=esc(student.full_name||student.admission_number||student.student_id||'Student');
            const title=esc(assignment?.title||submission?.online_assignments?.title||'Online Assignment');
            const unit=esc(assignment?.unit_code||submission?.online_assignments?.unit_code||'');

            const html=`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Assignment Graded</title>
<style>
body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f0f4f8;color:#243447}.container{max-width:580px;margin:0 auto;padding:20px}.card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#0A3D62,#1a5276);padding:30px 35px;text-align:center;color:#fff}.header h1{margin:0;font-size:24px}.header p{margin:4px 0 0;opacity:.82}.body{padding:30px 35px}.notice{background:#ECFDF5;border:2px solid #10B981;border-radius:16px;padding:22px;text-align:center;margin:18px 0}.notice .icon{font-size:2.6rem;display:block;margin-bottom:8px}.notice .message{font-size:1.08rem;color:#065F46;font-weight:700}.info{background:#f8fafc;border-radius:14px;padding:20px 24px;margin:18px 0;border-left:4px solid #0A3D62}.info p{margin:7px 0;font-size:14px}.label{color:#64748b;font-weight:500}.value{color:#0A3D62;font-weight:650}.btn{display:inline-block;background:linear-gradient(135deg,#0A3D62,#1a5276);color:#fff!important;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;margin:8px 0}.footer{background:#f8fafc;padding:22px 35px;text-align:center;border-top:1px solid #eef2f7}.footer p{font-size:12px;color:#8a9aa8;margin:4px 0}@media(max-width:480px){.header{padding:22px 18px}.body{padding:22px 18px}.footer{padding:18px}}
</style></head><body><div class="container"><div class="card">
<div class="header"><h1>📝 Assignment Graded</h1><p>Nakuru College of Health Sciences and Management</p></div>
<div class="body"><p>Dear <strong>${name}</strong>,</p>
<div class="notice"><span class="icon">✅</span><div class="message">Your assignment has been graded</div><div style="color:#065F46;font-size:.94rem;margin-top:6px">Your lecturer has completed the assessment and the result is now available in your student portal.</div></div>
<div class="info"><p><span class="label">📚 Assignment</span><br><span class="value">${title}</span></p>${unit?`<p><span class="label">📖 Unit</span><br><span class="value">${unit}</span></p>`:''}</div>
<div style="text-align:center;margin:25px 0 10px"><a class="btn" href="https://nchsm.co.ke">🔑 Open Student Portal</a></div>
<p style="font-size:12px;color:#64748b;text-align:center">Please log in to your student portal to view the released result and any lecturer feedback.</p>
</div><div class="footer"><p><strong>Nakuru College of Health Sciences and Management</strong></p><p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p><p>This is an automated notification. Please do not reply to this email.</p></div>
</div></div></body></html>`;

            const result=await db.functions.invoke('send-email',{body:{
                to:student.email,
                subject:`📝 Assignment Graded - ${assignment?.title||submission?.online_assignments?.title||'Online Assignment'}`,
                html,
                from:'NCHSM Online Learning <admin@nchsm.co.ke>'
            }});
            if(result.error){
                console.error('❌ Assignment result email failed:',result.error);
                return false;
            }
            if(result.data && result.data.success===false){
                console.error('❌ Assignment result email failed:',result.data.error||result.data);
                return false;
            }
            console.log(`✅ Assignment graded notification sent to ${student.email}`);
            return true;
        }catch(error){
            console.error('❌ Assignment result email error:',error);
            return false;
        }
    }

    async function sendAssignmentCorrectionNotification(submission, assignment, feedback){
        try{
            const db=client();
            if(!db) return false;
            let student=null;
            if(submission?.student_id){
                const lookup=await db.from('consolidated_user_profiles_table')
                    .select('user_id,full_name,student_id,admission_number,email')
                    .eq('user_id',submission.student_id)
                    .maybeSingle();
                if(!lookup.error && lookup.data) student=lookup.data;
            }
            if(!student?.email) return false;

            const name=esc(student.full_name||student.admission_number||student.student_id||'Student');
            const title=esc(assignment?.title||submission?.online_assignments?.title||'Online Assignment');
            const safeFeedback=feedback?esc(feedback):'';

            const html=`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Assignment Corrections Required</title>
<style>body{font-family:'Segoe UI',Tahoma,sans-serif;margin:0;padding:0;background:#f0f4f8;color:#243447}.container{max-width:580px;margin:0 auto;padding:20px}.card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.1)}.header{background:linear-gradient(135deg,#0A3D62,#1a5276);padding:30px 35px;text-align:center;color:#fff}.header h1{margin:0;font-size:24px}.body{padding:30px 35px}.notice{background:#FFF7ED;border:2px solid #F59E0B;border-radius:16px;padding:22px;text-align:center;margin:18px 0}.notice .icon{font-size:2.6rem;display:block}.notice .message{font-size:1.08rem;color:#92400E;font-weight:700}.info{background:#f8fafc;border-radius:14px;padding:20px 24px;margin:18px 0;border-left:4px solid #0A3D62}.info p{margin:7px 0;font-size:14px}.value{color:#0A3D62;font-weight:650}.feedback{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;margin:18px 0}.feedback h3{margin:0 0 8px;color:#1E40AF;font-size:14px}.feedback p{margin:0;white-space:pre-wrap;line-height:1.6;font-size:14px}.btn{display:inline-block;background:linear-gradient(135deg,#0A3D62,#1a5276);color:#fff!important;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600}.footer{background:#f8fafc;padding:22px 35px;text-align:center;border-top:1px solid #eef2f7}.footer p{font-size:12px;color:#8a9aa8;margin:4px 0}</style></head><body><div class="container"><div class="card">
<div class="header"><h1>📝 Assignment Corrections Required</h1><p>Nakuru College of Health Sciences and Management</p></div><div class="body"><p>Dear <strong>${name}</strong>,</p>
<div class="notice"><span class="icon">📝</span><div class="message">Corrections are required</div><div style="color:#7C5A2B;font-size:.94rem;margin-top:6px">Your lecturer has reviewed your assignment and returned it for correction. Please log in to your student portal to review the feedback and make the required changes.</div></div>
<div class="info"><p>📚 <strong>Assignment</strong><br><span class="value">${title}</span></p></div>
${safeFeedback?`<div class="feedback"><h3>💬 Lecturer Feedback</h3><p>${safeFeedback}</p></div>`:''}
<div style="text-align:center;margin:25px 0"><a class="btn" href="https://nchsm.co.ke">🔑 Open Student Portal</a></div>
</div><div class="footer"><p><strong>Nakuru College of Health Sciences and Management</strong></p><p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p><p>This is an automated notification. Please do not reply to this email.</p></div></div></div></body></html>`;

            const result=await db.functions.invoke('send-email',{body:{
                to:student.email,
                subject:`📝 Assignment Corrections Required - ${assignment?.title||submission?.online_assignments?.title||'Online Assignment'}`,
                html,
                from:'NCHSM Online Learning <admin@nchsm.co.ke>'
            }});
            if(result.error || (result.data && result.data.success===false)) return false;
            return true;
        }catch(e){ console.error('Assignment correction email error:',e); return false; }
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
        const emailSent=await sendAssignmentResultNotification(s,gradingState.assignment);
        if(emailSent) notify('Final grade submitted and released. Student notification sent.','success');
        else notify('Final grade submitted and released, but the student notification could not be sent.','warning');
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
            }
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
            renderLastGradingSummary(s,assignment);
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
            return `<button type="button" class="ol-key-row" data-key-id="${esc(k.id)}" style="display:block;width:100%;text-align:left;border-color:${active?'#a5b4fc':'#e5e7eb'};background:${active?'#f5f3ff':'#fff'};border-radius:10px;padding:11px;margin-bottom:7px;cursor:pointer">
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
                return `<div class="ol-criteria-card">
                    <div style="display:flex;justify-content:space-between;gap:10px"><strong>${i+1}. ${esc(c.criterion)}</strong><strong>${esc(c.max_marks)} marks</strong></div>
                    ${c.description?`<div style="font-size:11px;color:#64748b;margin-top:4px">${esc(c.description)}</div>`:''}
                    ${reqs.length?`<div style="margin-top:8px">${reqs.map(r=>`<div class="ol-criteria-requirement"><b>${esc(r.description)}</b><span style="float:right">${esc(r.max_marks??r.weight??'—')}</span>${r.evidence_terms?.length?`<div style="color:#64748b;margin-top:2px">${esc(r.evidence_terms.join(' · '))}</div>`:''}</div>`).join('')}</div>`:'<div style="font-size:11px;color:#94a3b8;margin-top:7px">No sub-requirements configured.</div>'}
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


    async function viewSubmissionDocument(id){
        try{const s=state.submissions.find(x=>x.id===id);if(!s)throw new Error('Submission not found.');await renderDocument(s);$('olDocumentViewer').style.display='flex';}
        catch(e){console.error(e);notify('Could not open the uploaded document: '+e.message,'error');}
    }
    function closeDocumentViewer(){if($('olDocumentViewer'))$('olDocumentViewer').style.display='none';}


    // ============================================================
    // V15 GRADING UI COMPATIBILITY / ACTION LAYER
    // Matches the pixel-matched V17 HTML without changing the
    // deterministic grading engine or database model.
    // ============================================================
    function syncGradingUiFromState(){
        try{
            const s=gradingState.submission;
            if(!s)return;

            const set=(id,v)=>{const el=$(id);if(el)el.textContent=(v===null||v===undefined||v==='')?'—':String(v);};
            const max=Number(gradingState.maxMarks||gradingState.assignment?.max_marks||s.max_marks||100)||100;
            const report=gradingReportPayload ? gradingReportPayload() : null;
            const automatic=Number(
                gradingState.automaticReport?.total ??
                gradingState.automaticReport?.marks_obtained ??
                s.automatic_marks ??
                s.auto_mark ??
                s.marks_obtained ??
                0
            ) || 0;
            const finalMark=Number(
                report?.final ??
                s.final_mark ??
                s.lecturer_final_mark ??
                s.marks_obtained ??
                automatic
            ) || 0;

            set('olFinalGradeTotal',finalMark.toFixed(2));
            set('olFinalGradeMax',max.toFixed(2));
            set('olAutomaticGradeTotal',automatic.toFixed(2));
            set('olAutomaticGradeMax',max.toFixed(2));
            set('olFinalGradePercentage',(max?((finalMark/max)*100):0).toFixed(2)+'%');

            const status=s.result_released?'RELEASED':(s.status||'DRAFT').replace(/_/g,' ').toUpperCase();
            const badge=$('olGradingStatusBadge');
            if(badge)badge.textContent=status;

            const meta=$('olGradingStudentMeta');
            if(meta){
                const name=s.student_name||s.student?.full_name||s.student?.name||s.full_name||'Student';
                const adm=s.admission_number||s.student_admission_number||s.student_id||'';
                const title=s.assignment_title||gradingState.assignment?.title||'Assignment';
                meta.textContent=[name,adm,title].filter(Boolean).join(' · ');
            }
        }catch(err){
            console.warn('[Online Learning] grading UI sync failed',err);
        }
    }

    function saveGrade(){
        // "Save Grade" is a non-release save of the current lecturer marks.
        return saveGradingDraft();
    }

    function saveDraftGrade(){
        return saveGradingDraft();
    }

    function releaseGrade(){
        return submitFinalGrade();
    }

    function refreshAfterGradeAction(){
        syncGradingUiFromState();
        try{renderSubmissions();}catch(_){}
        try{renderAssignments();}catch(_){}
    }

    // Make HTML action names stable across versions.
    window.__NCHSM_OnlineLearning_GradeActions={
        saveGrade,saveDraftGrade,releaseGrade,refreshAfterGradeAction
    };


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
        saveGrade,
        saveDraftGrade,
        releaseGrade,
        returnSubmission,
        submitFinalGrade,
        openSubmissionDocument,
        downloadSubmissionDocument,
        downloadSubmission: downloadSubmissionDocument,
        updateGradePercentage,
        closeModal,
        viewSubmissionDocument,
        closeDocumentViewer
    };

})();
;


/* ============================================================
   V15 STATIC HTML ACTION BRIDGE
   ============================================================ */
(function(){
    'use strict';
    function getMod(){return window.LecturerOnlineLearning||null;}
    function invoke(name,el){
        const mod=getMod();
        if(!mod || typeof mod[name]!=='function'){
            console.warn('[Online Learning] Action unavailable:',name);
            return;
        }
        try{
            const result=mod[name]();
            if(result && typeof result.then==='function'){
                result.catch(err=>{
                    console.error('[Online Learning] Action failed:',name,err);
                    if(typeof window.showNotification==='function')
                        window.showNotification(err?.message||'Action failed.','error');
                });
            }
        }catch(err){
            console.error('[Online Learning] Action failed:',name,err);
        }
    }
    document.addEventListener('click',function(e){
        const b=e.target.closest('[data-ol-action]');
        if(!b)return;
        e.preventDefault();
        invoke(b.dataset.olAction,b);
    });
    document.addEventListener('change',function(e){
        const el=e.target;
        if(el.id==='olCriterionFinalMark' && window.LecturerOnlineLearning){
            try{
                if(typeof window.LecturerOnlineLearning.updateGradePercentage==='function')
                    window.LecturerOnlineLearning.updateGradePercentage();
            }catch(_){}
        }
    });
})();
/* ============================================================
   ONLINE LEARNING — SAFE AUTO BOOT
   Runs only when the module section exists. The HTML bootstrap
   remains compatible; duplicate init calls are guarded by state.
   ============================================================ */
(function(){
    function boot(){
        const section=document.getElementById('online-learning-content');
        if(!section || !window.LecturerOnlineLearning) return;
        if(section.dataset.olAutoBoot==='1') return;
        section.dataset.olAutoBoot='1';
        window.LecturerOnlineLearning.init().catch(err=>{
            console.error('[Online Learning] initialization failed:',err);
        });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80),{once:true});
    else setTimeout(boot,80);
})();
