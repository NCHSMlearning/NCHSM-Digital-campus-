// lecture-card.js - Complete Lecture Card Module
// Handles official lecture card generation with HOD and Finance Officer approvals
// Now pulls lecturer names from timetables table

(function() {
    'use strict';
    
    console.log('📚 Initializing Lecture Card Module...');
    
    const LectureCardModule = {
        // State variables
        currentData: null,
        userBlock: null,
        lecturerMap: {}, // Will be populated from timetables
        
        // Initialize the module
        init: function() {
            console.log('✅ Lecture Card Module ready');
        },
        
        // Load lecture card data
        loadLectureCard: async function() {
            console.log('📖 Loading lecture card...');
            
            const container = document.getElementById('lecture-card-content');
            if (!container) return;
            
            // Get user's block
            if (window.currentUserProfile) {
                this.userBlock = window.currentUserProfile.block || 'BLOCK 4';
            }
            
            // Show loading state
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading lecture card...</p>
                </div>
            `;
            
            // Hide print button initially
            const printBtn = document.getElementById('print-lecture-card-btn');
            if (printBtn) printBtn.style.display = 'none';
            
            try {
                // Get student data from global state
                const studentProfile = await this.getStudentProfile();
                const registeredUnits = await this.getRegisteredUnits();
                const approvals = await this.getApprovals();
                
                // Build lecturer map from timetables
                await this.buildLecturerMap();
                
                // Generate the lecture card HTML
                const cardHTML = this.generateLectureCard(studentProfile, registeredUnits, approvals);
                container.innerHTML = cardHTML;
                
                // Show print button
                if (printBtn) printBtn.style.display = 'inline-flex';
                
                // Add print event listener
                if (printBtn && !printBtn.hasListener) {
                    printBtn.removeEventListener('click', this.printCard);
                    printBtn.addEventListener('click', () => this.printCard());
                    printBtn.hasListener = true;
                }
                
                // Add refresh button listener
                const refreshBtn = document.getElementById('refresh-lecture-card-btn');
                if (refreshBtn && !refreshBtn.hasListener) {
                    refreshBtn.removeEventListener('click', () => this.loadLectureCard());
                    refreshBtn.addEventListener('click', () => this.loadLectureCard());
                    refreshBtn.hasListener = true;
                }
                
            } catch (error) {
                console.error('❌ Error loading lecture card:', error);
                container.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626;"></i>
                        <p style="margin-top: 16px;">Failed to load lecture card. Please try again.</p>
                        <button onclick="window.lectureCardModule?.loadLectureCard()" class="btn-primary" style="margin-top: 16px;">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                `;
            }
        },
        
        // Build lecturer map from timetables table
        buildLecturerMap: async function() {
            console.log('📚 Building lecturer map from timetables...');
            
            try {
                const supabase = window.db?.supabase;
                if (!supabase) {
                    console.warn('No Supabase connection');
                    return;
                }
                
                // Get student's block
                const studentBlock = this.userBlock || window.currentUserProfile?.block;
                if (!studentBlock) {
                    console.warn('No student block found');
                    return;
                }
                
                // Fetch timetables for student's block
                const { data, error } = await supabase
                    .from('timetables')
                    .select('course_name, session_name, lecturer_name')
                    .eq('block', studentBlock);
                
                if (error) {
                    console.warn('Error fetching timetables:', error);
                    return;
                }
                
                if (data && data.length > 0) {
                    // Build map from course names to lecturer names
                    data.forEach(item => {
                        const courseKey = item.course_name || item.session_name;
                        if (courseKey && item.lecturer_name) {
                            this.lecturerMap[courseKey] = item.lecturer_name;
                        }
                    });
                    console.log(`✅ Loaded ${Object.keys(this.lecturerMap).length} lecturer mappings from timetables`);
                }
                
            } catch (e) {
                console.warn('Could not build lecturer map:', e);
            }
        },
        
        // Get student profile
        getStudentProfile: async function() {
            // If already available globally
            if (window.currentUserProfile) {
                return window.currentUserProfile;
            }
            
            // Try to get from database
            if (window.db && window.db.currentUserProfile) {
                return window.db.currentUserProfile;
            }
            
            // Try to get from database directly
            if (window.db?.supabase) {
                try {
                    const { data: { user } } = await window.db.supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await window.db.supabase
                            .from('consolidated_user_profiles_table')
                            .select('*')
                            .eq('user_id', user.id)
                            .single();
                        
                        if (profile) {
                            return profile;
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch profile from DB:', e);
                }
            }
            
            // Fallback to localStorage
            const savedProfile = localStorage.getItem('nchsm_user_profile');
            if (savedProfile) {
                return JSON.parse(savedProfile);
            }
            
            // Return basic structure (will be replaced by real data)
            return {
                full_name: 'Loading...',
                student_id: 'Loading...',
                program: 'Loading...',
                intake_year: '2024',
                block: 'BLOCK 4'
            };
        },
        
        // Get registered units from unit registration module
        getRegisteredUnits: async function() {
            console.log('📚 Fetching registered units from student_unit_registrations...');
            
            // Try to get from unit registration module first (most reliable)
            if (window.unitRegistrationModule && window.unitRegistrationModule.registeredUnits) {
                const registered = window.unitRegistrationModule.registeredUnits;
                const approvedUnits = registered.filter(u => u.status === 'approved');
                
                if (approvedUnits && approvedUnits.length > 0) {
                    console.log('✅ Found approved units from unitRegistrationModule:', approvedUnits.length);
                    return approvedUnits.map(unit => ({
                        name: unit.unit_name,
                        code: unit.unit_code,
                        credits: unit.credits || 3,
                        block: unit.block
                    }));
                }
                
                // If no approved units, check for pending
                const pendingUnits = registered.filter(u => u.status === 'pending');
                if (pendingUnits.length > 0) {
                    console.log('⚠️ No approved units yet, showing pending units as preview');
                    return pendingUnits.map(unit => ({
                        name: unit.unit_name,
                        code: unit.unit_code,
                        block: unit.block,
                        pending: true
                    }));
                }
            }
            
            // Try from database using the correct table name
            if (window.db && window.db.supabase) {
                try {
                    const userId = window.currentUserId || window.db.currentUserId;
                    if (userId) {
                        const { data, error } = await window.db.supabase
                            .from('student_unit_registrations')
                            .select('unit_code, unit_name, block, status, reg_type')
                            .eq('student_id', userId)
                            .eq('status', 'approved');
                        
                        if (error) {
                            console.warn('DB query error:', error);
                        } else if (data && data.length > 0) {
                            console.log('✅ Found approved units from database:', data.length);
                            return data.map(item => ({
                                name: item.unit_name,
                                code: item.unit_code,
                                block: item.block
                            }));
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch units from DB:', e);
                }
            }
            
            // Return empty array - will show "No registered units" message
            console.log('⚠️ No approved units found');
            return [];
        },
        
        // Get approvals (HOD and Finance Officer)
        getApprovals: async function() {
            let financeApproved = false;
            let hodApproved = false;
            
            // Check if student has approved units
            let hasApprovedUnits = false;
            
            if (window.unitRegistrationModule && window.unitRegistrationModule.registeredUnits) {
                hasApprovedUnits = window.unitRegistrationModule.registeredUnits.some(u => u.status === 'approved');
            }
            
            // If no approved units, show pending
            if (!hasApprovedUnits) {
                return {
                    finance: false,
                    hod: false,
                    registrar: false,
                    issued_date: new Date().toLocaleDateString('en-GB'),
                    valid_block: this.userBlock || 'PENDING',
                    allApproved: false
                };
            }
            
            // Check fee status from dashboard if available
            if (window.dashboardModule && window.dashboardModule.metrics) {
                const metrics = window.dashboardModule.metrics;
                financeApproved = metrics.examCard?.eligible || false;
            }
            
            // For demo - in production, fetch from approvals table
            // For now, assume approved if units are approved
            return {
                finance: true,
                hod: true,
                registrar: true,
                issued_date: new Date().toLocaleDateString('en-GB'),
                valid_block: this.userBlock || 'BLOCK 4',
                allApproved: true
            };
        },
        
        // Get lecturer name - first try from timetable map, then fallback
        getLecturerName: function(unitName) {
            // Try exact match from timetable
            if (this.lecturerMap[unitName]) {
                return this.lecturerMap[unitName];
            }
            
            // Try partial match
            for (const [course, lecturer] of Object.entries(this.lecturerMap)) {
                if (unitName.toLowerCase().includes(course.toLowerCase()) || 
                    course.toLowerCase().includes(unitName.toLowerCase())) {
                    return lecturer;
                }
            }
            
            return 'To be assigned';
        },
        
        // Generate the complete lecture card HTML
        generateLectureCard: function(student, units, approvals) {
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const allApproved = approvals.allApproved || (approvals.finance && approvals.hod);
            
            // Build units table rows
            let unitsRows = '';
            
            if (units.length === 0) {
                unitsRows = `
                    <tr>
                        <td colspan="3" style="padding: 30px; text-align: center; color: #6b7280;">
                            <i class="fas fa-info-circle"></i> No registered units found. Please register units first.
                        </td>
                    </tr>
                `;
            } else {
                units.forEach((unit, index) => {
                    const unitName = unit.name || unit.unit_name || 'Unknown Unit';
                    const lecturer = unit.pending ? 'Pending Approval' : this.getLecturerName(unitName);
                    const pendingBadge = unit.pending ? '<span class="badge-pending" style="background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">Pending</span>' : '';
                    
                    unitsRows += `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${index + 1}</td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">
                                ${this.escapeHtml(unitName)}
                                ${pendingBadge}
                            </td>
                            <td style="padding: 10px; border: 1px solid #e5e7eb;">${this.escapeHtml(lecturer)}</td>
                        </tr>
                    `;
                });
            }
            
            // Generate approval signatures HTML
            const financeSignature = approvals.finance ? 
                '<div style="margin-top: 20px;"><div style="border-top: 2px solid #059669; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #059669; margin-top: 5px;"><i class="fas fa-check-circle"></i> Finance Officer Approved</div></div>' :
                '<div style="margin-top: 20px;"><div style="border-top: 1px dashed #dc2626; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #dc2626; margin-top: 5px;">Pending Finance Officer Approval</div></div>';
            
            const hodSignature = approvals.hod ?
                '<div style="margin-top: 20px;"><div style="border-top: 2px solid #059669; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #059669; margin-top: 5px;"><i class="fas fa-check-circle"></i> HOD Approved</div></div>' :
                '<div style="margin-top: 20px;"><div style="border-top: 1px dashed #dc2626; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #dc2626; margin-top: 5px;">Pending HOD Approval</div></div>';
            
            return `
                <div class="official-lecture-card" style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                    <div class="card-border" style="padding: 24px;">
                        <!-- Header -->
                        <div class="card-header" style="text-align: center; border-bottom: 2px solid #4C1D95; padding-bottom: 16px; margin-bottom: 20px;">
                            <h2 style="color: #4C1D95; margin: 0; font-size: 24px;">NCHSM - OFFICIAL LECTURE CARD</h2>
                            <p class="academic-year" style="margin: 5px 0 0; color: #6b7280;">${currentYear}/${nextYear} ACADEMIC YEAR</p>
                        </div>
                        
                        <!-- Approval Status Banner -->
                        ${!allApproved ? `
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-clock" style="color: #f59e0b;"></i>
                                <span style="font-size: 14px; color: #92400e;">This lecture card requires approval before use. Please ensure fees are cleared and academic requirements are met.</span>
                            </div>
                        </div>
                        ` : `
                        <div style="background: #d1fae5; border-left: 4px solid #059669; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-check-circle" style="color: #059669;"></i>
                                <span style="font-size: 14px; color: #065f46; font-weight: 500;">✓ Fully Approved - Valid for class attendance</span>
                            </div>
                        </div>
                        `}
                        
                        <!-- Student Info -->
                        <div class="student-info" style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 12px;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                <div><strong>Student:</strong> ${this.escapeHtml(student.full_name || student.name || 'N/A')}</div>
                                <div><strong>Reg No:</strong> ${this.escapeHtml(student.student_id || student.registration_number || 'N/A')}</div>
                                <div><strong>Program:</strong> ${this.escapeHtml(student.program || 'KRCHN')}</div>
                                <div><strong>Intake:</strong> ${this.escapeHtml(student.intake_year || student.admission_year || '2024')}</div>
                                <div><strong>Current Block:</strong> ${this.escapeHtml(student.block || this.userBlock || 'BLOCK 4')}</div>
                                <div><strong>Status:</strong> <span style="color: ${allApproved ? '#059669' : '#f59e0b'}; font-weight: 600;">${allApproved ? 'ACTIVE' : 'PENDING APPROVAL'}</span></div>
                            </div>
                        </div>
                        
                        <!-- Registered Units Table -->
                        <div class="registered-units" style="margin-bottom: 24px;">
                            <h3 style="color: #4C1D95; margin-bottom: 12px; font-size: 18px;">REGISTERED UNITS</h3>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
                                    <thead style="background: #f3f4f6;">
                                        <tr>
                                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">NO</th>
                                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">UNIT NAME</th>
                                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">LECTURER</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${unitsRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Issued and Valid Info -->
                        <div class="card-footer" style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 12px;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                                <div>
                                    <span style="color: #6b7280;">ISSUED:</span>
                                    <strong>${approvals.issued_date}</strong>
                                </div>
                                <div>
                                    <span style="color: #6b7280;">VALID FOR:</span>
                                    <strong>${approvals.valid_block}</strong>
                                </div>
                                <div>
                                    <span style="color: #6b7280;">Valid Until:</span>
                                    <strong>End of Block</strong>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Signatures Section -->
                        <div class="signature-section" style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 8px;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 24px;">
                                <!-- Finance Officer -->
                                <div style="text-align: center; flex: 1;">
                                    ${financeSignature}
                                    <div style="font-size: 11px; color: #9ca3af; margin-top: 5px;">Finance Officer</div>
                                </div>
                                
                                <!-- HOD -->
                                <div style="text-align: center; flex: 1;">
                                    ${hodSignature}
                                    <div style="font-size: 11px; color: #9ca3af; margin-top: 5px;">Head of Department</div>
                                </div>
                                
                                <!-- Academic Registrar -->
                                <div style="text-align: center; flex: 1;">
                                    <div style="margin-top: 20px;">
                                        <div style="border-top: 1px solid #374151; width: 200px; margin: 0 auto;"></div>
                                    </div>
                                    <div style="font-size: 12px; margin-top: 5px;">Academic Registrar</div>
                                    <div style="font-size: 11px; color: #9ca3af;">(Authorized Signature)</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer Note -->
                        <div style="margin-top: 24px; padding: 12px; background: #eef2ff; border-radius: 8px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #4C1D95;">
                                <i class="fas fa-info-circle"></i> This card must be presented to your lecturer on the first day of each unit. 
                                Valid only for the current block and registered units.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        },
        
        // Print the lecture card
        printCard: function() {
            const cardContent = document.getElementById('lecture-card-content');
            if (!cardContent) return;
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups to print the lecture card.');
                return;
            }
            
            const currentDate = new Date().toLocaleDateString();
            const allStyles = document.querySelectorAll('link[rel="stylesheet"]');
            let styleLinks = '';
            allStyles.forEach(link => {
                if (link.href) {
                    styleLinks += `<link rel="stylesheet" href="${link.href}">`;
                }
            });
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NCHSM Lecture Card - ${currentDate}</title>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    ${styleLinks}
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        @media print {
                            body {
                                padding: 0;
                                margin: 0;
                            }
                            .no-print {
                                display: none;
                            }
                            .official-lecture-card {
                                box-shadow: none;
                                border: 1px solid #e5e7eb;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${cardContent.innerHTML}
                    <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #9ca3af;" class="no-print">
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
        
        // Helper: escape HTML
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    // Expose module globally
    window.lectureCardModule = LectureCardModule;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LectureCardModule.init());
    } else {
        LectureCardModule.init();
    }
    
    console.log('✅ Lecture Card Module loaded and ready');
})();
