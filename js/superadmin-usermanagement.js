/*******************************************************
 * 9. USERS MANAGEMENT - COMPLETE & OPTIMIZED
 * ✅ ALL original functions preserved
 * ✅ Performance optimizations added
 * ✅ TVET/KRCHN fixes applied
 * ✅ Full program names everywhere
 * ✅ Document upload functions added
 * ✅ Edit User with ALL fields (Guardian, Parent, Photo)
 * ✅ Password reset via Edge Function
 * ✅ Student/Staff ID support
 * ✅ INTAKE MONTH FIXED - Not hardcoded
 * ✅ DOCUMENT STATUS FIXED - Read from profile directly
 * ✅ PENDING STATS FIXED - Added updatePendingStats()
 *******************************************************/

// ============================================
// 📊 STATE (NEW - For pagination/caching)
// ============================================
const USERS_STATE = {
    page: 1,
    perPage: 20,
    total: 0,
    filters: {
        role: 'all',
        status: 'all',
        program: 'all',
        block: 'all',
        search: '',
        programType: 'all'
    },
    cache: {
        programs: null,
        blocks: null,
        documents: {}
    }
};

let searchTimeout = null;

// ============================================================
// 🔥 HELPER: Get Supabase client
// ============================================================
function getSb() {
    return window.sb || sb;
}

// ============================================================
// 🔥 FIX: POPULATE PROGRAM AND BLOCK DROPDOWNS IN MANAGE USERS
// ============================================================

/**
 * Populate program filter dropdown with all programs
 */
async function populateUserProgramFilter() {
    const programFilter = document.getElementById('user-program-filter');
    if (!programFilter) return;
    
    try {
        const supabase = getSb();
        const { data: programs, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('program')
            .not('program', 'is', null)
            .order('program');
        
        if (error) throw error;
        
        programFilter.innerHTML = '<option value="all">📚 All Programs</option>';
        
        const uniquePrograms = [...new Set(programs.map(p => p.program).filter(Boolean))];
        
        uniquePrograms.sort((a, b) => {
            if (a === 'KRCHN') return -1;
            if (b === 'KRCHN') return 1;
            return a.localeCompare(b);
        });
        
        uniquePrograms.forEach(program => {
            const displayName = getProgramDisplayName(program) || program;
            const option = document.createElement('option');
            option.value = program;
            option.textContent = displayName;
            programFilter.appendChild(option);
        });
        
        console.log(`✅ Loaded ${uniquePrograms.length} programs into filter`);
        
    } catch (error) {
        console.error('Error loading program filter:', error);
    }
}

/**
 * Populate block filter dropdown with all blocks
 */
async function populateUserBlockFilter() {
    const blockFilter = document.getElementById('user-block-filter');
    if (!blockFilter) return;
    
    try {
        const supabase = getSb();
        const { data: blocks, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('block')
            .not('block', 'is', null)
            .order('block');
        
        if (error) throw error;
        
        blockFilter.innerHTML = '<option value="all">📅 All Blocks/Terms</option>';
        
        const uniqueBlocks = [...new Set(blocks.map(b => b.block).filter(Boolean))];
        
        const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        uniqueBlocks.sort((a, b) => {
            const indexA = blockOrder.indexOf(a);
            const indexB = blockOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        
        uniqueBlocks.forEach(block => {
            const option = document.createElement('option');
            option.value = block;
            option.textContent = block;
            blockFilter.appendChild(option);
        });
        
        console.log(`✅ Loaded ${uniqueBlocks.length} blocks into filter`);
        
    } catch (error) {
        console.error('Error loading block filter:', error);
    }
}

// ============================================================
// 🔥 HELPER: Populate dropdowns if they are empty
// ============================================================

async function populateUserFilterDropdownsIfEmpty() {
    const programFilter = document.getElementById('user-program-filter');
    const blockFilter = document.getElementById('user-block-filter');
    
    if (programFilter && programFilter.options.length <= 1) {
        await populateUserProgramFilter();
    }
    
    if (blockFilter && blockFilter.options.length <= 1) {
        await populateUserBlockFilter();
    }
}

// ============================================
// 📧 SEND APPROVAL EMAIL - UPDATED
// ============================================

async function sendApprovalEmail(email, userName, role, program, intakeYear, intakeMonth, block) {
    console.log('📧 Sending approval email to:', email);
    
    const programDisplay = getProgramDisplayName(program) || program || 'N/A';
    const programType = getProgramType(program);
    const programLevel = getProgramLevel(program);
    const blockLabel = programType === 'TVET' ? 'Term' : 'Block';
    const blockDisplay = block || 'Not assigned';
    
    // ✅ FIXED: Pass intake_month to getDisplayIntake
    const intakeDisplay = intakeYear ? getDisplayIntake(program, intakeYear, intakeMonth) : 'N/A';
    
    if (typeof BREVO_CONFIG === 'undefined' || !BREVO_CONFIG.apiKey) {
        console.warn('⚠️ Brevo not configured. Using fallback email.');
        return sendApprovalEmailFallback(email, userName, role, programDisplay, intakeDisplay, blockDisplay);
    }
    
    try {
        const year = new Date().getFullYear();
        const roleDisplay = role === 'student' ? 'Student' : role || 'User';
        
        const programTypeBadge = programType === 'TVET' ? 
            '🔧 TVET (Technical & Vocational)' : 
            '🎓 KRCHN (Nursing)';
        
        const levelDisplay = programLevel ? `Level: ${programLevel}` : '';
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Approved - NCHSM</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; background: #f0f4f8; }
        .container { max-width: 580px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0A3D62, #1a5276); padding: 30px 35px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 4px 0 0; opacity: 0.8; }
        .body { padding: 30px 35px; }
        .greeting { background: #e8f4f8; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #10b981; }
        .greeting p { margin: 0; font-size: 16px; color: #0A3D62; }
        .details { background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
        .details h4 { margin: 0 0 12px 0; color: #1e293b; }
        .details table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .details td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .details .label { color: #64748B; font-weight: 500; }
        .details .value { color: #0A3D62; font-weight: 600; text-align: right; }
        .details tr:last-child td { border-bottom: none; }
        .program-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .badge-tvet { background: #FEF3C7; color: #92400E; }
        .badge-krchn { background: #DBEAFE; color: #1E40AF; }
        .next-steps { background: #dbeafe; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
        .next-steps ul { margin: 0; padding-left: 20px; color: #1e293b; font-size: 13px; line-height: 1.6; }
        .btn { display: inline-block; background: #0A3D62; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
        .footer { background: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 0.85rem; color: #64748B; }
        .help { background: #fef3c7; border-radius: 12px; padding: 16px; border-left: 4px solid #F59E0B; margin-top: 16px; }
        .help p { margin: 0; color: #78350F; font-size: 13px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1>✅ Account Approved!</h1>
                <p>Nakuru College of Health Sciences and Management</p>
            </div>
            
            <div class="body">
                <div class="greeting">
                    <p>👋 <strong>Dear ${userName}</strong></p>
                    <p style="margin: 8px 0 0; color: #1e293b;">
                        Your NCHSM Digital Portal account has been <strong>approved</strong>! 
                        You can now access all features of the portal.
                    </p>
                </div>
                
                <div class="details">
                    <h4>📋 Account Details</h4>
                    <table>
                        <tr><td class="label">👤 Name</td><td class="value">${userName}</td></tr>
                        <tr><td class="label">📧 Email</td><td class="value">${email}</td></tr>
                        <tr><td class="label">🎭 Role</td><td class="value">${roleDisplay}</td></tr>
                        <tr><td class="label">📚 Program</td>
                            <td class="value">
                                ${programDisplay}
                                <div class="program-badge ${programType === 'TVET' ? 'badge-tvet' : 'badge-krchn'}" style="font-size:0.65rem; margin-top:4px;">
                                    ${programTypeBadge}
                                </div>
                                ${levelDisplay ? `<div style="font-size:0.7rem; color:#64748B; margin-top:2px;">${levelDisplay}</div>` : ''}
                            </td>
                        </tr>
                        <tr><td class="label">📅 Intake</td><td class="value">${intakeDisplay}</td></tr>
                        <tr><td class="label">📌 ${blockLabel}</td><td class="value">${blockDisplay}</td></tr>
                    </table>
                </div>
                
                <div class="next-steps">
                    <h5>📌 Next Steps</h5>
                    <ul>
                        <li>✅ Login to your account using your email and password</li>
                        <li>📚 Access course materials and learning resources</li>
                        <li>📊 Track your academic progress</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="https://nchsm.co.ke/login.html" class="btn">🚪 Login Now</a>
                </div>
                
                <div class="help">
                    <h5>💡 Need Help?</h5>
                    <p>📧 portal.nchsm@gmail.com<br>📞 0790969743 | 0702432987</p>
                </div>
            </div>
            
            <div class="footer">
                <p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p>
                <p style="font-size:0.75rem;">© ${year} Nakuru College of Health Sciences and Management</p>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        const response = await fetch(BREVO_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'api-key': BREVO_CONFIG.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    email: 'noreply@nakurucollegeofhealthelearning.site',
                    name: 'NCHSM ICT Support'
                },
                to: [{ email: email }],
                subject: `✅ Account Approved - Welcome to NCHSM!`,
                htmlContent: htmlContent
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ Approval email sent to ${email}`);
            return { success: true, data };
        } else {
            console.error('❌ Approval email failed:', data);
            return { success: false, error: data };
        }
        
    } catch(e) {
        console.warn('⚠️ Approval email error:', e);
        return sendApprovalEmailFallback(email, userName, role, programDisplay, intakeDisplay, blockDisplay);
    }
}

async function sendApprovalEmailFallback(email, userName, role, programDisplay, intakeDisplay, blockDisplay) {
    console.log('📧 Using fallback approval email to:', email);
    
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwo0Z-oQ_p5-dIe4XYiaRTv6ZdxlmfxP5LIpQT4T1cGihvlimVJg3AvdUNrDeZ0cEkJ3g/exec';
    
    const params = new URLSearchParams({
        to: email,
        userName: userName,
        role: role,
        program: programDisplay || 'N/A',
        intake: intakeDisplay || 'N/A',
        block: blockDisplay || 'N/A',
        emailType: 'approval',
        subject: 'Account Approved - NCHSM Digital Portal'
    });
    
    const img = new Image();
    img.src = scriptUrl + '?' + params.toString();
    img.style.display = 'none';
    document.body.appendChild(img);
    
    return new Promise(resolve => setTimeout(() => resolve(true), 1000));
}

// ============================================
// 🚀 LOAD ALL USERS - OPTIMIZED WITH PAGINATION
// ============================================

async function loadAllUsers(page = 1, filters = {}) {
    const startTime = performance.now();
    console.log('🚀 Loading users (optimized)...');
    
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('❌ users-table-body not found');
        return;
    }
    
   tbody.innerHTML = `
    <tr>
        <td colspan="13" style="padding: 60px 20px; text-align: center;">
            <div class="loading-spinner" style="margin: 0 auto 12px; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="color: #6b7280; margin: 0;">Loading users...</p>
        </td>
    </tr>
`;
    
    try {
        const supabase = getSb();
        
        if (typeof populateUserFilterDropdownsIfEmpty === 'function') {
            await populateUserFilterDropdownsIfEmpty();
        }
        
        let query = supabase.from(USER_PROFILE_TABLE).select('*', { count: 'exact' });
        
        if (filters.role && filters.role !== 'all') {
            query = query.eq('role', filters.role);
        }
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        if (filters.program && filters.program !== 'all') {
            query = query.eq('program', filters.program);
        }
        if (filters.block && filters.block !== 'all') {
            query = query.eq('block', filters.block);
        }
        if (filters.programType === 'tvet') {
            query = query.neq('program', 'KRCHN');
        } else if (filters.programType === 'nursing') {
            query = query.eq('program', 'KRCHN');
        }
        
        if (filters.search && filters.search.length > 1) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(
                `full_name.ilike.${searchTerm},` +
                `email.ilike.${searchTerm},` +
                `student_id.ilike.${searchTerm}`
            );
        }
        
        const from = (page - 1) * USERS_STATE.perPage;
        const to = from + USERS_STATE.perPage - 1;
        query = query.range(from, to).order('full_name', { ascending: true });
        
        const { data: users, error, count } = await query;
        
        if (error) throw error;
        
        const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Loaded ${users?.length || 0} users in ${loadTime}s (Total: ${count})`);
        
        USERS_STATE.total = count || 0;
        USERS_STATE.page = page;
        
        // ✅ FIXED: No need to fetch documents separately - read from profile
        renderUsersTable(users);
        renderUserPagination(count || 0, page);
        updateUserStats(users, count);
        
        window._lastLoadTime = loadTime;
        
        return { users, total: count };
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="padding: 40px 20px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 8px;"></i>
                    Error: ${error.message}
                    <br>
                    <button onclick="loadAllUsers(1, USERS_STATE.filters)" style="margin-top: 10px; padding: 6px 16px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
        return { users: [], total: 0 };
    }
}

// ============================================
// 📊 RENDER USERS TABLE - FIXED
// ✅ Reads doc_kcse and doc_id from profile directly
// ✅ Passes intake_month to getDisplayIntake
// ============================================

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('❌ users-table-body not found');
        return;
    }
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 60px 20px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 40px; display: block; margin-bottom: 12px; opacity: 0.3;"></i>
                    No users found
                    <br>
                    <small style="font-size: 12px;">Try adjusting your filters or add a new user</small>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    for (const u of users) {
        // ✅ FIXED: Get photo URL properly
        let photoUrl = null;
        let hasPhoto = false;
        if (u.profile_photo_url) {
            // If it's already a full URL, use it
            if (u.profile_photo_url.startsWith('http')) {
                photoUrl = u.profile_photo_url;
                hasPhoto = true;
            } else {
                // Construct the full URL from Supabase storage
                photoUrl = `${SUPABASE_URL}/storage/v1/object/public/user-documents/${u.profile_photo_url}`;
                hasPhoto = true;
            }
        }
        const initial = u.full_name?.charAt(0)?.toUpperCase() || 'U';
        
        // Student/Staff ID based on role
        let idDisplay = 'N/A';
        let idLabel = 'ID';
        if (u.role === 'student') {
            idDisplay = u.student_id || 'N/A';
            idLabel = 'Student ID';
        } else if (u.role === 'lecturer' || u.role === 'admin' || u.role === 'superadmin') {
            idDisplay = u.staff_id || u.student_id || 'N/A';
            idLabel = 'Staff ID';
        } else {
            idDisplay = u.student_id || u.staff_id || 'N/A';
            idLabel = 'ID';
        }
        
        // Program info
        const programName = getProgramDisplayName(u.program);
        const programType = getProgramType(u.program);
        const isTVET = programType === 'TVET';
        const programBadgeBg = isTVET ? '#fef3c7' : '#dbeafe';
        const programBadgeColor = isTVET ? '#92400e' : '#1e40af';
        const programIcon = isTVET ? 'fa-tools' : 'fa-graduation-cap';
        
        // Intake display
        const intakeDisplay = u.intake_year ? getDisplayIntake(u.program, u.intake_year, u.intake_month) : 'N/A';
        
        // Block/Term display
        const blockLabel = isTVET ? 'Term' : 'Block';
        const blockValue = u.block || u.current_block || u.term || 'Not assigned';
        const blockDisplay = blockValue !== 'Not assigned' ? `${blockLabel}: ${blockValue}` : 'Not assigned';
        const blockBadgeColor = isTVET ? '#f59e0b' : '#4C1D95';
        const blockBadgeBg = isTVET ? '#fef3c7' : '#e0e7ff';
        
        // Status
        const isApproved = u.status === 'approved' || u.status === 'active';
        const isBlocked = u.block_program_year === true;
        const statusText = isBlocked ? 'BLOCKED' : (isApproved ? 'Approved' : 'Pending');
        const statusBg = isBlocked ? '#fee2e2' : (isApproved ? '#d1fae5' : '#fef3c7');
        const statusColor = isBlocked ? '#991b1b' : (isApproved ? '#065f46' : '#92400e');
        
        // Role badge
        const roleLabels = {
            'student': '👨‍🎓 Student',
            'lecturer': '👨‍🏫 Lecturer',
            'admin': '🛡️ Admin',
            'superadmin': '⭐ Super Admin'
        };
        const roleLabel = roleLabels[u.role] || u.role || 'User';
        
        // ✅ FIXED: Use the constructed photoUrl
        const avatarColors = ['#4C1D95', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
        const colorIndex = (u.full_name?.length || 0) % avatarColors.length;
        const avatarColor = avatarColors[colorIndex];
        
        // ✅ Document status - read directly from profile
        const docKcseStatus = u.doc_kcse || 'pending';
        const docIdStatus = u.doc_id || 'pending';
        
        // ✅ Build avatar HTML with proper photo handling
        let avatarHtml = '';
        if (hasPhoto && photoUrl) {
            avatarHtml = `<img src="${photoUrl}" alt="${escapeHtml(u.full_name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:16px;font-weight:700;color:white;\\'>${initial}</span>'">`;
        } else {
            avatarHtml = `<span style="font-size: 16px; font-weight: 700; color: white;">${initial}</span>`;
        }
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" 
                onmouseover="this.style.background='#f8fafc'" 
                onmouseout="this.style.background='transparent'">
                
                <!-- 1. Checkbox -->
                <td style="padding: 10px 12px; text-align: center;">
                    <input type="checkbox" class="user-checkbox" data-user-id="${escapeHtml(u.user_id)}" 
                           onchange="updateBulkSelectedCount()" style="cursor: pointer;">
                </td>
                
                <!-- 2. Student/Staff ID, Name, Email, Role (COMBINED) -->
                <td style="padding: 10px 14px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <!-- Avatar -->
                        <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 2px solid #e5e7eb; background: ${hasPhoto ? 'transparent' : avatarColor};">
                            ${avatarHtml}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${escapeHtml(u.full_name || 'Unknown')}</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; color: #94a3b8; margin-top: 1px;">
                                <span style="background: #f1f5f9; padding: 0 6px; border-radius: 4px;">${escapeHtml(idDisplay)}</span>
                                <span>${escapeHtml(u.email || 'N/A')}</span>
                                <span style="background: ${u.role === 'student' ? '#dbeafe' : u.role === 'lecturer' ? '#ede9fe' : u.role === 'admin' ? '#fee2e2' : '#fef3c7'}; color: ${u.role === 'student' ? '#2563eb' : u.role === 'lecturer' ? '#7c3aed' : u.role === 'admin' ? '#dc2626' : '#d97706'}; padding: 0 8px; border-radius: 4px; font-weight: 500; font-size: 10px;">
                                    ${roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </td>
                
                <!-- 3. Program -->
                <td style="padding: 10px 14px;">
                    <div style="font-weight: 500; color: #1e293b; font-size: 13px;">${escapeHtml(programName)}</div>
                    <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; background: ${programBadgeBg}; color: ${programBadgeColor}; margin-top: 2px;">
                        <i class="fas ${programIcon}"></i> ${programType}
                    </span>
                </td>
                
                <!-- 4. Intake -->
                <td style="padding: 10px 14px;">
                    <div style="font-size: 13px; color: #1e293b; font-weight: 500;">${escapeHtml(intakeDisplay)}</div>
                </td>
                
                <!-- 5. Block/Term -->
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${blockBadgeBg}; color: ${blockBadgeColor}; border: 1px solid ${blockBadgeColor}33;">
                        <i class="fas ${isTVET ? 'fa-calendar-alt' : 'fa-layer-group'}"></i> 
                        ${escapeHtml(blockDisplay)}
                    </span>
                </td>
                
                <!-- 6. Status -->
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}33;">
                        ${isBlocked ? '🚫' : (isApproved ? '✅' : '⏳')} ${statusText}
                    </span>
                </td>
                
                <!-- 7. Actions -->
                <td style="padding: 10px 14px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="openEmailChangeDialog('${escapeHtml(u.user_id)}', '${escapeHtml(u.email)}')" 
                                class="action-btn" style="background: #f59e0b; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;" 
                                title="Change Email">
                            <i class="fas fa-envelope"></i>
                        </button>
                        <button onclick="openEditUserModal('${escapeHtml(u.user_id)}')" 
                                class="action-btn edit-btn" style="background: #e0e7ff; color: #4C1D95; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!isApproved ? `<button onclick="approveUser('${escapeHtml(u.user_id)}', '${escapeHtml(u.full_name)}')" style="background: #10b981; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            <i class="fas fa-check"></i>
                        </button>` : ''}
                        <button onclick="deleteProfile('${escapeHtml(u.user_id)}', '${escapeHtml(u.full_name)}')" 
                                class="action-btn delete-btn" style="background: #fee2e2; color: #dc2626; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
}
// ============================================
// 📊 UPDATE BULK SELECTED COUNT
// ============================================

function updateBulkSelectedCount() {
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    const countEl = document.getElementById('bulkSelectedCount');
    if (countEl) {
        countEl.textContent = checkboxes.length;
    }
}

// ============================================
// 🔄 TOGGLE ALL USER CHECKBOXES
// ============================================

function toggleAllUserCheckboxes() {
    const checked = document.getElementById('selectAllUsers')?.checked || false;
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    updateBulkSelectedCount();
}

// ============================================
// 📊 UPDATE USER STATS
// ============================================

function updateUserStats(users, total) {
    const statsContainer = document.getElementById('userStatsContainer');
    if (!statsContainer) return;
    
    const approved = users?.filter(u => u.status === 'approved' || u.status === 'active').length || 0;
    const pending = users?.filter(u => u.status === 'pending').length || 0;
    const students = users?.filter(u => u.role === 'student').length || 0;
    const admins = users?.filter(u => u.role === 'admin').length || 0;
    const lecturers = users?.filter(u => u.role === 'lecturer').length || 0;
    
    statsContainer.innerHTML = `
        <div class="stats-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap:8px; margin-bottom:12px;">
            <div class="stat-card" style="background:white; padding:8px; border-radius:8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size:1.2rem; font-weight:700; color:#0A3D62;">${total || 0}</div>
                <div style="font-size:0.6rem; color:#64748B;">Total</div>
            </div>
            <div class="stat-card" style="background:#D1FAE5; padding:8px; border-radius:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:700; color:#064E3B;">${approved}</div>
                <div style="font-size:0.6rem; color:#064E3B;">✅ Active</div>
            </div>
            <div class="stat-card" style="background:#FEF3C7; padding:8px; border-radius:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:700; color:#92400E;">${pending}</div>
                <div style="font-size:0.6rem; color:#92400E;">⏳ Pending</div>
            </div>
            <div class="stat-card" style="background:#DBEAFE; padding:8px; border-radius:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:700; color:#1E40AF;">${students}</div>
                <div style="font-size:0.6rem; color:#1E40AF;">👨‍🎓 Students</div>
            </div>
            <div class="stat-card" style="background:#EDE9FE; padding:8px; border-radius:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:700; color:#5B21B6;">${lecturers}</div>
                <div style="font-size:0.6rem; color:#5B21B6;">👨‍🏫 Lecturers</div>
            </div>
            <div class="stat-card" style="background:#FEE2E2; padding:8px; border-radius:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:700; color:#991B1B;">${admins}</div>
                <div style="font-size:0.6rem; color:#991B1B;">🛡️ Admins</div>
            </div>
        </div>
    `;
}

// ============================================
// 📄 RENDER PAGINATION
// ============================================

function renderUserPagination(total, currentPage) {
    const container = document.getElementById('userPagination');
    if (!container) return;
    
    const totalPages = Math.ceil(total / USERS_STATE.perPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="page-btn" onclick="changeUserPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            ‹
        </button>
    `;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="changeUserPage(1)">1</button>`;
        if (startPage > 2) html += `<span style="padding:0 4px; color:#94A3B8;">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changeUserPage(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span style="padding:0 4px; color:#94A3B8;">...</span>`;
        html += `<button class="page-btn" onclick="changeUserPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
        <button class="page-btn" onclick="changeUserPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            ›
        </button>
    `;
    
    container.innerHTML = html;
}

// ============================================
// 🔄 CHANGE PAGE
// ============================================

function changeUserPage(page) {
    if (page < 1) return;
    const totalPages = Math.ceil(USERS_STATE.total / USERS_STATE.perPage);
    if (page > totalPages) return;
    
    loadAllUsers(page, USERS_STATE.filters);
    
    const table = document.getElementById('users-table');
    if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function changePerPage(value) {
    USERS_STATE.perPage = parseInt(value);
    USERS_STATE.page = 1;
    loadAllUsers(1, USERS_STATE.filters);
}

// ============================================
// 🔍 SEARCH WITH DEBOUNCE
// ============================================

function searchUsersDebounced() {
    const searchInput = document.getElementById('user-search');
    if (!searchInput) return;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        USERS_STATE.filters.search = searchInput.value.trim();
        USERS_STATE.page = 1;
        loadAllUsers(1, USERS_STATE.filters);
    }, 500);
}

// ============================================
// 🎯 FILTER USERS
// ============================================

function filterUsers() {
    const roleFilter = document.getElementById('user-role-filter');
    const statusFilter = document.getElementById('user-status-filter');
    const programFilter = document.getElementById('user-program-filter');
    const blockFilter = document.getElementById('user-block-filter');
    const programTypeFilter = document.getElementById('user-program-type-filter');
    
    USERS_STATE.filters.role = roleFilter?.value || 'all';
    USERS_STATE.filters.status = statusFilter?.value || 'all';
    USERS_STATE.filters.program = programFilter?.value || 'all';
    USERS_STATE.filters.block = blockFilter?.value || 'all';
    
    const programType = programTypeFilter?.value || 'all';
    if (programType === 'nursing') {
        USERS_STATE.filters.programType = 'nursing';
    } else if (programType === 'tvet') {
        USERS_STATE.filters.programType = 'tvet';
    } else {
        USERS_STATE.filters.programType = 'all';
    }
    
    USERS_STATE.page = 1;
    loadAllUsers(1, USERS_STATE.filters);
}

// ============================================
// 🔄 RESET FILTERS
// ============================================

function resetUserFilters() {
    ['user-search', 'user-role-filter', 'user-status-filter', 'user-program-filter', 'user-block-filter', 'user-program-type-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    USERS_STATE.filters = { role: 'all', status: 'all', program: 'all', block: 'all', search: '', programType: 'all' };
    USERS_STATE.page = 1;
    loadAllUsers(1, USERS_STATE.filters);
}

// ============================================
// 📊 LOAD FILTER OPTIONS - CACHED
// ============================================

async function loadFilterOptions() {
    try {
        const supabase = getSb();
        
        if (!USERS_STATE.cache.programs) {
            const { data: programs } = await supabase
                .from(USER_PROFILE_TABLE)
                .select('program', { distinct: true })
                .order('program');
            USERS_STATE.cache.programs = programs?.map(p => p.program).filter(Boolean) || [];
        }
        
        if (!USERS_STATE.cache.blocks) {
            const { data: blocks } = await supabase
                .from(USER_PROFILE_TABLE)
                .select('block', { distinct: true })
                .order('block');
            USERS_STATE.cache.blocks = blocks?.map(b => b.block).filter(Boolean) || [];
        }
        
        const programFilter = document.getElementById('user-program-filter');
        if (programFilter) {
            programFilter.innerHTML = '<option value="all">📚 All Programs</option>';
            const sortedPrograms = [...USERS_STATE.cache.programs].sort((a, b) => {
                const nameA = getProgramDisplayName(a);
                const nameB = getProgramDisplayName(b);
                return nameA.localeCompare(nameB);
            });
            sortedPrograms.forEach(p => {
                const displayName = getProgramDisplayName(p);
                programFilter.innerHTML += `<option value="${p}">${displayName}</option>`;
            });
        }
        
        const blockFilter = document.getElementById('user-block-filter');
        if (blockFilter) {
            blockFilter.innerHTML = '<option value="all">📅 All Blocks/Terms</option>';
            USERS_STATE.cache.blocks.forEach(b => {
                blockFilter.innerHTML += `<option value="${b}">${b}</option>`;
            });
        }
        
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// ============================================
// 🔥 LOAD PENDING APPROVALS - FIXED
// ✅ Reads doc_kcse and doc_id from profile directly
// ✅ Passes intake_month to getDisplayIntake
// ✅ Updates stats with updatePendingStats()
// ✅ FIXED: Profile photo URL construction
// ============================================

async function loadPendingApprovals() {
    const tbody = document.getElementById('pending-table-body');
    if (!tbody) {
        console.error("Missing <tbody id='pending-table-body'> element in your HTML.");
        return;
    }

    tbody.innerHTML = '<tr><td colspan="11"><div class="loading-spinner"></div> Loading pending approvals...</td></tr>';

    try {
        const supabase = getSb();
        const { data: pending, error } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;

        if (!pending || pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px;">✅ No pending approvals</td></tr>';
            // ✅ Update stats with empty array
            updatePendingStats([]);
            return;
        }

        tbody.innerHTML = '';

        for (const u of pending) {
            // ✅ READ DOCUMENT STATUS DIRECTLY FROM PROFILE
            const kcseStatus = u.doc_kcse || 'pending';
            const idStatus = u.doc_id || 'pending';
            
            const escapedName = escapeHtml(u.full_name);
            const escapedUserId = escapeHtml(u.user_id);
            const escapedStudentId = escapeHtml(u.student_id || '');
            const escapedEmail = escapeHtml(u.email || '');
            const escapedRole = escapeHtml(u.role || 'student');
            
            const programName = getProgramDisplayName(u.program);
            const programType = getProgramType(u.program);
            const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
            const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
            
            // ✅ FIXED: Pass intake_month to getDisplayIntake
            const intakeDisplay = getDisplayIntake(u.program, u.intake_year, u.intake_month);
            
            // ✅ FIXED: Get photo URL properly
            let photoHtml = '';
            if (u.profile_photo_url) {
                // Construct the full URL from Supabase storage
                let photoUrl = '';
                if (u.profile_photo_url.startsWith('http')) {
                    photoUrl = u.profile_photo_url;
                } else {
                    photoUrl = `${SUPABASE_URL}/storage/v1/object/public/user-documents/${u.profile_photo_url}`;
                }
                
                photoHtml = `<img src="${photoUrl}" 
                                  alt="Photo" 
                                  style="width:35px;height:35px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid #e5e7eb;" 
                                  onclick="viewDocument('${escapedUserId}','photo')"
                                  onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block';">`;
            } else {
                photoHtml = `<span class="badge badge-secondary" style="font-size:11px;cursor:pointer;" onclick="viewDocument('${escapedUserId}','photo')">No photo</span>`;
            }
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapedName}</strong></td>
                    <td>${escapedEmail}</td>
                    <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px;">${escapedStudentId || 'N/A'}</code></td>
                    <td><span class="badge badge-info">${escapedRole}</span></td>
                    <td>
                        <div style="font-weight:500; font-size:13px;">${escapeHtml(programName)}</div>
                        <div class="program-badge ${programBadgeClass}" style="font-size:10px; margin-top:2px;">
                            <i class="fas ${programIcon}"></i> ${programType}
                        </div>
                    </td>
                    <td>${escapeHtml(intakeDisplay)}</td>
                    <td>
                        <span class="badge ${kcseStatus === 'pending' ? 'badge-warning' : 'badge-success'}" 
                              style="cursor:pointer; font-size:11px;" 
                              onclick="viewDocument('${escapedUserId}','kcse')">
                            ${kcseStatus.toUpperCase()}
                            <i class="fas fa-eye" style="font-size:9px;margin-left:3px;"></i>
                        </span>
                    </td>
                    <td>
                        <span class="badge ${idStatus === 'pending' ? 'badge-warning' : 'badge-success'}" 
                              style="cursor:pointer; font-size:11px;" 
                              onclick="viewDocument('${escapedUserId}','id')">
                            ${idStatus.toUpperCase()}
                            <i class="fas fa-eye" style="font-size:9px;margin-left:3px;"></i>
                        </span>
                    </td>
                    <td>${photoHtml}</td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-approve" 
                                onclick="approveUser('${escapedUserId}', '${escapedName}', '${escapedStudentId}', '${escapedEmail}', '${escapedRole}', '${u.program}')">
                            <i class="fas fa-eye"></i> Review
                        </button>
                        <button class="btn-delete" 
                                onclick="deleteProfile('${escapedUserId}', '${escapedName}', true)">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </td>
                </tr>
            `;
        }
        
        // ✅ UPDATE STATS
        updatePendingStats(pending);
        
        const pendingBadge = document.getElementById('pendingBadge');
        if (pendingBadge) pendingBadge.textContent = pending.length;

    } catch (error) {
        console.error('Error loading pending approvals:', error);
        tbody.innerHTML = `<tr><td colspan="11" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}
// ============================================
// 📊 UPDATE PENDING STATS - NEW FUNCTION
// ============================================

function updatePendingStats(pending) {
    if (!pending || pending.length === 0) {
        const ids = ['pendingCount', 'pendingDocsCount', 'pendingTVETCount', 'pendingNursingCount'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }

    const total = pending.length;
    const docsPending = pending.filter(u => u.doc_kcse === 'pending' || u.doc_id === 'pending').length;
    const tvetCount = pending.filter(u => u.program && u.program !== 'KRCHN').length;
    const nursingCount = pending.filter(u => u.program === 'KRCHN').length;

    const countEl = document.getElementById('pendingCount');
    const docsEl = document.getElementById('pendingDocsCount');
    const tvetEl = document.getElementById('pendingTVETCount');
    const nursingEl = document.getElementById('pendingNursingCount');
    
    if (countEl) countEl.textContent = total;
    if (docsEl) docsEl.textContent = docsPending;
    if (tvetEl) tvetEl.textContent = tvetCount;
    if (nursingEl) nursingEl.textContent = nursingCount;
}

// ============================================
// 👥 LOAD STUDENTS - FIXED
// ✅ Passes intake_month to getDisplayIntake
// ============================================

async function loadStudents() {
    console.log('📋 Loading students (optimized)...');
    
    const tbody = document.getElementById('students-table-body');
    if (!tbody) {
        console.warn('students-table-body not found');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="9"><div class="loading-spinner"></div> Loading students...</td></tr>';
    
    try {
        const supabase = getSb();
        const { data: students, error } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('*')
            .eq('role', 'student')
            .order('full_name', { ascending: true })
            .limit(100);
        
        if (error) throw error;
        
        if (!students || students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px;">No students found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        students.forEach((student, index) => {
            const programName = getProgramDisplayName(student.program);
            const programType = getProgramType(student.program);
            const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
            const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
            
            // ✅ FIXED: Pass intake_month to getDisplayIntake
            const intakeDisplay = student.intake_year ? getDisplayIntake(student.program, student.intake_year, student.intake_month) : 'N/A';
            const statusClass = student.status === 'approved' ? 'status-approved' : 'status-pending';
            
            const blockLabel = programType === 'TVET' ? 'Term' : 'Block';
            const blockDisplay = student.block || student.current_block || 'N/A';
            
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(student.student_id || 'N/A')}</td>
                    <td><strong>${escapeHtml(student.full_name)}</strong></td>
                    <td>${escapeHtml(student.email || '')}</td>
                    <td>
                        <div style="font-weight:500; font-size:13px;">${escapeHtml(programName)}</div>
                        <div class="program-badge ${programBadgeClass}" style="font-size:10px; margin-top:2px;">
                            <i class="fas ${programIcon}"></i> ${programType}
                        </div>
                    </td>
                    <td>${escapeHtml(intakeDisplay)}</td>
                    <td>${escapeHtml(blockDisplay)}</td>
                    <td class="${statusClass}">${escapeHtml(student.status || 'Pending')}</td>
                    <td>
                        <button class="btn-action" onclick="openEditUserModal('${escapeHtml(student.user_id)}')">Edit</button>
                        <button class="btn-delete" onclick="deleteProfile('${escapeHtml(student.user_id)}', '${escapeHtml(student.full_name)}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        
    } catch (error) {
        console.error('Error loading students:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="color:red;">Error: ${error.message}</td></tr>`;
    }
}

function getDisplayIntake(program, year, month = null) {
    if (!year) return 'N/A';
    
    // ✅ FIX: Convert 2-digit year to 4-digit year
    let fullYear = year;
    if (year.length === 2) {
        const yearNum = parseInt(year);
        // If year is 20-99, it's 2000-2099
        if (yearNum >= 20 && yearNum <= 99) {
            fullYear = '20' + year;
        } else if (yearNum >= 0 && yearNum <= 19) {
            fullYear = '20' + year;
        }
    }
    
    const monthNames = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December',
        'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
        'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
        'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
    };
    
    // KRCHN always uses March intake
    if (program === 'KRCHN') {
        return `March ${fullYear}`;
    }
    
    // TVET uses the selected month
    if (month) {
        const monthName = monthNames[String(month).toUpperCase()] || month;
        if (monthName !== String(month).toUpperCase()) {
            return `${monthName} ${fullYear}`;
        } else {
            return `Intake ${fullYear} (${month})`;
        }
    }
    
    return `Intake ${fullYear}`;
}
// ============================================
// 🚀 INITIALIZE MANAGE USERS - UPDATED
// ============================================

async function initManageUsers() {
    console.log('👥 Initializing Manage Users (optimized)...');
    
    await populateUserFilterDropdownsIfEmpty();
    await loadFilterOptions();
    await loadAllUsers(1, USERS_STATE.filters);
    await loadPendingApprovals();
    await loadStudents();
    
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchUsersDebounced);
    }
    
    ['user-role-filter', 'user-status-filter', 'user-program-filter', 'user-block-filter', 'user-program-type-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', filterUsers);
        }
    });
    
    console.log('✅ Manage Users initialized (optimized)');
}

// ============================================
// 📄 DOCUMENT UPLOAD FUNCTIONS
// ============================================

/**
 * Open document upload modal for a user
 */
function openDocumentUploadModal(userId, userName) {
    const modal = document.getElementById('documentUploadModal');
    if (!modal) {
        console.error('❌ documentUploadModal not found');
        showFeedback('Document upload modal not found. Please check the HTML.', 'error');
        return;
    }
    
    document.getElementById('doc_user_id').value = userId;
    document.getElementById('doc_user_name_display').textContent = userName || 'Loading...';
    document.getElementById('doc_user_id_display').textContent = userId ? userId.substring(0, 8) + '...' : 'N/A';
    
    ['profile_photo', 'kcse', 'id', 'certificate', 'other'].forEach(id => {
        const preview = document.getElementById(id + '_preview');
        if (preview) preview.innerHTML = '';
        const input = document.getElementById('doc_' + id);
        if (input) input.value = '';
    });
    
    modal.style.display = 'flex';
}
window.openDocumentUploadModal = openDocumentUploadModal;

/**
 * Preview document before upload
 */
function previewDocument(type) {
    const fileInput = document.getElementById('doc_' + type);
    const previewDiv = document.getElementById(type + '_preview');
    
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (previewDiv) previewDiv.innerHTML = '';
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(1);
    
    let previewHtml = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; background: #f1f5f9; border-radius: 4px; font-size: 12px; margin-top: 4px;">
            <i class="fas fa-file" style="color: #4C1D95;"></i>
            <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(fileName)}</span>
            <span style="font-size: 10px; color: #64748b;">${fileSize}KB</span>
        </div>
    `;
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (previewDiv) {
                previewDiv.innerHTML = `
                    <div style="margin-top: 4px;">
                        <img src="${e.target.result}" style="max-width: 80px; max-height: 60px; border-radius: 4px; border: 1px solid #e5e7eb;">
                        ${previewHtml}
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    } else {
        if (previewDiv) {
            previewDiv.innerHTML = previewHtml;
        }
    }
}
window.previewDocument = previewDocument;

/**
 * Upload user documents - FIXED with proper sb reference
 */
async function uploadUserDocuments() {
    const userId = document.getElementById('doc_user_id').value;
    if (!userId) {
        showNotification('❌ User ID not found', 'error');
        return;
    }
    
    const supabase = getSb();
    const fileTypes = ['profile_photo', 'kcse', 'id', 'certificate', 'other'];
    let uploadedCount = 0;
    let errorCount = 0;
    
    showLoading('Uploading documents...');
    
    for (const type of fileTypes) {
        const input = document.getElementById('doc_' + type);
        if (!input || !input.files || !input.files[0]) continue;
        
        const file = input.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}_${type}_${Date.now()}.${fileExt}`;
        const filePath = `${type}/${userId}/${fileName}`;
        
        try {
            const { error: uploadError } = await supabase
                .storage
                .from('user-documents')
                .upload(filePath, file);
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase
                .storage
                .from('user-documents')
                .getPublicUrl(filePath);
            
            const { error: dbError } = await supabase
                .from('user_documents')
                .insert({
                    user_id: userId,
                    document_type: type,
                    file_path: filePath,
                    file_url: urlData.publicUrl,
                    file_name: file.name,
                    status: 'uploaded',
                    uploaded_at: new Date().toISOString()
                });
            
            if (dbError) throw dbError;
            
            uploadedCount++;
            
            if (type === 'profile_photo') {
                await supabase
                    .from(USER_PROFILE_TABLE)
                    .update({ profile_photo_url: urlData.publicUrl })
                    .eq('user_id', userId);
            }
            
            console.log(`✅ Uploaded ${type} for user ${userId}`);
            
        } catch (error) {
            console.error(`❌ Error uploading ${type}:`, error);
            errorCount++;
        }
    }
    
    hideLoading();
    
    if (uploadedCount > 0) {
        showNotification(`✅ ${uploadedCount} documents uploaded successfully!`, 'success');
        closeModal('documentUploadModal');
        loadAllUsers(1, USERS_STATE.filters);
    } else {
        showNotification(`❌ No documents uploaded. Errors: ${errorCount}`, 'error');
    }
}
window.uploadUserDocuments = uploadUserDocuments;

/**
 * View a document
 */
function viewDocument(userId, docType) {
    console.log('📄 Viewing document:', { userId, docType });
    
    const supabase = getSb();
    
    if (docType === 'photo') {
        supabase
            .from(USER_PROFILE_TABLE)
            .select('profile_photo_url')
            .eq('user_id', userId)
            .single()
            .then(({ data, error }) => {
                if (error || !data?.profile_photo_url) {
                    showNotification('❌ No profile photo found', 'error');
                    return;
                }
                window.open(data.profile_photo_url, '_blank');
            });
        return;
    }
    
    supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('document_type', docType)
        .maybeSingle()
        .then(({ data, error }) => {
            if (error || !data) {
                showNotification(`❌ No ${docType} document found`, 'error');
                return;
            }
            if (data.file_url) {
                window.open(data.file_url, '_blank');
            } else {
                showNotification('❌ Document URL not available', 'error');
            }
        });
}
window.viewDocument = viewDocument;

// ============================================
// 📝 ORIGINAL FUNCTIONS (PRESERVED WITH FIXES)
// ============================================

async function handleAddAccount(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const name = document.getElementById('account-name').value.trim();
    const email = document.getElementById('account-email').value.trim();
    const password = document.getElementById('account-password').value.trim();
    const role = document.getElementById('account-role').value;
    const phone = document.getElementById('account-phone').value.trim();
    const studentId = document.getElementById('account-student-id')?.value.trim() || null;
    const programCode = document.getElementById('account-program').value;
    const intake_year = document.getElementById('account-intake').value;
    const block = document.getElementById('account-block-term').value;
    const guardianName = document.getElementById('account-guardian-name')?.value.trim() || null;
    const guardianPhone = document.getElementById('account-guardian-phone')?.value.trim() || null;
    
    const programType = getProgramType(programCode);
    const programName = getProgramDisplayName(programCode);
    const programLevel = getProgramLevel(programCode);

    const blockTermField = programType === 'TVET' ? 'term' : 'block';
    const blockTermValue = block;

    const userData = {
        full_name: name,
        role,
        phone,
        student_id: studentId,
        program: programCode,
        program_type: programType,
        program_name: programName,
        program_level: programLevel,
        intake_year,
        [blockTermField]: blockTermValue,
        status: 'approved',
        block_program_year: false,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        created_at: new Date().toISOString()
    };

    console.log('🎯 Enrolling user with data:', userData);

    try {
        const supabase = getSb();
        const { data: { user }, error: authError } = await supabase.auth.signUp({
            email, password, options: { data: userData }
        });
        
        if (authError) throw authError;

        if (user && user.id) {
            const profileData = { 
                user_id: user.id, 
                email, 
                ...userData 
            };
            
            const { error: insertError } = await supabase.from(USER_PROFILE_TABLE).insert([profileData]);
            
            if (insertError) {
                await supabase.auth.admin.deleteUser(user.id);
                throw insertError;
            }
            
            e.target.reset();
            showFeedback(`New ${role.toUpperCase()} account successfully enrolled for ${programName}!`, 'success');
            
            await logAudit('USER_ENROLL', `Enrolled new ${role} account: ${name} (${programName})`, user.id);
            
            loadAllUsers(1, USERS_STATE.filters);
            loadStudents();
            loadDashboardData();
        }
    } catch (err) {
        await logAudit('USER_ENROLL', `Failed to enroll new account: ${name}. Reason: ${err.message}`, null, 'FAILURE');
        showFeedback(`Account creation failed: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ✅ FIXED: Mass Promotion uses correct field
async function handleMassPromotion(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const promote_intake = document.getElementById('promote_intake')?.value;
    const promote_program = document.getElementById('promote_program')?.value;
    const promote_from_block = document.getElementById('promote_from_block')?.value;
    const promote_to_block = document.getElementById('promote_to_block')?.value;

    if (!promote_intake || !promote_program || !promote_from_block || !promote_to_block) {
        showFeedback('Please select Intake Year, Program, FROM Block/Term, and TO Block/Term.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    if (promote_from_block === promote_to_block) {
        showFeedback('FROM and TO Block/Term must be different.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }
    
    const programName = getProgramDisplayName(promote_program);
    const programType = getProgramType(promote_program);
    const blockLabel = programType === 'TVET' ? 'Term' : 'Block';
    
    if (!confirm(`⚠️ CRITICAL ACTION: Promote ALL ${programName} students from Intake ${promote_intake}\nFROM: ${promote_from_block}\nTO: ${promote_to_block}\n\nThis action is IRREVERSIBLE. Continue?`)) {
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const supabase = getSb();
        const blockField = programType === 'TVET' ? 'term' : 'block';
        
        const { data, error } = await supabase
            .from(USER_PROFILE_TABLE)
            .update({ 
                [blockField]: promote_to_block,
                updated_at: new Date().toISOString()
            })
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('intake_year', promote_intake)
            .eq('program', promote_program)
            .eq(blockField, promote_from_block)
            .select('user_id, full_name');

        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (count > 0) {
            await logAudit('PROMOTION_MASS', 
                `Promoted ${count} ${programName} students: Intake ${promote_intake} ${promote_from_block} → ${promote_to_block}`, 
                null, 
                'SUCCESS'
            );
            
            const studentNames = data.map(s => s.full_name).join(', ');
            showFeedback(`✅ Successfully promoted ${count} ${programName} students!\n\nPromoted:\n${studentNames.substring(0, 200)}${studentNames.length > 200 ? '...' : ''}`, 'success');
        } else {
            await logAudit('PROMOTION_MASS', 
                `No ${programName} students found for criteria: Intake ${promote_intake}, ${blockLabel} ${promote_from_block}`, 
                null, 
                'WARNING'
            );
            showFeedback(`⚠️ No ${programName} students were found matching the promotion criteria.\n\nIntake: ${promote_intake}\nFrom ${blockLabel}: ${promote_from_block}\n\nPlease check your selections.`, 'warning');
        }

        loadStudents();
        loadAllUsers(1, USERS_STATE.filters);

    } catch (err) {
        await logAudit('PROMOTION_MASS', 
            `Failed mass promotion: ${err.message}`, 
            null, 
            'FAILURE'
        );
        showFeedback(`❌ Mass promotion failed: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================
// SHOW APPROVAL MODAL - WITH TVET DIPLOMA/CERTIFICATE SUPPORT
// ============================================

function showApprovalModal(user) {
    console.log('📋 Showing approval modal for:', user.full_name);
    console.log('📚 User data:', {
        program: user.program,
        block: user.block,
        intake_year: user.intake_year,
        intake_month: user.intake_month,
        role: user.role,
        status: user.status
    });
    
    const existingModal = document.getElementById('approvalModal');
    if (existingModal) existingModal.remove();
    
    const programType = getProgramType(user.program);
    const isTVET = programType === 'TVET';
    const programLevel = getProgramLevel(user.program);
    const isDiploma = programLevel === 'DIPLOMA';
    const isCertificate = programLevel === 'CERTIFICATE';
    
    // ✅ Build program options dynamically from MASTER_PROGRAMS
    let programOptions = '';
    
    const groups = {};
    for (const [code, info] of Object.entries(MASTER_PROGRAMS)) {
        const key = info.display || info.category || 'Other';
        if (!groups[key]) groups[key] = [];
        groups[key].push({ code, ...info });
    }
    
    const groupOrder = [
        '🎓 KRCHN Nursing',
        '🎯 TVET Diploma Programs',
        '📜 TVET Certificate Programs',
        '🔧 TVET Artisan Programs',
        '📊 Other TVET Programs'
    ];
    
    for (const groupName of groupOrder) {
        if (groups[groupName] && groups[groupName].length > 0) {
            programOptions += `<optgroup label="${groupName}">`;
            groups[groupName].forEach(p => {
                const selected = user.program === p.code ? 'selected' : '';
                programOptions += `<option value="${p.code}" ${selected}>${p.name}</option>`;
            });
            programOptions += `</optgroup>`;
        }
    }
    
    for (const [groupName, items] of Object.entries(groups)) {
        if (!groupOrder.includes(groupName)) {
            programOptions += `<optgroup label="${groupName}">`;
            items.forEach(p => {
                const selected = user.program === p.code ? 'selected' : '';
                programOptions += `<option value="${p.code}" ${selected}>${p.name}</option>`;
            });
            programOptions += `</optgroup>`;
        }
    }
    
    // ✅ Block options based on program type AND level
    let blockOptions = [];
    let blockLabel = 'Block';
    
    if (isTVET) {
        blockLabel = 'Term';
        if (isDiploma) {
            // DIPLOMA TVET: Year 1 Term 1 to Year 2 Term 3
            blockOptions = [
                { value: 'Y1T1', label: 'Year 1 Term 1' },
                { value: 'Y1T2', label: 'Year 1 Term 2' },
                { value: 'Y1T3', label: 'Year 1 Term 3' },
                { value: 'Y2T1', label: 'Year 2 Term 1' },
                { value: 'Y2T2', label: 'Year 2 Term 2' },
                { value: 'Y2T3', label: 'Year 2 Term 3' }
            ];
        } else if (isCertificate) {
            // CERTIFICATE TVET: Year 1 Term 1 to Term 3
            blockOptions = [
                { value: 'Y1T1', label: 'Year 1 Term 1' },
                { value: 'Y1T2', label: 'Year 1 Term 2' },
                { value: 'Y1T3', label: 'Year 1 Term 3' }
            ];
        } else {
            // Other TVET (Artisan, etc.)
            blockOptions = [
                { value: 'Introductory', label: 'Introductory Term' },
                { value: 'Term1', label: 'Term 1' },
                { value: 'Term2', label: 'Term 2' },
                { value: 'Term3', label: 'Term 3' },
                { value: 'Term4', label: 'Term 4' },
                { value: 'Term5', label: 'Term 5' },
                { value: 'Term6', label: 'Term 6' },
                { value: 'Final', label: 'Final Term' }
            ];
        }
    } else {
        // KRCHN Blocks
        blockLabel = 'Block';
        blockOptions = [
            { value: 'Introductory', label: 'Introductory Block' },
            { value: 'Block 1', label: 'Block 1' },
            { value: 'Block 2', label: 'Block 2' },
            { value: 'Block 3', label: 'Block 3' },
            { value: 'Block 4', label: 'Block 4' },
            { value: 'Block 5', label: 'Block 5' },
            { value: 'Block 6', label: 'Block 6' },
            { value: 'Final', label: 'Final Block' }
        ];
    }
    
    // ✅ AUTO-SELECT the user's block
    const blockSelectOptions = blockOptions.map(b => {
        // Check if user's block matches any of the possible field names
        const userBlock = user.block || user.current_block || user.term || '';
        const selected = userBlock === b.value ? 'selected' : '';
        return `<option value="${b.value}" ${selected}>${b.label}</option>`;
    }).join('');
    
    // ✅ Month options with auto-selection
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const monthOptions = months.map(m => {
        const selected = user.intake_month === m ? 'selected' : '';
        return `<option value="${m}" ${selected}>${m}</option>`;
    }).join('');
    
    // ✅ Program type description for the info note
    let programTypeDescription = isTVET ? 'TVET (Technical & Vocational Education Training)' : 'KRCHN (Nursing)';
    let programLevelDescription = '';
    if (isTVET) {
        if (isDiploma) programLevelDescription = 'Diploma Level - 2 Years (6 Terms)';
        else if (isCertificate) programLevelDescription = 'Certificate Level - 1 Year (3 Terms)';
        else programLevelDescription = 'Other TVET Program';
    } else {
        programLevelDescription = 'Nursing Program - 3.5 Years (7 Blocks)';
    }
    
    const modal = document.createElement('div');
    modal.id = 'approvalModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 20px; max-width: 850px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideIn 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #4C1D95; padding-bottom: 15px;">
                <div>
                    <h2 style="margin: 0; color: #4C1D95;"><i class="fas fa-user-check"></i> Review & Approve User</h2>
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">
                        <i class="fas fa-info-circle"></i> Review the user's details below. All fields are auto-populated.
                    </p>
                </div>
                <button onclick="closeApprovalModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; padding: 0 10px;">&times;</button>
            </div>
            
            <form id="approvalForm" onsubmit="event.preventDefault(); confirmApproveUser();">
                <!-- Personal Information -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4C1D95; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-user"></i> Personal Information
                        <span style="font-size: 10px; font-weight: 400; color: #94a3b8; text-transform: none;">(auto-populated from registration)</span>
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Full Name *</label>
                            <input type="text" id="edit_full_name" value="${escapeHtml(user.full_name || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Email *</label>
                            <input type="email" id="edit_email" value="${escapeHtml(user.email || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Student/Staff ID</label>
                            <input type="text" id="edit_student_id" value="${escapeHtml(user.student_id || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Phone</label>
                            <input type="text" id="edit_phone" value="${escapeHtml(user.phone || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Role</label>
                            <select id="edit_role" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                                <option value="lecturer" ${user.role === 'lecturer' ? 'selected' : ''}>Lecturer</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>Super Admin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Status</label>
                            <select id="edit_status" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                                <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="approved" ${user.status === 'approved' ? 'selected' : ''}>Approved</option>
                                <option value="blocked" ${user.status === 'blocked' ? 'selected' : ''}>Blocked</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Academic Information -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4C1D95; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-graduation-cap"></i> Academic Information
                        <span style="font-size: 10px; font-weight: 400; color: #94a3b8; text-transform: none;">(auto-populated from registration)</span>
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Program *</label>
                            <select id="edit_program" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                                ${programOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Program Type</label>
                            <input type="text" id="edit_program_type" value="${programTypeDescription}" readonly
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; background:#f1f5f9; font-family:inherit; color:#475569;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Program Level</label>
                            <input type="text" id="edit_program_level" value="${programLevelDescription}" readonly
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; background:#f1f5f9; font-family:inherit; color:#475569;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Intake Year *</label>
                            <input type="text" id="edit_intake_year" value="${escapeHtml(user.intake_year || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Intake Month</label>
                            <select id="edit_intake_month" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                                <option value="">-- Select Month --</option>
                                ${monthOptions}
                            </select>
                        </div>
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">${blockLabel} *</label>
                            <select id="edit_block" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit; background: #f8fafc;">
                                ${blockSelectOptions}
                            </select>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                                <i class="fas fa-info-circle"></i> 
                                ${isTVET && isDiploma ? 'Diploma TVET: Year 1 Term 1 → Year 2 Term 3 (6 terms)' : 
                                  isTVET && isCertificate ? 'Certificate TVET: Year 1 Term 1 → Year 1 Term 3 (3 terms)' :
                                  isTVET ? 'TVET programs use "Terms"' : 'KRCHN programs use "Blocks"'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- System Information -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4C1D95; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-info-circle"></i> System Information
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 13px;">
                            <strong style="color: #475569;">User ID:</strong> 
                            <span style="font-family: monospace; font-size: 12px; color: #0A3D62;">${escapeHtml(user.user_id || 'N/A')}</span>
                        </div>
                        <div style="font-size: 13px;">
                            <strong style="color: #475569;">Created:</strong> 
                            <span style="color: #0A3D62;">${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div style="font-size: 13px;">
                            <strong style="color: #475569;">Current Status:</strong> 
                            <span style="color: ${user.status === 'pending' ? '#f59e0b' : '#10b981'}; font-weight: 600;">${escapeHtml(user.status || 'pending')}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <button type="submit" style="flex: 1; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 14px 20px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-check-circle"></i> Confirm & Approve
                    </button>
                    <button type="button" onclick="closeApprovalModal()" style="flex: 0.5; background: #ef4444; color: white; border: none; padding: 14px 20px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                
                <!-- Info Note -->
                <div style="margin-top: 15px; padding: 12px; background: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0; font-size: 13px; color: #1e40af;">
                        <i class="fas fa-check-circle"></i> 
                        <strong>All fields are auto-populated</strong> with the user's registration data. 
                        Only make changes if something is incorrect. Click "Confirm & Approve" to activate the account.
                    </p>
                </div>
                
                <!-- Program Duration Info -->
                <div style="margin-top: 10px; padding: 10px 12px; background: ${isTVET ? '#fef3c7' : '#e0e7ff'}; border-radius: 8px; border-left: 4px solid ${isTVET ? '#f59e0b' : '#4C1D95'};">
                    <p style="margin: 0; font-size: 12px; color: ${isTVET ? '#92400e' : '#1e40af'};">
                        <i class="fas fa-info-circle"></i> 
                        <strong>Program Duration:</strong> 
                        ${isTVET && isDiploma ? '🎯 Diploma TVET - 2 Years (Year 1 Term 1 → Year 2 Term 3)' : 
                          isTVET && isCertificate ? '📜 Certificate TVET - 1 Year (Year 1 Term 1 → Year 1 Term 3)' :
                          isTVET ? '🔧 TVET Program' : '🎓 KRCHN Nursing - 3.5 Years (7 Blocks)'}
                    </p>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.dataset.userId = user.user_id;
    
    // ✅ Log for debugging
    console.log('✅ Approval modal opened with auto-populated data');
    console.log('📚 Program selected:', user.program);
    console.log('📖 Block/Term selected:', user.block || user.current_block || user.term);
    console.log('📅 Intake:', user.intake_year, user.intake_month);
    console.log('📊 Program Level:', isDiploma ? 'Diploma' : isCertificate ? 'Certificate' : 'Other');
}

// ============================================
// UPDATE USER ROLE - PRESERVED
// ============================================

async function updateUserRole(userId, newRole, fullName) {
    console.log('🎯 Updating user role:', { userId, newRole, fullName });
    
    if (!confirm(`Change user ${fullName}'s role to ${newRole}?`)) return;
    
    try {
        const supabase = getSb();
        const { error } = await supabase
            .from(USER_PROFILE_TABLE)
            .update({ 
                role: newRole,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) {
            console.error('❌ Error updating user role:', error);
            await logAudit(
                'USER_ROLE_UPDATE', 
                `Failed to update ${fullName}'s role to ${newRole}. Reason: ${error.message}`, 
                userId, 
                'FAILURE'
            );
            showFeedback(`Failed: ${error.message}`, 'error');
            return;
        }
        
        await logAudit(
            'USER_ROLE_UPDATE', 
            `Updated ${fullName}'s role to ${newRole}.`, 
            userId, 
            'SUCCESS'
        );
        
        showFeedback(`✅ Role updated to ${newRole}!`, 'success');
        
        loadAllUsers(1, USERS_STATE.filters);
        loadStudents();
        loadPendingApprovals();
        
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        
    } catch (err) {
        console.error('❌ Unexpected error in updateUserRole:', err);
        showFeedback(`Unexpected error: ${err.message}`, 'error');
    }
}

// ============================================
// DELETE PROFILE - COMPLETE FIX
// ============================================

async function deleteProfile(userId, fullName, isRejection = false) {
    console.log('🗑️ Deleting profile:', { userId, fullName, isRejection });
    
    const action = isRejection ? 'Reject' : 'Delete';
    const message = isRejection 
        ? `Reject (delete) user ${fullName}? This will permanently remove their account.`
        : `CRITICAL: Permanently delete profile and user ${fullName}?`;
    
    if (!confirm(`${action}: ${message}`)) return;

    try {
        const supabase = getSb();
        
        const { data: userProfile, error: fetchError } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('user_id, email, full_name')
            .eq('user_id', userId)
            .single();
        
        if (fetchError) {
            console.warn('Could not fetch user details:', fetchError);
        }

        const { error: profileError } = await supabase
            .from(USER_PROFILE_TABLE)
            .delete()
            .eq('user_id', userId);

        if (profileError) {
            console.error('❌ Error deleting profile:', profileError);
            await logAudit(
                'USER_DELETE',
                `Failed to delete profile for ${fullName}. Reason: ${profileError.message}`,
                userId,
                'FAILURE'
            );
            showFeedback(`Failed to delete profile: ${profileError.message}`, 'error');
            return;
        }

        console.log('✅ Profile deleted from table');

        let authDeleted = false;
        
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                console.warn('⚠️ No active session, cannot delete auth user');
                throw new Error('No active session');
            }
            
            const response = await fetch(
                'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/admin-delete-user',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ 
                        userId: userId,
                        email: userProfile?.email || ''
                    })
                }
            );
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Auth deletion failed');
            }
            
            authDeleted = true;
            console.log('✅ Auth user deleted successfully:', result);
            
        } catch (authError) {
            console.warn('⚠️ Auth deletion failed:', authError.message);
            
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await supabase.auth.admin.updateUserById(userId, {
                        password: 'LOCKED_' + Date.now() + '_' + Math.random().toString(36)
                    });
                    console.log('🔒 Auth user locked out (password changed)');
                    try {
                        await supabase.auth.admin.deleteUser(userId);
                        authDeleted = true;
                        console.log('✅ Auth user deleted on retry');
                    } catch (retryError) {
                        console.warn('⚠️ Retry delete failed:', retryError.message);
                    }
                }
            } catch (lockError) {
                console.warn('⚠️ Could not lock out user:', lockError.message);
            }
        }

        try {
            const { error: docError } = await supabase
                .from('user_documents')
                .delete()
                .eq('user_id', userId);
            
            if (docError) {
                console.warn('Could not delete user documents:', docError);
            } else {
                console.log('✅ User documents deleted');
            }
        } catch (docErr) {
            console.warn('Error deleting documents:', docErr);
        }

        const auditDetails = isRejection 
            ? `Rejected user ${fullName} (pending approval)`
            : `Deleted user ${fullName}`;
        
        const auditStatus = authDeleted ? 'SUCCESS' : 'WARNING';
        const auditMessage = authDeleted 
            ? `User ${fullName} deleted successfully from both profile and auth.`
            : `Profile for ${fullName} deleted, but auth user remains. Manual cleanup may be needed.`;

        await logAudit(
            'USER_DELETE',
            auditDetails + ' ' + auditMessage,
            userId,
            auditStatus
        );

        if (authDeleted) {
            showFeedback(`✅ ${action} successful! User ${fullName} has been removed.`, 'success');
        } else {
            showFeedback(`⚠️ Profile deleted, but auth user ${userProfile?.email || 'still exists'} may need manual cleanup.`, 'warning');
            
            console.log('🛠️ Manual cleanup instructions:');
            console.log(`1. Go to Supabase Dashboard → Authentication → Users`);
            console.log(`2. Find the user with email: ${userProfile?.email || 'unknown'}`);
            console.log(`3. Click "Delete" to remove the user`);
        }

        loadPendingApprovals();
        loadAllUsers(1, USERS_STATE.filters);
        loadStudents();
        
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }

    } catch (err) {
        console.error('❌ Unexpected error in deleteProfile:', err);
        
        await logAudit(
            'USER_DELETE',
            `Unexpected error deleting ${fullName}: ${err.message}`,
            userId,
            'FAILURE'
        );
        
        showFeedback(`Unexpected error: ${err.message}`, 'error');
    }
}

// ============================================
// OPEN EDIT USER MODAL - COMPLETE WITH ALL FIELDS
// FIXED: Better error handling and data loading
// FIXED: Profile photo URL construction
// ============================================

async function openEditUserModal(userId) {
    console.log('📝 Opening edit modal for user ID:', userId);
    
    if (!userId) {
        showFeedback('❌ User ID is missing', 'error');
        return;
    }
    
    try {
        const supabase = getSb();
        
        // ✅ FETCH USER DATA - Try both user_id and id
        let user = null;
        let fetchError = null;
        
        // First try with user_id
        const { data: userData, error: error1 } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        
        if (error1) {
            console.warn('⚠️ Fetch with user_id failed:', error1);
            
            // Try with id as fallback
            const { data: userData2, error: error2 } = await supabase
                .from(USER_PROFILE_TABLE)
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            
            if (error2) {
                console.error('❌ Fetch with id also failed:', error2);
                throw new Error('User not found: ' + error2.message);
            }
            
            user = userData2;
        } else {
            user = userData;
        }
        
        if (!user) {
            throw new Error('User not found');
        }
        
        console.log('✅ User data loaded successfully:', user);
        console.log('📧 Email:', user.email);
        console.log('📚 Program:', user.program);
        console.log('📖 Block:', user.block);

        const modal = document.getElementById('userEditModal');
        if (!modal) {
            console.error('❌ userEditModal not found in HTML');
            showFeedback('Edit user modal not found. Please check the HTML.', 'error');
            return;
        }

        // ====== SET BASIC INFO ======
        const userIdField = document.getElementById('edit_user_id');
        if (userIdField) userIdField.value = user.user_id || user.id || '';
        
        const userIdDisplay = document.getElementById('edit_user_id_display');
        if (userIdDisplay) {
            const id = user.user_id || user.id || '';
            userIdDisplay.textContent = id.substring(0, 8) + '...';
        }
        
        const nameField = document.getElementById('edit_user_name');
        if (nameField) nameField.value = user.full_name || '';
        
        const emailField = document.getElementById('edit_user_email');
        if (emailField) emailField.value = user.email || '';
        
        const phoneField = document.getElementById('edit_user_phone');
        if (phoneField) phoneField.value = user.phone || '';
        
        const altPhoneField = document.getElementById('edit_user_alt_phone');
        if (altPhoneField) altPhoneField.value = user.alt_phone || '';
        
        const genderField = document.getElementById('edit_user_gender');
        if (genderField) genderField.value = user.gender || '';
        
        const dobField = document.getElementById('edit_user_dob');
        if (dobField) dobField.value = user.date_of_birth || '';
        
        const nationalIdField = document.getElementById('edit_user_national_id');
        if (nationalIdField) nationalIdField.value = user.national_id || '';
        
        const addressField = document.getElementById('edit_user_address');
        if (addressField) addressField.value = user.address || '';

        // ====== SET ROLE AND STATUS ======
        const roleField = document.getElementById('edit_user_role');
        if (roleField) roleField.value = user.role || 'student';
        
        const statusField = document.getElementById('edit_user_status');
        if (statusField) statusField.value = user.status || 'pending';

        // ====== SET ACADEMIC INFO ======
        const studentIdField = document.getElementById('edit_user_student_id');
        if (studentIdField) studentIdField.value = user.student_id || '';
        
        const intakeYearField = document.getElementById('edit_user_intake_year');
        if (intakeYearField) intakeYearField.value = user.intake_year || '';
        
        const intakeMonthField = document.getElementById('edit_user_intake_month');
        if (intakeMonthField) intakeMonthField.value = user.intake_month || '';
        
        // ====== SET GUARDIAN INFO ======
        const guardianNameField = document.getElementById('edit_user_guardian_name');
        if (guardianNameField) guardianNameField.value = user.guardian_name || '';
        
        const guardianPhoneField = document.getElementById('edit_user_guardian_phone');
        if (guardianPhoneField) guardianPhoneField.value = user.guardian_phone || '';
        
        const parentEmailField = document.getElementById('edit_user_parent_email');
        if (parentEmailField) parentEmailField.value = user.parent_email || '';
        
        const parentAddressField = document.getElementById('edit_user_parent_address');
        if (parentAddressField) parentAddressField.value = user.parent_address || '';

        // ====== SET DOCUMENT STATUS ======
        const docKcseField = document.getElementById('edit_user_doc_kcse');
        if (docKcseField) docKcseField.value = user.doc_kcse || 'pending';
        
        const docIdField = document.getElementById('edit_user_doc_id');
        if (docIdField) docIdField.value = user.doc_id || 'pending';

        // ====== SET PROGRAM AND BLOCK ======
        const editUserProgram = document.getElementById('edit_user_program');
        const editUserBlock = document.getElementById('edit_user_block');
        const blockLabel = document.getElementById('edit_block_label');

        if (editUserProgram) {
            // Set program value
            const programValue = user.program || 'KRCHN';
            editUserProgram.value = programValue;
            console.log('📚 Program set to:', programValue);
            
            // Determine if TVET
            const isTVET = programValue && programValue !== 'KRCHN';
            
            // Update block label
            if (blockLabel) {
                blockLabel.textContent = isTVET ? '📚 Term *' : '📖 Block *';
                blockLabel.style.color = isTVET ? '#f59e0b' : '#4C1D95';
            }
            
            // Populate block options
            if (editUserBlock) {
                // Clear existing options
                editUserBlock.innerHTML = '<option value="">-- Select --</option>';
                
                // Build options based on program type
                let options = [];
                if (isTVET) {
                    options = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
                } else {
                    options = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
                }
                
                // Add options
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    editUserBlock.appendChild(option);
                });
                
                // Set block value
                const blockValue = user.block || user.current_block || user.term || 'Introductory';
                editUserBlock.value = blockValue;
                console.log('📖 Block/Term set to:', blockValue);
            }
        }

        // ====== SET PROFILE PHOTO PREVIEW - FIXED ======
        const photoPreview = document.getElementById('edit_user_photo_preview');
        if (photoPreview) {
            // ✅ FIXED: Get photo URL properly
            let photoUrl = null;
            let hasPhoto = false;
            
            if (user.profile_photo_url) {
                // If it's already a full URL, use it
                if (user.profile_photo_url.startsWith('http')) {
                    photoUrl = user.profile_photo_url;
                    hasPhoto = true;
                } else {
                    // Construct the full URL from Supabase storage
                    photoUrl = `${SUPABASE_URL}/storage/v1/object/public/user-documents/${user.profile_photo_url}`;
                    hasPhoto = true;
                }
            }
            
            if (hasPhoto && photoUrl) {
                photoPreview.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-user\\' style=\\'font-size:32px;color:#94a3b8;\\'></i>'">`;
            } else {
                // Show letter avatar
                const initial = (user.full_name || 'U').charAt(0).toUpperCase();
                photoPreview.innerHTML = `
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4C1D95, #6d28d9); color: white; font-size: 32px; font-weight: 700; border-radius: 50%;">
                        ${initial}
                    </div>
                `;
            }
        }

        // ====== CLEAR PASSWORD FIELDS ======
        const newPasswordField = document.getElementById('edit_user_new_password');
        if (newPasswordField) newPasswordField.value = '';
        
        const confirmPasswordField = document.getElementById('edit_user_confirm_password');
        if (confirmPasswordField) confirmPasswordField.value = '';
        
        // ====== CLEAR EMAIL STATUS ======
        const emailStatus = document.getElementById('emailUpdateStatus');
        if (emailStatus) emailStatus.innerHTML = '';

        // ====== SHOW MODAL ======
        modal.style.display = 'flex';
        
        console.log('✅ Edit user modal opened for:', user.full_name);
        console.log('📸 Photo URL:', user.profile_photo_url ? 'Has photo' : 'No photo');
        
        // ====== LOAD ACADEMIC HISTORY ======
        await loadAcademicHistory(user.user_id || user.id);
        
    } catch (e) {
        console.error('❌ Error in openEditUserModal:', e);
        showFeedback(`Failed to load user: ${e.message}`, 'error');
    }
}
// ============================================
// HANDLE EDIT USER - COMPLETE WITH ALL FIELDS
// FIXED: Removed 'term' column (doesn't exist)
// ============================================
// ============================================
// HANDLE EDIT USER - WITH TVET DIPLOMA/CERTIFICATE SUPPORT
// ============================================

async function handleEditUser(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    if (!submitButton) {
        console.error("Form submitter button not found.");
        return;
    }

    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    try {
        const supabase = getSb();
        const userId = document.getElementById('edit_user_id').value;
        if (!userId) throw new Error('User ID is missing.');

        console.log('✏️ Saving user edit for ID:', userId);

        // Get all form values
        const fullName = document.getElementById('edit_user_name').value.trim();
        const email = document.getElementById('edit_user_email').value.trim();
        const phone = document.getElementById('edit_user_phone').value.trim() || null;
        const altPhone = document.getElementById('edit_user_alt_phone').value.trim() || null;
        const gender = document.getElementById('edit_user_gender').value || null;
        const dob = document.getElementById('edit_user_dob').value || null;
        const nationalId = document.getElementById('edit_user_national_id').value.trim() || null;
        const address = document.getElementById('edit_user_address').value.trim() || null;
        
        const role = document.getElementById('edit_user_role').value;
        const status = document.getElementById('edit_user_status').value;
        
        const studentId = document.getElementById('edit_user_student_id').value.trim() || null;
        const intakeYear = document.getElementById('edit_user_intake_year').value.trim() || null;
        const intakeMonth = document.getElementById('edit_user_intake_month').value || null;
        
        const guardianName = document.getElementById('edit_user_guardian_name').value.trim() || null;
        const guardianPhone = document.getElementById('edit_user_guardian_phone').value.trim() || null;
        const parentEmail = document.getElementById('edit_user_parent_email').value.trim() || null;
        const parentAddress = document.getElementById('edit_user_parent_address').value.trim() || null;
        
        const program = document.getElementById('edit_user_program').value || null;
        const blockValue = document.getElementById('edit_user_block').value || 'Introductory';
        
        const docKcse = document.getElementById('edit_user_doc_kcse').value || 'pending';
        const docId = document.getElementById('edit_user_doc_id').value || 'pending';

        const isTVET = isTVETProgram(program);
        const programLevel = getProgramLevel(program);
        const isDiploma = programLevel === 'DIPLOMA';
        const isCertificate = programLevel === 'CERTIFICATE';

        // Validate required fields
        if (!fullName) {
            showFeedback('❌ Full Name is required', 'error');
            setButtonLoading(submitButton, false, originalText);
            return;
        }
        if (!email) {
            showFeedback('❌ Email is required', 'error');
            setButtonLoading(submitButton, false, originalText);
            return;
        }
        if (!program) {
            showFeedback('❌ Program is required', 'error');
            setButtonLoading(submitButton, false, originalText);
            return;
        }

        // ✅ Validate block value based on program type and level
        const validBlock = validateBlockForProgram(blockValue, program);
        if (!validBlock.valid) {
            showFeedback(`❌ ${validBlock.message}`, 'error');
            setButtonLoading(submitButton, false, originalText);
            return;
        }

        // Build update data
        const updatedData = {
            full_name: fullName,
            email: email,
            phone: phone,
            alt_phone: altPhone,
            gender: gender,
            date_of_birth: dob,
            national_id: nationalId,
            address: address,
            role: role,
            status: status,
            student_id: studentId,
            intake_year: intakeYear,
            intake_month: intakeMonth,
            guardian_name: guardianName,
            guardian_phone: guardianPhone,
            parent_email: parentEmail,
            parent_address: parentAddress,
            program: program,
            block: blockValue,
            current_block: blockValue,
            program_type: isTVET ? 'TVET' : 'KRCHN',
            program_level: programLevel,
            doc_kcse: docKcse,
            doc_id: docId,
            updated_at: new Date().toISOString()
        };

        // ✅ Add term field for TVET programs
        if (isTVET) {
            updatedData.term = blockValue;
            updatedData.program_level = programLevel;
        }

        // ✅ Store program duration info
        if (isDiploma) {
            updatedData.program_duration = '2 Years (6 Terms)';
            updatedData.total_terms = 6;
        } else if (isCertificate) {
            updatedData.program_duration = '1 Year (3 Terms)';
            updatedData.total_terms = 3;
        }

        // Remove null/undefined values
        Object.keys(updatedData).forEach(key => {
            if (updatedData[key] === null || updatedData[key] === undefined) {
                delete updatedData[key];
            }
        });

        console.log('📤 Update data:', updatedData);

        // Handle profile photo upload
        const photoInput = document.getElementById('edit_user_photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}_profile_${Date.now()}.${fileExt}`;
            const filePath = `profile_photos/${userId}/${fileName}`;
            
            try {
                const { error: uploadError } = await supabase
                    .storage
                    .from('user-documents')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });
                
                if (!uploadError) {
                    const { data: urlData } = supabase
                        .storage
                        .from('user-documents')
                        .getPublicUrl(filePath);
                    updatedData.profile_photo_url = urlData.publicUrl;
                    console.log('✅ Profile photo uploaded');
                } else {
                    console.warn('Photo upload failed:', uploadError);
                }
            } catch (err) {
                console.warn('Photo upload error:', err);
            }
        }

        // Update profile
        const { error: profileError } = await supabase
            .from(USER_PROFILE_TABLE)
            .update(updatedData)
            .eq('user_id', userId);

        if (profileError) {
            console.error('❌ Profile update error:', profileError);
            throw profileError;
        }

        console.log('✅ Profile updated successfully');

        // Handle password change
        const newPassword = document.getElementById('edit_user_new_password').value.trim();
        const confirmPassword = document.getElementById('edit_user_confirm_password').value.trim();
        
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                showFeedback('❌ Passwords do not match!', 'error');
                setButtonLoading(submitButton, false, originalText);
                return;
            }

            if (newPassword.length < 6) {
                showFeedback('❌ Password must be at least 6 characters.', 'error');
                setButtonLoading(submitButton, false, originalText);
                return;
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const response = await fetch(
                        'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/admin-reset-password',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify({ 
                                email: email, 
                                newPassword: newPassword 
                            })
                        }
                    );
                    
                    if (response.ok) {
                        console.log('✅ Password updated via edge function');
                    } else {
                        const result = await response.json();
                        console.warn('⚠️ Edge function password update failed:', result);
                        showFeedback('⚠️ User profile saved, but password update failed.', 'warning');
                    }
                }
            } catch (pwErr) {
                console.warn('⚠️ Password update error:', pwErr);
                showFeedback('⚠️ User profile saved, but password update failed.', 'warning');
            }
        }

        // ✅ Log with program level info
        const levelText = isDiploma ? 'Diploma' : isCertificate ? 'Certificate' : 'Other';
        await logAudit('USER_EDIT', 
            `Edited profile for user ${fullName} (${updatedData.program_type || 'KRCHN'} - ${levelText})`, 
            userId, 'SUCCESS');
        
        showFeedback(`✅ User profile updated successfully!`, 'success');

        // Close modal
        document.getElementById('userEditModal').style.display = 'none';
        document.getElementById('edit_user_new_password').value = '';
        document.getElementById('edit_user_confirm_password').value = '';
        
        // Refresh data
        await loadAllUsers(1, USERS_STATE.filters);
        await loadStudents();
        await loadPendingApprovals();
        await loadDashboardData();

    } catch (err) {
        console.error('❌ Error in handleEditUser:', err);
        showFeedback(`❌ Failed to update user: ${err.message}`, 'error');
        
        await logAudit('USER_EDIT', `Failed to update user: ${err.message}`, null, 'FAILURE');
        
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================
// HELPER: VALIDATE BLOCK FOR PROGRAM
// ============================================

function validateBlockForProgram(blockValue, program) {
    const isTVET = isTVETProgram(program);
    const programLevel = getProgramLevel(program);
    const isDiploma = programLevel === 'DIPLOMA';
    const isCertificate = programLevel === 'CERTIFICATE';
    
    if (!blockValue) {
        return { valid: false, message: 'Block/Term is required' };
    }
    
    if (isTVET) {
        if (isDiploma) {
            // Diploma TVET: Y1T1, Y1T2, Y1T3, Y2T1, Y2T2, Y2T3
            const validTerms = ['Y1T1', 'Y1T2', 'Y1T3', 'Y2T1', 'Y2T2', 'Y2T3'];
            if (!validTerms.includes(blockValue)) {
                return { 
                    valid: false, 
                    message: 'Invalid term for Diploma TVET. Must be one of: Year 1 Term 1-3, Year 2 Term 1-3' 
                };
            }
        } else if (isCertificate) {
            // Certificate TVET: Y1T1, Y1T2, Y1T3
            const validTerms = ['Y1T1', 'Y1T2', 'Y1T3'];
            if (!validTerms.includes(blockValue)) {
                return { 
                    valid: false, 
                    message: 'Invalid term for Certificate TVET. Must be one of: Year 1 Term 1-3' 
                };
            }
        } else {
            // Other TVET: Accept generic terms
            const validTerms = ['Introductory', 'Term1', 'Term2', 'Term3', 'Term4', 'Term5', 'Term6', 'Final'];
            if (!validTerms.includes(blockValue) && !blockValue.match(/^Y\dT\d$/)) {
                return { 
                    valid: false, 
                    message: 'Invalid term for TVET program' 
                };
            }
        }
    } else {
        // KRCHN: Accept valid blocks
        const validBlocks = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Final'];
        if (!validBlocks.includes(blockValue)) {
            return { 
                valid: false, 
                message: 'Invalid block for KRCHN program' 
            };
        }
    }
    
    return { valid: true };
}
// ============================================================
// 📄 VIEW USER DOCUMENTS - COMPLETE
// ============================================================

function viewUserDocuments(userId) {
    if (!userId) {
        showFeedback('❌ No user selected', 'error');
        return;
    }
    
    // Get user name for the modal title
    const userName = document.getElementById('edit_user_name')?.value || 'User';
    
    // Open the document viewer modal
    openDocumentViewerModal(userId, userName);
}

// ============================================================
// 📄 OPEN DOCUMENT VIEWER MODAL
// ============================================================

async function openDocumentViewerModal(userId, userName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('documentViewerModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'documentViewerModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(8px);
            z-index: 100000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; max-width: 900px; width: 95%; max-height: 90vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideIn 0.3s ease;">
                <!-- Header -->
                <div style="padding: 16px 24px; border-bottom: 2px solid #4C1D95; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                    <div>
                        <h3 style="margin: 0; color: #4C1D95;">
                            <i class="fas fa-file-alt"></i> <span id="docViewerTitle">User Documents</span>
                        </h3>
                        <p style="margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;">
                            <span id="docViewerUserName">Loading...</span>
                        </p>
                    </div>
                    <button onclick="closeDocumentViewerModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #6b7280; padding: 0 10px;">&times;</button>
                </div>
                
                <!-- Body -->
                <div id="docViewerContent" style="padding: 24px; max-height: 60vh; overflow-y: auto;">
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>
                        Loading documents...
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end; background: #f8fafc;">
                    <button onclick="closeDocumentViewerModal()" style="padding: 8px 20px; background: #e5e7eb; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles for animations if not present
        if (!document.getElementById('modalAnimations')) {
            const style = document.createElement('style');
            style.id = 'modalAnimations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(30px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Set title and user name
    document.getElementById('docViewerTitle').textContent = '📄 User Documents';
    document.getElementById('docViewerUserName').textContent = userName || 'User';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Load documents
    await loadUserDocumentsForViewer(userId);
}

// ============================================================
// 📄 LOAD USER DOCUMENTS FOR VIEWER
// ============================================================

async function loadUserDocumentsForViewer(userId) {
    const container = document.getElementById('docViewerContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>
            Loading documents...
        </div>
    `;
    
    try {
        const supabase = getSb();
        if (!supabase) {
            throw new Error('Database connection not available');
        }
        
        // Get user profile to check document status
        const { data: profile, error: profileError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('full_name, doc_kcse, doc_id, profile_photo_url, student_id')
            .eq('user_id', userId)
            .single();
        
        if (profileError) {
            console.warn('Profile fetch error:', profileError);
        }
        
        // Get documents from user_documents table
        const { data: documents, error: docError } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .order('upload_date', { ascending: false });
        
        if (docError) {
            console.error('Error loading documents:', docError);
        }
        
        // Build document list
        let html = '';
        
        // ====== PROFILE PHOTO ======
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-camera" style="color: #4C1D95;"></i> Profile Photo
                    <span style="font-size: 11px; font-weight: 400; color: #94a3b8; margin-left: auto;">
                        ${profile?.profile_photo_url ? '✅ Uploaded' : '❌ Not uploaded'}
                    </span>
                </h4>
                ${profile?.profile_photo_url ? `
                    <div style="display: flex; align-items: center; gap: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
                        <img src="${getPhotoUrl(profile)}" alt="Profile Photo" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #4C1D95;">
                        <div>
                            <div style="font-weight: 500; color: #1e293b;">Profile Photo</div>
                            <div style="font-size: 12px; color: #64748b;">Uploaded for ID card</div>
                            <button onclick="window.open('${getPhotoUrl(profile)}', '_blank')" style="margin-top: 4px; padding: 4px 12px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-external-link-alt"></i> View Full
                            </button>
                        </div>
                    </div>
                ` : `
                    <div style="padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; text-align: center; color: #991b1b;">
                        <i class="fas fa-camera" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        No profile photo uploaded
                        <br>
                        <small style="color: #6b7280;">Student should upload a passport photo</small>
                    </div>
                `}
            </div>
        `;
        
        // ====== KCSE CERTIFICATE ======
        html += `
            <div style="margin-bottom: 16px;">
                <h4 style="color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-file-pdf" style="color: #dc2626;"></i> KCSE Certificate
                    <span style="font-size: 11px; font-weight: 400; color: #94a3b8; margin-left: auto;">
                        ${profile?.doc_kcse === 'uploaded' || profile?.doc_kcse === 'verified' ? '✅ Uploaded' : '❌ Not uploaded'}
                    </span>
                </h4>
                ${findDocument(documents, 'kcse') ? `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                        <div>
                            <div style="font-weight: 500; color: #1e293b;">${findDocument(documents, 'kcse')?.file_name || 'KCSE Certificate'}</div>
                            <div style="font-size: 11px; color: #64748b;">
                                Uploaded: ${findDocument(documents, 'kcse')?.upload_date ? new Date(findDocument(documents, 'kcse').upload_date).toLocaleDateString() : 'Unknown'}
                                ${findDocument(documents, 'kcse')?.status ? ` • Status: ${findDocument(documents, 'kcse').status}` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="viewDocumentFile('${findDocument(documents, 'kcse')?.file_path}')" style="padding: 4px 14px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="downloadDocumentFile('${findDocument(documents, 'kcse')?.file_path}', '${findDocument(documents, 'kcse')?.file_name || 'kcse_certificate.pdf'}')" style="padding: 4px 14px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                ` : `
                    <div style="padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; text-align: center; color: #991b1b; font-size: 13px;">
                        <i class="fas fa-file-pdf" style="font-size: 20px; display: block; margin-bottom: 4px;"></i>
                        No KCSE certificate uploaded
                    </div>
                `}
            </div>
        `;
        
        // ====== ID / PASSPORT ======
        html += `
            <div style="margin-bottom: 16px;">
                <h4 style="color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-id-card" style="color: #3b82f6;"></i> ID / Passport
                    <span style="font-size: 11px; font-weight: 400; color: #94a3b8; margin-left: auto;">
                        ${profile?.doc_id === 'uploaded' || profile?.doc_id === 'verified' ? '✅ Uploaded' : '❌ Not uploaded'}
                    </span>
                </h4>
                ${findDocument(documents, 'id') ? `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #93c5fd;">
                        <div>
                            <div style="font-weight: 500; color: #1e293b;">${findDocument(documents, 'id')?.file_name || 'ID / Passport'}</div>
                            <div style="font-size: 11px; color: #64748b;">
                                Uploaded: ${findDocument(documents, 'id')?.upload_date ? new Date(findDocument(documents, 'id').upload_date).toLocaleDateString() : 'Unknown'}
                                ${findDocument(documents, 'id')?.status ? ` • Status: ${findDocument(documents, 'id').status}` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="viewDocumentFile('${findDocument(documents, 'id')?.file_path}')" style="padding: 4px 14px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="downloadDocumentFile('${findDocument(documents, 'id')?.file_path}', '${findDocument(documents, 'id')?.file_name || 'id_passport.pdf'}')" style="padding: 4px 14px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                ` : `
                    <div style="padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; text-align: center; color: #991b1b; font-size: 13px;">
                        <i class="fas fa-id-card" style="font-size: 20px; display: block; margin-bottom: 4px;"></i>
                        No ID / Passport uploaded
                    </div>
                `}
            </div>
        `;
        
        // ====== OTHER DOCUMENTS ======
        const otherDocs = documents?.filter(d => d.document_type !== 'kcse' && d.document_type !== 'id' && d.document_type !== 'photo') || [];
        
        if (otherDocs.length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <h4 style="color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-folder-open" style="color: #f59e0b;"></i> Other Documents (${otherDocs.length})
                    </h4>
                    ${otherDocs.map(doc => `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 500; color: #1e293b;">${doc.file_name || doc.document_type || 'Document'}</div>
                                <div style="font-size: 11px; color: #64748b;">
                                    Type: ${doc.document_type || 'General'} • Uploaded: ${doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'Unknown'}
                                    ${doc.status ? ` • Status: ${doc.status}` : ''}
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="viewDocumentFile('${doc.file_path}')" style="padding: 4px 14px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button onclick="downloadDocumentFile('${doc.file_path}', '${doc.file_name || 'document.pdf'}')" style="padding: 4px 14px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // ====== SUMMARY STATS ======
        const uploadedCount = documents?.length || 0;
        const verifiedCount = documents?.filter(d => d.status === 'verified').length || 0;
        const pendingCount = documents?.filter(d => d.status === 'pending' || !d.status).length || 0;
        
        html += `
            <div style="margin-top: 20px; padding: 16px; background: #f1f5f9; border-radius: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; text-align: center;">
                <div>
                    <div style="font-size: 20px; font-weight: 700; color: #4C1D95;">${uploadedCount}</div>
                    <div style="font-size: 11px; color: #64748b;">Total Documents</div>
                </div>
                <div>
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">${verifiedCount}</div>
                    <div style="font-size: 11px; color: #64748b;">Verified</div>
                </div>
                <div>
                    <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${pendingCount}</div>
                    <div style="font-size: 11px; color: #64748b;">Pending</div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading documents:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>
                Error loading documents: ${error.message}
                <br>
                <button onclick="loadUserDocumentsForViewer('${userId}')" style="margin-top: 12px; padding: 6px 16px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================================
// 🔍 FIND DOCUMENT HELPER
// ============================================================

function findDocument(documents, docType) {
    if (!documents || documents.length === 0) return null;
    return documents.find(d => d.document_type === docType) || null;
}

// ============================================================
// 👁️ VIEW DOCUMENT FILE
// ============================================================

function viewDocumentFile(filePath) {
    if (!filePath) {
        showFeedback('❌ No file path provided', 'error');
        return;
    }
    
    const supabaseUrl = SUPABASE_URL || 'https://lwhtjozfsmbyihenfunw.supabase.co';
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/user-documents/${filePath}`;
    
    // Open in new tab
    window.open(fullUrl, '_blank');
}

// ============================================================
// ⬇️ DOWNLOAD DOCUMENT FILE
// ============================================================

function downloadDocumentFile(filePath, fileName) {
    if (!filePath) {
        showFeedback('❌ No file path provided', 'error');
        return;
    }
    
    const supabaseUrl = SUPABASE_URL || 'https://lwhtjozfsmbyihenfunw.supabase.co';
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/user-documents/${filePath}`;
    
    // Create download link
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName || 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showFeedback('📥 Downloading...', 'success');
}

// ============================================================
// ❌ CLOSE DOCUMENT VIEWER MODAL
// ============================================================

function closeDocumentViewerModal() {
    const modal = document.getElementById('documentViewerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================================
// 📸 GET PHOTO URL HELPER
// ============================================================

function getPhotoUrl(profile) {
    if (!profile || !profile.profile_photo_url) {
        return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile?.full_name || 'User') + '&background=4C1D95&color=fff&size=120';
    }
    
    const supabaseUrl = SUPABASE_URL || 'https://lwhtjozfsmbyihenfunw.supabase.co';
    
    if (profile.profile_photo_url.startsWith('http')) {
        return profile.profile_photo_url;
    }
    
    return `${supabaseUrl}/storage/v1/object/public/user-documents/${profile.profile_photo_url}`;
}
// ============================================================
// 📚 LOAD ACADEMIC HISTORY - FOR EDIT USER MODAL
// ============================================================

async function loadAcademicHistory(userId) {
    const container = document.getElementById('academicHistoryContainer');
    if (!container) {
        console.warn('⚠️ academicHistoryContainer not found');
        return;
    }
    
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin"></i> Loading academic history...
        </div>
    `;
    
    try {
        const supabase = getSb();
        if (!supabase) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle"></i> Database connection not available
                </div>
            `;
            return;
        }
        
        // 1. Get user profile for summary
        const { data: profile, error: profileError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, program, block, intake_year, intake_month')
            .eq('user_id', userId)
            .single();
        
        if (profileError) {
            console.warn('Profile fetch error:', profileError);
        }
        
        // 2. Get unit registrations
        const { data: registrations, error: regError } = await supabase
            .from('student_unit_registrations')
            .select('*')
            .eq('student_id', userId)
            .order('submitted_date', { ascending: false })
            .limit(30);
        
        if (regError) {
            console.error('Error loading registrations:', regError);
        }
        
        // 3. Get exam grades
        const { data: grades, error: gradeError } = await supabase
            .from('exam_grades')
            .select('*, exams:exam_id(unit_code, course_name, block_term, exam_name)')
            .eq('student_id', userId)
            .order('graded_at', { ascending: false })
            .limit(30);
        
        if (gradeError) {
            console.error('Error loading grades:', gradeError);
        }
        
        // 4. Get attendance history
        const { data: attendance, error: attError } = await supabase
            .from('geo_attendance_logs')
            .select('check_in_time, session_type, target_name, is_verified')
            .eq('student_id', userId)
            .order('check_in_time', { ascending: false })
            .limit(10);
        
        if (attError) {
            console.error('Error loading attendance:', attError);
        }
        
        // Check if we have any data
        const hasData = (registrations && registrations.length > 0) || 
                       (grades && grades.length > 0) || 
                       (attendance && attendance.length > 0);
        
        if (!hasData) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fas fa-info-circle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    No academic history available
                    <br>
                    <small style="font-size: 12px;">This student has no registrations, grades, or attendance records yet.</small>
                </div>
            `;
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        
        // ====== ACADEMIC SUMMARY ======
        if (profile) {
            const isTVET = profile.program && profile.program !== 'KRCHN';
            const blockLabel = isTVET ? 'Term' : 'Block';
            const intakeDisplay = profile.intake_year ? 
                getDisplayIntake(profile.program, profile.intake_year, profile.intake_month) : 
                'N/A';
            
            html += `
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; border-left: 4px solid #4C1D95;">
                    <strong style="font-size: 13px; color: #1e293b;">📊 Academic Summary</strong>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 6px;">
                        <div>
                            <span style="font-size: 11px; color: #94a3b8;">Program</span>
                            <div style="font-weight: 600; font-size: 13px; color: #0A3D62;">${escapeHtml(profile.program || 'N/A')}</div>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #94a3b8;">${blockLabel}</span>
                            <div style="font-weight: 600; font-size: 13px; color: #0A3D62;">${escapeHtml(profile.block || profile.current_block || 'N/A')}</div>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #94a3b8;">Intake</span>
                            <div style="font-weight: 600; font-size: 13px; color: #0A3D62;">${escapeHtml(intakeDisplay)}</div>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #94a3b8;">Registered Units</span>
                            <div style="font-weight: 600; font-size: 13px; color: #4C1D95;">${registrations ? registrations.length : 0}</div>
                        </div>
                        <div>
                            <span style="font-size: 11px; color: #94a3b8;">Exams Taken</span>
                            <div style="font-weight: 600; font-size: 13px; color: #3b82f6;">${grades ? grades.length : 0}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // ====== REGISTERED UNITS ======
        if (registrations && registrations.length > 0) {
            const approved = registrations.filter(r => r.status === 'approved').length;
            const pending = registrations.filter(r => r.status === 'pending').length;
            const supplementary = registrations.filter(r => r.reg_type === 'Supplementary' || r.reg_type === 'Retake').length;
            
            html += `
                <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; border-left: 4px solid #10b981;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <strong style="font-size: 13px; color: #1e293b;">📚 Registered Units (${registrations.length})</strong>
                        <div style="display: flex; gap: 12px; font-size: 12px; flex-wrap: wrap;">
                            <span style="color: #059669;">✅ ${approved} Approved</span>
                            ${pending > 0 ? `<span style="color: #f59e0b;">⏳ ${pending} Pending</span>` : ''}
                            ${supplementary > 0 ? `<span style="color: #8b5cf6;">🔄 ${supplementary} Supp/Retake</span>` : ''}
                        </div>
                    </div>
                    <div style="margin-top: 8px; max-height: 120px; overflow-y: auto;">
                        ${registrations.slice(0, 15).map(r => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <span style="font-weight: 600; color: #4C1D95;">${escapeHtml(r.unit_code || 'N/A')}</span>
                                    <span style="color: #64748b;">${escapeHtml(r.unit_name || '')}</span>
                                    ${r.reg_type && r.reg_type !== 'Normal' ? `<span style="background: #fef3c7; color: #92400e; padding: 0 6px; border-radius: 4px; font-size: 9px;">${escapeHtml(r.reg_type)}</span>` : ''}
                                </div>
                                <div>
                                    <span style="color: ${r.status === 'approved' ? '#059669' : r.status === 'pending' ? '#f59e0b' : '#dc2626'}; font-weight: 500; font-size: 11px;">
                                        ${r.status === 'approved' ? '✅' : r.status === 'pending' ? '⏳' : '❌'} ${escapeHtml(r.status || 'N/A')}
                                    </span>
                                    ${r.submitted_date ? `<span style="font-size: 9px; color: #94a3b8; margin-left: 4px;">${new Date(r.submitted_date).toLocaleDateString()}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                        ${registrations.length > 15 ? `<div style="text-align: center; font-size: 11px; color: #94a3b8; padding: 4px 0;">+ ${registrations.length - 15} more</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        // ====== EXAM GRADES ======
        if (grades && grades.length > 0) {
            const passed = grades.filter(g => (g.total_score || 0) >= 50).length;
            const avgScore = grades.length > 0 ? Math.round(grades.reduce((sum, g) => sum + (g.total_score || 0), 0) / grades.length) : 0;
            
            html += `
                <div style="background: #eff6ff; border-radius: 8px; padding: 12px; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <strong style="font-size: 13px; color: #1e293b;">📝 Exam Grades (${grades.length})</strong>
                        <div style="display: flex; gap: 12px; font-size: 12px; flex-wrap: wrap;">
                            <span style="color: #059669;">✅ ${passed} Passed</span>
                            <span style="color: #dc2626;">❌ ${grades.length - passed} Failed</span>
                            <span style="color: #4C1D95; font-weight: 600;">📊 Avg: ${avgScore}%</span>
                        </div>
                    </div>
                    <div style="margin-top: 8px; max-height: 120px; overflow-y: auto;">
                        ${grades.slice(0, 10).map(g => {
                            const score = g.total_score || 0;
                            const isPass = score >= 50;
                            const unitInfo = g.exams || {};
                            const unitCode = unitInfo.unit_code || unitInfo.course_name || g.subject_name || 'N/A';
                            const unitName = unitInfo.exam_name || unitInfo.course_name || '';
                            
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                                    <div>
                                        <span style="font-weight: 600; color: #4C1D95;">${escapeHtml(unitCode)}</span>
                                        <span style="color: #64748b; margin-left: 4px;">${escapeHtml(unitName)}</span>
                                        ${unitInfo.block_term ? `<span style="color: #94a3b8; font-size: 10px; margin-left: 4px;">(${escapeHtml(unitInfo.block_term)})</span>` : ''}
                                    </div>
                                    <div>
                                        <span style="color: ${isPass ? '#059669' : '#dc2626'}; font-weight: 600;">
                                            ${score > 0 ? score + '%' : 'N/A'}
                                        </span>
                                        <span style="font-size: 10px; color: ${isPass ? '#059669' : '#dc2626'}; margin-left: 4px;">
                                            ${isPass ? '✅ Pass' : '❌ Fail'}
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${grades.length > 10 ? `<div style="text-align: center; font-size: 11px; color: #94a3b8; padding: 4px 0;">+ ${grades.length - 10} more</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        // ====== ATTENDANCE HISTORY ======
        if (attendance && attendance.length > 0) {
            const verified = attendance.filter(a => a.is_verified === true).length;
            
            html += `
                <div style="background: #f5f3ff; border-radius: 8px; padding: 12px; border-left: 4px solid #8b5cf6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <strong style="font-size: 13px; color: #1e293b;">📍 Recent Attendance (${attendance.length})</strong>
                        <span style="font-size: 12px; color: #059669;">✅ ${verified} Verified</span>
                    </div>
                    <div style="margin-top: 8px; max-height: 80px; overflow-y: auto;">
                        ${attendance.map(a => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px;">
                                <div>
                                    <span style="font-weight: 500;">${escapeHtml(a.session_type || 'N/A')}</span>
                                    <span style="color: #64748b;">${escapeHtml(a.target_name || '')}</span>
                                </div>
                                <div>
                                    <span style="color: ${a.is_verified ? '#059669' : '#f59e0b'};">
                                        ${a.is_verified ? '✅' : '⏳'} ${a.is_verified ? 'Verified' : 'Pending'}
                                    </span>
                                    <span style="font-size: 9px; color: #94a3b8; margin-left: 4px;">
                                        ${a.check_in_time ? new Date(a.check_in_time).toLocaleDateString() : ''}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        console.log(`✅ Academic history loaded for user: ${userId}`);
        
    } catch (error) {
        console.error('Error loading academic history:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc2626;">
                <i class="fas fa-exclamation-circle"></i> Error loading academic history
                <br>
                <small style="font-size: 12px;">${escapeHtml(error.message || 'Unknown error')}</small>
            </div>
        `;
    }
}
// ============================================================
// 🔧 MISSING FUNCTIONS
// ============================================================

/**
 * Open email change dialog - Called from table action buttons
 */
function openEmailChangeDialog(userId, currentEmail) {
    console.log('📧 Opening email change dialog for:', userId, currentEmail);
    
    // Get current user to check permissions
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!['superadmin', 'admin'].includes(currentUser?.role)) {
        showNotification('❌ Permission denied. Admin privileges required.', 'error');
        return;
    }
    
    const newEmail = prompt(
        `Change email for:\n${currentEmail}\n\nEnter new email address:`,
        currentEmail
    );
    
    if (!newEmail) return; // User cancelled
    
    if (newEmail === currentEmail) {
        showNotification('ℹ️ No change made', 'info');
        return;
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        showNotification('❌ Please enter a valid email address', 'error');
        return;
    }
    
    // Confirm with admin
    if (!confirm(`⚠️ Are you sure you want to change the email from:\n\n${currentEmail}\n\nto:\n\n${newEmail}`)) {
        return;
    }
    
    // Call the update function
    showLoading('Changing email...');
    
    updateUserEmailFromModalDirect(userId, newEmail)
        .then(result => {
            hideLoading();
            if (result.success) {
                showNotification(`✅ Email changed to ${newEmail}`, 'success');
                // Refresh the user list
                if (typeof loadAllUsers === 'function') {
                    loadAllUsers(1, USERS_STATE?.filters || {});
                }
            } else {
                showNotification(`❌ ${result.message}`, 'error');
            }
        })
        .catch(error => {
            hideLoading();
            showNotification(`❌ ${error.message}`, 'error');
        });
}

/**
 * Direct email update function for the dialog
 */
async function updateUserEmailFromModalDirect(userId, newEmail) {
    try {
        const supabase = getSb();
        
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return { success: false, message: 'No active session' };
        }
        
        // Call the Edge Function
        const response = await fetch(
            'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/admin-update-email',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                    userId: userId,
                    newEmail: newEmail.toLowerCase()
                })
            }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
            return { success: false, message: result.error || 'Update failed' };
        }
        
        // Update profile table
        await supabase
            .from(USER_PROFILE_TABLE)
            .update({ 
                email: newEmail.toLowerCase(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        return { success: true, message: result.message };
        
    } catch (error) {
        console.error('Email update error:', error);
        return { success: false, message: error.message };
    }
}

// ============================================================
// 📧 UPDATE USER EMAIL - FIXED QUERY
// ============================================================

async function updateUserEmailFromModal() {
    const userId = document.getElementById('edit_user_id')?.value;
    const emailInput = document.getElementById('edit_user_email');
    const statusDiv = document.getElementById('emailUpdateStatus');
    
    if (!userId) {
        statusDiv.innerHTML = '<span style="color: #dc2626;">❌ No user selected.</span>';
        return;
    }
    
    const newEmail = emailInput?.value?.trim();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        statusDiv.innerHTML = '<span style="color: #dc2626;">❌ Please enter a valid email</span>';
        return;
    }
    
    statusDiv.innerHTML = '<span style="color: #4C1D95;">⏳ Checking permissions...</span>';
    
    try {
        const supabase = getSb();
        
        // ✅ FIX: Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            statusDiv.innerHTML = '<span style="color: #dc2626;">❌ No active session</span>';
            return;
        }
        
        const currentUser = session.user;
        console.log('👤 Current user:', currentUser.email);
        console.log('🆔 Current user ID:', currentUser.id);
        
        // ✅ FIX: Use user_id column (not email) for admin check
        const { data: adminProfile, error: adminError } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('role, email')
            .eq('user_id', currentUser.id)  // ← Use user_id
            .single();
        
        if (adminError) {
            console.error('Admin check error:', adminError);
            // Try fallback - check by email
            const { data: adminByEmail } = await supabase
                .from(USER_PROFILE_TABLE)
                .select('role, email')
                .eq('email', currentUser.email)
                .single();
            
            if (!adminByEmail || !['admin', 'superadmin', 'super_admin'].includes(adminByEmail.role)) {
                statusDiv.innerHTML = `<span style="color: #dc2626;">❌ Admin privileges required. Your role: ${adminByEmail?.role || 'none'}</span>`;
                return;
            }
        } else if (!adminProfile || !['admin', 'superadmin', 'super_admin'].includes(adminProfile.role)) {
            statusDiv.innerHTML = `<span style="color: #dc2626;">❌ Admin privileges required. Your role: ${adminProfile?.role || 'none'}</span>`;
            return;
        }
        
        console.log('✅ Admin verified');
        
        // Check if email already in use
        const { data: existingUser } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('user_id')
            .eq('email', newEmail.toLowerCase())
            .neq('user_id', userId)
            .single();
        
        if (existingUser) {
            statusDiv.innerHTML = '<span style="color: #dc2626;">❌ Email already in use</span>';
            return;
        }
        
        // Get current email
        const { data: userData } = await supabase
            .from(USER_PROFILE_TABLE)
            .select('email, full_name')
            .eq('user_id', userId)
            .single();
        
        if (!userData) {
            statusDiv.innerHTML = '<span style="color: #dc2626;">❌ User not found</span>';
            return;
        }
        
        if (userData.email === newEmail) {
            statusDiv.innerHTML = '<span style="color: #f59e0b;">ℹ️ No change needed</span>';
            return;
        }
        
        // Confirm
        if (!confirm(`⚠️ Change email from:\n\n${userData.email}\n\nto:\n\n${newEmail}`)) {
            statusDiv.innerHTML = '<span style="color: #6b7280;">ℹ️ Cancelled</span>';
            return;
        }
        
        statusDiv.innerHTML = '<span style="color: #4C1D95;">⏳ Updating email...</span>';
        
        // ✅ Call Edge Function
        const response = await fetch(
            'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/admin-update-email',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                    userId: userId,
                    newEmail: newEmail.toLowerCase()
                })
            }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Update failed');
        }
        
        // Update profile
        await supabase
            .from(USER_PROFILE_TABLE)
            .update({ 
                email: newEmail.toLowerCase(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        // Update input
        emailInput.value = newEmail;
        
        statusDiv.innerHTML = `<span style="color: #059669;">✅ Email updated to ${newEmail}</span>`;
        showNotification(`✅ Email changed to ${newEmail}`, 'success');
        
        // Refresh
        setTimeout(() => {
            if (typeof loadAllUsers === 'function') {
                loadAllUsers(1, USERS_STATE?.filters || {});
            }
        }, 800);
        
    } catch (error) {
        console.error('Email update error:', error);
        statusDiv.innerHTML = `<span style="color: #dc2626;">❌ ${error.message}</span>`;
        showNotification('❌ Failed to update email', 'error');
    }
}

// ============================================
// CLEAR EMAIL STATUS
// ============================================

function clearEmailStatus() {
    const statusDiv = document.getElementById('emailUpdateStatus');
    if (statusDiv) {
        statusDiv.innerHTML = '';
        statusDiv.style.display = 'none';
    }
}

// ============================================
// OVERRIDE closeModal to clear email status
// ============================================

const originalCloseModal = window.closeModal;
window.closeModal = function(modalId) {
    if (modalId === 'userEditModal') {
        clearEmailStatus();
    }
    if (typeof originalCloseModal === 'function') {
        originalCloseModal(modalId);
    }
};

// ============================================
// ✅ EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE
// ============================================

window.loadAllUsers = loadAllUsers;
window.loadPendingApprovals = loadPendingApprovals;
window.loadStudents = loadStudents;
window.initManageUsers = initManageUsers;
window.changeUserPage = changeUserPage;
window.changePerPage = changePerPage;
window.searchUsersDebounced = searchUsersDebounced;
window.filterUsers = filterUsers;
window.resetUserFilters = resetUserFilters;
window.approveUser = approveUser;
window.showApprovalModal = showApprovalModal;
window.closeApprovalModal = closeApprovalModal;
window.confirmApproveUser = confirmApproveUser;
window.updateUserRole = updateUserRole;
window.deleteProfile = deleteProfile;
window.sendApprovalEmail = sendApprovalEmail;
window.getDisplayIntake = getDisplayIntake;
window.handleAddAccount = handleAddAccount;
window.handleMassPromotion = handleMassPromotion;
window.openEditUserModal = openEditUserModal;
window.handleEditUser = handleEditUser;
window.openDocumentUploadModal = openDocumentUploadModal;
window.previewDocument = previewDocument;
window.uploadUserDocuments = uploadUserDocuments;
window.viewDocument = viewDocument;
window.updateUserEmailFromModal = updateUserEmailFromModal;
window.clearEmailStatus = clearEmailStatus;
window.updatePendingStats = updatePendingStats;

console.log('✅ Users Management fully optimized and exposed to global scope!');
console.log('✅ Fixed: Document status read from profile directly');
console.log('✅ Fixed: Intake month passed to getDisplayIntake');
console.log('✅ Fixed: updatePendingStats added');
console.log('✅ Fixed: getDisplayIntake no longer hardcoded to March');
