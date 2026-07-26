// js/lecturer-reports.js
/**
 * NCHSM Lecturer Reports Module
 * Generate and manage academic reports for assigned units and students
 * Uses the same lecturer ID resolution as marks and courses modules
 */

const LecturerReports = {
    reports: [],
    assignedUnits: [],
    lecturerAssignmentId: null,
    currentFilters: {
        search: '',
        type: 'all',
        unit: 'all'
    },
    
    async init() {
        console.log('📊 Initializing Lecturer Reports...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadReports();
        this.populateReportForm();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Reports initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID
    // ============================================
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
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Try to find by name in lecturer_subject_assignments
            const { data, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .eq('lecturer_name', fullName)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                this.lecturerAssignmentId = data[0].lecturer_id;
                console.log('✅ Found lecturer ID by name:', this.lecturerAssignmentId);
                return;
            }
            
            // Try partial name match with scoring
            const nameParts = fullName.toLowerCase().split(' ');
            const { data: allLecturers, error: allError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .order('created_at', { ascending: false });
            
            if (!allError && allLecturers && allLecturers.length > 0) {
                let bestMatch = null;
                let bestScore = -1;
                
                for (const lecturer of allLecturers) {
                    const lecturerName = lecturer.lecturer_name || '';
                    const lecturerId = lecturer.lecturer_id;
                    let score = 0;
                    
                    const lecturerNameLower = lecturerName.toLowerCase();
                    for (const part of nameParts) {
                        if (part.length > 1 && lecturerNameLower.includes(part)) {
                            score += 5;
                        }
                    }
                    
                    if (lecturerNameLower === fullName.toLowerCase()) {
                        score += 20;
                    }
                    
                    // BIG BONUS for non-STAFF IDs
                    if (!lecturerId.toString().startsWith('STAFF')) {
                        score += 50;
                    }
                    
                    if (lecturerId.toString().includes('-')) {
                        score += 30;
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = lecturerId;
                    }
                }
                
                if (bestMatch) {
                    this.lecturerAssignmentId = bestMatch;
                    console.log(`✅ Selected lecturer ID with score ${bestScore}:`, this.lecturerAssignmentId);
                    return;
                }
            }
            
            // Fallback: use auth ID
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
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
            
            // Use the resolved lecturer ID
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            console.log('🔍 Using lecturer ID for reports:', lecturerId);
            
            // Get units from lecturer_subject_assignments
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('*')
                .eq('lecturer_id', lecturerId);
            
            if (assignError) {
                console.error('Error loading assignments:', assignError);
                this.assignedUnits = this.getMockUnits();
                this.populateUnitSelectors();
                return;
            }
            
            console.log(`📚 Found ${assignments?.length || 0} assigned units`);
            
            if (!assignments || assignments.length === 0) {
                console.warn('No assignments found');
                this.assignedUnits = [];
                this.populateUnitSelectors();
                return;
            }
            
            // Convert to unit format with student counts
            const program = profile.program || 'KRCHN';
            const unitNames = assignments.map(a => a.subject_name);
            const blocks = [...new Set(assignments.map(a => a.block))];
            
            // Get student counts from student_unit_registrations
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
            
            // Build assigned units with student counts
            this.assignedUnits = assignments.map(a => ({
                id: a.id,
                name: a.subject_name || 'Unnamed Unit',
                code: a.subject_code || 'N/A',
                program: a.program || 'N/A',
                block: a.block || 'N/A',
                academic_year: a.academic_year || 'N/A',
                student_count: studentCounts[a.subject_name] || 0,
                lecturer_name: a.lecturer_name || 'N/A'
            }));
            
            console.log(`📚 Processed ${this.assignedUnits.length} units with student counts`);
            
            this.populateUnitSelectors();
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
            this.assignedUnits = this.getMockUnits();
            this.populateUnitSelectors();
        }
    },
    
    getMockUnits() {
        return [
            { id: 'unit-1', name: 'Maternal Health', code: 'MH101', program: 'KRCHN', block: 'Block 1', student_count: 45 },
            { id: 'unit-2', name: 'Clinical Skills', code: 'CS102', program: 'KRCHN', block: 'Block 1', student_count: 42 },
            { id: 'unit-3', name: 'Mental Health Nursing', code: 'MHN201', program: 'KRCHN', block: 'Block 2', student_count: 38 }
        ];
    },
    
    populateUnitSelectors() {
        const selectors = ['reportUnit', 'reportUnitFilter'];
        const units = this.assignedUnits;
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (!select) return;
            
            const isFilter = selectorId === 'reportUnitFilter';
            
            if (isFilter) {
                select.innerHTML = '<option value="all">All Units</option>';
            } else {
                select.innerHTML = '<option value="">-- Select Unit --</option>';
            }
            
            if (units && units.length > 0) {
                units.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.id;
                    const displayName = unit.code && unit.code !== 'N/A' ? `${unit.code} - ${unit.name}` : unit.name || 'Unnamed Unit';
                    option.textContent = displayName;
                    if (unit.block) {
                        option.textContent += ` (${unit.block})`;
                    }
                    if (unit.student_count > 0) {
                        option.textContent += ` - ${unit.student_count} students`;
                    }
                    select.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No units assigned';
                option.disabled = true;
                select.appendChild(option);
            }
        });
    },
    
    async loadReports() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const { data: reports, error } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('created_by', profile.user_id)
                    .order('created_at', { ascending: false });
                
                if (!error) {
                    this.reports = reports || [];
                } else {
                    console.error('Error loading reports:', error);
                    this.reports = this.getMockReports();
                }
            } else {
                this.reports = this.getMockReports();
            }
            
            this.renderReports(this.reports);
            this.updateStats();
            
        } catch (error) {
            console.error('Failed to load reports:', error);
            this.reports = this.getMockReports();
            this.renderReports(this.reports);
        }
    },
    
    getMockReports() {
        return [
            {
                id: 'mock-1',
                name: 'Maternal Health - Attendance Summary',
                type: 'AttendanceSummary',
                scope: 'UnitOnly',
                unit_id: 'unit-1',
                unit_name: 'Maternal Health',
                format: 'PDF',
                created_at: new Date().toISOString(),
                file_url: '#'
            },
            {
                id: 'mock-2',
                name: 'Clinical Skills - Grade Book',
                type: 'CourseGradeBook',
                scope: 'UnitOnly',
                unit_id: 'unit-2',
                unit_name: 'Clinical Skills',
                format: 'Excel',
                created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                file_url: '#'
            }
        ];
    },
    
    renderReports(reports) {
        const tbody = document.getElementById('reportsTable');
        if (!tbody) return;
        
        const filteredReports = this.filterReports(reports);
        
        if (!filteredReports || filteredReports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 50px 20px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-chart-bar" style="font-size: 48px; display: block; margin-bottom: 15px; color: #e2e8f0;"></i>
                        <h3 style="color: #475569; margin: 0 0 8px 0;">No Reports Generated</h3>
                        <p style="margin: 0; font-size: 14px;">Select a unit and report type above to generate your first report</p>
                        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <span style="background: #dbeafe; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #1e40af;">📋 Attendance</span>
                            <span style="background: #d1fae5; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">📊 Grades</span>
                            <span style="background: #fef3c7; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #92400e;">👥 Enrollment</span>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('reportCountDisplay').textContent = '0';
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
        
        tbody.innerHTML = filteredReports.map(report => {
            const unitName = this.getUnitName(report.unit_id) || report.unit_name || 'N/A';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        ${this.escapeHtml(report.name || 'Untitled Report')}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: #ede9fe; padding: 2px 10px; border-radius: 12px; font-size: 12px; color: #5b21b6;">
                            ${this.escapeHtml(unitName)}
                        </span>
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: ${typeColors[report.type] || '#6b7280'}20; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: ${typeColors[report.type] || '#6b7280'}; font-weight: 500;">
                            ${typeIcons[report.type] || '📄'} ${this.formatType(report.type)}
                        </span>
                    </td>
                    <td style="padding: 14px 18px; color: #475569;">
                        ${this.formatScope(report.scope)}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">
                        ${this.formatDate(report.created_at)}
                    </td>
                    <td style="padding: 14px 18px;">
                        <span style="background: #f1f5f9; padding: 2px 10px; border-radius: 12px; font-size: 11px; color: #475569;">
                            ${this.escapeHtml(report.format || 'PDF')}
                        </span>
                    </td>
                    <td style="padding: 14px 18px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${report.file_url && report.file_url !== '#' ? `
                                <a href="${report.file_url}" target="_blank" style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" 
                                   onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            ` : `
                                <span style="color: #94a3b8; font-size: 12px;">Pending</span>
                            `}
                            <button onclick="LecturerReports.deleteReport('${report.id}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;" 
                                    onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('reportCountDisplay').textContent = filteredReports.length;
    },
    
    filterReports(reports) {
        const { search, type, unit } = this.currentFilters;
        
        return reports.filter(report => {
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const nameMatch = (report.name || '').toLowerCase().includes(searchLower);
                const typeMatch = (report.type || '').toLowerCase().includes(searchLower);
                const unitMatch = (report.unit_name || '').toLowerCase().includes(searchLower);
                if (!nameMatch && !typeMatch && !unitMatch) return false;
            }
            
            // Type filter
            if (type !== 'all' && report.type !== type) return false;
            
            // Unit filter
            if (unit !== 'all' && report.unit_id !== unit) return false;
            
            return true;
        });
    },
    
    getUnitName(unitId) {
        if (!unitId) return null;
        const unit = this.assignedUnits.find(u => u.id === unitId);
        return unit ? (unit.name || unit.code) : null;
    },
    
    populateReportForm() {
        const dateInput = document.getElementById('reportDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    },
    
    setupEventListeners() {
        const form = document.getElementById('reportGenerationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.generateReport(e));
        }
        
        const searchInput = document.getElementById('reportSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                this.currentFilters.search = e.target.value;
                this.renderReports(this.reports);
            });
        }
        
        const typeFilter = document.getElementById('reportTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.renderReports(this.reports);
            });
        }
        
        const unitFilter = document.getElementById('reportUnitFilter');
        if (unitFilter) {
            unitFilter.addEventListener('change', (e) => {
                this.currentFilters.unit = e.target.value;
                this.renderReports(this.reports);
            });
        }
    },
    
    // ============================================
    // GENERATE REPORT
    // ============================================
    async generateReport(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        
        const unitId = document.getElementById('reportUnit')?.value;
        const reportType = document.getElementById('reportType')?.value;
        const scope = document.getElementById('reportScope')?.value;
        const format = document.getElementById('reportFormat')?.value;
        const includeAttendance = document.getElementById('includeAttendance')?.checked;
        const includeGrades = document.getElementById('includeGrades')?.checked;
        const includeComments = document.getElementById('includeComments')?.checked;
        const includeRanking = document.getElementById('includeRanking')?.checked;
        
        if (!unitId || !reportType || !scope) {
            window.showNotification('Please select unit, report type, and scope.', 'error');
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                throw new Error('Please login first.');
            }
            
            const unit = this.assignedUnits.find(u => u.id === unitId);
            const unitName = unit ? (unit.name || unit.code || 'Selected Unit') : 'Selected Unit';
            
            const typeNames = {
                'AttendanceSummary': 'Attendance Summary',
                'CourseGradeBook': 'Grade Book',
                'EnrollmentList': 'Enrollment List',
                'PerformanceAnalysis': 'Performance Analysis',
                'ClassRoster': 'Class Roster',
                'UnitProgress': 'Unit Progress'
            };
            
            const reportName = `${unitName} - ${typeNames[reportType] || reportType}`;
            
            // Generate the actual report data
            const reportData = await this.generateReportData(unitId, reportType, unit);
            
            // Download the report
            if (format === 'CSV') {
                this.downloadCSV(reportData, reportName);
            } else if (format === 'PDF') {
                this.downloadPDF(reportData, reportName);
            } else if (format === 'Excel') {
                this.downloadExcel(reportData, reportName);
            } else {
                // HTML Preview
                this.showHTMLPreview(reportData, reportName);
            }
            
            // Save report to database
            const newReport = {
                id: `report-${Date.now()}`,
                name: reportName,
                type: reportType,
                scope: scope,
                unit_id: unitId,
                unit_name: unitName,
                format: format || 'PDF',
                created_by: profile.user_id,
                created_at: new Date().toISOString(),
                file_url: '#',
                options: {
                    includeAttendance,
                    includeGrades,
                    includeComments,
                    includeRanking
                }
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
            
            window.showNotification(`✅ ${reportName} generated and downloaded!`, 'success');
            
            form.reset();
            this.populateReportForm();
            
        } catch (error) {
            console.error('Report generation error:', error);
            window.showNotification('Failed to generate report: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },
    
    // ============================================
    // GENERATE REPORT DATA
    // ============================================
    async generateReportData(unitId, reportType, unit) {
        const supabase = window.lecturerDB?.supabase;
        const profile = window.lecturerDB?.getCurrentUserProfile();
        
        let data = [];
        let headers = [];
        
        if (reportType === 'AttendanceSummary') {
            // Get attendance data
            const { data: attendance } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', unit.program)
                .eq('block', unit.block);
            
            // Get students
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, student_id, admission_number')
                .eq('program', unit.program)
                .eq('role', 'student');
            
            const studentMap = {};
            students?.forEach(s => {
                studentMap[s.student_id] = {
                    name: s.full_name || 'Unknown',
                    admission: s.admission_number || s.student_id || 'N/A'
                };
            });
            
            // Count attendance per student
            const attendanceCount = {};
            attendance?.forEach(a => {
                const key = a.student_id;
                if (!attendanceCount[key]) {
                    attendanceCount[key] = 0;
                }
                attendanceCount[key]++;
            });
            
            data = students?.map(s => {
                const student = studentMap[s.student_id] || {};
                const present = attendanceCount[s.student_id] || 0;
                const total = attendance?.length || 0;
                return {
                    'Student Name': student.name || 'Unknown',
                    'Admission': student.admission || 'N/A',
                    'Present Days': present,
                    'Total Days': total,
                    'Attendance Rate': total > 0 ? Math.round((present / total) * 100) + '%' : '0%'
                };
            }) || [];
            
            headers = ['Student Name', 'Admission', 'Present Days', 'Total Days', 'Attendance Rate'];
            
        } else if (reportType === 'CourseGradeBook' || reportType === 'PerformanceAnalysis') {
            // Get marks data
            const { data: marks } = await supabase
                .from('student_marks')
                .select('*')
                .eq('subject_name', unit.name)
                .eq('block', unit.block)
                .eq('program', unit.program);
            
            // Get students
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, student_id, admission_number')
                .eq('program', unit.program)
                .eq('role', 'student');
            
            const studentMap = {};
            students?.forEach(s => {
                studentMap[s.student_id] = {
                    name: s.full_name || 'Unknown',
                    admission: s.admission_number || s.student_id || 'N/A'
                };
            });
            
            data = marks?.map(m => {
                const student = studentMap[m.admission_number] || {};
                const cat1 = m.cat1_score || 0;
                const cat2 = m.cat2_score || 0;
                const exam = m.exam_score || 0;
                const total = cat1 + cat2 + exam;
                const grade = total >= 75 ? 'A' : total >= 65 ? 'B' : total >= 60 ? 'C' : 'D';
                
                return {
                    'Student Name': student.name || 'Unknown',
                    'Admission': m.admission_number || 'N/A',
                    'CAT1': cat1,
                    'CAT2': cat2,
                    'Exam': exam,
                    'Total': total,
                    'Grade': grade,
                    'Status': total >= 60 ? 'Pass' : 'Fail'
                };
            }) || [];
            
            headers = ['Student Name', 'Admission', 'CAT1', 'CAT2', 'Exam', 'Total', 'Grade', 'Status'];
            
        } else if (reportType === 'EnrollmentList' || reportType === 'ClassRoster') {
            // Get students
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, student_id, admission_number, email, phone')
                .eq('program', unit.program)
                .eq('role', 'student');
            
            // Get registrations
            const { data: registrations } = await supabase
                .from('student_unit_registrations')
                .select('student_id')
                .eq('unit_name', unit.name)
                .eq('block', unit.block)
                .eq('status', 'approved');
            
            const registeredIds = new Set(registrations?.map(r => r.student_id) || []);
            
            data = students?.map(s => ({
                'Student Name': s.full_name || 'Unknown',
                'Student ID': s.student_id || 'N/A',
                'Admission': s.admission_number || 'N/A',
                'Email': s.email || 'N/A',
                'Phone': s.phone || 'N/A',
                'Registered': registeredIds.has(s.student_id) ? '✅ Yes' : '❌ No'
            })) || [];
            
            headers = ['Student Name', 'Student ID', 'Admission', 'Email', 'Phone', 'Registered'];
        }
        
        return {
            headers: headers,
            rows: data,
            title: `${unit.name} - ${reportType}`,
            unit: unit,
            generatedAt: new Date().toISOString()
        };
    },
    
    // ============================================
    // DOWNLOAD CSV
    // ============================================
    downloadCSV(reportData, reportName) {
        const { headers, rows } = reportData;
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            const values = headers.map(h => {
                const val = row[h] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csv += values.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // ============================================
    // DOWNLOAD PDF
    // ============================================
    downloadPDF(reportData, reportName) {
        const { headers, rows, title, generatedAt } = reportData;
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #4C1D95; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #4C1D95; color: white; padding: 10px; text-align: left; }
                    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .footer { margin-top: 20px; color: #94a3b8; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p>Generated: ${new Date(generatedAt).toLocaleString()}</p>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    Total Records: ${rows.length}
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;
        
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    },
    
    // ============================================
    // SHOW HTML PREVIEW
    // ============================================
    showHTMLPreview(reportData, reportName) {
        const { headers, rows, title, generatedAt } = reportData;
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
                    h1 { color: #4C1D95; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #4C1D95; color: white; padding: 10px; text-align: left; position: sticky; top: 0; }
                    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
                    tr:nth-child(even) { background: #f8fafc; }
                    tr:hover { background: #e2e8f0; }
                    .footer { margin-top: 20px; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between; }
                    .badge { background: #4C1D95; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h1>${title}</h1>
                    <span class="badge">${rows.length} records</span>
                </div>
                <p>Generated: ${new Date(generatedAt).toLocaleString()}</p>
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <span>${reportName}</span>
                    <span>Total: ${rows.length} records</span>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()" style="background: #4C1D95; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button onclick="window.close()" style="background: #e2e8f0; color: #475569; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-left: 10px;">
                        Close
                    </button>
                </div>
            </body>
            </html>
        `;
        
        const win = window.open('', '_blank', 'width=1200,height=800');
        win.document.write(html);
        win.document.close();
    },
    
    // ============================================
    // DOWNLOAD EXCEL
    // ============================================
    downloadExcel(reportData, reportName) {
        const { headers, rows } = reportData;
        
        let csv = headers.join('\t') + '\n';
        rows.forEach(row => {
            const values = headers.map(h => row[h] || '');
            csv += values.join('\t') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    async deleteReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            window.showNotification('Report not found.', 'error');
            return;
        }
        
        const confirmed = await new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            if (modal) {
                document.getElementById('confirmModalTitle').textContent = 'Delete Report';
                document.getElementById('confirmModalMessage').textContent = 
                    `Are you sure you want to delete "${report.name}"? This action cannot be undone.`;
                modal.style.display = 'flex';
                
                document.getElementById('confirmOkBtn').onclick = () => {
                    modal.style.display = 'none';
                    resolve(true);
                };
                document.getElementById('confirmCancelBtn').onclick = () => {
                    modal.style.display = 'none';
                    resolve(false);
                };
            } else {
                resolve(confirm(`Delete report "${report.name}"?`));
            }
        });
        
        if (!confirmed) return;
        
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
            
            window.showNotification('✅ Report deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            window.showNotification('Delete failed: ' + error.message, 'error');
        }
    },
    
    updateStats() {
        const total = this.reports?.length || 0;
        
        const totalEl = document.getElementById('totalReportsCount');
        if (totalEl) totalEl.textContent = total;
        
        const studentReports = this.reports?.filter(r => r.type === 'EnrollmentList' || r.type === 'ClassRoster').length || 0;
        const studentEl = document.getElementById('studentReportsCount');
        if (studentEl) studentEl.textContent = studentReports;
        
        const performanceReports = this.reports?.filter(r => r.type === 'CourseGradeBook' || r.type === 'PerformanceAnalysis' || r.type === 'UnitProgress').length || 0;
        const performanceEl = document.getElementById('performanceReportsCount');
        if (performanceEl) performanceEl.textContent = performanceReports;
        
        const unitReports = this.reports?.filter(r => r.scope === 'UnitOnly').length || 0;
        const unitEl = document.getElementById('unitReportsCount');
        if (unitEl) unitEl.textContent = unitReports;
        
        const countDisplay = document.getElementById('reportCountDisplay');
        if (countDisplay) countDisplay.textContent = total;
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
    
    formatScope(scope) {
        const scopes = {
            'MyCourses': '📚 My Units',
            'MyStudents': '👨‍🎓 My Students',
            'UnitOnly': '📖 Selected Unit',
            'AllPrograms': '🏫 All Programs'
        };
        return scopes[scope] || scope;
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
    
    clearFilters() {
        this.currentFilters = {
            search: '',
            type: 'all',
            unit: 'all'
        };
        
        const searchInput = document.getElementById('reportSearch');
        if (searchInput) searchInput.value = '';
        
        const typeFilter = document.getElementById('reportTypeFilter');
        if (typeFilter) typeFilter.value = 'all';
        
        const unitFilter = document.getElementById('reportUnitFilter');
        if (unitFilter) unitFilter.value = 'all';
        
        this.renderReports(this.reports);
    },
    
    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadReports();
        window.showNotification('Reports refreshed!', 'success');
    },
    
    exportAllReports() {
        if (!this.reports || this.reports.length === 0) {
            window.showNotification('No reports to export.', 'warning');
            return;
        }
        
        const headers = ['Name', 'Unit', 'Type', 'Scope', 'Format', 'Date'];
        const rows = this.reports.map(r => [
            r.name || 'Untitled',
            this.getUnitName(r.unit_id) || r.unit_name || 'N/A',
            this.formatType(r.type),
            this.formatScope(r.scope),
            r.format || 'PDF',
            this.formatDate(r.created_at)
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.showNotification('Reports exported successfully!', 'success');
    },
    
    printReportTable() {
        window.print();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerReports.init(), 900);
});

// Make available globally
window.LecturerReports = LecturerReports;
window.filterReports = () => LecturerReports.renderReports(LecturerReports.reports);
window.clearReportFilters = () => LecturerReports.clearFilters();
window.refreshReports = () => LecturerReports.refresh();
window.exportAllReports = () => LecturerReports.exportAllReports();
window.printReportTable = () => LecturerReports.printReportTable();

console.log('✅ LecturerReports module loaded - Full report generation with download');
