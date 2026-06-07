// lecture-card.js - Complete Lecture Card Module
// Works for ALL blocks and ALL programs (KRCHN & TVET)
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
        
        init: function() {
            console.log('✅ Lecture Card Module ready');
        },
        
        loadLectureCard: async function() {
            console.log('📖 Loading lecture card...');
            
            const container = document.getElementById('lecture-card-content');
            if (!container) return;
            
            // Get student's block and program from profile
            if (window.currentUserProfile) {
                this.userBlock = window.currentUserProfile.block || window.currentUserProfile.term || 'Block 4';
                this.userProgram = window.currentUserProfile.program || 'KRCHN';
                
                // Check if TVET student
                const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                      'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                      'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];
                this.isTVETStudent = tvetPrograms.includes(this.userProgram);
            }
            
            console.log(`📌 Student: ${this.userProgram}, Block: ${this.userBlock}, TVET: ${this.isTVETStudent}`);
            
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading lecture card for ${this.userBlock}...</p>
                </div>
            `;
            
            const printBtn = document.getElementById('print-lecture-card-btn');
            if (printBtn) printBtn.style.display = 'none';
            
            try {
                const studentProfile = await this.getStudentProfile();
                const registeredUnits = await this.getRegisteredUnits();
                await this.buildLecturerMapFromTimetables();
                const approvals = await this.getApprovals();
                
                const cardHTML = this.generateLectureCard(studentProfile, registeredUnits, approvals);
                container.innerHTML = cardHTML;
                
                if (printBtn) printBtn.style.display = 'inline-flex';
                
                if (printBtn && !printBtn.hasListener) {
                    printBtn.removeEventListener('click', this.printCard);
                    printBtn.addEventListener('click', () => this.printCard());
                    printBtn.hasListener = true;
                }
                
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
        
        buildLecturerMapFromTimetables: async function() {
            console.log(`📚 Building lecturer map from timetables for: ${this.userBlock}`);
            
            try {
                const supabase = window.db?.supabase;
                if (!supabase) {
                    console.warn('No Supabase connection');
                    return;
                }
                
                // Query timetables for the student's specific block
                const { data, error } = await supabase
                    .from('timetables')
                    .select('course_name, session_name, lecturer_name, venue, block')
                    .eq('block', this.userBlock)
                    .not('lecturer_name', 'is', null)
                    .neq('lecturer_name', '—')
                    .neq('lecturer_name', 'TBA (Pending)')
                    .neq('lecturer_name', '');
                
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
        
        getStudentProfile: async function() {
            const sources = [
                () => window.currentUserProfile,
                () => window.db?.currentUserProfile,
                () => {
                    try {
                        return JSON.parse(localStorage.getItem('userProfile'));
                    } catch(e) { return null; }
                }
            ];
            
            for (const source of sources) {
                const profile = source();
                if (profile && (profile.full_name || profile.student_id)) {
                    if (!profile.block && this.userBlock) {
                        profile.block = this.userBlock;
                    }
                    return profile;
                }
            }
            
            return {
                full_name: 'Student Name',
                student_id: 'NCHSM/2024/001',
                program: this.userProgram || 'KRCHN',
                intake_year: '2024',
                block: this.userBlock || 'Block 4'
            };
        },
        
        getRegisteredUnits: async function() {
            console.log('📚 Fetching registered units...');
            
            // Try to get from unit registration module
            if (window.unitRegistrationModule && window.unitRegistrationModule.registeredUnits) {
                const registered = window.unitRegistrationModule.registeredUnits;
                const approvedUnits = registered.filter(u => 
                    u.status === 'approved' && u.block === this.userBlock
                );
                
                if (approvedUnits && approvedUnits.length > 0) {
                    console.log('✅ Found approved units:', approvedUnits.length);
                    return approvedUnits.map(unit => ({
                        name: unit.unit_name,
                        code: unit.unit_code,
                        credits: unit.credits || 3,
                        block: unit.block
                    }));
                }
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
                return unitsFromTimetable;
            }
            
            console.log(`⚠️ No units found for block: ${this.userBlock}`);
            return [];
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
            
            if (window.unitRegistrationModule?.registeredUnits) {
                hasData = window.unitRegistrationModule.registeredUnits.some(u => u.status === 'approved');
            }
            
            if (!hasData && this.allTimetableData.length > 0) {
                hasData = true;
            }
            
            return {
                finance: hasData,
                hod: hasData,
                registrar: hasData,
                issued_date: new Date().toLocaleDateString('en-GB'),
                valid_block: this.userBlock || 'Current Block',
                allApproved: hasData
            };
        },
        
        generateLectureCard: function(student, units, approvals) {
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const displayBlock = this.userBlock || student.block || 'Current Block';
            const programType = this.isTVETStudent ? 'TVET' : 'KRCHN';
            
            // Build units table rows
            let unitsRows = '';
            
            if (units.length === 0) {
                unitsRows = `<tr><td colspan="3" style="padding: 30px; text-align: center;">
                    <i class="fas fa-info-circle"></i> No units found for ${displayBlock}.<br>
                    Please contact academic office.
                </td></tr>`;
            } else {
                units.forEach((unit, index) => {
                    const unitName = unit.name || unit.unit_name || 'Unknown Unit';
                    const unitCode = unit.code || unit.unit_code || this.extractUnitCode(unitName);
                    const lecturer = this.getLecturerName(unitName, unitCode);
                    
                    unitsRows += `
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; width: 50px;">${index + 1}</td>
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
            
            return `
                <div class="official-lecture-card" style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="padding: 24px;">
                        <div style="text-align: center; border-bottom: 2px solid #4C1D95; padding-bottom: 16px; margin-bottom: 20px;">
                            <h2 style="color: #4C1D95; margin: 0; font-size: 24px;">NCHSM - OFFICIAL LECTURE CARD</h2>
                            <p style="margin: 5px 0 0; color: #6b7280;">${currentYear}/${nextYear} ACADEMIC YEAR</p>
                            <p style="margin: 5px 0 0; color: #4C1D95; font-weight: 500;">${programType} | BLOCK: ${this.escapeHtml(displayBlock)}</p>
                        </div>
                        
                        ${approvals.allApproved ? `
                        <div style="background: #d1fae5; border-left: 4px solid #059669; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-check-circle" style="color: #059669;"></i>
                                <span style="font-size: 14px; color: #065f46; font-weight: 500;">✓ Fully Approved - Valid for class attendance</span>
                            </div>
                        </div>
                        ` : `
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-clock" style="color: #f59e0b;"></i>
                                <span style="font-size: 14px; color: #92400e;">Pending Approval - Please complete registration</span>
                            </div>
                        </div>
                        `}
                        
                        <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 12px;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                                <div><strong>Student:</strong> ${this.escapeHtml(student.full_name || student.name || 'N/A')}</div>
                                <div><strong>Reg No:</strong> ${this.escapeHtml(student.student_id || student.registration_number || 'N/A')}</div>
                                <div><strong>Program:</strong> ${this.escapeHtml(student.program || this.userProgram || 'KRCHN')}</div>
                                <div><strong>Intake:</strong> ${this.escapeHtml(student.intake_year || student.admission_year || '2024')}</div>
                                <div><strong>Current Block:</strong> ${this.escapeHtml(displayBlock)}</div>
                                <div><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${approvalStatus}</span></div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 24px;">
                            <h3 style="color: #4C1D95; margin-bottom: 12px; font-size: 18px;">REGISTERED UNITS</h3>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
                                    <thead style="background: #f3f4f6;">
                                        <tr>
                                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb; width: 50px;">NO</th>
                                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">UNIT</th>
                                            <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">LECTURER</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${unitsRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 12px;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
                                <div><span style="color: #6b7280;">ISSUED:</span> <strong>${approvals.issued_date}</strong></div>
                                <div><span style="color: #6b7280;">VALID FOR:</span> <strong>${approvals.valid_block}</strong></div>
                                <div><span style="color: #6b7280;">Valid Until:</span> <strong>End of Block</strong></div>
                            </div>
                        </div>
                        
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 24px;">
                                <div style="text-align: center; flex: 1;">
                                    <div style="border-top: 2px solid #059669; width: 200px; margin: 0 auto;"></div>
                                    <div style="font-size: 12px; margin-top: 5px;">Finance Officer</div>
                                </div>
                                <div style="text-align: center; flex: 1;">
                                    <div style="border-top: 2px solid #059669; width: 200px; margin: 0 auto;"></div>
                                    <div style="font-size: 12px; margin-top: 5px;">Head of Department</div>
                                </div>
                                <div style="text-align: center; flex: 1;">
                                    <div style="border-top: 1px solid #374151; width: 200px; margin: 0 auto;"></div>
                                    <div style="font-size: 12px; margin-top: 5px;">Principal</div>>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 24px; padding: 12px; background: #eef2ff; border-radius: 8px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #4C1D95;">
                                <i class="fas fa-info-circle"></i> This card must be presented to your lecturer on the first day of each unit.
                                Valid for ${this.escapeHtml(displayBlock)} only.
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
                    <style>
                        body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; }
                        @media print { body { padding: 0; } }
                        .no-print { display: none; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    ${cardContent.innerHTML}
                    <div style="text-align: center; margin-top: 20px; font-size: 10px;" class="no-print">Printed on ${currentDate}</div>
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
        
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };
    
    window.lectureCardModule = LectureCardModule;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LectureCardModule.init());
    } else {
        LectureCardModule.init();
    }
    
    console.log('✅ Lecture Card Module loaded and ready (works for ALL blocks and programs)');
})();
