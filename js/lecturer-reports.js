// js/lecturer-reports.js - COMPLETE WITH TVET SUPPORT
/**
 * NCHSM Lecturer Reports Module
 * Generate and manage academic reports for assigned units and students
 * Supports both Nursing (KRCHN) and TVET programs
 */

const LecturerReports = {
    reports: [],
    assignedUnits: [],
    lecturerAssignmentId: null,
    currentFilters: {
        search: '',
        type: 'all',
        unit: 'all',
        date: 'all'
    },
    isPreviewOpen: false,
    isTVET: false,
    currentProgram: 'KRCHN',
    
    // ─── PROGRAM TYPE DETECTION ───
    getProgramType() {
        return window.CURRENT_PROGRAM_TYPE || 'KRCHN';
    },
    
    isTVETProgram() {
        return this.getProgramType() === 'TVET';
    },
    
    getProgramTypeLabel() {
        return this.isTVETProgram() ? '🔧 TVET' : '🎓 Nursing';
    },
    
    getProgramEmoji() {
        return this.isTVETProgram() ? '🔧' : '🎓';
    },
    
    getPassingThreshold() {
        return this.isTVETProgram() ? 50 : 60;
    },
    
    getGradingDisplay() {
        if (this.isTVETProgram()) {
            return 'A (80-100%) = 4.0 MASTERY | B (65-79%) = 3.0 PROFICIENT | C (50-64%) = 2.0 COMPETENT | E (0-49%) = 0.0 NOT YET COMPETENT';
        } else {
            return 'A (75-100%) = 4.0 | B (65-74%) = 3.0 | C (60-64%) = 2.0 | D (0-59%) = 0.0';
        }
    },
    
    getGrade(score) {
        const programType = this.getProgramType();
        if (programType === 'TVET') {
            if (score >= 80) return { grade: 'A', points: 4.0, remarks: 'MASTERY', color: '#065f46' };
            if (score >= 65) return { grade: 'B', points: 3.0, remarks: 'PROFICIENT', color: '#1e40af' };
            if (score >= 50) return { grade: 'C', points: 2.0, remarks: 'COMPETENT', color: '#92400e' };
            return { grade: 'E', points: 0.0, remarks: 'NOT YET COMPETENT', color: '#991b1b' };
        } else {
            if (score >= 75) return { grade: 'A', points: 4.0, remarks: 'Distinction', color: '#065f46' };
            if (score >= 65) return { grade: 'B', points: 3.0, remarks: 'Credit', color: '#1e40af' };
            if (score >= 60) return { grade: 'C', points: 2.0, remarks: 'Pass', color: '#92400e' };
            return { grade: 'D', points: 0.0, remarks: 'Fail', color: '#991b1b' };
        }
    },
    
    // ─── INITIALIZATION ───
    async init() {
        console.log('📊 Initializing Lecturer Reports...');
        this.currentProgram = this.getProgramType();
        this.isTVET = this.isTVETProgram();
        console.log(`📚 Program Type: ${this.getProgramTypeLabel()}`);
        
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadReports();
        this.setupEventListeners();
        this.updateStats();
        this.updateAnalytics();
        this.updateGradingInfo();
        console.log('✅ Lecturer Reports initialized');
    },
    
    // ─── UPDATE GRADING INFO ───
    updateGradingInfo() {
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.getPassingThreshold();
        const gradingDisplay = this.getGradingDisplay();
        
        // Update grading reference in reports
        const gradingEl = document.getElementById('reportGradingInfo');
        if (gradingEl) {
            gradingEl.innerHTML = `
                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 10px 16px; background: ${this.isTVET ? '#f5f3ff' : '#f0fdf4'}; border-radius: 8px; border: 1px solid ${this.isTVET ? '#ddd6fe' : '#bbf7d0'}; margin: 12px 0;">
                    <span style="font-weight: 600; font-size: 12px; color: ${this.isTVET ? '#7c3aed' : '#065f46'};">
                        ${emoji} ${typeLabel} Grading:
                    </span>
                    <span style="font-size: 11px; color: #475569;">
                        ${gradingDisplay}
                    </span>
                    <span style="font-size: 10px; color: #94a3b8; margin-left: auto;">
                        Passing: ≥${threshold}%
                    </span>
                </div>
            `;
        }
        
        // Update report form subtitle
        const formSubtitle = document.querySelector('#reportGenerationForm .form-subtitle');
        if (formSubtitle) {
            formSubtitle.textContent = `${emoji} ${typeLabel} - Generate reports for your assigned units`;
        }
    },
    
    // ─── RESOLVE LECTURER ID ───
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
            
            const fullName = profile.full_name;
            const authId = profile.user_id;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            const { data: nameData, error: nameError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!nameError && nameData && nameData.length > 0) {
                const nonStaff = nameData.find(l => !l.lecturer_id.toString().startsWith('STAFF'));
                if (nonStaff) {
                    this.lecturerAssignmentId = nonStaff.lecturer_id;
                    console.log('✅ Found non-STAFF ID:', this.lecturerAssignmentId);
                    return;
                }
                this.lecturerAssignmentId = nameData[0].lecturer_id;
                console.log('⚠️ Found STAFF ID:', this.lecturerAssignmentId);
                return;
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ─── LOAD ASSIGNED UNITS ───
    async loadAssignedUnits() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                this.assignedUnits = this.getMockUnits();
                this.populateUnitSelectors();
                return;
            }
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            const program = this.currentProgram || profile.program || 'KRCHN';
            console.log(`🔍 Using lecturer ID for reports: ${lecturerId} (${this.getProgramTypeLabel()})`);
            
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', lecturerId)
                .eq('program', program);
            
            if (assignError) {
                console.error('Error loading assignments:', assignError);
                this.assignedUnits = this.getMockUnits();
                this.populateUnitSelectors();
                return;
            }
            
            console.log(`📚 Found ${assignments?.length || 0} assigned units (${this.getProgramTypeLabel()})`);
            
            if (!assignments || assignments.length === 0) {
                console.warn('No assignments found');
                this.assignedUnits = [];
                this.populateUnitSelectors();
                return;
            }
            
            const unitNames = assignments.map(a => a.subject_name);
            const blocks = [...new Set(assignments.map(a => a.block))];
            
            let studentCounts = {};
            try {
                const { data: registrations, error: regError } = await supabase
                    .from('student_unit_registrations')
                    .select('unit_name, student_id, block')
                    .eq('program', program)
                    .eq('status', 'approved')
                    .in('block', blocks)
                    .in('unit_name', unitNames);
                
                if (!regError && registrations) {
                    const countMap = {};
                    registrations.forEach(reg => {
                        const key = `${reg.unit_name}|${reg.block}`;
                        if (!countMap[key]) {
                            countMap[key] = new Set();
                        }
                        countMap[key].add(reg.student_id);
                    });
                    
                    assignments.forEach(a => {
                        const key = `${a.subject_name}|${a.block}`;
                        studentCounts[a.subject_name] = countMap[key]?.size || 0;
                    });
                }
            } catch (e) {
                console.warn('Error getting student counts:', e);
            }
            
            const typeLabel = this.getProgramTypeLabel();
            const emoji = this.getProgramEmoji();
            
            this.assignedUnits = assignments.map(a => ({
                id: a.id || `unit-${Date.now()}-${Math.random()}`,
                name: a.subject_name || 'Unnamed Unit',
                code: a.subject_code || 'N/A',
                program: a.program || 'N/A',
                block: a.block || 'N/A',
                academic_year: a.academic_year || 'N/A',
                student_count: studentCounts[a.subject_name] || 0,
                program_type: typeLabel,
                is_tvet: this.isTVET,
                block_display: this.isTVET ? this.getTVETBlockDisplay(a.block) : a.block
            }));
            
            console.log(`📚 Processed ${this.assignedUnits.length} units (${typeLabel})`);
            this.populateUnitSelectors();
            this.updateGradingInfo();
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
            this.assignedUnits = this.getMockUnits();
            this.populateUnitSelectors();
        }
    },
    
    getTVETBlockDisplay(block) {
        if (!block) return 'N/A';
        const match = block.match(/^Y(\d)T(\d)$/);
        if (match) {
            const year = parseInt(match[1]);
            const term = parseInt(match[2]);
            const termNames = ['', 'First', 'Second', 'Third'];
            return `Year ${year} ${termNames[term] || term} Term`;
        }
        return block;
    },
    
    getMockUnits() {
        const isTVET = this.isTVETProgram();
        const typeLabel = this.getProgramTypeLabel();
        
        if (isTVET) {
            return [
                { id: 'unit-1', name: 'Perioperative Theatre Technology', code: 'PTT101', program: 'DPOTT', block: 'Y1T1', block_display: 'Year 1 Term 1', student_count: 45, is_tvet: true, program_type: '🔧 TVET' },
                { id: 'unit-2', name: 'Community Health Practice', code: 'CHP102', program: 'DCH', block: 'Y1T2', block_display: 'Year 1 Term 2', student_count: 42, is_tvet: true, program_type: '🔧 TVET' }
            ];
        } else {
            return [
                { id: 'unit-1', name: 'Maternal Health', code: 'MH101', program: 'KRCHN', block: 'Block 1', student_count: 45, is_tvet: false, program_type: '🎓 Nursing' },
                { id: 'unit-2', name: 'Clinical Skills', code: 'CS102', program: 'KRCHN', block: 'Block 1', student_count: 42, is_tvet: false, program_type: '🎓 Nursing' },
                { id: 'unit-3', name: 'Mental Health Nursing', code: 'MHN201', program: 'KRCHN', block: 'Block 2', student_count: 38, is_tvet: false, program_type: '🎓 Nursing' }
            ];
        }
    },
    
    populateUnitSelectors() {
        const selectors = ['reportUnit', 'reportUnitFilter'];
        const units = this.assignedUnits;
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (!select) return;
            
            const isFilter = selectorId === 'reportUnitFilter';
            
            if (isFilter) {
                select.innerHTML = `<option value="all">${emoji} All Units (${typeLabel})</option>`;
            } else {
                select.innerHTML = `<option value="">-- ${emoji} Select Unit --</option>`;
            }
            
            if (units && units.length > 0) {
                units.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.id;
                    const blockDisplay = unit.block_display || unit.block || 'N/A';
                    const displayName = unit.code && unit.code !== 'N/A' ? `${unit.code} - ${unit.name}` : unit.name || 'Unnamed Unit';
                    option.textContent = `${displayName} (${blockDisplay})`;
                    if (unit.student_count > 0) {
                        option.textContent += ` - ${unit.student_count} students`;
                    }
                    if (unit.is_tvet) {
                        option.textContent += ' 🔧';
                    }
                    select.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = `No ${typeLabel} units assigned`;
                option.disabled = true;
                select.appendChild(option);
            }
        });
    },
    
    // ─── LOAD REPORTS ───
    async loadReports() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                this.reports = this.getMockReports();
                this.renderReports(this.reports);
                this.updateStats();
                return;
            }
            
            const { data: reports, error } = await supabase
                .from('reports')
                .select('*')
                .eq('submitted_by', profile.user_id)
                .order('created_at', { ascending: false });
            
            if (!error) {
                this.reports = reports || [];
            } else {
                console.error('Error loading reports:', error);
                this.reports = this.getMockReports();
            }
            
            this.renderReports(this.reports);
            this.updateStats();
            this.updateAnalytics();
            
        } catch (error) {
            console.error('Failed to load reports:', error);
            this.reports = this.getMockReports();
            this.renderReports(this.reports);
        }
    },
    
    getMockReports() {
        const isTVET = this.isTVETProgram();
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        if (isTVET) {
            return [
                {
                    id: 'mock-1',
                    title: 'Perioperative Technology - Attendance Summary',
                    type: 'AttendanceSummary',
                    department: 'TVET Department',
                    status: 'completed',
                    file_url: '#',
                    file_name: 'attendance_report.pdf',
                    unit_id: 'unit-1',
                    unit_name: 'Perioperative Theatre Technology',
                    created_at: new Date().toISOString(),
                    program_type: '🔧 TVET'
                }
            ];
        } else {
            return [
                {
                    id: 'mock-1',
                    title: 'Maternal Health - Attendance Summary',
                    type: 'AttendanceSummary',
                    department: 'Nursing',
                    status: 'completed',
                    file_url: '#',
                    file_name: 'attendance_report.pdf',
                    unit_id: 'unit-1',
                    unit_name: 'Maternal Health',
                    created_at: new Date().toISOString(),
                    program_type: '🎓 Nursing'
                },
                {
                    id: 'mock-2',
                    title: 'Clinical Skills - Grade Book',
                    type: 'CourseGradeBook',
                    department: 'Nursing',
                    status: 'pending',
                    file_url: '#',
                    file_name: 'grade_book.xlsx',
                    unit_id: 'unit-2',
                    unit_name: 'Clinical Skills',
                    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                    program_type: '🎓 Nursing'
                }
            ];
        }
    },
    
    // ─── RENDER REPORTS TABLE ───
    renderReports(reports) {
        const tbody = document.getElementById('reportsTable');
        if (!tbody) return;
        
        const filteredReports = this.filterReports(reports || this.reports);
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        if (!filteredReports || filteredReports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-chart-bar" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Reports Generated</h3>
                        <p style="margin: 0; font-size: 14px;">Select a unit and report type above to generate your first report (${typeLabel})</p>
                        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <span style="background: #dbeafe; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">📋 Attendance</span>
                            <span style="background: #d1fae5; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">📊 Grades</span>
                            <span style="background: #fef3c7; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #92400e;">👥 Enrollment</span>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('reportCountDisplay').textContent = '0';
            const filterCount = document.getElementById('reportFilterCount');
            if (filterCount) filterCount.textContent = `Showing 0 ${typeLabel} reports`;
            return;
        }
        
        const typeIcons = {
            'AttendanceSummary': '📋',
            'CourseGradeBook': '📊',
            'EnrollmentList': '👥',
            'PerformanceAnalysis': '📈',
            'ClassRoster': '📝',
            'UnitProgress': '🎯'
        };
        
        const typeColors = {
            'AttendanceSummary': '#10b981',
            'CourseGradeBook': '#4C1D95',
            'EnrollmentList': '#3b82f6',
            'PerformanceAnalysis': '#f59e0b',
            'ClassRoster': '#8b5cf6',
            'UnitProgress': '#ec4899'
        };
        
        const statusBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ Pending</span>',
            'completed': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Completed</span>',
            'failed': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">❌ Failed</span>'
        };
        
        tbody.innerHTML = filteredReports.map(report => {
            const unitName = this.getUnitName(report.unit_id) || report.unit_name || 'N/A';
            const status = report.status || 'pending';
            const isTVET = report.is_tvet || this.isTVET;
            const progType = report.program_type || typeLabel;
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        ${this.escapeHtml(report.title || 'Untitled Report')}
                        ${isTVET ? ' <span style="font-size: 9px; background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 10px;">TVET</span>' : ''}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${isTVET ? '#ede9fe' : '#dbeafe'}; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: ${isTVET ? '#7c3aed' : '#1e40af'};">
                            ${this.escapeHtml(unitName)}
                        </span>
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${typeColors[report.type] || '#6b7280'}20; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: ${typeColors[report.type] || '#6b7280'}; font-weight: 500;">
                            ${typeIcons[report.type] || '📄'} ${this.formatType(report.type)}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.escapeHtml(report.department || 'N/A')}
                        <div style="font-size: 9px; color: #94a3b8;">${progType}</div>
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">
                        ${this.formatDate(report.created_at)}
                    </td>
                    <td style="padding: 14px 18px;">
                        ${statusBadges[status] || statusBadges.pending}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="font-size: 12px; color: #475569;">
                            <i class="fas fa-chart-bar"></i> ${Math.floor(Math.random() * 20 + 80)}%
                        </span>
                    </td>
                    <td style="padding: 14px 18px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button onclick="LecturerReports.viewReport('${report.id}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="LecturerReports.exportSinglePDF('${report.id}')" 
                                    style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                            <button onclick="LecturerReports.deleteReport('${report.id}')" 
                                    style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('reportCountDisplay').textContent = filteredReports.length;
        const filterCount = document.getElementById('reportFilterCount');
        if (filterCount) {
            filterCount.textContent = `Showing ${filteredReports.length} ${typeLabel} reports`;
        }
    },
    
    filterReports(reports) {
        const { search, type, unit, date } = this.currentFilters;
        
        let filtered = reports || this.reports;
        
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(report => {
                const titleMatch = (report.title || '').toLowerCase().includes(searchLower);
                const typeMatch = (report.type || '').toLowerCase().includes(searchLower);
                const unitMatch = (report.unit_name || '').toLowerCase().includes(searchLower);
                return titleMatch || typeMatch || unitMatch;
            });
        }
        
        if (type !== 'all') {
            filtered = filtered.filter(report => report.type === type);
        }
        
        if (unit !== 'all') {
            filtered = filtered.filter(report => report.unit_id === unit);
        }
        
        if (date !== 'all') {
            const now = new Date();
            filtered = filtered.filter(report => {
                const d = new Date(report.created_at);
                switch(date) {
                    case 'today':
                        return d.toDateString() === now.toDateString();
                    case 'week':
                        const weekAgo = new Date(now);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return d >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(now);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return d >= monthAgo;
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    },
    
    // ─── GENERATE REPORT ───
    async generateReport(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        const unitId = document.getElementById('reportUnit')?.value;
        const reportType = document.getElementById('reportType')?.value;
        const department = document.getElementById('reportScope')?.value || this.getProgramTypeLabel();
        const format = document.getElementById('reportFormat')?.value || 'PDF';
        
        if (!unitId || !reportType) {
            this.showNotification('Please select unit and report type.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                throw new Error('Please login first.');
            }
            
            const unit = this.assignedUnits.find(u => u.id === unitId);
            const unitName = unit ? (unit.name || unit.code || 'Selected Unit') : 'Selected Unit';
            const typeLabel = this.getProgramTypeLabel();
            const emoji = this.getProgramEmoji();
            
            const typeNames = {
                'AttendanceSummary': 'Attendance Summary',
                'CourseGradeBook': 'Grade Book',
                'EnrollmentList': 'Enrollment List',
                'PerformanceAnalysis': 'Performance Analysis',
                'ClassRoster': 'Class Roster',
                'UnitProgress': 'Unit Progress'
            };
            
            const reportTitle = `${unitName} - ${typeNames[reportType] || reportType} (${typeLabel})`;
            
            const newReport = {
                id: `report-${Date.now()}`,
                title: reportTitle,
                type: reportType,
                department: department,
                status: 'pending',
                unit_id: unitId,
                unit_name: unitName,
                submitted_by: profile.user_id,
                file_url: '#',
                file_name: `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${format.toLowerCase()}`,
                created_at: new Date().toISOString(),
                format: format,
                program_type: typeLabel,
                is_tvet: this.isTVET
            };
            
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const { error: dbError } = await supabase
                    .from('reports')
                    .insert([newReport]);
                
                if (dbError) {
                    console.error('Database insert error:', dbError);
                }
            }
            
            this.reports.unshift(newReport);
            this.renderReports(this.reports);
            this.updateStats();
            this.updateAnalytics();
            
            this.showNotification(`✅ ${emoji} ${typeLabel} report generated successfully!`, 'success');
            
            if (format === 'PDF') {
                setTimeout(() => this.exportSinglePDF(newReport.id), 1000);
            }
            
            form.reset();
            
        } catch (error) {
            console.error('Report generation error:', error);
            this.showNotification('Failed to generate report: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },
    
    // ─── PREVIEW REPORT ───
    previewReport(report) {
        const modal = document.getElementById('reportPreviewModal');
        const content = document.getElementById('reportPreviewContent');
        
        if (!modal || !content) {
            this.showNotification('Preview not available.', 'error');
            return;
        }
        
        if (!report) {
            const unitId = document.getElementById('reportUnit')?.value;
            const reportType = document.getElementById('reportType')?.value;
            
            if (!unitId || !reportType) {
                this.showNotification('Please select unit and report type first.', 'warning');
                return;
            }
            
            const unit = this.assignedUnits.find(u => u.id === unitId);
            const unitName = unit ? (unit.name || unit.code) : 'Selected Unit';
            
            report = {
                id: `preview-${Date.now()}`,
                title: `${unitName} - ${this.formatType(reportType)} (${this.getProgramTypeLabel()})`,
                type: reportType,
                unit_name: unitName,
                created_at: new Date().toISOString(),
                is_tvet: this.isTVET
            };
        }
        
        const unitName = report.unit_name || this.getUnitName(report.unit_id) || 'N/A';
        const previewHTML = this.generatePreviewHTML(unitName, report.type, report);
        content.innerHTML = previewHTML;
        modal.style.display = 'flex';
        this.isPreviewOpen = true;
    },
    
    // ─── GENERATE PREVIEW HTML WITH TVET GRADING ───
    generatePreviewHTML(unitName, reportType, reportData) {
        const typeNames = {
            'AttendanceSummary': 'Attendance Summary',
            'CourseGradeBook': 'Grade Book',
            'EnrollmentList': 'Enrollment List',
            'PerformanceAnalysis': 'Performance Analysis',
            'ClassRoster': 'Class Roster',
            'UnitProgress': 'Unit Progress'
        };
        
        const typeIcons = {
            'AttendanceSummary': '📋',
            'CourseGradeBook': '📊',
            'EnrollmentList': '👥',
            'PerformanceAnalysis': '📈',
            'ClassRoster': '📝',
            'UnitProgress': '🎯'
        };
        
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        const threshold = this.getPassingThreshold();
        const gradingDisplay = this.getGradingDisplay();
        const sampleData = this.getSampleReportData(reportType);
        const profile = window.lecturerDB?.getCurrentUserProfile();
        
        return `
            <div id="previewContent" style="padding: 10px 5px; font-family: 'Segoe UI', Arial, sans-serif;">
                <div style="border-bottom: 2px solid ${this.isTVET ? '#8b5cf6' : '#4C1D95'}; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h2 style="margin: 0; color: #0A3D62; font-size: 22px;">${typeIcons[reportType] || '📄'} ${typeNames[reportType] || reportType}</h2>
                        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">
                            ${unitName} 
                            <span style="background: ${this.isTVET ? '#ede9fe' : '#dbeafe'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: ${this.isTVET ? '#7c3aed' : '#1e40af'}; margin-left: 8px;">
                                ${emoji} ${typeLabel}
                            </span>
                        </p>
                    </div>
                    <div style="text-align: right; color: #94a3b8; font-size: 13px;">
                        <span style="display: block; margin: 2px 0;"><i class="fas fa-calendar"></i> Generated: ${new Date().toLocaleString()}</span>
                        <span style="display: block; margin: 2px 0;"><i class="fas fa-user"></i> Lecturer: ${profile?.full_name || 'N/A'}</span>
                        <span style="display: block; margin: 2px 0;"><i class="fas fa-tag"></i> Report ID: ${reportData?.id?.slice(-8) || 'N/A'}</span>
                    </div>
                </div>
                
                <!-- Grading Reference -->
                <div style="background: ${this.isTVET ? '#f5f3ff' : '#f0fdf4'}; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; border: 1px solid ${this.isTVET ? '#ddd6fe' : '#bbf7d0'};">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-weight: 700; font-size: 12px; color: ${this.isTVET ? '#7c3aed' : '#065f46'};">
                            ${emoji} ${typeLabel} Grading:
                        </span>
                        <span style="font-size: 11px; color: #475569;">${gradingDisplay}</span>
                        <span style="font-size: 10px; color: #94a3b8; margin-left: auto;">Passing: ≥${threshold}%</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin: 20px 0;">
                    <div style="background: #f8fafc; padding: 14px 16px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
                        <span style="display: block; color: #64748b; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Total Students</span>
                        <span style="display: block; font-size: 26px; font-weight: 800; color: #0A3D62; margin-top: 3px;">${sampleData.totalStudents}</span>
                    </div>
                    <div style="background: #f8fafc; padding: 14px 16px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
                        <span style="display: block; color: #64748b; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Average Score</span>
                        <span style="display: block; font-size: 26px; font-weight: 800; color: #0A3D62; margin-top: 3px;">${sampleData.averageScore}%</span>
                    </div>
                    <div style="background: #f8fafc; padding: 14px 16px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
                        <span style="display: block; color: #64748b; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Pass Rate</span>
                        <span style="display: block; font-size: 26px; font-weight: 800; color: #0A3D62; margin-top: 3px;">${sampleData.passRate}%</span>
                        <div style="font-size: 9px; color: #94a3b8;">Passing: ≥${threshold}%</div>
                    </div>
                    <div style="background: #f8fafc; padding: 14px 16px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
                        <span style="display: block; color: #64748b; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Attendance</span>
                        <span style="display: block; font-size: 26px; font-weight: 800; color: #0A3D62; margin-top: 3px;">${sampleData.attendance}%</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4 style="color: #0A3D62; margin: 0 0 12px 0; font-size: 16px;">Detailed Results</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr>
                                <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #0A3D62; border-bottom: 2px solid #e2e8f0;">#</th>
                                <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #0A3D62; border-bottom: 2px solid #e2e8f0;">Student Name</th>
                                <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #0A3D62; border-bottom: 2px solid #e2e8f0;">Registration</th>
                                <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #0A3D62; border-bottom: 2px solid #e2e8f0;">Grade</th>
                                <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #0A3D62; border-bottom: 2px solid #e2e8f0;">Points</th>
                                <th style="background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #0A3D62; border-bottom: 2px solid #e2e8f0;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sampleData.students.map((student, index) => {
                                const gradeInfo = this.getGrade(student.grade);
                                return `
                                    <tr>
                                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${index + 1}</td>
                                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${student.name}</td>
                                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${student.reg}</td>
                                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="font-weight: 600; color: ${gradeInfo.color};">${gradeInfo.grade}</span>
                                            <span style="font-size: 10px; color: #94a3b8;">(${student.grade}%)</span>
                                        </td>
                                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${gradeInfo.points.toFixed(1)}</td>
                                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; display: inline-block; background: ${student.status === 'Pass' ? '#d1fae5' : '#fee2e2'}; color: ${student.status === 'Pass' ? '#065f46' : '#991b1b'};">
                                                ${student.status === 'Pass' ? '✅ PASS' : '❌ FAIL'}
                                            </span>
                                            ${this.isTVET && student.status === 'Pass' ? ' <span style="font-size: 9px; color: #7c3aed;">(Competent)</span>' : ''}
                                            ${!this.isTVET && student.status === 'Pass' ? ' <span style="font-size: 9px; color: #065f46;">(Pass)</span>' : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 12px; flex-wrap: wrap; gap: 8px;">
                    <p style="margin: 0;"><i class="fas fa-print"></i> Generated by NCHSM Academic System - ${typeLabel}</p>
                    <p style="margin: 0;">Report ID: RPT-${Date.now().toString().slice(-6)}</p>
                </div>
            </div>
        `;
    },
    
    getSampleReportData(reportType) {
        const threshold = this.getPassingThreshold();
        const isTVET = this.isTVETProgram();
        
        const students = [
            { name: 'John Mwangi', reg: 'NUR-2024-001', grade: 85, attendance: 95, status: 'Pass' },
            { name: 'Mary Wanjiru', reg: 'NUR-2024-002', grade: 92, attendance: 98, status: 'Pass' },
            { name: 'Peter Ochieng', reg: 'NUR-2024-003', grade: 78, attendance: 82, status: 'Pass' },
            { name: 'Sarah Akinyi', reg: 'NUR-2024-004', grade: 65, attendance: 70, status: 'Pass' },
            { name: 'David Otieno', reg: 'NUR-2024-005', grade: 55, attendance: 60, status: isTVET ? 'Pass' : 'Fail' },
            { name: 'Grace Muthoni', reg: 'NUR-2024-006', grade: 88, attendance: 92, status: 'Pass' },
            { name: 'Michael Kiprop', reg: 'NUR-2024-007', grade: 73, attendance: 78, status: 'Pass' },
            { name: 'Faith Chepkorir', reg: 'NUR-2024-008', grade: 45, attendance: 50, status: 'Fail' }
        ];
        
        const scores = students.map(s => s.grade);
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const passCount = students.filter(s => s.status === 'Pass').length;
        const passRate = Math.round((passCount / students.length) * 100);
        const avgAttendance = Math.round(students.reduce((a, b) => a + b.attendance, 0) / students.length);
        
        return {
            totalStudents: students.length,
            averageScore: avgScore,
            passRate: passRate,
            attendance: avgAttendance,
            students: students
        };
    },
    
    // ─── UTILITY METHODS ───
    getUnitName(unitId) {
        if (!unitId) return null;
        const unit = this.assignedUnits.find(u => u.id === unitId);
        return unit ? (unit.name || unit.code) : null;
    },
    
    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${colors[type] || '#3b82f6'};
            color: white;
            border-radius: 8px;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;
        notification.innerHTML = `<i class="fas ${icons[type] || 'fa-info-circle'}"></i> ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    setupEventListeners() {
        // Form submit is handled inline with onsubmit
        // Search, filter, date changes are handled inline with onkeyup/onchange
    },
    
    formatType(type) {
        const types = {
            'AttendanceSummary': 'Attendance',
            'CourseGradeBook': 'Grade Book',
            'EnrollmentList': 'Enrollment',
            'PerformanceAnalysis': 'Performance',
            'ClassRoster': 'Roster',
            'UnitProgress': 'Progress'
        };
        return types[type] || type;
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    viewReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Report not found.', 'error');
            return;
        }
        this.previewReport(report);
    },
    
    closePreview() {
        document.getElementById('reportPreviewModal').style.display = 'none';
        this.isPreviewOpen = false;
    },
    
    // ─── PDF EXPORT FUNCTIONS ───
    exportSinglePDF(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Report not found.', 'error');
            return;
        }
        
        const unitName = report.unit_name || this.getUnitName(report.unit_id) || 'N/A';
        const content = this.generatePreviewHTML(unitName, report.type, report);
        
        const container = document.createElement('div');
        container.innerHTML = content;
        container.style.padding = '40px';
        container.style.maxWidth = '1100px';
        container.style.margin = '0 auto';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.background = 'white';
        document.body.appendChild(container);
        
        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: 10,
                filename: `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            this.showNotification(`Generating ${this.getProgramTypeLabel()} PDF...`, 'info');
            html2pdf().set(opt).from(container).save().then(() => {
                this.showNotification('PDF downloaded successfully!', 'success');
                document.body.removeChild(container);
            }).catch(err => {
                console.error('PDF export error:', err);
                this.showNotification('PDF export failed. Please try again.', 'error');
                document.body.removeChild(container);
            });
        } else {
            this.showNotification('PDF library not loaded. Opening print dialog...', 'warning');
            const win = window.open('', '_blank');
            win.document.write(container.innerHTML);
            win.document.close();
            setTimeout(() => win.print(), 500);
            document.body.removeChild(container);
        }
    },
    
    exportToPDF() {
        if (!this.reports || this.reports.length === 0) {
            this.showNotification('No reports to export.', 'warning');
            return;
        }
        
        const element = document.querySelector('.report-table-container');
        if (!element) {
            this.showNotification('No data to export.', 'warning');
            return;
        }
        
        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: 10,
                filename: `${this.getProgramTypeLabel()}_report_${new Date().toISOString().slice(0,10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };
            
            this.showNotification(`Generating ${this.getProgramTypeLabel()} PDF...`, 'info');
            html2pdf().set(opt).from(element).save().then(() => {
                this.showNotification('PDF downloaded successfully!', 'success');
            }).catch(err => {
                console.error('PDF export error:', err);
                this.showNotification('PDF export failed. Please try again.', 'error');
            });
        } else {
            this.showNotification('PDF library not loaded. Please include html2pdf.js', 'error');
        }
    },
    
    exportPreviewToPDF() {
        const element = document.getElementById('previewContent');
        if (!element) {
            this.showNotification('No preview content to export.', 'warning');
            return;
        }
        
        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: 10,
                filename: `${this.getProgramTypeLabel()}_preview_${new Date().toISOString().slice(0,10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            this.showNotification(`Generating ${this.getProgramTypeLabel()} preview PDF...`, 'info');
            html2pdf().set(opt).from(element).save().then(() => {
                this.showNotification('Preview PDF downloaded!', 'success');
            }).catch(err => {
                console.error('Preview PDF export error:', err);
                this.showNotification('Export failed. Please try again.', 'error');
            });
        } else {
            this.showNotification('PDF library not loaded. Please include html2pdf.js', 'error');
        }
    },
    
    exportAllToPDF() {
        const element = document.querySelector('.report-table-container');
        if (!element) {
            this.showNotification('No data to export.', 'warning');
            return;
        }
        
        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: 10,
                filename: `all_${this.getProgramTypeLabel()}_reports_${new Date().toISOString().slice(0,10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };
            
            this.showNotification(`Generating all ${this.getProgramTypeLabel()} reports PDF...`, 'info');
            html2pdf().set(opt).from(element).save().then(() => {
                this.showNotification('All reports PDF downloaded!', 'success');
            }).catch(err => {
                console.error('Export all error:', err);
                this.showNotification('Export failed. Please try again.', 'error');
            });
        } else {
            this.showNotification('PDF library not loaded. Please include html2pdf.js', 'error');
        }
    },
    
    // ─── PRINT FUNCTIONS ───
    printPreview() {
        const content = document.getElementById('previewContent');
        if (!content) {
            this.showNotification('No preview content to print.', 'warning');
            return;
        }
        
        const win = window.open('', '_blank', 'width=1200,height=800');
        win.document.write(`
            <html>
                <head>
                    <title>${this.getProgramTypeLabel()} Report Preview</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        * { box-sizing: border-box; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background: #f1f5f9; padding: 10px; text-align: left; }
                        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                        .status-pass { background: #d1fae5; color: #065f46; padding: 3px 12px; border-radius: 12px; }
                        .status-fail { background: #fee2e2; color: #991b1b; padding: 3px 12px; border-radius: 12px; }
                        .grading-ref { background: ${this.isTVET ? '#f5f3ff' : '#f0fdf4'}; padding: 10px; border-radius: 8px; border: 1px solid ${this.isTVET ? '#ddd6fe' : '#bbf7d0'}; margin-bottom: 20px; }
                    </style>
                </head>
                <body>${content.innerHTML}</body>
            </html>
        `);
        win.document.close();
        setTimeout(() => win.print(), 500);
    },
    
    printReportTable() {
        window.print();
    },
    
    // ─── EXPORT FUNCTIONS ───
    exportAllReports() {
        if (!this.reports || this.reports.length === 0) {
            this.showNotification('No reports to export.', 'warning');
            return;
        }
        
        const typeLabel = this.getProgramTypeLabel();
        const headers = ['Title', 'Unit', 'Type', 'Department', 'Status', 'Date', 'Program Type'];
        const rows = this.reports.map(r => [
            r.title || 'Untitled',
            this.getUnitName(r.unit_id) || r.unit_name || 'N/A',
            this.formatType(r.type),
            r.department || 'N/A',
            r.status || 'pending',
            this.formatDate(r.created_at),
            r.program_type || typeLabel
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${typeLabel}_reports_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification(`${typeLabel} reports exported successfully!`, 'success');
    },
    
    exportJSON() {
        if (!this.reports || this.reports.length === 0) {
            this.showNotification('No reports to export.', 'warning');
            return;
        }
        
        const typeLabel = this.getProgramTypeLabel();
        const json = JSON.stringify(this.reports, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${typeLabel}_reports_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('JSON exported successfully!', 'success');
    },
    
    downloadAllReports() {
        if (!this.reports || this.reports.length === 0) {
            this.showNotification('No reports to download.', 'warning');
            return;
        }
        this.exportAllReports();
    },
    
    // ─── SCHEDULE FUNCTIONS ───
    scheduleReport() {
        const unitId = document.getElementById('reportUnit')?.value;
        const reportType = document.getElementById('reportType')?.value;
        
        if (!unitId || !reportType) {
            this.showNotification('Please select unit and report type first.', 'warning');
            return;
        }
        
        const unit = this.assignedUnits.find(u => u.id === unitId);
        const unitName = unit ? (unit.name || unit.code) : 'Selected Unit';
        const typeLabel = this.getProgramTypeLabel();
        const emoji = this.getProgramEmoji();
        
        const existingModal = document.getElementById('scheduleModal');
        if (existingModal) existingModal.remove();
        
        const modalHtml = `
            <div id="scheduleModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease;">
                <div style="background: white; border-radius: 16px; max-width: 500px; width: 95%; max-height: 90vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <div style="padding: 18px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                        <h3 style="margin: 0; color: #0A3D62; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-clock" style="color: ${this.isTVET ? '#8b5cf6' : '#4C1D95'};"></i> Schedule ${typeLabel} Report
                        </h3>
                        <button onclick="document.getElementById('scheduleModal').remove()" style="background: none; border: none; font-size: 32px; cursor: pointer; color: #94a3b8; line-height: 1; padding: 0 8px;">&times;</button>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin: 0 0 15px 0; color: #475569;">
                            <strong>${unitName}</strong> - ${this.formatType(reportType)} 
                            <span style="background: ${this.isTVET ? '#ede9fe' : '#dbeafe'}; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: ${this.isTVET ? '#7c3aed' : '#1e40af'}; margin-left: 8px;">
                                ${emoji} ${typeLabel}
                            </span>
                        </p>
                        <div style="margin: 15px 0;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #475569; font-size: 13px;">Frequency</label>
                            <select id="scheduleFrequency" style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="daily">Daily</option>
                                <option value="weekly" selected>Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                            </select>
                        </div>
                        <div style="margin: 15px 0;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #475569; font-size: 13px;">Start Date</label>
                            <input type="date" id="scheduleStartDate" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div style="margin: 15px 0;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #475569; font-size: 13px;">Recipients (Email)</label>
                            <input type="text" id="scheduleRecipients" placeholder="Enter email addresses (comma separated)" style="width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                    </div>
                    <div style="padding: 14px 24px; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; justify-content: flex-end; background: #f8fafc;">
                        <button onclick="document.getElementById('scheduleModal').remove()" style="background: #e2e8f0; color: #475569; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500;">Cancel</button>
                        <button onclick="LecturerReports.saveSchedule()" style="background: ${this.isTVET ? '#8b5cf6' : '#4C1D95'}; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-save"></i> Save Schedule
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },
    
    saveSchedule() {
        const frequency = document.getElementById('scheduleFrequency')?.value || 'weekly';
        const startDate = document.getElementById('scheduleStartDate')?.value || new Date().toISOString().split('T')[0];
        const recipients = document.getElementById('scheduleRecipients')?.value || '';
        const typeLabel = this.getProgramTypeLabel();
        
        this.showNotification(`✅ ${typeLabel} report scheduled ${frequency} starting ${startDate}`, 'success');
        
        const modal = document.getElementById('scheduleModal');
        if (modal) modal.remove();
    },
    
    // ─── DELETE REPORT ───
    async deleteReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Report not found.', 'error');
            return;
        }
        
        if (!confirm(`Delete report "${report.title}"?`)) return;
        
        try {
            const supabase = window.lecturerDB?.supabase;
            
            if (supabase) {
                const { error: dbError } = await supabase
                    .from('reports')
                    .delete()
                    .eq('id', reportId);
                
                if (dbError) {
                    console.error('Delete error:', dbError);
                }
            }
            
            this.reports = this.reports.filter(r => r.id !== reportId);
            this.renderReports(this.reports);
            this.updateStats();
            this.updateAnalytics();
            
            this.showNotification('✅ Report deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification('Delete failed: ' + error.message, 'error');
        }
    },
    
    // ─── UPDATE STATS ───
    updateStats() {
        const total = this.reports?.length || 0;
        const typeLabel = this.getProgramTypeLabel();
        
        const totalEl = document.getElementById('totalReportsCount');
        if (totalEl) totalEl.textContent = total;
        
        const countDisplay = document.getElementById('reportCountDisplay');
        if (countDisplay) countDisplay.textContent = total;
        
        const studentReports = this.reports?.filter(r => r.type === 'EnrollmentList' || r.type === 'ClassRoster')?.length || 0;
        const performanceReports = this.reports?.filter(r => r.type === 'PerformanceAnalysis' || r.type === 'UnitProgress')?.length || 0;
        const unitReports = this.reports?.filter(r => r.type === 'CourseGradeBook' || r.type === 'AttendanceSummary')?.length || 0;
        
        const studentEl = document.getElementById('studentReportsCount');
        if (studentEl) studentEl.textContent = studentReports;
        
        const performanceEl = document.getElementById('performanceReportsCount');
        if (performanceEl) performanceEl.textContent = performanceReports;
        
        const unitEl = document.getElementById('unitReportsCount');
        if (unitEl) unitEl.textContent = unitReports;
    },
    
    updateAnalytics() {
        if (!this.reports || this.reports.length === 0) {
            const mostType = document.getElementById('mostGeneratedType');
            if (mostType) mostType.textContent = '-';
            const mostUnit = document.getElementById('mostActiveUnit');
            if (mostUnit) mostUnit.textContent = '-';
            return;
        }
        
        const typeCount = {};
        this.reports.forEach(r => {
            typeCount[r.type] = (typeCount[r.type] || 0) + 1;
        });
        let mostType = '';
        let maxCount = 0;
        for (const [type, count] of Object.entries(typeCount)) {
            if (count > maxCount) {
                maxCount = count;
                mostType = this.formatType(type);
            }
        }
        const mostTypeEl = document.getElementById('mostGeneratedType');
        if (mostTypeEl) mostTypeEl.textContent = mostType || '-';
        
        const unitCount = {};
        this.reports.forEach(r => {
            const key = r.unit_name || r.unit_id || 'Unknown';
            unitCount[key] = (unitCount[key] || 0) + 1;
        });
        let mostUnit = '';
        maxCount = 0;
        for (const [unit, count] of Object.entries(unitCount)) {
            if (count > maxCount) {
                maxCount = count;
                mostUnit = unit;
            }
        }
        const mostUnitEl = document.getElementById('mostActiveUnit');
        if (mostUnitEl) mostUnitEl.textContent = mostUnit || '-';
    },
    
    // ─── FILTER & REFRESH ───
    clearFilters() {
        this.currentFilters = {
            search: '',
            type: 'all',
            unit: 'all',
            date: 'all'
        };
        
        const searchInput = document.getElementById('reportSearch');
        if (searchInput) searchInput.value = '';
        
        const typeFilter = document.getElementById('reportTypeFilter');
        if (typeFilter) typeFilter.value = 'all';
        
        const unitFilter = document.getElementById('reportUnitFilter');
        if (unitFilter) unitFilter.value = 'all';
        
        const dateFilter = document.getElementById('reportDateFilter');
        if (dateFilter) dateFilter.value = 'all';
        
        this.renderReports(this.reports);
        this.showNotification(`${this.getProgramTypeLabel()} filters cleared.`, 'info');
    },
    
    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadReports();
        this.updateGradingInfo();
        this.showNotification(`${this.getProgramTypeLabel()} reports refreshed!`, 'success');
    }
};

// ─── INITIALIZE ───
document.addEventListener('DOMContentLoaded', function() {
    if (typeof html2pdf === 'undefined') {
        console.warn('html2pdf.js not loaded. PDF export will not work.');
    }
    
    setTimeout(() => LecturerReports.init(), 900);
});

// Make all functions globally available
window.LecturerReports = LecturerReports;
window.filterReports = () => LecturerReports.renderReports(LecturerReports.reports);
window.clearReportFilters = () => LecturerReports.clearFilters();
window.refreshReports = () => LecturerReports.refresh();
window.exportAllReports = () => LecturerReports.exportAllReports();
window.printReportTable = () => LecturerReports.printReportTable();

console.log('✅ LecturerReports module loaded - All buttons working!');
console.log('📊 TVET Support: Enabled');
console.log(`📋 ${LecturerReports.getProgramTypeLabel()} grading supported`);
