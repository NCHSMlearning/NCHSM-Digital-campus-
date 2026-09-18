/* NCHSM Online Learning - student assignments + case studies */
(function () {
  'use strict';

  const state = {
    feed: { assignments: [], submissions: [] },
    current: null,
    studentProfile: null
  };

  function db() {
    return window.db?.supabase || window.supabase || window.sb || null;
  }

  function userId() {
    return window.db?.currentUserId || window.currentUserProfile?.user_id || null;
  }

  const esc = (value) => {
    if (window.escapeHtml) return window.escapeHtml(String(value ?? ''));
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  };

  const fmtDate = (v) => {
    if (!v) return 'No deadline';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return 'No deadline';
    return d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
  };

  function showState(message, error = false) {
    const el = document.getElementById('ol-error');
    if (!el) return;
    el.hidden = !message;
    el.innerHTML = message ? `<i class="fas ${error ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i> ${esc(message)}` : '';
  }

  function setLoading(show) {
    const el = document.getElementById('ol-loading');
    if (el) el.hidden = !show;
  }

  function submissionsFor(id) {
    return (state.feed.submissions || []).filter(s => s.assignment_id === id);
  }

  function renderCards(items, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div class="nchsm-ol-empty"><i class="fas fa-inbox"></i><br>No work is currently available in this section.</div>`;
      return;
    }
    el.innerHTML = items.map(a => {
      const type = a.assessment_type === 'case_study' ? 'case' : '';
      const submitted = submissionsFor(a.id).length > 0;
      return `<article class="nchsm-ol-card">
        <div class="nchsm-ol-card-top"><span class="nchsm-ol-type ${type}">${a.assessment_type === 'case_study' ? 'Case Study' : 'Assignment'}</span>${submitted ? '<span class="nchsm-ol-status">Submitted</span>' : ''}</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.description || a.instructions || 'Complete the work and submit your answers online.')}</p>
        <div class="nchsm-ol-meta"><span><i class="fas fa-book"></i> ${esc(a.unit_code || a.unit_name || 'General')}</span><span><i class="fas fa-star"></i> ${esc(a.total_marks)} marks</span><span><i class="fas fa-clock"></i> ${esc(fmtDate(a.due_at))}</span></div>
        <button type="button" data-ol-start="${esc(a.id)}"><i class="fas fa-play"></i> ${submitted ? 'Open / Attempt Again' : 'Start Work'}</button>
      </article>`;
    }).join('');
  }

  function renderSubmissions() {
    const el = document.getElementById('ol-submission-list');
    const rows = state.feed.submissions || [];
    if (!rows.length) {
      el.innerHTML = '<div class="nchsm-ol-empty"><i class="fas fa-paper-plane"></i><br>You have not submitted any online learning work yet.</div>';
      return;
    }
    el.innerHTML = rows.map(s => {
      const a = state.feed.assignments.find(x => x.id === s.assignment_id);
      return `<div class="nchsm-ol-list-item"><div><strong>${esc(a?.title || 'Online Learning Assessment')}</strong><small>Attempt ${esc(s.attempt_number)} · ${esc(fmtDate(s.submitted_at))}</small><span class="nchsm-ol-status ${s.status === 'pending_review' ? 'review' : ''}">${esc(String(s.status || '').replace('_',' '))}</span></div><div class="nchsm-ol-score">${s.percentage == null ? '—' : esc(s.percentage) + '%'}<small>${s.score == null ? 'Pending' : esc(s.score) + '/' + esc(s.total_marks)}</small></div></div>`;
    }).join('');
  }

  function renderResults() {
    const el = document.getElementById('ol-results-list');
    const rows = (state.feed.submissions || []).filter(s => s.score != null);
    if (!rows.length) {
      el.innerHTML = '<div class="nchsm-ol-empty"><i class="fas fa-chart-line"></i><br>No released results yet.</div>';
      return;
    }
    el.innerHTML = rows.map(s => {
      const a = state.feed.assignments.find(x => x.id === s.assignment_id);
      const passed = Number(s.percentage || 0) >= Number(a?.pass_mark || 50);
      return `<div class="nchsm-ol-list-item"><div><strong>${esc(a?.title || 'Assessment')}</strong><small>${esc(a?.unit_code || a?.unit_name || 'Online Learning')} · Attempt ${esc(s.attempt_number)}</small><div class="nchsm-ol-result-detail"><b>${passed ? 'Passed' : 'Below pass mark'}</b> · ${esc(s.feedback || '')}</div></div><div class="nchsm-ol-score">${esc(s.percentage)}%<small>${esc(s.score)}/${esc(s.total_marks)}</small></div></div>`;
    }).join('');
  }

  function renderAll() {
    const assignments = state.feed.assignments || [];
    renderCards(assignments.filter(a => a.assessment_type !== 'case_study'), 'ol-assignment-list');
    renderCards(assignments.filter(a => a.assessment_type === 'case_study'), 'ol-case-list');
    renderSubmissions();
    renderResults();
    const pending = assignments.filter(a => !submissionsFor(a.id).length).length;
    const count = document.getElementById('ol-pending-count');
    if (count) count.textContent = pending;
  }

  function normalizeTarget(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function targetMatchesStudent(a, profile) {
    if (!a || !profile) return false;

    const studentProgram = normalizeTarget(
      profile.program || profile.program_type || profile.department
    );
    const studentIntake = normalizeTarget(
      profile.intake_year || profile.admission_year
    );
    const studentBlock = normalizeTarget(
      profile.block || profile.current_block
    );

    const assignmentProgram = normalizeTarget(
      a.program || a.target_program
    );
    const assignmentIntake = normalizeTarget(
      a.intake || a.intake_year
    );
    const assignmentBlock = normalizeTarget(
      a.block || a.current_block || a.block_term
    );

    // Program and intake are mandatory targeting fields.
    if (!assignmentProgram || !assignmentIntake) return false;
    if (assignmentProgram !== studentProgram) return false;
    if (assignmentIntake !== studentIntake) return false;

    // A null/blank block means the assignment targets the whole
    // program + intake. Otherwise the student's block must match.
    if (!assignmentBlock) return true;

    return assignmentBlock === studentBlock;
  }

  async function loadStudentProfile(client) {
    const uid = userId();
    if (!uid || !client) return null;

    try {
      const { data, error } = await client
        .from('consolidated_user_profiles_table')
        .select('user_id, program, program_type, department, intake_year, admission_year, block, current_block, role, status')
        .eq('user_id', uid)
        .eq('role', 'student')
        .maybeSingle();

      if (error) {
        console.warn('Online Learning profile lookup failed:', error);
        return null;
      }

      return data || null;
    } catch (e) {
      console.warn('Online Learning profile lookup failed:', e);
      return null;
    }
  }

  async function load() {
    setLoading(true); showState('');
    try {
      if (!userId()) throw new Error('Please sign in again before opening Online Learning.');
      const client = db();
      if (!client?.rpc) throw new Error('Database connection is not ready.');
      state.studentProfile = await loadStudentProfile(client);

      const { data, error } = await client.rpc('get_student_online_learning');
      if (error) throw error;

      const feed = data || { assignments: [], submissions: [] };

      // The RPC remains the primary/secure source. This additional
      // client-side check guarantees that assignments displayed in the
      // student UI match the student's actual program, intake and block.
      // If the profile cannot be loaded, do not guess a target.
      if (state.studentProfile) {
        feed.assignments = (feed.assignments || []).filter(a =>
          targetMatchesStudent(a, state.studentProfile)
        );
      } else {
        feed.assignments = [];
        feed.submissions = [];
      }

      // Keep submissions only for assignments that this student can see.
      const visibleIds = new Set((feed.assignments || []).map(a => String(a.id)));
      feed.submissions = (feed.submissions || []).filter(s =>
        visibleIds.has(String(s.assignment_id))
      );

      state.feed = feed;
      renderAll();
    } catch (err) {
      console.error('Online Learning load failed:', err);
      showState(err?.message || 'Unable to load Online Learning.', true);
    } finally {
      setLoading(false);
    }
  }

  function openAssessment(id) {
    const a = state.feed.assignments.find(x => String(x.id) === String(id));
    if (!a) return;
    state.current = a;
    document.getElementById('ol-modal-type').textContent = a.assessment_type === 'case_study' ? 'Clinical Case Study' : 'Assignment';
    document.getElementById('ol-modal-title').textContent = a.title || 'Assessment';
    document.getElementById('ol-modal-meta').textContent = `${a.unit_code || a.unit_name || 'General'} · ${a.total_marks || 0} marks · Due ${fmtDate(a.due_at)}`;
    document.getElementById('ol-modal-instructions').innerHTML = `<strong>Instructions:</strong> ${esc(a.instructions || a.description || 'Answer all required questions.')}`;
    const qEl = document.getElementById('ol-question-list');
    qEl.innerHTML = (a.questions || []).map(q => {
      const name = `olq_${q.id}`;
      let input = '';
      if (q.question_type === 'mcq') {
        const opts = Array.isArray(q.options) ? q.options : [];
        input = opts.map((o, i) => {
          const value = typeof o === 'string' ? o : (o.value ?? o.label ?? '');
          const label = typeof o === 'string' ? String.fromCharCode(65+i) : (o.label ?? String.fromCharCode(65+i));
          return `<label class="nchsm-ol-option"><input type="radio" name="${name}" value="${esc(value)}"> <span><b>${esc(label)}.</b> ${esc(value)}</span></label>`;
        }).join('');
      } else if (q.question_type === 'true_false') {
        input = ['True','False'].map(v => `<label class="nchsm-ol-option"><input type="radio" name="${name}" value="${v}"> ${v}</label>`).join('');
      } else {
        input = `<textarea class="nchsm-ol-answer" name="${name}" rows="5" maxlength="10000" placeholder="Enter your answer..."></textarea>`;
      }
      return `<div class="nchsm-ol-question"><h4>${esc(q.question_number)}. ${esc(q.question_text)} <span style="color:#66809e;font-weight:600">(${esc(q.marks)} marks)</span></h4>${input}</div>`;
    }).join('') || '<div class="nchsm-ol-empty">No questions have been published for this assessment yet.</div>';
    document.getElementById('ol-submission-text').value = '';
    const panel = document.getElementById('ol-assessment-panel');
    panel.hidden = false; panel.setAttribute('aria-hidden','false');
  }

  function closeAssessment() {
    const panel = document.getElementById('ol-assessment-panel');
    if (panel) { panel.hidden = true; panel.setAttribute('aria-hidden','true'); }
    state.current = null;
  }

  async function submit(event) {
    event.preventDefault();
    const a = state.current;
    if (!a) return;
    const answers = {};
    (a.questions || []).forEach(q => {
      const field = document.querySelector(`[name="olq_${CSS.escape(String(q.id))}"]`);
      if (!field) return;
      if (field.type === 'radio') {
        const checked = document.querySelector(`input[name="olq_${CSS.escape(String(q.id))}"]:checked`);
        answers[q.id] = checked ? checked.value : '';
      } else answers[q.id] = field.value || '';
    });
    const btn = document.getElementById('ol-submit-btn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';
    try {
      const client = db();
      const { data, error } = await client.rpc('submit_student_online_learning', {
        p_assignment_id: a.id,
        p_answers: answers,
        p_submission_text: document.getElementById('ol-submission-text').value || null,
        p_attachment_name: null
      });
      if (error) throw error;
      closeAssessment();
      await load();
      switchView('results');
      if (typeof window.Swal !== 'undefined') {
        await Swal.fire({ icon: data?.auto_graded ? (data?.passed ? 'success' : 'info') : 'info', title: data?.auto_graded ? 'Submitted & Marked' : 'Submitted for Review', text: data?.auto_graded ? `Score: ${data.score}/${data.total_marks} (${data.percentage}%)` : 'Structured questions were marked automatically; open-ended work is awaiting lecturer review.', confirmButtonColor:'#0875dc' });
      } else if (window.AppUtils?.showToast) {
        window.AppUtils.showToast(data?.auto_graded ? `Submitted. Score: ${data.percentage}%` : 'Submitted for lecturer review.', 'success');
      }
    } catch (err) {
      console.error('Online Learning submission failed:', err);
      alert(err?.message || 'Submission failed. Please try again.');
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Work';
    }
  }

  function switchView(view) {
    document.querySelectorAll('[data-ol-view]').forEach(b => b.classList.toggle('active', b.dataset.olView === view));
    document.querySelectorAll('.nchsm-ol-view').forEach(v => { v.hidden = v.id !== `ol-view-${view}`; });
  }

  function bind() {
    document.addEventListener('click', e => {
      const start = e.target.closest('[data-ol-start]');
      if (start) openAssessment(start.dataset.olStart);
      const view = e.target.closest('[data-ol-view]');
      if (view) switchView(view.dataset.olView);
      if (e.target.closest('[data-ol-close]')) closeAssessment();
      if (e.target.closest('#ol-refresh-btn')) load();
    });
    document.getElementById('ol-assessment-form')?.addEventListener('submit', submit);
  }

  function init() {
    bind();
    document.addEventListener('appReady', () => { if (document.getElementById('hub-online-learning')) load(); });
    window.onlineLearningModule = { load, openAssessment, closeAssessment, switchView };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
