/* NCHSM Super Admin portal navigation, authentication and view control */
(function(){
'use strict';
const SUPABASE_URL='https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsd2h0am96ZnNtYnllaGVuZnVudyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzU5NjU4MTI3LCJleHAiOjIwNzUyMzQxMjN9.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
async function boot(){
 if(!window.supabase?.createClient){alert('Supabase could not be loaded. Refresh and try again.');return;}
 const sb=window.supabaseClient||window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 window.supabaseClient=sb;
 const auth=await sb.auth.getUser();
 if(auth.error||!auth.data?.user){location.replace('login.html');return;}
 const profile=await sb.from('consolidated_user_profiles_table').select('role,full_name').eq('user_id',auth.data.user.id).maybeSingle();
 const role=String(profile.data?.role||'').toLowerCase().replace(/[- ]/g,'_');
 if(profile.error||!['superadmin','super_admin'].includes(role)){alert('Super Admin access required.');location.replace('login.html');return;}
 window.currentSuperAdmin={user:auth.data.user,profile:profile.data||{}};
 document.querySelectorAll('[data-view]').forEach(link=>link.addEventListener('click',e=>{
  e.preventDefault();const id=link.dataset.view;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  document.querySelectorAll('#superadmin-nav a').forEach(a=>a.classList.toggle('active',a.dataset.view===id));
  const title=link.querySelector('span')?.textContent||link.textContent.trim();
  document.getElementById('page-title').textContent=title;
  if(id==='research-topic-vault-view')window.dispatchEvent(new CustomEvent('nchsm:research-vault-open'));
 }));
 document.getElementById('signout').addEventListener('click',async()=>{await sb.auth.signOut();location.replace('login.html');});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();