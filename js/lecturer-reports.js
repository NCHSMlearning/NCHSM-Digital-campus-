// js/lecturer-reports.js
/**
 * NCHSM Lecturer Reports Module
 * Generate and manage academic reports for assigned units and students
 */

const LecturerReports = {
    reports: [],
    assignedUnits: [],
    currentFilters: {
        search: '',
        type: 'all',
        unit: 'all'
    },
    
    async init() {
        console.log('📊 Initializing Lecturer Reports...');
        await this.loadAssignedUnits();
        await this.loadReports();
        this.populateReportForm();
        this.setupEventListeners();
        this.updateStats();
        console.log('✅ Lecturer Reports initialized');
    },
    
    async loadAssignedUnits() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                // Get units assigned to this lecturer
                const { data: units, error } = await supabase
                    .from('unit_assignments')
                    .select(`
                        unit_id,
                        units:unit_id (
                            id,
                            name,
                            code,
                            program,
                            block,
                            intake
                        )
                    `)
                    .eq('lecturer_id', profile.user_id);
                
                if (!error) {
                    this.assignedUnits = units?.map(u => u.units).filter(Boolean) || [];
                } else {
                    console.error('Error loading assigned units:', error);
                    this.assignedUnits = this.getMockUnits();
                }
            } else {
                this.assignedUnits = this.getMockUnits();
            }
            
            this.populateUnitSelectors();
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
            this.assignedUnits = this.getMockUnits();
            this.populateUnitSelectors();
        }
    },
    
    getMockUnits() {
        return [
            { id: 'unit-1', name: 'Maternal Health', code: 'MH101', program: 'KRCHN', block: 'Block 1' },
            { id: 'unit-2', name: 'Clinical Skills', code: 'CS102', program: 'KRCHN', block: 'Block 1' },
            { id: 'unit-3', name: 'Mental Health Nursing', code: 'MHN201', program: 'KRCHN', block: 'Block 2' }
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
                    option.value = unit.id || unit.unit_id;
                    const displayName = unit.code ? `${unit.code} - ${unit.name}` : unit.name || 'Unnamed Unit';
                    option.textContent = displayName;
                    if (unit.program) {
                        option.textContent += ` (${unit.program})`;
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
        const unit = this.assignedUnits.find(u => u.id === unitId || u.unit_id === unitId);
        return unit ? (unit.name || unit.code) : null;
    },
    
    populateReportForm() {
        // Set default date
        const dateInput = document.getElementById('reportDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    },
    
    setupEventListeners() {
        // Generate report form
        const form = document.getElementById('reportGenerationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.generateReport(e));
        }
        
        // Search input
        const searchInput = document.getElementById('reportSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                this.currentFilters.search = e.target.value;
                this.renderReports(this.reports);
            });
        }
        
        // Type filter
        const typeFilter = document.getElementById('reportTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.renderReports(this.reports);
            });
        }
        
        // Unit filter
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
            
            const unit = this.assignedUnits.find(u => u.id === unitId || u.unit_id === unitId);
            const unitName = unit ? (unit.name || unit.code || 'Selected Unit') : 'Selected Unit';
            
            // Generate report name
            const typeNames = {
                'AttendanceSummary': 'Attendance Summary',
                'CourseGradeBook': 'Grade Book',
                'EnrollmentList': 'Enrollment List',
                'PerformanceAnalysis': 'Performance Analysis',
                'ClassRoster': 'Class Roster',
                'UnitProgress': 'Unit Progress'
            };
            
            const reportName = `${unitName} - ${typeNames[reportType] || reportType}`;
            
            // Create report object
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
            
            // Save to database
            const supabase = window.lecturerDB?.supabase;
            if (supabase) {
                const { error: dbError } = await supabase
                    .from('reports')
                    .insert([newReport]);
                
                if (dbError) {
                    console.error('Database insert error:', dbError);
                }
            }
            
            // Add to local list
            this.reports.unshift(newReport);
            this.renderReports(this.reports);
            this.updateStats();
            
            window.showNotification('✅ Report generated successfully!', 'success');
            
            // Reset form
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
        
        // Confirm deletion
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
            
            // Remove from local list
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
        
        // Update stat cards
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
        
        // Update count display
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
        await this.loadAssignedUnits();
        await this.loadReports();
        window.showNotification('Reports refreshed!', 'success');
    },
    
    exportAllReports() {
        if (!this.reports || this.reports.length === 0) {
            window.showNotification('No reports to export.', 'warning');
            return;
        }
        
        // Create CSV export
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
