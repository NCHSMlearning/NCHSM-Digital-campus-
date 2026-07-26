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
            const authId = profile.user_id;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Use ilike for partial name matching
            const { data: nameData, error: nameError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!nameError && nameData && nameData.length > 0) {
                // Prefer non-STAFF IDs
                const nonStaff = nameData.find(l => !l.lecturer_id.toString().startsWith('STAFF'));
                if (nonStaff) {
                    this.lecturerAssignmentId = nonStaff.lecturer_id;
                    console.log('✅ Found non-STAFF ID by partial name match:', this.lecturerAssignmentId);
                    return;
                }
                this.lecturerAssignmentId = nameData[0].lecturer_id;
                console.log('⚠️ Found STAFF ID by partial name match:', this.lecturerAssignmentId);
                return;
            }
            
            // Fallback to auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
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
            
            // ✅ Get resources using the fixed lecturerDB.getResources
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            // ✅ FIX: Direct query with correct column names (approval_status, not status)
            const { data: resources, error } = await supabase
                .from('resources')
                .select('*')
                .eq('target_program', program)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Failed to load resources:', error);
                // Try fallback with lecturerDB
                this.resources = await window.lecturerDB.getResources(program);
            } else {
                this.resources = resources || [];
            }
            
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
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Resources are published immediately - no approval needed!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const statusBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ Pending</span>',
            'approved': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Approved</span>',
            'rejected': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">❌ Rejected</span>',
            'published': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Published</span>'
        };
        
        tbody.innerHTML = resources.map(r => {
            const status = r.approval_status || r.status || 'published';
            const isOwner = r.uploaded_by === this.lecturerAssignmentId || r.uploaded_by === window.lecturerDB?.getCurrentUserId();
            const canDelete = isOwner && (status === 'pending' || status === 'draft' || status === 'published');
            const programDisplay = r.target_program || r.program_type || r.program || 'N/A';
            const blockDisplay = r.block || r.block_term || 'N/A';
            const showDownload = status === 'approved' || status === 'published';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        ${this.escapeHtml(r.title || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        <span style="background: #e2e8f0; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #475569;">
                            ${this.escapeHtml(r.category || 'Academic')}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(programDisplay)} / ${this.escapeHtml(blockDisplay)}
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(r.uploaded_by_name || 'You')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">
                        ${this.formatDate(r.created_at)}
                    </td>
                    <td style="padding: 14px 18px;">
                        ${statusBadges[status] || statusBadges.published}
                    </td>
                    <td style="padding: 14px 18px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${showDownload && r.file_url ? `
                                <a href="${r.file_url}" target="_blank" style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-download"></i> View
                                </a>
                            ` : ''}
                            ${canDelete ? `
                                <button onclick="LecturerResources.deleteResource('${r.id}')" 
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
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.filterTable('resourceSearch', 'resourcesList', [0, 1, 2]), 300);
            });
        }
        
        // Search button
        const searchBtn = document.getElementById('resourceSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.filterTable('resourceSearch', 'resourcesList', [0, 1, 2]);
            });
        }
    },
    
    filterTable(inputId, tableId, columnsToSearch = [0]) {
        const filter = document.getElementById(inputId)?.value?.toUpperCase() || '';
        const tbody = document.getElementById(tableId);
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        let visibleCount = 0;
        
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
            if (rowMatches) visibleCount++;
        }
    },
    
    async handleUpload(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
        
        const program = document.getElementById('resourceProgram')?.value;
        const intake = document.getElementById('resourceIntake')?.value;
        const block = document.getElementById('resourceBlock')?.value;
        const fileInput = document.getElementById('resourceFile');
        const title = document.getElementById('resourceTitle')?.value.trim();
        const category = document.getElementById('resourceCategory')?.value;
        const description = document.getElementById('resourceDescription')?.value?.trim();
        
        if (!fileInput?.files.length || !program || !intake || !block || !title || !category) {
            window.showNotification('Please fill all required fields.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        const file = fileInput.files[0];
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const userId = this.lecturerAssignmentId || profile?.user_id;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Upload file to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `resources/${program}/${intake}/${block}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('resources')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message);
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('resources')
                .getPublicUrl(filePath);
            
            const fileUrl = urlData?.publicUrl || '';
            
            // Save to database - IMMEDIATELY PUBLISHED (NO APPROVAL)
            const { data: result, error: dbError } = await supabase
                .from('resources')
                .insert({
                    title: title,
                    description: description || '',
                    category: category,
                    program: program,
                    intake: intake,
                    block: block,
                    target_program: program,
                    block_term: block,
                    file_url: fileUrl,
                    file_path: filePath,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    uploaded_by: userId,
                    uploaded_by_name: profile?.full_name || 'Lecturer',
                    approval_status: 'approved',
                    status: 'published',
                    published: true,
                    created_at: new Date().toISOString()
                })
                .select();
            
            if (dbError) throw new Error('Failed to save resource: ' + dbError.message);
            
            // Add to local list
            if (result && result.length > 0) {
                this.resources.unshift(result[0]);
                this.renderResources();
            }
            
            window.showNotification('✅ Resource published successfully! Students can now access it.', 'success');
            
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
            window.showNotification('Upload failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },
    
    async deleteResource(resourceId) {
        const resource = this.resources.find(r => r.id === resourceId);
        if (!resource) {
            window.showNotification('Resource not found.', 'error');
            return;
        }
        
        const userId = this.lecturerAssignmentId || window.lecturerDB?.getCurrentUserId();
        
        if (resource.uploaded_by !== userId) {
            window.showNotification('You can only delete resources you uploaded.', 'warning');
            return;
        }
        
        if (!confirm(`Delete resource "${resource.title}"?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            
            if (resource.file_path) {
                await supabase.storage
                    .from('resources')
                    .remove([resource.file_path]);
            }
            
            await supabase
                .from('resources')
                .delete()
                .eq('id', resourceId);
            
            // Remove from local list
            this.resources = this.resources.filter(r => r.id !== resourceId);
            this.renderResources();
            
            window.showNotification('✅ Resource deleted!', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            window.showNotification('Delete failed: ' + error.message, 'error');
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
        window.showNotification('Resources refreshed!', 'success');
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
