/* Super Admin HOD role assignment */
(() => {
  const sbClient = () => window.sb || window.supabase || null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let hodRows = [], busy = false;
  async function requireSuperAdmin(client) {
    const {data:auth,error:authError}=await client.auth.getUser();
    if(authError||!auth?.user) throw new Error('Please sign in again.');
    const {data:profile,error}=await client.from('consolidated_user_profiles_table').select('role').eq('user_id',auth.user.id).maybeSingle();
    if(error) throw error;
    if(!['superadmin','super_admin'].includes(String(profile?.role||'').toLowerCase())) throw new Error('Only Super Admin can manage HOD roles.');
  }
  function notify(message,type='success') {
    if(typeof window.showToast==='function') return window.showToast(message,type);
    const n=document.getElementById('hodAccessNotice'); if(n){n.textContent=message;n.style.color=type==='error'?'#b91c1c':'#047857';} else alert(message);
  }
  function render() {
    const body=document.getElementById('hodAccessTableBody'); if(!body)return;
    const q=(document.getElementById('hodAccessSearch')?.value||'').toLowerCase().trim();
    const rows=hodRows.filter(p=>[p.full_name,p.email,p.staff_id,p.department,p.role].join(' ').toLowerCase().includes(q));
    if(!rows.length){body.innerHTML='<tr><td colspan="5" style="padding:24px;text-align:center;color:#64748b">No matching staff accounts found.</td></tr>';return;}
    body.innerHTML=rows.map(p=>{
      const role=String(p.role||'').toLowerCase(), isHod=['nursing_hod','tvet_hod','hod','head_of_department'].includes(role);
      const school=role==='nursing_hod'?'Nursing':role==='tvet_hod'?'TVET':(p.department||'—');
      const action=isHod
        ? '<button class="hod-revoke-btn" data-id="'+esc(p.user_id)+'" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer">Revoke HOD</button>'
        : '<select class="hod-role-select" aria-label="Select HOD school" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px"><option value="">Assign HOD…</option><option value="nursing_hod">Nursing HOD</option><option value="tvet_hod">TVET HOD</option></select><button class="hod-assign-btn" data-id="'+esc(p.user_id)+'" style="margin-left:6px;background:#0A3D62;color:white;border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer">Assign</button>';
      return '<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0"><strong>'+esc(p.full_name||'Unnamed staff')+'</strong><div style="font-size:12px;color:#64748b">'+esc(p.staff_id||'')+'</div></td><td style="padding:12px;border-bottom:1px solid #e2e8f0">'+esc(p.email||'—')+'</td><td style="padding:12px;border-bottom:1px solid #e2e8f0">'+esc(school)+'</td><td style="padding:12px;border-bottom:1px solid #e2e8f0"><span style="background:'+(isHod?'#dcfce7':'#f1f5f9')+';padding:5px 9px;border-radius:20px;font-size:12px;font-weight:700">'+esc(isHod?role.replace('_',' ').toUpperCase():(role||'—').toUpperCase())+'</span></td><td style="padding:12px;border-bottom:1px solid #e2e8f0;white-space:nowrap">'+action+'</td></tr>';
    }).join('');
    body.querySelectorAll('.hod-assign-btn').forEach(b=>b.addEventListener('click',()=>assign(b)));
    body.querySelectorAll('.hod-revoke-btn').forEach(b=>b.addEventListener('click',()=>revoke(b)));
  }
  async function load() {
    const client=sbClient(), body=document.getElementById('hodAccessTableBody'); if(!client||!body||busy)return;
    busy=true; body.innerHTML='<tr><td colspan="5" style="padding:24px;text-align:center">Loading staff accounts…</td></tr>';
    try {
      await requireSuperAdmin(client);
      const {data,error}=await client.from('consolidated_user_profiles_table').select('user_id,full_name,email,staff_id,department,program,role,status').in('role',['lecturer','nursing_hod','tvet_hod','hod','head_of_department']).order('full_name');
      if(error)throw error; hodRows=data||[]; render();
    } catch(e){body.innerHTML='<tr><td colspan="5" style="padding:24px;color:#b91c1c">'+esc(e.message||'Unable to load staff accounts')+'</td></tr>';notify(e.message||'Unable to load staff accounts','error');}
    finally{busy=false;}
  }
  async function assign(button) {
    const row=button.closest('tr'),role=row?.querySelector('.hod-role-select')?.value,id=button.dataset.id;
    if(!role)return notify('Choose Nursing HOD or TVET HOD first.','warning');
    const department=role==='nursing_hod'?'Nursing':'TVET',person=hodRows.find(p=>p.user_id===id);
    if(!person||!confirm('Assign '+(person.full_name||'this staff member')+' as '+department+' HOD?'))return;
    try{const client=sbClient();await requireSuperAdmin(client);
      const {error}=await client.from('consolidated_user_profiles_table').update({role,department,program:null,updated_at:new Date().toISOString()}).eq('user_id',id).eq('role','lecturer');
      if(error)throw error;notify(department+' HOD role assigned successfully.');await load();
    }catch(e){notify(e.message||'HOD role assignment failed.','error');}
  }
  async function revoke(button) {
    const id=button.dataset.id,person=hodRows.find(p=>p.user_id===id);
    if(!person||!confirm('Revoke HOD access for '+(person.full_name||'this person')+'? Their role will return to Lecturer.'))return;
    try{const client=sbClient();await requireSuperAdmin(client);
      const department=String(person.role).toLowerCase()==='tvet_hod'?'TVET':'Nursing';
      const {error}=await client.from('consolidated_user_profiles_table').update({role:'lecturer',department,program:person.program||null,updated_at:new Date().toISOString()}).eq('user_id',id).eq('role',person.role);
      if(error)throw error;notify('HOD access revoked.');await load();
    }catch(e){notify(e.message||'Could not revoke HOD access.','error');}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('hodAccessRefresh')?.addEventListener('click',load);
    document.getElementById('hodAccessSearch')?.addEventListener('input',render);
    document.querySelectorAll('[data-tab="hod-access"]').forEach(a=>a.addEventListener('click',()=>setTimeout(load,150)));
  });
  window.loadHodAccessManagement=load;
})();