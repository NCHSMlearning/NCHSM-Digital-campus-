// js/lecturer-resources.js
/**
 * NCHSM Lecturer Resources Module
 * Uses dedicated lecturer database
 */

const LecturerResources = {
    resources: [],
    
    async init() {
        console.log('📁 Initializing Lecturer Resources...');
        await this.loadResources();
        this.populateResourceForm();
        this.setupEventListeners();
        console.log('✅ Lecturer Resources initialized');
    },
    
    async loadResources() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            // ✅ Use lecturerDB
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
        
        if (!resources.length) {
            tbody.innerHTML = '<tr><td colspan="6">No resources uploaded.</td></tr>';
            return;
        }
        
        tbody.innerHTML = resources.map(r => {
            const status = r.approval_status || 'pending';
            const statusBadges = {
                'pending': '<span class="badge badge-warning">⏳ Pending Approval</span>',
                'approved': '<span class="badge badge-success">✅ Approved</span>',
                'rejected': '<span class="badge badge-danger">❌ Rejected</span>'
            };
            
            const isOwner = r.uploaded_by === window.lecturerDB?.getCurrentUserId();
            const canDelete = isOwner && status === 'pending';
            const programDisplay = r.target_program || r.program_type || 'N/A';
            const blockDisplay = r.block || r.block_term || 'N/A';
            
            return `
                <tr>
                    <td>${window.LecturerUtils?.escapeHtml(r.title || 'N/A') || r.title || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(r.category || 'Academic') || r.category || 'Academic'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(programDisplay) || programDisplay}/${window.LecturerUtils?.escapeHtml(blockDisplay) || blockDisplay}</td>
                    <td>${window.LecturerUtils?.escapeHtml(r.uploaded_by_name || 'N/A') || r.uploaded_by_name || 'N/A'}</td>
                    <td>${window.LecturerUtils?.formatDate(r.created_at) || r.created_at || 'N/A'}</td>
                    <td>
                        ${statusBadges[status] || statusBadges.pending}
                        ${status === 'approved' ? `<a href="${r.file_url}" target="_blank" class="btn btn-action btn-small"><i class="fas fa-download"></i></a>` : ''}
                        ${canDelete ? `<button class="btn btn-delete btn-small" onclick="LecturerResources.deleteResource('${r.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    populateResourceForm() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const program = profile?.program || profile?.department;
        
        // Program
        const programSelect = document.getElementById('resourceProgram');
        if (programSelect && program) {
            programSelect.innerHTML = `<option value="${program}">${program}</option>`;
        }
        
        // Intake years
        const years = [2024, 2025, 2026, 2027, 2028];
        const intakeSelect = document.getElementById('resourceIntake');
        if (intakeSelect) {
            intakeSelect.innerHTML = '<option value="">-- Select Intake --</option>' +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
        }
        
        // Blocks
        const blocks = window.LecturerUtils?.getAcademicBlocks(program) || ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const blockSelect = document.getElementById('resourceBlock');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
    },
    
    setupEventListeners() {
        // Upload form
        const form = document.getElementById('uploadResourceForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleUpload(e));
        }
        
        // Search
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
        btn.disabled = true;
        btn.textContent = 'Uploading...';
        
        const program = document.getElementById('resourceProgram')?.value;
        const intake = document.getElementById('resourceIntake')?.value;
        const block = document.getElementById('resourceBlock')?.value;
        const fileInput = document.getElementById('resourceFile');
        const title = document.getElementById('resourceTitle')?.value.trim();
        const category = document.getElementById('resourceCategory')?.value;
        
        if (!fileInput?.files.length || !program || !intake || !block || !title || !category) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Please fill all required fields.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Upload Resource';
            return;
        }
        
        const file = fileInput.files[0];
        
        try {
            // ✅ Use lecturerDB
            const result = await window.lecturerDB.uploadResource(file, {
                title: title,
                program: program,
                intake: intake,
                block: block,
                category: category
            });
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'upload_resource',
                    {
                        resource_id: result.data[0]?.id,
                        title: title,
                        file_path: `${program}/${intake}/${block}/${file.name}`,
                        program: program,
                        block: block,
                        intake: intake
                    },
                    'Uploaded resource: ' + title,
                    result.data[0]?.id
                );
            }
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('✅ Resource uploaded! Waiting for admin approval.', 'success');
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
            btn.textContent = 'Upload Resource';
        }
    },
    
    async deleteResource(resourceId) {
        const resource = this.resources.find(r => r.id === resourceId);
        if (!resource) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Resource not found.', 'error');
            }
            return;
        }
        
        if (resource.uploaded_by !== window.lecturerDB?.getCurrentUserId()) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('You can only delete resources you uploaded.', 'warning');
            }
            return;
        }
        
        if (resource.approval_status === 'approved') {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Approved resources cannot be deleted.', 'warning');
            }
            return;
        }
        
        if (!confirm(`Delete resource "${resource.title}"?`)) return;
        
        try {
            // ✅ Use lecturerDB
            // Delete from storage
            if (resource.file_path) {
                await window.lecturerDB.supabase.storage
                    .from('resources')
                    .remove([resource.file_path]);
            }
            
            // Delete from database
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
    
    async refresh() {
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

window.LecturerResources = LecturerResources;
