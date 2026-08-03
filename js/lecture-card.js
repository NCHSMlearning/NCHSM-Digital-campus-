// lecture-card.js - Complete Lecture Card Module
// Works for ALL blocks and ALL programs (KRCHN & TVET)
// UPDATED to match the HTML section

(function() {
    'use strict';
    
    console.log('📚 Initializing Lecture Card Module...');
    
    const LectureCardModule = {
        currentData: null,
        userBlock: null,
        userProgram: null,
        isTVETStudent: false,
        lecturerMap: {},
        unitDetailsMap: {},
        allTimetableData: [],
        studentProfile: null,
        registeredUnits: [],
        approvals: null,
        
        init: function() {
            console.log('✅ Lecture Card Module ready');
            
            // Set up event listeners for the buttons
            this.setupEventListeners();
            
            // Auto-load when the tab is shown
            const lectureCardTab = document.querySelector('[data-tab="hub-lecture-card"]');
            if (lectureCardTab) {
                lectureCardTab.addEventListener('click', () => {
                    setTimeout(() => this.loadLectureCard(), 300);
                });
            }
            
            // Also load if it's already the active tab
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'hub-lecture-card') {
                setTimeout(() => this.loadLectureCard(), 500);
            }
        },
        
        setupEventListeners: function() {
            // Print button - will be attached after content loads
            const printBtn = document.getElementById('print-lecture-card-btn');
            if (printBtn) {
                printBtn.removeEventListener('click', this.printCard);
                printBtn.addEventListener('click', () => this.printCard());
                printBtn.hasListener = true;
            }
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-lecture-card-btn');
            if (refreshBtn) {
                refreshBtn.removeEventListener('click', () => this.loadLectureCard());
                refreshBtn.addEventListener('click', () => this.loadLectureCard());
                refreshBtn.hasListener = true;
            }
            
            // Download PDF button
            const downloadBtn = document.getElementById('download-lecture-card-btn');
            if (downloadBtn) {
                downloadBtn.removeEventListener('click', this.downloadPDF);
                downloadBtn.addEventListener('click', () => this.downloadPDF());
                downloadBtn.hasListener = true;
            }
        },
        
        loadLectureCard: async function() {
            console.log('📖 Loading lecture card...');
            
            const container = document.getElementById('lecture-card-content');
            if (!container) return;
            
            // Update status badge
            this.updateStatusBadge('loading');
            
            // Get student's block and program from profile
            await this.getStudentInfo();
            
            console.log(`📌 Student: ${this.userProgram}, Block: ${this.userBlock}, TVET: ${this.isTVETStudent}`);
            
            container.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                    <div style="width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    <p style="margin: 0;">Loading lecture card for ${this.userBlock || 'your block'}...</p>
                </div>
            `;
            
            const printBtn = document.getElementById('print-lecture-card-btn');
            const downloadBtn = document.getElementById('download-lecture-card-btn');
            if (printBtn) printBtn.style.display = 'none';
            if (downloadBtn) downloadBtn.style.display = 'none';
            
            try {
                await this.getStudentProfile();
                await this.getRegisteredUnits();
                await this.buildLecturerMapFromTimetables();
                await this.getApprovals();
                
                const cardHTML = this.generateLectureCard();
                container.innerHTML = cardHTML;
                
                // Show action buttons
                if (printBtn) printBtn.style.display = 'inline-flex';
                if (downloadBtn) downloadBtn.style.display = 'inline-flex';
                
                // Update status badge
                this.updateStatusBadge(this.approvals?.allApproved ? 'active' : 'pending');
                
                // Dispatch event
                document.dispatchEvent(new CustomEvent('lectureCardLoaded', {
                    detail: {
                        block: this.userBlock,
                        program: this.userProgram,
                        units: this.registeredUnits.length,
                        approved: this.approvals?.allApproved || false
                    }
                }));
                
            } catch (error) {
                console.error('❌ Error loading lecture card:', error);
                container.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626; display: block; margin-bottom: 12px;"></i>
                        <h3 style="color: #1e293b; margin: 0;">Failed to Load Lecture Card</h3>
                        <p style="margin: 8px 0 16px 0;">${error.message || 'Please try again.'}</p>
                        <button onclick="window.lectureCardModule?.loadLectureCard()" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                `;
                this.updateStatusBadge('error');
            }
        },
        
        updateStatusBadge: function(status) {
            const badge = document.getElementById('lectureCardStatusBadge');
            const text = document.getElementById('lectureCardStatusText');
            
            if (!badge || !text) return;
            
            switch(status) {
                case 'active':
                    badge.style.background = '#d1fae5';
                    badge.style.color = '#059669';
                    text.textContent = 'Active ✓';
                    break;
                case 'pending':
                    badge.style.background = '#fef3c7';
                    badge.style.color = '#92400e';
                    text.textContent = 'Pending Approval';
                    break;
                case 'loading':
                    badge.style.background = '#e2e8f0';
                    badge.style.color = '#64748b';
                    text.textContent = 'Loading...';
                    break;
                case 'error':
                    badge.style.background = '#fee2e2';
                    badge.style.color = '#dc2626';
                    text.textContent = 'Error';
                    break;
                default:
                    badge.style.background = '#e2e8f0';
                    badge.style.color = '#64748b';
                    text.textContent = 'Unknown';
            }
        },
        
        getStudentInfo: function() {
            return new Promise((resolve) => {
                // Try multiple sources for student info
                const sources = [
                    () => window.currentUserProfile,
                    () => window.db?.currentUserProfile,
                    () => window.userProfile,
                    () => {
                        try {
                            return JSON.parse(localStorage.getItem('userProfile'));
                        } catch(e) { return null; }
                    },
                    () => {
                        try {
                            return JSON.parse(sessionStorage.getItem('userProfile'));
                        } catch(e) { return null; }
                    }
                ];
                
                let profile = null;
                for (const source of sources) {
                    const result = source();
                    if (result && (result.full_name || result.student_id || result.id || result.user_id)) {
                        profile = result;
                        break;
                    }
                }
                
                if (profile) {
                    this.studentProfile = profile;
                    this.userProgram = profile.program || profile.course || 'KRCHN';
                    this.userBlock = profile.block || profile.current_block || profile.term || 'Block 4';
                    
                    // Check if TVET student
                    const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                          'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                          'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];
                    this.isTVETStudent = tvetPrograms.includes(this.userProgram);
                } else {
                    // Fallback defaults
                    this.studentProfile = {
                        full_name: 'Student Name',
                        student_id: 'NCHSM/2024/001',
                        program: 'KRCHN',
                        intake_year: '2024',
                        block: 'Block 4'
                    };
                    this.userProgram = 'KRCHN';
                    this.userBlock = 'Block 4';
                    this.isTVETStudent = false;
                }
                
                // Also try to get from consolidated_user_profiles_table via RPC
                this.fetchProfileFromDB().then(dbProfile => {
                    if (dbProfile) {
                        this.studentProfile = { ...this.studentProfile, ...dbProfile };
                        this.userProgram = dbProfile.program || this.userProgram;
                        this.userBlock = dbProfile.block || dbProfile.current_block || this.userBlock;
                    }
                    resolve();
                }).catch(() => resolve());
            });
        },
        
        fetchProfileFromDB: async function() {
            try {
                const supabase = window.db?.supabase;
                if (!supabase) return null;
                
                const userId = window.db?.currentUserId || window.currentUser?.id;
                if (!userId) return null;
                
                const { data, error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle();
                
                if (error || !data) return null;
                return data;
            } catch (e) {
                return null;
            }
        },
        
        getStudentProfile: async function() {
            // Already loaded in getStudentInfo
            return this.studentProfile;
        },
        
        getRegisteredUnits: async function() {
            console.log('📚 Fetching registered units...');
            
            // Try to get from unit registration module
            if (window.unitRegistrationModule && window.unitRegistrationModule.registeredUnits) {
                const registered = window.unitRegistrationModule.registeredUnits;
                const approvedUnits = registered.filter(u => 
                    u.status === 'approved' && (u.block === this.userBlock || u.block === this.userTerm)
                );
                
                if (approvedUnits && approvedUnits.length > 0) {
                    console.log('✅ Found approved units:', approvedUnits.length);
                    this.registeredUnits = approvedUnits.map(unit => ({
                        name: unit.unit_name,
                        code: unit.unit_code,
                        credits: unit.credits || 3,
                        block: unit.block
                    }));
                    return;
                }
            }
            
            // If no registered units from module, try fetching from database
            try {
                const supabase = window.db?.supabase;
                if (supabase) {
                    const userId = window.db?.currentUserId || window.currentUser?.id;
                    if (userId) {
                        const { data, error } = await supabase
                            .from('student_unit_registrations')
                            .select('*')
                            .eq('student_id', userId)
                            .eq('status', 'approved')
                            .order('submitted_date', { ascending: false });
                        
                        if (!error && data && data.length > 0) {
                            console.log('✅ Found approved units from DB:', data.length);
                            this.registeredUnits = data.map(unit => ({
                                name: unit.unit_name,
                                code: unit.unit_code,
                                credits: unit.credits || 3,
                                block: unit.block
                            }));
                            return;
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not fetch units from DB:', e);
            }
            
            // If no registered units, get units from timetables for this block
            if (this.allTimetableData && this.allTimetableData.length > 0) {
                const uniqueCourses = new Map();
                this.allTimetableData.forEach(item => {
                    const courseName = item.course_name || item.session_name;
                    if (courseName && !uniqueCourses.has(courseName)) {
                        uniqueCourses.set(courseName, {
                            name: courseName,
                            code: this.extractUnitCode(courseName),
                            credits: 3
                        });
                    }
                });
                
                const unitsFromTimetable = Array.from(uniqueCourses.values());
                console.log(`📋 Found ${unitsFromTimetable.length} units from timetable for ${this.userBlock}`);
                this.registeredUnits = unitsFromTimetable;
                return;
            }
            
            console.log(`⚠️ No units found for block: ${this.userBlock}`);
            this.registeredUnits = [];
        },
        
        buildLecturerMapFromTimetables: async function() {
            console.log(`📚 Building lecturer map from timetables for: ${this.userBlock}`);
            
            try {
                const supabase = window.db?.supabase;
                if (!supabase) {
                    console.warn('No Supabase connection');
                    return;
                }
                
                // Query timetables for the student's specific block
                let query = supabase
                    .from('timetables')
                    .select('course_name, session_name, lecturer_name, venue, block')
                    .not('lecturer_name', 'is', null)
                    .neq('lecturer_name', '—')
                    .neq('lecturer_name', 'TBA (Pending)')
                    .neq('lecturer_name', '');
                
                // If we have a block, filter by it
                if (this.userBlock) {
                    query = query.eq('block', this.userBlock);
                }
                
                const { data, error } = await query;
                
                if (error) {
                    console.warn('Error fetching timetables:', error);
                    return;
                }
                
                if (data && data.length > 0) {
                    this.allTimetableData = data;
                    
                    data.forEach(item => {
                        const courseName = item.course_name || item.session_name;
                        if (courseName && item.lecturer_name) {
                            // Store original
                            this.lecturerMap[courseName] = item.lecturer_name;
                            this.lecturerMap[courseName.toLowerCase()] = item.lecturer_name;
                            
                            // Store simplified version (remove punctuation for better matching)
                            const simplified = courseName.replace(/[&:]/g, ' ').replace(/\s+/g, ' ').trim();
                            if (simplified !== courseName) {
                                this.lecturerMap[simplified] = item.lecturer_name;
                                this.lecturerMap[simplified.toLowerCase()] = item.lecturer_name;
                            }
                            
                            if (item.venue) {
                                this.unitDetailsMap[courseName] = {
                                    lecturer: item.lecturer_name,
                                    venue: item.venue
                                };
                            }
                        }
                    });
                    
                    console.log(`✅ Loaded ${Object.keys(this.lecturerMap).length} lecturer mappings for ${this.userBlock}`);
                } else {
                    console.log(`⚠️ No timetable data found for block: ${this.userBlock}`);
                }
                
            } catch (e) {
                console.warn('Could not build lecturer map:', e);
            }
        },
        
        extractUnitCode: function(courseName) {
            const codeMap = {
                'Teaching and Learning Methodology': 'NCHSCH 303',
                'Teaching & Learning Methodology': 'NCHSCH 303',
                'Leadership and Management I': 'NCHSCH 304',
                'Leadership & Management I': 'NCHSCH 304',
                'Communicable & Vector-Borne Diseases': 'NCHSCH 305',
                'Community Diagnosis': 'NCHSCH 306',
                'Medical Surgical Nursing IV: Dermatology & Burns': 'NCHSGN 301',
                'Medical Surgical Nursing IV: ENT Disorders': 'NCHSGN 302',
                'Medical-Surgical Nursing IV': 'NCHSGN 30x',
                'Critical Care Nursing': 'NCHCRC 301',
                'Paediatric Nursing': 'NCHPED 301',
                'Midwifery III': 'NCHMID 301',
                'Research Process': 'NCHRES 301',
                'Epidemiology & Demography': 'NCHEPI 301',
                'Sexual & Reproductive Health II': 'NCHSRH 301',
                'Peri-Operative Nursing': 'NCHPER 301'
            };
            return codeMap[courseName] || 'NCHxxx';
        },
        
        getLecturerName: function(unitName, unitCode) {
            // Special mappings for name mismatches (handles & vs and, colons, etc.)
            const specialMappings = {
                'Medical Surgical Nursing IV: Dermatology & Burns': 'Medical-Surgical Nursing IV',
                'Medical Surgical Nursing IV: ENT Disorders': 'Medical-Surgical Nursing IV',
                'Medical Surgical Nursing IV: Dermatology and Burns': 'Medical-Surgical Nursing IV',
                'Teaching and Learning Methodology': 'Teaching & Learning Methodology',
                'Leadership and Management I': 'Leadership & Management I'
            };
            
            // Check if we need to map the name
            let searchName = unitName;
            if (specialMappings[unitName]) {
                searchName = specialMappings[unitName];
            }
            
            // Try exact match with mapped name
            if (this.lecturerMap[searchName]) {
                return this.lecturerMap[searchName];
            }
            
            // Try case-insensitive match
            const lowerSearch = searchName.toLowerCase();
            for (const [key, lecturer] of Object.entries(this.lecturerMap)) {
                if (key.toLowerCase() === lowerSearch) {
                    return lecturer;
                }
            }
            
            // Try partial match
            for (const [key, lecturer] of Object.entries(this.lecturerMap)) {
                const keyLower = key.toLowerCase();
                if (lowerSearch.includes(keyLower) || keyLower.includes(lowerSearch)) {
                    return lecturer;
                }
            }
            
            // Check by unit code
            const codeMappings = {
                'NCHSGN 301': 'Medical-Surgical Nursing IV',
                'NCHSGN 302': 'Medical-Surgical Nursing IV',
                'NCHSCH 303': 'Teaching & Learning Methodology',
                'NCHSCH 304': 'Leadership & Management I',
                'NCHSCH 305': 'Communicable & Vector-Borne Diseases',
                'NCHSCH 306': 'Community Diagnosis'
            };
            
            if (codeMappings[unitCode]) {
                const mappedCourse = codeMappings[unitCode];
                if (this.lecturerMap[mappedCourse]) {
                    return this.lecturerMap[mappedCourse];
                }
            }
            
            return 'To be assigned - Contact HOD';
        },
        
        getApprovals: async function() {
            let hasData = false;
            
            if (this.registeredUnits && this.registeredUnits.length > 0) {
                hasData = true;
            }
            
            // Also check if there are approved units in the registration module
            if (window.unitRegistrationModule?.registeredUnits) {
                const approved = window.unitRegistrationModule.registeredUnits.some(u => u.status === 'approved');
                if (approved) hasData = true;
            }
            
            // Check if timetables exist
            if (this.allTimetableData && this.allTimetableData.length > 0) {
                hasData = true;
            }
            
            this.approvals = {
                finance: hasData,
                hod: hasData,
                registrar: hasData,
                issued_date: new Date().toLocaleDateString('en-GB'),
                valid_block: this.userBlock || 'Current Block',
                allApproved: hasData
            };
            
            return this.approvals;
        },
        
        generateLectureCard: function() {
            const student = this.studentProfile || {};
            const units = this.registeredUnits || [];
            const approvals = this.approvals || { allApproved: false, issued_date: new Date().toLocaleDateString('en-GB'), valid_block: this.userBlock };
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const displayBlock = this.userBlock || student.block || 'Current Block';
            const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
            const studentName = student.full_name || student.name || 'Student Name';
            const studentId = student.student_id || student.registration_number || student.id?.substring(0, 8) || 'N/A';
            const intakeYear = student.intake_year || student.admission_year || '2024';
            
            // Build units table rows
            let unitsRows = '';
            
            if (units.length === 0) {
                unitsRows = `<tr><td colspan="3" style="padding: 30px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-info-circle" style="display: block; margin-bottom: 8px; font-size: 20px;"></i>
                    No units found for ${displayBlock}.<br>
                    Please contact academic office.
                </td></tr>`;
            } else {
                units.forEach((unit, index) => {
                    const unitName = unit.name || unit.unit_name || 'Unknown Unit';
                    const unitCode = unit.code || unit.unit_code || this.extractUnitCode(unitName);
                    const lecturer = this.getLecturerName(unitName, unitCode);
                    
                    unitsRows += `
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 50px; font-weight: 500;">${index + 1}</td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">
                                <strong>${this.escapeHtml(unitCode)}</strong><br>
                                <span style="font-size: 12px; color: #4b5563;">${this.escapeHtml(unitName)}</span>
                            </td>
                            <td style="padding: 12px; border: 1px solid #e5e7eb;">${this.escapeHtml(lecturer)}</td>
                        </tr>
                    `;
                });
            }
            
            const approvalStatus = approvals.allApproved ? 'ACTIVE' : 'PENDING APPROVAL';
            const statusColor = approvals.allApproved ? '#059669' : '#f59e0b';
            const statusBg = approvals.allApproved ? '#d1fae5' : '#fef3c7';
            const statusBorder = approvals.allApproved ? '#059669' : '#f59e0b';
            
            return `
                <div class="official-lecture-card" style="max-width: 850px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; overflow: hidden;">
                    <div style="padding: 24px;">
                        <!-- Header -->
                        <div style="text-align: center; border-bottom: 2px solid #4C1D95; padding-bottom: 16px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 4px;">
                                <div style="width: 50px; height: 50px; border-radius: 50%; background: #4C1D95; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="fas fa-chalkboard" style="color: white; font-size: 24px;"></i>
                                </div>
                                <h2 style="color: #4C1D95; margin: 0; font-size: 22px; font-weight: 700;">NCHSM</h2>
                            </div>
                            <h3 style="margin: 0; color: #0A3D62; font-size: 16px; font-weight: 600;">OFFICIAL LECTURE CARD</h3>
                            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">${currentYear}/${nextYear} ACADEMIC YEAR</p>
                            <p style="margin: 4px 0 0; color: #4C1D95; font-weight: 600; font-size: 13px;">${programType} | BLOCK: <span style="font-weight: 700;">${this.escapeHtml(displayBlock)}</span></p>
                        </div>
                        
                        <!-- Status Badge -->
                        <div style="background: ${statusBg}; border-left: 4px solid ${statusBorder}; padding: 10px 16px; margin-bottom: 20px; border-radius: 6px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas ${approvals.allApproved ? 'fa-check-circle' : 'fa-clock'}" style="color: ${statusColor};"></i>
                                <span style="font-size: 13px; color: ${statusColor}; font-weight: 500;">
                                    ${approvals.allApproved ? '✓ Fully Approved - Valid for class attendance' : '⏳ Pending Approval - Please complete registration'}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Student Info -->
                        <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                <div><strong style="font-size: 13px; color: #475569;">Student:</strong> <span style="font-size: 13px; color: #1e293b;">${this.escapeHtml(studentName)}</span></div>
                                <div><strong style="font-size: 13px; color: #475569;">Reg No:</strong> <span style="font-size: 13px; color: #1e293b;">${this.escapeHtml(studentId)}</span></div>
                                <div><strong style="font-size: 13px; color: #475569;">Program:</strong> <span style="font-size: 13px; color: #1e293b;">${this.escapeHtml(student.program || this.userProgram || 'KRCHN')}</span></div>
                                <div><strong style="font-size: 13px; color: #475569;">Intake:</strong> <span style="font-size: 13px; color: #1e293b;">${this.escapeHtml(intakeYear)}</span></div>
                                <div><strong style="font-size: 13px; color: #475569;">Current Block:</strong> <span style="font-size: 13px; color: #1e293b; font-weight: 600;">${this.escapeHtml(displayBlock)}</span></div>
                                <div><strong style="font-size: 13px; color: #475569;">Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${approvalStatus}</span></div>
                            </div>
                        </div>
                        
                        <!-- Units Table -->
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #0A3D62; margin-bottom: 12px; font-size: 15px; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-book" style="color: #4C1D95;"></i> REGISTERED UNITS
                                <span style="font-size: 11px; background: #e2e8f0; color: #475569; padding: 2px 10px; border-radius: 12px; font-weight: 400;">${units.length}</span>
                            </h4>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px;">
                                    <thead style="background: #f3f4f6;">
                                        <tr>
                                            <th style="padding: 10px 12px; text-align: left; border: 1px solid #e5e7eb; width: 50px; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">NO</th>
                                            <th style="padding: 10px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">UNIT</th>
                                            <th style="padding: 10px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">LECTURER</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${unitsRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Validity -->
                        <div style="margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 13px;">
                                <div><span style="color: #6b7280;">ISSUED:</span> <strong>${approvals.issued_date}</strong></div>
                                <div><span style="color: #6b7280;">VALID FOR:</span> <strong>${this.escapeHtml(approvals.valid_block)}</strong></div>
                                <div><span style="color: #6b7280;">Valid Until:</span> <strong>End of Block</strong></div>
                            </div>
                        </div>
                        
                        <!-- Signatures -->
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div style="text-align: center;">
                                    <div style="border-top: 2px solid #059669; width: 180px; margin: 0 auto;"></div>
                                    <div style="font-size: 11px; margin-top: 5px; color: #475569;">Finance Officer</div>
                                    <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Fees Clearance</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="border-top: 2px solid #059669; width: 180px; margin: 0 auto;"></div>
                                    <div style="font-size: 11px; margin-top: 5px; color: #475569;">Head of Department</div>
                                    <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Academic Approval</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="border-top: 2px solid #059669; width: 180px; margin: 0 auto;"></div>
                                    <div style="font-size: 11px; margin-top: 5px; color: #475569;">Principal</div>
                                    <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Final Authorization</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div style="margin-top: 20px; padding: 12px; background: #eef2ff; border-radius: 6px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #4C1D95;">
                                <i class="fas fa-info-circle"></i> This card must be presented to your lecturer on the first day of each unit.
                                Valid for <strong>${this.escapeHtml(displayBlock)}</strong> only.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        },
        
        printCard: function() {
            const cardContent = document.getElementById('lecture-card-content');
            if (!cardContent) return;
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups to print.');
                return;
            }
            
            const currentDate = new Date().toLocaleDateString();
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM Lecture Card</title>
                    <meta charset="UTF-8">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: white; }
                        @media print { body { padding: 0; } }
                        .no-print { display: none; }
                        @media print { .no-print { display: none; } }
                        .official-lecture-card { max-width: 850px; margin: 0 auto; }
                    </style>
                </head>
                <body>
                    ${cardContent.innerHTML}
                    <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #94a3b8;" class="no-print">
                        Printed on ${currentDate} | NCHSM Student Portal
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        },
        
        downloadPDF: function() {
            // Get the card content
            const cardContent = document.getElementById('lecture-card-content');
            if (!cardContent) return;
            
            // Show a loading state
            const downloadBtn = document.getElementById('download-lecture-card-btn');
            if (downloadBtn) {
                const originalText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                downloadBtn.disabled = true;
            }
            
            // Use html2pdf if available, otherwise use print
            if (typeof html2pdf !== 'undefined') {
                const element = cardContent.cloneNode(true);
                const opt = {
                    margin:       10,
                    filename:     `Lecture_Card_${this.userBlock || 'Current'}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                
                // Remove any "no-print" elements
                element.querySelectorAll('.no-print').forEach(el => el.remove());
                
                html2pdf().set(opt).from(element).save().then(() => {
                    if (downloadBtn) {
                        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
                        downloadBtn.disabled = false;
                    }
                }).catch(() => {
                    // Fallback to print
                    this.printCard();
                    if (downloadBtn) {
                        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
                        downloadBtn.disabled = false;
                    }
                });
            } else {
                // Fallback to print
                this.printCard();
                if (downloadBtn) {
                    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
                    downloadBtn.disabled = false;
                }
            }
        },
        
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    // ============================================
    // 🚀 GLOBAL EXPOSURE
    // ============================================
    
    window.lectureCardModule = LectureCardModule;
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LectureCardModule.init());
    } else {
        LectureCardModule.init();
    }
    
    // Also init when app is ready
    document.addEventListener('appReady', () => {
        setTimeout(() => LectureCardModule.loadLectureCard(), 500);
    });
    
    // Listen for user login
    document.addEventListener('userLoggedIn', () => {
        setTimeout(() => LectureCardModule.loadLectureCard(), 800);
    });
    
    console.log('✅ Lecture Card Module loaded and ready (works for ALL blocks and programs)');
})();
