// courses.js - COMPLETE FIXED VERSION
(function() {
    'use strict';
    
    console.log('✅ courses.js - Loading...');
    
    class CoursesModule {
        constructor() {
            console.log('📚 CoursesModule initialized');
            
            // Store course data
            this.allCourses = [];
            this.activeCourses = [];
            this.completedCourses = [];
            this.currentFilter = 'all';
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.loadCourses();
        }
        
        cacheElements() {
            console.log('🔍 Caching DOM elements...');
            
            // Grid and table containers
            this.activeGrid = document.getElementById('active-courses-grid');
            this.completedTable = document.getElementById('completed-courses-table');
            
            // Empty states
            this.activeEmpty = document.getElementById('active-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            
            // Count elements
            this.activeCount = document.getElementById('active-count');
            this.completedCount = document.getElementById('completed-count');
            this.completedCredits = document.getElementById('completed-credits-total');
            
            // Header stats
            this.activeHeaderCount = document.getElementById('active-courses-count');
            this.completedHeaderCount = document.getElementById('completed-courses-count');
            this.totalCreditsHeader = document.getElementById('total-credits');
            
            // Summary elements
            this.completedGPA = document.getElementById('completed-gpa');
            this.highestGrade = document.getElementById('highest-grade');
            this.averageGrade = document.getElementById('average-grade');
            this.firstCourseDate = document.getElementById('first-course-date');
            this.latestCourseDate = document.getElementById('latest-course-date');
            this.completionRate = document.getElementById('completion-rate');
            
            console.log('✅ Cached all DOM elements');
            
            // Log what we found
            console.log({
                activeGrid: !!this.activeGrid,
                completedTable: !!this.completedTable,
                activeEmpty: !!this.activeEmpty,
                completedEmpty: !!this.completedEmpty
            });
        }
        
        initializeEventListeners() {
            console.log('🔌 Setting up event listeners...');
            
            // Filter buttons
            const filterButtons = [
                { id: 'view-all-courses', filter: 'all' },
                { id: 'view-active-only', filter: 'active' },
                { id: 'view-completed-only', filter: 'completed' }
            ];
            
            filterButtons.forEach(({ id, filter }) => {
                const button = document.getElementById(id);
                if (button) {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`🔍 ${id} clicked, filter: ${filter}`);
                        this.applyFilter(filter);
                    });
                }
            });
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-courses-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🔄 Refresh button clicked');
                    this.loadCourses();
                });
            }
            
            console.log('✅ All event listeners initialized');
        }
        
        applyFilter(filterType) {
            console.log(`🔍 Applying filter: ${filterType}`);
            this.currentFilter = filterType;
            
            // Update button states
            this.updateFilterButtons();
            
            // Show/hide sections
            this.showFilteredSections();
            
            // Apply filter to data and display
            this.applyDataFilter();
        }
        
        updateFilterButtons() {
            // Get all filter buttons
            const buttons = {
                'all': document.getElementById('view-all-courses'),
                'active': document.getElementById('view-active-only'),
                'completed': document.getElementById('view-completed-only')
            };
            
            // Remove active class from all
            Object.values(buttons).forEach(button => {
                if (button) button.classList.remove('active');
            });
            
            // Add active class to current filter button
            const currentButton = buttons[this.currentFilter];
            if (currentButton) {
                currentButton.classList.add('active');
            }
        }
        
        showFilteredSections() {
            const activeSection = document.querySelector('.courses-section:not(.completed-section)');
            const completedSection = document.querySelector('.completed-section');
            
            console.log('🔍 Sections:', {
                activeSection: !!activeSection,
                completedSection: !!completedSection
            });
            
            if (!activeSection || !completedSection) return;
            
            switch(this.currentFilter) {
                case 'active':
                    activeSection.style.display = 'block';
                    completedSection.style.display = 'none';
                    break;
                case 'completed':
                    activeSection.style.display = 'none';
                    completedSection.style.display = 'block';
                    break;
                default: // 'all'
                    activeSection.style.display = 'block';
                    completedSection.style.display = 'block';
            }
        }
        
        applyDataFilter() {
            // Filter the data based on current filter
            this.activeCourses = this.allCourses.filter(course => 
                !course.isCompleted && course.status !== 'Completed'
            );
            this.completedCourses = this.allCourses.filter(course => 
                course.isCompleted || course.status === 'Completed'
            );
            
            // Apply additional filter if needed
            if (this.currentFilter === 'active') {
                this.completedCourses = [];
            } else if (this.currentFilter === 'completed') {
                this.activeCourses = [];
            }
            
            // Display the filtered data
            this.displayTables();
        }
        
        async loadCourses() {
            console.log('📥 Loading courses...');
            
            // Show loading state
            this.showLoading();
            
            try {
                // Check for required data
                if (!window.db?.currentUserProfile) {
                    throw new Error('User profile not available. Please log in again.');
                }
                
                if (!window.db?.supabase) {
                    throw new Error('Database connection not available.');
                }
                
                const userProfile = window.db.currentUserProfile;
                const program = userProfile.program || 'KRCHN';
                const intakeYear = userProfile.intake_year || 2025;
                const block = userProfile.block || 'A';
                const term = userProfile.term || 'Term 1';
                const userId = window.db.currentUserId;
                
                console.log('🎯 Loading courses for:', { program, intakeYear, block, term });
                
                const supabase = window.db.supabase;
                
                // Build query based on program type
                let query = supabase
                    .from('courses')
                    .select('*')
                    .eq('intake_year', intakeYear)
                    .order('course_name', { ascending: true });
                
                const isTVET = this.isTVETProgram(program);
                
                if (isTVET) {
                    // TVET filtering: match program AND (term OR General)
                    query = query
                        .eq('target_program', program)
                        .or(`block.eq.${term},block.eq.General,block.is.null`);
                } else {
                    // KRCHN filtering: match program OR General, AND block OR General
                    query = query
                        .or(`target_program.eq.${program},target_program.eq.General`)
                        .or(`block.eq.${block},block.is.null,block.eq.General`);
                }
                
                // Fetch courses
                const { data: courses, error } = await query;
                
                if (error) throw error;
                
                console.log(`📊 Found ${courses?.length || 0} courses`);
                
                // Process course data
                this.processCoursesData(courses || []);
                
                // Apply current filter and display
                this.applyDataFilter();
                
                // Show success message
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast('Courses loaded successfully', 'success');
                }
                
            } catch (error) {
                console.error('❌ Error loading courses:', error);
                this.showError(error.message);
                
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast('Failed to load courses: ' + error.message, 'error');
                }
            }
        }
        
        isTVETProgram(program) {
            const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                                'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
            return tvetPrograms.some(tvet => program?.toUpperCase().includes(tvet));
        }
        
        processCoursesData(courses) {
            this.allCourses = courses.map(course => {
                // Check if course is completed
                const isCompleted = course.status === 'Completed' || course.status === 'Passed';
                
                // Format dates
                const createdAt = course.created_at ? new Date(course.created_at) : null;
                const completedDate = course.completed_date ? new Date(course.completed_date) : null;
                
                return {
                    ...course,
                    isCompleted,
                    createdAt,
                    completedDate,
                    formattedCreatedAt: createdAt ? createdAt.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--',
                    formattedCompletedDate: completedDate ? completedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--'
                };
            });
            
            console.log(`✅ Processed ${this.allCourses.length} courses`);
            console.log(`📊 Active courses: ${this.allCourses.filter(c => !c.isCompleted).length}`);
            console.log(`📊 Completed courses: ${this.allCourses.filter(c => c.isCompleted).length}`);
        }
        
        displayTables() {
            // Display active courses
            this.displayActiveCourses();
            
            // Display completed courses
            this.displayCompletedCourses();
            
            // Update counts
            this.updateCounts();
            
            // Update empty states
            this.updateEmptyStates();
            
            // Update summary
            this.updateSummary();
        }
        
        displayActiveCourses() {
            if (!this.activeGrid) {
                console.error('❌ active-courses-grid element not found');
                return;
            }
            
            if (this.activeCourses.length === 0) {
                this.activeGrid.innerHTML = '';
                return;
            }
            
            const html = this.activeCourses.map(course => `
                <div class="course-card" data-course-id="${course.id}">
                    <div class="course-header">
                        <span class="course-code">${this.escapeHtml(course.unit_code || 'N/A')}</span>
                        <span class="status-badge ${course.isCompleted ? 'completed' : 'active'}">
                            ${this.escapeHtml(course.status || 'Active')}
                        </span>
                    </div>
                    <h4 class="course-title">${this.escapeHtml(course.course_name || 'Unnamed Course')}</h4>
                    <p class="course-description">${this.escapeHtml(this.truncateText(course.description || 'No description available', 120))}</p>
                    <div class="course-footer">
                        <div class="course-credits">
                            <i class="fas fa-star"></i>
                            <span>${course.credits || 3} Credits</span>
                        </div>
                        <div class="course-meta">
                            <span class="course-block">${this.escapeHtml(course.block || 'General')}</span>
                        </div>
                    </div>
                    <div class="course-actions">
                        <button class="btn btn-sm btn-outline view-materials" onclick="window.coursesModule.viewCourseMaterials('${course.id}')">
                            <i class="fas fa-file-alt"></i> Materials
                        </button>
                        <button class="btn btn-sm btn-primary view-schedule" onclick="window.coursesModule.viewCourseSchedule('${course.id}')">
                            <i class="fas fa-calendar"></i> Schedule
                        </button>
                    </div>
                </div>
            `).join('');
            
            this.activeGrid.innerHTML = html;
        }
        
        displayCompletedCourses() {
            if (!this.completedTable) {
                console.error('❌ completed-courses-table element not found');
                return;
            }
            
            if (this.completedCourses.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }
            
            const html = this.completedCourses.map(course => {
                return `
                    <tr>
                        <td>
                            <strong>${this.escapeHtml(course.course_name || 'Unnamed Course')}</strong>
                            ${course.description ? `<br><small class="text-muted">${this.escapeHtml(this.truncateText(course.description, 80))}</small>` : ''}
                        </td>
                        <td><code>${this.escapeHtml(course.unit_code || 'N/A')}</code></td>
                        <td class="text-center">${course.credits || 3}</td>
                        <td class="text-center">${this.escapeHtml(course.block || 'General')}</td>
                        <td>${course.formattedCompletedDate}</td>
                        <td class="text-center">
                            <span class="status-badge completed">
                                <i class="fas fa-check-circle"></i> ${this.escapeHtml(course.status || 'Completed')}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        updateCounts() {
            // Update section counts
            if (this.activeCount) {
                this.activeCount.textContent = `${this.activeCourses.length} course${this.activeCourses.length !== 1 ? 's' : ''}`;
            }
            
            if (this.completedCount) {
                this.completedCount.textContent = `${this.completedCourses.length} course${this.completedCourses.length !== 1 ? 's' : ''}`;
            }
            
            // Update header counts
            if (this.activeHeaderCount) {
                this.activeHeaderCount.textContent = this.activeCourses.length;
            }
            
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = this.completedCourses.length;
            }
            
            // Calculate and update credits
            const totalCredits = this.allCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
            const completedCredits = this.completedCourses.reduce((sum, course) => sum + (course.credits || 0), 0);
            
            if (this.totalCreditsHeader) {
                this.totalCreditsHeader.textContent = totalCredits;
            }
            
            if (this.completedCredits) {
                this.completedCredits.textContent = `${completedCredits} credit${completedCredits !== 1 ? 's' : ''} earned`;
            }
        }
        
        updateEmptyStates() {
            if (this.activeEmpty) {
                this.activeEmpty.style.display = this.activeCourses.length === 0 ? 'block' : 'none';
            }
            
            if (this.completedEmpty) {
                this.completedEmpty.style.display = this.completedCourses.length === 0 ? 'block' : 'none';
            }
        }
        
        updateSummary() {
            if (this.completedCourses.length === 0) {
                // Reset all summary values
                if (this.completedGPA) this.completedGPA.textContent = '--';
                if (this.highestGrade) this.highestGrade.textContent = '--';
                if (this.averageGrade) this.averageGrade.textContent = '--';
                if (this.firstCourseDate) this.firstCourseDate.textContent = '--';
                if (this.latestCourseDate) this.latestCourseDate.textContent = '--';
                if (this.completionRate) this.completionRate.textContent = '0%';
                return;
            }
            
            // Get completion dates
            const dates = this.completedCourses
                .filter(c => c.completedDate || c.createdAt)
                .map(c => c.completedDate || c.createdAt)
                .sort((a, b) => a - b);
            
            if (dates.length > 0) {
                const firstDate = dates[0];
                const latestDate = dates[dates.length - 1];
                
                if (this.firstCourseDate) {
                    this.firstCourseDate.textContent = firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
                
                if (this.latestCourseDate) {
                    this.latestCourseDate.textContent = latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
            }
            
            // Since we don't have grades
            if (this.completedGPA) this.completedGPA.textContent = '--';
            if (this.highestGrade) this.highestGrade.textContent = '--';
            if (this.averageGrade) this.averageGrade.textContent = '--';
            
            // Calculate completion rate
            if (this.completionRate) {
                const totalExpectedCourses = this.allCourses.length || 1;
                const completionRate = Math.round((this.completedCourses.length / totalExpectedCourses) * 100);
                this.completionRate.textContent = `${completionRate}%`;
            }
        }
        
        viewCourseMaterials(courseId) {
            const course = this.allCourses.find(c => c.id === courseId);
            if (course) {
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast(`Opening materials for ${course.course_name}`, 'info');
                }
                // In real app, this would open a modal or navigate to materials page
            }
        }
        
        viewCourseSchedule(courseId) {
            const course = this.allCourses.find(c => c.id === courseId);
            if (course) {
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast(`Viewing schedule for ${course.course_name}`, 'info');
                }
                // In real app, this would open a modal with schedule
            }
        }
        
        showLoading() {
            // Show loading in active grid
            if (this.activeGrid) {
                this.activeGrid.innerHTML = `
                    <div class="course-card loading">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading courses...</p>
                        </div>
                    </div>
                `;
            }
            
            // Show loading in completed table
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr class="loading">
                        <td colspan="6">
                            <div class="loading-content">
                                <div class="loading-spinner"></div>
                                <p>Loading courses...</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
        
        showError(message) {
            // Show error in active grid
            if (this.activeGrid) {
                this.activeGrid.innerHTML = `
                    <div class="course-card error">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="window.coursesModule.loadCourses()" class="btn btn-sm btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Show error in completed table
            if (this.completedTable) {
                this.completedTable.innerHTML = `
                    <tr class="error">
                        <td colspan="6">
                            <div class="error-content">
                                <i class="fas fa-exclamation-circle"></i>
                                <p>${message}</p>
                                <button onclick="window.coursesModule.loadCourses()" class="btn btn-sm btn-primary">
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
        
        truncateText(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        // Public methods
        refresh() {
            console.log('🔄 Manual refresh requested');
            this.loadCourses();
        }
    }
    
    // Create global instance
    window.coursesModule = new CoursesModule();
    
    // Global functions for backward compatibility
    window.loadCourses = () => {
        console.log('🌍 Global loadCourses() called');
        if (window.coursesModule) {
            window.coursesModule.refresh();
        }
    };
    
    window.refreshCourses = () => {
        console.log('🌍 Global refreshCourses() called');
        if (window.coursesModule) {
            window.coursesModule.refresh();
        }
    };
    
    window.switchToActiveCourses = () => {
        console.log('🌍 Global switchToActiveCourses() called');
        if (window.coursesModule) {
            window.coursesModule.applyFilter('active');
        }
    };
    
    window.switchToCompletedCourses = () => {
        console.log('🌍 Global switchToCompletedCourses() called');
        if (window.coursesModule) {
            window.coursesModule.applyFilter('completed');
        }
    };
    
    window.switchToAllCourses = () => {
        console.log('🌍 Global switchToAllCourses() called');
        if (window.coursesModule) {
            window.coursesModule.applyFilter('all');
        }
    };
    
    window.filterCourses = (filterType) => {
        if (window.coursesModule) {
            window.coursesModule.applyFilter(filterType);
        }
    };
    
    console.log('✅ Courses module ready!');
})();
