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
    // RESEARCH SUBMISSIONS — LECTURER REVIEW MODULE
    // Uses public.research_submissions and private research-papers bucket.
    // ============================================================
    const researchState = {
        submissions: [], profiles: new Map(), initialized: false,
        filterStatus: '', filterType: '', filterProgram: '', filterIntake: '', search: '',
        activeTab: 'active', current: null, editorDirty: false
    };

    function researchStatusLabel(status) { return String(status || 'submitted').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
    function researchStatusClass(status) {
        const s=String(status||'').toLowerCase();
        if(s==='approved')return'approved'; if(s==='revision_required')return'revision';
        if(s==='under_review')return'review'; if(s==='rejected')return'rejected'; return'submitted';
    }
    function researchTypeLabel(type){
        const t=String(type||'').toLowerCase();
        if(t==='proposal')return'Research Proposal';
        if(t==='final_paper')return'Research Project / Final Paper';
        if(t==='correction')return'Correction / Revised Paper';
        return t.replace(/_/g,' ')||'Research';
    }
    function researchIsCompleted(s){ return ['approved','rejected'].includes(String(s.status||'').toLowerCase()); }

    function researchEnsureStyles(){
        if($('nchsmResearchStyles'))return;
        const st=document.createElement('style');st.id='nchsmResearchStyles';st.textContent=`
        #nchsmResearchModule{padding:20px;max-width:100%;box-sizing:border-box}.rs-head{background:linear-gradient(135deg,#0A3D62,#1a5a7a);color:#fff;border-radius:16px;padding:22px 24px;margin-bottom:18px;box-shadow:0 4px 20px rgba(10,61,98,.18)}.rs-head h2{margin:0;font-size:21px;display:flex;align-items:center;gap:10px}.rs-head p{margin:7px 0 0;opacity:.9;font-size:13px}.rs-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:15px}.rs-stat{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:15px;box-shadow:0 2px 8px rgba(15,23,42,.04)}.rs-stat b{display:block;font-size:24px;color:#0A3D62}.rs-stat span{font-size:11px;color:#64748b}.rs-toolbar{display:grid;grid-template-columns:minmax(220px,1.8fr) repeat(4,minmax(130px,1fr)) auto auto;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px}.rs-toolbar input,.rs-toolbar select{min-height:38px;border:1px solid #dbe3ec;border-radius:8px;padding:7px 10px;box-sizing:border-box;min-width:0}.rs-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:14px}.rs-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;border-bottom:1px solid #e2e8f0}.rs-section-head h3{margin:0;font-size:14px;color:#18304d}.rs-count{font-size:11px;background:#eef2f7;padding:5px 8px;border-radius:999px;color:#475569;font-weight:800}.rs-tabs{display:flex;gap:6px;margin:0 0 12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:6px}.rs-tab{border:0;background:transparent;border-radius:8px;padding:9px 13px;cursor:pointer;font-weight:800;font-size:11px;color:#64748b}.rs-tab.active{background:#0A3D62;color:#fff}.rs-table{width:100%;border-collapse:collapse;font-size:12px}.rs-table th{background:#f8fafc;color:#475569;text-align:left;font-size:10px;padding:11px;border-bottom:1px solid #e2e8f0;white-space:nowrap}.rs-table td{padding:11px;border-bottom:1px solid #eef2f7;vertical-align:top}.rs-table tr:hover td{background:#fafcff}.rs-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;background:#eef2f7;color:#475569;white-space:nowrap}.rs-badge.approved{background:#dcfce7;color:#166534}.rs-badge.revision{background:#fef3c7;color:#92400e}.rs-badge.review{background:#dbeafe;color:#1d4ed8}.rs-badge.rejected{background:#fee2e2;color:#991b1b}.rs-badge.submitted{background:#e0f2fe;color:#0369a1}.rs-btn{border:0;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:11px;font-weight:700}.rs-primary{background:#0A3D62;color:#fff}.rs-secondary{background:#eef2f7;color:#334155}.rs-success{background:#166534;color:#fff}.rs-warning{background:#b45309;color:#fff}.rs-danger{background:#991b1b;color:#fff}.rs-empty{padding:35px;text-align:center;color:#64748b}.rs-modal{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100020;display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}.rs-dialog{background:#fff;width:min(1380px,100%);height:min(95vh,950px);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,.35)}.rs-dialog-head{padding:13px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;align-items:center}.rs-dialog-body{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(330px,.65fr);flex:1;min-height:0}.rs-preview{background:#eef2f7;overflow:auto;padding:12px}.rs-side{border-left:1px solid #e2e8f0;padding:16px;overflow:auto}.rs-frame{width:100%;height:100%;min-height:600px;border:0;background:#fff}.rs-docx{background:#fff;max-width:850px;margin:auto;padding:40px 50px;min-height:90%;line-height:1.65;box-shadow:0 1px 7px rgba(0,0,0,.08)}.rs-side label{display:block;font-size:11px;font-weight:700;color:#475569;margin:12px 0 5px}.rs-side select,.rs-side textarea{width:100%;box-sizing:border-box;border:1px solid #dbe3ec;border-radius:8px;padding:9px}.rs-side textarea{min-height:130px;resize:vertical}.rs-meta{font-size:12px;color:#64748b;line-height:1.6}.rs-title{font-size:17px;font-weight:800;color:#18304d;margin-bottom:5px}.rs-editor-wrap{background:#fff;border:1px solid #dbe3ec;border-radius:10px;overflow:hidden}.rs-editor-tools{display:flex;gap:4px;flex-wrap:wrap;padding:8px;border-bottom:1px solid #e2e8f0;background:#f8fafc;position:sticky;top:0;z-index:2}.rs-editor-tools button{border:1px solid #dbe3ec;background:#fff;border-radius:6px;padding:6px 8px;cursor:pointer;font-size:11px}.rs-editor-tools button:hover{background:#eef2f7}.rs-editor{min-height:650px;padding:38px 48px;outline:0;line-height:1.7;font-family:Arial,sans-serif}.rs-editor:focus{box-shadow:inset 0 0 0 2px #dbeafe}.rs-editor mark{padding:0 2px}.rs-version-list{margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px}.rs-version{display:flex;justify-content:space-between;gap:8px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-top:6px;background:#f8fafc;font-size:11px}.rs-correction-note{font-size:11px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px;margin-top:10px}@media(max-width:1050px){.rs-toolbar{grid-template-columns:repeat(3,1fr)}.rs-toolbar input{grid-column:1/-1}.rs-stats{grid-template-columns:repeat(3,1fr)}}@media(max-width:800px){.rs-stats{grid-template-columns:repeat(2,1fr)}.rs-dialog-body{grid-template-columns:1fr}.rs-side{border-left:0;border-top:1px solid #e2e8f0}.rs-preview{min-height:45vh}.rs-frame{min-height:450px}.rs-docx,.rs-editor{padding:22px}.rs-toolbar{grid-template-columns:1fr 1fr}.rs-table{min-width:1050px}.rs-card{overflow-x:auto}}@media(max-width:520px){#nchsmResearchModule{padding:10px}.rs-stats{grid-template-columns:1fr 1fr}.rs-toolbar{grid-template-columns:1fr}.rs-toolbar input{grid-column:auto}}
        `;document.head.appendChild(st);
    }

    function researchEnsureUI(){
        researchEnsureStyles();const section=$('online-learning-content');if(!section)return;
        let hubTabs=section.querySelector('.ol-hub-tabs'),learningView=section.querySelector('#ol-learning-view'),root=$('nchsmResearchModule');
        if(!hubTabs){hubTabs=document.createElement('div');hubTabs.className='ol-hub-tabs';hubTabs.innerHTML=`<button type="button" class="ol-hub-tab active" data-ol-hub-view="learning"><i class="fas fa-laptop-code"></i> Online Learning</button><button type="button" class="ol-hub-tab" data-ol-hub-view="research"><i class="fas fa-file-signature"></i> Research Papers</button>`;section.insertBefore(hubTabs,section.firstChild)}
        if(!learningView){learningView=document.createElement('div');learningView.id='ol-learning-view';Array.from(section.children).filter(el=>el!==hubTabs).forEach(el=>learningView.appendChild(el));section.appendChild(learningView)}
        if(!root){root=document.createElement('div');root.id='nchsmResearchModule';root.style.display='none';section.appendChild(root)}
        hubTabs.querySelectorAll('[data-ol-hub-view]').forEach(btn=>{if(btn.dataset.bound==='1')return;btn.dataset.bound='1';btn.addEventListener('click',()=>{const view=btn.dataset.olHubView;hubTabs.querySelectorAll('[data-ol-hub-view]').forEach(x=>x.classList.toggle('active',x===btn));learningView.style.display=view==='learning'?'block':'none';root.style.display=view==='research'?'block':'none';if(view==='research')loadResearch()})});
        if(root.dataset.rendered==='1')return;root.dataset.rendered='1';root.innerHTML=`
        <div class="rs-head"><h2><i class="fas fa-file-signature"></i> Research Submissions</h2><p>Review proposals, research projects and corrected versions. Completed decisions are automatically moved to the Completed Research tab.</p></div>
        <div class="rs-stats"><div class="rs-stat"><b id="rsTotal">0</b><span>Total Versions</span></div><div class="rs-stat"><b id="rsSubmitted">0</b><span>Submitted</span></div><div class="rs-stat"><b id="rsReview">0</b><span>Under Review</span></div><div class="rs-stat"><b id="rsRevision">0</b><span>Revision Required</span></div><div class="rs-stat"><b id="rsApproved">0</b><span>Approved</span></div></div>
        <div class="rs-toolbar"><input id="rsSearch" placeholder="Search student, admission number or research title…"><select id="rsType"><option value="">All research types</option><option value="proposal">Research Proposal</option><option value="final_paper">Research Project / Final Paper</option><option value="correction">Correction / Revised Paper</option></select><select id="rsStatus"><option value="">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="revision_required">Revision Required</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><select id="rsProgram"><option value="">All programmes</option></select><select id="rsIntake"><option value="">All intakes</option></select><button class="rs-btn rs-secondary" type="button" id="rsReset">Reset</button><button class="rs-btn rs-secondary" type="button" id="rsRefresh"><i class="fas fa-sync"></i> Refresh</button></div>
        <div class="rs-tabs"><button type="button" class="rs-tab active" data-rs-tab="active"><i class="fas fa-hourglass-half"></i> Active Research <span id="rsActiveCount"></span></button><button type="button" class="rs-tab" data-rs-tab="completed"><i class="fas fa-circle-check"></i> Completed Research <span id="rsCompletedCount"></span></button></div>
        <div class="rs-card"><div class="rs-section-head"><h3 id="rsSectionTitle">Active Research</h3><span class="rs-count" id="rsSectionCount">0</span></div><div id="rsLoading" class="rs-empty">Loading research submissions…</div><div style="overflow-x:auto"><table class="rs-table" id="rsTable" style="display:none"><thead><tr><th>Student</th><th>Research Title</th><th>Type</th><th>Version</th><th>Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody id="rsBody"></tbody></table></div></div>
        <div class="rs-modal" id="rsReviewModal" aria-hidden="true"><div class="rs-dialog"><div class="rs-dialog-head"><div><div class="rs-title" id="rsModalTitle">Research Submission</div><div class="rs-meta" id="rsModalMeta"></div></div><button class="rs-btn rs-secondary" type="button" id="rsClose">Close</button></div><div class="rs-dialog-body"><div class="rs-preview" id="rsPreview"><div class="rs-empty">Select a submission.</div></div><div class="rs-side"><div id="rsStudentMeta" class="rs-meta"></div><label>Review Status</label><select id="rsReviewStatus"><option value="submitted">Submitted</option><option value="under_review">Under Review</option><option value="revision_required">Revision Required</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><label>Supervisor / Lecturer Feedback</label><textarea id="rsFeedback" placeholder="Enter feedback, required corrections, recommendations or approval comments…"></textarea><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px"><button class="rs-btn rs-success" type="button" id="rsSaveReview">Save Review</button><button class="rs-btn rs-secondary" type="button" id="rsDownload">Download Original</button><button class="rs-btn rs-warning" type="button" id="rsOpenEditor">Open Correction Editor</button></div><div id="rsFileInfo" class="rs-meta" style="margin-top:14px"></div><div id="rsVersionHistory" class="rs-version-list"></div></div></div></div></div>`;
        $('rsSearch').addEventListener('input',e=>{researchState.search=e.target.value.toLowerCase().trim();renderResearch()});$('rsType').addEventListener('change',e=>{researchState.filterType=e.target.value;renderResearch()});$('rsStatus').addEventListener('change',e=>{researchState.filterStatus=e.target.value;renderResearch()});$('rsProgram').addEventListener('change',e=>{researchState.filterProgram=e.target.value;renderResearch()});$('rsIntake').addEventListener('change',e=>{researchState.filterIntake=e.target.value;renderResearch()});$('rsReset').addEventListener('click',resetResearchFilters);$('rsRefresh').addEventListener('click',loadResearch);$('rsClose').addEventListener('click',closeResearchModal);$('rsReviewModal').addEventListener('click',e=>{if(e.target===$('rsReviewModal'))closeResearchModal()});$('rsSaveReview').addEventListener('click',saveResearchReview);$('rsDownload').addEventListener('click',downloadCurrentResearch);$('rsOpenEditor').addEventListener('click',openCorrectionEditor);root.querySelectorAll('[data-rs-tab]').forEach(b=>b.addEventListener('click',()=>{researchState.activeTab=b.dataset.rsTab;root.querySelectorAll('[data-rs-tab]').forEach(x=>x.classList.toggle('active',x===b));renderResearch()}));
    }
    function resetResearchFilters(){researchState.search='';researchState.filterType='';researchState.filterStatus='';researchState.filterProgram='';researchState.filterIntake='';$('rsSearch').value='';$('rsType').value='';$('rsStatus').value='';$('rsProgram').value='';$('rsIntake').value='';renderResearch()}
    function populateResearchFilters(){const ps=[...new Set([...researchState.profiles.values()].map(p=>p.program).filter(Boolean))].sort();const ins=[...new Set([...researchState.profiles.values()].map(p=>p.intake_year).filter(Boolean).map(String))].sort((a,b)=>b.localeCompare(a));const p=$('rsProgram'),i=$('rsIntake');if(p){const v=p.value;p.innerHTML='<option value="">All programmes</option>'+ps.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');p.value=v}if(i){const v=i.value;i.innerHTML='<option value="">All intakes</option>'+ins.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');i.value=v}}
    async function loadResearch(){researchEnsureUI();const db=client();if(!db)return notify('Supabase client is not available for Research.','error');const loading=$('rsLoading');if(loading)loading.style.display='block';try{const {data,error}=await db.from('research_submissions').select('id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_by,reviewed_at,submitted_at,created_at,updated_at').order('created_at',{ascending:false});if(error)throw error;researchState.submissions=data||[];const ids=[...new Set(researchState.submissions.map(x=>x.student_id).filter(Boolean))];researchState.profiles=new Map();if(ids.length){const r=await db.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,email,program,intake_year,current_block,block').in('user_id',ids);(r.data||[]).forEach(p=>researchState.profiles.set(p.user_id,p))}populateResearchFilters();renderResearch()}catch(e){console.error('Research load failed:',e);if(loading)loading.textContent='Research submissions could not load: '+(e.message||e);notify('Could not load Research submissions: '+(e.message||e),'error')}finally{if(loading)loading.style.display='none'}}
    function renderResearch(){researchEnsureUI();const all=researchState.submissions||[];const q=researchState.search;const filtered=all.filter(s=>{const p=researchState.profiles.get(s.student_id)||{};const hay=`${p.full_name||''} ${p.student_id||''} ${p.admission_number||''} ${p.email||''} ${s.title||''}`.toLowerCase();return(!q||hay.includes(q))&&(!researchState.filterType||s.submission_type===researchState.filterType)&&(!researchState.filterStatus||s.status===researchState.filterStatus)&&(!researchState.filterProgram||String(p.program||'')===String(researchState.filterProgram))&&(!researchState.filterIntake||String(p.intake_year||'')===String(researchState.filterIntake))});const active=filtered.filter(s=>!researchIsCompleted(s)),completed=filtered.filter(s=>researchIsCompleted(s));const rows=researchState.activeTab==='completed'?completed:active;const allActive=all.filter(s=>!researchIsCompleted(s)),allCompleted=all.filter(researchIsCompleted);$('rsTotal').textContent=all.length;$('rsSubmitted').textContent=all.filter(s=>s.status==='submitted').length;$('rsReview').textContent=all.filter(s=>s.status==='under_review').length;$('rsRevision').textContent=all.filter(s=>s.status==='revision_required').length;$('rsApproved').textContent=all.filter(s=>s.status==='approved').length;$('rsActiveCount').textContent=`(${allActive.length})`;$('rsCompletedCount').textContent=`(${allCompleted.length})`;$('rsSectionTitle').textContent=researchState.activeTab==='completed'?'Completed Research':'Active Research';$('rsSectionCount').textContent=rows.length;const table=$('rsTable'),body=$('rsBody'),loading=$('rsLoading');if(!rows.length){table.style.display='none';loading.style.display='block';loading.innerHTML='<i class="fas fa-file-circle-check" style="font-size:24px;display:block;margin-bottom:8px"></i>No research submissions match the current filters.';return}loading.style.display='none';table.style.display='table';body.innerHTML=rows.map(s=>{const p=researchState.profiles.get(s.student_id)||{};return `<tr><td><b>${esc(p.full_name||'Student')}</b><div style="font-size:10px;color:#64748b">${esc(p.admission_number||p.student_id||s.student_id||'')}</div></td><td><b>${esc(s.title||'Untitled Research')}</b><div style="font-size:10px;color:#64748b">${esc(s.document_name||'No document')}</div></td><td>${esc(researchTypeLabel(s.submission_type))}</td><td>V${esc(s.version_number||1)}</td><td>${fmtDate(s.submitted_at||s.created_at)}</td><td><span class="rs-badge ${researchStatusClass(s.status)}">${esc(researchStatusLabel(s.status))}</span></td><td><button class="rs-btn rs-primary" type="button" data-research-review="${esc(s.id)}"><i class="fas fa-eye"></i> Review</button></td></tr>`}).join('');body.querySelectorAll('[data-research-review]').forEach(btn=>btn.addEventListener('click',()=>openResearchReview(btn.dataset.researchReview)))}
    async function researchSignedUrl(s){const db=client();if(!db||!s?.document_path)throw new Error('No research document is attached.');const r=await db.storage.from('research-papers').createSignedUrl(s.document_path,3600);if(r.error)throw r.error;if(!r.data?.signedUrl)throw new Error('Could not create a secure document URL.');return r.data.signedUrl}
    async function openResearchReview(id){const s=researchState.submissions.find(x=>String(x.id)===String(id));if(!s)return notify('Research submission not found.','error');researchState.current=s;const p=researchState.profiles.get(s.student_id)||{};researchEnsureUI();$('rsModalTitle').textContent=s.title||'Research Submission';$('rsModalMeta').textContent=`${p.full_name||'Student'} · ${p.admission_number||p.student_id||''} · Version ${s.version_number||1}`;$('rsStudentMeta').innerHTML=`<b>${esc(p.full_name||'Student')}</b><br>${esc(p.admission_number||p.student_id||'')}<br>${esc(p.email||'')}<br>${esc(p.program||'')}${p.intake_year?' · Intake '+esc(p.intake_year):''}${p.current_block||p.block?' · '+esc(p.current_block||p.block):''}<hr style="border:0;border-top:1px solid #e2e8f0;margin:12px 0"><b>Research Type:</b> ${esc(researchTypeLabel(s.submission_type))}<br><b>Supervisor:</b> ${esc(s.supervisor_name||'Not specified')}<br><b>Submitted:</b> ${esc(fmtDate(s.submitted_at||s.created_at))}`;$('rsReviewStatus').value=s.status||'submitted';$('rsFeedback').value=s.feedback||'';$('rsFileInfo').innerHTML=`<b>Document:</b> ${esc(s.document_name||'Not attached')}<br><b>Current status:</b> ${esc(researchStatusLabel(s.status))}`;renderResearchVersionHistory(s.student_id,s.title);$('rsReviewModal').style.display='flex';$('rsReviewModal').setAttribute('aria-hidden','false');try{const url=await researchSignedUrl(s);$('rsDownload').onclick=()=>window.open(url,'_blank','noopener');const area=document.createElement('div');area.id='rsDocumentArea';$('rsPreview').innerHTML=s.abstract?`<div style="background:#fff;border-radius:10px;padding:18px;line-height:1.65"><b>Abstract / Description</b><div style="margin-top:8px;white-space:pre-wrap">${esc(s.abstract)}</div><div id="rsDocumentArea" style="margin-top:15px"><div class="rs-empty">Opening document…</div></div></div>`:'<div id="rsDocumentArea"><div class="rs-empty">Opening document…</div></div>';const holder=$('rsDocumentArea');const ext=String(s.document_name||s.document_path||'').toLowerCase().split('.').pop();if(ext==='pdf')holder.innerHTML=`<iframe class="rs-frame" title="${esc(s.document_name||'Research PDF')}" src="${esc(url)}"></iframe>`;else if(ext==='docx'||ext==='doc'){const blob=await(await fetch(url)).blob();await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','rsMammoth');const r=await window.mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});holder.innerHTML=`<article class="rs-docx">${r.value||'<p>No readable text found.</p>'}</article>`}else if(ext==='html')holder.innerHTML=`<iframe class="rs-frame" title="Corrected research document" src="${esc(url)}"></iframe>`;else holder.innerHTML='<div class="rs-empty">Preview is not available for this file type. Use Download Original.</div>'}catch(e){console.error('Research document preview:',e);$('rsPreview').innerHTML=`<div class="rs-empty">Document could not be opened: ${esc(e.message||e)}<br>Use Download Original if available.</div>`}}
    function renderResearchVersionHistory(studentId,title){const rows=researchState.submissions.filter(s=>s.student_id===studentId&&String(s.title||'').trim().toLowerCase()===String(title||'').trim().toLowerCase()).sort((a,b)=>Number(a.version_number||1)-Number(b.version_number||1));$('rsVersionHistory').innerHTML='<b>Version History</b>'+ (rows.length?rows.map(v=>`<div class="rs-version"><span><b>V${esc(v.version_number||1)}</b> · ${esc(researchTypeLabel(v.submission_type))}<br><span style="color:#64748b">${esc(fmtDate(v.submitted_at||v.created_at))}</span></span><span class="rs-badge ${researchStatusClass(v.status)}">${esc(researchStatusLabel(v.status))}</span></div>`).join(''):'<div class="rs-meta">No version history found.</div>')}
    async function downloadCurrentResearch(){const s=researchState.current;if(!s)return;try{const url=await researchSignedUrl(s);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click()}catch(e){notify('Could not download the research document: '+(e.message||e),'error')}}
    function buildCorrectionEditorHtml(){const s=researchState.current;if(!s)return;const area=$('rsDocumentArea');if(!area)return;const editor=document.createElement('div');editor.className='rs-editor-wrap';editor.innerHTML=`<div class="rs-editor-tools"><button type="button" data-cmd="bold"><b>B</b></button><button type="button" data-cmd="italic"><i>I</i></button><button type="button" data-cmd="underline"><u>U</u></button><button type="button" data-cmd="insertUnorderedList">• List</button><button type="button" data-cmd="insertOrderedList">1. List</button><button type="button" data-highlight="1">Highlight</button><button type="button" data-cmd="justifyLeft">Left</button><button type="button" data-cmd="justifyCenter">Center</button><button type="button" data-cmd="justifyRight">Right</button><button type="button" data-cmd="removeFormat">Clear Format</button></div><article id="rsLiveEditor" class="rs-editor" contenteditable="true"><p>Loading editable correction copy…</p></article><div style="padding:9px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;gap:7px;flex-wrap:wrap"><button class="rs-btn rs-success" id="rsSaveCorrection" type="button">Save Corrected Version</button><span class="rs-meta" id="rsEditorState">Edits are made on a new version; the student's original is preserved.</span></div>`;area.innerHTML='';area.appendChild(editor);const ed=$('rsLiveEditor');editor.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>{ed.focus();document.execCommand(b.dataset.cmd,false,null);researchState.editorDirty=true}));editor.querySelector('[data-highlight]').addEventListener('click',()=>{ed.focus();document.execCommand('hiliteColor',false,'yellow');researchState.editorDirty=true});ed.addEventListener('input',()=>{researchState.editorDirty=true;$('rsEditorState').textContent='Unsaved corrections…'});$('rsSaveCorrection').addEventListener('click',saveCorrectedVersion);loadEditableResearchHtml(s,ed)}
    async function loadEditableResearchHtml(s,ed){try{const url=await researchSignedUrl(s);const ext=String(s.document_name||s.document_path||'').toLowerCase().split('.').pop();if(ext==='docx'||ext==='doc'){const blob=await(await fetch(url)).blob();await loadScriptOnce('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js','rsMammoth');const r=await window.mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});ed.innerHTML=r.value||'<p></p>'}else if(ext==='html'){ed.innerHTML=await(await fetch(url)).text()}else{ed.innerHTML=`<p><b>Correction workspace</b></p><p>This file type cannot be converted into editable text in the browser. Add your corrections in this workspace and save a corrected HTML version.</p><p>${esc(s.abstract||'')}</p>`}researchState.editorDirty=false;$('rsEditorState').textContent='Ready for corrections. Original document will remain unchanged.'}catch(e){ed.innerHTML='<p>Could not load editable content. You can still enter corrected text here.</p>';console.error(e)}}
    async function openCorrectionEditor(){if(!researchState.current)return;const s=researchState.current;$('rsPreview').innerHTML='<div id="rsDocumentArea"></div>';buildCorrectionEditorHtml();}
    async function saveCorrectedVersion(){const s=researchState.current,db=client(),ed=$('rsLiveEditor');if(!s||!db||!ed)return;const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.title||'Corrected Research')}</title><style>body{font-family:Arial,sans-serif;line-height:1.7;max-width:850px;margin:40px auto;padding:20px}img{max-width:100%}mark{background:#ffeb3b}</style></head><body>${ed.innerHTML}</body></html>`;const nextVersion=Math.max(...researchState.submissions.filter(x=>x.student_id===s.student_id&&String(x.title||'').trim().toLowerCase()===String(s.title||'').trim().toLowerCase()).map(x=>Number(x.version_number)||1),Number(s.version_number)||1)+1;const safe=String(s.student_id||'student').replace(/[^a-zA-Z0-9_-]/g,'_');const path=`${safe}/research/${Date.now()}_v${nextVersion}_correction.html`;const up=await db.storage.from('research-papers').upload(path,new Blob([html],{type:'text/html'}),{contentType:'text/html',upsert:false});if(up.error)return notify('Could not upload corrected version: '+up.error.message,'error');const payload={student_id:s.student_id,research_group_id:s.research_group_id||null,version_number:nextVersion,title:s.title,submission_type:'correction',supervisor_name:s.supervisor_name||null,abstract:s.abstract||null,status:'submitted',document_name:`${String(s.title||'Research').replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Research'} - Corrected V${nextVersion}.html`,document_path:path,submitted_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const ins=await db.from('research_submissions').insert(payload).select().single();if(ins.error){await db.storage.from('research-papers').remove([path]);return notify('Correction uploaded but submission record failed: '+ins.error.message,'error')}notify(`Corrected Version V${nextVersion} saved and sent for review.`,'success');researchState.editorDirty=false;await loadResearch();openResearchReview(ins.data.id)}
    async function saveResearchReview(){const s=researchState.current,db=client();if(!s||!db)return;await resolveUser();if(!state.userId)return notify('Lecturer user ID could not be resolved.','error');const status=$('rsReviewStatus').value,feedback=$('rsFeedback').value.trim()||null;const payload={status,feedback,reviewed_by:state.userId,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()};const {error}=await db.from('research_submissions').update(payload).eq('id',s.id);if(error)return notify('Could not save Research review: '+error.message,'error');Object.assign(s,payload);notify('Research review saved successfully.','success');closeResearchModal();await loadResearch()}
    function closeResearchModal(){const m=$('rsReviewModal');if(m){m.style.display='none';m.setAttribute('aria-hidden','true')}researchState.current=null;researchState.editorDirty=false}
    async function initResearch(){if(researchState.initialized)return;researchState.initialized=true;researchEnsureUI();await loadResearch()}

    return {init,load,renderAssignments,loadSubmissions,openAssignmentModal,editAssignment,saveAssignment,saveAndPublish,addQuestionEditor,renumberQuestions,togglePublish,deleteAssignment,reviewSubmission,gradeSubmission,closeModal,viewSubmissionDocument,closeDocumentViewer,runIntegrityScan,initResearch,loadResearch,openResearchReview,saveResearchReview,closeResearchModal};
})();
console.log('✅ Lecturer Online Learning module loaded');
