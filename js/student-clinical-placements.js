/* NCHSM Digital Campus — Clinical Placement & Rotation Balloting
 * Uses the authenticated Supabase client initialized by the main portal.
 * Expected tables: clinical_rotation_ballots, clinical_rotation_preferences,
 * clinical_placements, clinical_attendance. Missing tables are reported clearly.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { ballot: null, placements: [], attendance: [], preference: null, busy: false, wheelOrder: [], spinsUsed: 0 };
  const departments = ['Medical Ward', 'Surgical Ward', 'Maternity', 'Paediatric Ward'];

  function client() {
    return (window.db && window.db.supabase) || window.sb || window.supabase || window.supabaseClient || null;
  }
  function userId() {
    return (window.db && (window.db.currentUserId || window.db.currentUser?.id)) || window.currentUserId || window.currentUser?.id || null;
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
    const ballotStatus = String(ballot?.status || '').toLowerCase();
    const open = !!ballot && ['open','scheduled'].includes(ballotStatus) && (!opens || now >= opens) && (!closes || now <= closes);
    const oldPrefs = state.preference && Array.isArray(state.preference.preferences) ? state.preference.preferences : [];
    const prefOrder = oldPrefs.concat(departments.filter(d => !oldPrefs.includes(d)));
    const placementRows = state.placements.length ? state.placements.map(p =>
      '<tr><td>' + esc(p.facility_name || p.facility || 'To be assigned') + '</td><td>' + esc(p.department || 'Pending') + '</td><td>' + date(p.start_date) + '</td><td>' + date(p.end_date) + '</td><td>' + statusPill(p.status) + '</td></tr>'
    ).join('') : '<tr><td colspan="5" class="cp-empty">No clinical placement has been assigned yet.</td></tr>';
    const attendanceRows = state.attendance.length ? state.attendance.slice().sort((a,b) => String(b.shift_date||'').localeCompare(String(a.shift_date||''))).map(a =>
      '<tr><td>' + date(a.shift_date) + '</td><td>' + esc(a.department || current?.department || '—') + '</td><td>' + (Number(a.hours)||0) + '</td><td>' + statusPill(a.status) + '</td><td>' + esc(a.notes || '—') + '</td></tr>'
    ).join('') : '<tr><td colspan="5" class="cp-empty">No attendance entries recorded yet.</td></tr>';
    ensureWheelStyles();
    mount.innerHTML =
      '<div class="cp-stats">' +
        '<div class="cp-stat"><span>Verified clinical hours</span><strong>' + hours + '</strong><small>Instructor-verified only</small></div>' +
        '<div class="cp-stat"><span>Required hours</span><strong>' + (required || '—') + '</strong><small>Based on assigned placements</small></div>' +
        '<div class="cp-stat"><span>Current placement</span><strong class="cp-stat-small">' + esc(current ? (current.department || 'Assigned') : 'Not assigned') + '</strong><small>' + esc(current ? (current.facility_name || current.facility || 'Facility pending') : 'Awaiting allocation') + '</small></div>' +
        '<div class="cp-stat"><span>Placement records</span><strong>' + state.placements.length + '</strong><small>Recorded in your account</small></div>' +
      '</div>' +
      '<section class="cp-card"><div class="cp-card-head"><div><h2><i class="fas fa-vote-yea"></i> Final rotation department ballot</h2><p>Rank the departments you prefer. Allocation depends on available capacity and the college-approved rules.</p></div>' + statusPill(open ? 'open' : (ballot ? ballot.status || 'closed' : 'not available')) + '</div>' +
      (ballot ? '<div class="cp-ballot-meta"><span><i class="fas fa-calendar-day"></i> Opens: ' + date(ballot.opens_at) + '</span><span><i class="fas fa-calendar-check"></i> Closes: ' + date(ballot.closes_at) + '</span><span><i class="fas fa-users"></i> ' + esc(ballot.program || 'Eligible students') + '</span></div>' : '<div class="cp-notice"><i class="fas fa-info-circle"></i><div><strong>No ballot is currently available</strong><p>When the School of Nursing opens an eligible Block 5 ballot, it will appear here.</p></div></div>') +
      (ballot ? '<form id="cp-preference-form"><div id="cp-wheel-wrap" class="cp-wheel-wrap"><p class="cp-instruction">Spin the wheel to set your first-choice department. The remaining departments will follow in the displayed order.</p><div class="cp-wheel-stage"><div class="cp-wheel-pointer" aria-hidden="true"></div><div id="cp-department-wheel" class="cp-department-wheel"><div class="cp-wheel-label cp-wheel-label-0">Medical<br>Ward</div><div class="cp-wheel-label cp-wheel-label-1">Surgical<br>Ward</div><div class="cp-wheel-label cp-wheel-label-2">Maternity</div><div class="cp-wheel-label cp-wheel-label-3">Paediatric<br>Ward</div><div class="cp-wheel-center">NCHSM<br><small>ROTATION</small></div></div></div><div id="cp-wheel-countdown" class="cp-wheel-countdown" aria-live="polite"></div><button type="button" id="cp-spin-wheel" class="cp-primary cp-spin-wheel" ' + (!open || state.busy ? 'disabled':'') + '><i class="fas fa-dharmachakra"></i> Spin department wheel</button><div id="cp-wheel-result-card" class="cp-wheel-result-card" aria-live="polite"><span class="cp-result-kicker">YOUR CURRENT FIRST CHOICE</span><strong id="cp-wheel-result">' + esc((state.preference && state.preference.preferences && state.preference.preferences[0]) || 'Spin the wheel to reveal your department') + '</strong><small id="cp-spin-remaining">' + (2-state.spinsUsed) + ' spin(s) remaining</small></div><p class="cp-wheel-order-note">Your full preference order will be saved automatically from the wheel result.</p></div><button class="cp-primary" type="submit" ' + (!open || state.busy ? 'disabled':'') + '><i class="fas fa-paper-plane"></i> ' + (state.preference ? 'Update preferences' : 'Submit preferences') + '</button><span class="cp-save-note">' + (state.preference ? 'A preference submission exists for this ballot.' : 'Your choices are not submitted until you press the button.') + '</span></form>' : '') +
      '</section>' +
      '<section class="cp-card"><div class="cp-card-head"><div><h2><i class="fas fa-hospital-user"></i> My clinical placements</h2><p>Facility, assigned department and rotation dates.</p></div></div><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>Facility</th><th>Department</th><th>Start date</th><th>End date</th><th>Status</th></tr></thead><tbody>' + placementRows + '</tbody></table></div></section>' +
      '<section class="cp-card"><div class="cp-card-head"><div><h2><i class="fas fa-clock"></i> Clinical hours & attendance</h2><p>Hours count toward progress only after instructor verification.</p></div></div><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>Date</th><th>Department</th><th>Hours</th><th>Verification</th><th>Notes</th></tr></thead><tbody>' + attendanceRows + '</tbody></table></div></section>';
    const form = $('cp-preference-form');
    if (form) form.addEventListener('submit', submitPreferences);
    bindWheel(open, opens, closes);
  }
  let wheelTimer = null;
  let wheelRotation = 0;
  function ensureWheelStyles() {
    if ($('cp-wheel-styles')) return;
    const style = document.createElement('style');
    style.id = 'cp-wheel-styles';
    style.textContent = `
      .cp-wheel-wrap{margin:18px 0 24px;padding:18px 14px;border:1px solid #dbe6ef;border-radius:22px;background:linear-gradient(145deg,#f8fcff,#eef7fb);text-align:center}
      .cp-wheel-stage{position:relative;width:min(76vw,300px);height:min(76vw,300px);margin:12px auto 18px}
      .cp-department-wheel{position:relative;width:100%;height:100%;border-radius:50%;border:8px solid #fff;box-shadow:0 8px 26px #17324a2a,0 0 0 2px #c6dce8;overflow:hidden;background:conic-gradient(#d8f1f3 0 25%,#e8e4ff 25% 50%,#ffe8d7 50% 75%,#dff2dc 75% 100%);transition:transform 4.2s cubic-bezier(.12,.72,.12,1)}
      .cp-wheel-pointer{position:absolute;z-index:3;top:-2px;left:calc(50% - 15px);width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-top:0;border-bottom:30px solid #f59e0b;filter:drop-shadow(0 3px 2px #0003)}
      .cp-wheel-label{position:absolute;z-index:1;width:42%;font-weight:800;font-size:clamp(11px,3vw,14px);line-height:1.15;color:#17324a}
      .cp-wheel-label-0{top:17%;left:8%;transform:rotate(-45deg)}.cp-wheel-label-1{top:17%;right:6%;transform:rotate(45deg)}.cp-wheel-label-2{bottom:17%;right:8%;transform:rotate(-45deg)}.cp-wheel-label-3{bottom:17%;left:6%;transform:rotate(45deg)}
      .cp-wheel-center{position:absolute;z-index:2;top:50%;left:50%;transform:translate(-50%,-50%);width:26%;aspect-ratio:1;border-radius:50%;background:#123b5d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:12px;box-shadow:0 2px 10px #0003}.cp-wheel-center small{font-size:7px;letter-spacing:1px}
      .cp-wheel-countdown{font-weight:800;color:#244d68;margin:8px 0}.cp-spin-wheel{min-width:min(100%,260px);justify-content:center}.cp-spin-wheel:disabled{opacity:.55;cursor:not-allowed}.cp-wheel-result-card{display:flex;flex-direction:column;gap:7px;margin:16px auto 8px;padding:18px 14px;max-width:340px;border:2px solid #b7d9d6;border-radius:18px;background:#fff;box-shadow:0 8px 24px #123b5d14;transition:all .3s}.cp-result-kicker{font-size:10px;letter-spacing:1.7px;font-weight:900;color:#537386}.cp-wheel-result-card strong{font-size:clamp(21px,5vw,28px);line-height:1.2;color:#123b5d}.cp-wheel-result-card small{font-weight:700;color:#187c73}.cp-wheel-result-card.cp-result-revealed{border-color:#0f897d;background:linear-gradient(145deg,#f0fffc,#e5f6ff);transform:translateY(-2px);box-shadow:0 12px 28px #0f897d26}.cp-wheel-order-note{font-size:13px;color:#617588;margin:10px 0 0}
      @media(prefers-reduced-motion:reduce){.cp-department-wheel{transition:none}}
    `;
    document.head.appendChild(style);
  }
  function bindWheel(open, opens, closes) {
    const spin = $('cp-spin-wheel'), wheel = $('cp-department-wheel'), countdown = $('cp-wheel-countdown');
    if (!spin || !wheel || !countdown) return;
    const update = () => {
      const now = Date.now();
      const startWait = opens && now < opens ? opens - now : 0;
      const closeWait = closes && now > closes;
      const canSpin = !startWait && !closeWait && !!state.ballot && ['open','scheduled'].includes(String(state.ballot.status||'').toLowerCase()) && (!opens || now >= opens) && (!closes || now <= closes) && state.spinsUsed < 2;
      spin.disabled = !canSpin || state.busy || spin.dataset.spinning === '1';
      if (startWait > 0) {
        countdown.textContent = 'Wheel opens in ' + formatCountdown(startWait);
        spin.innerHTML = '<i class="fas fa-clock"></i> Opens in ' + formatCountdown(startWait);
      } else if (closeWait) {
        countdown.textContent = 'This ballot has closed.';
        spin.innerHTML = '<i class="fas fa-lock"></i> Ballot closed';
      } else if (canSpin) {
        countdown.textContent = 'The wheel is open. Spin to choose your first preference.';
        if (spin.dataset.spinning !== '1') spin.innerHTML = '<i class="fas fa-dharmachakra"></i> Spin department wheel';
      } else if (state.spinsUsed >= 2) {
        countdown.textContent = 'You have used both spins. Submit your preferences below.';
        spin.innerHTML = '<i class="fas fa-check-circle"></i> Spins used — submit choice';
      } else {
        countdown.textContent = 'Waiting for the School of Nursing to open this ballot.';
        spin.innerHTML = '<i class="fas fa-clock"></i> Waiting to open';
      }
    };
    update();
    if (wheelTimer) clearInterval(wheelTimer);
    wheelTimer = setInterval(update, 1000);
    spin.addEventListener('click', () => {
      if (spin.disabled || spin.dataset.spinning === '1' || state.spinsUsed >= 2) return;
      if (state.spinsUsed >= 2) return notify('You have used both spins for this ballot. Submit your preference order to continue.', 'warning');
      spin.dataset.spinning = '1';
      spin.disabled = true;
      spin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning…';
      const chosenIndex = Math.floor(Math.random() * departments.length);
      const chosen = departments[chosenIndex];
      // Wheel sectors are equal; rotate so the selected sector finishes under the top pointer.
      const targetSector = [315, 45, 135, 225][chosenIndex];
      wheelRotation += 360 * (5 + Math.floor(Math.random() * 3)) + targetSector;
      wheel.style.transform = 'rotate(' + wheelRotation + 'deg)';
      window.setTimeout(() => {
        const desired = [chosen].concat(departments.filter(d => d !== chosen));
        state.wheelOrder = desired;
        state.spinsUsed += 1;
        const result = $('cp-wheel-result');
        const remaining = $('cp-spin-remaining');
        if (result) result.textContent = chosen;
        if (remaining) remaining.textContent = (2-state.spinsUsed) + ' spin(s) remaining';
        const resultCard = $('cp-wheel-result-card');
        if (resultCard) resultCard.classList.add('cp-result-revealed');
        spin.dataset.spinning = '0';
        update();
      }, 4300);
    });
  }
  function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400), hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60), seconds = total % 60;
    return (days ? days + 'd ' : '') + String(hours).padStart(2,'0') + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0');
  }
  async function submitPreferences(event) {
    event.preventDefault();
    const sb = client(), id = userId();
    if (!sb || !id || !state.ballot) return notify('Your secure student session or ballot is not available. Please refresh or contact ICT support.', 'error');
    const prefs = state.wheelOrder.length ? state.wheelOrder.slice() : (state.preference?.preferences || []);
    if (prefs.length !== departments.length || new Set(prefs).size !== departments.length) return notify('Please rank each available department exactly once.', 'warning');
    state.busy = true;
    const btn = document.querySelector('#cp-preference-form button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }
    try {
      const payload = { ballot_id: state.ballot.id, student_id: id, preferences: prefs, submitted_at: new Date().toISOString() };
      const result = await sb.from('clinical_rotation_preferences').upsert(payload, { onConflict: 'ballot_id,student_id' }).select().single();
      if (result.error) throw result.error;
      state.preference = result.data;
      state.wheelOrder = (result.data.preferences || prefs).slice();
      notify('Your department preferences have been submitted.', 'success');
      await load();
    } catch (error) {
      console.error('[Clinical placements] Preference submission failed:', error);
      notify('Could not save preferences. The database may not yet be configured for clinical balloting. No confirmation has been recorded.', 'error');
    } finally { state.busy = false; render(); }
  }
  async function load() {
    const sb = client(), id = userId();
    if (!sb || !id) return renderError('Your authenticated student session is not ready. Please reopen this tab after the portal finishes loading.');
    try {
      const [ballots, placements, attendance] = await Promise.all([
        sb.from('clinical_rotation_ballots').select('*').in('status', ['open','scheduled']).order('created_at', { ascending:false }).limit(20),
        sb.from('clinical_placements').select('*').eq('student_id', id).order('start_date', { ascending:false }),
        sb.from('clinical_hours_logs').select('id,student_id,clinical_area,clinical_shift,hours_completed,hours_required,log_date,verified,verified_by_name,notes').eq('student_id', id).is('deleted_at', null).order('log_date', { ascending:false }).limit(200)
      ]);
      const failed = [ballots, placements, attendance].find(r => r.error);
      if (failed) throw failed.error;
      const p = profile();
      const program = String(p.program || p.course || '').toLowerCase();
      const block = String(p.block || p.current_block || '').toLowerCase();
      state.placements = placements.data || [];
      state.attendance = (attendance.data || []).map(a => Object.assign({}, a, { shift_date: a.log_date, department: a.clinical_area, hours: a.hours_completed, status: a.verified ? 'verified' : 'pending' }));
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