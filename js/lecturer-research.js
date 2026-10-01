/* ============================================================
   NCHSM LECTURER — RESEARCH PAPERS MODULE
   Separated from lecturer-online-learning.js
   ============================================================ */
window.LecturerResearch = (() => {
    'use strict';

    const state = {
        userId: null,
        userEmail: '',
        profile: null
    };

    const $ = id => document.getElementById(id);
    const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));

    function client(){
        const candidates = [
            window.supabaseClient,
            window.supabase,
            window.db?.supabase,
            window.lecturerDB?.supabase,
            window.lecturerDB?.client
        ];
        return candidates.find(x => x && typeof x.from === 'function');
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
        state.userEmail=p.email || '';
        return state.userId;
    }

    function notify(msg, type='info'){
        if(window.showNotification) window.showNotification(msg, type);
        else if(type === 'error') console.error(msg);
        else console.log(msg);
    }

    function fmtDate(v){
        if(!v) return '—';
        const d = new Date(v);
        return isNaN(d) ? '—' : d.toLocaleString([], {
            dateStyle:'medium',
            timeStyle:'short'
        });
    }

    const researchState = {
        submissions: [],
        profiles: new Map(),
        initialized: false,
        filterStatus: '',
        search: '',
        current: null
    };

    // ============================================================
    // RESEARCH SUBMISSIONS — LECTURER REVIEW MODULE
    // Uses public.research_submissions and private research-papers bucket.
    // ============================================================
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
          .rs-head{position:relative;overflow:hidden}
          .rs-head:after{content:'';position:absolute;right:-70px;top:-80px;width:190px;height:190px;border-radius:50%;background:rgba(255,255,255,.08);pointer-events:none}
          .rs-stat{transition:.18s ease}.rs-stat:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
          .rs-toolbar input:focus,.rs-toolbar select:focus,.rs-side select:focus,.rs-side textarea:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.10)}
          .rs-btn{transition:.16s ease}.rs-btn:hover{transform:translateY(-1px);filter:brightness(.98)}
          .rs-table tbody tr:hover{background:#fafcff}
          .rs-table td:last-child{white-space:nowrap}
          .rs-empty{min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center}
        `;
        document.head.appendChild(st);
    }

    function researchEnsureUI() {
        researchEnsureStyles();

        // Research is a separate top-level dashboard module.
        const section = $('research-papers-content');
        if (!section) {
            console.warn('[Research] #research-papers-content was not found.');
            return;
        }

        let root = $('nchsmResearchModule');
        if (!root) {
            root = document.createElement('div');
            root.id = 'nchsmResearchModule';
            section.appendChild(root);
        }

        root.style.display = 'block';

        if (root.dataset.rendered === '1') return;

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
            <div id="rsLoading" class="rs-empty"><i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:8px;color:#0A3D62"></i><span>Loading research submissions…</span></div>
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

        $('rsSearch').addEventListener('input', e => {
            researchState.search = e.target.value.toLowerCase().trim();
            renderResearch();
        });
        $('rsStatus').addEventListener('change', e => {
            researchState.filterStatus = e.target.value;
            renderResearch();
        });
        $('rsRefresh').addEventListener('click', loadResearch);
        $('rsClose').addEventListener('click', closeResearchModal);
        $('rsReviewModal').addEventListener('click', e => {
            if (e.target === $('rsReviewModal')) closeResearchModal();
        });
        $('rsSaveReview').addEventListener('click', saveResearchReview);
        $('rsSendCorrection').addEventListener('click', saveLecturerCorrection);
        $('rsDownload').addEventListener('click', downloadCurrentResearch);

        setTimeout(lecturerInstallResearchEditorEnhancements, 50);
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




    return {
        init: initResearch,
        initResearch,
        loadResearch,
        renderResearch,
        openResearchReview,
        saveResearchReview,
        closeResearchModal,
        downloadCurrentResearch,
        saveLecturerCorrection
    };
})();
/* ============================================================
   RESEARCH PAPERS — SAFE AUTO BOOT
   The module remains a separate top-level dashboard section.
   ============================================================ */
(function(){
    function boot(){
        const section=document.getElementById('research-papers-content');
        if(!section || !window.LecturerResearch) return;
        if(section.dataset.rsAutoBoot==='1') return;
        section.dataset.rsAutoBoot='1';
        window.LecturerResearch.init().catch(err=>{
            console.error('[Research] initialization failed:',err);
        });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,100),{once:true});
    else setTimeout(boot,100);
})();
