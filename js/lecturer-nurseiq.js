/* NurseIQ question authoring for lecturer-assigned units.
 * Writes to medical_assessments (the student NurseIQ source), not exam_questions.
 * units_catalog supplies the canonical unit_catalog_id, unit name and unit code.
 */
(function () {
  'use strict';
  const state = { sb: null, profile: null, lecturerId: null, assignments: [], units: [], questions: [], bulkRows: [], loading: false, initialized: false };
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
    const lookups = [];
    if (fullName) {
      // Exact indexed match first; avoid a leading-wildcard scan on every page visit.
      lookups.push(state.sb.from('lecturer_subject_assignments').select(columns).eq('lecturer_name', fullName));
    } else lookups.push(Promise.resolve({ data: [], error: null }));
    if (authId) {
      lookups.push(state.sb.from('lecturer_subject_assignments').select(columns).eq('lecturer_id', String(authId)));
    } else lookups.push(Promise.resolve({ data: [], error: null }));

    const [byNameResult, byIdResult] = await Promise.all(lookups);
    if (byNameResult.error) throw byNameResult.error;
    if (byIdResult.error) throw byIdResult.error;

    let byName = byNameResult.data || [];
    // Legacy assignments sometimes contain inconsistent spacing/capitalization.
    // Use the slower partial match only if the exact indexed lookup found nothing.
    if (!byName.length && fullName) {
      const safeName = fullName.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
      const fallback = await state.sb.from('lecturer_subject_assignments')
        .select(columns).ilike('lecturer_name', '%' + safeName + '%');
      if (fallback.error) throw fallback.error;
      byName = fallback.data || [];
      const exactName = byName.filter(a => String(a.lecturer_name || '').trim().toLowerCase() === fullName.toLowerCase());
      if (exactName.length) byName = exactName;
      const nonStaff = byName.filter(a => !String(a.lecturer_id || '').toUpperCase().startsWith('STAFF'));
      if (nonStaff.length) byName = nonStaff;
    }

    const assignments = [...new Map([...byName, ...(byIdResult.data || [])].map(a => [a.id, a])).values()];
    if (!assignments.length) throw new Error('No assigned units were found for this lecturer account.');

    state.assignments = assignments;
    state.lecturerId = assignments[0].lecturer_id;
  }

  async function loadUnits() {
    // Fetch the active catalogue once, rather than once per programme.
    const programs = [...new Set(state.assignments.map(a => String(a.program || '').trim()).filter(Boolean))];
    if (!programs.length) {
      state.units = state.assignments.map(assignment => ({ ...assignment, catalogUnit: null, matchCount: 0 }));
      return;
    }
    const { data, error } = await state.sb.from('units_catalog')
      .select('id, unit_code, unit_name, program, block, status')
      .in('program', programs)
      .ilike('status', 'active');
    if (error) throw error;
    const catalogue = data || [];

    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    state.units = state.assignments.map(assignment => {
      const program = normalize(assignment.program);
      const assignedBlock = normalize(assignment.block);
      const assignedCode = normalize(assignment.subject_code);
      const assignedName = normalize(assignment.subject_name);
      const inProgram = catalogue.filter(unit => normalize(unit.program) === program);
      let matches = assignedCode
        ? inProgram.filter(unit => normalize(unit.unit_code) === assignedCode)
        : [];
      if (!matches.length && assignedName) {
        matches = inProgram.filter(unit => normalize(unit.unit_name) === assignedName);
      }
      if (matches.length > 1 && assignedBlock) {
        const blockMatches = matches.filter(unit => normalize(unit.block) === assignedBlock);
        if (blockMatches.length) matches = blockMatches;
      }
      const unique = [...new Map(matches.map(unit => [String(unit.id), unit])).values()];
      const catalogUnit = unique.length === 1 ? unique[0] : null;
      return {
        ...assignment,
        subject_code: catalogUnit?.unit_code || assignment.subject_code || '',
        catalogUnit,
        matchCount: unique.length
      };
    });
  }
  async function loadQuestions() {
    const authId = state.profile?.user_id || state.profile?.id;
    const { data, error } = await state.sb.from('medical_assessments')
      .select('id, unit_catalog_id, unit_name, unit_code, question_text, question_type, difficulty, status, is_published, created_at')
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
      '<option value="' + index + '"' + (!unit.catalogUnit ? ' disabled' : '') + '>' +
      esc(unit.subject_code || 'No code') + ' — ' + esc(unit.subject_name) + ' · ' + esc(unit.program) + ' · ' + esc(unit.block) +
      (unit.catalogUnit ? '' : ' (unit catalogue mapping required)') + '</option>'
    ).join('');
    const bulkSelect = $('niqLecBulkUnit');
    if (bulkSelect) bulkSelect.innerHTML = '<option value="">Choose one of your assigned units</option>' + state.units.map((unit, index) =>
      '<option value="' + index + '"' + (!unit.catalogUnit ? ' disabled' : '') + '>' +
      esc(unit.subject_code || 'No code') + ' — ' + esc(unit.subject_name) + ' · ' + esc(unit.program) + ' · ' + esc(unit.block) +
      (unit.catalogUnit ? '' : ' (unit catalogue mapping required)') + '</option>'
    ).join('');
    const note = $('niqLecUnitNote');
    if (note) {
      const unavailable = state.units.filter(unit => !unit.catalogUnit).length;
      note.textContent = unavailable ? unavailable + ' assigned unit(s) do not yet match an active unit in the official catalogue. Contact the administrator to correct the assignment or catalogue.' : 'Only units assigned to your lecturer account are available.';
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
  async function init(force = false) {
    if (state.loading || (state.initialized && !force)) return;
    state.loading = true;
    state.sb = getClient();
    state.profile = getProfile();
    try {
      if (!state.sb) throw new Error('NCHSM database connection is not available. Refresh the portal and try again.');
      await resolveAssignments();
      await loadUnits();
      renderUnitOptions();
      state.initialized = true;
      const message = $('niqLecMessage');
      if (message) { message.className = 'niq-lec-message success'; message.textContent = 'Assigned units loaded. Your submissions are loading…'; }
      loadQuestions().catch(error => { console.error('NurseIQ submissions load:', error); });
    } catch (error) {
      console.error('NurseIQ lecturer module:', error);
      state.initialized = false;
      renderError(error.message || 'Could not load NurseIQ lecturer workspace.');
    } finally { state.loading = false; }
  }
  async function submitQuestion(event) {
    event.preventDefault();
    const button = $('niqLecSubmit');
    const unitIndex = $('niqLecUnit')?.value;
    const unit = unitIndex === '' || unitIndex == null ? null : state.units[Number(unitIndex)];
    if (!unit || !unit.catalogUnit) return notify('Select an assigned unit that matches the active units catalogue.', 'warning');
    const question = $('niqLecQuestionText')?.value.trim();
    const options = ['A','B','C','D'].map(letter => $('niqLecOption' + letter)?.value.trim() || '');
    const correct = $('niqLecCorrect')?.value;
    if (!question || options.some(value => !value) || !correct) return notify('Complete the question, all four options and the correct answer.', 'warning');
    const authId = state.profile?.user_id || state.profile?.id;
    const payload = {
      unit_catalog_id: unit.catalogUnit.id,
      unit_name: unit.catalogUnit.unit_name,
      unit_code: unit.catalogUnit.unit_code,
      topic: $('niqLecTopic')?.value.trim() || null,
      question_text: question,
      question_type: 'mcq',
      option_a: options[0], option_b: options[1], option_c: options[2], option_d: options[3],
      correct_answer: options[['A','B','C','D'].indexOf(correct)],
      explanation: $('niqLecExplanation')?.value.trim() || '',
      marks: 1,
      difficulty: $('niqLecDifficulty')?.value || 'medium',
      curriculum: unit.catalogUnit.program,
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

  function normalizeHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[\\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
  function parseCSV(text) {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1];
      if (ch === '"' && quoted && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((ch === '\\n' || ch === '\\r') && !quoted) {
        if (ch === '\\r' && next === '\\n') i++;
        row.push(cell); if (row.some(v => String(v).trim())) rows.push(row);
        row = []; cell = '';
      } else cell += ch;
    }
    row.push(cell); if (row.some(v => String(v).trim())) rows.push(row);
    if (!rows.length) return [];
    const headers = rows.shift().map(normalizeHeader);
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  }
  async function readBulkFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return parseCSV(await file.text());
    if (name.endsWith('.xlsx')) {
      if (!window.ExcelJS) throw new Error('Excel reader is unavailable. Please upload a CSV file instead.');
      const workbook = new window.ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('The workbook has no worksheet.');
      const headers = [];
      sheet.getRow(1).eachCell((cell, col) => { headers[col - 1] = normalizeHeader(cell.text || cell.value); });
      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const record = {};
        headers.forEach((header, index) => { if (header) record[header] = row.getCell(index + 1).text || ''; });
        if (Object.values(record).some(value => String(value).trim())) rows.push(record);
      });
      return rows;
    }
    throw new Error('Unsupported file. Upload .csv or .xlsx.');
  }
  function validateBulkRows(rows) {
    const required = ['question_text','option_a','option_b','option_c','option_d','correct_answer'];
    return rows.map((row, index) => {
      const normalized = {};
      Object.entries(row || {}).forEach(([key, value]) => { normalized[normalizeHeader(key)] = String(value ?? '').trim(); });
      const missing = required.filter(key => !normalized[key]);
      let correct = String(normalized.correct_answer || '').toUpperCase();
      const options = ['A','B','C','D'].map(letter => normalized['option_' + letter.toLowerCase()]);
      if (!missing.includes('correct_answer') && !['A','B','C','D'].includes(correct)) {
        const match = options.findIndex(option => option.toLowerCase() === normalized.correct_answer.toLowerCase());
        if (match >= 0) correct = ['A','B','C','D'][match];
        else missing.push('correct_answer (use A/B/C/D or exact option text)');
      }
      const difficulty = (normalized.difficulty || 'medium').toLowerCase();
      if (!['easy','medium','hard'].includes(difficulty)) missing.push('difficulty (easy/medium/hard)');
      return { rowNumber: index + 2, data: normalized, correct, difficulty, errors: missing };
    });
  }
  function renderBulkPreview() {
    const preview = $('niqLecBulkPreview');
    const summary = $('niqLecBulkSummary');
    const valid = state.bulkRows.filter(row => !row.errors.length);
    const invalid = state.bulkRows.filter(row => row.errors.length);
    if (summary) summary.textContent = state.bulkRows.length
      ? valid.length + ' valid · ' + invalid.length + ' need correction'
      : 'Choose a CSV or Excel file to preview questions before submission.';
    if (preview) preview.innerHTML = state.bulkRows.length ? state.bulkRows.slice(0, 12).map(row =>
      '<div class="niq-lec-bulk-row"><div><strong>Row ' + row.rowNumber + ':</strong> ' + esc(row.data.question_text || '(question text missing)') +
      '</div><span class="' + (row.errors.length ? 'niq-lec-bulk-error' : 'niq-lec-bulk-valid') + '">' +
      (row.errors.length ? esc(row.errors.join(', ')) : 'Answer: ' + esc(row.correct)) + '</span></div>'
    ).join('') + (state.bulkRows.length > 12 ? '<small>Showing first 12 of ' + state.bulkRows.length + ' rows.</small>' : '') : '';
    const submit = $('niqLecBulkSubmit');
    if (submit) submit.disabled = !valid.length || valid.length !== state.bulkRows.length;
  }
  async function handleBulkFile() {
    const file = $('niqLecBulkFile')?.files?.[0];
    state.bulkRows = [];
    if (!file) { renderBulkPreview(); return; }
    try {
      const rows = await readBulkFile(file);
      if (!rows.length) throw new Error('No question rows found. Check that the first row contains column headings.');
      state.bulkRows = validateBulkRows(rows);
      renderBulkPreview();
    } catch (error) {
      renderBulkPreview();
      notify(error.message || 'Could not read the selected file.', 'error');
    }
  }
  function buildBulkPayload(row, unit, authId) {
    const d = row.data, options = ['a','b','c','d'].map(key => d['option_' + key]);
    return {
      unit_catalog_id: unit.catalogUnit.id,
      unit_name: unit.catalogUnit.unit_name,
      unit_code: unit.catalogUnit.unit_code,
      topic: d.topic || null,
      question_text: d.question_text,
      question_type: 'mcq',
      option_a: options[0], option_b: options[1], option_c: options[2], option_d: options[3],
      correct_answer: options[['A','B','C','D'].indexOf(row.correct)],
      explanation: d.explanation || '',
      marks: Number(d.marks) > 0 ? Number(d.marks) : 1,
      difficulty: row.difficulty,
      curriculum: unit.catalogUnit.program,
      is_active: true, is_published: false, status: 'pending',
      created_by: authId, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
  }
  async function submitBulkQuestions() {
    const unitIndex = $('niqLecBulkUnit')?.value;
    const unit = unitIndex === '' || unitIndex == null ? null : state.units[Number(unitIndex)];
    if (!unit?.catalogUnit) return notify('Choose one of your assigned units before importing.', 'warning');
    if (!state.bulkRows.length || state.bulkRows.some(row => row.errors.length)) return notify('Correct all invalid rows before submitting the import.', 'warning');
    const button = $('niqLecBulkSubmit');
    const validRows = state.bulkRows.filter(row => !row.errors.length);
    const payload = validRows.map(row => buildBulkPayload(row, unit, state.profile?.user_id || state.profile?.id));
    if (button) { button.disabled = true; button.textContent = 'Submitting ' + payload.length + ' questions…'; }
    let inserted = 0;
    try {
      while (inserted < payload.length) {
        const batch = payload.slice(inserted, inserted + 50);
        const { error } = await state.sb.from('medical_assessments').insert(batch);
        if (error) throw new Error('Imported ' + inserted + ' of ' + payload.length + ' questions. The remaining rows are retained for retry. Database message: ' + error.message);
        inserted += batch.length;
        state.bulkRows = state.bulkRows.slice(batch.length);
        renderBulkPreview();
      }
      state.bulkRows = [];
      if ($('niqLecBulkFile')) $('niqLecBulkFile').value = '';
      renderBulkPreview();
      const message = $('niqLecMessage');
      if (message) { message.className = 'niq-lec-message success'; message.textContent = inserted + ' questions submitted for administrator review. They remain unpublished until approved and published.'; }
      await loadQuestions();
      notify(inserted + ' questions submitted for admin review.', 'success');
    } catch (error) {
      console.error('NurseIQ bulk import:', error);
      notify(error.message || 'Bulk import failed.', 'error');
    } finally {
      if (button) { button.disabled = !state.bulkRows.length || state.bulkRows.some(row => row.errors.length); button.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit all for approval'; }
    }
  }
  function downloadBulkTemplate() {
    const csv = 'question_text,option_a,option_b,option_c,option_d,correct_answer,topic,explanation,difficulty,marks\\n"Which action is the priority?","Assess the patient","Document later","Call family","Wait","A","Patient assessment","Assessment identifies immediate needs","medium",1\\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'NurseIQ_Bulk_Question_Template.csv'; anchor.click();
    URL.revokeObjectURL(url);
  }

  function bind() {
    const form = $('niqLecForm');
    if (form && !form.dataset.bound) { form.addEventListener('submit', submitQuestion); form.dataset.bound = '1'; }
    const file = $('niqLecBulkFile');
    if (file && !file.dataset.bound) { file.addEventListener('change', handleBulkFile); file.dataset.bound = '1'; }
    const bulkSubmit = $('niqLecBulkSubmit');
    if (bulkSubmit && !bulkSubmit.dataset.bound) { bulkSubmit.addEventListener('click', submitBulkQuestions); bulkSubmit.dataset.bound = '1'; }
    const template = $('niqLecBulkTemplate');
    if (template && !template.dataset.bound) { template.addEventListener('click', downloadBulkTemplate); template.dataset.bound = '1'; }
  }
  window.LecturerNurseIQ = { init: () => init(false), refresh: () => init(true) };
  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-tab="nurseiq-questions"]');
    if (link) setTimeout(() => { bind(); init(); }, 120);
  });
})();
