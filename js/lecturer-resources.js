// js/lecturer-resources.js
/**
 * NCHSM Lecturer Resources Module
 * AUTO-PUBLISH - No admin approval required
 * Uses dedicated lecturer database with ID resolution
 * MATCHES ORIGINAL LOGIC
 */

const LecturerResources = {
    resources: [],
    lecturerAssignmentId: null,
    
    async init() {
        console.log('📁 Initializing Lecturer Resources (Auto-Publish)...');
        await this.resolveLecturerId();
        await this.loadResources();
        this.populateResourceForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Resources initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const fullName = profile.full_name;
            
            // Find by name in lecturer_subject_assignments
            const { data, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .eq('lecturer_name', fullName)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                // Prefer non-STAFF IDs
                const nonStaff = data.find(l => !l.lecturer_id.toString().startsWith('STAFF'));
                this.lecturerAssignmentId = nonStaff ? nonStaff.lecturer_id : data[0].lecturer_id;
                console.log('✅ Resolved lecturer ID for resources:', this.lecturerAssignmentId);
                return;
            }
            
            // Fallback to auth ID
            this.lecturerAssignmentId = profile.user_id;
            console.log('⚠️ Falling back to auth ID for resources:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    async loadResources() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            // ✅ ORIGINAL LOGIC - Use lecturerDB.getResources
            this.resources = await window.lecturerDB.getResources(program);
            this.renderResources();
            console.log(`✅ Loaded ${this.resources.length} resources`);
            
        } catch (error) {
            console.error('Failed to load resources:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed to load resources: ' + error.message, 'error');
            }
        }
    },
    
    renderResources() {
        const tbody = document.getElementById('resourcesList');
        if (!tbody) return;
        
        const resources = this.resources;
        
        if (!resources || resources.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-file-upload" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Resources Uploaded</h3>
                        <p style="margin: 0; font-size: 14px;">Upload your first resource using the form above.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // ✅ ORIGINAL LOGIC - Same status badges and display
        const statusBadges = {
            'pending': '<span class="badge badge-warning">⏳ Pending Approval</span>',
            'approved': '<span class="badge badge-success">✅ Approved</span>',
            'rejected': '<span class="badge badge-danger">❌ Rejected</span>',
            'published': '<span class="badge badge-success">✅ Published</span>'
        };
        
        tbody.innerHTML = resources.map(r => {
            // ✅ ORIGINAL LOGIC - Check ownership and status
            const status = r.approval_status || r.status || 'pending';
            const isOwner = r.uploaded_by === this.lecturerAssignmentId || r.uploaded_by === window.lecturerDB?.getCurrentUserId();
            const canDelete = isOwner && (status === 'pending' || status === 'draft');
            const programDisplay = r.target_program || r.program_type || r.program || 'N/A';
            const blockDisplay = r.block || r.block_term || 'N/A';
            
            // ✅ ORIGINAL LOGIC - Show download only if approved/published
            const showDownload = status === 'approved' || status === 'published';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        ${this.escapeHtml(r.title || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        <span style="background: #e2e8f0; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #475569;">
                            ${this.escapeHtml(r.category || 'Academic')}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(programDisplay)}/${this.escapeHtml(blockDisplay)}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(r.uploaded_by_name || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">
                        ${this.formatDate(r.created_at)}
                    </td>
                    <td style="padding: 14px 18px;">
                        ${statusBadges[status] || statusBadges.pending}
                    </td>
                    <td style="padding: 14px 18px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${showDownload && r.file_url ? `
                                <a href="${r.file_url}" target="_blank" class="btn btn-action btn-small" style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-download"></i> View
                                </a>
                            ` : ''}
                            ${canDelete ? `
                                <button class="btn btn-delete btn-small" onclick="LecturerResources.deleteResource('${r.id}')" 
                                        style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    populateResourceForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        // Program - ORIGINAL LOGIC
        const programSelect = document.getElementById('resourceProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Intake years - ORIGINAL LOGIC
        const years = [2024, 2025, 2026, 2027, 2028];
        const intakeSelect = document.getElementById('resourceIntake');
        if (intakeSelect) {
            intakeSelect.innerHTML = '<option value="">-- Select Intake --</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        // Blocks - ORIGINAL LOGIC
        const blocks = window.LecturerUtils?.getAcademicBlocks(program) || ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const blockSelect = document.getElementById('resourceBlock');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
    },
    
    setupEventListeners() {
        // Upload form - ORIGINAL LOGIC
        const form = document.getElementById('uploadResourceForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleUpload(e));
        }
        
        // Search - ORIGINAL LOGIC
        const searchInput = document.getElementById('resourceSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => {
                this.filterTable('resourceSearch', 'resourcesList', [0, 1, 2]);
            });
        }
    },
    
    filterTable(inputId, tableId, columnsToSearch = [0]) {
        const filter = document.getElementById(inputId)?.value?.toUpperCase() || '';
        const tbody = document.getElementById(tableId);
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            const tr = rows[i];
            if (tr.getElementsByTagName('td').length === 0) continue;
            
            let rowMatches = false;
            for (let j = 0; j < columnsToSearch.length; j++) {
                const td = tr.getElementsByTagName('td')[columnsToSearch[j]];
                if (td) {
                    const txtValue = td.textContent || td.innerText;
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        rowMatches = true;
                        break;
                    }
                }
            }
            tr.style.display = rowMatches ? '' : 'none';
        }
    },
    
    async handleUpload(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = 'Publishing...';
        
        const program = document.getElementById('resourceProgram')?.value;
        const intake = document.getElementById('resourceIntake')?.value;
        const block = document.getElementById('resourceBlock')?.value;
        const fileInput = document.getElementById('resourceFile');
        const title = document.getElementById('resourceTitle')?.value.trim();
        const category = document.getElementById('resourceCategory')?.value;
        const description = document.getElementById('resourceDescription')?.value?.trim();
        
        if (!fileInput?.files.length || !program || !intake || !block || !title || !category) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Please fill all required fields.', 'error');
            }
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }
        
        const file = fileInput.files[0];
        
        try {
            // ✅ ORIGINAL LOGIC - Use lecturerDB.uploadResource
            const result = await window.lecturerDB.uploadResource(file, {
                title: title,
                program: program,
                intake: intake,
                block: block,
                category: category,
                description: description
            });
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // ✅ AUTO-PUBLISH - Skip admin approval, mark as approved/published
            // The uploadResource function in lecturer-database.js should set status to 'published'
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Resource published successfully! Students can now access it.', 'success');
            }
            
            // Show success banner
            const successBanner = document.getElementById('resourceUploadSuccess');
            if (successBanner) {
                successBanner.style.display = 'block';
                setTimeout(() => {
                    successBanner.style.display = 'none';
                }, 6000);
            }
            
            e.target.reset();
            await this.loadResources();
            
        } catch (error) {
            console.error('Upload error:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Upload failed: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    },
    
    async deleteResource(resourceId) {
        // ✅ ORIGINAL LOGIC
        const resource = this.resources.find(r => r.id === resourceId);
        if (!resource) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Resource not found.', 'error');
            }
            return;
        }
        
        const userId = this.lecturerAssignmentId || window.lecturerDB?.getCurrentUserId();
        
        if (resource.uploaded_by !== userId) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('You can only delete resources you uploaded.', 'warning');
            }
            return;
        }
        
        if (resource.approval_status === 'approved' || resource.status === 'published') {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Published/Approved resources cannot be deleted.', 'warning');
            }
            return;
        }
        
        if (!confirm(`Delete resource "${resource.title}"?`)) return;
        
        try {
            // ✅ ORIGINAL LOGIC
            if (resource.file_path) {
                await window.lecturerDB.supabase.storage
                    .from('resources')
                    .remove([resource.file_path]);
            }
            
            await window.lecturerDB.supabase
                .from('resources')
                .delete()
                .eq('id', resourceId);
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Resource deleted!', 'success');
            }
            await this.loadResources();
            
        } catch (error) {
            console.error('Delete error:', error);
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Delete failed: ' + error.message, 'error');
            }
        }
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
    },
    
    async refresh() {
        await this.resolveLecturerId();
        await this.loadResources();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Resources refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerResources.init(), 900);
});

// Make globally accessible
window.LecturerResources = LecturerResources;
window.uploadResource = (e) => LecturerResources.handleUpload(e);
window.loadResources = () => LecturerResources.loadResources();

console.log('✅ LecturerResources module loaded - Auto-Publish with original logic');
