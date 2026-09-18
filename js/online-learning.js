(function () {
  'use strict';

  const state = {
    bound: false,
    submissions: [],
    loading: false
  };

  function db() {
    return window.lecturerDB?.supabase || window.supabaseClient || window._supabase || window.supabase;
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, function (c) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c];
    });
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, {day:'2-digit', month:'short', year:'numeric'});
  }

  function uid() {
    const client = db();
    return window.NCHSMCurrentUser?.id || window.currentUser?.id || window.user?.id || null;
  }

  function message(type, text) {
    const e = document.getElementById('research-' + type);
    if (!e) return;
    e.textContent = text || '';
    e.style.display = text ? 'block' : 'none';
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase().replace(/\s+/g, '-');
    if (s.includes('approved')) return 'approved';
    if (s.includes('revision')) return 'revision';
    if (s.includes('review')) return 'review';
    if (s.includes('submitted')) return 'submitted';
    return '';
  }

  function statusLabel(status) {
    return String(status || 'Draft').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function root() { return document.getElementById('research-module-root'); }

  function renderShell() {
    const r = root();
    if (!r) return;
    r.innerHTML = `
      <div class="research-shell">
        <div class="research-head">
          <h2><i class="fas fa-file-signature"></i> Research Submission</h2>
          <p>Submit your research proposal or final research paper, track review progress and respond to revision requests.</p>
        </div>
        <div class="research-grid">
          <div class="research-stat"><strong id="research-stat-total">0</strong><span>Total Submissions</span></div>
          <div class="research-stat"><strong id="research-stat-review">0</strong><span>Under Review</span></div>
          <div class="research-stat"><strong id="research-stat-approved">0</strong><span>Approved</span></div>
        </div>
        <div id="research-error" class="research-error"></div>
        <div id="research-success" class="research-success"></div>
        <div class="research-card">
          <h3 style="margin:0 0 12px;color:#18304d;font-size:15px;">Submit Research Paper</h3>
          <form id="research-form" class="research-form">
            <div class="research-field full">
              <label for="research-title">Research Title *</label>
              <input id="research-title" maxlength="300" required placeholder="Enter the full research title">
            </div>
            <div class="research-field">
              <label for="research-type">Submission Type *</label>
              <select id="research-type" required>
                <option value="proposal">Research Proposal</option>
                <option value="final_paper">Final Research Paper</option>
                <option value="correction">Corrected / Revised Paper</option>
              </select>
            </div>
            <div class="research-field">
              <label for="research-supervisor">Supervisor</label>
              <input id="research-supervisor" maxlength="150" placeholder="Supervisor name">
            </div>
            <div class="research-field full">
              <label for="research-abstract">Abstract / Brief Description</label>
              <textarea id="research-abstract" maxlength="5000" placeholder="Briefly describe the research topic or submission..."></textarea>
            </div>
            <div class="research-field full">
              <label for="research-file">Research Document * (PDF or DOCX, max 10 MB)</label>
              <input id="research-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>
            </div>
            <div class="research-actions full">
              <button class="ol-btn ol-btn-primary" id="research-submit-btn" type="submit"><i class="fas fa-cloud-arrow-up"></i> Submit Research</button>
              <span class="research-muted">Only your authenticated student account can submit or view your research records.</span>
            </div>
          </form>
        </div>
        <div class="research-card">
          <h3 style="margin:0 0 8px;color:#18304d;font-size:15px;">My Research Submissions</h3>
          <div id="research-list"><div class="research-empty">Loading submissions...</div></div>
        </div>
      </div>`;
  }

  async function load() {
    const client = db();
    if (!client) {
      message('error', 'Secure Supabase client is not available. Please reload the portal.');
      return;
    }
    state.loading = true;
    try {
      const { data, error } = await client
        .from('research_submissions')
        .select('id,research_group_id,version_number,title,submission_type,supervisor_name,abstract,status,document_name,document_path,feedback,reviewed_at,submitted_at,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      state.submissions = Array.isArray(data) ? data : [];
      renderList();
    } catch (e) {
      console.error('Research submissions load failed:', e);
      message('error', 'Research submissions could not load: ' + (e.message || e));
      const list = document.getElementById('research-list');
      if (list) list.innerHTML = '<div class="research-empty">Research submissions are not available yet.</div>';
    } finally {
      state.loading = false;
    }
  }

  function renderList() {
    const list = document.getElementById('research-list');
    if (!list) return;
    const total = document.getElementById('research-stat-total');
    const review = document.getElementById('research-stat-review');
    const approved = document.getElementById('research-stat-approved');
    if (total) total.textContent = state.submissions.length;
    if (review) review.textContent = state.submissions.filter(x => String(x.status).toLowerCase() === 'under_review').length;
    if (approved) approved.textContent = state.submissions.filter(x => String(x.status).toLowerCase() === 'approved').length;

    if (!state.submissions.length) {
      list.innerHTML = '<div class="research-empty"><i class="fas fa-file-circle-plus" style="font-size:24px;display:block;margin-bottom:8px"></i>No research papers submitted yet.</div>';
      return;
    }

    list.innerHTML = state.submissions.map(s => `
      <div class="research-row">
        <div>
          <div class="research-title">${esc(s.title)}</div>
          <div class="research-muted">${esc(s.submission_type || 'Research')} · Version ${esc(s.version_number || 1)} · ${esc(s.document_name || 'No document')}</div>
        </div>
        <div><span class="research-status ${statusClass(s.status)}">${esc(statusLabel(s.status))}</span></div>
        <div class="research-muted">Submitted ${esc(fmtDate(s.submitted_at || s.created_at))}</div>
        <div class="research-actions" style="margin:0">
          <button class="ol-btn ol-btn-secondary" type="button" data-research-view="${esc(s.id)}"><i class="fas fa-eye"></i> View</button>
        </div>
      </div>`).join('');
  }

  async function viewSubmission(id) {
    const s = state.submissions.find(x => String(x.id) === String(id));
    if (!s) return;
    let documentUrl = '';
    if (s.document_path) {
      const { data, error } = await db().storage.from('research-papers').createSignedUrl(s.document_path, 300);
      if (!error && data?.signedUrl) documentUrl = data.signedUrl;
    }
    const modal = document.createElement('div');
    modal.className = 'ol-modal open';
    modal.setAttribute('aria-hidden', 'false');
    modal.innerHTML = `<div class="ol-dialog" style="max-width:650px">
      <div class="ol-dialog-head"><h3>${esc(s.title)}</h3><button class="ol-close" type="button"><i class="fas fa-times"></i></button></div>
      <div class="ol-dialog-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div class="research-stat"><strong style="font-size:14px">${esc(statusLabel(s.status))}</strong><span>Status</span></div>
          <div class="research-stat"><strong style="font-size:14px">Version ${esc(s.version_number || 1)}</strong><span>Submission Version</span></div>
        </div>
        <p style="font-size:11px;color:#607994"><strong>Type:</strong> ${esc(s.submission_type || '—')}<br><strong>Supervisor:</strong> ${esc(s.supervisor_name || '—')}<br><strong>Submitted:</strong> ${esc(fmtDate(s.submitted_at))}</p>
        ${s.abstract ? `<div style="padding:11px;border:1px solid #e1eaf2;border-radius:9px;font-size:11px;line-height:1.55"><strong>Abstract / Description</strong><p style="white-space:pre-wrap">${esc(s.abstract)}</p></div>` : ''}
        <div style="margin-top:12px;padding:11px;border:1px solid #e1eaf2;border-radius:9px;font-size:11px"><strong>Document</strong><br>${documentUrl ? `<a href="${esc(documentUrl)}" target="_blank" rel="noopener">${esc(s.document_name || 'Open document')}</a>` : esc(s.document_name || 'Document unavailable')}</div>
        <div style="margin-top:12px;padding:11px;border:1px solid #e1eaf2;border-radius:9px;font-size:11px"><strong>Supervisor / Lecturer Feedback</strong><p style="white-space:pre-wrap;margin-bottom:0">${esc(s.feedback || 'No feedback has been provided yet.')}</p></div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    const close = () => { modal.remove(); };
    modal.querySelector('.ol-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  async function submit(e) {
    e.preventDefault();
    message('error', ''); message('success', '');
    const client = db();
    if (!client) return message('error', 'Secure Supabase client is not available. Please reload the portal.');

    const file = document.getElementById('research-file')?.files?.[0];
    const title = document.getElementById('research-title')?.value.trim();
    const type = document.getElementById('research-type')?.value;
    const supervisor = document.getElementById('research-supervisor')?.value.trim() || null;
    const abstract = document.getElementById('research-abstract')?.value.trim() || null;
    if (!title || !type || !file) return message('error', 'Please complete the required fields and select your research document.');
    if (file.size > 10 * 1024 * 1024) return message('error', 'The research document is larger than 10 MB.');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf','docx'].includes(ext)) return message('error', 'Only PDF and DOCX research documents are accepted.');

    const userId = uid();
    if (!userId) {
      const { data } = await client.auth.getUser();
      if (!data?.user?.id) return message('error', 'Your student session could not be verified. Please sign in again.');
    }
    const { data: authData } = await client.auth.getUser();
    const studentId = authData?.user?.id || userId;
    if (!studentId) return message('error', 'Your student session could not be verified.');

    const btn = document.getElementById('research-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'; }

    try {
      const previous = state.submissions.find(x => x.title.trim().toLowerCase() === title.toLowerCase());
      const groupId = previous?.research_group_id || crypto.randomUUID();
      const version = previous ? Math.max(...state.submissions.filter(x => x.research_group_id === groupId).map(x => Number(x.version_number) || 1), 0) + 1 : 1;
      const path = `${studentId}/${groupId}/v${version}-${Date.now()}.${ext}`;

      const upload = await client.storage.from('research-papers').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined
      });
      if (upload.error) throw upload.error;

      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      const insert = await client.from('research_submissions').insert({
        student_id: studentId,
        research_group_id: groupId,
        version_number: version,
        title,
        submission_type: type,
        supervisor_name: supervisor,
        abstract,
        status: 'submitted',
        document_name: file.name,
        document_path: path,
        submitted_at: new Date().toISOString()
      });
      if (insert.error) {
        await client.storage.from('research-papers').remove([path]);
        throw insert.error;
      }

      message('success', 'Research paper submitted successfully. Your submission is now awaiting review.');
      document.getElementById('research-form')?.reset();
      await load();
    } catch (err) {
      console.error('Research submission failed:', err);
      message('error', 'Research submission failed: ' + (err.message || err));
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Submit Research'; }
    }
  }

  function bind() {
    if (state.bound) return;
    const r = root();
    if (!r) return;
    state.bound = true;
    document.getElementById('research-form')?.addEventListener('submit', submit);
    r.addEventListener('click', e => {
      const b = e.target.closest('[data-research-view]');
      if (b) viewSubmission(b.dataset.researchView);
    });
  }

  function init() {
    renderShell();
    bind();
    load();
  }

  window.NCHSMResearch = { init, load };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
  document.addEventListener('appReady', () => setTimeout(init, 300));
})();
