// ==================== Supabase Configuration ====================
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// ==================== Global Variables ====================
let currentUser = null;
let allStudents = [];
let allDocuments = [];
let auditLogs = [];
let currentView = 'dashboard';

// Document categories
const DOC_CATEGORIES = {
    'Admission': { icon: 'fa-envelope-open-text', color: 'admission' },
    'Academic': { icon: 'fa-graduation-cap', color: 'academic' },
    'Financial': { icon: 'fa-coins', color: 'financial' },
    'Medical': { icon: 'fa-stethoscope', color: 'medical' },
    'Disciplinary': { icon: 'fa-gavel', color: 'disciplinary' },
    'Personal': { icon: 'fa-id-card', color: 'personal' }
};

// ==================== Helper Functions ====================
function showToast(message, isError = false) {
    const toast = document.getElementById('drmsToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.background = isError ? '#c53030' : '#2e7d64';
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

async function addAuditLog(action, details, documentId = null) {
    try {
        const { error } = await sb.from('drms_audit_logs').insert([{
            user_id: currentUser?.user_id || 'SYSTEM',
            user_name: currentUser?.full_name || 'System',
            action: action,
            details: details,
            document_id: documentId,
            created_at: new Date().toISOString()
        }]);
        if (error) console.error('Audit log error:', error);
    } catch (e) {
        console.error('Failed to add audit log:', e);
    }
}

// ==================== Load Students from Your Existing Table ====================
async function loadStudents() {
    try {
        const { data, error } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, intake_year, block, role')
            .eq('role', 'student')
            .order('full_name', { ascending: true });
        
        if (error) throw error;
        
        allStudents = data || [];
        return allStudents;
    } catch (error) {
        console.error('Error loading students:', error);
        return [];
    }
}

// ==================== Load Documents from Your Existing Table ====================
async function loadDocuments() {
    try {
        const { data, error } = await sb
            .from('drms_documents')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            // Table might not exist yet - create it
            await createDocumentsTable();
            return [];
        }
        
        allDocuments = data || [];
        return allDocuments;
    } catch (error) {
        console.error('Error loading documents:', error);
        return [];
    }
}

// ==================== Create Documents Table if Not Exists ====================
async function createDocumentsTable() {
    try {
        // First check if table exists by trying to select from it
        const { error: checkError } = await sb.from('drms_documents').select('count', { count: 'exact', head: true });
        
        if (checkError && checkError.message.includes('relation') && checkError.message.includes('does not exist')) {
            console.log('Creating drms_documents table...');
            // Table doesn't exist - we need to create it via SQL
            // Since we can't run SQL directly from browser, we'll alert the admin
            alert('⚠️ The drms_documents table does not exist in your database.\n\nPlease run this SQL in your Supabase SQL editor:\n\n' +
                  'CREATE TABLE drms_documents (\n' +
                  '  id SERIAL PRIMARY KEY,\n' +
                  '  student_id TEXT NOT NULL,\n' +
                  '  title TEXT NOT NULL,\n' +
                  '  category TEXT NOT NULL,\n' +
                  '  description TEXT,\n' +
                  '  file_name TEXT NOT NULL,\n' +
                  '  file_url TEXT NOT NULL,\n' +
                  '  file_size TEXT,\n' +
                  '  uploaded_by TEXT,\n' +
                  '  uploaded_by_name TEXT,\n' +
                  '  created_at TIMESTAMP DEFAULT NOW(),\n' +
                  '  updated_at TIMESTAMP DEFAULT NOW()\n);\n\n' +
                  'CREATE TABLE drms_audit_logs (\n' +
                  '  id SERIAL PRIMARY KEY,\n' +
                  '  user_id TEXT,\n' +
                  '  user_name TEXT,\n' +
                  '  action TEXT NOT NULL,\n' +
                  '  details TEXT,\n' +
                  '  document_id INTEGER,\n' +
                  '  created_at TIMESTAMP DEFAULT NOW()\n);');
        }
        return [];
    } catch (e) {
        console.error('Table check error:', e);
        return [];
    }
}

// ==================== Load Audit Logs ====================
async function loadAuditLogs() {
    try {
        const { data, error } = await sb
            .from('drms_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) return [];
        
        auditLogs = data || [];
        return auditLogs;
    } catch (error) {
        return [];
    }
}

// ==================== Render Dashboard ====================
async function renderDashboard() {
    await loadDocuments();
    await loadStudents();
    
    const totalDocs = allDocuments.length;
    const totalStudents = allStudents.length;
    const studentsWithDocs = [...new Set(allDocuments.map(d => d.student_id))].length;
    
    // Calculate storage used (approx)
    let totalSize = 0;
    allDocuments.forEach(doc => {
        if (doc.file_size) {
            const size = parseInt(doc.file_size);
            if (!isNaN(size)) totalSize += size;
        }
    });
    const storageMB = (totalSize / 1024 / 1024).toFixed(2);
    
    // Recent uploads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUploads = allDocuments.filter(d => new Date(d.created_at) > thirtyDaysAgo).length;
    
    // Recent documents table
    const recentDocs = allDocuments.slice(0, 10);
    let recentHtml = '';
    
    for (const doc of recentDocs) {
        const student = allStudents.find(s => s.user_id === doc.student_id);
        const studentName = student?.full_name || 'Unknown';
        const program = student?.program || 'N/A';
        const categoryClass = DOC_CATEGORIES[doc.category]?.color || 'personal';
        
        recentHtml += `
            <tr>
                <td>${escapeHtml(studentName)}</td>
                <td><span class="drms-program-badge drms-program-${program === 'KRCHN' ? 'krchn' : 'tvet'}">${escapeHtml(program)}</span></td>
                <td>${escapeHtml(doc.title)}</td>
                <td><span class="drms-badge drms-badge-${categoryClass}">${escapeHtml(doc.category)}</span></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewDocument(${doc.id})"><i class="fas fa-eye"></i></button>
                    <button class="drms-btn drms-btn-sm drms-btn-outline" onclick="downloadDocument(${doc.id})"><i class="fas fa-download"></i></button>
                </td>
            </tr>
        `;
    }
    
    const html = `
        <div class="drms-stats-grid">
            <div class="drms-stat-card">
                <div class="drms-stat-number">${totalDocs}</div>
                <div class="drms-stat-label">Total Documents</div>
            </div>
            <div class="drms-stat-card">
                <div class="drms-stat-number">${studentsWithDocs}</div>
                <div class="drms-stat-label">Students with Documents</div>
            </div>
            <div class="drms-stat-card">
                <div class="drms-stat-number">${storageMB}</div>
                <div class="drms-stat-label">Storage Used (MB)</div>
            </div>
            <div class="drms-stat-card">
                <div class="drms-stat-number">${recentUploads}</div>
                <div class="drms-stat-label">Uploads (30 days)</div>
            </div>
        </div>
        
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">📋 Recent Documents</h3>
            <div class="table-responsive">
                <table class="drms-table">
                    <thead>
                        <tr><th>Student</th><th>Program</th><th>Title</th><th>Category</th><th>Date</th><th>Actions</th>
                    </thead>
                    <tbody>
                        ${recentHtml || '<tr><td colspan="6" style="text-align:center;">No documents found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="drms-stats-grid">
            <div class="drms-stat-card">
                <i class="fas fa-shield-alt"></i>
                <strong>Role-Based Access</strong><br>
                <small>Registrar: Full Access | Staff: View/Upload | Student: Own Records</small>
            </div>
            <div class="drms-stat-card">
                <i class="fas fa-history"></i>
                <strong>Complete Audit Trail</strong><br>
                <small>Every view/download/edit is logged</small>
            </div>
        </div>
    `;
    
    document.getElementById('drmsMainContent').innerHTML = html;
}

// ==================== Render Student Records View ====================
async function renderStudentRecords() {
    await loadStudents();
    
    const html = `
        <div class="drms-search-bar">
            <input type="text" id="studentSearchInput" class="drms-search-input" placeholder="Search by name, registration number, or email...">
            <select id="programFilter" class="drms-filter-select">
                <option value="">All Programs</option>
                <option value="KRCHN">🎓 KRCHN Nursing</option>
                <option value="TVET">🛠️ TVET Programs</option>
            </select>
            <button id="searchBtn" class="drms-btn drms-btn-primary"><i class="fas fa-search"></i> Search</button>
            <button id="resetBtn" class="drms-btn drms-btn-outline">Reset</button>
        </div>
        
        <div class="drms-table-container">
            <table class="drms-table">
                <thead>
                    <tr><th>Student Name</th><th>Program</th><th>Intake Year</th><th>Block/Term</th><th>Documents</th><th>Actions</th>
                </thead>
                <tbody id="studentsTableBody">
                    ${allStudents.map(s => `
                        <tr>
                            <td><strong>${escapeHtml(s.full_name)}</strong><br><small>${escapeHtml(s.email)}</small></td>
                            <td><span class="drms-program-badge drms-program-${s.program === 'KRCHN' ? 'krchn' : 'tvet'}">${escapeHtml(s.program)}</span></td>
                            <td>${escapeHtml(s.intake_year || 'N/A')}</td>
                            <td>${escapeHtml(s.block || 'Not Assigned')}</td>
                            <td><span id="docCount_${s.user_id}">...</span></td>
                            <td>
                                <button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewStudentCompleteRecord('${s.user_id}')">
                                    <i class="fas fa-folder-open"></i> View All Documents
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('drmsMainContent').innerHTML = html;
    
    // Load document counts for each student
    for (const student of allStudents) {
        const { count } = await sb
            .from('drms_documents')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.user_id);
        
        const countSpan = document.getElementById(`docCount_${student.user_id}`);
        if (countSpan) countSpan.textContent = count || 0;
    }
    
    // Setup search functionality
    document.getElementById('searchBtn')?.addEventListener('click', () => {
        const searchTerm = document.getElementById('studentSearchInput').value.toLowerCase();
        const programFilter = document.getElementById('programFilter').value;
        const rows = document.querySelectorAll('#studentsTableBody tr');
        
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const program = row.cells[1]?.innerText || '';
            const matchesSearch = text.includes(searchTerm);
            const matchesProgram = !programFilter || program.includes(programFilter);
            row.style.display = matchesSearch && matchesProgram ? '' : 'none';
        });
    });
    
    document.getElementById('resetBtn')?.addEventListener('click', () => {
        document.getElementById('studentSearchInput').value = '';
        document.getElementById('programFilter').value = '';
        document.querySelectorAll('#studentsTableBody tr').forEach(row => row.style.display = '');
    });
}

// ==================== View Student Complete Record (Timeline) ====================
async function viewStudentCompleteRecord(studentId) {
    const student = allStudents.find(s => s.user_id === studentId);
    if (!student) return;
    
    const { data: docs, error } = await sb
        .from('drms_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });
    
    if (error) {
        showToast('Error loading documents', true);
        return;
    }
    
    await addAuditLog('VIEW_STUDENT_RECORD', `Viewed complete record for ${student.full_name} (${student.program})`);
    
    // Group documents by category
    const admissionDocs = docs?.filter(d => d.category === 'Admission') || [];
    const academicDocs = docs?.filter(d => d.category === 'Academic') || [];
    const financialDocs = docs?.filter(d => d.category === 'Financial') || [];
    const otherDocs = docs?.filter(d => !['Admission', 'Academic', 'Financial'].includes(d.category)) || [];
    
    const modal = document.getElementById('studentRecordModal');
    document.getElementById('studentRecordTitle').innerHTML = `<i class="fas fa-user-graduate"></i> Complete Record: ${escapeHtml(student.full_name)} (${student.program})`;
    
    let timelineHtml = '';
    
    // Build timeline
    if (docs && docs.length > 0) {
        for (const doc of docs) {
            const categoryColor = DOC_CATEGORIES[doc.category]?.color || 'personal';
            timelineHtml += `
                <div class="drms-timeline-item">
                    <div class="drms-timeline-date"><i class="fas fa-calendar"></i> ${new Date(doc.created_at).toLocaleDateString()}</div>
                    <div class="drms-timeline-title">
                        <span class="drms-badge drms-badge-${categoryColor}">${escapeHtml(doc.category)}</span>
                        <strong> ${escapeHtml(doc.title)}</strong>
                    </div>
                    <div style="font-size: 0.8rem; color: #666; margin: 0.3rem 0;">
                        ${escapeHtml(doc.description || 'No description')} | File: ${escapeHtml(doc.file_name)} | Size: ${escapeHtml(doc.file_size || 'Unknown')}
                    </div>
                    <div style="margin-top: 0.5rem;">
                        <button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewDocument(${doc.id})"><i class="fas fa-eye"></i> View</button>
                        <button class="drms-btn drms-btn-sm drms-btn-outline" onclick="downloadDocument(${doc.id})"><i class="fas fa-download"></i> Download</button>
                    </div>
                </div>
            `;
        }
    } else {
        timelineHtml = '<div class="drms-empty"><i class="fas fa-folder-open"></i><p>No documents found for this student.</p></div>';
    }
    
    document.getElementById('studentRecordBody').innerHTML = `
        <div class="drms-student-profile">
            <div class="drms-student-avatar"><i class="fas fa-user-graduate fa-2x"></i></div>
            <div>
                <h3>${escapeHtml(student.full_name)}</h3>
                <p><strong>Program:</strong> ${escapeHtml(student.program)} | <strong>Intake:</strong> ${escapeHtml(student.intake_year || 'N/A')}</p>
                <p><strong>Block/Term:</strong> ${escapeHtml(student.block || 'Not Assigned')} | <strong>Email:</strong> ${escapeHtml(student.email)}</p>
            </div>
        </div>
        
        <div class="drms-stats-grid" style="margin-bottom: 1rem;">
            <div class="drms-stat-card"><div class="drms-stat-number">${docs?.length || 0}</div><div>Total Documents</div></div>
            <div class="drms-stat-card"><div class="drms-stat-number">${admissionDocs.length}</div><div>Admission Records</div></div>
            <div class="drms-stat-card"><div class="drms-stat-number">${academicDocs.length}</div><div>Academic Records</div></div>
            <div class="drms-stat-card"><div class="drms-stat-number">${financialDocs.length}</div><div>Financial Records</div></div>
        </div>
        
        <div class="drms-table-container">
            <h3 style="padding: 1rem;"><i class="fas fa-timeline"></i> Complete Record Timeline (Admission → Present)</h3>
            <div class="drms-timeline" style="padding: 1rem;">
                ${timelineHtml}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// ==================== Render Upload View ====================
async function renderUploadView() {
    await loadStudents();
    
    const studentOptions = allStudents.map(s => 
        `<option value="${s.user_id}">${escapeHtml(s.full_name)} (${escapeHtml(s.program)} - ${escapeHtml(s.intake_year || 'N/A')})</option>`
    ).join('');
    
    const html = `
        <div class="drms-search-bar">
            <h3><i class="fas fa-upload"></i> Upload New Document</h3>
            <p>Select a student and upload their document. Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
        </div>
        
        <div style="background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid var(--drms-gray-200);">
            <form id="uploadForm">
                <div class="drms-form-group">
                    <label>Select Student *</label>
                    <select id="uploadStudentId" class="drms-select" required>
                        <option value="">-- Select Student --</option>
                        ${studentOptions}
                    </select>
                </div>
                <div class="drms-form-group">
                    <label>Document Title *</label>
                    <input type="text" id="docTitle" class="drms-input" placeholder="e.g., Admission Letter, Transcript, ID Copy" required>
                </div>
                <div class="drms-form-group">
                    <label>Document Category *</label>
                    <select id="docCategory" class="drms-select" required>
                        <option value="Admission">📬 Admission Documents</option>
                        <option value="Academic">📚 Academic Records</option>
                        <option value="Financial">💰 Financial Records</option>
                        <option value="Medical">🏥 Medical Records</option>
                        <option value="Disciplinary">⚠️ Disciplinary Records</option>
                        <option value="Personal">🆔 Personal ID</option>
                    </select>
                </div>
                <div class="drms-form-group">
                    <label>Description (optional)</label>
                    <textarea id="docDescription" class="drms-textarea" rows="2" placeholder="Brief description of the document..."></textarea>
                </div>
                <div class="drms-form-group">
                    <label>Select File *</label>
                    <input type="file" id="docFile" class="drms-file-input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required>
                    <small class="drms-hint">Supported: PDF, JPG, PNG, DOC, DOCX (Max 10MB)</small>
                </div>
                <div class="drms-form-actions">
                    <button type="submit" class="drms-btn drms-btn-success"><i class="fas fa-cloud-upload-alt"></i> Upload Document</button>
                    <button type="reset" class="drms-btn drms-btn-outline">Clear</button>
                </div>
            </form>
        </div>
        
        <div class="drms-table-container" style="margin-top: 1.5rem;">
            <h3 style="padding: 1rem;">📋 Recent Uploads</h3>
            <div id="recentUploadsList"></div>
        </div>
    `;
    
    document.getElementById('drmsMainContent').innerHTML = html;
    
    // Load recent uploads
    await loadRecentUploads();
    
    // Setup form submission
    document.getElementById('uploadForm')?.addEventListener('submit', handleUpload);
}

async function loadRecentUploads() {
    await loadDocuments();
    const recentDocs = allDocuments.slice(0, 10);
    
    let html = '<table class="drms-table"><thead><tr><th>Student</th><th>Title</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead><tbody>';
    
    for (const doc of recentDocs) {
        const student = allStudents.find(s => s.user_id === doc.student_id);
        const studentName = student?.full_name || 'Unknown';
        const categoryColor = DOC_CATEGORIES[doc.category]?.color || 'personal';
        
        html += `
            <tr>
                <td>${escapeHtml(studentName)}</td>
                <td>${escapeHtml(doc.title)}</small></td>
                <td><span class="drms-badge drms-badge-${categoryColor}">${escapeHtml(doc.category)}</span></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                <td><button class="drms-btn drms-btn-sm drms-btn-primary" onclick="viewDocument(${doc.id})">View</button></td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    if (recentDocs.length === 0) html = '<div class="drms-empty"><i class="fas fa-cloud-upload-alt"></i><p>No documents uploaded yet. Use the form above to upload.</p></div>';
    
    document.getElementById('recentUploadsList').innerHTML = html;
}

// ==================== Handle File Upload ====================
async function handleUpload(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('uploadStudentId').value;
    const title = document.getElementById('docTitle').value.trim();
    const category = document.getElementById('docCategory').value;
    const description = document.getElementById('docDescription').value.trim();
    const file = document.getElementById('docFile').files[0];
    
    if (!studentId || !title || !category || !file) {
        showToast('Please fill all required fields', true);
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', true);
        return;
    }
    
    const student = allStudents.find(s => s.user_id === studentId);
    const fileName = `${studentId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `student_documents/${studentId}/${fileName}`;
    
    const uploadBtn = e.submitter;
    const originalText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    try {
        // Upload file to Supabase Storage
        const { error: uploadError } = await sb.storage
            .from('drms_files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type
            });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = sb.storage.from('drms_files').getPublicUrl(filePath);
        
        // Save document metadata to database
        const { data: docData, error: dbError } = await sb
            .from('drms_documents')
            .insert([{
                student_id: studentId,
                title: title,
                category: category,
                description: description || null,
                file_name: file.name,
                file_url: publicUrl,
                file_size: `${(file.size / 1024).toFixed(2)} KB`,
                uploaded_by: currentUser?.user_id || 'SYSTEM',
                uploaded_by_name: currentUser?.full_name || 'System',
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (dbError) throw dbError;
        
        await addAuditLog('UPLOAD', `Uploaded document: ${title} for ${student?.full_name}`, docData?.[0]?.id);
        
        showToast(`✅ "${title}" uploaded successfully!`);
        
        // Reset form
        document.getElementById('uploadForm').reset();
        document.getElementById('docFile').value = '';
        
        // Refresh recent uploads
        await loadRecentUploads();
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast(`Upload failed: ${error.message}`, true);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalText;
    }
}

// ==================== View Document in Modal ====================
async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    await addAuditLog('VIEW', `Viewed document: ${doc.title}`, docId);
    
    const modal = document.getElementById('docViewerModal');
    const iframe = document.getElementById('documentIframe');
    const downloadBtn = document.getElementById('downloadDocBtn');
    
    document.getElementById('viewerTitle').innerHTML = `<i class="fas fa-file-pdf"></i> ${escapeHtml(doc.title)}`;
    
    if (doc.file_url) {
        if (doc.file_url.endsWith('.pdf')) {
            iframe.src = doc.file_url;
        } else {
            iframe.srcdoc = `
                <html>
                <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                    <div style="text-align:center;">
                        <i class="fas fa-file-image" style="font-size:48px; color:#666;"></i>
                        <h3>${escapeHtml(doc.title)}</h3>
                        <p>File type: ${doc.file_name.split('.').pop().toUpperCase()}</p>
                        <a href="${doc.file_url}" target="_blank" class="drms-btn drms-btn-primary">Download File</a>
                    </div>
                </body>
                </html>
            `;
        }
    }
    
    downloadBtn.onclick = () => {
        window.open(doc.file_url, '_blank');
        addAuditLog('DOWNLOAD', `Downloaded document: ${doc.title}`, docId);
    };
    
    modal.style.display = 'flex';
}

async function downloadDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (doc && doc.file_url) {
        window.open(doc.file_url, '_blank');
        await addAuditLog('DOWNLOAD', `Downloaded document: ${doc.title}`, docId);
        showToast(`Downloading ${doc.title}...`);
    }
}

// ==================== Render Audit View ====================
async function renderAuditView() {
    await loadAuditLogs();
    
    let auditHtml = '';
    for (const log of auditLogs) {
        auditHtml += `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${escapeHtml(log.user_name || 'System')}</small></small></small></td>
                <td>${escapeHtml(log.action)}</small></small></small></td>
                <td>${escapeHtml(log.details)}</small></small></small></td>
                <td>${log.document_id || '-'}</small></small></small></td>
            </tr>
        `;
    }
    
    const html = `
        <div class="drms-search-bar">
            <input type="text" id="auditSearch" class="drms-search-input" placeholder="Search audit log...">
            <button id="exportAuditBtn" class="drms-btn drms-btn-primary"><i class="fas fa-download"></i> Export CSV</button>
        </div>
        <div class="drms-table-container">
            <table class="drms-table">
                <thead>
                    <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th><th>Document ID</th>
                </thead>
                <tbody id="auditTableBody">
                    ${auditHtml || '<td><td colspan="5" style="text-align:center;">No audit logs found</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('drmsMainContent').innerHTML = html;
    
    document.getElementById('auditSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#auditTableBody tr');
        rows.forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });
    
    document.getElementById('exportAuditBtn')?.addEventListener('click', () => {
        let csv = "Timestamp,User,Action,Details,DocumentID\n";
        auditLogs.forEach(l => {
            csv += `"${l.created_at}","${l.user_name || ''}","${l.action}","${l.details}","${l.document_id || ''}"\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `drms_audit_${Date.now()}.csv`;
        a.click();
        showToast('Audit log exported');
    });
}

// ==================== Render Reports View ====================
async function renderReportsView() {
    await loadDocuments();
    await loadStudents();
    
    // Category statistics
    const categoryStats = {};
    allDocuments.forEach(doc => {
        categoryStats[doc.category] = (categoryStats[doc.category] || 0) + 1;
    });
    
    // Program statistics
    const programStats = {};
    for (const doc of allDocuments) {
        const student = allStudents.find(s => s.user_id === doc.student_id);
        const program = student?.program || 'Unknown';
        programStats[program] = (programStats[program] || 0) + 1;
    }
    
    let categoryHtml = '';
    for (const [cat, count] of Object.entries(categoryStats)) {
        const color = DOC_CATEGORIES[cat]?.color || 'personal';
        categoryHtml += `<tr><td><span class="drms-badge drms-badge-${color}">${cat}</span></td><td>${count}</td><td>${Math.round(count/allDocuments.length*100)}%</td></tr>`;
    }
    
    let programHtml = '';
    for (const [prog, count] of Object.entries(programStats)) {
        programHtml += `<tr><td><span class="drms-program-badge drms-program-${prog === 'KRCHN' ? 'krchn' : 'tvet'}">${prog}</span></td><td>${count}</td></tr>`;
    }
    
    const html = `
        <div class="drms-stats-grid">
            <div class="drms-stat-card">
                <button id="exportAllDocsBtn" class="drms-btn drms-btn-primary"><i class="fas fa-download"></i> Export All Documents (CSV)</button>
            </div>
            <div class="drms-stat-card">
                <button id="exportStudentsBtn" class="drms-btn drms-btn-success"><i class="fas fa-download"></i> Export Student Report</button>
            </div>
        </div>
        
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">📊 Document Distribution by Category</h3>
            <table class="drms-table">
                <thead><tr><th>Category</th><th>Count</th><th>Percentage</th></tr></thead>
                <tbody>${categoryHtml || '<tr><td colspan="3">No data</td></tr>'}</tbody>
            </table>
        </div>
        
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">📊 Document Distribution by Program</h3>
            <table class="drms-table">
                <thead><tr><th>Program</th><th>Documents</th></tr></thead>
                <tbody>${programHtml || '<tr><td colspan="2">No data</td></tr>'}</tbody>
            </table>
        </div>
    `;
    
    document.getElementById('drmsMainContent').innerHTML = html;
    
    document.getElementById('exportAllDocsBtn')?.addEventListener('click', () => {
        let csv = "Student,Title,Category,Description,File Name,Upload Date\n";
        allDocuments.forEach(async (doc) => {
            const student = allStudents.find(s => s.user_id === doc.student_id);
            csv += `"${student?.full_name || 'Unknown'}","${doc.title}","${doc.category}","${doc.description || ''}","${doc.file_name}","${doc.created_at}"\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `drms_documents_${Date.now()}.csv`;
        a.click();
        showToast('Report exported');
    });
    
    document.getElementById('exportStudentsBtn')?.addEventListener('click', () => {
        let csv = "Student Name,Program,Intake Year,Block,Document Count\n";
        allStudents.forEach(s => {
            const count = allDocuments.filter(d => d.student_id === s.user_id).length;
            csv += `"${s.full_name}","${s.program}","${s.intake_year || ''}","${s.block || ''}",${count}\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `students_document_report_${Date.now()}.csv`;
        a.click();
        showToast('Student report exported');
    });
}

// ==================== Render Categories View ====================
function renderCategoriesView() {
    const html = `
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">📋 Document Categories & Retention Policy</h3>
            <table class="drms-table">
                <thead>
                    <tr><th>Category</th><th>Icon</th><th>Description</th><th>Retention Period</th><th>Status</th>
                </thead>
                <tbody>
                    <tr><td>Admission</td><td><i class="fas fa-envelope-open-text"></i></td><td>Admission letters, application forms, KCSE certificates</td><td>5 years</td><td><span class="drms-badge drms-badge-admission">Active</span></td></tr>
                    <tr><td>Academic</td><td><i class="fas fa-graduation-cap"></i></td><td>Transcripts, exam results, course registrations</td><td>25 years (Permanent)</td><td><span class="drms-badge drms-badge-academic">Active</span></td></tr>
                    <tr><td>Financial</td><td><i class="fas fa-coins"></i></td><td>Fee receipts, scholarships, loan documents</td><td>10 years</td><td><span class="drms-badge drms-badge-financial">Active</span></td></tr>
                    <tr><td>Medical</td><td><i class="fas fa-stethoscope"></i></td><td>Health records, immunization forms</td><td>10 years</td><td><span class="drms-badge drms-badge-medical">Active</span></td></tr>
                    <tr><td>Disciplinary</td><td><i class="fas fa-gavel"></i></td><td>Conduct records, warning letters</td><td>7 years</td><td><span class="drms-badge drms-badge-disciplinary">Restricted</span></td></tr>
                    <tr><td>Personal</td><td><i class="fas fa-id-card"></i></td><td>ID copies, birth certificates, passport photos</td><td>5 years</td><td><span class="drms-badge drms-badge-personal">Active</span></td></tr>
                </tbody>
            </table>
        </div>
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">📋 Retention Schedule Compliance</h3>
            <p style="padding: 0 1rem 1rem;">Documents are automatically flagged for review based on their retention period. Admin review required before disposal.</p>
        </div>
    `;
    document.getElementById('drmsMainContent').innerHTML = html;
}

// ==================== Render Retention View ====================
async function renderRetentionView() {
    await loadDocuments();
    
    const today = new Date();
    const expiringDocs = allDocuments.filter(doc => {
        const uploadDate = new Date(doc.created_at);
        const ageYears = (today - uploadDate) / (1000 * 60 * 60 * 24 * 365);
        let retentionYears = 5;
        switch(doc.category) {
            case 'Academic': retentionYears = 25; break;
            case 'Financial': retentionYears = 10; break;
            case 'Medical': retentionYears = 10; break;
            case 'Disciplinary': retentionYears = 7; break;
            default: retentionYears = 5;
        }
        return ageYears > retentionYears - 1; // Within 1 year of expiry
    });
    
    let expiringHtml = '';
    for (const doc of expiringDocs) {
        const student = allStudents.find(s => s.user_id === doc.student_id);
        expiringHtml += `
            <tr>
                <td>${escapeHtml(student?.full_name || 'Unknown')}</small></small></small></td>
                <td>${escapeHtml(doc.title)}</small></small></small></td>
                <td>${escapeHtml(doc.category)}</small></small></small></td>
                <td>${new Date(doc.created_at).toLocaleDateString()}</small></small></small></td>
                <td><button class="drms-btn drms-btn-sm drms-btn-warning" onclick="reviewDocument(${doc.id})">Review</button></small></small></small></td>
            </tr>
        `;
    }
    
    const html = `
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">⚠️ Documents Eligible for Disposal Review</h3>
            <table class="drms-table">
                <thead><tr><th>Student</th><th>Document</th><th>Category</th><th>Upload Date</th><th>Action</th></tr></thead>
                <tbody>
                    ${expiringHtml || '<tr><td colspan="5" style="text-align:center;">No documents nearing retention expiry</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="drms-table-container">
            <h3 style="padding: 1rem;">📋 Retention Policy Summary</h3>
            <table class="drms-table">
                <thead><tr><th>Category</th><th>Retention Period</th><th>Disposal Action</th></tr></thead>
                <tbody>
                    <tr><td>Admission</td><td>5 years</td><td>Secure Shredding</td></tr>
                    <tr><td>Academic</td><td>25 years (Permanent)</td><td>Archive to Cold Storage</td></tr>
                    <tr><td>Financial</td><td>10 years</td><td>Digital Archive</td></tr>
                    <tr><td>Medical</td><td>10 years</td><td>Confidential Archive</td></tr>
                    <tr><td>Disciplinary</td><td>7 years</td><td>Confidential Shredding</td></tr>
                    <tr><td>Personal</td><td>5 years</td><td>Secure Shredding</td></tr>
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('drmsMainContent').innerHTML = html;
}

function reviewDocument(docId) {
    showToast(`Document ${docId} marked for review`);
}

// ==================== Navigation & Initialization ====================
function closeDocumentViewer() {
    document.getElementById('docViewerModal').style.display = 'none';
    document.getElementById('documentIframe').src = 'about:blank';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

function closeStudentRecordModal() {
    document.getElementById('studentRecordModal').style.display = 'none';
}

window.exportStudentRecord = function() {
    showToast('Export feature - would generate PDF in production');
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

// Make functions global
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.viewStudentCompleteRecord = viewStudentCompleteRecord;
window.closeDocumentViewer = closeDocumentViewer;
window.closeUploadModal = closeUploadModal;
window.closeStudentRecordModal = closeStudentRecordModal;
window.reviewDocument = reviewDocument;

// Navigation
document.querySelectorAll('.drms-nav-item').forEach(item => {
    item.addEventListener('click', async (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.drms-nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const view = item.getAttribute('data-view');
        currentView = view;
        
        switch(view) {
            case 'dashboard':
                await renderDashboard();
                break;
            case 'students':
                await renderStudentRecords();
                break;
            case 'upload':
                await renderUploadView();
                break;
            case 'audit':
                await renderAuditView();
                break;
            case 'categories':
                renderCategoriesView();
                break;
            case 'retention':
                await renderRetentionView();
                break;
            case 'reports':
                await renderReportsView();
                break;
            default:
                await renderDashboard();
        }
    });
});

// Initialize
async function init() {
    // Try to get current user from session
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
        const { data: profile } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        currentUser = profile;
        document.getElementById('drmsUserName').innerText = profile?.full_name || 'Super Admin';
    } else {
        // Demo mode
        currentUser = { user_id: 'demo', full_name: 'Demo Admin' };
        document.getElementById('drmsUserName').innerText = 'Demo Admin';
    }
    
    await renderDashboard();
}

init();
</script>
</body>
</html>
