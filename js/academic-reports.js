// js/academic-reports.js - COMPLETE STUDENT VERSION WITH HOLLOW STAR INDICATOR
// All tabs: Provisional Academic Transcript, Yearly Summary, Full Transcript, Course Progress, My Performance
// INCLUDES: LINE GRAPHS, PROFILE PICTURE, DATABASE UNIT CODES, FIXED GRADE DISPLAY
// INDICATOR: ☆ (hollow star) - subtle, only appears on retaken units in My Performance
// NO DEMO DATA - ONLY REAL DATA FROM DATABASE
// RETAKE SUMMARY REMOVED FROM PROVISIONAL ACADEMIC TRANSCRIPT DOWNLOAD
// ACADEMIC YEAR MAPPING: KRCHN (3 years), TVET Cert (1 year), TVET Diploma (2 years)
// "Proceed to next block" message on transcript
// ============================================================
(function() {
    'use strict';
    
    console.log('📊 Student Academic Reports Module Loading...');
    console.log('☆ Hollow Star Indicator: ENABLED (subtle)');

    // ============================================================
    // 1. PROGRAM DETECTION
    // ============================================================
    const PROGRAM = {
        isTVET: function(programCode) {
            if (!programCode) return false;
            const code = String(programCode).toUpperCase().trim();
            const tvetCodes = ['DPOTT','DCH','DHRIT','DSL','DSW','DCJS','DHSS','DICT','DME',
                               'CPOTT','CCH','CHRIT','CPC','CSL','CSW','CCJS','CAG','CHSS','CICT',
                               'ACH','AAG','ASW','CCA','PTE'];
            return tvetCodes.includes(code);
        },
        
        getBlockLabel: function(programCode) {
            return this.isTVET(programCode) ? 'Term' : 'Block';
        },
        
        getBlockOptions: function(programCode) {
            if (this.isTVET(programCode)) {
                return ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
            }
            return ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        },
        
        getProgramType: function(programCode) {
            if (!programCode) return 'Nursing';
            const code = String(programCode).toUpperCase().trim();
            if (code === 'KRCHN') return 'Nursing';
            if (this.isTVET(code)) return 'TVET';
            return 'Nursing';
        },
        
        // ✅ Get year mapping for program
        getYearMapping: function(programCode, blockName) {
            const code = String(programCode).toUpperCase().trim();
            
            // KRCHN Nursing: 3 Years
            if (code === 'KRCHN' || code === 'NURSING') {
                const nursingMapping = {
                    'Introductory': { year: 0, label: 'Year 1' },
                    'Block 1': { year: 0, label: 'Year 1' },
                    'Block 2': { year: 1, label: 'Year 2' },
                    'Block 3': { year: 1, label: 'Year 2' },
                    'Block 4': { year: 2, label: 'Year 3' },
                    'Block 5': { year: 2, label: 'Year 3' },
                    'Block 6': { year: 2, label: 'Year 3' },
                    'Final': { year: 2, label: 'Year 3' }
                };
                return nursingMapping[blockName] || { year: 0, label: 'Year 1' };
            }
            
            // TVET: Extract year from block name
            const yearMatch = blockName.match(/Year\s+(\d+)/i);
            if (yearMatch) {
                const yearNum = parseInt(yearMatch[1]);
                return { year: yearNum - 1, label: `Year ${yearNum}` };
            }
            
            // Default fallback
            const numMatch = blockName.match(/\d+/);
            if (numMatch) {
                const num = parseInt(numMatch[0]);
                if (num <= 1) return { year: 0, label: 'Year 1' };
                if (num <= 3) return { year: 1, label: 'Year 2' };
                return { year: 2, label: 'Year 3' };
            }
            
            return { year: 0, label: 'Year 1' };
        },
        
        // ✅ Get academic year range
        getAcademicYear: function(programCode, blockName, intakeYear) {
            const mapping = this.getYearMapping(programCode, blockName);
            const startYear = intakeYear + mapping.year;
            const endYear = startYear + 1;
            return {
                display: `${startYear}/${endYear}`,
                startYear: startYear,
                endYear: endYear,
                label: mapping.label
            };
        },
        
        // ✅ Check if student can proceed to next block
        canProceed: function(marks, programCode) {
            if (!marks || marks.length === 0) return false;
            const isTVET = this.isTVET(programCode);
            const passThreshold = isTVET ? 50 : 60;
            
            // Check if all marks are passing
            const allPassed = marks.every(m => {
                const score = m.final_score || m.total || 0;
                return score >= passThreshold;
            });
            
            return allPassed;
        }
    };

    // ============================================================
    // 2. UNIT CODE - FETCH FROM DATABASE
    // ============================================================
    let unitCodeCache = {};

    // Prevent the academic UI from leaving an infinite spinner when Supabase/network
    // requests stall on mobile. A timeout always returns control to the renderer.
    function withAcademicTimeout(promise, timeoutMs = 12000, label = 'Academic request') {
        let timer;
        return Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(label + ' timed out. Check your connection and refresh.')), timeoutMs);
            })
        ]).finally(() => clearTimeout(timer));
    }

    async function fetchUnitCodes() {
        try {
            const { data, error } = await withAcademicTimeout(
                window.db.supabase.from('units_catalog').select('unit_name, unit_code'),
                10000,
                'Unit catalogue request'
            );
            
            if (error) throw error;
            
            unitCodeCache = {};
            (data || []).forEach(item => {
                if (item.unit_name && item.unit_code) unitCodeCache[item.unit_name] = item.unit_code;
            });
            
            console.log(`📊 Cached ${Object.keys(unitCodeCache).length} unit codes`);
            return unitCodeCache;
        } catch (error) {
            console.error('❌ Error fetching unit codes:', error);
            return {};
        }
    }

    function getUnitCode(subjectName) {
        if (!subjectName) return 'N/A';
        
        if (unitCodeCache[subjectName]) {
            return unitCodeCache[subjectName];
        }
        
        for (const [name, code] of Object.entries(unitCodeCache)) {
            if (subjectName.includes(name) || name.includes(subjectName)) {
                return code;
            }
        }
        
        if (subjectName.includes('Medical Surgical Nursing II')) {
            const specialty = subjectName.split(':')[1]?.trim() || '';
            if (specialty.includes('Gastrointestinal') || specialty.includes('Hepatobiliary')) return 'NCHSGN 201';
            if (specialty.includes('Orodental')) return 'NCHSGN 202';
            if (specialty.includes('Renal') || specialty.includes('Genito-Urinary')) return 'NCHSGN 203';
            return 'NCHSGN 2XX';
        }
        
        if (subjectName.includes('Medical Surgical Nursing III')) {
            const specialty = subjectName.split(':')[1]?.trim() || '';
            if (specialty.includes('Endocrine')) return 'NCHSGN 209';
            if (specialty.includes('Neurological')) return 'NCHSGN 210';
            return 'NCHSGN 2XX';
        }
        
        if (subjectName.includes('Midwifery')) {
            if (subjectName.includes('I')) return 'NCHSMW 110';
            if (subjectName.includes('II')) return 'NCHSMW 123';
            if (subjectName.includes('III')) return 'NCHSMW 205';
            if (subjectName.includes('IV')) return 'NCHSMW 214';
            return 'NCHSMW 2XX';
        }
        
        if (subjectName.includes('Community Health')) {
            if (subjectName.includes('I')) return 'NCHSCH 125';
            return 'NCHSCH 2XX';
        }
        
        const words = subjectName.split(' ');
        if (words.length === 1) {
            return subjectName.substring(0, 6).toUpperCase();
        }
        
        const skipWords = ['and', 'of', 'for', 'the', 'to', 'with', 'on', 'at'];
        let code = words
            .filter(w => !skipWords.includes(w.toLowerCase()))
            .map(w => w[0])
            .join('')
            .toUpperCase();
        
        if (code.length > 6) {
            code = code.substring(0, 6);
        }
        
        return code || 'N/A';
    }

    // ============================================================
    // 3. RETAKE/SUPPLEMENTARY DATA STATE
    // ============================================================
    
    let studentRetakeData = [];
    let studentRetakeMap = {};
    let retakeDataLoaded = false;

    // ============================================================
    // 4. FETCH RETAKE DATA FOR STUDENT
    // ============================================================
    
    async function fetchStudentRetakeData(admissionNumber) {
        if (!admissionNumber) return {};
        if (retakeDataLoaded) return studentRetakeMap;
        
        try {
            const { data, error } = await withAcademicTimeout(
                window.db.supabase.from('student_retakes')
                    .select('*')
                    .eq('admission_number', admissionNumber)
                    .order('attempt_number', { ascending: true }),
                10000,
                'Retake records request'
            );
            
            if (error) throw error;
            
            studentRetakeData = data || [];
            
            // Group by subject_name
            const retakeMap = {};
            data?.forEach(retake => {
                const key = retake.subject_name;
                if (!retakeMap[key]) retakeMap[key] = [];
                retakeMap[key].push(retake);
            });
            
            studentRetakeMap = retakeMap;
            retakeDataLoaded = true;
            
            console.log(`📊 Loaded ${data?.length || 0} retake records for student`);
            return retakeMap;
            
        } catch (error) {
            console.error('Error fetching retake data:', error);
            return {};
        }
    }

    // ============================================================
    // 5. RETAKE HELPER FUNCTIONS
    // ============================================================
    
    function hasRetake(subjectName) {
        if (!subjectName) return false;
        const retakes = studentRetakeMap[subjectName] || [];
        return retakes.length > 0;
    }

    function getRetakeCount(subjectName) {
        if (!subjectName) return 0;
        const retakes = studentRetakeMap[subjectName] || [];
        return retakes.length;
    }

    function getHollowStarHtml(subjectName) {
        if (!hasRetake(subjectName)) return '';
        const count = getRetakeCount(subjectName);
        const tooltip = `This unit was retaken (${count} attempt${count > 1 ? 's' : ''})`;
        return `<span class="hollow-star" title="${tooltip}">☆</span>`;
    }

    // ============================================================
    // 6. UTILITY FUNCTIONS
    // ============================================================
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Safe fallback for legacy report templates that may reference the colour outside a row callback.
    // Row renderers below still compute a specific colour from each published grade.
    const gradeColor = '#64748b';

    function getGradeColor(grade) {
        const colors = {
            'A': '#10b981',
            'B': '#3b82f6',
            'C': '#f59e0b',
            'D': '#f97316',
            'F': '#ef4444',
            'FAIL': '#ef4444'
        };
        return colors[grade] || '#6b7280';
    }

    function getStatusColor(status) {
        const colors = {
            'EXCELLENT': '#10b981',
            'GOOD': '#3b82f6',
            'SATISFACTORY': '#f59e0b',
            'DISTINCTION': '#10b981',
            'CREDIT': '#3b82f6',
            'PASS': '#f59e0b',
            'FAIL': '#ef4444',
            'PENDING': '#94a3b8'
        };
        return colors[status] || '#94a3b8';
    }

    // ============================================================
    // 7. TVET GRADING FUNCTIONS (Min Pass: 50%)
    // ============================================================
    function calculateTVETGrade(score) {
        if (score === null || score === undefined || score === 0) return 'FAIL';
        if (score >= 75) return 'A';
        if (score >= 65) return 'B';
        if (score >= 50) return 'C';
        return 'FAIL';
    }

    function calculateTVETPoints(grade) {
        if (!grade) return 0;
        const points = {
            'A': 4.0,
            'B': 3.0,
            'C': 2.0,
            'FAIL': 0.0
        };
        return points[grade] || 0;
    }

    function getTVETStatus(score) {
        if (score === null || score === undefined || score === 0) return 'PENDING';
        if (score >= 75) return 'EXCELLENT';
        if (score >= 65) return 'GOOD';
        if (score >= 50) return 'SATISFACTORY';
        return 'FAIL';
    }

    // ============================================================
    // 8. NURSING GRADING FUNCTIONS (Min Pass: 60%)
    // ============================================================
    function calculateNursingGrade(score) {
        if (score === null || score === undefined || score === 0) return 'D';
        if (score >= 75) return 'A';
        if (score >= 65) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    }

    function calculateNursingPoints(grade) {
        if (!grade) return 0;
        const points = {
            'A': 4.0,
            'B': 3.0,
            'C': 2.0,
            'D': 0.0
        };
        return points[grade] || 0;
    }

    function getNursingStatus(score) {
        if (score === null || score === undefined || score === 0) return 'PENDING';
        if (score >= 75) return 'DISTINCTION';
        if (score >= 65) return 'CREDIT';
        if (score >= 60) return 'PASS';
        return 'FAIL';
    }

    // ============================================================
    // 9. MAIN GRADING FUNCTIONS
    // ============================================================
    function calculateGrade(score, program) {
        const isTVET = PROGRAM.isTVET(program);
        if (isTVET) {
            return calculateTVETGrade(score);
        }
        return calculateNursingGrade(score);
    }

    function calculatePoints(grade, program) {
        const isTVET = PROGRAM.isTVET(program);
        if (isTVET) {
            return calculateTVETPoints(grade);
        }
        return calculateNursingPoints(grade);
    }

    function getGradingStatus(score, program) {
        const isTVET = PROGRAM.isTVET(program);
        if (isTVET) {
            return getTVETStatus(score);
        }
        return getNursingStatus(score);
    }

    function pointsFromPublishedGrade(value) {
        const grade = String(value ?? '').trim().toUpperCase();
        const gradePoints = {
            A: 4, DISTINCTION: 4, EXCELLENT: 4,
            B: 3, CREDIT: 3, GOOD: 3,
            C: 2, PASS: 2, SATISFACTORY: 2,
            D: 0, F: 0, FAIL: 0
        };
        return Object.prototype.hasOwnProperty.call(gradePoints, grade) ? gradePoints[grade] : null;
    }

    // Grade points are a derived display value. When a published grade exists,
    // keep its points consistent with the institution's grading scale; do not
    // alter the stored score or published grade itself.
    function resolveDisplayPoints(mark, publishedGrade, program) {
        const pointsFromGrade = pointsFromPublishedGrade(publishedGrade);
        if (pointsFromGrade !== null) return pointsFromGrade;
        const storedPoints = numericMark(mark, ['points', 'grade_points']);
        if (storedPoints !== null) return storedPoints;
        return publishedGrade ? calculatePoints(publishedGrade, program) : null;
    }

    function calculateGPA(marks) {
        if (!Array.isArray(marks) || marks.length === 0) return 0;
        let weightedPoints = 0, totalCredits = 0;
        marks.forEach(m => {
            // Prefer stored points; if missing, derive points only from the published grade.
            let points = numericMark(m, ['points', 'grade_points']);
            if (points === null) points = pointsFromPublishedGrade(m?.grade ?? m?.published_grade ?? m?.final_grade ?? m?.status);
            if (points === null || !Number.isFinite(points)) return;
            const credits = Number(m?.credits);
            const c = Number.isFinite(credits) && credits > 0 ? credits : 3;
            weightedPoints += points * c;
            totalCredits += c;
        });
        return totalCredits > 0 ? weightedPoints / totalCredits : 0;
    }

    function numericMark(obj, keys) {
        for (const key of keys) {
            if (obj && obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
                const n = Number(obj[key]);
                if (Number.isFinite(n)) return n;
            }
        }
        return null;
    }

    function getAssessmentValues(mark) {
        return {
            cat1: numericMark(mark, ['cat1','cat_1','cat1_score','cat_1_score','cat1_marks','cat_1_marks','cat1_mark','cat_1_mark']),
            cat2: numericMark(mark, ['cat2','cat_2','cat2_score','cat_2_score','cat2_marks','cat_2_marks','cat2_mark','cat_2_mark']),
            finalExam: numericMark(mark, ['final_exam','final_exam_score','final_score','final','exam_score','end_term_score','endterm_score']),
            total: numericMark(mark, ['total','total_score','overall_score','final_total','total_marks'])
        };
    }

    function getPublishedScore(mark) {
        // Student reports are read-only: display the stored/published overall score.
        // Never reconstruct a final mark by adding CAT and exam components.
        return numericMark(mark, [
            'final_score', 'published_score', 'overall_score',
            'total_score', 'final_total', 'total', 'score', 'marks'
        ]);
    }

    function normalizeAcademicMark(mark, program) {
        // Preserve published values as-is. Missing overall scores remain missing;
        // do not turn assessment components into a newly calculated student result.
        const score = getPublishedScore(mark);
        const assessments = getAssessmentValues(mark);
        return {
            ...mark,
            unit_code: mark.unit_code || mark.course_code || getUnitCode(mark.subject_name || mark.course_name),
            subject_name: mark.subject_name || mark.course_name || mark.unit_name || 'N/A',
            credits: Number(mark.credits) > 0 ? Number(mark.credits) : 3,
            final_score: score,
            grade: mark.grade ?? mark.published_grade ?? mark.final_grade ?? '',
            points: mark.points,
            status: mark.status ?? mark.published_status ?? mark.result_status ?? '',
            cat1: assessments.cat1,
            cat2: assessments.cat2,
            final_exam: assessments.finalExam,
            total: score,
            block: mark.block || mark.block_term || mark.term || 'General',
            academic_year: mark.academic_year || mark.year || ''
        };
    }

    // ============================================================
    // 10. GET GRADE FROM GPA
    // ============================================================
    function getGradeFromGPA(gpa) {
        if (gpa >= 3.75) return 'A';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        return 'D';
    }

    function getGradeFromGPATVET(gpa) {
        if (gpa >= 3.75) return 'A';
        if (gpa >= 3.0) return 'B';
        if (gpa >= 2.0) return 'C';
        return 'FAIL';
    }

    // ============================================================
    // 11. MY PERFORMANCE - STATE & FUNCTIONS
    // ============================================================
    let myMarksData = [];
    let myMarksFiltered = [];

    // ============================================================
    // 12. LOAD MY MARKS WITH HOLLOW STAR SUPPORT - NO DEMO DATA
    // ============================================================
    async function loadMyMarks() {
        const tbody = document.getElementById('my_marks_table_body');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 10px; color: #94a3b8;">Loading your marks...</p>
                </td>
            </tr>
        `;
        
        try {
            await fetchUnitCodes();
            
            const user = window.currentUserProfile || window.db?.currentUserProfile;
            if (!user) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #dc2626;">Please log in to view your marks</td></tr>`;
                return;
            }
            
            const registrationNumber = user.admission_number || user.student_id || user.user_id;
            const userProgram = user.program || '';
            
            const nameEl = document.getElementById('my_marks_student_name');
            if (nameEl) nameEl.textContent = user.full_name || 'Student';
            
            const admissionEl = document.getElementById('my_marks_admission');
            if (admissionEl) admissionEl.textContent = registrationNumber || '-';
            
            const programEl = document.getElementById('my_marks_program');
            if (programEl) programEl.textContent = userProgram || '-';
            
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const academicYear = user.academic_year || `${currentYear}/${nextYear}`;
            const academicYearEl = document.getElementById('my_marks_academic_year');
            if (academicYearEl) academicYearEl.textContent = academicYear;
            
            const blockLabel = PROGRAM.getBlockLabel(userProgram);
            const headerEl = document.querySelector('#my_marks_table_body')?.closest('table')?.querySelector('th:nth-child(3)');
            if (headerEl) headerEl.textContent = blockLabel;
            
            populateMyMarksBlockFilter(userProgram);
            
            // ✅ FETCH RETAKE DATA
            await fetchStudentRetakeData(registrationNumber);
            
            let marks = [];
            try {
                if (!window.db?.supabase) throw new Error('Academic database connection is not ready.');
                const supabase = window.db.supabase;
                const admissionNumber = String(user.admission_number || user.student_id || '').trim();
                let result = null;

                // Match the published marks by admission number first. Some older profiles
                // identify their marks using the UUID stored in student_marks.student_id.
                if (admissionNumber) {
                    result = await withAcademicTimeout(
                        supabase.from('student_marks')
                            .select('*')
                            .eq('admission_number', admissionNumber)
                            .eq('published', true)
                            .order('published_at', { ascending: false }),
                        15000,
                        'Published marks request'
                    );
                    if (result.error) throw result.error;
                }

                const authUserId = user.user_id || user.id || user.student_uuid;
                if ((!result || !(result.data || []).length) && authUserId) {
                    const byStudentId = await withAcademicTimeout(
                        supabase.from('student_marks')
                            .select('*')
                            .eq('student_id', authUserId)
                            .eq('published', true)
                            .order('published_at', { ascending: false }),
                        15000,
                        'Published marks fallback request'
                    );
                    if (byStudentId.error) throw byStudentId.error;
                    if ((byStudentId.data || []).length) result = byStudentId;
                }

                const rows = result?.data || [];
                if (rows.length) {
                    // Keep published scores and grades authoritative; fill only missing display metadata.
                    marks = rows.map(mark => {
                        const retakes = studentRetakeMap[mark.subject_name] || [];
                        const grade = mark.grade ?? mark.final_grade ?? '';
                        const rawPoints = mark.points;
                        const points = rawPoints !== null && rawPoints !== undefined && rawPoints !== ''
                            ? Number(rawPoints)
                            : pointsFromPublishedGrade(grade || mark.final_status || mark.status);
                        return {
                            ...mark,
                            unit_code: mark.unit_code || getUnitCode(mark.subject_name),
                            grade,
                            points: Number.isFinite(points) ? points : null,
                            status: mark.final_status ?? mark.status ?? '',
                            final_score: mark.final_score,
                            hasRetake: retakes.length > 0,
                            retakeCount: retakes.length,
                            retakeHistory: retakes
                        };
                    });
                    console.log(`📊 Loaded ${marks.length} published marks without recalculating results`);
                } else {
                    tbody.innerHTML = `                        <tr><td colspan="6" style="text-align:center;padding:60px 20px;color:#64748b;">
                            <i class="fas fa-file-circle-xmark" style="font-size:42px;display:block;margin-bottom:14px;"></i>
                            <h4 style="margin:0 0 8px;color:#1e293b;">No published marks found</h4>
                            <p style="font-size:13px;margin:0;">No results have been published for this student yet.</p>
                        </td></tr>`;
                    const countEl = document.getElementById('my_marks_count');
                    if (countEl) countEl.textContent = '0 results';
                    myMarksData = [];
                    myMarksFiltered = [];
                    return;
                }
            } catch (e) {
                console.error('Academic results request failed:', e);
                tbody.innerHTML = `
                    <tr><td colspan="6" style="text-align:center;padding:45px 20px;color:#b91c1c;">
                        <i class="fas fa-triangle-exclamation" style="font-size:38px;display:block;margin-bottom:12px;"></i>
                        <h4 style="margin:0 0 8px;">Unable to load academic results</h4>
                        <p style="font-size:13px;margin:0;">The academic database request failed. Please refresh or contact the academic office if this continues.</p>
                    </td></tr>`;
                const countEl = document.getElementById('my_marks_count');
                if (countEl) countEl.textContent = 'Results unavailable';
                return;
            }

            if (marks && marks.length > 0) {
                myMarksData = marks;
            } else {
                myMarksData = [];
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                            <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                            <h4 style="margin: 0 0 8px 0; color: #1e293b;">No published marks found</h4>
                            <p style="font-size: 13px; margin: 0;">Your marks will appear here once they are published by the admin.</p>
                        </td>
                    </tr>
                `;
                document.getElementById('my_marks_count').textContent = '0 results';
                return;
            }
            
            myMarksFiltered = [...myMarksData];
            
            // Populate filters
            const subjectFilter = document.getElementById('my_marks_subject_filter');
            if (subjectFilter) {
                const subjects = [...new Set(myMarksData.map(m => m.subject_name).filter(Boolean))];
                subjectFilter.innerHTML = '<option value="all">All Units</option>';
                subjects.sort().forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectFilter.appendChild(option);
                });
            }
            
            const yearFilter = document.getElementById('my_marks_year_filter');
            if (yearFilter) {
                const years = [...new Set(myMarksData.map(m => m.academic_year || m.year || '').filter(Boolean))];
                yearFilter.innerHTML = '<option value="all">All Years</option>';
                years.sort().reverse().forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearFilter.appendChild(option);
                });
            }
            
            const gpa = calculateGPA(myMarksData);
            const gpaEl = document.getElementById('my_marks_gpa');
            if (gpaEl) gpaEl.textContent = gpa.toFixed(2);
            
            renderMyMarksTableWithHollowStars();
            showGradingScale(userProgram, myMarksData);
            setTimeout(renderMyMarksCharts, 300);
            
        } catch (error) {
            console.error('Error loading my marks:', error);
            const countEl = document.getElementById('my_marks_count');
            if (countEl) countEl.textContent = 'Results unavailable';
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px 20px;color:#b91c1c;">
                <i class="fas fa-triangle-exclamation" style="font-size:30px;display:block;margin-bottom:10px;"></i>
                <strong>Unable to load academic results</strong>
                <p style="margin:8px 0 0;font-size:12px;">${escapeHtml(error && error.message ? error.message : 'Please refresh and try again.')}</p>
            </td></tr>`;
        }
    }

    function showGradingScale(program, marks) {
        const isTVET = PROGRAM.isTVET(program);
        const tvetScale = document.getElementById('my_marks_tvet_scale');
        const nursingScale = document.getElementById('my_marks_nursing_scale');
        const graphsSection = document.getElementById('my_marks_graphs_section');
        
        if (tvetScale) tvetScale.style.display = 'none';
        if (nursingScale) nursingScale.style.display = 'none';
        
        if (!marks || marks.length === 0) {
            if (graphsSection) graphsSection.style.display = 'none';
            return;
        }
        
        if (graphsSection) graphsSection.style.display = 'block';
        
        if (isTVET) {
            if (tvetScale) tvetScale.style.display = 'block';
        } else {
            if (nursingScale) nursingScale.style.display = 'block';
        }
    }

    function populateMyMarksBlockFilter(program) {
        const filter = document.getElementById('my_marks_block_filter');
        if (!filter) return;
        
        const isTVET = PROGRAM.isTVET(program);
        const label = isTVET ? 'Terms' : 'Blocks';
        const options = PROGRAM.getBlockOptions(program);
        
        filter.innerHTML = `<option value="all">All ${label}</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            filter.appendChild(option);
        });
    }

    // ============================================================
    // 13. RENDER MY MARKS TABLE WITH HOLLOW STARS
    // ============================================================
    function renderMyMarksTableWithHollowStars() {
        const tbody = document.getElementById('my_marks_table_body');
        if (!tbody) return;
        
        const marks = myMarksFiltered;
        if (!marks || marks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-file-alt" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                        No published marks found
                    </td>
                </tr>
            `;
            document.getElementById('my_marks_count').textContent = '0 results';
            return;
        }
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        
        let html = '';
        marks.forEach((mark, index) => {
            const scoreValue = getPublishedScore(mark);
            const rawStatus = String(mark.final_status || mark.status || mark.published_status || mark.result_status || '').trim().toUpperCase();
            const allowedStatuses = ['DISTINCTION', 'CREDIT', 'PASS', 'FAIL', 'PENDING', 'EXCELLENT', 'GOOD', 'SATISFACTORY'];
            const status = scoreValue === null
                ? 'PENDING'
                : (allowedStatuses.includes(rawStatus) ? rawStatus : getGradingStatus(scoreValue, userProgram));
            const statusColor = getStatusColor(status);
            const effectiveGrade = mark.grade || mark.published_grade || mark.final_grade || (scoreValue !== null ? calculateGrade(scoreValue, userProgram) : '');
            const gradeColor = getGradeColor(effectiveGrade);
            const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
            const pointsValue = resolveDisplayPoints(mark, effectiveGrade, userProgram);
            
            // ✅ Hollow star indicator (subtle)
            const starIndicator = getHollowStarHtml(mark.subject_name);
            
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px 14px; text-align: center; color: #94a3b8; font-weight: 600;">${index + 1}</td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #0A3D62;">${escapeHtml(unitCode)}</td>
                    <td style="padding: 10px 14px;">
                        ${escapeHtml(mark.subject_name || 'N/A')}
                        ${starIndicator}
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
                            ${escapeHtml(effectiveGrade || '-')}
                        </span>
                    </td>
                    <td style="padding: 10px 14px; text-align: center; font-weight: 600;">${pointsValue === null ? '-' : pointsValue.toFixed(1)}</td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <span style="background: ${statusColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 600; font-size: 11px;">
                            ${escapeHtml(status)}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        document.getElementById('my_marks_count').textContent = `${marks.length} results`;
    }

    function filterMyMarks() {
        const subjectFilter = document.getElementById('my_marks_subject_filter')?.value || 'all';
        const blockFilter = document.getElementById('my_marks_block_filter')?.value || 'all';
        const yearFilter = document.getElementById('my_marks_year_filter')?.value || 'all';
        const searchTerm = document.getElementById('my_marks_search')?.value?.toLowerCase() || '';
        
        let filtered = [...myMarksData];
        
        if (subjectFilter !== 'all') {
            filtered = filtered.filter(m => m.subject_name === subjectFilter);
        }
        if (blockFilter !== 'all') {
            filtered = filtered.filter(m => m.block === blockFilter);
        }
        if (yearFilter !== 'all') {
            filtered = filtered.filter(m => (m.academic_year || m.year || '') === yearFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(m => 
                (m.subject_name || '').toLowerCase().includes(searchTerm) ||
                (m.unit_code || '').toLowerCase().includes(searchTerm)
            );
        }
        
        myMarksFiltered = filtered;
        renderMyMarksTableWithHollowStars();
        document.getElementById('my_marks_count').textContent = `${filtered.length} results`;
        setTimeout(renderMyMarksCharts, 200);
    }

    // ============================================================
    // 14. RENDER CHARTS FOR MY PERFORMANCE
    // ============================================================
    function renderMyMarksCharts() {
        const marks = myMarksFiltered || [];
        const graphsSection = document.getElementById('my_marks_graphs_section');
        
        if (!marks || marks.length === 0) {
            if (graphsSection) graphsSection.style.display = 'none';
            return;
        }
        
        if (graphsSection) graphsSection.style.display = 'block';
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const isTVET = PROGRAM.isTVET(userProgram);
        const threshold = isTVET ? 50 : 60;
        
        const ctx1 = document.getElementById('myMarksGradeChart');
        if (ctx1) {
            if (window.myMarksGradeChartInstance) {
                window.myMarksGradeChartInstance.destroy();
            }
            
            if (typeof Chart !== 'undefined') {
                const sortedMarks = [...marks].sort((a, b) => {
                    const blockOrder = {
                        'Introductory': 0, 'Block 1': 1, 'Block 2': 2, 'Block 3': 3,
                        'Block 4': 4, 'Block 5': 5, 'Final': 6,
                        'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4,
                        'Term 5': 5, 'Term 6': 6
                    };
                    return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
                });
                
                const labels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
                const pointsData = sortedMarks.map(m => m.points || 0);
                const avgPoints = pointsData.reduce((a, b) => a + b, 0) / pointsData.length || 0;
                const gpaLine = pointsData.map(() => avgPoints);
                
                window.myMarksGradeChartInstance = new Chart(ctx1, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Grade Points',
                                data: pointsData,
                                borderColor: '#4C1D95',
                                backgroundColor: 'rgba(76, 29, 149, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: pointsData.map(p => {
                                    if (p >= 4) return '#10b981';
                                    if (p >= 3) return '#3b82f6';
                                    if (p >= 2) return '#f59e0b';
                                    return '#ef4444';
                                }),
                                pointBorderColor: '#ffffff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8
                            },
                            {
                                label: 'GPA (' + avgPoints.toFixed(2) + ')',
                                data: gpaLine,
                                borderColor: '#0A3D62',
                                borderDash: [8, 4],
                                borderWidth: 2,
                                fill: false,
                                tension: 0,
                                pointRadius: 0,
                                pointHoverRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    boxWidth: 12,
                                    padding: 8,
                                    font: {
                                        size: 10,
                                        weight: '600'
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                min: 0,
                                max: 4.5,
                                ticks: {
                                    stepSize: 0.5,
                                    font: { size: 9 }
                                }
                            },
                            x: {
                                ticks: {
                                    font: { size: 8 },
                                    maxRotation: 45,
                                    minRotation: 30
                                }
                            }
                        }
                    }
                });
            }
        }
        
        const ctx2 = document.getElementById('myMarksPerformanceChart');
        if (ctx2) {
            if (window.myMarksPerformanceChartInstance) {
                window.myMarksPerformanceChartInstance.destroy();
            }
            
            if (typeof Chart !== 'undefined') {
                const sortedMarks = [...marks].sort((a, b) => {
                    const blockOrder = {
                        'Introductory': 0, 'Block 1': 1, 'Block 2': 2, 'Block 3': 3,
                        'Block 4': 4, 'Block 5': 5, 'Final': 6,
                        'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4,
                        'Term 5': 5, 'Term 6': 6
                    };
                    return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
                });
                
                const labels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
                const scoresData = sortedMarks.map(m => m.final_score || 0);
                const passThreshold = isTVET ? 50 : 60;
                const thresholdLine = scoresData.map(() => passThreshold);
                const averageScore = scoresData.reduce((a, b) => a + b, 0) / scoresData.length || 0;
                const avgLine = scoresData.map(() => averageScore);
                
                window.myMarksPerformanceChartInstance = new Chart(ctx2, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Score (%)',
                                data: scoresData,
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: scoresData.map(s => {
                                    if (s >= passThreshold) return '#10b981';
                                    return '#ef4444';
                                }),
                                pointBorderColor: '#ffffff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8
                            },
                            {
                                label: 'Pass Threshold (' + passThreshold + '%)',
                                data: thresholdLine,
                                borderColor: '#ef4444',
                                borderDash: [8, 4],
                                borderWidth: 2,
                                fill: false,
                                tension: 0,
                                pointRadius: 0,
                                pointHoverRadius: 0
                            },
                            {
                                label: 'Average (' + averageScore.toFixed(1) + '%)',
                                data: avgLine,
                                borderColor: '#3b82f6',
                                borderDash: [4, 4],
                                borderWidth: 2,
                                fill: false,
                                tension: 0,
                                pointRadius: 0,
                                pointHoverRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    boxWidth: 12,
                                    padding: 8,
                                    font: {
                                        size: 10,
                                        weight: '600'
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                min: 0,
                                max: 100,
                                ticks: {
                                    stepSize: 10,
                                    font: { size: 9 },
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            },
                            x: {
                                ticks: {
                                    font: { size: 8 },
                                    maxRotation: 45,
                                    minRotation: 30
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    // ============================================================
    // 15. PROVISIONAL ACADEMIC TRANSCRIPT
    // ============================================================
    let gradeChart = null;
    let currentGrades = [];

    async function loadSemesterReport() {
        const tbody = document.getElementById('grades-table-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;"><div class="loading-spinner"></div> Loading grades...</td></tr>`;

        try {
            const user = window.currentUserProfile || window.db?.currentUserProfile || {};
            const program = user.program || '';
            const admission = user.student_id || user.admission_number || user.user_id;

            if ((!myMarksData || myMarksData.length === 0) && admission) {
                await loadMyMarks();
            }

            let grades = (myMarksData || []).map(m => normalizeAcademicMark(m, program));

            const selected = document.getElementById('semester-filter')?.value || '';
            if (selected && grades.length) {
                const startYear = String(selected).split('-')[0];
                const matched = grades.filter(g => {
                    const y = String(g.academic_year || '').trim();
                    return y === selected || y === `${startYear}/${Number(startYear) + 1}` || y.includes(startYear);
                });
                if (matched.length) grades = matched;
            }

            currentGrades = grades;

            if (!grades.length) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:50px;color:#94a3b8;"><i class="fas fa-file-circle-xmark" style="font-size:34px;display:block;margin-bottom:10px;"></i><strong style="display:block;color:#1e293b;">No published academic results</strong><span>Results will appear here after they are published by the academic office.</span></td></tr>`;
                setAcademicSummary(0, '-', 0);
                return;
            }

            const normalizedStatus = g => {
                const raw = String(g.status || '').trim().toUpperCase();
                const allowed = ['DISTINCTION','CREDIT','PASS','FAIL','PENDING','EXCELLENT','GOOD','SATISFACTORY'];
                if (allowed.includes(raw) && raw !== 'PENDING') return raw;
                const score = g.final_score;
                return score === null || score === undefined || score === '' || !Number.isFinite(Number(score))
                    ? 'PENDING' : getGradingStatus(Number(score), program);
            };
            const isPublishedPass = g => /^(PASS|DISTINCTION|CREDIT|SATISFACTORY|EXCELLENT|GOOD)$/i.test(normalizedStatus(g));
            const earnedCredits = grades.filter(isPublishedPass)
                .reduce((s,g) => s + (Number(g.credits) || 3), 0);
            const gpa = calculateGPA(grades);
            // Do not infer a new overall grade from the average of published unit scores.
            setAcademicSummary(gpa, '-', earnedCredits);

            // Keep the Course Grades table focused on published outcomes, not CAT/exam components.
            const gradesTable = tbody.closest('table');
            if (gradesTable) {
                const header = gradesTable.querySelector('thead tr');
                if (header) header.innerHTML = '<th>Course Code</th><th>Course Name</th><th>Credits</th><th>Grade</th><th>Rate</th>';
            }
            tbody.innerHTML = grades.map(g => {
                const gradeColor = getGradeColor(g.grade);
                const score = g.final_score === null || g.final_score === undefined || g.final_score === '' ? null : Number(g.final_score);
                const status = normalizedStatus(g);
                const passed = /^(PASS|DISTINCTION|CREDIT|SATISFACTORY|EXCELLENT|GOOD)$/i.test(status);
                const statusColor = status === 'FAIL' ? '#dc2626' : passed ? '#059669' : '#64748b';
                return `<tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px;white-space:nowrap;">${escapeHtml(g.unit_code || 'N/A')}</td>
                    <td style="padding:12px;">${escapeHtml(g.subject_name || 'N/A')}</td>
                    <td style="padding:12px;text-align:center;">${Number(g.credits) || 3}</td>
                    <td style="padding:12px;text-align:center;"><span style="background:${gradeColor};color:white;padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px;">${escapeHtml(g.grade || (g.final_score === null ? 'Pending' : '-'))}</span></td>
                    <td style="padding:12px;text-align:center;"><span style="background:${statusColor};color:white;padding:3px 8px;border-radius:12px;font-weight:700;font-size:10px;">${escapeHtml(status)}</span></td>
                </tr>`;
            }).join('');

            createGradeChart(grades);
            window.currentCumulativeGPA = gpa;
            document.dispatchEvent(new CustomEvent('academicGpaUpdated', {detail:{semesterGPA:gpa,cumulativeGPA:gpa,formatted:gpa.toFixed(2)}}));
        } catch (error) {
            console.error('Academic Reports semester load failed:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:45px;color:#dc2626;">Unable to load academic results. Please refresh and try again.</td></tr>`;
        }
    }

    function setAcademicSummary(gpa, grade, earnedCredits) {
        const ids = {
            'semester-gpa': Number(gpa || 0).toFixed(2),
            'semester-grade': grade || '-',
            'cumulative-gpa': Number(gpa || 0).toFixed(2),
            'cumulative-grade': grade || '-',
            'total-credits-earned': String(earnedCredits || 0)
        };
        Object.keys(ids).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = ids[id];
        });
        const rank = document.getElementById('class-rank');
        const user = window.currentUserProfile || {};
        if (rank) rank.textContent = user.class_rank || user.rank || 'N/A';
        window.currentCumulativeGPA = Number(gpa || 0);
        document.dispatchEvent(new CustomEvent('academicGpaUpdated', {detail:{semesterGPA:Number(gpa||0),cumulativeGPA:Number(gpa||0),formatted:Number(gpa||0).toFixed(2)}}));
    }

    function createGradeChart(grades) {
        const canvas = document.getElementById('grade-distribution-chart');
        if (!canvas) return;
        
        const gradeOrder = ['A', 'B', 'C', 'D', 'F', 'FAIL', 'N/A'];
        const gradeCounts = {};
        grades.forEach(g => {
            const grade = g.grade || 'N/A';
            gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        });
        
        const labels = gradeOrder.filter(l => gradeCounts[l] !== undefined);
        const data = labels.map(l => gradeCounts[l]);
        const colors = {
            'A': '#10b981',
            'B': '#3b82f6',
            'C': '#f59e0b',
            'D': '#f97316',
            'F': '#ef4444',
            'FAIL': '#ef4444',
            'N/A': '#94a3b8'
        };
        
        if (gradeChart) gradeChart.destroy();
        
        if (typeof Chart !== 'undefined' && labels.length > 0) {
            gradeChart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Courses',
                        data: data,
                        borderColor: '#4C1D95',
                        backgroundColor: 'rgba(76, 29, 149, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: labels.map(l => colors[l] || '#6b7280'),
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                font: { size: 10 }
                            }                        },
                        x: {
                            ticks: {
                                font: { size: 10, weight: '600' }
                            }
                        }
                    }
                }
            });
        }
    }

    // ============================================================
    // 16. YEARLY REPORT
    // ============================================================
    function loadYearlyReport() {
        const user = window.currentUserProfile || window.db?.currentUserProfile || {};
        const program = user.program || '';
        const selectedYear = document.getElementById('year-filter')?.value || '';
        let grades = (currentGrades.length ? currentGrades : myMarksData)
            .map(m => normalizeAcademicMark(m, program));

        if (selectedYear && grades.length) {
            const matched = grades.filter(g => String(g.academic_year || g.year || '').includes(String(selectedYear)));
            if (matched.length) grades = matched;
        }

        // Yearly report is a summary, not an assessment breakdown. Hide CAT and
        // exam columns from any detailed table rendered inside this tab, keeping
        // only Credit, Score, Grade and Rate columns where those headers exist.
        const yearlyPanel = document.getElementById('yearly-report');
        if (yearlyPanel) {
            yearlyPanel.querySelectorAll('table').forEach(table => {
                const headerRows = Array.from(table.querySelectorAll('thead tr'));
                const headerRow = headerRows[headerRows.length - 1];
                if (!headerRow) return;
                const headers = Array.from(headerRow.children);
                const keepIndexes = [];
                headers.forEach((cell, index) => {
                    const label = (cell.textContent || '').trim().toLowerCase().replace(/\\s+/g, ' ');
                    const keep = /^(credit|credits|credit score|score|grade|rate|pass rate|pass %|pass percentage)$/.test(label);
                    cell.style.display = keep ? '' : 'none';
                    if (keep) keepIndexes.push(index);
                });
                if (!keepIndexes.length) return;
                table.querySelectorAll('tr').forEach(row => {
                    Array.from(row.children).forEach((cell, index) => {
                        cell.style.display = keepIndexes.includes(index) ? '' : 'none';
                    });
                });
            });
        }

        const passMark = PROGRAM.isTVET(program) ? 50 : 60;
        const credits = grades.filter(g => Number(g.final_score) >= passMark)
            .reduce((sum, g) => sum + (Number(g.credits) || 3), 0);
        const gpa = calculateGPA(grades);
        const passed = grades.filter(g => Number(g.final_score) >= passMark).length;
        const rate = grades.length ? Math.round((passed / grades.length) * 100) : 0;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set('year-gpa', gpa.toFixed(2));
        set('year-credits', credits);
        set('year-courses', grades.length);
        set('year-awards', Number.isFinite(Number(user.year_awards)) ? Number(user.year_awards) : 0);
        set('year-grade', calculateGrade(
            grades.length ? grades.reduce((sum, g) => sum + (Number(g.final_score) || 0), 0) / grades.length : 0,
            program
        ));
        set('year-rate', rate + '%');
    }

    // 17. FULL TRANSCRIPT WITH "PROCEED TO NEXT BLOCK" MESSAGE
// Message appears AFTER block summary (at bottom of each block)
// ============================================================
function loadTranscript() {
    const tbody = document.getElementById('transcript-table-body');
    if (!tbody) return;
    
    const user = window.currentUserProfile || {};
    const userProgram = user.program || '';
    const intakeYear = parseInt(user.intake_year) || new Date().getFullYear();
    
    document.getElementById('student-name-display').textContent = user.full_name || 'Student';
    document.getElementById('program-display').textContent = userProgram || 'KRCHN';
    document.getElementById('student-id-display').textContent = user.student_id || 'N/A';
    
    let marksData = [];
    
    if (window.myMarksData && window.myMarksData.length > 0) {
        marksData = window.myMarksData;
    } else if (currentGrades && currentGrades.length > 0) {
        marksData = currentGrades;
    } else {
        // ✅ No demo data - show empty state
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 60px; color: #94a3b8;">
                    <i class="fas fa-file-alt" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                    <h4 style="margin: 0 0 8px 0; color: #1e293b;">No transcript data available</h4>
                    <p style="font-size: 13px;">Your transcript will appear here once you have completed courses.</p>
                </td>
            </tr>
        `;
        updateTranscriptSummary(0, 0, 0, 0);
        return;
    }
    
    // ✅ Group marks by block
    const groupedByBlock = {};
    marksData.forEach(m => {
        const block = m.block || 'General';
        if (!groupedByBlock[block]) {
            groupedByBlock[block] = [];
        }
        groupedByBlock[block].push(m);
    });
    const blockNames = Object.keys(groupedByBlock).sort();
    
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;
    let totalPoints = 0;
    let totalCourses = marksData.length;
    let passedCourses = 0;
    let failedCourses = 0;
    let pendingCourses = 0;
    
    const isTVET = PROGRAM.isTVET(userProgram);
    const passThreshold = isTVET ? 50 : 60;
    
    // ✅ Build transcript HTML
    let html = '';
    
    blockNames.forEach((block) => {
        const blockMarks = groupedByBlock[block] || [];
        const blockTotal = blockMarks.length;
        const blockPassed = blockMarks.filter(m => {
            const score = m.final_score || m.total || 0;
            return score >= passThreshold;
        }).length;
        const blockCredits = blockMarks.reduce((sum, m) => sum + (m.credits || 3), 0);
        const blockPoints = blockMarks.reduce((sum, m) => {
            const pts = m.points || calculatePoints(m.grade, userProgram) || 0;
            return sum + (pts * (m.credits || 3));
        }, 0);
        const blockGPA = blockCredits > 0 ? (blockPoints / blockCredits) : 0;
        const blockPassRate = blockTotal > 0 ? Math.round((blockPassed / blockTotal) * 100) : 0;
        
        // ✅ Academic year for this block
        const blockAcademicYear = PROGRAM.getAcademicYear(userProgram, block, intakeYear);
        
        // ✅ Check if all marks in this block are passing
        const allPassed = blockMarks.every(m => {
            const score = m.final_score || m.total || 0;
            return score >= passThreshold;
        });
        
        // ✅ Get next block name
        const blockIndex = blockNames.indexOf(block);
        const nextBlockIndex = blockIndex + 1;
        const hasNextBlock = nextBlockIndex < blockNames.length;
        const nextBlockName = hasNextBlock ? blockNames[nextBlockIndex] : null;
        
        // ✅ Determine progression message for this block (appears AFTER summary)
        let progressionMessage = '';
        let messageColor = '#94a3b8';
        
        if (allPassed && hasNextBlock && blockMarks.length > 0) {
            progressionMessage = `Passed — Proceed to ${nextBlockName} · ${blockAcademicYear.label}`;
            messageColor = '#059669';
        } else if (allPassed && !hasNextBlock && blockMarks.length > 0) {
            progressionMessage = `All blocks completed — Ready for Graduation · ${blockAcademicYear.label}`;
            messageColor = '#4C1D95';
        } else if (!allPassed && blockMarks.length > 0) {
            const failedCount = blockMarks.filter(m => {
                const score = m.final_score || m.total || 0;
                return score < passThreshold && score > 0;
            }).length;
            const failedNames = blockMarks
                .filter(m => {
                    const score = m.final_score || m.total || 0;
                    return score < passThreshold && score > 0;
                })
                .map(m => m.subject_name)
                .join(', ');
            if (failedCount > 0) {
                progressionMessage = `${failedCount} unit(s) failed: ${failedNames} — Retake required · ${blockAcademicYear.label}`;
                messageColor = '#dc2626';
            } else {
                progressionMessage = `Results pending · ${blockAcademicYear.label}`;
                messageColor = '#f59e0b';
            }
        } else {
            progressionMessage = `Results pending · ${blockAcademicYear.label}`;
            messageColor = '#94a3b8';
        }
        
        html += `
            <tr style="background: #0A3D62; color: white; font-weight: 700;">
                <td colspan="6" style="padding: 8px 12px; text-align: center; font-size: 12px;">
                    <i class="fas fa-folder-open"></i> ${escapeHtml(block)} 
                    <span style="font-size: 10px; opacity: 0.8; margin-left: 10px;">
                        (${blockTotal} courses · GPA: ${blockGPA.toFixed(2)} · Pass: ${blockPassRate}% · ${blockAcademicYear.display})
                    </span>
                </td>
            </tr>
        `;
        
        blockMarks.forEach((m, idx) => {
            const grade = m.grade || calculateGrade(m.final_score || m.total || 0, userProgram);
            const gradeColor = getGradeColor(grade);
            const points = m.points || calculatePoints(grade, userProgram) || 0;
            const pointsEarned = points * (m.credits || 3);
            const isPassing = (m.final_score || m.total || 0) >= passThreshold;
            
            totalCreditsAttempted += (m.credits || 3);
            if (isPassing) {
                totalCreditsEarned += (m.credits || 3);
                passedCourses++;
            } else if ((m.final_score || m.total || 0) > 0) {
                failedCourses++;
            } else {
                pendingCourses++;
            }
            totalPoints += pointsEarned;
            
            // ✅ Hollow star indicator for retaken units
            const starIndicator = getHollowStarHtml(m.subject_name);
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background: #f8fafc;' : ''}">
                    <td style="padding: 6px 10px; font-size: 11px; color: #94a3b8; text-align: center;">${idx + 1}</td>
                    <td style="padding: 6px 10px; font-weight: 600; color: #0A3D62; font-size: 12px;">${escapeHtml(m.unit_code || getUnitCode(m.subject_name) || 'N/A')}</td>
                    <td style="padding: 6px 10px; font-size: 12px;">
                        ${escapeHtml(m.subject_name || 'N/A')}
                        ${starIndicator}
                    </td>
                    <td style="padding: 6px 10px; text-align: center; font-size: 12px;">${m.credits || 3}</td>
                    <td style="padding: 6px 10px; text-align: center;">
                        <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 700; font-size: 13px; display: inline-block;">
                            ${grade || '-'}
                        </span>
                    </td>
                    <td style="padding: 6px 10px; text-align: center; font-weight: 600; font-size: 12px; color: ${isPassing ? '#10b981' : '#ef4444'};">
                        ${pointsEarned.toFixed(1)}
                    </td>
                </tr>
            `;
        });
        
        // ✅ Block Summary row
        html += `
            <tr style="background: #f1f5f9; border-top: 2px solid #0A3D62;">
                <td colspan="3" style="padding: 4px 10px; font-size: 10px; color: #64748b;">
                    <strong>Block Summary:</strong> ${blockPassed}/${blockTotal} passed (${blockPassRate}%) · GPA: ${blockGPA.toFixed(2)}
                </td>
                <td colspan="3" style="padding: 4px 10px; font-size: 10px; color: #64748b; text-align: right;">
                    ${blockAcademicYear.display}
                </td>
            </tr>
        `;
        
        // ✅ PROGRESSION MESSAGE - Appears AFTER the block summary (at bottom of block)
        if (blockMarks.length > 0) {
            html += `
                <tr>
                    <td colspan="6" style="padding: 4px 10px; text-align: center; font-size: 10px; color: ${messageColor}; font-weight: 500; border-bottom: 2px solid #e5e7eb; background: #fafbfc;">
                        ${progressionMessage}
                    </td>
                </tr>
            `;
        }
    });
    
    tbody.innerHTML = html;
    
    const cgpa = totalCreditsAttempted > 0 ? (totalPoints / totalCreditsAttempted) : 0;
    updateTranscriptSummary(totalCreditsAttempted, totalCreditsEarned, totalCourses, cgpa);
}

function updateTranscriptSummary(attempted, earned, courses, cgpa) {
    document.getElementById('total-attempted').textContent = attempted;
    document.getElementById('total-earned').textContent = earned;
    document.getElementById('transcript-cgpa').textContent = cgpa.toFixed(2);
}
    // ============================================================
    // 18. COURSE PROGRESS
    // ============================================================
    function loadCourseProgress() {
        const container = document.getElementById('course-progress-list');
        if (!container) return;
        
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const grades = currentGrades.length > 0 ? currentGrades : (myMarksData.length > 0 ? myMarksData.map(m => normalizeAcademicMark(m, userProgram)) : []);
        
        if (grades.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">No course data available</div>';
            document.getElementById('completed-courses-progress').textContent = '0';
            document.getElementById('total-courses-progress').textContent = '0';
            return;
        }
        
        let html = '';
        grades.forEach(g => {
            const barColor = getGradeColor(g.grade);
            html += `
                <div class="progress-item">
                    <div class="progress-header">
                        <span class="course-name">${escapeHtml(g.courseName)}</span>
                        <span class="progress-percent">${g.total}%</span>
                        <span style="background: ${getGradeColor(g.grade)}; color: white; padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 10px;">
                            ${g.grade}
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${g.total}%; background: ${barColor};"></div>
                    </div>
                    <div style="margin-top: 4px; font-size: 12px; color: ${getStatusColor(g.status)};">
                        ${g.status} · Points: ${g.points.toFixed(1)}
                    </div>
                </div>
            `;
        });
        
        document.getElementById('completed-courses-progress').textContent = grades.filter(g => g.status !== 'FAIL' && g.status !== 'PENDING').length;
        document.getElementById('total-courses-progress').textContent = grades.length;
        container.innerHTML = html;
    }

    // ============================================================
    // 19. DOWNLOAD FULL TRANSCRIPT
    // ============================================================
    function downloadTranscriptPDF() {
        const user = window.currentUserProfile || {};
        const userProgram = user.program || '';
        const isTVET = PROGRAM.isTVET(userProgram);
        const programType = PROGRAM.getProgramType(userProgram);
        
        let marksData = [];
        if (window.myMarksData && window.myMarksData.length > 0) {
            marksData = window.myMarksData;
        } else if (currentGrades && currentGrades.length > 0) {
            marksData = currentGrades;
        } else {
            alert('No marks available to generate transcript.');
            return;
        }
        
        if (marksData.length === 0) {
            alert('No marks available to generate transcript.');
            return;
        }
        
        console.log('📊 Generating transcript PDF for', marksData.length, 'courses');
        const rows = marksData.map((m,i) => {
            const scoreValue = getPublishedScore(m);
            const score = scoreValue === null ? null : scoreValue;
            const grade = m.grade || m.published_grade || m.final_grade || (score !== null ? calculateGrade(score, userProgram) : '-');
            const storedPoints = numericMark(m, ['points', 'grade_points']);
            const points = storedPoints !== null ? storedPoints : (grade !== '-' ? calculatePoints(grade, userProgram) : null);
            const storedStatus = String(m.status || m.published_status || m.result_status || '').toUpperCase();
            const status = ['DISTINCTION','CREDIT','PASS','FAIL','PENDING','EXCELLENT','GOOD','SATISFACTORY'].includes(storedStatus)
                ? storedStatus : (score !== null ? getGradingStatus(score, userProgram) : 'PENDING');
            return `<tr><td>${i+1}</td><td>${escapeHtml(m.block || m.block_term || 'General')}</td><td>${escapeHtml(m.unit_code || getUnitCode(m.subject_name) || 'N/A')}</td><td>${escapeHtml(m.subject_name || 'N/A')}</td><td>${Number(m.credits || 3)}</td><td>${score === null ? 'Pending' : score.toFixed(1)}</td><td>${escapeHtml(grade)}</td><td>${points === null ? '—' : points.toFixed(1)}</td><td>${escapeHtml(status)}</td></tr>`;
        }).join('');
        const gpa = calculateGPA(marksData);
        const w = window.open('', '_blank', 'width=1100,height=800');
        if (!w) { alert('Please allow popups to generate the transcript.'); return; }
        w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Academic Transcript</title><style>
        body{font-family:Arial,sans-serif;margin:30px;color:#1e293b}h1{text-align:center;color:#0A3D62;font-size:22px;margin:0}h2{text-align:center;font-size:16px;margin:5px 0 20px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;border:1px solid #ddd;padding:12px;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#0A3D62;color:white;padding:8px;border:1px solid #ccc}td{padding:7px;border:1px solid #ddd}.summary{margin-top:20px;font-weight:700}@media print{body{margin:12mm}.no-print{display:none}}</style></head><body>
        <h1>Nakuru College of Health Sciences and Management</h1><h2>Academic Transcript</h2>
        <div class="meta"><div><b>Student:</b> ${escapeHtml(user.full_name || 'Student')}</div><div><b>Admission:</b> ${escapeHtml(user.student_id || user.admission_number || 'N/A')}</div><div><b>Program:</b> ${escapeHtml(userProgram || 'N/A')}</div></div>
        <table><thead><tr><th>#</th><th>Block/Term</th><th>Unit Code</th><th>Unit Name</th><th>Credits</th><th>Score</th><th>Grade</th><th>Grade Points</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="summary">Cumulative GPA: ${gpa.toFixed(2)} &nbsp; | &nbsp; Units: ${marksData.length}</div>
        <div class="no-print" style="text-align:center;margin-top:25px"><button onclick="window.print()">Print / Save as PDF</button></div>
        </body></html>`);
        w.document.close();
    }

    // ============================================================
    // 20. DOWNLOAD PROVISIONAL ACADEMIC TRANSCRIPT - RETAKE SUMMARY REMOVED
    // ============================================================
    function downloadReportCard(outputMode = 'download') {
        console.log('📊 Downloading Provisional Academic Transcript...');

        const user = window.currentUserProfile || window.db?.currentUserProfile || {};
        const userProgram = user.program || '';
        const isTVET = PROGRAM.isTVET(userProgram);
        const programType = PROGRAM.getProgramType(userProgram);

        // IMPORTANT: build the PDF from the currently filtered records, not the
        // unfiltered cache. This prevents Block 1 marks leaking into a Block 2 PDF.
        const blockFilter = document.getElementById('my_marks_block_filter')?.value || 'all';
        const subjectFilter = document.getElementById('my_marks_subject_filter')?.value || 'all';
        const yearFilter = document.getElementById('my_marks_year_filter')?.value || 'all';
        const searchTerm = document.getElementById('my_marks_search')?.value?.trim().toLowerCase() || '';
        const normalizeBlock = value => String(value || '').trim().toLowerCase()
            .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
            .replace(/^(block|term)\s*(\d+)$/, '$1 $2');

        let marks = Array.isArray(myMarksFiltered) ? [...myMarksFiltered] : [];
        // Reapply the selected filters against the canonical loaded data so stale
        // table state or an outdated filtered array cannot affect the downloaded file.
        if (Array.isArray(myMarksData) && myMarksData.length) {
            marks = [...myMarksData];
            if (blockFilter !== 'all') {
                marks = marks.filter(m => normalizeBlock(m.block || m.block_term || m.term) === normalizeBlock(blockFilter));
            }
            if (subjectFilter !== 'all') marks = marks.filter(m => m.subject_name === subjectFilter);
            if (yearFilter !== 'all') marks = marks.filter(m => String(m.academic_year || m.year || '') === yearFilter);
            if (searchTerm) {
                marks = marks.filter(m =>
                    String(m.subject_name || '').toLowerCase().includes(searchTerm) ||
                    String(m.unit_code || '').toLowerCase().includes(searchTerm)
                );
            }
        }

        // Never fall back to scraping the visible table or unfiltered marks:
        // that can silently create a report for the wrong block.
        if (marks.length === 0) {
            alert(blockFilter !== 'all'
                ? 'No published marks were found for ' + blockFilter + '. Please check the selected block and try again.'
                : 'No marks match the current filters. Please adjust the filters and try again.');
            return;
        }

        console.log('📊 Generating filtered semester report for', marks.length, 'marks; block:', blockFilter);

        // Open the output tab synchronously during the user's click. Mobile browsers
        // block popups opened later after the transcript has been assembled.
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Your browser blocked the transcript window. Allow pop-ups for nchsm.co.ke and tap the button again.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preparing transcript…</title></head><body style="font:16px Arial;padding:24px">Preparing your transcript PDF…</body></html>');
        printWindow.document.close();

        // Show loading
        const loadingEl = document.createElement('div');
        loadingEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
        loadingEl.innerHTML = '<div style="background:white;padding:30px;border-radius:12px;text-align:center;"><div class="loading-spinner"></div><p style="margin-top:12px;color:#1e293b;">Generating Provisional Academic Transcript...</p></div>';
        document.body.appendChild(loadingEl);
        
        try {
            let profilePicture = '';
            if (user.passport_photo || user.profile_picture || user.photo_url) {
                profilePicture = user.passport_photo || user.profile_picture || user.photo_url || '';
            }
            
            const now = new Date().toLocaleDateString('en-KE', {
                timeZone: 'Africa/Nairobi',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const academicYear = user.academic_year || `${currentYear}/${nextYear}`;
            
            let weightedPoints = 0;
            let totalCredits = 0;
            let totalUnits = 0;
            let passed = 0;
            let failed = 0;
            let pending = 0;
            
            marks.forEach(m => {
                const publishedGrade = m.grade || m.published_grade || m.final_grade || '';
                const pointsValue = Number(m.points);
                const points = Number.isFinite(pointsValue) ? pointsValue : (publishedGrade ? calculatePoints(publishedGrade, userProgram) : null);
                const creditsValue = Number(m.credits);
                const credits = Number.isFinite(creditsValue) && creditsValue > 0 ? creditsValue : 3;
                if (points !== null && Number.isFinite(points)) {
                    weightedPoints += points * credits;
                    totalCredits += credits;
                }
                totalUnits++;
                
                // Determine pass/fail based on program type
                const threshold = isTVET ? 50 : 60;
                const score = m.final_score || 0;
                if (score >= threshold) passed++;
                else if (score > 0) failed++;
                else pending++;
            });
            
            const gpa = totalCredits > 0 ? (weightedPoints / totalCredits) : 0;
            
            let grade;
            if (isTVET) {
                if (gpa >= 3.75) grade = 'A';
                else if (gpa >= 3.0) grade = 'B';
                else if (gpa >= 2.0) grade = 'C';
                else grade = 'FAIL';
            } else {
                if (gpa >= 3.75) grade = 'A';
                else if (gpa >= 3.0) grade = 'B';
                else if (gpa >= 2.0) grade = 'C';
                else grade = 'D';
            }
            
            const passRate = totalUnits > 0 ? Math.round((passed / totalUnits) * 100) : 0;
            // Adjust print typography to the actual number of units; no fixed unit limit.
            const printUnitFontSize = marks.length <= 4 ? 15 : marks.length <= 8 ? 14 : marks.length <= 14 ? 12 : marks.length <= 22 ? 10 : 9;
            const printRowVerticalPadding = marks.length <= 2 ? 7 : marks.length <= 4 ? 5 : marks.length <= 8 ? 4 : marks.length <= 14 ? 2 : 1;
            const printSectionSpacing = marks.length <= 4 ? 5 : marks.length <= 8 ? 4 : 2;
            
            // ✅ Build table rows - ☆ star next to unit name, ALL BORDERS
            let tableRows = '';
            marks.forEach((mark, index) => {
                const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
                const score = getPublishedScore(mark);
                const gradeDisplay = mark.grade || mark.published_grade || mark.final_grade || (score !== null ? calculateGrade(score, userProgram) : '-');
                // Define the grade colour in this row's scope before rendering the grade and points.
                const gradeColor = (typeof getGradeColor === 'function' ? getGradeColor(gradeDisplay) : '#64748b');
                const points = resolveDisplayPoints(mark, gradeDisplay, userProgram);
                const rawStatus = String(mark.final_status || mark.status || mark.published_status || mark.result_status || '').trim().toUpperCase();
                const allowedStatuses = ['DISTINCTION','CREDIT','PASS','FAIL','PENDING','EXCELLENT','GOOD','SATISFACTORY'];
                const statusDisplay = score === null
                    ? 'PENDING'
                    : (allowedStatuses.includes(rawStatus) ? rawStatus : getGradingStatus(score, userProgram));
                const statusColor = statusDisplay === 'DISTINCTION' || statusDisplay === 'EXCELLENT' ? '#047857'
                    : statusDisplay === 'CREDIT' || statusDisplay === 'GOOD' ? '#1d4ed8'
                    : statusDisplay === 'PASS' || statusDisplay === 'SATISFACTORY' ? '#b45309'
                    : statusDisplay === 'FAIL' ? '#b91c1c' : '#64748b';
                // Use the same student retake records as the on-screen table.
                const hasRetakeFlag = hasRetake(mark.subject_name);
                const isRetakenUnit = hasRetakeFlag || mark.hasRetake === true;
                const retakeCount = hasRetakeFlag ? getRetakeCount(mark.subject_name) : (Number(mark.retakeCount) || 0);
                
                // Hollow star stays beside the unit name for retaken units.
                const starIndicator = isRetakenUnit ? `<span style="display: inline-block; margin-left: 4px; font-size: 11px; color: #64748b; opacity: 0.9; cursor: help;" title="Retaken (${retakeCount} attempt${retakeCount > 1 ? 's' : ''})">☆</span>` : '';
                
                tableRows += `
                    <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : ''} ${isRetakenUnit ? 'border-left: 3px solid #94a3b8;' : ''}">
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; text-align: center; font-size: 9px; color: #94a3b8;">${index + 1}</td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-weight: 600; color: #0A3D62; font-size: 9px;">${escapeHtml(unitCode)}</td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-size: 9px; color: #1e293b;">
                            ${escapeHtml(mark.subject_name || 'N/A')}
                            ${starIndicator}
                        </td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; text-align: center;">
                            <span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 10px; font-weight: 700; font-size: 10px; display: inline-block; min-width: 28px;">
                                ${escapeHtml(gradeDisplay)}
                            </span>
                        </td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; font-size: 10px; color: ${gradeColor};">
                            ${points === null ? '—' : points.toFixed(1)}
                        </td>
                        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;">
                            <span style="display:inline-block;background:${statusColor};color:#fff;padding:4px 7px;border-radius:10px;font-weight:700;font-size:10px;white-space:normal;">${escapeHtml(statusDisplay)}</span>
                        </td>
                    </tr>
                `;
            });
            
            // Generate data for line graph
            const sortedMarks = [...marks].sort((a, b) => {
                const blockOrder = {
                    'Introductory': 0, 'Block 1': 1, 'Block 2': 2, 'Block 3': 3,
                    'Block 4': 4, 'Block 5': 5, 'Final': 6,
                    'Term 1': 1, 'Term 2': 2, 'Term 3': 3, 'Term 4': 4,
                    'Term 5': 5, 'Term 6': 6
                };
                return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
            });
            
            const graphLabels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
            const graphData = sortedMarks.map(m => {
                const grade = m.grade || m.published_grade || m.final_grade || '';
                const points = Number(m.points);
                return Number.isFinite(points) ? points : (grade ? calculatePoints(grade, userProgram) : null);
            });
            const validGraphPoints = graphData.filter(p => Number.isFinite(p));
            const avgPoints = validGraphPoints.length ? validGraphPoints.reduce((a, b) => a + b, 0) / validGraphPoints.length : 0;
            
            // TABLE FORMAT GRADING SCALE
            let gradingScaleHTML = '';
            if (isTVET) {
                gradingScaleHTML = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #d1d5db;">
                        <thead>
                            <tr style="background: #0A3D62; color: white;">
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Marks Range</th>
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Grade</th>
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Points</th>
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="background: #d1fae5;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">75 - 100%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #065f46;">A</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">4.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #065f46;">EXCELLENT</td>
                            </tr>
                            <tr style="background: #dbeafe;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">65 - 74%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #1e40af;">B</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">3.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #1e40af;">GOOD</td>
                            </tr>
                            <tr style="background: #fef3c7;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">50 - 64%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #92400e;">C</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">2.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #92400e;">SATISFACTORY</td>
                            </tr>
                            <tr style="background: #fee2e2;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">Below 50%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #991b1b;">FAIL</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">0.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #991b1b;">FAIL</td>
                            </tr>
                            <tr style="background: #f3f4f6;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-style: italic;">No Score</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #94a3b8;">PENDING</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="4" style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #0A3D62; font-size: 7px;">Min Pass: 50%</td></tr>
                        </tfoot>                    </table>
                `;
            } else {
                gradingScaleHTML = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #d1d5db;">
                        <thead>
                            <tr style="background: #0A3D62; color: white;">
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Marks Range</th>
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Grade</th>
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Points</th>
                                <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="background: #d1fae5;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">75 - 100%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #065f46;">A</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">4.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #065f46;">DISTINCTION</td>
                            </tr>
                            <tr style="background: #dbeafe;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">65 - 74%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #1e40af;">B</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">3.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #1e40af;">CREDIT</td>
                            </tr>
                            <tr style="background: #fef3c7;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">60 - 64%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #92400e;">C</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">2.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #92400e;">PASS</td>
                            </tr>
                            <tr style="background: #fee2e2;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">Below 60%</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #991b1b;">D</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">0.0</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #991b1b;">FAIL</td>
                            </tr>
                            <tr style="background: #f3f4f6;">
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-style: italic;">No Score</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td>
                                <td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #94a3b8;">PENDING</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr><td colspan="4" style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #0A3D62; font-size: 7px;">Min Pass: 60%</td></tr>
                        </tfoot>
                    </table>
                `;
            }
            
            // Profile picture HTML
            let profilePictureHTML = '';
            if (profilePicture) {
                profilePictureHTML = `
                    <div style="text-align: center; margin-right: 12px; flex-shrink: 0;">
                        <img src="${profilePicture}" alt="Student Photo" 
                             style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #0A3D62; padding: 2px; background: white;"
                             onerror="this.style.display='none'">
                    </div>
                `;
            }
            
            loadingEl.remove();
            
            if (printWindow && !printWindow.closed) {
                printWindow.document.open();
                printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <title>Provisional Academic Transcript - ${escapeHtml(user.full_name || 'Student')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 portrait; margin: 6mm; }
        body { font-family: 'Times New Roman', 'Georgia', serif; background: #ffffff; font-size: 10px; margin: 0; padding: 10px; color: #1e293b; }
        .container { box-sizing: border-box; max-width: none; width: 100%; margin: 0 auto; padding: 12px 14px; background: #ffffff; border: 2px solid #0A3D62; border-radius: 6px; box-shadow: none; }
        .transcript-top { position: relative; display: block; width: 100%; }
        .transcript-top > .header { width: 100%; box-sizing: border-box; padding-right: 44px; }
        .transcript-top > .verification-qr { position: absolute; top: 0; right: 0; z-index: 2; }
        .transcript-top .header { min-width: 0; }
        .verification-qr { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 1px; width: 34px; padding: 2px; border: 1px solid #0A3D62; border-radius: 3px; background: #fff; font-size: 5px; font-weight: 700; color: #0A3D62; }
        .verification-qr img { display: block; width: 26px; height: 26px; object-fit: contain; }
        .header { text-align: center; border-bottom: 3px double #0A3D62; padding-bottom: 10px; margin-bottom: 12px; }
        .header-top { display: flex; align-items: center; justify-content: flex-start; gap: 8px; }
        .header-top img { max-height: 64px; max-width: 76px; width: auto; object-fit: contain; }
        .header .school { font-size: 19px; line-height: 1.25; font-weight: 800; color: #0A3D62; font-family: 'Georgia', serif; }
        .header .motto { font-size: 8px; color: #64748b; font-style: italic; }
        .header .subtitle { display: inline-block; font-size: 17px; color: #ffffff; background: #0A3D62; font-weight: 800; margin-top: 10px; padding: 7px 28px; border-radius: 4px; letter-spacing: 2px; font-family: 'Georgia', serif; }
        .header .date { font-size: 8px; color: #94a3b8; margin-top: 2px; }
        .student-info-wrapper { display: flex; align-items: center; gap: 16px; margin: 12px 0 16px; padding: 14px 16px; background: #f1f6fb; border-radius: 8px; border: 1px solid #cbdbea; border-left: 5px solid #0A3D62; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; flex: 1; }
        .student-info .field { display: flex; flex-direction: column; }
        .student-info .label { font-size: 9px; color: #52677a; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 800; }
        .student-info .value { font-weight: 800; font-size: 12px; line-height: 1.35; color: #0A3D62; margin-top: 3px; overflow-wrap: anywhere; }
        .student-photo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #0A3D62; padding: 2px; background: white; flex-shrink: 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
        .summary-card { background: linear-gradient(180deg,#ffffff,#f3f7fb); border-radius: 8px; padding: 12px 10px; text-align: center; border: 1px solid #cbdbea; border-top: 4px solid #0A3D62; }
        .summary-card .value { font-size: 24px; line-height: 1.2; font-weight: 800; color: #0A3D62; }
        .summary-card .label { font-size: 9px; color: #52677a; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 800; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 8px 0; font-size: 8px; border: 1px solid #d1d5db; }
        .semester-results-title { margin: 14px 0 0; padding: 11px 16px; background: #0A3D62; color: #ffffff; border-radius: 7px 7px 0 0; font-size: 15px; line-height: 1.25; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
        table.semester-results-table { margin: 0 0 12px; font-size: 11px; table-layout: auto; }
        table.semester-results-table thead th { padding: 12px 14px; font-size: 11px; line-height: 1.3; }
        table.semester-results-table tbody td { padding: 12px 14px; font-size: 12px; line-height: 1.45; }
        table.semester-results-table tbody td:nth-child(1),
        table.semester-results-table tbody td:nth-child(4),
        table.semester-results-table tbody td:nth-child(5) { text-align: center; }

        thead th { background: #0A3D62; color: white; padding: 10px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 800; border: 1px solid #0A3D62; }
        thead th.center { text-align: center; }
        tbody td { padding: 9px 12px; border: 1px solid #d1d5db; font-size: 10px; line-height: 1.35; }
        .chart-container { margin: 10px 0 12px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; }
        .chart-container .title { font-weight: 700; font-size: 8px; color: #0A3D62; text-align: center; margin-bottom: 4px; }
        .chart-container canvas { width: 100% !important; height: 145px !important; max-height: 145px; }
        .grading-scale-table { margin: 10px 0 12px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; }
        .grading-scale-table .title { font-weight: 800; font-size: 11px; color: #0A3D62; text-align: center; margin-bottom: 8px; }
        .grading-scale-table table { width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #d1d5db; }
        .grading-scale-table th { background: #0A3D62; color: white; padding: 4px 8px; text-align: center; font-size: 6px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #0A3D62; }
        .grading-scale-table td { padding: 4px 8px; text-align: center; border: 1px solid #d1d5db; font-size: 7px; }
        .declaration { margin: 10px 0 12px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; font-size: 10px; line-height: 1.5; }
        .declaration .title { font-weight: 700; color: #0A3D62; font-size: 8px; }
        .declaration .checkbox { display: inline-block; width: 9px; height: 9px; border: 2px solid #0A3D62; border-radius: 2px; margin-right: 4px; vertical-align: middle; background: #0A3D62; position: relative; }
        .declaration .checkbox::after { content: "✓"; color: white; font-size: 6px; position: absolute; top: -2px; left: 0px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 8px 0 6px 0; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .signature-box { text-align: center; }
        .signature-box .line { border-bottom: 2px solid #1e293b; width: 130px; margin: 8px auto 2px auto; }
        .signature-box .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .signature-box .name { font-weight: 600; font-size: 10px; color: #0A3D62; }
        .footer { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 2px solid #0A3D62; font-size: 9px; line-height: 1.5; color: #52677a; }
        .footer strong { color: #0A3D62; }
        .no-print { text-align: center; margin-top: 8px; }
        .no-print button { padding: 5px 18px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 10px; }
        .no-print .btn-print { background: #0A3D62; color: white; }
        .no-print .btn-close { background: #e2e8f0; color: #475569; margin-left: 6px; }
        /* Keep the report readable on phones instead of scaling the whole page down. */
        @media screen and (max-width: 600px) {
            body { font-size: 14px; padding: 8px; }
            .container { width: 100%; max-width: 100%; padding: 12px 10px; border-width: 2px; border-radius: 6px; }
            .header-top { gap: 8px; align-items: center; }
            .header-top img { max-width: 48px; max-height: 48px; }
            .header .school { font-size: clamp(13px, 4vw, 17px); line-height: 1.25; }
            .header .subtitle { font-size: 15px; padding: 7px 14px; letter-spacing: 1px; }
            .student-info-wrapper { padding: 10px; gap: 8px; }
            .student-info { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .student-info .label { font-size: 10px; }
            .student-info .value { font-size: 13px; }
            .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
            .summary-card { padding: 10px 6px; }
            .summary-card .value { font-size: 22px; }
            .summary-card .label { font-size: 10px; letter-spacing: .3px; }
            .semester-results-title { font-size: 15px; padding: 10px 12px; }
            table.semester-results-table { width: 100%; table-layout: fixed; font-size: 13px; }
            table.semester-results-table thead th { font-size: 12px; padding: 9px 5px; overflow-wrap: anywhere; }
            table.semester-results-table tbody td { font-size: 13px; line-height: 1.4; padding: 10px 5px; overflow-wrap: anywhere; word-break: normal; }
            /* Mobile readability: inline cell styles otherwise override responsive font sizes. */
            table.semester-results-table thead th { font-size: 13px !important; line-height: 1.35; padding: 11px 6px !important; }
            table.semester-results-table tbody td { font-size: 13px !important; line-height: 1.5 !important; padding: 12px 6px !important; }
            table.semester-results-table tbody td:nth-child(1) { font-size: 11px !important; }
            table.semester-results-table tbody td:nth-child(2) { font-size: 12px !important; overflow-wrap: normal; word-break: normal; }
            table.semester-results-table tbody td:nth-child(3) { font-size: 14px !important; line-height: 1.35 !important; overflow-wrap: anywhere; }
            table.semester-results-table tbody td:nth-child(4) span { font-size: 12px !important; padding: 3px 6px !important; }
            table.semester-results-table tbody td:nth-child(5) { font-size: 12px !important; }
            table.semester-results-table tbody td:nth-child(6) { font-size: 10px !important; }
            table.semester-results-table th:nth-child(1), table.semester-results-table td:nth-child(1) { width: 6%; }
            table.semester-results-table th:nth-child(2), table.semester-results-table td:nth-child(2) { width: 18%; }
            table.semester-results-table th:nth-child(3), table.semester-results-table td:nth-child(3) { width: 31%; }
            table.semester-results-table th:nth-child(4), table.semester-results-table td:nth-child(4) { width: 13%; }
            table.semester-results-table th:nth-child(5), table.semester-results-table td:nth-child(5) { width: 14%; }
            table.semester-results-table th:nth-child(6), table.semester-results-table td:nth-child(6) { width: 18%; }
            .grading-scale-table, .chart-container, .declaration { padding: 9px; }
            .grading-scale-table table { table-layout: fixed; }
            .grading-scale-table th, .grading-scale-table td { font-size: 9px; padding: 5px 3px; overflow-wrap: anywhere; }
            .chart-container canvas { height: 160px !important; max-height: 160px; }
            .signatures { gap: 12px; }
            .signature-box .line { max-width: 100%; }
            .footer { overflow-wrap: anywhere; }
        }
        /* Apply the landscape layout to html2canvas capture as well as physical printing.
           html2pdf captures screen styles; print-only rules leave the report scaled and fragmented. */
        @page { size: A4 portrait; margin: 6mm; }
        @media print, screen {
            @page { size: A4 portrait; margin: 6mm; }
            html, body { width: 198mm !important; min-width: 198mm !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff; }
            body { font-size: 9px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* Fill the printable A4 landscape area rather than shrinking content into a centered strip. */
            .container { box-sizing: border-box !important; width: 100% !important; min-width: 0 !important; min-height: 0 !important; height: auto !important; margin: 0 !important; }
            .container { width: 100% !important; max-width: none !important; min-height: 0 !important; height: auto !important; margin: 0 !important; border: 1px solid #0A3D62 !important; border-radius: 0 !important; padding: 2mm !important; box-shadow: none !important; }
            /* Landscape transcript: maximize table width, then use a three-column lower band. */
            .container {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
                grid-template-areas:
                    "header header"
                    "student student"
                    "results-title results-title"
                    "results-table results-table"
                    "summary grading"
                    "chart chart"
                    "declaration declaration"
                    "signatures signatures"
                    "footer footer" !important;
                align-items: start !important;
                column-gap: 2mm !important;
                row-gap: 1mm !important;
            }
            .header { grid-area: header !important; }
            .student-info-wrapper { grid-area: student !important; }
            .semester-results-title { grid-area: results-title !important; }
            table.semester-results-table { grid-area: results-table !important; }
            .chart-container { grid-area: chart !important; min-width: 0 !important; align-self: stretch !important; }
            .summary-grid { grid-area: summary !important; display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; align-self: start !important; }
            .grading-scale-table { grid-area: grading !important; min-width: 0 !important; align-self: start !important; }
            .declaration { grid-area: declaration !important; min-width: 0 !important; }
            .signatures { grid-area: signatures !important; min-width: 0 !important; }
            .footer { grid-area: footer !important; }
            .no-print { display: none !important; }
            .header { padding-bottom: 2px !important; margin-bottom: 2px !important; border-bottom-width: 1px !important; }
            .header-top { justify-content: flex-start !important; gap: 6px !important; }\n                        .header-top img { max-height: 28px !important; max-width: 38px !important; }
            .header .school { font-size: 12px !important; line-height: 1.1 !important; }
            .header .motto { font-size: 7px !important; }
            .header .subtitle { font-size: 10px !important; margin-top: 2px !important; padding: 2px 8px !important; letter-spacing: .5px !important; }
            .header .date { font-size: 7px !important; margin-top: 1px !important; }
            .student-info-wrapper { margin: 2px 0 3px !important; padding: 3px 5px !important; gap: 5px !important; }
            .student-photo { width: 30px !important; height: 30px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .student-info { gap: 2px 8px !important; }
            .student-info .label { font-size: 7px !important; }
            .student-info .value { font-size: 8px !important; line-height: 1.05 !important; }
            .semester-results-title { font-size: 9px !important; line-height: 1.1 !important; padding: 3px 6px !important; margin-bottom: 1px !important; background: #0A3D62 !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            table.semester-results-table { width: 100% !important; table-layout: fixed !important; font-size: 8px !important; margin: 0 !important; }
            table.semester-results-table thead th { font-size: 7px !important; line-height: 1 !important; padding: 2px 3px !important; }
            table.semester-results-table tbody td { font-size: 8px !important; line-height: 1.08 !important; padding: ${printRowVerticalPadding}px 3px !important; }
            table.semester-results-table tbody td:nth-child(3) { font-size: ${printUnitFontSize}px !important; line-height: 1.02 !important; overflow-wrap: anywhere !important; padding-top: ${printRowVerticalPadding}px !important; padding-bottom: ${printRowVerticalPadding}px !important; }
            table.semester-results-table tbody td:nth-child(6) { font-size: 7px !important; }
            .summary-grid { gap: ${printSectionSpacing}px !important; margin: 0 !important; }
            .summary-card { padding: ${marks.length <= 4 ? 5 : marks.length <= 8 ? 3 : 2}px !important; }
            .grading-scale-table { padding: 2px !important; margin: 0 !important; }
            .chart-container { margin: 0 !important; }
            .summary-card .value { font-size: 11px !important; line-height: 1 !important; }
            .summary-card .label { font-size: 6px !important; line-height: 1 !important; }
            .grading-scale-table { padding: 2px !important; margin: 2px 0 !important; }
            .grading-scale-table .title, .chart-container .title { font-size: 7px !important; margin-bottom: 1px !important; }
            .grading-scale-table th, .grading-scale-table td { font-size: 6px !important; line-height: 1 !important; padding: 1px 2px !important; }
            .grading-scale-table table { margin: 0 !important; }
            /* Keep the chart, declaration, signatures and footer in the print output.
               Compact the chart rather than removing report content to force pagination. */
            .chart-container { display: block !important; padding: 2px 4px !important; margin: 2px 0 !important; }
            .chart-container canvas { display: block !important; width: 100% !important; height: 48px !important; max-height: 48px !important; }
            .chart-container .title { font-size: 6px !important; margin-bottom: 0 !important; }
            .header > div[style*="border: 1px solid #d97706"] { margin: 2px auto 1px !important; padding: 2px 5px !important; font-size: 7px !important; line-height: 1.05 !important; }
            .summary-card .label { letter-spacing: 0 !important; }
            .grading-scale-table .title { margin-bottom: 0 !important; }
            .semester-results-table tbody td:nth-child(3) { overflow-wrap: normal !important; word-break: normal !important; }
            .signatures { grid-template-columns: 1fr 1fr !important; }
            .footer { break-inside: avoid !important; page-break-inside: avoid !important; }
            .declaration { padding: 2px 4px !important; margin: 2px 0 !important; font-size: 6px !important; line-height: 1.05 !important; }
            .declaration .title { font-size: 6px !important; }
            .signatures { gap: 8px !important; margin: 2px 0 !important; }
            .signature-box { padding: 1px !important; }
            .signature-box .name { font-size: 7px !important; }
            .signature-box .line { margin: 2px auto 1px !important; }
            .signature-box .label, .signature-box .date { font-size: 6px !important; line-height: 1 !important; }
            .footer { margin-top: 2px !important; padding-top: 1px !important; font-size: 6px !important; line-height: 1 !important; }
            .footer p { margin: 1px 0 !important; }
            thead th, td span { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            /* Avoid splitting a row; allow extra pages when the unit count genuinely requires them. */
            /* Do not force the whole document onto a second page; only keep individual rows intact. */
            .container { break-inside: auto !important; page-break-inside: auto !important; }
            table.semester-results-table, table.semester-results-table tr { break-inside: avoid !important; page-break-inside: avoid !important; }
            .student-info-wrapper, .summary-grid, .grading-scale-table, .chart-container, .declaration, .signatures, .footer { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER WITH SMALL VERIFICATION QR IN TOP-RIGHT CORNER -->
        <div class="transcript-top">
            <div class="header">
            <div class="header-top">
                <img src="https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png" alt="NCHSM Logo" onerror="this.style.display='none'">
                <div>
                    <div class="school">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                    <div class="motto">"Excellence in Health Sciences Education"</div>
                </div>
            </div>
            <div class="subtitle">PROVISIONAL ACADEMIC TRANSCRIPT</div>
            <div class="date">Generated: ${now}</div>
            </div>
            <div class="verification-qr" aria-label="Document verification QR code">
                <img id="transcriptVerificationQr" alt="Scan to verify this transcript" />
                <span>VERIFY</span>
            </div>
        </div>
        
        <!-- STUDENT INFO WITH PHOTO -->
        <div class="student-info-wrapper">
            ${profilePictureHTML}
            <div class="student-info">
                <div class="field"><span class="label">Student Name</span><span class="value">${escapeHtml(user.full_name || 'Student')}</span></div>
                <div class="field"><span class="label">Admission Number</span><span class="value">${escapeHtml(user.student_id || user.admission_number || 'N/A')}</span></div>
                <div class="field"><span class="label">Program</span><span class="value">${escapeHtml(userProgram || 'KRCHN')}</span></div>
                <div class="field"><span class="label">Academic Year</span><span class="value">${escapeHtml(academicYear)}</span></div>
            </div>
        </div>
        
        <!-- SEMESTER RESULTS -->
        <div class="semester-results-title">Semester Results</div>
        <!-- TABLE WITH ALL BORDERS - ☆ STAR NEXT TO UNIT NAME -->
        <table class="semester-results-table">
            <thead>
                <tr>
                    <th style="text-align: center; width: 25px; border: 1px solid #0A3D62;">#</th>
                    <th style="min-width: 65px; border: 1px solid #0A3D62;">Unit Code</th>
                    <th style="min-width: 150px; border: 1px solid #0A3D62;">Unit Name</th>
                    <th style="text-align: center; width: 50px; border: 1px solid #0A3D62;">Grade</th>
                    <th style="text-align: center; width: 70px; border: 1px solid #0A3D62;">Grade Points</th>\n                    <th style="text-align: center; min-width: 95px; border: 1px solid #0A3D62;">Status</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
        
        <!-- SUMMARY CARDS -->
        <div class="summary-grid">
            <div class="summary-card"><div class="value" style="color: #0A3D62;">${gpa.toFixed(2)}</div><div class="label">Grade Point Average</div></div>
            <div class="summary-card"><div class="value" style="color: ${grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'};">${grade}</div><div class="label">Overall Grade</div></div>
            <div class="summary-card"><div class="value" style="color: #0A3D62;">${totalUnits}</div><div class="label">Units Reported</div></div>
            <div class="summary-card"><div class="value" style="color: #0A3D62;">${passRate}%</div><div class="label">Pass Rate</div></div>
        </div>
        
        <!-- GRADING SCALE -->
        <div class="grading-scale-table">
            <div class="title">Grading Scale (${programType})</div>
            ${gradingScaleHTML}
        </div>
        
        <!-- LINE CHART -->
        <div class="chart-container">
            <div class="title">Grade Points Progression</div>
            <canvas id="reportCardLineChart"></canvas>
        </div>
        
        <!-- DECLARATION -->
        <div class="declaration">
            <span class="title">Student Declaration:</span>
            <span class="checkbox"></span>
            <span>I confirm that the grades presented are accurate and reflect my academic performance.</span>
            <div style="font-size: 6px; color: #94a3b8; margin-top: 2px;">I understand that falsification will result in disciplinary action.</div>
        </div>
        
        <!-- SIGNATURES -->
        <div class="signatures">
            <div class="signature-box">
                <div class="name">${escapeHtml(user.full_name || 'Student')}</div>
                <div class="line"></div>
                <div class="label">Student Signature</div>
                <div class="date">Date: ${now}</div>
            </div>
            <div class="signature-box">
                <div class="name" style="color: #94a3b8;">_________________________</div>
                <div class="line"></div>
                <div class="label">Head of Department (HOD)</div>
                <div class="date">Date: _____________</div>
            </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
            <p>This is an official document. For verification, contact the Academic Office.</p>
            <p><strong>NCHSM</strong> · P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743</p>
        </div>
        
        <div class="no-print">
            <button class="btn-print" onclick="window.printTranscriptWhenReady()">🖨️ Print Provisional Academic Transcript</button>
            <button class="btn-close" onclick="window.close()">Close</button>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
    <script>
        (async function initializeTranscriptQr() {
            const qrImage = document.getElementById('transcriptVerificationQr');
            if (!qrImage) return;
            const studentId = ${JSON.stringify(user.student_id || user.admission_number || user.admission_no || user.student_number || user.admissionNumber || user.id || '')};
            const verifyId = String(studentId || '').replace(/\\s+/g, ' ').trim();
            if (!verifyId || /^N\\/?A$/i.test(verifyId)) {
                qrImage.dataset.error = 'Student admission number unavailable';
                qrImage.alt = 'Student reference unavailable';
                console.error('Transcript QR: student admission number is missing.');
                return;
            }
            const verificationUrl = new URL('/graduation.html', window.location.origin);
            verificationUrl.searchParams.set('id', verifyId);
            verificationUrl.searchParams.set('studentId', verifyId);
            verificationUrl.searchParams.set('type', 'provisional-transcript');
            const payload = verificationUrl.href;
            qrImage.style.display = 'block';
            qrImage.style.visibility = 'visible';
            qrImage.width = 240;
            qrImage.height = 240;
            qrImage.alt = 'Generating transcript verification QR code';
            qrImage.dataset.ready = '';
            qrImage.dataset.error = '';
            const waitForImage = () => new Promise((resolve, reject) => {
                qrImage.onload = () => qrImage.naturalWidth > 0 ? resolve() : reject(new Error('QR image has no pixels'));
                qrImage.onerror = () => reject(new Error('QR image request failed'));
            });
            try {
                let dataUrl = '';
                if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
                    dataUrl = await window.QRCode.toDataURL(payload, { width: 240, margin: 1, errorCorrectionLevel: 'M' });
                } else {
                    for (const src of ['https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js','https://unpkg.com/qrcode@1.5.4/build/qrcode.min.js']) {
                        try {
                            await new Promise((resolve, reject) => {
                                const script = document.createElement('script');
                                const timer = setTimeout(() => reject(new Error('QR library load timed out')), 5000);
                                script.onload = () => { clearTimeout(timer); resolve(); };
                                script.onerror = () => { clearTimeout(timer); reject(new Error('QR library CDN failed')); };
                                script.src = src;
                                script.async = true;
                                document.head.appendChild(script);
                            });
                            if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
                                dataUrl = await window.QRCode.toDataURL(payload, { width: 240, margin: 1, errorCorrectionLevel: 'M' });
                                break;
                            }
                        } catch (loadError) { console.warn('Transcript QR library source failed:', loadError); }
                    }
                }
                if (dataUrl) {
                    const loaded = waitForImage();
                    qrImage.src = dataUrl;
                    await loaded;
                } else {
                    const fallbackUrl = new URL('https://api.qrserver.com/v1/create-qr-code/');
                    fallbackUrl.searchParams.set('size', '240x240');
                    fallbackUrl.searchParams.set('margin', '1');
                    fallbackUrl.searchParams.set('data', payload);
                    const loaded = waitForImage();
                    qrImage.src = fallbackUrl.href;
                    await loaded;
                }
                qrImage.dataset.ready = 'true';
                qrImage.alt = 'Scan to verify this transcript';
                console.info('Transcript QR generated for:', verifyId);
            } catch (error) {
                qrImage.dataset.error = String(error && error.message || error);
                qrImage.alt = 'QR generation failed';
                console.error('Transcript QR generation failed:', error);
            }
        })();

        window.printTranscriptWhenReady = async function () {
            const qr = document.getElementById('transcriptVerificationQr');
            const deadline = Date.now() + 8000;
            while (qr && qr.dataset.ready !== 'true' && !qr.dataset.error && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (qr && qr.dataset.ready !== 'true') {
                const reason = qr.dataset.error || 'QR generation timed out';
                console.error('Transcript print cancelled: verification QR is not ready.', reason);
                alert('The transcript verification QR code could not be generated. Check your connection and try again; the transcript was not sent to print.');
                return;
            }
            const images = Array.from(document.images);
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.addEventListener('load', resolve, { once: true });
                    img.addEventListener('error', resolve, { once: true });
                    setTimeout(resolve, 2000);
                });
            }));
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            window.print();
        };

            const ctx = document.getElementById('reportCardLineChart');
            if (ctx) {
                const labels = ${JSON.stringify(graphLabels)};
                const data = ${JSON.stringify(graphData)};
                const avgPoints = ${avgPoints.toFixed(2)};
                
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Grade Points',
                            data: data,
                            borderColor: '#4C1D95',
                            backgroundColor: 'rgba(76, 29, 149, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointBackgroundColor: data.map(p => {
                                if (p >= 4) return '#10b981';
                                if (p >= 3) return '#3b82f6';
                                if (p >= 2) return '#f59e0b';
                                return '#ef4444';
                            }),
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 1.5,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }, {
                            label: 'GPA (' + avgPoints.toFixed(2) + ')',
                            data: data.map(() => avgPoints),
                            borderColor: '#0A3D62',
                            borderDash: [6, 4],
                            borderWidth: 1.5,
                            fill: false,
                            tension: 0,
                            pointRadius: 0,
                            pointHoverRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    boxWidth: 10,
                                    padding: 6,
                                    font: { size: 8, weight: '600' }
                                }
                            }
                        },
                        scales: {
                            y: { min: 0, max: 4.5, ticks: { stepSize: 0.5, font: { size: 8 } } },
                            x: { ticks: { font: { size: 7 }, maxRotation: 30, minRotation: 20 } }
                        }
                    }
                });
            }
        });
    <\/script>
</body>
</html>
                `);
                printWindow.document.close();
                // Preview first: show the transcript on an A4-like page and let the user choose
                // Download PDF or Print only after reviewing it. Keep the PDF generator unchanged.
                if (outputMode === 'preview') {
                    const previewStyle = printWindow.document.createElement('style');
                    previewStyle.textContent = `
                        html, body { min-height: 100%; background: #eef2f7 !important; }
                        body { margin: 0 !important; padding: 74px 16px 24px !important; }
                        .container { width: 794px !important; max-width: 100% !important; min-height: 1123px !important; height: auto !important; margin: 0 auto !important; padding: 28px !important; background: #fff !important; box-shadow: 0 8px 30px rgba(15,23,42,.18) !important; border-radius: 2px !important; align-content: start !important; }
                        .transcript-preview-toolbar { position: fixed; z-index: 99999; top: 0; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px; background: #0A3D62; box-shadow: 0 2px 10px #0002; }
                        .transcript-preview-toolbar button { border: 0; border-radius: 7px; padding: 10px 16px; font: 600 14px Arial,sans-serif; cursor: pointer; }
                        .transcript-preview-toolbar .download { background: #10b981; color: #fff; }
                        .transcript-preview-toolbar .print { background: rgba(255,255,255,.16); color: #fff; border: 1px solid rgba(255,255,255,.35); }
                        .transcript-preview-toolbar .close { background: #e2e8f0; color: #1e293b; }
                        @media (max-width: 600px) { body { padding: 74px 6px 12px !important; } .container { width: 100% !important; min-height: 0 !important; padding: 10px !important; } .transcript-preview-toolbar button { padding: 9px 10px; font-size: 12px; } }
                        @media print { html, body { background: #fff !important; padding: 0 !important; } .transcript-preview-toolbar { display: none !important; } .container { width: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 2mm !important; box-shadow: none !important; } }
                    `;
                    printWindow.document.head.appendChild(previewStyle);
                    const toolbar = printWindow.document.createElement('div');
                    toolbar.className = 'transcript-preview-toolbar no-print';
                    toolbar.innerHTML = '<button type="button" class="download">⬇ Download PDF</button><button type="button" class="print">🖨 Print</button><button type="button" class="close">Close Preview</button>';
                    printWindow.document.body.prepend(toolbar);
                    toolbar.querySelector('.download').addEventListener('click', () => {
                        if (window.downloadProvisionalTranscriptPDF) window.downloadProvisionalTranscriptPDF();
                        else alert('Please return to the Academic Reports tab and choose Preview & Download PDF again.');
                    });
                    toolbar.querySelector('.print').addEventListener('click', () => printWindow.printTranscriptWhenReady());
                    toolbar.querySelector('.close').addEventListener('click', () => printWindow.close());
                    printWindow.focus();
                    return;
                }
                // Download must save a real A4 portrait PDF; only the separate Print action opens print preview.
                setTimeout(async () => {
                    const target = printWindow.document.querySelector('.container');
                    if (!target) {
                        printWindow.close();
                        alert('Transcript preview could not be prepared. Please try again.');
                        return;
                    }
                    if (outputMode === 'print') {
                        // Use the same A4 portrait layout for browser printing as for PDF download.
                        const printStyle = printWindow.document.createElement('style');
                        printStyle.textContent = `
                            @page { size: A4 portrait; margin: 5mm; }
                            * { box-sizing: border-box !important; }
                            html, body { width: 100% !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
                            .container { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; grid-template-rows: auto auto auto auto auto minmax(28mm,auto) auto auto auto !important; grid-template-areas: "header header" "student student" "results-title results-title" "results-table results-table" "grading summary" "chart chart" "declaration declaration" "signatures signatures" "footer footer" !important; width: 100% !important; min-width: 0 !important; max-width: none !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 2mm !important; gap: 2mm !important; align-content: start !important; align-items: start !important; }
                            .transcript-top { grid-area: header !important; position: relative !important; display: block !important; width: 100% !important; }
                            .transcript-top > .header { display: block !important; width: 100% !important; padding: 0 44px 2px 0 !important; margin: 0 !important; text-align: center !important; }
                            .transcript-top > .verification-qr { position: absolute !important; top: 0 !important; right: 0 !important; width: 34px !important; }
                            .header-top { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 6px !important; }
                            .chart-container { grid-area: chart !important; position: relative !important; height: 30mm !important; min-height: 30mm !important; max-height: 30mm !important; overflow: hidden !important; padding: 2mm !important; }
                            .chart-container canvas { display: block !important; width: 100% !important; height: 24mm !important; min-height: 24mm !important; max-height: 24mm !important; }
                            .transcript-top > .verification-qr img { display: block !important; visibility: visible !important; width: 26px !important; height: 26px !important; }
                            .footer { grid-area: footer !important; align-self: end !important; margin-top: 0 !important; padding-top: 1mm !important; width: 100% !important; }
                            .no-print { display: none !important; }
                            .semester-results-title, table.semester-results-table, .student-info-wrapper, .grading-scale-table, .summary-grid, .declaration, .signatures, .footer { break-inside: avoid !important; page-break-inside: avoid !important; }
                        `;
                        printWindow.document.head.appendChild(printStyle);
                        // Wait for QR and chart render before opening Chrome's print dialog.
                        const qr = printWindow.document.getElementById('transcriptVerificationQr');
                        const qrDeadline = Date.now() + 7000;
                        while (qr && qr.dataset.ready !== 'true' && !qr.dataset.error && Date.now() < qrDeadline) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        const chartCanvas = printWindow.document.querySelector('.chart-container canvas');
                        if (chartCanvas && printWindow.Chart) {
                            const chart = printWindow.Chart.getChart(chartCanvas);
                            if (chart) {
                                chart.options.responsive = false;
                                chart.options.maintainAspectRatio = false;
                                chart.options.animation = false;
                                chart.resize(chartCanvas.clientWidth || 700, 120);
                                chart.update('none');
                            }
                        }
                        await Promise.all(Array.from(printWindow.document.images).map(img => {
                            if (img.complete) return Promise.resolve();
                            return new Promise(resolve => {
                                img.addEventListener('load', resolve, { once: true });
                                img.addEventListener('error', resolve, { once: true });
                                setTimeout(resolve, 2500);
                            });
                        }));
                        if (printWindow.document.fonts && printWindow.document.fonts.ready) await printWindow.document.fonts.ready;
                        await new Promise(resolve => setTimeout(resolve, 400));
                        printWindow.focus();
                        printWindow.print();
                        return;
                    }
                    const generateTranscriptPdf = async () => {
                    if (!printWindow || printWindow.closed) return;
                    // Wait for the QR code to finish rendering before capturing the PDF.
                    const qrImage = printWindow.document.getElementById('transcriptVerificationQr');
                    if (qrImage && qrImage.style.display !== 'none') {
                        const qrStartedAt = Date.now();
                        while (qrImage.dataset.ready !== 'true' && !qrImage.dataset.error && Date.now() - qrStartedAt < 6500) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        if (qrImage.dataset.ready === 'true' && qrImage.naturalWidth === 0) {
                            await new Promise(resolve => {
                                qrImage.addEventListener('load', resolve, { once: true });
                                qrImage.addEventListener('error', resolve, { once: true });
                                setTimeout(resolve, 2000);
                            });
                        }
                        if (qrImage.dataset.ready !== 'true') {
                            const reason = qrImage.dataset.error || 'generation timeout';
                            console.error('Transcript PDF download cancelled: verification QR is not ready.', reason);
                            alert('The transcript verification QR code could not be generated. Check your connection and try again; no PDF was created.');
                            return;
                        }
                    }
                    const downloadStyle = printWindow.document.createElement('style');
                    downloadStyle.textContent = `
                        @page { size: A4 portrait; margin: 5mm; }
                        * { box-sizing: border-box !important; }
                        html, body { width: 100% !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
                        body { font-size: 9px !important; }
                        .container { box-sizing: border-box !important; display: grid !important; grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important; grid-template-rows: auto auto auto auto auto minmax(28mm,auto) auto auto auto !important; grid-template-areas: "header header" "student student" "results-title results-title" "results-table results-table" "grading summary" "chart chart" "declaration declaration" "signatures signatures" "footer footer" !important; align-items: start !important; align-content: start !important; column-gap: 2mm !important; row-gap: 2mm !important; width: 100% !important; max-width: none !important; min-width: 0 !important; min-height: 0 !important; height: auto !important; margin: 0 !important; padding: 2mm !important; border-radius: 0 !important; box-shadow: none !important; }
                        .footer { grid-area: footer !important; align-self: end !important; margin-top: 0 !important; width: 100% !important; }
                        .footer { grid-area: footer !important; align-self: end !important; width: 100% !important; margin-top: 0 !important; padding-top: 2mm !important; border-top: 1px solid #0A3D62 !important; }
                        .transcript-top { grid-area: header !important; position: relative !important; display: block !important; min-height: 0 !important; height: auto !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                        .container > .transcript-top { align-self: start !important; width: 100% !important; }
                        .transcript-top > .header { display: block !important; box-sizing: border-box !important; width: 100% !important; max-width: none !important; min-width: 0 !important; margin: 0 !important; padding: 0 44px 2px 0 !important; border-bottom: 1px solid #0A3D62 !important; text-align: center !important; }
                        .transcript-top > .verification-qr { position: absolute !important; top: 0 !important; right: 0 !important; width: 34px !important; min-width: 34px !important; margin: 0 !important; justify-self: auto !important; align-self: auto !important; z-index: 2 !important; }
                        .transcript-top .header-top img { max-width: 32px !important; max-height: 28px !important; width: auto !important; height: auto !important; }
                        .transcript-top .header-top { display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important; width: 100% !important; gap: 6px !important; }
                        .transcript-top .header .school { font-size: 12px !important; line-height: 1.1 !important; }
                        .transcript-top .header .subtitle { font-size: 10px !important; margin: 2px 0 !important; }
                        .transcript-top .header .date { font-size: 6px !important; }
                        .verification-qr { grid-area: auto !important; width: 34px !important; padding: 2px !important; border: 1px solid #0A3D62 !important; display: flex !important; align-items: center !important; justify-content: flex-start !important; }
                        .verification-qr img { display: block !important; width: 26px !important; height: 26px !important; }
                        .verification-qr span { font-size: 5px !important; }
                        .header { margin: 0 0 3px !important; padding: 0 0 5px !important; } 
                        .header h1 { font-size: 17px !important; line-height: 1.15 !important; }
                        .header h2 { font-size: 14px !important; margin: 3px 0 5px !important; }
                        .student-info-wrapper { grid-area: student !important; margin: 0 0 3px !important; padding: 5px 8px !important; gap: 6px !important; }
                        .student-info { gap: 3px 8px !important; }
                        .student-info .label { font-size: 7px !important; }
                        .student-info .value { font-size: 9px !important; line-height: 1.15 !important; margin-top: 1px !important; }
                        .semester-results-title { grid-area: results-title !important; margin: 3px 0 0 !important; padding: 6px 10px !important; font-size: 11px !important; }
                        table.semester-results-table { grid-area: results-table !important; width: 100% !important; table-layout: fixed !important; margin: 0 0 4px !important; border-collapse: collapse !important; }
                        table.semester-results-table thead th { padding: 5px 5px !important; font-size: 8px !important; line-height: 1.1 !important; overflow-wrap: anywhere !important; }
                        table.semester-results-table tbody td { padding: 5px 5px !important; font-size: 8px !important; line-height: 1.15 !important; overflow-wrap: anywhere !important; vertical-align: middle !important; }
                        table.semester-results-table th:nth-child(1), table.semester-results-table td:nth-child(1) { width: 5% !important; text-align: center !important; }
                        table.semester-results-table th:nth-child(2), table.semester-results-table td:nth-child(2) { width: 15% !important; }
                        table.semester-results-table th:nth-child(3), table.semester-results-table td:nth-child(3) { width: 42% !important; }
                        table.semester-results-table th:nth-child(4), table.semester-results-table td:nth-child(4) { width: 9% !important; text-align: center !important; }
                        table.semester-results-table th:nth-child(5), table.semester-results-table td:nth-child(5) { width: 12% !important; text-align: center !important; }
                        table.semester-results-table th:nth-child(6), table.semester-results-table td:nth-child(6) { width: 17% !important; text-align: center !important; }
                        .chart-container { grid-area: chart !important; position: relative !important; min-width: 0 !important; min-height: 30mm !important; height: 30mm !important; max-height: 30mm !important; align-self: stretch !important; margin: 0 !important; padding: 2mm !important; display: block !important; overflow: hidden !important; }
                        .chart-container canvas { display: block !important; position: relative !important; width: 100% !important; height: 24mm !important; min-height: 24mm !important; max-height: 24mm !important; }
                        .transcript-top > .verification-qr img { display: block !important; visibility: visible !important; width: 26px !important; height: 26px !important; }
                        .summary-grid { grid-area: summary !important; display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 3px !important; margin: 0 !important; }
                        .summary-card { padding: 5px 4px !important; border-top-width: 2px !important; }
                        .summary-card .value { font-size: 18px !important; line-height: 1.05 !important; }
                        .summary-card .label { font-size: 7px !important; margin-top: 2px !important; }
                        .grading-scale-table { grid-area: grading !important; min-width: 0 !important; margin: 0 !important; padding: 5px 6px !important; }
                        .grading-scale-table .title { font-size: 8px !important; margin-bottom: 3px !important; }
                        .grading-scale-table table { font-size: 6px !important; }
                        .grading-scale-table th, .grading-scale-table td { padding: 2px 3px !important; font-size: 6px !important; line-height: 1.1 !important; }
                        .declaration { grid-area: declaration !important; min-width: 0 !important; margin: 3px 0 !important; padding: 5px 7px !important; font-size: 8px !important; line-height: 1.2 !important; }
                        .signatures { grid-area: signatures !important; min-width: 0 !important; margin: 2px 0 !important; padding-top: 4px !important; gap: 12px !important; }
                        .signature-box .line { margin: 4px auto 1px !important; }
                        .verification-qr { grid-area: verification !important; justify-self: center !important; margin: 2px auto !important; }\n                        .verification-qr img { width: 42px !important; height: 42px !important; }\n                        .verification-qr { grid-area: verification !important; display: flex !important; align-items: center !important; justify-content: center !important; min-height: 48px !important; }\n                        .verification-qr img { display: block !important; width: 42px !important; height: 42px !important; object-fit: contain !important; }\n                        .footer { grid-area: footer !important; margin: 2px 0 0 !important; padding-top: 4px !important; font-size: 7px !important; }
                        .no-print, .btn-print, .btn-close { display: none !important; }
                        .container, .header, .student-info-wrapper, .semester-results-title, .chart-container, .summary-grid, .grading-scale-table, .declaration, .signatures, .footer { break-inside: avoid !important; page-break-inside: avoid !important; }
                    `;
                    printWindow.document.head.appendChild(downloadStyle);

                    // Recalculate Chart.js after PDF sizing rules are applied, then allow a paint before capture.
                    const chartCanvas = printWindow.document.querySelector('.chart-container canvas');
                    if (chartCanvas && printWindow.Chart) {
                        const chartInstance = printWindow.Chart.getChart(chartCanvas);
                        if (chartInstance) {
                            chartInstance.options.responsive = false;
                            chartInstance.options.maintainAspectRatio = false;
                            chartInstance.options.animation = false;
                            chartInstance.resize(chartCanvas.clientWidth || 700, 120);
                            chartInstance.update('none');
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 350));

                    // Size the transcript to its actual unit count. Keep every unit row intact,
                    // use a compact but readable table, and allow additional A4 pages only when needed.
                    const transcriptTable = printWindow.document.querySelector('table.semester-results-table');
                    const transcriptRows = transcriptTable ? transcriptTable.querySelectorAll('tbody tr') : [];
                    const unitCount = transcriptRows.length;
                    const densityStyle = printWindow.document.createElement('style');
                    const rowPadding = unitCount <= 8 ? 6 : unitCount <= 14 ? 4 : unitCount <= 22 ? 3 : 2;
                    const rowFont = unitCount <= 14 ? 9 : unitCount <= 22 ? 8 : 7;
                    densityStyle.textContent = `
                        table.semester-results-table thead { display: table-header-group !important; }
                        table.semester-results-table tr { break-inside: avoid !important; page-break-inside: avoid !important; }
                        table.semester-results-table tbody td { padding: ${rowPadding}px 5px !important; font-size: ${rowFont}px !important; line-height: 1.2 !important; }
                        table.semester-results-table thead th { padding: 5px 4px !important; font-size: 8px !important; }
                        .container { break-inside: auto !important; page-break-inside: auto !important; }
                        .header, .student-info-wrapper, .semester-results-title, .summary-grid, .grading-scale-table, .chart-container, .declaration, .signatures, .footer { break-inside: avoid !important; page-break-inside: avoid !important; }
                    `;
                    printWindow.document.head.appendChild(densityStyle);

                    const fileBase = 'Provisional-Academic-Transcript-' + String(user.full_name || 'Student').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
                    const options = {
                        // Capture at portrait A4 CSS width and retain the QR image before PDF serialization.
                        margin: [5, 5, 5, 5],
                        filename: fileBase + '.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', windowWidth: 794, windowHeight: 1123, scrollX: 0, scrollY: 0, onclone: clonedDoc => {
                            // Keep the cloned document and target at the same A4 CSS width; do not force a
                            // separate canvas width, which can crop content when html2canvas measures overflow.
                            const clonedHtml = clonedDoc.documentElement;
                            const clonedBody = clonedDoc.body;
                            [clonedHtml, clonedBody].forEach(node => {
                                node.style.setProperty('width', '794px', 'important');
                                node.style.setProperty('min-width', '794px', 'important');
                                node.style.setProperty('max-width', '794px', 'important');
                                node.style.setProperty('margin', '0', 'important');
                                node.style.setProperty('padding', '0', 'important');
                                node.style.setProperty('overflow', 'visible', 'important');
                            });
                            const clonedTarget = clonedDoc.querySelector('.container');
                            if (clonedTarget) {
                                clonedTarget.style.setProperty('box-sizing', 'border-box', 'important');
                                clonedTarget.style.setProperty('width', '794px', 'important');
                                clonedTarget.style.setProperty('min-width', '794px', 'important');
                                clonedTarget.style.setProperty('max-width', '794px', 'important');
                                clonedTarget.style.setProperty('height', 'auto', 'important');
                                clonedTarget.style.setProperty('min-height', '0', 'important');
                                clonedTarget.style.setProperty('margin', '0', 'important');
                                clonedTarget.style.setProperty('align-content', 'start', 'important');
                                clonedTarget.style.setProperty('grid-template-rows', 'auto auto auto auto auto 42mm auto auto auto', 'important');
                                clonedTarget.style.setProperty('overflow', 'visible', 'important');
                                clonedTarget.style.setProperty('transform', 'none', 'important');
                            }
                            const canvas = clonedDoc.querySelector('.chart-container canvas');
                            if (canvas) {
                                canvas.style.setProperty('display', 'block', 'important');
                                canvas.style.setProperty('width', '100%', 'important');
                                canvas.style.setProperty('height', '32mm', 'important');
                                canvas.style.setProperty('max-width', '100%', 'important');
                            }
                        } },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                        pagebreak: { mode: ['css'], avoid: ['.transcript-top', '.student-info-wrapper', '.semester-results-title', '.chart-container', '.declaration', '.signatures', '.footer'] }
                    };
                    // Generate a real PDF and save it directly from the original portal tab.
                    // Use numeric margin for html2pdf compatibility and a File/Blob fallback if
                    // the browser supports the File System Access API. Never switch to print UI.
                    printWindow.html2pdf().set(options).from(target).toPdf().get('pdf').then(async pdf => {
                        const blob = pdf.output('blob');
                        const fileName = options.filename || 'Provisional-Academic-Transcript.pdf';

                        // Prefer the native save dialog where supported, which gives the user
                        // an explicit file save instead of silently depending on an anchor click.
                        if (typeof window.showSaveFilePicker === 'function') {
                            try {
                                const handle = await window.showSaveFilePicker({
                                    suggestedName: fileName,
                                    types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }]
                                });
                                const writable = await handle.createWritable();
                                await writable.write(blob);
                                await writable.close();
                                if (!printWindow.closed) printWindow.close();
                                alert('Transcript PDF saved successfully.');
                                return;
                            } catch (saveError) {
                                if (saveError && saveError.name === 'AbortError') {
                                    // User cancelled the save dialog; do not force a second download.
                                    return;
                                }
                                console.warn('Native save dialog unavailable; using direct download.', saveError);
                            }
                        }

                        const downloadUrl = window.URL.createObjectURL(blob);
                        const anchor = document.createElement('a');
                        anchor.href = downloadUrl;
                        anchor.download = fileName;
                        anchor.style.display = 'none';
                        document.body.appendChild(anchor);
                        anchor.click();
                        anchor.remove();

                        // Keep the URL alive long enough for mobile download managers to pick it up.
                        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60000);
                        const status = document.createElement('div');
                        status.textContent = 'PDF generated. Check your Downloads folder.';
                        status.setAttribute('role', 'status');
                        status.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:100000;background:#0f766e;color:#fff;padding:12px 18px;border-radius:8px;font:14px Arial;box-shadow:0 4px 16px #0003;max-width:90%;text-align:center;';
                        document.body.appendChild(status);
                        setTimeout(() => status.remove(), 8000);
                        if (!printWindow.closed) printWindow.close();
                    }).catch(error => {
                        console.error('PDF download failed:', error);
                        if (!printWindow.closed) {
                            printWindow.document.body.innerHTML = '<div style="font:16px Arial;padding:24px"><h2>PDF generation failed</h2><p>' +
                                String(error.message || 'Please try again.').replace(/[&<>"]/g, '') +
                                '</p></div>';
                            printWindow.focus();
                        }
                        alert('PDF download failed: ' + (error.message || 'Please try again.'));
                    });
                    };
                    // Define the generator before any asynchronous library wait can call it.
                    if (typeof printWindow.html2pdf !== 'function') {
                        let attempts = 0;
                        const waitForPdfLibrary = () => {
                            if (printWindow.closed) return;
                            if (typeof printWindow.html2pdf === 'function') {
                                generateTranscriptPdf();
                                return;
                            }
                            attempts += 1;
                            if (attempts < 30) setTimeout(waitForPdfLibrary, 300);
                            else {
                                printWindow.close();
                                alert('PDF generator could not load after waiting. Check your connection and try again.');
                            }
                        };
                        waitForPdfLibrary();
                    } else {
                        generateTranscriptPdf();
                    }
                }, 1400);
            } else {
                alert('The transcript window was closed before the PDF was ready. Please try again.');
            }
            
        } catch (error) {
            loadingEl.remove();
            if (printWindow && !printWindow.closed) printWindow.close();
            alert('Error generating report: ' + error.message);
            console.error('Report error:', error);
        }
    }

    // ============================================================
    // 21. TAB SWITCHING
    // ============================================================
    function setupTabs() {
        const tabs = document.querySelectorAll('.report-tab');
        const contents = {
            'semester': document.getElementById('semester-report'),
            'yearly': document.getElementById('yearly-report'),
            'transcript': document.getElementById('transcript-report'),
            'progress': document.getElementById('progress-report'),
            'mymarks': document.getElementById('mymarks-report')
        };
        
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const reportType = this.dataset.report;
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                Object.keys(contents).forEach(key => {
                    if (contents[key]) {
                        contents[key].style.display = key === reportType ? 'block' : 'none';
                    }
                });
                
                if (reportType === 'semester') {
                    setTimeout(loadSemesterReport, 100);
                } else if (reportType === 'yearly') {
                    setTimeout(loadYearlyReport, 100);
                } else if (reportType === 'transcript') {
                    setTimeout(loadTranscript, 100);
                } else if (reportType === 'progress') {
                    setTimeout(loadCourseProgress, 100);
                } else if (reportType === 'mymarks') {
                    setTimeout(loadMyMarks, 100);
                }
            });
        });
    }

    // ============================================================
    // 22. INITIALIZE
    // ============================================================
    function init() {
        console.log('🔧 Initializing Academic Reports with Hollow Star Indicator...');
        setupTabs();
        
        const subjectFilter = document.getElementById('my_marks_subject_filter');
        const blockFilter = document.getElementById('my_marks_block_filter');
        const yearFilter = document.getElementById('my_marks_year_filter');
        const searchInput = document.getElementById('my_marks_search');
        
        if (subjectFilter) subjectFilter.addEventListener('change', filterMyMarks);
        if (blockFilter) blockFilter.addEventListener('change', filterMyMarks);
        if (yearFilter) yearFilter.addEventListener('change', filterMyMarks);
        if (searchInput) searchInput.addEventListener('input', filterMyMarks);
        
        const refreshBtn = document.getElementById('refresh-report');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                const activeTab = document.querySelector('.report-tab.active');
                if (activeTab) {
                    const reportType = activeTab.dataset.report;
                    if (reportType === 'semester') loadSemesterReport();
                    else if (reportType === 'yearly') loadYearlyReport();
                    else if (reportType === 'transcript') loadTranscript();
                    else if (reportType === 'progress') loadCourseProgress();
                    else if (reportType === 'mymarks') loadMyMarks();
                }
            });
        }
        
        const downloadBtn = document.getElementById('download-transcript-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadTranscriptPDF);
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                window.print();
            });
        }
        
        const downloadReportCardBtn = document.getElementById('download-report-card');
        if (downloadReportCardBtn) {
            downloadReportCardBtn.addEventListener('click', function () { downloadReportCard('download'); });
        }

        const printTranscriptBtn = document.getElementById('print-academic-transcript');
        if (printTranscriptBtn) {
            printTranscriptBtn.addEventListener('click', function () { downloadReportCard('print'); });
        }
        
        setTimeout(function() {
            const activeTab = document.querySelector('.report-tab.active');
            if (activeTab) {
                const reportType = activeTab.dataset.report;
                if (reportType === 'semester') loadSemesterReport();
                else if (reportType === 'yearly') loadYearlyReport();
                else if (reportType === 'transcript') loadTranscript();
                else if (reportType === 'progress') loadCourseProgress();
                else if (reportType === 'mymarks') loadMyMarks();
            } else {
                const myMarksTab = document.querySelector('.report-tab[data-report="mymarks"]');
                if (myMarksTab) {
                    myMarksTab.classList.add('active');
                    const contents = {
                        'semester': document.getElementById('semester-report'),
                        'yearly': document.getElementById('yearly-report'),
                        'transcript': document.getElementById('transcript-report'),
                        'progress': document.getElementById('progress-report'),
                        'mymarks': document.getElementById('mymarks-report')
                    };
                    Object.keys(contents).forEach(key => {
                        if (contents[key]) {
                            contents[key].style.display = key === 'mymarks' ? 'block' : 'none';
                        }
                    });
                    loadMyMarks();
                } else {
                    loadSemesterReport();
                }
            }
        }, 300);
        
        console.log('✅ Academic Reports with Hollow Star Indicator ready!');
        console.log('☆ Hollow Star: Subtle indicator for retaken units (My Performance only)');
        console.log('📊 NO DEMO DATA - Only real data from database');
        console.log('📊 Academic Year Mapping: KRCHN (3 yrs) | TVET Cert (1 yr) | TVET Diploma (2 yrs)');
        console.log('📊 "Proceed to next block" message on transcript');
    }

    // ============================================================
    // 23. EXPOSE FUNCTIONS
    // ============================================================
    window.loadMyMarks = loadMyMarks;
    window.filterMyMarks = filterMyMarks;
    window.loadSemesterReport = loadSemesterReport;
    window.loadYearlyReport = loadYearlyReport;
    window.loadTranscript = loadTranscript;
    window.loadCourseProgress = loadCourseProgress;
    window.downloadTranscriptPDF = downloadTranscriptPDF;
    window.downloadProvisionalTranscriptPDF = function () { downloadReportCard('download'); };
    window.downloadReportCard = downloadReportCard;
    window.getUnitCode = getUnitCode;
    window.getGradingStatus = getGradingStatus;
    window.calculateGrade = calculateGrade;
    window.calculatePoints = calculatePoints;
    window.calculateGPA = calculateGPA;
    window.PROGRAM = PROGRAM;
    window.renderMyMarksCharts = renderMyMarksCharts;
    window.fetchStudentRetakeData = fetchStudentRetakeData;
    window.hasRetake = hasRetake;
    window.getRetakeCount = getRetakeCount;
    window.getHollowStarHtml = getHollowStarHtml;

    window.academicReportsModule = {
        loadReports: async function() {
            await loadMyMarks();
            return true;
        },
        loadMyMarks,
        loadSemesterReport,
        loadYearlyReport,
        loadTranscript,
        loadCourseProgress,
        calculateGPA
    };

    // ============================================================
    // 24. AUTO-INIT
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Student Academic Reports Module loaded');
    console.log('📊 Available functions:');
    console.log('   - loadMyMarks() - Load published marks with hollow star indicator');
    console.log('   - filterMyMarks() - Filter marks');
    console.log('   - downloadReportCard() - Download semester report');
    console.log('   - downloadTranscriptPDF() - Download full transcript');
    console.log('   - renderMyMarksCharts() - Render Line Charts');
    console.log('☆ Hollow Star: Subtle indicator for retaken units (My Performance only)');
    console.log('📊 TVET Min Pass: 50% | Nursing Min Pass: 60%');
    console.log('📊 NO DEMO DATA - Only real data from database');
    console.log('📊 Academic Year Mapping: KRCHN (3 yrs) | TVET Cert (1 yr) | TVET Diploma (2 yrs)');
})();