// student-tickets.js - Student Support Ticket System
// *** WORKS WITH YOUR database.js - PERSISTS AFTER REFRESH ***

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
        
        // DOM Elements cache
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
        
        // Wait for database to be ready
        await this.waitForDatabase();
        
        // Load user profile
        await this.loadUserProfile();
        
        // Load tickets if profile exists
        if (this.userId) {
            await this.loadTickets();
        }
        
        this.isInitialized = true;
        console.log('✅ Student Ticket System initialized');
    }
    
    async waitForDatabase() {
        // Wait for window.db to be available
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
        // Use window.db.supabase from your database.js
        const client = window.db?.supabase;
        if (!client || typeof client.from !== 'function') {
            console.error('❌ No valid Supabase client available');
            return null;
        }
        return client;
    }
    
    async loadUserProfile() {
        console.log('📋 Loading user profile...');
        
        // Try to get from window.db (database.js)
        if (window.db?.currentUserProfile) {
            this.userProfile = window.db.currentUserProfile;
            this.userId = this.userProfile?.user_id || this.userProfile?.id;
            console.log('✅ Profile from window.db:', this.userId);
            return;
        }
        
        // Try to get from auth directly
        const supabase = this.getSupabaseClient();
        if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Try to get profile from consolidated table
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
                
                // Fallback to auth user
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
        
        await this.showChatModal(ticket);
    }
    
    async showChatModal(ticket) {
        const supabaseClient = this.getSupabaseClient();
        
        // Get conversations
        const { data: conversations } = await supabaseClient
            .from('ticket_conversations')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });
        
        // Get author names
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
        
        const modalHtml = `
            <div id="chatModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; max-width: 800px; width: 95%; max-height: 85vh; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden;">
                    <div style="padding: 15px 20px; background: linear-gradient(135deg, #4C1D95, #6d28d9); color: white;">
                        <h3 style="margin: 0;">🎫 ${this.escapeHtml(ticket.ticket_number)}</h3>
                        <small>${this.escapeHtml(ticket.subject)}</small>
                        <button onclick="document.getElementById('chatModal').remove()" style="position: absolute; top: 15px; right: 20px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    
                    <div style="padding: 12px 20px; background: #f8f9fa; display: flex; gap: 20px; flex-wrap: wrap;">
                        <div><strong>Status:</strong> <span class="status-badge ${ticket.status}">${ticket.status}</span></div>
                        <div><strong>Priority:</strong> <span class="priority-badge ${ticket.priority}">${ticket.priority}</span></div>
                        <div><strong>Category:</strong> ${this.getCategoryLabel(ticket.category)}</div>
                    </div>
                    
                    <div style="padding: 12px 20px; background: #fef3c7;">
                        <strong>📝 Description:</strong>
                        <p style="margin: 8px 0 0 0;">${this.escapeHtml(ticket.description)}</p>
                    </div>
                    
                    <div id="chatMessagesArea" style="flex: 1; overflow-y: auto; padding: 15px; background: #f3f4f6; min-height: 300px;">
                        ${this.renderChatMessages(conversations || [], authorNames)}
                    </div>
                    
                    <div style="padding: 15px 20px; background: white; border-top: 1px solid #e5e7eb;">
                        <textarea id="chatMessageInput" rows="2" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; resize: none;" placeholder="Type your message here..."></textarea>
                        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                            <button id="sendChatBtn" style="background: #4C1D95; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-paper-plane"></i> Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('chatModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const messageInput = document.getElementById('chatMessageInput');
        const sendBtn = document.getElementById('sendChatBtn');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
        
        // Auto-refresh every 5 seconds
        if (this.conversationRefreshInterval) {
            clearInterval(this.conversationRefreshInterval);
        }
        this.conversationRefreshInterval = setInterval(async () => {
            if (document.getElementById('chatModal')) {
                await this.refreshChatMessages(ticket.id);
            } else {
                clearInterval(this.conversationRefreshInterval);
            }
        }, 5000);
    }
    
    renderChatMessages(conversations, authorNames) {
        if (!conversations || conversations.length === 0) {
            return '<div style="text-align: center; padding: 40px; color: #6b7280;">No messages yet. Start the conversation!</div>';
        }
        
        let lastDate = null;
        let html = '';
        const currentUserId = this.getCurrentUserId();
        
        for (const conv of conversations) {
            const messageDate = new Date(conv.created_at);
            const dateStr = messageDate.toLocaleDateString();
            const timeStr = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (lastDate !== dateStr) {
                html += `<div style="text-align: center; margin: 15px 0;"><span style="background: #e5e7eb; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${dateStr}</span></div>`;
                lastDate = dateStr;
            }
            
            const isCurrentUser = conv.author_id === currentUserId;
            const authorName = authorNames[conv.author_id] || 'Support';
            const align = isCurrentUser ? 'flex-end' : 'flex-start';
            const bgColor = isCurrentUser ? '#4C1D95' : 'white';
            const textColor = isCurrentUser ? 'white' : '#1f2937';
            
            html += `
                <div style="display: flex; justify-content: ${align}; margin-bottom: 15px;">
                    <div style="max-width: 70%; background: ${bgColor}; padding: 10px 15px; border-radius: 12px; ${isCurrentUser ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'} color: ${textColor}; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="font-size: 12px;">${isCurrentUser ? 'You' : this.escapeHtml(authorName)}</strong>
                            <small style="font-size: 10px; opacity: 0.7;">${timeStr}</small>
                        </div>
                        <p style="margin: 5px 0 0 0;">${this.escapeHtml(conv.message)}</p>
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    async refreshChatMessages(ticketId) {
        const supabaseClient = this.getSupabaseClient();
        const messagesArea = document.getElementById('chatMessagesArea');
        if (!messagesArea) return;
        
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
                    profiles.forEach(p => { authorNames[p.id] = p.full_name; });
                }
            }
            
            const newHtml = this.renderChatMessages(conversations, authorNames);
            const oldScrollTop = messagesArea.scrollTop;
            const oldScrollHeight = messagesArea.scrollHeight;
            
            messagesArea.innerHTML = newHtml;
            
            if (oldScrollHeight - oldScrollTop < 200) {
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        }
    }
    
    async sendChatMessage() {
        const messageInput = document.getElementById('chatMessageInput');
        const message = messageInput?.value.trim();
        
        if (!message) {
            this.showToast('Please enter a message', 'warning');
            return;
        }
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userId || !supabaseClient) return;
        
        const sendBtn = document.getElementById('sendChatBtn');
        const originalText = sendBtn?.innerHTML;
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
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
            
            await this.refreshChatMessages(this.currentTicketId);
            
            // Update ticket updated_at
            await supabaseClient
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', this.currentTicketId);
            
            // Update local ticket list
            const ticketIndex = this.currentTickets.findIndex(t => t.id === this.currentTicketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].updated_at = new Date().toISOString();
                this.renderTickets();
                this.updateSummary();
            }
            
            this.showToast('Message sent', 'success');
            
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
            this.showToast(`Ticket created successfully! ID: ${newTicket.ticket_number}`, 'success');
            
            setTimeout(() => this.loadTickets(), 1500);
            
        } catch (error) {
            console.error('Error:', error);
            this.showToast('Failed to create ticket: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
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
    
    closeCurrentTicket() {
        if (!this.currentTicketId) return;
        if (confirm('Are you sure you want to close this ticket?')) {
            this.closeTicket(this.currentTicketId);
            this.closeTicketModal();
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
            
            this.showToast('Ticket closed successfully', 'success');
            
        } catch (error) {
            this.showToast('Failed to close ticket: ' + error.message, 'error');
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
            }
            
            this.showToast('Ticket reopened successfully', 'success');
            
        } catch (error) {
            this.showToast('Failed to reopen ticket: ' + error.message, 'error');
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

// Global exports
window.ticketSystem = new StudentTicketSystem();
window.loadSupportTickets = () => window.ticketSystem.loadTickets();
window.viewSupportTicket = (id) => window.ticketSystem.viewTicket(id);

// Wait for database to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await window.ticketSystem.initialize();
    });
} else {
    window.ticketSystem.initialize();
}
