// courses.js - Shows APPROVED and COMPLETED units from student_unit_registrations
// UPDATED to show completion status with proper filtering

(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading approved and completed units from registrations...');
    
    class CoursesModule {
        constructor() {
            console.log('📚 CoursesModule initialized');
            
            // Store data
            this.approvedUnits = [];
            this.completedUnits = [];
            this.allRegistrations = [];
            this.userProfile = null;
            this.loaded = false;
            this.currentFilter = 'all';
            
            // User data
            this.programCode = null;
            this.intakeYear = null;
            this.userBlock = null;
            this.userTerm = null;
            this.isTVETStudent = false;
            
            // DOM elements
            this.cacheElements();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Set up login event listeners
            this.setupLoginListeners();
            
            // Try to load if user is already logged in
            setTimeout(() => this.tryLoadIfLoggedIn(), 1500);
        }
        
        // ============================================
        // 📦 CACHE DOM ELEMENTS
        // ============================================
        
        cacheElements() {
            this.activeCoursesGrid = document.getElementById('active-courses-grid');
            this.completedTable = document.getElementById('completed-courses-table');
            this.programIndicator = document.getElementById('courses-program-indicator');
            this.refreshBtn = document.getElementById('refresh-courses-btn');
            this.viewAllBtn = document.getElementById('view-all-courses');
            this.viewActiveBtn = document.getElementById('view-active-only');
            this.viewCompletedBtn = document.getElementById('view-completed-only');
            
            // Stats elements
            this.activeCount = document.getElementById('active-courses-count');
            this.completedCount = document.getElementById('completed-courses-count');
            this.totalCredits = document.getElementById('total-credits');
            this.activeCountText = document.getElementById('active-count');
            this.overallGpa = document.getElementById('overall-gpa');
            this.completedCountText = document.getElementById('completed-count');
            
            console.log('✅ Courses module elements cached');
        }
        
        // ============================================
        // 👤 LOGIN LISTENERS
        // ============================================
        
        setupLoginListeners() {
            document.addEventListener('userLoggedIn', (e) => {
                console.log('🎉 USER LOGGED IN EVENT RECEIVED!');
                this.userProfile = e.detail?.userProfile;
                this.updateUserData();
                this.loadCourses();
            });
            
            document.addEventListener('userProfileUpdated', (e) => {
                if (e.detail?.userProfile) {
                    this.userProfile = e.detail.userProfile;
                    this.updateUserData();
                    if (!this.loaded) {
                        this.loadCourses();
                    }
                }
            });
            
            document.addEventListener('unitRegistrationReady', (e) => {
                console.log('📚 Unit registration updated, refreshing courses...');
                if (this.userProfile) {
                    this.loadCourses();
                }
            });
            
            document.addEventListener('unitStatusUpdated', (e) => {
                console.log('🔄 Unit status updated, refreshing courses...');
                if (this.userProfile) {
                    this.loadCourses();
                }
            });
            
            document.addEventListener('appReady', () => {
                console.log('🚀 App ready event received');
                this.tryLoadIfLoggedIn();
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromAnySource();
            
            if (profile) {
                console.log('✅ User already logged in:', profile.full_name || profile.email);
                this.userProfile = profile;
                this.updateUserData();
                this.loadCourses();
            } else {
                console.log('⏳ No user profile found yet, waiting for login...');
                this.showWaitingForLogin();
            }
        }
        
        getUserProfileFromAnySource() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => window.unitRegistrationModule?.userProfile,
                () => {
                    try {
                        return JSON.parse(localStorage.getItem('userProfile'));
                    } catch (e) {
                        return null;
                    }
                }
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.full_name || profile.email || profile.id || profile.user_id)) {
                        return profile;
                    }
                } catch (e) {
                    console.log('⚠️ Profile source error:', e.message);
                }
            }
            
            return null;
        }
        
        // ============================================
        // 🔧 USER DATA UPDATE
        // ============================================
        
        updateUserData() {
            if (this.userProfile) {
                const programFromProfile = this.userProfile.program || 'KRCHN';
                this.intakeYear = this.userProfile.intake_year || 2025;
                this.programCode = programFromProfile;
                
                const tvetPrograms = ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                                      'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                                      'ACH', 'AAG', 'ASW', 'CCA', 'PTE'];
                this.isTVETStudent = tvetPrograms.includes(programFromProfile);
                
                if (this.isTVETStudent) {
                    this.userTerm = this.userProfile.term || this.userProfile.block || 'Term1';
                    this.userBlock = null;
                } else {
                    this.userBlock = this.userProfile.block || 'A';
                    this.userTerm = null;
                }
                
                console.log('🎯 User data updated:', {
                    program: this.programCode,
                    type: this.isTVETStudent ? 'TVET' : 'KRCHN',
                    blockTerm: this.isTVETStudent ? this.userTerm : this.userBlock
                });
                
                return true;
            }
            return false;
        }
        
        // ============================================
        // 🎛️ EVENT LISTENERS
        // ============================================
        
        initializeEventListeners() {
            if (this.refreshBtn) {
                this.refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.userProfile) {
                        this.showError('Please log in first');
                        return;
                    }
                    this.loadCourses();
                });
            }
            
            if (this.viewAllBtn) {
                this.viewAllBtn.addEventListener('click', () => {
                    this.currentFilter = 'all';
                    this.applyFilterAndDisplay();
                });
            }
            if (this.viewActiveBtn) {
                this.viewActiveBtn.addEventListener('click', () => {
                    this.currentFilter = 'active';
                    this.applyFilterAndDisplay();
                });
            }
            if (this.viewCompletedBtn) {
                this.viewCompletedBtn.addEventListener('click', () => {
                    this.currentFilter = 'completed';
                    this.applyFilterAndDisplay();
                });
            }
        }
        
        // ============================================
        // 📥 LOAD COURSES
        // ============================================
        
        async loadCourses() {
            console.log('📥 Loading approved and completed units...');
            
            if (!this.userProfile) {
                this.showError('Please log in to view courses');
                return;
            }
            
            this.showLoading();
            
            try {
                if (!this.updateUserData()) {
                    throw new Error('Failed to update user data');
                }
                
                const supabase = window.db?.supabase;
                const studentId = this.userProfile?.user_id || this.userProfile?.id;
                
                if (!supabase || !studentId) {
                    throw new Error('Database connection or student ID not available');
                }
                
                // Get ALL registrations (approved and completed)
                let query = supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', studentId);
                
                const { data: registrations, error: regError } = await query
                    .order('unit_code', { ascending: true });
                
                if (regError) throw regError;
                
                this.allRegistrations = registrations || [];
                
                // ✅ NEW: Separate into approved and completed based on status
                this.approvedUnits = this.allRegistrations.filter(r => 
                    r.status === 'approved' && r.completion_status !== 'completed'
                );
                this.completedUnits = this.allRegistrations.filter(r => 
                    r.completion_status === 'completed' || r.status === 'completed' || (r.grade && r.grade !== '')
                );
                
                console.log(`✅ Found ${this.approvedUnits.length} approved units, ${this.completedUnits.length} completed units`);
                
                // Update stats
                this.updateStats();
                
                // Display the courses based on current filter
                this.applyFilterAndDisplay();
                
                this.loaded = true;
                this.dispatchModuleReadyEvent();
                
                // Also trigger dashboard update
                document.dispatchEvent(new CustomEvent('studentStatsUpdated', {
                    detail: { 
                        approvedUnits: this.approvedUnits.length,
                        completedUnits: this.completedUnits.length
                    }
                }));
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
            }
        }
        
        // ============================================
        // 📊 UPDATE STATS
        // ============================================
        
        updateStats() {
            console.log('📊 Updating course module statistics...');
            
            // Calculate total credits for approved units
            let totalCredits = 0;
            for (const unit of this.approvedUnits) {
                totalCredits += unit.credits || 3;
            }
            
            // Calculate total credits for completed units
            let completedCredits = 0;
            for (const unit of this.completedUnits) {
                completedCredits += unit.credits || 3;
            }
            
            // Calculate overall GPA (from grades if available)
            const gpa = this.calculateOverallGPA();
            
            // Update DOM elements
            if (this.activeCount) {
                this.activeCount.innerText = this.approvedUnits.length;
                console.log(`   Updated active count to: ${this.approvedUnits.length}`);
            }
            
            if (this.completedCount) {
                this.completedCount.innerText = this.completedUnits.length;
                console.log(`   Updated completed count to: ${this.completedUnits.length}`);
            }
            
            if (this.completedCountText) {
                this.completedCountText.innerText = this.completedUnits.length + ' units';
            }
            
            if (this.totalCredits) {
                this.totalCredits.innerText = totalCredits + completedCredits;
                console.log(`   Updated total credits to: ${totalCredits + completedCredits}`);
            }
            
            if (this.activeCountText) {
                this.activeCountText.innerText = this.approvedUnits.length + ' units';
            }
            
            if (this.overallGpa) {
                this.overallGpa.innerText = gpa.toFixed(1);
            }
            
            console.log(`📊 Stats updated: ${this.approvedUnits.length} active, ${this.completedUnits.length} completed, ${totalCredits + completedCredits} credits`);
        }
        
        calculateOverallGPA() {
            // Calculate from completed units that have grades
            const gradedUnits = this.completedUnits.filter(u => u.grade);
            if (gradedUnits.length === 0) return 0;
            
            const passGrades = ['A', 'B', 'C'];
            const totalPoints = gradedUnits.reduce((sum, u) => {
                if (passGrades.includes(u.grade)) return sum + 4;
                return sum + 0; // Failed units get 0 points
            }, 0);
            
            return (totalPoints / gradedUnits.length);
        }
        
        // ============================================
        // 🎨 APPLY FILTER AND DISPLAY
        // ============================================
        
        applyFilterAndDisplay() {
            switch(this.currentFilter) {
                case 'completed':
                    this.showCompletedCourses();
                    break;
                case 'active':
                    this.showActiveCourses();
                    break;
                default:
                    this.showAllCourses();
            }
            this.updateFilterButtons();
        }
        
        // ============================================
        // 📊 DISPLAY ALL COURSES
        // ============================================
        
        showAllCourses() {
            this.currentFilter = 'all';
            this.displayActiveCourses();
            this.updateFilterButtons();
        }
        
        showActiveCourses() {
            this.currentFilter = 'active';
            this.displayActiveCourses();
            this.updateFilterButtons();
        }
        
        // ============================================
        // 📊 DISPLAY ACTIVE COURSES
        // ============================================
        
        displayActiveCourses() {
            if (!this.activeCoursesGrid) return;
            
            if (this.approvedUnits.length === 0 && this.completedUnits.length === 0) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-book-open" style="font-size: 36px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                        <h4 style="color: #1e293b; margin: 0;">No Units Found</h4>
                        <p style="margin: 4px 0 16px 0;">You don't have any approved units yet.</p>
                        <button onclick="window.location.href='#hub-register'" style="padding: 10px 24px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                            <i class="fas fa-plus-circle"></i> Register Units
                        </button>
                    </div>
                `;
                return;
            }
            
            let unitsToShow = this.approvedUnits;
            
            const blockTermLabel = this.isTVETStudent ? 'Term' : 'Block';
            const blockTermValue = this.isTVETStudent ? this.userTerm : this.userBlock;
            
            let html = '';
            for (const unit of unitsToShow) {
                const isSupplementary = unit.reg_type === 'Supplementary' || unit.reg_type === 'Retake';
                const regBadge = isSupplementary ? 
                    `<span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 4px;">${unit.reg_type}</span>` : '';
                
                // Show grade if available
                const hasGrade = unit.grade && unit.grade !== '';
                const gradeDisplay = hasGrade ? 
                    `<span style="background: ${this.getGradeColor(unit.grade)}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">${unit.grade}</span>` : '';
                
                html += `
                    <div class="course-card" style="background: white; border-radius: 12px; padding: 16px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
                            <span style="background: #4C1D95; color: white; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">${this.escapeHtml(unit.unit_code)}</span>
                            <span style="background: #dbeafe; color: #1e40af; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">⏳ Approved</span>
                            ${gradeDisplay}
                        </div>
                        
                        <h4 style="margin: 8px 0 6px 0; color: #0A3D62; font-size: 15px; font-weight: 600;">${this.escapeHtml(unit.unit_name)}</h4>
                        
                        <div style="margin-bottom: 8px;">
                            <span class="program-badge ${this.isTVETStudent ? 'badge-tvet' : 'badge-krchn'}" style="background: ${this.isTVETStudent ? '#805AD5' : '#3182CE'}; color: white; padding: 2px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas ${this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap'}"></i> 
                                ${this.programCode} Program
                            </span>
                            ${regBadge}
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; font-size: 12px; color: #64748b;">
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas ${this.isTVETStudent ? 'fa-calendar-alt' : 'fa-th-large'}" style="color: #4C1D95; width: 16px;"></i>
                                ${blockTermLabel}: ${unit.block || blockTermValue || 'General'}
                            </span>
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-tag" style="color: #4C1D95; width: 16px;"></i>
                                ${unit.reg_type || 'Normal'}
                            </span>
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-star" style="color: #f59e0b; width: 16px;"></i>
                                ${unit.credits || 3} Credits
                            </span>
                            <span style="display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-check-circle" style="color: #10b981; width: 16px;"></i>
                                ${unit.approval_date || 'N/A'}
                            </span>
                        </div>
                        
                        ${hasGrade ? `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #475569;">
                            <i class="fas fa-chart-line" style="color: #4C1D95;"></i>
                            Grade: <strong>${unit.grade}</strong>
                            ${unit.total_score ? ` · Score: ${unit.total_score}%` : ''}
                        </div>
                        ` : ''}
                    </div>
                `;
            }
            
            this.activeCoursesGrid.innerHTML = html;
        }
        
        // ============================================
        // 📊 SHOW COMPLETED COURSES
        // ============================================
        
        showCompletedCourses() {
            this.currentFilter = 'completed';
            
            if (this.completedUnits.length === 0) {
                if (this.activeCoursesGrid) {
                    this.activeCoursesGrid.innerHTML = `
                        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #94a3b8;">
                            <i class="fas fa-check-circle" style="font-size: 48px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                            <h4 style="color: #1e293b; margin: 0;">No Completed Units Yet</h4>
                            <p style="margin: 4px 0 0 0;">Complete your active units to see them here.</p>
                            <button onclick="window.coursesModule.showActiveCourses()" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                                View Active Units
                            </button>
                        </div>
                    `;
                }
                this.updateFilterButtons();
                return;
            }
            
            // Display completed units in a table
            let html = `
                <div style="grid-column: 1 / -1; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="overflow-x: auto; padding: 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f8fafc; border-bottom: 2px solid #e5e7eb;">
                                <tr>
                                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569;">Unit Code</th>
                                    <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569;">Unit Name</th>
                                    <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569;">Credits</th>
                                    <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569;">Grade</th>
                                    <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569;">Status</th>
                                    <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569;">Completion Date</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            for (const unit of this.completedUnits) {
                const isSupplementary = unit.reg_type === 'Supplementary' || unit.reg_type === 'Retake';
                const regBadge = isSupplementary ? 
                    `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600;">${unit.reg_type}</span>` : '';
                
                const gradeColor = this.getGradeColor(unit.grade);
                const isPassing = unit.grade && !['FAIL', 'F', 'D', 'E', ''].includes(unit.grade);
                const completedDate = unit.completed_at ? new Date(unit.completed_at).toLocaleDateString() : 'N/A';
                const statusBadge = isPassing ? 
                    '<span style="background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">🟢 Passed</span>' :
                    '<span style="background: #fee2e2; color: #991b1b; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">🔴 Failed</span>';
                
                html += `
                    <tr style="border-bottom: 1px solid #e5e7eb; transition: background 0.2s;" 
                        onmouseover="this.style.background='#f8fafc'" 
                        onmouseout="this.style.background='transparent'">
                        <td style="padding: 12px 16px; text-align: left; font-weight: 600; color: #0A3D62;">
                            ${this.escapeHtml(unit.unit_code)}
                            ${regBadge}
                        </td>
                        <td style="padding: 12px 16px; text-align: left;">${this.escapeHtml(unit.unit_name)}</td>
                        <td style="padding: 12px 16px; text-align: center;">${unit.credits || 3}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
                                ${unit.grade || '-'}
                            </span>
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; color: ${isPassing ? '#065f46' : '#991b1b'}; padding: 2px 12px; border-radius: 12px; font-weight: 600; font-size: 11px;">
                                ${isPassing ? '✅ Passed' : '❌ Failed'}
                            </span>
                        </td>
                        <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            ${completedDate}
                        </td>
                    </tr>
                `;
            }
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            this.activeCoursesGrid.innerHTML = html;
            this.updateFilterButtons();
        }
        
        updateFilterButtons() {
            if (this.viewAllBtn) {
                this.viewAllBtn.classList.toggle('active', this.currentFilter === 'all');
                if (this.currentFilter === 'all') {
                    this.viewAllBtn.style.background = 'linear-gradient(135deg, #0A3D62, #1a5a7a)';
                    this.viewAllBtn.style.color = 'white';
                } else {
                    this.viewAllBtn.style.background = '#f1f5f9';
                    this.viewAllBtn.style.color = '#475569';
                }
            }
            if (this.viewActiveBtn) {
                this.viewActiveBtn.classList.toggle('active', this.currentFilter === 'active');
                if (this.currentFilter === 'active') {
                    this.viewActiveBtn.style.background = 'linear-gradient(135deg, #0A3D62, #1a5a7a)';
                    this.viewActiveBtn.style.color = 'white';
                } else {
                    this.viewActiveBtn.style.background = '#f1f5f9';
                    this.viewActiveBtn.style.color = '#475569';
                }
            }
            if (this.viewCompletedBtn) {
                this.viewCompletedBtn.classList.toggle('active', this.currentFilter === 'completed');
                if (this.currentFilter === 'completed') {
                    this.viewCompletedBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
                    this.viewCompletedBtn.style.color = 'white';
                } else {
                    this.viewCompletedBtn.style.background = '#f1f5f9';
                    this.viewCompletedBtn.style.color = '#475569';
                }
            }
        }
        
        // ============================================
        // 🎨 HELPER FUNCTIONS
        // ============================================
        
        getGradeColor(grade) {
            const colors = {
                'A': '#10b981',
                'B': '#3b82f6',
                'C': '#f59e0b',
                'D': '#f97316',
                'F': '#ef4444',
                'FAIL': '#ef4444'
            };
            return colors[grade] || '#6b7280';
        }
        
        // ============================================
        // 🔄 UTILITY FUNCTIONS
        // ============================================
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${this.programCode} Program
                    </span>
                `;
            }
        }
        
        showLoading() {
            if (this.activeCoursesGrid) {
                this.activeCoursesGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                        <div style="width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                        <p style="margin: 0;">Loading your approved units...</p>
                    </div>
                `;
            }
        }
        
        showError(message) {
            if (this.activeCoursesGrid) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626; margin-bottom: 15px; display: block;"></i>
                        <p style="color: #dc2626;">${message}</p>
                        <button onclick="window.coursesModule.loadCourses()" style="margin-top: 15px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                            Try Again
                        </button>
                    </div>
                `;
            }
        }
        
        showWaitingForLogin() {
            if (this.activeCoursesGrid && !this.loaded) {
                this.activeCoursesGrid.innerHTML = `
                    <div class="waiting-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #4C1D95; margin-bottom: 15px; display: block;"></i>
                        <p style="color: #64748b;">Please log in to view your units</p>
                    </div>
                `;
            }
        }
        
        dispatchModuleReadyEvent() {
            const event = new CustomEvent('coursesModuleReady', {
                detail: {
                    courses: this.allRegistrations,
                    activeCount: this.approvedUnits.length,
                    completedCount: this.completedUnits.length,
                    totalCredits: this.approvedUnits.reduce((sum, u) => sum + (u.credits || 3), 0),
                    isTVETStudent: this.isTVETStudent,
                    programCode: this.programCode,
                    intakeYear: this.intakeYear,
                    block: this.userBlock,
                    term: this.userTerm,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
        }
        
        getActiveCourseCount() {
            return this.approvedUnits.length;
        }
        
        getAllCourses() {
            return this.approvedUnits;
        }
        
        refresh() {
            this.loaded = false;
            this.loadCourses();
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        getStudentProgramInfo() {
            return {
                programCode: this.programCode,
                programType: this.isTVETStudent ? 'TVET' : 'KRCHN',
                intakeYear: this.intakeYear,
                block: this.userBlock,
                term: this.userTerm
            };
        }
    }
    
    // ============================================
    // 🚀 CREATE GLOBAL INSTANCE
    // ============================================
    
    window.coursesModule = new CoursesModule();
    
    // Global functions
    window.getActiveCourseCount = () => window.coursesModule?.getActiveCourseCount() || 0;
    window.getAllCourses = () => window.coursesModule?.getAllCourses() || [];
    window.loadCourses = () => window.coursesModule?.refresh();
    window.getCoursesProgramInfo = () => window.coursesModule?.getStudentProgramInfo() || {};
    
    // Expose for external use
    window.coursesModule = window.coursesModule || {
        getActiveCourseCount: () => 0,
        getAllCourses: () => [],
        refresh: () => {}
    };
    
    console.log('✅ Courses module ready - shows approved and completed units with working stats!');
})();
