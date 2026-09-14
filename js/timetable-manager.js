/* ================================================================
   NCHSM STUDENT PORTAL — TIMETABLE MANAGER
   Visual/DOM contract matches #hub-timetable.
   Safe auto-initialization for dynamically injected portal sections.
   Supabase table expected: timetables
   ================================================================ */
(function () {
  'use strict';

  const state = {
    data: [],
    block: '',
    initialized: false,
    loading: false,
    boundContainer: null,
    observerStarted: false,
    retryTimer: null,
    selectedWeek: 'all',
    weeks: [],
    lastError: ''
  };

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const DAY_ALIASES = {
    mon:'Monday', monday:'Monday',
    tue:'Tuesday', tues:'Tuesday', tuesday:'Tuesday',
    wed:'Wednesday', wednesday:'Wednesday',
    thu:'Thursday', thur:'Thursday', thurs:'Thursday', thursday:'Thursday',
    fri:'Friday', friday:'Friday',
    sat:'Saturday', saturday:'Saturday',
    sun:'Sunday', sunday:'Sunday'
  };

  const esc = (value) => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  const text = (v, fallback='—') => {
    const s = String(v ?? '').trim();
    return s || fallback;
  };

  const capitalize = (value) => {
    const s = String(value ?? '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  };
  if (typeof window.capitalize !== 'function') window.capitalize = capitalize;

  function getSupabase() {
    const candidates = [
      window.supabase,
      window.supabaseClient,
      window.db?.supabase,
      window.NCHSMLogin?.supabase,
      window.auth?.supabase
    ];
    for (const client of candidates) {
      if (client && typeof client.from === 'function') return client;
    }
    return null;
  }

  function getEl(id) { return document.getElementById(id); }

  function setText(id, value) {
    const el = getEl(id);
    if (el) el.textContent = value;
  }

  function show(id, visible) {
    const el = getEl(id);
    if (!el) return;
    el.hidden = !visible;
  }

  function normalizeDay(value) {
    const key = String(value ?? '').trim().toLowerCase();
    return DAY_ALIASES[key] || capitalize(key);
  }

  function dayIndex(day) {
    const index = DAYS.indexOf(normalizeDay(day));
    return index < 0 ? 99 : index;
  }

  function normalizeTime(value) {
    if (!value) return '';
    let s = String(value).trim().toUpperCase().replace(/\s+/g,' ');
    s = s.replace(/\./g, ':');
    return s;
  }

  function minutesFromTime(value) {
    const s = normalizeTime(value);
    if (!s) return null;
    const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = Number(m[1]), min = Number(m[2]);
    const ap = (m[3] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    if (!ap && h <= 7) h += 12; // only a fallback for ambiguous short times
    return h * 60 + min;
  }

  function formatTime(value) {
    const s = normalizeTime(value);
    if (!s) return '—';
    const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return s;
    let h = Number(m[1]), min = Number(m[2]);
    const ap = (m[3] || '').toUpperCase();
    if (ap) return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')} ${ap}`;
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }

  function formatRange(start, end) {
    if (!start && !end) return '—';
    if (!end) return formatTime(start);
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  function first(obj, keys, fallback='') {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        return obj[key];
      }
    }
    return fallback;
  }

  function normalizeRow(row) {
    return {
      id: first(row, ['id','timetable_id'], cryptoSafeId()),
      day: normalizeDay(first(row, ['day_of_week','day','week_day','weekday','dayName'])),
      start: first(row, ['start_time','start','startTime','time_start']),
      end: first(row, ['end_time','end','endTime','time_end']),
      unitCode: first(row, ['unit_code','course_code','code','unitCode','courseCode']),
      unitName: first(row, ['unit_name','course_name','session_name','courseName','title','unit']),
      type: first(row, ['class_type','session_type','type','activity_type'], 'Lecture'),
      venue: first(row, ['venue','room','location','classroom']),
      lecturer: first(row, ['lecturer_name','lecturer','teacher_name','teacher','instructor']),
      notes: first(row, ['notes','description','remarks','comment']),
      week: first(row, ['week','teaching_week','week_number','week_no','teachingWeek'], ''),
      block: first(row, ['block','student_block','class_block'], '')
    };
  }

  function cryptoSafeId() {
    return 'tt_' + Math.random().toString(36).slice(2) + Date.now();
  }

  function extractBlock(profile) {
    if (!profile) return '';
    return first(profile, [
      'block','student_block','current_block','class_block','academic_block',
      'block_name','currentBlock'
    ], '');
  }

  function extractAcademicYear(profile) {
    return first(profile, [
      'academic_year','academicYear','current_academic_year','year_of_study',
      'academic_session'
    ], '');
  }

  async function resolveProfile() {
    const localProfiles = [
      window.currentUserProfile,
      window.studentProfile,
      window.db?.currentUserProfile,
      window.profileModule?.userProfile,
      window.studentModule?.profile
    ];

    for (const profile of localProfiles) {
      if (profile && (extractBlock(profile) || profile.program || profile.admission_number)) {
        return profile;
      }
    }

    const client = getSupabase();
    if (!client) return null;

    try {
      const { data: authData } = await client.auth.getUser();
      const user = authData?.user;
      if (!user) return null;

      const tables = [
        'consolidated_user_profiles_table',
        'consolidated_user_profiles',
        'profiles',
        'students'
      ];

      for (const table of tables) {
        try {
          const { data, error } = await client.from(table)
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!error && data) return data;
        } catch (_) {}
      }

      return user.user_metadata || null;
    } catch (_) {
      return null;
    }
  }

  async function resolveBlock() {
    const profile = await resolveProfile();
    let block = extractBlock(profile);

    if (!block) {
      block = first(window.currentStudent || {}, ['block','student_block','current_block'], '');
    }

    if (!block && window.localStorage) {
      const keys = ['studentProfile','currentUserProfile','student','userProfile'];
      for (const key of keys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          block = extractBlock(parsed);
          if (block) break;
        } catch (_) {}
      }
    }

    return { block: String(block || '').trim(), profile };
  }

  function sortRows(rows) {
    return [...rows].sort((a,b) => {
      const d = dayIndex(a.day) - dayIndex(b.day);
      if (d !== 0) return d;
      return (minutesFromTime(a.start) ?? 9999) - (minutesFromTime(b.start) ?? 9999);
    });
  }

  function extractWeekNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const m = String(value).match(/\d+/);
    return m ? Number(m[0]) : null;
  }

  function buildWeeks(rows) {
    const set = new Set();
    rows.forEach(r => {
      const n = extractWeekNumber(r.week);
      if (n) set.add(n);
    });
    return [...set].sort((a,b)=>a-b);
  }

  function filterRows(rows) {
    if (state.selectedWeek === 'all') return rows;
    const wanted = Number(state.selectedWeek);
    return rows.filter(r => extractWeekNumber(r.week) === wanted);
  }

  function dayClass(day) {
    return {
      Monday:'mon', Tuesday:'tue', Wednesday:'wed',
      Thursday:'thu', Friday:'fri', Saturday:'sat', Sunday:'sun'
    }[normalizeDay(day)] || 'mon';
  }

  function typeClass(type) {
    const s = String(type || '').toLowerCase();
    if (s.includes('tutorial')) return 'tutorial';
    if (s.includes('practical') || s.includes('lab')) return 'practical';
    if (s.includes('clinical')) return 'clinical';
    if (s.includes('exam') || s.includes('osce')) return 'exam';
    return '';
  }

  function renderWeekButtons() {
    const wrap = getEl('week-buttons');
    if (!wrap) return;

    const weeks = state.weeks;
    const total = weeks.length || inferTeachingWeeks(state.data);

    let html = `<button type="button" class="tt-week-btn ${state.selectedWeek==='all'?'active':''}" data-tt-week="all">All Weeks</button>`;

    for (const week of weeks) {
      html += `<button type="button" class="tt-week-btn ${Number(state.selectedWeek)===week?'active':''}" data-tt-week="${week}">Week ${week}</button>`;
    }

    if (!weeks.length && total > 0) {
      for (let i=1;i<=total;i++) {
        html += `<button type="button" class="tt-week-btn ${Number(state.selectedWeek)===i?'active':''}" data-tt-week="${i}">Week ${i}</button>`;
      }
    }

    wrap.innerHTML = html;

    const select = getEl('week-filter-select');
    if (select) {
      select.innerHTML = `<option value="all">All Weeks</option>` +
        Array.from({length: total},(_,i)=>`<option value="${i+1}">Week ${i+1}</option>`).join('');
      select.value = String(state.selectedWeek);
    }
  }

  function inferTeachingWeeks(rows) {
    const nums = rows.map(r=>extractWeekNumber(r.week)).filter(Boolean);
    return nums.length ? Math.max(...nums) : 0;
  }

  function renderStats() {
    const visible = filterRows(state.data);
    setText('timetable-total-count', state.data.length);
    setText('timetable-week-count', Math.max(inferTeachingWeeks(state.data), state.weeks.length));
    setText('timetable-upcoming-count', countUpcomingThisWeek(state.data));
    setText('timetable-status-short', state.data.length ? 'Published' : 'Not Published');

    const last = state.data
      .map(r => first(r, ['updated_at','updatedAt','last_updated','published_at','created_at'], ''))
      .filter(Boolean)
      .sort().pop();

    if (last) {
      const date = new Date(last);
      setText('timetable-last-updated',
        Number.isNaN(date.getTime()) ? `Last updated: ${text(last)}` :
        `Last updated: ${date.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}`);
    } else {
      setText('timetable-last-updated', state.data.length ? 'Schedule currently published' : 'Waiting for publication');
    }

    const profileYear = extractAcademicYear(window.currentUserProfile || window.studentProfile);
    if (profileYear) setText('timetable-academic-year', `Academic Year ${profileYear}`);
  }

  function countUpcomingThisWeek(rows) {
    if (!rows.length) return 0;
    const today = new Date();
    const todayIndex = (today.getDay() + 6) % 7;
    const nowMin = today.getHours()*60 + today.getMinutes();

    return rows.filter(r => {
      const d = dayIndex(r.day);
      if (d === 99) return false;
      if (d > todayIndex) return true;
      if (d < todayIndex) return false;
      const start = minutesFromTime(r.start);
      return start === null || start >= nowMin;
    }).length;
  }

  function renderNextClass(rows) {
    if (!rows.length) {
      setText('next-class-name','—');
      setText('next-class-time','—');
      setText('next-class-day','—');
      setText('next-class-venue','—');
      setText('next-class-lecturer','—');
      return;
    }

    const now = new Date();
    const todayIndex = (now.getDay()+6)%7;
    const nowMin = now.getHours()*60 + now.getMinutes();

    const candidates = rows.map(r => {
      const d = dayIndex(r.day);
      const start = minutesFromTime(r.start) ?? 0;
      let distance = d - todayIndex;
      if (distance < 0 || (distance === 0 && start < nowMin)) distance += 7;
      return { r, distance, start };
    }).sort((a,b)=>a.distance-b.distance || a.start-b.start);

    const next = candidates[0]?.r;
    if (!next) return;

    setText('next-class-name', [next.unitCode,next.unitName].filter(Boolean).join(' - ') || 'Scheduled class');
    setText('next-class-time', formatRange(next.start,next.end));
    setText('next-class-day', next.day);
    setText('next-class-venue', next.venue);
    setText('next-class-lecturer', next.lecturer);
  }

  function renderTable() {
    const container = getEl('timetable-container');
    if (!container) return;

    const rows = sortRows(filterRows(state.data));
    const weekLabel = state.selectedWeek === 'all'
      ? 'Showing classes for All Weeks'
      : `Showing classes for Week ${state.selectedWeek}`;
    const badge = state.selectedWeek === 'all'
      ? 'All Weeks'
      : `Week ${state.selectedWeek} of ${Math.max(inferTeachingWeeks(state.data),state.weeks.length) || state.selectedWeek}`;

    setText('timetable-week-label', weekLabel);
    setText('timetable-week-badge', badge);
    setText('class-count-display', `${rows.length} class${rows.length===1?'':'es'}`);

    if (!rows.length) {
      container.innerHTML = '';
      show('timetable-empty', true);
      return;
    }

    show('timetable-empty', false);

    container.innerHTML = `
      <table class="tt-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Unit Code</th>
            <th>Unit Name</th>
            <th>Type</th>
            <th>Venue</th>
            <th>Lecturer</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td><span class="tt-day ${dayClass(r.day)}">${esc(text(r.day))}</span></td>
              <td>${esc(formatRange(r.start,r.end))}</td>
              <td><strong>${esc(text(r.unitCode))}</strong></td>
              <td>${esc(text(r.unitName))}</td>
              <td><span class="tt-type ${typeClass(r.type)}">${esc(text(r.type,'Lecture'))}</span></td>
              <td>${esc(text(r.venue))}</td>
              <td>${esc(text(r.lecturer))}</td>
              <td>${esc(text(r.notes,'-'))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  function updateBlockUI(block) {
    setText('timetable-block-value', block || 'Block not assigned');
    const hidden = getEl('timetable-block-title');
    if (hidden) hidden.textContent = block || 'Block not assigned';
  }

  async function fetchTimetable(block) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client is not available yet.');

    let query = client.from('timetables').select('*');

    if (block) {
      query = query.eq('block', block);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(normalizeRow);
  }

  async function initStudentTimetable(force=false) {
    const container = getEl('timetable-container');
    if (!container) return false;

    if (state.loading) return false;
    if (state.initialized && state.boundContainer === container && !force) return true;

    state.loading = true;
    state.lastError = '';
    state.boundContainer = container;
    show('timetable-loading', true);
    show('timetable-error', false);
    show('timetable-empty', false);

    const btn = getEl('timetable-refresh-btn');
    if (btn) btn.classList.add('is-loading');

    try {
      const resolved = await resolveBlock();
      state.block = resolved.block;
      updateBlockUI(state.block);

      if (!state.block) {
        state.data = [];
        state.weeks = [];
        state.selectedWeek = 'all';
        renderWeekButtons();
        renderStats();
        renderNextClass([]);
        renderTable();
        throw new Error('Student block could not be resolved from the current profile.');
      }

      const rows = await fetchTimetable(state.block);
      state.data = sortRows(rows);
      state.weeks = buildWeeks(state.data);

      // A previous failed initialization can hide the table container.
      // Always restore visibility once Supabase has returned successfully.
      show('timetable-container', true);

      if (state.selectedWeek !== 'all' && !state.weeks.includes(Number(state.selectedWeek))) {
        state.selectedWeek = 'all';
      }

      renderWeekButtons();
      renderStats();
      renderNextClass(state.data);
      renderTable();

      // Keep the timetable panel available even when no rows are published yet.
      show('timetable-container', true);

      state.initialized = true;
      return true;
    } catch (error) {
      state.lastError = error?.message || String(error);
      console.error('[Timetable] Initialization error:', error);
      state.data = [];
      renderStats();
      renderNextClass([]);
      renderWeekButtons();

      const err = getEl('timetable-error-text');
      if (err) err.textContent = state.lastError;

      show('timetable-container', false);
      show('timetable-empty', false);
      show('timetable-error', true);
      return false;
    } finally {
      state.loading = false;
      show('timetable-loading', false);
      if (btn) btn.classList.remove('is-loading');
    }
  }

  function refreshStudentTimetable() {
    state.initialized = false;
    return initStudentTimetable(true);
  }

  function handleWeekChange(value) {
    state.selectedWeek = value === 'all' ? 'all' : Number(value);
    renderWeekButtons();
    renderStats();
    renderTable();
  }

  function isTimetableTarget(el) {
    if (!el) return false;
    return !!el.closest(
      '[data-tab="timetable"],[data-tab="calendar"],[data-section="timetable"],' +
      '[data-target="timetable"],[data-target="#hub-timetable"],' +
      '#hub-timetable-tab,.timetable-tab,.calendar-tab'
    );
  }

  function sectionExists() {
    return !!document.getElementById('timetable-container');
  }

  function scheduleRetry() {
    if (state.retryTimer) return;
    state.retryTimer = setTimeout(() => {
      state.retryTimer = null;
      if (sectionExists()) initStudentTimetable(false);
    }, 300);
  }

  function startObserver() {
    if (state.observerStarted || !document.body) return;
    state.observerStarted = true;

    const observer = new MutationObserver(() => {
      const current = getEl('timetable-container');
      if (current && current !== state.boundContainer) {
        state.initialized = false;
        state.boundContainer = null;
        scheduleRetry();
      }
    });

    observer.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener('click', function (event) {
    const weekBtn = event.target.closest?.('[data-tt-week]');
    if (weekBtn) {
      event.preventDefault();
      handleWeekChange(weekBtn.dataset.ttWeek || 'all');
      return;
    }

    const refresh = event.target.closest?.('#timetable-refresh-btn');
    if (refresh) {
      event.preventDefault();
      refreshStudentTimetable();
      return;
    }

    const full = event.target.closest?.('#view-full-schedule-btn');
    if (full) {
      const container = getEl('hub-timetable');
      if (container) container.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }

    if (isTimetableTarget(event.target)) scheduleRetry();
  });

  document.addEventListener('change', function (event) {
    if (event.target?.id === 'week-filter-select') {
      handleWeekChange(event.target.value);
    }
  });

  function boot() {
    startObserver();
    if (sectionExists()) {
      initStudentTimetable(false);
    } else {
      scheduleRetry();
    }
  }

  window.addEventListener('DOMContentLoaded', boot, {once:true});
  window.addEventListener('load', boot, {once:true});
  document.addEventListener('appReady', boot);
  document.addEventListener('portalReady', boot);
  document.addEventListener('studentPortalReady', boot);

  window.initStudentTimetable = initStudentTimetable;
  window.refreshStudentTimetable = refreshStudentTimetable;
  window.forceRefreshTimetable = refreshStudentTimetable;
  window.getStudentTimetableData = () => [...state.data];
  window.getCurrentStudentBlock = () => state.block;
  window.renderStudentTimetable = renderTable;
  window.getStudentTimetableStatus = () => ({
    initialized:state.initialized,
    loading:state.loading,
    block:state.block,
    count:state.data.length,
    selectedWeek:state.selectedWeek,
    error:state.lastError
  });

  // Immediate attempt for scripts loaded after the portal HTML.
  if (document.readyState !== 'loading') {
    setTimeout(boot, 0);
  }
})();
