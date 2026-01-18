// student-tickets.js - Student Support Ticket System
// *************************************************************************
// *** STUDENT SUPPORT TICKET SYSTEM ***
// *************************************************************************

class StudentTicketSystem {
    constructor() {
        this.currentTickets = [];
        this.ticketCategories = [];
        this.currentFilter = 'all';
        this.currentTicketId = null;
        this.isInitialized = false;
        this.filesToUpload = [];
        
        // DOM Elements cache
        this.elements = {};
        
        this.initialize();
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        console.log('🎫 Initializing Student Ticket System...');
        this.cacheElements();
        this.setupEventListeners();
        this.loadTicketCategories();
        this.setupFileUpload();
        this.isInitialized = true;
        
        console.log('✅ Student Ticket System initialized');
    }
    
    cacheElements() {
        this.elements = {
            // Main containers
            ticketsContainer: document.getElementById('support-tickets'),
            ticketsTableBody: document.getElementById('tickets-table-body'),
            
            // Summary elements
            openCount: document.getElementById('open-tickets-count'),
            progressCount: document.getElementById('progress-tickets-count'),
            resolvedCount: document.getElementById('resolved-tickets-count'),
            urgentCount: document.getElementById('urgent-tickets-count'),
            totalCount: document.getElementById('total-tickets-count'),
            lastUpdated: document.getElementById('last-updated-time'),
            
            // Form elements
            newTicketBtn: document.getElementById('new-ticket-btn'),
            newTicketForm: document.getElementById('new-ticket-form'),
            createTicketForm: document.getElementById('create-ticket-form'),
            closeFormBtn: document.getElementById('close-form-btn'),
            cancelTicketBtn: document.getElementById('cancel-ticket-btn'),
            createFirstTicketBtn: document.getElementById('create-first-ticket'),
            
            // Form inputs
            categorySelect: document.getElementById('ticket-category'),
            prioritySelect: document.getElementById('ticket-priority'),
            subjectInput: document.getElementById('ticket-subject'),
            descriptionInput: document.getElementById('ticket-description'),
            attachmentsInput: document.getElementById('ticket-attachments'),
            filePreview: document.getElementById('file-preview'),
            
            // Character counters
            descCharCount: document.getElementById('desc-char-count'),
            
            // Modal elements
            ticketModal: document.getElementById('ticket-detail-modal'),
            closeModalBtn: document.querySelector('.close-modal'),
            closeModalBtnAlt: document.querySelector('.close-modal-btn'),
            modalTicketTitle: document.getElementById('modal-ticket-title'),
            
            // Ticket detail elements
            detailTicketNumber: document.getElementById('detail-ticket-number'),
            detailStatus: document.getElementById('detail-status'),
            detailCategory: document.getElementById('detail-category'),
            detailPriority: document.getElementById('detail-priority'),
            detailCreatedAt: document.getElementById('detail-created-at'),
            detailDescription: document.getElementById('detail-description'),
            detailAttachments: document.getElementById('detail-attachments'),
            attachmentsSection: document.querySelector('.attachments-section'),
            
            // Conversations elements
            conversationsList: document.getElementById('conversations-list'),
            conversationCount: document.getElementById('conversation-count'),
            newMessageInput: document.getElementById('new-message'),
            sendMessageBtn: document.getElementById('send-message-btn'),
            cancelMessageBtn: document.getElementById('cancel-message-btn'),
            messageCharCount: document.getElementById('message-char-count'),
            
            // Ticket actions
            closeTicketBtn: document.getElementById('close-ticket-btn'),
            reopenTicketBtn: document.getElementById('reopen-ticket-btn'),
            
            // Filter and search
            refreshBtn: document.getElementById('refresh-tickets-btn'),
            searchInput: document.getElementById('ticket-search'),
            filterDropdown: document.querySelector('.filter-dropdown .dropdown-menu'),
            
            // Loading state
            ticketsLoading: document.getElementById('tickets-loading'),
            emptyRow: document.querySelector('.empty-row')
        };
    }
    
    setupEventListeners() {
        // Show new ticket form
        if (this.elements.newTicketBtn) {
            this.elements.newTicketBtn.addEventListener('click', () => this.showNewTicketForm());
        }
        
        if (this.elements.createFirstTicketBtn) {
            this.elements.createFirstTicketBtn.addEventListener('click', () => this.showNewTicketForm());
        }
        
        // Close new ticket form
        if (this.elements.closeFormBtn) {
            this.elements.closeFormBtn.addEventListener('click', () => this.hideNewTicketForm());
        }
        
        if (this.elements.cancelTicketBtn) {
            this.elements.cancelTicketBtn.addEventListener('click', () => this.hideNewTicketForm());
        }
        
        // Submit new ticket
        if (this.elements.createTicketForm) {
            this.elements.createTicketForm.addEventListener('submit', (e) => this.handleCreateTicket(e));
        }
        
        // Description character counter
        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.addEventListener('input', () => {
                this.updateCharCounter(this.elements.descriptionInput, this.elements.descCharCount, 5000);
            });
        }
        
        // Message character counter
        if (this.elements.newMessageInput) {
            this.elements.newMessageInput.addEventListener('input', () => {
                this.updateCharCounter(this.elements.newMessageInput, this.elements.messageCharCount, 2000);
            });
        }
        
        // Send message
        if (this.elements.sendMessageBtn) {
            this.elements.sendMessageBtn.addEventListener('click', () => this.sendTicketMessage());
        }
        
        // Cancel message
        if (this.elements.cancelMessageBtn) {
            this.elements.cancelMessageBtn.addEventListener('click', () => {
                this.elements.newMessageInput.value = '';
            });
        }
        
        // Close ticket
        if (this.elements.closeTicketBtn) {
            this.elements.closeTicketBtn.addEventListener('click', () => this.closeCurrentTicket());
        }
        
        // Reopen ticket
        if (this.elements.reopenTicketBtn) {
            this.elements.reopenTicketBtn.addEventListener('click', () => this.reopenCurrentTicket());
        }
        
        // Close modal
        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', () => this.closeTicketModal());
        }
        
        if (this.elements.closeModalBtnAlt) {
            this.elements.closeModalBtnAlt.addEventListener('click', () => this.closeTicketModal());
        }
        
        // Refresh tickets
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.loadTickets());
        }
        
        // Search tickets
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTickets(e.target.value);
                }, 300);
            });
        }
        
        // Filter tickets
        if (this.elements.filterDropdown) {
            this.elements.filterDropdown.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filter = e.target.getAttribute('data-filter');
                    this.filterTickets(filter);
                });
            });
        }
        
        // Load tickets when tab is shown
        document.addEventListener('tabChanged', (e) => {
            if (e.detail.tabId === 'support-tickets') {
                this.loadTickets();
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.ticketModal.style.display !== 'none') {
                this.closeTicketModal();
            }
        });
        
        // Close modal on overlay click
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
        
        // File input change
        this.elements.attachmentsInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
        
        // Drag and drop
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
        
        // Add event listeners to remove buttons
        this.elements.filePreview.querySelectorAll('.remove-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-file-btn').getAttribute('data-index'));
                this.removeFile(index);
            });
        });
    }
    
    clearFiles() {
        this.filesToUpload = [];
        this.elements.attachmentsInput.value = '';
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
    
    // Helper function for safe Supabase client access
    getSupabaseClient() {
        const client = window.db?.supabase;
        if (!client || typeof client.from !== 'function') {
            console.error('❌ No valid Supabase client available');
            return null;
        }
        return client;
    }
    
    // Helper function for safe user profile access
    getUserProfile() {
        return window.db?.currentUserProfile || 
               window.currentUserProfile || 
               window.userProfile || 
               {};
    }
    
    // Helper function for safe user ID access
    getCurrentUserId() {
        return window.db?.currentUserId || window.currentUserId;
    }
    
    // Load tickets from database
    async loadTickets() {
        console.log('📋 Loading student tickets...');
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!supabaseClient) {
            this.showToast('Database connection error', 'error');
            return;
        }
        
        // Show loading state
        this.showLoading(true);
        
        try {
            // Load tickets for current user
            const { data: tickets, error } = await supabaseClient
                .from('support_tickets')
                .select(`
                    *,
                    assigned_to_user:assigned_to(id, full_name, email),
                    resolved_by_user:resolved_by(id, full_name)
                `)
                .eq('student_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Store tickets
            this.currentTickets = tickets || [];
            
            // Update UI
            this.renderTickets();
            this.updateSummary();
            this.updateLastUpdated();
            
            console.log(`✅ Loaded ${this.currentTickets.length} tickets`);
            
        } catch (error) {
            console.error("Failed to load tickets:", error);
            this.showToast('Error loading tickets', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // Load ticket categories
    async loadTicketCategories() {
        // Use default categories for now
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
    
    // Render tickets in the table
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
            
            // Re-attach event listener
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
    
    // Get filtered tickets based on current filter
    getFilteredTickets() {
        const tickets = this.currentTickets.filter(ticket => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'open') return ticket.status === 'open';
            if (this.currentFilter === 'progress') return ticket.status === 'in_progress';
            if (this.currentFilter === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
            if (this.currentFilter === 'urgent') return ticket.priority === 'urgent';
            return true;
        });
        
        // Apply search filter if active
        const searchTerm = this.elements.searchInput?.value.toLowerCase().trim();
        if (searchTerm) {
            return tickets.filter(ticket => {
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
    
    // Create ticket table row
    createTicketRow(ticket) {
        const createdDate = this.formatDate(ticket.created_at);
        const updatedDate = this.formatDate(ticket.updated_at || ticket.created_at);
        const assignedTo = ticket.assigned_to_user?.full_name || 'Unassigned';
        
        return `
            <tr class="ticket-row" data-id="${ticket.id}">
                <td>
                    <span class="ticket-id">${ticket.ticket_number || 'N/A'}</span>
                </td>
                <td>
                    <div class="ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                    <div class="ticket-excerpt">${this.escapeHtml(ticket.description?.substring(0, 60) || '')}...</div>
                </td>
                <td>
                    <span class="category-badge">${this.getCategoryLabel(ticket.category)}</span>
                </td>
                <td>
                    <span class="priority-badge ${ticket.priority}">${ticket.priority}</span>
                </td>
                <td>
                    <span class="status-badge ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
                </td>
                <td>
                    <span class="date-cell">${createdDate}</span>
                </td>
                <td>
                    <span class="date-cell">${updatedDate}</span>
                </td>
                <td>
                    <div class="ticket-actions">
                        <button class="btn-view-ticket" data-id="${ticket.id}" title="View ticket">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${ticket.status === 'open' ? `
                            <button class="btn-close-ticket" data-id="${ticket.id}" title="Close ticket">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
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
        // View ticket buttons
        document.querySelectorAll('.btn-view-ticket').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ticketId = btn.getAttribute('data-id');
                this.viewTicket(ticketId);
            });
        });
        
        // Close ticket buttons
        document.querySelectorAll('.btn-close-ticket').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const ticketId = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to close this ticket? This action cannot be undone.')) {
                    await this.closeTicket(ticketId);
                }
            });
        });
        
        // Row click to view ticket
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
        
        // Store current ticket ID
        this.currentTicketId = ticketId;
        
        // Update modal content
        this.updateModalContent(ticket);
        
        // Load ticket conversations
        await this.loadTicketConversations(ticketId);
        
        // Load ticket attachments if any
        this.loadTicketAttachments(ticket);
        
        // Update action buttons based on ticket status
        this.updateActionButtons(ticket.status);
        
        // Show modal
        this.showTicketModal();
    }
    
    updateModalContent(ticket) {
        if (!ticket) return;
        
        // Update modal title
        if (this.elements.modalTicketTitle) {
            this.elements.modalTicketTitle.textContent = ticket.subject;
        }
        
        // Update ticket details
        if (this.elements.detailTicketNumber) {
            this.elements.detailTicketNumber.textContent = ticket.ticket_number || 'N/A';
        }
        
        if (this.elements.detailStatus) {
            this.elements.detailStatus.textContent = ticket.status.replace('_', ' ');
            this.elements.detailStatus.className = `status-badge ${ticket.status}`;
        }
        
        if (this.elements.detailCategory) {
            this.elements.detailCategory.textContent = this.getCategoryLabel(ticket.category);
        }
        
        if (this.elements.detailPriority) {
            this.elements.detailPriority.textContent = ticket.priority;
            this.elements.detailPriority.className = `priority-badge ${ticket.priority}`;
        }
        
        if (this.elements.detailCreatedAt) {
            this.elements.detailCreatedAt.textContent = this.formatDate(ticket.created_at, true);
        }
        
        if (this.elements.detailDescription) {
            this.elements.detailDescription.textContent = ticket.description || 'No description provided.';
        }
    }
    
    updateActionButtons(status) {
        const isOpen = status === 'open';
        const isClosed = status === 'closed' || status === 'resolved';
        
        this.elements.closeTicketBtn.style.display = isOpen ? 'inline-block' : 'none';
        this.elements.reopenTicketBtn.style.display = isClosed ? 'inline-block' : 'none';
    }
    
    async loadTicketConversations(ticketId) {
        const supabaseClient = this.getSupabaseClient();
        if (!supabaseClient || !this.elements.conversationsList) return;
        
        try {
            const { data: conversations, error } = await supabaseClient
                .from('ticket_conversations')
                .select(`
                    *,
                    author:author_id(id, full_name, role, email)
                `)
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            // Render conversations
            this.renderConversations(conversations || []);
            
            // Update conversation count
            if (this.elements.conversationCount) {
                this.elements.conversationCount.textContent = conversations?.length || 0;
            }
            
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.elements.conversationsList.innerHTML = `
                <div class="conversation-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading conversations</p>
                </div>
            `;
        }
    }
    
    loadTicketAttachments(ticket) {
        if (!this.elements.detailAttachments || !this.elements.attachmentsSection) return;
        
        // Check if ticket has attachments
        const attachments = ticket.attachments || [];
        
        if (attachments.length === 0) {
            this.elements.attachmentsSection.style.display = 'none';
            return;
        }
        
        this.elements.attachmentsSection.style.display = 'block';
        
        // Render attachments (simplified - in real app, you'd need to handle file storage)
        this.elements.detailAttachments.innerHTML = attachments
            .map((attachment, index) => `
                <div class="attachment-item">
                    <i class="fas ${this.getFileIcon(attachment.type || '')}"></i>
                    <div class="attachment-info">
                        <div class="attachment-name">${attachment.name || `Attachment ${index + 1}`}</div>
                        <div class="attachment-size">${attachment.size || ''}</div>
                    </div>
                    <a href="${attachment.url || '#'}" class="download-btn" target="_blank" download>
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `)
            .join('');
    }
    
    renderConversations(conversations) {
        if (!this.elements.conversationsList) return;
        
        if (conversations.length === 0) {
            this.elements.conversationsList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-comments"></i>
                    <p>No conversations yet. Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        this.elements.conversationsList.innerHTML = conversations
            .map(conv => this.createConversationItem(conv))
            .join('');
        
        // Scroll to bottom
        this.elements.conversationsList.scrollTop = this.elements.conversationsList.scrollHeight;
    }
    
    createConversationItem(conversation) {
        const author = conversation.author || {};
        const isCurrentUser = author.id === this.getCurrentUserId();
        const isStaff = author.role !== 'student';
        const isInternal = conversation.is_internal;
        
        let messageClass = 'student';
        let authorLabel = 'You';
        
        if (isInternal) {
            messageClass = 'internal';
            authorLabel = 'Support Team (Internal)';
        } else if (isStaff) {
            messageClass = 'staff';
            authorLabel = author.full_name || 'Support Team';
        } else if (!isCurrentUser) {
            authorLabel = author.full_name || 'Student';
        }
        
        return `
            <div class="conversation-item ${messageClass}">
                <div class="conversation-header">
                    <div class="author-info">
                        <span class="author-name">${authorLabel}</span>
                        <span class="conversation-type">${conversation.message_type || 'comment'}</span>
                    </div>
                    <div class="conversation-meta">
                        <span class="conversation-date">${this.formatDate(conversation.created_at, true)}</span>
                        ${isInternal ? '<span class="internal-badge">INTERNAL</span>' : ''}
                    </div>
                </div>
                <div class="conversation-body">
                    <p>${this.escapeHtml(conversation.message)}</p>
                </div>
                ${conversation.attachments?.length > 0 ? `
                    <div class="conversation-attachments">
                        <i class="fas fa-paperclip"></i>
                        <span>${conversation.attachments.length} attachment(s)</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    async sendTicketMessage() {
        if (!this.currentTicketId) {
            this.showToast('No ticket selected', 'error');
            return;
        }
        
        const message = this.elements.newMessageInput?.value.trim();
        if (!message) {
            this.showToast('Please enter a message', 'warning');
            return;
        }
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        if (!supabaseClient) return;
        
        // Show sending state
        const originalText = this.elements.sendMessageBtn.innerHTML;
        this.elements.sendMessageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        this.elements.sendMessageBtn.disabled = true;
        
        try {
            // Add message to conversations
            const { data: newConversation, error } = await supabaseClient
                .from('ticket_conversations')
                .insert([{
                    ticket_id: this.currentTicketId,
                    author_id: userId,
                    message: message,
                    message_type: 'comment',
                    is_internal: false
                }])
                .select(`
                    *,
                    author:author_id(id, full_name, role)
                `)
                .single();
            
            if (error) throw error;
            
            // Clear input
            this.elements.newMessageInput.value = '';
            this.updateCharCounter(this.elements.newMessageInput, this.elements.messageCharCount, 2000);
            
            // Add to conversations list
            const convList = this.elements.conversationsList;
            const newConvItem = this.createConversationItem(newConversation);
            
            if (convList.querySelector('.no-conversations')) {
                convList.innerHTML = newConvItem;
            } else {
                convList.insertAdjacentHTML('beforeend', newConvItem);
            }
            
            // Update conversation count
            const currentCount = parseInt(this.elements.conversationCount.textContent) || 0;
            this.elements.conversationCount.textContent = currentCount + 1;
            
            // Scroll to bottom
            convList.scrollTop = convList.scrollHeight;
            
            // Update ticket's updated_at timestamp
            await supabaseClient
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', this.currentTicketId);
            
            // Update the ticket in the list
            const ticketIndex = this.currentTickets.findIndex(t => t.id === this.currentTicketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].updated_at = new Date().toISOString();
                this.renderTickets();
                this.updateSummary();
            }
            
            this.showToast('Message sent successfully', 'success');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        } finally {
            // Restore button state
            this.elements.sendMessageBtn.innerHTML = originalText;
            this.elements.sendMessageBtn.disabled = false;
        }
    }
    
    async handleCreateTicket(e) {
        e.preventDefault();
        
        const userProfile = this.getUserProfile();
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userProfile || !supabaseClient) {
            this.showToast('System error: User profile or database not available', 'error');
            return;
        }
        
        // Get form values
        const category = this.elements.categorySelect?.value;
        const priority = this.elements.prioritySelect?.value;
        const subject = this.elements.subjectInput?.value.trim();
        const description = this.elements.descriptionInput?.value.trim();
        
        // Validation
        if (!category || !subject || !description) {
            this.showToast('Please fill all required fields', 'warning');
            return;
        }
        
        if (description.length < 10) {
            this.showToast('Please provide a more detailed description (minimum 10 characters)', 'warning');
            return;
        }
        
        // Disable form during submission
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
            // Prepare ticket data
            const ticketData = {
                student_id: userId,
                category: category,
                priority: priority || 'medium',
                subject: subject,
                description: description,
                status: 'open',
                source: 'web'
            };
            
            // Handle attachments if any
            if (this.filesToUpload.length > 0) {
                // In a real app, you would upload files to storage first
                // For now, we'll store file metadata as JSON
                ticketData.attachments = this.filesToUpload.map(file => ({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }));
            }
            
            // Create ticket
            const { data: newTicket, error } = await supabaseClient
                .from('support_tickets')
                .insert([ticketData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Clear form and files
            this.elements.createTicketForm.reset();
            this.clearFiles();
            this.updateCharCounter(this.elements.descriptionInput, this.elements.descCharCount, 5000);
            
            // Hide form
            this.hideNewTicketForm();
            
            // Show success
            this.showToast(`Ticket created successfully! Ticket ID: ${newTicket.ticket_number}`, 'success');
            
            // Reload tickets after a delay
            setTimeout(() => {
                this.loadTickets();
            }, 1500);
            
        } catch (error) {
            console.error('Error creating ticket:', error);
            this.showToast('Failed to create ticket: ' + error.message, 'error');
            
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
    
    async closeTicket(ticketId) {
        const supabaseClient = this.getSupabaseClient();
        if (!supabaseClient) return;
        
        try {
            const { error } = await supabaseClient
                .from('support_tickets')
                .update({ 
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', ticketId)
                .eq('student_id', this.getCurrentUserId());
            
            if (error) throw error;
            
            // Update local state
            const ticketIndex = this.currentTickets.findIndex(t => t.id === ticketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].status = 'closed';
                this.currentTickets[ticketIndex].closed_at = new Date().toISOString();
                this.currentTickets[ticketIndex].updated_at = new Date().toISOString();
            }
            
            // Update UI
            this.renderTickets();
            this.updateSummary();
            
            this.showToast('Ticket closed successfully', 'success');
            
        } catch (error) {
            console.error('Error closing ticket:', error);
            this.showToast('Failed to close ticket', 'error');
        }
    }
    
    async closeCurrentTicket() {
        if (!this.currentTicketId) return;
        
        if (confirm('Are you sure you want to close this ticket? This action cannot be undone.')) {
            await this.closeTicket(this.currentTicketId);
            this.closeTicketModal();
        }
    }
    
    async reopenCurrentTicket() {
        if (!this.currentTicketId) return;
        
        const supabaseClient = this.getSupabaseClient();
        if (!supabaseClient) return;
        
        try {
            const { error } = await supabaseClient
                .from('support_tickets')
                .update({ 
                    status: 'open',
                    closed_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentTicketId)
                .eq('student_id', this.getCurrentUserId());
            
            if (error) throw error;
            
            // Update local state
            const ticketIndex = this.currentTickets.findIndex(t => t.id === this.currentTicketId);
            if (ticketIndex !== -1) {
                this.currentTickets[ticketIndex].status = 'open';
                this.currentTickets[ticketIndex].closed_at = null;
                this.currentTickets[ticketIndex].updated_at = new Date().toISOString();
            }
            
            // Update UI
            this.renderTickets();
            this.updateSummary();
            this.updateActionButtons('open');
            
            this.showToast('Ticket reopened successfully', 'success');
            
        } catch (error) {
            console.error('Error reopening ticket:', error);
            this.showToast('Failed to reopen ticket', 'error');
        }
    }
    
    // Update summary cards
    updateSummary() {
        if (!this.currentTickets.length) {
            this.elements.openCount.textContent = '0';
            this.elements.progressCount.textContent = '0';
            this.elements.resolvedCount.textContent = '0';
            this.elements.urgentCount.textContent = '0';
            this.elements.totalCount.textContent = '0 tickets';
            return;
        }
        
        const counts = {
            open: this.currentTickets.filter(t => t.status === 'open').length,
            progress: this.currentTickets.filter(t => t.status === 'in_progress').length,
            resolved: this.currentTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
            urgent: this.currentTickets.filter(t => t.priority === 'urgent').length,
            total: this.currentTickets.length
        };
        
        this.elements.openCount.textContent = counts.open;
        this.elements.progressCount.textContent = counts.progress;
        this.elements.resolvedCount.textContent = counts.resolved;
        this.elements.urgentCount.textContent = counts.urgent;
        this.elements.totalCount.textContent = `${counts.total} ticket${counts.total !== 1 ? 's' : ''}`;
        
        // Update badge in sidebar
        const ticketsBadge = document.getElementById('ticketsBadge');
        if (ticketsBadge) {
            const unreadCount = this.currentTickets.filter(t => 
                (t.status === 'open' || t.status === 'in_progress') && 
                t.priority === 'urgent'
            ).length;
            
            if (unreadCount > 0) {
                ticketsBadge.textContent = unreadCount;
                ticketsBadge.style.display = 'inline-flex';
            } else {
                ticketsBadge.style.display = 'none';
            }
        }
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
            // Scroll to form
            this.elements.newTicketForm.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    hideNewTicketForm() {
        if (this.elements.newTicketForm) {
            this.elements.newTicketForm.style.display = 'none';
            // Reset form
            this.elements.createTicketForm?.reset();
            this.clearFiles();
            this.updateCharCounter(this.elements.descriptionInput, this.elements.descCharCount, 5000);
        }
    }
    
    showTicketModal() {
        if (this.elements.ticketModal) {
            this.elements.ticketModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.elements.newMessageInput?.focus();
        }
    }
    
    closeTicketModal() {
        if (this.elements.ticketModal) {
            this.elements.ticketModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.currentTicketId = null;
            this.elements.newMessageInput.value = '';
            this.updateCharCounter(this.elements.newMessageInput, this.elements.messageCharCount, 2000);
        }
    }
    
    searchTickets(searchTerm) {
        this.renderTickets();
    }
    
    filterTickets(filter) {
        this.currentFilter = filter;
        this.renderTickets();
        
        // Update filter button text
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
            if (this.elements.emptyRow) {
                this.elements.emptyRow.style.display = 'none';
            }
        } else {
            this.elements.ticketsLoading.style.display = 'none';
            if (this.elements.emptyRow) {
                this.elements.emptyRow.style.display = '';
            }
        }
    }
    
    showToast(text, type = 'info') {
        // Use UI module if available
        if (window.ui && window.ui.showToast) {
            window.ui.showToast(text, type);
            return;
        }
        
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                               type === 'error' ? 'fa-exclamation-circle' : 
                               type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${text}</span>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
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
            return date.toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Create and export singleton instance
window.ticketSystem = new StudentTicketSystem();

// Export individual functions for global access
window.loadSupportTickets = () => window.ticketSystem.loadTickets();
window.viewSupportTicket = (id) => window.ticketSystem.viewTicket(id);
window.createSupportTicket = (e) => window.ticketSystem.handleCreateTicket(e);
window.closeSupportTicket = (id) => window.ticketSystem.closeTicket(id);
window.filterSupportTickets = (filter) => window.ticketSystem.filterTickets(filter);
window.searchSupportTickets = (term) => window.ticketSystem.searchTickets(term);

// Auto-initialize when app is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ticketSystem.initialize();
    });
} else {
    window.ticketSystem.initialize();
}

// Listen for app ready event
document.addEventListener('appReady', () => {
    console.log('📱 App ready, initializing student ticket system...');
    window.ticketSystem.initialize();
});
