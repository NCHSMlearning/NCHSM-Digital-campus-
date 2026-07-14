// messages.js - Messages System for NCHSM Digital Student Dashboard
// Updated with enhanced UI, stats display, and proper filtering

// *************************************************************************
// *** MESSAGES SYSTEM ***
// *************************************************************************

class MessagesSystem {
    constructor() {
        this.currentMessages = [];
        this.currentAnnouncements = [];
        this.messageTemplates = [];
        this.isInitialized = false;
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        // DOM Elements cache
        this.elements = {};
        
        this.initialize();
    }
    
    initialize() {
        if (this.isInitialized) return;
        
        console.log('💬 Initializing Messages System...');
        this.cacheElements();
        this.setupEventListeners();
        this.setupMessagePolling();
        this.isInitialized = true;
        
        console.log('✅ Messages System initialized');
        
        // Load messages after a short delay
        setTimeout(() => {
            this.loadMessages();
        }, 500);
    }
    
    cacheElements() {
        this.elements = {
            messageForm: document.getElementById('message-form'),
            messageBody: document.getElementById('student-message-body'),
            messageStatus: document.getElementById('message-status'),
            messagesList: document.getElementById('messages-list'),
            messagesTab: document.querySelector('.nav a[data-tab="messages"]'),
            messagesBadge: document.getElementById('messages-badge'),
            refreshBtn: document.getElementById('refresh-messages-btn'),
            searchInput: document.getElementById('message-search'),
            templateSelect: document.getElementById('message-template-select'),
            totalDisplay: document.getElementById('total-messages-display'),
            unreadDisplay: document.getElementById('unread-messages-display'),
            announcementsDisplay: document.getElementById('announcements-display'),
            unreadBadge: document.getElementById('unread-badge'),
            lastUpdated: document.getElementById('messages-last-updated'),
            clearSearch: document.getElementById('clear-search')
        };
    }
    
    setupEventListeners() {
        // Message form submission
        if (this.elements.messageForm) {
            this.elements.messageForm.addEventListener('submit', (e) => this.handleMessageSubmit(e));
        }
        
        // Auto-load when messages tab is clicked
        if (this.elements.messagesTab) {
            this.elements.messagesTab.addEventListener('click', () => {
                this.loadMessages();
            });
        }
        
        // Refresh button
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                this.loadMessages();
            });
        }
        
        // Search functionality
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = e.target.value.trim();
                    this.searchMessages(this.searchTerm);
                    
                    // Show/hide clear button
                    if (this.elements.clearSearch) {
                        this.elements.clearSearch.style.display = this.searchTerm ? 'block' : 'none';
                    }
                }, 300);
            });
        }
        
        // Clear search
        if (this.elements.clearSearch) {
            this.elements.clearSearch.addEventListener('click', () => {
                if (this.elements.searchInput) {
                    this.elements.searchInput.value = '';
                    this.searchTerm = '';
                    this.searchMessages('');
                    this.elements.clearSearch.style.display = 'none';
                }
            });
        }
        
        // Filter buttons
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                this.filterMessages(filter);
            });
        });
        
        // Template selection
        if (this.elements.templateSelect) {
            this.elements.templateSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.applyMessageTemplate(e.target.value);
                }
            });
        }
        
        // Listen for tab changes from UI module
        document.addEventListener('tabChanged', (e) => {
            if (e.detail.tabId === 'messages') {
                this.loadMessages();
            }
        });
    }
    
    setupMessagePolling() {
        // Poll for new messages every 2 minutes if user is active
        setInterval(() => {
            if (document.visibilityState === 'visible' && this.isMessagesTabActive()) {
                this.checkForNewMessages();
            }
        }, 120000); // 2 minutes
    }
    
    isMessagesTabActive() {
        const messagesTab = document.getElementById('messages');
        return messagesTab && messagesTab.classList.contains('active') && messagesTab.style.display !== 'none';
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
    
    // ==========================================
    // LOAD MESSAGES
    // ==========================================
    async loadMessages() {
        console.log('📨 Loading messages...');
        
        const userProfile = this.getUserProfile();
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!supabaseClient) {
            this.showMessage('Database connection error', 'error');
            return;
        }
        
        const program = userProfile?.program || userProfile?.department || 'General';
        
        // Show loading state
        if (this.elements.messagesList) {
            this.showLoading();
        }
        
        try {
            // Build query - fetch all messages
            let query = supabaseClient
                .from('student_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            // If user is logged in, filter by recipient
            if (userId) {
                query = query.or(`recipient_id.eq.${userId},recipient_program.eq.${program},recipient_type.eq.Announcement`);
            } else {
                // If no user, only show announcements
                query = query.eq('recipient_type', 'Announcement');
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            const allMessages = data || [];
            console.log(`📩 Fetched ${allMessages.length} messages from database`);
            
            // Separate into personal messages and announcements
            // Personal messages: Individual or program-specific
            this.currentMessages = allMessages.filter(m => 
                m.recipient_type === 'Individual' || 
                (m.recipient_type !== 'Announcement' && m.recipient_program === program)
            );
            
            // Announcements: Type is 'Announcement' or recipient_id is null
            this.currentAnnouncements = allMessages.filter(m => 
                m.recipient_type === 'Announcement' || 
                m.recipient_id === null
            );
            
            // Normalize fields (handle both 'message' and 'body' columns)
            this.currentMessages = this.currentMessages.map(m => ({
                ...m,
                body: m.body || m.message || '',
                message: m.message || m.body || ''
            }));
            
            this.currentAnnouncements = this.currentAnnouncements.map(m => ({
                ...m,
                body: m.body || m.message || '',
                message: m.message || m.body || '',
                title: m.subject || 'Announcement'
            }));
            
            // Update UI
            this.renderMessages();
            this.updateStats();
            this.updateUnreadCount();
            this.updateDashboardAnnouncement();
            this.updateLastUpdated();
            
            // Load templates if needed
            this.loadMessageTemplates();
            
            console.log(`✅ Loaded ${this.currentMessages.length} personal messages and ${this.currentAnnouncements.length} announcements`);
            
        } catch (error) {
            console.error("Failed to load messages:", error);
            this.showMessage('Error loading messages: ' + error.message, 'error');
            
            // Show error in messages list
            if (this.elements.messagesList) {
                this.elements.messagesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                        <h3>Error Loading Messages</h3>
                        <p>${error.message || 'Could not load messages. Please try again.'}</p>
                        <div class="empty-actions">
                            <button onclick="window.messagesSystem?.loadMessages()" class="btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // ==========================================
    // CHECK FOR NEW MESSAGES
    // ==========================================
    async checkForNewMessages() {
        try {
            const userId = this.getCurrentUserId();
            const supabaseClient = this.getSupabaseClient();
            if (!supabaseClient) return;
            
            // Get latest message timestamp
            const allMessages = [...this.currentMessages, ...this.currentAnnouncements];
            if (allMessages.length === 0) {
                this.loadMessages();
                return;
            }
            
            const latestMessage = allMessages.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            )[0];
            
            const lastTimestamp = latestMessage?.created_at;
            
            // Check for new unread messages
            const { data: newMessages, error } = await supabaseClient
                .from('student_messages')
                .select('id, is_read, created_at')
                .eq('recipient_id', userId)
                .eq('is_read', false)
                .gt('created_at', lastTimestamp || new Date(0).toISOString())
                .limit(1);
            
            if (!error && newMessages?.length > 0) {
                console.log('📬 New messages detected, reloading...');
                this.loadMessages();
            }
            
        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }
    
    // ==========================================
    // RENDER MESSAGES
    // ==========================================
    renderMessages() {
        if (!this.elements.messagesList) return;
        
        const messages = this.getFilteredMessages();
        
        if (!messages || messages.length === 0) {
            this.elements.messagesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-inbox"></i></div>
                    <h3>No Messages Found</h3>
                    <p>${this.searchTerm ? `No messages found for "${this.searchTerm}"` : 'You have no messages or announcements at this time.'}</p>
                    ${this.searchTerm ? `
                        <div class="empty-actions">
                            <button onclick="document.getElementById('message-search').value=''; window.messagesSystem?.searchMessages('');" class="btn-primary">
                                <i class="fas fa-undo"></i> Clear Search
                            </button>
                        </div>
                    ` : `
                        <div class="empty-actions">
                            <button onclick="window.messagesSystem?.loadMessages()" class="btn-primary">
                                <i class="fas fa-redo"></i> Refresh
                            </button>
                        </div>
                    `}
                </div>
            `;
            return;
        }
        
        this.elements.messagesList.innerHTML = messages
            .map(msg => this.createMessageCard(msg))
            .join('');
        
        this.attachMessageEventListeners();
    }
    
    // ==========================================
    // GET FILTERED MESSAGES
    // ==========================================
    getFilteredMessages() {
        let allMessages = [
            ...this.currentMessages.map(m => ({ ...m, type: 'Personal' })),
            ...this.currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Apply filter
        switch(this.currentFilter) {
            case 'unread':
                allMessages = allMessages.filter(m => !m.is_read);
                break;
            case 'personal':
                allMessages = allMessages.filter(m => m.type === 'Personal');
                break;
            case 'announcements':
                allMessages = allMessages.filter(m => m.type === 'Announcement');
                break;
            case 'academic':
                allMessages = allMessages.filter(m => 
                    m.subject?.toLowerCase().includes('exam') || 
                    m.subject?.toLowerCase().includes('academic') ||
                    m.subject?.toLowerCase().includes('course') ||
                    m.subject?.toLowerCase().includes('grade') ||
                    m.subject?.toLowerCase().includes('assignment')
                );
                break;
            case 'administrative':
                allMessages = allMessages.filter(m => 
                    m.subject?.toLowerCase().includes('fee') || 
                    m.subject?.toLowerCase().includes('deadline') ||
                    m.subject?.toLowerCase().includes('policy') ||
                    m.subject?.toLowerCase().includes('payment') ||
                    m.subject?.toLowerCase().includes('registration')
                );
                break;
            case 'high-priority':
                allMessages = allMessages.filter(m => 
                    m.priority === 'high' || m.priority === 'urgent'
                );
                break;
            default:
                break;
        }
        
        // Apply search if there's a search term
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            allMessages = allMessages.filter(msg => {
                const title = (msg.subject || msg.title || '').toLowerCase();
                const body = (msg.body || msg.message || msg.message_content || '').toLowerCase();
                const sender = (msg.sender_name || '').toLowerCase();
                
                return title.includes(searchLower) || 
                       body.includes(searchLower) || 
                       sender.includes(searchLower);
            });
        }
        
        return allMessages;
    }
    
    // ==========================================
    // CREATE MESSAGE CARD
    // ==========================================
    createMessageCard(msg) {
        const title = msg.subject || msg.title || 'Message';
        const body = msg.body || msg.message || msg.message_content || '';
        const isRead = msg.is_read ? 'read' : 'unread';
        const createdAt = this.formatMessageDate(msg.created_at);
        const borderColor = msg.type === 'Announcement' ? '#F97316' : '#4C1D95';
        const priority = msg.priority || 'normal';
        const icon = msg.type === 'Announcement' ? 'fa-bullhorn' : 'fa-user';
        const iconClass = msg.type === 'Announcement' ? 'announcement' : 'personal';
        
        // Truncate long messages
        const truncatedBody = body.length > 200 ? body.substring(0, 200) + '...' : body;
        const hasMore = body.length > 200;
        
        // Get sender name
        const senderName = msg.sender_name || (msg.type === 'Announcement' ? 'Administration' : 'Unknown');
        
        return `
            <div class="message-item ${isRead}" 
                 data-id="${msg.id}" 
                 data-type="${msg.type}"
                 data-priority="${priority}">
                
                <div class="message-header">
                    <div class="message-title-section">
                        <div class="message-icon ${iconClass}">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="message-title-wrapper">
                            <div class="message-title">${this.escapeHtml(title)}</div>
                            <div class="message-meta">
                                <span class="message-date"><i class="far fa-clock"></i> ${createdAt}</span>
                                <span class="priority-badge ${priority}">${priority}</span>
                                <span class="message-type-badge ${msg.type.toLowerCase()}">${msg.type}</span>
                            </div>
                        </div>
                    </div>
                    <div class="message-actions">
                        ${!msg.is_read ? `
                            <button class="mark-read-btn" data-id="${msg.id}" data-type="${msg.type}" title="Mark as read">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="view-btn" data-id="${msg.id}" title="View message">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="message-body">
                    <p>${this.escapeHtml(truncatedBody)}</p>
                    ${hasMore ? `
                        <button class="read-more-btn" data-id="${msg.id}">
                            Read More <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : ''}
                </div>
                
                <div class="message-footer">
                    <span class="message-status-indicator ${isRead}">
                        <i class="fas ${msg.is_read ? 'fa-check-circle' : 'fa-circle'}"></i>
                        ${isRead.toUpperCase()}
                    </span>
                    <span class="message-sender">
                        <i class="fas fa-user-tag"></i>
                        ${this.escapeHtml(senderName)}
                    </span>
                </div>
            </div>
        `;
    }
    
    // ==========================================
    // ATTACH EVENT LISTENERS
    // ==========================================
    attachMessageEventListeners() {
        // View message buttons
        document.querySelectorAll('.view-btn, .read-more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const messageId = btn.getAttribute('data-id');
                this.showMessageModal(messageId);
            });
        });
        
        // Mark as read buttons
        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const messageId = btn.getAttribute('data-id');
                const messageType = btn.getAttribute('data-type');
                await this.markMessageAsRead(messageId, messageType);
            });
        });
        
        // Message item click
        document.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.message-actions') && !e.target.closest('.read-more-btn')) {
                    const messageId = item.getAttribute('data-id');
                    this.showMessageModal(messageId);
                }
            });
        });
    }
    
    // ==========================================
    // SHOW MESSAGE MODAL
    // ==========================================
    async showMessageModal(messageId) {
        // Find message
        let message = this.currentMessages.find(m => m.id == messageId);
        let messageType = 'Personal';
        
        if (!message) {
            message = this.currentAnnouncements.find(a => a.id == messageId);
            messageType = 'Announcement';
        }
        
        if (!message) {
            console.warn('Message not found:', messageId);
            return;
        }
        
        // Mark as read if unread
        if (!message.is_read) {
            await this.markMessageAsRead(messageId, messageType);
        }
        
        // Create and show modal
        this.showCustomModal(message, messageType);
    }
    
    // ==========================================
    // SHOW CUSTOM MODAL
    // ==========================================
    showCustomModal(message, messageType) {
        // Remove existing modal
        const existingModal = document.getElementById('message-detail-modal');
        if (existingModal) existingModal.remove();
        
        const title = message.subject || message.title || 'Message';
        const body = message.body || message.message || message.message_content || '';
        const createdAt = this.formatMessageDate(message.created_at, true);
        const senderName = message.sender_name || (messageType === 'Announcement' ? 'Administration' : 'Unknown');
        const priority = message.priority || 'normal';
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'message-detail-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="message-modal">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <span class="message-type-badge">${messageType}</span>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="message-meta-detail">
                        <div><strong>Date:</strong> ${createdAt}</div>
                        <div><strong>From:</strong> ${this.escapeHtml(senderName)}</div>
                        ${priority ? `<div><strong>Priority:</strong> <span class="priority-badge ${priority}">${priority}</span></div>` : ''}
                        ${messageType === 'Personal' ? `<div><strong>Type:</strong> Personal Message</div>` : ''}
                    </div>
                    <div class="message-content-full">
                        ${this.escapeHtml(body).replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div class="modal-footer">
                    ${messageType === 'Personal' ? `
                        <button class="btn btn-reply" data-id="${message.id}">
                            <i class="fas fa-reply"></i> Reply
                        </button>
                    ` : ''}
                    <button class="btn btn-close">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-modal')?.addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.btn-close')?.addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.btn-reply')?.addEventListener('click', (e) => {
            const messageId = e.target.closest('.btn-reply').getAttribute('data-id');
            modal.remove();
            this.replyToMessage(messageId);
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // ==========================================
    // MARK MESSAGE AS READ
    // ==========================================
    async markMessageAsRead(messageId, messageType) {
        const supabaseClient = this.getSupabaseClient();
        if (!supabaseClient) return false;
        
        try {
            // Use student_messages table for both types (since we're using one table)
            const { error } = await supabaseClient
                .from('student_messages')
                .update({ 
                    is_read: true, 
                    read_at: new Date().toISOString() 
                })
                .eq('id', messageId);
            
            if (error) throw error;
            
            // Update local state
            const allMessages = [...this.currentMessages, ...this.currentAnnouncements];
            const message = allMessages.find(m => m.id == messageId);
            if (message) {
                message.is_read = true;
            }
            
            // Update UI
            this.renderMessages();
            this.updateStats();
            this.updateUnreadCount();
            
            this.showMessage('Marked as read', 'success');
            return true;
            
        } catch (error) {
            console.error('Error marking message as read:', error);
            this.showMessage('Failed to mark as read', 'error');
            return false;
        }
    }
    
    // ==========================================
    // REPLY TO MESSAGE
    // ==========================================
    replyToMessage(messageId) {
        let message = this.currentMessages.find(m => m.id == messageId);
        if (!message) return;
        
        if (this.elements.messageBody) {
            const subject = message.subject || message.title || '';
            const quotedBody = message.body || message.message || '';
            
            this.elements.messageBody.value = `Re: ${subject}\n\n--- Original Message ---\n${quotedBody}\n\n--- Your Reply ---\n`;
            this.elements.messageBody.focus();
            
            // Scroll to message form
            if (this.elements.messageForm) {
                this.elements.messageForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            this.showMessage('Message form pre-filled for reply', 'info');
        }
    }
    
    // ==========================================
    // HANDLE MESSAGE FORM SUBMISSION
    // ==========================================
    async handleMessageSubmit(e) {
        e.preventDefault();
        
        if (!this.elements.messageBody || !this.elements.messageBody.value.trim()) {
            this.showMessage('Please write a message', 'warning');
            return;
        }
        
        const userProfile = this.getUserProfile();
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!userProfile || !supabaseClient) {
            this.showMessage('System error: User profile or database not available', 'error');
            return;
        }
        
        // Disable form during submission
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        // Show status
        if (this.elements.messageStatus) {
            this.elements.messageStatus.textContent = 'Sending message...';
            this.elements.messageStatus.className = 'status-sending';
            this.elements.messageStatus.style.display = 'block';
        }
        
        try {
            const messageData = {
                subject: 'Message from Student',
                body: this.elements.messageBody.value.trim(),
                message: this.elements.messageBody.value.trim(),
                recipient_id: 'admin',
                recipient_program: userProfile.program || userProfile.department || 'General',
                student_id: userId,
                sender_id: userId,
                sender_name: userProfile.full_name || userProfile.name || 'Student',
                sender_email: userProfile.email || '',
                recipient_type: 'Individual',
                is_read: false,
                priority: 'normal',
                created_at: new Date().toISOString()
            };
            
            const { error } = await supabaseClient
                .from('student_messages')
                .insert([messageData]);
            
            if (error) throw error;
            
            // Clear form
            this.elements.messageBody.value = '';
            
            // Show success
            this.showMessage('Message sent successfully!', 'success');
            
            // Reload messages after a delay
            setTimeout(() => {
                this.loadMessages();
            }, 1500);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showMessage('Failed to send message: ' + error.message, 'error');
            
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            // Clear status after 3 seconds
            if (this.elements.messageStatus) {
                setTimeout(() => {
                    this.elements.messageStatus.textContent = '';
                    this.elements.messageStatus.className = '';
                    this.elements.messageStatus.style.display = 'none';
                }, 3000);
            }
        }
    }
    
    // ==========================================
    // SEARCH MESSAGES
    // ==========================================
    searchMessages(searchTerm) {
        this.searchTerm = searchTerm.trim();
        this.renderMessages();
        
        // Show/hide clear search button
        if (this.elements.clearSearch) {
            this.elements.clearSearch.style.display = this.searchTerm ? 'block' : 'none';
        }
    }
    
    // ==========================================
    // UPDATE STATS
    // ==========================================
    updateStats() {
        const total = this.currentMessages.length + this.currentAnnouncements.length;
        const unread = [...this.currentMessages, ...this.currentAnnouncements]
            .filter(m => !m.is_read).length;
        const announcements = this.currentAnnouncements.length;
        
        // Update total display
        if (this.elements.totalDisplay) {
            this.elements.totalDisplay.textContent = total;
        }
        
        // Update unread display
        if (this.elements.unreadDisplay) {
            this.elements.unreadDisplay.textContent = unread;
        }
        
        // Update announcements display
        if (this.elements.announcementsDisplay) {
            this.elements.announcementsDisplay.textContent = announcements;
        }
        
        // Update unread badge
        if (this.elements.unreadBadge) {
            if (unread > 0) {
                this.elements.unreadBadge.textContent = unread;
                this.elements.unreadBadge.style.display = 'inline';
            } else {
                this.elements.unreadBadge.style.display = 'none';
            }
        }
    }
    
    // ==========================================
    // UPDATE UNREAD COUNT
    // ==========================================
    updateUnreadCount() {
        const allMessages = [
            ...this.currentMessages,
            ...this.currentAnnouncements
        ];
        
        const unreadCount = allMessages.filter(m => !m.is_read).length;
        
        // Update badge
        if (this.elements.messagesBadge) {
            if (unreadCount > 0) {
                this.elements.messagesBadge.textContent = unreadCount;
                this.elements.messagesBadge.style.display = 'inline-block';
            } else {
                this.elements.messagesBadge.style.display = 'none';
            }
        }
        
        // Update tab title
        if (this.elements.messagesTab) {
            const baseText = this.elements.messagesTab.textContent.replace(/\(\d+\)\s*/, '');
            this.elements.messagesTab.textContent = unreadCount > 0 ? 
                `(${unreadCount}) ${baseText}` : baseText;
        }
        
        return unreadCount;
    }
    
    // ==========================================
    // UPDATE LAST UPDATED
    // ==========================================
    updateLastUpdated() {
        if (this.elements.lastUpdated) {
            const now = new Date();
            this.elements.lastUpdated.textContent = now.toLocaleString();
        }
    }
    
    // ==========================================
    // UPDATE DASHBOARD ANNOUNCEMENT
    // ==========================================
    updateDashboardAnnouncement() {
        if (this.currentAnnouncements.length === 0) return;
        
        const latestAnnouncement = this.currentAnnouncements[0];
        const announcementElement = document.getElementById('student-announcement');
        
        if (announcementElement && latestAnnouncement.message) {
            announcementElement.textContent = latestAnnouncement.message;
        }
    }
    
    // ==========================================
    // FILTER MESSAGES
    // ==========================================
    filterMessages(filterType) {
        this.currentFilter = filterType;
        this.renderMessages();
        this.updateFilterButtonStates();
    }
    
    // ==========================================
    // UPDATE FILTER BUTTON STATES
    // ==========================================
    updateFilterButtonStates() {
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter === this.currentFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // ==========================================
    // LOAD MESSAGE TEMPLATES
    // ==========================================
    async loadMessageTemplates() {
        const userProfile = this.getUserProfile();
        const supabaseClient = this.getSupabaseClient();
        
        if (!supabaseClient || !this.elements.templateSelect) return;
        
        try {
            const { data: templates, error } = await supabaseClient
                .from('message_templates')
                .select('*')
                .eq('is_active', true)
                .or(`target_program.eq.${userProfile?.program || 'General'},target_program.is.null`)
                .order('name', { ascending: true });
            
            if (error) throw error;
            
            this.messageTemplates = templates || [];
            this.populateTemplateDropdown();
            
        } catch (error) {
            console.error('Error loading message templates:', error);
        }
    }
    
    // ==========================================
    // POPULATE TEMPLATE DROPDOWN
    // ==========================================
    populateTemplateDropdown() {
        if (!this.elements.templateSelect) return;
        
        this.elements.templateSelect.innerHTML = '<option value="">Select a template...</option>';
        
        this.messageTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            this.elements.templateSelect.appendChild(option);
        });
    }
    
    // ==========================================
    // APPLY MESSAGE TEMPLATE
    // ==========================================
    applyMessageTemplate(templateId) {
        const template = this.messageTemplates.find(t => t.id == templateId);
        if (!template || !this.elements.messageBody) return;
        
        this.elements.messageBody.value = template.content;
        this.showMessage(`Template "${template.name}" applied`, 'success');
    }
    
    // ==========================================
    // SHOW LOADING STATE
    // ==========================================
    showLoading() {
        if (!this.elements.messagesList) return;
        
        this.elements.messagesList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading messages...</p>
            </div>
        `;
    }
    
    // ==========================================
    // SHOW MESSAGE (Toast/Status)
    // ==========================================
    showMessage(text, type = 'info') {
        // Use UI module if available
        if (window.ui && window.ui.showToast) {
            window.ui.showToast(text, type);
            return;
        }
        
        // Fallback to status element
        if (this.elements.messageStatus) {
            this.elements.messageStatus.textContent = text;
            this.elements.messageStatus.className = `status-${type}`;
            this.elements.messageStatus.style.display = 'block';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.elements.messageStatus.textContent = '';
                this.elements.messageStatus.className = '';
                this.elements.messageStatus.style.display = 'none';
            }, 3000);
        }
    }
    
    // ==========================================
    // FORMAT MESSAGE DATE
    // ==========================================
    formatMessageDate(dateString, full = false) {
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
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    
    // ==========================================
    // UTILITY: ESCAPE HTML
    // ==========================================
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Create and export singleton instance
window.messagesSystem = new MessagesSystem();

// Export individual functions for backward compatibility
window.loadStudentMessagesAndAnnouncements = () => window.messagesSystem.loadMessages();
window.handleMessageSubmit = (e) => window.messagesSystem.handleMessageSubmit(e);
window.replyToMessage = (id) => window.messagesSystem.replyToMessage(id);
window.filterMessages = (type) => window.messagesSystem.filterMessages(type);
window.searchMessages = (term) => window.messagesSystem.searchMessages(term);
window.applyMessageTemplate = (id) => window.messagesSystem.applyMessageTemplate(id);
window.initializeMessagesSystem = () => window.messagesSystem.initialize();

// Auto-initialize when app is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.messagesSystem.initialize(), 300);
    });
} else {
    setTimeout(() => window.messagesSystem.initialize(), 300);
}

// Listen for app ready event
document.addEventListener('appReady', () => {
    console.log('📱 App ready, initializing messages system...');
    setTimeout(() => window.messagesSystem.initialize(), 300);
});

console.log('📨 Messages system loaded!');
