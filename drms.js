// Supabase Configuration
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

let currentUser = null;
let allStudents = [];
let allDocuments = [];
let auditLogs = [];
let currentSchoolFilter = 'all';

function showToast(msg, isErr = false) {
    const toast = document.getElementById('drmsToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = isErr ? '#c53030' : '#2e7d64';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

async function addAuditLog(action, details, docId = null) {
    try {
        await sb.from('drms_audit_logs').insert([{
            user_id: currentUser?.user_id || 'SYSTEM',
            user_name: currentUser?.full_name || 'System',
            action, details, document_id: docId, created_at: new Date().toISOString()
        }]);
    } catch(e) { console.error(e); }
}

function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

async function loadStudents() {
    const { data, error } = await sb.from('consolidated_user_profiles_table').select('*').eq('role', 'student').order('full_name');
    if (!error) allStudents = data || [];
    return allStudents;
}

async function loadDocuments() {
    const { data, error } = await sb.from('drms_documents').select('*').order('created_at', false);
    if (!error) allDocuments = data || [];
    return allDocuments;
}

async function loadAuditLogs() {
    const { data, error } = await sb.from('drms_audit_logs').select('*').order('created_at', false).limit(100);
    if (!error) auditLogs = data || [];
    return auditLogs;
}

// Dashboard
async function renderDashboard() {
    await loadDocuments(); await loadStudents();
    const totalDocs = allDocuments.length;
    const studentsWithDocs = [...new Set(allDocuments.map(d => d.student_id))].length;
    const recentUploads = allDocuments.filter(d => new Date(d.created_at) > new Date(Date.now() - 30*86400000)).length;
    const recentDocs = allDocuments.slice(0, 10);
    let recentHtml = '';
    for (const doc of recentDocs) {
        const student = allStudents.find(s => s.user_id === doc.student_id);
        recentHtml += `<tr><td>${escapeHtml(student?.full_name || 'Unknown')}</td><td>${escapeHtml(doc.title)}</td><td><span class="drms-badge drms-badge-${doc.category?.toLowerCase()}">${doc.category}</span></td><td>${new Date(doc.created_at).toLocaleDateString()}</td><td><button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewDocument(${doc.id})"><i class="fas fa-eye"></i></button></td></tr>`;
    }
    document.getElementById('drmsMainContent').innerHTML = `
        <div class="drms-stats-grid">
            <div class="drms-stat-card"><div class="drms-stat-number">${totalDocs}</div><div>Total Documents</div></div>
            <div class="drms-stat-card"><div class="drms-stat-number">${studentsWithDocs}</div><div>Students with Docs</div></div>
            <div class="drms-stat-card"><div class="drms-stat-number">${recentUploads}</div><div>Uploads (30 days)</div></div>
            <div class="drms-stat-card"><div class="drms-stat-number">${allStudents.length}</div><div>Total Students</div></div>
        </div>
        <div class="drms-table-container"><h3 style="padding:1rem">📋 Recent Documents</h3><table class="drms-table"><thead><tr><th>Student</th><th>Title</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead><tbody>${recentHtml || '<tr><td colspan="5">No documents</td></tr>'}</tbody></table></div>`;
}

// Student Records with School Filter
async function renderStudentRecords() {
    await loadStudents();
    const krchnStudents = allStudents.filter(s => s.program === 'KRCHN');
    const tvetStudents = allStudents.filter(s => s.program !== 'KRCHN');
    const displayed = currentSchoolFilter === 'all' ? allStudents : (currentSchoolFilter === 'krchn' ? krchnStudents : tvetStudents);
    let studentsHtml = '';
    for (const s of displayed) {
        const { count } = await sb.from('drms_documents').select('*', { count: 'exact', head: true }).eq('student_id', s.user_id);
        studentsHtml += `<tr><td><strong>${escapeHtml(s.full_name)}</strong><br><small>${escapeHtml(s.email)}</small></td><td><span class="drms-program-badge drms-program-${s.program === 'KRCHN' ? 'krchn' : 'tvet'}">${escapeHtml(s.program)}</span></td><td>${escapeHtml(s.intake_year || '-')}</td><td>${escapeHtml(s.block || '-')}</td><td>${count || 0}</td><td><button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewStudentCompleteRecord('${s.user_id}')"><i class="fas fa-folder-open"></i> View</button><button class="drms-btn drms-btn-sm drms-btn-outline" onclick="openEditStudentModal('${s.user_id}')"><i class="fas fa-edit"></i> Edit</button></td></tr>`;
    }
    document.getElementById('drmsMainContent').innerHTML = `
        <div class="school-tabs"><div class="school-tab ${currentSchoolFilter === 'all' ? 'active' : ''}" onclick="setSchoolFilter('all')">All Schools</div><div class="school-tab ${currentSchoolFilter === 'krchn' ? 'active' : ''}" onclick="setSchoolFilter('krchn')">🎓 KRCHN Nursing</div><div class="school-tab ${currentSchoolFilter === 'tvet' ? 'active' : ''}" onclick="setSchoolFilter('tvet')">🛠️ TVET Programs</div></div>
        <div class="drms-search-bar"><input type="text" id="studentSearchInput" class="drms-search-input" placeholder="Search by name, email..."><button id="searchBtn" class="drms-btn drms-btn-primary">Search</button><button id="resetBtn" class="drms-btn drms-btn-outline">Reset</button></div>
        <div class="drms-table-container"><table class="drms-table"><thead><tr><th>Name</th><th>Program</th><th>Intake</th><th>Block</th><th>Docs</th><th>Actions</th></tr></thead><tbody id="studentsTableBody">${studentsHtml}</tbody></table></div>`;
    document.getElementById('searchBtn')?.addEventListener('click', () => { const term = document.getElementById('studentSearchInput').value.toLowerCase(); document.querySelectorAll('#studentsTableBody tr').forEach(r => { r.style.display = r.innerText.toLowerCase().includes(term) ? '' : 'none'; }); });
    document.getElementById('resetBtn')?.addEventListener('click', () => { document.getElementById('studentSearchInput').value = ''; document.querySelectorAll('#studentsTableBody tr').forEach(r => r.style.display = ''); });
}

window.setSchoolFilter = function(filter) { currentSchoolFilter = filter; renderStudentRecords(); };

// View Student Complete Record
async function viewStudentCompleteRecord(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    const { data: docs } = await sb.from('drms_documents').select('*').eq('student_id', studentId).order('created_at', true);
    await addAuditLog('VIEW_RECORD', `Viewed complete record for ${student?.full_name}`);
    let timeline = '';
    for (const doc of docs || []) {
        timeline += `<div class="drms-timeline-item"><div class="drms-timeline-date">${new Date(doc.created_at).toLocaleDateString()}</div><div class="drms-timeline-title"><span class="drms-badge drms-badge-${doc.category?.toLowerCase()}">${doc.category}</span> <strong>${escapeHtml(doc.title)}</strong></div><div>${escapeHtml(doc.description || '')}</div><div><button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewDocument(${doc.id})">View</button></div></div>`;
    }
    document.getElementById('studentRecordTitle').innerHTML = `<i class="fas fa-user-graduate"></i> ${escapeHtml(student?.full_name)} - Complete Record`;
    document.getElementById('studentRecordBody').innerHTML = `<div class="drms-student-profile"><div class="drms-student-avatar"><i class="fas fa-user-graduate fa-2x"></i></div><div><h3>${escapeHtml(student?.full_name)}</h3><p><strong>Program:</strong> ${escapeHtml(student?.program)} | <strong>Intake:</strong> ${escapeHtml(student?.intake_year)} | <strong>Block:</strong> ${escapeHtml(student?.block)}</p></div></div><div class="drms-timeline">${timeline || '<div class="drms-empty">No documents found</div>'}</div>`;
    document.getElementById('studentRecordModal').style.display = 'flex';
}

// Upload Document
async function renderUploadView() {
    await loadStudents();
    const options = allStudents.map(s => `<option value="${s.user_id}">${escapeHtml(s.full_name)} (${s.program})</option>`).join('');
    document.getElementById('drmsMainContent').innerHTML = `
        <div class="drms-search-bar"><h3>Upload Document</h3></div>
        <div style="background:white;padding:1.5rem;border-radius:16px;"><form id="uploadForm"><div class="drms-form-group"><label>Student</label><select id="uploadStudentId" class="drms-select" required>${options}</select></div>
        <div class="drms-form-group"><label>Title</label><input type="text" id="docTitle" class="drms-input" required></div>
        <div class="drms-form-group"><label>Category</label><select id="docCategory" class="drms-select"><option value="Admission">Admission</option><option value="Academic">Academic</option><option value="Financial">Financial</option><option value="Medical">Medical</option></select></div>
        <div class="drms-form-group"><label>Description</label><textarea id="docDescription" class="drms-textarea" rows="2"></textarea></div>
        <div class="drms-form-group"><label>File</label><input type="file" id="docFile" accept=".pdf,.jpg,.png,.doc,.docx" required></div>
        <div class="drms-form-actions"><button type="submit" class="drms-btn drms-btn-success">Upload</button></div></form></div>`;
    document.getElementById('uploadForm')?.addEventListener('submit', handleUpload);
}

async function handleUpload(e) {
    e.preventDefault();
    const studentId = document.getElementById('uploadStudentId').value;
    const title = document.getElementById('docTitle').value.trim();
    const category = document.getElementById('docCategory').value;
    const description = document.getElementById('docDescription').value.trim();
    const file = document.getElementById('docFile').files[0];
    if (!studentId || !title || !file) { showToast('Fill all required fields', true); return; }
    const fileName = `${studentId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `drms/${studentId}/${fileName}`;
    const { error: uploadError } = await sb.storage.from('drms_files').upload(filePath, file);
    if (uploadError) { showToast('Upload failed: ' + uploadError.message, true); return; }
    const { data: { publicUrl } } = sb.storage.from('drms_files').getPublicUrl(filePath);
    await sb.from('drms_documents').insert([{ student_id: studentId, title, category, description, file_name: file.name, file_url: publicUrl, file_size: `${(file.size/1024).toFixed(2)} KB`, uploaded_by: currentUser?.user_id, created_at: new Date().toISOString() }]);
    await addAuditLog('UPLOAD', `Uploaded: ${title}`);
    showToast('Uploaded successfully!');
    document.getElementById('uploadForm').reset();
    renderUploadView();
}

// Bulk Upload
async function renderBulkUpload() {
    await loadStudents();
    const options = allStudents.map(s => `<option value="${s.user_id}">${escapeHtml(s.full_name)} (${s.program})</option>`).join('');
    document.getElementById('drmsMainContent').innerHTML = `
        <div class="drms-search-bar"><h3>Bulk Upload Documents</h3><p>Select multiple files at once - all will be uploaded for the selected student</p></div>
        <div style="background:white;padding:1.5rem;border-radius:16px;"><form id="bulkForm"><div class="drms-form-group"><label>Student</label><select id="bulkStudentId" class="drms-select" required>${options}</select></div>
        <div class="drms-form-group"><label>Multiple Files</label><input type="file" id="bulkFiles" multiple accept=".pdf,.jpg,.png,.doc,.docx" required></div>
        <div class="drms-form-group"><label>Default Category</label><select id="bulkCategory" class="drms-select"><option value="Admission">Admission</option><option value="Academic">Academic</option><option value="Financial">Financial</option></select></div>
        <div class="drms-form-actions"><button type="submit" class="drms-btn drms-btn-success">Upload All (${document.getElementById('bulkFiles')?.files?.length || 0})</button></div></form></div>`;
    document.getElementById('bulkForm')?.addEventListener('submit', handleBulkUpload);
    document.getElementById('bulkFiles')?.addEventListener('change', (e) => { const btn = document.querySelector('#bulkForm button'); if(btn) btn.innerHTML = `Upload All (${e.target.files.length})`; });
}

async function handleBulkUpload(e) {
    e.preventDefault();
    const studentId = document.getElementById('bulkStudentId').value;
    const files = document.getElementById('bulkFiles').files;
    const defaultCategory = document.getElementById('bulkCategory').value;
    if (!studentId || files.length === 0) { showToast('Select student and files', true); return; }
    let success = 0, failed = 0;
    for (const file of files) {
        const title = file.name.replace(/\.[^/.]+$/, '').substring(0, 100);
        const fileName = `${studentId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `drms/${studentId}/${fileName}`;
        const { error } = await sb.storage.from('drms_files').upload(filePath, file);
        if (error) { failed++; continue; }
        const { data: { publicUrl } } = sb.storage.from('drms_files').getPublicUrl(filePath);
        await sb.from('drms_documents').insert([{ student_id: studentId, title, category: defaultCategory, file_name: file.name, file_url: publicUrl, file_size: `${(file.size/1024).toFixed(2)} KB`, uploaded_by: currentUser?.user_id, created_at: new Date().toISOString() }]);
        success++;
    }
    await addAuditLog('BULK_UPLOAD', `Uploaded ${success} documents`);
    showToast(`Uploaded: ${success} success, ${failed} failed`);
    renderBulkUpload();
}

// View Document
async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    await addAuditLog('VIEW', `Viewed: ${doc.title}`, docId);
    const modal = document.getElementById('docViewerModal');
    document.getElementById('viewerTitle').innerHTML = `<i class="fas fa-file"></i> ${escapeHtml(doc.title)}`;
    const iframe = document.getElementById('documentIframe');
    if (doc.file_url.endsWith('.pdf')) iframe.src = doc.file_url;
    else iframe.srcdoc = `<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;"><div><i class="fas fa-file-alt" style="font-size:48px;"></i><h3>${escapeHtml(doc.title)}</h3><p><a href="${doc.file_url}" target="_blank">Click to download</a></p></div></body></html>`;
    document.getElementById('downloadDocBtn').onclick = () => window.open(doc.file_url, '_blank');
    modal.style.display = 'flex';
}

// Edit Student
async function openEditStudentModal(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    document.getElementById('editStudentId').value = student.user_id;
    document.getElementById('editFullName').value = student.full_name || '';
    document.getElementById('editEmail').value = student.email || '';
    document.getElementById('editProgram').value = student.program || 'KRCHN';
    document.getElementById('editIntakeYear').value = student.intake_year || '';
    document.getElementById('editBlock').value = student.block || '';
    document.getElementById('editStatus').value = student.status || 'active';
    document.getElementById('editStudentModal').style.display = 'flex';
}

document.getElementById('editStudentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('editStudentId').value;
    const updates = {
        full_name: document.getElementById('editFullName').value,
        email: document.getElementById('editEmail').value,
        program: document.getElementById('editProgram').value,
        intake_year: document.getElementById('editIntakeYear').value,
        block: document.getElementById('editBlock').value,
        status: document.getElementById('editStatus').value,
        updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('consolidated_user_profiles_table').update(updates).eq('user_id', userId);
    if (error) { showToast('Update failed: ' + error.message, true); return; }
    await addAuditLog('EDIT_STUDENT', `Edited student: ${updates.full_name}`);
    showToast('Student updated successfully!');
    closeEditStudentModal();
    renderStudentRecords();
});

// Export PDF
window.exportStudentRecordPDF = function() { showToast('PDF Export - would generate in production'); };

// Audit Trail
async function renderAudit() {
    await loadAuditLogs();
    let html = '';
    for (const log of auditLogs) html += `<tr><td>${new Date(log.created_at).toLocaleString()}</td><td>${escapeHtml(log.user_name)}</small></small></small></td><td>${escapeHtml(log.action)}</small></small></small></td><td>${escapeHtml(log.details)}</small></small></small></td>`;
    document.getElementById('drmsMainContent').innerHTML = `<div class="drms-search-bar"><input type="text" id="auditSearch" placeholder="Search..."></div><div class="drms-table-container"><table class="drms-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody id="auditBody">${html || '<td><td colspan="4">No logs</td></tr>'}</tbody>}</div>`;
    document.getElementById('auditSearch')?.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); document.querySelectorAll('#auditBody tr').forEach(r => r.style.display = r.innerText.toLowerCase().includes(term) ? '' : 'none'); });
}

// Categories & Retention
function renderCategories() {
    document.getElementById('drmsMainContent').innerHTML = `<div class="drms-table-container"><h3 style="padding:1rem">Document Categories & Retention</h3><table class="drms-table"><thead><tr><th>Category</th><th>Retention</th><th>Disposal</th></tr></thead><tbody><tr><td>Admission</td><td>5 years</td><td>Shred</td></tr><tr><td>Academic</td><td>25 years</td><td>Archive</td></tr><tr><td>Financial</td><td>10 years</td><td>Digital Archive</td></tr><tr><td>Medical</td><td>10 years</td><td>Confidential</td></tr></tbody></table></div>`;
}

function renderRetention() { renderCategories(); }

async function renderReports() {
    await loadDocuments(); await loadStudents();
    let catHtml = '';
    const cats = { Admission:0, Academic:0, Financial:0, Medical:0 };
    allDocuments.forEach(d => { if(cats[d.category] !== undefined) cats[d.category]++; });
    for(const [k,v] of Object.entries(cats)) catHtml += `<tr><td>${k}</td><td>${v}</td><td>${Math.round(v/allDocuments.length*100)||0}%</td></tr>`;
    document.getElementById('drmsMainContent').innerHTML = `<div class="drms-table-container"><h3 style="padding:1rem">Document Distribution</h3><table class="drms-table"><thead><tr><th>Category</th><th>Count</th><th>%</th><tr></thead><tbody>${catHtml}</tbody></table></div><div class="drms-form-actions"><button class="drms-btn drms-btn-primary" onclick="exportReportCSV()">Export CSV</button></div>`;
}

window.exportReportCSV = function() {
    let csv = "Student,Title,Category,Date\n";
    allDocuments.forEach(d => { const s = allStudents.find(st => st.user_id === d.student_id); csv += `"${s?.full_name || ''}","${d.title}","${d.category}","${d.created_at}"\n`; });
    const blob = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `drms_report_${Date.now()}.csv`; a.click();
};

// Navigation & Modals
function closeDocumentViewer() { document.getElementById('docViewerModal').style.display = 'none'; document.getElementById('documentIframe').src = 'about:blank'; }
function closeUploadModal() { document.getElementById('uploadModal').style.display = 'none'; }
function closeStudentRecordModal() { document.getElementById('studentRecordModal').style.display = 'none'; }
function closeEditStudentModal() { document.getElementById('editStudentModal').style.display = 'none'; }
function closeBulkUploadModal() { document.getElementById('bulkUploadModal').style.display = 'none'; }

window.viewDocument = viewDocument;
window.viewStudentCompleteRecord = viewStudentCompleteRecord;
window.closeDocumentViewer = closeDocumentViewer;
window.closeStudentRecordModal = closeStudentRecordModal;
window.closeEditStudentModal = closeEditStudentModal;
window.openEditStudentModal = openEditStudentModal;
window.exportStudentRecordPDF = exportStudentRecordPDF;
window.exportReportCSV = exportReportCSV;

document.querySelectorAll('.drms-nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.drms-nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        const view = item.dataset.view;
        if (view === 'dashboard') await renderDashboard();
        else if (view === 'students') await renderStudentRecords();
        else if (view === 'upload') await renderUploadView();
        else if (view === 'bulkUpload') await renderBulkUpload();
        else if (view === 'audit') await renderAudit();
        else if (view === 'categories') renderCategories();
        else if (view === 'retention') renderRetention();
        else if (view === 'reports') await renderReports();
    });
});

async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
        const { data: profile } = await sb.from('consolidated_user_profiles_table').select('*').eq('user_id', session.user.id).single();
        currentUser = profile;
        document.getElementById('drmsUserName').innerText = profile?.full_name || 'Admin';
    } else { currentUser = { user_id: 'demo', full_name: 'Demo Admin' }; document.getElementById('drmsUserName').innerText = 'Demo Admin'; }
    await renderDashboard();
}
init();
