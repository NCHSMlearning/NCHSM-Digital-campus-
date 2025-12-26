// messages.js - Messages System for NCHSM Digital Student Dashboard

// *************************************************************************
// *** MESSAGES SYSTEM ***
// *************************************************************************

let currentMessages = [];
let currentAnnouncements = [];
let messageTemplates = [];

// Initialize messages system
function initializeMessagesSystem() {
    console.log('💬 Initializing Messages System...');
    
    // Set up message form submission
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', handleMessageSubmit);
    }
    
    // Set up event listeners for messages tab
    const messagesTab = document.querySelector('.nav a[data-tab="messages"]');
    if (messagesTab) {
        messagesTab.addEventListener('click', () => {
            if (currentUserId) {
                loadStudentMessagesAndAnnouncements();
                loadMessageTemplates();
            }
        });
    }
    
    // Set up refresh button (if exists)
    const refreshBtn = document.getElementById('refresh-messages-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadStudentMessagesAndAnnouncements();
            loadMessageTemplates();
        });
    }
    
    // Set up message filters (if exist)
    const filterButtons = document.querySelectorAll('.message-filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter');
            filterMessages(filterType);
        });
    });
    
    // Set up search functionality (if exists)
    const searchInput = document.getElementById('message-search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchMessages(this.value);
            }, 300);
        });
    }
    
    console.log('✅ Messages System initialized');
}

// Load student messages and announcements
async function loadStudentMessagesAndAnnouncements() {
    if (!currentUserProfile || (!currentUserProfile.program && !currentUserProfile.department)) {
        await loadProfile(currentUserId);
    }
    
    const program = currentUserProfile?.program || currentUserProfile?.department;
    const messageContainer = document.getElementById('messages-list');
    if (!messageContainer) return;
    
    AppUtils.showLoading(messageContainer, 'Loading messages...');
    
    try {
        // Load personal messages
        const { data: personalMessages, error: personalError } = await sb
            .from('student_messages')
            .select('*')
            .or(`recipient_id.eq.${currentUserId},recipient_program.eq.${program}`)
            .order('created_at', { ascending: false });
        
        if (personalError) throw personalError;
        
        // Load official announcements
        const { data: notifications, error: notifError } = await sb
            .from('notifications')
            .select('*')
            .or(`target_program.eq.${program},target_program.is.null`)
            .order('created_at', { ascending: false });
        
        if (notifError) throw notifError;
        
        // Store messages
        currentMessages = personalMessages || [];
        currentAnnouncements = notifications || [];
        
        // Combine messages, with personal messages first
        const allMessages = [
            ...currentMessages.map(m => ({ ...m, type: 'Personal' })),
            ...currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Render messages
        renderMessages(allMessages);
        
        // Update unread count
        updateUnreadCount(allMessages);
        
        // Update dashboard with latest announcement
        updateDashboardAnnouncement();
        
    } catch (error) {
        console.error("Failed to load student messages and announcements:", error);
        AppUtils.showError(messageContainer, 'Error loading messages and announcements.');
    }
}

// Render messages in the messages list
function renderMessages(messages) {
    const messageContainer = document.getElementById('messages-list');
    if (!messageContainer) return;
    
    if (!messages || messages.length === 0) {
        messageContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash"></i>
                <h3>No Messages Found</h3>
                <p>You have no messages or announcements at this time.</p>
            </div>
        `;
        return;
    }
    
    messageContainer.innerHTML = messages.map(msg => createMessageCard(msg)).join('');
    
    // Add click handlers for message actions
    addMessageEventListeners();
}

// Create message card HTML
function createMessageCard(msg) {
    const title = msg.subject || msg.title || 'Message';
    const body = msg.body || msg.message || msg.message_content || '';
    const isRead = msg.is_read ? 'read' : 'unread';
    const createdAt = msg.created_at ? formatMessageDate(msg.created_at) : '';
    const borderColor = msg.type === 'Personal' ? '#4C1D95' : '#F97316';
    const statusColor = msg.is_read ? '#10B981' : '#F59E0B';
    const typeIcon = msg.type === 'Personal' ? 'fa-user' : 'fa-bullhorn';
    const priority = msg.priority || 'normal';
    
    // Truncate long messages
    const truncatedBody = body.length > 300 ? body.substring(0, 300) + '...' : body;
    
    // Create priority badge
    const priorityBadge = createPriorityBadge(priority);
    
    // Create actions menu
    const actionsMenu = createMessageActionsMenu(msg.id, msg.type, isRead);
    
    return `
        <div class="message-item ${isRead}" 
             data-id="${msg.id}" 
             data-type="${msg.type}"
             data-priority="${priority}"
             style="border-left: 4px solid ${borderColor};">
            
            <div class="message-header">
                <div class="message-title-section">
                    <i class="fas ${typeIcon} message-type-icon" style="color: ${borderColor};"></i>
                    <div class="message-title-wrapper">
                        <h4 class="message-title">${escapeHtml(title)}</h4>
                        <div class="message-meta">
                            <span class="message-date">${createdAt}</span>
                            ${priorityBadge}
                            <span class="message-type">${msg.type}</span>
                        </div>
                    </div>
                </div>
                <div class="message-actions">
                    ${actionsMenu}
                </div>
            </div>
            
            <div class="message-body">
                <p>${escapeHtml(truncatedBody)}</p>
                ${body.length > 300 ? 
                    `<button class="read-more-btn" data-id="${msg.id}">Read More</button>` : ''}
            </div>
            
            <div class="message-footer">
                <span class="message-status" style="color: ${statusColor};">
                    <i class="fas ${isRead === 'read' ? 'fa-check-circle' : 'fa-circle'}"></i>
                    ${isRead.toUpperCase()}
                </span>
                ${msg.sender_name ? 
                    `<span class="message-sender">
                        <i class="fas fa-user-tag"></i>
                        From: ${escapeHtml(msg.sender_name)}
                    </span>` : ''}
            </div>
        </div>
    `;
}

// Create priority badge
function createPriorityBadge(priority) {
    const priorityColors = {
        high: '#EF4444',
        medium: '#F59E0B',
        low: '#3B82F6',
        normal: '#6B7280'
    };
    
    const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1);
    const color = priorityColors[priority] || priorityColors.normal;
    
    return `<span class="priority-badge" style="background: ${color};">${priorityText}</span>`;
}

// Create message actions menu
function createMessageActionsMenu(messageId, messageType, isRead) {
    return `
        <div class="dropdown">
            <button class="dropdown-btn">
                <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-content">
                ${isRead === 'unread' ? 
                    `<a href="#" class="mark-read-btn" data-id="${messageId}" data-type="${messageType}">
                        <i class="fas fa-check"></i> Mark as Read
                    </a>` : 
                    `<a href="#" class="mark-unread-btn" data-id="${messageId}" data-type="${messageType}">
                        <i class="fas fa-eye-slash"></i> Mark as Unread
                    </a>`}
                <a href="#" class="reply-btn" data-id="${messageId}" data-type="${messageType}">
                    <i class="fas fa-reply"></i> Reply
                </a>
                <a href="#" class="forward-btn" data-id="${messageId}" data-type="${messageType}">
                    <i class="fas fa-share"></i> Forward
                </a>
                <div class="dropdown-divider"></div>
                <a href="#" class="delete-btn" data-id="${messageId}" data-type="${messageType}">
                    <i class="fas fa-trash"></i> Delete
                </a>
            </div>
        </div>
    `;
}

// Add event listeners to message actions
function addMessageEventListeners() {
    // Read more buttons
    document.querySelectorAll('.read-more-btn').forEach(button => {
        button.addEventListener('click', function() {
            const messageId = this.getAttribute('data-id');
            showFullMessage(messageId);
        });
    });
    
    // Mark as read/unread buttons
    document.querySelectorAll('.mark-read-btn, .mark-unread-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const messageId = this.getAttribute('data-id');
            const messageType = this.getAttribute('data-type');
            const action = this.classList.contains('mark-read-btn') ? 'read' : 'unread';
            await toggleMessageReadStatus(messageId, messageType, action);
        });
    });
    
    // Reply buttons
    document.querySelectorAll('.reply-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const messageId = this.getAttribute('data-id');
            const messageType = this.getAttribute('data-type');
            replyToMessage(messageId, messageType);
        });
    });
    
    // Forward buttons
    document.querySelectorAll('.forward-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const messageId = this.getAttribute('data-id');
            const messageType = this.getAttribute('data-type');
            forwardMessage(messageId, messageType);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const messageId = this.getAttribute('data-id');
            const messageType = this.getAttribute('data-type');
            await deleteMessage(messageId, messageType);
        });
    });
    
    // Message item click (for viewing)
    document.querySelectorAll('.message-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Don't trigger if clicking on action buttons
            if (!e.target.closest('.dropdown') && !e.target.closest('.read-more-btn')) {
                const messageId = this.getAttribute('data-id');
                showFullMessage(messageId);
            }
        });
    });
}

// Show full message in modal
async function showFullMessage(messageId) {
    // Find message in either messages or announcements
    let message = currentMessages.find(m => m.id == messageId);
    let messageType = 'Personal';
    
    if (!message) {
        message = currentAnnouncements.find(a => a.id == messageId);
        messageType = 'Announcement';
    }
    
    if (!message) {
        AppUtils.showToast('Message not found', 'error');
        return;
    }
    
    // Mark as read if unread
    if (message.is_read === false) {
        await toggleMessageReadStatus(messageId, messageType, 'read');
    }
    
    // Create modal content
    const modalContent = createMessageModalContent(message, messageType);
    
    // Show modal
    showMessageModal(modalContent);
}

// Create message modal content
function createMessageModalContent(message, messageType) {
    const title = message.subject || message.title || 'Message';
    const body = message.body || message.message || message.message_content || '';
    const createdAt = formatMessageDate(message.created_at, true);
    const senderName = message.sender_name || message.sent_by_name || 'Administration';
    
    return `
        <div class="message-modal-content">
            <div class="message-modal-header">
                <div class="message-modal-title">
                    <h3>${escapeHtml(title)}</h3>
                    <span class="message-modal-type">${messageType}</span>
                </div>
                <button class="close-modal-btn" onclick="closeMessageModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="message-modal-body">
                <div class="message-meta-info">
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span><strong>From:</strong> ${escapeHtml(senderName)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Date:</strong> ${createdAt}</span>
                    </div>
                    ${message.priority ? `
                        <div class="meta-item">
                            <i class="fas fa-flag"></i>
                            <span><strong>Priority:</strong> ${createPriorityBadge(message.priority)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="message-content">
                    ${escapeHtml(body).replace(/\n/g, '<br>')}
                </div>
                
                ${message.attachments ? `
                    <div class="message-attachments">
                        <h4><i class="fas fa-paperclip"></i> Attachments</h4>
                        <div class="attachment-list">
                            ${renderAttachments(message.attachments)}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="message-modal-footer">
                <button class="btn btn-secondary" onclick="closeMessageModal()">
                    <i class="fas fa-times"></i> Close
                </button>
                ${messageType === 'Personal' ? `
                    <button class="btn btn-primary" onclick="replyToMessage('${message.id}', '${messageType}')">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                ` : ''}
                <button class="btn btn-outline" onclick="forwardMessage('${message.id}', '${messageType}')">
                    <i class="fas fa-share"></i> Forward
                </button>
            </div>
        </div>
    `;
}

// Render attachments
function renderAttachments(attachments) {
    if (typeof attachments === 'string') {
        try {
            attachments = JSON.parse(attachments);
        } catch (e) {
            attachments = [attachments];
        }
    }
    
    if (!Array.isArray(attachments)) {
        attachments = [attachments];
    }
    
    return attachments.map((attachment, index) => {
        const fileName = typeof attachment === 'string' ? attachment : attachment.name || `Attachment ${index + 1}`;
        const fileUrl = typeof attachment === 'string' ? attachment : attachment.url;
        
        return `
            <div class="attachment-item">
                <i class="fas fa-file"></i>
                <span class="attachment-name">${escapeHtml(fileName)}</span>
                <a href="${fileUrl}" target="_blank" class="attachment-download">
                    <i class="fas fa-download"></i>
                </a>
            </div>
        `;
    }).join('');
}

// Show message modal
function showMessageModal(content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('message-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'message-modal';
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
        animation: fadeIn 0.3s ease;
    `;
    
    // Add modal content styles
    const modalContent = modal.querySelector('.message-modal-content');
    if (modalContent) {
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: slideInUp 0.3s ease;
        `;
    }
    
    document.body.appendChild(modal);
    
    // Close on ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeMessageModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    // Close on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMessageModal();
        }
    });
}

// Close message modal
function closeMessageModal() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// Toggle message read status
async function toggleMessageReadStatus(messageId, messageType, action) {
    try {
        const tableName = messageType === 'Personal' ? 'student_messages' : 'notifications';
        const isRead = action === 'read';
        
        const { error } = await sb
            .from(tableName)
            .update({ is_read: isRead, read_at: new Date().toISOString() })
            .eq('id', messageId);
        
        if (error) throw error;
        
        // Update local state
        if (messageType === 'Personal') {
            const message = currentMessages.find(m => m.id == messageId);
            if (message) message.is_read = isRead;
        } else {
            const announcement = currentAnnouncements.find(a => a.id == messageId);
            if (announcement) announcement.is_read = isRead;
        }
        
        // Re-render messages
        loadStudentMessagesAndAnnouncements();
        
        AppUtils.showToast(`Message marked as ${action}`, 'success');
        
    } catch (error) {
        console.error('Error toggling message read status:', error);
        AppUtils.showToast('Failed to update message status', 'error');
    }
}

// Reply to message
function replyToMessage(messageId, messageType) {
    closeMessageModal();
    
    // Find the original message
    let originalMessage;
    if (messageType === 'Personal') {
        originalMessage = currentMessages.find(m => m.id == messageId);
    } else {
        originalMessage = currentAnnouncements.find(a => a.id == messageId);
    }
    
    if (!originalMessage) {
        AppUtils.showToast('Original message not found', 'error');
        return;
    }
    
    // Pre-fill the message form
    const messageBody = document.getElementById('student-message-body');
    if (messageBody) {
        const subject = originalMessage.subject || originalMessage.title || '';
        const quotedBody = originalMessage.body || originalMessage.message || originalMessage.message_content || '';
        
        messageBody.value = `\n\n--- Original Message ---\nSubject: ${subject}\nDate: ${formatMessageDate(originalMessage.created_at)}\n\n${quotedBody}\n\n--- Your Reply ---\n`;
        messageBody.focus();
        messageBody.scrollTop = messageBody.scrollHeight;
        
        // Scroll to message form
        messageBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        AppUtils.showToast('Message form pre-filled for reply', 'info');
    }
}

// Forward message
function forwardMessage(messageId, messageType) {
    // For now, just copy message to clipboard
    let message;
    if (messageType === 'Personal') {
        message = currentMessages.find(m => m.id == messageId);
    } else {
        message = currentAnnouncements.find(a => a.id == messageId);
    }
    
    if (!message) {
        AppUtils.showToast('Message not found', 'error');
        return;
    }
    
    const title = message.subject || message.title || 'Message';
    const body = message.body || message.message || message.message_content || '';
    const date = formatMessageDate(message.created_at);
    
    const forwardText = `
Subject: ${title}
Date: ${date}
Message: ${body}
---
Forwarded from NCHSM Student Portal
    `.trim();
    
    navigator.clipboard.writeText(forwardText).then(() => {
        AppUtils.showToast('Message copied to clipboard. You can now paste it elsewhere.', 'success');
    }).catch(() => {
        AppUtils.showToast('Failed to copy message', 'error');
    });
}

// Delete message
async function deleteMessage(messageId, messageType) {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
        return;
    }
    
    try {
        const tableName = messageType === 'Personal' ? 'student_messages' : 'notifications';
        
        const { error } = await sb
            .from(tableName)
            .delete()
            .eq('id', messageId);
        
        if (error) throw error;
        
        // Remove from local state
        if (messageType === 'Personal') {
            currentMessages = currentMessages.filter(m => m.id != messageId);
        } else {
            currentAnnouncements = currentAnnouncements.filter(a => a.id != messageId);
        }
        
        // Re-render messages
        loadStudentMessagesAndAnnouncements();
        
        AppUtils.showToast('Message deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting message:', error);
        AppUtils.showToast('Failed to delete message', 'error');
    }
}

// Handle message form submission
async function handleMessageSubmit(e) {
    e.preventDefault();
    
    const messageBody = document.getElementById('student-message-body');
    const statusElement = document.getElementById('message-status');
    
    if (!messageBody || !messageBody.value.trim()) {
        AppUtils.showToast('Please write a message', 'warning');
        return;
    }
    
    if (!currentUserProfile) {
        AppUtils.showToast('User profile not loaded', 'error');
        return;
    }
    
    // Disable form during submission
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    if (statusElement) {
        statusElement.textContent = 'Sending message...';
        statusElement.style.color = '#F59E0B';
    }
    
    try {
        const messageData = {
            subject: 'Message from Student',
            body: messageBody.value.trim(),
            recipient_id: 'admin', // Default admin recipient
            recipient_program: currentUserProfile.program || currentUserProfile.department,
            sender_id: currentUserId,
            sender_name: currentUserProfile.full_name || currentUserProfile.name || 'Student',
            sender_email: currentUserProfile.email || '',
            sender_program: currentUserProfile.program || currentUserProfile.department,
            sender_block: currentUserProfile.block,
            sender_intake_year: currentUserProfile.intake_year,
            is_read: false,
            priority: 'normal',
            created_at: new Date().toISOString()
        };
        
        const { error } = await sb
            .from('student_messages')
            .insert([messageData]);
        
        if (error) throw error;
        
        // Clear form
        messageBody.value = '';
        
        // Show success message
        if (statusElement) {
            statusElement.textContent = '✓ Message sent successfully!';
            statusElement.style.color = '#10B981';
        }
        
        AppUtils.showToast('Message sent successfully!', 'success');
        
        // Reload messages to show the new one
        setTimeout(() => {
            loadStudentMessagesAndAnnouncements();
        }, 1000);
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        if (statusElement) {
            statusElement.textContent = `✗ Failed to send: ${error.message}`;
            statusElement.style.color = '#EF4444';
        }
        
        AppUtils.showToast('Failed to send message', 'error');
        
    } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        
        // Clear status after 5 seconds
        if (statusElement) {
            setTimeout(() => {
                statusElement.textContent = '';
            }, 5000);
        }
    }
}

// Filter messages by type
function filterMessages(filterType) {
    let filteredMessages = [];
    
    const allMessages = [
        ...currentMessages.map(m => ({ ...m, type: 'Personal' })),
        ...currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }))
    ];
    
    switch(filterType) {
        case 'all':
            filteredMessages = allMessages;
            break;
        case 'unread':
            filteredMessages = allMessages.filter(m => !m.is_read);
            break;
        case 'personal':
            filteredMessages = currentMessages.map(m => ({ ...m, type: 'Personal' }));
            break;
        case 'announcements':
            filteredMessages = currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }));
            break;
        case 'high-priority':
            filteredMessages = allMessages.filter(m => m.priority === 'high');
            break;
        default:
            filteredMessages = allMessages;
    }
    
    // Sort by date
    filteredMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Render filtered messages
    renderMessages(filteredMessages);
    
    // Update filter button states
    updateFilterButtonStates(filterType);
}

// Update filter button states
function updateFilterButtonStates(activeFilter) {
    document.querySelectorAll('.message-filter-btn').forEach(button => {
        const filterType = button.getAttribute('data-filter');
        if (filterType === activeFilter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Search messages
function searchMessages(searchTerm) {
    if (!searchTerm.trim()) {
        renderMessages([
            ...currentMessages.map(m => ({ ...m, type: 'Personal' })),
            ...currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }))
        ]);
        return;
    }
    
    const allMessages = [
        ...currentMessages.map(m => ({ ...m, type: 'Personal' })),
        ...currentAnnouncements.map(n => ({ ...n, type: 'Announcement' }))
    ];
    
    const searchLower = searchTerm.toLowerCase();
    const filteredMessages = allMessages.filter(msg => {
        const title = (msg.subject || msg.title || '').toLowerCase();
        const body = (msg.body || msg.message || msg.message_content || '').toLowerCase();
        const sender = (msg.sender_name || '').toLowerCase();
        
        return title.includes(searchLower) || 
               body.includes(searchLower) || 
               sender.includes(searchLower);
    });
    
    renderMessages(filteredMessages);
}

// Update unread message count
function updateUnreadCount(messages) {
    const unreadCount = messages.filter(m => !m.is_read).length;
    
    // Update badge in navigation
    const messagesBadge = document.getElementById('messages-badge');
    if (messagesBadge) {
        if (unreadCount > 0) {
            messagesBadge.textContent = unreadCount;
            messagesBadge.style.display = 'inline-block';
        } else {
            messagesBadge.style.display = 'none';
        }
    }
    
    // Update tab title
    const messagesTab = document.querySelector('.nav a[data-tab="messages"]');
    if (messagesTab) {
        const tabText = messagesTab.querySelector('.nav-text') || messagesTab;
        const baseText = tabText.textContent.replace(/\(\d+\)\s*/, '');
        if (unreadCount > 0) {
            tabText.textContent = `(${unreadCount}) ${baseText}`;
        } else {
            tabText.textContent = baseText;
        }
    }
    
    return unreadCount;
}

// Update dashboard announcement
function updateDashboardAnnouncement() {
    if (currentAnnouncements.length === 0) return;
    
    const latestAnnouncement = currentAnnouncements[0];
    const announcementElement = document.getElementById('student-announcement');
    
    if (announcementElement && latestAnnouncement.message) {
        announcementElement.textContent = latestAnnouncement.message;
    }
}

// Load message templates
async function loadMessageTemplates() {
    try {
        const { data: templates, error } = await sb
            .from('message_templates')
            .select('*')
            .eq('is_active', true)
            .or(`target_program.eq.${currentUserProfile?.program || 'General'},target_program.is.null`)
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        messageTemplates = templates || [];
        
        // Populate template dropdown if exists
        const templateSelect = document.getElementById('message-template-select');
        if (templateSelect) {
            templateSelect.innerHTML = '<option value="">Select a template...</option>';
            messageTemplates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                templateSelect.appendChild(option);
            });
            
            // Add change event
            templateSelect.addEventListener('change', function() {
                const templateId = this.value;
                if (templateId) {
                    applyMessageTemplate(templateId);
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading message templates:', error);
    }
}

// Apply message template
function applyMessageTemplate(templateId) {
    const template = messageTemplates.find(t => t.id == templateId);
    if (!template) return;
    
    const messageBody = document.getElementById('student-message-body');
    if (messageBody) {
        messageBody.value = template.content;
        AppUtils.showToast(`Template "${template.name}" applied`, 'success');
    }
}

// Format message date
function formatMessageDate(dateString, full = false) {
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Utility to safely escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Make functions globally available
window.loadStudentMessagesAndAnnouncements = loadStudentMessagesAndAnnouncements;
window.handleMessageSubmit = handleMessageSubmit;
window.replyToMessage = replyToMessage;
window.forwardMessage = forwardMessage;
window.deleteMessage = deleteMessage;
window.toggleMessageReadStatus = toggleMessageReadStatus;
window.showFullMessage = showFullMessage;
window.closeMessageModal = closeMessageModal;
window.filterMessages = filterMessages;
window.searchMessages = searchMessages;
window.applyMessageTemplate = applyMessageTemplate;
window.initializeMessagesSystem = initializeMessagesSystem;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMessagesSystem);
} else {
    initializeMessagesSystem();
}
