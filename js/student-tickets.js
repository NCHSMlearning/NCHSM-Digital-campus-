// student-tickets.js - Student Support Ticket System
// *** CHAT-STYLE INTERFACE WITH PERSISTENT STATE ***

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
        this.loadUserProfile();
        this.isInitialized = true;
        
        console.log('✅ Student Ticket System initialized');
    }
    
    async loadUserProfile() {
        // Try multiple sources for user profile
        if (window.currentUserProfile) {
            this.userProfile = window.currentUserProfile;
        } else if (window.db?.currentUserProfile) {
            this.userProfile = window.db.currentUserProfile;
        } else if (window.userProfile) {
            this.userProfile = window.userProfile;
        }
        
        // If found, load tickets
        if (this.userProfile) {
            await this.loadTickets();
        }
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
            if (e.key === 'Escape' && this.elements.ticketModal && this.elements.ticketModal.style.display !== 'none') {
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
    
    getUserProfile() {
        return this.userProfile || window.db?.currentUserProfile || window.currentUserProfile || null;
    }
    
    getCurrentUserId() {
        const profile = this.getUserProfile();
        return profile?.id || null;
    }
    
    async loadTickets() {
        console.log('📋 Loading student tickets...');
        
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userId) {
            console.error('❌ No user ID found');
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
        
        let statusClass = 'status-open';
        if (ticket.status === 'open') statusClass = 'status-open';
        if (ticket.status === 'in_progress') statusClass = 'status-progress';
        if (ticket.status === 'resolved') statusClass = 'status-resolved';
        if (ticket.status === 'closed') statusClass = 'status-closed';
        
        let priorityClass = 'priority-medium';
        if (ticket.priority === 'urgent') priorityClass = 'priority-urgent';
        if (ticket.priority === 'high') priorityClass = 'priority-high';
        if (ticket.priority === 'medium') priorityClass = 'priority-medium';
        if (ticket.priority === 'low') priorityClass = 'priority-low';
        
        return `
            <tr class="ticket-row" data-id="${ticket.id}" style="cursor: pointer;">
                <td style="padding: 12px;">
                    <span class="ticket-id">${ticket.ticket_number || 'N/A'}</span>
                </td>
                <td style="padding: 12px;">
                    <div class="ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                    <div class="ticket-excerpt">${this.escapeHtml(ticket.description?.substring(0, 60) || '')}...</div>
                </td>
                <td style="padding: 12px;">
                    <span class="category-badge">${this.getCategoryLabel(ticket.category)}</span>
                </td>
                <td style="padding: 12px;">
                    <span class="${priorityClass} priority-badge">${ticket.priority}</span>
                </td>
                <td style="padding: 12px;">
                    <span class="${statusClass} status-badge">${ticket.status.replace('_', ' ')}</span>
                </td>
                <td style="padding: 12px;">
                    <span class="date-cell">${createdDate}</span>
                </td>
                <td style="padding: 12px;">
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
        
        // Create beautiful chat modal
        await this.showChatModal(ticket);
    }
    
    async showChatModal(ticket) {
        const supabaseClient = this.getSupabaseClient();
        
        // Get conversations
        const { data: conversations } = await supabaseClient
            .from('ticket_conversations')
            .select('*, author:author_id(id, full_name, role)')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true });
        
        const modalHtml = `
            <div id="chatModal" class="chat-modal" style="display: flex;">
                <div class="chat-modal-overlay" onclick="document.getElementById('chatModal').remove()"></div>
                <div class="chat-modal-container">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <h3>🎫 ${this.escapeHtml(ticket.ticket_number)}</h3>
                            <p class="chat-subject">${this.escapeHtml(ticket.subject)}</p>
                        </div>
                        <div class="chat-header-status">
                            <span class="status-badge status-${ticket.status}">${ticket.status}</span>
                            <span class="priority-badge priority-${ticket.priority}">${ticket.priority}</span>
                        </div>
                        <button class="chat-close" onclick="document.getElementById('chatModal').remove()">✕</button>
                    </div>
                    
                    <div class="chat-description">
                        <div class="description-label">📝 Description</div>
                        <div class="description-text">${this.escapeHtml(ticket.description)}</div>
                        <div class="description-meta">
                            <span>📅 Created: ${new Date(ticket.created_at).toLocaleString()}</span>
                            <span>🏷️ Category: ${this.getCategoryLabel(ticket.category)}</span>
                        </div>
                    </div>
                    
                    <div class="chat-messages-area" id="chatMessagesArea">
                        ${this.renderChatMessages(conversations || [])}
                    </div>
                    
                    <div class="chat-input-area">
                        <div class="chat-input-wrapper">
                            <textarea id="chatMessageInput" class="chat-input" rows="2" placeholder="Type your message here..."></textarea>
                            <div class="chat-input-actions">
                                <span class="char-counter">0/2000</span>
                                <button id="sendChatMessageBtn" class="chat-send-btn">
                                    <i class="fas fa-paper-plane"></i> Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('chatModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listeners
        const messageInput = document.getElementById('chatMessageInput');
        const sendBtn = document.getElementById('sendChatMessageBtn');
        const charCounter = document.querySelector('.char-counter');
        
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                const length = messageInput.value.length;
                charCounter.textContent = `${length}/2000`;
                if (length > 2000) {
                    charCounter.style.color = 'red';
                } else {
                    charCounter.style.color = '#999';
                }
            });
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendBtn.click();
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        // Start auto-refresh
        if (this.conversationRefreshInterval) {
            clearInterval(this.conversationRefreshInterval);
        }
        this.conversationRefreshInterval = setInterval(() => {
            if (document.getElementById('chatModal')) {
                this.refreshChatMessages(ticket.id);
            } else {
                clearInterval(this.conversationRefreshInterval);
            }
        }, 3000);
    }
    
    renderChatMessages(conversations) {
        if (!conversations || conversations.length === 0) {
            return `
                <div class="chat-empty">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
        }
        
        let lastDate = null;
        let html = '';
        
        for (const conv of conversations) {
            const messageDate = new Date(conv.created_at);
            const dateStr = messageDate.toLocaleDateString();
            const timeStr = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (lastDate !== dateStr) {
                if (lastDate) {
                    html += `<div class="chat-date-divider"><span>${dateStr}</span></div>`;
                } else {
                    html += `<div class="chat-date-divider"><span>${dateStr}</span></div>`;
                }
                lastDate = dateStr;
            }
            
            const isCurrentUser = conv.author_id === this.getCurrentUserId();
            const authorName = conv.author?.full_name || 'Support Team';
            const isInternal = conv.is_internal;
            
            if (isInternal && !isCurrentUser) {
                html += `
                    <div class="chat-message internal">
                        <div class="message-bubble internal-bubble">
                            <div class="message-header">
                                <span class="message-author">🔒 Internal Note</span>
                                <span class="message-time">${timeStr}</span>
                            </div>
                            <div class="message-text">${this.escapeHtml(conv.message)}</div>
                        </div>
                    </div>
                `;
            } else if (isCurrentUser) {
                html += `
                    <div class="chat-message outgoing">
                        <div class="message-bubble outgoing-bubble">
                            <div class="message-text">${this.escapeHtml(conv.message)}</div>
                            <div class="message-time">${timeStr}</div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="chat-message incoming">
                        <div class="message-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="message-bubble incoming-bubble">
                            <div class="message-header">
                                <span class="message-author">${this.escapeHtml(authorName)}</span>
                                <span class="message-time">${timeStr}</span>
                            </div>
                            <div class="message-text">${this.escapeHtml(conv.message)}</div>
                        </div>
                    </div>
                `;
            }
        }
        
        return html;
    }
    
    async refreshChatMessages(ticketId) {
        const supabaseClient = this.getSupabaseClient();
        const messagesArea = document.getElementById('chatMessagesArea');
        
        if (!messagesArea) return;
        
        const { data: conversations } = await supabaseClient
            .from('ticket_conversations')
            .select('*, author:author_id(id, full_name, role)')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
        
        if (conversations) {
            const newHtml = this.renderChatMessages(conversations);
            const oldScrollTop = messagesArea.scrollTop;
            const oldScrollHeight = messagesArea.scrollHeight;
            
            messagesArea.innerHTML = newHtml;
            
            // Scroll to bottom if was at bottom
            if (oldScrollHeight - oldScrollTop < 100) {
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
        
        const sendBtn = document.getElementById('sendChatMessageBtn');
        const originalText = sendBtn.innerHTML;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
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
            
            messageInput.value = '';
            const charCounter = document.querySelector('.char-counter');
            if (charCounter) charCounter.textContent = '0/2000';
            
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
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message: ' + error.message, 'error');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalText;
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
            console.error('Error creating ticket:', error);
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
    
    searchTickets(searchTerm) {
        this.renderTickets();
    }
    
    filterTickets(filter) {
        this.currentFilter = filter;
        this.renderTickets();
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
        if (window.ui?.showToast) {
            window.ui.showToast(text, type);
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                               type === 'error' ? 'fa-exclamation-circle' : 
                               type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${text}</span>
            </div>
        `;
        
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

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ticketSystem.initialize();
    });
} else {
    window.ticketSystem.initialize();
}
