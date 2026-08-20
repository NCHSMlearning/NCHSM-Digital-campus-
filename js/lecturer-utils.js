// js/lecturer-utils.js
/**
 * NCHSM Lecturer Utilities
 * Dedicated utility functions for lecturer dashboard only
 * Does NOT affect student dashboard
 * Supports both Nursing (KRCHN) and TVET programs
 */

const LecturerUtils = {
    // ==========================================
    // DOM Helpers
    // ==========================================
    
    $(id) { return document.getElementById(id); },
    
    $$(selector) { return document.querySelectorAll(selector); },
    
    // ==========================================
    // String Helpers
    // ==========================================
    
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },
    
    truncate(str, maxLength = 50) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    },
    
    // ==========================================
    // Date Helpers
    // ==========================================
    
    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },
    
    formatTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatDateTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    getToday() {
        return new Date().toISOString().split('T')[0];
    },
    
    getWeekRange() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(today);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setDate(diff + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    },
    
    getMonthRange() {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    },
    
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diff = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },
    
    // ==========================================
    // Academic Year Helpers
    // ==========================================
    
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
    
    getAcademicYearStart(yearStr) {
        if (!yearStr) return null;
        const parts = yearStr.split('/');
        if (parts.length !== 2) return null;
        return new Date(parseInt(parts[0]), 6, 1);
    },
    
    getAcademicYearEnd(yearStr) {
        if (!yearStr) return null;
        const parts = yearStr.split('/');
        if (parts.length !== 2) return null;
        return new Date(parseInt(parts[1]), 5, 30);
    },
    
    isAcademicYearActive(yearStr) {
        if (!yearStr) return false;
        const now = new Date();
        const start = this.getAcademicYearStart(yearStr);
        const end = this.getAcademicYearEnd(yearStr);
        if (!start || !end) return false;
        return now >= start && now <= end;
    },
    
    getWeeksInSemester(semester = 1) {
        return semester === 1 ? 16 : 14;
    },
    
    // ==========================================
    // 🆕 PROGRAM TYPE DETECTION
    // ==========================================
    
    getProgramType(programCode) {
        if (!programCode) return 'KRCHN';
        const upper = String(programCode).toUpperCase().trim();
        
        // Nursing programs
        if (upper === 'KRCHN') return 'KRCHN';
        
        // TVET Programs
        const tvetPrograms = [
            // Diplomas
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            // Certificates
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            // Artisan
            'ACH', 'AAG', 'ASW',
            // Other TVET
            'CCA', 'PTE'
        ];
        
        if (tvetPrograms.includes(upper)) return 'TVET';
        
        return 'KRCHN';
    },
    
    getProgramLevel(programCode) {
        if (!programCode) return 'DIPLOMA';
        const upper = String(programCode).toUpperCase().trim();
        
        if (upper.startsWith('D')) return 'DIPLOMA';
        if (upper.startsWith('C')) return 'CERTIFICATE';
        if (upper.startsWith('A')) return 'ARTISAN';
        
        return 'DIPLOMA';
    },
    
    isTVETProgram(programCode) {
        return this.getProgramType(programCode) === 'TVET';
    },
    
    isNursingProgram(programCode) {
        return this.getProgramType(programCode) === 'KRCHN';
    },
    
    // ==========================================
    // 🆕 ACADEMIC BLOCKS/TERMS
    // ==========================================
    
    getAcademicBlocks(programCode) {
        const programType = this.getProgramType(programCode);
        const programLevel = this.getProgramLevel(programCode);
        let options = [];
        
        if (programType === 'KRCHN') {
            // KRCHN Nursing Blocks
            options = [
                { value: 'Introductory', text: '🌟 Introductory Block' },
                { value: 'Block 1', text: '📘 Block 1' },
                { value: 'Block 2', text: '📗 Block 2' },
                { value: 'Block 3', text: '📒 Block 3' },
                { value: 'Block 4', text: '📙 Block 4' },
                { value: 'Block 5', text: '📕 Block 5' },
                { value: 'Block 6', text: '📚 Block 6' },
                { value: 'Final', text: '🏆 Final Block' }
            ];
        } else if (programType === 'TVET') {
            if (programLevel === 'DIPLOMA') {
                // Diploma TVET: Year 1 Term 1 to Year 2 Term 3
                options = [
                    { value: 'Y1T1', text: '📘 Year 1 Term 1' },
                    { value: 'Y1T2', text: '📗 Year 1 Term 2' },
                    { value: 'Y1T3', text: '📒 Year 1 Term 3' },
                    { value: 'Y2T1', text: '📙 Year 2 Term 1' },
                    { value: 'Y2T2', text: '📕 Year 2 Term 2' },
                    { value: 'Y2T3', text: '📚 Year 2 Term 3' }
                ];
            } else if (programLevel === 'CERTIFICATE') {
                // Certificate TVET: Year 1 Term 1 to Term 3
                options = [
                    { value: 'Y1T1', text: '📘 Year 1 Term 1' },
                    { value: 'Y1T2', text: '📗 Year 1 Term 2' },
                    { value: 'Y1T3', text: '📒 Year 1 Term 3' }
                ];
            } else if (programLevel === 'ARTISAN') {
                // Artisan TVET: Year 1 Term 1 to Term 2
                options = [
                    { value: 'Y1T1', text: '📘 Year 1 Term 1' },
                    { value: 'Y1T2', text: '📗 Year 1 Term 2' }
                ];
            } else {
                // Generic TVET
                options = [
                    { value: 'Introductory', text: '🌟 Introductory Term' },
                    { value: 'Term1', text: '📘 Term 1' },
                    { value: 'Term2', text: '📗 Term 2' },
                    { value: 'Term3', text: '📒 Term 3' },
                    { value: 'Term4', text: '📙 Term 4' },
                    { value: 'Term5', text: '📕 Term 5' },
                    { value: 'Term6', text: '📚 Term 6' },
                    { value: 'Final', text: '🏆 Final Term' }
                ];
            }
        }
        
        return options;
    },
    
    getBlockDisplayName(blockValue, programCode = 'KRCHN') {
        if (!blockValue) return 'Unknown Block';
        const blocks = this.getAcademicBlocks(programCode);
        const found = blocks.find(b => b.value === blockValue);
        return found ? found.text : blockValue;
    },
    
    getBlockShortName(blockValue) {
        if (!blockValue) return 'N/A';
        // Return the raw value for database storage
        return blockValue;
    },
    
    getBlocksAsArray(programCode = 'KRCHN') {
        const blocks = this.getAcademicBlocks(programCode);
        return blocks.map(b => b.value);
    },
    
    getBlocksAsSelectOptions(programCode = 'KRCHN') {
        const blocks = this.getAcademicBlocks(programCode);
        return blocks;
    },
    
    // ==========================================
    // 🆕 GRADE CALCULATION - TVET vs NURSING
    // ==========================================
    
    calculateGrade(score, programType = 'KRCHN') {
        if (score === null || score === undefined || isNaN(score)) {
            return { grade: '-', gradePoint: 0, status: 'N/A' };
        }
        
        const numScore = parseFloat(score);
        
        if (programType === 'TVET') {
            // ============ TVET GRADING ============
            // A (80-100%) = 4.0
            // B (65-79%) = 3.0
            // C (50-64%) = 2.0
            // E (0-49%) = 0.0
            // PASS = 50%
            
            if (numScore >= 80) {
                return { grade: 'A', gradePoint: 4.0, status: 'PASS' };
            } else if (numScore >= 65) {
                return { grade: 'B', gradePoint: 3.0, status: 'PASS' };
            } else if (numScore >= 50) {
                return { grade: 'C', gradePoint: 2.0, status: 'PASS' };
            } else {
                return { grade: 'E', gradePoint: 0.0, status: 'FAIL' };
            }
        } else {
            // ============ KRCHN NURSING GRADING ============
            // A (75-100%) = 4.0
            // B (65-74%) = 3.0
            // C (60-64%) = 2.0
            // D (0-59%) = 0.0
            // PASS = 60%
            
            if (numScore >= 75) {
                return { grade: 'A', gradePoint: 4.0, status: 'PASS' };
            } else if (numScore >= 65) {
                return { grade: 'B', gradePoint: 3.0, status: 'PASS' };
            } else if (numScore >= 60) {
                return { grade: 'C', gradePoint: 2.0, status: 'PASS' };
            } else {
                return { grade: 'D', gradePoint: 0.0, status: 'FAIL' };
            }
        }
    },
    
    // Simplified grade letter (for display)
    calculateGradeLetter(score, programType = 'KRCHN') {
        const result = this.calculateGrade(score, programType);
        return result.grade;
    },
    
    // Grade point (for GPA)
    calculateGradePoint(score, programType = 'KRCHN') {
        const result = this.calculateGrade(score, programType);
        return result.gradePoint;
    },
    
    // Get passing threshold for program
    getPassingThreshold(programType = 'KRCHN') {
        if (programType === 'TVET') return 50;
        return 60; // Nursing
    },
    
    // Get grade status (PASS/FAIL)
    getGradeStatus(score, programType = 'KRCHN') {
        const result = this.calculateGrade(score, programType);
        return result.status;
    },
    
    // Get color for grade
    getGradeColor(score, programType = 'KRCHN') {
        const result = this.calculateGrade(score, programType);
        const grade = result.grade;
        const colors = {
            'A': '#10b981',
            'B': '#3b82f6',
            'C': '#f59e0b',
            'D': '#ef4444',
            'E': '#ef4444',
            '-': '#94a3b8'
        };
        return colors[grade] || '#94a3b8';
    },
    
    // Get grading system reference
    getGradingSystem(programType = 'KRCHN') {
        if (programType === 'TVET') {
            return {
                name: 'TVET Grading System',
                grades: [
                    { grade: 'A', range: '80-100%', points: 4.0, status: 'PASS' },
                    { grade: 'B', range: '65-79%', points: 3.0, status: 'PASS' },
                    { grade: 'C', range: '50-64%', points: 2.0, status: 'PASS' },
                    { grade: 'E', range: '0-49%', points: 0.0, status: 'FAIL' }
                ],
                passingScore: 50,
                color: '#8b5cf6',
                icon: '🔧'
            };
        } else {
            return {
                name: 'Nursing Grading System',
                grades: [
                    { grade: 'A', range: '75-100%', points: 4.0, status: 'PASS' },
                    { grade: 'B', range: '65-74%', points: 3.0, status: 'PASS' },
                    { grade: 'C', range: '60-64%', points: 2.0, status: 'PASS' },
                    { grade: 'D', range: '0-59%', points: 0.0, status: 'FAIL' }
                ],
                passingScore: 60,
                color: '#4C1D95',
                icon: '🎓'
            };
        }
    },
    
    // ==========================================
    // PROGRAM DISPLAY HELPERS
    // ==========================================
    
    getProgramDisplayName(programCode) {
        const names = {
            // Nursing
            'KRCHN': 'KRCHN Nursing',
            
            // Diploma Programs
            'DPOTT': 'Diploma in Perioperative Theatre Technology',
            'DCH': 'Diploma in Community Health',
            'DHRIT': 'Diploma in Health Records and IT',
            'DSL': 'Diploma in Science Lab',
            'DSW': 'Diploma in Social Work',
            'DCJS': 'Diploma in Criminal Justice',
            'DHSS': 'Diploma in Health Support Services',
            'DICT': 'Diploma in ICT',
            'DME': 'Diploma in Medical Engineering',
            
            // Certificate Programs
            'CPOTT': 'Certificate in Perioperative Theatre Technology',
            'CCH': 'Certificate in Community Health',
            'CHRIT': 'Certificate in Health Records and IT',
            'CPC': 'Certificate in Patient Care',
            'CSL': 'Certificate in Science Lab',
            'CSW': 'Certificate in Social Work',
            'CCJS': 'Certificate in Criminal Justice',
            'CAG': 'Certificate in Agriculture',
            'CHSS': 'Certificate in Health Support Services',
            'CICT': 'Certificate in ICT',
            
            // Artisan Programs
            'ACH': 'Artisan in Community Health',
            'AAG': 'Artisan in Agriculture',
            'ASW': 'Artisan in Social Work',
            
            // Other
            'CCA': 'Certificate in Computer Applications',
            'PTE': 'TVET/CDACC'
        };
        return names[programCode] || programCode;
    },
    
    getProgramShortName(programCode) {
        const short = {
            'KRCHN': 'KRCHN',
            'DPOTT': 'DPOTT',
            'DCH': 'DCH',
            'DHRIT': 'DHRIT',
            'DSL': 'DSL',
            'DSW': 'DSW',
            'DCJS': 'DCJS',
            'DHSS': 'DHSS',
            'DICT': 'DICT',
            'DME': 'DME',
            'CPOTT': 'CPOTT',
            'CCH': 'CCH',
            'CHRIT': 'CHRIT',
            'CPC': 'CPC',
            'CSL': 'CSL',
            'CSW': 'CSW',
            'CCJS': 'CCJS',
            'CAG': 'CAG',
            'CHSS': 'CHSS',
            'CICT': 'CICT',
            'ACH': 'ACH',
            'AAG': 'AAG',
            'ASW': 'ASW',
            'CCA': 'CCA',
            'PTE': 'PTE'
        };
        return short[programCode] || programCode;
    },
    
    getProgramTypeLabel(programCode) {
        const type = this.getProgramType(programCode);
        if (type === 'KRCHN') return '🎓 Nursing';
        if (type === 'TVET') {
            const level = this.getProgramLevel(programCode);
            if (level === 'DIPLOMA') return '🔧 TVET Diploma';
            if (level === 'CERTIFICATE') return '🔧 TVET Certificate';
            if (level === 'ARTISAN') return '🔧 TVET Artisan';
            return '🔧 TVET';
        }
        return '📚 Unknown';
    },
    
    // ==========================================
    // Portfolio/Teaching File Helpers
    // ==========================================
    
    getPortfolioCompletionStatus(stats) {
        const totalItems = (stats.totalCourses || 0) + (stats.schemesCompleted || 0) + (stats.lessonPlans || 0);
        const completedItems = stats.approved || 0;
        if (totalItems === 0) return 0;
        return Math.round((completedItems / totalItems) * 100);
    },
    
    getPortfolioStatusColor(percentage) {
        if (percentage >= 80) return '#10b981';
        if (percentage >= 50) return '#f59e0b';
        return '#ef4444';
    },
    
    getPortfolioStatusLabel(percentage) {
        if (percentage >= 80) return 'Excellent';
        if (percentage >= 60) return 'Good';
        if (percentage >= 40) return 'In Progress';
        if (percentage >= 20) return 'Needs Attention';
        return 'Not Started';
    },
    
    // ==========================================
    // Array Helpers
    // ==========================================
    
    unique(arr) {
        return [...new Set(arr)];
    },
    
    groupBy(arr, key) {
        return arr.reduce((acc, item) => {
            const k = item[key] || 'unknown';
            if (!acc[k]) acc[k] = [];
            acc[k].push(item);
            return acc;
        }, {});
    },
    
    sortBy(arr, key, ascending = true) {
        return [...arr].sort((a, b) => {
            const va = a[key] || '';
            const vb = b[key] || '';
            if (typeof va === 'string') {
                return ascending ? va.localeCompare(vb) : vb.localeCompare(va);
            }
            return ascending ? va - vb : vb - va;
        });
    },
    
    paginate(arr, page, pageSize = 20) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return {
            data: arr.slice(start, end),
            total: arr.length,
            page,
            pageSize,
            totalPages: Math.ceil(arr.length / pageSize)
        };
    },
    
    // ==========================================
    // Form Helpers
    // ==========================================
    
    populateSelect(selectElement, data, valueKey, textKey, defaultText = 'Select') {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
        if (!data || !data.length) return;
        
        data.forEach(item => {
            const value = item[valueKey] || item.id || '';
            const text = item[textKey] || item.name || value;
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            selectElement.appendChild(option);
        });
    },
    
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                data[key] = value;
            } else {
                data[key] = value.trim();
            }
        }
        return data;
    },
    
    setFormData(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`) || document.getElementById(key);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = !!data[key];
                } else if (input.type !== 'file') {
                    input.value = data[key] || '';
                }
            }
        });
    },
    
    validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: ['Form not found'] };
        
        const errors = [];
        Object.keys(rules).forEach(field => {
            const input = form.querySelector(`[name="${field}"]`) || document.getElementById(field);
            if (!input) return;
            
            const value = input.value.trim();
            const rule = rules[field];
            
            if (rule.required && !value) {
                errors.push(`${rule.label || field} is required`);
            }
            if (rule.min !== undefined && parseFloat(value) < rule.min) {
                errors.push(`${rule.label || field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && parseFloat(value) > rule.max) {
                errors.push(`${rule.label || field} must be at most ${rule.max}`);
            }
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${rule.label || field} has invalid format`);
            }
        });
        
        return { valid: errors.length === 0, errors };
    },
    
    // ==========================================
    // File Helpers
    // ==========================================
    
    getFileSize(size) {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    },
    
    getFileExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts[parts.length - 1].toLowerCase();
    },
    
    isAllowedFileType(filename, allowedTypes = null) {
        const ext = this.getFileExtension(filename);
        const allowed = allowedTypes || ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'zip'];
        return allowed.includes(ext);
    },
    
    // ==========================================
    // Export/Import
    // ==========================================
    
    exportJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    exportCSV(data, filename, headers = null) {
        if (!data || !data.length) {
            console.warn('No data to export');
            return;
        }
        
        const keys = headers || Object.keys(data[0]);
        const headerRow = keys.join(',');
        const rows = data.map(item => 
            keys.map(key => {
                const value = item[key] || '';
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',')
        );
        
        const csv = [headerRow, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // ==========================================
    // Local Storage
    // ==========================================
    
    storage: {
        set(key, value) {
            localStorage.setItem(`nchsm_lecturer_${key}`, JSON.stringify(value));
        },
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(`nchsm_lecturer_${key}`);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        remove(key) {
            localStorage.removeItem(`nchsm_lecturer_${key}`);
        },
        clear() {
            Object.keys(localStorage)
                .filter(k => k.startsWith('nchsm_lecturer_'))
                .forEach(k => localStorage.removeItem(k));
        }
    },
    
    // ==========================================
    // Debounce & Throttle
    // ==========================================
    
    debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
    
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // ==========================================
    // Validation
    // ==========================================
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    isValidPhone(phone) {
        return /^\+?[\d\s-()]{10,15}$/.test(phone);
    },
    
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // ==========================================
    // Color Helpers
    // ==========================================
    
    getRandomColor(seed) {
        const colors = [
            '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
            '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
        ];
        if (seed !== undefined) {
            const index = String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return colors[index % colors.length];
        }
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // ==========================================
    // Notification Helpers
    // ==========================================
    
    notify(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },
    
    notifySuccess(message) {
        this.notify(message, 'success');
    },
    
    notifyError(message) {
        this.notify(message, 'error');
    },
    
    notifyWarning(message) {
        this.notify(message, 'warning');
    },
    
    notifyInfo(message) {
        this.notify(message, 'info');
    }
};

// ============================================
// 🆕 ADD GLOBAL FUNCTIONS FOR EASY ACCESS
// ============================================

// Make functions globally available
window.getProgramType = (code) => LecturerUtils.getProgramType(code);
window.getProgramLevel = (code) => LecturerUtils.getProgramLevel(code);
window.isTVETProgram = (code) => LecturerUtils.isTVETProgram(code);
window.isNursingProgram = (code) => LecturerUtils.isNursingProgram(code);
window.getAcademicBlocks = (code) => LecturerUtils.getAcademicBlocks(code);
window.calculateGrade = (score, type) => LecturerUtils.calculateGrade(score, type);
window.getProgramDisplayName = (code) => LecturerUtils.getProgramDisplayName(code);
window.getProgramTypeLabel = (code) => LecturerUtils.getProgramTypeLabel(code);
window.getGradingSystem = (type) => LecturerUtils.getGradingSystem(type);
window.getPassingThreshold = (type) => LecturerUtils.getPassingThreshold(type);

// ============================================
// EXPOSE TO GLOBAL SCOPE
// ============================================

// Make LecturerUtils globally available
window.LecturerUtils = LecturerUtils;

// Also alias as Utils for compatibility with existing modules
window.Utils = LecturerUtils;

console.log('✅ LecturerUtils loaded successfully');
console.log('📚 Available functions:', Object.keys(LecturerUtils).join(', '));
console.log('📚 TVET/Nursing support enabled');
console.log('🎓 Nursing: A(75%) B(65%) C(60%) D(0%)');
console.log('🔧 TVET: A(80%) B(65%) C(50%) E(0%)');
