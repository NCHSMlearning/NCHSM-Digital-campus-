/* NCHSM Super Admin — Clinical Rotation Ballots & Placements */
(function () {
  'use strict';
  const DEPARTMENTS = ['Medical Ward', 'Surgical Ward', 'Maternity', 'Paediatric Ward'];
  const state = { ballots: [], selectedBallot: null, preferences: [], profiles: {}, placements: [], loading: false, departments: DEPARTMENTS.slice() };
  const $ = id => document.getElementById(id);
  const db = () => window.sb || window.db?.supabase || window.supabase || null;
  const uid = () => window.currentUser?.id || window.getCurrentUser?.()?.id || null;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify = (m,t) => typeof window.showNotification === 'function' ? window.showNotification(m,t||'info') : window.alert(m);
  const dateOnly = v => v ? String(v).slice(0,10) : '';
  function setStatus(text, bad) {
    const el = $('clinical-admin-status');
    if (el) { el.textContent = text; el.className = 'ca-status ' + (bad ? 'ca-status-bad' : ''); }
  }
  function setLoading(on) {
    state.loading = on;
    ['ca-save-ballot','ca-refresh','ca-load-preferences'].forEach(id => { const el=$(id); if(el) el.disabled=on; });
  }
  function formDepartments() {
    const raw = $('ca-departments-list')?.value || DEPARTMENTS.join(', ');
    const list = raw.split(/[,;\n]/).map(v=>v.trim()).filter(Boolean);
    return [...new Map(list.map(v=>[v.toLowerCase(),v])).values()].slice(0,30);
  }
  function ensureDepartmentEditor() {
    const form = $('ca-ballot-form');
    if (!form || $('ca-departments-list')) return;
    const box = document.createElement('div');
    box.className = 'ca-field ca-departments-editor';
    box.style.cssText = 'grid-column:1/-1;padding:14px;border:1px solid #d7e4ed;border-radius:12px;background:#f7fbfd;margin:8px 0';
    box.innerHTML = '<label for="ca-department-new"><strong>Departments for this ballot</strong></label><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input id="ca-department-new" class="ca-input" style="flex:1;min-width:180px" placeholder="Type a department name"><button type="button" id="ca-add-department" class="ca-btn ca-btn-green"><i class="fas fa-plus"></i> Add department</button></div><div id="ca-department-chips" style="display:grid;gap:8px;margin-top:12px"></div><textarea id="ca-departments-list" hidden></textarea><small style="display:block;margin-top:6px">Add or remove departments below. Set the capacity for each department here. Use 0 for unlimited.</small>';
    form.insertBefore(box, form.querySelector('button[type="submit"]')?.parentElement || form.lastElementChild);
    $('ca-departments-list').value = DEPARTMENTS.join(', ');
    renderDepartmentChips();
    $('ca-add-department')?.addEventListener('click', addDepartmentFromInput);
    $('ca-department-new')?.addEventListener('keydown', e=>{if(e.key==='Enter'){e.preventDefault();addDepartmentFromInput();}});
    $('ca-department-chips')?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-remove-department]');
      if(!btn) return;
      const department=btn.dataset.removeDepartment;
      if(state.selectedBallot && (state.selectedBallot.departments||DEPARTMENTS).includes(department)) {
        const used=state.placements.filter(p=>p.ballot_id===state.selectedBallot.id&&p.department===department&&p.status!=='cancelled').length;
        if(used>0&&!window.confirm(department+' already has '+used+' placement(s). Remove it from this ballot? Existing placement records will be preserved.')) return;
      }
      $('ca-departments-list').value=formDepartments().filter(d=>d!==department).join(', ');
      renderDepartmentChips();
    });
    $('ca-department-chips')?.addEventListener('input',e=>{
      const input=e.target.closest('[data-capacity-for]');
      if(!input) return;
      const capacities=JSON.parse($('ca-department-capacities').value||'{}');
      capacities[input.dataset.capacityFor]=Math.max(0,Math.floor(Number(input.value||0)));
      $('ca-department-capacities').value=JSON.stringify(capacities);
    });
  }
  function renderDepartmentChips() {
    const wrap=$('ca-department-chips'), hidden=$('ca-departments-list');
    if(!wrap||!hidden) return;
    const list=formDepartments();
    hidden.value=list.join(', ');
    const previous=JSON.parse($('ca-department-capacities')?.value||'{}');
    const caps=state.selectedBallot?.capacities||{};
    list.forEach(d=>{if(previous[d]===undefined) previous[d]=caps[d]===undefined?0:Number(caps[d]);});
    if(!$('ca-department-capacities')) {
      const store=document.createElement('textarea');store.id='ca-department-capacities';store.hidden=true;wrap.parentElement.appendChild(store);
    }
    $('ca-department-capacities').value=JSON.stringify(previous);
    wrap.innerHTML=list.map(d=>'<div style="display:grid;grid-template-columns:minmax(0,1fr) 95px auto;align-items:center;gap:8px;padding:9px 10px;border:1px solid #dce6ec;border-radius:10px;background:#fff"><strong>'+esc(d)+'</strong><label style="font-size:12px">Capacity <input class="ca-input" data-capacity-for="'+esc(d)+'" type="number" min="0" step="1" value="'+Math.max(0,Number(previous[d]||0))+'" style="width:76px;display:block;padding:6px;margin-top:3px"></label><button type="button" data-remove-department="'+esc(d)+'" aria-label="Remove '+esc(d)+'" class="ca-btn ca-btn-light" style="color:#a32121">Delete</button></div>').join('');
  }
  function addDepartmentFromInput() {
    const input=$('ca-department-new');
    const name=(input?.value||'').trim();
    if(!name) return notify('Enter a department name first.','warning');
    const list=formDepartments();
    if(list.some(d=>d.toLowerCase()===name.toLowerCase())) return notify('That department is already on this ballot.','warning');
    if(list.length>=30) return notify('A ballot can have at most 30 departments.','warning');
    list.push(name);
    $('ca-departments-list').value=list.join(', ');
    input.value='';
    renderDepartmentChips();
  }
  function getFormCapacities() {
    const saved=JSON.parse($('ca-department-capacities')?.value||'{}');
    const obj={};
    formDepartments().forEach(d=>{
      const input=Array.from(document.querySelectorAll('[data-capacity-for]')).find(el=>el.dataset.capacityFor===d);
      obj[d]=Math.max(0,Math.floor(Number(input ? input.value : (saved[d]||0))));
    });
    return obj;
  }
  function renderBallots() {
    const body = $('ca-ballots-body');
    if (!body) return;
    if (!state.ballots.length) {
      body.innerHTML = '<tr><td colspan="7" class="ca-empty">No rotation ballots created yet. Use the form above to create one.</td></tr>';
      return;
    }
    body.innerHTML = state.ballots.map(b => {
      const active = state.selectedBallot && state.selectedBallot.id === b.id;
      return '<tr class="'+(active?'ca-selected':'')+'"><td><strong>'+esc(b.title||'Clinical rotation ballot')+'</strong><small>'+esc(b.program||'All programs')+' · '+esc(b.block||'All blocks')+'</small></td><td>'+esc(b.intake_year||'Any intake')+'</td><td>'+esc(b.opens_at?new Date(b.opens_at).toLocaleString():'Not set')+'<small>to '+esc(b.closes_at?new Date(b.closes_at).toLocaleString():'Not set')+'</small></td><td><span class="ca-pill ca-'+esc(String(b.status||'scheduled').toLowerCase())+'">'+esc(b.status||'scheduled')+'</span></td><td>'+Number(b.preference_count||0)+'</td><td><button class="ca-btn ca-btn-light" data-select-ballot="'+esc(b.id)+'" type="button">Manage</button> <button class="ca-btn ca-btn-amber" data-edit-ballot="'+esc(b.id)+'" type="button">Edit</button></td><td class="ca-actions">'+(b.status==='scheduled'?'<button type="button" class="ca-btn ca-btn-green" data-ballot-action="open" data-id="'+esc(b.id)+'">Open</button>':'')+(b.status==='open'?'<button type="button" class="ca-btn ca-btn-amber" data-ballot-action="closed" data-id="'+esc(b.id)+'">Close</button>':'')+(b.status==='closed'?'<button type="button" class="ca-btn ca-btn-purple" data-ballot-action="published" data-id="'+esc(b.id)+'">Publish</button>':'')+'</td></tr>';
    }).join('');
  }
  function renderPreferences() {
    const body = $('ca-preferences-body');
    if (!body) return;
    if (!state.selectedBallot) {
      body.innerHTML = '<tr><td colspan="7" class="ca-empty">Select a ballot to review student choices and assign placements.</td></tr>';
      return;
    }
    if (!state.preferences.length) {
      body.innerHTML = '<tr><td colspan="7" class="ca-empty">No student preferences submitted for this ballot yet.</td></tr>';
      return;
    }
    const ballotDepartments = Array.isArray(state.selectedBallot.departments) && state.selectedBallot.departments.length ? state.selectedBallot.departments : DEPARTMENTS;
    const caps = state.selectedBallot.capacities || {};
    const used = {};
    state.placements.filter(p=>p.ballot_id===state.selectedBallot.id && !['cancelled'].includes(p.status)).forEach(p=>used[p.department]=(used[p.department]||0)+1);
    body.innerHTML = state.preferences.map(p => {
      const profile = state.profiles[p.student_id] || {};
      const placement = state.placements.find(x=>x.student_id===p.student_id && x.ballot_id===state.selectedBallot.id);
      const prefs = Array.isArray(p.preferences) ? p.preferences : [];
      const select = '<select class="ca-input ca-dept-select" data-dept-for="'+esc(p.student_id)+'">'+ballotDepartments.map(d=>'<option value="'+esc(d)+'" '+((placement?.department||prefs[0])===d?'selected':'')+'>'+esc(d)+(Number(caps[d]||0)>0?' ('+(used[d]||0)+'/'+Number(caps[d])+')':'')+'</option>').join('')+'</select>';
      return '<tr><td><strong>'+esc(profile.full_name||profile.name||'Student')+'</strong><small>'+esc(profile.student_id||profile.admission_number||'')+'</small></td><td>'+esc(profile.program||state.selectedBallot.program||'—')+'</td><td>'+esc(profile.block||state.selectedBallot.block||'—')+'</td><td><ol class="ca-pref-list">'+prefs.map(d=>'<li>'+esc(d)+'</li>').join('')+'</ol></td><td>'+esc(p.submitted_at?new Date(p.submitted_at).toLocaleString():'—')+'</td><td>'+ (placement?'<span class="ca-pill ca-allocated">'+esc(placement.status||'allocated')+'</span><small>'+esc(placement.facility_name||'Facility pending')+'</small>':'<span class="ca-pill ca-scheduled">Not allocated</span>')+'</td><td><div class="ca-assign-fields">'+select+'<input class="ca-input ca-facility" data-facility-for="'+esc(p.student_id)+'" placeholder="Facility / hospital" value="'+esc(placement?.facility_name||'')+'"><div class="ca-date-pair"><input class="ca-input ca-start" type="date" data-start-for="'+esc(p.student_id)+'" aria-label="Start date" value="'+esc(dateOnly(placement?.start_date))+'"><input class="ca-input ca-end" type="date" data-end-for="'+esc(p.student_id)+'" aria-label="End date" value="'+esc(dateOnly(placement?.end_date))+'"></div><input class="ca-input ca-hours" type="number" min="0" step="1" data-hours-for="'+esc(p.student_id)+'" placeholder="Required hours" value="'+esc(placement?.required_hours??'')+'"><button type="button" class="ca-btn ca-btn-green ca-allocate" data-allocate="'+esc(p.student_id)+'">'+(placement?'Update placement':'Allocate')+'</button></div></td></tr>';
    }).join('');
  }
  async function loadBallots() {
    const client=db();
    if (!client) throw new Error('Supabase client is not available on this page.');
    const result=await client.from('clinical_rotation_ballots').select('*').order('created_at',{ascending:false}).limit(100);
    if(result.error) throw result.error;
    const ballots=result.data||[];
    const counts={};
    if(ballots.length) {
      const ids=ballots.map(b=>b.id);
      const pref=await client.from('clinical_rotation_preferences').select('ballot_id').in('ballot_id',ids);
      if(!pref.error) (pref.data||[]).forEach(p=>counts[p.ballot_id]=(counts[p.ballot_id]||0)+1);
    }
    state.ballots=ballots.map(b=>({...b,preference_count:counts[b.id]||0}));
    const ballotTotal=$('ca-ballot-total'); if(ballotTotal) ballotTotal.textContent=state.ballots.length;
    if(state.selectedBallot) state.selectedBallot=state.ballots.find(b=>b.id===state.selectedBallot.id)||null;
    renderBallots();
    if(state.selectedBallot) await loadPreferences();
  }
  async function loadPreferences() {
    const client=db();
    if(!client||!state.selectedBallot) { renderPreferences(); return; }
    const [pr,pl]=await Promise.all([
      client.from('clinical_rotation_preferences').select('*').eq('ballot_id',state.selectedBallot.id).order('submitted_at',{ascending:true}),
      client.from('clinical_placements').select('*').eq('ballot_id',state.selectedBallot.id).order('created_at',{ascending:false})
    ]);
    if(pr.error) throw pr.error;
    if(pl.error) throw pl.error;
    state.preferences=pr.data||[];
    state.placements=pl.data||[];
    const ids=[...new Set(state.preferences.map(p=>p.student_id))];
    state.profiles={};
    if(ids.length) {
      const prof=await client.from('consolidated_user_profiles_table').select('user_id,full_name,student_id,admission_number,program,block,current_block,intake_year,role').in('user_id',ids);
      if(prof.error) console.warn('[Clinical admin] Student profile lookup failed:',prof.error.message);
      else (prof.data||[]).forEach(p=>state.profiles[p.user_id]=p);
    }
    renderPreferences();
    const total=$('ca-pref-total'); if(total) total.textContent=state.preferences.length;
    const allocated=$('ca-allocated-total'); if(allocated) allocated.textContent=state.placements.filter(p=>['allocated','approved','in_progress','completed'].includes(p.status)).length;
  }
  async function saveBallot(event) {
    event.preventDefault();
    const client=db(), id=uid();
    if(!client) return notify('Supabase client not ready. Refresh and try again.','error');
    const title=$('ca-title')?.value.trim();
    const program=$('ca-program')?.value.trim();
    const block=$('ca-block')?.value.trim();
    const intake=$('ca-intake')?.value.trim();
    const opens=$('ca-opens')?.value, closes=$('ca-closes')?.value;
    if(!title) return notify('Enter a ballot title.','warning');
    if(opens&&closes&&new Date(closes)<=new Date(opens)) return notify('Closing time must be after opening time.','warning');
    const payload={title,program:program||null,block:block||null,intake_year:intake||null,departments:formDepartments(),capacities:getFormCapacities(),opens_at:opens?new Date(opens).toISOString():null,closes_at:closes?new Date(closes).toISOString():null,updated_at:new Date().toISOString()};
    const editing=$('ca-edit-id')?.value;
    if(!editing) { payload.status='scheduled'; payload.created_by=id; }
    setLoading(true);
    try {
      const result=editing
        ? await client.from('clinical_rotation_ballots').update(payload).eq('id',editing).select().single()
        : await client.from('clinical_rotation_ballots').insert(payload).select().single();
      if(result.error) throw result.error;
      state.selectedBallot=result.data;
      $('ca-ballot-form')?.reset();
      if($('ca-edit-id')) $('ca-edit-id').value='';
      if($('ca-save-ballot')) $('ca-save-ballot').innerHTML='<i class="fas fa-plus"></i> Create ballot';
      if($('ca-departments-list')) $('ca-departments-list').value=DEPARTMENTS.join(', ');
      if($('ca-department-capacities')) $('ca-department-capacities').value='{}';
      state.selectedBallot=null; renderDepartmentChips();
      DEPARTMENTS.forEach((d,i)=>{if($('ca-cap-'+i)) $('ca-cap-'+i).value='0';});
      await loadBallots();
      await loadPreferences();
      setStatus('Ballot saved. It remains scheduled until you open it.',false);
      notify(editing?'Ballot settings updated.':'Rotation ballot created.','success');
    } catch(e) {
      console.error('[Clinical admin] Save ballot failed:',e);
      notify('Could not save ballot: '+(e.message||'check permissions and database configuration'),'error');
    } finally {setLoading(false);}
  }
  async function ballotAction(id, action) {
    const client=db();
    const labels={open:'Open this ballot for student submissions?',closed:'Close this ballot? Students will no longer be able to submit or change preferences.',published:'Publish this ballot status? Make sure allocations have been reviewed first.'};
    if(!window.confirm(labels[action]||'Continue?')) return;
    try {
      const r=await client.from('clinical_rotation_ballots').update({status:action,updated_at:new Date().toISOString()}).eq('id',id).select().single();
      if(r.error) throw r.error;
      state.selectedBallot=r.data;
      await loadBallots();
      setStatus('Ballot status changed to '+action+'.',false);
      notify('Ballot status updated.','success');
    } catch(e) { console.error(e); notify('Could not change ballot status: '+(e.message||''),'error'); }
  }
  function selectBallot(id) {
    state.selectedBallot=state.ballots.find(b=>b.id===id)||null;
    if(!state.selectedBallot) return;
    $('ca-edit-id').value='';
    $('ca-title').value=state.selectedBallot.title||'';
    $('ca-program').value=state.selectedBallot.program||'';
    $('ca-block').value=state.selectedBallot.block||'';
    $('ca-intake').value=state.selectedBallot.intake_year||'';
    ensureDepartmentEditor();
    if($('ca-departments-list')) $('ca-departments-list').value=(state.selectedBallot.departments||DEPARTMENTS).join(', ');
    if($('ca-department-capacities')) $('ca-department-capacities').value=JSON.stringify(state.selectedBallot.capacities||{});
    renderDepartmentChips();
    if($('ca-extra-capacities')) $('ca-extra-capacities').value=Object.entries(state.selectedBallot.capacities||{}).filter(([d])=>!DEPARTMENTS.includes(d)).map(([d,n])=>d+'='+n).join('\n');
    $('ca-opens').value=state.selectedBallot.opens_at?new Date(new Date(state.selectedBallot.opens_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    $('ca-closes').value=state.selectedBallot.closes_at?new Date(new Date(state.selectedBallot.closes_at).getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    DEPARTMENTS.forEach((d,i)=>{if($('ca-cap-'+i)) $('ca-cap-'+i).value=Number((state.selectedBallot.capacities||{})[d]||0);});
    $('ca-edit-id').value=state.selectedBallot.id;
    $('ca-save-ballot').innerHTML='<i class="fas fa-save"></i> Save ballot settings';
    renderBallots();
    loadPreferences().catch(e=>{console.error(e);notify('Could not load ballot preferences: '+e.message,'error');});
  }
  async function allocate(studentId) {
    const client=db(), ballot=state.selectedBallot;
    if(!client||!ballot) return notify('Select a ballot first.','warning');
    const department=$('clinical-placements')?.querySelector('[data-dept-for="'+CSS.escape(studentId)+'"]')?.value;
    const facility=$('clinical-placements')?.querySelector('[data-facility-for="'+CSS.escape(studentId)+'"]')?.value.trim();
    const start=$('clinical-placements')?.querySelector('[data-start-for="'+CSS.escape(studentId)+'"]')?.value||null;
    const end=$('clinical-placements')?.querySelector('[data-end-for="'+CSS.escape(studentId)+'"]')?.value||null;
    const hours=Number($('clinical-placements')?.querySelector('[data-hours-for="'+CSS.escape(studentId)+'"]')?.value||0);
    if(!department) return notify('Choose a department.','warning');
    if(start&&end&&end<start) return notify('End date must be on or after start date.','warning');
    const caps=ballot.capacities||{}, cap=Number(caps[department]||0);
    const existing=state.placements.find(p=>p.student_id===studentId&&p.ballot_id===ballot.id);
    const occupied=state.placements.filter(p=>p.department===department&&p.ballot_id===ballot.id&&p.id!==existing?.id&&!['cancelled'].includes(p.status)).length;
    if(cap>0&&occupied>=cap) {
      const proceed=window.confirm(department+' capacity is '+cap+' and '+occupied+' other student(s) are already assigned. Continue anyway?');
      if(!proceed) return;
    }
    const payload={student_id:studentId,ballot_id:ballot.id,department,facility_name:facility||null,start_date:start,end_date:end,required_hours:hours,status:'allocated',allocated_by:uid(),allocated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    try {
      const r=existing
        ? await client.from('clinical_placements').update(payload).eq('id',existing.id).select().single()
        : await client.from('clinical_placements').insert(payload).select().single();
      if(r.error) throw r.error;
      notify('Placement saved for '+(state.profiles[studentId]?.full_name||'student')+'.','success');
      await loadPreferences();
      await loadBallots();
    } catch(e) {console.error('[Clinical admin] Allocation failed:',e);notify('Placement could not be saved: '+(e.message||'check permissions'),'error');}
  }
  function bind() {
    const form=$('ca-ballot-form');
    if(form) form.addEventListener('submit',saveBallot);
    $('ca-refresh')?.addEventListener('click',()=>loadBallots().then(()=>setStatus('Data refreshed.',false)).catch(e=>{setStatus(e.message,true);notify(e.message,'error');}));
    $('ca-load-preferences')?.addEventListener('click',()=>loadPreferences().catch(e=>notify(e.message,'error')));
    $('ca-reset-form')?.addEventListener('click',()=>{
      $('ca-ballot-form')?.reset(); $('ca-edit-id').value='';
      if($('ca-departments-list')) $('ca-departments-list').value=DEPARTMENTS.join(', '); if($('ca-department-capacities')) $('ca-department-capacities').value='{}'; state.selectedBallot=null; renderDepartmentChips();
      $('ca-save-ballot').innerHTML='<i class="fas fa-plus"></i> Create ballot';
      DEPARTMENTS.forEach((d,i)=>{if($('ca-cap-'+i)) $('ca-cap-'+i).value='0';});
    });
    $('ca-department-chips')?.addEventListener('click',e=>{const btn=e.target.closest('[data-remove-department]');if(!btn)return;const list=formDepartments().filter(d=>d!==btn.dataset.removeDepartment);$('ca-departments-list').value=list.join(', ');renderDepartmentChips();});
    $('ca-ballots-body')?.addEventListener('click',e=>{
      const edit=e.target.closest('[data-edit-ballot]'); if(edit) return selectBallot(edit.dataset.editBallot);
      const action=e.target.closest('[data-ballot-action]');
      if(action) return ballotAction(action.dataset.id,action.dataset.ballotAction);
      const select=e.target.closest('[data-select-ballot]');
      if(select) selectBallot(select.dataset.selectBallot);
    });
    $('ca-preferences-body')?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-allocate]');
      if(btn) allocate(btn.dataset.allocate);
    });
  }
  async function init() {
    const panel = $('clinical-placements');
    if(!panel) return;
    // Let the existing Super Admin tab controller and .tab-content.active CSS control visibility.
    panel.style.removeProperty('display');
    bind();
    ensureDepartmentEditor();
    try {
      await loadBallots();
      setStatus('Connected. Create a ballot or select an existing one to manage preferences and allocations.',false);
    } catch(e) {
      console.error('[Clinical admin] Initial load failed:',e);
      setStatus('Could not load clinical rotation data: '+(e.message||'check session and RLS policies'),true);
      const body=$('ca-ballots-body');
      if(body) body.innerHTML='<tr><td colspan="7" class="ca-empty">Could not load ballots. Confirm you are signed in as an authorized administrator and refresh.</td></tr>';
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="clinical-placements"]')) setTimeout(()=>loadBallots().catch(err=>setStatus(err.message,true)),250);});
  window.NCHSMClinicalRotationAdmin={refresh:()=>loadBallots(),loadPreferences,selectBallot};
})();