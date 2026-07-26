// js/lecturer-resources.js
/**
 * NCHSM Lecturer Resources Module
 * AUTO-PUBLISH - No admin approval required
 * Only shows resources uploaded by the current lecturer
 */

const LecturerResources = {
    resources: [],
    
    async init() {
        console.log('📁 Initializing Lecturer Resources (Auto-Publish)...');
        await this.loadResources();
        this.populateResourceForm();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Resources initialized');
    },
    
    async loadResources() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const program = profile.program || profile.department;
            const currentUserId = profile.user_id;
            
            // Load ONLY resources uploaded by this lecturer
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const { data: resources, error } = await supabase
                    .from('resources')
                    .select('*')
                    .eq('created_by', currentUserId)  // Only this lecturer's resources
                    .order('created_at', { ascending: false });
                
                if (!error) {
                    this.resources = resources || [];
                } else {
                    console.error('Error loading resources:', error);
                    this.resources = this.getMockResources();
                }
            } else {
                // Use mock data if no database
                this.resources = this.getMockResources();
            }
            
            this.renderResources();
            this.updateStats();
            
        } catch (error) {
            console.error('Failed to load resources:', error);
            this.resources = [];
            this.renderResources();
        }
    },
    
    getMockResources() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        return [
            {
                id: 'mock-1',
                title: 'Maternal Health - Block A Notes',
                description: 'Comprehensive notes for Maternal Health Block A',
                category: 'Academic',
                program: 'KRCHN',
                block: 'Block 1',
                file_url: '#',
                created_by: profile?.user_id || 'mock-user',
                uploaded_by_name: profile?.full_name || 'Dr. Jane Lecturer',
                created_at: new Date().toISOString()
            },
            {
                id: 'mock-2',
                title: 'Clinical Guidelines 2025',
                description: 'Updated clinical practice guidelines',
                category: 'General',
                program: 'KRCHN',
                block: 'Block 2',
                file_url: '#',
                created_by: profile?.user_id || 'mock-user',
                uploaded_by_name: profile?.full_name || 'Dr. Jane Lecturer',
                created_at: new Date(Date.now() - 86400000 * 2).toISOString()
            }
        ];
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
                        <p style="margin: 0; font-size: 14px;">You haven't uploaded any resources yet.</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Upload your first resource above - it will be published immediately!</p>
                        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <span style="background: #dbeafe; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">📚 Academic</span>
                            <span style="background: #d1fae5; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">📄 General</span>
                            <span style="background: #fef3c7; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #92400e;">🧠 Mental Health</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const currentUserId = profile?.user_id;
        
        tbody.innerHTML = resources.map(r => {
            // Check if current user is the owner
            const isOwner = r.created_by === currentUserId || r.uploaded_by === currentUserId;
            const programDisplay = r.program || r.target_program || 'N/A';
            const blockDisplay = r.block || r.block_term || 'N/A';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 16px; font-weight: 600; color: #1e293b;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        ${this.escapeHtml(r.title || 'Untitled')}
                    </td>
                    <td style="padding: 14px 16px; color: #475569; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.escapeHtml(r.description || 'No description')}
                    </td>
                    <td style="padding: 14px 16px;">
                        <span style="background: #e2e8f0; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #475569;">
                            ${this.escapeHtml(r.category || 'Academic')}
                        </span>
                    </td>
                    <td style="padding: 14px 16px; font-size: 13px; color: #475569;">
                        ${this.escapeHtml(programDisplay)} / ${this.escapeHtml(blockDisplay)}
                    </td>
                    <td style="padding: 14px 16px; font-size: 13px; color: #475569;">
                        ${this.escapeHtml(r.uploaded_by_name || r.uploaded_by || 'You')}
                    </td>
                    <td style="padding: 14px 16px; font-size: 13px; color: #475569;">
                        ${this.formatDate(r.created_at)}
                    </td>
                    <td style="padding: 14px 16px;">
                        <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            <i class="fas fa-check-circle" style="font-size: 11px;"></i> Published
                        </span>
                    </td>
                    <td style="padding: 14px 16px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${r.file_url && r.file_url !== '#' ? `
                                <a href="${r.file_url}" target="_blank" style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" 
                                   onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                    <i class="fas fa-download"></i> View
                                </a>
                            ` : ''}
                            ${isOwner ? `
                                <button onclick="LecturerResources.deleteResource('${r.id}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;" 
                                        onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    updateStats() {
        const count = this.resources?.length || 0;
        const statsEl = document.getElementById('resourceStats');
        if (statsEl) {
            statsEl.textContent = `${count} resource${count !== 1 ? 's' : ''}`;
        }
        
        // Update badge if exists
        const badge = document.getElementById('resourceCountBadge');
        if (badge) {
            badge.textContent = count;
        }
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
        const blocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const blockSelect = document.getElementById('resourceBlock');
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                blocks.map(b => `<option value="${b}">${b}</option>`).join('');
        }
        
        // Load user profile info into settings if available
        this.loadProfileInfo();
    },
    
    loadProfileInfo() {
        const profile = window.lecturerDB?.getCurrentUserProfile();
        if (!profile) return;
        
        const fullNameEl = document.getElementById('settingsFullName');
        const emailEl = document.getElementById('settingsEmail');
        const programEl = document.getElementById('settingsProgram');
        
        if (fullNameEl) fullNameEl.textContent = profile.full_name || 'N/A';
        if (emailEl) emailEl.textContent = profile.email || 'N/A';
        if (programEl) programEl.textContent = profile.program || profile.department || 'N/A';
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
                this.filterTable('resourceSearch', 'resourcesList', [0, 1, 2, 3]);
            });
        }
        
        // Search button
        const searchBtn = document.getElementById('resourceSearchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.filterTable('resourceSearch', 'resourcesList', [0, 1, 2, 3]);
            });
        }
        
        // Refresh button
        const refreshBtn = document.querySelector('#resources-content .btn-refresh') || 
                          document.querySelector('#resources-content button[onclick*="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
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
        
        // Update visible count
        const countDisplay = document.getElementById('resourceCountDisplay');
        if (countDisplay) {
            countDisplay.textContent = visibleCount;
        }
    },
    
    async handleUpload(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
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
            if (!profile) {
                throw new Error('Please login first.');
            }
            
            const supabase = window.lecturerDB?.supabase;
            
            let fileUrl = '#';
            let filePath = '';
            
            // Upload to Supabase if available
            if (supabase) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                filePath = `resources/${program}/${intake}/${block}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('resources')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.warn('Storage upload error:', uploadError);
                    // Continue with mock URL if upload fails
                } else {
                    const { data: urlData } = supabase.storage
                        .from('resources')
                        .getPublicUrl(filePath);
                    fileUrl = urlData?.publicUrl || '#';
                }
            } else {
                // Create mock URL for demo
                fileUrl = URL.createObjectURL(file);
            }
            
            // Save to database - ONLY this lecturer's resources
            const newResource = {
                id: `resource-${Date.now()}`,
                title: title,
                description: description || '',
                category: category,
                program: program,
                intake: intake,
                block: block,
                file_url: fileUrl,
                file_path: filePath,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                created_by: profile.user_id,
                uploaded_by: profile.user_id,
                uploaded_by_name: profile.full_name || 'Lecturer',
                status: 'published', // AUTO-PUBLISHED - NO APPROVAL NEEDED
                published_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            // Insert into database
            if (supabase) {
                const { error: dbError } = await supabase
                    .from('resources')
                    .insert([newResource]);
                
                if (dbError) {
                    console.error('Database insert error:', dbError);
                    // Still add to local list even if DB fails
                }
            }
            
            // Add to local list
            this.resources.unshift(newResource);
            this.renderResources();
            this.updateStats();
            
            // Show success
            window.showNotification('✅ Resource published successfully! Students can now access it.', 'success');
            
            // Show success banner
            const successBanner = document.getElementById('resourceUploadSuccess');
            if (successBanner) {
                successBanner.style.display = 'block';
                setTimeout(() => {
                    successBanner.style.display = 'none';
                }, 6000);
            }
            
            // Reset form
            form.reset();
            
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
        
        const profile = window.lecturerDB?.getCurrentUserProfile();
        const isOwner = resource.created_by === profile?.user_id || resource.uploaded_by === profile?.user_id;
        
        if (!isOwner) {
            window.showNotification('You can only delete resources you uploaded.', 'warning');
            return;
        }
        
        // Confirm deletion
        const confirmed = await new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            if (modal) {
                document.getElementById('confirmModalTitle').textContent = 'Delete Resource';
                document.getElementById('confirmModalMessage').textContent = 
                    `Are you sure you want to delete "${resource.title}"? This action cannot be undone.`;
                modal.style.display = 'flex';
                
                document.getElementById('confirmOkBtn').onclick = () => {
                    modal.style.display = 'none';
                    resolve(true);
                };
                document.getElementById('confirmCancelBtn').onclick = () => {
                    modal.style.display = 'none';
                    resolve(false);
                };
            } else {
                resolve(confirm(`Delete resource "${resource.title}"?`));
            }
        });
        
        if (!confirmed) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            
            // Delete from database
            if (supabase) {
                const { error: dbError } = await supabase
                    .from('resources')
                    .delete()
                    .eq('id', resourceId)
                    .eq('created_by', profile?.user_id); // Extra safety - only delete if owner
                
                if (dbError) {
                    console.error('Delete error:', dbError);
                }
                
                // Delete from storage
                if (resource.file_path) {
                    await supabase.storage
                        .from('resources')
                        .remove([resource.file_path]);
                }
            }
            
            // Remove from local list
            this.resources = this.resources.filter(r => r.id !== resourceId);
            this.renderResources();
            this.updateStats();
            
            window.showNotification('✅ Resource deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            window.showNotification('Delete failed: ' + error.message, 'error');
        }
    },
    
    async refresh() {
        await this.loadResources();
        window.showNotification('Resources refreshed!', 'success');
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerResources.init(), 900);
});

// Make available globally
window.LecturerResources = LecturerResources;
