// ============================================
// LECTURER RESOURCES - COMPLETE UPDATED VERSION
// Supports: Unified Form, Department Filtering, Past Papers, Exam Resources
// ============================================

const LecturerResources = {
    // State
    resources: [],
    currentFilter: 'all',
    isUploading: false,
    editingResourceId: null,
    lecturerAssignmentId: null,
    lecturerProfile: null,
    assignedPrograms: [],
    
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
            this.lecturerAssignmentId = profile.user_id;
            
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
                this.lecturerAssignmentId = data.user_id || data.id;
                this.updateDepartmentDisplay();
            } else {
                // Ultimate fallback
                this.assignedPrograms = ['KRCHN'];
                this.lecturerAssignmentId = 'lecturer-fallback';
            }
        } catch {
            this.assignedPrograms = ['KRCHN'];
            this.lecturerAssignmentId = 'lecturer-fallback';
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
            
            const userId = this.lecturerAssignmentId || this.lecturerProfile?.user_id;
            
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
        const materials = this.resources.filter(r => r.resource_type === 'general' || !r.resource_type);
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
                    <td colspan="8" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
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
            const isOwner = r.uploaded_by === userId || r.uploaded_by === this.lecturerProfile?.user_id;
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
            filtered = filtered.filter(r => r.resource_type === 'general' || !r.resource_type);
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
            let resourceType = 'general';
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
        const form = document.getElementById('lecturer-upload-form');
        if (form) form.reset();
        
        document.getElementById('lecturer_file_name').textContent = 'No file selected';
        document.getElementById('lecturer-pastpaper-fields').style.display = 'none';
        document.getElementById('lecturer_is_pastpaper').checked = false;
        document.getElementById('lecturer_file_edit_info').style.display = 'none';
        document.getElementById('lecturer-form-cancel-btn').style.display = 'none';
        document.getElementById('lecturer-submit-btn-text').textContent = 'Upload Resource';
        document.getElementById('lecturer_edit_id').value = '';
        this.editingResourceId = null;
    },
    
    // ==========================================
    // DELETE RESOURCE
    // ==========================================
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
            if (resource.file_path) {
                await supabase.storage.from('resources').remove([resource.file_path]);
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
        const resource = this.resources.find(r => r.id === resourceId);
        if (!resource) {
            window.showNotification?.('Resource not found.', 'error');
            return;
        }
        
        const userId = this.lecturerAssignmentId || this.lecturerProfile?.user_id;
        if (resource.uploaded_by !== userId) {
            window.showNotification?.('You can only edit resources you uploaded.', 'warning');
            return;
        }
        
        // Populate edit modal
        document.getElementById('edit_resource_id').value = resource.id;
        document.getElementById('edit_lecturer_program').value = resource.target_program || resource.program_type || '';
        document.getElementById('edit_lecturer_intake').value = resource.intake || '';
        document.getElementById('edit_lecturer_block').value = resource.block || resource.block_term || '';
        document.getElementById('edit_lecturer_title').value = resource.title || '';
        document.getElementById('edit_lecturer_description').value = resource.description || '';
        document.getElementById('edit_lecturer_pastpaper_year').value = resource.pastpaper_year || '';
        document.getElementById('edit_lecturer_exam_type').value = resource.exam_type || '';
        document.getElementById('edit_lecturer_course_name').value = resource.unit_name || resource.course_name || '';
        
        // Show modal
        const modal = document.getElementById('lecturer-edit-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.className = 'show';
        }
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
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) throw new Error('Database not available');
            
            const updates = {
                target_program: document.getElementById('edit_lecturer_program')?.value,
                intake: document.getElementById('edit_lecturer_intake')?.value,
                block: document.getElementById('edit_lecturer_block')?.value,
                block_term: document.getElementById('edit_lecturer_block')?.value,
                title: document.getElementById('edit_lecturer_title')?.value.trim(),
                description: document.getElementById('edit_lecturer_description')?.value?.trim(),
                pastpaper_year: parseInt(document.getElementById('edit_lecturer_pastpaper_year')?.value) || null,
                exam_type: document.getElementById('edit_lecturer_exam_type')?.value || null,
                unit_name: document.getElementById('edit_lecturer_course_name')?.value?.trim() || null,
                course_name: document.getElementById('edit_lecturer_course_name')?.value?.trim() || null,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('resources')
                .update(updates)
                .eq('id', resourceId);
            
            if (error) throw new Error('Failed to update: ' + error.message);
            
            window.showNotification?.('✅ Resource updated successfully!', 'success');
            
            this.closeEditModal();
            await this.loadAllResources();
            
        } catch (error) {
            console.error('Edit error:', error);
            window.showNotification?.('❌ ' + error.message, 'error');
        }
    },
    
    // ==========================================
    // CLOSE EDIT MODAL
    // ==========================================
    closeEditModal() {
        const modal = document.getElementById('lecturer-edit-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.className = '';
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
    // EXPORT TO CSV
    // ==========================================
    exportToCSV() {
        const filtered = this.getFilteredResources();
        
        if (filtered.length === 0) {
            window.showNotification?.('No resources to export.', 'warning');
            return;
        }
        
        const headers = ['Title', 'Description', 'Type', 'Program', 'Block', 'Year', 'Uploaded By', 'Date'];
        const rows = filtered.map(r => [
            r.title || '',
            r.description || '',
            this.getResourceTypeLabel(r.resource_type),
            this.getProgramDisplayName(r.target_program || r.program_type || ''),
            r.block || r.block_term || '',
            r.intake || r.pastpaper_year || '',
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
            'general': '<i class="fas fa-file-alt" style="color: #4C1D95;"></i>',
            'pastpaper': '<i class="fas fa-history" style="color: #f59e0b;"></i>',
            'exam': '<i class="fas fa-graduation-cap" style="color: #3b82f6;"></i>'
        };
        return icons[type] || icons['general'];
    },
    
    getResourceTypeLabel(type) {
        const labels = {
            'general': 'Material',
            'pastpaper': 'Past Paper',
            'exam': 'Exam'
        };
        return labels[type] || 'Material';
    },
    
    getTypeColor(type) {
        const colors = {
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

// ============================================
// EXPOSE TO WINDOW
// ============================================
window.LecturerResources = LecturerResources;
window.LecturerResources_filterType = LecturerResources_filterType;
window.LecturerResources_handleUpload = LecturerResources_handleUpload;
window.LecturerResources_deleteResource = LecturerResources_deleteResource;
window.LecturerResources_editResource = LecturerResources_editResource;
window.LecturerResources_closeEditModal = LecturerResources_closeEditModal;
window.LecturerResources_cancelEdit = LecturerResources_cancelEdit;
window.LecturerResources_exportToCSV = LecturerResources_exportToCSV;
window.LecturerResources_loadAllResources = LecturerResources_loadAllResources;
window.LecturerResources_togglePastPaperFields = LecturerResources_togglePastPaperFields;

console.log('✅ LecturerResources module loaded - Complete');
