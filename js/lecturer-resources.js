const LecturerResources = {

// State

resources: [],

currentFilter: 'all',

isUploading: false,

editingResourceId: null,

lecturerAssignmentId: null,

lecturerProfile: null,

assignedPrograms: [],

dashboardUrl: 'https://nchsm.co.ke/student',

resolvedLecturerId: null,
lecturerIdIsValid: false,

// ==========================================

// INITIALIZE

// ==========================================

async init() {

console.log('📁 Initializing Lecturer Resources...');

await this.loadLecturerProfile();

await this.loadAllResources();

this.populateFormOptions();

this.setupEventListeners();

this.updateUI();

console.log('✅ Lecturer Resources initialized');

},

// ==========================================

// LOAD LECTURER PROFILE

// ==========================================

async loadLecturerProfile() {

try {

const supabase = window.lecturerDB?.supabase;

if (!supabase) {

console.warn('Supabase not available');

return this.loadFromSession();

}

const profile = window.lecturerDB?.getCurrentUserProfile();

if (!profile) {

console.warn('No lecturer profile found');

return this.loadFromSession();

}

this.lecturerProfile = profile;

// Get assigned programs from profile or assignments table

if (profile.assigned_programs && profile.assigned_programs.length > 0) {

this.assignedPrograms = profile.assigned_programs;

} else if (profile.department || profile.program) {

this.assignedPrograms = [profile.department || profile.program];

} else {

// Try to fetch from lecturer_subject_assignments

await this.fetchAssignedPrograms(profile.user_id);

}

// Get lecturer assignment ID

await this.resolveLecturerAssignmentId(profile);

// Update UI with department info

this.updateDepartmentDisplay();

} catch (error) {

console.error('Error loading lecturer profile:', error);

this.loadFromSession();

}

},

// ==========================================

// FETCH ASSIGNED PROGRAMS FROM DB

// ==========================================


// ==========================================
// RESOLVE LECTURER ASSIGNMENT ID
// ==========================================

async resolveLecturerAssignmentId(profile) {
    const supabase = window.lecturerDB?.supabase;
    const authId = profile?.user_id || profile?.id || null;
    const fullName = String(profile?.full_name || profile?.name || '').trim();

    // resources.uploaded_by is UUID. Never allow placeholders such as
    // "lecturer-fallback" to reach a Supabase UUID filter.
    const isUUID = (value) => {
        if (!value) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
    };

    const setId = (value, source) => {
        const id = String(value || '').trim();
        if (!isUUID(id)) return false;
        this.lecturerAssignmentId = id;
        this.resolvedLecturerId = id;
        this.lecturerIdIsValid = true;
        console.log(`✅ Resources using ${source} lecturer ID:`, id);
        return true;
    };

    // Auth UUID is always a safe fallback for a UUID column.
    if (!supabase) {
        if (setId(authId, 'Auth')) return authId;
        this.lecturerAssignmentId = null;
        this.resolvedLecturerId = null;
        this.lecturerIdIsValid = false;
        return null;
    }

    try {
        // 1. Prefer an exact assignment row for the auth UUID.
        if (isUUID(authId)) {
            const { data: exactRows, error: exactError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .eq('lecturer_id', String(authId))
                .limit(20);

            if (!exactError && exactRows?.length) {
                const row = exactRows.find(r => isUUID(r?.lecturer_id));
                if (row && setId(row.lecturer_id, 'exact assignment')) return row.lecturer_id;
            }
        }

        // 2. Resolve by lecturer name and prefer a UUID/non-STAFF assignment.
        if (fullName) {
            const { data: nameRows, error: nameError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`)
                .limit(100);

            if (!nameError && nameRows?.length) {
                const uuidRows = nameRows.filter(r => isUUID(r?.lecturer_id));
                const nonStaff = uuidRows.find(r => !String(r.lecturer_id).toUpperCase().startsWith('STAFF'));
                const row = nonStaff || uuidRows[0];

                if (row && setId(row.lecturer_id, nonStaff ? 'non-STAFF assignment' : 'assignment')) {
                    return row.lecturer_id;
                }
            }
        }

        // 3. Safe fallback: Auth UUID only. Never use "lecturer-fallback".
        if (setId(authId, 'Auth fallback')) return authId;

        this.lecturerAssignmentId = null;
        this.resolvedLecturerId = null;
        this.lecturerIdIsValid = false;
        console.warn('⚠️ No valid UUID lecturer ID could be resolved. Resources query will be skipped.');
        return null;
    } catch (error) {
        console.error('❌ Failed to resolve lecturer assignment ID:', error);
        if (setId(authId, 'Auth fallback after resolver error')) return authId;
        this.lecturerAssignmentId = null;
        this.resolvedLecturerId = null;
        this.lecturerIdIsValid = false;
        return null;
    }
},

async fetchAssignedPrograms(userId) {

try {

const supabase = window.lecturerDB?.supabase;

if (!supabase) return;

const { data, error } = await supabase

.from('lecturer_subject_assignments')

.select('program')

.eq('lecturer_id', String(userId));

if (error) throw error;

const programs = [...new Set((data || []).map(d => d.program).filter(Boolean))];

this.assignedPrograms = programs.length > 0 ? programs : ['KRCHN'];

} catch (error) {

console.error('Error fetching assigned programs:', error);

this.assignedPrograms = ['KRCHN']; // Fallback

}

},

// ==========================================

// LOAD FROM SESSION (Fallback)

// ==========================================

loadFromSession() {

try {

const stored = sessionStorage.getItem('lecturerData');

if (stored) {

const data = JSON.parse(stored);

this.lecturerProfile = data;

this.assignedPrograms = data.assignedPrograms || [data.department || data.program || 'KRCHN'];

this.lecturerAssignmentId = data.lecturer_assignment_id || data.lecturer_id || data.user_id || data.id;
this.resolvedLecturerId = this.lecturerAssignmentId;

this.updateDepartmentDisplay();

} else {

// Ultimate fallback

this.assignedPrograms = ['KRCHN'];

this.lecturerAssignmentId = null;
this.resolvedLecturerId = null;
this.lecturerIdIsValid = false;

}

} catch {

this.assignedPrograms = ['KRCHN'];

this.lecturerAssignmentId = null;
this.resolvedLecturerId = null;
this.lecturerIdIsValid = false;

}

},

// ==========================================

// UPDATE DEPARTMENT DISPLAY

// ==========================================

updateDepartmentDisplay() {

const deptName = this.getProgramDisplayName(this.assignedPrograms[0] || 'KRCHN');

document.getElementById('lecturer-dept-name').textContent = deptName;

document.getElementById('lecturer-dept-display').textContent = this.assignedPrograms[0] || 'KRCHN';

document.getElementById('lecturer-current-block-display').textContent = 

this.lecturerProfile?.current_block || this.lecturerProfile?.block || 'Not Assigned';

},

// ==========================================

// GET PROGRAM DISPLAY NAME

// ==========================================

getProgramDisplayName(code) {

const programs = {

'KRCHN': 'KRCHN Nursing',

'DPOTT': 'DPOTT - Perioperative Theatre Technology',

'DCH': 'DCH - Community Health',

'DHRIT': 'DHRIT - Health Records and IT',

'DSL': 'DSL - Science Lab',

'DSW': 'DSW - Social Work & Community Development',

'DCJS': 'DCJS - Criminal Justice',

'DHSS': 'DHSS - Health Support Services',

'DICT': 'DICT - ICT',

'DME': 'DME - Medical Engineering',

'CPOTT': 'CPOTT - Certificate Perioperative Theatre Technology',

'CCH': 'CCH - Certificate Community Health',

'CHRIT': 'CHRIT - Certificate Health Records and IT',

'CPC': 'CPC - Certificate Patient Care',

'CSL': 'CSL - Certificate Science Lab',

'CSW': 'CSW - Certificate Social Work',

'CCJS': 'CCJS - Certificate Criminal Justice',

'CAG': 'CAG - Certificate Agriculture',

'CHSS': 'CHSS - Certificate Health Support Services',

'CICT': 'CICT - Certificate ICT',

'ACH': 'ACH - Artisan Community Health',

'AAG': 'AAG - Artisan Agriculture',

'ASW': 'ASW - Artisan Social Work',

'CCA': 'CCA - Certificate Computer Applications',

'PTE': 'PTE - TVET/CDACC'

};

return programs[code] || code;

},

// ==========================================

// POPULATE FORM OPTIONS

// ==========================================

populateFormOptions() {

this.populateProgramDropdown();

this.populateIntakeOptions();

this.populateBlockOptions();

this.populatePastPaperYears();

this.populateFilterOptions();

},

// ==========================================

// POPULATE PROGRAM DROPDOWN

// ==========================================

populateProgramDropdown() {

const selects = ['lecturer_program', 'edit_lecturer_program'];

selects.forEach(id => {

const select = document.getElementById(id);

if (!select) return;

select.innerHTML = '';

if (!this.assignedPrograms || this.assignedPrograms.length === 0) {

select.innerHTML = '<option value="">No programs assigned</option>';

return;

}

this.assignedPrograms.forEach(program => {

const option = document.createElement('option');

option.value = program;

option.textContent = this.getProgramDisplayName(program);

select.appendChild(option);

});

select.value = this.assignedPrograms[0];

});

},

// ==========================================

// POPULATE INTAKE OPTIONS

// ==========================================

populateIntakeOptions() {

const currentYear = new Date().getFullYear();

const selects = ['lecturer_intake', 'edit_lecturer_intake'];

selects.forEach(id => {

const select = document.getElementById(id);

if (!select) return;

select.innerHTML = '<option value="">Select Intake</option>';

for (let year = currentYear - 3; year <= currentYear + 2; year++) {

const option = document.createElement('option');

option.value = year;

option.textContent = year;

select.appendChild(option);

}

});

},

// ==========================================

// POPULATE BLOCK OPTIONS

// ==========================================

populateBlockOptions() {

const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];

const selects = ['lecturer_block', 'edit_lecturer_block'];

selects.forEach(id => {

const select = document.getElementById(id);

if (!select) return;

select.innerHTML = '<option value="">Select Block</option>';

blocks.forEach(block => {

const option = document.createElement('option');

option.value = block;

option.textContent = block;

select.appendChild(option);

});

});

},

// ==========================================

// POPULATE PAST PAPER YEARS

// ==========================================

populatePastPaperYears() {

const currentYear = new Date().getFullYear();

const selects = ['lecturer_pastpaper_year', 'edit_lecturer_pastpaper_year'];

selects.forEach(id => {

const select = document.getElementById(id);

if (!select) return;

select.innerHTML = '<option value="">Select Year</option>';

for (let year = currentYear - 10; year <= currentYear; year++) {

const option = document.createElement('option');

option.value = year;

option.textContent = year;

select.appendChild(option);

}

});

},

// ==========================================

// POPULATE FILTER OPTIONS

// ==========================================

populateFilterOptions() {

// Block filter

const blockFilter = document.getElementById('lecturer-block-filter');

if (blockFilter) {

const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];

blockFilter.innerHTML = '<option value="all">All Blocks</option>';

blocks.forEach(block => {

const option = document.createElement('option');

option.value = block;

option.textContent = block;

blockFilter.appendChild(option);

});

}

// Year filter

const yearFilter = document.getElementById('lecturer-year-filter');

if (yearFilter) {

const currentYear = new Date().getFullYear();

yearFilter.innerHTML = '<option value="all">All Years</option>';

for (let year = currentYear - 5; year <= currentYear + 1; year++) {

const option = document.createElement('option');

option.value = year;

option.textContent = year;

yearFilter.appendChild(option);

}

}

},

// ==========================================

// LOAD ALL RESOURCES

// ==========================================

async loadAllResources() {

try {

const supabase = window.lecturerDB?.supabase;

if (!supabase) {

console.warn('Supabase not available');

this.resources = [];

this.renderTable();

return;

}

const userId = this.lecturerAssignmentId || this.resolvedLecturerId;

// uploaded_by is a UUID column. Never send an invalid placeholder/string.
if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(userId).trim())) {
    console.warn('⚠️ Skipping resources query: no valid lecturer UUID resolved.', userId);
    this.resources = [];
    this.updateCounts();
    this.renderTable();
    return;
}

// Build query - only show resources for lecturer's assigned programs
let query = supabase
    .from('resources')
    .select('*')
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false });

// If lecturer has specific programs, filter by them

if (this.assignedPrograms && this.assignedPrograms.length > 0) {

query = query.in('target_program', this.assignedPrograms);

}

const { data, error } = await query;

if (error) throw error;

this.resources = data || [];

this.updateCounts();

this.renderTable();

console.log(`✅ Loaded ${this.resources.length} resources for ${this.assignedPrograms.join(', ')}`);

} catch (error) {

console.error('Failed to load resources:', error);

this.resources = [];

this.renderTable();

}

},

// ==========================================

// UPDATE COUNTS

// ==========================================

updateCounts() {

const total = this.resources.length;

const materials = this.resources.filter(r => ['material','general'].includes(r.resource_type) || !r.resource_type);

const pastPapers = this.resources.filter(r => r.resource_type === 'pastpaper');

const examResources = this.resources.filter(r => r.resource_type === 'exam');

document.getElementById('lecturer-all-count').textContent = total;

document.getElementById('lecturer-material-count').textContent = materials.length;

document.getElementById('lecturer-pastpaper-count').textContent = pastPapers.length;

document.getElementById('lecturer-exam-count').textContent = examResources.length;

},

// ==========================================

// RENDER TABLE

// ==========================================

renderTable() {

const tbody = document.getElementById('lecturer-resources-list');

if (!tbody) return;

let filtered = this.getFilteredResources();

if (filtered.length === 0) {

tbody.innerHTML = `

                <tr>

                    <td colspan="9" style="padding: 50px 20px; text-align: center; color: #94a3b8;">

                        <i class="fas fa-file-upload" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>

                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Resources Found</h3>

                        <p style="margin: 0; font-size: 14px;">Upload your first resource using the form above.</p>

                    </td>

                </tr>

            `;

return;

}

const userId = this.lecturerAssignmentId || this.lecturerProfile?.user_id;

tbody.innerHTML = filtered.map(r => {

const isOwner = this.isResourceOwner(r);

const typeIcon = this.getResourceTypeIcon(r.resource_type);

const typeLabel = this.getResourceTypeLabel(r.resource_type);

return `

                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 

                    onmouseover="this.style.background='#f8fafc'" 

                    onmouseout="this.style.background='transparent'">

                    <td style="padding: 12px 16px;">

                        <span style="display: flex; align-items: center; gap: 6px;">

${typeIcon}

                            <span style="font-weight: 500; color: #1e293b;">${this.escapeHtml(r.title || 'Untitled')}</span>

                        </span>

                    </td>

                    <td style="padding: 12px 16px; color: #64748b; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">

${this.escapeHtml(r.description || '—')}

                    </td>

                    <td style="padding: 12px 16px;">

                        <span style="background: ${this.getTypeColor(r.resource_type)}; color: white; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">

${typeLabel}

                        </span>

                    </td>

                    <td style="padding: 12px 16px; font-size: 13px; color: #475569;">

${this.getProgramDisplayName(r.target_program || r.program_type || 'N/A')}

                    </td>

                    <td style="padding: 12px 16px; font-size: 13px; color: #475569;">

${this.escapeHtml(r.block || r.block_term || 'N/A')}

                    </td>

                    <td style="padding: 12px 16px; font-size: 13px; color: #475569;">

${this.formatDate(r.created_at)}

                    </td>

                    <td style="padding: 12px 16px;">

                        <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">

                            <i class="fas fa-check-circle" style="font-size: 11px;"></i> Published

                        </span>

                    </td>

                    <td style="padding: 12px 16px;">
                            ${r.podcast_url ? `
                                <span style="display:inline-flex;align-items:center;gap:5px;background:#f3e8ff;color:#6d28d9;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:700;">
                                    <i class="fas fa-podcast"></i> Available
                                </span>` : `
                                <span style="color:#94a3b8;font-size:11px;">No audio</span>`}
                        </td>

                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">

${r.file_url && r.file_url !== '#' ? `

                                <a href="${r.file_url}" target="_blank" style="background: #4C1D95; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" 

                                   onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">

                                    <i class="fas fa-download"></i> View

                                </a>

                            ` : ''}

${isOwner ? `

                                <button onclick="LecturerResources.editResource('${r.id}')" 

                                        style="background: #dbeafe; color: #1e40af; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;" 

                                        onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='#dbeafe'">

                                    <i class="fas fa-edit"></i> Edit

                                </button>

                                <button onclick="LecturerResources.deleteResource('${r.id}')" 

                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;" 

                                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">

                                    <i class="fas fa-trash"></i>

                                </button>

                            ` : ''}

                        </div>

                    </td>

                </tr>

            `;

}).join('');

},

// ==========================================

// GET FILTERED RESOURCES

// ==========================================

getFilteredResources() {

let filtered = [...this.resources];

// Filter by type

if (this.currentFilter === 'material') {

filtered = filtered.filter(r => ['material','general'].includes(r.resource_type) || !r.resource_type);

} else if (this.currentFilter === 'pastpaper') {

filtered = filtered.filter(r => r.resource_type === 'pastpaper');

} else if (this.currentFilter === 'exam') {

filtered = filtered.filter(r => r.resource_type === 'exam');

}

// Filter by block

const blockFilter = document.getElementById('lecturer-block-filter');

if (blockFilter && blockFilter.value !== 'all') {

filtered = filtered.filter(r => (r.block || r.block_term) === blockFilter.value);

}

// Filter by year

const yearFilter = document.getElementById('lecturer-year-filter');

if (yearFilter && yearFilter.value !== 'all') {

filtered = filtered.filter(r => {

const year = r.intake || r.pastpaper_year;

return String(year) === yearFilter.value;

});

}

// Filter by search

const searchInput = document.getElementById('lecturer-resource-search');

if (searchInput && searchInput.value.trim()) {

const query = searchInput.value.toLowerCase().trim();

filtered = filtered.filter(r => {

return (r.title || '').toLowerCase().includes(query) ||

(r.description || '').toLowerCase().includes(query) ||

(r.unit_name || '').toLowerCase().includes(query) ||

(r.course_name || '').toLowerCase().includes(query);

});

}

return filtered;

},

// ==========================================

// FILTER TYPE

// ==========================================

filterType(type) {

this.currentFilter = type;

// Update button styles

document.querySelectorAll('.resource-type-btn').forEach(btn => {

btn.className = 'resource-type-btn';

btn.style.background = '#e5e7eb';

btn.style.color = '#374151';

});

const activeBtn = document.getElementById(`lecturer-type-${type}`);

if (activeBtn) {

activeBtn.className = 'resource-type-btn active';

activeBtn.style.background = '#4C1D95';

activeBtn.style.color = 'white';

}

this.renderTable();

},

// ==========================================

// FILTER TABLE (Search)

// ==========================================

filterTable() {

this.renderTable();

},

searchTable() {

this.renderTable();

},

// ==========================================

// TOGGLE PAST PAPER FIELDS

// ==========================================

togglePastPaperFields() {

const checkbox = document.getElementById('lecturer_is_pastpaper');

const fields = document.getElementById('lecturer-pastpaper-fields');

if (checkbox && fields) {

fields.style.display = checkbox.checked ? 'block' : 'none';

}

},

// ==========================================

// UPLOAD RESOURCE - UNIFIED

// ==========================================

async handleUpload(event) {

if (event) event.preventDefault();

if (this.isUploading) return;

this.isUploading = true;

const btn = document.getElementById('lecturer-form-submit-btn');

const originalText = btn?.innerHTML || 'Upload Resource';

if (btn) {

btn.disabled = true;

btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

}

try {

const supabase = window.lecturerDB?.supabase;

if (!supabase) throw new Error('Database connection not available');

// Get form values

const program = document.getElementById('lecturer_program')?.value;

const intake = document.getElementById('lecturer_intake')?.value;

const block = document.getElementById('lecturer_block')?.value;

const title = document.getElementById('lecturer_resource_title')?.value.trim();

const description = document.getElementById('lecturer_resource_description')?.value?.trim();

const fileInput = document.getElementById('lecturer_resource_file');

const isPastPaper = document.getElementById('lecturer_is_pastpaper')?.checked || false;

// Validate

if (!program || !intake || !block || !title || !fileInput?.files?.length) {

window.showNotification?.('Please fill all required fields.', 'error') ||

alert('Please fill all required fields.');

return;

}

const file = fileInput.files[0];

// Determine resource type

let resourceType = 'material';

let category = 'Academic';

if (isPastPaper) {

resourceType = 'pastpaper';

category = 'Past Paper';

}

// Upload file to storage

const fileExt = file.name.split('.').pop();

const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

const filePath = `resources/${program}/${intake}/${block}/${fileName}`;

const { error: uploadError } = await supabase.storage

.from('resources')

.upload(filePath, file);

if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message);

const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath);

const fileUrl = urlData?.publicUrl || '';

        // Optional pre-recorded podcast/audio
        let uploadedPodcast = null;
        const podcastInput = document.getElementById('lecturer_podcast_file');
        const podcastFile = podcastInput?.files?.[0];

        if (podcastFile) {
            const podcastExt = podcastFile.name.split('.').pop()?.toLowerCase() || 'mp3';
            const podcastName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${podcastExt}`;
            const podcastPath = `podcasts/${program}/${intake}/${String(block).toLowerCase().replace(/\s+/g,'-')}/${podcastName}`;

            const { error: podcastUploadError } = await supabase.storage
                .from('resources')
                .upload(podcastPath, podcastFile);

            if (podcastUploadError) throw new Error('Failed to upload podcast: ' + podcastUploadError.message);

            const { data: podcastUrlData } = supabase.storage
                .from('resources')
                .getPublicUrl(podcastPath);

            uploadedPodcast = {
                path: podcastPath,
                url: podcastUrlData?.publicUrl || ''
            };
        }

// Build resource data

const resourceData = {

title: title,

description: description || '',

category: category,

resource_type: resourceType,

program_type: program,

target_program: program,

intake: intake,

block: block,

block_term: block,

file_url: fileUrl,

file_path: filePath,

file_name: file.name,

file_size: file.size,

file_type: file.type || fileExt,

            podcast_url: uploadedPodcast?.url || null,
            podcast_path: uploadedPodcast?.path || null,

uploaded_by: this.lecturerAssignmentId || this.lecturerProfile?.user_id,

uploaded_by_name: this.lecturerProfile?.full_name || 'Lecturer',

approval_status: 'approved',

created_at: new Date().toISOString()

};

// Add past paper fields if checked

if (isPastPaper) {

const pastpaperYear = document.getElementById('lecturer_pastpaper_year')?.value;

const examType = document.getElementById('lecturer_exam_type')?.value;

const courseName = document.getElementById('lecturer_course_name')?.value.trim();

if (!pastpaperYear || !examType || !courseName) {

window.showNotification?.('Please fill all past paper fields.', 'error') ||

alert('Please fill all past paper fields.');

return;

}

resourceData.pastpaper_year = parseInt(pastpaperYear);

resourceData.exam_type = examType;

resourceData.unit_name = courseName;

resourceData.course_name = courseName;

}

// Insert into database

const { data, error: dbError } = await supabase

.from('resources')

.insert(resourceData)

.select();

if (dbError) throw new Error('Failed to save resource: ' + dbError.message);

        if (data?.[0] && resourceType === 'material') {
            await this.notifyStudentsAboutNewResource(data[0]);
        }

// Show success

window.showNotification?.('✅ Resource published successfully!', 'success') ||

alert('✅ Resource published successfully!');

// Reset form

this.resetForm();

// Reload resources

await this.loadAllResources();

} catch (error) {

console.error('Upload error:', error);

window.showNotification?.('❌ ' + error.message, 'error') ||

alert('❌ ' + error.message);

} finally {

this.isUploading = false;

if (btn) {

btn.disabled = false;

btn.innerHTML = originalText;

}

}

},

// ==========================================

// RESET FORM

// ==========================================

resetForm() {
    // Reset the form itself if it exists.
    const form = document.getElementById('lecturer-upload-form');
    if (form) form.reset();

    // IMPORTANT: every element lookup below is optional.
    // Some portal layouts do not include the optional helper labels/buttons.
    // A missing element must NEVER make a successful upload look like a failed upload.
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    const setDisplay = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.style.display = value;
    };

    setText('lecturer_file_name', 'No file selected');
    setDisplay('lecturer-pastpaper-fields', 'none');

    const pastPaper = document.getElementById('lecturer_is_pastpaper');
    if (pastPaper) pastPaper.checked = false;

    setDisplay('lecturer_file_edit_info', 'none');
    setText('lecturer_podcast_file_name', 'No audio selected');
    setDisplay('lecturer_podcast_edit_info', 'none');
    setDisplay('lecturer-form-cancel-btn', 'none');
    setText('lecturer-submit-btn-text', 'Upload Resource');
    // Hidden inputs use .value rather than textContent.
    const editId = document.getElementById('lecturer_edit_id');
    if (editId) editId.value = '';

    this.editingResourceId = null;
},

// ==========================================

// DELETE RESOURCE

// ==========================================


// ==========================================
// RESOURCE OWNER CHECK
// ==========================================

isResourceOwner(resource) {
    if (!resource) return false;
    const ids = [
        this.lecturerAssignmentId,
        this.resolvedLecturerId,
        this.lecturerProfile?.user_id,
        this.lecturerProfile?.id
    ].filter(Boolean).map(v => String(v).trim());

    return ids.includes(String(resource.uploaded_by || '').trim());
},

async deleteResource(resourceId) {

const resource = this.resources.find(r => r.id === resourceId);

if (!resource) {

window.showNotification?.('Resource not found.', 'error');

return;

}

const userId = this.lecturerAssignmentId || this.lecturerProfile?.user_id;

if (resource.uploaded_by !== userId) {

window.showNotification?.('You can only delete resources you uploaded.', 'warning');

return;

}

if (!confirm(`Delete "${resource.title}"? This action cannot be undone.`)) return;

try {

const supabase = window.lecturerDB?.supabase;

if (!supabase) throw new Error('Database not available');

// Delete file from storage

const storagePaths = [resource.file_path, resource.podcast_path].filter(Boolean);
if (storagePaths.length) {
    await supabase.storage.from('resources').remove(storagePaths);
}

// Delete from database

const { error } = await supabase

.from('resources')

.delete()

.eq('id', resourceId)

.eq('uploaded_by', userId);

if (error) throw new Error('Failed to delete: ' + error.message);

this.resources = this.resources.filter(r => r.id !== resourceId);

this.updateCounts();

this.renderTable();

window.showNotification?.('✅ Resource deleted successfully!', 'success');

} catch (error) {

console.error('Delete error:', error);

window.showNotification?.('❌ ' + error.message, 'error');

}

},

// ==========================================

// EDIT RESOURCE

// ==========================================

editResource(resourceId) {
    const resource = this.resources.find(r => String(r.id) === String(resourceId));

    if (!resource) {
        window.showNotification?.('Resource not found.', 'error');
        return;
    }

    if (!this.isResourceOwner(resource)) {
        console.error('❌ Edit denied:', {
            resourceOwner: resource.uploaded_by,
            assignmentId: this.lecturerAssignmentId,
            resolvedLecturerId: this.resolvedLecturerId,
            authId: this.lecturerProfile?.user_id
        });
        window.showNotification?.('You can only edit resources you uploaded.', 'warning');
        return;
    }

    this.populateProgramDropdown();
    this.populateIntakeOptions();
    this.populateBlockOptions();
    this.populatePastPaperYears();

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : String(value);
    };

    setValue('edit_resource_id', resource.id);
    setValue('edit_lecturer_program', resource.target_program || resource.program_type || '');
    setValue('edit_lecturer_intake', resource.intake || '');
    setValue('edit_lecturer_block', resource.block || resource.block_term || '');
    setValue('edit_lecturer_title', resource.title || '');
    setValue('edit_lecturer_description', resource.description || '');
    setValue('edit_lecturer_pastpaper_year', resource.pastpaper_year || '');
    setValue('edit_lecturer_exam_type', resource.exam_type || '');
    setValue('edit_lecturer_course_name', resource.unit_name || resource.course_name || '');

    const editPodcastInfo = document.getElementById('edit_lecturer_podcast_info');
    if (editPodcastInfo) {
        editPodcastInfo.innerHTML = resource.podcast_url
            ? '<i class="fas fa-check-circle" style="color:#059669;"></i> Podcast attached. Select a new audio file below to replace it.'
            : '<i class="fas fa-info-circle"></i> No podcast attached. Select an audio file to add one.';
    }

    const editFile = document.getElementById('edit_lecturer_resource_file');
    const editPodcast = document.getElementById('edit_lecturer_podcast_file');
    if (editFile) editFile.value = '';
    if (editPodcast) editPodcast.value = '';

    const modal = document.getElementById('lecturer-edit-modal');
    if (!modal) {
        window.showNotification?.('Edit modal is missing from the Lecturer Resources HTML.', 'error');
        return;
    }

    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    setTimeout(() => document.getElementById('edit_lecturer_title')?.focus(), 100);
},

// ==========================================

// SAVE EDIT

// ==========================================

async saveEdit() {
    const resourceId = document.getElementById('edit_resource_id')?.value;

    if (!resourceId) {
        window.showNotification?.('No resource selected for editing.', 'error');
        return;
    }

    const resource = this.resources.find(r => String(r.id) === String(resourceId));

    if (!resource) {
        window.showNotification?.('Resource not found.', 'error');
        return;
    }

    if (!this.isResourceOwner(resource)) {
        window.showNotification?.('You can only edit resources you uploaded.', 'warning');
        return;
    }

    const supabase = window.lecturerDB?.supabase;
    if (!supabase) {
        window.showNotification?.('Database not available.', 'error');
        return;
    }

    const saveBtn = document.querySelector('#lecturer-edit-form button[type="submit"]');
    const originalBtn = saveBtn?.innerHTML || '<i class="fas fa-save"></i> Save Changes';

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving document & audio...';
    }

    const oldFilePath = resource.file_path || null;
    const oldPodcastPath = resource.podcast_path || null;
    let newFilePath = null;
    let newPodcastPath = null;

    try {
        const program = document.getElementById('edit_lecturer_program')?.value;
        const intake = document.getElementById('edit_lecturer_intake')?.value;
        const block = document.getElementById('edit_lecturer_block')?.value;
        const title = document.getElementById('edit_lecturer_title')?.value.trim();
        const description = document.getElementById('edit_lecturer_description')?.value?.trim() || '';

        if (!program || !intake || !block || !title) {
            throw new Error('Please complete Program, Intake, Block and Resource Title.');
        }

        const newFile = document.getElementById('edit_lecturer_resource_file')?.files?.[0];
        const newPodcast = document.getElementById('edit_lecturer_podcast_file')?.files?.[0];

        const updates = {
            target_program: program,
            program_type: program,
            intake,
            block,
            block_term: block,
            title,
            description,
            pastpaper_year: parseInt(document.getElementById('edit_lecturer_pastpaper_year')?.value) || null,
            exam_type: document.getElementById('edit_lecturer_exam_type')?.value || null,
            unit_name: document.getElementById('edit_lecturer_course_name')?.value?.trim() || null,
            course_name: document.getElementById('edit_lecturer_course_name')?.value?.trim() || null,
            updated_at: new Date().toISOString()
        };

        // Replace document
        if (newFile) {
            const ext = newFile.name.split('.').pop()?.toLowerCase() || 'bin';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
            newFilePath = `resources/${program}/${intake}/${block}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('resources')
                .upload(newFilePath, newFile, { upsert: false });

            if (uploadError) {
                throw new Error('Failed to upload replacement document: ' + uploadError.message);
            }

            const { data: newUrlData } = supabase.storage
                .from('resources')
                .getPublicUrl(newFilePath);

            updates.file_path = newFilePath;
            updates.file_url = newUrlData?.publicUrl || '';
            updates.file_name = newFile.name;
            updates.file_size = newFile.size;
            updates.file_type = newFile.type || ext;
        }

        // Replace/add podcast
        if (newPodcast) {
            const ext = newPodcast.name.split('.').pop()?.toLowerCase() || 'mp3';
            const podcastName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
            newPodcastPath = `podcasts/${program}/${intake}/${String(block).toLowerCase().replace(/\s+/g, '-')}/${podcastName}`;

            const { error: podcastUploadError } = await supabase.storage
                .from('resources')
                .upload(newPodcastPath, newPodcast, { upsert: false });

            if (podcastUploadError) {
                throw new Error('Failed to upload replacement podcast: ' + podcastUploadError.message);
            }

            const { data: podcastUrlData } = supabase.storage
                .from('resources')
                .getPublicUrl(newPodcastPath);

            updates.podcast_path = newPodcastPath;
            updates.podcast_url = podcastUrlData?.publicUrl || '';
        }

        const ownerId = this.lecturerAssignmentId || this.resolvedLecturerId || this.lecturerProfile?.user_id;

        const { data: updatedRows, error } = await supabase
            .from('resources')
            .update(updates)
            .eq('id', resourceId)
            .eq('uploaded_by', ownerId)
            .select();

        if (error) {
            throw new Error('Failed to update resource: ' + error.message);
        }

        if (!updatedRows?.length) {
            throw new Error('Resource was not updated. Lecturer ownership could not be verified.');
        }

        // Clean old storage only after DB update succeeds.
        if (newFilePath && oldFilePath && oldFilePath !== newFilePath) {
            await supabase.storage.from('resources').remove([oldFilePath]);
        }

        if (newPodcastPath && oldPodcastPath && oldPodcastPath !== newPodcastPath) {
            await supabase.storage.from('resources').remove([oldPodcastPath]);
        }

        window.showNotification?.('✅ Document and podcast updated successfully!', 'success');
        this.closeEditModal();
        await this.loadAllResources();

    } catch (error) {
        console.error('Edit resource error:', error);

        const cleanupPaths = [newFilePath, newPodcastPath].filter(Boolean);

        if (cleanupPaths.length) {
            try {
                await supabase.storage.from('resources').remove(cleanupPaths);
            } catch (cleanupError) {
                console.warn('Replacement cleanup failed:', cleanupError);
            }
        }

        window.showNotification?.('❌ ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtn;
        }
    }
},

closeEditModal() {

const modal = document.getElementById('lecturer-edit-modal');

if (modal) {

modal.style.display = 'none';
modal.classList.remove('show');
document.body.style.overflow = '';

}

document.getElementById('edit_resource_id').value = '';

},

// ==========================================

// CANCEL EDIT (Main form)

// ==========================================

cancelEdit() {

this.resetForm();

window.showNotification?.('Edit cancelled.', 'info');

},

// ==========================================

// ==========================================
// STUDENT EMAIL NOTIFICATION
// ==========================================

async notifyStudentsAboutNewResource(resourceData) {
if (!resourceData || resourceData.resource_type !== 'material') return;

const supabase = window.lecturerDB?.supabase;
const sender = window.sendEmailWithBrevo;
if (!supabase || typeof sender !== 'function') {
console.warn('📧 Student notification skipped: email sender or Supabase unavailable.');
return;
}

const program = resourceData.program_type || resourceData.target_program;
const block = resourceData.block || resourceData.block_term;

try {
const { data: students, error } = await supabase
.from('consolidated_user_profiles_table')
.select('user_id, student_id, full_name, email, program, block')
.eq('role', 'student')
.eq('status', 'approved')
.eq('program', program)
.limit(500);

if (error) throw error;

const recipients = (students || []).filter(student =>
student?.email &&
String(student.block || '').trim().toLowerCase() === String(block || '').trim().toLowerCase()
);

if (!recipients.length) {
console.log('📧 No approved students matched this resource.');
return;
}

const safe = value => this.escapeHtml(value ?? '');
const portalUrl = this.dashboardUrl;
const title = safe(resourceData.title || 'New Learning Material');
const programLabel = safe(program || 'N/A');
const blockLabel = safe(block || 'N/A');
const description = safe(resourceData.description || 'A new learning material has been posted for your class.');

const emailHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New Learning Material</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;margin:0;padding:20px;color:#334155}
.card{max-width:600px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,.12)}
.header{background:linear-gradient(135deg,#4C1D95,#7c3aed);color:#fff;padding:28px;text-align:center}
.body{padding:28px}.box{background:#f8fafc;border-radius:12px;padding:16px;margin:18px 0}
.label{color:#64748b;font-size:12px}.value{color:#4C1D95;font-weight:700}
.btn{display:inline-block;background:#4C1D95;color:#fff!important;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700}
.footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px;text-align:center;color:#64748b;font-size:12px}
</style></head><body>
<div class="card"><div class="header"><div style="font-size:30px;">📚</div><h2 style="margin:8px 0 4px;">New Learning Material</h2><div style="opacity:.85;">Nakuru College of Health Sciences and Management</div></div>
<div class="body"><p style="font-size:16px;"><strong>Dear Student,</strong></p>
<p>A new learning material has been posted for your class. Open your Student Dashboard to access it.</p>
<div class="box">
<div class="label">RESOURCE</div><div class="value">${title}</div>
<div style="height:10px;"></div><div class="label">PROGRAM</div><div class="value">${programLabel}</div>
<div style="height:10px;"></div><div class="label">BLOCK / TERM</div><div class="value">${blockLabel}</div>
<div style="height:10px;"></div><div class="label">DESCRIPTION</div><div style="color:#475569;">${description}</div>
</div>
<div style="text-align:center;margin:24px 0;"><a href="${portalUrl}" class="btn" target="_blank" rel="noopener">Open Student Dashboard</a></div>
<p style="font-size:12px;color:#64748b;text-align:center;">The email contains no direct resource-storage or file URL. Please access the material from your authenticated Student Dashboard.</p>
</div><div class="footer">Nakuru College of Health Sciences and Management<br>© ${new Date().getFullYear()} NCHSM</div>
</div></body></html>`;

let sent = 0, failed = 0;
for (const student of recipients) {
try {
const result = await sender(student.email, `📚 New Learning Material: ${resourceData.title || 'New Note'}`, emailHtml);
if (result?.success) sent++; else failed++;
} catch (emailError) {
failed++;
console.error(`📧 Resource email failed for ${student.email}:`, emailError);
}
await new Promise(resolve => setTimeout(resolve, 200));
}

console.log(`📧 Lecturer resource notifications: ${sent} sent, ${failed} failed, ${recipients.length} total.`);
if (sent > 0) window.showNotification?.(`📧 ${sent} student notification email(s) sent.`, failed ? 'warning' : 'success');
} catch (error) {
console.error('❌ Student resource notification error:', error);
window.showNotification?.('⚠️ Resource posted, but student email notifications could not be completed.', 'warning');
}
},

// EXPORT TO CSV

// ==========================================

exportToCSV() {

const filtered = this.getFilteredResources();

if (filtered.length === 0) {

window.showNotification?.('No resources to export.', 'warning');

return;

}

const headers = ['Title', 'Description', 'Type', 'Program', 'Block', 'Year', 'Audio', 'Uploaded By', 'Date'];

const rows = filtered.map(r => [

r.title || '',

r.description || '',

this.getResourceTypeLabel(r.resource_type),

this.getProgramDisplayName(r.target_program || r.program_type || ''),

r.block || r.block_term || '',

r.intake || r.pastpaper_year || '',
r.podcast_url ? 'Yes' : 'No',
r.uploaded_by_name || '',

this.formatDate(r.created_at)

]);

const csvContent = [

headers.join(','),

            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))

].join('\n');

const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

const link = document.createElement('a');

link.href = URL.createObjectURL(blob);

link.download = `resources-${new Date().toISOString().slice(0, 10)}.csv`;

link.click();

URL.revokeObjectURL(link.href);

window.showNotification?.('📊 CSV exported successfully!', 'success');

},

// ==========================================

// UPDATE UI

// ==========================================

updateUI() {

// Auto-select first tab

this.filterType('all');

},

// ==========================================

// SETUP EVENT LISTENERS

// ==========================================

setupEventListeners() {

// Form submission is handled by onsubmit attribute

// Past paper checkbox

const checkbox = document.getElementById('lecturer_is_pastpaper');

if (checkbox) {

checkbox.addEventListener('change', () => this.togglePastPaperFields());

}

},

// ==========================================

// UTILITY FUNCTIONS

// ==========================================

getResourceTypeIcon(type) {

const icons = {

'material': '<i class="fas fa-book" style="color: #4C1D95;"></i>',

'general': '<i class="fas fa-file-alt" style="color: #4C1D95;"></i>',

'pastpaper': '<i class="fas fa-history" style="color: #f59e0b;"></i>',

'exam': '<i class="fas fa-graduation-cap" style="color: #3b82f6;"></i>'

};

return icons[type] || icons['general'];

},

getResourceTypeLabel(type) {

const labels = {

'material': 'Material',

'general': 'Material',

'pastpaper': 'Past Paper',

'exam': 'Exam'

};

return labels[type] || 'Material';

},

getTypeColor(type) {

const colors = {

'material': '#4C1D95',

'general': '#4C1D95',

'pastpaper': '#f59e0b',

'exam': '#3b82f6'

};

return colors[type] || '#4C1D95';

},

formatDate(dateString) {

if (!dateString) return 'N/A';

try {

const date = new Date(dateString);

return date.toLocaleDateString('en-GB', {

day: 'numeric',

month: 'short',

year: 'numeric'

});

} catch {

return dateString;

}

},

escapeHtml(text) {

if (!text) return '';

const div = document.createElement('div');

div.textContent = text;

return div.innerHTML;

}

};

// ============================================

// GLOBAL FUNCTIONS (for HTML onclick)

// ============================================

function LecturerResources_filterType(type) {

LecturerResources.filterType(type);

}

function LecturerResources_handleUpload(event) {

LecturerResources.handleUpload(event);

}

function LecturerResources_deleteResource(id) {

LecturerResources.deleteResource(id);

}

function LecturerResources_editResource(id) {

LecturerResources.editResource(id);

}

function LecturerResources_closeEditModal() {

LecturerResources.closeEditModal();

}

function LecturerResources_cancelEdit() {

LecturerResources.cancelEdit();

}

function LecturerResources_exportToCSV() {

LecturerResources.exportToCSV();

}

function LecturerResources_loadAllResources() {

LecturerResources.loadAllResources();

}

function LecturerResources_togglePastPaperFields() {

LecturerResources.togglePastPaperFields();

}

// ============================================

// INITIALIZE

// ============================================

document.addEventListener('DOMContentLoaded', function() {

// Wait for lecturerDB to be ready

if (window.lecturerDB) {

setTimeout(() => LecturerResources.init(), 500);

} else {

// Poll for lecturerDB

const checkDB = setInterval(() => {

if (window.lecturerDB) {

clearInterval(checkDB);

setTimeout(() => LecturerResources.init(), 500);

}

}, 200);

// Timeout after 10 seconds

setTimeout(() => {

clearInterval(checkDB);

if (!window.lecturerDB) {

console.warn('lecturerDB not available, initializing anyway');

setTimeout(() => LecturerResources.init(), 500);

        }
    }, 10000);
    }
});
