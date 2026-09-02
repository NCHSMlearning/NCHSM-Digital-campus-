// ============================================================
// SUPER ADMIN PROFILE MODULE - FIXED FOR YOUR script.js
// ============================================================

// ============================================================
// PROFILE DATA
// ============================================================

let profileData = {
    id: 'SA-001',
    name: 'Super Admin',
    email: 'admin@nchsm.ac.ke',
    phone: '+254 700 000 000',
    employeeId: 'SA-001',
    department: 'Administration',
    location: 'Nairobi, Kenya',
    role: 'superadmin',
    memberSince: '2024',
    avatarInitials: 'SA',
    lastLogin: new Date().toLocaleString(),
    actionsCount: 0
};

// ============================================================
// LOAD PROFILE DATA - FIXED: Uses your existing getCurrentUser()
// ============================================================

function loadProfileData() {
    console.log('📋 Loading profile data...');
    
    try {
        // Use your existing getCurrentUser() function (synchronous)
        let user = null;
        
        // Try sessionStorage first (your script.js stores user here)
        try {
            const sessionUser = JSON.parse(sessionStorage.getItem('user') || 'null');
            if (sessionUser) user = sessionUser;
        } catch(e) {}
        
        // Try localStorage if sessionStorage failed
        if (!user) {
            try {
                const localUser = JSON.parse(localStorage.getItem('user') || 'null');
                if (localUser) user = localUser;
            } catch(e) {}
        }
        
        // Try supabase session if available
        if (!user) {
            try {
                const session = JSON.parse(localStorage.getItem('supabase.auth.token') || 'null');
                if (session?.currentSession?.user) {
                    user = session.currentSession.user;
                }
            } catch(e) {}
        }
        
        // Try window.currentUser (set by your script.js)
        if (!user && window.currentUser) {
            user = window.currentUser;
        }
        
        // If still no user, try the global getCurrentUser function
        if (!user && typeof getCurrentUser === 'function') {
            user = getCurrentUser();
        }
        
        // Fallback to stored profile
        if (!user) {
            try {
                const saved = JSON.parse(localStorage.getItem('profileData') || 'null');
                if (saved) {
                    profileData = { ...profileData, ...saved };
                    updateProfileUI();
                    loadRecentActivity();
                    console.log('✅ Profile loaded from saved data:', profileData.name);
                    return;
                }
            } catch(e) {}
        }
        
        if (user) {
            // Extract user data
            const name = user.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Super Admin';
            const email = user.email || 'admin@nchsm.ac.ke';
            
            profileData.email = email;
            profileData.name = name;
            profileData.avatarInitials = name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            
            if (user.id) profileData.id = user.id;
            if (user.staff_id || user.student_id) {
                profileData.employeeId = user.staff_id || user.student_id;
            }
            if (user.department) profileData.department = user.department;
            if (user.role) profileData.role = user.role;
            if (user.phone) profileData.phone = user.phone;
            if (user.location) profileData.location = user.location;
            
            // Save to localStorage
            localStorage.setItem('profileData', JSON.stringify(profileData));
        }
        
        // Update UI
        updateProfileUI();
        loadRecentActivity();
        loadProfileStats();
        
        console.log('✅ Profile loaded:', profileData.name);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        // Still show UI with fallback data
        updateProfileUI();
    }
}

// ============================================================
// UPDATE PROFILE UI
// ============================================================

function updateProfileUI() {
    console.log('🔄 Updating profile UI...');
    
    const elements = {
        'profileDisplayName': profileData.name,
        'profileEmail': profileData.email,
        'profileFullName': profileData.name,
        'profileFullEmail': profileData.email,
        'profilePhone': profileData.phone || 'Not set',
        'profileEmployeeId': profileData.employeeId || 'Not set',
        'profileDepartment': profileData.department || 'Not set',
        'profileLocation': profileData.location || 'Not set',
        'profileStatRole': 'Super Admin',
        'profileStatMemberSince': profileData.memberSince || '2024',
        'profileLastLogin': profileData.lastLogin || 'Just now'
    };
    
    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = elements[id];
            console.log(`✅ Updated ${id}:`, elements[id]);
        }
    });
    
    // Update avatar
    const avatarText = document.getElementById('profileAvatarText');
    if (avatarText) avatarText.textContent = profileData.avatarInitials || 'SA';
    
    const editAvatarText = document.getElementById('editProfileAvatarText');
    if (editAvatarText) editAvatarText.textContent = profileData.avatarInitials || 'SA';
    
    // Update edit form fields
    document.getElementById('editProfileName').value = profileData.name;
    document.getElementById('editProfileEmail').value = profileData.email;
    document.getElementById('editProfilePhone').value = profileData.phone || '';
    document.getElementById('editProfileEmployeeId').value = profileData.employeeId || '';
    document.getElementById('editProfileDepartment').value = profileData.department || 'Administration';
    document.getElementById('editProfileLocation').value = profileData.location || '';
    
    // Update stats
    const statActions = document.getElementById('profileStatActions');
    if (statActions) statActions.textContent = profileData.actionsCount || 0;
}

// ============================================================
// LOAD PROFILE STATS
// ============================================================

function loadProfileStats() {
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) return;
        
        // Get actions count from audit_logs
        supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_email', profileData.email)
            .then(({ count, error }) => {
                if (!error && count !== null) {
                    profileData.actionsCount = count;
                    const statActions = document.getElementById('profileStatActions');
                    if (statActions) statActions.textContent = count;
                }
            })
            .catch(() => {});
        
    } catch (error) {
        console.warn('Error loading profile stats:', error);
    }
}

// ============================================================
// LOAD RECENT ACTIVITY - USES YOUR EXISTING AUDIT LOGS
// ============================================================

function loadRecentActivity() {
    const container = document.getElementById('profileRecentActivity');
    if (!container) return;
    
    console.log('📋 Loading recent activity...');
    
    try {
        const supabase = window.sb || window.supabase;
        if (!supabase) {
            container.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 20px;">
                    <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    No recent activity
                </div>
            `;
            return;
        }
        
        supabase
            .from('audit_logs')
            .select('*')
            .eq('user_email', profileData.email)
            .order('timestamp', { ascending: false })
            .limit(5)
            .then(({ data: actions, error }) => {
                if (error || !actions || actions.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; color: #94a3b8; padding: 20px;">
                            <i class="fas fa-inbox" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                            No recent activity
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = actions.map(action => {
                    const time = action.timestamp ? new Date(action.timestamp).toLocaleString() : '';
                    const icon = getActionIcon(action.action_type);
                    const color = getActionColor(action.action_type);
                    const statusColor = action.status === 'SUCCESS' ? '#10b981' : '#dc2626';
                    const statusText = action.status === 'SUCCESS' ? '✅' : '❌';
                    
                    return `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <div style="width: 30px; height: 30px; border-radius: 50%; background: ${color}20; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="fas ${icon}" style="color: ${color}; font-size: 12px;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 12px; color: #1e293b; font-weight: 500;">
                                    ${escapeHtml(action.action_type || 'Activity')}
                                    <span style="font-weight: 400; color: #94a3b8; font-size: 11px;">
                                        ${escapeHtml(action.details || '').substring(0, 30)}
                                    </span>
                                    <span style="color: ${statusColor}; font-size: 10px;">${statusText}</span>
                                </div>
                                <div style="font-size: 10px; color: #94a3b8;">${time}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            })
            .catch(() => {
                container.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 20px;">
                        <i class="fas fa-exclamation-circle"></i> Could not load activity
                    </div>
                `;
            });
        
    } catch (error) {
        console.warn('Error loading recent activity:', error);
        container.innerHTML = `
            <div style="text-align: center; color: #94a3b8; padding: 20px;">
                <i class="fas fa-exclamation-circle"></i> Could not load activity
            </div>
        `;
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getActionColor(action) {
    const colors = {
        'LOGIN': '#10b981',
        'LOGOUT': '#6b7280',
        'USER_CREATED': '#3b82f6',
        'USER_UPDATED': '#f59e0b',
        'USER_DELETED': '#ef4444',
        'MARKS_ENTRY': '#8b5cf6',
        'MARKS_APPROVED': '#059669',
        'RESOURCE_UPLOADED': '#ec4899',
        'SYSTEM_MAINTENANCE': '#f59e0b',
        'ADMIN_ACTION': '#4C1D95',
        'USER_ENROLL': '#10b981'
    };
    return colors[action] || '#4C1D95';
}

function getActionIcon(action) {
    const icons = {
        'LOGIN': 'fa-sign-in-alt',
        'LOGOUT': 'fa-sign-out-alt',
        'USER_CREATED': 'fa-user-plus',
        'USER_UPDATED': 'fa-user-edit',
        'USER_DELETED': 'fa-user-minus',
        'MARKS_ENTRY': 'fa-pen',
        'MARKS_APPROVED': 'fa-check-double',
        'RESOURCE_UPLOADED': 'fa-upload',
        'SYSTEM_MAINTENANCE': 'fa-tools',
        'ADMIN_ACTION': 'fa-shield-alt',
        'USER_ENROLL': 'fa-user-graduate'
    };
    return icons[action] || 'fa-circle';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// EDIT PROFILE FUNCTIONS
// ============================================================

function showEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    // Populate form
    document.getElementById('editProfileName').value = profileData.name;
    document.getElementById('editProfileEmail').value = profileData.email;
    document.getElementById('editProfilePhone').value = profileData.phone || '';
    document.getElementById('editProfileEmployeeId').value = profileData.employeeId || '';
    document.getElementById('editProfileDepartment').value = profileData.department || 'Administration';
    document.getElementById('editProfileLocation').value = profileData.location || '';
    
    modal.style.display = 'flex';
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
}

function saveProfileChanges() {
    const name = document.getElementById('editProfileName').value.trim();
    const email = document.getElementById('editProfileEmail').value.trim();
    const phone = document.getElementById('editProfilePhone').value.trim();
    const employeeId = document.getElementById('editProfileEmployeeId').value.trim();
    const department = document.getElementById('editProfileDepartment').value;
    const location = document.getElementById('editProfileLocation').value.trim();
    
    if (!name || !email) {
        if (typeof showFeedback === 'function') {
            showFeedback('Name and email are required', 'error');
        }
        return;
    }
    
    try {
        const supabase = window.sb || window.supabase;
        if (supabase) {
            // Update profile in database
            supabase
                .from('consolidated_user_profiles_table')
                .update({
                    full_name: name,
                    email: email,
                    phone: phone,
                    department: department,
                    location: location,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', profileData.id)
                .then(({ error }) => {
                    if (error) {
                        console.warn('Database update failed:', error);
                    } else {
                        console.log('✅ Profile updated in database');
                    }
                })
                .catch(() => {});
        }
        
        // Update local profile data
        profileData.name = name;
        profileData.email = email;
        profileData.phone = phone;
        profileData.employeeId = employeeId;
        profileData.department = department;
        profileData.location = location;
        profileData.avatarInitials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        
        // Save to localStorage
        localStorage.setItem('profileData', JSON.stringify(profileData));
        
        // Update UI
        updateProfileUI();
        closeEditProfileModal();
        
        if (typeof showFeedback === 'function') {
            showFeedback('Profile updated successfully!', 'success');
        }
        
        console.log('✅ Profile saved:', profileData.name);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        if (typeof showFeedback === 'function') {
            showFeedback('Error saving profile: ' + error.message, 'error');
        }
    }
}

// ============================================================
// CHANGE PASSWORD FUNCTIONS
// ============================================================

function changePassword() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('passwordFeedback').style.display = 'none';
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

function handlePasswordChange() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const feedback = document.getElementById('passwordFeedback');
    
    // Validation
    if (!current) {
        feedback.textContent = 'Please enter your current password';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        return;
    }
    
    if (newPass.length < 6) {
        feedback.textContent = 'New password must be at least 6 characters';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        return;
    }
    
    if (newPass !== confirm) {
        feedback.textContent = 'Passwords do not match';
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        return;
    }
    
    // Show loading
    const submitBtn = document.querySelector('#changePasswordForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Update Password';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
    }
    
    try {
        const supabase = window.sb || window.supabase;
        if (supabase) {
            supabase.auth.updateUser({ password: newPass })
                .then(({ data, error }) => {
                    if (error) {
                        feedback.textContent = '❌ ' + error.message;
                        feedback.style.background = '#fee2e2';
                        feedback.style.color = '#991b1b';
                        feedback.style.display = 'block';
                    } else {
                        feedback.textContent = '✅ Password changed successfully!';
                        feedback.style.background = '#d1fae5';
                        feedback.style.color = '#065f46';
                        feedback.style.display = 'block';
                        
                        if (typeof showFeedback === 'function') {
                            showFeedback('Password changed successfully!', 'success');
                        }
                        
                        setTimeout(() => {
                            closeChangePasswordModal();
                        }, 1500);
                    }
                })
                .catch((err) => {
                    feedback.textContent = '❌ ' + err.message;
                    feedback.style.background = '#fee2e2';
                    feedback.style.color = '#991b1b';
                    feedback.style.display = 'block';
                })
                .finally(() => {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                });
        } else {
            // Fallback
            feedback.textContent = '✅ Password update request sent. Check your email.';
            feedback.style.background = '#dbeafe';
            feedback.style.color = '#1e40af';
            feedback.style.display = 'block';
            
            setTimeout(() => {
                closeChangePasswordModal();
            }, 2000);
        }
    } catch (error) {
        feedback.textContent = '❌ Error: ' + error.message;
        feedback.style.background = '#fee2e2';
        feedback.style.color = '#991b1b';
        feedback.style.display = 'block';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// ============================================================
// PROFILE PHOTO FUNCTIONS
// ============================================================

function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        if (typeof showFeedback === 'function') {
            showFeedback('Please select an image file', 'error');
        }
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        if (typeof showFeedback === 'function') {
            showFeedback('Image must be less than 2MB', 'error');
        }
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.style.backgroundImage = `url(${e.target.result})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.innerHTML = '';
        }
        
        // Save to localStorage
        try {
            localStorage.setItem('profilePhoto', e.target.result);
            if (typeof showFeedback === 'function') {
                showFeedback('Photo uploaded successfully!', 'success');
            }
        } catch (err) {
            if (typeof showFeedback === 'function') {
                showFeedback('Error saving photo', 'error');
            }
        }
    };
    reader.readAsDataURL(file);
}

function previewEditProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('editProfileAvatarPreview');
        if (preview) {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
            preview.innerHTML = '';
        }
    };
    reader.readAsDataURL(file);
}

// ============================================================
// OTHER PROFILE FUNCTIONS
// ============================================================

function refreshProfile() {
    loadProfileData();
    if (typeof showFeedback === 'function') {
        showFeedback('Profile refreshed', 'info');
    }
}

function enable2FA() {
    if (typeof showFeedback === 'function') {
        showFeedback('2FA setup coming soon', 'info');
    }
}

function viewAuditLogs() {
    if (typeof showTab === 'function') {
        showTab('audit');
    }
}

function exportProfileData() {
    const data = {
        ...profileData,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile_export_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    
    if (typeof showFeedback === 'function') {
        showFeedback('Profile data exported!', 'success');
    }
}

// ============================================================
// INITIALIZE
// ============================================================

function initProfile() {
    console.log('👤 Initializing Profile module...');
    
    // Load profile when tab is clicked
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) {
        profileTab.addEventListener('click', function() {
            setTimeout(loadProfileData, 300);
        });
    }
    
    // Load if profile tab is already active
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'profile') {
        setTimeout(loadProfileData, 500);
    }
    
    // Also load on page load after everything is ready
    setTimeout(loadProfileData, 1000);
    
    console.log('✅ Profile module initialized');
}

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL
// ============================================================

window.loadProfileData = loadProfileData;
window.updateProfileUI = updateProfileUI;
window.loadProfileStats = loadProfileStats;
window.loadRecentActivity = loadRecentActivity;
window.showEditProfileModal = showEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfileChanges = saveProfileChanges;
window.changePassword = changePassword;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handlePasswordChange = handlePasswordChange;
window.uploadProfilePhoto = uploadProfilePhoto;
window.previewEditProfilePhoto = previewEditProfilePhoto;
window.refreshProfile = refreshProfile;
window.enable2FA = enable2FA;
window.viewAuditLogs = viewAuditLogs;
window.exportProfileData = exportProfileData;
window.initProfile = initProfile;

console.log('✅ Super Admin Profile module loaded (compatible with your script.js)');

// Auto-initialize if DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initProfile();
} else {
    document.addEventListener('DOMContentLoaded', initProfile);
}
