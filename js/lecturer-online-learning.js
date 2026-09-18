// NCHSM Lecturer Dashboard — Online Learning module
// Externalized from the lecturer dashboard; uses the existing Supabase client and RLS policies.
window.LecturerOnlineLearning = (() => {
    /*
     * ================================================================
     * NCHSM ONLINE LEARNING — AI CONFIGURATION
     * ================================================================
     *
     * SECURITY:
     * A real OpenAI key in browser JavaScript is visible to site users.
     * Production should use a Supabase Edge Function.
     *
     * For the current development version, a direct-key fallback is
     * supported as requested. Replace the placeholder only if you
     * deliberately accept the client-side exposure risk.
     */
    const AI_CONFIG = {
        provider: 'openai',
        apiKey: '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',
        model: 'gpt-5.6',
        endpoint: 'https://api.openai.com/v1/responses',
        maxChars: 120000,
        enabled: true
    };
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
    async function init(){ if(state.initialized && state.assignments.length) return load(); state.initialized=true; await resolveUser(); await load(); }
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
        for(const other of (data||[])){const otherText=Object.values(other.answers||{}).map(v=>{
            if(v==null)return '';
            if(typeof v==='object')return JSON.stringify(v);
            return String(v);
        }).join(' ');const osh=shingles(otherText,8);let hit=0;for(const x of osh)if(set.has(x))hit++;if(hit>=2)matches.push({submission_id:other.id,student_id:other.student_id,matched_phrases:hit});}
        matches.sort((a,b)=>b.matched_phrases-a.matched_phrases);return {score:sourceShingles.length?Math.min(100,Math.round(((matches[0]?.matched_phrases||0)/Math.max(1,sourceShingles.length))*10000)/100):0,matches:matches.slice(0,10),source:'institutional-submission-similarity'};
    }
    async function runDirectOpenAIIntegrityScan(s, text){
        if(!AI_CONFIG.enabled || !AI_CONFIG.apiKey ||
           AI_CONFIG.apiKey === 'PASTE_OPENAI_API_KEY_HERE'){
            return null;
        }

        const prompt = `
You are NCHSM's academic-integrity review assistant.

Review the supplied student submission for possible originality concerns.
This is an ASSISTIVE SCREENING TOOL, not a plagiarism verdict.

Rules:
- Never state that plagiarism is proven.
- Never make a disciplinary decision.
- Do not treat AI-writing probability as proof.
- Distinguish possible overlap from legitimate quotation/citation.
- Identify repeated or highly formulaic wording.
- Identify abrupt writing-style changes only as a signal.
- Do not claim access to Turnitin, private academic databases, or the
  entire public internet.
- Give evidence that a lecturer can manually verify.

Return ONLY valid JSON:
{
  "overall_signal":"low|moderate|high|insufficient_evidence",
  "summary":"neutral summary",
  "similarity_signal":{
    "level":"low|moderate|high|unknown",
    "explanation":"..."
  },
  "ai_writing_signal":{
    "level":"low|moderate|high|unknown",
    "explanation":"..."
  },
  "evidence":[
    {
      "type":"possible_overlap|repetition|citation|style_shift|formulaic|other",
      "severity":"low|medium|high",
      "excerpt":"short excerpt",
      "reason":"..."
    }
  ],
  "lecturer_actions":["..."],
  "limitations":["..."]
}

Assignment:
${s.online_assignments?.title || s.assignment_id || 'Unknown'}

Student submission:
---
${text.slice(0, AI_CONFIG.maxChars)}
---
        `.trim();

        const r = await fetch(AI_CONFIG.endpoint,{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'Authorization':'Bearer '+AI_CONFIG.apiKey
            },
            body:JSON.stringify({
                model:AI_CONFIG.model,
                input:[
                    {role:'system',content:'You are an academic-integrity screening assistant. Return only the requested JSON.'},
                    {role:'user',content:prompt}
                ],
                max_output_tokens:5000
            })
        });

        const data = await r.json();
        if(!r.ok){
            throw new Error(data?.error?.message || 'OpenAI request failed.');
        }

        let out = data?.output_text || '';
        if(!out && Array.isArray(data?.output)){
            out = data.output.flatMap(x=>x.content||[])
                .map(x=>x.text||'').filter(Boolean).join('\n');
        }

        out = String(out)
            .replace(/^```json\s*/i,'')
            .replace(/^```\s*/i,'')
            .replace(/\s*```$/i,'')
            .trim();

        if(!out) throw new Error('The AI service returned no analysis.');

        try{
            return {
                source:'openai-direct',
                model:AI_CONFIG.model,
                ...JSON.parse(out)
            };
        }catch(_){
            return {
                source:'openai-direct',
                model:AI_CONFIG.model,
                overall_signal:'insufficient_evidence',
                summary:'The AI returned an unstructured integrity response. Manual lecturer review is required.',
                similarity_signal:{level:'unknown',explanation:'Structured similarity result was not returned.'},
                ai_writing_signal:{level:'unknown',explanation:'Structured AI-writing result was not returned.'},
                evidence:[],
                lecturer_actions:['Review the complete uploaded work manually.'],
                limitations:['The AI response could not be parsed into the expected report format.']
            };
        }
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
            const text=await extractSubmissionText(s);
            integrityState.currentSubmission=s;
            integrityState.extractedText=text;

            if(!text.trim()){
                throw new Error(
                    'No extractable text was found. Image-only/scanned PDFs require OCR before AI analysis.'
                );
            }

            let report=null;
            const db=client();

            // Preferred: server-side Supabase Edge Function.
            if(db?.functions?.invoke){
                try{
                    const r=await db.functions.invoke(INTEGRITY_FUNCTION,{
                        body:{
                            submission_id:s.id,
                            assignment_id:s.assignment_id,
                            student_id:s.student_id,
                            text:text.slice(0,AI_CONFIG.maxChars),
                            file_name:s.file_name||''
                        }
                    });
                    if(!r.error && r.data) report=r.data;
                }catch(edgeError){
                    console.warn('Integrity Edge Function unavailable:',edgeError);
                }
            }

            // Temporary direct OpenAI fallback.
            if(!report && AI_CONFIG.enabled &&
               AI_CONFIG.apiKey &&
               AI_CONFIG.apiKey !== 'PASTE_OPENAI_API_KEY_HERE'){
                report=await runDirectOpenAIIntegrityScan(s,text);
            }

            // Institutional submission comparison fallback.
            if(!report){
                report=await localSimilarity(s,text);
                report.notice=
                    'AI analysis was not available. This is an institutional submission-similarity screen only.';
            }

            integrityState.report=report;
            renderIntegrityReport(report,text);
        }catch(e){
            console.error('Integrity scan:',e);
            notify('Integrity scan could not be completed: '+e.message,'error');
        }finally{
            if(btn){
                btn.disabled=false;
                btn.innerHTML='<i class="fas fa-shield-alt"></i> Run Integrity Scan';
            }
        }
    }

    function renderIntegrityReport(r,text){
        const box=$('olIntegrityReport');if(!box)return;const sim=Number(r.similarity_score??r.similarity??r.score??0);const ai=r.ai_probability??r.ai_score??null;const matches=r.matches||r.sources||[];
        box.innerHTML=`<div class="ol-integrity"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b><i class="fas fa-shield-alt"></i> Academic Integrity Agent</b><span class="ol-badge ${sim>=40?'ol-review':'ol-published'}">${esc(r.status||'REVIEW')}</span></div><div class="ol-integrity-grid" style="margin-top:10px"><div class="ol-integrity-stat"><small>Similarity</small><b>${sim}%</b></div><div class="ol-integrity-stat"><small>AI signal</small><b>${ai==null?'—':esc(ai)+'%'}</b></div><div class="ol-integrity-stat"><small>Words scanned</small><b>${text.trim().split(/\s+/).length.toLocaleString()}</b></div></div>${matches.length?`<div style="margin-top:12px"><b>Potential matches</b>${matches.slice(0,8).map(m=>`<div class="ol-integrity-match"><b>${esc(m.source_title||m.title||m.student_id||m.source||'Possible matching submission')}</b><div>${esc(m.matched_phrases??m.match_count??m.similarity??'')} ${m.matched_phrases?'matching phrase(s)':''}</div></div>`).join('')}</div>`:''}<p class="ol-integrity-note">This is an academic-integrity screening aid, not a final plagiarism finding. Similarity can occur because of quotations, references, assignment wording or legitimate shared material. AI-writing signals can also produce false positives; lecturer review and institutional policy remain necessary. ${r.source?'Scan source: '+esc(r.source)+'.':''}</p></div>`;
    }

    async function reviewSubmission(id){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;let questions=[];const qr=await db.from('online_assignment_questions').select('id,question_order,question_text,question_type,marks').eq('assignment_id',s.assignment_id).order('question_order');questions=qr.data||[];const answers=s.answers||{};const profiles=await db.from('consolidated_user_profiles_table').select('full_name,student_id,admission_number,email').eq('user_id',s.student_id).maybeSingle();const p=profiles.data||{};const body=$('olSubmissionBody');body.innerHTML=`<div class="ol-submission-grid"><div><h3 style="margin-top:0">${esc(s.online_assignments?.title||'Submission')}</h3><p style="color:#64748b">${esc(p.full_name||'Student')} · ${esc(p.admission_number||p.student_id||'')}</p><div>${questions.length?questions.map((q,i)=>`<div class="ol-q"><b>Q${i+1}. ${esc(q.question_text)}</b><div style="margin-top:8px;background:#f8fafc;padding:10px;border-radius:8px;white-space:pre-wrap">${esc(answers[q.id]??answers[String(q.id)]??'No answer')}</div><small style="color:#64748b">${q.marks} marks</small></div>`).join(''):'<div class="ol-empty">No structured questions. Review the uploaded document if provided.</div>'}</div></div><div><div class="ol-card" style="margin:0"><div style="color:#64748b;font-size:12px">CURRENT MARK</div><div class="ol-mark">${s.marks_obtained??0}/${s.max_marks??'—'}</div><label>Marks Awarded</label><input id="olReviewMarks" type="number" min="0" step="0.01" value="${s.marks_obtained??0}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px"><label style="display:block;margin-top:12px">Feedback</label><textarea id="olReviewFeedback" rows="6" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #dbe1ea;border-radius:9px">${esc(s.feedback||'')}</textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',false)">Save Grade</button><button class="ol-btn ol-success" onclick="LecturerOnlineLearning.gradeSubmission('${s.id}',true)">Grade & Release</button></div>${s.file_path?`<div style="margin-top:15px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc"><div style="font-size:12px;color:#64748b;margin-bottom:8px"><i class="fas fa-paperclip"></i> ${esc(s.file_name||'Uploaded document')}</div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="ol-btn ol-primary" onclick="LecturerOnlineLearning.viewSubmissionDocument('${s.id}')"><i class="fas fa-eye"></i> View Entire Work</button><button id="olIntegrityBtn" class="ol-btn ol-muted" onclick="LecturerOnlineLearning.runIntegrityScan('${s.id}')"><i class="fas fa-shield-alt"></i> Run Integrity Scan</button></div><div id="olIntegrityReport"></div></div>`:''}</div></div></div>`;$('olSubmissionModal').style.display='flex';}
    async function gradeSubmission(id,release){const db=client();const s=state.submissions.find(x=>x.id===id);if(!s)return;const marks=Number($('olReviewMarks').value);const feedback=$('olReviewFeedback').value.trim()||null;const {error}=await db.from('online_submissions').update({marks_obtained:marks,feedback,status:'graded',graded_by:state.userId,graded_at:new Date().toISOString(),result_released:release,released_at:release?new Date().toISOString():null,review_required:false}).eq('id',id);if(error){notify(error.message,'error');return;}notify(release?'Grade saved and result released.':'Grade saved.','success');closeModal('olSubmissionModal');await loadSubmissions();updateStats();}
    function closeModal(id){const m=$(id);if(m)m.style.display='none';}
    return {init,load,renderAssignments,loadSubmissions,openAssignmentModal,editAssignment,saveAssignment,saveAndPublish,addQuestionEditor,renumberQuestions,togglePublish,deleteAssignment,reviewSubmission,gradeSubmission,closeModal,viewSubmissionDocument,closeDocumentViewer,runIntegrityScan,getAIConfig:()=>({...AI_CONFIG,apiKey:AI_CONFIG.apiKey?'[configured]':'[not configured]')};
})();
console.log('✅ Lecturer Online Learning module loaded');
