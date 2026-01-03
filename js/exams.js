// js/exams.js - Complete Fixed Exams Management Module for new UI
(function() {
    'use strict';
    
    // Helper functions (same as courses.js)
    function getSupabaseClient() {
        const client = window.db?.supabase;
        if (!client || typeof client.from !== 'function') {
            console.error('❌ No valid Supabase client available');
            return null;
        }
        return client;
    }
    
    function getUserProfile() {
        console.group('🔍 getUserProfile() - Debug Info');
        
        // Check all possible locations in order of priority
        let profile = {};
        
        if (window.db?.currentUserProfile) {
            console.log('✅ Found profile in window.db.currentUserProfile');
            profile = window.db.currentUserProfile;
        } else if (window.currentUserProfile) {
            console.log('✅ Found profile in window.currentUserProfile');
            profile = window.currentUserProfile;
        } else if (window.userProfile) {
            console.log('✅ Found profile in window.userProfile');
            profile = window.userProfile;
        } else if (window.user?.profile) {
            console.log('✅ Found profile in window.user.profile');
            profile = window.user.profile;
        } else if (window.auth?.user) {
            console.log('✅ Found profile in window.auth.user');
            profile = window.auth.user;
        } else {
            console.log('❌ No profile found in standard locations');
            
            // Try localStorage as last resort
            try {
                const stored = localStorage.getItem('userProfile');
                if (stored) {
                    console.log('✅ Found profile in localStorage');
                    profile = JSON.parse(stored);
                }
            } catch (e) {
                console.log('❌ Error parsing localStorage profile');
            }
        }
        
        console.log('📋 Raw profile data:', profile);
        console.log('🔑 Profile keys:', Object.keys(profile));
        console.log('🎯 Key fields:', {
            program: profile.program,
            intake_year: profile.intake_year,
            block: profile.block,
            department: profile.department
        });
        
        // Normalize the profile to ensure we have standard field names
        const normalizedProfile = {
            program: profile.program || profile.department || profile.program_type || profile.course || profile.major || '',
            intake_year: profile.intake_year || profile.intakeYear || profile.year || profile.admission_year || profile.academic_year || '',
            block: profile.block || profile.term || profile.semester || profile.block_term || '',
            department: profile.department || profile.program || '',
            // Include all other fields
            ...profile
        };
        
        console.log('✨ Normalized profile:', normalizedProfile);
        console.groupEnd();
        
        return normalizedProfile;
    }
    
    function getCurrentUserId() {
        console.group('🔍 getCurrentUserId() - Debug Info');
        
        let userId = null;
        
        if (window.db?.currentUserId) {
            console.log('✅ Found userId in window.db.currentUserId');
            userId = window.db.currentUserId;
        } else if (window.currentUserId) {
            console.log('✅ Found userId in window.currentUserId');
            userId = window.currentUserId;
        } else if (window.userId) {
            console.log('✅ Found userId in window.userId');
            userId = window.userId;
        } else if (window.user?.id) {
            console.log('✅ Found userId in window.user.id');
            userId = window.user.id;
        } else if (window.user?.user_id) {
            console.log('✅ Found userId in window.user.user_id');
            userId = window.user.user_id;
        } else if (window.user?.uid) {
            console.log('✅ Found userId in window.user.uid');
            userId = window.user.uid;
        } else if (window.auth?.user?.id) {
            console.log('✅ Found userId in window.auth.user.id');
            userId = window.auth.user.id;
        } else {
            console.log('❌ No userId found in standard locations');
            
            // Try localStorage
            try {
                const storedId = localStorage.getItem('userId');
                if (storedId) {
                    console.log('✅ Found userId in localStorage');
                    userId = storedId;
                }
            } catch (e) {
                console.log('❌ Error getting userId from localStorage');
            }
        }
        
        console.log('🔐 User ID:', userId);
        console.groupEnd();
        
        return userId;
    }
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule constructor called');
            console.log('📍 Location:', window.location.href);
            
            this.userId = null;
            this.userProfile = null;
            this.cachedExams = [];
            this.currentFilter = 'all';
            
            // New HTML elements
            this.currentAssessmentsTable = document.getElementById('current-assessments-table');
            this.completedAssessmentsTable = document.getElementById('completed-assessments-table');
            this.currentEmptyState = document.getElementById('current-empty');
            this.completedEmptyState = document.getElementById('completed-empty');
            this.currentCountElement = document.getElementById('current-count');
            this.completedCountElement = document.getElementById('completed-count');
            this.completedAverageElement = document.getElementById('completed-average');
            
            // Header stats elements
            this.currentCountHeader = document.getElementById('current-assessments-count');
            this.completedCountHeader = document.getElementById('completed-assessments-count');
            this.overallAverageHeader = document.getElementById('overall-average');
            
            // Performance summary elements
            this.bestScoreElement = document.getElementById('best-score');
            this.lowestScoreElement = document.getElementById('lowest-score');
            this.passRateElement = document.getElementById('pass-rate');
            this.distinctionCountElement = document.getElementById('distinction-count');
            this.creditCountElement = document.getElementById('credit-count');
            this.passCountElement = document.getElementById('pass-count');
            this.failCountElement = document.getElementById('fail-count');
            this.firstAssessmentDateElement = document.getElementById('first-assessment-date');
            this.latestAssessmentDateElement = document.getElementById('latest-assessment-date');
            this.totalSubmittedElement = document.getElementById('total-submitted');
            
            console.log('📋 Element references:', {
                currentTable: !!this.currentAssessmentsTable,
                completedTable: !!this.completedAssessmentsTable,
                currentEmptyState: !!this.currentEmptyState,
                completedEmptyState: !!this.completedEmptyState,
                currentCountHeader: !!this.currentCountHeader,
                completedCountHeader: !!this.completedCountHeader
            });
            
            this.initializeElements();
            
            // Initialize after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.initialize();
            }, 100);
        }
        
        initializeElements() {
            console.log('🔌 initializeElements called');
            
            // Setup event listeners for new buttons
            const viewAllBtn = document.getElementById('view-all-assessments');
            const viewCurrentBtn = document.getElementById('view-current-only');
            const viewCompletedBtn = document.getElementById('view-completed-only');
            const refreshBtn = document.getElementById('refresh-assessments');
            const transcriptBtn = document.getElementById('view-transcript');
            
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => {
                    console.log('🔄 View All button clicked');
                    this.filterAssessments('all');
                });
                viewAllBtn.classList.add('active');
            }
            
            if (viewCurrentBtn) {
                viewCurrentBtn.addEventListener('click', () => {
                    console.log('🔄 Current Only button clicked');
                    this.filterAssessments('current');
                });
            }
            
            if (viewCompletedBtn) {
                viewCompletedBtn.addEventListener('click', () => {
                    console.log('🔄 Completed Only button clicked');
                    this.filterAssessments('completed');
                });
            }
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    console.log('🔄 Refresh button clicked');
                    this.refreshAssessments();
                });
            }
            
            if (transcriptBtn) {
                transcriptBtn.addEventListener('click', () => {
                    console.log('📄 View transcript clicked');
                    if (window.AppUtils && window.AppUtils.showToast) {
                        AppUtils.showToast('Transcript feature coming soon!', 'info');
                    }
                });
            }
        }
        
        // Initialize with user ID and profile
        initialize() {
            console.log('🚀 ExamsModule.initialize() called');
            console.log('=============================');
            
            // Get user info using the helper functions
            this.userId = getCurrentUserId();
            this.userProfile = getUserProfile();
            
            console.log('👤 User data in initialize():', {
                userId: this.userId,
                userProfile: this.userProfile,
                program: this.userProfile?.program,
                department: this.userProfile?.department,
                intake_year: this.userProfile?.intake_year,
                block: this.userProfile?.block,
                profileKeys: Object.keys(this.userProfile || {})
            });
            console.log('=============================');
            
            if (this.userId && this.userProfile) {
                const program = this.userProfile.program || this.userProfile.department;
                const intakeYear = this.userProfile.intake_year;
                
                console.log('🔍 Program check:', {
                    program: program,
                    intakeYear: intakeYear,
                    hasProgram: !!program,
                    hasIntakeYear: !!intakeYear,
                    programType: typeof program,
                    intakeYearType: typeof intakeYear
                });
                
                if (program && intakeYear) {
                    console.log('✅ User data available, loading exams...');
                    console.log('🎯 Query will use:', {
                        program: program,
                        intakeYear: intakeYear,
                        block: this.userProfile.block || 'General'
                    });
                    this.loadExams();
                } else {
                    console.error('❌ Missing program or intake year in profile:', {
                        program: program || 'undefined',
                        intakeYear: intakeYear || 'undefined',
                        fullProfile: this.userProfile
                    });
                    this.showErrorState('current', `Cannot load assessments: Missing program (${program || 'none'}) or intake year (${intakeYear || 'none'})`);
                    this.showErrorState('completed', `Cannot load assessments: Missing program (${program || 'none'}) or intake year (${intakeYear || 'none'})`);
                    
                    // Try to fetch profile directly from Supabase as fallback
                    this.fetchProfileFromSupabase();
                }
            } else {
                console.error('❌ Missing user data:', {
                    userId: this.userId,
                    userProfile: !!this.userProfile,
                    windowDbExists: !!window.db,
                    windowDbCurrentUserProfile: !!window.db?.currentUserProfile
                });
                this.showErrorState('current', 'User data not available. Please ensure you are logged in.');
                this.showErrorState('completed', 'User data not available. Please ensure you are logged in.');
            }
        }
        
        // Get Supabase client
        getSupabaseClient() {
            const client = getSupabaseClient();
            console.log('🔌 Supabase client:', client ? 'Available' : 'Missing');
            return client;
        }
        
        // Fallback: Fetch profile directly from Supabase
        async fetchProfileFromSupabase() {
            console.log('🔄 Attempting to fetch profile directly from Supabase...');
            
            if (!this.userId) {
                console.error('❌ Cannot fetch profile: No user ID available');
                return;
            }
            
            const supabase = this.getSupabaseClient();
            if (!supabase) {
                console.error('❌ Cannot fetch profile: No Supabase client');
                return;
            }
            
            try {
                console.log('📡 Querying profiles table for user:', this.userId);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', this.userId)
                    .single();
                
                if (error) {
                    console.error('❌ Error fetching profile:', error);
                    return;
                }
                
                if (data) {
                    console.log('✅ Successfully fetched profile from Supabase:', {
                        program: data.program,
                        intake_year: data.intake_year,
                        block: data.block,
                        allData: data
                    });
                    
                    // Update the cached profile
                    this.userProfile = data;
                    
                    // Update global profile references
                    if (window.db) window.db.currentUserProfile = data;
                    if (!window.currentUserProfile) window.currentUserProfile = data;
                    if (!window.userProfile) window.userProfile = data;
                    
                    // Try loading exams again
                    this.loadExams();
                }
            } catch (error) {
                console.error('❌ Failed to fetch profile:', error);
            }
        }
        
        // Load exams and grades
        async loadExams() {
            console.log('📥 loadExams() started');
            console.group('📊 Loading Exams Process');
            
            // Show loading states
            this.showLoadingState('current');
            this.showLoadingState('completed');
            
            // Ensure we have latest user data
            if (!this.userProfile || !this.userId) {
                console.log('🔄 Refreshing user data...');
                this.userId = getCurrentUserId();
                this.userProfile = getUserProfile();
            }
            
            const program = this.userProfile?.program || this.userProfile?.department;
            const block = this.userProfile?.block;
            const intakeYear = this.userProfile?.intake_year;
            const studentId = this.userId;
            
            console.log('🎯 Query parameters:', {
                program,
                block,
                intakeYear,
                studentId,
                hasProgram: !!program,
                hasIntakeYear: !!intakeYear,
                programType: typeof program,
                intakeYearType: typeof intakeYear,
                userProfile: this.userProfile
            });
            
            if (!program || !intakeYear) {
                console.error('❌ Missing program or intake year:', {
                    program: program || 'undefined',
                    intakeYear: intakeYear || 'undefined',
                    userProfile: this.userProfile
                });
                
                this.showErrorState('current', `Cannot load assessments: Missing program (${program || 'none'}) or intake year (${intakeYear || 'none'})`);
                this.showErrorState('completed', `Cannot load assessments: Missing program (${program || 'none'}) or intake year (${intakeYear || 'none'})`);
                this.cachedExams = [];
                console.groupEnd();
                return;
            }
            
            try {
                console.log('📡 Fetching exams from Supabase...');
                const supabase = this.getSupabaseClient();
                if (!supabase) {
                    throw new Error('Supabase client not available');
                }
                
                // Debug: Log the actual query
                console.log('🔍 Executing query for exams:');
                console.log(`- program_type IN ('${program}', 'General')`);
                console.log(`- block_term IN ('${block}', null, 'General')`);
                console.log(`- intake_year = '${intakeYear}'`);
                
                const { data: exams, error: examsError } = await supabase
                    .from('exams_with_courses')
                    .select(`
                        id,
                        exam_name,
                        exam_type,  
                        exam_date,
                        status,
                        block_term,
                        program_type,
                        exam_link,
                        course_name
                    `)
                    .or(`program_type.eq.${program},program_type.eq.General`)
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (examsError) {
                    console.error('❌ Error fetching exams:', examsError);
                    throw examsError;
                }
                
                console.log(`✅ Fetched ${exams?.length || 0} exams`);
                console.log('📋 Exams data:', exams);
                
                // Fetch overall grades
                console.log('📡 Fetching grades from Supabase...');
                console.log(`🔍 Executing query for grades for student: ${studentId}`);
                
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select(`
                        exam_id,
                        student_id,
                        cat_1_score,
                        cat_2_score,
                        exam_score,
                        total_score,
                        result_status,
                        marks,
                        graded_by,
                        graded_at
                    `)
                    .eq('student_id', studentId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .order('graded_at', { ascending: false });
                
                if (gradesError) {
                    console.error('❌ Error fetching grades:', gradesError);
                    throw gradesError;
                }
                
                console.log(`✅ Fetched ${grades?.length || 0} grades`);
                console.log('📋 Grades data:', grades);
                
                // Combine exams with their grades
                this.cachedExams = exams.map(exam => {
                    const grade = grades?.find(g => String(g.exam_id) === String(exam.id));
                    const examType = exam.exam_type || '';
                    
                    let resultStatus = 'Scheduled';
                    let displayStatus = 'Scheduled';
                    let calculatedPercentage = null;
                    
                    if (grade) {
                        console.log(`📊 Processing grade for exam ${exam.id}:`, grade);
                        
                        // Calculate percentage consistently
                        if (grade.total_score !== null && grade.total_score !== undefined) {
                            calculatedPercentage = Number(grade.total_score);
                            console.log(`📈 Using total_score: ${calculatedPercentage}%`);
                        } else {
                            console.log(`🔍 Calculating percentage from component scores...`);
                            
                            // Calculate from CAT scores if total_score not available
                            if (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1') {
                                if (grade.cat_1_score !== null) {
                                    calculatedPercentage = (grade.cat_1_score / 30) * 100;
                                    console.log(`📈 CAT_1 percentage: ${calculatedPercentage}% (score: ${grade.cat_1_score}/30)`);
                                }
                            } else if (examType.includes('CAT_2') || examType === 'CAT_2') {
                                if (grade.cat_2_score !== null) {
                                    calculatedPercentage = (grade.cat_2_score / 30) * 100;
                                    console.log(`📈 CAT_2 percentage: ${calculatedPercentage}% (score: ${grade.cat_2_score}/30)`);
                                }
                            } else if (examType === 'EXAM' || examType.includes('EXAM') || examType.includes('Final')) {
                                if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                                    const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                                    calculatedPercentage = (totalMarks / 100) * 100;
                                    console.log(`📈 EXAM percentage: ${calculatedPercentage}% (scores: ${grade.cat_1_score}+${grade.cat_2_score}+${grade.exam_score}=${totalMarks}/100)`);
                                } else if (grade.marks) {
                                    try {
                                        const marksData = typeof grade.marks === 'string' ? JSON.parse(grade.marks) : grade.marks;
                                        if (marksData.percentage !== undefined) {
                                            calculatedPercentage = marksData.percentage;
                                            console.log(`📈 Using marks.percentage: ${calculatedPercentage}%`);
                                        }
                                    } catch (e) {
                                        console.warn('⚠️ Error parsing marks JSON:', e);
                                    }
                                }
                            }
                        }
                        
                        // Determine PASS/FAIL based on 60% threshold
                        if (calculatedPercentage !== null) {
                            displayStatus = calculatedPercentage >= 60 ? 'PASS' : 'FAIL';
                            resultStatus = 'Final';
                            console.log(`🎯 Status: ${displayStatus} (${calculatedPercentage.toFixed(1)}%)`);
                        } else {
                            if (grade.result_status === 'Final') {
                                displayStatus = 'Graded';
                                resultStatus = 'Final';
                            } else {
                                displayStatus = grade.result_status || 'Graded';
                                resultStatus = grade.result_status || 'Graded';
                            }
                            console.log(`🎯 Status: ${displayStatus} (no percentage calculated)`);
                        }
                    } else {
                        console.log(`⏳ No grade found for exam ${exam.id}, status: Scheduled`);
                    }
                    
                    // Determine if assessment is current or completed
                    let assessmentStatus = 'current';
                    if (grade && (calculatedPercentage !== null || grade.result_status === 'Final' || grade.result_status === 'Graded')) {
                        assessmentStatus = 'completed';
                    }
                    
                    console.log(`📌 Assessment status: ${assessmentStatus}`);
                    
                    return { 
                        ...exam, 
                        grade: grade || null,
                        display_status: displayStatus,
                        result_status: resultStatus,
                        calculated_percentage: calculatedPercentage,
                        assessment_status: assessmentStatus,
                        totalPercentage: calculatedPercentage,
                        cat1Score: grade?.cat_1_score || null,
                        cat2Score: grade?.cat_2_score || null,
                        finalScore: grade?.exam_score || null,
                        dateGraded: grade?.graded_at
                    };
                });
                
                console.log(`📊 Processed ${this.cachedExams.length} exams`);
                
                // Split into current and completed
                const currentAssessments = this.cachedExams.filter(exam => exam.assessment_status === 'current');
                const completedAssessments = this.cachedExams.filter(exam => exam.assessment_status === 'completed');
                
                console.log(`📊 Split: ${currentAssessments.length} current, ${completedAssessments.length} completed`);
                console.log('📋 Current assessments:', currentAssessments);
                console.log('📋 Completed assessments:', completedAssessments);
                
                // Update header stats
                this.updateHeaderStats(currentAssessments.length, completedAssessments.length);
                
                // Apply filter if needed
                let filteredCurrent = currentAssessments;
                let filteredCompleted = completedAssessments;
                
                if (this.currentFilter === 'current') {
                    filteredCompleted = [];
                } else if (this.currentFilter === 'completed') {
                    filteredCurrent = [];
                }
                
                // Display assessments
                console.log('🎨 Displaying current assessments:', filteredCurrent.length);
                if (filteredCurrent.length > 0) {
                    this.displayCurrentAssessments(filteredCurrent);
                    this.hideEmptyState('current');
                } else {
                    this.showEmptyState('current');
                }
                
                console.log('🎨 Displaying completed assessments:', filteredCompleted.length);
                if (filteredCompleted.length > 0) {
                    this.displayCompletedAssessments(filteredCompleted);
                    this.hideEmptyState('completed');
                    this.calculatePerformanceSummary(filteredCompleted);
                } else {
                    this.showEmptyState('completed');
                }
                
                console.log('✅ Exams loaded successfully');
                
            } catch (error) {
                console.error('❌ Failed to load exams:', error);
                this.showErrorState('current', `Failed to load assessments: ${error.message}`);
                this.showErrorState('completed', `Failed to load assessments: ${error.message}`);
                this.cachedExams = [];
            }
            
            console.groupEnd();
        }
        
        // Display current assessments in new table format
        displayCurrentAssessments(assessments) {
            if (!this.currentAssessmentsTable) {
                console.error('❌ current-assessments-table element not found!');
                return;
            }
            
            this.currentAssessmentsTable.innerHTML = '';
            
            if (assessments.length === 0) {
                return;
            }
            
            // Update count
            if (this.currentCountElement) {
                this.currentCountElement.textContent = `${assessments.length} pending`;
            }
            
            assessments.forEach((exam) => {
                const dateStr = exam.exam_date
                    ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })
                    : '--';
                
                const gradeEntry = exam.grade;
                const examType = exam.exam_type || 'EXAM';
                
                // Format scores
                const formatScore = (score) => {
                    if (score === null || score === undefined || score === '-') return '--';
                    if (typeof score === 'string' && score.trim() === '') return '--';
                    return score;
                };
                
                let cat1Score = '--';
                let cat2Score = '--';
                let finalExamScore = '--';
                let totalScore = '--';
                
                if (gradeEntry) {
                    cat1Score = formatScore(gradeEntry.cat_1_score);
                    cat2Score = formatScore(gradeEntry.cat_2_score);
                    finalExamScore = formatScore(gradeEntry.exam_score);
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else {
                        totalScore = '--';
                    }
                }
                
                // Determine status display
                let statusDisplay = '';
                let statusClass = '';
                
                if (exam.display_status === 'PASS' || exam.display_status === 'FAIL') {
                    statusDisplay = `<i class="fas fa-clipboard-check"></i> ${exam.display_status}`;
                    statusClass = exam.display_status === 'PASS' ? 'completed' : 'failed';
                } else {
                    statusDisplay = '<i class="fas fa-clock"></i> Pending';
                    statusClass = 'pending';
                }
                
                // Add exam type indicator
                let typeBadge = '';
                if (examType.includes('CAT')) {
                    typeBadge = `<span class="type-badge cat">CAT</span>`;
                } else {
                    typeBadge = `<span class="type-badge exam">Exam</span>`;
                }
                
                const rowHTML = `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>${typeBadge}</td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${dateStr}</td>
                        <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                        <td class="text-center">${cat1Score}</td>
                        <td class="text-center">${cat2Score}</td>
                        <td class="text-center">${finalExamScore}</td>
                        <td class="text-center"><strong>${totalScore}</strong></td>
                    </tr>`;
                
                this.currentAssessmentsTable.innerHTML += rowHTML;
            });
        }
        
        // Display completed assessments in new table format
        displayCompletedAssessments(assessments) {
            if (!this.completedAssessmentsTable) {
                console.error('❌ completed-assessments-table element not found!');
                return;
            }
            
            this.completedAssessmentsTable.innerHTML = '';
            
            if (assessments.length === 0) {
                return;
            }
            
            // Calculate average
            const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
            let averageScore = '--';
            if (scoredAssessments.length > 0) {
                const total = scoredAssessments.reduce((sum, a) => sum + a.calculated_percentage, 0);
                averageScore = `${(total / scoredAssessments.length).toFixed(1)}%`;
                console.log(`📊 Average score: ${averageScore} (from ${scoredAssessments.length} scored assessments)`);
            }
            
            // Update counts
            if (this.completedCountElement) {
                this.completedCountElement.textContent = `${assessments.length} graded`;
            }
            if (this.completedAverageElement) {
                this.completedAverageElement.textContent = `Average: ${averageScore}`;
            }
            
            assessments.forEach((exam) => {
                const dateStr = exam.exam_date
                    ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })
                    : '--';
                
                const gradedDate = exam.dateGraded
                    ? new Date(exam.dateGraded).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })
                    : '--';
                
                const gradeEntry = exam.grade;
                const examType = exam.exam_type || 'EXAM';
                
                // Format scores
                const formatScore = (score) => {
                    if (score === null || score === undefined || score === '-') return '--';
                    if (typeof score === 'string' && score.trim() === '') return '--';
                    return score;
                };
                
                let cat1Score = '--';
                let cat2Score = '--';
                let finalExamScore = '--';
                let totalScore = '--';
                
                if (gradeEntry) {
                    cat1Score = formatScore(gradeEntry.cat_1_score);
                    cat2Score = formatScore(gradeEntry.cat_2_score);
                    finalExamScore = formatScore(gradeEntry.exam_score);
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else {
                        totalScore = '--';
                    }
                }
                
                // Calculate grade based on percentage using updated scale
                let grade = '--';
                let gradeClass = '';
                if (exam.calculated_percentage !== null) {
                    if (exam.calculated_percentage >= 85) {
                        grade = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (exam.calculated_percentage >= 70) {
                        grade = 'Credit';
                        gradeClass = 'credit';
                    } else if (exam.calculated_percentage >= 60) {
                        grade = 'Pass';
                        gradeClass = 'pass';
                    } else {
                        grade = 'Fail';
                        gradeClass = 'fail';
                    }
                    console.log(`🎓 Grade for ${exam.exam_name}: ${grade} (${exam.calculated_percentage.toFixed(1)}%)`);
                }
                
                // Determine status display
                let statusDisplay = '';
                let statusClass = '';
                
                if (exam.display_status === 'PASS') {
                    statusDisplay = `<i class="fas fa-check-circle"></i> ${grade}`;
                    statusClass = gradeClass;
                } else if (exam.display_status === 'FAIL') {
                    statusDisplay = '<i class="fas fa-times-circle"></i> Failed';
                    statusClass = 'failed';
                } else {
                    statusDisplay = `<i class="fas fa-clipboard-check"></i> ${exam.display_status}`;
                    statusClass = 'graded';
                }
                
                // Add exam type indicator
                let typeBadge = '';
                if (examType.includes('CAT')) {
                    typeBadge = `<span class="type-badge cat">CAT</span>`;
                } else {
                    typeBadge = `<span class="type-badge exam">Exam</span>`;
                }
                
                // Grade badge
                const gradeBadge = grade !== '--' ? 
                    `<span class="grade-badge ${gradeClass}">${grade}</span>` : '--';
                
                const rowHTML = `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>${typeBadge}</td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${gradedDate}</td>
                        <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                        <td class="text-center">${cat1Score}</td>
                        <td class="text-center">${cat2Score}</td>
                        <td class="text-center">${finalExamScore}</td>
                        <td class="text-center"><strong>${totalScore}</strong></td>
                        <td class="text-center">${gradeBadge}</td>
                    </tr>`;
                
                this.completedAssessmentsTable.innerHTML += rowHTML;
            });
        }
        
        // Calculate performance summary
        calculatePerformanceSummary(assessments) {
            console.log('📊 Calculating performance summary for', assessments.length, 'assessments');
            
            const scoredAssessments = assessments.filter(a => a.calculated_percentage !== null);
            console.log('📈 Scored assessments:', scoredAssessments.length);
            
            if (scoredAssessments.length === 0) {
                // Reset all summary values
                if (this.bestScoreElement) this.bestScoreElement.textContent = '--';
                if (this.lowestScoreElement) this.lowestScoreElement.textContent = '--';
                if (this.passRateElement) this.passRateElement.textContent = '--';
                if (this.distinctionCountElement) this.distinctionCountElement.textContent = '0';
                if (this.creditCountElement) this.creditCountElement.textContent = '0';
                if (this.passCountElement) this.passCountElement.textContent = '0';
                if (this.failCountElement) this.failCountElement.textContent = '0';
                if (this.firstAssessmentDateElement) this.firstAssessmentDateElement.textContent = '--';
                if (this.latestAssessmentDateElement) this.latestAssessmentDateElement.textContent = '--';
                if (this.totalSubmittedElement) this.totalSubmittedElement.textContent = '0';
                return;
            }
            
            // Calculate best and lowest scores
            const scores = scoredAssessments.map(a => a.calculated_percentage);
            const bestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);
            
            console.log(`🏆 Best score: ${bestScore.toFixed(1)}%, Lowest score: ${lowestScore.toFixed(1)}%`);
            
            if (this.bestScoreElement) this.bestScoreElement.textContent = `${bestScore.toFixed(1)}%`;
            if (this.lowestScoreElement) this.lowestScoreElement.textContent = `${lowestScore.toFixed(1)}%`;
            
            // Calculate pass rate (60% or higher is pass based on new scale)
            const passedAssessments = scoredAssessments.filter(a => a.calculated_percentage >= 60);
            const passRate = (passedAssessments.length / scoredAssessments.length) * 100;
            console.log(`📊 Pass rate: ${passRate.toFixed(0)}% (${passedAssessments.length}/${scoredAssessments.length})`);
            
            if (this.passRateElement) this.passRateElement.textContent = `${passRate.toFixed(0)}%`;
            
            // Calculate grade distribution using new scale
            const gradeCounts = {
                distinction: scoredAssessments.filter(a => a.calculated_percentage >= 85).length,
                credit: scoredAssessments.filter(a => a.calculated_percentage >= 70 && a.calculated_percentage < 85).length,
                pass: scoredAssessments.filter(a => a.calculated_percentage >= 60 && a.calculated_percentage < 70).length,
                fail: scoredAssessments.filter(a => a.calculated_percentage < 60).length
            };
            
            console.log('📊 Grade distribution:', gradeCounts);
            
            // Update grade counts
            if (this.distinctionCountElement) this.distinctionCountElement.textContent = gradeCounts.distinction;
            if (this.creditCountElement) this.creditCountElement.textContent = gradeCounts.credit;
            if (this.passCountElement) this.passCountElement.textContent = gradeCounts.pass;
            if (this.failCountElement) this.failCountElement.textContent = gradeCounts.fail;
            
            // Update distribution bars
            const totalCount = scoredAssessments.length;
            if (totalCount > 0) {
                const distinctionBar = document.getElementById('distinction-bar');
                const creditBar = document.getElementById('credit-bar');
                const passBar = document.getElementById('pass-bar');
                const failBar = document.getElementById('fail-bar');
                
                if (distinctionBar) {
                    distinctionBar.style.width = `${(gradeCounts.distinction / totalCount) * 100}%`;
                    console.log(`📊 Distinction bar: ${(gradeCounts.distinction / totalCount) * 100}%`);
                }
                if (creditBar) {
                    creditBar.style.width = `${(gradeCounts.credit / totalCount) * 100}%`;
                    console.log(`📊 Credit bar: ${(gradeCounts.credit / totalCount) * 100}%`);
                }
                if (passBar) {
                    passBar.style.width = `${(gradeCounts.pass / totalCount) * 100}%`;
                    console.log(`📊 Pass bar: ${(gradeCounts.pass / totalCount) * 100}%`);
                }
                if (failBar) {
                    failBar.style.width = `${(gradeCounts.fail / totalCount) * 100}%`;
                    console.log(`📊 Fail bar: ${(gradeCounts.fail / totalCount) * 100}%`);
                }
            }
            
            // Get assessment dates
            const dates = assessments
                .filter(a => a.dateGraded)
                .map(a => new Date(a.dateGraded))
                .sort((a, b) => a - b);
            
            if (dates.length > 0) {
                const firstDate = dates[0];
                const latestDate = dates[dates.length - 1];
                
                console.log(`📅 First assessment: ${firstDate.toLocaleDateString()}`);
                console.log(`📅 Latest assessment: ${latestDate.toLocaleDateString()}`);
                
                if (this.firstAssessmentDateElement) {
                    this.firstAssessmentDateElement.textContent = 
                        firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
                if (this.latestAssessmentDateElement) {
                    this.latestAssessmentDateElement.textContent = 
                        latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
            }
            
            if (this.totalSubmittedElement) {
                this.totalSubmittedElement.textContent = scoredAssessments.length;
            }
            
            console.log('✅ Performance summary calculated');
        }
        
        // Update header statistics
        updateHeaderStats(current, completed) {
            console.log('📊 Updating header stats:', {current, completed});
            
            // Calculate average score for completed assessments
            const completedAssessments = this.cachedExams.filter(exam => exam.assessment_status === 'completed');
            const scoredAssessments = completedAssessments.filter(a => a.calculated_percentage !== null);
            let averageScore = '--';
            
            if (scoredAssessments.length > 0) {
                const total = scoredAssessments.reduce((sum, a) => sum + a.calculated_percentage, 0);
                averageScore = `${(total / scoredAssessments.length).toFixed(1)}%`;
                console.log(`📊 Overall average: ${averageScore} (from ${scoredAssessments.length} scored assessments)`);
            }
            
            // Update counts
            if (this.currentCountHeader) {
                this.currentCountHeader.textContent = current;
                console.log(`📊 Current count: ${current}`);
            }
            if (this.completedCountHeader) {
                this.completedCountHeader.textContent = completed;
                console.log(`📊 Completed count: ${completed}`);
            }
            if (this.overallAverageHeader) {
                this.overallAverageHeader.textContent = averageScore;
                console.log(`📊 Overall average display: ${averageScore}`);
            }
        }
        
        // Filter assessments based on selection
        filterAssessments(filterType) {
            console.log('🔍 Filtering assessments by:', filterType);
            this.currentFilter = filterType;
            
            // Get section elements
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            // Show/hide sections based on filter
            if (filterType === 'current') {
                if (currentSection) {
                    currentSection.style.display = 'block';
                    console.log('👁️ Showing current section');
                }
                if (completedSection) {
                    completedSection.style.display = 'none';
                    console.log('🙈 Hiding completed section');
                }
            } else if (filterType === 'completed') {
                if (currentSection) {
                    currentSection.style.display = 'none';
                    console.log('🙈 Hiding current section');
                }
                if (completedSection) {
                    completedSection.style.display = 'block';
                    console.log('👁️ Showing completed section');
                }
            } else {
                if (currentSection) {
                    currentSection.style.display = 'block';
                    console.log('👁️ Showing current section');
                }
                if (completedSection) {
                    completedSection.style.display = 'block';
                    console.log('👁️ Showing completed section');
                }
            }
            
            // Update button states
            const buttons = document.querySelectorAll('.quick-actions .action-btn');
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Find and activate the correct button
            let activeBtn;
            if (filterType === 'current') {
                activeBtn = document.getElementById('view-current-only');
            } else if (filterType === 'completed') {
                activeBtn = document.getElementById('view-completed-only');
            } else {
                activeBtn = document.getElementById('view-all-assessments');
            }
            
            if (activeBtn) {
                activeBtn.classList.add('active');
                console.log(`✅ Activated button: ${activeBtn.id}`);
            }
            
            // Reload assessments with new filter
            this.loadExams();
        }
        
        // Switch to current assessments
        switchToCurrentAssessments() {
            this.filterAssessments('current');
        }
        
        // Switch to completed assessments
        switchToCompletedAssessments() {
            this.filterAssessments('completed');
        }
        
        // Refresh assessments
        refreshAssessments() {
            console.log('🔄 Refreshing assessments...');
            this.loadExams();
            if (window.AppUtils && window.AppUtils.showToast) {
                AppUtils.showToast('Assessments refreshed successfully', 'success');
            }
        }
        
        // Show loading state
        showLoadingState(section) {
            console.log(`⏳ Showing loading state for ${section} section`);
            
            if (section === 'current') {
                const tableBody = this.currentAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="loading">
                            <td colspan="10">
                                <div class="loading-content">
                                    <div class="loading-spinner"></div>
                                    <p>Loading current assessments...</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            } else if (section === 'completed') {
                const tableBody = this.completedAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="loading">
                            <td colspan="11">
                                <div class="loading-content">
                                    <div class="loading-spinner"></div>
                                    <p>Loading completed assessments...</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        }
        
        // Show empty state
        showEmptyState(section) {
            console.log(`📭 Showing empty state for ${section} section`);
            
            if (section === 'current') {
                if (this.currentEmptyState) {
                    this.currentEmptyState.style.display = 'block';
                }
                if (this.currentAssessmentsTable) {
                    this.currentAssessmentsTable.innerHTML = '';
                }
                
            } else if (section === 'completed') {
                if (this.completedEmptyState) {
                    this.completedEmptyState.style.display = 'block';
                }
                if (this.completedAssessmentsTable) {
                    this.completedAssessmentsTable.innerHTML = '';
                }
            }
        }
        
        // Hide empty state
        hideEmptyState(section) {
            console.log(`🙈 Hiding empty state for ${section} section`);
            
            if (section === 'current') {
                if (this.currentEmptyState) {
                    this.currentEmptyState.style.display = 'none';
                }
            } else if (section === 'completed') {
                if (this.completedEmptyState) {
                    this.completedEmptyState.style.display = 'none';
                }
            }
        }
        
        // Show error state
        showErrorState(section, message) {
            console.error(`❌ Showing error state for ${section} section: ${message}`);
            
            if (section === 'current') {
                const tableBody = this.currentAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="error">
                            <td colspan="10">
                                <div class="error-content">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>${message}</p>
                                    <button onclick="window.examsModule?.refreshAssessments()" class="btn btn-sm btn-primary">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            } else if (section === 'completed') {
                const tableBody = this.completedAssessmentsTable;
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr class="error">
                            <td colspan="11">
                                <div class="error-content">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>${message}</p>
                                    <button onclick="window.examsModule?.refreshAssessments()" class="btn btn-sm btn-primary">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        }
        
        // Utility functions
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }
    
    // Create global instance
    let examsModule = null;
    
    // Initialize exams module
    function initExamsModule() {
        console.log('🚀 initExamsModule() called');
        console.log('=============================');
        
        try {
            examsModule = new ExamsModule();
            window.examsModule = examsModule; // Make it globally accessible
            console.log('✅ ExamsModule initialized successfully');
            console.log('=============================');
            return examsModule;
        } catch (error) {
            console.error('❌ Failed to initialize ExamsModule:', error);
            console.log('=============================');
            return null;
        }
    }
    
    // Global functions
    function loadExams() {
        console.log('🌍 Global loadExams() called');
        console.log('=============================');
        
        if (examsModule) {
            console.log('📥 Calling examsModule.loadExams()');
            examsModule.loadExams();
        } else {
            console.warn('⚠️ examsModule not initialized! Initializing now...');
            initExamsModule();
        }
    }
    
    function refreshAssessments() {
        console.log('🌍 Global refreshAssessments called');
        console.log('=============================');
        
        if (examsModule) {
            examsModule.refreshAssessments();
        } else {
            console.warn('⚠️ examsModule not initialized!');
            initExamsModule();
        }
    }
    
    function switchToCurrentAssessments() {
        console.log('🌍 Global switchToCurrentAssessments called');
        console.log('=============================');
        
        if (examsModule) {
            examsModule.switchToCurrentAssessments();
        }
    }
    
    function switchToCompletedAssessments() {
        console.log('🌍 Global switchToCompletedAssessments called');
        console.log('=============================');
        
        if (examsModule) {
            examsModule.switchToCompletedAssessments();
        }
    }
    
    // Expose to global scope
    window.ExamsModule = ExamsModule;
    window.initExamsModule = initExamsModule;
    window.loadExams = loadExams;
    window.refreshAssessments = refreshAssessments;
    window.switchToCurrentAssessments = switchToCurrentAssessments;
    window.switchToCompletedAssessments = switchToCompletedAssessments;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM fully loaded, initializing ExamsModule');
            console.log('=============================');
            initExamsModule();
        });
    } else {
        console.log('📄 DOM already loaded, initializing ExamsModule immediately');
        console.log('=============================');
        initExamsModule();
    }
})();
