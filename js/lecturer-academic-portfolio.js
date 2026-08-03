// ============================================================
// ACADEMIC PORTFOLIO MODULE - Phase 1 Implementation
// ============================================================
// File: js/lecturer-academic-portfolio.js
// ============================================================

const AcademicPortfolio = {
    currentTab: 'dashboard',
    currentCourse: null,
    currentScheme: null,
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
        this.setupNavigation();
        this.loadDashboard();
        this.setupEventListeners();
    },
    
    // ============================================================
    // NAVIGATION
    // ============================================================
    setupNavigation() {
        // Handle main tab click (from sidebar)
        document.querySelectorAll('[data-tab="academic-portfolio"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showTab('academic-portfolio');
                this.loadDashboard();
            });
        });
    },
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                showTab('academic-portfolio');
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
        // If month is before July (7), we're in the first half of the year
        if (month < 6) {
            return `${year - 1}/${year}`;
        }
        return `${year}/${year + 1}`;
    },
    
    getCurrentSemester() {
        const now = new Date();
        const month = now.getMonth();
        if (month < 6) return 2; // Jan-Jun = Semester 2
        return 1; // Jul-Dec = Semester 1
    },
    
    getRecentActivity() {
        // Placeholder - can be expanded with real data
        return [
            // { title: 'Created Scheme of Work', description: 'Nursing 101 - Block A', time: '2 hours ago', icon: 'fas fa-file-alt', color: '#d1fae5', iconColor: '#10b981' },
            // { title: 'Uploaded Lesson Plan', description: 'Week 3 - Maternal Health', time: '5 hours ago', icon: 'fas fa-chalkboard', color: '#dbeafe', iconColor: '#3b82f6' },
        ];
    },
    
    // ============================================================
    // TAB SWITCHING
    // ============================================================
    switchTab(tab) {
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
        this.switchTab(this.currentTab);
    },
    
    // ============================================================
    // DASHBOARD (Phase 1)
    // ============================================================
    async loadDashboard() {
        const container = document.getElementById('ap-content');
        if (!container) {
            console.warn('⚠️ ap-content container not found');
            return;
        }
        
        try {
            const user = await window.supabase?.auth?.getUser();
            if (!user?.data?.user) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #f59e0b;"></i>
                        <p style="margin-top: 15px;">Please log in to view your Academic Portfolio.</p>
                    </div>
                `;
                return;
            }
            
            const userId = user.data.user.id;
            
            // Fetch allocations with course details
            const { data: allocations, error: allocError } = await window.supabase
                .from('course_allocations')
                .select(`
                    *,
                    courses (id, title, code, credits)
                `)
                .eq('lecturer_id', userId)
                .eq('academic_year', this.getCurrentAcademicYear());
            
            if (allocError) throw allocError;
            
            // Get statistics
            const stats = {
                totalCourses: allocations?.length || 0,
                schemesCompleted: 0,
                lessonPlans: 0,
                pendingHOD: 0,
                approved: 0
            };
            
            // For each allocation, get scheme and lesson plan counts
            if (allocations && allocations.length > 0) {
                for (const alloc of allocations) {
                    // Count schemes
                    const { count: schemeCount } = await window.supabase
                        .from('schemes_of_work')
                        .select('*', { count: 'exact', head: true })
                        .eq('course_allocation_id', alloc.id);
                    
                    if (schemeCount && schemeCount > 0) {
                        stats.schemesCompleted += schemeCount;
                    }
                    
                    // Count lesson plans
                    const { count: lessonCount } = await window.supabase
                        .from('lesson_plans')
                        .select('*', { count: 'exact', head: true })
                        .eq('course_allocation_id', alloc.id);
                    
                    if (lessonCount) {
                        stats.lessonPlans += lessonCount;
                    }
                    
                    // Count pending HOD
                    const { count: pendingCount } = await window.supabase
                        .from('schemes_of_work')
                        .select('*', { count: 'exact', head: true })
                        .eq('course_allocation_id', alloc.id)
                        .eq('hod_approved', false)
                        .neq('status', 'rejected');
                    
                    if (pendingCount) {
                        stats.pendingHOD += pendingCount;
                    }
                    
                    // Count approved
                    const { count: approvedCount } = await window.supabase
                        .from('schemes_of_work')
                        .select('*', { count: 'exact', head: true })
                        .eq('course_allocation_id', alloc.id)
                        .eq('hod_approved', true);
                    
                    if (approvedCount) {
                        stats.approved += approvedCount;
                    }
                }
            }
            
            // Calculate completion percentage
            const totalItems = stats.totalCourses + stats.schemesCompleted + stats.lessonPlans;
            const completedItems = stats.approved;
            const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            
            // Generate recent activity
            const recentActivity = this.getRecentActivity();
            
            // Update stats in the header
            document.getElementById('apTotalSchemes').textContent = stats.schemesCompleted;
            document.getElementById('apTotalLessonPlans').textContent = stats.lessonPlans;
            document.getElementById('apPendingHOD').textContent = stats.pendingHOD;
            document.getElementById('apApprovedCount').textContent = stats.approved;
            document.getElementById('apCompletionStatus').textContent = completionPercent + '%';
            
            // Render dashboard
            container.innerHTML = `
                <div class="ap-dashboard">
                    <!-- Welcome Banner -->
                    <div style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 16px; padding: 24px 30px; margin-bottom: 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h3 style="margin: 0; font-size: 22px; font-weight: 700;">
                                <i class="fas fa-folder-open"></i> Academic Portfolio Dashboard
                            </h3>
                            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">
                                Manage your teaching documentation for ${this.getCurrentAcademicYear()}
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
                        <div id="apRecentActivity">
                            ${recentActivity.length > 0 ? 
                                recentActivity.map(activity => `
                                    <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${activity.color || '#d1fae5'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            <i class="${activity.icon || 'fas fa-file-alt'}" style="color: ${activity.iconColor || '#10b981'};"></i>
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-size: 14px; color: #1e293b; font-weight: 500;">${activity.title}</div>
                                            <div style="font-size: 12px; color: #94a3b8;">${activity.description || ''}</div>
                                        </div>
                                        <div style="font-size: 12px; color: #94a3b8; white-space: nowrap;">${activity.time || ''}</div>
                                    </div>
                                `).join('') :
                                '<div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">No recent activity. Start by creating your first scheme of work!</div>'
                            }
                        </div>
                    </div>
                </div>
            `;
            
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
    
    // ============================================================
    // PHASE 1: COURSE ALLOCATION
    // ============================================================
    async loadCourseAllocation() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-book" style="font-size: 40px; color: #10b981;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Course Allocation</h3>
                <p style="color: #94a3b8;">View and manage your assigned courses.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 1: Course allocation management coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    // ============================================================
    // PHASE 1: SCHEME OF WORK
    // ============================================================
    async loadSchemeOfWork() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-list-check" style="font-size: 40px; color: #10b981;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Scheme of Work</h3>
                <p style="color: #94a3b8;">Create and manage your course schemes of work.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">📌 Phase 1: Scheme of work management coming soon.</p>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="margin-top: 10px; background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    },
    
    // ============================================================
    // PHASE 1: LESSON PLANS
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
    
    // ============================================================
    // PHASE 2: TEACHING LOG
    // ============================================================
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
    
    // ============================================================
    // PHASE 2: MATERIALS
    // ============================================================
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
    
    // ============================================================
    // PHASE 3: ASSESSMENTS
    // ============================================================
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
    
    // ============================================================
    // PHASE 3: EXAMS
    // ============================================================
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
    
    // ============================================================
    // PHASE 3: ANALYSIS
    // ============================================================
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
    
    // ============================================================
    // PHASE 4: CLINICAL SUPERVISION
    // ============================================================
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
    
    // ============================================================
    // PHASE 4: EVALUATIONS
    // ============================================================
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
    
    // ============================================================
    // PHASE 4: REFLECTIONS
    // ============================================================
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
    
    // ============================================================
    // PHASE 4: REPORTS
    // ============================================================
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
    }
};

// ============================================================
// INITIALIZE ON PAGE LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize after other modules have loaded
    setTimeout(() => {
        if (typeof AcademicPortfolio !== 'undefined') {
            AcademicPortfolio.init();
            console.log('✅ Academic Portfolio initialized');
        }
    }, 1000);
});
