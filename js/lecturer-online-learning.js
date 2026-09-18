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
    function statusBadge(a){return a.published?'<span class="ol-badge ol-published">PUBLISHED</span>':'<span class="ol-badge ol-draft">DRAFT</span>';}
    async function init(){ if(state.initialized && state.assignments.length){ await load(); setTimeout(initResearch,150); return; } state.initialized=true; await resolveUser(); await load(); setTimeout(initResearch,150); }
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
    function fillProfileDefaults(){const p=state.profile||{};$('olProgram').value=p.program||p.program_type||'';$('olIntake').value=p.intake_year||p.admission_year||'';$('olBlock').value=p.block||p.current_block||'';}
    function openAssignmentModal(a=null){$('olAssignmentId').value=a?.id||'';$('olAssignmentModalTitle').textContent=a?'Edit Assignment':'Create Assignment';$('olTitle').value=a?.title||'';$('olType').value=a?.assignment_type||'assignment';$('olUnitCode').value=a?.unit_code||'';$('olUnitName').value=a?.unit_name||'';$('olProgram').value=a?.program||'';$('olIntake').value=a?.intake||a?.intake_year||'';$('olBlock').value=a?.block||'';$('olDueAt').value=a?.due_at?new Date(a.due_at).toISOString().slice(0,16):'';$('olMaxMarks').value=a?.max_marks||20;$('olMaxAttempts').value=a?.max_attempts||1;$('olInstructions').value=a?.instructions||'';$('olAllowUpload').checked=a?.allow_document_upload!==false;$('olAllowResubmit').checked=!!a?.allow_resubmission;resetQuestionEditors([]);if(!a)fillProfileDefaults();$('olAssignmentModal').style.display='flex';}
    async function editAssignment(id){const a=state.assignments.find(x=>x.id===id);if(!a)return;const db=client();const {data}=await db.from('online_assignment_questions').select('*').eq('assignment_id',id).order('question_order');openAssignmentModal(a);resetQuestionEditors(data||[]);}
    async function saveAssignment(e,forcePublish=false){e?.preventDefault();const db=client();if(!db)return false;await resolveUser();if(!state.userId){notify('Lecturer user ID could not be resolved.','error');return false;}
        const id=$('olAssignmentId').value;const payload={title:$('olTitle').value.trim(),assignment_type:$('olType').value,unit_code:$('olUnitCode').value.trim(),unit_name:$('olUnitName').value.trim()||null,program:$('olProgram').value.trim(),intake:$('olIntake').value.trim(),block:$('olBlock').value.trim()||null,due_at:new Date($('olDueAt').value).toISOString(),max_marks:Number($('olMaxMarks').value),max_attempts:Number($('olMaxAttempts').value)||1,instructions:$('olInstructions').value.trim()||null,allow_document_upload:$('olAllowUpload').checked,allow_resubmission:$('olAllowResubmit').checked,created_by:state.userId,published:!!forcePublish};
        let assignment,err;if(id){const r=await db.from('online_assignments').update(payload).eq('id',id).select().single();assignment=r.data;err=r.error;}else{const r=await db.from('online_assignments').insert(payload).select().single();assignment=r.data;err=r.error;}if(err){console.error(err);notify('Could not save assignment: '+err.message,'error');return false;}
        await db.from('online_assignment_questions').delete().eq('assignment_id',assignment.id);const qs=collectQuestions();if(qs.length){const rows=qs.map(q=>({...q,assignment_id:assignment.id}));const r=await db.from('online_assignment_questions').insert(rows);if(r.error){notify('Assignment saved, but questions failed: '+r.error.message,'warning');return false;}}
        closeModal('olAssignmentModal');notify(forcePublish?'Assignment published.':'Assignment saved as draft.','success');await load();return true;
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

    async function reviewSubmission(id){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;let questions=[];const qr=await db.from('online_assignment_questions').select('id,question_order,question_text,question_type,marks').eq('assignment_id',s.assignment_id).order('question_order');questions=qr.data||[];const answers=s.answers||{};const profiles=await db.from('consolidated_user_profiles_table').select('full_name,student_id,admission_number,email').eq('user_id',s.student_id).maybeSingle();const p=profiles.data||{};const body=$('olSubmissionBody');body.innerHTML=`<div class="ol-submission-grid"><div><h3 style="margin-top:0">${esc(s.online_assignments?.title||'Submission')}</h3><p style="color:#64748b">${esc(p.full_name||'Student')} · ${esc(p.admission_number||p.student_id||'')}</p><div>${questions.length?questions.map((q,i)=>`<div class="ol-q"><b>Q${i+1}. ${esc(q.question_text)}</b><div style="margin-top:8px;background:#f8fafc;padding:10px;border-radius:8px;white-space:pre-wrap">${esc(answers[q.id]??answers[String(q.id)]??'No answer')}</div><small style="color:#64748b">${q.marks} marks</small></div>`).join(''):'<div class="ol-empty">No structured questions. Review the uploaded document if provided.</div>'}</div></div><div><div class="ol-card" style="margin:0"><div style="color:#64748b;font-size:12px">CURRENT MARK</div><div class="ol-mark">${s.marks_obtained??0}/${s.max_marks??'—'}</div><label>Marks Awarded</label><input id="olReviewMarks" type="number" min="0" step="0.01" value="${s.marks_obtained??0}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px"><label style="display:block;margin-top:12px">Feedback</label><textarea id="olReviewFeedback" rows="6" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px">${esc(s.feedback||'')}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',false)">Save Grade</button><button class="ol-btn ol-success" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',true)">Grade & Release</button></div>${s.file_path?`<div style="margin-top:15px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc"><div style="font-size:12px;color:#64748b;margin-bottom:8px"><i class="fas fa-paperclip"></i> ${esc(s.file_name||'Uploaded document')}</div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.viewSubmissionDocument('${s.id}')"><i class="fas fa-eye"></i> View Entire Work</button><button id="olIntegrityBtn" class="ol-btn ol-muted" onclick="LecturerOnlineLearning.runIntegrityScan('${s.id}')"><i class="fas fa-shield-alt"></i> Run Integrity Scan</button></div><div id="olIntegrityReport"></div></div>`:''}</div></div></div>`;$('olSubmissionModal').style.display='flex';}
    async function gradeSubmission(id,release){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;const marks=Number($('olReviewMarks').value);const feedback=$('olReviewFeedback').value.trim()||null;const {error}=await db.from('online_submissions').update({marks_obtained:marks,feedback,status:'graded',graded_by:state.userId,graded_at:new Date().toISOString(),result_released:release,released_at:release?new Date().toISOString():null,review_required:false}).eq('id',id);if(error){notify(error.message,'error');return;}notify(release?'Grade saved and result released.':'Grade saved.','success');closeModal('olSubmissionModal');await loadSubmissions();updateStats();}
    function closeModal(id){const m=$(id);if(m)m.style.display='none';}

    // ============================================================
    // RESEARCH SUBMISSIONS — LECTURER REVIEW + GOOGLE DOCS STYLE EDITOR
    // ============================================================
    const researchState = {
        submissions: [],
        profiles: new Map(),
        initialized: false,
        search: '',
        filterStatus: '',
        filterType: '',
        filterProgram: '',
        filterIntake: '',
        current: null,
        originalHtml: '',
        draftHtml: '',
        correctionDirty: false
    };

    function researchTypeLabel(type) {
        const map = {
            proposal: 'Research Proposal',
            final_paper: 'Research Project / Final Paper',
            correction: 'Correction / Revised Paper'
        };
        return map[type] || String(type || 'Research').replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    }

    function researchStatusLabel(status) {
        const map = {
            submitted: 'Submitted',
            under_review: 'Under Review',
            revision_required: 'Revision Required',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return map[status] || String(status || 'Unknown').replace(/_/g, ' ');
    }

    function researchStatusPill(status) {
        const cls = String(status || '').toLowerCase();
        return `<span class="rs-pill rs-${esc(cls)}">${esc(researchStatusLabel(status))}</span>`;
    }

    function researchSafeName(value) {
        return String(value || 'research').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'research';
    }

    function researchProfile(s) {
        return researchState.profiles.get(s.student_id) || {};
    }

    function researchEnsureStyles() {
        if ($('rsModernStyles')) return;
        const st = document.createElement('style');
        st.id = 'rsModernStyles';
        st.textContent = `
        .rs-wrap{display:flex;flex-direction:column;gap:16px}
        .rs-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
        .rs-head h3{margin:0;font-size:22px;color:#0f172a}.rs-head p{margin:5px 0 0;color:#64748b;font-size:13px}
        .rs-stats{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px}
        .rs-stat,.rs-card{background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:14px;box-shadow:0 2px 8px rgba(15,23,42,.04)}
        .rs-stat strong{display:block;font-size:23px;color:#0f172a}.rs-stat span{font-size:11px;color:#64748b}
        .rs-toolbar{display:grid;grid-template-columns:minmax(220px,1.7fr) repeat(4,minmax(130px,1fr)) auto auto;gap:8px;align-items:center}
        .rs-toolbar input,.rs-toolbar select,.rs-side input,.rs-side select,.rs-side textarea{width:100%;box-sizing:border-box;border:1px solid #dbe3ec;border-radius:9px;padding:10px;background:#fff;color:#0f172a}
        .rs-btn{border:0;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer;white-space:nowrap}
        .rs-primary{background:#2563eb;color:#fff}.rs-secondary{background:#eef2f7;color:#334155}.rs-success{background:#16a34a;color:#fff}.rs-danger{background:#dc2626;color:#fff}.rs-warning{background:#d97706;color:#fff}
        .rs-section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.rs-section-title h4{margin:0;color:#0f172a}.rs-section-title span{font-size:12px;color:#64748b}
        .rs-table-wrap{overflow:auto}.rs-table{width:100%;border-collapse:collapse;min-width:880px}.rs-table th{background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:11px;border-bottom:1px solid #e2e8f0}.rs-table td{padding:12px 11px;border-bottom:1px solid #eef2f7;vertical-align:middle;font-size:13px}.rs-table tr:last-child td{border-bottom:0}
        .rs-student strong{display:block;color:#0f172a}.rs-student small{display:block;color:#64748b;margin-top:2px}.rs-title-cell strong{display:block;max-width:320px;white-space:normal}.rs-title-cell small{color:#64748b}
        .rs-pill{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap;background:#e2e8f0;color:#334155}.rs-submitted{background:#e0f2fe;color:#0369a1}.rs-under_review{background:#fef3c7;color:#92400e}.rs-revision_required{background:#fee2e2;color:#991b1b}.rs-approved{background:#dcfce7;color:#166534}.rs-rejected{background:#e5e7eb;color:#374151}
        .rs-empty{padding:28px;text-align:center;color:#64748b}.rs-empty strong{display:block;color:#334155;margin-bottom:5px}
        .rs-modal{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100100;display:none;align-items:center;justify-content:center;padding:12px}
        .rs-dialog{width:min(1450px,100%);height:min(94vh,1050px);background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 25px 80px rgba(0,0,0,.3)}
        .rs-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#fff}.rs-dialog-head h3{margin:0;font-size:17px}.rs-dialog-head .rs-meta{font-size:12px;color:#64748b;margin-top:3px}
        .rs-workspace{display:grid;grid-template-columns:minmax(0,1fr) 330px;min-height:0;flex:1}
        .rs-editor-pane{display:flex;flex-direction:column;min-width:0;background:#f1f5f9}.rs-editor-toolbar{display:flex;align-items:center;gap:5px;padding:8px;border-bottom:1px solid #dbe3ec;background:#fff;flex-wrap:wrap}.rs-tool{width:34px;height:32px;border:1px solid #dbe3ec;background:#fff;border-radius:7px;cursor:pointer;font-weight:700}.rs-tool:hover{background:#f1f5f9}.rs-tool.active{background:#dbeafe;border-color:#93c5fd}.rs-editor-state{margin-left:auto;font-size:11px;color:#64748b;padding:0 6px}
        .rs-document-shell{overflow:auto;flex:1;padding:28px}.rs-document{background:#fff;max-width:850px;min-height:1050px;margin:0 auto;padding:65px 72px;box-shadow:0 2px 15px rgba(15,23,42,.12);outline:none;box-sizing:border-box;line-height:1.65;color:#1e293b;font-family:Arial,sans-serif;font-size:15px}.rs-document[contenteditable="true"]{cursor:text}.rs-document:focus{box-shadow:0 0 0 2px #93c5fd,0 2px 15px rgba(15,23,42,.12)}
        .rs-side{border-left:1px solid #e2e8f0;background:#fff;padding:16px;overflow:auto}.rs-side h4{margin:0 0 12px}.rs-side label{display:block;font-size:11px;font-weight:800;color:#475569;margin:13px 0 6px}.rs-side textarea{min-height:150px;resize:vertical}.rs-side .rs-meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font-size:12px;line-height:1.6;color:#475569}
        .rs-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.rs-actions .wide{grid-column:1/-1}
        .rs-history{margin-top:14px}.rs-history-item{padding:9px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;font-size:11px}.rs-history-item strong{display:block}.rs-history-item span{color:#64748b}
        body.dark-mode .rs-stat,body.dark-mode .rs-card,body.dark-mode .rs-dialog,body.dark-mode .rs-dialog-head,body.dark-mode .rs-side{background:#0d1b2d!important;border-color:#263d55!important;color:#e2e8f0}body.dark-mode .rs-head h3,body.dark-mode .rs-stat strong,body.dark-mode .rs-section-title h4,body.dark-mode .rs-student strong{color:#f1f5f9}body.dark-mode .rs-toolbar input,body.dark-mode .rs-toolbar select,body.dark-mode .rs-side input,body.dark-mode .rs-side select,body.dark-mode .rs-side textarea{background:#0a1727;color:#e2e8f0;border-color:#334b63}
        @media(max-width:1050px){.rs-stats{grid-template-columns:repeat(3,1fr)}.rs-toolbar{grid-template-columns:1fr 1fr 1fr}.rs-workspace{grid-template-columns:1fr}.rs-side{border-left:0;border-top:1px solid #e2e8f0;max-height:420px}}
        @media(max-width:650px){.rs-stats{grid-template-columns:repeat(2,1fr)}.rs-toolbar{grid-template-columns:1fr 1fr}.rs-document-shell{padding:10px}.rs-document{padding:35px 25px;min-height:800px}.rs-actions{grid-template-columns:1fr}}
        `;
        document.head.appendChild(st);
    }

    function researchEnsureUI() {
        const hub = $('online-learning-content') || $('hub-online-learning');
        if (!hub) return;

        researchEnsureStyles();

        let tabs = hub.querySelector('.ol-hub-tabs');
        if (!tabs) {
            tabs = document.createElement('div');
            tabs.className = 'ol-hub-tabs';
            tabs.innerHTML = `<button type="button" class="ol-hub-tab active" data-rs-tab="online"><i class="fas fa-book-open"></i> Online Learning</button>
                              <button type="button" class="ol-hub-tab" data-rs-tab="research"><i class="fas fa-flask"></i> Research Papers</button>`;
            hub.prepend(tabs);
            tabs.querySelector('[data-rs-tab="online"]').addEventListener('click', () => {
                state.tab = 'online';
                tabs.querySelectorAll('.ol-hub-tab').forEach(b => b.classList.toggle('active', b.dataset.rsTab === 'online'));
                if (typeof renderAssignments === 'function') renderAssignments();
            });
            tabs.querySelector('[data-rs-tab="research"]').addEventListener('click', () => {
                state.tab = 'research';
                tabs.querySelectorAll('.ol-hub-tab').forEach(b => b.classList.toggle('active', b.dataset.rsTab === 'research'));
                loadResearch();
            });
        }

        let module = $('nchsmResearchModule');
        if (!module) {
            module = document.createElement('div');
            module.id = 'nchsmResearchModule';
            module.style.display = 'none';
            hub.appendChild(module);
        }

        let modal = $('rsReviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'rs-modal';
            modal.id = 'rsReviewModal';
            modal.setAttribute('aria-hidden', 'true');
            modal.innerHTML = `
            <div class="rs-dialog">
              <div class="rs-dialog-head">
                <div><h3 id="rsModalTitle">Research Review Workspace</h3><div class="rs-meta" id="rsModalMeta"></div></div>
                <button class="rs-btn rs-secondary" type="button" id="rsClose"><i class="fas fa-times"></i> Close</button>
              </div>
              <div class="rs-workspace">
                <div class="rs-editor-pane">
                  <div class="rs-editor-toolbar">
                    <button class="rs-tool" title="Bold" data-rs-cmd="bold"><b>B</b></button>
                    <button class="rs-tool" title="Italic" data-rs-cmd="italic"><i>I</i></button>
                    <button class="rs-tool" title="Underline" data-rs-cmd="underline"><u>U</u></button>
                    <button class="rs-tool" title="Highlight" data-rs-cmd="hiliteColor">H</button>
                    <button class="rs-tool" title="Bullet list" data-rs-cmd="insertUnorderedList">•</button>
                    <button class="rs-tool" title="Numbered list" data-rs-cmd="insertOrderedList">1.</button>
                    <button class="rs-tool" title="Align left" data-rs-cmd="justifyLeft">≡</button>
                    <button class="rs-tool" title="Align center" data-rs-cmd="justifyCenter">≡</button>
                    <button class="rs-tool" title="Undo" data-rs-cmd="undo">↶</button>
                    <button class="rs-tool" title="Redo" data-rs-cmd="redo">↷</button>
                    <button class="rs-tool" title="Remove formatting" data-rs-cmd="removeFormat">Tx</button>
                    <span class="rs-editor-state" id="rsEditorState">Read only</span>
                  </div>
                  <div class="rs-document-shell"><article id="rsDocumentEditor" class="rs-document"></article></div>
                </div>
                <aside class="rs-side">
                  <h4>Review & Corrections</h4>
                  <div id="rsStudentMeta" class="rs-meta-box"></div>
                  <label>Review Status</label>
                  <select id="rsReviewStatus">
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="revision_required">Revision Required</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <label>Lecturer Feedback / Correction Notes</label>
                  <textarea id="rsFeedback" placeholder="Write feedback, corrections, required changes or approval comments..."></textarea>
                  <div class="rs-actions">
                    <button class="rs-btn rs-primary" type="button" id="rsEditDocument"><i class="fas fa-pen"></i> Edit Document</button>
                    <button class="rs-btn rs-secondary" type="button" id="rsOriginalDocument"><i class="fas fa-file"></i> Original</button>
                    <button class="rs-btn rs-warning" type="button" id="rsSaveCorrection"><i class="fas fa-save"></i> Save Correction</button>
                    <button class="rs-btn rs-secondary" type="button" id="rsDownload"><i class="fas fa-download"></i> Download</button>
                    <button class="rs-btn rs-success" type="button" id="rsApprove"><i class="fas fa-check"></i> Approve</button>
                    <button class="rs-btn rs-danger" type="button" id="rsRevision"><i class="fas fa-rotate-left"></i> Send Revision</button>
                    <button class="rs-btn rs-danger wide" type="button" id="rsReject"><i class="fas fa-xmark"></i> Reject</button>
                  </div>
                  <div class="rs-history"><h4>Version History</h4><div id="rsVersionHistory"></div></div>
                </aside>
              </div>
            </div>`;
            document.body.appendChild(modal);

            $('rsClose').addEventListener('click', closeResearchModal);
            modal.addEventListener('click', e => { if (e.target === modal) closeResearchModal(); });
            $('rsEditDocument').addEventListener('click', toggleResearchEditor);
            $('rsOriginalDocument').addEventListener('click', () => {
                const ed = $('rsDocumentEditor');
                if (ed) ed.innerHTML = researchState.originalHtml || '<p>No editable document content.</p>';
                researchState.correctionDirty = false;
                updateEditorState();
            });
            $('rsSaveCorrection').addEventListener('click', saveResearchCorrection);
            $('rsDownload').addEventListener('click', downloadCurrentResearch);
            $('rsApprove').addEventListener('click', () => setResearchStatusAndSave('approved'));
            $('rsRevision').addEventListener('click', () => setResearchStatusAndSave('revision_required'));
            $('rsReject').addEventListener('click', () => setResearchStatusAndSave('rejected'));

            modal.querySelectorAll('[data-rs-cmd]').forEach(btn => btn.addEventListener('mousedown', e => {
                e.preventDefault();
                const cmd = btn.dataset.rsCmd;
                if (cmd === 'hiliteColor') {
                    document.execCommand('hiliteColor', false, '#fff59d');
                } else {
                    document.execCommand(cmd, false, null);
                }
                researchState.correctionDirty = true;
                updateEditorState();
            }));

            $('rsDocumentEditor').addEventListener('input', () => {
                researchState.correctionDirty = true;
                updateEditorState();
                if (researchState.current) {
                    try { localStorage.setItem('nchsm_rs_draft_' + researchState.current.id, $('rsDocumentEditor').innerHTML); } catch {}
                }
            });
        }

        // Do not call renderResearch() from here. renderResearch() calls researchEnsureUI(),
        // so doing so creates an infinite recursion and causes "Maximum call stack size exceeded".
    }

    function filteredResearch() {
        const search = researchState.search;
        return (researchState.submissions || []).filter(s => {
            const p = researchProfile(s);
            const hay = [
                p.full_name, p.student_id, p.admission_number, p.email,
                p.program, p.intake_year, s.title, s.supervisor_name,
                researchTypeLabel(s.submission_type), researchStatusLabel(s.status)
            ].join(' ').toLowerCase();

            if (search && !hay.includes(search)) return false;
            if (researchState.filterStatus && s.status !== researchState.filterStatus) return false;
            if (researchState.filterType && s.submission_type !== researchState.filterType) return false;
            if (researchState.filterProgram && String(p.program || '') !== researchState.filterProgram) return false;
            if (researchState.filterIntake && String(p.intake_year || '') !== researchState.filterIntake) return false;
            return true;
        });
    }

    function researchOptions() {
        const programs = [...new Set(researchState.submissions.map(s => researchProfile(s).program).filter(Boolean).map(String))].sort();
        const intakes = [...new Set(researchState.submissions.map(s => researchProfile(s).intake_year).filter(Boolean).map(String))].sort();
        return { programs, intakes };
    }

    function researchRow(s) {
        const p = researchProfile(s);
        return `<tr>
          <td class="rs-student"><strong>${esc(p.full_name || s.student_id || 'Unknown Student')}</strong><small>${esc(p.admission_number || p.student_id || s.student_id || '—')}</small></td>
          <td class="rs-title-cell"><strong>${esc(s.title || 'Untitled Research')}</strong><small>${esc(s.supervisor_name || 'Supervisor not specified')}</small></td>
          <td>${esc(researchTypeLabel(s.submission_type))}</td>
          <td><strong>V${esc(s.version_number || 1)}</strong></td>
          <td>${esc(fmtDate(s.submitted_at || s.created_at))}</td>
          <td>${researchStatusPill(s.status)}</td>
          <td><button class="rs-btn rs-primary" type="button" data-rs-review="${esc(s.id)}"><i class="fas fa-pen-to-square"></i> Review</button></td>
        </tr>`;
    }

    function researchTable(title, id, rows, emptyText) {
        return `<div class="rs-card">
          <div class="rs-section-title"><h4>${title}</h4><span>${rows.length} submission${rows.length === 1 ? '' : 's'}</span></div>
          <div class="rs-table-wrap">
            ${rows.length ? `<table class="rs-table" id="${id}"><thead><tr><th>Student</th><th>Research Title</th><th>Type</th><th>Version</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(researchRow).join('')}</tbody></table>` : `<div class="rs-empty"><strong>${emptyText}</strong>There are no submissions matching the current filters.</div>`}
          </div>
        </div>`;
    }

    function renderResearch() {
        researchEnsureUI();
        const hub = $('online-learning-content') || $('hub-online-learning');
        const module = $('nchsmResearchModule');
        if (!module) return;

        const arr = filteredResearch();
        const active = arr.filter(s => !['approved', 'rejected'].includes(s.status));
        const completed = arr.filter(s => ['approved', 'rejected'].includes(s.status));
        const counts = {
            total: researchState.submissions.length,
            active: researchState.submissions.filter(s => !['approved','rejected'].includes(s.status)).length,
            under: researchState.submissions.filter(s => s.status === 'under_review').length,
            revision: researchState.submissions.filter(s => s.status === 'revision_required').length,
            approved: researchState.submissions.filter(s => s.status === 'approved').length,
            completed: researchState.submissions.filter(s => ['approved','rejected'].includes(s.status)).length
        };
        const {programs, intakes} = researchOptions();

        module.style.display = state.tab === 'research' ? '' : 'none';
        if (state.tab !== 'research') return;

        module.innerHTML = `<div class="rs-wrap">
          <div class="rs-head"><div><h3><i class="fas fa-flask"></i> Research Submissions</h3><p>Review, correct, return and approve student research from one workspace.</p></div>
            <button class="rs-btn rs-secondary" type="button" id="rsRefresh"><i class="fas fa-sync"></i> Refresh</button>
          </div>
          <div class="rs-stats">
            <div class="rs-stat"><strong>${counts.total}</strong><span>Total</span></div>
            <div class="rs-stat"><strong>${counts.active}</strong><span>Active</span></div>
            <div class="rs-stat"><strong>${counts.under}</strong><span>Under Review</span></div>
            <div class="rs-stat"><strong>${counts.revision}</strong><span>Revision Required</span></div>
            <div class="rs-stat"><strong>${counts.approved}</strong><span>Approved</span></div>
            <div class="rs-stat"><strong>${counts.completed}</strong><span>Completed</span></div>
          </div>
          <div class="rs-card">
            <div class="rs-toolbar">
              <input id="rsSearch" placeholder="Search student, admission no., title or supervisor..." value="${esc(researchState.search)}">
              <select id="rsType"><option value="">All Types</option><option value="proposal" ${researchState.filterType==='proposal'?'selected':''}>Research Proposal</option><option value="final_paper" ${researchState.filterType==='final_paper'?'selected':''}>Research Project / Final Paper</option><option value="correction" ${researchState.filterType==='correction'?'selected':''}>Correction / Revised Paper</option></select>
              <select id="rsStatus"><option value="">All Statuses</option><option value="submitted" ${researchState.filterStatus==='submitted'?'selected':''}>Submitted</option><option value="under_review" ${researchState.filterStatus==='under_review'?'selected':''}>Under Review</option><option value="revision_required" ${researchState.filterStatus==='revision_required'?'selected':''}>Revision Required</option><option value="approved" ${researchState.filterStatus==='approved'?'selected':''}>Approved</option><option value="rejected" ${researchState.filterStatus==='rejected'?'selected':''}>Rejected</option></select>
              <select id="rsProgram"><option value="">All Programmes</option>${programs.map(x=>`<option value="${esc(x)}" ${researchState.filterProgram===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
              <select id="rsIntake"><option value="">All Intakes</option>${intakes.map(x=>`<option value="${esc(x)}" ${researchState.filterIntake===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
              <button class="rs-btn rs-secondary" type="button" id="rsReset">Reset</button>
            </div>
          </div>
          ${researchTable('<i class="fas fa-layer-group"></i> Active Research', 'rsActiveTable', active, 'No active research submissions')}
          ${researchTable('<i class="fas fa-circle-check"></i> Completed Research', 'rsCompletedTable', completed, 'No completed research submissions')}
        </div>`;

        $('rsSearch').addEventListener('input', e => { researchState.search = e.target.value.toLowerCase().trim(); renderResearch(); });
        $('rsType').addEventListener('change', e => { researchState.filterType = e.target.value; renderResearch(); });
        $('rsStatus').addEventListener('change', e => { researchState.filterStatus = e.target.value; renderResearch(); });
        $('rsProgram').addEventListener('change', e => { researchState.filterProgram = e.target.value; renderResearch(); });
        $('rsIntake').addEventListener('change', e => { researchState.filterIntake = e.target.value; renderResearch(); });
        $('rsReset').addEventListener('click', () => { researchState.search=''; researchState.filterType=''; researchState.filterStatus=''; researchState.filterProgram=''; researchState.filterIntake=''; renderResearch(); });
        $('rsRefresh').addEventListener('click', loadResearch);
        module.querySelectorAll('[data-rs-review]').forEach(btn => btn.addEventListener('click', () => openResearchReview(btn.dataset.rsReview)));
    }

    async function loadResearch() {
        researchEnsureUI();
        const db = client();
        if (!db) return notify('Supabase client is not available for Research.', 'error');

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
            const module = $('nchsmResearchModule');
            if (module) module.innerHTML = `<div class="rs-card rs-empty"><strong>Research submissions could not load</strong>${esc(e.message || e)}</div>`;
            notify('Could not load Research submissions: ' + (e.message || e), 'error');
        }
    }

    async function researchSignedUrl(s) {
        const db = client();
        if (!s?.document_path) throw new Error('No document is attached to this submission.');
        const { data, error } = await db.storage.from('research-papers').createSignedUrl(s.document_path, 3600);
        if (error) throw error;
        return data.signedUrl;
    }

    async function openResearchReview(id) {
        researchEnsureUI();
        const s = researchState.submissions.find(x => String(x.id) === String(id));
        if (!s) return;
        researchState.current = s;
        researchState.correctionDirty = false;

        $('rsModalTitle').textContent = s.title || 'Research Submission';
        const p = researchProfile(s);
        $('rsModalMeta').textContent = `${p.full_name || s.student_id || 'Student'} • ${researchTypeLabel(s.submission_type)} • V${s.version_number || 1}`;
        $('rsStudentMeta').innerHTML = `<strong>${esc(p.full_name || 'Unknown Student')}</strong><br>
          Admission: ${esc(p.admission_number || p.student_id || s.student_id || '—')}<br>
          Programme: ${esc(p.program || '—')}<br>
          Intake: ${esc(p.intake_year || '—')}<br>
          Supervisor: ${esc(s.supervisor_name || '—')}<br>
          Submitted: ${esc(fmtDate(s.submitted_at || s.created_at))}`;
        $('rsReviewStatus').value = s.status || 'submitted';
        $('rsFeedback').value = s.feedback || '';

        await renderResearchDocument(s);
        renderResearchVersionHistory(s);

        $('rsReviewModal').style.display = 'flex';
        $('rsReviewModal').setAttribute('aria-hidden', 'false');
    }

    async function renderResearchDocument(s) {
        const area = $('rsDocumentEditor');
        if (!area) return;
        area.contentEditable = 'false';
        area.innerHTML = '<div class="rs-empty">Opening document...</div>';
        try {
            const url = await researchSignedUrl(s);
            const ext = String(s.document_name || s.document_path || '').split('.').pop().toLowerCase();

            if (ext === 'docx' || ext === 'doc') {
                const blob = await (await fetch(url)).blob();
                if (!window.mammoth) {
                    await new Promise((resolve, reject) => {
                        const sc = document.createElement('script');
                        sc.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
                        sc.onload = resolve; sc.onerror = () => reject(new Error('Could not load DOCX editor library.'));
                        document.head.appendChild(sc);
                    });
                }
                const r = await window.mammoth.convertToHtml({arrayBuffer: await blob.arrayBuffer()});
                const html = r.value || '<p>No readable text found.</p>';
                researchState.originalHtml = html;

                let draft = null;
                try { draft = localStorage.getItem('nchsm_rs_draft_' + s.id); } catch {}
                area.innerHTML = draft || html;
                researchState.draftHtml = area.innerHTML;
                updateEditorState();
            } else if (ext === 'pdf') {
                researchState.originalHtml = '';
                area.innerHTML = `<div style="height:100%;min-height:900px"><iframe title="${esc(s.document_name || 'Research PDF')}" src="${esc(url)}" style="width:100%;height:100%;min-height:900px;border:0;background:#fff"></iframe></div>`;
                $('rsEditDocument').disabled = true;
                $('rsSaveCorrection').disabled = true;
                $('rsEditorState').textContent = 'PDF view — use feedback/correction notes';
            } else {
                area.innerHTML = `<div class="rs-empty"><strong>Preview unavailable</strong>Download the original document to review it.</div>`;
            }
        } catch (e) {
            console.error('Research document preview:', e);
            area.innerHTML = `<div class="rs-empty"><strong>Document could not be opened</strong>${esc(e.message || e)}</div>`;
        }
    }

    function toggleResearchEditor() {
        const ed = $('rsDocumentEditor');
        if (!ed || !researchState.current) return;
        const editable = ed.contentEditable === 'true';
        ed.contentEditable = editable ? 'false' : 'true';
        if (!editable) {
            ed.focus();
            $('rsEditDocument').innerHTML = '<i class="fas fa-lock"></i> Finish Editing';
            $('rsEditorState').textContent = 'Editing — changes are saved as a new correction version';
        } else {
            $('rsEditDocument').innerHTML = '<i class="fas fa-pen"></i> Edit Document';
            updateEditorState();
        }
    }

    function updateEditorState() {
        const stateEl = $('rsEditorState');
        if (!stateEl) return;
        const ed = $('rsDocumentEditor');
        if (!ed) return;
        if (ed.contentEditable === 'true') stateEl.textContent = researchState.correctionDirty ? 'Editing • Unsaved correction' : 'Editing';
        else stateEl.textContent = researchState.correctionDirty ? 'Draft saved locally' : 'Read only';
    }

    function nextResearchVersion(s) {
        const key = s.research_group_id ? String(s.research_group_id) : null;
        const versions = researchState.submissions.filter(x =>
            key ? String(x.research_group_id || '') === key :
            String(x.student_id) === String(s.student_id) && String(x.title || '').trim().toLowerCase() === String(s.title || '').trim().toLowerCase()
        );
        return Math.max(1, ...versions.map(x => Number(x.version_number) || 1)) + 1;
    }

    function renderResearchVersionHistory(current) {
        const box = $('rsVersionHistory');
        if (!box) return;
        const related = researchState.submissions.filter(x => {
            if (current.research_group_id) return String(x.research_group_id || '') === String(current.research_group_id);
            return String(x.student_id) === String(current.student_id) && String(x.title || '').trim().toLowerCase() === String(current.title || '').trim().toLowerCase();
        }).sort((a,b) => (Number(a.version_number)||0) - (Number(b.version_number)||0));

        box.innerHTML = related.length ? related.map(v => `<div class="rs-history-item">
          <strong>V${esc(v.version_number || 1)} — ${esc(researchTypeLabel(v.submission_type))}</strong>
          <span>${esc(researchStatusLabel(v.status))} • ${esc(fmtDate(v.submitted_at || v.created_at))}</span>
        </div>`).join('') : '<div class="rs-empty">No version history available.</div>';
    }

    async function saveResearchCorrection() {
        const s = researchState.current;
        const db = client();
        const ed = $('rsDocumentEditor');
        if (!s || !db || !ed || !researchState.originalHtml) return notify('Only editable DOCX documents can be saved as corrected versions.', 'warning');

        await resolveUser();
        if (!state.userId) return notify('Lecturer user ID could not be resolved.', 'error');

        const html = ed.innerHTML.trim();
        if (!html) return notify('There is no corrected content to save.', 'warning');

        const next = nextResearchVersion(s);
        const base = researchSafeName(s.title || 'research');
        const filename = `${base}_Lecturer_Correction_V${next}.html`;
        const path = `${researchSafeName(s.student_id || 'student')}/corrections/${Date.now()}_${filename}`;

        const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.title || 'Research Correction')}</title><style>body{font-family:Arial,sans-serif;line-height:1.65;max-width:850px;margin:40px auto;padding:0 40px;color:#1e293b}img{max-width:100%}</style></head><body>${html}</body></html>`], {type:'text/html'});

        const upload = await db.storage.from('research-papers').upload(path, blob, {contentType:'text/html', upsert:false});
        if (upload.error) return notify('Could not save corrected document: ' + upload.error.message, 'error');

        const feedback = $('rsFeedback').value.trim() || null;
        const payload = {
            student_id: s.student_id,
            research_group_id: s.research_group_id || null,
            version_number: next,
            title: s.title,
            submission_type: 'correction',
            supervisor_name: s.supervisor_name || null,
            abstract: s.abstract || null,
            status: 'revision_required',
            document_name: filename,
            document_path: path,
            feedback: feedback || 'Lecturer corrections attached. Please revise and resubmit.',
            reviewed_by: state.userId,
            reviewed_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error } = await db.from('research_submissions').insert(payload);
        if (error) {
            try { await db.storage.from('research-papers').remove([path]); } catch {}
            return notify('Corrected file uploaded but version could not be created: ' + error.message, 'error');
        }

        try { localStorage.removeItem('nchsm_rs_draft_' + s.id); } catch {}
        researchState.correctionDirty = false;
        notify(`Correction saved as V${next}. The original document remains unchanged.`, 'success');
        await loadResearch();
        const fresh = researchState.submissions.find(x => String(x.id) !== String(s.id) && Number(x.version_number) === next && String(x.title) === String(s.title));
        if (fresh) {
            researchState.current = fresh;
            renderResearchVersionHistory(fresh);
        }
    }

    async function setResearchStatusAndSave(status) {
        $('rsReviewStatus').value = status;
        await saveResearchReview();
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
        if (error) return notify('Could not save Research review: ' + error.message, 'error');

        Object.assign(s, payload);
        notify(`Research status updated to ${researchStatusLabel(status)}.`, 'success');
        closeResearchModal();
        await loadResearch();
    }

    async function downloadCurrentResearch() {
        const s = researchState.current;
        if (!s) return;
        try {
            const url = await researchSignedUrl(s);
            const a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click();
        } catch (e) {
            notify('Could not download the research document: ' + (e.message || e), 'error');
        }
    }

    function closeResearchModal() {
        const m = $('rsReviewModal');
        if (m) {
            m.style.display = 'none';
            m.setAttribute('aria-hidden', 'true');
        }
        if (researchState.current) {
            try {
                if (researchState.correctionDirty && $('rsDocumentEditor')?.contentEditable === 'true') {
                    localStorage.setItem('nchsm_rs_draft_' + researchState.current.id, $('rsDocumentEditor').innerHTML);
                }
            } catch {}
        }
        researchState.current = null;
    }

    async function initResearch() {
        if (researchState.initialized) return;
        researchState.initialized = true;
        researchEnsureUI();
        await loadResearch();
    }

    return {init,load,renderAssignments,loadSubmissions,openAssignmentModal,editAssignment,saveAssignment,saveAndPublish,addQuestionEditor,renumberQuestions,togglePublish,deleteAssignment,reviewSubmission,gradeSubmission,closeModal,viewSubmissionDocument,closeDocumentViewer,runIntegrityScan,initResearch,loadResearch,openResearchReview,saveResearchReview,closeResearchModal};
})();
console.log('✅ Lecturer Online Learning module loaded');
