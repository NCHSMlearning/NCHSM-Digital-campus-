// lecture-card.js - Complete Lecture Card Module
// Handles official lecture card generation with HOD and Finance Officer approvals

(function() {
    'use strict';
    
    console.log('📚 Initializing Lecture Card Module...');
    
    const LectureCardModule = {
        // State variables
        currentData: null,
        
        // Sample lecturer mapping (in production, this would come from database)
        lecturerMap: {
            'Medical-Surgical Nursing IV': 'Dr. S. Wanjiku',
            'Community Health Nursing': 'Prof. J. Otieno',
            'Nursing Leadership': 'Mrs. A. Chepkirui',
            'Research Methods': 'Dr. P. Kimathi',
            'Anatomy & Physiology': 'Dr. Peter Kimathi',
            'Pharmacology': 'Prof. James Otieno',
            'Clinical Rotations': 'Matron Agnes',
            'Nursing Ethics': 'Rev. Michael Karanja'
        },
        
        // Initialize the module
        init: function() {
            console.log('✅ Lecture Card Module ready');
        },
        
        // Load lecture card data
        loadLectureCard: async function() {
            console.log('📖 Loading lecture card...');
            
            const container = document.getElementById('lecture-card-content');
            if (!container) return;
            
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
                const studentProfile = window.currentUserProfile || await this.getStudentProfile();
                const registeredUnits = await this.getRegisteredUnits();
                const approvals = await this.getApprovals();
                
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
                    refreshBtn.removeEventListener('click', this.loadLectureCard);
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
            
            // Fallback to localStorage or sample data
            const savedProfile = localStorage.getItem('nchsm_user_profile');
            if (savedProfile) {
                return JSON.parse(savedProfile);
            }
            
            // Return sample data (will be replaced by real data in production)
            return {
                full_name: 'JANE WANJIKA MWANGI',
                student_id: 'NCHSM/2024/01234',
                program: 'KRCHN',
                intake_year: '2024',
                block: 'BLOCK 4',
                admission_date: '2024-05-15'
            };
        },
        
        // Get registered units
        getRegisteredUnits: async function() {
            // Try to get from unit registration module
            if (window.unitRegistrationModule && window.unitRegistrationModule.getRegisteredUnits) {
                const units = await window.unitRegistrationModule.getRegisteredUnits();
                if (units && units.length > 0) {
                    return units;
                }
            }
            
            // Try from database
            if (window.db && window.db.supabase) {
                try {
                    const userId = window.currentUserId || window.db.currentUserId;
                    if (userId) {
                        const { data, error } = await window.db.supabase
                            .from('student_units')
                            .select('units(name, code, lecturer)')
                            .eq('student_id', userId)
                            .eq('status', 'approved');
                        
                        if (!error && data && data.length > 0) {
                            return data.map(item => item.units);
                        }
                    }
                } catch (e) {
                    console.warn('Could not fetch units from DB:', e);
                }
            }
            
            // Sample registered units (will be replaced by real data)
            return [
                { name: 'Medical-Surgical Nursing IV', code: 'MSN401', credits: 3 },
                { name: 'Community Health Nursing', code: 'CHN402', credits: 3 },
                { name: 'Nursing Leadership', code: 'NRL403', credits: 2 },
                { name: 'Research Methods', code: 'RSM404', credits: 2 }
            ];
        },
        
        // Get approvals (HOD and Finance Officer)
        getApprovals: async function() {
            // In production, fetch from database
            // For now, return sample approval status
            
            // Check if fees are cleared from attendance or profile module
            let financeApproved = false;
            let hodApproved = false;
            let registrarSigned = false;
            
            // Try to get fee status from various sources
            if (window.dashboardModule && window.dashboardModule.metrics) {
                const metrics = window.dashboardModule.metrics;
                financeApproved = metrics.examCard?.eligible || false;
            }
            
            // Check localStorage for approvals (for demo)
            const savedApprovals = localStorage.getItem('nchsm_lecture_card_approvals');
            if (savedApprovals) {
                const approvals = JSON.parse(savedApprovals);
                financeApproved = approvals.finance || financeApproved;
                hodApproved = approvals.hod || hodApproved;
                registrarSigned = approvals.registrar || registrarSigned;
            }
            
            return {
                finance: financeApproved,
                hod: hodApproved,
                registrar: registrarSigned,
                issued_date: new Date().toLocaleDateString('en-GB'),
                valid_block: 'BLOCK 4'
            };
        },
        
        // Get lecturer name for a unit
        getLecturerName: function(unitName) {
            return this.lecturerMap[unitName] || 'To be assigned';
        },
        
        // Generate the complete lecture card HTML
        generateLectureCard: function(student, units, approvals) {
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            
            // Build units table rows
            let unitsRows = '';
            units.forEach((unit, index) => {
                const unitName = unit.name || unit.unit_name || 'Unknown Unit';
                const lecturer = this.getLecturerName(unitName);
                unitsRows += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${index + 1}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${unitName}</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb;">${lecturer}</td>
                    </tr>
                `;
            });
            
            // If no units, show message
            if (units.length === 0) {
                unitsRows = `
                    <tr>
                        <td colspan="3" style="padding: 30px; text-align: center; color: #6b7280;">
                            <i class="fas fa-info-circle"></i> No registered units found. Please register units first.
                        </td>
                    </tr>
                `;
            }
            
            // Generate approval signatures HTML
            const financeSignature = approvals.finance ? 
                '<div style="margin-top: 20px;"><div style="border-top: 2px solid #059669; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #059669; margin-top: 5px;"><i class="fas fa-check-circle"></i> Finance Officer Approved</div></div>' :
                '<div style="margin-top: 20px;"><div style="border-top: 1px dashed #dc2626; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #dc2626; margin-top: 5px;">Pending Finance Officer Approval</div></div>';
            
            const hodSignature = approvals.hod ?
                '<div style="margin-top: 20px;"><div style="border-top: 2px solid #059669; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #059669; margin-top: 5px;"><i class="fas fa-check-circle"></i> HOD Approved</div></div>' :
                '<div style="margin-top: 20px;"><div style="border-top: 1px dashed #dc2626; width: 200px; margin: 0 auto;"></div><div style="font-size: 12px; color: #dc2626; margin-top: 5px;">Pending HOD Approval</div></div>';
            
            const allApproved = approvals.finance && approvals.hod;
            
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
                                <div><strong>Student:</strong> ${student.full_name || 'N/A'}</div>
                                <div><strong>Reg No:</strong> ${student.student_id || student.registration_number || 'N/A'}</div>
                                <div><strong>Program:</strong> ${student.program || 'KRCHN'}</div>
                                <div><strong>Intake:</strong> ${student.intake_year || student.admission_year || '2024'}</div>
                                <div><strong>Current Block:</strong> ${student.block || student.current_block || 'BLOCK 4'}</div>
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
                                    <strong>${approvals.issued_date || new Date().toLocaleDateString('en-GB')}</strong>
                                </div>
                                <div>
                                    <span style="color: #6b7280;">VALID FOR:</span>
                                    <strong>${approvals.valid_block || student.block || 'BLOCK 4'}</strong>
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
            const styles = document.querySelector('style')?.innerHTML || '';
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
