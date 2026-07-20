// js/lecturer-resources.js
/**
 * NCHSM Lecturer Resources Module
 * Handles resource upload, management, and deletion
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
            const profile = window.db?.getUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            const { data, error } = await window.db.supabase
                .from('resources')
                .select('*')
                .eq('target_program', program)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.resources = data || [];
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
            
            const isOwner = r.uploaded_by === window.db?.getCurrentUserId();
            const canDelete = isOwner && status === 'pending';
            const programDisplay = r.target_program || r.program_type || 'N/A';
            const blockDisplay = r.block || r.block_term || 'N/A';
            
            return `
                <tr>
                    <td>${this.escapeHtml(r.title || 'N/A')}</td>
                    <td>${this.escapeHtml(r.category || 'Academic')}</td>
                    <td>${this.escapeHtml(programDisplay)}/${this.escapeHtml(blockDisplay)}</td>
                    <td>${this.escapeHtml(r.uploaded_by_name || 'N/A')}</td>
                    <td>${this.formatDate(r.created_at)}</td>
                    <td>
                        ${statusBadges[status] || statusBadges.pending}
                        ${status === 'approved' ? `<a href="${r.file_url}" target="_blank" class="btn btn-action btn-small"><i class="fas fa-download"></i></a>` : ''}
                        ${canDelete ? `<button class="btn btn-delete btn-small" onclick="LecturerResources.deleteResource('${r.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },
    
    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },
    
    populateResourceForm() {
        const profile = window.db?.getUserProfile();
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
        const blocks = this.getAcademicBlocks(program);
        const blockSelect = document.getElementById('resourceBlock');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
    },
    
    getAcademicBlocks(program) {
        const structure = {
            'KRCHN': ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'],
            'TVET': ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final']
        };
        return structure[program] || structure['KRCHN'];
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
        const ext = file.name.split('.').pop();
        const fileName = title.replace(/[^\w\-]+/g, '_') + '_' + Date.now() + '.' + ext;
        const filePath = `${program}/${intake}/${block}/${fileName}`;
        
        try {
            // Upload to storage
            const { error: uploadError } = await window.db.supabase.storage
                .from('resources')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = window.db.supabase.storage
                .from('resources')
                .getPublicUrl(filePath);
            
            const publicUrl = urlData.publicUrl;
            
            // Insert into database
            const { data, error: insertError } = await window.db.supabase
                .from('resources')
                .insert({
                    title: title,
                    file_name: fileName,
                    file_path: filePath,
                    file_url: publicUrl,
                    file_size: file.size,
                    file_type: file.type || ext,
                    program_type: program,
                    target_program: program,
                    intake: intake,
                    block: block,
                    block_term: block,
                    category: category || 'General',
                    uploaded_by: window.db?.getCurrentUserId(),
                    uploaded_by_name: window.db?.getUserProfile()?.full_name || 'Lecturer',
                    approval_status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (insertError) throw insertError;
            
            // Request admin approval
            if (typeof window.requestAdminApproval === 'function') {
                await window.requestAdminApproval(
                    'upload_resource',
                    {
                        resource_id: data[0]?.id,
                        title: title,
                        file_path: filePath,
                        program: program,
                        block: block,
                        intake: intake
                    },
                    'Uploaded resource: ' + title,
                    data[0]?.id
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
        
        if (resource.uploaded_by !== window.db?.getCurrentUserId()) {
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
            // Delete from storage
            if (resource.file_path) {
                await window.db.supabase.storage
                    .from('resources')
                    .remove([resource.file_path]);
            }
            
            // Delete from database
            await window.db.supabase
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
