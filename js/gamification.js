// gamification.js - COMPLETE FIXED VERSION
// ✅ No duplicate streak display
// ✅ Total points synced with dashboard
// ✅ NurseIQ properly integrated
// ✅ Database total_points updated

(function() {
    'use strict';
    
    console.log('🏆 Gamification module loading (COMPLETE FIXED VERSION)...');
    
    class GamificationModule {
        constructor() {
            this.userId = null;
            this.userProfile = null;
            this.streak = 0;
            this.attendancePoints = 0;
            this.level = 1;
            this.xp = 0;
            this.xpToNextLevel = 100;
            this.badges = [];
            this.lastCheckIn = null;
            this.currentRankFilter = 'weekly';
            this.nurseiqPoints = 0;
            this.nurseiqAttempts = [];
            this.totalPoints = 0;
            this.loginPoints = 0;
            this.loginCount = 0;
            
            // Badge definitions
            this.badgeDefinitions = {
                first_checkin: {
                    id: 'first_checkin',
                    name: 'First Step',
                    description: 'Complete your first attendance check-in',
                    icon: 'fa-calendar-check',
                    points: 10
                },
                streak_5: {
                    id: 'streak_5',
                    name: 'On Fire!',
                    description: '5-day attendance streak',
                    icon: 'fa-fire',
                    points: 50
                },
                streak_10: {
                    id: 'streak_10',
                    name: 'Unstoppable',
                    description: '10-day attendance streak',
                    icon: 'fa-bolt',
                    points: 100
                },
                streak_30: {
                    id: 'streak_30',
                    name: 'Legendary',
                    description: '30-day attendance streak',
                    icon: 'fa-crown',
                    points: 500
                },
                perfect_week: {
                    id: 'perfect_week',
                    name: 'Perfect Week',
                    description: 'Attend all sessions in a week',
                    icon: 'fa-calendar-week',
                    points: 100
                },
                course_master: {
                    id: 'course_master',
                    name: 'Course Master',
                    description: 'Complete all units in a course',
                    icon: 'fa-graduation-cap',
                    points: 200
                },
                quiz_champion: {
                    id: 'quiz_champion',
                    name: 'Quiz Champion',
                    description: 'Score 100% on any quiz',
                    icon: 'fa-brain',
                    points: 50
                },
                nurseiq_master: {
                    id: 'nurseiq_master',
                    name: 'NurseIQ Master',
                    description: 'Complete 50 NurseIQ questions',
                    icon: 'fa-stethoscope',
                    points: 100
                },
                nurseiq_perfect: {
                    id: 'nurseiq_perfect',
                    name: 'Perfect Practice',
                    description: 'Score 100% on a NurseIQ test',
                    icon: 'fa-heartbeat',
                    points: 75
                },
                early_bird: {
                    id: 'early_bird',
                    name: 'Early Bird',
                    description: 'Check in before 8 AM',
                    icon: 'fa-sun',
                    points: 20
                },
                night_owl: {
                    id: 'night_owl',
                    name: 'Night Owl',
                    description: 'Check in after 6 PM',
                    icon: 'fa-moon',
                    points: 20
                }
            };
            
            this.init();
        }
        
        async init() {
            await this.waitForUser();
            await this.loadUserGamificationData();
            await this.loadNurseIQData();
            await this.loadLoginData();
            this.calculateTotalPoints();
            this.setupEventListeners();
            this.updateAllUI();
            await this.loadLeaderboard();
            
            console.log(`✅ Gamification ready: Level ${this.level}, ${this.totalPoints} total points, ${this.streak} day streak`);
            console.log(`📚 NurseIQ: ${this.nurseiqPoints} points from ${this.nurseiqAttempts.length} attempts`);
            console.log(`🔑 Login: ${this.loginCount} logins, ${this.loginPoints} points`);
        }
        
        async waitForUser() {
            return new Promise((resolve) => {
                if (window.db?.currentUserId) {
                    this.userId = window.db.currentUserId;
                    this.userProfile = window.db.currentUserProfile;
                    resolve();
                    return;
                }
                
                const checkInterval = setInterval(() => {
                    if (window.db?.currentUserId) {
                        this.userId = window.db.currentUserId;
                        this.userProfile = window.db.currentUserProfile;
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 500);
                
                setTimeout(() => clearInterval(checkInterval), 10000);
            });
        }
        
        // ============================================================
        // 📊 CALCULATE TOTAL POINTS - FIXED!
        // ============================================================
        
        calculateTotalPoints() {
            // Sum all sources
            this.totalPoints = (this.attendancePoints || 0) + 
                               (this.nurseiqPoints || 0) + 
                               (this.loginPoints || 0);
            
            // Also include any bonus points from badges
            let badgeBonus = 0;
            for (const badge of this.badges) {
                const def = this.badgeDefinitions[badge.id];
                if (def) badgeBonus += def.points;
            }
            // Badge points are already included in attendancePoints when awarded
            
            console.log(`💰 Total points: ${this.totalPoints} (Attendance: ${this.attendancePoints}, NurseIQ: ${this.nurseiqPoints}, Login: ${this.loginPoints})`);
            return this.totalPoints;
        }
        
        // ============================================================
        // 🔑 LOAD LOGIN DATA
        // ============================================================
        
        async loadLoginData() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                const { data, error } = await window.db.supabase
                    .from('consolidated_user_profiles_table')
                    .select('login_count, total_points')
                    .eq('user_id', this.userId)
                    .single();
                
                if (data && !error) {
                    this.loginCount = data.login_count || 0;
                    this.loginPoints = this.loginCount * 10;
                    
                    // If total_points exists in DB, use it
                    if (data.total_points) {
                        this.totalPoints = data.total_points;
                    }
                }
            } catch (error) {
                console.warn('Could not load login data:', error);
                this.loginCount = 0;
                this.loginPoints = 0;
            }
        }
        
        // ============================================================
        // 📚 LOAD NURSEIQ DATA - FIXED!
        // ============================================================
        
        async loadNurseIQData() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                // Get NurseIQ attempts
                const { data: attempts, error } = await window.db.supabase
                    .from('nurseiq_attempts')
                    .select('*')
                    .eq('student_id', this.userId)
                    .order('completed_at', { ascending: false });
                
                if (error) throw error;
                
                this.nurseiqAttempts = attempts || [];
                
                let totalNurseIQPoints = 0;
                let totalQuestions = 0;
                let perfectScores = 0;
                
                for (const attempt of this.nurseiqAttempts) {
                    const scorePercent = (attempt.score / attempt.total_questions) * 100;
                    
                    // Points per attempt based on score
                    if (scorePercent >= 90) {
                        totalNurseIQPoints += 30;
                    } else if (scorePercent >= 70) {
                        totalNurseIQPoints += 20;
                    } else if (scorePercent >= 50) {
                        totalNurseIQPoints += 10;
                    } else {
                        totalNurseIQPoints += 5;
                    }
                    
                    totalQuestions += attempt.total_questions || 0;
                    
                    if (scorePercent === 100) {
                        perfectScores++;
                    }
                }
                
                // Bonus for reaching milestones
                if (totalQuestions >= 50) {
                    if (!this.hasBadge('nurseiq_master')) {
                        await this.unlockBadge('nurseiq_master');
                    }
                    totalNurseIQPoints += 100;
                }
                
                if (perfectScores >= 3) {
                    if (!this.hasBadge('nurseiq_perfect')) {
                        await this.unlockBadge('nurseiq_perfect');
                    }
                    totalNurseIQPoints += 75;
                }
                
                this.nurseiqPoints = totalNurseIQPoints;
                
                console.log(`📊 NurseIQ: ${this.nurseiqPoints} points from ${this.nurseiqAttempts.length} attempts`);
                
            } catch (error) {
                console.error('Error loading NurseIQ data:', error);
                this.nurseiqPoints = 0;
                this.nurseiqAttempts = [];
            }
        }
        
        // ============================================================
        // 👤 LOAD USER GAMIFICATION DATA
        // ============================================================
        
        async loadUserGamificationData() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                const { data, error } = await window.db.supabase
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', this.userId)
                    .single();
                
                if (data && !error) {
                    this.attendancePoints = data.gamification_points || 0;
                    this.streak = data.attendance_streak || 0;
                    this.level = data.gamification_level || 1;
                    this.xp = data.gamification_xp || 0;
                    this.badges = data.earned_badges || [];
                    this.lastCheckIn = data.last_check_in ? new Date(data.last_check_in) : null;
                    this.totalPoints = data.total_points || 0;
                    
                    if (!this.userProfile) this.userProfile = data;
                    
                    // Update xpToNextLevel based on level
                    this.xpToNextLevel = Math.floor(100 * Math.pow(1.2, this.level - 1));
                } else {
                    await this.createGamificationRecord();
                }
                
                await this.checkStreakContinuity();
                
            } catch (error) {
                console.log('Loading gamification data:', error.message);
                await this.createGamificationRecord();
            }
        }
        
        async createGamificationRecord() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                const { data: existing } = await window.db.supabase
                    .from('consolidated_user_profiles_table')
                    .select('user_id')
                    .eq('user_id', this.userId)
                    .single();
                
                if (!existing) {
                    const { error } = await window.db.supabase
                        .from('consolidated_user_profiles_table')
                        .insert([{
                            user_id: this.userId,
                            gamification_points: 0,
                            attendance_streak: 0,
                            gamification_level: 1,
                            gamification_xp: 0,
                            earned_badges: [],
                            total_checkins: 0,
                            nurseiq_points: 0,
                            total_nurseiq_attempts: 0,
                            total_points: 0,
                            login_count: 0,
                            created_at: new Date().toISOString()
                        }]);
                    
                    if (error) throw error;
                    console.log('✅ Created new gamification record');
                }
                
            } catch (error) {
                console.error('Error creating gamification record:', error);
            }
        }
        
        async checkStreakContinuity() {
            if (!this.lastCheckIn) return;
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const lastDateStr = this.lastCheckIn.toDateString();
            const todayStr = today.toDateString();
            const yesterdayStr = yesterday.toDateString();
            
            if (lastDateStr === todayStr) {
                return;
            } else if (lastDateStr !== yesterdayStr) {
                if (this.streak > 0) {
                    console.log(`💔 Streak broken at ${this.streak} days`);
                }
                this.streak = 0;
                await this.saveToDatabase();
            }
        }
        
        // ============================================================
        // 💾 SAVE TO DATABASE - FIXED!
        // ============================================================
        
        async saveToDatabase() {
            if (!this.userId || !window.db?.supabase) return;
            
            // Recalculate total points
            this.calculateTotalPoints();
            
            try {
                const { error } = await window.db.supabase
                    .from('consolidated_user_profiles_table')
                    .update({
                        gamification_points: this.attendancePoints,
                        attendance_streak: this.streak,
                        gamification_level: this.level,
                        gamification_xp: this.xp,
                        earned_badges: this.badges,
                        last_check_in: this.lastCheckIn ? this.lastCheckIn.toISOString() : null,
                        nurseiq_points: this.nurseiqPoints,
                        total_nurseiq_attempts: this.nurseiqAttempts.length,
                        total_points: this.totalPoints, // ✅ Store total points
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', this.userId);
                
                if (error) throw error;
                
                console.log(`💾 Saved: ${this.totalPoints} total points`);
                
            } catch (error) {
                console.error('Error saving to database:', error);
            }
        }
        
        // ============================================================
        // 🔧 INJECT UI - NO DUPLICATE STREAK
        // ============================================================
        
        injectGamificationUI() {
            // ✅ Streak is handled by dashboard - skip here
            // Only add level progress and badges
            
            this.addLevelProgressBar();
            this.addBadgesSection();
            this.addLeaderboardSection();
        }
        
        addLevelProgressBar() {
            // Check if welcome card exists
            const welcomeCard = document.querySelector('.welcome-card, .welcome-section, #welcome-section');
            if (!welcomeCard) {
                // Try to find a good insertion point
                const mainContent = document.querySelector('.main, #main-content, .tab-content.active');
                if (!mainContent) return;
            }
            
            // Check if already exists
            if (document.querySelector('.level-progress-container')) return;
            
            const totalPoints = this.totalPoints || this.calculateTotalPoints();
            const percent = this.xpToNextLevel > 0 ? (this.xp / this.xpToNextLevel) * 100 : 0;
            
            const progressContainer = document.createElement('div');
            progressContainer.className = 'level-progress-container';
            progressContainer.id = 'level-progress-container';
            progressContainer.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 12px 20px;
                margin: 10px 0 16px 0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                border: 1px solid #e5e7eb;
            `;
            progressContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="background: #4C1D95; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas fa-trophy" style="font-size: 16px;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #0A3D62; font-size: 14px;">Level ${this.level}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${this.xp}/${this.xpToNextLevel} XP</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 12px; color: #475569;">
                            <i class="fas fa-fire" style="color: #f59e0b;"></i> ${this.streak} day streak
                        </span>
                        <span style="font-size: 12px; color: #475569;">
                            <i class="fas fa-stethoscope" style="color: #4C1D95;"></i> ${this.nurseiqPoints} pts
                        </span>
                        <span style="font-size: 12px; color: #475569;">
                            <i class="fas fa-calendar-check" style="color: #059669;"></i> ${this.attendancePoints} pts
                        </span>
                        <span style="font-size: 14px; font-weight: 700; color: #4C1D95;">
                            🏆 ${totalPoints} pts
                        </span>
                    </div>
                </div>
                <div class="level-progress-bar" style="margin-top: 8px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
                    <div class="level-progress-fill" id="level-progress-fill" style="width: ${Math.min(percent, 100)}%; height: 100%; background: linear-gradient(90deg, #4C1D95, #7c3aed); border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>
            `;
            
            // Insert after welcome card or at top of content
            const target = welcomeCard || document.querySelector('.tab-content.active > *:first-child');
            if (target) {
                target.parentNode.insertBefore(progressContainer, target.nextSibling);
            } else {
                document.querySelector('.tab-content.active')?.prepend(progressContainer);
            }
        }
        
        addBadgesSection() {
            // Find a good insertion point
            const targetSection = document.querySelector('.cards-grid, .stats-grid, .dashboard-grid');
            if (!targetSection) return;
            
            if (document.querySelector('.badges-section')) return;
            
            const badgesSection = document.createElement('div');
            badgesSection.className = 'badges-section';
            badgesSection.id = 'badges-section';
            badgesSection.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 16px 20px;
                margin: 16px 0;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            `;
            badgesSection.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: #0A3D62; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-medal" style="color: #FDB913;"></i> Your Achievements
                        <span style="font-size: 11px; font-weight: 400; color: #94a3b8; background: #f1f5f9; padding: 2px 10px; border-radius: 12px;">
                            ${this.badges.length} unlocked
                        </span>
                    </h4>
                    <button class="view-all-badges" id="view-all-badges" style="background: none; border: none; color: #4C1D95; font-weight: 600; font-size: 13px; cursor: pointer;">
                        View All <i class="fas fa-arrow-right" style="font-size: 11px;"></i>
                    </button>
                </div>
                <div class="badges-grid" id="badges-grid" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${this.renderBadges()}
                </div>
            `;
            
            targetSection.parentNode.insertBefore(badgesSection, targetSection.nextSibling);
            
            const viewAllBtn = document.getElementById('view-all-badges');
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => this.showAllBadges());
            }
        }
        
        renderBadges() {
            const allBadges = Object.values(this.badgeDefinitions);
            const unlocked = this.badges.map(b => b.id);
            
            // Show first 6 badges (all unlocked + some locked)
            const displayBadges = [];
            const unlockedBadges = allBadges.filter(b => unlocked.includes(b.id));
            const lockedBadges = allBadges.filter(b => !unlocked.includes(b.id));
            
            // Show all unlocked, then fill with locked
            displayBadges.push(...unlockedBadges);
            const remaining = 6 - displayBadges.length;
            if (remaining > 0) {
                displayBadges.push(...lockedBadges.slice(0, remaining));
            }
            
            return displayBadges.map(badge => {
                const isUnlocked = unlocked.includes(badge.id);
                return `
                    <div class="badge-item" style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        background: ${isUnlocked ? '#f8fafc' : '#f1f5f9'};
                        padding: 8px 14px;
                        border-radius: 8px;
                        border: 1px solid ${isUnlocked ? '#c4b5fd' : '#e5e7eb'};
                        opacity: ${isUnlocked ? '1' : '0.6'};
                        cursor: ${isUnlocked ? 'default' : 'not-allowed'};
                    ">
                        <div style="
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            background: ${isUnlocked ? '#4C1D95' : '#94a3b8'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 14px;
                            flex-shrink: 0;
                        ">
                            <i class="fas ${isUnlocked ? badge.icon : 'fa-lock'}"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 12px; font-weight: 600; color: ${isUnlocked ? '#0A3D62' : '#94a3b8'};">
                                ${isUnlocked ? badge.name : '🔒 ' + badge.name}
                            </div>
                            ${isUnlocked ? `<div style="font-size: 10px; color: #6b7280;">+${badge.points} pts</div>` : ''}
                        </div>
                        ${isUnlocked ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : ''}
                    </div>
                `;
            }).join('');
        }
        
        addLeaderboardSection() {
            // Find insertion point
            const badgesSection = document.querySelector('.badges-section');
            if (!badgesSection) return;
            if (document.querySelector('.leaderboard-section')) return;
            
            const leaderboardSection = document.createElement('div');
            leaderboardSection.className = 'leaderboard-section';
            leaderboardSection.id = 'leaderboard-section';
            leaderboardSection.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 16px 20px;
                margin: 16px 0;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            `;
            leaderboardSection.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h4 style="margin: 0; color: #0A3D62; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-ranking-star" style="color: #FDB913;"></i> Class Leaderboard
                    </h4>
                    <div class="leaderboard-tabs" style="display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: 8px;">
                        <button class="leaderboard-tab active" data-rank="weekly" style="padding: 4px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: #4C1D95; color: white;">Weekly</button>
                        <button class="leaderboard-tab" data-rank="monthly" style="padding: 4px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: transparent; color: #64748b;">Monthly</button>
                        <button class="leaderboard-tab" data-rank="alltime" style="padding: 4px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: transparent; color: #64748b;">All Time</button>
                    </div>
                </div>
                <div class="leaderboard-list" id="leaderboard-list">
                    <div style="text-align: center; padding: 20px; color: #94a3b8;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p style="margin: 8px 0 0 0;">Loading leaderboard...</p>
                    </div>
                </div>
            `;
            
            badgesSection.insertAdjacentElement('afterend', leaderboardSection);
            
            // Setup tab switching
            const tabs = leaderboardSection.querySelectorAll('.leaderboard-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => {
                        t.style.background = 'transparent';
                        t.style.color = '#64748b';
                        t.style.fontWeight = '500';
                    });
                    tab.style.background = '#4C1D95';
                    tab.style.color = 'white';
                    tab.style.fontWeight = '600';
                    
                    this.currentRankFilter = tab.getAttribute('data-rank');
                    this.loadLeaderboard();
                });
            });
        }
        
        // ============================================================
        // 🎯 EVENT LISTENERS
        // ============================================================
        
        setupEventListeners() {
            document.addEventListener('attendanceRecorded', (e) => {
                console.log('🎯 Attendance recorded, awarding points...');
                this.handleAttendance(e.detail);
            });
            
            document.addEventListener('courseCompleted', (e) => {
                this.handleCourseComplete(e.detail);
            });
            
            document.addEventListener('quizCompleted', (e) => {
                this.handleQuizComplete(e.detail);
            });
            
            document.addEventListener('unitRegistrationComplete', (e) => {
                this.addPoints(5, 'Registered for a unit');
            });
            
            document.addEventListener('nurseiqTestCompleted', async (e) => {
                console.log('📚 NurseIQ test completed, updating points...');
                await this.loadNurseIQData();
                await this.calculateTotalPoints();
                await this.saveToDatabase();
                this.updateUI();
                await this.loadLeaderboard();
                this.showNotification('NurseIQ Update!', `You earned ${e.detail.points || 0} points from your practice!`, 'points');
            });
            
            // Listen for login events to update login points
            document.addEventListener('loginRecorded', async () => {
                await this.loadLoginData();
                await this.calculateTotalPoints();
                await this.saveToDatabase();
                this.updateUI();
            });
        }
        
        // ============================================================
        // 🎯 HANDLE ATTENDANCE
        // ============================================================
        
        async handleAttendance(detail) {
            const now = new Date();
            const hour = now.getHours();
            
            const points = detail.isVerified ? 10 : 5;
            await this.addPoints(points, `Attendance check-in${detail.isVerified ? ' (Verified)' : ''}`);
            await this.updateStreak();
            
            if (hour < 8) {
                await this.unlockBadge('early_bird');
                await this.addPoints(20, 'Early Bird Bonus!');
            } else if (hour >= 18) {
                await this.unlockBadge('night_owl');
                await this.addPoints(20, 'Night Owl Bonus!');
            }
            
            if (!this.hasBadge('first_checkin')) {
                await this.unlockBadge('first_checkin');
            }
        }
        
        async updateStreak() {
            const today = new Date();
            const todayStr = today.toDateString();
            const lastCheckStr = this.lastCheckIn ? this.lastCheckIn.toDateString() : null;
            
            if (lastCheckStr === todayStr) return;
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            if (lastCheckStr === yesterdayStr) {
                this.streak++;
            } else {
                this.streak = 1;
            }
            
            this.lastCheckIn = today;
            
            if (this.streak === 5) {
                await this.unlockBadge('streak_5');
                await this.addPoints(50, '5-Day Streak Bonus!');
            } else if (this.streak === 10) {
                await this.unlockBadge('streak_10');
                await this.addPoints(100, '10-Day Streak Bonus!');
            } else if (this.streak === 30) {
                await this.unlockBadge('streak_30');
                await this.addPoints(500, '30-Day Streak Bonus!');
            }
            
            await this.saveToDatabase();
            this.updateUI();
        }
        
        async handleCourseComplete(detail) {
            await this.unlockBadge('course_master');
            await this.addPoints(200, `Completed: ${detail.courseName}`);
        }
        
        async handleQuizComplete(detail) {
            if (detail.score === 100) {
                await this.unlockBadge('quiz_champion');
                await this.addPoints(50, 'Perfect Quiz Score!');
            }
            await this.addPoints(detail.points || 10, `Quiz: ${detail.quizName}`);
        }
        
        // ============================================================
        // ➕ ADD POINTS
        // ============================================================
        
        async addPoints(amount, reason) {
            this.attendancePoints += amount;
            this.xp += amount;
            
            while (this.xp >= this.xpToNextLevel) {
                this.xp -= this.xpToNextLevel;
                this.level++;
                this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2);
                this.showNotification('Level Up!', `Congratulations! You reached Level ${this.level}!`, 'levelup');
            }
            
            await this.calculateTotalPoints();
            await this.saveToDatabase();
            this.updateUI();
            this.showNotification('Points Earned!', `+${amount} points - ${reason}`, 'points');
            this.updateDashboardStats();
        }
        
        async unlockBadge(badgeId) {
            const badge = this.badgeDefinitions[badgeId];
            if (!badge) return;
            if (this.hasBadge(badgeId)) return;
            
            this.badges.push({
                id: badgeId,
                name: badge.name,
                unlockedAt: new Date().toISOString()
            });
            
            await this.addPoints(badge.points, `Unlocked badge: ${badge.name}`);
            await this.saveToDatabase();
            this.updateBadgesDisplay();
            this.showNotification('Badge Unlocked!', `You earned the "${badge.name}" badge!`, 'badge', badge.icon);
        }
        
        hasBadge(badgeId) {
            return this.badges.some(b => b.id === badgeId);
        }
        
        // ============================================================
        // 🎨 UPDATE UI
        // ============================================================
        
        updateAllUI() {
            this.updateUI();
            this.updateBadgesDisplay();
        }
        
        updateUI() {
            this.calculateTotalPoints();
            
            // Update progress bar
            const progressFill = document.getElementById('level-progress-fill');
            const progressContainer = document.getElementById('level-progress-container');
            
            if (progressFill) {
                const percent = this.xpToNextLevel > 0 ? (this.xp / this.xpToNextLevel) * 100 : 0;
                progressFill.style.width = `${Math.min(percent, 100)}%`;
            }
            
            // Update level text in progress container
            if (progressContainer) {
                const levelText = progressContainer.querySelector('.level-text');
                if (levelText) {
                    levelText.textContent = `Level ${this.level} · ${this.xp}/${this.xpToNextLevel} XP`;
                }
                
                // Update points display
                const pointsDisplay = progressContainer.querySelector('.points-display');
                if (pointsDisplay) {
                    pointsDisplay.textContent = this.totalPoints;
                }
            }
        }
        
        updateBadgesDisplay() {
            const badgesGrid = document.getElementById('badges-grid');
            if (!badgesGrid) return;
            
            // Re-render badges
            badgesGrid.innerHTML = this.renderBadges();
            
            // Update badge count
            const badgeCount = document.querySelector('.badges-section .badge-count');
            if (badgeCount) {
                badgeCount.textContent = `${this.badges.length} unlocked`;
            }
        }
        
        // ============================================================
        // 🏆 LEADERBOARD - FIXED WITH TOTAL POINTS
        // ============================================================
        
        async loadLeaderboard() {
            const leaderboardList = document.getElementById('leaderboard-list');
            if (!leaderboardList) return;
            
            leaderboardList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #94a3b8;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p style="margin: 8px 0 0 0;">Loading students...</p>
                </div>
            `;
            
            if (!window.db?.supabase) return;
            
            try {
                const { data, error } = await window.db.supabase
                    .from('consolidated_user_profiles_table')
                    .select(`
                        user_id, 
                        full_name, 
                        gamification_points, 
                        attendance_streak, 
                        gamification_level,
                        nurseiq_points,
                        total_nurseiq_attempts,
                        total_points,
                        role,
                        program,
                        block
                    `)
                    .eq('role', 'student')
                    .order('total_points', { ascending: false })
                    .limit(10);
                
                if (error) throw error;
                
                if (!data || data.length === 0) {
                    leaderboardList.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #94a3b8;">
                            <i class="fas fa-chart-line" style="font-size: 40px; display: block; margin-bottom: 12px; color: #d1d5db;"></i>
                            <p style="font-weight: 600; margin: 0;">No students on leaderboard yet</p>
                            <p style="font-size: 13px; margin: 4px 0 0 0;">Start using the system to see your name here!</p>
                        </div>
                    `;
                    return;
                }
                
                let html = '';
                data.forEach((item, index) => {
                    let rankIcon = '';
                    let rankClass = '';
                    if (index === 0) { rankIcon = '👑'; rankClass = 'gold'; }
                    else if (index === 1) { rankIcon = '🥈'; rankClass = 'silver'; }
                    else if (index === 2) { rankIcon = '🥉'; rankClass = 'bronze'; }
                    else { rankIcon = `${index + 1}`; rankClass = ''; }
                    
                    const name = item.full_name || 'Student';
                    const nameParts = name.split(' ');
                    let avatar = '';
                    if (nameParts.length >= 2) {
                        avatar = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
                    } else {
                        avatar = name.substring(0, 2).toUpperCase();
                    }
                    
                    const totalPoints = item.total_points || (item.gamification_points || 0) + (item.nurseiq_points || 0);
                    
                    html += `
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            padding: 10px 14px;
                            border-bottom: 1px solid #f1f5f9;
                            ${item.user_id === this.userId ? 'background: #ede9fe; border-left: 3px solid #4C1D95;' : ''}
                        ">
                            <div style="
                                font-weight: 700;
                                font-size: 16px;
                                min-width: 32px;
                                text-align: center;
                                ${rankClass === 'gold' ? 'color: #f59e0b;' : ''}
                                ${rankClass === 'silver' ? 'color: #9ca3af;' : ''}
                                ${rankClass === 'bronze' ? 'color: #d97706;' : ''}
                            ">${rankIcon}</div>
                            
                            <div style="
                                width: 32px;
                                height: 32px;
                                border-radius: 50%;
                                background: #4C1D95;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: 700;
                                font-size: 12px;
                                flex-shrink: 0;
                            ">${avatar}</div>
                            
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; color: #1e293b; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                                    ${this.escapeHtml(name)}
                                    ${item.user_id === this.userId ? '<span style="font-size: 9px; background: #4C1D95; color: white; padding: 1px 8px; border-radius: 10px;">You</span>' : ''}
                                    ${item.program ? `<span style="font-size: 9px; background: #f1f5f9; color: #64748b; padding: 1px 8px; border-radius: 10px;">${item.program.substring(0, 3)}</span>` : ''}
                                </div>
                                <div style="font-size: 10px; color: #94a3b8; display: flex; gap: 8px; flex-wrap: wrap;">
                                    <span>🔥 ${item.attendance_streak || 0} day streak</span>
                                    <span>🏆 Level ${item.gamification_level || 1}</span>
                                    ${item.total_nurseiq_attempts > 0 ? `<span>🩺 ${item.total_nurseiq_attempts} tests</span>` : ''}
                                </div>
                            </div>
                            
                            <div style="text-align: right; flex-shrink: 0;">
                                <div style="font-weight: 700; color: #4C1D95; font-size: 16px;">${totalPoints}</div>
                                <div style="font-size: 8px; color: #94a3b8;">
                                    🎓 ${item.gamification_points || 0} + 🩺 ${item.nurseiq_points || 0}
                                </div>
                            </div>
                            
                            ${index === 0 ? '<span style="font-size: 11px; color: #f59e0b; background: #fef3c7; padding: 2px 10px; border-radius: 12px; font-weight: 600;">🏆 Top</span>' : ''}
                        </div>
                    `;
                });
                
                // Add footer with info
                html += `
                    <div style="padding: 8px 14px; background: #f8fafc; border-top: 1px solid #e5e7eb; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
                        <span>💡 Points = Attendance + NurseIQ + Login Bonus + Badges</span>
                        <span>🏆 Showing top ${data.length} students</span>
                    </div>
                `;
                
                leaderboardList.innerHTML = html;
                
            } catch (error) {
                console.error('Error loading leaderboard:', error);
                leaderboardList.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #94a3b8;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 30px; display: block; margin-bottom: 8px;"></i>
                        <p style="margin: 0;">Error loading leaderboard</p>
                        <p style="font-size: 12px; margin: 4px 0 0 0;">Please refresh the page</p>
                    </div>
                `;
            }
        }

        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        updateDashboardStats() {
            const totalPoints = this.totalPoints || this.calculateTotalPoints();
            
            // Update dashboard if elements exist
            const dashboardPoints = document.getElementById('dashboard-points');
            if (dashboardPoints) dashboardPoints.textContent = totalPoints;
            
            const dashboardStreak = document.getElementById('dashboard-streak');
            if (dashboardStreak) dashboardStreak.textContent = this.streak;
            
            // Update gamification display in sidebar if exists
            const sidebarPoints = document.getElementById('sidebar-gamification-points');
            if (sidebarPoints) sidebarPoints.textContent = totalPoints;
        }
        
        showNotification(title, message, type, icon = 'fa-award') {
            // Remove existing toast
            const existingToast = document.querySelector('.achievement-toast');
            if (existingToast) existingToast.remove();
            
            const colors = {
                'points': { bg: '#4C1D95', icon: 'fa-star' },
                'badge': { bg: '#FDB913', icon: 'fa-medal' },
                'levelup': { bg: '#10b981', icon: 'fa-trophy' }
            };
            
            const colorInfo = colors[type] || colors.points;
            
            const toast = document.createElement('div');
            toast.className = 'achievement-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                background: #1e293b;
                color: white;
                padding: 14px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 99999;
                max-width: 350px;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: slideInRight 0.4s ease forwards;
                border-left: 4px solid ${colorInfo.bg};
                cursor: pointer;
            `;
            
            toast.innerHTML = `
                <div style="
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: ${colorInfo.bg};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <i class="fas ${colorInfo.icon}" style="color: white; font-size: 16px;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 14px;">${title}</div>
                    <div style="font-size: 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message}</div>
                </div>
                <button onclick="this.closest('.achievement-toast').remove()" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 14px; padding: 4px;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            document.body.appendChild(toast);
            
            // Auto-remove after 4 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideOutRight 0.3s ease forwards';
                    setTimeout(() => toast.remove(), 300);
                }
            }, 4000);
            
            // Click to dismiss
            toast.addEventListener('click', () => {
                toast.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            });
        }
        
        showAllBadges() {
            const badgesSection = document.querySelector('.badges-section');
            if (badgesSection) {
                badgesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    // ============================================================
    // 🚀 INITIALIZE
    // ============================================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.gamificationModule = new GamificationModule();
        });
    } else {
        window.gamificationModule = new GamificationModule();
    }
})();
