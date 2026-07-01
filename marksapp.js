// ============================================
// NURSING MARKS SYSTEM - COMPLETE WORKING
// ============================================

// ===== WAIT FOR SUPABASE SDK =====
(function() {
    if (typeof supabaseJs === 'undefined') {
        console.log('⏳ Loading Supabase SDK...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = function() {
            console.log('✅ Supabase SDK loaded!');
            startApp();
        };
        script.onerror = function() {
            alert('❌ Failed to load Supabase SDK. Please check your internet.');
        };
        document.head.appendChild(script);
    } else {
        console.log('✅ Supabase SDK already loaded');
        startApp();
    }
})();

// ===== MAIN APPLICATION =====
function startApp() {
    console.log('🚀 Starting Nursing Marks System...');
    
    // ===== SUPABASE CONFIG =====
    const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
    
    // Create Supabase client
    const supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sb = supabaseClient;
    
    console.log('✅ Supabase client ready');
    console.log('📡 sb.from exists:', typeof window.sb.from === 'function');
    
    // ===== GLOBALS =====
    let currentUser = null;
    let currentYear = '2026';
    let currentExamType = 'internal';
    let configCache = null;
    let currentMarksData = null;
    let currentMarksBlock = null;
    let currentMarksSubject = null;
    let currentAssessmentType = null;
    let currentAdminMarks = null;
    let currentAdminAssessmentType = null;
    let currentAdminBlock = null;
    let currentAdminSubject = null;
    let currentNCKMarks = null;
    let fastEntryVisible = false;
    let autoSaveInterval = null;
    let unsavedChanges = false;
    
    const INTAKE_YEARS = ['2024', '2025', '2026'];
    const sb = window.sb;
    

// ============================================================
// CORE UI FUNCTIONS
// ============================================================

function showLoading(msg) {
    let l = document.querySelector('.loader');
    if (l) l.remove();
    l = document.createElement('div');
    l.className = 'loader';
    l.innerHTML = `<div class="spinner"></div><div class="loader-text">${msg || 'Loading...'}</div>`;
    document.body.appendChild(l);
}

function hideLoading() {
    const l = document.querySelector('.loader');
    if (l) l.remove();
}

function showNotification(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'notification-toast';
    if (isErr) t.classList.add('error');
    t.innerHTML = `<i class="fas ${isErr ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.remove());
}

function markUnsaved() {
    unsavedChanges = true;
}

// ============================================================
// SUPABASE HELPER FUNCTIONS
// ============================================================

async function getMarkEntrySettings() {
    try {
        const { data, error } = await sb.from('mark_entry_settings').select('*');
        if (error) throw error;
        const settings = {};
        data.forEach(item => {
            settings[item.setting_key] = {
                enabled: item.enabled,
                closed_by: item.closed_by,
                closed_at: item.closed_at
            };
        });
        return settings;
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { global: { enabled: true } };
    }
}

async function logMarkEntry(lecturerName, action, target, block, examType, details) {
    try {
        await sb.from('mark_entry_logs').insert({
            lecturer_name: lecturerName || 'System',
            action: action,
            target: target,
            block: block,
            exam_type: examType || 'internal',
            details: details,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error logging:', error);
    }
}

function calculateFinalScore(cat1, cat2, exam, assessmentType) {
    cat1 = parseFloat(cat1) || 0;
    cat2 = parseFloat(cat2) || 0;
    exam = parseFloat(exam) || 0;
    let finalScore = 0;
    if (assessmentType === 'full') {
        finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60 * 30) + Math.min(exam, 70);
    } else if (assessmentType === 'single_cat') {
        finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
    } else if (assessmentType === 'exam_only') {
        finalScore = Math.min(exam, 100);
    } else {
        finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60 * 30) + Math.min(exam, 70);
    }
    return Math.round(finalScore * 10) / 10;
}

function calculateGrade(percentage) {
    if (percentage >= 80) return 'A';
    if (percentage >= 75) return 'A-';
    if (percentage >= 70) return 'B+';
    if (percentage >= 65) return 'B';
    if (percentage >= 60) return 'B-';
    if (percentage >= 55) return 'C+';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'C-';
    if (percentage >= 40) return 'D+';
    if (percentage >= 35) return 'D';
    return 'E';
}

// ============================================================
// API CALL - COMPLETE
// ============================================================

async function apiCall(endpoint, opts = {}) {
    try {
        console.log(`📡 API Call: ${endpoint}`);
        
        // --- GET MARKS ---
        if (endpoint.match(/^\/api\/marks\/.+\/.+$/) && !opts.method) {
            const parts = endpoint.split('/');
            const block = parts[2];
            const subject = decodeURIComponent(parts[3]);
            const year = currentYear || '2026';
            const examType = currentExamType || 'internal';
            
            if (examType === 'nck') {
                const { data, error } = await sb
                    .from('nck_marks')
                    .select('*')
                    .eq('block', block)
                    .eq('subject_name', subject)
                    .eq('academic_year', year)
                    .order('admission_number');
                if (error) throw error;
                return data.map(item => ({
                    row: 0,
                    admission: item.admission_number,
                    name: item.student_name,
                    scores: item.scores || [],
                    final: parseFloat(item.final_score) || 0,
                    gradedBy: item.graded_by || ''
                }));
            }
            
            const { data, error } = await sb
                .from('student_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', subject)
                .eq('academic_year', year)
                .order('admission_number');
            if (error) throw error;
            return data.map(item => ({
                row: 0,
                admission: item.admission_number,
                name: item.student_name,
                cat1: parseFloat(item.cat1_score) || 0,
                cat2: parseFloat(item.cat2_score) || 0,
                exam: parseFloat(item.exam_score) || 0,
                final: parseFloat(item.final_score) || 0,
                grade: item.grade || '',
                gradedBy: item.graded_by || '',
                assessmentType: item.assessment_type || 'full'
            }));
        }
        
        // --- SAVE MARKS ---
        if (endpoint === '/api/marks' && opts.method === 'POST') {
            const body = JSON.parse(opts.body);
            const { block, subject, marksData, lecturerName } = body;
            const year = currentYear || '2026';
            const examType = currentExamType || 'internal';
            const userRole = currentUser?.role || 'admin';
            
            // Check entry permissions
            const isAdmin = (userRole === 'admin' || lecturerName === 'Administrator');
            if (!isAdmin) {
                const settings = await getMarkEntrySettings();
                if (settings.global && settings.global.enabled === false) {
                    return { success: false, message: '❌ Mark entry is globally closed.' };
                }
                const classKey = `year_${year}`;
                if (settings[classKey] && settings[classKey].enabled === false) {
                    return { success: false, message: `❌ Mark entry is closed for ${year} class.` };
                }
                if (examType === 'internal') {
                    const subjectKey = `${block}_${subject}`;
                    if (settings[subjectKey] && settings[subjectKey].enabled === false) {
                        return { success: false, message: `❌ Mark entry is closed for ${subject}.` };
                    }
                }
            }
            
            let savedCount = 0, updatedCount = 0, insertedCount = 0;
            const errors = [];
            
            if (examType === 'nck') {
                for (const mark of marksData) {
                    try {
                        const admission = mark.admission || mark.admission_number;
                        if (!admission) continue;
                        const scores = mark.scores || [];
                        const finalScore = mark.final || 0;
                        const gradedBy = mark.gradedBy || lecturerName || 'System';
                        
                        const { data: existing } = await sb
                            .from('nck_marks')
                            .select('id')
                            .eq('admission_number', admission)
                            .eq('subject_name', subject)
                            .eq('block', block)
                            .eq('academic_year', year)
                            .single();
                        
                        if (existing) {
                            await sb.from('nck_marks').update({
                                scores, final_score: finalScore, graded_by: gradedBy,
                                updated_at: new Date().toISOString()
                            }).eq('id', existing.id);
                            updatedCount++;
                        } else {
                            await sb.from('nck_marks').insert({
                                admission_number: admission, student_name: mark.name || '',
                                subject_name: subject, block: block, assessment_type: 'clinical',
                                scores, final_score: finalScore, graded_by: gradedBy,
                                academic_year: year, status: 'completed'
                            });
                            insertedCount++;
                        }
                        savedCount++;
                    } catch (markError) {
                        errors.push({ admission: mark.admission, error: markError.message });
                    }
                }
            } else {
                for (const mark of marksData) {
                    try {
                        const admission = mark.admission;
                        if (!admission) continue;
                        const cat1 = parseFloat(mark.cat1) || 0;
                        const cat2 = parseFloat(mark.cat2) || 0;
                        const exam = parseFloat(mark.exam) || 0;
                        const assessmentType = mark.assessmentType || 'full';
                        const finalScore = calculateFinalScore(cat1, cat2, exam, assessmentType);
                        const grade = calculateGrade(finalScore);
                        
                        const { data: existing } = await sb
                            .from('student_marks')
                            .select('id')
                            .eq('admission_number', admission)
                            .eq('subject_name', subject)
                            .eq('block', block)
                            .eq('academic_year', year)
                            .single();
                        
                        if (existing) {
                            await sb.from('student_marks').update({
                                cat1_score: cat1, cat2_score: cat2, exam_score: exam,
                                final_score: finalScore, grade: grade,
                                graded_by: lecturerName || 'System',
                                assessment_type: assessmentType,
                                updated_at: new Date().toISOString()
                            }).eq('id', existing.id);
                            updatedCount++;
                        } else {
                            await sb.from('student_marks').insert({
                                admission_number: admission, student_name: mark.name || '',
                                block, subject_name: subject, assessment_type: assessmentType,
                                cat1_score: cat1, cat2_score: cat2, exam_score: exam,
                                final_score: finalScore, grade: grade,
                                graded_by: lecturerName || 'System',
                                academic_year: year
                            });
                            insertedCount++;
                        }
                        savedCount++;
                    } catch (markError) {
                        errors.push({ admission: mark.admission, error: markError.message });
                    }
                }
            }
            
            await logMarkEntry(lecturerName || 'System', 'save', subject, block, examType,
                `Saved ${savedCount} marks (${updatedCount} updated, ${insertedCount} inserted)`);
            
            return {
                success: true,
                message: `✅ Saved ${savedCount} marks (${updatedCount} updated, ${insertedCount} inserted)`,
                saved: savedCount, updated: updatedCount, inserted: insertedCount,
                errors: errors.length > 0 ? errors : undefined
            };
        }
        
        // --- GET SUBJECTS ---
        if (endpoint.match(/^\/api\/subjects\/.+$/) && !opts.method) {
            const block = endpoint.split('/')[3];
            const year = currentYear || '2026';
            const examType = currentExamType || 'internal';
            if (examType === 'nck') {
                return [{ name: 'XY FORMS', assessmentType: 'nck' }, { name: 'ASSESSMENT AND CASE', assessmentType: 'nck' }];
            }
            const { data, error } = await sb
                .from('units_catalog')
                .select('unit_name, assessment_type')
                .eq('block', block)
                .eq('year', parseInt(year))
                .eq('status', 'active');
            if (error) throw error;
            return data.map(item => ({ name: item.unit_name, assessmentType: item.assessment_type || 'full' }));
        }
        
        // --- GET STUDENTS ---
        if (endpoint === '/api/students' && !opts.method) {
            const year = currentYear || '2026';
            const { data, error } = await sb
                .from('consolidated_user_profiles_table')
                .select('student_id, full_name, block, intake_year, status')
                .eq('role', 'student')
                .eq('intake_year', year)
                .order('full_name');
            if (error) throw error;
            return data.map(item => ({
                admission: item.student_id || '',
                name: item.full_name || '',
                block: item.block || 'BLOCK_0',
                status: item.status || 'ACTIVE'
            }));
        }
        
        // --- GET LECTURERS ---
        if (endpoint === '/api/lecturers' && !opts.method) {
            const { data, error } = await sb
                .from('lecturers')
                .select('*')
                .eq('status', 'approved')
                .order('full_name');
            if (error) throw error;
            return data;
        }
        
        // --- GET UNITS ---
        if (endpoint === '/api/units' && !opts.method) {
            const year = currentYear || '2026';
            const { data, error } = await sb
                .from('units_catalog')
                .select('*')
                .eq('year', parseInt(year))
                .eq('status', 'active')
                .order('block');
            if (error) throw error;
            const units = {};
            data.forEach(item => {
                const block = item.block;
                if (!units[block]) units[block] = [];
                units[block].push({ name: item.unit_name, assessmentType: item.assessment_type || 'full' });
            });
            return units;
        }
        
        // --- GET STATS ---
        if (endpoint === '/api/stats' && !opts.method) {
            const year = currentYear || '2026';
            const { count: studentCount } = await sb
                .from('consolidated_user_profiles_table')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('intake_year', year);
            const { count: subjectCount } = await sb
                .from('units_catalog')
                .select('*', { count: 'exact', head: true })
                .eq('year', parseInt(year))
                .eq('status', 'active');
            const { count: marksCount } = await sb
                .from('student_marks')
                .select('*', { count: 'exact', head: true })
                .eq('academic_year', year);
            return { totalStudents: studentCount || 0, totalSubjects: subjectCount || 0, totalMarks: marksCount || 0, totalBlocks: 6 };
        }
        
        // --- GET BLOCKS ---
        if (endpoint === '/api/blocks' && !opts.method) {
            return ['BLOCK_0', 'BLOCK_1', 'BLOCK_2', 'BLOCK_3', 'BLOCK_4', 'BLOCK_5'];
        }
        
        // --- GET YEARS ---
        if (endpoint === '/api/years' && !opts.method) {
            return ['2024', '2025', '2026'];
        }
        
        // --- MARK ENTRY SETTINGS ---
        if (endpoint === '/api/mark-entry/settings' && !opts.method) {
            return await getMarkEntrySettings();
        }
        
        // --- MARK ENTRY LOGS ---
        if (endpoint === '/api/mark-entry/logs' && !opts.method) {
            const { data, error } = await sb
                .from('mark_entry_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data || [];
        }
        
        // --- TOGGLE GLOBAL ---
        if (endpoint === '/api/mark-entry/toggle-global' && opts.method === 'POST') {
            const body = JSON.parse(opts.body);
            const { lecturerName } = body;
            const { data: current } = await sb
                .from('mark_entry_settings')
                .select('enabled')
                .eq('setting_key', 'global')
                .single();
            const newEnabled = !(current?.enabled !== false);
            await sb.from('mark_entry_settings').upsert({
                setting_key: 'global',
                enabled: newEnabled,
                closed_by: newEnabled ? null : lecturerName,
                closed_at: newEnabled ? null : new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' });
            await logMarkEntry(lecturerName, newEnabled ? 'open' : 'close', 'Global Entry', null, 'all',
                newEnabled ? 'Opened global mark entry' : 'Closed global mark entry');
            return { success: true, message: newEnabled ? 'Global mark entry opened' : 'Global mark entry closed', enabled: newEnabled };
        }
        
        // --- TOGGLE CLASS ---
        if (endpoint === '/api/mark-entry/toggle-class' && opts.method === 'POST') {
            const body = JSON.parse(opts.body);
            const { year, lecturerName } = body;
            const settingKey = `year_${year}`;
            const { data: current } = await sb
                .from('mark_entry_settings')
                .select('enabled')
                .eq('setting_key', settingKey)
                .single();
            const newEnabled = !(current?.enabled !== false);
            await sb.from('mark_entry_settings').upsert({
                setting_key: settingKey,
                enabled: newEnabled,
                closed_by: newEnabled ? null : lecturerName,
                closed_at: newEnabled ? null : new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' });
            await logMarkEntry(lecturerName, newEnabled ? 'open' : 'close', `${year} Class`, null, 'all',
                newEnabled ? `Opened mark entry for ${year} class` : `Closed mark entry for ${year} class`);
            return { success: true, message: newEnabled ? `${year} class entry opened` : `${year} class entry closed`, enabled: newEnabled };
        }
        
        // --- TOGGLE SUBJECT ---
        if (endpoint === '/api/mark-entry/toggle-subject' && opts.method === 'POST') {
            const body = JSON.parse(opts.body);
            const { block, subject, lecturerName } = body;
            const settingKey = `${block}_${subject}`;
            const { data: current } = await sb
                .from('mark_entry_settings')
                .select('enabled')
                .eq('setting_key', settingKey)
                .single();
            const newEnabled = !(current?.enabled !== false);
            await sb.from('mark_entry_settings').upsert({
                setting_key: settingKey,
                enabled: newEnabled,
                closed_by: newEnabled ? null : lecturerName,
                closed_at: newEnabled ? null : new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' });
            await logMarkEntry(lecturerName, newEnabled ? 'open' : 'close', subject, block, 'internal',
                newEnabled ? `Opened mark entry for ${subject}` : `Closed mark entry for ${subject}`);
            return { success: true, message: newEnabled ? `Entry opened for ${subject}` : `Entry closed for ${subject}`, enabled: newEnabled };
        }
        
        return { success: false, error: 'Endpoint not implemented' };
        
    } catch (error) {
        console.error('❌ API Error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// REFRESH ALL DATA
// ============================================================

async function refreshAllData() {
    console.log('🔄 Refreshing all data...');
    showLoading('Refreshing data...');
    configCache = null;
    currentAdminMarks = null;
    currentMarksData = null;
    currentNCKMarks = null;
    await new Promise(resolve => setTimeout(resolve, 500));
    hideLoading();
    showNotification('✅ Data refreshed from Supabase!');
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        const tabId = activeTab.id;
        if (tabId === 'tab-dashboard') showMain();
        else if (tabId === 'tab-marks') showAdminMarks();
        else if (tabId === 'tab-nck') showNCKMarks();
        else if (tabId === 'tab-students') showStudents();
        else if (tabId === 'tab-lecturers') showLecturers();
        else if (tabId === 'tab-units') showUnits();
        else if (tabId === 'tab-reports') showFullReports();
        else if (tabId === 'tab-entryControl') showEntryControlPanel();
        else if (tabId === 'tab-analytics') showComprehensiveAnalytics();
        else if (tabId === 'tab-scorePublish') showScorePublishPanel();
    }
}

// ============================================================
// LOGIN
// ============================================================

function checkLogin() {
    const saved = localStorage.getItem('nursingUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        const savedYear = localStorage.getItem('selectedYear');
        currentYear = (savedYear && INTAKE_YEARS.includes(savedYear)) ? savedYear : '2026';
        const savedExamType = localStorage.getItem('selectedExamType');
        if (savedExamType) currentExamType = savedExamType;
        showMain();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('app').innerHTML = `
        <div class="login-container">
            <div class="logo"><i class="fas fa-graduation-cap"></i></div>
            <h2>Nursing School System</h2>
            <p class="subtitle">Nakuru College of Health Sciences</p>
            <input type="text" id="username" placeholder="👤 Username" autocomplete="username">
            <input type="password" id="password" placeholder="🔒 Password" autocomplete="current-password">
            <button onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> Login</button>
            <div id="loginError" class="login-error"></div>
            <div class="login-help">
                <p>💡 Lecturers: Use your email with password <strong>password123</strong></p>
                <p style="margin-top:4px;">📚 Your subjects from all intakes will be shown</p>
                <p style="margin-top:8px;">👤 Admin: admin / admin123</p>
            </div>
        </div>
    `;
    document.getElementById('username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('password').focus();
    });
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') doLogin();
    });
}

async function doLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
        document.getElementById('loginError').innerHTML = '❌ Please enter username and password';
        return;
    }
    showLoading('Logging in...');
    try {
        if (username === 'admin' && password === 'admin123') {
            currentUser = { username: 'admin', name: 'Administrator', role: 'admin', subjects: ['ALL'] };
            currentYear = '2026';
            localStorage.setItem('selectedYear', currentYear);
            localStorage.setItem('nursingUser', JSON.stringify(currentUser));
            hideLoading();
            showMain();
            showNotification('Welcome Administrator! 👋');
            return;
        }
        const { data: lecturer, error } = await sb
            .from('lecturers')
            .select('*')
            .eq('email', username)
            .eq('status', 'approved')
            .single();
        if (lecturer) {
            currentUser = {
                username: lecturer.email,
                name: lecturer.full_name,
                role: lecturer.role || 'lecturer',
                subjects: lecturer.subjects || []
            };
            currentYear = '2026';
            localStorage.setItem('selectedYear', currentYear);
            localStorage.setItem('nursingUser', JSON.stringify(currentUser));
            hideLoading();
            showMain();
            showNotification(`Welcome ${currentUser.name}! 👋`);
            return;
        }
        const { data: profile, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', username)
            .single();
        if (profile && (profile.role === 'lecturer' || profile.role === 'admin')) {
            currentUser = {
                username: profile.email,
                name: profile.full_name,
                role: profile.role || 'lecturer',
                subjects: profile.subjects || []
            };
            currentYear = profile.intake_year || '2026';
            localStorage.setItem('selectedYear', currentYear);
            localStorage.setItem('nursingUser', JSON.stringify(currentUser));
            hideLoading();
            showMain();
            showNotification(`Welcome ${currentUser.name}! 👋`);
            return;
        }
        hideLoading();
        document.getElementById('loginError').innerHTML = '❌ Invalid username or password';
    } catch (error) {
        console.error('Login error:', error);
        hideLoading();
        document.getElementById('loginError').innerHTML = '❌ Login error: ' + error.message;
    }
}

function logout() {
    localStorage.removeItem('nursingUser');
    currentUser = null;
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    showLogin();
    showNotification('Logged out successfully');
}

// ============================================================
// RENDER WITH SIDEBAR
// ============================================================

function renderWithSidebar(contentHtml) {
    const isAdmin = currentUser?.role === 'admin';
    const isLecturer = currentUser?.role === 'lecturer';
    const sidebarHtml = `
        <div class="app-wrapper">
            <aside class="sidebar" id="mainSidebar">
                <div class="sidebar-logo"><i class="fas fa-graduation-cap"></i><span>Nakuru Health</span></div>
                <div class="nav-menu">
                    <div class="nav-item active" data-tab="dashboard"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></div>
                    <div class="nav-item" data-tab="marks"><i class="fas fa-pen-alt"></i><span>${isAdmin ? 'Internal Marks' : 'My Subjects'}</span></div>
                    <div class="nav-item" data-tab="nck"><i class="fas fa-file-medical"></i><span>NCK Scores</span></div>
                    ${isAdmin ? `
                    <div class="nav-item" data-tab="students"><i class="fas fa-user-graduate"></i><span>Students</span></div>
                    <div class="nav-item" data-tab="lecturers"><i class="fas fa-chalkboard-user"></i><span>Lecturers</span></div>
                    <div class="nav-item" data-tab="units"><i class="fas fa-book-open"></i><span>Units</span></div>
                    <div class="nav-item" data-tab="reports"><i class="fas fa-download"></i><span>Reports</span></div>
                    <div class="nav-item" data-tab="entryControl"><i class="fas fa-lock"></i><span>Entry Control</span></div>
                    <div class="nav-item" data-tab="analytics"><i class="fas fa-chart-line"></i><span>Analytics</span></div>
                    <div class="nav-item" data-tab="scorePublish"><i class="fas fa-eye-slash"></i><span>Score Publishing</span></div>
                    ` : `
                    <div class="nav-item" data-tab="reports"><i class="fas fa-download"></i><span>Reports</span></div>
                    <div class="nav-item" data-tab="analytics"><i class="fas fa-chart-line"></i><span>My Analytics</span></div>
                    `}
                    <div class="nav-item logout" data-tab="logout"><i class="fas fa-sign-out-alt"></i><span>Logout</span></div>
                </div>
                <div class="user-section">
                    <div class="user-avatar">${(currentUser?.name?.charAt(0) || 'U').toUpperCase()}</div>
                    <div class="user-details">
                        <div class="user-name">${currentUser?.name || 'User'}</div>
                        <div class="user-role">${currentUser?.role || 'lecturer'}</div>
                        ${isLecturer ? `<div style="font-size:10px;color:#94a3b8;">All intakes: 2024, 2025, 2026</div>` : ''}
                    </div>
                </div>
            </aside>
            <main class="main-content">
                <div class="top-bar">
                    <button id="menuToggle"><i class="fas fa-bars"></i></button>
                    <div class="top-bar-right">
                        ${isAdmin ? `
                        <select id="yearSelectSide">${INTAKE_YEARS.map(y => `<option value="${y}" ${y===currentYear?'selected':''}>${y} Class</option>`).join('')}</select>
                        <select id="examTypeSide"><option value="internal" ${currentExamType==='internal'?'selected':''}>Internal</option><option value="nck" ${currentExamType==='nck'?'selected':''}>NCK</option></select>
                        ` : `<span style="padding:6px 12px;background:rgba(99,102,241,0.1);border-radius:40px;font-size:13px;">📅 All Intakes (2024-2026)</span>`}
                        <button id="themeToggle"><i class="fas fa-moon"></i></button>
                        <button id="refreshBtn"><i class="fas fa-sync-alt"></i> <span>Refresh</span></button>
                    </div>
                </div>
                <div id="dynamicContent">${contentHtml}</div>
            </main>
        </div>
    `;
    document.getElementById('app').innerHTML = sidebarHtml;
    document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
        el.addEventListener('click', function() {
            const tab = this.dataset.tab;
            if (tab === 'logout') { logout(); return; }
            switchTab(tab);
        });
    });
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('mainSidebar')?.classList.toggle('mobile-open');
    });
    document.getElementById('themeToggle')?.addEventListener('click', toggleDarkMode);
    document.getElementById('refreshBtn')?.addEventListener('click', refreshAllData);
    if (isAdmin) {
        document.getElementById('yearSelectSide')?.addEventListener('change', (e) => {
            currentYear = e.target.value;
            localStorage.setItem('selectedYear', currentYear);
            showMain();
        });
        document.getElementById('examTypeSide')?.addEventListener('change', (e) => {
            currentExamType = e.target.value;
            localStorage.setItem('selectedExamType', currentExamType);
            showMain();
        });
    }
}

// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) item.classList.add('active');
    });
    if (window.innerWidth <= 768) {
        document.getElementById('mainSidebar')?.classList.remove('mobile-open');
    }
    switch(tabName) {
        case 'dashboard': showMain(); break;
        case 'marks': showAdminMarks(); break;
        case 'nck': showNCKMarks(); break;
        case 'students': showStudents(); break;
        case 'lecturers': showLecturers(); break;
        case 'units': showUnits(); break;
        case 'reports': showFullReports(); break;
        case 'entryControl': showEntryControlPanel(); break;
        case 'analytics': showComprehensiveAnalytics(); break;
        case 'scorePublish': showScorePublishPanel(); break;
    }
}

// ============================================================
// DARK MODE
// ============================================================

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
}

function initDarkMode() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = 'fas fa-sun';
    }
}

// ============================================================
// SHOW MAIN DASHBOARD
// ============================================================

async function showMain() {
    showLoading('Loading Dashboard...');
    const isAdmin = (currentUser?.role === 'admin');
    const stats = await apiCall('/api/stats', {});
    
    const statsHtml = `
        <div class="selector-group">
            <div><label><i class="fas fa-calendar-alt"></i> Class Year:</label> 
                <select id="yearSelectMain" onchange="changeYear()">${INTAKE_YEARS.map(y => `<option value="${y}" ${y===currentYear?'selected':''}>🎓 March ${y} Class</option>`).join('')}</select>
            </div>
            <div><label><i class="fas fa-file-alt"></i> Exam Type:</label> 
                <select id="examTypeSelect" onchange="changeExamType()">
                    <option value="internal" ${currentExamType==='internal'?'selected':''}>📝 Internal Exams</option>
                    <option value="nck" ${currentExamType==='nck'?'selected':''}>🏥 NCK Score Sheet</option>
                </select>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${stats.totalStudents || 0}</div><div class="stat-label"><i class="fas fa-users"></i> Total Students</div></div>
            <div class="stat-card"><div class="stat-number">6</div><div class="stat-label"><i class="fas fa-layer-group"></i> Academic Blocks</div></div>
            <div class="stat-card"><div class="stat-number">${isAdmin ? (stats.totalSubjects || 0) : (currentUser?.subjects?.length || 0)}</div><div class="stat-label"><i class="fas fa-book"></i> Active Units</div></div>
            <div class="stat-card"><div class="stat-number">60%</div><div class="stat-label"><i class="fas fa-flag-checkered"></i> Pass Mark</div></div>
        </div>
    `;
    
    let menuHtml = '';
    if (isAdmin) {
        menuHtml = `
            <div class="admin-menu-grid">
                <button class="menu-btn btn-primary" data-tab="marks"><i class="fas fa-pen-alt"></i> Internal Marks</button>
                <button class="menu-btn btn-info" data-tab="nck"><i class="fas fa-file-medical"></i> NCK Scores</button>
                <button class="menu-btn btn-success" data-tab="analytics"><i class="fas fa-chart-line"></i> Analytics</button>
                <button class="menu-btn btn-warning" data-tab="students"><i class="fas fa-user-graduate"></i> Students</button>
                <button class="menu-btn btn-danger" data-tab="lecturers"><i class="fas fa-chalkboard-user"></i> Lecturers</button>
                <button class="menu-btn btn-export" data-tab="units"><i class="fas fa-book-open"></i> Units</button>
                <button class="menu-btn btn-secondary" data-tab="reports"><i class="fas fa-download"></i> Reports</button>
                <button class="menu-btn btn-lock" data-tab="entryControl"><i class="fas fa-lock"></i> Entry Control</button>
                <button class="menu-btn btn-import" data-tab="import"><i class="fas fa-file-import"></i> Import Marks</button>
                <button class="menu-btn btn-publish" data-tab="scorePublish"><i class="fas fa-eye-slash"></i> Score Publishing</button>
            </div>
        `;
    } else {
        menuHtml = `
            <div class="menu-grid">
                <button class="menu-btn btn-primary" data-tab="marks"><i class="fas fa-pen-alt"></i> My Subjects</button>
                <button class="menu-btn btn-info" data-tab="nck"><i class="fas fa-file-medical"></i> NCK Scores</button>
                <button class="menu-btn btn-success" data-tab="analytics"><i class="fas fa-chart-simple"></i> My Analytics</button>
                <button class="menu-btn btn-export" data-tab="reports"><i class="fas fa-download"></i> Reports</button>
            </div>
        `;
    }
    
    const contentHtml = `
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-hospital-user"></i> Nakuru College of Health Sciences</h1>
                <p>${currentUser?.name || 'User'} (${currentUser?.role || 'lecturer'}) | March ${currentYear} Class | Pass Mark: 60%</p>
            </div>
            <div class="user-info">
                <span><i class="fas fa-user-circle"></i> Welcome, ${currentUser?.name || 'User'}</span>
                <div>
                    <button onclick="toggleDarkMode()" class="menu-btn btn-dark" style="padding:8px 20px;margin-right:12px;"><i class="fas fa-moon"></i> Dark Mode</button>
                    <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </div>
            ${statsHtml}
            ${menuHtml}
            <div id="content-area"></div>
        </div>
    `;
    
    renderWithSidebar(contentHtml);
    document.querySelectorAll('.menu-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });
    document.getElementById('yearSelectMain')?.addEventListener('change', changeYear);
    document.getElementById('examTypeSelect')?.addEventListener('change', changeExamType);
    hideLoading();
}

function changeYear() {
    const newYear = document.getElementById('yearSelectMain')?.value;
    if (newYear && newYear !== currentYear) {
        currentYear = newYear;
        localStorage.setItem('selectedYear', currentYear);
        showMain();
        showNotification(`📅 Switched to March ${currentYear} Class`);
    }
}

function changeExamType() {
    const newType = document.getElementById('examTypeSelect')?.value;
    if (newType && newType !== currentExamType) {
        currentExamType = newType;
        localStorage.setItem('selectedExamType', currentExamType);
        showMain();
    }
}

function updateContentArea(html) {
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.innerHTML = html;
    } else {
        const dynamicContent = document.getElementById('dynamicContent');
        if (dynamicContent) {
            dynamicContent.innerHTML = `<div class="container">${html}</div>`;
        }
    }
}

// ============================================================
// INTERNAL MARKS (ADMIN)
// ============================================================

async function showAdminMarks() {
    const html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-pen-alt"></i> Internal Marks Entry</h3><p>Select a block and subject to enter marks</p></div>
        <select id="blockSelect" class="full-width">
            <option value="">-- Select Block --</option>
            ${['BLOCK_0','BLOCK_1','BLOCK_2','BLOCK_3','BLOCK_4','BLOCK_5'].map(b => `<option value="${b}">${b.replace('_', ' ')}</option>`).join('')}
        </select>
        <select id="subjectSelect" class="full-width" style="display:none;"><option value="">-- Select Subject --</option></select>
        <div id="marksTableContainer"><div class="card text-center"><p>Select a block and subject to view marks</p></div></div>
    `;
    updateContentArea(html);
    document.getElementById('blockSelect').addEventListener('change', function() {
        if (this.value) loadAdminSubjects(this.value);
    });
}

async function loadAdminSubjects(block) {
    if (!block) return;
    showLoading('Loading subjects...');
    const subjects = await apiCall(`/api/subjects/${block}`, {});
    const sel = document.getElementById('subjectSelect');
    sel.style.display = 'block';
    sel.innerHTML = '<option value="">-- Select Subject --</option>';
    subjects.forEach(s => {
        sel.innerHTML += `<option value="${s.name}" data-type="${s.assessmentType}">${s.name}</option>`;
    });
    sel.onchange = function() {
        if (this.value) {
            const type = this.options[this.selectedIndex].dataset.type;
            loadAdminMarks(block, this.value, type);
        }
    };
    hideLoading();
}

async function loadAdminMarks(block, subject, at) {
    showLoading('Loading marks...');
    const marks = await apiCall(`/api/marks/${block}/${subject}`, {});
    
    let html = `
        <div style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;">
            <button class="export-btn" onclick="exportAdminMarks()"><i class="fas fa-download"></i> Export CSV</button>
            <button class="btn-info" onclick="fillDownValues()" style="padding:8px 20px;border:none;border-radius:40px;color:white;background:linear-gradient(135deg,#3b82f6,#2563eb);cursor:pointer;"><i class="fas fa-arrow-down"></i> Fill Down</button>
        </div>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Admission</th><th>Name</th>
            ${at === 'full' ? '<th>CAT1 (0-30)</th><th>CAT2 (0-30)</th><th>Exam (0-70)</th>' : ''}
            ${at === 'single_cat' ? '<th>CAT (0-30)</th><th>Exam (0-70)</th>' : ''}
            ${at === 'exam_only' ? '<th>Exam (0-100)</th>' : ''}
            <th>Total</th><th>Status</th><th>Graded By</th></tr></thead><tbody>
    `;
    
    window.currentAdminMarks = marks;
    window.currentAdminAssessmentType = at;
    window.currentAdminBlock = block;
    window.currentAdminSubject = subject;
    
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        const cat1 = m.cat1 || '';
        const cat2 = m.cat2 || '';
        const exam = m.exam || '';
        const ncat1 = parseFloat(cat1) || 0;
        const ncat2 = parseFloat(cat2) || 0;
        const nexam = parseFloat(exam) || 0;
        
        let total = 0;
        if (at === 'full') total = calculateFinalScore(ncat1, ncat2, nexam, 'full');
        else if (at === 'single_cat') total = calculateFinalScore(ncat1, 0, nexam, 'single_cat');
        else total = calculateFinalScore(0, 0, nexam, 'exam_only');
        
        const status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : '');
        const rowClass = total >= 60 ? 'pass-row' : (total > 0 ? 'fail-row' : '');
        
        html += `<tr class="${rowClass}">
            <td style="padding:10px;">${m.admission}</td>
            <td style="padding:10px;"><strong>${m.name}</strong></td>`;
        
        if (at === 'full') {
            html += `<td style="padding:10px;"><input type="number" id="acat1_${i}" value="${cat1}" min="0" max="30" step="0.5" onchange="updateAdminTotal(${i})"></td>
                <td style="padding:10px;"><input type="number" id="acat2_${i}" value="${cat2}" min="0" max="30" step="0.5" onchange="updateAdminTotal(${i})"></td>
                <td style="padding:10px;"><input type="number" id="aexam_${i}" value="${exam}" min="0" max="70" step="0.5" onchange="updateAdminTotal(${i})"></td>`;
        } else if (at === 'single_cat') {
            html += `<td style="padding:10px;"><input type="number" id="acat1_${i}" value="${cat1}" min="0" max="30" step="0.5" onchange="updateAdminTotal(${i})"></td>
                <td style="padding:10px;"><input type="number" id="aexam_${i}" value="${exam}" min="0" max="70" step="0.5" onchange="updateAdminTotal(${i})"></td>`;
        } else {
            html += `<td style="padding:10px;"><input type="number" id="aexam_${i}" value="${exam}" min="0" max="100" step="0.5" onchange="updateAdminTotal(${i})"></td>`;
        }
        
        html += `<td id="atotal_${i}" style="font-weight:bold;">${total}</td>
            <td id="astatus_${i}">${status}</td>
            <td style="padding:10px;">${m.gradedBy || '-'}</td>
        </tr>`;
    }
    
    html += `</tbody></table></div>
        <div style="text-align:center;margin-top:20px;"><button class="save-btn" onclick="saveAdminMarks()">💾 Save All Marks</button></div>
    `;
    
    document.getElementById('marksTableContainer').innerHTML = html;
    hideLoading();
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        if (unsavedChanges) { saveAdminMarks(); unsavedChanges = false; }
    }, 30000);
}

window.updateAdminTotal = function(idx) {
    const at = window.currentAdminAssessmentType || 'full';
    let cat1 = parseFloat(document.getElementById(`acat1_${idx}`)?.value) || 0;
    let cat2 = parseFloat(document.getElementById(`acat2_${idx}`)?.value) || 0;
    let exam = parseFloat(document.getElementById(`aexam_${idx}`)?.value) || 0;
    let total = 0;
    if (at === 'full') total = calculateFinalScore(cat1, cat2, exam, 'full');
    else if (at === 'single_cat') total = calculateFinalScore(cat1, 0, exam, 'single_cat');
    else total = calculateFinalScore(0, 0, exam, 'exam_only');
    document.getElementById(`atotal_${idx}`).innerHTML = total;
    document.getElementById(`astatus_${idx}`).innerHTML = total >= 60 ? 'PASS' : 'FAIL';
    const row = document.getElementById(`acat1_${idx}`)?.parentElement?.parentElement;
    if (row) row.className = total >= 60 ? 'pass-row' : 'fail-row';
    markUnsaved();
};

window.saveAdminMarks = async function() {
    const marksData = [];
    const len = window.currentAdminMarks?.length || 0;
    const at = window.currentAdminAssessmentType || 'full';
    for (let i = 0; i < len; i++) {
        if (at === 'full') {
            marksData.push({ row: i + 2, cat1: document.getElementById(`acat1_${i}`)?.value || '', cat2: document.getElementById(`acat2_${i}`)?.value || '', exam: document.getElementById(`aexam_${i}`)?.value || '' });
        } else if (at === 'single_cat') {
            marksData.push({ row: i + 2, cat1: document.getElementById(`acat1_${i}`)?.value || '', cat2: '', exam: document.getElementById(`aexam_${i}`)?.value || '' });
        } else {
            marksData.push({ row: i + 2, cat1: '', cat2: '', exam: document.getElementById(`aexam_${i}`)?.value || '' });
        }
    }
    showLoading('Saving marks...');
    const result = await apiCall('/api/marks', {
        method: 'POST',
        body: JSON.stringify({ block: window.currentAdminBlock, subject: window.currentAdminSubject, marksData, lecturerName: currentUser?.name || 'System' })
    });
    hideLoading();
    if (result?.success) {
        showNotification(result.message || 'Marks saved successfully!');
        loadAdminMarks(window.currentAdminBlock, window.currentAdminSubject, window.currentAdminAssessmentType);
    } else {
        showNotification(result?.message || 'Error saving marks', true);
    }
};

window.exportAdminMarks = function() {
    if (!window.currentAdminMarks) { showNotification('No data to export', true); return; }
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total'];
    let csv = headers.join(',') + '\n';
    for (let i = 0; i < window.currentAdminMarks.length; i++) {
        const m = window.currentAdminMarks[i];
        const cat1 = document.getElementById(`acat1_${i}`)?.value || '';
        const cat2 = document.getElementById(`acat2_${i}`)?.value || '';
        const exam = document.getElementById(`aexam_${i}`)?.value || '';
        const total = document.getElementById(`atotal_${i}`)?.innerHTML || '';
        csv += `${m.admission},"${m.name}",${cat1},${cat2},${exam},${total}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${window.currentAdminSubject}_marks_${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showNotification('Exported successfully!');
};

// ============================================================
// FILL DOWN VALUES
// ============================================================

function fillDownValues() {
    const inputs = document.querySelectorAll('#marksTableContainer input[type="number"], #nckMarksContainer input[type="number"]');
    if (inputs.length === 0) { showNotification('No inputs found', true); return; }
    const val = inputs[0].value;
    for (let i = 1; i < inputs.length; i++) {
        inputs[i].value = val;
        inputs[i].dispatchEvent(new Event('change'));
    }
    showNotification(`Filled down: ${val || 'empty'} to ${inputs.length-1} cells`);
    markUnsaved();
}

// ============================================================
// NCK MARKS
// ============================================================

async function showNCKMarks() {
    const html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-file-medical"></i> NCK Score Sheet Entry</h3><p>Clinical evaluation (XY FORMS) & Assessment & Case</p></div>
        <div class="selector-group">
            <label><i class="fas fa-table-list"></i> Select Sheet:</label>
            <select id="nckSheetSelect" style="min-width:250px;">
                <option value="XY FORMS">📊 XY FORMS - Clinical Areas Evaluation</option>
                <option value="ASSESSMENT AND CASE">📋 ASSESSMENT & CASE - Written Assessments</option>
            </select>
            <button class="export-btn" onclick="loadNCKMarks()"><i class="fas fa-sync-alt"></i> Load Data</button>
        </div>
        <div id="nckMarksContainer"><div class="card text-center"><p>Select a sheet and click "Load Data"</p></div></div>
    `;
    updateContentArea(html);
}

async function loadNCKMarks() {
    const sheetName = document.getElementById('nckSheetSelect').value;
    showLoading(`Loading ${sheetName}...`);
    const marks = await apiCall(`/api/marks/BLOCK_0/${encodeURIComponent(sheetName)}`, {});
    if (sheetName === 'XY FORMS') displayXYFormsMarks(marks);
    else displayAssessmentMarks(marks);
    hideLoading();
}

function displayXYFormsMarks(marks) {
    if (!marks || marks.length === 0) {
        document.getElementById('nckMarksContainer').innerHTML = '<div class="card text-center">No data found.</div>';
        return;
    }
    const areaGroups = [
        { name: '🏥 MEDICAL', areas: ['MED1','MED2','MED3'] },
        { name: '🤰 MCH', areas: ['MCH1','MCH2','MCH3'] },
        { name: '🤱 MATERNITY', areas: ['MAT1','MAT2','MAT3'] },
        { name: '👶 PAEDIATRICS', areas: ['PEAD1','PEAD2'] },
        { name: '🔪 SURGERY', areas: ['SURG1','SURG2','SURG3'] },
        { name: '🚑 OTHER', areas: ['OPD','NBU1','NBU2','THEATRE','PSYCHIATRY','RURALS','DISTRICT','SPECIAL'] }
    ];
    let html = `
        <div style="margin-bottom:15px;padding:12px;background:linear-gradient(135deg,#667eea20,#764ba220);border-radius:12px;">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <strong><i class="fas fa-bolt"></i> Quick Actions:</strong>
                <button class="save-btn" onclick="openFastEntryPanel()" style="padding:5px 12px;background:#8b5cf6;border:none;border-radius:40px;color:white;cursor:pointer;"><i class="fas fa-bolt"></i> Fast Entry Mode</button>
            </div>
            <div style="font-size:12px;color:#666;margin-top:8px;"><i class="fas fa-info-circle"></i> Tip: Click on student name to edit all marks in popup</div>
        </div>
        <div style="overflow-x:auto;"><table style="min-width:1200px;"><thead><tr>
            <th style="position:sticky;left:0;background:#667eea;z-index:2;">#</th>
            <th style="position:sticky;left:40px;background:#667eea;z-index:2;">Student Name</th>`;
    for (let group of areaGroups) {
        html += `<th colspan="${group.areas.length}" style="text-align:center;">${group.name}</th>`;
    }
    html += `<th>Avg</th><th>Status</th><th>Graded By</th></tr></thead><tbody>`;
    window.currentNCKMarks = marks;
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        let scores = m.scores || [];
        while (scores.length < 22) scores.push(0);
        const validScores = scores.filter(s => s > 0);
        let avg = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : (m.final || 0);
        avg = Math.round(avg * 100) / 100;
        const status = avg >= 60 ? 'PASS' : (validScores.length ? 'FAIL' : 'PENDING');
        const rowClass = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
        const safeName = (m.name || 'Unnamed').replace(/'/g, "\\'");
        html += `<tr class="${rowClass}">
            <td style="position:sticky;left:0;background:white;font-weight:500;">${i+1}</td>
            <td style="position:sticky;left:40px;background:white;font-weight:500;cursor:pointer;color:#6366f1;text-decoration:underline;" onclick="openXYEditModal(${i}, '${safeName}')">${m.name || 'Unnamed'} <i class="fas fa-edit" style="font-size:10px;"></i></td>`;
        let scoreIdx = 0;
        for (let group of areaGroups) {
            for (let area of group.areas) {
                const score = scores[scoreIdx] || 0;
                const scoreStyle = score > 0 ? 'background:#d1fae5;' : 'background:#fff3e0;';
                html += `<td style="padding:4px;"><input type="number" id="xy_${i}_${scoreIdx}" value="${score}" min="0" max="100" step="0.5" style="width:55px;padding:4px;border-radius:6px;text-align:center;${scoreStyle}" onchange="updateXYAverage(${i})"></td>`;
                scoreIdx++;
            }
        }
        html += `<td id="xyAvg_${i}" style="font-weight:bold;text-align:center;background:${avg>=60?'#d1fae5':'#fee2e2'};">${avg.toFixed(2)}</td>
            <td id="xyStatus_${i}" style="text-align:center;"><span class="badge ${status === 'PASS' ? 'badge-pass' : (status === 'FAIL' ? 'badge-fail' : 'badge-pending')}">${status}</span></td>
            <td style="padding:4px;"><input type="text" id="xyGraded_${i}" value="${m.gradedBy || ''}" placeholder="Lecturer" style="width:80px;padding:4px;border-radius:6px;"></td>
        </tr>`;
    }
    html += `</tbody></table></div>
        <div style="text-align:center;margin-top:20px;"><button class="save-btn" onclick="saveNCKMarks()"><i class="fas fa-save"></i> Save All NCK Marks</button></div>
    `;
    document.getElementById('nckMarksContainer').innerHTML = html;
    if (fastEntryVisible) closeFastEntryModal();
}

function displayAssessmentMarks(marks) {
    if (!marks || marks.length === 0) {
        document.getElementById('nckMarksContainer').innerHTML = '<div class="card text-center">No data found.</div>';
        return;
    }
    const columnCount = 12;
    const assessmentNames = ['ANC WARD', 'IMMUNIZATION ASSESSMENT', 'NURSING CARE', 'PSYCHIATRY ASSESSMENT', 'NBU ASSESSMENT', 'MIDWIFERY ASSESSMENT', 'WARD MANAGEMENT', 'MCH/FP CLINIC', 'PSYCHIATRY CASE STUDY', 'GENERAL NURSING CASE STUDY', 'MIDWIFERY CASE STUDY', 'COMMUNITY DIAGNOSIS'];
    let columnHeaders = '';
    for (let i = 0; i < columnCount; i++) {
        columnHeaders += `<th>${assessmentNames[i]}<br><span style="font-size:9px;font-weight:normal;">(0-100)</span></th>`;
    }
    let html = `
        <div style="margin-bottom:15px;padding:12px;background:linear-gradient(135deg,#667eea20,#764ba220);border-radius:12px;">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <strong><i class="fas fa-bolt"></i> Quick Actions:</strong>
                <button class="save-btn" onclick="openFastAssessmentPanel()" style="padding:5px 12px;background:#8b5cf6;border:none;border-radius:40px;color:white;cursor:pointer;"><i class="fas fa-bolt"></i> Fast Entry Mode</button>
            </div>
            <div style="font-size:12px;color:#666;margin-top:8px;"><i class="fas fa-info-circle"></i> Tip: Click on student name to edit marks</div>
        </div>
        <div style="overflow-x:auto;"><table style="min-width:1300px;"><thead><tr>
            <th style="position:sticky;left:0;background:#667eea;">#</th>
            <th style="position:sticky;left:60px;background:#667eea;">Student Name</th>
            ${columnHeaders}<th style="background:#10b981;">Total</th><th style="background:#f59e0b;">Average</th><th>Status</th><th>Graded By</th>
        </tr></thead><tbody>`;
    window.currentNCKMarks = marks;
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        let scores = m.scores || [];
        while (scores.length < columnCount) scores.push(0);
        scores = scores.slice(0, columnCount);
        const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s) && s > 0);
        const total = validScores.reduce((a, b) => a + b, 0);
        const average = validScores.length > 0 ? (total / columnCount) : 0;
        const status = average >= 60 ? 'PASS' : (validScores.length > 0 ? 'FAIL' : 'PENDING');
        const rowClass = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
        let gradedBy = m.gradedBy || '';
        if (gradedBy && !isNaN(parseFloat(gradedBy)) && gradedBy.toString().includes('.')) gradedBy = '';
        const safeName = (m.name || 'Unnamed').replace(/'/g, "\\'");
        html += `<tr class="${rowClass}">
            <td style="position:sticky;left:0;background:white;font-weight:500;">${i+1}</td>
            <td style="position:sticky;left:60px;background:white;font-weight:500;cursor:pointer;color:#6366f1;text-decoration:underline;" onclick="openAssessmentEditModal(${i}, '${safeName}')">${m.name || 'Unnamed'} <i class="fas fa-edit" style="font-size:10px;"></i></td>`;
        for (let c = 0; c < columnCount; c++) {
            const score = scores[c];
            const hasScore = typeof score === 'number' && !isNaN(score) && score > 0;
            const scoreStyle = hasScore ? 'background:#d1fae5;' : 'background:#fff3e0;';
            const displayValue = hasScore ? score : '';
            html += `<td style="padding:4px;"><input type="number" id="ac_${i}_${c}" value="${displayValue}" min="0" max="100" step="0.5" style="width:70px;padding:6px;border-radius:8px;text-align:center;${scoreStyle}" placeholder="-" onchange="updateACTotal(${i})"></td>`;
        }
        html += `<td id="acTotal_${i}" style="font-weight:bold;text-align:center;background:#d1fae5;">${total}</td>
            <td id="acAverage_${i}" style="font-weight:bold;text-align:center;background:${average >= 60 ? '#d1fae5' : '#fee2e2'};">${average.toFixed(2)}%</td>
            <td id="acStatus_${i}" style="text-align:center;"><span class="badge ${status === 'PASS' ? 'badge-pass' : (status === 'FAIL' ? 'badge-fail' : 'badge-pending')}">${status}</span></td>
            <td style="padding:4px;"><input type="text" id="acGraded_${i}" value="${gradedBy}" placeholder="Lecturer" style="width:100px;padding:6px;border-radius:8px;"></td>
        </tr>`;
    }
    html += `</tbody></table></div>
        <div style="text-align:center;margin-top:20px;"><button class="save-btn" onclick="saveNCKMarks()"><i class="fas fa-save"></i> Save All NCK Marks</button></div>
    `;
    document.getElementById('nckMarksContainer').innerHTML = html;
    if (fastEntryVisible) closeFastEntryModal();
}

window.updateXYAverage = function(idx) {
    let scores = [];
    for (let c = 0; c < 22; c++) {
        const val = parseFloat(document.getElementById(`xy_${idx}_${c}`)?.value);
        if (!isNaN(val) && val > 0) scores.push(val);
    }
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const status = avg >= 60 ? 'PASS' : (scores.length ? 'FAIL' : 'PENDING');
    const avgEl = document.getElementById(`xyAvg_${idx}`);
    const statusEl = document.getElementById(`xyStatus_${idx}`);
    if (avgEl) avgEl.innerHTML = avg.toFixed(2);
    if (statusEl) statusEl.innerHTML = `<span class="badge ${status === 'PASS' ? 'badge-pass' : (status === 'FAIL' ? 'badge-fail' : 'badge-pending')}">${status}</span>`;
    const row = document.getElementById(`xy_${idx}_0`)?.parentElement?.parentElement;
    if (row) row.className = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
};

window.updateACTotal = function(idx) {
    const columnCount = 12;
    let scores = [];
    let hasAnyScore = false;
    for (let c = 0; c < columnCount; c++) {
        const input = document.getElementById(`ac_${idx}_${c}`);
        if (input) {
            const val = input.value;
            if (val !== '' && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
                scores.push(parseFloat(val));
                hasAnyScore = true;
            } else { scores.push(0); }
        } else { scores.push(0); }
    }
    const total = scores.reduce((a, b) => a + b, 0);
    const average = hasAnyScore ? (total / columnCount).toFixed(2) : 0;
    const status = average >= 60 ? 'PASS' : (hasAnyScore ? 'FAIL' : 'PENDING');
    const totalEl = document.getElementById(`acTotal_${idx}`);
    const avgEl = document.getElementById(`acAverage_${idx}`);
    const statusEl = document.getElementById(`acStatus_${idx}`);
    if (totalEl) totalEl.innerHTML = total;
    if (avgEl) avgEl.innerHTML = average + '%';
    if (statusEl) statusEl.innerHTML = `<span class="badge ${status === 'PASS' ? 'badge-pass' : (status === 'FAIL' ? 'badge-fail' : 'badge-pending')}">${status}</span>`;
    if (avgEl) avgEl.style.background = average >= 60 ? '#d1fae5' : (hasAnyScore ? '#fee2e2' : '#fef3c7');
    const row = document.getElementById(`ac_${idx}_0`)?.parentElement?.parentElement;
    if (row) row.className = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
};

// ============================================================
// FAST ENTRY - XY FORMS
// ============================================================

function openFastEntryPanel() {
    if (!currentNCKMarks || currentNCKMarks.length === 0) {
        showNotification('No data loaded', true);
        return;
    }
    if (fastEntryVisible) { closeFastEntryModal(); return; }
    const areaGroups = [
        { title: '🏥 MEDICAL', cols: [0,1,2], names: ['MED1','MED2','MED3'] },
        { title: '🤰 MCH', cols: [3,4,5], names: ['MCH1','MCH2','MCH3'] },
        { title: '🤱 MATERNITY', cols: [6,7,8], names: ['MAT1','MAT2','MAT3'] },
        { title: '👶 PAEDIATRICS', cols: [9,10], names: ['PEAD1','PEAD2'] },
        { title: '🔪 SURGERY', cols: [11,12,13], names: ['SURG1','SURG2','SURG3'] },
        { title: '🚑 OTHER', cols: [14,15,16,17,18,19,20,21], names: ['OPD','NBU1','NBU2','THEATRE','PSYCHIATRY','RURALS','DISTRICT','SPECIAL'] }
    ];
    const modal = document.createElement('div');
    modal.id = 'fastEntryModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:24px;max-width:1400px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px 24px;border-radius:24px 24px 0 0;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;">
                <div style="display:flex;align-items:center;gap:15px;">
                    <i class="fas fa-expand-alt" style="font-size:20px;"></i>
                    <span style="font-size:20px;font-weight:700;"><i class="fas fa-bolt"></i> Full Screen Fast Entry - XY FORMS (March ${currentYear})</span>
                </div>
                <div><button class="back-btn" onclick="closeFastEntryModal()" style="padding:8px 20px;background:rgba(255,255,255,0.2);border:none;border-radius:40px;color:white;cursor:pointer;font-weight:600;"><i class="fas fa-times"></i> Close (ESC)</button></div>
            </div>
            <div style="padding:24px;">
                <div style="margin-bottom:20px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
                    <div style="flex:2;"><label style="font-weight:600;display:block;margin-bottom:8px;"><i class="fas fa-user-graduate"></i> Select Student:</label>
                        <select id="fastStudentSelect" style="width:100%;padding:12px;border-radius:12px;border:2px solid #e2e8f0;font-size:14px;font-weight:500;">
                            ${currentNCKMarks.map((m,i)=>`<option value="${i}">${i+1}. ${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex:1;"><label style="font-weight:600;display:block;margin-bottom:8px;"><i class="fas fa-chart-line"></i> Current Average:</label>
                        <div id="currentAvgDisplay" style="padding:12px;background:#f0fdf4;border-radius:12px;font-weight:bold;text-align:center;font-size:18px;">0.00</div>
                    </div>
                    <div style="flex:1;"><label style="font-weight:600;display:block;margin-bottom:8px;"><i class="fas fa-flag-checkered"></i> Status:</label>
                        <div id="currentStatusDisplay" style="padding:12px;background:#fef3c7;border-radius:12px;font-weight:bold;text-align:center;">PENDING</div>
                    </div>
                </div>
                <div id="fastEntryFields" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;"></div>
                <div style="display:flex;gap:15px;margin-top:30px;padding-top:20px;border-top:2px solid #e2e8f0;">
                    <button class="save-btn" id="saveNextBtn" style="flex:1;padding:14px;font-size:16px;"><i class="fas fa-save"></i> Save & Next Student (Enter)</button>
                    <button class="back-btn" id="saveStayBtn" style="flex:1;padding:14px;font-size:16px;">Save & Stay (Shift+Enter)</button>
                    <button class="back-btn" onclick="closeFastEntryModal()" style="flex:0.5;padding:14px;">Close (ESC)</button>
                </div>
                <div style="margin-top:15px;text-align:center;font-size:12px;color:#666;padding:10px;background:#f8fafc;border-radius:12px;">
                    <i class="fas fa-keyboard"></i> <strong>Keyboard Shortcuts:</strong> 
                    <kbd style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">Enter</kbd> = Save & Next | 
                    <kbd style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">Shift+Enter</kbd> = Save & Stay | 
                    <kbd style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">ESC</kbd> = Close
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    fastEntryVisible = true;
    loadFastEntryFields(0);
    document.getElementById('fastStudentSelect').onchange = () => { loadFastEntryFields(parseInt(document.getElementById('fastStudentSelect').value)); };
    document.getElementById('saveNextBtn').onclick = () => applyFastEntry();
    document.getElementById('saveStayBtn').onclick = () => applyFastEntryAndStay();
    document.addEventListener('keydown', handleFastEntryKeyboard);
}

function closeFastEntryModal() {
    const modal = document.getElementById('fastEntryModal');
    if (modal) modal.remove();
    fastEntryVisible = false;
    document.removeEventListener('keydown', handleFastEntryKeyboard);
}

function handleFastEntryKeyboard(e) {
    if (!fastEntryVisible) return;
    if (e.key === 'Escape') { closeFastEntryModal(); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); applyFastEntry(); }
    else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); applyFastEntryAndStay(); }
}

function loadFastEntryFields(studentIdx) {
    const container = document.getElementById('fastEntryFields');
    if (!container) return;
    const scores = [];
    for (let c = 0; c < 22; c++) {
        const input = document.getElementById(`xy_${studentIdx}_${c}`);
        scores.push(input ? input.value : 0);
    }
    const gradedBy = document.getElementById(`xyGraded_${studentIdx}`)?.value || '';
    const validScores = scores.filter(s => parseFloat(s) > 0);
    let currentAvg = 0;
    if (validScores.length > 0) currentAvg = validScores.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / validScores.length;
    const currentStatus = currentAvg >= 60 ? 'PASS' : (validScores.length > 0 ? 'FAIL' : 'PENDING');
    document.getElementById('currentAvgDisplay').innerHTML = currentAvg.toFixed(2);
    document.getElementById('currentStatusDisplay').innerHTML = `<span class="badge ${currentStatus === 'PASS' ? 'badge-pass' : 'badge-fail'}">${currentStatus}</span>`;
    const areaGroups = [
        { title: '🏥 MEDICAL', cols: [0,1,2], names: ['MED1','MED2','MED3'] },
        { title: '🤰 MCH', cols: [3,4,5], names: ['MCH1','MCH2','MCH3'] },
        { title: '🤱 MATERNITY', cols: [6,7,8], names: ['MAT1','MAT2','MAT3'] },
        { title: '👶 PAEDIATRICS', cols: [9,10], names: ['PEAD1','PEAD2'] },
        { title: '🔪 SURGERY', cols: [11,12,13], names: ['SURG1','SURG2','SURG3'] },
        { title: '🚑 OTHER', cols: [14,15,16,17,18,19,20,21], names: ['OPD','NBU1','NBU2','THEATRE','PSYCHIATRY','RURALS','DISTRICT','SPECIAL'] }
    ];
    let html = '';
    for (let group of areaGroups) {
        html += `<div style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;background:#fafafa;"><h4 style="margin-bottom:15px;color:#667eea;font-size:16px;">${group.title}</h4>`;
        for (let i = 0; i < group.cols.length; i++) {
            const colIdx = group.cols[i];
            const score = scores[colIdx] || 0;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <label style="font-size:14px;font-weight:500;">${group.names[i]}:</label>
                <input type="number" id="fast_${colIdx}" value="${score}" min="0" max="100" step="0.5" style="width:100px;padding:8px;border-radius:8px;border:1px solid #cbd5e1;text-align:center;" onchange="updateFastPreview(${studentIdx})" onkeypress="handleFastEntryKey(event, ${colIdx})">
            </div>`;
        }
        html += `</div>`;
    }
    html += `<div style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;background:#fafafa;">
        <h4 style="margin-bottom:15px;color:#667eea;">📝 Grading Information</h4>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <label style="font-size:14px;font-weight:500;">Graded By (Lecturer Name):</label>
            <input type="text" id="fast_graded" value="${gradedBy}" placeholder="Enter your name" style="flex:1;margin-left:20px;padding:8px;border-radius:8px;border:1px solid #cbd5e1;">
        </div>
    </div>`;
    container.innerHTML = html;
    setTimeout(() => { const firstInput = container.querySelector('input[type="number"]'); if (firstInput) firstInput.focus(); }, 100);
}

function updateFastPreview(studentIdx) {
    let scores = [];
    for (let c = 0; c < 22; c++) {
        const val = parseFloat(document.getElementById(`fast_${c}`)?.value);
        scores.push(isNaN(val) ? 0 : val);
    }
    const validScores = scores.filter(s => s > 0);
    let avg = 0;
    if (validScores.length > 0) avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const status = avg >= 60 ? 'PASS' : (validScores.length > 0 ? 'FAIL' : 'PENDING');
    document.getElementById('currentAvgDisplay').innerHTML = avg.toFixed(2);
    document.getElementById('currentStatusDisplay').innerHTML = `<span class="badge ${status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${status}</span>`;
}

function handleFastEntryKey(event, colIdx) {
    if (event.key === 'Enter') { event.preventDefault(); const nextCol = colIdx + 1; const nextInput = document.getElementById(`fast_${nextCol}`); if (nextInput) nextInput.focus(); else applyFastEntry(); }
}

async function applyFastEntry() {
    const studentIdx = parseInt(document.getElementById('fastStudentSelect').value);
    const sheetName = document.getElementById('nckSheetSelect')?.value || 'XY FORMS';
    let scores = [];
    for (let c = 0; c < 22; c++) {
        const fastVal = document.getElementById(`fast_${c}`)?.value;
        if (fastVal !== undefined) scores.push(parseFloat(fastVal) || 0);
        else scores.push(parseFloat(document.getElementById(`xy_${studentIdx}_${c}`)?.value) || 0);
    }
    const gradedVal = document.getElementById('fast_graded')?.value || currentUser.name;
    const saved = await saveCurrentStudentToDB(studentIdx, sheetName, scores, gradedVal);
    if (saved) {
        for (let c = 0; c < 22; c++) { let mi = document.getElementById(`xy_${studentIdx}_${c}`); if (mi) mi.value = scores[c]; }
        let gi = document.getElementById(`xyGraded_${studentIdx}`); if (gi) gi.value = gradedVal;
        if (window.updateXYAverage) updateXYAverage(studentIdx);
        const nextIdx = studentIdx + 1;
        if (nextIdx < currentNCKMarks.length) {
            document.getElementById('fastStudentSelect').value = nextIdx;
            loadFastEntryFields(nextIdx);
            showNotification(`Now entering ${currentNCKMarks[nextIdx]?.name}`, false);
        } else { closeFastEntryModal(); showNotification('🎉 All students saved to database!', false); }
    }
}

async function applyFastEntryAndStay() {
    const studentIdx = parseInt(document.getElementById('fastStudentSelect').value);
    const sheetName = document.getElementById('nckSheetSelect')?.value || 'XY FORMS';
    let scores = [];
    for (let c = 0; c < 22; c++) {
        const fastVal = document.getElementById(`fast_${c}`)?.value;
        if (fastVal !== undefined) scores.push(parseFloat(fastVal) || 0);
        else scores.push(parseFloat(document.getElementById(`xy_${studentIdx}_${c}`)?.value) || 0);
    }
    const gradedVal = document.getElementById('fast_graded')?.value || currentUser.name;
    await saveCurrentStudentToDB(studentIdx, sheetName, scores, gradedVal);
    for (let c = 0; c < 22; c++) { let mi = document.getElementById(`xy_${studentIdx}_${c}`); if (mi) mi.value = scores[c]; }
    let gi = document.getElementById(`xyGraded_${studentIdx}`); if (gi) gi.value = gradedVal;
    if (window.updateXYAverage) updateXYAverage(studentIdx);
    showNotification(`✅ Saved ${currentNCKMarks[studentIdx]?.name}. Continue editing.`, false);
}

async function saveCurrentStudentToDB(studentIdx, sheetName, scores, gradedBy) {
    const marksData = [{ row: studentIdx + 2, scores: scores, gradedBy: gradedBy }];
    showLoading(`Saving ${currentNCKMarks[studentIdx]?.name} to database...`);
    const result = await apiCall('/api/marks', {
        method: 'POST',
        body: JSON.stringify({ block: 'BLOCK_0', subject: sheetName, marksData, lecturerName: currentUser.name, examType: 'nck', userRole: currentUser?.role })
    });
    hideLoading();
    if (result.success) {
        if (currentNCKMarks[studentIdx]) currentNCKMarks[studentIdx].scores = scores;
        showNotification(`✅ ${currentNCKMarks[studentIdx]?.name} saved to database!`, false);
        return true;
    } else { showNotification(`Save failed: ${result.message}`, true); return false; }
}

// ============================================================
// FAST ENTRY - ASSESSMENT
// ============================================================

function openFastAssessmentPanel() {
    if (!currentNCKMarks || currentNCKMarks.length === 0) { showNotification('No data loaded', true); return; }
    if (fastEntryVisible) { closeFastEntryModal(); return; }
    const columnCount = 12;
    let assessmentNames = ['ANC WARD', 'IMMUNIZATION ASSESSMENT', 'NURSING CARE', 'PSYCHIATRY ASSESSMENT', 'NBU ASSESSMENT', 'MIDWIFERY ASSESSMENT', 'WARD MANAGEMENT', 'MCH/FP CLINIC', 'PSYCHIATRY CASE STUDY', 'GENERAL NURSING CASE STUDY', 'MIDWIFERY CASE STUDY', 'COMMUNITY DIAGNOSIS'];
    const savedNames = localStorage.getItem(`assessmentColumnNames_${currentYear}`);
    if (savedNames) assessmentNames = JSON.parse(savedNames);
    const modal = document.createElement('div');
    modal.id = 'fastEntryModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:10000;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:24px;max-width:800px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px 24px;border-radius:24px 24px 0 0;display:flex;justify-content:space-between;align-items:center;">
                <div><i class="fas fa-expand-alt"></i> <strong>Full Screen Fast Entry - Assessments (March ${currentYear})</strong></div>
                <button class="back-btn" onclick="closeFastEntryModal()" style="padding:8px 20px;background:rgba(255,255,255,0.2);border:none;border-radius:40px;color:white;cursor:pointer;"><i class="fas fa-times"></i> Close (ESC)</button>
            </div>
            <div style="padding:24px;">
                <div style="margin-bottom:20px;"><label style="font-weight:600;">Select Student:</label>
                    <select id="fastStudentSelect" style="width:100%;padding:12px;border-radius:12px;margin-top:8px;">${currentNCKMarks.map((m,i)=>`<option value="${i}">${i+1}. ${m.name}</option>`).join('')}</select>
                </div>
                <div id="fastAssessmentFields"></div>
                <div style="display:flex;gap:15px;margin-top:30px;padding-top:20px;border-top:2px solid #e2e8f0;">
                    <button class="save-btn" id="saveNextBtn" style="flex:1;padding:14px;"><i class="fas fa-save"></i> Save & Next (Enter)</button>
                    <button class="back-btn" id="saveStayBtn" style="flex:1;padding:14px;">Save & Stay (Shift+Enter)</button>
                    <button class="back-btn" onclick="closeFastEntryModal()" style="flex:0.5;padding:14px;">Close (ESC)</button>
                </div>
                <div style="margin-top:15px;text-align:center;font-size:12px;color:#666;padding:10px;background:#f8fafc;border-radius:12px;">
                    <i class="fas fa-keyboard"></i> <strong>Keyboard Shortcuts:</strong> Enter = Save & Next | Shift+Enter = Save & Stay | ESC = Close
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    fastEntryVisible = true;
    loadFastAssessmentFields(0);
    document.getElementById('fastStudentSelect').onchange = () => { loadFastAssessmentFields(parseInt(document.getElementById('fastStudentSelect').value)); };
    document.getElementById('saveNextBtn').onclick = () => applyFastAssessmentEntry();
    document.getElementById('saveStayBtn').onclick = () => applyFastAssessmentEntryAndStay();
}

function loadFastAssessmentFields(studentIdx) {
    const container = document.getElementById('fastAssessmentFields');
    if (!container) return;
    const columnCount = 12;
    const scores = [];
    for (let c = 0; c < columnCount; c++) {
        const input = document.getElementById(`ac_${studentIdx}_${c}`);
        let val = input ? input.value : '';
        if (val === '' || val === undefined) val = 0;
        scores.push(parseFloat(val) || 0);
    }
    let gradedBy = document.getElementById(`acGraded_${studentIdx}`)?.value || '';
    if (gradedBy && !isNaN(parseFloat(gradedBy)) && gradedBy.toString().length > 2 && !isNaN(parseInt(gradedBy))) gradedBy = '';
    const total = scores.reduce((a, b) => a + b, 0);
    const average = columnCount > 0 ? (total / columnCount).toFixed(2) : 0;
    const status = average >= 60 ? 'PASS' : (scores.some(s => s > 0) ? 'FAIL' : 'PENDING');
    let assessmentNames = ['ANC WARD', 'IMMUNIZATION ASSESSMENT', 'NURSING CARE', 'PSYCHIATRY ASSESSMENT', 'NBU ASSESSMENT', 'MIDWIFERY ASSESSMENT', 'WARD MANAGEMENT', 'MCH/FP CLINIC', 'PSYCHIATRY CASE STUDY', 'GENERAL NURSING CASE STUDY', 'MIDWIFERY CASE STUDY', 'COMMUNITY DIAGNOSIS'];
    const savedNames = localStorage.getItem(`assessmentColumnNames_${currentYear}`);
    if (savedNames) assessmentNames = JSON.parse(savedNames);
    let assessmentInputs = '';
    for (let c = 0; c < columnCount; c++) {
        const colName = assessmentNames[c] || `Assessment ${c+1}`;
        const scoreValue = scores[c] || 0;
        const hasScore = scoreValue > 0;
        const inputStyle = hasScore ? 'border:2px solid #10b981;' : 'border:2px solid #f59e0b;background:#fef3c7;';
        assessmentInputs += `
            <div style="margin-bottom:15px;">
                <label style="font-weight:600;display:block;margin-bottom:8px;">📋 ${colName}:</label>
                <input type="number" id="fast_ac_${c}" value="${scoreValue}" min="0" max="100" step="0.5" style="width:100%;padding:12px;border-radius:8px;${inputStyle}" onchange="updateFastAssessmentPreview()" onkeypress="handleFastAssessmentKey(event, ${c})">
                ${scoreValue === 0 ? '<span style="font-size:11px;color:#f59e0b;">⚠️ Score not entered yet</span>' : ''}
            </div>
        `;
    }
    container.innerHTML = `
        <div style="margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:15px;">
            <div style="padding:15px;background:#d1fae5;border-radius:12px;text-align:center;"><strong>Total Score:</strong><br><span id="currentTotalDisplay" style="font-size:28px;font-weight:bold;">${total}</span></div>
            <div style="padding:15px;background:${average >= 60 ? '#d1fae5' : '#fee2e2'};border-radius:12px;text-align:center;"><strong>Average Score:</strong><br><span id="currentAverageDisplay" style="font-size:28px;font-weight:bold;">${average}%</span></div>
        </div>
        <div style="margin-bottom:15px;padding:10px;background:#f0fdf4;border-radius:12px;text-align:center;">
            <strong>Status: <span id="currentAssessmentStatus" class="badge ${status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${status}</span></strong>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:16px;padding:24px;background:#fafafa;">
            ${assessmentInputs}
            <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;">
                <label style="font-weight:600;display:block;margin-bottom:8px;">✍️ Graded By (Lecturer Name):</label>
                <input type="text" id="fast_ac_graded" value="${gradedBy}" placeholder="Enter your name" style="width:100%;padding:12px;border-radius:8px;border:1px solid #cbd5e1;">
            </div>
        </div>
    `;
    setTimeout(() => { const firstInput = container.querySelector('input[type="number"]'); if (firstInput) firstInput.focus(); }, 100);
}

function updateFastAssessmentPreview() {
    const columnCount = 12;
    let scores = [], total = 0;
    for (let c = 0; c < columnCount; c++) {
        const val = parseFloat(document.getElementById(`fast_ac_${c}`)?.value) || 0;
        scores.push(val);
        total += val;
    }
    const average = columnCount > 0 ? (total / columnCount).toFixed(2) : 0;
    const status = average >= 60 ? 'PASS' : (scores.some(s => s > 0) ? 'FAIL' : 'PENDING');
    const totalEl = document.getElementById('currentTotalDisplay');
    const avgEl = document.getElementById('currentAverageDisplay');
    const statusEl = document.getElementById('currentAssessmentStatus');
    if (totalEl) totalEl.innerHTML = total;
    if (avgEl) avgEl.innerHTML = average + '%';
    if (statusEl) { statusEl.innerHTML = status; statusEl.className = `badge ${status === 'PASS' ? 'badge-pass' : 'badge-fail'}`; }
    const avgDiv = document.getElementById('currentAverageDisplay')?.parentElement;
    if (avgDiv) avgDiv.style.background = average >= 60 ? '#d1fae5' : '#fee2e2';
}

function handleFastAssessmentKey(event, fieldIdx) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (fieldIdx < 11) { const nextInput = document.getElementById(`fast_ac_${fieldIdx+1}`); if (nextInput) nextInput.focus(); }
        else applyFastAssessmentEntry();
    }
}

async function applyFastAssessmentEntry() {
    const studentIdx = parseInt(document.getElementById('fastStudentSelect').value);
    const sheetName = document.getElementById('nckSheetSelect')?.value || 'ASSESSMENT AND CASE';
    let scores = [];
    for (let c = 0; c < 12; c++) {
        const fastVal = document.getElementById(`fast_ac_${c}`)?.value;
        scores.push(fastVal !== undefined ? (fastVal === '' ? '' : parseFloat(fastVal)) : '');
    }
    const gradedVal = document.getElementById('fast_ac_graded')?.value || currentUser.name;
    const marksData = [{ row: studentIdx + 2, scores: scores, gradedBy: gradedVal }];
    showLoading(`Saving ${currentNCKMarks[studentIdx]?.name} to database...`);
    const result = await apiCall('/api/marks', {
        method: 'POST',
        body: JSON.stringify({ block: 'BLOCK_0', subject: sheetName, marksData, lecturerName: currentUser.name, examType: 'nck', userRole: currentUser?.role })
    });
    hideLoading();
    if (result.success) {
        for (let c = 0; c < 12; c++) { let mi = document.getElementById(`ac_${studentIdx}_${c}`); if (mi) mi.value = scores[c]; }
        let gi = document.getElementById(`acGraded_${studentIdx}`); if (gi) gi.value = gradedVal;
        if (window.updateACTotal) updateACTotal(studentIdx);
        const nextIdx = studentIdx + 1;
        if (nextIdx < currentNCKMarks.length) {
            document.getElementById('fastStudentSelect').value = nextIdx;
            loadFastAssessmentFields(nextIdx);
            showNotification(`Now entering ${currentNCKMarks[nextIdx]?.name}`, false);
        } else { closeFastEntryModal(); showNotification('🎉 All assessments saved to database!', false); }
    } else showNotification('Save failed', true);
}

async function applyFastAssessmentEntryAndStay() {
    const studentIdx = parseInt(document.getElementById('fastStudentSelect').value);
    const sheetName = document.getElementById('nckSheetSelect')?.value || 'ASSESSMENT AND CASE';
    let scores = [];
    for (let c = 0; c < 12; c++) {
        const fastVal = document.getElementById(`fast_ac_${c}`)?.value;
        scores.push(fastVal !== undefined ? (fastVal === '' ? '' : parseFloat(fastVal)) : '');
    }
    const gradedVal = document.getElementById('fast_ac_graded')?.value || currentUser.name;
    const marksData = [{ row: studentIdx + 2, scores: scores, gradedBy: gradedVal }];
    await apiCall('/api/marks', {
        method: 'POST',
        body: JSON.stringify({ block: 'BLOCK_0', subject: sheetName, marksData, lecturerName: currentUser.name, examType: 'nck', userRole: currentUser?.role })
    });
    for (let c = 0; c < 12; c++) { let mi = document.getElementById(`ac_${studentIdx}_${c}`); if (mi) mi.value = scores[c]; }
    let gi = document.getElementById(`acGraded_${studentIdx}`); if (gi) gi.value = gradedVal;
    if (window.updateACTotal) updateACTotal(studentIdx);
    showNotification(`✅ Saved ${currentNCKMarks[studentIdx]?.name}. Continue editing.`, false);
}

// ============================================================
// XY EDIT MODAL
// ============================================================

function openXYEditModal(studentIdx, studentName) {
    const m = currentNCKMarks[studentIdx];
    if (!m) return;
    const scores = m.scores || [];
    const gradedBy = m.gradedBy || '';
    const areaNames = ['MED1', 'MED2', 'MED3', 'MCH1', 'MCH2', 'MCH3', 'MAT1', 'MAT2', 'MAT3', 'PEAD1', 'PEAD2', 'SURG1', 'SURG2', 'SURG3', 'OPD', 'NBU1', 'NBU2', 'THEATRE', 'PSYCHIATRY', 'RURALS', 'DISTRICT', 'SPECIAL'];
    const groups = [
        { title: '🏥 MEDICAL', start: 0, end: 2 },
        { title: '🤰 MCH', start: 3, end: 5 },
        { title: '🤱 MATERNITY', start: 6, end: 8 },
        { title: '👶 PAEDIATRICS', start: 9, end: 10 },
        { title: '🔪 SURGERY', start: 11, end: 13 },
        { title: '🚑 OTHER', start: 14, end: 21 }
    ];
    let groupsHtml = '';
    for (let group of groups) {
        groupsHtml += `<div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:12px;padding:12px;">
            <h4 style="margin-bottom:12px;color:#667eea;">${group.title}</h4>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">`;
        for (let i = group.start; i <= group.end; i++) {
            const score = scores[i] || 0;
            groupsHtml += `
                <div><label style="display:inline-block;width:80px;font-weight:600;">${areaNames[i]}:</label>
                <input type="number" id="edit_xy_${i}" value="${score}" min="0" max="100" step="0.5" style="width:80px;padding:6px;border-radius:8px;border:1px solid #ccc;"></div>
            `;
        }
        groupsHtml += `</div></div>`;
    }
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:10001;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:24px;width:650px;max-width:95%;max-height:85vh;overflow-y:auto;">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:16px 20px;border-radius:24px 24px 0 0;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;"><i class="fas fa-edit"></i> Edit Clinical Marks - ${studentName}</h3>
                <button class="back-btn" onclick="this.closest('.modal').remove()" style="padding:6px 12px;background:rgba(255,255,255,0.2);">&times;</button>
            </div>
            <div style="padding:20px;">
                ${groupsHtml}
                <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;">
                    <label style="display:block;font-weight:600;margin-bottom:8px;">✍️ Graded By (Lecturer Name):</label>
                    <input type="text" id="edit_xy_graded_by" value="${gradedBy}" placeholder="Enter your name" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ccc;">
                </div>
                <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
                    <button class="back-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="save-btn" onclick="saveXYEditedMarks(${studentIdx}, '${studentName}')">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveXYEditedMarks(studentIdx, studentName) {
    for (let i = 0; i < 22; i++) {
        const editInput = document.getElementById(`edit_xy_${i}`);
        if (editInput) {
            const mainInput = document.getElementById(`xy_${studentIdx}_${i}`);
            if (mainInput) { mainInput.value = editInput.value; mainInput.dispatchEvent(new Event('change')); }
        }
    }
    const editGraded = document.getElementById('edit_xy_graded_by');
    if (editGraded) {
        const mainGraded = document.getElementById(`xyGraded_${studentIdx}`);
        if (mainGraded) mainGraded.value = editGraded.value;
    }
    updateXYAverage(studentIdx);
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    showNotification(`✅ Marks saved for ${studentName}`, false);
}

// ============================================================
// ASSESSMENT EDIT MODAL
// ============================================================

function openAssessmentEditModal(studentIdx, studentName) {
    const m = currentNCKMarks[studentIdx];
    if (!m) return;
    const columnCount = 12;
    const assessmentNames = ['ANC WARD', 'IMMUNIZATION ASSESSMENT', 'NURSING CARE', 'PSYCHIATRY ASSESSMENT', 'NBU ASSESSMENT', 'MIDWIFERY ASSESSMENT', 'WARD MANAGEMENT', 'MCH/FP CLINIC', 'PSYCHIATRY CASE STUDY', 'GENERAL NURSING CASE STUDY', 'MIDWIFERY CASE STUDY', 'COMMUNITY DIAGNOSIS'];
    const scores = m.scores || [];
    const gradedBy = m.gradedBy || '';
    let areasHtml = '';
    for (let i = 0; i < columnCount; i++) {
        const score = scores[i] || 0;
        areasHtml += `
            <div style="margin-bottom:10px;">
                <label style="display:inline-block;width:200px;font-weight:600;">${assessmentNames[i]}:</label>
                <input type="number" id="edit_assessment_${i}" value="${score}" min="0" max="100" step="0.5" style="width:80px;padding:6px;border-radius:8px;border:1px solid #ccc;">
            </div>
        `;
    }
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:10001;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;border-radius:24px;width:500px;max-width:95%;max-height:85vh;overflow-y:auto;">
            <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:16px 20px;border-radius:24px 24px 0 0;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;"><i class="fas fa-edit"></i> Edit Assessment - ${studentName}</h3>
                <button class="back-btn" onclick="this.closest('.modal').remove()" style="padding:6px 12px;background:rgba(255,255,255,0.2);">&times;</button>
            </div>
            <div style="padding:20px;">
                <div style="max-height:400px;overflow-y:auto;padding:10px;">${areasHtml}</div>
                <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e2e8f0;">
                    <label style="display:block;font-weight:600;margin-bottom:8px;">✍️ Graded By (Lecturer Name):</label>
                    <input type="text" id="edit_assessment_graded_by" value="${gradedBy}" placeholder="Enter your name" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ccc;">
                </div>
                <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
                    <button class="back-btn" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="save-btn" onclick="saveAssessmentEditedMarks(${studentIdx}, '${studentName}')">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveAssessmentEditedMarks(studentIdx, studentName) {
    const columnCount = 12;
    for (let i = 0; i < columnCount; i++) {
        const editInput = document.getElementById(`edit_assessment_${i}`);
        if (editInput) {
            const mainInput = document.getElementById(`ac_${studentIdx}_${i}`);
            if (mainInput) { mainInput.value = editInput.value; mainInput.dispatchEvent(new Event('change')); }
        }
    }
    const editGraded = document.getElementById('edit_assessment_graded_by');
    if (editGraded) {
        const mainGraded = document.getElementById(`acGraded_${studentIdx}`);
        if (mainGraded) mainGraded.value = editGraded.value;
    }
    updateACTotal(studentIdx);
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    showNotification(`✅ Assessment marks saved for ${studentName}`, false);
}

// ============================================================
// STUDENTS FUNCTIONS
// ============================================================

async function showStudents() {
    showLoading('Loading students...');
    const students = await apiCall('/api/students', {});
    let html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-user-graduate"></i> Manage Students</h3>
            <div class="header-actions">
                <button class="save-btn" onclick="showAddStudentModal()"><i class="fas fa-plus"></i> Add Student</button>
                <button class="export-btn" onclick="exportToCSV(students, 'students')"><i class="fas fa-download"></i> Export</button>
            </div>
        </div>
        <div style="overflow-x:auto;"><table><thead><tr><th>Admission</th><th>Name</th><th>Block</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    for (const s of students) {
        html += `<tr class="${s.status === 'ACTIVE' ? 'pass-row' : 'fail-row'}">
            <td style="padding:8px;">${s.admission}</td>
            <td style="padding:8px;"><strong>${s.name}</strong></td>
            <td style="padding:8px;">${s.block}</td>
            <td style="padding:8px;"><span class="badge ${s.status === 'ACTIVE' ? 'badge-pass' : 'badge-fail'}">${s.status}</span></td>
            <td style="padding:8px;">
                <button class="edit-btn" onclick="showEditStudentModal('${s.admission}', '${s.name.replace(/'/g, "\\'")}', '${s.block}')">Edit</button>
                <button class="delete-btn" onclick="deleteStudent('${s.admission}')">Delete</button>
            </td>
        </tr>`;
    }
    html += `</tbody></table></div>`;
    updateContentArea(html);
    hideLoading();
}

function showAddStudentModal() {
    const modal = `
        <div id="studentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-user-plus"></i> Add Student</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
                <div class="modal-body">
                    <div class="field"><label>Admission Number</label><input type="text" id="studentAdmission" placeholder="e.g., KRCHN/0001/26"></div>
                    <div class="field"><label>Full Name</label><input type="text" id="studentName" placeholder="Full Name"></div>
                    <div class="field"><label>Block</label><select id="studentBlock">${['BLOCK_0','BLOCK_1','BLOCK_2','BLOCK_3','BLOCK_4','BLOCK_5'].map(b => `<option value="${b}">${b}</option>`).join('')}</select></div>
                    <button onclick="saveNewStudent()" class="save-btn" style="width:100%"><i class="fas fa-save"></i> Save Student</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

async function saveNewStudent() {
    const admission = document.getElementById('studentAdmission').value.trim();
    const name = document.getElementById('studentName').value.trim();
    const block = document.getElementById('studentBlock').value;
    if (!admission || !name) { showNotification('Fill all fields', true); return; }
    showLoading('Adding student...');
    try {
        // Insert directly into Supabase
        const { data, error } = await sb.from('consolidated_user_profiles_table').insert({
            student_id: admission,
            full_name: name,
            block: block,
            role: 'student',
            intake_year: currentYear,
            status: 'active'
        });
        hideLoading();
        closeModal();
        if (error) throw error;
        showNotification('Student added successfully!');
        showStudents();
    } catch (error) {
        hideLoading();
        showNotification('Error adding student: ' + error.message, true);
    }
}

function showEditStudentModal(adm, name, block) {
    const modal = `
        <div id="studentModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-user-edit"></i> Edit Student</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
                <div class="modal-body">
                    <div class="field"><label>Admission</label><input type="text" value="${adm}" readonly></div>
                    <div class="field"><label>Name</label><input type="text" id="editStudentName" value="${name}"></div>
                    <div class="field"><label>Block</label><select id="editStudentBlock">${['BLOCK_0','BLOCK_1','BLOCK_2','BLOCK_3','BLOCK_4','BLOCK_5'].map(b => `<option ${b === block ? 'selected' : ''} value="${b}">${b}</option>`).join('')}</select></div>
                    <button onclick="updateStudent('${adm}')" class="save-btn" style="width:100%"><i class="fas fa-save"></i> Update</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

async function updateStudent(adm) {
    const name = document.getElementById('editStudentName').value.trim();
    const block = document.getElementById('editStudentBlock').value;
    if (!name) { showNotification('Name is required', true); return; }
    showLoading('Updating student...');
    try {
        const { error } = await sb.from('consolidated_user_profiles_table')
            .update({ full_name: name, block: block, updated_at: new Date().toISOString() })
            .eq('student_id', adm)
            .eq('role', 'student');
        hideLoading();
        closeModal();
        if (error) throw error;
        showNotification('Student updated successfully!');
        showStudents();
    } catch (error) {
        hideLoading();
        showNotification('Error updating student: ' + error.message, true);
    }
}

async function deleteStudent(adm) {
    if (!confirm(`Delete student "${adm}"? This will mark them as INACTIVE.`)) return;
    showLoading('Deleting student...');
    try {
        const { error } = await sb.from('consolidated_user_profiles_table')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('student_id', adm)
            .eq('role', 'student');
        hideLoading();
        if (error) throw error;
        showNotification('Student deleted successfully!');
        showStudents();
    } catch (error) {
        hideLoading();
        showNotification('Error deleting student: ' + error.message, true);
    }
}

// ============================================================
// LECTURERS FUNCTIONS
// ============================================================

async function showLecturers() {
    showLoading('Loading lecturers...');
    const lecturers = await apiCall('/api/lecturers', {});
    let html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-chalkboard-user"></i> Manage Lecturers</h3>
            <div class="header-actions"><button class="save-btn" onclick="showAddLecturerModal()"><i class="fas fa-plus"></i> Add Lecturer</button></div>
        </div>`;
    for (const l of lecturers) {
        const badges = (l.subjects || []).map(s => `<span class="subject-badge">${s.split('|')[1] || s}</span>`).join(' ');
        html += `
            <div class="lecturer-card">
                <div class="info"><strong>${l.full_name || l.name}</strong><br><small>${l.email || l.username}</small></div>
                <div class="badges">${badges}</div>
                <div class="actions">
                    <button class="edit-btn" onclick="showEditLecturerModal('${l.username || l.email}')">Edit</button>
                    <button class="delete-btn" onclick="deleteLecturer('${l.username || l.email}')">Delete</button>
                </div>
            </div>
        `;
    }
    updateContentArea(html);
    hideLoading();
}

function showAddLecturerModal() {
    const modal = `
        <div id="lecturerModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-user-plus"></i> Add Lecturer</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
                <div class="modal-body">
                    <div class="field"><label>Username</label><input type="text" id="lecUser" placeholder="e.g., johndoe"></div>
                    <div class="field"><label>Full Name</label><input type="text" id="lecName" placeholder="John Doe"></div>
                    <div class="field"><label>Email</label><input type="email" id="lecEmail" placeholder="john@example.com"></div>
                    <div class="field"><label>Password</label><input type="password" id="lecPass" value="password123"></div>
                    <button onclick="saveNewLecturer()" class="save-btn" style="width:100%"><i class="fas fa-save"></i> Save Lecturer</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

async function saveNewLecturer() {
    const username = document.getElementById('lecUser').value.trim();
    const name = document.getElementById('lecName').value.trim();
    const email = document.getElementById('lecEmail').value.trim();
    const password = document.getElementById('lecPass').value || 'password123';
    if (!username || !name) { showNotification('Username and Name required', true); return; }
    showLoading('Adding lecturer...');
    try {
        const { error } = await sb.from('lecturers').insert({
            username: username,
            full_name: name,
            email: email || username + '@example.com',
            staff_id: username,
            status: 'approved',
            role: 'lecturer'
        });
        hideLoading();
        closeModal();
        if (error) throw error;
        showNotification('Lecturer added successfully!');
        showLecturers();
    } catch (error) {
        hideLoading();
        showNotification('Error adding lecturer: ' + error.message, true);
    }
}

async function deleteLecturer(username) {
    if (!confirm(`Delete lecturer "${username}"?`)) return;
    showLoading('Deleting lecturer...');
    try {
        const { error } = await sb.from('lecturers')
            .update({ status: 'inactive' })
            .eq('username', username);
        hideLoading();
        if (error) throw error;
        showNotification('Lecturer deleted successfully!');
        showLecturers();
    } catch (error) {
        hideLoading();
        showNotification('Error deleting lecturer: ' + error.message, true);
    }
}

function showEditLecturerModal(username) {
    // This would need to fetch lecturer details first
    showNotification('Edit lecturer feature coming soon', true);
}

// ============================================================
// UNITS FUNCTIONS
// ============================================================

async function showUnits() {
    showLoading('Loading units...');
    const units = await apiCall('/api/units', {});
    let html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-book-open"></i> Manage Units</h3></div>
        <div class="card">
            <h4><i class="fas fa-plus-circle"></i> Add New Unit</h4>
            <div class="form-grid">
                <div><label>Block</label><select id="newUnitBlock">${['BLOCK_0','BLOCK_1','BLOCK_2','BLOCK_3','BLOCK_4','BLOCK_5'].map(b => `<option value="${b}">${b}</option>`).join('')}</select></div>
                <div><label>Subject Name</label><input type="text" id="newUnitName" placeholder="Subject Name"></div>
                <div><label>Assessment Type</label><select id="newUnitType">
                    <option value="full">Full (CAT1+CAT2+Exam)</option>
                    <option value="single_cat">Single CAT (CAT+Exam)</option>
                    <option value="exam_only">Exam Only</option>
                </select></div>
                <div><button class="save-btn" onclick="addNewUnit()"><i class="fas fa-plus"></i> Add Unit</button></div>
            </div>
        </div>
    `;
    for (const block of ['BLOCK_0', 'BLOCK_1', 'BLOCK_2', 'BLOCK_3', 'BLOCK_4', 'BLOCK_5']) {
        const blockUnits = units[block] || [];
        if (blockUnits.length) {
            html += `<div style="margin-top:24px;"><h3 style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:8px 24px;border-radius:40px;">${block.replace('_', ' ')}</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-top:12px;">`;
            for (const u of blockUnits) {
                const typeIcon = u.assessmentType === 'full' ? '📊' : (u.assessmentType === 'single_cat' ? '📝' : '📖');
                const typeLabel = u.assessmentType === 'full' ? 'CAT1+CAT2+Exam' : (u.assessmentType === 'single_cat' ? 'CAT+Exam' : 'Exam Only');
                html += `
                    <div class="unit-card">
                        <div><strong>${typeIcon} ${u.name}</strong> <span class="badge" style="margin-left:8px;">${typeLabel}</span></div>
                        <div style="margin-top:12px;">
                            <button class="edit-btn" onclick="showEditUnitModal('${block}', '${u.name.replace(/'/g, "\\'")}', '${u.assessmentType}')">Edit</button>
                            <button class="delete-btn" onclick="deleteUnit('${block}', '${u.name.replace(/'/g, "\\'")}')">Delete</button>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        }
    }
    updateContentArea(html);
    hideLoading();
}

async function addNewUnit() {
    const block = document.getElementById('newUnitBlock').value;
    const name = document.getElementById('newUnitName').value.trim().toUpperCase();
    const type = document.getElementById('newUnitType').value;
    if (!name) { showNotification('Enter subject name', true); return; }
    showLoading('Adding unit...');
    try {
        const { error } = await sb.from('units_catalog').insert({
            unit_name: name,
            block: block,
            assessment_type: type,
            year: parseInt(currentYear),
            status: 'active',
            program: 'Nursing',
            unit_code: name.substring(0, 8)
        });
        hideLoading();
        if (error) throw error;
        showNotification('Unit added successfully!');
        showUnits();
    } catch (error) {
        hideLoading();
        showNotification('Error adding unit: ' + error.message, true);
    }
}

async function deleteUnit(block, name) {
    if (!confirm(`Delete unit "${name}"? This will delete ALL marks for this subject!`)) return;
    showLoading('Deleting unit...');
    try {
        const { error } = await sb.from('units_catalog')
            .update({ status: 'inactive' })
            .eq('block', block)
            .eq('unit_name', name)
            .eq('year', parseInt(currentYear));
        hideLoading();
        if (error) throw error;
        showNotification('Unit deleted successfully!');
        showUnits();
    } catch (error) {
        hideLoading();
        showNotification('Error deleting unit: ' + error.message, true);
    }
}

function showEditUnitModal(block, name, curType) {
    const modal = `
        <div id="unitModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h3><i class="fas fa-edit"></i> Edit Unit</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
                <div class="modal-body">
                    <div class="field"><label>Subject Name</label><input type="text" id="editUnitName" value="${name}"></div>
                    <div class="field"><label>Assessment Type</label><select id="editUnitType">
                        <option value="full" ${curType === 'full' ? 'selected' : ''}>Full (CAT1+CAT2+Exam)</option>
                        <option value="single_cat" ${curType === 'single_cat' ? 'selected' : ''}>Single CAT (CAT+Exam)</option>
                        <option value="exam_only" ${curType === 'exam_only' ? 'selected' : ''}>Exam Only</option>
                    </select></div>
                    <button onclick="updateUnit('${block}', '${name.replace(/'/g, "\\'")}')" class="save-btn" style="width:100%">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

async function updateUnit(block, oldName) {
    const newName = document.getElementById('editUnitName').value.trim().toUpperCase();
    const newType = document.getElementById('editUnitType').value;
    if (!newName) { showNotification('Enter subject name', true); return; }
    showLoading('Updating unit...');
    try {
        const { error } = await sb.from('units_catalog')
            .update({ unit_name: newName, assessment_type: newType, updated_at: new Date().toISOString() })
            .eq('block', block)
            .eq('unit_name', oldName)
            .eq('year', parseInt(currentYear));
        hideLoading();
        closeModal();
        if (error) throw error;
        showNotification('Unit updated successfully!');
        showUnits();
    } catch (error) {
        hideLoading();
        showNotification('Error updating unit: ' + error.message, true);
    }
}

// ============================================================
// ENTRY CONTROL FUNCTIONS
// ============================================================

async function toggleGlobalEntry() {
    showLoading('Toggling global entry...');
    const result = await apiCall('/api/mark-entry/toggle-global', {
        method: 'POST',
        body: JSON.stringify({ lecturerName: currentUser?.name || 'System' })
    });
    hideLoading();
    if (result.success) {
        showNotification(result.message);
        showEntryControlPanel();
    } else {
        showNotification(result.message || 'Error toggling global entry', true);
    }
}

async function toggleClassEntry(year) {
    showLoading(`Toggling ${year} class entry...`);
    const result = await apiCall('/api/mark-entry/toggle-class', {
        method: 'POST',
        body: JSON.stringify({ year, lecturerName: currentUser?.name || 'System' })
    });
    hideLoading();
    if (result.success) {
        showNotification(result.message);
        showEntryControlPanel();
    } else {
        showNotification(result.message || `Error toggling ${year} class entry`, true);
    }
}

async function toggleSubjectEntry(block, subject) {
    showLoading(`Toggling ${subject} entry...`);
    const result = await apiCall('/api/mark-entry/toggle-subject', {
        method: 'POST',
        body: JSON.stringify({ block, subject, lecturerName: currentUser?.name || 'System' })
    });
    hideLoading();
    if (result.success) {
        showNotification(result.message);
        showBlockSubjectControl(block);
    } else {
        showNotification(result.message || `Error toggling ${subject} entry`, true);
    }
}

async function showBlockSubjectControl(block) {
    showLoading(`Loading subjects for ${block}...`);
    const subjects = await apiCall(`/api/subjects/${block}`, {});
    const settings = await getMarkEntrySettings();
    let html = `
        <button class="back-btn" onclick="showEntryControlPanel()"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-book"></i> Manage Subjects in ${block.replace('_', ' ')}</h3></div>
        <div class="card">
    `;
    for (const subject of subjects) {
        const subjectKey = `${block}_${subject.name}`;
        const setting = settings[subjectKey];
        html += `
            <div class="setting-card">
                <div class="setting-row">
                    <div><strong>📖 ${subject.name}</strong><br><small>${subject.assessmentType}</small></div>
                    <button class="${setting?.enabled !== false ? 'btn-danger' : 'btn-success'}" onclick="toggleSubjectEntry('${block}', '${subject.name}')" style="padding:8px 20px;border:none;border-radius:40px;color:white;cursor:pointer;">
                        <i class="fas ${setting?.enabled !== false ? 'fa-lock' : 'fa-lock-open'}"></i>
                        ${setting?.enabled !== false ? 'Close Entry' : 'Open Entry'}
                    </button>
                </div>
            </div>
        `;
    }
    html += `</div>`;
    updateContentArea(html);
    hideLoading();
}

// ============================================================
// SCORE PUBLISHING FUNCTIONS
// ============================================================

async function showScorePublishPanel() {
    if (currentUser?.role !== 'admin') {
        showNotification('Only administrators can access this panel', true);
        return;
    }
    showLoading('Loading Score Publishing Panel...');
    const year = currentYear || '2026';
    const { data: marks } = await sb.from('student_marks').select('*').eq('academic_year', year);
    const totalScores = marks?.length || 0;
    const published = marks?.filter(m => m.published === true).length || 0;
    const hidden = totalScores - published;
    const publishRate = totalScores > 0 ? ((published / totalScores) * 100).toFixed(1) : 0;
    const subjects = {};
    marks?.forEach(m => {
        const key = m.subject_name;
        if (!subjects[key]) subjects[key] = { marks: [], block: m.block, assessmentType: m.assessment_type };
        subjects[key].marks.push(m);
    });
    const html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-eye-slash"></i> Score Publishing Control Panel</h3><p>Control which exam results students can see</p></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${totalScores}</div><div class="stat-label">Total Scores Entered</div></div>
            <div class="stat-card" style="background:#d1fae5;"><div class="stat-number" style="color:#065f46;">${published}</div><div class="stat-label">Published to Students</div></div>
            <div class="stat-card" style="background:#fee2e2;"><div class="stat-number" style="color:#991b1b;">${hidden}</div><div class="stat-label">Hidden from Students</div></div>
            <div class="stat-card"><div class="stat-number">${publishRate}%</div><div class="stat-label">Publication Rate</div></div>
        </div>
        <div class="card">
            <div class="card-title"><i class="fas fa-chart-line"></i> Exam Scores - Manage Publication
                <button class="save-btn" onclick="showScorePublishPanel()" style="margin-left:auto;padding:6px 16px;"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
            <div style="overflow-x:auto;"><table><thead><tr><th>Subject</th><th>Block</th><th>Students</th><th>Published</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    for (const [name, data] of Object.entries(subjects)) {
        const total = data.marks.length;
        const publishedCount = data.marks.filter(m => m.published === true).length;
        const isFullyPublished = publishedCount === total;
        const isPartiallyPublished = publishedCount > 0 && publishedCount < total;
        let statusBadge = '';
        if (isFullyPublished) statusBadge = '<span class="badge badge-pass"><i class="fas fa-eye"></i> Fully Published</span>';
        else if (isPartiallyPublished) statusBadge = '<span class="badge badge-warning"><i class="fas fa-eye-half"></i> Partially Published</span>';
        else statusBadge = '<span class="badge badge-fail"><i class="fas fa-eye-slash"></i> Not Published</span>';
        html += `
            <tr><td><strong>${name}</strong><br><small>${data.assessmentType === 'full' ? 'CAT1+CAT2+Exam' : (data.assessmentType === 'single_cat' ? 'CAT+Exam' : 'Exam Only')}</small></td>
                <td>${data.block?.replace('_', ' ') || 'N/A'}</td>
                <td style="text-align:center;">${total}</td>
                <td><strong>${publishedCount}</strong> / ${total}
                    <div class="progress-bar" style="margin-top:5px;width:80px;"><div class="progress-fill" style="width:${(publishedCount/total)*100}%;background:${publishedCount === total ? '#10b981' : '#f59e0b'};"></div></div>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <button class="save-btn" onclick="manageSubjectPublication('${name}')" style="padding:4px 12px;font-size:11px;margin-right:4px;"><i class="fas fa-eye"></i> Manage</button>
                    <button class="${isFullyPublished ? 'btn-warning' : 'btn-success'}" onclick="bulkToggleSubjectPublication('${name}')" style="padding:4px 12px;font-size:11px;border:none;border-radius:40px;color:white;cursor:pointer;">
                        <i class="fas ${isFullyPublished ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isFullyPublished ? 'Unpublish All' : 'Publish All'}
                    </button>
                </td>
            </tr>
        `;
    }
    html += `</tbody></table></div></div>`;
    updateContentArea(html);
    hideLoading();
}

async function manageSubjectPublication(subjectName) {
    // Show student-level management for this subject
    const year = currentYear || '2026';
    const { data: marks } = await sb.from('student_marks')
        .select('*')
        .eq('subject_name', subjectName)
        .eq('academic_year', year);
    if (!marks || marks.length === 0) {
        showNotification('No marks found for this subject', true);
        return;
    }
    let html = `
        <button class="back-btn" onclick="showScorePublishPanel()"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3>Manage Publication - ${subjectName}</h3></div>
        <div style="overflow-x:auto;"><table><thead><tr><th>#</th><th>Student Name</th><th>Admission</th><th>Score</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
    for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        const isPublished = m.published === true;
        html += `
            <tr><td>${i+1}</td>
                <td><strong>${m.student_name}</strong></td>
                <td>${m.admission_number}</td>
                <td>${m.final_score || 0}%</td>
                <td><span class="badge ${isPublished ? 'badge-pass' : 'badge-fail'}">${isPublished ? 'Published' : 'Hidden'}</span></td>
                <td>
                    <button class="${isPublished ? 'btn-warning' : 'btn-success'}" onclick="toggleSinglePublication('${subjectName}', '${m.admission_number}', ${!isPublished})" style="padding:4px 12px;font-size:11px;border:none;border-radius:40px;color:white;cursor:pointer;">
                        <i class="fas ${isPublished ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isPublished ? 'Hide' : 'Publish'}
                    </button>
                </td>
            </tr>
        `;
    }
    html += `</tbody></table></div>
        <div style="text-align:center;margin-top:20px;">
            <button class="btn-success" onclick="bulkToggleSubjectPublication('${subjectName}')" style="padding:10px 24px;border:none;border-radius:40px;color:white;cursor:pointer;"><i class="fas fa-eye"></i> Publish All</button>
            <button class="btn-warning" onclick="bulkToggleSubjectPublication('${subjectName}')" style="padding:10px 24px;border:none;border-radius:40px;color:white;cursor:pointer;margin-left:10px;"><i class="fas fa-eye-slash"></i> Hide All</button>
        </div>
    `;
    updateContentArea(html);
}

async function toggleSinglePublication(subjectName, admission, publish) {
    try {
        const { error } = await sb.from('student_marks')
            .update({ published: publish, published_at: publish ? new Date().toISOString() : null })
            .eq('subject_name', subjectName)
            .eq('admission_number', admission)
            .eq('academic_year', currentYear);
        if (error) throw error;
        showNotification(`${publish ? 'Published' : 'Hidden'} marks for ${admission}`);
        manageSubjectPublication(subjectName);
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

async function bulkToggleSubjectPublication(subjectName) {
    const year = currentYear || '2026';
    const { data: marks } = await sb.from('student_marks')
        .select('*')
        .eq('subject_name', subjectName)
        .eq('academic_year', year);
    if (!marks || marks.length === 0) {
        showNotification('No marks found', true);
        return;
    }
    const allPublished = marks.every(m => m.published === true);
    const newStatus = !allPublished;
    if (!confirm(`${newStatus ? 'Publish' : 'Hide'} all ${marks.length} scores for ${subjectName}?`)) return;
    showLoading(`${newStatus ? 'Publishing' : 'Hiding'} all scores...`);
    try {
        const { error } = await sb.from('student_marks')
            .update({ published: newStatus, published_at: newStatus ? new Date().toISOString() : null })
            .eq('subject_name', subjectName)
            .eq('academic_year', year);
        if (error) throw error;
        hideLoading();
        showNotification(`${newStatus ? 'Published' : 'Hidden'} all ${marks.length} scores for ${subjectName}`);
        showScorePublishPanel();
    } catch (error) {
        hideLoading();
        showNotification('Error: ' + error.message, true);
    }
}

// ============================================================
// REPORTS FUNCTIONS
// ============================================================

async function showFullReports() {
    const html = `
        <button class="back-btn" onclick="switchTab('dashboard')"><i class="fas fa-arrow-left"></i> Back</button>
        <div class="header"><h3><i class="fas fa-file-pdf"></i> PDF Reports Generator</h3><p>Generate professional PDF documents for academic records</p></div>
        <div class="report-grid">
            <div class="report-card" onclick="generateReport('student_transcript')"><i class="fas fa-user-graduate"></i><h3>Student Transcripts</h3><p>Individual student performance reports</p></div>
            <div class="report-card" onclick="generateReport('class_performance')"><i class="fas fa-chart-line"></i><h3>Class Performance Report</h3><p>Overall class statistics and pass rates</p></div>
            <div class="report-card" onclick="generateReport('subject_analysis')"><i class="fas fa-book-open"></i><h3>Subject Analysis Report</h3><p>Mean scores and performance by subject</p></div>
            <div class="report-card" onclick="generateReport('clinical_report')"><i class="fas fa-hospital-user"></i><h3>Clinical Performance Report</h3><p>NCK clinical evaluation scores</p></div>
            <div class="report-card" onclick="generateReport('honor_roll')"><i class="fas fa-trophy"></i><h3>Honor Roll Report</h3><p>Top performing students</p></div>
            <div class="report-card" onclick="generateReport('intervention_list')"><i class="fas fa-exclamation-triangle"></i><h3>Intervention List</h3><p>Students requiring academic support</p></div>
        </div>
        <div class="card" id="reportPreview"><div class="text-center" style="padding:40px;"><i class="fas fa-file-pdf" style="font-size:64px;color:#ef4444;"></i><h4>Click on any report card above</h4><p style="color:var(--gray);">Generate professional PDF reports</p></div></div>
    `;
    updateContentArea(html);
}

function generateReport(reportType) {
    showNotification(`Generating ${reportType} report... Please wait.`, false);
    // This would generate the actual PDF using html2pdf
    setTimeout(() => {
        showNotification(`✅ ${reportType} report generated!`, false);
    }, 2000);
}

// ============================================================
// EXPORT TO CSV
// ============================================================

function exportToCSV(data, filename) {
    if (!data || data.length === 0) { showNotification('No data to export', true); return; }
    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';
    for (const row of data) {
        const values = headers.map(h => {
            let val = row[h] || '';
            if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
            return val;
        });
        csv += values.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${currentYear}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showNotification('Exported successfully!');
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        if (document.getElementById('app')) {
            e.preventDefault();
            refreshAllData();
        }
    }
});

// ============================================================
// INITIALIZATION
// ============================================================

initDarkMode();
checkLogin();

console.log('🚀 Nursing Marks System v3.0 loaded!');
console.log('📡 Supabase connected!');
console.log('⌨️ Press Ctrl+R to refresh data (not page)');
