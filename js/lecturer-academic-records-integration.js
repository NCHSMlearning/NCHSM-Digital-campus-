/* Compact DRMS bridge for the existing Lecturer Academic Portfolio. */
(function(){
  const profile=()=>window.lecturerDB?.getCurrentUserProfile?.()||window.currentLecturerProfile||null;
  const database=()=>window.lecturerDB?.supabase||window.supabaseClient||window.supabase||null;
  function syncContext(){
    const p=profile(), db=database();
    if(!p||!db) return false;
    // DRMS workflow uses the authenticated institutional profile and the existing Supabase session.
    window.currentUser={...p,user_id:p.user_id||p.id,full_name:p.full_name||p.name||p.email,email:p.email,role:String(p.role||'lecturer').toLowerCase(),program:p.program||p.department||'KRCHN'};
    window.sb=db;
    window.DRMS_MOUNT_ID='ap-content';
    return !!window.currentUser.user_id;
  }
  window.LecturerAcademicRecords={
    async open(){
      const mount=document.getElementById('ap-content');
      if(!mount) return;
      mount.innerHTML='<div style="padding:30px;text-align:center;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Opening academic records…</div>';
      if(!syncContext()){
        mount.innerHTML='<div style="padding:28px;border:1px solid #fee2e2;border-radius:12px;color:#991b1b;background:#fff7f7"><b>Academic records unavailable</b><p>Your authenticated lecturer profile or database session is not ready. Refresh the portal and try again.</p></div>';
        return;
      }
      if(typeof window.renderTeachingRecords!=='function'){
        mount.innerHTML='<div style="padding:28px;color:#991b1b">The academic records workflow did not load. Please refresh the portal.</div>';
        return;
      }
      await window.renderTeachingRecords();
    }
  };
  // Re-sync the profile before each DRMS action that depends on the logged-in user.
  document.addEventListener('click',e=>{
    if(e.target.closest('#ap-content')) syncContext();
  },true);
})();
