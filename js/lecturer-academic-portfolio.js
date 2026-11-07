// ============================================================
// ACADEMIC PORTFOLIO MODULE - Fixed Authentication
// ============================================================
// File: js/lecturer-academic-portfolio.js
// ============================================================

const AcademicPortfolio = {
    currentTab: 'dashboard',
    currentCourse: null,
    currentScheme: null,
    lecturerId: null,
    lecturerUuid: null,
    assignedUnits: [],
    initialized: false,
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
        if (this.initialized) {
            console.log('📁 Academic Portfolio already initialized');
            return;
        }
        
        console.log('📁 Academic Portfolio initializing...');
        
        // Resolve lecturer ID using the same method as LecturerExams
        this.resolveLecturerId().then(() => {
            if (!this.lecturerId) {
                console.warn('⚠️ No lecturer ID found - showing login message');
                this.showLoginMessage();
                return;
            }
            
            this.setupNavigation();
            this.loadDashboard();
            this.setupEventListeners();
            this.initialized = true;
            console.log('✅ Academic Portfolio initialized successfully');
            console.log('👤 Lecturer ID:', this.lecturerId);
            console.log('🔑 Lecturer UUID:', this.lecturerUuid);
        });
    },
    
    // ============================================================
    // RESOLVE LECTURER ID - SAME AS LecturerExams
    // ============================================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const authId = profile.user_id;
            const fullName = profile.full_name;
            
            console.log('🔍 Auth ID (UUID):', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Store UUID
            this.lecturerUuid = authId;
            
            // Find all lecturer IDs by name
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!assignError && assignments && assignments.length > 0) {
                console.log('📋 Found lecturer assignments by name:', assignments);
                
                // Try to find STAFF ID first (non-UUID)
                const staffId = assignments.find(a => {
                    const id = a.lecturer_id;
                    return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
                });
                
                if (staffId) {
                    this.lecturerId = staffId.lecturer_id;
                    console.log('✅ Found STAFF ID:', this.lecturerId);
                } else {
                    this.lecturerId = assignments[0].lecturer_id;
                    console.log('⚠️ Using first match ID:', this.lecturerId);
                }
                
                // Also try STAFF102 directly if not found
                if (!this.lecturerId || this.lecturerId === authId) {
                    const { data: staffCheck } = await supabase
                        .from('lecturer_subject_assignments')
                        .select('lecturer_id')
                        .eq('lecturer_id', 'STAFF102')
                        .limit(1);
                    
                    if (staffCheck && staffCheck.length > 0) {
                        this.lecturerId = 'STAFF102';
                        console.log('✅ Found STAFF102 directly:', this.lecturerId);
                    }
                }
                
                // Load assigned units
                await this.loadAssignedUnits();
                return;
            }
            
            // Fallback to auth ID
            this.lecturerId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerId = null;
            this.lecturerUuid = null;
        }
    },
    
    // ============================================================
    // LOAD ASSIGNED UNITS
    // ============================================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('⚠️ Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('⚠️ No lecturer profile found');
                return;
            }
            
            const fullName = profile.full_name;
            console.log('🔍 Loading assigned units for academic portfolio:', fullName);
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('id, subject_name, subject_code, block, program, academic_year, lecturer_id')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (error) {
                console.error('❌ Error loading assigned units:', error);
                this.assignedUnits = [];
                return;
            }
            
            // Filter to KRCHN program
            const krchnUnits = assignments?.filter(u => u.program === 'KRCHN') || [];
            const allUnits = assignments || [];
            this.assignedUnits = krchnUnits.length > 0 ? krchnUnits : allUnits;
            
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units:`, 
                this.assignedUnits.map(u => `${u.subject_name} (${u.lecturer_id})`));
            
        } catch (error) {
            console.error('❌ Failed to load assigned units:', error);
            this.assignedUnits = [];
        }
    },
    
    showLoginMessage() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #f59e0b;"></i>
                <h3 style="color: #1e293b; margin-top: 15px;">Please Log In</h3>
                <p style="color: #94a3b8;">You need to be logged in to view your Academic Portfolio.</p>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">If you are already logged in, please refresh the page.</p>
                <button onclick="window.location.reload()" style="margin-top: 20px; background: #4C1D95; color: white; border: none; padding: 10px 30px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    <i class="fas fa-sync-alt"></i> Refresh Page
                </button>
            </div>
        `;
    },
    
    // ============================================================
    // NAVIGATION
    // ============================================================
    setupNavigation() {
        document.querySelectorAll('[data-tab="academic-portfolio"]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.showTab === 'function') {
                    window.showTab('academic-portfolio');
                }
                this.loadDashboard();
            });
        });
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
            case 'records-submissions':
                if (window.LecturerAcademicRecords?.open) window.LecturerAcademicRecords.open();
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
    // DASHBOARD - FIXED with proper authentication
    // ============================================================
    async loadDashboard() {
        const container = document.getElementById('ap-content');
        if (!container) {
            console.warn('⚠️ ap-content container not found');
            return;
        }
        
        // Check if we have a lecturer ID
        if (!this.lecturerId) {
            this.showLoginMessage();
            return;
        }
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Get lecturer's subject assignments
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', this.lecturerId);
            
            if (assignError) throw assignError;
            
            // Get statistics
            const stats = await this.getPortfolioStats(supabase, assignments);
            
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
    
    bindSubTabs() {
        document.querySelectorAll('.ap-tab-btn').forEach(btn => {
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
    
    async getPortfolioStats(supabase, assignments) {
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
            const { count: schemeCount } = await supabase
                .from('schemes_of_work')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (schemeCount) stats.schemesCompleted = schemeCount;
            
            // Count lesson plans
            const { count: lessonCount } = await supabase
                .from('lesson_plans')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (lessonCount) stats.lessonPlans = lessonCount;
            
            // Count pending HOD
            const { count: pendingCount } = await supabase
                .from('schemes_of_work')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds)
                .eq('hod_approved', false)
                .neq('status', 'rejected');
            
            if (pendingCount) stats.pendingHOD = pendingCount;
            
            // Count approved
            const { count: approvedCount } = await supabase
                .from('schemes_of_work')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds)
                .eq('hod_approved', true);
            
            if (approvedCount) stats.approved = approvedCount;
            
            // Count teaching logs
            const { count: logCount } = await supabase
                .from('teaching_logs')
                .select('*', { count: 'exact', head: true })
                .in('lecturer_subject_assignment_id', assignmentIds);
            
            if (logCount) stats.teachingLogs = logCount;
            
            // Count materials
            const { count: materialCount } = await supabase
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
        const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const lecturerName = esc(window.currentLecturerProfile?.full_name || window.currentLecturerProfile?.name || window.currentUser?.full_name || 'Lecturer');
        const recordsTotal = Number(stats.schemesCompleted || 0) + Number(stats.lessonPlans || 0) + Number(stats.teachingLogs || 0) + Number(stats.materials || 0);
        const pending = Number(stats.pendingHOD || 0);
        const approved = Number(stats.approved || 0);
        const tab = (id, label, icon) => `<button type="button" class="ap-modern-tab" data-ap-tab="${id}"><i class="fas ${icon}"></i><span>${label}</span></button>`;
        return `
        <style id="ap-modern-dashboard-style">
          #ap-content{color:#101b3b}
          .ap-modern{max-width:1500px;margin:0 auto;padding:2px 0 28px;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
          .ap-modern-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin:4px 0 22px}
          .ap-modern-title{display:flex;align-items:center;gap:14px;min-width:0}
          .ap-modern-folder{width:58px;height:58px;display:grid;place-items:center;border-radius:16px;background:#eef2ff;color:#273c91;font-size:28px;flex:0 0 auto}
          .ap-modern-head h2{font-size:clamp(21px,2.3vw,30px);line-height:1.15;margin:0;color:#101b3b;font-weight:800;letter-spacing:-.6px}
          .ap-modern-head p{margin:6px 0 0;color:#64748b;font-size:13px}
          .ap-modern-context{display:flex;gap:9px;flex-wrap:wrap}
          .ap-modern-chip{border:1px solid #dbe3f2;border-radius:11px;background:#fff;padding:10px 13px;color:#172554;font-size:12px;font-weight:700}
          .ap-modern-tabs{display:flex;align-items:center;overflow-x:auto;gap:3px;padding:5px;margin-bottom:20px;background:#fff;border:1px solid #dce3f0;border-radius:13px;scrollbar-width:thin}
          .ap-modern-tab{flex:1 0 auto;display:flex;align-items:center;justify-content:center;gap:9px;min-height:48px;padding:10px 14px;border:0;border-radius:9px;background:transparent;color:#17213e;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}
          .ap-modern-tab:hover{background:#f1f5ff;color:#4338ca}
          .ap-modern-tab[data-ap-tab="dashboard"]{background:#4f25ad;color:#fff}
          .ap-modern-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:18px}
          .ap-modern-stat{display:flex;align-items:center;gap:13px;min-width:0;padding:18px;border:1px solid #e0e7f3;border-radius:14px;background:#fff;box-shadow:0 3px 14px rgba(15,23,42,.045)}
          .ap-modern-stat-icon{width:54px;height:54px;flex:0 0 54px;border-radius:50%;display:grid;place-items:center;font-size:22px}
          .ap-modern-stat strong{display:block;font-size:27px;line-height:1.05;color:#101b3b}
          .ap-modern-stat span{display:block;margin-top:5px;color:#475569;font-size:12px}
          .ap-modern-lower{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}
          .ap-modern-card{min-width:0;background:#fff;border:1px solid #dfe6f2;border-radius:15px;padding:19px;box-shadow:0 3px 14px rgba(15,23,42,.04)}
          .ap-modern-card h3{display:flex;align-items:center;gap:10px;margin:0 0 17px;color:#101b3b;font-size:17px;font-weight:800}
          .ap-modern-card h3 i{color:#6d35d5}
          .ap-modern-progress{height:13px;background:#e5e9f1;border-radius:30px;overflow:hidden;margin:18px 0 12px}
          .ap-modern-progress span{display:block;height:100%;width:${completionPercent}%;background:linear-gradient(90deg,#16b85d,#0b9b52);border-radius:30px}
          .ap-modern-progress-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#475569;font-size:12px}
          .ap-modern-link{border:1px solid #d8d2fb;background:#f7f5ff;color:#4321a0;border-radius:10px;padding:9px 14px;font-weight:800;cursor:pointer}
          .ap-modern-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
          .ap-modern-action{min-height:105px;border:1px solid #e4ddfb;border-radius:13px;background:#f7f3ff;color:#4c1d95;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px 7px;text-align:center;font-size:12px;font-weight:800;cursor:pointer}
          .ap-modern-action i{font-size:23px}
          .ap-modern-action:nth-child(2){background:#eff6ff;border-color:#cfe0ff;color:#2563eb}
          .ap-modern-action:nth-child(3){background:#effbf5;border-color:#d2f2e0;color:#059669}
          .ap-modern-action:nth-child(4){background:#fff2f7;border-color:#f8d8e7;color:#db2777}
          .ap-modern-lists{display:grid;grid-template-columns:1fr 1fr;gap:16px}
          .ap-modern-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #e8edf5}
          .ap-modern-row:last-child{border-bottom:0}
          .ap-modern-row-icon{width:42px;height:42px;flex:0 0 42px;border-radius:12px;background:#eef2ff;color:#4f46e5;display:grid;place-items:center}
          .ap-modern-row strong{display:block;color:#17213e;font-size:12px}
          .ap-modern-row small{display:block;margin-top:4px;color:#64748b;font-size:11px}
          .ap-modern-empty{padding:24px 10px;text-align:center;color:#94a3b8;font-size:12px}
          .ap-modern-empty i{display:block;font-size:23px;margin-bottom:8px}
          @media(max-width:900px){.ap-modern-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ap-modern-lower,.ap-modern-lists{grid-template-columns:1fr}}
          @media(max-width:560px){.ap-modern{padding-bottom:20px}.ap-modern-head{align-items:flex-start}.ap-modern-folder{width:46px;height:46px;font-size:22px}.ap-modern-context{width:100%}.ap-modern-chip{flex:1}.ap-modern-grid{gap:9px}.ap-modern-stat{padding:13px;gap:9px}.ap-modern-stat-icon{width:42px;height:42px;flex-basis:42px;font-size:18px}.ap-modern-stat strong{font-size:22px}.ap-modern-stat span{font-size:11px}.ap-modern-card{padding:15px}.ap-modern-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.ap-modern-action{min-height:88px}}
        </style>
        <div class="ap-modern">
          <header class="ap-modern-head">
            <div class="ap-modern-title"><div class="ap-modern-folder"><i class="fas fa-folder-open"></i></div><div><h2>Academic Portfolio</h2><p>Manage your teaching documentation, records and academic reports in one workspace.</p></div></div>
            <div class="ap-modern-context"><div class="ap-modern-chip"><i class="fas fa-layer-group"></i> Academic Year: ${esc(academicYear)}</div><div class="ap-modern-chip"><i class="fas fa-user-tie"></i> ${lecturerName}</div></div>
          </header>
          <nav class="ap-modern-tabs" aria-label="Academic Portfolio sections">
            <button type="button" class="ap-modern-tab" data-ap-tab="dashboard"><i class="fas fa-th-large"></i><span>Overview</span></button>
            ${tab('scheme-of-work','Teaching Plan','fa-book-open')}
            ${tab('lesson-plans','Lesson Plans','fa-file-alt')}
            ${tab('records-submissions','Records','fa-layer-group')}
            ${tab('assessments','Assessments','fa-clipboard-check')}
            ${tab('reports','Reports','fa-chart-column')}
          </nav>
          <div class="ap-modern-grid">
            <div class="ap-modern-stat"><div class="ap-modern-stat-icon" style="background:#e7f0ff;color:#2563eb"><i class="fas fa-book-open"></i></div><div><strong>${Number(stats.totalCourses||0)}</strong><span>Units Assigned</span></div></div>
            <div class="ap-modern-stat"><div class="ap-modern-stat-icon" style="background:#e3f8ef;color:#059669"><i class="fas fa-file-alt"></i></div><div><strong>${recordsTotal}</strong><span>Portfolio Items</span></div></div>
            <div class="ap-modern-stat"><div class="ap-modern-stat-icon" style="background:#fff3df;color:#d97706"><i class="fas fa-clock"></i></div><div><strong>${pending}</strong><span>Pending HOD Review</span></div></div>
            <div class="ap-modern-stat"><div class="ap-modern-stat-icon" style="background:#f0eaff;color:#6d28d9"><i class="fas fa-check-circle"></i></div><div><strong>${approved}</strong><span>Approved Schemes</span></div></div>
          </div>
          <div class="ap-modern-lower">
            <section class="ap-modern-card">
              <h3><i class="fas fa-bullseye"></i> Portfolio Completion <span style="margin-left:auto;font-size:24px">${completionPercent}%</span></h3>
              <div class="ap-modern-progress" role="progressbar" aria-valuenow="${completionPercent}" aria-valuemin="0" aria-valuemax="100"><span></span></div>
              <div class="ap-modern-progress-meta"><span>${approved} approved scheme records out of ${Number(stats.totalCourses||0)+Number(stats.schemesCompleted||0)+Number(stats.lessonPlans||0)} tracked items</span><button class="ap-modern-link" type="button" data-ap-tab="records-submissions">View Records</button></div>
            </section>
            <section class="ap-modern-card">
              <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
              <div class="ap-modern-actions">
                <button class="ap-modern-action" type="button" data-ap-tab="records-submissions"><i class="fas fa-cloud-upload-alt"></i><span>Upload Record</span></button>
                <button class="ap-modern-action" type="button" data-ap-tab="reports"><i class="fas fa-chart-line"></i><span>Generate Report</span></button>
                <button class="ap-modern-action" type="button" data-ap-tab="lesson-plans"><i class="fas fa-file-circle-plus"></i><span>New Lesson Plan</span></button>
                <button class="ap-modern-action" type="button" data-ap-tab="teaching-log"><i class="fas fa-calendar-check"></i><span>Log Teaching</span></button>
              </div>
            </section>
          </div>
          <div class="ap-modern-lists">
            <section class="ap-modern-card"><h3><i class="fas fa-history"></i> Recent Activity</h3><div class="ap-modern-empty"><i class="fas fa-info-circle"></i>Activity entries will appear here as your portfolio records are submitted and updated.</div></section>
            <section class="ap-modern-card"><h3><i class="fas fa-calendar-alt"></i> Portfolio Tasks</h3>
              <div class="ap-modern-row"><div class="ap-modern-row-icon"><i class="fas fa-file-upload"></i></div><div><strong>Review your pending submissions</strong><small>${pending} item(s) awaiting HOD review</small></div></div>
              <div class="ap-modern-row"><div class="ap-modern-row-icon"><i class="fas fa-book-open"></i></div><div><strong>Keep teaching plans up to date</strong><small>${Number(stats.schemesCompleted||0)} scheme(s) currently recorded</small></div></div>
              <div class="ap-modern-row"><div class="ap-modern-row-icon"><i class="fas fa-chalkboard-teacher"></i></div><div><strong>Maintain lesson documentation</strong><small>${Number(stats.lessonPlans||0)} lesson plan(s) currently recorded</small></div></div>
            </section>
          </div>
        </div>`;
    },
    
    // ============================================================
    // PHASE 1: COURSE ALLOCATION
    // ============================================================
    async loadCourseAllocation() {
        const container = document.getElementById('ap-content');
        if (!container) return;
        
        if (!this.lecturerId) {
            this.showLoginMessage();
            return;
        }
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', this.lecturerId);
            
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
        
        if (!this.lecturerId) {
            this.showLoginMessage();
            return;
        }
        
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                throw new Error('Database connection not available');
            }
            
            // Get lecturer's assignments
            const { data: assignments } = await supabase
                .from('lecturer_subject_assignments')
                .select('id, subject_name, subject_code')
                .eq('lecturer_id', this.lecturerId);
            
            const assignmentIds = assignments?.map(a => a.id) || [];
            
            // Get schemes
            const { data: schemes, error } = await supabase
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
            <div style="max-width:1050px;margin:0 auto;padding:8px 2px 24px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:18px;">
                    <div><div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Academic Portfolio</div>
                    <h3 style="margin:5px 0;color:#172033;font-size:21px;">Reports &amp; Records</h3>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">One workspace for academic document submissions and a separate workspace for generating and exporting performance reports.</p></div>
                    <button onclick="AcademicPortfolio.switchTab('dashboard')" style="border:1px solid #dbe3ed;background:#fff;color:#334155;padding:9px 13px;border-radius:9px;font-weight:700;cursor:pointer;"><i class="fas fa-arrow-left"></i> Portfolio</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px;">
                    <button type="button" onclick="AcademicPortfolio.switchTab('records-submissions')" style="text-align:left;border:1px solid #dbeafe;background:linear-gradient(135deg,#f8fbff,#fff);padding:19px;border-radius:14px;cursor:pointer;color:#172033;">
                        <span style="display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:10px;background:#dbeafe;color:#1d4ed8;"><i class="fas fa-folder-open"></i></span>
                        <strong style="display:block;margin:13px 0 5px;font-size:15px;">Academic Records</strong>
                        <span style="display:block;color:#64748b;font-size:12px;line-height:1.55;">Upload schemes, lesson plans, assessment records, examination documents and clinical records. Submit once and track review decisions.</span>
                        <span style="display:block;margin-top:13px;color:#1d4ed8;font-size:12px;font-weight:800;">Open Records <i class="fas fa-arrow-right"></i></span>
                    </button>
                    <button type="button" onclick="document.querySelector('[data-tab=reports]')?.click()" style="text-align:left;border:1px solid #d1fae5;background:linear-gradient(135deg,#f3fcf8,#fff);padding:19px;border-radius:14px;cursor:pointer;color:#172033;">
                        <span style="display:flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:10px;background:#d1fae5;color:#047857;"><i class="fas fa-chart-column"></i></span>
                        <strong style="display:block;margin:13px 0 5px;font-size:15px;">Report Generator</strong>
                        <span style="display:block;color:#64748b;font-size:12px;line-height:1.55;">Generate, analyse, preview, print and export grade books, unit performance, attendance, at-risk student and clinical reports.</span>
                        <span style="display:block;margin-top:13px;color:#047857;font-size:12px;font-weight:800;">Open Report Generator <i class="fas fa-arrow-right"></i></span>
                    </button>
                </div>
                <div style="margin-top:15px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.55;"><i class="fas fa-circle-info"></i> Document approval and submission tracking are handled in Academic Records. The Report Generator remains focused on analytics and exports, preventing duplicate submission workflows.</div>
            </div>`;
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
// EXPOSE FUNCTIONS GLOBALLY
// ============================================================
window.loadAcademicPortfolio = () => AcademicPortfolio.loadDashboard();
window.refreshAcademicPortfolio = () => AcademicPortfolio.refresh();
window.switchAcademicPortfolioTab = (tab) => AcademicPortfolio.switchTab(tab);

console.log('📁 Academic Portfolio module loaded - Fixed authentication');

// ============================================================
// INITIALIZE ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready - initializing Academic Portfolio...');
    
    // Wait for lecturerDB to be ready
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
    
    // Fallback - initialize after 3 seconds
    setTimeout(() => {
        if (typeof AcademicPortfolio !== 'undefined' && !AcademicPortfolio.initialized) {
            console.log('⏳ Fallback: Initializing Academic Portfolio...');
            AcademicPortfolio.init();
        }
    }, 3000);
});
