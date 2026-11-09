/* Director authentication boundary. Fail visibly rather than leaving the workspace in an endless loading state. */
(function(w){'use strict';
const ALLOWED=new Set(['director','institutional_director','college_director']);
const norm=v=>String(v||'').trim().toLowerCase().replace(/[\\s-]+/g,'_');
function withTimeout(promise,label,ms=15000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out. Check your connection and refresh the page.')),ms);})]).finally(()=>clearTimeout(timer));}
function showError(message){const el=document.getElementById('directorContent');if(el)el.innerHTML='<div class="d-card"><h3>Unable to verify Director access</h3><p class="d-sub">'+String(message).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</p><button class="d-btn primary" type="button" onclick="location.reload()">Retry verification</button></div>';}
async function requireDirector(){
 const client=w.sb||w.supabaseClient;
 if(!client?.auth?.getSession||!client?.from){const e=new Error('Supabase client is unavailable. Reload the page and try again.');showError(e.message);throw e;}
 try{
  const sessionResult=await withTimeout(client.auth.getSession(),'Supabase session check');
  if(sessionResult.error)throw sessionResult.error;
  let user=sessionResult.data?.session?.user||null;
  if(!user){location.replace('director-login.html');throw new Error('Redirecting to Director sign-in.');}
  const profileResult=await withTimeout(client.from('consolidated_user_profiles_table').select('user_id,full_name,email,role,department,program,status').eq('user_id',user.id).maybeSingle(),'Director profile lookup');
  if(profileResult.error)throw new Error('Unable to read the institutional profile: '+profileResult.error.message);
  const profile=profileResult.data;
  const role=norm(profile?.role);
  if(!profile||!ALLOWED.has(role)){const e=new Error('This account does not have an authorised Director role in the institutional profile. Contact the Super Admin.');showError(e.message);throw e;}
  if(profile.status&&['inactive','disabled','suspended','blocked'].includes(norm(profile.status))){const e=new Error('This institutional account is not active. Contact the Super Admin.');showError(e.message);throw e;}
  return{client,user,profile,role};
 }catch(error){showError(error?.message||'An unexpected authentication error occurred.');throw error;}
}
w.DirectorAuth={requireDirector};
})(window);
