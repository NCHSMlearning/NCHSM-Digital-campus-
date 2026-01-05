// messages.js - Messages System for NCHSM Digital Student Dashboard

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
            templateSelect: document.getElementById('message-template-select')
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
                    this.searchMessages(e.target.value);
                }, 300);
            });
        }
        
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
        return messagesTab && messagesTab.classList.contains('active');
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
    
    // Load messages and announcements
    async loadMessages() {
        console.log('📨 Loading messages...');
        
        const userProfile = this.getUserProfile();
        const userId = this.getCurrentUserId();
        const supabaseClient = this.getSupabaseClient();
        
        if (!supabaseClient) {
            this.showMessage('Database connection error', 'error');
            return;
        }
        
        const program = userProfile?.program || userProfile?.department;
        
        // Show loading state
        if (this.elements.messagesList) {
            this.showLoading();
        }
        
        try {
            // Load personal messages
            const { data: personalMessages, error: personalError } = await supabaseClient
                .from('student_messages')
                .select('*')
                .or(`recipient_id.eq.${userId},recipient_program.eq.${program}`)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (personalError) throw personalError;
            
            // Load official announcements
            const { data: notifications, error: notifError } = await supabaseClient
                .from('notifications')
                .select('*')
                .or(`target_program.eq.${program},target_program.is.null`)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (notifError) throw notifError;
            
            // Store messages
            this.currentMessages = personalMessages || [];
            this.currentAnnouncements = notifications || [];
            
            // Update UI
            this.renderMessages();
            this.updateUnreadCount();
            
            // Update dashboard announcement
            this.updateDashboardAnnouncement();
            
            // Load templates if needed
            this.loadMessageTemplates();
            
            console.log(`✅ Loaded ${this.currentMessages.length} messages and ${this.currentAnnouncements.length} announcements`);
            
        } catch (error) {
            console.error("Failed to load messages:", error);
            this.showMessage('Error loading messages', 'error');
        }
    }
    
    // Check for new messages (lightweight check)
    async checkForNewMessages() {
        try {
            const userId = this.getCurrentUserId();
            const supabaseClient = this.getSupabaseClient();
            if (!supabaseClient) return;
            
            // Get latest message timestamp
            const latestMessage = [...this.currentMessages, ...this.currentAnnouncements]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            
            const lastTimestamp = latestMessage?.created_at;
            
            // Check for new unread messages
            const { data: newMessages, error } = await supabaseClient
                .from('student_messages')
                .select('id, is_read')
                .eq('recipient_id', userId)
                .eq('is_read', false)
                .gt('created_at', lastTimestamp || new Date(0).toISOString())
                .limit(1);
            
            if (!error && newMessages?.length > 0) {
                this.loadMessages(); // Reload if new messages found
            }
            
        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }
    
    // Render messages in the list
    renderMessages() {
        if (!this.elements.messagesList) return;
        
        const messages = this.getFilteredMessages();
        
        if (!messages || messages.length === 0) {
            this.elements.messagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <h3>No Messages Found</h3>
                    <p>You have no messages or announcements at this time.</p>
                </div>
            `;
            return;
        }
        
        this.elements.messagesList.innerHTML = messages
            .map(msg => this.createMessageCard(msg))
            .join('');
        
        this.attachMessageEventListeners();
    }
    
    // Get filtered messages based on current filter
    getFilteredMessages() {
        const allMessages = [
            ...this.currentMessages.map(m => ({ ...m, type: 'Personal' })),
            ...this.currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        switch(this.currentFilter) {
            case 'unread':
                return allMessages.filter(m => !m.is_read);
            case 'personal':
                return this.currentMessages.map(m => ({ ...m, type: 'Personal' }));
            case 'announcements':
                return this.currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }));
            case 'high-priority':
                return allMessages.filter(m => m.priority === 'high');
            default:
                return allMessages;
        }
    }
    
    // Create message card HTML
    createMessageCard(msg) {
        const title = msg.subject || msg.title || 'Message';
        const body = msg.body || msg.message || msg.message_content || '';
        const isRead = msg.is_read ? 'read' : 'unread';
        const createdAt = this.formatMessageDate(msg.created_at);
        const borderColor = msg.type === 'Personal' ? '#4C1D95' : '#F97316';
        const priority = msg.priority || 'normal';
        
        // Truncate long messages
        const truncatedBody = body.length > 300 ? body.substring(0, 300) + '...' : body;
        
        return `
            <div class="message-item ${isRead}" 
                 data-id="${msg.id}" 
                 data-type="${msg.type}"
                 data-priority="${priority}"
                 style="border-left: 4px solid ${borderColor};">
                
                <div class="message-header">
                    <div class="message-title-section">
                        <i class="fas ${msg.type === 'Personal' ? 'fa-user' : 'fa-bullhorn'}" 
                           style="color: ${borderColor};"></i>
                        <div class="message-title-wrapper">
                            <h4 class="message-title">${this.escapeHtml(title)}</h4>
                            <div class="message-meta">
                                <span class="message-date">${createdAt}</span>
                                <span class="priority-badge ${priority}">${priority}</span>
                                <span class="message-type">${msg.type}</span>
                            </div>
                        </div>
                    </div>
                    <div class="message-actions">
                        ${!msg.is_read ? `
                            <button class="mark-read-btn" data-id="${msg.id}" data-type="${msg.type}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="view-btn" data-id="${msg.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="message-body">
                    <p>${this.escapeHtml(truncatedBody)}</p>
                    ${body.length > 300 ? `
                        <button class="read-more-btn" data-id="${msg.id}">
                            Read More
                        </button>
                    ` : ''}
                </div>
                
                <div class="message-footer">
                    <span class="message-status ${isRead}">
                        <i class="fas ${msg.is_read ? 'fa-check-circle' : 'fa-circle'}"></i>
                        ${isRead.toUpperCase()}
                    </span>
                    ${msg.sender_name ? `
                        <span class="message-sender">
                            <i class="fas fa-user-tag"></i>
                            From: ${this.escapeHtml(msg.sender_name)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Attach event listeners to message cards
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
                if (!e.target.closest('.message-actions')) {
                    const messageId = item.getAttribute('data-id');
                    this.showMessageModal(messageId);
                }
            });
        });
    }
    
    // Show message modal
    async showMessageModal(messageId) {
        // Find message
        let message = this.currentMessages.find(m => m.id == messageId);
        let messageType = 'Personal';
        
        if (!message) {
            message = this.currentAnnouncements.find(a => a.id == messageId);
            messageType = 'Announcement';
        }
        
        if (!message) return;
        
        // Mark as read if unread
        if (!message.is_read) {
            await this.markMessageAsRead(messageId, messageType);
        }
        
        // Create modal content
        const modalContent = this.createModalContent(message, messageType);
        
        // Show modal using UI module if available, or create custom
        if (window.ui && window.ui.showToast) {
            // Use existing UI modal system
            this.showCustomModal(modalContent);
        } else {
            // Simple alert for now
            alert(`${message.title || 'Message'}\n\n${message.body || message.message || ''}`);
        }
    }
    
    // Create modal content
    createModalContent(message, messageType) {
        const title = message.subject || message.title || 'Message';
        const body = message.body || message.message || message.message_content || '';
        const createdAt = this.formatMessageDate(message.created_at, true);
        
        return `
            <div class="message-modal">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <span class="message-type-badge">${messageType}</span>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="message-meta">
                        <div><strong>Date:</strong> ${createdAt}</div>
                        ${message.sender_name ? `<div><strong>From:</strong> ${this.escapeHtml(message.sender_name)}</div>` : ''}
                        ${message.priority ? `<div><strong>Priority:</strong> <span class="priority-badge ${message.priority}">${message.priority}</span></div>` : ''}
                    </div>
                    <div class="message-content">
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
    }
    
    // Show custom modal
    showCustomModal(content) {
        // Remove existing modal
        const existingModal = document.getElementById('message-detail-modal');
        if (existingModal) existingModal.remove();
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'message-detail-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = content;
        
        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        `;
        
        // Add modal styles
        const messageModal = modal.querySelector('.message-modal');
        if (messageModal) {
            messageModal.style.cssText = `
                background: white;
                border-radius: 12px;
                width: 100%;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            `;
        }
        
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
    
    // Mark message as read
    async markMessageAsRead(messageId, messageType) {
        const supabaseClient = this.getSupabaseClient();
        if (!supabaseClient) return false;
        
        try {
            const tableName = messageType === 'Personal' ? 'student_messages' : 'notifications';
            
            const { error } = await supabaseClient
                .from(tableName)
                .update({ 
                    is_read: true, 
                    read_at: new Date().toISOString() 
                })
                .eq('id', messageId);
            
            if (error) throw error;
            
            // Update local state
            if (messageType === 'Personal') {
                const message = this.currentMessages.find(m => m.id == messageId);
                if (message) message.is_read = true;
            } else {
                const announcement = this.currentAnnouncements.find(a => a.id == messageId);
                if (announcement) announcement.is_read = true;
            }
            
            // Update UI
            this.renderMessages();
            this.updateUnreadCount();
            
            this.showMessage('Marked as read', 'success');
            return true;
            
        } catch (error) {
            console.error('Error marking message as read:', error);
            this.showMessage('Failed to mark as read', 'error');
            return false;
        }
    }
    
    // Reply to message
    replyToMessage(messageId) {
        let message = this.currentMessages.find(m => m.id == messageId);
        if (!message) return;
        
        if (this.elements.messageBody) {
            const subject = message.subject || message.title || '';
            const quotedBody = message.body || message.message || '';
            
            this.elements.messageBody.value = `Re: ${subject}\n\n--- Original Message ---\n${quotedBody}\n\n--- Your Reply ---\n`;
            this.elements.messageBody.focus();
            
            // Switch to messages tab
            if (window.ui && window.ui.showTab) {
                window.ui.showTab('messages');
            }
            
            this.showMessage('Message form pre-filled for reply', 'info');
        }
    }
    
    // Handle message form submission
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
        }
        
        try {
            const messageData = {
                subject: 'Message from Student',
                body: this.elements.messageBody.value.trim(),
                recipient_id: 'admin',
                recipient_program: userProfile.program || userProfile.department,
                sender_id: userId,
                sender_name: userProfile.full_name || userProfile.name || 'Student',
                sender_email: userProfile.email || '',
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
                }, 3000);
            }
        }
    }
    
    // Search messages
    searchMessages(searchTerm) {
        const messages = this.getFilteredMessages();
        
        if (!searchTerm.trim()) {
            this.renderMessages();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase();
        const filteredMessages = messages.filter(msg => {
            const title = (msg.subject || msg.title || '').toLowerCase();
            const body = (msg.body || msg.message || msg.message_content || '').toLowerCase();
            const sender = (msg.sender_name || '').toLowerCase();
            
            return title.includes(searchLower) || 
                   body.includes(searchLower) || 
                   sender.includes(searchLower);
        });
        
        this.displaySearchResults(filteredMessages, searchTerm);
    }
    
    // Display search results
    displaySearchResults(messages, searchTerm) {
        if (!this.elements.messagesList) return;
        
        if (messages.length === 0) {
            this.elements.messagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Results Found</h3>
                    <p>No messages found for "${searchTerm}"</p>
                </div>
            `;
            return;
        }
        
        this.elements.messagesList.innerHTML = messages
            .map(msg => this.createMessageCard(msg))
            .join('');
        
        this.attachMessageEventListeners();
    }
    
    // Load message templates
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
    
    // Populate template dropdown
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
    
    // Apply message template
    applyMessageTemplate(templateId) {
        const template = this.messageTemplates.find(t => t.id == templateId);
        if (!template || !this.elements.messageBody) return;
        
        this.elements.messageBody.value = template.content;
        this.showMessage(`Template "${template.name}" applied`, 'success');
    }
    
    // Update unread message count
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
    
    // Update dashboard announcement
    updateDashboardAnnouncement() {
        if (this.currentAnnouncements.length === 0) return;
        
        const latestAnnouncement = this.currentAnnouncements[0];
        const announcementElement = document.getElementById('student-announcement');
        
        if (announcementElement && latestAnnouncement.message) {
            announcementElement.textContent = latestAnnouncement.message;
        }
    }
    
    // Filter messages
    filterMessages(filterType) {
        this.currentFilter = filterType;
        this.renderMessages();
        this.updateFilterButtonStates();
    }
    
    // Update filter button states
    updateFilterButtonStates() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter === this.currentFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // Show loading state
    showLoading() {
        if (!this.elements.messagesList) return;
        
        this.elements.messagesList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading messages...</p>
            </div>
        `;
    }
    
    // Show message (toast/status)
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
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                this.elements.messageStatus.textContent = '';
                this.elements.messageStatus.className = '';
            }, 3000);
        }
    }
    
    // Format message date
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
    
    // Utility to safely escape HTML
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
        window.messagesSystem.initialize();
    });
} else {
    window.messagesSystem.initialize();
}

// Listen for app ready event
document.addEventListener('appReady', () => {
    console.log('📱 App ready, initializing messages system...');
    window.messagesSystem.initialize();
});
