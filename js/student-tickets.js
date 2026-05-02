// student-tickets.js - Student Support Ticket System
// *** TAWK.TO STYLE CHAT INTERFACE ***

class StudentTicketSystem {
    constructor() {
        this.currentTickets = [];
        this.ticketCategories = [];
        this.currentFilter = 'all';
        this.currentTicketId = null;
        this.isInitialized = false;
        this.filesToUpload = [];
        this.conversationRefreshInterval = null;
        this.userProfile = null;
        this.userId = null;
        
        this.elements = {};
        
        this.initialize();
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🎫 Initializing Student Ticket System...');
        this.cacheElements();
        this.setupEventListeners();
        this.loadTicketCategories();
        this.setupFileUpload();
        
        await this.waitForDatabase();
        await this.loadUserProfile();
        
        if (this.userId) {
            await this.loadTickets();
        }
        
        this.isInitialized = true;
        console.log('✅ Student Ticket System initialized');
    }
    
    async waitForDatabase() {
        let attempts = 0;
        while (!window.db?.supabase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.db?.supabase) {
            console.error('❌ Database not available after 5 seconds');
        } else {
            console.log('✅ Database connected');
        }
    }
    
    cacheElements() {
        this.elements = {
            ticketsContainer: document.getElementById('support-tickets'),
            ticketsTableBody: document.getElementById('tickets-table-body'),
            openCount: document.getElementById('open-tickets-count'),
            progressCount: document.getElementById('progress-tickets-count'),
            resolvedCount: document.getElementById('resolved-tickets-count'),
            urgentCount: document.getElementById('urgent-tickets-count'),
            totalCount: document.getElementById('total-tickets-count'),
            lastUpdated: document.getElementById('last-updated-time'),
            newTicketBtn: document.getElementById('new-ticket-btn'),
            newTicketForm: document.getElementById('new-ticket-form'),
            createTicketForm: document.getElementById('create-ticket-form'),
            closeFormBtn: document.getElementById('close-form-btn'),
            cancelTicketBtn: document.getElementById('cancel-ticket-btn'),
            createFirstTicketBtn: document.getElementById('create-first-ticket'),
            categorySelect: document.getElementById('ticket-category'),
            prioritySelect: document.getElementById('ticket-priority'),
            subjectInput: document.getElementById('ticket-subject'),
            descriptionInput: document.getElementById('ticket-description'),
            attachmentsInput: document.getElementById('ticket-attachments'),
            filePreview: document.getElementById('file-preview'),
            descCharCount: document.getElementById('desc-char-count'),
            ticketModal: document.getElementById('ticket-detail-modal'),
            closeModalBtn: document.querySelector('.close-modal'),
            closeModalBtnAlt: document.querySelector('.close-modal-btn'),
            modalTicketTitle: document.getElementById('modal-ticket-title'),
            detailTicketNumber: document.getElementById('detail-ticket-number'),
            detailStatus: document.getElementById('detail-status'),
            detailCategory: document.getElementById('detail-category'),
            detailPriority: document.getElementById('detail-priority'),
            detailCreatedAt: document.getElementById('detail-created-at'),
            detailDescription: document.getElementById('detail-description'),
            detailAttachments: document.getElementById('detail-attachments'),
            attachmentsSection: document.querySelector('.attachments-section'),
            conversationsList: document.getElementById('conversations-list'),
            conversationCount: document.getElementById('conversation-count'),
            newMessageInput: document.getElementById('new-message'),
            sendMessageBtn: document.getElementById('send-message-btn'),
            cancelMessageBtn: document.getElementById('cancel-message-btn'),
            messageCharCount: document.getElementById('message-char-count'),
            closeTicketBtn: document.getElementById('close-ticket-btn'),
            reopenTicketBtn: document.getElementById('reopen-ticket-btn'),
            refreshBtn: document.getElementById('refresh-tickets-btn'),
            searchInput: document.getElementById('ticket-search'),
            filterDropdown: document.querySelector('.filter-dropdown .dropdown-menu'),
            ticketsLoading: document.getElementById('tickets-loading'),
            emptyRow: document.querySelector('.empty-row')
        };
    }
    
    setupEventListeners() {
        if (this.elements.newTicketBtn) {
            this.elements.newTicketBtn.addEventListener('click', () => this.showNewTicketForm());
        }
        if (this.elements.createFirstTicketBtn) {
            this.elements.createFirstTicketBtn.addEventListener('click', () => this.showNewTicketForm());
        }
        if (this.elements.closeFormBtn) {
            this.elements.closeFormBtn.addEventListener('click', () => this.hideNewTicketForm());
        }
        if (this.elements.cancelTicketBtn) {
            this.elements.cancelTicketBtn.addEventListener('click', () => this.hideNewTicketForm());
        }
        if (this.elements.createTicketForm) {
            this.elements.createTicketForm.addEventListener('submit', (e) => this.handleCreateTicket(e));
        }
        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.addEventListener('input', () => {
                this.updateCharCounter(this.elements.descriptionInput, this.elements.descCharCount, 5000);
            });
        }
        if (this.elements.newMessageInput) {
            this.elements.newMessageInput.addEventListener('input', () => {
                this.updateCharCounter(this.elements.newMessageInput, this.elements.messageCharCount, 2000);
            });
        }
        if (this.elements.sendMessageBtn) {
            this.elements.sendMessageBtn.addEventListener('click', () => this.sendTicketMessage());
        }
        if (this.elements.cancelMessageBtn) {
            this.elements.cancelMessageBtn.addEventListener('click', () => {
                if (this.elements.newMessageInput) this.elements.newMessageInput.value = '';
            });
        }
        if (this.elements.closeTicketBtn) {
            this.elements.closeTicketBtn.addEventListener('click', () => this.closeCurrentTicket());
        }
        if (this.elements.reopenTicketBtn) {
            this.elements.reopenTicketBtn.addEventListener('click', () => this.reopenCurrentTicket());
        }
        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', () => this.closeTicketModal());
        }
        if (this.elements.closeModalBtnAlt) {
            this.elements.closeModalBtnAlt.addEventListener('click', () => this.closeTicketModal());
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.loadTickets());
        }
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTickets(e.target.value);
                }, 300);
            });
        }
        if (this.elements.filterDropdown) {
            this.elements.filterDropdown.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filter = e.target.getAttribute('data-filter');
                    this.filterTickets(filter);
                });
            });
        }
        
        document.addEventListener('tabChanged', (e) => {
            if (e.detail.tabId === 'support-tickets') {
                this.loadTickets();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.ticketModal && this.elements.ticketModal.style.display !== 'none') {
                this.closeTicketModal();
            }
        });
        
        if (this.elements.ticketModal) {
            this.elements.ticketModal.addEventListener('click', (e) => {
                if (e.target === this.elements.ticketModal) {
                    this.closeTicketModal();
                }
            });
        }
    }
    
    setupFileUpload() {
        if (!this.elements.attachmentsInput) return;
        
        this.elements.attachmentsInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
        
        const uploadLabel = document.querySelector('.upload-label');
        if (uploadLabel) {
            uploadLabel.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadLabel.classList.add('dragover');
            });
            uploadLabel.addEventListener('dragleave', () => {
                uploadLabel.classList.remove('dragover');
            });
            uploadLabel.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadLabel.classList.remove('dragover');
                this.handleFileSelection(e.dataTransfer.files);
            });
        }
    }
    
    handleFileSelection(files) {
        this.filesToUpload = Array.from(files);
        this.renderFilePreview();
    }
    
    renderFilePreview() {
        if (!this.elements.filePreview) return;
        
        if (this.filesToUpload.length === 0) {
            this.elements.filePreview.innerHTML = '';
            return;
        }
        
        this.elements.filePreview.innerHTML = `
            <div class="preview-header">
                <strong>Selected files (${this.filesToUpload.length}):</strong>
                <button type="button" class="clear-files-btn" onclick="window.ticketSystem.clearFiles()">
                    <i class="fas fa-times"></i> Clear all
                </button>
            </div>
            <div class="preview-list">
                ${this.filesToUpload.map((file, index) => `
                    <div class="file-item">
                        <div class="file-icon">
                            <i class="fas ${this.getFileIcon(file.type)}"></i>
                        </div>
                        <div class="file-info">
                            <div class="file-name">${this.escapeHtml(file.name)}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                        <button type="button" class="remove-file-btn" data-index="${index}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.elements.filePreview.querySelectorAll('.remove-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-file-btn').getAttribute('data-index'));
                this.removeFile(index);
            });
        });
    }
    
    clearFiles() {
        this.filesToUpload = [];
        if (this.elements.attachmentsInput) {
            this.elements.attachmentsInput.value = '';
        }
        this.renderFilePreview();
    }
    
    removeFile(index) {
        this.filesToUpload.splice(index, 1);
        this.renderFilePreview();
    }
    
    getFileIcon(fileType) {
        if (fileType.includes('image')) return 'fa-image';
        if (fileType.includes('pdf')) return 'fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
        if (fileType.includes('text')) return 'fa-file-alt';
        return 'fa-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    updateCharCounter(input, counterElement, maxLength) {
        if (!input || !counterElement) return;
        const length = input.value.length;
        counterElement.textContent = length;
        
        if (length > maxLength * 0.9) {
            counterElement.style.color = '#e74c3c';
        } else if (length > maxLength * 0.75) {
            counterElement.style.color = '#f39c12';
        } else {
            counterElement.style.color = '#95a5a6';
        }
    }
    
    getSupabaseClient() {
        const client = window.db?.supabase;
        if (!client || typeof client.from !== 'function') {
            console.error('❌ No valid Supabase client available');
            return null;
        }
        return client;
    }
    
    async loadUserProfile() {
        console.log('📋 Loading user profile...');
        
        if (window.db?.currentUserProfile) {
            this.userProfile = window.db.currentUserProfile;
            this.userId = this.userProfile?.user_id || this.userProfile?.id;
            console.log('✅ Profile from window.db:', this.userId);
            return;
        }
        
        const supabase = this.getSupabaseClient();
        if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                if (profile) {
                    this.userProfile = profile;
                    this.userId = profile.user_id || profile.id;
                    console.log('✅ Profile from consolidated table:', this.userId);
                    return;
                }
                
                this.userId = user.id;
                this.userProfile = { id: user.id, user_id: user.id, email: user.email, full_name: user.email?.split('@')[0] };
                console.log('⚠️ Using auth user as fallback:', this.userId);
                return;
            }
        }
        
        console.error('❌ Could not load user profile');
    }
    
    getCurrentUserId() {
        return this.userId || this.userProfile?.user_id || this.userProfile?.id;
    }
    
    getUserProfile() {
        return this.userProfile;
    }
    
    async loadTickets() {
        console.log('📋 Loading student tickets...');
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userId) {
            console.error('❌ No user ID found');
            this.showToast('Please log in again', 'error');
            return;
        }
        
        if (!supabaseClient) {
            this.showToast('Database connection error', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const { data: tickets, error } = await supabaseClient
                .from('support_tickets')
                .select('*')
                .eq('student_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.currentTickets = tickets || [];
            this.renderTickets();
            this.updateSummary();
            this.updateLastUpdated();
            
            console.log(`✅ Loaded ${this.currentTickets.length} tickets`);
            
        } catch (error) {
            console.error("Failed to load tickets:", error);
            this.showToast('Error loading tickets: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    loadTicketCategories() {
        this.ticketCategories = [
            { category_name: 'technical', description: 'Technical Issues' },
            { category_name: 'academic', description: 'Academic Matters' },
            { category_name: 'financial', description: 'Financial Issues' },
            { category_name: 'administrative', description: 'Administrative' },
            { category_name: 'resources', description: 'Resources Access' },
            { category_name: 'other', description: 'Other' }
        ];
        
        this.populateCategoryDropdown();
    }
    
    populateCategoryDropdown() {
        if (!this.elements.categorySelect) return;
        
        this.elements.categorySelect.innerHTML = '<option value="">Select category</option>';
        
        this.ticketCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_name;
            option.textContent = category.description || category.category_name;
            this.elements.categorySelect.appendChild(option);
        });
    }
    
    renderTickets() {
        if (!this.elements.ticketsTableBody) return;
        
        const tickets = this.getFilteredTickets();
        
        if (!tickets || tickets.length === 0) {
            this.elements.ticketsTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fas fa-ticket-alt"></i>
                            <h4>No tickets found</h4>
                            <p>${this.currentFilter !== 'all' ? 
                                `No ${this.currentFilter} tickets found.` : 
                                'You haven\'t created any support tickets yet.'}
                            </p>
                            <button id="create-first-ticket" class="btn-primary">
                                <i class="fas fa-plus"></i> Create Your First Ticket
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            const createBtn = this.elements.ticketsTableBody.querySelector('#create-first-ticket');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.showNewTicketForm());
            }
            return;
        }
        
        this.elements.ticketsTableBody.innerHTML = tickets
            .map(ticket => this.createTicketRow(ticket))
            .join('');
        
        this.attachTicketEventListeners();
    }
    
    getFilteredTickets() {
        let tickets = this.currentTickets.filter(ticket => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'open') return ticket.status === 'open';
            if (this.currentFilter === 'progress') return ticket.status === 'in_progress';
            if (this.currentFilter === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
            if (this.currentFilter === 'urgent') return ticket.priority === 'urgent';
            return true;
        });
        
        const searchTerm = this.elements.searchInput?.value.toLowerCase().trim();
        if (searchTerm) {
            tickets = tickets.filter(ticket => {
                const subject = (ticket.subject || '').toLowerCase();
                const description = (ticket.description || '').toLowerCase();
                const ticketNumber = (ticket.ticket_number || '').toLowerCase();
                
                return subject.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       ticketNumber.includes(searchTerm);
            });
        }
        
        return tickets;
    }
    
    createTicketRow(ticket) {
        const createdDate = this.formatDate(ticket.created_at);
        const updatedDate = this.formatDate(ticket.updated_at || ticket.created_at);
        
        return `
            <tr class="ticket-row" data-id="${ticket.id}" style="cursor: pointer;">
                <td><span class="ticket-id">${ticket.ticket_number || 'N/A'}</span></td>
                <td>
                    <div class="ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                    <div class="ticket-excerpt">${this.escapeHtml(ticket.description?.substring(0, 60) || '')}...</div>
                </td>
                <td><span class="category-badge">${this.getCategoryLabel(ticket.category)}</span></td>
                <td><span class="priority-badge ${ticket.priority}">${ticket.priority}</span></td>
                <td><span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span></td>
                <td><span class="date-cell">${createdDate}</span></td>
                <td><span class="date-cell">${updatedDate}</span></td>
                <td>
                    <div class="ticket-actions">
                        <button class="btn-view-ticket" data-id="${ticket.id}" title="View ticket">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    getCategoryLabel(category) {
        const cat = this.ticketCategories.find(c => c.category_name === category);
        return cat?.description || category || 'Unknown';
    }
    
    attachTicketEventListeners() {
        document.querySelectorAll('.btn-view-ticket').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticketId = btn.getAttribute('data-id');
                this.viewTicket(ticketId);
            });
        });
        
        document.querySelectorAll('.ticket-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.ticket-actions')) {
                    const ticketId = row.getAttribute('data-id');
                    this.viewTicket(ticketId);
                }
            });
        });
    }
    
    async viewTicket(ticketId) {
        console.log('👁️ Viewing ticket:', ticketId);
        
        const ticket = this.currentTickets.find(t => t.id === ticketId);
        if (!ticket) {
            this.showToast('Ticket not found', 'error');
            return;
        }
        
        this.currentTicketId = ticketId;
        await this.showTawkChatModal(ticket);
    }
    
    // TAWK.TO STYLE CHAT MODAL FOR STUDENTS
    async showTawkChatModal(ticket) {
        const supabaseClient = this.getSupabaseClient();
        
        const { data: conversations } = await supabaseClient
            .from('ticket_conversations')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });
        
        const authorIds = [...new Set((conversations || []).map(c => c.author_id).filter(id => id))];
        let authorNames = {};
        
        if (authorIds.length > 0) {
            const { data: profiles } = await supabaseClient
                .from('consolidated_user_profiles_table')
                .select('id, full_name')
                .in('id', authorIds);
            
            if (profiles) {
                profiles.forEach(p => {
                    authorNames[p.id] = p.full_name;
                });
            }
        }
        
        const currentUserId = this.getCurrentUserId();
        const studentName = this.userProfile?.full_name || 'Student';
        
        const modalHtml = `
            <div id="studentChatModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100000; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <div style="background: white; width: 900px; max-width: 95vw; height: 80vh; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    
                    <!-- Header - tawk.to style -->
                    <div style="background: #292e33; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: #4C1D95; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-headset" style="color: white; font-size: 18px;"></i>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: white;">Support Ticket</h3>
                                <p style="margin: 2px 0 0; font-size: 12px; color: #9ca3af;">${this.escapeHtml(ticket.ticket_number)}</p>
                            </div>
                        </div>
                        <button onclick="document.getElementById('studentChatModal').remove()" style="background: rgba(255,255,255,0.1); border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: white;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Ticket Info Bar -->
                    <div style="background: #f8f9fa; padding: 12px 24px; border-bottom: 1px solid #e5e7eb; display: flex; gap: 20px; flex-wrap: wrap; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-tag" style="color: #9ca3af; font-size: 14px;"></i>
                            <span class="status-badge ${ticket.status}" style="padding: 2px 8px; border-radius: 12px; font-size: 11px;">${ticket.status}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-flag" style="color: #9ca3af; font-size: 14px;"></i>
                            <span class="priority-badge ${ticket.priority}" style="padding: 2px 8px; border-radius: 12px; font-size: 11px;">${ticket.priority}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-folder" style="color: #9ca3af; font-size: 14px;"></i>
                            <span style="font-size: 13px;">${this.getCategoryLabel(ticket.category)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-calendar" style="color: #9ca3af; font-size: 14px;"></i>
                            <span style="font-size: 13px;">${new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <!-- Description -->
                    <div style="background: #fefce8; padding: 12px 24px; border-bottom: 1px solid #fde68a; flex-shrink: 0;">
                        <div style="display: flex; gap: 12px;">
                            <i class="fas fa-file-alt" style="color: #d97706;"></i>
                            <div style="flex: 1;">
                                <div style="font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 4px;">Description</div>
                                <div style="font-size: 13px; color: #78350f; line-height: 1.4;">${this.escapeHtml(ticket.description)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Chat Messages Area -->
                    <div style="flex: 1; background: #f5f7fb; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">
                        <div id="studentConversationArea" style="flex: 1; overflow-y: auto; padding: 20px;">
                            ${this.renderTawkStudentMessages(conversations || [], authorNames, currentUserId)}
                        </div>
                    </div>
                    
                    <!-- Reply Area -->
                    <div style="background: white; border-top: 1px solid #e5e7eb; flex-shrink: 0;">
                        <div style="padding: 16px 24px;">
                            <textarea id="studentReplyMessageInput" rows="2" style="width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; resize: none; font-family: inherit; font-size: 14px; background: #f9fafb;" placeholder="Type your message..."></textarea>
                            <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                                <button id="studentSendReplyBtn" style="background: #4C1D95; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                                    <i class="fas fa-paper-plane"></i> Send Message
                                </button>
                            </div>
                        </div>
                        <div style="background: #f9fafb; padding: 8px 24px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
                            <i class="fas fa-clock"></i> Support team will respond shortly
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('studentChatModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const messageInput = document.getElementById('studentReplyMessageInput');
        const sendBtn = document.getElementById('studentSendReplyBtn');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendStudentChatMessage());
        }
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendStudentChatMessage();
                }
            });
        }
        
        if (this.conversationRefreshInterval) {
            clearInterval(this.conversationRefreshInterval);
        }
        this.conversationRefreshInterval = setInterval(async () => {
            if (document.getElementById('studentChatModal')) {
                await this.refreshStudentConversation(ticket.id);
            } else {
                clearInterval(this.conversationRefreshInterval);
            }
        }, 5000);
    }
    
    // tawk.to style message renderer for students
    renderTawkStudentMessages(conversations, authorNames, currentUserId) {
        if (!conversations || conversations.length === 0) {
            return `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9ca3af; text-align: center;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="margin: 0;">No messages yet</p>
                    <p style="font-size: 12px; margin-top: 8px;">Send a message to start the conversation</p>
                </div>
            `;
        }
        
        let lastDate = null;
        let html = '';
        
        for (const conv of conversations) {
            const messageDate = new Date(conv.created_at);
            const dateStr = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (lastDate !== dateStr) {
                html += `
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="background: #e5e7eb; padding: 4px 12px; border-radius: 20px; font-size: 11px; color: #6b7280;">${dateStr}</span>
                    </div>
                `;
                lastDate = dateStr;
            }
            
            const isCurrentUser = conv.author_id === currentUserId;
            const authorName = authorNames[conv.author_id] || (isCurrentUser ? 'You' : 'Support Team');
            const isStaff = !isCurrentUser && !conv.is_internal;
            const isInternal = conv.is_internal;
            
            if (isInternal) {
                // Internal note - students don't see these
                continue;
            } else if (isCurrentUser) {
                // Student message - right aligned (like tawk.to)
                html += `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
                        <div style="max-width: 70%;">
                            <div style="background: #4C1D95; padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 4px;">
                                <div style="font-size: 13px; color: white; line-height: 1.5;">${this.escapeHtml(conv.message)}</div>
                            </div>
                            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
                                <span style="font-size: 10px; color: #9ca3af;">${timeStr}</span>
                            </div>
                        </div>
                        <div style="width: 32px; height: 32px; background: #e0e7ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-left: 8px; flex-shrink: 0;">
                            <i class="fas fa-user" style="color: #4C1D95; font-size: 14px;"></i>
                        </div>
                    </div>
                `;
            } else if (isStaff) {
                // Staff message - left aligned with avatar
                html += `
                    <div style="display: flex; justify-content: flex-start; margin-bottom: 16px;">
                        <div style="width: 32px; height: 32px; background: #4C1D95; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;">
                            <i class="fas fa-user-tie" style="color: white; font-size: 14px;"></i>
                        </div>
                        <div style="max-width: 70%;">
                            <div style="background: white; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                <div style="font-size: 13px; color: #1f2937; line-height: 1.5;">${this.escapeHtml(conv.message)}</div>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 4px;">
                                <span style="font-size: 10px; color: #9ca3af;">${this.escapeHtml(authorName)}</span>
                                <span style="font-size: 10px; color: #9ca3af;">${timeStr}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        return html;
    }
    
    async refreshStudentConversation(ticketId) {
        const supabaseClient = this.getSupabaseClient();
        const conversationArea = document.getElementById('studentConversationArea');
        if (!conversationArea) return;
        
        const { data: conversations } = await supabaseClient
            .from('ticket_conversations')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        
        if (conversations) {
            const authorIds = [...new Set(conversations.map(c => c.author_id).filter(id => id))];
            let authorNames = {};
            
            if (authorIds.length > 0) {
                const { data: profiles } = await supabaseClient
                    .from('consolidated_user_profiles_table')
                    .select('id, full_name')
                    .in('id', authorIds);
                
                if (profiles) {
                    profiles.forEach(p => {
                        authorNames[p.id] = p.full_name;
                    });
                }
            }
            
            const currentUserId = this.getCurrentUserId();
            const newHtml = this.renderTawkStudentMessages(conversations, authorNames, currentUserId);
            const oldScrollTop = conversationArea.scrollTop;
            const oldScrollHeight = conversationArea.scrollHeight;
            
            conversationArea.innerHTML = newHtml;
            
            if (oldScrollHeight - oldScrollTop < 300) {
                conversationArea.scrollTop = conversationArea.scrollHeight;
            }
        }
    }
    
    async sendStudentChatMessage() {
        const messageInput = document.getElementById('studentReplyMessageInput');
        const message = messageInput?.value.trim();
        
        if (!message) {
            this.showToast('Please enter a message', 'warning');
            return;
        }
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userId || !supabaseClient) return;
        
        const sendBtn = document.getElementById('studentSendReplyBtn');
        const originalText = sendBtn?.innerHTML;
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            const { error } = await supabaseClient
                .from('ticket_conversations')
                .insert([{
                    ticket_id: this.currentTicketId,
                    author_id: userId,
                    message: message,
                    message_type: 'comment',
                    is_internal: false
                }]);
            
            if (error) throw error;
            
            if (messageInput) messageInput.value = '';
            
            await this.refreshStudentConversation(this.currentTicketId);
            
            await supabaseClient
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', this.currentTicketId);
            
            const ticketIndex = this.currentTickets.findIndex(t => t.id === this.currentTicketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].updated_at = new Date().toISOString();
                this.renderTickets();
                this.updateSummary();
            }
            
            this.showToast('Message sent!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Failed to send: ' + error.message, 'error');
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = originalText;
            }
        }
    }
    
    async handleCreateTicket(e) {
        e.preventDefault();
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userId) {
            this.showToast('User profile not loaded. Please refresh.', 'error');
            return;
        }
        
        if (!supabaseClient) {
            this.showToast('Database connection error', 'error');
            return;
        }
        
        const category = this.elements.categorySelect?.value;
        const priority = this.elements.prioritySelect?.value;
        const subject = this.elements.subjectInput?.value.trim();
        const description = this.elements.descriptionInput?.value.trim();
        
        if (!category || !subject || !description) {
            this.showToast('Please fill all required fields', 'warning');
            return;
        }
        
        if (description.length < 10) {
            this.showToast('Please provide a more detailed description (minimum 10 characters)', 'warning');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
            const ticketData = {
                student_id: userId,
                category: category,
                priority: priority || 'medium',
                subject: subject,
                description: description,
                status: 'open',
                source: 'web'
            };
            
            if (this.filesToUpload.length > 0) {
                ticketData.attachments = this.filesToUpload.map(file => ({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }));
            }
            
            const { data: newTicket, error } = await supabaseClient
                .from('support_tickets')
                .insert([ticketData])
                .select()
                .single();
            
            if (error) throw error;
            
            this.elements.createTicketForm.reset();
            this.clearFiles();
            this.hideNewTicketForm();
            this.showToast(`Ticket created! ID: ${newTicket.ticket_number}`, 'success');
            
            setTimeout(() => this.loadTickets(), 1500);
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Failed to create ticket: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
    
    async closeTicket(ticketId) {
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        if (!userId || !supabaseClient) return;
        
        try {
            const { error } = await supabaseClient
                .from('support_tickets')
                .update({ status: 'closed', closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', ticketId)
                .eq('student_id', userId);
            
            if (error) throw error;
            
            const ticketIndex = this.currentTickets.findIndex(t => t.id === ticketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].status = 'closed';
                this.renderTickets();
                this.updateSummary();
            }
            
            this.showToast('Ticket closed', 'success');
            
        } catch (error) {
            this.showToast('Failed to close: ' + error.message, 'error');
        }
    }
    
    async closeCurrentTicket() {
        if (!this.currentTicketId) return;
        if (confirm('Close this ticket?')) {
            await this.closeTicket(this.currentTicketId);
            this.closeTicketModal();
        }
    }
    
    async reopenCurrentTicket() {
        if (!this.currentTicketId) return;
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        if (!userId || !supabaseClient) return;
        
        try {
            const { error } = await supabaseClient
                .from('support_tickets')
                .update({ status: 'open', closed_at: null, updated_at: new Date().toISOString() })
                .eq('id', this.currentTicketId)
                .eq('student_id', userId);
            
            if (error) throw error;
            
            const ticketIndex = this.currentTickets.findIndex(t => t.id === this.currentTicketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].status = 'open';
                this.renderTickets();
                this.updateSummary();
                this.updateActionButtons('open');
            }
            
            this.showToast('Ticket reopened', 'success');
            
        } catch (error) {
            this.showToast('Failed to reopen: ' + error.message, 'error');
        }
    }
    
    updateActionButtons(status) {
        const isOpen = status === 'open';
        const isClosed = status === 'closed' || status === 'resolved';
        
        if (this.elements.closeTicketBtn) {
            this.elements.closeTicketBtn.style.display = isOpen ? 'inline-block' : 'none';
        }
        if (this.elements.reopenTicketBtn) {
            this.elements.reopenTicketBtn.style.display = isClosed ? 'inline-block' : 'none';
        }
    }
    
    updateSummary() {
        if (!this.currentTickets.length) {
            if (this.elements.openCount) this.elements.openCount.textContent = '0';
            if (this.elements.progressCount) this.elements.progressCount.textContent = '0';
            if (this.elements.resolvedCount) this.elements.resolvedCount.textContent = '0';
            if (this.elements.urgentCount) this.elements.urgentCount.textContent = '0';
            if (this.elements.totalCount) this.elements.totalCount.textContent = '0 tickets';
            return;
        }
        
        const counts = {
            open: this.currentTickets.filter(t => t.status === 'open').length,
            progress: this.currentTickets.filter(t => t.status === 'in_progress').length,
            resolved: this.currentTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
            urgent: this.currentTickets.filter(t => t.priority === 'urgent').length,
            total: this.currentTickets.length
        };
        
        if (this.elements.openCount) this.elements.openCount.textContent = counts.open;
        if (this.elements.progressCount) this.elements.progressCount.textContent = counts.progress;
        if (this.elements.resolvedCount) this.elements.resolvedCount.textContent = counts.resolved;
        if (this.elements.urgentCount) this.elements.urgentCount.textContent = counts.urgent;
        if (this.elements.totalCount) this.elements.totalCount.textContent = `${counts.total} ticket${counts.total !== 1 ? 's' : ''}`;
    }
    
    updateLastUpdated() {
        if (this.elements.lastUpdated) {
            this.elements.lastUpdated.textContent = 'Just now';
        }
    }
    
    showNewTicketForm() {
        if (this.elements.newTicketForm) {
            this.elements.newTicketForm.style.display = 'block';
            this.elements.subjectInput?.focus();
            this.elements.newTicketForm.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    hideNewTicketForm() {
        if (this.elements.newTicketForm) {
            this.elements.newTicketForm.style.display = 'none';
            this.elements.createTicketForm?.reset();
            this.clearFiles();
        }
    }
    
    closeTicketModal() {
        if (this.elements.ticketModal) {
            this.elements.ticketModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.currentTicketId = null;
            if (this.elements.newMessageInput) {
                this.elements.newMessageInput.value = '';
            }
        }
    }
    
    searchTickets(searchTerm) {
        this.renderTickets();
    }
    
    filterTickets(filter) {
        this.currentFilter = filter;
        this.renderTickets();
        
        const filterBtn = document.querySelector('.filter-dropdown button');
        if (filterBtn) {
            const filterText = filter === 'all' ? 'All Tickets' :
                              filter === 'open' ? 'Open' :
                              filter === 'progress' ? 'In Progress' :
                              filter === 'resolved' ? 'Resolved' : 'Urgent';
            filterBtn.innerHTML = `<i class="fas fa-filter"></i> ${filterText} <i class="fas fa-chevron-down"></i>`;
        }
    }
    
    showLoading(show) {
        if (!this.elements.ticketsLoading) return;
        
        if (show) {
            this.elements.ticketsLoading.style.display = 'block';
            if (this.elements.emptyRow) this.elements.emptyRow.style.display = 'none';
        } else {
            this.elements.ticketsLoading.style.display = 'none';
            if (this.elements.emptyRow) this.elements.emptyRow.style.display = '';
        }
    }
    
    showToast(text, type = 'info') {
        if (window.ui?.showToast) {
            window.ui.showToast(text, type);
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<div class="toast-content"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${text}</span></div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    formatDate(dateString, full = false) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (full) {
            return date.toLocaleString();
        }
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize
window.ticketSystem = new StudentTicketSystem();
window.loadSupportTickets = () => window.ticketSystem.loadTickets();
window.viewSupportTicket = (id) => window.ticketSystem.viewTicket(id);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await window.ticketSystem.initialize();
    });
} else {
    window.ticketSystem.initialize();
}
