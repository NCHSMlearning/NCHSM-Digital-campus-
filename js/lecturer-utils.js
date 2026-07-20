// js/lecturer-utils.js
/**
 * NCHSM Lecturer Utilities
 * Dedicated utility functions for lecturer dashboard only
 * Does NOT affect student dashboard
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
    // Program Helpers
    // ==========================================
    
    getProgramDisplayName(programCode) {
        const names = {
            'KRCHN': 'KRCHN Nursing',
            'DPOTT': 'Diploma in Perioperative Theatre Technology',
            'DCH': 'Diploma in Community Health',
            'DHRIT': 'Diploma in Health Records and IT',
            'DSL': 'Diploma in Science Lab',
            'DSW': 'Diploma in Social Work',
            'DCJS': 'Diploma in Criminal Justice',
            'DHSS': 'Diploma in Health Support Services',
            'DICT': 'Diploma in ICT',
            'DME': 'Diploma in Medical Engineering',
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
            'ACH': 'Artisan in Community Health',
            'AAG': 'Artisan in Agriculture',
            'ASW': 'Artisan in Social Work',
            'CCA': 'Certificate in Computer Applications',
            'PTE': 'TVET/CDACC (PTE)'
        };
        return names[programCode] || programCode;
    },
    
    getAcademicBlocks(program) {
        const structure = {
            'KRCHN': ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'],
            'TVET': ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final']
        };
        return structure[program] || structure['KRCHN'];
    },
    
    isTVETProgram(programCode) {
        if (!programCode) return false;
        const code = String(programCode).toUpperCase().trim();
        const tvetCodes = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
        ];
        return tvetCodes.includes(code);
    },
    
    getProgramType(programCode) {
        if (!programCode) return 'KRCHN';
        const code = String(programCode).toUpperCase().trim();
        if (code === 'KRCHN') return 'KRCHN';
        if (this.isTVETProgram(code)) return 'TVET';
        return 'KRCHN';
    },
    
    // ==========================================
    // Grade Helpers
    // ==========================================
    
    calculateGrade(score) {
        if (!score && score !== 0) return '-';
        if (score >= 80) return 'A';
        if (score >= 75) return 'A-';
        if (score >= 70) return 'B+';
        if (score >= 65) return 'B';
        if (score >= 60) return 'B-';
        if (score >= 55) return 'C+';
        if (score >= 50) return 'C';
        if (score >= 45) return 'C-';
        if (score >= 40) return 'D+';
        if (score >= 35) return 'D';
        return 'E';
    },
    
    calculateGradePoint(score) {
        const grade = this.calculateGrade(score);
        const points = {
            'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0,
            'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'E': 0.0
        };
        return points[grade] || 0;
    },
    
    getGradeColor(score) {
        if (!score && score !== 0) return '#6b7280';
        if (score >= 80) return '#10b981';
        if (score >= 70) return '#3b82f6';
        if (score >= 60) return '#8b5cf6';
        if (score >= 50) return '#f59e0b';
        if (score >= 40) return '#f97316';
        return '#ef4444';
    },
    
    getGradeStatus(score, passThreshold = 60) {
        if (!score && score !== 0) return 'PENDING';
        if (score >= passThreshold) return 'PASS';
        if (score > 0) return 'FAIL';
        return 'PENDING';
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
    // Debounce
    // ==========================================
    
    debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
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
    }
};

// ============================================
// EXPOSE TO GLOBAL SCOPE
// ============================================

// Make LecturerUtils globally available
window.LecturerUtils = LecturerUtils;

// Also alias as Utils for compatibility with existing modules
window.Utils = LecturerUtils;

console.log('✅ LecturerUtils loaded successfully');
console.log('📚 Available functions:', Object.keys(LecturerUtils).join(', '));
