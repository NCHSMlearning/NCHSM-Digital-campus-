/* NCHSM Digital Campus — unified Super Admin audit centre
 * Reads the protected server-side audit RPC. Never collects precise location silently.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { rows: [], page: 0, pageSize: 50, search: '', action: '', hasMore: false, loadingMore: false };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = () => {
    try {
      if (window.sb && typeof window.sb.rpc === 'function') return window.sb;
      if (window.supabaseClient && typeof window.supabaseClient.rpc === 'function') return window.supabaseClient;
      if (typeof supabase !== 'undefined' && supabase && typeof supabase.rpc === 'function') return supabase;
    } catch (_) {}
    return null;
  };
  const time = (v) => v ? new Intl.DateTimeFormat('en-KE', {dateStyle:'medium',timeStyle:'medium',timeZone:'Africa/Nairobi'}).format(new Date(v)) : '—';
  const actionLabel = (v) => String(v || 'EVENT').replace(/[_-]+/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  function actorDisplay(r) {
    const systemEvent = !r.actor_id && ['database_trigger','system','scheduled_job','edge_function'].includes(String(r.source || '').toLowerCase());
    return {
      name: r.actor_name || r.actor_email || (systemEvent ? 'System-generated event' : 'Actor not identified'),
      email: r.actor_email || (systemEvent ? 'No human account associated' : 'No email captured'),
      role: r.actor_role || (systemEvent ? 'Automated system' : 'Role not recorded')
    };
  }
  function shell() {
    const root = $('auditSecurityCenter');
    if (!root) return;
    root.innerHTML = `
      <div style="background:#082f49;color:white;padding:22px;border-radius:14px;margin:0 0 20px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
          <div><div style="font-size:22px;font-weight:800">System Audit &amp; Security Centre</div>
          <div style="opacity:.82;font-size:13px;margin-top:5px">Institution-wide activity • authentication • device sessions • security investigation</div></div>
          <button id="auditCentreRefresh" style="border:1px solid #94a3b8;background:#164e63;color:white;border-radius:8px;padding:9px 14px;cursor:pointer">↻ Refresh feed</button>
        </div>
      </div>
      <div id="auditCentreNotice" role="status" style="padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;margin-bottom:14px;color:#334155;background:#f8fafc">Loading secure audit feed…</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px">
        <div class="audit-kpi"><small>Events loaded</small><strong id="acTotal">—</strong></div>
        <div class="audit-kpi"><small>Successful logins</small><strong id="acLogins">—</strong></div>
        <div class="audit-kpi"><small>Failed attempts</small><strong id="acFailed">—</strong></div>
        <div class="audit-kpi"><small>Distinct accounts</small><strong id="acUsers">—</strong></div>
        <div class="audit-kpi"><small>Active sessions</small><strong id="acSessions">—</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:14px;margin-bottom:18px">
        <div class="audit-panel"><h3>Activity investigation</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="acSearch" type="search" placeholder="Search user, role, IP, action or record…" style="flex:1;min-width:200px;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
            <select id="acAction" style="padding:10px;border:1px solid #cbd5e1;border-radius:8px"><option value="">All event types</option><option value="login">Login</option><option value="logout">Logout</option><option value="LOGIN_FAILED">Failed login</option><option value="update">Record update</option><option value="insert">Record creation</option><option value="delete">Record deletion</option><optgroup label="Marks & Results"><option value="MARKS_VIEWED">Marks viewed</option><option value="MARKS_SEARCHED">Marks searched</option><option value="MARKS_EXPORT_REQUESTED">Marks export requested</option><option value="MARKS_EXPORTED">Marks exported</option><option value="MARKS_EDIT_ATTEMPTED">Marks edit attempted</option><option value="MARKS_UPDATED">Marks updated</option><option value="MARKS_DELETED">Marks deleted</option><option value="MARKS_ACCESS_BLOCKED">Marks access blocked</option><option value="MARKS_APPROVED">Marks approved</option><option value="MARKS_REJECTED">Marks rejected</option><option value="RESULTS_PUBLISHED">Results published</option><option value="RESULTS_UNPUBLISHED">Results unpublished</option></optgroup></select>
            <button id="acApply" style="padding:10px 14px;border:0;border-radius:8px;background:#0f766e;color:white">Search</button>
          </div>
          <p style="font-size:12px;color:#64748b;margin:10px 0 0">Times are displayed in East Africa Time (EAT). Search covers the latest 500 matching records.</p>
        </div>
        <div class="audit-panel"><h3>Geographic intelligence</h3>
          <div style="font-size:13px;color:#475569">IP addresses are recorded where supplied by the application or authentication provider. City-level mapping requires a configured IP-geolocation provider. Exact device location is not collected unless the user explicitly consents.</div>
          <div id="acMapStatus" style="margin-top:12px;padding:12px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:12px">No verified geographic coordinates are available in the current audit feed. Locations will not be guessed from IP addresses.</div>
        </div>
      </div>
      <div class="audit-panel" style="padding:0;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><h3 style="margin:0">Unified event timeline</h3><button id="acExport" style="padding:8px 12px;border:1px solid #cbd5e1;background:white;border-radius:8px">Export visible CSV</button></div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:1050px;font-size:12px">
          <thead style="background:#f1f5f9"><tr><th class="ac-th">Time (EAT)</th><th class="ac-th">User / Role</th><th class="ac-th">Event</th><th class="ac-th">Module / Source</th><th class="ac-th">Status</th><th class="ac-th">IP / Device</th><th class="ac-th">Details</th></tr></thead>
          <tbody id="acRows"><tr><td colspan="7" style="padding:28px;text-align:center;color:#64748b">Loading…</td></tr></tbody>
        </table></div>
        <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span id="acPageInfo" style="font-size:12px;color:#64748b"></span><div style="display:flex;gap:8px"><button id="acPrev" class="ac-page">Previous</button><button id="acNext" class="ac-page">Next</button></div></div>
      </div>`;
    const style = document.createElement('style');
    style.textContent = '.audit-kpi,.audit-panel{background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:14px;box-shadow:0 1px 2px #0f172a0a}.audit-kpi small{display:block;color:#64748b;font-size:11px;text-transform:uppercase}.audit-kpi strong{display:block;font-size:25px;color:#0f3b53;margin-top:5px}.audit-panel h3{font-size:15px;margin:0 0 12px;color:#0f3b53}.ac-th{text-align:left;padding:12px;color:#475569;white-space:nowrap}.ac-page{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:8px 12px;cursor:pointer;min-height:38px}.ac-page:disabled{cursor:not-allowed;opacity:.45}#acRows td{padding:11px 12px;border-top:1px solid #e2e8f0;vertical-align:top;color:#334155;overflow-wrap:anywhere}@media(max-width:700px){#auditSecurityCenter > div[style*="minmax(260px,1fr)"]{grid-template-columns:minmax(0,1fr)!important;width:100%;min-width:0}#auditSecurityCenter .audit-panel{border-radius:10px}#auditSecurityCenter .audit-kpi{min-width:0}#auditSecurityCenter .audit-kpi strong{font-size:21px}#auditSecurityCenter .ac-th{padding:9px 8px}#auditSecurityCenter #acPageInfo{max-width:55%;line-height:1.5}#auditSecurityCenter .ac-page{padding:8px 10px}}';
    root.appendChild(style);
    $('auditCentreRefresh').onclick = load;
    $('acApply').onclick = () => { state.search = $('acSearch').value.trim(); state.action = $('acAction').value; state.page = 0; load(); };
    $('acSearch').addEventListener('keydown', e => { if(e.key==='Enter') $('acApply').click(); });
    $('acPrev').onclick = () => { if(state.page>0){state.page--;render();} };
    $('acNext').onclick = async () => { if((state.page+1)*state.pageSize<state.rows.length){state.page++;render();return;} if(state.hasMore&&!state.loadingMore) await loadMore(); };
    $('acExport').onclick = exportCsv;
  }
  function render() {
    const start=state.page*state.pageSize, page=state.rows.slice(start,start+state.pageSize);
    $('acRows').innerHTML = page.length ? page.map(r => {
      const details = r.details || {};
      const description = details.description || details.details || details.failure_reason || '';
      const target = [details.target_table,details.target_id].filter(Boolean).join(' / ');
      const before = details.old_data || null;
      const after = details.new_data || null;
      const fieldLabels = {cat1_score:'CAT 1',cat2_score:'CAT 2',exam_score:'Exam',final_score:'Final score',grade:'Grade',points:'Grade points',approval_status:'Approval',published:'Published',published_at:'Published at',approved_by:'Approved by'};
      const changed = [];
      if(before||after) Object.keys(fieldLabels).forEach(key=>{
        const oldValue=before?.[key],newValue=after?.[key];
        if(JSON.stringify(oldValue)!==JSON.stringify(newValue)) changed.push(fieldLabels[key]+': '+(oldValue===undefined?'—':String(oldValue))+' → '+(newValue===undefined?'—':String(newValue)));
      });
      const student = [after?.student_name||before?.student_name,after?.admission_number||before?.admission_number].filter(Boolean).join(' · ');
      const unit = [after?.subject_name||before?.subject_name,after?.block||before?.block,after?.program||before?.program].filter(Boolean).join(' / ');
      const status = String(r.status||'UNKNOWN').toUpperCase();
      const color = status==='SUCCESS'?'#047857':status==='FAILURE'?'#b91c1c':'#64748b';
      const actor = actorDisplay(r);
      return '<tr><td>'+esc(time(r.event_time))+'</td><td><strong>'+esc(actor.name)+'</strong><br><span style="color:#64748b">'+esc(actor.email)+'</span><br><small>'+esc(actor.role)+'</small></td><td><strong>'+esc(actionLabel(r.action))+'</strong></td><td>'+esc(r.module||'—')+'<br><small style="color:#64748b">'+esc(r.source||'—')+'</small></td><td><strong style="color:'+color+'">'+esc(status)+'</strong></td><td>'+esc(r.ip_address||'IP unavailable')+'<br><small>'+esc(r.user_agent||'Device details unavailable')+'</small></td><td>'+(student?'<strong>'+esc(student)+'</strong><br>':'')+(unit?'<small>'+esc(unit)+'</small><br>':'')+esc(description||'No description recorded')+(changed.length?'<div style="margin-top:7px;padding:7px;background:#f8fafc;border-radius:6px"><strong>Before → after</strong><br>'+changed.map(esc).join('<br>')+'</div>':'')+(target?'<br><small>Target: '+esc(target)+'</small>':'')+'</td></tr>';
    }).join('') : '<tr><td colspan="7" style="padding:28px;text-align:center;color:#64748b">No matching audit events were returned.</td></tr>';
    $('acPageInfo').textContent = 'Showing '+(state.rows.length?start+1:0)+'–'+Math.min(start+page.length,state.rows.length)+' of '+state.rows.length+' loaded events';
    $('acPrev').disabled=state.page===0; $('acNext').disabled=start+state.pageSize>=state.rows.length&&!state.hasMore;
  }
  function exportCsv() {
    const cols=['event_time','actor_email','actor_name','actor_role','action','source','status','ip_address','user_agent','module','target_table','target_id','description','old_data','new_data','details'];
    const csv=[cols.join(','),...state.rows.map(r=>cols.map(k=>{const d=r.details||{};let v=k==='details'?JSON.stringify(d):k==='old_data'?JSON.stringify(d.old_data||''):k==='new_data'?JSON.stringify(d.new_data||''):k==='target_table'?d.target_table||'':k==='target_id'?d.target_id||'':k==='description'?d.description||d.details||'':(r[k]??'');return '"'+String(v).replace(/"/g,'""')+'"';}).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='nchsm-audit-events.csv';a.click();URL.revokeObjectURL(url);
  }
  async function loadMore(){
    const db=client();if(!db||state.loadingMore)return;
    state.loadingMore=true;
    const next=$('acNext');if(next){next.disabled=true;next.textContent='Loading…';}
    try{
      const {data,error}=await db.rpc('get_superadmin_audit_events',{p_limit:500,p_offset:state.rows.length,p_action:state.action||null,p_search:state.search||null});
      if(error)throw error;
      const batch=Array.isArray(data)?data:[];
      state.rows=state.rows.concat(batch);state.hasMore=batch.length===500;render();
    }catch(e){console.error('Could not load older audit events:',e);if($('auditCentreNotice'))$('auditCentreNotice').textContent='Older audit events could not be loaded: '+(e.message||'Unknown error');}
    finally{state.loadingMore=false;if(next)next.textContent='Next';}
  }
  async function load() {
    const db=client();
    const notice=$('auditCentreNotice');
    if(!db){notice.textContent='Secure database client was not found on this page. Audit feed could not be loaded.';return;}
    notice.textContent='Loading protected audit records…';
    try {
      const {data,error}=await db.rpc('get_superadmin_audit_events',{p_limit:500,p_offset:0,p_action:state.action||null,p_search:state.search||null});
      if(error) throw error;
      state.rows=Array.isArray(data)?data:[];
      state.hasMore=state.rows.length===500;
      const rows=state.rows;
      const logins=rows.filter(r=>['login','user_signedup'].includes(String(r.action||'').toLowerCase())&&String(r.status).toUpperCase()==='SUCCESS').length;
      const failed=rows.filter(r=>String(r.status).toUpperCase()==='FAILURE'||String(r.action||'').toLowerCase().includes('fail')).length;
      const users=new Set(rows.map(r=>r.actor_id||r.actor_email).filter(Boolean));
      $('acTotal').textContent=rows.length.toLocaleString();
      $('acLogins').textContent=logins.toLocaleString();
      $('acFailed').textContent=failed.toLocaleString();
      $('acUsers').textContent=users.size.toLocaleString();
      let sessions='—';
      try { const q=await db.from('user_sessions').select('id',{count:'exact',head:true}).eq('is_active',true); if(!q.error) sessions=(q.count||0).toLocaleString(); } catch(_){}
      $('acSessions').textContent=sessions;
      notice.textContent='Secure feed loaded. '+rows.length+' events returned. System-generated events are distinguished from signed-in users; missing identity fields are not guessed.';
      render();
      const total=$('auditTotalEvents'); if(total) total.textContent=rows.length.toLocaleString();
      const failedEl=$('auditFailedAttempts'); if(failedEl) failedEl.textContent=failed.toLocaleString();
      const updated=$('auditLastUpdated'); if(updated) updated.textContent=time(new Date().toISOString());
    } catch(err) {
      console.error('[Audit Centre]',err);
      notice.textContent='Unable to load audit feed: '+(err.message||'Access denied or service unavailable')+'. Confirm your Super Admin role and database migration.';
      $('acRows').innerHTML='<tr><td colspan="7" style="padding:28px;color:#b91c1c;text-align:center">Audit feed unavailable. No records have been modified.</td></tr>';
    }
  }
  window.refreshAuditLogs=load;
  window.exportAuditLogsToCSV=exportCsv;
  window.exportSecurityAudit=exportCsv;
  window.applyAuditFilters=()=>{state.search=$('acSearch')?.value.trim()||'';state.action=$('acAction')?.value||'';state.page=0;load();};
  window.resetAuditFilters=()=>{state.search='';state.action='';state.page=0;if($('acSearch'))$('acSearch').value='';if($('acAction'))$('acAction').value='';load();};
  window.changeAuditEntriesPerPage=()=>{};
  window.setAuditView=()=>{};
  window.changeAuditPage=()=>{};
  window.sortAuditTable=()=>{};
  window.manualCleanAuditLogs=()=>{ if(window.showNotification) window.showNotification('Audit records are retained as evidence. Automatic deletion is disabled.','info'); else alert('Audit records are retained as evidence. Automatic deletion is disabled.'); };
  function init(){ shell(); load(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();