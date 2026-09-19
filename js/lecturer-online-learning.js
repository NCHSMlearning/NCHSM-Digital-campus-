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
          .rs-dialog.rs-fullscreen{width:100vw;height:100vh;max-height:none;border-radius:0}
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
          .rs-review-toolbar button:hover{background:#edf3f9}
          .rs-review-toolbar button.active{background:#dbeafe;color:#087bf0}
          .rs-review-toolbar select{height:28px;border:1px solid #d7e0e8;border-radius:5px;background:#fff;color:#40566f;font-size:9px;padding:0 7px}
          .rs-review-status{margin-left:auto;font-size:8px;color:#71859c;white-space:nowrap}
          .rs-editor-wrap{flex:1;min-height:0;overflow:auto;padding:26px 18px 40px;background:#f1f3f4;-webkit-overflow-scrolling:touch}
          .rs-editor-page{width:min(850px,100%);min-height:1050px;margin:0 auto;padding:70px 72px;box-sizing:border-box;background:#fff;color:#202b38;outline:0;line-height:1.7;font-size:13px;box-shadow:0 1px 6px rgba(20,40,60,.16)}
          .rs-editor-page:focus{box-shadow:0 1px 6px rgba(20,40,60,.16),0 0 0 2px rgba(66,133,244,.12)}
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


    const lecturerResearchCollab = {
        channel:null,
        clientId:'lecturer-'+Math.random().toString(36).slice(2)+Date.now(),
        currentId:null,
        applyingRemote:false,
        lastBroadcast:0
    };

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

    function lecturerResearchUuid(){
        try{return crypto.randomUUID()}catch(e){return '00000000-0000-4000-8000-'+Math.random().toString(16).slice(2,14).padEnd(12,'0')}
    }

    async function lecturerLoadPersistentAnnotations(s){
        const db=client();
        if(!db||!s)return;
        try{
            const [cr,sr]=await Promise.all([
                db.from('research_document_comments').select('*').eq('research_submission_id',s.id).order('created_at',{ascending:true}),
                db.from('research_document_suggestions').select('*').eq('research_submission_id',s.id).order('created_at',{ascending:true})
            ]);
            if(!cr.error){
                const comments=(cr.data||[]).filter(x=>x.status!=='resolved').map(x=>({id:x.id,text:x.selected_text,comment:x.comment_text,start:x.start_offset,end:x.end_offset,author_name:x.author_name||'User',created_at:x.created_at}));
                lecturerSaveArray(lecturerResearchCommentsKey(s),comments);
            }
            if(!sr.error){
                const suggestions=(sr.data||[]).map(x=>({id:x.id,old_text:x.old_text,new_text:x.new_text,start:x.start_offset,end:x.end_offset,status:x.status,author_name:x.author_name||'User',created_at:x.created_at}));
                lecturerSaveArray(lecturerResearchSuggestionsKey(s),suggestions);
            }
        }catch(e){console.warn('Research collaboration data load:',e.message||e)}
    }

    async function lecturerSaveDraftCloud(s,editor){
        const db=client();
        if(!db||!s||!editor||!state.userId)return;
        try{
            const {error}=await db.from('research_document_drafts').upsert({
                research_submission_id:s.id,
                user_id:state.userId,
                content_html:editor.innerHTML,
                updated_at:new Date().toISOString()
            },{onConflict:'research_submission_id,user_id'});
            if(error)console.warn('Research draft cloud save:',error.message);
        }catch(e){console.warn('Research draft cloud save:',e.message||e)}
    }

    async function lecturerRestoreDraftCloud(s,editor,statusEl){
        const db=client();
        if(!db||!s||!editor||!state.userId)return false;
        try{
            const {data,error}=await db.from('research_document_drafts').select('content_html,updated_at').eq('research_submission_id',s.id).eq('user_id',state.userId).maybeSingle();
            if(error||!data||!data.content_html)return false;
            editor.innerHTML=data.content_html;
            if(statusEl)statusEl.textContent='Cloud draft restored · '+new Date(data.updated_at).toLocaleTimeString();
            return true;
        }catch(e){return false}
    }

    async function lecturerPersistComment(s,item){
        const db=client(); if(!db||!s||!state.userId)return;
        const {error}=await db.from('research_document_comments').upsert({
            id:item.id,research_submission_id:s.id,user_id:state.userId,author_name:item.author_name||lecturerResearchName(),
            selected_text:item.text,comment_text:item.comment,start_offset:item.start,end_offset:item.end,status:'open'
        });
        if(error)console.warn('Research comment save:',error.message);
    }

    async function lecturerPersistCommentResolve(s,id){
        const db=client(); if(!db||!s)return;
        const {error}=await db.from('research_document_comments').update({status:'resolved',updated_at:new Date().toISOString()}).eq('id',id);
        if(error)console.warn('Research comment resolve:',error.message);
    }

    async function lecturerPersistSuggestion(s,item){
        const db=client(); if(!db||!s||!state.userId)return;
        const {error}=await db.from('research_document_suggestions').upsert({
            id:item.id,research_submission_id:s.id,user_id:state.userId,author_name:item.author_name||lecturerResearchName(),
            old_text:item.old_text,new_text:item.new_text,start_offset:item.start,end_offset:item.end,status:item.status||'pending'
        });
        if(error)console.warn('Research suggestion save:',error.message);
    }

    async function lecturerPersistSuggestionStatus(s,id,status){
        const db=client(); if(!db)return;
        const {error}=await db.from('research_document_suggestions').update({status:status,updated_at:new Date().toISOString()}).eq('id',id);
        if(error)console.warn('Research suggestion status:',error.message);
    }

    function lecturerSelection(editor){
        const sel=window.getSelection();
        if(!sel||!sel.rangeCount)return null;
        const range=sel.getRangeAt(0);
        if(!editor.contains(range.commonAncestorContainer))return null;
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

    function lecturerCommentId(){return lecturerResearchUuid();}

    function lecturerSuggestionId(){return lecturerResearchUuid();}

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
        lecturerPersistComment(s,item);
        lecturerRefreshCommentMarks(editor,s);lecturerRenderComments(s,editor);
        lecturerBroadcast({type:'comment-add',comment:item});
    }

    async function lecturerResolveComment(s,id,editor){
        lecturerSaveArray(lecturerResearchCommentsKey(s),lecturerStoredArray(lecturerResearchCommentsKey(s)).filter(function(c){return String(c.id)!==String(id)}));
        lecturerRefreshCommentMarks(editor,s);lecturerRenderComments(s,editor);
        lecturerPersistCommentResolve(s,id);
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
        lecturerPersistSuggestion(s,item);
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

    async function lecturerApplySuggestion(s,id,accept,editor){
        const list=lecturerStoredArray(lecturerResearchSuggestionsKey(s));
        const item=list.find(function(x){return String(x.id)===String(id)});
        if(!item)return;
        item.status=accept?'accepted':'rejected';
        lecturerSaveArray(lecturerResearchSuggestionsKey(s),list);
        lecturerPersistSuggestionStatus(s,id,item.status);
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

        let cloudDraftTimer=null;
        editor.addEventListener('input',function(){
            if(lecturerResearchCollab.applyingRemote)return;
            clearTimeout(cloudDraftTimer);
            cloudDraftTimer=setTimeout(function(){lecturerSaveDraftCloud(s,editor)},1000);
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
        try{
            await resolveUser();
            if(!state.userId)throw new Error('Lecturer user ID could not be resolved.');
            const group=s.research_group_id||s.id;
            const rows=researchState.submissions.filter(function(x){
                return String(x.research_group_id||x.id)===String(group);
            });
            const next=rows.reduce(function(mx,x){return Math.max(mx,Number(x.version_number)||1)},Number(s.version_number)||1)+1;
            const safe=(String(s.title||'Research').replace(/[^a-zA-Z0-9 _-]/g,'').trim()||'Research');
            const filename=safe+'_Lecturer_Correction_V'+next+'.html';
            const path=state.userId+'/'+group+'/lecturer-corrections/'+Date.now()+'_'+filename;
            const wrapper='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(s.title||'Research Correction')+'</title><style>body{font-family:Arial,sans-serif;line-height:1.7;max-width:850px;margin:40px auto;padding:0 40px;color:#202b38}img{max-width:100%}</style></head><body>'+html+'</body></html>';
            const upload=await db.storage.from('research-papers').upload(path,new Blob([wrapper],{type:'text/html'}),{upsert:false,contentType:'text/html'});
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
            notify('Correction sent to the student as Version '+next+'.','success');
            await loadResearch();
            closeResearchModal();
        }catch(e){
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

        try{
            const kind=await lecturerLoadDocument(s,editor);
            await lecturerLoadPersistentAnnotations(s);
            const cloudDraft=await lecturerRestoreDraftCloud(s,editor,statusEl);
            if(statusEl && !cloudDraft)statusEl.textContent='Loaded · '+kind.toUpperCase();
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

        const fullBtn=modal.querySelector('[data-rs-fullscreen]');
        if(fullBtn)fullBtn.onclick=()=>{
            const on=dialog.classList.toggle('rs-fullscreen');
            fullBtn.innerHTML=on?'<i class="fas fa-compress"></i>':'<i class="fas fa-expand"></i>';
        };

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
        Object.assign(s, payload);
        notify('Research review saved successfully.', 'success');
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
                d.classList.remove('rs-fullscreen');
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

    return {init,load,renderAssignments,loadSubmissions,openAssignmentModal,editAssignment,saveAssignment,saveAndPublish,addQuestionEditor,renumberQuestions,togglePublish,deleteAssignment,reviewSubmission,gradeSubmission,closeModal,viewSubmissionDocument,closeDocumentViewer,runIntegrityScan,initResearch,loadResearch,openResearchReview,saveResearchReview,closeResearchModal};
})();
console.log('✅ Lecturer Online Learning module loaded');
