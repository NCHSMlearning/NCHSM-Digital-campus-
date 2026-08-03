// ============================================================
// ACADEMIC PORTFOLIO MODULE - Full Implementation
// ============================================================
// File: js/lecturer-academic-portfolio.js
// ============================================================

const AcademicPortfolio = {
    currentTab: 'dashboard',
    currentCourse: null,
    currentScheme: null,
    lecturerId: null,
    data: {
        schemes: [],
        lessonPlans: [],
        allocations: [],
        materials: [],
        logs: []
    },
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        console.log('📁 Academic Portfolio initializing...');
        
        // Get lecturer ID
        this.lecturerId = this.getLecturerId();
        console.log('👤 Lecturer ID:', this.lecturerId);
        
        this.setupNavigation();
        this.loadDashboard();
        this.setupEventListeners();
        
        console.log('✅ Academic Portfolio initialized successfully');
    },
    
    getLecturerId() {
        // Try multiple sources for lecturer ID
        if (window.CORRECT_LECTURER_ID) {
            return window.CORRECT_LECTURER_ID;
        }
        
        if (window.lecturerDB && window.lecturerDB.getCurrentUserProfile) {
            const profile = window.lecturerDB.getCurrentUserProfile();
            if (profile) {
                return profile.user_id || profile.id;
            }
        }
        
        // Try from localStorage
        const saved = localStorage.getItem('lecturerId');
        if (saved) return saved;
        
        // Try from supabase session
        if (window.supabase) {
            const session = window.supabase.auth.session();
            if (session && session.user) {
                return session.user.id;
            }
        }
        
        return null;
    },
    
    // ============================================================
    // NAVIGATION
    // ============================================================
    setupNavigation() {
        // Handle main tab click (from sidebar)
        document.querySelectorAll('[data-tab="academic-portfolio"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.showTab === 'function') {
                    window.showTab('academic-portfolio');
                }
                this.loadDashboard();
            });
        });
        
        // Handle sub-tab clicks - re-bind after each render
        this.bindSubTabs();
    },
    
    bindSubTabs() {
        document.querySelectorAll('.ap-tab-btn').forEach(btn => {
            // Remove existing listeners to avoid duplicates
            btn.removeEventListener('click', this._handleSubTabClick);
            btn.addEventListener('click', this._handleSubTabClick.bind(this));
        });
    },
    
    _handleSubTabClick(e) {
        const btn = e.currentTarget;
        const tab = btn.dataset.apTab;
        if (tab) {
            this.switchTab(tab);
        }
    },
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.loadDashboard();
            }
        });
    },
    
    // ============================================================
    // UTILITY METHODS
    // ============================================================
    getCurrentAcademicYear() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        if (month < 6) {
            return `${year - 1}/${year}`;
        }
        return `${year}/${year + 1}`;
    },
    
    getCurrentSemester() {
        const now = new Date();
        const month = now.getMonth();
        if (month < 6) return 2;
        return 1;
    },
    
    // ============================================================
    // TAB SWITCHING
    // ============================================================
    switchTab(tab) {
        console.log('🔄 Switching to Academic Portfolio tab:', tab);
        this.currentTab = tab;
        
        // Update tab button styles
        document.querySelectorAll('.ap-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#475569';
            if (btn.dataset.apTab === tab) {
                btn.classList.add('active');
                btn.style.background = '#10b981';
                btn.style.color = 'white';
            }
        });
        
        // Load appropriate content
        switch(tab) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'course-allocation':
                this.loadCourseAllocation();
                break;
            case 'scheme-of-work':
                this.loadSchemeOfWork();
                break;
            case 'lesson-plans':
                this.loadLessonPlans();
                break;
            case 'teaching-log':
                this.loadTeachingLog();
                break;
            case 'materials':
                this.loadMaterials();
                break;
            case 'assessments':
                this.loadAssessments();
                break;
            case 'exams':
                this.loadExams();
                break;
            case 'analysis':
                this.loadAnalysis();
                break;
            case 'clinical':
                this.loadClinical();
                break;
            case 'evaluations':
                this.loadEvaluations();
                break;
            case 'reflections':
                this.loadReflections();
                break;
            case 'reports':
                this.loadReports();
                break;
            default:
                this.loadDashboard();
        }
    },
    
    // ============================================================
    // REFRESH
    // ============================================================
    refresh() {
        console.log('🔄 Refreshing Academic Portfolio...');
        this.switchTab(this.currentTab);
    },
    
    // ============================================================
    // DASHBOARD
    // ============================================================
    async loadDashboard() {
        const container = document.getElementById('ap-content');
        if (!container) {
            console.warn('⚠️ ap-content container not found');
            return;
        }
        
        try {
            // Check authentication
            const user = await this.getCurrentUser();
            if (!user) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #f59e0b;"></i>
                        <p style="margin-top: 15px;">Please log in to view your Academic Portfolio.</p>
                    </div>
                `;
                return;
            }
            
            const userId = this.lecturerId || user.id;
            
            // Fetch lecturer's subject assignments
            const { data: assignments, error: assignError } = await window.supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', userId);
            
            if (assignError) throw assignError;
            
            // Get statistics
            const stats = await this.getPortfolioStats(assignments);
            
            // Update stats in the header
            this.updateStatsDisplay(stats);
            
            // Render dashboard
            container.innerHTML = this.renderDashboardHTML(stats);
            
            // Re-bind sub-tab events
            this.bindSubTabs();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #ef4444;">
                    <i class="fas fa-exclamation-circle" style="font-size: 40px;"></i>
                    <p style="margin-top: 15px;">Error loading dashboard: ${error.message}</p>
                    <button onclick="AcademicPortfolio.refresh()" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    },
    
    async getCurrentUser() {
        try {
            const { data, error } = await window.supabase.auth.getUser();
            if (error) throw error;
            return data?.user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },
    
    async getPortfolioStats(assignments) {
        const stats = {
            totalCourses: assignments?.length || 0,
            schemesCompleted: 0,
            lessonPlans: 0,
            pendingHOD: 0,
            approved: 0,
            teachingLogs: 0,
            materials: 0
        };
        
        if (assignments && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id);
            
            // Count schemes
            const { count: schemeCount } = await window.supabase
                .from('schemes_of_work')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (schemeCount) stats.schemesCompleted = schemeCount;
            
            // Count lesson plans
            const { count: lessonCount } = await window.supabase
                .from('lesson_plans')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (lessonCount) stats.lessonPlans = lessonCount;
            
            // Count pending HOD
            const { count: pendingCount } = await window.supabase
                .from('schemes_of_work')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds)
                .eq('hod_approved', false)
                .neq('status', 'rejected');
            
            if (pendingCount) stats.pendingHOD = pendingCount;
            
            // Count approved
            const { count: approvedCount } = await window.supabase
                .from('schemes_of_work')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds)
                .eq('hod_approved', true);
            
            if (approvedCount) stats.approved = approvedCount;
            
            // Count teaching logs
            const { count: logCount } = await window.supabase
                .from('teaching_logs')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (logCount) stats.teachingLogs = logCount;
            
            // Count materials
            const { count: materialCount } = await window.supabase
                .from('teaching_materials')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (materialCount) stats.materials = materialCount;
        }
        
        return stats;
    },
    
    updateStatsDisplay(stats) {
        const completionPercent = this.calculateCompletion(stats);
        
        document.getElementById('apTotalSchemes').textContent = stats.schemesCompleted;
        document.getElementById('apTotalLessonPlans').textContent = stats.lessonPlans;
        document.getElementById('apPendingHOD').textContent = stats.pendingHOD;
        document.getElementById('apApprovedCount').textContent = stats.approved;
        document.getElementById('apCompletionStatus').textContent = completionPercent + '%';
    },
    
    calculateCompletion(stats) {
        const totalItems = stats.totalCourses + stats.schemesCompleted + stats.lessonPlans;
        const completedItems = stats.approved;
        return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    },
    
    renderDashboardHTML(stats) {
        const completionPercent = this.calculateCompletion(stats);
        const academicYear = this.getCurrentAcademicYear();
        
        return `
            <div class="ap-dashboard">
                <!-- Welcome Banner -->
                <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; padding: 24px 30px; margin-bottom: 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <h3 style="margin: 0; font-size: 22px; font-weight: 700;">
                            <i class="fas fa-folder-open"></i> Academic Portfolio Dashboard
                        </h3>
                        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">
                            Manage your teaching documentation for ${academicYear}
                        </p>
                    </div>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="text-align: center;">
                            <div style="font-size: 28px; font-weight: 800;">${completionPercent}%</div>
                            <div style="font-size: 12px; opacity: 0.8;">Complete</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 28px; font-weight: 800;">${stats.pendingHOD}</div>
                            <div style="font-size: 12px; opacity: 0.8;">Pending HOD</div>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; border-left: 4px solid #10b981;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #d1fae5; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-book" style="color: #10b981; font-size: 18px;"></i>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 800; color: #0A3D62;">${stats.totalCourses}</div>
                                <div style="font-size: 12px; color: #6b7280;">Courses</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; border-left: 4px solid #3b82f6;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #dbeafe; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-file-alt" style="color: #3b82f6; font-size: 18px;"></i>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 800; color: #0A3D62;">${stats.schemesCompleted}</div>
                                <div style="font-size: 12px; color: #6b7280;">Schemes</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; border-left: 4px solid #8b5cf6;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #ede9fe; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-chalkboard-teacher" style="color: #8b5cf6; font-size: 18px;"></i>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 800; color: #0A3D62;">${stats.lessonPlans}</div>
                                <div style="font-size: 12px; color: #6b7280;">Lesson Plans</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: white; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; border-left: 4px solid #f59e0b;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #fef3c7; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-clock" style="color: #f59e0b; font-size: 18px;"></i>
                            </div>
                            <div>
                                <div style="font-size: 24px; font-weight: 800; color: #0A3D62;">${stats.pendingHOD}</div>
                                <div style="font-size: 12px; color: #6b7280;">Pending HOD</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; margin-bottom: 24px;">
                    <h4 style="margin: 0 0 16px 0; color: #0A3D62; font-size: 15px;">
                        <i class="fas fa-bolt" style="color: #10b981;"></i> Quick Actions
                    </h4>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button onclick="AcademicPortfolio.switchTab('scheme-of-work')" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-plus"></i> New Scheme
                        </button>
                        <button onclick="AcademicPortfolio.switchTab('lesson-plans')" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-plus"></i> New Lesson Plan
                        </button>
                        <button onclick="AcademicPortfolio.switchTab('teaching-log')" style="background: #8b5cf6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-pen"></i> Log Teaching
                        </button>
                        <button onclick="AcademicPortfolio.switchTab('materials')" style="background: #f59e0b; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-upload"></i> Upload Material
                        </button>
                    </div>
                </div>
                
                <!-- Recent Activity -->
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                    <h4 style="margin: 0 0 16px 0; color: #0A3D62; font-size: 15px;">
                        <i class="fas fa-clock" style="color: #10b981;"></i> Recent Activity
                    </h4>
                    <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">
                        <i class="fas fa-info-circle" style="display: block; font-size: 24px; margin-bottom: 10px;"></i>
                        No recent activity yet. Start building your Academic Portfolio!
                    </div>
                </div>
            </div>
        `;
    },
    
    // ============================================================
    // PHASE 1: COURSE ALLOCATION
    // ============================================================
    async loadCourseAllocation() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                container.innerHTML = `<div style="text-align: center; padding: 60px;">Please log in.</div>`;
                return;
            }
            
            const userId = this.lecturerId || user.id;
            
            const { data: assignments, error } = await window.supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', userId);
            
            if (error) throw error;
            
            container.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="color: #0A3D62; margin-bottom: 20px;">Course Allocation</h3>
                    ${assignments && assignments.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
                            ${assignments.map(assignment => `
                                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e5e7eb;">
                                    <h4 style="margin: 0 0 4px 0; color: #0A3D62;">${assignment.subject_name}</h4>
                                    <p style="margin: 0; color: #64748b; font-size: 14px;">${assignment.subject_code || 'No code'}</p>
                                    <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                                        <span style="background: #dbeafe; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">${assignment.program}</span>
                                        <span style="background: #d1fae5; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">${assignment.block}</span>
                                        <span style="background: #fef3c7; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #92400e;">${assignment.academic_year || '2025'}</span>
                                    </div>
                                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                                        <button onclick="AcademicPortfolio.switchTab('scheme-of-work')" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                            <i class="fas fa-file-alt"></i> Scheme
                                        </button>
                                        <button onclick="AcademicPortfolio.switchTab('lesson-plans')" style="background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                            <i class="fas fa-chalkboard"></i> Lesson Plans
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-book" style="font-size: 40px; display: block; margin-bottom: 16px;"></i>
                            <p>No course allocations found.</p>
                        </div>
                    `}
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 20px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading course allocation:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <p>Error loading course allocation: ${error.message}</p>
                    <button onclick="AcademicPortfolio.loadCourseAllocation()" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    },
    
    // ============================================================
    // PHASE 1: SCHEME OF WORK
    // ============================================================
    async loadSchemeOfWork() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                container.innerHTML = `<div style="text-align: center; padding: 60px;">Please log in.</div>`;
                return;
            }
            
            const userId = this.lecturerId || user.id;
            
            // Get lecturer's assignments
            const { data: assignments } = await window.supabase
                .from('lecturer_subject_assignments')
                .select('id, subject_name, subject_code')
                .eq('lecturer_id', userId);
            
            const assignmentIds = assignments?.map(a => a.id) || [];
            
            // Get schemes
            const { data: schemes, error } = await window.supabase
                .from('schemes_of_work')
                .select('*')
                .in('lecturer_subject_assignment_id', assignmentIds)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            container.innerHTML = `
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                        <h3 style="color: #0A3D62; margin: 0;">Scheme of Work</h3>
                        <button onclick="AcademicPortfolio.createNewScheme()" style="background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-plus"></i> New Scheme
                        </button>
                    </div>
                    
                    ${schemes && schemes.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px;">
                            ${schemes.map(scheme => `
                                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; border-left: 4px solid ${scheme.hod_approved ? '#10b981' : scheme.status === 'rejected' ? '#ef4444' : '#f59e0b'};">
                                    <h4 style="margin: 0 0 4px 0; color: #0A3D62;">${scheme.title}</h4>
                                    <p style="margin: 0; color: #64748b; font-size: 13px;">${scheme.description || 'No description'}</p>
                                    <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                                        <span style="background: ${scheme.hod_approved ? '#d1fae5' : scheme.status === 'rejected' ? '#fee2e2' : '#fef3c7'}; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: ${scheme.hod_approved ? '#065f46' : scheme.status === 'rejected' ? '#991b1b' : '#92400e'};">
                                            ${scheme.hod_approved ? '✅ Approved' : scheme.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                        </span>
                                        <span style="background: #dbeafe; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">${scheme.total_weeks || 14} weeks</span>
                                        <span style="background: #ede9fe; padding: 2px 12px; border-radius: 12px; font-size: 12px; color: #5b21b6;">${scheme.academic_year || '2025'}</span>
                                    </div>
                                    <div style="margin-top: 12px; display: flex; gap: 8px;">
                                        <button onclick="AcademicPortfolio.viewScheme('${scheme.id}')" style="background: #4C1D95; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                        <button onclick="AcademicPortfolio.editScheme('${scheme.id}')" style="background: #f59e0b; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-list-check" style="font-size: 40px; display: block; margin-bottom: 16px;"></i>
                            <p>No schemes of work created yet.</p>
                            <button onclick="AcademicPortfolio.createNewScheme()" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                                <i class="fas fa-plus"></i> Create Your First Scheme
                            </button>
                        </div>
                    `}
                    
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 20px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading schemes:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <p>Error loading schemes: ${error.message}</p>
                    <button onclick="AcademicPortfolio.loadSchemeOfWork()" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    },
    
    // ============================================================
    // PLACEHOLDER METHODS FOR OTHER TABS
    // ============================================================
    async loadLessonPlans() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-chalkboard" style="font-size: 40px; color: #3b82f6;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Lesson Plans</h3>
                <p style="color: #94a3b8;">Create and manage your lesson plans for each course.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 1: Lesson plan management coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadTeachingLog() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-pen" style="font-size: 40px; color: #8b5cf6;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Teaching Log</h3>
                <p style="color: #94a3b8;">Log your daily teaching activities and reflections.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 2: Teaching log coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadMaterials() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-file-upload" style="font-size: 40px; color: #f59e0b;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Teaching Materials</h3>
                <p style="color: #94a3b8;">Upload and manage your teaching resources and materials.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 2: Materials management coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadAssessments() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-check-double" style="font-size: 40px; color: #10b981;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Assessments</h3>
                <p style="color: #94a3b8;">Manage student assessments and evaluations.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 3: Assessment management coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadExams() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-file-signature" style="font-size: 40px; color: #f59e0b;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Exams</h3>
                <p style="color: #94a3b8;">Manage your exam blueprints and schedules.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 3: Exam management coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadAnalysis() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-chart-bar" style="font-size: 40px; color: #3b82f6;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Results Analysis</h3>
                <p style="color: #94a3b8;">Analyze student performance and results.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 3: Results analysis coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadClinical() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-stethoscope" style="font-size: 40px; color: #10b981;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Clinical Supervision</h3>
                <p style="color: #94a3b8;">Manage clinical supervision and practicum records.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 4: Clinical supervision coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadEvaluations() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-star" style="font-size: 40px; color: #f59e0b;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Student Evaluations</h3>
                <p style="color: #94a3b8;">View and manage student evaluations and feedback.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 4: Student evaluations coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadReflections() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-comment" style="font-size: 40px; color: #8b5cf6;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Reflections</h3>
                <p style="color: #94a3b8;">Document your teaching reflections and self-assessments.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 4: Reflections coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    async loadReports() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-file-pdf" style="font-size: 40px; color: #dc2626;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Portfolio Reports</h3>
                <p style="color: #94a3b8;">Generate and export comprehensive portfolio reports.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 4: Portfolio reports coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    createNewScheme() {
        alert('📝 Scheme creation will be implemented in Phase 2.\n\nPlease check back soon!');
    },
    
    viewScheme(id) {
        alert('👁️ View scheme functionality coming soon.\n\nScheme ID: ' + id);
    },
    
    editScheme(id) {
        alert('✏️ Edit scheme functionality coming soon.\n\nScheme ID: ' + id);
    }
};

// ============================================================
// MAKE GLOBALLY AVAILABLE
// ============================================================
window.AcademicPortfolio = AcademicPortfolio;

// ============================================================
// AUTO-INITIALIZE ON PAGE LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready - checking for Academic Portfolio initialization...');
    
    // Wait for other modules to load
    const checkInterval = setInterval(() => {
        if (window.lecturerDB && window.lecturerDB.isInitialized) {
            clearInterval(checkInterval);
            console.log('✅ lecturerDB ready, initializing Academic Portfolio...');
            setTimeout(() => {
                if (typeof AcademicPortfolio !== 'undefined') {
                    AcademicPortfolio.init();
                    console.log('✅ Academic Portfolio initialized successfully!');
                } else {
                    console.error('❌ AcademicPortfolio not found!');
                }
            }, 300);
        }
    }, 500);
    
    // Fallback - initialize after 3 seconds even if lecturerDB not ready
    setTimeout(() => {
        if (typeof AcademicPortfolio !== 'undefined' && !AcademicPortfolio.initialized) {
            console.log('⏳ Fallback: Initializing Academic Portfolio...');
            AcademicPortfolio.init();
        }
    }, 3000);
});

console.log('📁 Academic Portfolio module loaded');
