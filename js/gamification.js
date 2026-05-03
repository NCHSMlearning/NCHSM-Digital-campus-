// gamification.js - Complete Badges, Streaks, Points & Leaderboard System
// LIVE DATA VERSION - Uses your Supabase database

(function() {
    'use strict';
    
    console.log('🏆 Gamification module loading (LIVE DATA VERSION)...');
    
    class GamificationModule {
        constructor() {
            this.userId = null;
            this.userProfile = null;
            this.streak = 0;
            this.points = 0;
            this.level = 1;
            this.xp = 0;
            this.xpToNextLevel = 100;
            this.badges = [];
            this.lastCheckIn = null;
            this.currentRankFilter = 'weekly';
            
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
            // Wait for user
            await this.waitForUser();
            
            // Load data from Supabase
            await this.loadUserGamificationData();
            
            // Inject gamification UI into existing page
            this.injectGamificationUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update all UI
            this.updateAllUI();
            
            // Load leaderboard from Supabase
            await this.loadLeaderboard();
            
            console.log(`✅ Gamification ready: Level ${this.level}, ${this.points} points, ${this.streak} day streak`);
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
        
        async loadUserGamificationData() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                // Load from Supabase
                const { data, error } = await window.db.supabase
                    .from('student_gamification')
                    .select('*')
                    .eq('student_id', this.userId)
                    .single();
                
                if (data && !error) {
                    this.points = data.points || 0;
                    this.streak = data.current_streak || 0;
                    this.level = data.level || 1;
                    this.xp = data.xp || 0;
                    this.badges = data.badges || [];
                    this.lastCheckIn = data.last_check_in ? new Date(data.last_check_in) : null;
                    this.max_streak = data.max_streak || 0;
                } else {
                    // Create new record if doesn't exist
                    await this.createGamificationRecord();
                }
                
                // Check streak continuity
                await this.checkStreakContinuity();
                
            } catch (error) {
                console.log('No gamification data found, creating new record...');
                await this.createGamificationRecord();
            }
        }
        
        async createGamificationRecord() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                const { data, error } = await window.db.supabase
                    .from('student_gamification')
                    .insert([{
                        student_id: this.userId,
                        points: 0,
                        current_streak: 0,
                        max_streak: 0,
                        level: 1,
                        xp: 0,
                        badges: [],
                        total_checkins: 0
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                console.log('✅ Created new gamification record');
                
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
                await this.saveToSupabase();
            }
        }
        
        async saveToSupabase() {
            if (!this.userId || !window.db?.supabase) return;
            
            try {
                const { error } = await window.db.supabase
                    .from('student_gamification')
                    .update({
                        points: this.points,
                        current_streak: this.streak,
                        level: this.level,
                        xp: this.xp,
                        badges: this.badges,
                        last_check_in: this.lastCheckIn ? this.lastCheckIn.toISOString() : null,
                        max_streak: Math.max(this.streak, this.max_streak || 0),
                        updated_at: new Date().toISOString()
                    })
                    .eq('student_id', this.userId);
                
                if (error) throw error;
                
            } catch (error) {
                console.error('Error saving to Supabase:', error);
            }
        }
        
        injectGamificationUI() {
            this.addGamificationWidget();
            this.addLevelProgressBar();
            this.addBadgesSection();
            this.addLeaderboardSection();
        }
        
        addGamificationWidget() {
            const headerRight = document.querySelector('.header-right');
            if (!headerRight) return;
            if (document.querySelector('.gamification-widget')) return;
            
            const widget = document.createElement('div');
            widget.className = 'gamification-widget';
            widget.innerHTML = `
                <div class="streak-indicator" id="streak-indicator" title="Current Streak">
                    <i class="fas fa-fire"></i>
                    <span id="streak-count">${this.streak}</span>
                    <span class="streak-label">Day Streak</span>
                </div>
                <div class="points-indicator" id="points-indicator" title="Total Points">
                    <i class="fas fa-star"></i>
                    <span id="points-count">${this.points}</span>
                    <span class="points-label">Points</span>
                </div>
                <div class="level-indicator" id="level-indicator" title="Current Level">
                    <i class="fas fa-trophy"></i>
                    <span id="level-number">${this.level}</span>
                    <span class="level-label">Level</span>
                </div>
            `;
            
            const mobileToggle = headerRight.querySelector('#mobile-menu-toggle');
            if (mobileToggle) {
                headerRight.insertBefore(widget, mobileToggle);
            } else {
                headerRight.insertBefore(widget, headerRight.firstChild);
            }
        }
        
        addLevelProgressBar() {
            const welcomeCard = document.querySelector('.welcome-card');
            if (!welcomeCard) return;
            if (document.querySelector('.level-progress-container')) return;
            
            const percent = (this.xp / this.xpToNextLevel) * 100;
            
            const progressContainer = document.createElement('div');
            progressContainer.className = 'level-progress-container';
            progressContainer.id = 'level-progress-container';
            progressContainer.innerHTML = `
                <div class="level-progress-bar">
                    <div class="level-progress-fill" id="level-progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="level-progress-text" id="level-progress-text">Level ${this.level} · ${this.xp}/${this.xpToNextLevel} XP to Level ${this.level + 1}</div>
            `;
            
            welcomeCard.insertAdjacentElement('afterend', progressContainer);
        }
        
        addBadgesSection() {
            const cardsGrid = document.querySelector('.cards-grid');
            if (!cardsGrid) return;
            if (document.querySelector('.badges-section')) return;
            
            const badgesSection = document.createElement('div');
            badgesSection.className = 'badges-section';
            badgesSection.id = 'badges-section';
            badgesSection.innerHTML = `
                <div class="badges-header">
                    <h3><i class="fas fa-medal"></i> Your Achievements</h3>
                    <button class="view-all-badges" id="view-all-badges">View All <i class="fas fa-arrow-right"></i></button>
                </div>
                <div class="badges-grid" id="badges-grid">
                    <div class="gamification-empty">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading achievements...</p>
                    </div>
                </div>
            `;
            
            cardsGrid.insertAdjacentElement('afterend', badgesSection);
            
            const viewAllBtn = document.getElementById('view-all-badges');
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => this.showAllBadges());
            }
        }
        
        addLeaderboardSection() {
            const badgesSection = document.querySelector('.badges-section');
            if (!badgesSection) return;
            if (document.querySelector('.leaderboard-section')) return;
            
            const leaderboardSection = document.createElement('div');
            leaderboardSection.className = 'leaderboard-section';
            leaderboardSection.id = 'leaderboard-section';
            leaderboardSection.innerHTML = `
                <div class="leaderboard-header">
                    <h3><i class="fas fa-ranking-star"></i> Class Leaderboard</h3>
                    <div class="leaderboard-tabs">
                        <button class="leaderboard-tab active" data-rank="weekly">Weekly</button>
                        <button class="leaderboard-tab" data-rank="monthly">Monthly</button>
                        <button class="leaderboard-tab" data-rank="alltime">All Time</button>
                    </div>
                </div>
                <div class="leaderboard-list" id="leaderboard-list">
                    <div class="gamification-empty">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading leaderboard...</p>
                    </div>
                </div>
            `;
            
            badgesSection.insertAdjacentElement('afterend', leaderboardSection);
            
            const tabs = document.querySelectorAll('.leaderboard-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.currentRankFilter = tab.getAttribute('data-rank');
                    this.loadLeaderboard();
                });
            });
        }
        
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
        }
        
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
            
            await this.saveToSupabase();
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
        
        async addPoints(amount, reason) {
            this.points += amount;
            this.xp += amount;
            
            while (this.xp >= this.xpToNextLevel) {
                this.xp -= this.xpToNextLevel;
                this.level++;
                this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2);
                this.showNotification('Level Up!', `Congratulations! You reached Level ${this.level}!`, 'levelup');
            }
            
            await this.saveToSupabase();
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
                unlockedAt: new Date().toISOString()
            });
            
            await this.addPoints(badge.points, `Unlocked badge: ${badge.name}`);
            await this.saveToSupabase();
            this.updateBadgesDisplay();
            this.showNotification('Badge Unlocked!', `You earned the "${badge.name}" badge!`, 'badge', badge.icon);
        }
        
        hasBadge(badgeId) {
            return this.badges.some(b => b.id === badgeId);
        }
        
        updateAllUI() {
            this.updateUI();
            this.updateBadgesDisplay();
        }
        
        updateUI() {
            const streakCount = document.getElementById('streak-count');
            if (streakCount) streakCount.textContent = this.streak;
            
            const pointsCount = document.getElementById('points-count');
            if (pointsCount) pointsCount.textContent = this.points;
            
            const levelNumber = document.getElementById('level-number');
            if (levelNumber) levelNumber.textContent = this.level;
            
            const progressFill = document.getElementById('level-progress-fill');
            const progressText = document.getElementById('level-progress-text');
            if (progressFill && progressText) {
                const percent = (this.xp / this.xpToNextLevel) * 100;
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `Level ${this.level} · ${this.xp}/${this.xpToNextLevel} XP to Level ${this.level + 1}`;
            }
        }
        
        updateBadgesDisplay() {
            const badgesGrid = document.getElementById('badges-grid');
            if (!badgesGrid) return;
            
            const badgesList = Object.values(this.badgeDefinitions);
            
            badgesGrid.innerHTML = badgesList.map(badge => {
                const isUnlocked = this.hasBadge(badge.id);
                return `
                    <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="badge-icon">
                            <i class="fas ${badge.icon}"></i>
                        </div>
                        <div class="badge-info">
                            <h4>${badge.name}</h4>
                            <p>${badge.description}</p>
                            <div class="badge-points">+${badge.points} points</div>
                        </div>
                        <div class="badge-status">
                            <i class="fas ${isUnlocked ? 'fa-check-circle' : 'fa-lock'}"></i>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        async loadLeaderboard() {
            const leaderboardList = document.getElementById('leaderboard-list');
            if (!leaderboardList) return;
            
            leaderboardList.innerHTML = `
                <div class="gamification-empty">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading leaderboard...</p>
                </div>
            `;
            
            if (!window.db?.supabase) return;
            
            try {
                let query = window.db.supabase
                    .from('student_gamification')
                    .select(`
                        student_id,
                        points,
                        current_streak,
                        level,
                        profiles!inner(full_name)
                    `)
                    .order('points', { ascending: false })
                    .limit(10);
                
                const { data, error } = await query;
                
                if (error) throw error;
                
                if (!data || data.length === 0) {
                    leaderboardList.innerHTML = `
                        <div class="gamification-empty">
                            <i class="fas fa-chart-line"></i>
                            <p>No leaderboard data available yet</p>
                        </div>
                    `;
                    return;
                }
                
                leaderboardList.innerHTML = data.map((item, index) => {
                    let rankClass = '';
                    if (index === 0) rankClass = 'gold';
                    else if (index === 1) rankClass = 'silver';
                    else if (index === 2) rankClass = 'bronze';
                    
                    const name = item.profiles?.full_name || `Student ${item.student_id?.slice(-4)}`;
                    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
                    
                    return `
                        <div class="leaderboard-item">
                            <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
                            <div class="leaderboard-avatar">${avatar}</div>
                            <div class="leaderboard-info">
                                <div class="leaderboard-name">${name}</div>
                                <div class="leaderboard-stats">
                                    <i class="fas fa-fire"></i> ${item.current_streak || 0} day streak
                                    <i class="fas fa-trophy" style="margin-left: 8px;"></i> Level ${item.level || 1}
                                </div>
                            </div>
                            <div class="leaderboard-points">${item.points || 0} pts</div>
                        </div>
                    `;
                }).join('');
                
            } catch (error) {
                console.error('Error loading leaderboard:', error);
                leaderboardList.innerHTML = `
                    <div class="gamification-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading leaderboard</p>
                    </div>
                `;
            }
        }
        
        updateDashboardStats() {
            const dashboardPoints = document.getElementById('dashboard-points');
            if (dashboardPoints) dashboardPoints.textContent = this.points;
            
            const dashboardStreak = document.getElementById('dashboard-streak');
            if (dashboardStreak) dashboardStreak.textContent = this.streak;
        }
        
        showNotification(title, message, type, icon = 'fa-award') {
            const existingToast = document.querySelector('.achievement-toast');
            if (existingToast) existingToast.remove();
            
            const toast = document.createElement('div');
            toast.className = 'achievement-toast';
            toast.innerHTML = `
                <i class="fas ${type === 'badge' ? 'fa-medal' : type === 'points' ? 'fa-star' : type === 'levelup' ? 'fa-trophy' : 'fa-award'}"></i>
                <div class="achievement-toast-content">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
            
            toast.addEventListener('click', () => toast.remove());
        }
        
        showAllBadges() {
            const badgesGrid = document.getElementById('badges-grid');
            if (badgesGrid) {
                badgesGrid.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.gamificationModule = new GamificationModule();
        });
    } else {
        window.gamificationModule = new GamificationModule();
    }
})();
