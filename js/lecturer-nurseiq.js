/* NurseIQ question authoring for lecturer-assigned units.
 * Writes to medical_assessments (the student NurseIQ source), not exam_questions.
 * courses is read-only here and only supplies the required course_id/unit_code mapping.
 */
(function () {
  'use strict';
  const state = { sb: null, profile: null, lecturerId: null, assignments: [], units: [], questions: [], loading: false };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const notify = (message, type='info') => {
    if (typeof window.showNotification === 'function') window.showNotification(message, type);
    else if (typeof window.showToast === 'function') window.showToast(message, type);
    else alert(message);
  };
  function getClient() {
    return window.lecturerDB?.supabase || window.supabaseClient || window.supabase || window._supabase || window.sb || null;
  }
  function getProfile() {
    const profile = window.lecturerDB?.getCurrentUserProfile?.();
    if (profile) return profile;
    try { return JSON.parse(localStorage.getItem('staffSession') || 'null'); } catch (_) { return null; }
  }
  function unitLabel(unit) {
    return [unit.subject_code, unit.subject_name].filter(Boolean).join(' · ');
  }
  async function resolveAssignments() {
    const profile = state.profile;
    const authId = profile?.user_id || profile?.id;
    const fullName = String(profile?.full_name || profile?.name || '').trim();
    if (!authId && !fullName) throw new Error('Your lecturer login profile could not be identified. Please sign out and sign in again.');

    const columns = 'id, lecturer_id, lecturer_name, program, block, subject_name, subject_code, academic_year';
    let assignments = [];

    // Match the lecturer name first, as the existing Lecturer Courses module does.
    // Assignment lecturer_id is not always the same as the Supabase Auth UID.
    if (fullName) {
      const safeName = fullName.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
      const byName = await state.sb.from('lecturer_subject_assignments')
        .select(columns).ilike('lecturer_name', '%' + safeName + '%');
      if (byName.error) throw byName.error;
      assignments = byName.data || [];
      const exactName = assignments.filter(a => String(a.lecturer_name || '').trim().toLowerCase() === fullName.toLowerCase());
      if (exactName.length) assignments = exactName;
      const nonStaff = assignments.filter(a => !String(a.lecturer_id || '').toUpperCase().startsWith('STAFF'));
      if (nonStaff.length) assignments = nonStaff;
    }

    // Include UID-linked rows as a fallback/merge, without discarding name-linked assignments.
    if (authId) {
      const byId = await state.sb.from('lecturer_subject_assignments')
        .select(columns).eq('lecturer_id', String(authId));
      if (byId.error) throw byId.error;
      assignments = assignments.concat(byId.data || []);
    }
    assignments = [...new Map(assignments.map(a => [a.id, a])).values()];
    if (!assignments.length) throw new Error('No assigned units were found for this lecturer account.');

    state.assignments = assignments;
    state.lecturerId = assignments[0].lecturer_id;
  }

  async function loadUnits() {
    // Resolve missing assignment codes from the official units catalogue by
    // programme + block, then match catalogue entries to the assigned unit name.
    const groups = [...new Map(state.assignments.map(a => [
      String(a.program || '').trim() + '|' + String(a.block || '').trim(),
      { program: a.program, block: a.block }
    ])).values()];

    const catalogueResults = await Promise.all(groups.map(group => {
      let query = state.sb.from('units_catalog').select('unit_code, unit_name, program, block');
      if (group.program) query = query.ilike('program', String(group.program).trim());
      if (group.block) query = query.ilike('block', String(group.block).trim());
      return query;
    }));
    const catalogue = [];
    catalogueResults.forEach(result => {
      if (result.error) console.warn('NurseIQ units catalogue lookup:', result.error.message);
      else catalogue.push(...(result.data || []));
    });

    const normalized = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const enriched = state.assignments.map(assignment => {
      const assignedName = normalized(assignment.subject_name);
      const catalogueMatches = catalogue.filter(unit =>
        normalized(unit.program) === normalized(assignment.program) &&
        normalized(unit.block) === normalized(assignment.block) &&
        normalized(unit.unit_name) === assignedName &&
        unit.unit_code
      );
      const codes = [...new Set([
        assignment.subject_code,
        ...catalogueMatches.map(unit => unit.unit_code)
      ].map(value => String(value || '').trim()).filter(Boolean))];
      return { ...assignment, resolvedCode: codes[0] || '', candidateCodes: codes };
    });

    // Fetch only relevant course rows rather than downloading the entire courses table.
    const allCodes = [...new Set(enriched.flatMap(unit => unit.candidateCodes))];
    const courseResults = allCodes.length
      ? await Promise.all([
          state.sb.from('courses').select('id, course_name, name, unit_code, code, target_program, block').in('unit_code', allCodes),
          state.sb.from('courses').select('id, course_name, name, unit_code, code, target_program, block').in('code', allCodes)
        ])
      : [];
    const courseRows = [...new Map(courseResults.flatMap(result => {
      if (result.error) { console.warn('NurseIQ course lookup:', result.error.message); return []; }
      return result.data || [];
    }).map(course => [course.id, course])).values()];

    state.units = enriched.map(assignment => {
      const program = String(assignment.program || '').trim().toLowerCase();
      const codes = assignment.candidateCodes.map(code => code.toUpperCase());
      const assignedName = normalized(assignment.subject_name);
      const matches = courseRows.filter(course => {
        const courseCode = String(course.unit_code || course.code || '').trim().toUpperCase();
        const codeMatch = codes.includes(courseCode);
        const nameMatch = assignedName && normalized(course.course_name || course.name) === assignedName;
        if (!codeMatch && !nameMatch) return false;
        const targetProgram = String(course.target_program || '').trim().toLowerCase();
        return !targetProgram || !program || targetProgram === program;
      });
      const unique = [...new Map(matches.map(course => [course.id, course])).values()];
      const course = unique.length === 1 ? unique[0] : null;
      return {
        ...assignment,
        subject_code: assignment.resolvedCode || course?.unit_code || course?.code || assignment.subject_code || '',
        course,
        matchCount: unique.length
      };
    });
  }
  async function loadQuestions() {
    const authId = state.profile?.user_id || state.profile?.id;
    const { data, error } = await state.sb.from('medical_assessments')
      .select('id, course_id, unit_name, unit_code, question_text, question_type, difficulty, status, is_published, created_at')
      .eq('created_by', authId).order('created_at', { ascending: false });
    if (error) throw error;
    state.questions = data || [];
    renderStats();
    renderQuestionList();
  }
  function renderStats() {
    const total = state.questions.length;
    const pending = state.questions.filter(q => q.status === 'pending').length;
    const approved = state.questions.filter(q => q.status === 'approved' && q.is_published).length;
    const rejected = state.questions.filter(q => q.status === 'rejected').length;
    if ($('niqLecTotal')) $('niqLecTotal').textContent = total;
    if ($('niqLecPending')) $('niqLecPending').textContent = pending;
    if ($('niqLecApproved')) $('niqLecApproved').textContent = approved;
    if ($('niqLecRejected')) $('niqLecRejected').textContent = rejected;
  }
  function renderUnitOptions() {
    const select = $('niqLecUnit');
    if (!select) return;
    select.innerHTML = '<option value="">Choose one of your assigned units</option>' + state.units.map((unit, index) =>
      '<option value="' + index + '"' + (!unit.course ? ' disabled' : '') + '>' +
      esc(unit.subject_code || 'No code') + ' — ' + esc(unit.subject_name) + ' · ' + esc(unit.program) + ' · ' + esc(unit.block) +
      (unit.course ? '' : ' (course mapping required)') + '</option>'
    ).join('');
    const note = $('niqLecUnitNote');
    if (note) {
      const unavailable = state.units.filter(unit => !unit.course).length;
      note.textContent = unavailable ? unavailable + ' assigned unit(s) do not yet have a matching NurseIQ course mapping. Contact the administrator; this page will not create or change course records.' : 'Only units assigned to your lecturer account are available.';
    }
  }
  function renderQuestionList() {
    const container = $('niqLecQuestionList');
    if (!container) return;
    if (!state.questions.length) {
      container.innerHTML = '<div class="niq-lec-empty"><i class="far fa-folder-open"></i><strong>No NurseIQ questions submitted yet</strong><span>Your submissions for assigned units will appear here.</span></div>';
      return;
    }
    container.innerHTML = state.questions.map(question => {
      const status = question.status || 'pending';
      const published = status === 'approved' && question.is_published === true;
      const label = published ? 'Published to students' : status === 'approved' ? 'Approved · awaiting publication' : status;
      const badge = published ? 'published' : status;
      return '<article class="niq-lec-question"><div class="niq-lec-qtop"><span class="niq-lec-unit">' + esc(question.unit_code || question.unit_name || 'Assigned unit') + '</span><span class="niq-lec-status ' + esc(badge) + '">' + esc(label) + '</span></div><h4>' + esc(question.question_text) + '</h4><div class="niq-lec-qmeta"><span>' + esc(question.question_type || 'mcq').toUpperCase() + '</span><span>' + esc(question.difficulty || 'medium') + '</span><span>' + (question.created_at ? new Date(question.created_at).toLocaleDateString() : '') + '</span></div></article>';
    }).join('');
  }
  function renderError(message) {
    const status = $('niqLecMessage');
    if (status) { status.className = 'niq-lec-message error'; status.textContent = message; }
    const list = $('niqLecQuestionList');
    if (list && !state.questions.length) list.innerHTML = '<div class="niq-lec-empty"><i class="fas fa-triangle-exclamation"></i><strong>Unable to load NurseIQ</strong><span>' + esc(message) + '</span></div>';
  }
  async function init() {
    if (state.loading) return;
    state.loading = true;
    state.sb = getClient();
    state.profile = getProfile();
    try {
      if (!state.sb) throw new Error('NCHSM database connection is not available. Refresh the portal and try again.');
      await resolveAssignments();
      await loadUnits();
      renderUnitOptions();
      const message = $('niqLecMessage');
      if (message) { message.className = 'niq-lec-message success'; message.textContent = 'Assigned units loaded. Your submissions are loading…'; }
      loadQuestions().catch(error => { console.error('NurseIQ submissions load:', error); });
    } catch (error) {
      console.error('NurseIQ lecturer module:', error);
      renderError(error.message || 'Could not load NurseIQ lecturer workspace.');
    } finally { state.loading = false; }
  }
  async function submitQuestion(event) {
    event.preventDefault();
    const button = $('niqLecSubmit');
    const unitIndex = $('niqLecUnit')?.value;
    const unit = unitIndex === '' || unitIndex == null ? null : state.units[Number(unitIndex)];
    if (!unit || !unit.course) return notify('Select an assigned unit with a valid NurseIQ course mapping.', 'warning');
    const question = $('niqLecQuestionText')?.value.trim();
    const options = ['A','B','C','D'].map(letter => $('niqLecOption' + letter)?.value.trim() || '');
    const correct = $('niqLecCorrect')?.value;
    if (!question || options.some(value => !value) || !correct) return notify('Complete the question, all four options and the correct answer.', 'warning');
    const authId = state.profile?.user_id || state.profile?.id;
    const payload = {
      course_id: unit.course.id,
      unit_name: unit.subject_name,
      unit_code: unit.subject_code || unit.course.unit_code || unit.course.code || null,
      topic: $('niqLecTopic')?.value.trim() || null,
      question_text: question,
      question_type: 'mcq',
      option_a: options[0], option_b: options[1], option_c: options[2], option_d: options[3],
      correct_answer: options[['A','B','C','D'].indexOf(correct)],
      explanation: $('niqLecExplanation')?.value.trim() || '',
      marks: 1,
      difficulty: $('niqLecDifficulty')?.value || 'medium',
      curriculum: unit.program,
      is_active: true,
      is_published: false,
      status: 'pending',
      created_by: authId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (button) { button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }
    try {
      const { error } = await state.sb.from('medical_assessments').insert([payload]);
      if (error) throw error;
      $('niqLecForm')?.reset();
      const message = $('niqLecMessage');
      if (message) { message.className = 'niq-lec-message success'; message.textContent = 'Question submitted for admin review. It will appear to students after approval and publication.'; }
      await loadQuestions();
    } catch (error) {
      console.error('NurseIQ question submission failed:', error);
      notify('Question was not submitted: ' + (error.message || 'Unknown database error'), 'error');
    } finally {
      if (button) { button.disabled = false; button.innerHTML = '<i class="fas fa-paper-plane"></i> Submit for approval'; }
    }
  }
  function bind() {
    const form = $('niqLecForm');
    if (form && !form.dataset.bound) { form.addEventListener('submit', submitQuestion); form.dataset.bound = '1'; }
  }
  window.LecturerNurseIQ = { init, refresh: init };
  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-tab="nurseiq-questions"]');
    if (link) setTimeout(() => { bind(); init(); }, 120);
  });
})();
