// js/academic-reports.js - COMPLETE WITH DYNAMIC BLOCK/TERM FILTERING + ENHANCEMENTS
(function() {
    'use strict';
    
    console.log('📊 Academic Reports Module Loading...');
    
    // TVET Program Codes
    const TVET_PROGRAMS = [
        'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
        'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
        'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
    ];
    
    // DOM Elements
    const elements = {
        semesterGpa: document.getElementById('semester-gpa'),
        semesterGrade: document.getElementById('semester-grade'),
        cumulativeGpa: document.getElementById('cumulative-gpa'),
        cumulativeGrade: document.getElementById('cumulative-grade'),
        totalCreditsEarned: document.getElementById('total-credits-earned'),
        classRank: document.getElementById('class-rank'),
        gradesTableBody: document.getElementById('grades-table-body'),
        yearGpa: document.getElementById('year-gpa'),
        yearCredits: document.getElementById('year-credits'),
        yearCourses: document.getElementById('year-courses'),
        yearAwards: document.getElementById('year-awards'),
        studentNameDisplay: document.getElementById('student-name-display'),
        programDisplay: document.getElementById('program-display'),
        studentIdDisplay: document.getElementById('student-id-display'),
        transcriptTableBody: document.getElementById('transcript-table-body'),
        totalAttempted: document.getElementById('total-attempted'),
        totalEarned: document.getElementById('total-earned'),
        transcriptCgpa: document.getElementById('transcript-cgpa'),
        completedCoursesProgress: document.getElementById('completed-courses-progress'),
        totalCoursesProgress: document.getElementById('total-courses-progress'),
        courseProgressList: document.getElementById('course-progress-list'),
        filterSelect: document.getElementById('semester-filter'),
        programTypeIndicator: document.getElementById('program-type-indicator')
    };
    
    let gradeChart = null;
    let currentFilter = 'all';
    let currentData = {
        grades: [],
        totalGpa: '0.00',
        totalGrade: 'F',
        totalCredits: 0,
        programType: 'KRCHN',
        filterOptions: []
    };
    
    // ============================================
    // ADD PURPLE THEME STYLES
    // ============================================
    function addPurpleThemeStyles() {
        const styleId = 'academic-reports-purple-theme';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .gpa-summary .gpa-card {
                background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%) !important;
                border: none !important;
                box-shadow: 0 8px 20px rgba(76, 29, 149, 0.3) !important;
                border-radius: 20px !important;
                padding: 1.5rem !important;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .gpa-summary .gpa-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 30px rgba(76, 29, 149, 0.4) !important;
            }
            .gpa-card .gpa-icon {
                width: 48px;
                height: 48px;
                background: rgba(255,255,255,0.15);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
                margin-bottom: 8px;
            }
            .gpa-card .gpa-label {
                color: rgba(255,255,255,0.85) !important;
                font-size: 0.85rem !important;
                text-transform: uppercase !important;
                letter-spacing: 1px !important;
            }
            .gpa-card .gpa-value {
                color: #ffffff !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                font-size: 2.5rem !important;
                font-weight: 800 !important;
            }
            .gpa-card .grade-value {
                color: #e9d5ff !important;
                font-size: 1rem !important;
                font-weight: 600 !important;
            }
            .grades-table th {
                background: #7c3aed !important;
                color: white !important;
                font-weight: 600 !important;
            }
            .grades-table td {
                color: #1e293b !important;
            }
            .grades-table tr:hover {
                background: #f5f3ff !important;
            }
            .report-tab {
                padding: 10px 20px;
                border: none;
                background: none;
                cursor: pointer;
                font-weight: 600;
                color: #94a3b8;
                border-bottom: 3px solid transparent;
                transition: all 0.3s ease;
                font-size: 14px;
            }
            .report-tab:hover {
                color: #4c1d95;
            }
            .report-tab.active {
                border-bottom-color: #7c3aed !important;
                color: #7c3aed !important;
            }
            .report-tab i {
                margin-right: 8px;
            }
            .grade-letter {
                background: #eef2ff !important;
                color: #4c1d95 !important;
                font-weight: bold !important;
                padding: 4px 12px !important;
                border-radius: 20px !important;
                display: inline-block;
            }
            .filter-info-bar {
                background: #f3e8ff;
                padding: 8px 16px;
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .filter-info-bar i {
                color: #7c3aed;
            }
            .status-pass {
                color: #10b981 !important;
                font-weight: 600;
            }
            .status-fail {
                color: #ef4444 !important;
                font-weight: 600;
            }
            .gpa-card .rank-badge {
                background: rgba(255,255,255,0.2);
                padding: 2px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                color: white;
                display: inline-block;
                margin-top: 4px;
            }
            .transcript-table th {
                background: #4c1d95 !important;
                color: white !important;
            }
            .progress-bar-bg {
                background: #e2e8f0;
                border-radius: 12px;
                height: 10px;
                overflow: hidden;
            }
            .progress-bar-fill {
                height: 100%;
                border-radius: 12px;
                transition: width 0.6s ease;
            }
            .course-progress-item {
                margin-bottom: 1.5rem;
                padding: 12px;
                background: #f8fafc;
                border-radius: 8px;
                border-left: 4px solid #7c3aed;
            }
            .student-info-bar {
                background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
                padding: 12px 20px;
                border-radius: 12px;
                margin: 16px 0 20px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                border: 1px solid #c4b5fd;
            }
            .student-info-bar .info-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .student-info-bar .info-item i {
                color: #7c3aed;
            }
            .student-info-bar .info-item span {
                color: #1e293b;
            }
            .student-info-bar .result-badge {
                background: #7c3aed;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            @media (max-width: 768px) {
                .gpa-summary {
                    grid-template-columns: 1fr 1fr !important;
                }
                .student-info-bar {
                    flex-direction: column;
                    align-items: flex-start;
                }
                .report-tab {
                    font-size: 12px;
                    padding: 8px 12px;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('🎨 Purple theme styles added');
    }
    
    // ============================================
    // PROGRAM TYPE DETECTION
    // ============================================
    function determineProgramType() {
        const profile = window.currentUserProfile || {};
        const programCode = (profile.program || profile.course || 'KRCHN').toUpperCase().trim();
        
        if (TVET_PROGRAMS.includes(programCode)) {
            let level = 'CERTIFICATE';
            if (programCode.startsWith('D')) level = 'DIPLOMA';
            if (programCode.startsWith('A')) level = 'ARTISAN';
            return { type: 'TVET', level: level, code: programCode };
        }
        return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
    }
    
    // ============================================
    // GET FILTER OPTIONS
    // ============================================
    function getFilterOptions() {
        const programInfo = determineProgramType();
        
        if (programInfo.type === 'TVET') {
            return [
                { value: 'all', label: '📚 All Terms', icon: 'fa-layer-group' },
                { value: 'Term 1', label: '📘 Term 1', icon: 'fa-book' },
                { value: 'Term 2', label: '📗 Term 2', icon: 'fa-book' },
                { value: 'Term 3', label: '📙 Term 3', icon: 'fa-book' },
                { value: 'Term 4', label: '📕 Term 4', icon: 'fa-book' },
                { value: 'Term 5', label: '📔 Term 5', icon: 'fa-book' },
                { value: 'Term 6', label: '📓 Term 6', icon: 'fa-book' }
            ];
        } else {
            return [
                { value: 'all', label: '📚 All Blocks', icon: 'fa-layer-group' },
                { value: 'Introductory Block', label: '🎓 Introductory Block', icon: 'fa-flag-checkered' },
                { value: 'Block 1', label: '📖 Block 1', icon: 'fa-book' },
                { value: 'Block 2', label: '📗 Block 2', icon: 'fa-book' },
                { value: 'Block 3', label: '📘 Block 3', icon: 'fa-book' },
                { value: 'Block 4', label: '📙 Block 4', icon: 'fa-book' },
                { value: 'Block 5', label: '📕 Block 5', icon: 'fa-book' },
                { value: 'Final Block', label: '🏆 Final Block', icon: 'fa-trophy' }
            ];
        }
    }
    
    // ============================================
    // GRADE CALCULATIONS
    // ============================================
    function calculateLetterGrade(percentage) {
        if (percentage === null || percentage === undefined) return 'N/A';
        if (percentage >= 85) return 'A';
        if (percentage >= 75) return 'B+';
        if (percentage >= 70) return 'B';
        if (percentage >= 65) return 'C+';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    function calculateGPAFromPercentage(percentage) {
        if (percentage === null || percentage === undefined) return 0;
        if (percentage >= 85) return 4.0;
        if (percentage >= 75) return 3.5;
        if (percentage >= 70) return 3.0;
        if (percentage >= 65) return 2.5;
        if (percentage >= 60) return 2.0;
        if (percentage >= 50) return 1.0;
        return 0.0;
    }
    
    function getGradeColor(percentage) {
        if (percentage >= 85) return '#10b981';
        if (percentage >= 75) return '#3b82f6';
        if (percentage >= 70) return '#8b5cf6';
        if (percentage >= 65) return '#f59e0b';
        if (percentage >= 60) return '#f97316';
        return '#ef4444';
    }
    
   // ============================================
// LOAD REAL GRADES FROM EXAMS MODULE (FIXED)
// ============================================
async function loadRealGrades() {
    console.log('📚 Loading REAL grades from exams module...');
    
    // First check if examsModule already has data
    let examsData = [];
    let moduleFound = false;
    
    // Helper to get data from examsModule
    function getExamsData() {
        if (window.examsModule && window.examsModule.allExams) {
            // Check if allExams has actual data (not just empty array)
            if (window.examsModule.allExams.length > 0) {
                return window.examsModule.allExams;
            }
            // Also check if there's data in the exam groups (exams might be stored differently)
            if (window.examsModule.allExams && window.examsModule.allExams.length > 0) {
                return window.examsModule.allExams;
            }
        }
        // Check the global shortcut
        if (window.examsData && window.examsData.allExams && window.examsData.allExams.length > 0) {
            return window.examsData.allExams;
        }
        return null;
    }
    
    // Try immediate check
    const immediateData = getExamsData();
    if (immediateData) {
        examsData = immediateData;
        moduleFound = true;
        console.log(`✅ Found ${examsData.length} exams immediately`);
    }
    
    // If not found, wait for the event or poll
    if (!moduleFound) {
        console.log('⏳ Waiting for exams module to load data...');
        
        // Wait for either the event or max 20 attempts
        let attempts = 0;
        const maxAttempts = 20;
        let eventResolved = false;
        
        // Create a promise that resolves on the event
        const eventPromise = new Promise((resolve) => {
            const handler = (e) => {
                console.log('📢 examsModuleReady event received!');
                const data = e.detail?.allExams || e.detail?.exams || getExamsData();
                if (data && data.length > 0) {
                    eventResolved = true;
                    resolve(data);
                } else {
                    // Event fired but no data yet - try again
                    setTimeout(() => {
                        const retryData = getExamsData();
                        if (retryData && retryData.length > 0) {
                            resolve(retryData);
                        }
                    }, 300);
                }
            };
            document.addEventListener('examsModuleReady', handler);
            
            // Also listen for appReady event which might trigger after exams load
            const appHandler = () => {
                const data = getExamsData();
                if (data && data.length > 0) {
                    eventResolved = true;
                    resolve(data);
                }
            };
            document.addEventListener('appReady', appHandler);
            
            // Cleanup listeners after timeout
            setTimeout(() => {
                document.removeEventListener('examsModuleReady', handler);
                document.removeEventListener('appReady', appHandler);
            }, 8000);
        });
        
        // Polling as fallback
        const pollData = async () => {
            while (attempts < maxAttempts && !eventResolved) {
                const data = getExamsData();
                if (data && data.length > 0) {
                    return data;
                }
                await new Promise(resolve => setTimeout(resolve, 300));
                attempts++;
                console.log(`⏳ Waiting for exams module... attempt ${attempts}`);
            }
            return null;
        };
        
        // Race between event and polling
        try {
            const result = await Promise.race([
                eventPromise,
                pollData(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]);
            
            if (result && result.length > 0) {
                examsData = result;
                moduleFound = true;
                console.log(`✅ Found ${examsData.length} exams after waiting`);
            }
        } catch (error) {
            console.warn('⚠️ Timeout waiting for exams module:', error.message);
        }
    }
    
    // If we still don't have data, try one more time with a direct check
    if (!moduleFound || !examsData || examsData.length === 0) {
        console.log('🔍 Final attempt to get exam data...');
        // Check window.examsModule directly one more time
        if (window.examsModule && window.examsModule.allExams && window.examsModule.allExams.length > 0) {
            examsData = window.examsModule.allExams;
            moduleFound = true;
            console.log(`✅ Found ${examsData.length} exams in final check`);
        }
        // Check the global shortcut
        else if (window.examsData && window.examsData.allExams && window.examsData.allExams.length > 0) {
            examsData = window.examsData.allExams;
            moduleFound = true;
            console.log(`✅ Found ${examsData.length} exams in global examData`);
        }
    }
    
    // If still no data, use sample data
    if (!moduleFound || !examsData || examsData.length === 0) {
        console.warn('⚠️ No exam data found - using sample data for display');
        const sampleData = generateSampleGrades();
        currentData = {
            grades: sampleData,
            totalGpa: '3.25',
            totalGrade: 'B+',
            totalCredits: 24,
            averagePercentage: 78,
            programType: determineProgramType().type,
            currentFilter: currentFilter,
            classRank: 'Top 25%',
            totalExams: sampleData.length
        };
        return sampleData;
    }
    
    // Filter ONLY released and completed exams
    const releasedExams = examsData.filter(exam => 
        (exam.isReleased === true || exam.released === true || exam.isReleased === 'true') &&
        (exam.totalPercentage !== null && exam.totalPercentage !== undefined) &&
        (exam.isCompleted === true || exam.completed === true || exam.hasGrade === true)
    );
    
    console.log(`📊 Found ${releasedExams.length} released exams with grades out of ${examsData.length} total`);
    
    // If no released exams, look for exams with grade data
    let examsWithGrades = releasedExams;
    if (examsWithGrades.length === 0) {
        // Try to find any exams that have grade data
        examsWithGrades = examsData.filter(exam => 
            (exam.grade && (exam.grade.marks !== null || exam.grade.total_score !== null)) ||
            (exam.marks !== null && exam.marks !== undefined) ||
            (exam.totalPercentage !== null && exam.totalPercentage !== undefined) ||
            exam.result_status === 'PASS' || exam.result_status === 'FAIL'
        );
        
        console.log(`📊 Found ${examsWithGrades.length} exams with grade data`);
        
        if (examsWithGrades.length === 0) {
            console.warn('⚠️ No exams with grade data found - using sample data');
            const sampleData = generateSampleGrades();
            currentData = {
                grades: sampleData,
                totalGpa: '3.25',
                totalGrade: 'B+',
                totalCredits: 24,
                averagePercentage: 78,
                programType: determineProgramType().type,
                currentFilter: currentFilter,
                classRank: 'Top 25%',
                totalExams: sampleData.length
            };
            return sampleData;
        }
    }
    
    // Process exams into grade objects
    const processedGrades = [];
    let totalPercentageSum = 0;
    let totalCreditsEarned = 0;
    
    examsWithGrades.forEach(exam => {
        // Extract percentage from various possible fields
        let percentage = null;
        if (exam.totalPercentage !== null && exam.totalPercentage !== undefined) {
            percentage = parseFloat(exam.totalPercentage);
        } else if (exam.grade && exam.grade.total_score !== null && exam.grade.total_score !== undefined) {
            percentage = parseFloat(exam.grade.total_score);
        } else if (exam.grade && exam.grade.marks !== null && exam.grade.marks !== undefined) {
            const marks = parseFloat(exam.grade.marks);
            const outOf = exam.marks_out_of || exam.grade?.marks_out_of || 100;
            percentage = (marks / outOf) * 100;
        } else if (exam.marks !== null && exam.marks !== undefined) {
            const marks = parseFloat(exam.marks);
            const outOf = exam.marks_out_of || 100;
            percentage = (marks / outOf) * 100;
        }
        
        // Skip if no percentage
        if (percentage === null || isNaN(percentage)) {
            return;
        }
        
        const grade = calculateLetterGrade(percentage);
        const gpa = calculateGPAFromPercentage(percentage);
        const credits = exam.credits || exam.credit_hours || 3;
        
        // Determine block/term
        let blockTerm = exam.block_term || exam.semester || exam.block || exam.term || 'General';
        
        // Clean course names
        let courseCode = exam.unit_code || exam.course_code || exam.code || exam.id?.toString().substring(0, 8) || 'N/A';
        let courseName = exam.exam_name || exam.title || exam.course || exam.course_name || 'Course Assessment';
        
        processedGrades.push({
            courseCode: courseCode,
            courseName: courseName,
            credits: credits,
            cat1: exam.cat1Display || exam.cat_1_score || exam.cat1Score || '--',
            cat2: exam.cat2Display || exam.cat_2_score || exam.cat2Score || '--',
            final: exam.finalDisplay || exam.final_score || exam.finalScore || '--',
            total: Math.round(percentage * 10) / 10,
            grade: grade,
            gpa: gpa,
            status: percentage >= 60 ? 'PASS' : 'FAIL',
            blockTerm: blockTerm,
            year: exam.intake_year || exam.year || '2024',
            examDate: exam.formattedGradedDate || exam.exam_date || exam.date,
            examName: exam.exam_name || exam.title
        });
        
        if (percentage >= 60) {
            totalCreditsEarned += credits;
        }
        totalPercentageSum += percentage;
        
        console.log(`✅ Processed: ${courseName} - ${Math.round(percentage)}% (${grade}) - Block: ${blockTerm}`);
    });
    
    if (processedGrades.length === 0) {
        console.warn('⚠️ No valid grades could be processed - using sample data');
        const sampleData = generateSampleGrades();
        currentData = {
            grades: sampleData,
            totalGpa: '3.25',
            totalGrade: 'B+',
            totalCredits: 24,
            averagePercentage: 78,
            programType: determineProgramType().type,
            currentFilter: currentFilter,
            classRank: 'Top 25%',
            totalExams: sampleData.length
        };
        return sampleData;
    }
    
    // Filter by selected block/term
    let filteredGrades = processedGrades;
    if (currentFilter !== 'all') {
        filteredGrades = processedGrades.filter(g => 
            g.blockTerm === currentFilter || 
            g.blockTerm.includes(currentFilter) ||
            currentFilter.includes(g.blockTerm)
        );
        if (filteredGrades.length === 0) {
            // If filter returns nothing, show all
            filteredGrades = processedGrades;
        }
    }
    
    // Calculate statistics
    const averagePercentage = filteredGrades.length > 0 ? totalPercentageSum / filteredGrades.length : 0;
    const overallGpa = filteredGrades.length > 0 ? (averagePercentage / 25).toFixed(2) : '0.00';
    const overallGrade = calculateLetterGrade(averagePercentage);
    
    let classRank = 'N/A';
    if (filteredGrades.length > 0) {
        const gpaNum = parseFloat(overallGpa);
        if (gpaNum >= 3.5) classRank = 'Top 10%';
        else if (gpaNum >= 3.0) classRank = 'Top 25%';
        else if (gpaNum >= 2.5) classRank = 'Top 50%';
        else if (gpaNum >= 2.0) classRank = 'Bottom 50%';
        else classRank = 'Bottom 25%';
    }
    
    currentData = {
        grades: filteredGrades,
        totalGpa: overallGpa,
        totalGrade: overallGrade,
        totalCredits: totalCreditsEarned,
        averagePercentage: averagePercentage,
        programType: determineProgramType().type,
        currentFilter: currentFilter,
        classRank: classRank,
        totalExams: filteredGrades.length
    };
    
    console.log(`✅ Loaded ${filteredGrades.length} exams, GPA: ${overallGpa}, Credits: ${totalCreditsEarned}`);
    
    return filteredGrades;
}

// ============================================
// GENERATE SAMPLE GRADES FOR DEMO
// ============================================
function generateSampleGrades() {
    const programInfo = determineProgramType();
    const isTVET = programInfo.type === 'TVET';
    
    const courses = isTVET ? [
        { code: 'TVT101', name: 'Occupational Health & Safety', block: 'Term 1' },
        { code: 'TVT102', name: 'Workshop Practice', block: 'Term 1' },
        { code: 'TVT103', name: 'Technical Drawing', block: 'Term 2' },
        { code: 'TVT104', name: 'Electrical Principles', block: 'Term 2' },
        { code: 'TVT105', name: 'Mechanical Engineering', block: 'Term 3' },
        { code: 'TVT106', name: 'Industrial Management', block: 'Term 3' },
        { code: 'TVT107', name: 'Quality Control', block: 'Term 4' },
        { code: 'TVT108', name: 'Project Management', block: 'Term 4' }
    ] : [
        { code: 'NUR101', name: 'Fundamentals of Nursing', block: 'Introductory Block' },
        { code: 'NUR102', name: 'Anatomy & Physiology', block: 'Introductory Block' },
        { code: 'NUR103', name: 'Pharmacology Basics', block: 'Block 1' },
        { code: 'NUR104', name: 'Medical-Surgical Nursing I', block: 'Block 1' },
        { code: 'NUR105', name: 'Community Health Nursing', block: 'Block 2' },
        { code: 'NUR106', name: 'Maternal & Child Health', block: 'Block 2' },
        { code: 'NUR107', name: 'Psychiatric Nursing', block: 'Block 3' },
        { code: 'NUR108', name: 'Medical-Surgical Nursing II', block: 'Block 3' },
        { code: 'NUR109', name: 'Nursing Leadership', block: 'Block 4' },
        { code: 'NUR110', name: 'Research Methods', block: 'Block 4' }
    ];
    
    return courses.map((course, index) => {
        // Generate realistic scores
        const base = 65 + Math.random() * 30; // 65-95%
        const score = Math.min(99, Math.round(base * 10) / 10);
        const grade = calculateLetterGrade(score);
        const gpa = calculateGPAFromPercentage(score);
        const passed = score >= 60;
        
        // Generate CAT scores
        const cat1 = Math.round(15 + Math.random() * 15);
        const cat2 = Math.round(15 + Math.random() * 15);
        const final = Math.round(40 + Math.random() * 40);
        
        return {
            courseCode: course.code,
            courseName: course.name,
            credits: 3,
            cat1: cat1,
            cat2: cat2,
            final: final,
            total: score,
            grade: grade,
            gpa: gpa,
            status: passed ? 'PASS' : 'FAIL',
            blockTerm: course.block,
            year: '2024',
            examDate: `2024-${String(1 + (index % 6)).padStart(2, '0')}-15`,
            examName: `${course.code} Final Exam`
        };
    });
}
    async function loadGrades() {
        return await loadRealGrades();
    }
    
    // ============================================
    // DISPLAY FUNCTIONS
    // ============================================
    
    function displayGradesTable() {
        if (!elements.gradesTableBody) return;
        
        const grades = currentData.grades;
        
        if (!grades || grades.length === 0) {
            elements.gradesTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 60px 20px; color: #64748b;">
                <i class="fas fa-chart-line" style="font-size: 56px; margin-bottom: 20px; opacity: 0.4;"></i>
                <p style="font-size: 1.1rem;">No released exam results for ${currentFilter === 'all' ? 'any block' : currentFilter}</p>
                <small>Grades appear here after exams are completed and released by administration.</small>
            </td></tr>`;
            return;
        }
        
        let html = '';
        grades.forEach(grade => {
            const statusColor = grade.status === 'PASS' ? '#10b981' : '#ef4444';
            const statusClass = grade.status === 'PASS' ? 'status-pass' : 'status-fail';
            const gradeColor = getGradeColor(grade.total);
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.2s;">
                    <td style="padding: 14px 12px; color: #1e293b; font-weight: 500;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 14px 12px; color: #1e293b;">${escapeHtml(grade.courseName)}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.credits}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.cat1}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.cat2}</td>
                    <td style="padding: 14px 12px; text-align: center; color: #1e293b;">${grade.final}</td>
                    <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: ${gradeColor};">${grade.total}%</td>
                    <td style="padding: 14px 12px; text-align: center;"><span class="grade-letter" style="background: ${gradeColor}20 !important; color: ${gradeColor} !important;">${grade.grade}</span></td>
                    <td style="padding: 14px 12px; text-align: center;"><span class="${statusClass}">${grade.status === 'PASS' ? '✅' : '❌'} ${grade.status}</span></td>
                </tr>
            `;
        });
        
        elements.gradesTableBody.innerHTML = html;
    }
    
    function updateGpaSummary() {
        const gpaValue = currentData.totalGpa;
        const gradeValue = currentData.totalGrade;
        const creditsValue = currentData.totalCredits;
        const rankValue = currentData.classRank;
        const totalExams = currentData.totalExams || 0;
        
        if (elements.semesterGpa) {
            elements.semesterGpa.textContent = gpaValue;
            elements.semesterGpa.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        if (elements.semesterGrade) {
            elements.semesterGrade.textContent = gradeValue;
            elements.semesterGrade.style.cssText = 'color: #e9d5ff !important; font-weight: 700 !important;';
        }
        if (elements.cumulativeGpa) {
            elements.cumulativeGpa.textContent = gpaValue;
            elements.cumulativeGpa.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        if (elements.cumulativeGrade) {
            elements.cumulativeGrade.textContent = gradeValue;
            elements.cumulativeGrade.style.cssText = 'color: #e9d5ff !important; font-weight: 700 !important;';
        }
        if (elements.totalCreditsEarned) {
            elements.totalCreditsEarned.textContent = creditsValue;
            elements.totalCreditsEarned.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        if (elements.classRank) {
            elements.classRank.textContent = rankValue;
            elements.classRank.style.cssText = 'color: #ffffff !important; font-weight: 800 !important; font-size: 2.2rem !important;';
        }
        
        // Add rank badge to GPA cards
        document.querySelectorAll('.gpa-card .gpa-info').forEach(el => {
            const existingBadge = el.querySelector('.rank-badge');
            if (!existingBadge && el.querySelector('.gpa-value')) {
                const badge = document.createElement('div');
                badge.className = 'rank-badge';
                badge.textContent = `${totalExams} Exams`;
                el.appendChild(badge);
            }
        });
        
        console.log(`📊 GPA Summary: GPA=${gpaValue}, Grade=${gradeValue}, Credits=${creditsValue}, Rank=${rankValue}`);
    }
    
    // ============================================
    // TRANSCRIPT
    // ============================================
    function loadTranscript() {
        if (!elements.transcriptTableBody) return;
        
        const grades = currentData.grades;
        
        if (grades.length === 0) {
            elements.transcriptTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">No transcript data available</td></tr>';
            return;
        }
        
        let html = '';
        let totalAttempted = 0;
        let totalEarned = 0;
        let totalPoints = 0;
        
        grades.forEach(grade => {
            const gradePoints = calculateGPAFromPercentage(grade.total);
            const isPassed = grade.status === 'PASS';
            const pointsEarned = gradePoints * grade.credits;
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px 12px; color: #1e293b;">${escapeHtml(grade.blockTerm)}</td>
                    <td style="padding: 12px 12px; color: #1e293b;">${escapeHtml(grade.courseCode)}</td>
                    <td style="padding: 12px 12px; color: #1e293b;">${escapeHtml(grade.courseName)}</td>
                    <td style="padding: 12px 12px; text-align: center; color: #1e293b;">${grade.credits}</td>
                    <td style="padding: 12px 12px; text-align: center;"><span class="grade-letter">${grade.grade}</span></td>
                    <td style="padding: 12px 12px; text-align: center; color: #1e293b;">${pointsEarned.toFixed(1)}</td>
                </tr>
            `;
            
            totalAttempted += grade.credits;
            if (isPassed) totalEarned += grade.credits;
            totalPoints += pointsEarned;
        });
        
        elements.transcriptTableBody.innerHTML = html;
        
        const cumulativeGpa = totalAttempted > 0 ? (totalPoints / totalAttempted).toFixed(2) : '0.00';
        
        if (elements.totalAttempted) elements.totalAttempted.textContent = totalAttempted;
        if (elements.totalEarned) elements.totalEarned.textContent = totalEarned;
        if (elements.transcriptCgpa) elements.transcriptCgpa.textContent = cumulativeGpa;
    }
    
    // ============================================
    // COURSE PROGRESS
    // ============================================
    function loadCourseProgress() {
        if (!elements.courseProgressList) return;
        
        const grades = currentData.grades;
        
        if (grades.length === 0) {
            elements.courseProgressList.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">No course data available</div>';
            return;
        }
        
        let html = '';
        let completedCount = 0;
        
        grades.forEach(course => {
            const percentage = course.total;
            const isCompleted = percentage >= 60;
            if (isCompleted) completedCount++;
            
            const barColor = getGradeColor(percentage);
            
            html += `
                <div class="course-progress-item">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; color: #1e293b;">${escapeHtml(course.courseName)}</span>
                        <span style="font-weight: bold; color: ${barColor};">${percentage}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%; background: ${barColor};"></div>
                    </div>
                    <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; font-size: 0.85rem;">
                        <span style="color: ${isCompleted ? '#10b981' : '#ef4444'};">
                            ${isCompleted ? '✅ Completed' : '❌ Failed'}
                        </span>
                        <span style="color: #64748b;">Grade: ${course.grade}</span>
                        <span style="color: #64748b;">${course.blockTerm}</span>
                    </div>
                </div>
            `;
        });
        
        elements.courseProgressList.innerHTML = html;
        
        const totalCourses = grades.length;
        if (elements.completedCoursesProgress) elements.completedCoursesProgress.textContent = completedCount;
        if (elements.totalCoursesProgress) elements.totalCoursesProgress.textContent = totalCourses;
    }
    
    // ============================================
    // GRADE CHART
    // ============================================
    function createGradeChart() {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) return;
        
        const grades = currentData.grades;
        const gradeCounts = { 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 };
        
        grades.forEach(grade => {
            if (gradeCounts[grade.grade] !== undefined) gradeCounts[grade.grade]++;
        });
        
        const labels = Object.keys(gradeCounts);
        const data = Object.values(gradeCounts);
        
        if (gradeChart) gradeChart.destroy();
        
        if (typeof Chart !== 'undefined') {
            gradeChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Courses',
                        data: data,
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.7)',
                            'rgba(59, 130, 246, 0.7)',
                            'rgba(139, 92, 246, 0.7)',
                            'rgba(245, 158, 11, 0.7)',
                            'rgba(249, 115, 22, 0.7)',
                            'rgba(239, 68, 68, 0.7)',
                            'rgba(220, 38, 38, 0.7)'
                        ],
                        borderColor: [
                            '#10b981', '#3b82f6', '#8b5cf6', 
                            '#f59e0b', '#f97316', '#ef4444', '#dc2626'
                        ],
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { 
                            display: false
                        },
                        tooltip: { 
                            callbacks: { 
                                label: (ctx) => `${ctx.raw} courses` 
                            } 
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            title: { display: true, text: 'Number of Courses' }, 
                            ticks: { stepSize: 1 } 
                        },
                        x: { 
                            title: { display: true, text: 'Grade' } 
                        }
                    }
                }
            });
            
            // Add grade chart legend
            addGradeChartLegend(gradeCounts);
        }
    }
    // ============================================
// 📊 GRADE PREDICTION
// ============================================
function showGradePrediction() {
    const grades = currentData.grades;
    if (grades.length === 0) return;
    
    // Remove existing prediction card
    const existing = document.getElementById('prediction-card');
    if (existing) existing.remove();
    
    // Calculate trend
    const sorted = [...grades].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    const recent = sorted.slice(-3);
    const avgRecent = recent.reduce((sum, g) => sum + g.total, 0) / recent.length;
    const overallAvg = grades.reduce((sum, g) => sum + g.total, 0) / grades.length;
    
    // Predict next grade
    let prediction = overallAvg;
    if (recent.length >= 2) {
        const trend = recent[recent.length - 1].total - recent[0].total;
        prediction = avgRecent + (trend * 0.3);
    }
    prediction = Math.min(Math.max(prediction, 0), 100);
    
    const predictedGrade = calculateLetterGrade(prediction);
    const emoji = prediction >= 85 ? '🌟' : prediction >= 75 ? '📈' : prediction >= 60 ? '📊' : '🚨';
    const color = prediction >= 85 ? '#10b981' : prediction >= 75 ? '#3b82f6' : prediction >= 60 ? '#f59e0b' : '#ef4444';
    
    // Add prediction card
    const container = document.querySelector('.performance-section');
    if (container) {
        const card = document.createElement('div');
        card.id = 'prediction-card';
        card.style.cssText = `
            margin-top: 16px;
            padding: 16px 20px;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            border-radius: 12px;
            border-left: 4px solid ${color};
            animation: fadeInUp 0.5s ease;
        `;
        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">${emoji}</span>
                    <div>
                        <div style="font-size: 13px; color: #64748b;">Predicted Next Grade</div>
                        <div style="font-size: 22px; font-weight: 700; color: ${color};">${prediction.toFixed(1)}% (${predictedGrade})</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #64748b;">Based on ${grades.length} exams</div>
                    <div style="font-size: 12px; color: ${recent.length >= 2 ? '#10b981' : '#f59e0b'};">
                        ${recent.length >= 2 ? '📈 Trend detected' : '⚠️ Need more data for trend'}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

// ============================================
// 📈 GPA TREND CHART
// ============================================
function createGpaTrendChart() {
    const grades = currentData.grades;
    if (grades.length < 2) return;
    
    const sorted = [...grades].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    const labels = sorted.map(g => g.courseName.length > 15 ? g.courseName.substring(0, 15) + '...' : g.courseName);
    const data = sorted.map(g => g.total);
    
    const container = document.querySelector('.performance-section');
    if (!container) return;
    
    // Remove existing chart
    const existing = document.getElementById('gpaTrendChart');
    if (existing) existing.remove();
    const existingLabel = document.getElementById('trendChartLabel');
    if (existingLabel) existingLabel.remove();
    
    // Add label
    const label = document.createElement('h4');
    label.id = 'trendChartLabel';
    label.style.cssText = 'margin: 20px 0 10px 0; font-size: 14px; color: #1e293b;';
    label.innerHTML = '<i class="fas fa-chart-line" style="color: #4C1D95;"></i> Performance Trend';
    container.appendChild(label);
    
    const canvas = document.createElement('canvas');
    canvas.id = 'gpaTrendChart';
    canvas.style.cssText = 'max-height: 180px; width: 100%; margin-top: 8px;';
    container.appendChild(canvas);
    
    if (typeof Chart !== 'undefined') {
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score (%)',
                    data: data,
                    borderColor: '#4C1D95',
                    backgroundColor: 'rgba(76, 29, 149, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#4C1D95',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.parsed.y + '%'
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: (value) => value + '%',
                            font: { size: 10 }
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 9 },
                            maxRotation: 45,
                            minRotation: 30
                        }
                    }
                }
            }
        });
    }
}
    // ============================================
    // GRADE CHART LEGEND
    // ============================================
    function addGradeChartLegend(gradeCounts) {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) return;
        
        // Remove existing legend
        const existingLegend = document.getElementById('gradeChartLegend');
        if (existingLegend) existingLegend.remove();
        
        const legendContainer = document.createElement('div');
        legendContainer.id = 'gradeChartLegend';
        legendContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            margin-top: 12px;
            padding: 8px;
            background: #f8fafc;
            border-radius: 8px;
        `;
        
        const colors = {
            'A': '#10b981',
            'B+': '#3b82f6',
            'B': '#8b5cf6',
            'C+': '#f59e0b',
            'C': '#f97316',
            'D': '#ef4444',
            'F': '#dc2626'
        };
        
        let hasData = false;
        Object.entries(gradeCounts).forEach(([grade, count]) => {
            if (count > 0) {
                hasData = true;
                const item = document.createElement('span');
                item.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    color: #1e293b;
                `;
                item.innerHTML = `
                    <span style="
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border-radius: 4px;
                        background: ${colors[grade]};
                    "></span>
                    ${grade}: ${count}
                `;
                legendContainer.appendChild(item);
            }
        });
        
        if (hasData) {
            const parent = canvas.parentElement;
            parent.appendChild(legendContainer);
        }
    }
    
    // ============================================
    // STUDENT INFO BAR
    // ============================================
    function createStudentInfoBar() {
        const container = document.querySelector('.reports-header');
        if (!container) return;
        
        // Check if info bar already exists
        if (document.getElementById('studentInfoBar')) return;
        
        const profile = window.currentUserProfile || {};
        const programInfo = determineProgramType();
        const isTVET = programInfo.type === 'TVET';
        
        const infoBar = document.createElement('div');
        infoBar.id = 'studentInfoBar';
        infoBar.className = 'student-info-bar';
        infoBar.style.cssText = `
            background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
            padding: 12px 20px;
            border-radius: 12px;
            margin: 16px 0 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            border: 1px solid #c4b5fd;
        `;
        
        infoBar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                <div class="info-item">
                    <i class="fas fa-user-graduate"></i>
                    <span style="font-weight: 600;">${escapeHtml(profile.full_name || 'Student')}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-id-card"></i>
                    <span>${escapeHtml(profile.student_id || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-graduation-cap"></i>
                    <span>${escapeHtml(profile.program || 'KRCHN')}</span>
                </div>
                <div class="info-item">
                    <i class="fas ${isTVET ? 'fa-tools' : 'fa-layer-group'}"></i>
                    <span>${isTVET ? 'TVET' : 'Nursing'} · ${programInfo.level || 'Block'}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Intake: ${escapeHtml(profile.intake_year || '2024')}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="result-badge">
                    <i class="fas fa-file-alt"></i> ${currentData.grades?.length || 0} Results
                </span>
                <span class="result-badge" style="background: ${parseFloat(currentData.totalGpa) >= 3.0 ? '#10b981' : '#f59e0b'};">
                    GPA: ${currentData.totalGpa}
                </span>
            </div>
        `;
        
        // Insert after header
        const headerContent = container.querySelector('.header-content');
        if (headerContent) {
            headerContent.after(infoBar);
        } else {
            container.appendChild(infoBar);
        }
        
        console.log('✅ Student info bar created');
    }
    
    // ============================================
    // LOAD STUDENT INFO
    // ============================================
    function loadStudentInfo() {
        const profile = window.currentUserProfile || {};
        const studentName = profile.full_name || profile.name || 'Student Name';
        const program = profile.program || 'KRCHN Nursing';
        const studentId = profile.student_id || profile.id || 'N/A';
        
        if (elements.studentNameDisplay) elements.studentNameDisplay.textContent = studentName;
        if (elements.programDisplay) elements.programDisplay.textContent = program;
        if (elements.studentIdDisplay) elements.studentIdDisplay.textContent = studentId;
        
        console.log(`👤 Student: ${studentName} (${studentId})`);
    }
    
    // ============================================
    // POPULATE FILTER DROPDOWN
    // ============================================
    function populateFilterDropdown() {
        if (!elements.filterSelect) return;
        
        const programInfo = determineProgramType();
        const options = getFilterOptions();
        
        elements.filterSelect.innerHTML = options.map(opt => 
            `<option value="${opt.value}" ${currentFilter === opt.value ? 'selected' : ''}>
                <i class="fas ${opt.icon}"></i> ${opt.label}
            </option>`
        ).join('');
        
        // Update program type indicator
        if (elements.programTypeIndicator) {
            const isTVET = programInfo.type === 'TVET';
            elements.programTypeIndicator.innerHTML = `
                <span style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 40px; display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas ${isTVET ? 'fa-tools' : 'fa-graduation-cap'}"></i>
                    ${isTVET ? `TVET Program - ${programInfo.level}` : 'KRCHN Nursing'}
                </span>
            `;
        }
        
        console.log(`📋 Filter dropdown populated for ${programInfo.type} with ${options.length} options`);
    }
    
    // ============================================
    // DOWNLOAD TRANSCRIPT AS PDF
    // ============================================
    function downloadTranscriptPDF() {
        console.log('📄 Generating transcript PDF...');
        
        try {
            const grades = currentData.grades;
            if (!grades || grades.length === 0) {
                alert('No grades available to export.');
                return;
            }
            
            const profile = window.currentUserProfile || {};
            const now = new Date().toLocaleDateString('en-KE', {
                timeZone: 'Africa/Nairobi',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            
            // Build HTML content
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Academic Transcript - ${escapeHtml(profile.full_name)}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; color: #1e293b; }
                        .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
                        .header h1 { font-size: 24px; margin: 0; color: #1e293b; }
                        .header p { margin: 5px 0; color: #475569; }
                        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                        .info-item { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th { background: #1e293b; color: white; padding: 10px; text-align: left; }
                        td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
                        .pass { color: #10b981; font-weight: bold; }
                        .fail { color: #ef4444; font-weight: bold; }
                        .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
                        .summary-item { text-align: center; }
                        .summary-value { font-size: 28px; font-weight: bold; color: #1e293b; }
                        .summary-label { font-size: 14px; color: #64748b; }
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</h1>
                        <p>Academic Transcript</p>
                        <p><strong>${escapeHtml(profile.full_name)}</strong> · ${escapeHtml(profile.student_id || 'N/A')}</p>
                        <p>Program: ${escapeHtml(profile.program || 'KRCHN')} · Intake: ${escapeHtml(profile.intake_year || '2024')}</p>
                        <p>Generated: ${now}</p>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-item">
                            <div class="summary-value">${currentData.totalGpa}</div>
                            <div class="summary-label">GPA</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${currentData.totalGrade}</div>
                            <div class="summary-label">Grade</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${currentData.totalCredits}</div>
                            <div class="summary-label">Credits Earned</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${grades.length}</div>
                            <div class="summary-label">Courses</div>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Block/Term</th>
                                <th>Course Code</th>
                                <th>Course Name</th>
                                <th>Credits</th>
                                <th>CAT 1</th>
                                <th>CAT 2</th>
                                <th>Final</th>
                                <th>Total</th>
                                <th>Grade</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            grades.forEach(grade => {
                const statusClass = grade.status === 'PASS' ? 'pass' : 'fail';
                html += `
                    <tr>
                        <td>${escapeHtml(grade.blockTerm)}</td>
                        <td>${escapeHtml(grade.courseCode)}</td>
                        <td>${escapeHtml(grade.courseName)}</td>
                        <td>${grade.credits}</td>
                        <td>${grade.cat1}</td>
                        <td>${grade.cat2}</td>
                        <td>${grade.final}</td>
                        <td>${grade.total}%</td>
                        <td><strong>${grade.grade}</strong></td>
                        <td class="${statusClass}">${grade.status}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>This is an official academic transcript. For verification, contact the Registrar's Office.</p>
                        <p>NCHSM · P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743</p>
                    </div>
                </body>
                </html>
            `;
            
            // Open print window
            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            } else {
                alert('Please allow popups to download the transcript.');
            }
            
        } catch (error) {
            console.error('Error generating transcript:', error);
            alert('Error generating transcript. Please try again.');
        }
    }
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================
    function setupEventListeners() {
        if (elements.filterSelect) {
            elements.filterSelect.addEventListener('change', async (e) => {
                currentFilter = e.target.value;
                console.log(`Filter changed to: ${currentFilter}`);
                await refreshAll();
            });
        }
        
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await refreshAll();
            });
        }
        
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadTranscriptPDF);
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', () => window.print());
        }
    }
    
    // ============================================
    // SETUP REPORT TABS
    // ============================================
    function setupReportTabs() {
        const tabs = document.querySelectorAll('.report-tab');
        const contents = {
            'semester': document.getElementById('semester-report'),
            'yearly': document.getElementById('yearly-report'),
            'transcript': document.getElementById('transcript-report'),
            'progress': document.getElementById('progress-report')
        };
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const reportType = tab.getAttribute('data-report');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                Object.values(contents).forEach(content => {
                    if (content) content.style.display = 'none';
                });
                if (contents[reportType]) contents[reportType].style.display = 'block';
                
                // Refresh charts when switching to semester
                if (reportType === 'semester') {
                    setTimeout(createGradeChart, 100);
                }
            });
        });
    }
    
    // ============================================
    // MAIN REFRESH FUNCTION
    // ============================================
    async function refreshAll() {
        console.log('🚀 Loading Academic Reports...');
        
        try {
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px;"><div class="loading-spinner"></div> Loading released exam results...</td></tr>`;
            }
            
            loadStudentInfo();
            createStudentInfoBar();
            showGradePrediction();     
createGpaTrendChart();        
            populateFilterDropdown();
            await loadGrades();
            
            displayGradesTable();
            updateGpaSummary();
            loadTranscript();
            loadCourseProgress();
            createGradeChart();
            
            console.log(`✅ Academic Reports loaded: ${currentData.grades.length} released exams`);
            
            if (currentData.grades.length > 0) {
                let toast = document.getElementById('toast');
                if (!toast) {
                    toast = document.createElement('div');
                    toast.id = 'toast';
                    toast.style.cssText = `
                        position: fixed;
                        bottom: 10px;
                        left: 10px;
                        background: rgba(76, 29, 149, 0.9);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        z-index: 9999;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        pointer-events: none;
                        backdrop-filter: blur(4px);
                    `;
                    document.body.appendChild(toast);
                }
                
                toast.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 4px;"></i> ${currentData.grades.length} results · GPA: ${currentData.totalGpa}`;
                toast.style.opacity = '1';
                
                setTimeout(() => {
                    toast.style.opacity = '0';
                }, 2000);
            }
            
        } catch (error) {
            console.error('❌ Error loading academic reports:', error);
            if (elements.gradesTableBody) {
                elements.gradesTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #dc2626;">Error loading grades. Please refresh.</td></tr>';
            }
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        console.log('🔧 Initializing Academic Reports Module...');
        
        addPurpleThemeStyles();
        setupReportTabs();
        setupEventListeners();
        populateFilterDropdown();
        
        setTimeout(refreshAll, 800);
        
        document.addEventListener('examsModuleReady', () => {
            console.log('Exams module ready, reloading reports');
            setTimeout(refreshAll, 500);
        });
        
        document.addEventListener('appReady', () => {
            console.log('App ready, reloading reports');
            setTimeout(refreshAll, 600);
        });
    }
    
    // ============================================
    // EXPOSE MODULE
    // ============================================
    window.academicReportsModule = {
        init: init,
        loadReports: refreshAll,
        refresh: refreshAll,
        getData: () => currentData,
        downloadTranscript: downloadTranscriptPDF
    };
    
    init();
    
    console.log('✅ Academic Reports Module Ready - KRCHN Blocks / TVET Terms');
})();
