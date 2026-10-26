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
    // 20. DOWNLOAD PROVISIONAL ACADEMIC TRANSCRIPT - PORTRAIT ONLY
    // ============================================================
    function downloadReportCard(outputMode = 'download') {
        console.log('📊 Downloading Provisional Academic Transcript (PORTRAIT)...');

        const user = window.currentUserProfile || window.db?.currentUserProfile || {};
        const userProgram = user.program || '';
        const isTVET = PROGRAM.isTVET(userProgram);
        const programType = PROGRAM.getProgramType(userProgram);

        const selectedBlockFilter = document.getElementById('my_marks_block_filter')?.value || 'all';
        const blockLabelForTranscript = value => String(value || '').trim()
            .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
            .replace(/\b(block|term)\s*(\d+)\b/ig, (_, kind, number) => kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase() + ' ' + number)
            .replace(/\bintroductory\b/ig, 'Introductory')
            .replace(/\b[a-z]/g, letter => letter.toUpperCase());
        const subjectFilter = document.getElementById('my_marks_subject_filter')?.value || 'all';
        const yearFilter = document.getElementById('my_marks_year_filter')?.value || 'all';
        const searchTerm = document.getElementById('my_marks_search')?.value?.trim().toLowerCase() || '';
        const normalizeBlock = value => String(value || '').trim().toLowerCase()
            .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
            .replace(/^(block|term)\s*(\d+)$/, '$1 $2');

        // Initialize the selected block before applying any result filters.
        let blockFilter = selectedBlockFilter;
        let marks = Array.isArray(myMarksFiltered) ? [...myMarksFiltered] : [];
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

        const blockOrder = value => {
            const label = normalizeBlock(value);
            if (/introductory/.test(label)) return 0;
            const match = label.match(/(?:block|term)\s*(\d+)/i);
            if (match) return Number(match[1]);
            if (/final/.test(label)) return 99;
            return -1;
        };
        if (!blockFilter || blockFilter.toLowerCase() === 'all') {
            const availableBlocks = [...new Set(marks.map(m => m.block || m.block_term || m.term).filter(Boolean))];
            if (availableBlocks.length) {
                availableBlocks.sort((a, b) => blockOrder(a) - blockOrder(b));
                blockFilter = availableBlocks[availableBlocks.length - 1];
                marks = marks.filter(m => normalizeBlock(m.block || m.block_term || m.term) === normalizeBlock(blockFilter));
            }
        }
        const transcriptResultsHeading = blockFilter && blockFilter.toLowerCase() !== 'all'
            ? 'End of ' + blockLabelForTranscript(blockFilter) + ' Results'
            : 'Academic Results';

        if (marks.length === 0) {
            alert(blockFilter !== 'all'
                ? 'No published marks were found for ' + blockFilter + '. Please check the selected block and try again.'
                : 'No marks match the current filters. Please adjust the filters and try again.');
            return;
        }

        // In-page overlay + iframe keeps the user on the portal.
        const previewHost = document.createElement('div');
        previewHost.className = 'transcript-preview-overlay';
        previewHost.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.72);display:flex;flex-direction:column;padding:12px;box-sizing:border-box;';
        const previewFrame = document.createElement('iframe');
        previewFrame.title = 'Provisional Academic Transcript Preview';
        previewFrame.style.cssText = 'display:block;flex:1;width:100%;height:100%;min-height:0;border:0;border-radius:10px;background:#fff;box-shadow:0 12px 40px #0004;';
        previewHost.appendChild(previewFrame);
        document.body.appendChild(previewHost);
        const frameWindow = previewFrame.contentWindow;

        const printWindow = new Proxy({}, {
            get(_target, key) {
                if (key === 'closed') return !previewHost.isConnected;
                if (key === 'close') return () => previewHost.remove();
                if (key === 'focus') return () => previewFrame.focus();
                if (key === 'print') return () => frameWindow.print();
                if (key === 'document') return frameWindow.document;
                return frameWindow[key];
            },
            set(_target, key, value) {
                frameWindow[key] = value;
                return true;
            }
        });

        // Pass session context for QR generation.
        try {
            const qrParentConfig = window.APP_CONFIG || {};
            const qrParentClient = window.supabaseClient;
            if (qrParentClient && qrParentClient.auth && qrParentConfig.SUPABASE_URL && qrParentConfig.SUPABASE_ANON_KEY) {
                qrParentClient.auth.getSession().then(({ data, error }) => {
                    if (printWindow && !printWindow.closed && !error && data && data.session && data.session.access_token) {
                        printWindow.__TRANSCRIPT_QR_CONTEXT = {
                            supabaseUrl: qrParentConfig.SUPABASE_URL,
                            anonKey: qrParentConfig.SUPABASE_ANON_KEY,
                            accessToken: data.session.access_token
                        };
                    }
                }).catch(err => console.error('[Transcript QR] Session bridge failed', err));
            }
        } catch (qrContextError) {
            console.error('[Transcript QR] Could not initialize session bridge', qrContextError);
        }

        printWindow.document.open();
        printWindow.document.write('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preparing transcript…</title></head><body style="font:16px Arial;padding:24px">Preparing your transcript PDF…</body></html>');
        printWindow.document.close();

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
                timeZone: 'Africa/Nairobi', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });

            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const academicYear = user.academic_year || `${currentYear}/${nextYear}`;

            let weightedPoints = 0, totalCredits = 0, totalUnits = 0, passed = 0, failed = 0, pending = 0;

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
                const threshold = isTVET ? 50 : 60;
                const score = m.final_score || 0;
                if (score >= threshold) passed++;
                else if (score > 0) failed++;
                else pending++;
            });

            const gpa = totalCredits > 0 ? (weightedPoints / totalCredits) : 0;
            let grade;
            if (isTVET) {
                if (gpa >= 3.75) grade = 'A'; else if (gpa >= 3.0) grade = 'B';
                else if (gpa >= 2.0) grade = 'C'; else grade = 'FAIL';
            } else {
                if (gpa >= 3.75) grade = 'A'; else if (gpa >= 3.0) grade = 'B';
                else if (gpa >= 2.0) grade = 'C'; else grade = 'D';
            }
            const passRate = totalUnits > 0 ? Math.round((passed / totalUnits) * 100) : 0;

            let tableRows = '';
            marks.forEach((mark, index) => {
                const unitCode = mark.unit_code || getUnitCode(mark.subject_name) || 'N/A';
                const score = getPublishedScore(mark);
                const gradeDisplay = mark.grade || mark.published_grade || mark.final_grade || (score !== null ? calculateGrade(score, userProgram) : '-');
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
                const hasRetakeFlag = hasRetake(mark.subject_name);
                const isRetakenUnit = hasRetakeFlag || mark.hasRetake === true;
                const retakeCount = hasRetakeFlag ? getRetakeCount(mark.subject_name) : (Number(mark.retakeCount) || 0);
                const starIndicator = isRetakenUnit ? `<span style="display: inline-block; margin-left: 4px; font-size: 11px; color: #64748b; opacity: 0.9; cursor: help;" title="Retaken (${retakeCount} attempt${retakeCount > 1 ? 's' : ''})">☆</span>` : '';

                tableRows += `
                    <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : ''} ${isRetakenUnit ? 'border-left: 3px solid #94a3b8;' : ''}">
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; text-align: center; font-size: 9px; color: #94a3b8;">${index + 1}</td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-weight: 600; color: #0A3D62; font-size: 9px;">${escapeHtml(unitCode)}</td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-size: 9px; color: #1e293b;">${escapeHtml(mark.subject_name || 'N/A')}${starIndicator}</td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; text-align: center;"><span style="background: ${gradeColor}; color: white; padding: 2px 12px; border-radius: 10px; font-weight: 700; font-size: 10px; display: inline-block; min-width: 28px;">${escapeHtml(gradeDisplay)}</span></td>
                        <td style="padding: 6px 10px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; font-size: 10px; color: ${gradeColor};">${points === null ? '—' : points.toFixed(1)}</td>
                        <td style="padding: 6px 8px; border: 1px solid #d1d5db; text-align: center;"><span style="display:inline-block;background:${statusColor};color:#fff;padding:4px 7px;border-radius:10px;font-weight:700;font-size:10px;white-space:normal;">${escapeHtml(statusDisplay)}</span></td>
                    </tr>`;
            });

            const sortedMarks = [...marks].sort((a, b) => {
                const blockOrder = {'Introductory':0,'Block 1':1,'Block 2':2,'Block 3':3,'Block 4':4,'Block 5':5,'Final':6,'Term 1':1,'Term 2':2,'Term 3':3,'Term 4':4,'Term 5':5,'Term 6':6};
                return (blockOrder[a.block] || 0) - (blockOrder[b.block] || 0);
            });
            const graphLabels = sortedMarks.map(m => m.unit_code || getUnitCode(m.subject_name) || 'N/A');
            const graphData = sortedMarks.map(m => {
                const g = m.grade || m.published_grade || m.final_grade || '';
                const p = Number(m.points);
                return Number.isFinite(p) ? p : (g ? calculatePoints(g, userProgram) : null);
            });
            const validGraphPoints = graphData.filter(p => Number.isFinite(p));
            const avgPoints = validGraphPoints.length ? validGraphPoints.reduce((a, b) => a + b, 0) / validGraphPoints.length : 0;

            let gradingScaleHTML = '';
            if (isTVET) {
                gradingScaleHTML = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #d1d5db;">
                        <thead><tr style="background: #0A3D62; color: white;">
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Marks Range</th>
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Grade</th>
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Points</th>
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Status</th>
                        </tr></thead>
                        <tbody>
                            <tr style="background: #d1fae5;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">75 - 100%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #065f46;">A</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">4.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #065f46;">EXCELLENT</td></tr>
                            <tr style="background: #dbeafe;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">65 - 74%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #1e40af;">B</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">3.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #1e40af;">GOOD</td></tr>
                            <tr style="background: #fef3c7;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">50 - 64%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #92400e;">C</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">2.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #92400e;">SATISFACTORY</td></tr>
                            <tr style="background: #fee2e2;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">Below 50%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #991b1b;">FAIL</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">0.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #991b1b;">FAIL</td></tr>
                            <tr style="background: #f3f4f6;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-style: italic;">No Score</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #94a3b8;">PENDING</td></tr>
                        </tbody>
                        <tfoot><tr><td colspan="4" style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #0A3D62; font-size: 7px;">Min Pass: 50%</td></tr></tfoot>
                    </table>`;
            } else {
                gradingScaleHTML = `
                    <table style="width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #d1d5db;">
                        <thead><tr style="background: #0A3D62; color: white;">
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Marks Range</th>
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Grade</th>
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Points</th>
                            <th style="padding: 4px 8px; border: 1px solid #0A3D62; text-align: center;">Status</th>
                        </tr></thead>
                        <tbody>
                            <tr style="background: #d1fae5;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">75 - 100%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #065f46;">A</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">4.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #065f46;">DISTINCTION</td></tr>
                            <tr style="background: #dbeafe;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">65 - 74%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #1e40af;">B</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">3.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #1e40af;">CREDIT</td></tr>
                            <tr style="background: #fef3c7;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">60 - 64%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #92400e;">C</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">2.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #92400e;">PASS</td></tr>
                            <tr style="background: #fee2e2;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">Below 60%</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 700; color: #991b1b;">D</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">0.0</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #991b1b;">FAIL</td></tr>
                            <tr style="background: #f3f4f6;"><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-style: italic;">No Score</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center;">-</td><td style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #94a3b8;">PENDING</td></tr>
                        </tbody>
                        <tfoot><tr><td colspan="4" style="padding: 4px 8px; border: 1px solid #d1d5db; text-align: center; font-weight: 600; color: #0A3D62; font-size: 7px;">Min Pass: 60%</td></tr></tfoot>
                    </table>`;
            }

            let profilePictureHTML = '';
            if (profilePicture) {
                profilePictureHTML = `
                    <div style="text-align: center; margin-right: 12px; flex-shrink: 0;">
                        <img src="${profilePicture}" alt="Student Photo" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #0A3D62; padding: 2px; background: white;" onerror="this.style.display='none'">
                    </div>`;
            }

            loadingEl.remove();

            if (!printWindow || printWindow.closed) {
                alert('The transcript window was closed before the PDF was ready. Please try again.');
                return;
            }

            printWindow.document.open();
            printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <title>Provisional Academic Transcript - ${escapeHtml(user.full_name || 'Student')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
    <!-- Standalone PDF fallback dependencies, independent of html2pdf bundle loading. -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"><\/script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 portrait; margin: 6mm; }
        body { font-family: 'Times New Roman', 'Georgia', serif; background: #ffffff; font-size: 10px; margin: 0; padding: 10px; color: #1e293b; }
        .container { box-sizing: border-box; max-width: none; width: 100%; margin: 0 auto; padding: 7px 8px; background: #ffffff; border: 2px solid #0A3D62; border-radius: 6px; box-shadow: none; }
        .transcript-top { position: relative; display: block; width: 100%; }
        .transcript-top > .header { width: 100%; box-sizing: border-box; padding-right: 44px; }
        .transcript-top > .verification-qr { position: absolute; top: 0; right: 0; z-index: 2; }
        .transcript-top .header { min-width: 0; }
        .verification-qr { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 2px; width: 66px; padding: 3px; border: 1px solid #0A3D62; border-radius: 3px; background: #fff; font-size: 6px; font-weight: 700; color: #0A3D62; }
        .verification-qr img { display: block; width: 58px; height: 58px; object-fit: contain; image-rendering: pixelated; }
        .transcript-generation-number { display: block; width: 100%; margin-top: 2px; padding-top: 3px; border-top: 1px solid #d8e2ec; color: #0A3D62; font-family: Arial, sans-serif; font-size: 5.5px; line-height: 1.25; font-weight: 800; text-align: center; overflow-wrap: anywhere; word-break: break-word; }
        .transcript-generation-number .number-label { display: block; margin-bottom: 2px; color: #64748b; font-size: 4.5px; letter-spacing: .35px; }
        .header { text-align: center; border-bottom: 3px double #0A3D62; padding-bottom: 5px; margin-bottom: 6px; }
        .header-top { display: flex; align-items: center; justify-content: flex-start; gap: 8px; }
        .header-top img { max-height: 64px; max-width: 76px; width: auto; object-fit: contain; }
        .header .school { font-size: 19px; line-height: 1.25; font-weight: 800; color: #0A3D62; font-family: 'Georgia', serif; }
        .header .motto { font-size: 8px; color: #64748b; font-style: italic; }
        .header .subtitle { display: inline-block; font-size: 17px; color: #ffffff; background: #0A3D62; font-weight: 800; margin-top: 10px; padding: 7px 28px; border-radius: 4px; letter-spacing: 2px; font-family: 'Georgia', serif; }
        .header .date { font-size: 8px; color: #94a3b8; margin-top: 2px; }
        .student-info-wrapper { display: flex; align-items: center; gap: 10px; margin: 5px 0 7px; padding: 7px 9px; background: #f1f6fb; border-radius: 8px; border: 1px solid #cbdbea; border-left: 5px solid #0A3D62; }
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
        .semester-results-title { margin: 5px 0 0; padding: 6px 10px; background: #0A3D62; color: #ffffff; border-radius: 7px 7px 0 0; font-size: 11px; line-height: 1.15; font-weight: 800; letter-spacing: 0.35px; text-transform: uppercase; }
        table.semester-results-table { margin: 0 0 5px; font-size: 9px; table-layout: fixed; }
        table.semester-results-table thead th { padding: 5px 4px; font-size: 8px; line-height: 1.1; }
        table.semester-results-table tbody td { padding: 4px 4px; font-size: 9px; line-height: 1.15; }
        thead th { background: #0A3D62; color: white; padding: 10px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.7px; font-weight: 800; border: 1px solid #0A3D62; }
        tbody td { padding: 9px 12px; border: 1px solid #d1d5db; font-size: 10px; line-height: 1.35; }
        .chart-container { margin: 10px 0 12px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; }
        .chart-container .title { font-weight: 700; font-size: 8px; color: #0A3D62; text-align: center; margin-bottom: 4px; }
        .chart-container canvas { width: 100% !important; height: 145px !important; max-height: 145px; }
        .transcript-lower-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; gap: 10px; margin: 8px 0; }
        .transcript-lower-grid > * { min-width: 0; }
        .academic-summary-panel { margin: 0; padding: 10px 12px; background: #f8fafc; border: 1px solid #cbdbea; border-radius: 8px; }
        .academic-summary-title { margin: 0 0 6px; color: #0A3D62; text-align: center; font-size: 11px; font-weight: 800; }
        .transcript-lower-grid .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin: 0; }
        .transcript-lower-grid .summary-card { padding: 7px 4px; border-radius: 5px; border-top-width: 2px; }
        .transcript-lower-grid .summary-card .value { font-size: 17px; line-height: 1.1; }
        .transcript-lower-grid .summary-card .label { font-size: 7px; letter-spacing: .2px; }
        .grading-scale-table { margin: 0; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; }
        .grading-scale-table .title { font-weight: 800; font-size: 11px; color: #0A3D62; text-align: center; margin-bottom: 8px; }
        .grading-scale-table table { width: 100%; border-collapse: collapse; font-size: 7px; margin: 0 auto; border: 1px solid #d1d5db; }
        .grading-scale-table th { background: #0A3D62; color: white; padding: 4px 8px; text-align: center; font-size: 6px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #0A3D62; }
        .grading-scale-table td { padding: 4px 8px; text-align: center; border: 1px solid #d1d5db; font-size: 7px; }
        .declaration { margin: 4px 0 5px; padding: 5px 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbdbea; font-size: 8px; line-height: 1.25; }
        .declaration .title { font-weight: 700; color: #0A3D62; font-size: 8px; }
        .declaration .checkbox { display: inline-block; width: 9px; height: 9px; border: 2px solid #0A3D62; border-radius: 2px; margin-right: 4px; vertical-align: middle; background: #0A3D62; position: relative; }
        .declaration .checkbox::after { content: "✓"; color: white; font-size: 6px; position: absolute; top: -2px; left: 0px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 8px 0 6px 0; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .signature-box { text-align: center; }
        .signature-box .line { border-bottom: 2px solid #1e293b; width: 130px; margin: 8px auto 2px auto; }
        .signature-box .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .signature-box .name { font-weight: 600; font-size: 10px; color: #0A3D62; }
        .footer { text-align: center; margin-top: 4px; padding-top: 4px; border-top: 1px solid #0A3D62; font-size: 8px; line-height: 1.2; color: #52677a; }
        .footer strong { color: #0A3D62; }
        .no-print { text-align: center; margin-top: 8px; }
        .no-print button { padding: 5px 18px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 10px; }
        .no-print .btn-print { background: #0A3D62; color: white; }
        .no-print .btn-close { background: #e2e8f0; color: #475569; margin-left: 6px; }
        @media screen and (max-width: 600px) {
            body { font-size: 14px; padding: 8px; }
            .container { width: 100%; max-width: 100%; padding: 12px 10px; }
            .student-info { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
            .summary-card .value { font-size: 22px; }
            table.semester-results-table { table-layout: fixed; font-size: 13px; }
            table.semester-results-table thead th { font-size: 13px !important; padding: 11px 6px !important; }
            table.semester-results-table tbody td { font-size: 13px !important; line-height: 1.5 !important; padding: 12px 6px !important; }
            .chart-container canvas { height: 160px !important; max-height: 160px; }
        }
        /* Print the same transcript layout shown in preview; only remove controls and outer preview chrome. */
        @media print {
            @page { size: A4 portrait; margin: 5mm; }
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; height: auto !important; }
            .transcript-preview-toolbar, .no-print, .btn-print, .btn-close { display: none !important; }
            .container { width: 100% !important; max-width: none !important; min-height: 0 !important; height: auto !important; margin: 0 !important; box-shadow: none !important; }
        }
    </style>
</head>
<body>
    <div class="container">
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
                <span class="transcript-generation-number" id="transcriptGenerationNumber" aria-label="Transcript generation number" style="display:none"><span class="number-label">TRANSCRIPT NO.</span><span id="transcriptGenerationNumberValue"></span></span>
            </div>
        </div>

        <div class="student-info-wrapper">
            ${profilePictureHTML}
            <div class="student-info">
                <div class="field"><span class="label">Student Name</span><span class="value">${escapeHtml(user.full_name || 'Student')}</span></div>
                <div class="field"><span class="label">Admission Number</span><span class="value">${escapeHtml(user.student_id || user.admission_number || 'N/A')}</span></div>
                <div class="field"><span class="label">Program</span><span class="value">${escapeHtml(userProgram || 'KRCHN')}</span></div>
                <div class="field"><span class="label">Academic Year</span><span class="value">${escapeHtml(academicYear)}</span></div>
            </div>
        </div>

        <div class="semester-results-title">${escapeHtml(transcriptResultsHeading)}</div>
        <table class="semester-results-table">
            <thead>
                <tr>
                    <th style="text-align: center; width: 25px; border: 1px solid #0A3D62;">#</th>
                    <th style="min-width: 65px; border: 1px solid #0A3D62;">Unit Code</th>
                    <th style="min-width: 150px; border: 1px solid #0A3D62;">Unit Name</th>
                    <th style="text-align: center; width: 50px; border: 1px solid #0A3D62;">Grade</th>
                    <th style="text-align: center; width: 70px; border: 1px solid #0A3D62;">Grade Points</th>
                    <th style="text-align: center; min-width: 95px; border: 1px solid #0A3D62;">Status</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>

        <div class="transcript-lower-grid">
            <div class="grading-scale-table">
                <div class="title">Grading Scale (${programType})</div>
                ${gradingScaleHTML}
            </div>
            <div class="academic-summary-panel">
                <div class="academic-summary-title">Academic Summary</div>
                <div class="summary-grid">
                    <div class="summary-card"><div class="value" style="color: #0A3D62;">${gpa.toFixed(2)}</div><div class="label">GPA</div></div>
                    <div class="summary-card"><div class="value" style="color: ${grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'};">${grade}</div><div class="label">Overall Grade</div></div>
                    <div class="summary-card"><div class="value" style="color: #0A3D62;">${totalUnits}</div><div class="label">Units Reported</div></div>
                    <div class="summary-card"><div class="value" style="color: #0A3D62;">${passRate}%</div><div class="label">Pass Rate</div></div>
                </div>
            </div>
        </div>

        <div class="declaration">
            <span class="title">Student Declaration:</span>
            <span class="checkbox"></span>
            <span>I confirm that the grades presented are accurate and reflect my academic performance.</span>
            <div style="font-size: 6px; color: #94a3b8; margin-top: 2px;">I understand that falsification will result in disciplinary action.</div>
        </div>

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

        <div class="footer">
            <p>This is an official document. For verification, contact the Academic Office.</p>
            <p><strong>NCHSM</strong> · P.O. Box 12906 - 20100, Nakuru · Tel: 0790969743 / 0703 345 771 · Email: <a href="mailto:info@nakurucollegeofhealth.ac.ke">info@nakurucollegeofhealth.ac.ke</a></p>
        </div>

        <div class="no-print">
            <button class="btn-print" onclick="window.printTranscriptWhenReady()">🖨️ Print Provisional Academic Transcript</button>
            <button class="btn-close" onclick="window.close()">Close</button>
        </div>
    </div>
    <script>
        (async function initializeTranscriptQr() {
            const qrImage = document.getElementById('transcriptVerificationQr');
            if (!qrImage) return;
            const hideQrBox = (reason) => {
                const box = qrImage.closest('.verification-qr');
                if (box) box.style.display = 'none';
                qrImage.dataset.error = String(reason || 'QR unavailable');
                qrImage.alt = 'QR unavailable';
                console.warn('[Transcript QR] Not available:', reason);
            };
            const qrStartedAt = Date.now();
            const portalWindow = window.opener || null;
            const portalOrigin = ${JSON.stringify(window.location.origin)};
            const contextDeadline = Date.now() + 10000;
            let injectedContext = window.__TRANSCRIPT_QR_CONTEXT || null;
            while (!injectedContext && Date.now() < contextDeadline) {
                injectedContext = window.__TRANSCRIPT_QR_CONTEXT || null;
                if (!injectedContext) await new Promise(resolve => setTimeout(resolve, 100));
            }
            const portalConfig = (injectedContext && injectedContext.supabaseUrl && injectedContext.anonKey)
                ? { SUPABASE_URL: injectedContext.supabaseUrl, SUPABASE_ANON_KEY: injectedContext.anonKey }
                : ((portalWindow && portalWindow.APP_CONFIG) || window.APP_CONFIG || {});
            const portalClient = (portalWindow && portalWindow.supabaseClient) || window.supabaseClient || null;
            if ((!injectedContext || !injectedContext.accessToken) && (!portalClient || !portalClient.auth)) {
                hideQrBox('No authenticated session was passed to the transcript window.');
                return;
            }
            if (!portalConfig.SUPABASE_URL || !portalConfig.SUPABASE_ANON_KEY) {
                hideQrBox('Supabase configuration unavailable');
                return;
            }
            let registryToken = '';
            try {
                let accessToken = injectedContext && injectedContext.accessToken;
                if (!accessToken && portalClient && portalClient.auth) {
                    const { data: sessionData } = await portalClient.auth.getSession();
                    accessToken = sessionData && sessionData.session && sessionData.session.access_token;
                }
                if (!accessToken) throw new Error('No active sign-in session.');
                const registryResponse = await fetch(portalConfig.SUPABASE_URL.replace(/\\/$/, '') + '/functions/v1/transcript-registry', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': portalConfig.SUPABASE_ANON_KEY,
                        'Authorization': 'Bearer ' + accessToken
                    },
                    body: JSON.stringify({ action: 'issue' })
                });
                const registryResult = await registryResponse.json().catch(() => ({}));
                if (!registryResponse.ok || !registryResult.token) {
                    throw new Error('Registry request failed (' + registryResponse.status + ')');
                }
                registryToken = registryResult.token;
                const transcriptNumberBox = document.getElementById('transcriptGenerationNumber');
                const transcriptNumberValue = document.getElementById('transcriptGenerationNumberValue');
                if (transcriptNumberBox && transcriptNumberValue && registryResult.transcript_number) {
                    transcriptNumberValue.textContent = registryResult.transcript_number;
                    transcriptNumberBox.style.display = 'block';
                }
            } catch (registryError) {
                hideQrBox(registryError && registryError.message || registryError);
                return;
            }
            const verificationUrl = new URL('/transcripts', portalOrigin);
            verificationUrl.searchParams.set('token', registryToken);
            verificationUrl.searchParams.set('type', 'provisional-transcript');
            const payload = verificationUrl.href;
            qrImage.style.display = 'block';
            qrImage.style.visibility = 'visible';
            qrImage.width = 512;
            qrImage.height = 512;
            qrImage.dataset.ready = '';
            qrImage.dataset.error = '';
            try {
                const candidates = [];
                if (window.QRCode) {
                    try {
                        // qrcodejs exposes a constructor (not QRCode.toDataURL). Generate locally
                        // first so the printed QR does not depend on a third-party image service.
                        let localQrUrl = '';
                        if (typeof window.QRCode.toDataURL === 'function') {
                            localQrUrl = await window.QRCode.toDataURL(payload, {
                                width: 512, margin: 4, errorCorrectionLevel: 'H'
                            });
                        } else if (typeof window.QRCode === 'function') {
                            const qrHost = document.createElement('div');
                            qrHost.style.cssText = 'position:fixed;left:-10000px;top:0;width:512px;height:512px;';
                            document.body.appendChild(qrHost);
                            try {
                                new window.QRCode(qrHost, {
                                    text: payload, width: 512, height: 512,
                                    colorDark: '#000000', colorLight: '#ffffff',
                                    correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2
                                });
                                const qrCanvas = qrHost.querySelector('canvas');
                                const qrGeneratedImage = qrHost.querySelector('img');
                                if (qrCanvas && qrCanvas.width > 0) {
                                    localQrUrl = qrCanvas.toDataURL('image/png');
                                } else if (qrGeneratedImage) {
                                    if (!qrGeneratedImage.complete || !qrGeneratedImage.naturalWidth) {
                                        await new Promise((resolve, reject) => {
                                            qrGeneratedImage.onload = resolve;
                                            qrGeneratedImage.onerror = reject;
                                            setTimeout(() => reject(new Error('Local QR image timed out')), 5000);
                                        });
                                    }
                                    if (qrGeneratedImage.naturalWidth) localQrUrl = qrGeneratedImage.src;
                                }
                            } finally {
                                qrHost.remove();
                            }
                        }
                        if (localQrUrl) candidates.push({ source: 'local QR library', url: localQrUrl });
                    } catch (libraryError) {
                        console.warn('[Transcript QR] Local library failed', libraryError);
                    }
                }
                candidates.push({
                    source: 'QR image service',
                    url: 'https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=4&ecc=H&format=png&data=' + encodeURIComponent(payload)
                });
                let loadedSource = '';
                let lastImageError = null;
                for (const candidate of candidates) {
                    try {
                        await new Promise((resolve, reject) => {
                            let settled = false;
                            const finish = (fn, value) => {
                                if (settled) return;
                                settled = true;
                                clearTimeout(timer);
                                qrImage.onload = null;
                                qrImage.onerror = null;
                                fn(value);
                            };
                            const timer = setTimeout(() => finish(reject, new Error('Image load timed out')), 20000);
                            qrImage.onload = () => qrImage.naturalWidth > 0 ? finish(resolve) : finish(reject, new Error('No pixels'));
                            qrImage.onerror = () => finish(reject, new Error('Image request failed'));
                            qrImage.src = candidate.url;
                        });
                        loadedSource = candidate.source;
                        break;
                    } catch (imageError) {
                        lastImageError = imageError;
                    }
                }
                if (!loadedSource) throw new Error('All QR sources failed. ' + (lastImageError && lastImageError.message || ''));
                qrImage.dataset.ready = 'true';
                qrImage.dataset.error = '';
            } catch (error) {
                hideQrBox(error && error.message || error);
            }
        })();

        window.printTranscriptWhenReady = async function () {
            const qr = document.getElementById('transcriptVerificationQr');
            const deadline = Date.now() + 20000;
            while (qr && qr.dataset.ready !== 'true' && !qr.dataset.error && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (qr && qr.dataset.ready !== 'true') {
                console.warn('[Transcript Print] QR unavailable; continuing without it:', qr.dataset.error);
                const box = qr.closest('.verification-qr');
                if (box) box.style.display = 'none';
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

    <\/script>
</body>
</html>
            `);
            printWindow.document.close();

            const previewDocument = printWindow.document;
            if (!previewDocument.documentElement) previewDocument.appendChild(previewDocument.createElement('html'));
            if (!previewDocument.head) {
                const safeHead = previewDocument.createElement('head');
                previewDocument.documentElement.insertBefore(safeHead, previewDocument.documentElement.firstChild);
            }
            if (!previewDocument.body) previewDocument.documentElement.appendChild(previewDocument.createElement('body'));

            // ---------- PREVIEW MODE ----------
            if (outputMode === 'preview') {
                const previewStyle = printWindow.document.createElement('style');
                previewStyle.textContent = `
                    html, body { min-height: 100%; background: #eef2f7 !important; }
                    body { margin: 0 !important; padding: 74px 16px 24px !important; }
                    .container { display: block !important; width: 794px !important; min-width: 794px !important; max-width: 794px !important; min-height: 0 !important; height: auto !important; margin: 0 auto !important; padding: 20px 24px !important; background: #fff !important; box-shadow: 0 8px 30px rgba(15,23,42,.18) !important; border-radius: 2px !important; }
                    .transcript-preview-toolbar { position: fixed; z-index: 99999; top: 0; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px; background: #0A3D62; box-shadow: 0 2px 10px #0002; }
                    .transcript-preview-toolbar button { border: 0; border-radius: 7px; padding: 10px 16px; font: 600 14px Arial,sans-serif; cursor: pointer; }
                    .transcript-preview-toolbar .download { background: #10b981; color: #fff; }
                    .transcript-preview-toolbar .print { background: rgba(255,255,255,.16); color: #fff; border: 1px solid rgba(255,255,255,.35); }
                    .transcript-preview-toolbar .close { background: #e2e8f0; color: #1e293b; }
                    /* Keep the document canvas A4-sized on every device; only the viewing viewport changes. */
                    @media (max-width: 600px) { body { padding: 74px 6px 12px !important; overflow: auto !important; } .container { width: 794px !important; min-width: 794px !important; max-width: 794px !important; min-height: 0 !important; padding: 7px 8px !important; transform-origin: top left; } .transcript-preview-toolbar button { padding: 9px 10px; font-size: 12px; } }
                    @media print { html, body { background: #fff !important; padding: 0 !important; } .transcript-preview-toolbar { display: none !important; } .container { width: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 2mm !important; box-shadow: none !important; } }
                `;
                printWindow.document.head.appendChild(previewStyle);
                const toolbar = printWindow.document.createElement('div');
                toolbar.className = 'transcript-preview-toolbar no-print';
                toolbar.innerHTML = '<button type="button" class="download">⬇ Download PDF</button><button type="button" class="print">🖨 Print</button><button type="button" class="close">Close Preview</button>';
                const previewBody = printWindow.document.body || printWindow.document.getElementsByTagName('body')[0];
                if (!previewBody) {
                    alert('The transcript preview could not be initialized. Please try again.');
                    printWindow.close();
                    return;
                }
                previewBody.insertBefore(toolbar, previewBody.firstChild);

                toolbar.querySelector('.download').addEventListener('click', async () => {
                    const target = printWindow.document.querySelector('.container');
                    if (!target) {
                        alert('The transcript content could not be found in the preview. Please close it, reopen Academic Transcript, and try again.');
                        return;
                    }
                    const qr = printWindow.document.getElementById('transcriptVerificationQr');
                    const qrDeadline = Date.now() + 20000;
                    while (qr && qr.dataset.ready !== 'true' && !qr.dataset.error && Date.now() < qrDeadline) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    if (qr && qr.dataset.ready !== 'true') {
                        alert('Transcript verification QR failed: ' + (qr?.dataset?.error || 'The verification QR did not become ready in time.') + '\n\nNo PDF was created.');
                        return;
                    }
                    await Promise.all(Array.from(printWindow.document.images).map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.addEventListener('load', resolve, { once: true });
                            img.addEventListener('error', resolve, { once: true });
                            setTimeout(resolve, 2500);
                        });
                    }));

                    // Capture the preview as rendered. The images were awaited above; do not inject
                    // layout CSS or change the transcript's widths, table, typography, or spacing.
                    const chartCanvasEl = printWindow.document.querySelector('#reportCardLineChart');
                    if (chartCanvasEl && printWindow.Chart) {
                        const chartInstance = printWindow.Chart.getChart(chartCanvasEl);
                        if (chartInstance) {
                            chartInstance.options.responsive = false;
                            chartInstance.options.maintainAspectRatio = false;
                            chartInstance.options.animation = false;
                            chartInstance.resize(700, 143);
                            chartInstance.update('none');
                        }
                    }
                    await new Promise(resolve => printWindow.requestAnimationFrame(() =>
                        printWindow.requestAnimationFrame(resolve)
                    ));

                    const previewToolbar = printWindow.document.querySelector('.transcript-preview-toolbar');
                    if (previewToolbar) previewToolbar.style.display = 'none';
                    const previewRows = printWindow.document.querySelectorAll('table.semester-results-table tbody tr');
                    let downloadStarted = false;

                    const fileBase = 'Provisional-Academic-Transcript-' + String(user.full_name || 'Student').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
                    let downloadStarted = false;

                    // Primary pipeline: html2pdf with array margin (0.10.1 requires array)
                    try {
                        if (typeof printWindow.html2pdf === 'function') {
                            const options = {
                                margin: 0,
                                filename: fileBase + '.pdf',
                                image: { type: 'jpeg', quality: 0.98 },
                                html2canvas: {
                                    scale: 2,
                                    useCORS: true,
                                    allowTaint: false,
                                    backgroundColor: '#ffffff',
                                    scrollX: 0,
                                    scrollY: 0,
                                    logging: false,
                                    onclone: (clonedDoc) => {
                                        // Exclude controls only. Preserve the preview's existing layout styles.
                                        clonedDoc.querySelectorAll('.transcript-preview-toolbar, .no-print').forEach(node => {
                                            node.style.setProperty('display', 'none', 'important');
                                        });
                                    }
                                },
                                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                                // Match the visible one-page preview: don't force whole footer/signature blocks
                                // onto a second page just because they are marked break-inside: avoid.
                                pagebreak: { mode: ['css'] }
                            };
                            await printWindow.html2pdf().set(options).from(target).save();
                            downloadStarted = true;
                            console.info('[Transcript PDF] html2pdf save completed', {filename:options.filename, rows:previewRows.length});
                        }
                    } catch (error) {
                        console.warn('[Transcript PDF] html2pdf pipeline failed; trying direct canvas fallback', {
                            message: String(error && (error.message || error.name) || error || 'Unknown'),
                            stack: error && error.stack
                        });
                    }

                    // Fallback: direct html2canvas + jsPDF page slicing
                    if (!downloadStarted) {
                        try {
                            // Wait for standalone fallback scripts if the html2pdf bundle failed.
                            const libraryDeadline = Date.now() + 8000;
                            while (Date.now() < libraryDeadline) {
                                const hasCanvas = typeof printWindow.html2canvas === 'function' ||
                                    (printWindow.html2pdf && typeof printWindow.html2pdf.html2canvas === 'function');
                                const hasPdf = !!(printWindow.jspdf && typeof printWindow.jspdf.jsPDF === 'function') ||
                                    typeof printWindow.jsPDF === 'function' ||
                                    (printWindow.html2pdf && typeof printWindow.html2pdf.jsPDF === 'function');
                                if (hasCanvas && hasPdf) break;
                                await new Promise(resolve => setTimeout(resolve, 200));
                            }
                            // Retry from jsDelivr if cdnjs did not expose one or both libraries.
                            if (typeof printWindow.html2canvas !== 'function') {
                                await new Promise(resolve => {
                                    const script = printWindow.document.createElement('script');
                                    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                                    script.onload = resolve;
                                    script.onerror = resolve;
                                    printWindow.document.head.appendChild(script);
                                });
                            }
                            if (!(printWindow.jspdf && typeof printWindow.jspdf.jsPDF === 'function') &&
                                typeof printWindow.jsPDF !== 'function') {
                                await new Promise(resolve => {
                                    const script = printWindow.document.createElement('script');
                                    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                                    script.onload = resolve;
                                    script.onerror = resolve;
                                    printWindow.document.head.appendChild(script);
                                });
                            }
                            const html2canvasFn = printWindow.html2canvas ||
                                (printWindow.html2pdf && printWindow.html2pdf.html2canvas);
                            const jsPDFCtor = printWindow.jspdf && printWindow.jspdf.jsPDF
                                ? printWindow.jspdf.jsPDF
                                : (printWindow.jsPDF || (printWindow.html2pdf && printWindow.html2pdf.jsPDF));
                            if (typeof html2canvasFn !== 'function' || typeof jsPDFCtor !== 'function') {
                                throw new Error('Direct PDF fallback libraries are unavailable.');
                            }
                            const fallbackCanvas = await html2canvasFn(target, {
                                scale: 2,
                                windowWidth: 794, // Match the fixed A4-width preview canvas on every device.
                                useCORS: true,
                                allowTaint: false,
                                backgroundColor: '#ffffff',
                                scrollX: 0,
                                scrollY: 0,
                                logging: false,
                                onclone: (clonedDoc) => {
                                        [clonedDoc.documentElement, clonedDoc.body].forEach(node => {
                                            node.style.setProperty('margin', '0', 'important');
                                            node.style.setProperty('padding', '0', 'important');
                                            node.style.setProperty('overflow', 'visible', 'important');
                                            node.style.setProperty('background', '#ffffff', 'important');
                                        });
                                        clonedDoc.querySelectorAll('.transcript-preview-toolbar, .no-print').forEach(node => {
                                            node.style.setProperty('display', 'none', 'important');
                                        });
                                    }
                            });
                            const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
                            const pageWidth = 210;
                            const pageHeight = 297;
                            const marginMm = 5;
                            const usableWidth = pageWidth - marginMm * 2;
                            const usableHeight = pageHeight - marginMm * 2;
                            const pxPerMm = fallbackCanvas.width / usableWidth;
                            const pageSliceHeight = Math.max(1, Math.floor(usableHeight * pxPerMm));
                            const pageCanvas = printWindow.document.createElement('canvas');
                            const pageContext = pageCanvas.getContext('2d');
                            pageCanvas.width = fallbackCanvas.width;
                            let sourceY = 0;
                            let pageIndex = 0;
                            while (sourceY < fallbackCanvas.height) {
                                const sliceHeight = Math.min(pageSliceHeight, fallbackCanvas.height - sourceY);
                                pageCanvas.height = sliceHeight;
                                pageContext.fillStyle = '#ffffff';
                                pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                                pageContext.drawImage(fallbackCanvas, 0, sourceY, fallbackCanvas.width, sliceHeight, 0, 0, pageCanvas.width, sliceHeight);
                                if (pageIndex > 0) pdf.addPage('a4', 'portrait');
                                const renderedHeight = sliceHeight / pxPerMm;
                                pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.98), 'JPEG', marginMm, marginMm, usableWidth, renderedHeight, undefined, 'FAST');
                                sourceY += sliceHeight;
                                pageIndex++;
                            }
                            pdf.save(fileBase + '.pdf');
                            downloadStarted = true;
                            console.info('[Transcript PDF] Direct canvas fallback save completed', {filename:fileBase+'.pdf',pages:pageIndex});
                        } catch (fallbackError) {
                            console.error('[Transcript PDF] Direct canvas fallback failed', fallbackError);
                            alert('The transcript PDF could not be generated. ' +
                                String(fallbackError && (fallbackError.message || fallbackError.name) || fallbackError) +
                                '\n\nOpen Developer Tools (F12) > Console for details. Your transcript preview is still open; no PDF was confirmed as saved.');
                        }
                    }

                    if (downloadStarted) {
                        toolbar.querySelector('.download').textContent = '✓ PDF download started';
                        // Keep preview open so the browser can begin the Blob URL download.
                    }
                });

                toolbar.querySelector('.print').addEventListener('click', async () => {
                    const printButton = toolbar.querySelector('.print');
                    const qrImage = printWindow.document.getElementById('transcriptVerificationQr');
                    try {
                        printButton.disabled = true;
                        printButton.textContent = 'Preparing print…';
                        const deadline = Date.now() + 20000;
                        while (qrImage && qrImage.dataset.ready !== 'true' && !qrImage.dataset.error && Date.now() < deadline) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        if (qrImage && qrImage.dataset.ready !== 'true') {
                                console.warn('[Transcript Print] QR unavailable; continuing without it:', qrImage.dataset.error);
                                const box = qrImage.closest('.verification-qr');
                                if (box) box.style.display = 'none';
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
                        frameWindow.focus();
                        await new Promise(resolve => setTimeout(resolve, 350));
                        frameWindow.print();
                    } catch (error) {
                        console.error('[Transcript Print] Failed', error);
                        alert('Could not open the transcript print dialog. ' + (error && error.message ? error.message : error));
                    } finally {
                        if (printButton.isConnected) {
                            printButton.disabled = false;
                            printButton.textContent = '🖨 Print';
                        }
                    }
                });
                toolbar.querySelector('.close').addEventListener('click', () => printWindow.close());
                printWindow.focus();
                return;
            }

            // ---------- PRINT MODE ----------
            if (outputMode === 'print') {
                setTimeout(async () => {
                    const target = printWindow.document.querySelector('.container');
                    if (!target) {
                        printWindow.close();
                        alert('Transcript preview could not be prepared. Please try again.');
                        return;
                    }
                    const qr = printWindow.document.getElementById('transcriptVerificationQr');
                    const qrDeadline = Date.now() + 20000;
                    while (qr && qr.dataset.ready !== 'true' && !qr.dataset.error && Date.now() < qrDeadline) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    if (qr && qr.dataset.ready !== 'true') {
                        alert('The transcript verification QR code could not be generated. Check your connection and try again.');
                        return;
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
                    frameWindow.focus();
                    frameWindow.print();
                }, 300);
                return;
            }

            // ---------- DOWNLOAD MODE (default) ----------
            setTimeout(async () => {
                const target = printWindow.document.querySelector('.container');
                if (!target) {
                    printWindow.close();
                    alert('Transcript preview could not be prepared. Please try again.');
                    return;
                }

                const generateTranscriptPdf = async () => {
                    if (!printWindow || printWindow.closed) return;
                    const qrImage = printWindow.document.getElementById('transcriptVerificationQr');
                    if (qrImage && qrImage.style.display !== 'none') {
                        const qrStartedAt = Date.now();
                        while (qrImage.dataset.ready !== 'true' && !qrImage.dataset.error && Date.now() - qrStartedAt < 20000) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        if (qrImage.dataset.ready !== 'true') {
                            alert('Transcript verification QR failed: ' + (qrImage.dataset.error || 'generation timeout') + '\n\nNo PDF was created.');
                            return;
                        }
                    }

                    // Do not add a download-only stylesheet: export the preview's rendered DOM and CSS unchanged.
                    const existingDownloadStyle = printWindow.document.getElementById('transcript-pdf-capture-normalization');
                    if (existingDownloadStyle) existingDownloadStyle.remove();
                    const downloadToolbar = printWindow.document.querySelector('.transcript-preview-toolbar');
                    if (downloadToolbar) downloadToolbar.style.display = 'none';
const chartCanvas = printWindow.document.querySelector('.chart-container canvas');
                    if (chartCanvas && printWindow.Chart) {
                        const chartInstance = printWindow.Chart.getChart(chartCanvas);
                        if (chartInstance) {
                            chartInstance.options.responsive = false;
                            chartInstance.options.maintainAspectRatio = false;
                            chartInstance.options.animation = false;
                            chartInstance.resize(700, 143);
                            chartInstance.update('none');
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 350));

                    const transcriptTable = printWindow.document.querySelector('table.semester-results-table');
                    const transcriptRows = transcriptTable ? transcriptTable.querySelectorAll('tbody tr') : [];
                    const unitCount = transcriptRows.length;
                    // Keep preview styling intact; only hide interactive controls in the PDF.
                    const densityStyle = printWindow.document.createElement('style');
                    densityStyle.textContent = '.transcript-preview-toolbar, .no-print { display: none !important; }';
                    printWindow.document.head.appendChild(densityStyle);

                    const fileBase = 'Provisional-Academic-Transcript-' + String(user.full_name || 'Student').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
                    let downloadStarted = false;
                    

                    try {
                        if (typeof printWindow.html2pdf === 'function') {
                            const options = {
                                margin: 0,
                                filename: fileBase + '.pdf',
                                image: { type: 'jpeg', quality: 0.98 },
                                html2canvas: {
                                    scale: 2,
                                    windowWidth: 794, // Same CSS viewport on phones, tablets and desktops.
                                    useCORS: true,
                                    allowTaint: false,
                                    backgroundColor: '#ffffff',
                                    scrollX: 0,
                                    scrollY: 0,
                                    logging: false,
                                    onclone: (clonedDoc) => {
                                        [clonedDoc.documentElement, clonedDoc.body].forEach(node => {
                                            node.style.setProperty('margin', '0', 'important');
                                            node.style.setProperty('padding', '0', 'important');
                                            node.style.setProperty('overflow', 'visible', 'important');
                                            node.style.setProperty('background', '#ffffff', 'important');
                                        });
                                        clonedDoc.querySelectorAll('.transcript-preview-toolbar, .no-print').forEach(node => {
                                            node.style.setProperty('display', 'none', 'important');
                                        });
                                    }
                                },
                                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                                pagebreak: { mode: ['css'], avoid: ['.transcript-top', '.student-info-wrapper', '.semester-results-title', '.chart-container', '.declaration', '.signatures', '.footer'] }
                            };
                            await printWindow.html2pdf().set(options).from(target).save();
                            downloadStarted = true;
                            console.info('[Transcript PDF] Download mode: html2pdf completed', { filename: options.filename });
                        }
                    } catch (error) {
                        console.warn('[Transcript PDF] Download mode: html2pdf failed; trying fallback', {
                            message: String(error && (error.message || error.name) || error || 'Unknown')
                        });
                    }

                    if (!downloadStarted) {
                        try {
                            // Wait for standalone fallback scripts if the html2pdf bundle failed.
                            const libraryDeadline = Date.now() + 8000;
                            while (Date.now() < libraryDeadline) {
                                const hasCanvas = typeof printWindow.html2canvas === 'function' ||
                                    (printWindow.html2pdf && typeof printWindow.html2pdf.html2canvas === 'function');
                                const hasPdf = !!(printWindow.jspdf && typeof printWindow.jspdf.jsPDF === 'function') ||
                                    typeof printWindow.jsPDF === 'function' ||
                                    (printWindow.html2pdf && typeof printWindow.html2pdf.jsPDF === 'function');
                                if (hasCanvas && hasPdf) break;
                                await new Promise(resolve => setTimeout(resolve, 200));
                            }
                            // Retry from jsDelivr if cdnjs did not expose one or both libraries.
                            if (typeof printWindow.html2canvas !== 'function') {
                                await new Promise(resolve => {
                                    const script = printWindow.document.createElement('script');
                                    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                                    script.onload = resolve;
                                    script.onerror = resolve;
                                    printWindow.document.head.appendChild(script);
                                });
                            }
                            if (!(printWindow.jspdf && typeof printWindow.jspdf.jsPDF === 'function') &&
                                typeof printWindow.jsPDF !== 'function') {
                                await new Promise(resolve => {
                                    const script = printWindow.document.createElement('script');
                                    script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                                    script.onload = resolve;
                                    script.onerror = resolve;
                                    printWindow.document.head.appendChild(script);
                                });
                            }
                            const html2canvasFn = printWindow.html2canvas ||
                                (printWindow.html2pdf && printWindow.html2pdf.html2canvas);
                            const jsPDFCtor = printWindow.jspdf && printWindow.jspdf.jsPDF
                                ? printWindow.jspdf.jsPDF
                                : (printWindow.jsPDF || (printWindow.html2pdf && printWindow.html2pdf.jsPDF));
                            if (typeof html2canvasFn !== 'function' || typeof jsPDFCtor !== 'function') {
                                throw new Error('Direct PDF fallback libraries are unavailable.');
                            }
                            const fallbackCanvas = await html2canvasFn(target, {
                                scale: 2,
                                windowWidth: 794, // Match the fixed A4-width preview canvas on every device.
                                useCORS: true,
                                allowTaint: false,
                                backgroundColor: '#ffffff',
                                scrollX: 0,
                                scrollY: 0,
                                logging: false,
                                onclone: (clonedDoc) => {
                                        [clonedDoc.documentElement, clonedDoc.body].forEach(node => {
                                            node.style.setProperty('margin', '0', 'important');
                                            node.style.setProperty('padding', '0', 'important');
                                            node.style.setProperty('overflow', 'visible', 'important');
                                            node.style.setProperty('background', '#ffffff', 'important');
                                        });
                                        clonedDoc.querySelectorAll('.transcript-preview-toolbar, .no-print').forEach(node => {
                                            node.style.setProperty('display', 'none', 'important');
                                        });
                                    }
                            });
                            const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
                            const usableWidth = 200;
                            const usableHeight = 287;
                            const pxPerMm = fallbackCanvas.width / usableWidth;
                            const pageSliceHeight = Math.max(1, Math.floor(usableHeight * pxPerMm));
                            const pageCanvas = printWindow.document.createElement('canvas');
                            const pageContext = pageCanvas.getContext('2d');
                            pageCanvas.width = fallbackCanvas.width;
                            let sourceY = 0;
                            let pageIndex = 0;
                            while (sourceY < fallbackCanvas.height) {
                                const sliceHeight = Math.min(pageSliceHeight, fallbackCanvas.height - sourceY);
                                pageCanvas.height = sliceHeight;
                                pageContext.fillStyle = '#ffffff';
                                pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                                pageContext.drawImage(fallbackCanvas, 0, sourceY, fallbackCanvas.width, sliceHeight, 0, 0, pageCanvas.width, sliceHeight);
                                if (pageIndex > 0) pdf.addPage('a4', 'portrait');
                                const renderedHeight = sliceHeight / pxPerMm;
                                pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.98), 'JPEG', 5, 5, usableWidth, renderedHeight, undefined, 'FAST');
                                sourceY += sliceHeight;
                                pageIndex++;
                            }
                            pdf.save(fileBase + '.pdf');
                            downloadStarted = true;
                            console.info('[Transcript PDF] Download mode: fallback completed', { pages: pageIndex });
                        } catch (fallbackError) {
                            console.error('[Transcript PDF] Download mode: fallback failed', fallbackError);
                            alert('PDF download failed: ' + (fallbackError && fallbackError.message || 'Please try again.'));
                        }
                    }

                    if (downloadStarted) {
                        try { printWindow.close(); } catch (_) {}
                    }
                };

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
            // Always open the canonical transcript preview first. The preview's own
            // Download PDF button exports that exact rendered document on desktop/mobile.
            downloadBtn.addEventListener('click', function () { downloadReportCard('preview'); });
        }
        
        const printBtn = document.getElementById('print-report');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                window.print();
            });
        }
        
        const downloadReportCardBtn = document.getElementById('download-report-card');
        if (downloadReportCardBtn) {
            downloadReportCardBtn.addEventListener('click', function () { downloadReportCard('preview'); });
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
