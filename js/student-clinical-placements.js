/* NCHSM Digital Campus — Clinical Placement & Rotation Balloting
 * Uses the authenticated Supabase client initialized by the main portal.
 * Expected tables: clinical_rotation_ballots, clinical_rotation_preferences,
 * clinical_placements, clinical_attendance. Missing tables are reported clearly.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { ballot: null, placements: [], attendance: [], preference: null, busy: false };
  const departments = ['Medical Ward', 'Surgical Ward', 'Maternity', 'Paediatric Ward'];

  function client() {
    return (window.db && window.db.supabase) || window.supabase || window.supabaseClient || null;
  }
  function userId() {
    return (window.db && window.db.currentUserId) || window.currentUserId || null;
  }
  function profile() {
    return (window.db && window.db.currentUserProfile) || window.currentUserProfile || {};
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function date(value) {
    if (!value) return 'Not set';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
  }
  function notify(message, type) {
    if (window.Swal && window.Swal.fire) window.Swal.fire({ icon: type || 'info', text: message });
    else window.alert(message);
  }
  function statusPill(value) {
    const s = String(value || 'pending').toLowerCase();
    const color = s === 'verified' || s === 'approved' || s === 'allocated' ? 'good' :
      s === 'rejected' || s === 'cancelled' ? 'bad' : 'pending';
    return '<span class="cp-status cp-' + color + '">' + esc(s.replace(/_/g, ' ')) + '</span>';
  }
  function renderError(message) {
    const mount = $('clinical-placement-root');
    if (mount) mount.innerHTML = '<div class="cp-notice"><i class="fas fa-circle-info"></i><div><strong>Clinical placement data is not available yet</strong><p>' + esc(message) + '</p><p>Ask the School of Nursing administrator to configure the clinical placement database and open a ballot. Your selections have not been saved.</p></div></div>';
  }
  function render() {
    const mount = $('clinical-placement-root');
    if (!mount) return;
    const hours = state.attendance.filter(a => String(a.status || '').toLowerCase() === 'verified')
      .reduce((sum, a) => sum + (Number(a.hours) || 0), 0);
    const required = state.placements.reduce((sum, p) => sum + (Number(p.required_hours) || 0), 0);
    const current = state.placements[0];
    const ballot = state.ballot;
    const now = Date.now();
    const opens = ballot && ballot.opens_at ? new Date(ballot.opens_at).getTime() : 0;
    const closes = ballot && ballot.closes_at ? new Date(ballot.closes_at).getTime() : 0;
    const open = !!ballot && (!opens || now >= opens) && (!closes || now <= closes) && !['closed','published','cancelled'].includes(String(ballot.status || '').toLowerCase());
    const oldPrefs = state.preference && Array.isArray(state.preference.preferences) ? state.preference.preferences : [];
    const prefOrder = oldPrefs.concat(departments.filter(d => !oldPrefs.includes(d)));
    const placementRows = state.placements.length ? state.placements.map(p =>
      '<tr><td>' + esc(p.facility_name || p.facility || 'To be assigned') + '</td><td>' + esc(p.department || 'Pending') + '</td><td>' + date(p.start_date) + '</td><td>' + date(p.end_date) + '</td><td>' + statusPill(p.status) + '</td></tr>'
    ).join('') : '<tr><td colspan="5" class="cp-empty">No clinical placement has been assigned yet.</td></tr>';
    const attendanceRows = state.attendance.length ? state.attendance.slice().sort((a,b) => String(b.shift_date||'').localeCompare(String(a.shift_date||''))).map(a =>
      '<tr><td>' + date(a.shift_date) + '</td><td>' + esc(a.department || current?.department || '—') + '</td><td>' + (Number(a.hours)||0) + '</td><td>' + statusPill(a.status) + '</td><td>' + esc(a.notes || '—') + '</td></tr>'
    ).join('') : '<tr><td colspan="5" class="cp-empty">No attendance entries recorded yet.</td></tr>';
    mount.innerHTML =
      '<div class="cp-stats">' +
        '<div class="cp-stat"><span>Verified clinical hours</span><strong>' + hours + '</strong><small>Instructor-verified only</small></div>' +
        '<div class="cp-stat"><span>Required hours</span><strong>' + (required || '—') + '</strong><small>Based on assigned placements</small></div>' +
        '<div class="cp-stat"><span>Current placement</span><strong class="cp-stat-small">' + esc(current ? (current.department || 'Assigned') : 'Not assigned') + '</strong><small>' + esc(current ? (current.facility_name || current.facility || 'Facility pending') : 'Awaiting allocation') + '</small></div>' +
        '<div class="cp-stat"><span>Placement records</span><strong>' + state.placements.length + '</strong><small>Recorded in your account</small></div>' +
      '</div>' +
      '<section class="cp-card"><div class="cp-card-head"><div><h2><i class="fas fa-vote-yea"></i> Final rotation department ballot</h2><p>Rank the departments you prefer. Allocation depends on available capacity and the college-approved rules.</p></div>' + statusPill(open ? 'open' : (ballot ? ballot.status || 'closed' : 'not available')) + '</div>' +
      (ballot ? '<div class="cp-ballot-meta"><span><i class="fas fa-calendar-day"></i> Opens: ' + date(ballot.opens_at) + '</span><span><i class="fas fa-calendar-check"></i> Closes: ' + date(ballot.closes_at) + '</span><span><i class="fas fa-users"></i> ' + esc(ballot.program || 'Eligible students') + '</span></div>' : '<div class="cp-notice"><i class="fas fa-info-circle"></i><div><strong>No ballot is currently available</strong><p>When the School of Nursing opens an eligible Block 5 ballot, it will appear here.</p></div></div>') +
      (ballot ? '<form id="cp-preference-form"><p class="cp-instruction">Use the arrows to arrange your preferences from first to last choice.</p><div id="cp-preference-list">' + prefOrder.map((d,i) => '<div class="cp-pref-row" data-department="' + esc(d) + '"><span class="cp-rank">' + (i+1) + '</span><span class="cp-pref-name"><i class="fas ' + (d==='Medical Ward'?'fa-heart-pulse':d==='Surgical Ward'?'fa-user-doctor':d==='Maternity'?'fa-baby':'fa-child') + '"></i> ' + esc(d) + '</span><span class="cp-pref-actions"><button type="button" data-move="-1" aria-label="Move ' + esc(d) + ' up" ' + (!open || i===0 ? 'disabled':'') + '><i class="fas fa-chevron-up"></i></button><button type="button" data-move="1" aria-label="Move ' + esc(d) + ' down" ' + (!open || i===prefOrder.length-1 ? 'disabled':'') + '><i class="fas fa-chevron-down"></i></button></span></div>').join('') + '</div><button class="cp-primary" type="submit" ' + (!open || state.busy ? 'disabled':'') + '><i class="fas fa-paper-plane"></i> ' + (state.preference ? 'Update preferences' : 'Submit preferences') + '</button><span class="cp-save-note">' + (state.preference ? 'A preference submission exists for this ballot.' : 'Your choices are not submitted until you press the button.') + '</span></form>' : '') +
      '</section>' +
      '<section class="cp-card"><div class="cp-card-head"><div><h2><i class="fas fa-hospital-user"></i> My clinical placements</h2><p>Facility, assigned department and rotation dates.</p></div></div><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>Facility</th><th>Department</th><th>Start date</th><th>End date</th><th>Status</th></tr></thead><tbody>' + placementRows + '</tbody></table></div></section>' +
      '<section class="cp-card"><div class="cp-card-head"><div><h2><i class="fas fa-clock"></i> Clinical hours & attendance</h2><p>Hours count toward progress only after instructor verification.</p></div></div><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>Date</th><th>Department</th><th>Hours</th><th>Verification</th><th>Notes</th></tr></thead><tbody>' + attendanceRows + '</tbody></table></div></section>';
    const list = $('cp-preference-list');
    if (list) {
      list.addEventListener('click', e => {
        const button = e.target.closest('button[data-move]');
        if (!button || button.disabled) return;
        const row = button.closest('.cp-pref-row');
        const rows = Array.from(list.querySelectorAll('.cp-pref-row'));
        const i = rows.indexOf(row), j = i + Number(button.dataset.move);
        if (j < 0 || j >= rows.length) return;
        if (button.dataset.move === '-1') list.insertBefore(row, rows[j]);
        else list.insertBefore(rows[j], row);
        Array.from(list.querySelectorAll('.cp-pref-row')).forEach((r, idx) => r.querySelector('.cp-rank').textContent = idx + 1);
        Array.from(list.querySelectorAll('button[data-move]')).forEach(b => {
          const ri = Array.from(list.querySelectorAll('.cp-pref-row')).indexOf(b.closest('.cp-pref-row'));
          b.disabled = !open || (b.dataset.move === '-1' ? ri === 0 : ri === rows.length - 1);
        });
      });
    }
    const form = $('cp-preference-form');
    if (form) form.addEventListener('submit', submitPreferences);
  }
  async function submitPreferences(event) {
    event.preventDefault();
    const sb = client(), id = userId();
    if (!sb || !id || !state.ballot) return notify('Your secure student session or ballot is not available. Please refresh or contact ICT support.', 'error');
    const prefs = Array.from(document.querySelectorAll('#cp-preference-list .cp-pref-row')).map(row => row.dataset.department);
    if (prefs.length !== departments.length || new Set(prefs).size !== departments.length) return notify('Please rank each available department exactly once.', 'warning');
    state.busy = true;
    const btn = document.querySelector('#cp-preference-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
    try {
      const payload = { ballot_id: state.ballot.id, student_id: id, preferences: prefs, submitted_at: new Date().toISOString() };
      const result = await sb.from('clinical_rotation_preferences').upsert(payload, { onConflict: 'ballot_id,student_id' }).select().single();
      if (result.error) throw result.error;
      state.preference = result.data;
      notify('Your department preferences have been submitted.', 'success');
      await load();
    } catch (error) {
      console.error('[Clinical placements] Preference submission failed:', error);
      notify('Could not save preferences. The database may not yet be configured for clinical balloting. No confirmation has been recorded.', 'error');
    } finally { state.busy = false; }
  }
  async function load() {
    const sb = client(), id = userId();
    if (!sb || !id) return renderError('Your authenticated student session is not ready. Please reopen this tab after the portal finishes loading.');
    try {
      const [ballots, placements, attendance] = await Promise.all([
        sb.from('clinical_rotation_ballots').select('*').in('status', ['open','scheduled']).order('created_at', { ascending:false }).limit(20),
        sb.from('clinical_placements').select('*').eq('student_id', id).order('start_date', { ascending:false }),
        sb.from('clinical_attendance').select('*').eq('student_id', id).order('shift_date', { ascending:false }).limit(200)
      ]);
      const failed = [ballots, placements, attendance].find(r => r.error);
      if (failed) throw failed.error;
      const p = profile();
      const program = String(p.program || p.course || '').toLowerCase();
      const block = String(p.block || p.current_block || '').toLowerCase();
      state.placements = placements.data || [];
      state.attendance = attendance.data || [];
      state.ballot = (ballots.data || []).find(b => {
        const bp = String(b.program || '').toLowerCase(), bb = String(b.block || '').toLowerCase();
        return (!bp || !program || bp === program) && (!bb || !block || bb === block);
      }) || null;
      state.preference = null;
      if (state.ballot) {
        const pref = await sb.from('clinical_rotation_preferences').select('*').eq('ballot_id', state.ballot.id).eq('student_id', id).maybeSingle();
        if (pref.error) throw pref.error;
        state.preference = pref.data;
      }
      render();
    } catch (error) {
      console.error('[Clinical placements] Data load failed:', error);
      renderError(error && error.message ? error.message : 'Clinical placement data could not be loaded.');
    }
  }
  function boot() {
    if (!$('clinical-placement-root')) return;
    const refresh = $('clinical-placement-refresh');
    if (refresh) refresh.addEventListener('click', load);
    document.querySelectorAll('[data-tab="clinical-placements"]').forEach(link => link.addEventListener('click', () => setTimeout(load, 50)));
    load();
    document.addEventListener('appReady', () => setTimeout(load, 300));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
  window.NCHSMClinicalPlacements = { refresh: load };
})();