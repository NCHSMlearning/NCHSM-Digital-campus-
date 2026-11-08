/* NCHSM Digital Campus — secure lecturer profile and staff-document vault */
(function () {
  'use strict';

  const TABLE = 'consolidated_user_profiles_table';
  const DOC_TABLE = 'staff_profile_documents';
  const BUCKET = 'staff-profile-vault';
  const MAX_FILE = 10 * 1024 * 1024;
  const MAX_TOTAL = 50 * 1024 * 1024;
  let ready = false, busy = false, photoBusy = false;
  let saved = {}, currentDocs = [], privateDetails = {};

  const DOCS = [
    { type:'profile_photo', label:'Profile picture', group:'identity', required:true, accept:'image/jpeg,image/png', hint:'JPG or PNG image' },
    { type:'national_id', label:'National ID (copy)', group:'identity', required:true, accept:'.pdf,image/jpeg,image/png', hint:'PDF, JPG or PNG' },
    { type:'kra_pin', label:'KRA PIN certificate', group:'identity', required:false, accept:'.pdf,image/jpeg,image/png', hint:'PDF, JPG or PNG' },
    { type:'nssf_certificate', label:'NSSF certificate', group:'identity', required:true, accept:'.pdf,image/jpeg,image/png', hint:'PDF, JPG or PNG' },
    { type:'cv', label:'Curriculum vitae (CV)', group:'qualifications', required:true, accept:'.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', hint:'PDF or Word document' },
    { type:'highest_qualification', label:'College / university certificate', group:'qualifications', required:true, accept:'.pdf,image/jpeg,image/png', hint:'Your highest award · PDF, JPG or PNG' },
    { type:'transcripts', label:'Transcripts', group:'qualifications', required:true, accept:'.pdf,image/jpeg,image/png', hint:'PDF, JPG or PNG' },
    { type:'kcse_certificate', label:'Form Four certificate (KCSE)', group:'qualifications', required:true, accept:'.pdf,image/jpeg,image/png', hint:'PDF, JPG or PNG' },
    { type:'tvet_license', label:'TVET licence certificate', group:'licences', required:false, accept:'.pdf,image/jpeg,image/png', hint:'If applicable · PDF, JPG or PNG' },
    { type:'nursing_license', label:'Nursing licence certificate', group:'licences', required:false, accept:'.pdf,image/jpeg,image/png', hint:'If applicable · PDF, JPG or PNG' },
    { type:'nursing_certificate', label:'Nursing certificate', group:'licences', required:false, accept:'.pdf,image/jpeg,image/png', hint:'If applicable · PDF, JPG or PNG' }
  ];

  function $(id) { return document.getElementById(id); }
  function db() { return window.lecturerDB && window.lecturerDB.supabase; }
  function profile() { return window.lecturerDB && window.lecturerDB.getCurrentUserProfile && window.lecturerDB.getCurrentUserProfile(); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function bytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function dateLabel(v) {
    if (!v) return 'Date not recorded';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? 'Date not recorded' : d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }
  function status(msg, kind) {
    const el = $('lpStatus');
    if (el) { el.textContent = msg; el.dataset.kind = kind || 'info'; el.style.display = 'block'; }
  }
  function docFor(type) { return currentDocs.find(d => d.document_type === type); }
  function docDef(type) { return DOCS.find(d => d.type === type); }
  function roleLabel(p) {
    const role = String(p.role || 'Lecturer').replace(/_/g, ' ');
    const program = p.program || p.department || '';
    return role.replace(/\b\w/g, c => c.toUpperCase()) + (program ? ' · ' + program : '');
  }
  function avatarFallback(p) {
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.full_name || 'Lecturer') + '&background=4C1D95&color=fff&size=240';
  }
  function completion(p) {
    const requiredDocs = DOCS.filter(d => d.required);
    const docsDone = requiredDocs.filter(d => !!docFor(d.type)).length;
    const personalDone = [p.full_name, p.phone || p.phone_number, privateDetails.national_id, privateDetails.kra_pin, privateDetails.nssf_number].filter(v => String(v || '').trim()).length;
    const total = requiredDocs.length + 5;
    return Math.round(((docsDone + personalDone) / total) * 100);
  }
  function missingItems() {
    return DOCS.filter(d => d.required && !docFor(d.type)).map(d => d.label);
  }
  function docCard(def) {
    const d = docFor(def.type);
    const required = def.required ? '<span class="lp-required">Required</span>' : '<span class="lp-optional">Optional</span>';
    const uploaded = d
      ? '<div class="lp-doc-meta"><i class="fas fa-file-alt"></i> Uploaded ' + esc(dateLabel(d.uploaded_at)) + ' · ' + esc((d.mime_type || '').split('/').pop().toUpperCase()) + ' · ' + esc(bytes(d.file_size)) + '</div>' +
        '<div class="lp-doc-actions"><button type="button" class="lp-link-btn" data-view="' + esc(def.type) + '"><i class="fas fa-eye"></i> View</button><button type="button" class="lp-link-btn" data-download="' + esc(def.type) + '"><i class="fas fa-download"></i> Download</button><button type="button" class="lp-link-btn" data-upload="' + esc(def.type) + '"><i class="fas fa-sync-alt"></i> Replace</button><button type="button" class="lp-link-btn lp-danger" data-remove="' + esc(def.type) + '"><i class="fas fa-trash-alt"></i> Remove</button></div>'
      : '<div class="lp-doc-empty"><i class="fas fa-cloud-upload-alt"></i><span>Not uploaded yet</span><button type="button" class="lp-btn lp-btn-upload" data-upload="' + esc(def.type) + '"><i class="fas fa-upload"></i> Upload</button></div>';
    let uploadedState = 'Uploaded', uploadedClass = 'lp-state-done';
    if (d && def.type === 'tvet_license' && privateDetails.tvet_license_expires) {
      const expiry = new Date(privateDetails.tvet_license_expires + 'T23:59:59');
      uploadedState = expiry >= new Date() ? 'Valid' : 'Expired';
      uploadedClass = expiry >= new Date() ? 'lp-state-done' : 'lp-state-missing';
    }
    if (d && def.type === 'nursing_license' && privateDetails.nursing_license_expires) {
      const expiry = new Date(privateDetails.nursing_license_expires + 'T23:59:59');
      uploadedState = expiry >= new Date() ? 'Valid' : 'Expired';
      uploadedClass = expiry >= new Date() ? 'lp-state-done' : 'lp-state-missing';
    }
    const state = d ? '<span class="lp-doc-state ' + uploadedClass + '"><i class="fas fa-check-circle"></i> ' + uploadedState + '</span>' : (def.required ? '<span class="lp-doc-state lp-state-missing">Missing</span>' : '<span class="lp-doc-state lp-state-optional">Not supplied</span>');
    return '<article class="lp-doc-card lp-doc-card-polished ' + (d ? 'has-file' : 'is-empty') + '" data-doc-card="' + esc(def.type) + '">' +
      '<div class="lp-doc-card-top"><div class="lp-doc-icon"><i class="fas ' + (def.type === 'profile_photo' ? 'fa-image' : def.type === 'cv' ? 'fa-file-word' : 'fa-file-shield') + '"></i></div><div class="lp-doc-title"><strong>' + esc(def.label) + '</strong><small>' + esc(def.hint) + '</small></div></div>' +
      '<div class="lp-doc-status-row"><span class="' + (def.required ? 'lp-required' : 'lp-optional') + '">' + (def.required ? 'Required document' : 'Optional document') + '</span>' + state + '</div>' +
      (d ? uploaded : '<div class="lp-doc-upload-prompt"><i class="fas fa-cloud-arrow-up"></i><span>Keep a clear, readable copy ready to upload.</span></div>') +
      (d ? '' : '<button type="button" class="lp-doc-primary-upload" data-upload="' + esc(def.type) + '"><i class="fas fa-cloud-upload-alt"></i><span>Choose file to upload</span><i class="fas fa-arrow-right"></i></button>') +
      '<input class="lp-hidden-file" type="file" data-file-input="' + esc(def.type) + '" accept="' + esc(def.accept) + '" hidden>' +
      '</article>';
  }
  function render(p) {
    const root = $('profile-content');
    if (!root) return false;
    const name = p.full_name || 'Lecturer';
    const staffId = p.staff_id || p.employee_id || p.user_id || 'Not assigned';
    const email = p.email || (window.lecturerDB && window.lecturerDB.currentUser && window.lecturerDB.currentUser.email) || '';
    const docsTotal = currentDocs.reduce((n, d) => n + Number(d.file_size || 0), 0);
    const missing = missingItems();
    const pct = completion(p);
    const avatarDoc = docFor('profile_photo');
    const oldPhoto = p.profile_photo_url || p.passport_url || '';
    const photoSrc = oldPhoto || avatarFallback(p);

    root.innerHTML =
      '<div class="lp-shell lp-vault-shell">' +
        '<header class="lp-page-heading"><div><span class="lp-eyebrow-dark"><i class="fas fa-shield-alt"></i> STAFF RECORDS · PRIVATE WORKSPACE</span><h2>My profile</h2><p>Your details and supporting documents, kept encrypted. Only you and authorised administrators can access them.</p></div><button class="lp-btn lp-btn-light" id="lpReload" type="button"><i class="fas fa-sync-alt"></i> Refresh</button></header>' +
        '<div class="lp-profile-tools"><div class="lp-profile-trust"><i class="fas fa-user-shield"></i><span><strong>Private staff record</strong><small>Your files are stored in a private vault, not a public folder.</small></span></div><div class="lp-doc-search-wrap"><i class="fas fa-search"></i><input id="lpDocSearch" type="search" placeholder="Find a document…" aria-label="Find a profile document"><span id="lpDocCount">' + currentDocs.length + ' uploaded</span></div></div>' +
        '<section class="lp-profile-hero"><div class="lp-avatar-wrap"><img class="lp-avatar" id="lpAvatar" src="' + esc(photoSrc) + '" alt="Profile picture"><button class="lp-avatar-edit" type="button" data-upload="profile_photo" aria-label="Change profile picture"><i class="fas fa-camera"></i></button></div><div class="lp-identity"><h3>' + esc(name) + '</h3><p>' + esc(roleLabel(p)) + '</p><span><i class="fas fa-envelope"></i> ' + esc(email) + '</span><span><i class="fas fa-id-badge"></i> ' + esc(staffId) + '</span></div><div class="lp-completion"><div class="lp-completion-head"><strong>' + pct + '%</strong><span>Complete</span></div><div class="lp-progress"><span style="width:' + pct + '%"></span></div><small>' + (missing.length ? 'Still needed: ' + esc(missing.join(', ')) : 'All required documents are on file.') + '</small></div></section>' +
        '<div id="lpStatus" class="lp-status" role="status" aria-live="polite"></div>' +
        '<section class="lp-card lp-details-card"><div class="lp-section-heading"><div><span class="lp-section-kicker">YOUR INFORMATION</span><h3>Personal details</h3><p>Enter your official details as they appear on your identification documents.</p></div><i class="fas fa-user-edit"></i></div>' +
          '<form id="lpProfileForm" novalidate><div class="lp-form-grid">' +
            field('lpFullName','Full names (as on your ID)',name,'text','autocomplete="name" required') +
            field('lpNationalId','National ID number',privateDetails.national_id || '','text','autocomplete="off"') +
            field('lpKraPin','KRA PIN',privateDetails.kra_pin || '','text','autocomplete="off"') +
            field('lpNssf','NSSF number',privateDetails.nssf_number || '','text','autocomplete="off"') +
            field('lpPhone','Phone number',p.phone || p.phone_number || '','tel','autocomplete="tel" placeholder="+254..."') +
            field('lpStaffId','Staff ID',staffId,'text','readonly') +
            field('lpEmail','Email address',email,'email','readonly') +
            field('lpDepartment','Department / programme',p.department || p.program || '','text','readonly') +
          '</div><div class="lp-form-actions"><span class="lp-encryption-note"><i class="fas fa-lock"></i> National ID, KRA PIN and NSSF are encrypted before storage.</span><button class="lp-btn lp-btn-primary" id="lpSave" type="submit"><i class="fas fa-save"></i> Save details</button></div></form></section>' +
        '<section class="lp-card lp-doc-section"><div class="lp-section-heading"><div><span class="lp-section-kicker">IDENTITY VERIFICATION</span><h3>Identity</h3><p>Upload clear, readable copies of your identity documents.</p></div><i class="fas fa-id-card"></i></div><div class="lp-doc-grid">' + DOCS.filter(d => d.group === 'identity').map(docCard).join('') + '</div></section>' +
        '<section class="lp-card lp-doc-section"><div class="lp-section-heading"><div><span class="lp-section-kicker">ACADEMIC RECORD</span><h3>Qualifications</h3><p>Upload your CV, certificates and academic transcripts.</p></div><i class="fas fa-graduation-cap"></i></div><div class="lp-doc-grid">' + DOCS.filter(d => d.group === 'qualifications').map(docCard).join('') + '</div></section>' +
        '<section class="lp-card lp-doc-section"><div class="lp-section-heading"><div><span class="lp-section-kicker">PROFESSIONAL REGISTRATION</span><h3>Licences and nursing (if they apply to you)</h3><p>Leave licence details blank if they do not apply to your role.</p></div><i class="fas fa-certificate"></i></div>' +
          '<div class="lp-form-grid lp-license-grid">' +
            field('lpTvetNumber','TVET licence number',privateDetails.tvet_license_number || '','text','') +
            dateField('lpTvetExpiry','TVET licence expires',privateDetails.tvet_license_expires || '') +
            field('lpNursingNumber','Nursing licence number',privateDetails.nursing_license_number || '','text','') +
            dateField('lpNursingExpiry','Nursing licence expires',privateDetails.nursing_license_expires || '') +
          '</div><div class="lp-doc-grid lp-license-docs">' + DOCS.filter(d => d.group === 'licences').map(docCard).join('') + '</div>' +
          '<div class="lp-form-actions"><span class="lp-encryption-note"><i class="fas fa-info-circle"></i> Licence numbers and expiry dates are kept with your private staff record.</span><button class="lp-btn lp-btn-primary" id="lpSaveLicences" type="button"><i class="fas fa-save"></i> Save licence details</button></div></section>' +
        '<footer class="lp-vault-footer"><div><i class="fas fa-lock"></i> Private staff records · Access restricted to the account holder and authorised administrators</div><div>Accepted: PDF, JPG or PNG (CV also Word). Up to 10.0 MB each, and not more than 50.0 MB in total.</div><div>Every document action is recorded by the system.</div></footer>' +
        '<section class="lp-card lp-security-card"><details><summary><i class="fas fa-key"></i> Account security · Change password</summary><form id="lpPasswordForm" novalidate><div class="lp-form-grid">' +
          passwordField('lpCurrentPassword','Current password','current-password') + passwordField('lpNewPassword','New password','new-password') + passwordField('lpConfirmPassword','Confirm new password','new-password') +
        '</div><div class="lp-form-actions"><button class="lp-btn lp-btn-primary" id="lpChangePassword" type="submit"><i class="fas fa-key"></i> Update password</button></div></form></details></section>' +
        '<div class="lp-preview-modal" id="lpPreviewModal" aria-hidden="true"><div class="lp-preview-backdrop" data-preview-close></div><section class="lp-preview-panel" role="dialog" aria-modal="true" aria-labelledby="lpPreviewTitle"><header><div><span>SECURE DOCUMENT VIEWER</span><h3 id="lpPreviewTitle">Document preview</h3></div><div class="lp-preview-actions"><a id="lpPreviewDownload" class="lp-btn lp-btn-light" href="#" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download</a><button type="button" class="lp-preview-close" data-preview-close aria-label="Close preview"><i class="fas fa-times"></i></button></div></header><div class="lp-preview-body" id="lpPreviewBody"><div class="lp-preview-loading"><i class="fas fa-spinner fa-spin"></i> Preparing secure preview…</div></div></section></div>' +
      '</div>';

    const avatar = $('lpAvatar');
    if (avatar) avatar.onerror = function () { this.onerror = null; this.src = avatarFallback(p); };
    if (avatarDoc) getSignedUrl(avatarDoc.storage_path, false).then(url => { if (url && $('lpAvatar')) $('lpAvatar').src = url; }).catch(() => {});
    $('lpProfileForm').addEventListener('submit', saveProfile);
    $('lpSaveLicences').addEventListener('click', saveProfile);
    $('lpReload').addEventListener('click', reload);
    $('lpPasswordForm').addEventListener('submit', changePassword);
    root.onclick = handleDocumentAction;
    root.querySelectorAll('[data-file-input]').forEach(input => input.addEventListener('change', uploadDocument));
    $('lpDocSearch').addEventListener('input', filterDocuments);
    root.querySelectorAll('[data-preview-close]').forEach(el => el.addEventListener('click', closePreview));
    document.addEventListener('keydown', handlePreviewKeydown);
    saved = {
      full_name: name, phone: p.phone || p.phone_number || '',
      national_id: privateDetails.national_id || '', kra_pin: privateDetails.kra_pin || '',
      nssf_number: privateDetails.nssf_number || '',
      tvet_license_number: privateDetails.tvet_license_number || '',
      tvet_license_expires: privateDetails.tvet_license_expires || '',
      nursing_license_number: privateDetails.nursing_license_number || '',
      nursing_license_expires: privateDetails.nursing_license_expires || ''
    };
    return true;
  }
  function field(id, label, value, type, attrs) {
    return '<div class="lp-field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="' + type + '" value="' + esc(value) + '" ' + (attrs || '') + '></div>';
  }
  function dateField(id, label, value) {
    return '<div class="lp-field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="date" value="' + esc(value) + '"></div>';
  }
  function passwordField(id, label, autocomplete) {
    return '<div class="lp-field"><label for="' + id + '">' + esc(label) + ' *</label><input id="' + id + '" type="password" autocomplete="' + autocomplete + '" required ' + (id === 'lpNewPassword' || id === 'lpConfirmPassword' ? 'minlength="8"' : '') + '></div>';
  }
  async function loadPrivateDetails(userId) {
    const c = db();
    const { data, error } = await c.rpc('staff_profile_get_private_details', { p_user_id: userId || null });
    if (error) throw error;
    privateDetails = data || {};
  }
  async function loadDocuments() {
    const c = db(), p = profile();
    const { data, error } = await c.from(DOC_TABLE).select('*').eq('user_id', p.user_id).order('document_type');
    if (error) throw error;
    currentDocs = data || [];
  }
  async function reload() {
    try {
      const c = db(), p = profile();
      if (!c || !p || !p.user_id) throw new Error('Your sign-in session is not ready. Please sign in again.');
      const auth = await c.auth.getUser();
      if (auth.error) throw auth.error;
      if (!auth.data.user || auth.data.user.id !== p.user_id) throw new Error('Your session does not match the loaded staff profile.');
      const result = await c.from(TABLE).select('*').eq('user_id', p.user_id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('No staff profile record was found.');
      window.lecturerDB.currentUserProfile = result.data;
      if (window.LecturerProfile) window.LecturerProfile.profile = result.data;
      await Promise.all([loadPrivateDetails(), loadDocuments()]);
      render(result.data);
      status('Your profile and document list have been refreshed.', 'success');
    } catch (e) {
      console.error('[Lecturer Profile] Refresh failed', e);
      status('Could not refresh your profile: ' + e.message, 'error');
    }
  }
  async function saveProfile(e) {
    if (e) e.preventDefault();
    if (busy) return;
    const c = db(), p = profile();
    if (!c || !p || !p.user_id) { status('Authenticated profile is not ready. Sign in again.', 'error'); return; }
    const name = $('lpFullName').value.trim();
    const phone = $('lpPhone').value.trim();
    if (!name) { status('Full names are required.', 'error'); $('lpFullName').focus(); return; }
    busy = true;
    const buttons = [$('lpSave'), $('lpSaveLicences')].filter(Boolean);
    buttons.forEach(b => { b.disabled = true; b.dataset.old = b.innerHTML; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; });
    try {
      const updates = { full_name:name, phone, specialization:p.specialization || null, qualifications:p.qualifications || null, professional_bio:p.professional_bio || null };
      const updated = await c.from(TABLE).update(updates).eq('user_id', p.user_id).select('*').maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) throw new Error('No profile row was updated. Check your account permissions.');
      const privateResult = await c.rpc('staff_profile_save_private_details', {
        p_national_id: $('lpNationalId').value.trim() || null,
        p_kra_pin: $('lpKraPin').value.trim() || null,
        p_nssf_number: $('lpNssf').value.trim() || null,
        p_tvet_license_number: $('lpTvetNumber').value.trim() || null,
        p_tvet_license_expires: $('lpTvetExpiry').value || null,
        p_nursing_license_number: $('lpNursingNumber').value.trim() || null,
        p_nursing_license_expires: $('lpNursingExpiry').value || null
      });
      if (privateResult.error) throw privateResult.error;
      window.lecturerDB.currentUserProfile = updated.data;
      if (window.LecturerProfile) window.LecturerProfile.profile = updated.data;
      privateDetails = {
        national_id:$('lpNationalId').value.trim(), kra_pin:$('lpKraPin').value.trim(), nssf_number:$('lpNssf').value.trim(),
        tvet_license_number:$('lpTvetNumber').value.trim(), tvet_license_expires:$('lpTvetExpiry').value || null,
        nursing_license_number:$('lpNursingNumber').value.trim(), nursing_license_expires:$('lpNursingExpiry').value || null
      };
      render(updated.data);
      status('Your personal and professional details have been saved securely.', 'success');
    } catch (err) {
      console.error('[Lecturer Profile] Save failed', err);
      status('Could not save your details: ' + err.message, 'error');
    } finally {
      busy = false;
      buttons.forEach(b => { b.disabled = false; b.innerHTML = b.dataset.old || 'Save details'; });
    }
  }
  function validateFile(file, def) {
    if (!file) throw new Error('Choose a file first.');
    if (file.size > MAX_FILE) throw new Error('Each file must be 10 MB or smaller.');
    const allowed = def.type === 'cv'
      ? ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      : def.type === 'profile_photo'
        ? ['image/jpeg','image/png']
        : ['application/pdf','image/jpeg','image/png'];
    if (!allowed.includes(file.type)) throw new Error(def.type === 'cv' ? 'CV must be a PDF or Word document.' : 'Choose a PDF, JPG or PNG file.');
    if (file.size === 0) throw new Error('The selected file is empty.');
  }
  function handleDocumentAction(e) {
    const upload = e.target.closest('[data-upload]');
    if (upload) {
      const input = document.querySelector('[data-file-input="' + CSS.escape(upload.dataset.upload) + '"]');
      if (input) input.click();
      return;
    }
    const view = e.target.closest('[data-view]');
    if (view) { openDocument(view.dataset.view, false); return; }
    const download = e.target.closest('[data-download]');
    if (download) { openDocument(download.dataset.download, true); return; }
    const remove = e.target.closest('[data-remove]');
    if (remove) { removeDocument(remove.dataset.remove); }
  }
  async function uploadDocument(e) {
    const input = e.target, type = input.dataset.fileInput, file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const def = docDef(type), p = profile(), c = db();
    try {
      validateFile(file, def);
      if (!p || !p.user_id || !c) throw new Error('Your account is not ready. Sign in again.');
      const previous = docFor(type);
      const total = currentDocs.reduce((n, d) => n + Number(d.file_size || 0), 0) - Number(previous && previous.file_size || 0);
      if (total + file.size > MAX_TOTAL) throw new Error('Your staff documents cannot exceed 50 MB in total.');
      if (type === 'profile_photo' && photoBusy) return;
      photoBusy = type === 'profile_photo';
      status('Uploading ' + def.label.toLowerCase() + '…', 'info');
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') : 'bin';
      const path = p.user_id + '/' + type + '/' + crypto.randomUUID() + '.' + ext;
      const upload = await c.storage.from(BUCKET).upload(path, file, { upsert:false, contentType:file.type, cacheControl:'0' });
      if (upload.error) throw upload.error;
      const row = {
        user_id:p.user_id, document_type:type, storage_path:path,
        file_name:file.name, mime_type:file.type, file_size:file.size, uploaded_at:new Date().toISOString(), updated_at:new Date().toISOString()
      };
      const savedDoc = await c.from(DOC_TABLE).upsert(row, { onConflict:'user_id,document_type' }).select('*').single();
      if (savedDoc.error) {
        await c.storage.from(BUCKET).remove([path]);
        throw savedDoc.error;
      }
      if (previous && previous.storage_path && previous.storage_path !== path) {
        const removed = await c.storage.from(BUCKET).remove([previous.storage_path]);
        if (removed.error) console.warn('[Lecturer Profile] Previous document cleanup failed:', removed.error.message);
      }
      await loadDocuments();
      render(profile());
      status(def.label + ' uploaded successfully.', 'success');
    } catch (err) {
      console.error('[Lecturer Profile] Upload failed', err);
      status('Upload failed: ' + err.message, 'error');
    } finally { photoBusy = false; }
  }
  async function getSignedUrl(path, download) {
    const c = db();
    const options = download ? { download:true } : undefined;
    const result = await c.storage.from(BUCKET).createSignedUrl(path, 90, options);
    if (result.error) throw result.error;
    return result.data && result.data.signedUrl;
  }
  async function openDocument(type, download) {
    const doc = docFor(type);
    if (!doc) { status('This document has not been uploaded.', 'error'); return; }
    try {
      const audit = await db().rpc('staff_profile_log_document_access', {
        p_document_id: doc.id,
        p_action: download ? 'download' : 'view'
      });
      if (audit.error) throw audit.error;
      const url = await getSignedUrl(doc.storage_path, download);
      if (!url) throw new Error('A secure document link could not be created.');
      if (download) {
        const a = document.createElement('a');
        a.href = url; a.download = doc.file_name || ''; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        status('Secure download prepared.', 'success');
        return;
      }
      showPreview(doc, url);
    } catch (err) { status('Could not open this document: ' + err.message, 'error'); }
  }
  function showPreview(doc, url) {
    const modal = $('lpPreviewModal'), body = $('lpPreviewBody');
    if (!modal || !body) { status('Document viewer is unavailable. Refresh the page.', 'error'); return; }
    $('lpPreviewTitle').textContent = doc.file_name || (docDef(doc.document_type) || {}).label || 'Document preview';
    $('lpPreviewDownload').href = url;
    $('lpPreviewDownload').onclick = async function(e) {
      e.preventDefault();
      try {
        const audit = await db().rpc('staff_profile_log_document_access', { p_document_id:doc.id, p_action:'download' });
        if (audit.error) throw audit.error;
        const downloadUrl = await getSignedUrl(doc.storage_path, true);
        const a = document.createElement('a'); a.href = downloadUrl; a.download = doc.file_name || ''; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      } catch (err) { status('Download failed: ' + err.message, 'error'); }
    };
    const mime = String(doc.mime_type || '').toLowerCase();
    if (mime === 'application/pdf') {
      body.innerHTML = '<iframe class="lp-preview-frame" title="PDF document preview" src="' + esc(url) + '#toolbar=1&navpanes=0" loading="eager"></iframe>';
    } else if (mime.startsWith('image/')) {
      body.innerHTML = '<div class="lp-preview-image-wrap"><img src="' + esc(url) + '" alt="' + esc(doc.file_name || 'Uploaded document') + '"></div>';
    } else {
      body.innerHTML = '<div class="lp-preview-unavailable"><i class="fas fa-file-word"></i><h4>Preview not available for this file type</h4><p>This Word document is stored securely. Download it to view the full contents.</p><button type="button" class="lp-btn lp-btn-primary" id="lpWordDownload"><i class="fas fa-download"></i> Download document</button></div>';
      $('lpWordDownload').onclick = () => $('lpPreviewDownload').click();
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('lp-preview-open');
    const close = modal.querySelector('[data-preview-close]');
    if (close) close.focus();
  }
  function closePreview() {
    const modal = $('lpPreviewModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    const body = $('lpPreviewBody');
    if (body) body.innerHTML = '';
    document.body.classList.remove('lp-preview-open');
  }
  function handlePreviewKeydown(e) {
    if (e.key === 'Escape' && $('lpPreviewModal') && $('lpPreviewModal').classList.contains('is-open')) closePreview();
  }
  function filterDocuments() {
    const q = String($('lpDocSearch').value || '').trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll('#profile-content [data-doc-card]'));
    let visible = 0;
    cards.forEach(card => {
      const show = !q || card.textContent.toLowerCase().includes(q);
      card.hidden = !show;
      if (show) visible++;
    });
    const counter = $('lpDocCount');
    if (counter) counter.textContent = visible + ' of ' + cards.length + ' shown';
  }
  async function removeDocument(type) {
    const doc = docFor(type);
    if (!doc || !confirm('Remove ' + (docDef(type).label) + '? This cannot be undone.')) return;
    const c = db();
    try {
      status('Removing document…', 'info');
      const removed = await c.storage.from(BUCKET).remove([doc.storage_path]);
      if (removed.error) throw removed.error;
      const row = await c.from(DOC_TABLE).delete().eq('id', doc.id).eq('user_id', profile().user_id);
      if (row.error) throw row.error;
      await loadDocuments();
      render(profile());
      status(docDef(type).label + ' removed.', 'success');
    } catch (err) { status('Could not remove document: ' + err.message, 'error'); }
  }
  async function changePassword(e) {
    e.preventDefault();
    const c = db(), p = profile();
    const current = $('lpCurrentPassword').value, next = $('lpNewPassword').value, confirmValue = $('lpConfirmPassword').value;
    if (!c || !p || !p.email) { status('Account is not ready. Sign in again.', 'error'); return; }
    if (!current) { status('Enter your current password.', 'error'); return; }
    if (next.length < 8) { status('New password must contain at least 8 characters.', 'error'); return; }
    if (next === current) { status('Choose a password different from your current password.', 'error'); return; }
    if (next !== confirmValue) { status('Passwords do not match.', 'error'); return; }
    const btn = $('lpChangePassword'); btn.disabled = true; btn.dataset.old = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating…';
    try {
      const auth = await c.auth.getUser(); if (auth.error) throw auth.error;
      if (!auth.data.user) throw new Error('Session expired. Sign in again.');
      const verified = await c.auth.signInWithPassword({ email:p.email, password:current });
      if (verified.error) throw new Error('Current password could not be verified. ' + verified.error.message);
      if (!verified.data.user || verified.data.user.id !== p.user_id) throw new Error('Authentication identity did not match this lecturer.');
      const result = await c.auth.updateUser({ password:next }); if (result.error) throw result.error;
      $('lpCurrentPassword').value = ''; $('lpNewPassword').value = ''; $('lpConfirmPassword').value = '';
      status('Password updated successfully.', 'success');
    } catch (err) { status('Password update failed: ' + err.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = btn.dataset.old || 'Update password'; }
  }
  async function init() {
    if (ready) return;
    const p = profile(), c = db(), root = $('profile-content');
    if (!p || !p.user_id || !c || !root) return;
    try {
      await Promise.all([loadPrivateDetails(), loadDocuments()]);
      window.LecturerProfile.profile = p;
      ready = render(p);
      if (ready) console.log('[Lecturer Profile] Secure staff profile vault initialised.');
    } catch (err) {
      console.error('[Lecturer Profile] Initial load failed', err);
      root.innerHTML = '<div class="lp-shell"><div class="lp-status" data-kind="error">Your secure profile could not be loaded: ' + esc(err.message) + '. Please refresh or contact the administrator.</div></div>';
    }
  }
  function retry() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      init();
      if (ready || attempts >= 30) clearInterval(timer);
    }, 500);
  }
  window.LecturerProfile = {
    profile:null,
    refresh:reload,
    init:init,
    reload:reload
  };
  document.addEventListener('DOMContentLoaded', retry, { once:true });
  document.addEventListener('lecturerMainReady', init);
  document.addEventListener('nchsm:tabchanged', e => { if (e.detail && e.detail.tabId === 'profile') { if (!ready) init(); else reload(); } });
  window.addEventListener('load', retry, { once:true });
})();