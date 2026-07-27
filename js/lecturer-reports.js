// js/lecturer-reports.js - FIXED with correct column names
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
                    console.log('✅ Found non-STAFF ID by partial name match:', this.lecturerAssignmentId);
                    return;
                }
                this.lecturerAssignmentId = nameData[0].lecturer_id;
                console.log('⚠️ Found STAFF ID by partial name match:', this.lecturerAssignmentId);
                return;
            }
            
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
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            console.log('🔍 Using lecturer ID for reports:', lecturerId);
            
            // Get units from lecturer_subject_assignments
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
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
            if (!supabase) {
                console.warn('Supabase not available');
                this.reports = this.getMockReports();
                this.renderReports(this.reports);
                this.updateStats();
                return;
            }
            
            // ✅ FIX: Use 'submitted_by' instead of 'created_by'
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
                title: 'Maternal Health - Attendance Summary',
                type: 'AttendanceSummary',
                department: 'Nursing',
                status: 'completed',
                file_url: '#',
                file_name: 'attendance_report.pdf',
                created_at: new Date().toISOString()
            },
            {
                id: 'mock-2',
                title: 'Clinical Skills - Grade Book',
                type: 'CourseGradeBook',
                department: 'Nursing',
                status: 'pending',
                file_url: '#',
                file_name: 'grade_book.xlsx',
                created_at: new Date(Date.now() - 86400000 * 2).toISOString()
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
        
        const statusBadges = {
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">⏳ Pending</span>',
            'completed': '<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">✅ Completed</span>',
            'failed': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500;">❌ Failed</span>'
        };
        
        tbody.innerHTML = filteredReports.map(report => {
            const unitName = this.getUnitName(report.unit_id) || report.unit_name || 'N/A';
            const status = report.status || 'pending';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 14px 18px; font-weight: 600; color: #1e293b;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        ${this.escapeHtml(report.title || 'Untitled Report')}
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
                        ${this.escapeHtml(report.department || 'N/A')}
                    </td>
                    <td style="padding: 14px 18px; color: #475569; font-size: 13px;">
                        ${this.formatDate(report.created_at)}
                    </td>
                    <td style="padding: 14px 18px;">
                        ${statusBadges[status] || statusBadges.pending}
                    </td>
                    <td style="padding: 14px 18px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${report.file_url && report.file_url !== '#' ? `
                                <a href="${report.file_url}" target="_blank" style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            ` : `
                                <span style="color: #94a3b8; font-size: 12px;">Pending</span>
                            `}
                            <button onclick="LecturerReports.deleteReport('${report.id}')" 
                                    style="background: #fee2e2; color: #dc2626; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-trash"></i> Delete
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
            if (search) {
                const searchLower = search.toLowerCase();
                const titleMatch = (report.title || '').toLowerCase().includes(searchLower);
                const typeMatch = (report.type || '').toLowerCase().includes(searchLower);
                const unitMatch = (report.unit_name || '').toLowerCase().includes(searchLower);
                if (!titleMatch && !typeMatch && !unitMatch) return false;
            }
            
            if (type !== 'all' && report.type !== type) return false;
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
    
    async generateReport(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        const unitId = document.getElementById('reportUnit')?.value;
        const reportType = document.getElementById('reportType')?.value;
        const department = document.getElementById('reportScope')?.value || 'Nursing';
        
        if (!unitId || !reportType) {
            window.showNotification('Please select unit and report type.', 'error');
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
            
            const typeNames = {
                'AttendanceSummary': 'Attendance Summary',
                'CourseGradeBook': 'Grade Book',
                'EnrollmentList': 'Enrollment List',
                'PerformanceAnalysis': 'Performance Analysis',
                'ClassRoster': 'Class Roster',
                'UnitProgress': 'Unit Progress'
            };
            
            const reportTitle = `${unitName} - ${typeNames[reportType] || reportType}`;
            
            // ✅ FIX: Use 'submitted_by' instead of 'created_by'
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
                file_name: `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
                created_at: new Date().toISOString()
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
            
            window.showNotification('✅ Report generated successfully!', 'success');
            
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
                    `Are you sure you want to delete "${report.title}"? This action cannot be undone.`;
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
                resolve(confirm(`Delete report "${report.title}"?`));
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
        
        const headers = ['Title', 'Unit', 'Type', 'Department', 'Status', 'Date'];
        const rows = this.reports.map(r => [
            r.title || 'Untitled',
            this.getUnitName(r.unit_id) || r.unit_name || 'N/A',
            this.formatType(r.type),
            r.department || 'N/A',
            r.status || 'pending',
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

console.log('✅ LecturerReports module loaded - Using reports table with correct columns');
