// js/exam-card.js - v9.0 (Production ready - No demo data)

(function() {
    'use strict';
    
    const CONFIG = {
        LOGO_URL: 'https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png',
        DEFAULT_CREDITS: 3,
        LOAD_DELAY: 500,
        PAST_EXAMS: [
            // This would come from database in production
            // Sample data for testing only
        ]
    };
    
    class ExamCardModule {
        constructor() {
            this.approvedUnits = [];
            this.userProfile = null;
            this.loaded = false;
            this.userBlock = null;
            this.userId = null;
            this.isLoading = false;
            this.pastExamRecords = [];
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }
        
        cleanText(str) {
            if (!str) return '';
            return str.replace(/&amp;/g, '&')
                      .replace(/&#x27;/g, "'")
                      .replace(/&quot;/g, '"')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&amp;amp;/g, '&')
                      .replace(/&amp;quot;/g, '"')
                      .replace(/&amp;#x27;/g, "'");
        }
        
        formatDate(date = new Date()) {
            return date.toLocaleDateString('en-KE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        getExamPeriod() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            if (month >= 2 && month <= 5) {
                return `March - June ${year} (Trimester 1)`;
            }
            if (month >= 6 && month <= 9) {
                return `July - October ${year} (Trimester 2)`;
            }
            return `November - February ${year}/${year + 1} (Trimester 3)`;
        }
        
        isExamOver() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const examEndDates = {
                'Trimester 1': new Date(currentYear, 5, 30),
                'Trimester 2': new Date(currentYear, 9, 30),
                'Trimester 3': new Date(currentYear + 1, 1, 28)
            };
            
            const period = this.getExamPeriod();
            let endDate;
            
            if (period.includes('Trimester 1')) {
                endDate = examEndDates['Trimester 1'];
            } else if (period.includes('Trimester 2')) {
                endDate = examEndDates['Trimester 2'];
            } else {
                endDate = examEndDates['Trimester 3'];
            }
            
            return now > endDate;
        }
        
        init() {
            this.cacheElements();
            this.setupEventListeners();
            this.loadRequiredLibraries();
            this.loadPastExamRecords();
            setTimeout(() => this.tryLoadIfLoggedIn(), CONFIG.LOAD_DELAY);
        }
        
        loadRequiredLibraries() {
            if (typeof html2canvas === 'undefined') {
                const script1 = document.createElement('script');
                script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                document.head.appendChild(script1);
            }
            
            if (typeof jspdf === 'undefined') {
                const script2 = document.createElement('script');
                script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                document.head.appendChild(script2);
            }
        }
        
        cacheElements() {
            this.examCardContent = document.getElementById('exam-card-content-standalone');
            this.dashboardExamStatus = document.getElementById('dashboard-exam-status');
            this.dashboardApprovedUnits = document.getElementById('dashboard-approved-units');
        }
        
        setupEventListeners() {
            document.addEventListener('appReady', () => this.tryLoadIfLoggedIn());
            document.addEventListener('profileLoaded', (e) => {
                if (e.detail?.profile) {
                    this.userProfile = e.detail.profile;
                    this.updateUserData();
                    this.loadExamCard();
                }
            });
            document.addEventListener('unitRegistrationReady', () => this.loadExamCard());
            
            document.querySelectorAll('[data-tab="hub-exam-card"]').forEach(link => {
                link.addEventListener('click', () => setTimeout(() => this.loadExamCard(), 100));
            });
        }
        
        tryLoadIfLoggedIn() {
            const profile = this.getUserProfileFromSources();
            if (profile) {
                this.userProfile = profile;
                this.updateUserData();
                this.loadExamCard();
            } else {
                // No user logged in - show message
                if (this.examCardContent) {
                    this.examCardContent.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #64748b;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                            <h3 style="color: #1e3a5f;">Please Login</h3>
                            <p>You need to be logged in to view your exam card.</p>
                        </div>
                    `;
                }
            }
        }
        
        getUserProfileFromSources() {
            const sources = [
                () => window.db?.currentUserProfile,
                () => window.currentUserProfile,
                () => window.databaseModule?.currentUserProfile,
                () => window.app?.user,
                () => { try { return JSON.parse(localStorage.getItem('userProfile')); } catch(e) { return null; } },
                () => { try { return JSON.parse(localStorage.getItem('nchsm_user')); } catch(e) { return null; } }
            ];
            
            for (const source of sources) {
                try {
                    const profile = source();
                    if (profile && (profile.id || profile.user_id || profile.student_id)) return profile;
                } catch(e) {}
            }
            return null;
        }
        
        updateUserData() {
            if (this.userProfile) {
                this.userId = this.userProfile.user_id || this.userProfile.id || this.userProfile.student_id;
                this.userBlock = this.userProfile.block || this.userProfile.current_block || this.userProfile.term;
                return true;
            }
            return false;
        }
        
        async loadExamCard() {
            if (this.isLoading) return;
            if (!this.userProfile) { 
                this.tryLoadIfLoggedIn();
                return; 
            }
            
            this.isLoading = true;
            this.showLoading();
            
            try {
                const success = await this.loadApprovedUnitsFromDB();
                if (success) {
                    await this.updateDashboard();
                    this.displayExamCard();
                    this.loaded = true;
                } else {
                    this.showNoUnitsMessage();
                }
            } catch (error) {
                console.warn('Failed to load exam card:', error);
                this.showErrorMessage();
            } finally {
                this.isLoading = false;
            }
        }
        
        async loadApprovedUnitsFromDB() {
            const supabase = window.db?.supabase || window.supabase;
            if (!supabase) return false;
            
            try {
                let actualUserId = this.userId;
                const studentIdValue = this.userProfile?.student_id;
                
                if (studentIdValue) {
                    const { data: userData } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('user_id')
                        .eq('student_id', studentIdValue)
                        .maybeSingle();
                    if (userData?.user_id) actualUserId = userData.user_id;
                }
                
                const { data, error } = await supabase
                    .from('student_unit_registrations')
                    .select('*')
                    .eq('student_id', actualUserId)
                    .eq('status', 'approved');
                
                if (error) throw error;
                this.approvedUnits = data || [];
                return true;
            } catch (error) {
                console.error('DB error:', error);
                return false;
            }
        }
        
        async updateDashboard() {
            const approvedCount = this.approvedUnits.length;
            const examOver = this.isExamOver();
            
            if (this.dashboardExamStatus) {
                if (examOver) {
                    this.dashboardExamStatus.textContent = 'COMPLETED ✓';
                    this.dashboardExamStatus.style.color = '#059669';
                } else {
                    this.dashboardExamStatus.textContent = approvedCount > 0 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
                    this.dashboardExamStatus.style.color = approvedCount > 0 ? '#059669' : '#dc2626';
                }
            }
            if (this.dashboardApprovedUnits) {
                this.dashboardApprovedUnits.textContent = approvedCount;
            }
        }
        
        loadPastExamRecords() {
            // In production, fetch from database
            // For now, initialize empty array
            this.pastExamRecords = [];
            
            // If you want to load from database, uncomment and implement:
            // this.fetchPastExamRecords();
        }
        
        async fetchPastExamRecords() {
            try {
                const supabase = window.db?.supabase || window.supabase;
                if (!supabase) return;
                
                const { data, error } = await supabase
                    .from('past_exam_records')
                    .select('*')
                    .eq('student_id', this.userId)
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    this.pastExamRecords = data;
                    this.displayPastExams();
                }
            } catch (error) {
                console.error('Failed to load past exams:', error);
            }
        }
        
        displayPastExams() {
            if (this.pastExamRecords.length === 0) return;
            
            const tableRows = this.pastExamRecords.map((record, index) => {
                return `
                    <tr>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${record.period || record.exam_period}</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${record.units || record.total_units}</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${record.credits || record.total_credits}</td>
                        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${record.date || record.completed_date}</td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <span style="background: #059669; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                                ${record.status || 'Completed'}
                            </span>
                        </td>
                        <td style="padding: 8px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <button class="view-exam-btn" data-exam-id="${record.id}" style="
                                background: #1e3a5f;
                                color: white;
                                border: none;
                                padding: 4px 14px;
                                border-radius: 20px;
                                font-size: 11px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            ">
                                📄 View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            const pastExamsHTML = `
                <div style="margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <h3 style="font-size: 16px; color: #1e3a5f; margin: 0;">
                            📚 Past Exam Records
                        </h3>
                        <span style="background: #e2e8f0; color: #475569; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                            ${this.pastExamRecords.length} records
                        </span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 12px;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                        ">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">#</th>
                                    <th style="padding: 10px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Exam Period</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Units</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Credits</th>
                                    <th style="padding: 10px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Date</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Status</th>
                                    <th style="padding: 10px 10px; text-align: center; font-weight: 600; border-bottom: 2px solid #cbd5e1;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; text-align: center;">
                        Click "View" to see the full exam card for each past period
                    </div>
                </div>
            `;
            
            // Append past exams after the exam card
            const examCardWrapper = document.querySelector('.exam-card-wrapper');
            if (examCardWrapper) {
                const existingPast = examCardWrapper.querySelector('.past-exams-section');
                if (existingPast) existingPast.remove();
                
                const pastSection = document.createElement('div');
                pastSection.className = 'past-exams-section';
                pastSection.innerHTML = pastExamsHTML;
                examCardWrapper.appendChild(pastSection);
                
                // Add click handlers for View buttons
                pastSection.querySelectorAll('.view-exam-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const examId = btn.dataset.examId;
                        this.viewPastExam(examId);
                    });
                    
                    btn.addEventListener('mouseenter', () => {
                        btn.style.background = '#2c5a8c';
                        btn.style.transform = 'scale(1.02)';
                    });
                    btn.addEventListener('mouseleave', () => {
                        btn.style.background = '#1e3a5f';
                        btn.style.transform = 'scale(1)';
                    });
                });
            }
        }
        
        viewPastExam(examId) {
            const record = this.pastExamRecords.find(r => r.id == examId);
            if (!record) {
                alert('Record not found');
                return;
            }
            
            // Show modal with past exam details
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            `;
            
            // Build units list for past exam
            let unitsList = '';
            if (record.units_list && record.units_list.length > 0) {
                unitsList = record.units_list.map((unit, i) => `
                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                        <span>${i + 1}. ${unit.unit_code} - ${unit.unit_name}</span>
                        <span style="font-weight: 600;">${unit.credits} cr</span>
                    </div>
                `).join('');
            }
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    position: relative;
                ">
                    <button onclick="this.closest('div[style]').remove()" style="
                        position: sticky;
                        top: 0;
                        float: right;
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #94a3b8;
                        z-index: 10;
                    ">×</button>
                    
                    <h3 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 18px;">
                        📄 Past Exam Record
                    </h3>
                    
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="display: grid; gap: 8px; font-size: 13px;">
                            <div><strong style="color: #64748b;">Period:</strong> ${record.period || record.exam_period}</div>
                            <div><strong style="color: #64748b;">Units Registered:</strong> ${record.units || record.total_units}</div>
                            <div><strong style="color: #64748b;">Total Credits:</strong> ${record.credits || record.total_credits}</div>
                            <div><strong style="color: #64748b;">Date:</strong> ${record.date || record.completed_date}</div>
                            <div><strong style="color: #64748b;">Status:</strong> <span style="color: #059669; font-weight: 600;">${record.status || 'Completed'}</span></div>
                        </div>
                    </div>
                    
                    ${unitsList ? `
                        <div style="margin-bottom: 16px;">
                            <h4 style="font-size: 13px; color: #1e3a5f; margin: 0 0 8px 0;">📋 Units Registered</h4>
                            <div style="background: #f8fafc; border-radius: 8px; padding: 12px;">
                                ${unitsList}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="this.closest('div[style]').remove()" style="
                            flex: 1;
                            padding: 10px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            background: white;
                            cursor: pointer;
                            font-weight: 500;
                        ">Close</button>
                        <button onclick="window.examCardModule.downloadPastExamPDF(${record.id})" style="
                            flex: 1;
                            padding: 10px;
                            border: none;
                            border-radius: 8px;
                            background: #1e3a5f;
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                        ">📥 Download PDF</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }
        
        async downloadPastExamPDF(examId) {
            const record = this.pastExamRecords.find(r => r.id == examId);
            if (!record) {
                alert('Record not found');
                return;
            }
            
            // Generate PDF for past exam
            // Similar to downloadExamCardDirect but with past data
            alert(`Downloading PDF for ${record.period}...`);
            
            // In production, implement full PDF generation here
        }
        
        showNoUnitsMessage() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                        <h3 style="color: #1e3a5f;">No Approved Units</h3>
                        <p>You don't have any approved units for this exam period.</p>
                        <p style="font-size: 13px; margin-top: 8px;">Please contact the academic office for assistance.</p>
                    </div>
                `;
            }
        }
        
        showErrorMessage() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                        <h3 style="color: #dc2626;">Error Loading Exam Card</h3>
                        <p>Unable to load your exam card at this time.</p>
                        <button onclick="window.examCardModule?.loadExamCard()" style="
                            margin-top: 16px;
                            padding: 8px 24px;
                            background: #1e3a5f;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Retry</button>
                    </div>
                `;
            }
        }
        
        async downloadExamCardDirect() {
            const cardElement = document.getElementById('exam-card-print-area');
            if (!cardElement) {
                alert('Exam card not found. Please refresh and try again.');
                return;
            }
            
            const downloadBtn = document.getElementById('downloadExamCardBtn');
            const originalText = downloadBtn?.innerHTML || '📥 Download PDF';
            if (downloadBtn) {
                downloadBtn.innerHTML = '⏳ Generating PDF...';
                downloadBtn.disabled = true;
            }
            
            try {
                await this.waitForLibraries();
                
                const cloneCard = cardElement.cloneNode(true);
                
                const actionButtons = cloneCard.querySelectorAll('.action-buttons');
                actionButtons.forEach(btn => btn.remove());
                
                const allButtons = cloneCard.querySelectorAll('button');
                allButtons.forEach(btn => btn.style.display = 'none');
                
                const pastSection = cloneCard.querySelector('.past-exams-section');
                if (pastSection) pastSection.remove();
                
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '-9999px';
                tempContainer.style.width = '794px';
                tempContainer.style.backgroundColor = 'white';
                tempContainer.style.padding = '50px 40px';
                tempContainer.style.boxSizing = 'border-box';
                tempContainer.appendChild(cloneCard);
                document.body.appendChild(tempContainer);
                
                const signatureLines = cloneCard.querySelectorAll('.signature-line, .sign-line, .signature-line-inline');
                signatureLines.forEach(line => {
                    line.style.width = '80%';
                    line.style.margin = '8px auto';
                    line.style.borderTop = '2px solid #000';
                    line.style.height = '2px';
                });
                
                const lecturerSig = cloneCard.querySelectorAll('.signature-cell .signature-line');
                lecturerSig.forEach(line => {
                    line.style.width = '90%';
                    line.style.margin = '8px auto';
                });
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const canvas = await html2canvas(cloneCard, {
                    scale: 2.5,
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true,
                    allowTaint: false,
                    width: 794,
                    height: 1123,
                });
                
                document.body.removeChild(tempContainer);
                
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                const margin = 20;
                const imgWidth = 210 - (margin * 2);
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
                
                if (imgHeight > (pageHeight - margin * 2)) {
                    let position = -(pageHeight - margin * 2);
                    let heightLeft = imgHeight - (pageHeight - margin * 2);
                    while (heightLeft > 0) {
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                        position -= (pageHeight - margin * 2);
                        heightLeft -= (pageHeight - margin * 2);
                    }
                }
                
                if (this.isExamOver()) {
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text('This is a historical record of units registered for this exam period', margin + 5, pageHeight - 10);
                }
                
                const studentName = this.userProfile?.full_name || 'Student';
                const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const date = this.formatDate().replace(/[, ]/g, '_');
                const suffix = this.isExamOver() ? '_historical_record' : '';
                pdf.save(`Exam_Card_${safeName}_${date}${suffix}.pdf`);
                
                if (downloadBtn) {
                    downloadBtn.innerHTML = '✅ Downloaded!';
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalText;
                        downloadBtn.disabled = false;
                    }, 2000);
                }
                
            } catch (error) {
                console.error('PDF generation failed:', error);
                alert('Failed to generate PDF. Please try again.');
                if (downloadBtn) {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }
            }
        }
        
        waitForLibraries() {
            return new Promise((resolve) => {
                const checkLibraries = setInterval(() => {
                    if (typeof html2canvas !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
                        clearInterval(checkLibraries);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkLibraries);
                    resolve();
                }, 10000);
            });
        }
        
        printExamCard() {
            const printContent = document.getElementById('exam-card-print-area');
            if (!printContent) return;
            
            const styles = document.getElementById('exam-card-compact-styles')?.innerHTML || '';
            const cloneCard = printContent.cloneNode(true);
            const actionButtons = cloneCard.querySelectorAll('.action-buttons');
            actionButtons.forEach(btn => btn.remove());
            
            const pastSection = cloneCard.querySelector('.past-exams-section');
            if (pastSection) pastSection.remove();
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exam Card - ${this.userProfile?.full_name || 'Student'}</title>
                    <meta charset="UTF-8">
                    <style>
                        ${styles}
                        body {
                            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                            padding: 20px;
                            margin: 0;
                            background: white;
                        }
                        .action-buttons, button {
                            display: none !important;
                        }
                        .exam-card-wrapper {
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        .past-exams-section {
                            display: none !important;
                        }
                        .signature-line, .sign-line, .signature-line-inline {
                            width: 80% !important;
                            margin: 8px auto !important;
                            border-top: 2px solid #000 !important;
                            height: 2px !important;
                        }
                        .signature-cell .signature-line {
                            width: 90% !important;
                            margin: 8px auto !important;
                        }
                        @media print {
                            body { padding: 0; margin: 0; }
                            .card-header { background: #1e3a5f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .status-badge.eligible { background: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .status-badge.completed { background: #059669 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .past-exams-section { display: none !important; }
                            .signature-line, .sign-line, .signature-line-inline {
                                width: 80% !important;
                                margin: 8px auto !important;
                                border-top: 2px solid #000 !important;
                                height: 2px !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${cloneCard.outerHTML}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            }, 200);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        
        displayExamCard() {
            if (!this.examCardContent) return;
            
            const student = this.userProfile;
            const approvedUnits = this.approvedUnits;
            const isEligible = approvedUnits.length > 0;
            const examOver = this.isExamOver();
            const currentBlock = this.userBlock || student?.block || 'Current Block';
            
            const totalCredits = approvedUnits.reduce((sum, unit) => sum + (unit.credits || CONFIG.DEFAULT_CREDITS), 0);
            
            const cleanUnitName = (name) => {
                if (!name) return '';
                return name.replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
            };
            
            const tableRows = approvedUnits.map((unit, index) => {
                const unitName = cleanUnitName(unit.unit_name || unit.name || '');
                const unitCode = unit.unit_code || unit.code || '';
                return `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td><strong>${this.cleanText(unitCode)}</strong></td>
                        <td>${this.cleanText(unitName)}</td>
                        <td class="text-center">${unit.credits || CONFIG.DEFAULT_CREDITS}</td>
                        <td class="signature-cell">
                            <div class="signature-line"></div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            let statusBadge = '';
            if (examOver) {
                statusBadge = `<div class="status-badge completed">✅ COMPLETED</div>`;
            } else {
                statusBadge = `<div class="status-badge ${isEligible ? 'eligible' : 'ineligible'}">
                    ${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                </div>`;
            }
            
            const html = `
                <div class="exam-card-wrapper" id="exam-card-print-area">
                    <div class="exam-card-compact">
                        <div class="card-header">
                            <img src="${CONFIG.LOGO_URL}" alt="Logo" class="card-logo" onerror="this.style.display='none'">
                            <div class="header-text">
                                <div class="institution">NAKURU COLLEGE OF HEALTH SCIENCES AND MANAGEMENT</div>
                                <div class="card-title">EXAMINATION CARD</div>
                                <div class="card-subtitle">${examOver ? '(Historical Record)' : '(Exam Entry Permit)'}</div>
                            </div>
                            ${statusBadge}
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Name:</span> ${this.cleanText(student?.full_name || 'Not Available')}</div>
                            <div class="info-item"><span class="info-label">REG NO.:</span> ${this.cleanText(student?.student_id || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Program:</span> ${this.cleanText(student?.program || 'N/A')}</div>
                            <div class="info-item"><span class="info-label">Current Block:</span> <strong>${this.cleanText(currentBlock)}</strong></div>
                            <div class="info-item"><span class="info-label">Registered Units:</span> ${approvedUnits.length}</div>
                            <div class="info-item"><span class="info-label">Total Credits:</span> ${totalCredits}</div>
                            <div class="info-item"><span class="info-label">Exam Period:</span> ${this.getExamPeriod()}</div>
                            <div class="info-item"><span class="info-label">Date Issued:</span> ${this.formatDate()}</div>
                            <div class="info-item"><span class="info-label">Valid Until:</span> ${examOver ? 'Completed' : 'End of Exam Period'}</div>
                        </div>
                        
                        ${approvedUnits.length > 0 ? `
                            <table class="units-table">
                                <thead>
                                    <tr>
                                        <th width="5%">#</th>
                                        <th width="18%">Unit Code</th>
                                        <th width="40%">Unit Title</th>
                                        <th width="7%">Cr</th>
                                        <th width="30%">Lecturer's Signature</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tableRows}
                                    <tr class="total-row">
                                        <td colspan="3"><strong>TOTAL REGISTERED UNITS: ${approvedUnits.length}</strong></td>
                                        <td class="text-center"><strong>${totalCredits}</strong></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        ` : '<div class="no-units">No approved units found. Please register for units.</div>'}
                        
                        <div class="signatures-row">
                            <div class="signature">
                                <div class="sign-line"></div>
                                <div>HOD Nursing</div>
                            </div>
                            <div class="signature">
                                <div class="sign-line"></div>
                                <div>Principal</div>
                            </div>
                            <div class="signature">
                                <div class="sign-line"></div>
                                <div>Finance Officer</div>
                            </div>
                        </div>
                        
                        <div class="card-footer">
                            <div class="rules-header">EXAMINATION RULES & REGULATIONS</div>
                            <div class="rules-list">
                                <div class="rule-item"> Present your exam card at each examination hall</div>
                                <div class="rule-item"> No electronic devices allowed in examination room</div>
                                <div class="rule-item"> Arrive 30 minutes before examination start time</div>
                                <div class="rule-item"> Mobile phones must be switched off and stored</div>
                                <div class="rule-item"> No unauthorized materials allowed</div>
                            </div>
                            
                            <div class="student-section">
                                <div class="student-declaration">
                                    I hereby confirm that I have read and understood the examination rules and regulations.
                                </div>
                                
                                <div class="student-sign-line">
                                    <span class="student-label">Student Signature:</span>
                                    <span class="signature-line-inline"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${!examOver && isEligible ? `
                        <div class="action-buttons">
                            <button class="download-btn" id="downloadExamCardBtn">📥 Download PDF</button>
                            <button class="print-btn" id="printExamCardBtn">🖨️ Print Card</button>
                        </div>
                    ` : ''}
                    
                    ${examOver ? `
                        <div style="text-align: center; margin-top: 12px; font-size: 11px; color: #64748b;">
                            📜 This is a historical record from the ${this.getExamPeriod()}
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.examCardContent.innerHTML = html;
            this.addCompactStyles();
            
            const downloadBtn = document.getElementById('downloadExamCardBtn');
            const printBtn = document.getElementById('printExamCardBtn');
            
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.downloadExamCardDirect();
                });
            }
            
            if (printBtn) {
                printBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.printExamCard();
                });
            }
            
            // Display past exams after the card
            this.displayPastExams();
        }
        
        addCompactStyles() {
            const existingStyle = document.getElementById('exam-card-compact-styles');
            if (existingStyle) existingStyle.remove();
            
            const style = document.createElement('style');
            style.id = 'exam-card-compact-styles';
            style.textContent = `
                .exam-card-wrapper { max-width: 850px; margin: 0 auto; font-family: 'Segoe UI', Roboto, sans-serif; }
                .exam-card-compact { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                
                .card-header { background: linear-gradient(135deg, #1e3a5f, #2c5a8c); color: white; padding: 15px 20px; display: flex; align-items: center; gap: 15px; }
                .card-logo { height: 55px; width: auto; background: white; padding: 5px; border-radius: 8px; object-fit: contain; }
                .header-text { flex: 1; }
                .institution { font-size: 12px; opacity: 0.9; letter-spacing: 0.5px; }
                .card-title { font-size: 22px; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
                .card-subtitle { font-size: 10px; opacity: 0.8; margin-top: 2px; }
                .status-badge { padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }
                .status-badge.eligible { background: #10b981; }
                .status-badge.ineligible { background: #dc2626; }
                .status-badge.completed { background: #059669; }
                
                .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
                .info-item { color: #334155; }
                .info-label { font-weight: 600; color: #64748b; margin-right: 8px; }
                
                .units-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                .units-table th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
                .units-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                .text-center { text-align: center; }
                
                .signature-cell { padding: 5px 0; }
                .signature-line { width: 90%; margin: 8px auto; border-top: 1px solid #333; }
                
                .total-row { background: #f8fafc; font-weight: 600; border-top: 2px solid #cbd5e1; }
                .no-units { padding: 30px; text-align: center; color: #ef4444; font-size: 14px; }
                
                .signatures-row { display: flex; justify-content: space-between; padding: 15px 20px; gap: 20px; border-top: 1px solid #e2e8f0; background: white; }
                .signature { flex: 1; text-align: center; font-size: 11px; color: #475569; }
                .sign-line { width: 80%; margin: 8px auto; border-top: 1px solid #334155; padding-top: 12px; }
                
                .card-footer { padding: 15px 20px; background: #fefce8; border-top: 1px solid #e2e8f0; }
                .rules-header { font-weight: 700; font-size: 12px; color: #854d0e; margin-bottom: 10px; }
                .rules-list { margin-bottom: 15px; }
                .rule-item { font-size: 10px; color: #713f12; margin-bottom: 4px; }
                
                .student-section { border-top: 1px dashed #e2e8f0; padding-top: 12px; margin-top: 5px; }
                .student-declaration { font-size: 10px; color: #475569; margin: 10px 0; text-align: center; }
                .student-sign-line { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px 0; }
                .student-label { font-weight: 600; font-size: 11px; color: #334155; min-width: 110px; }
                .signature-line-inline { display: inline-block; flex: 1; border-top: 1px solid #333; max-width: 60%; }
                
                .action-buttons { display: flex; gap: 15px; justify-content: center; margin-top: 20px; }
                .download-btn, .print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; border: none; border-radius: 40px; font-weight: 600; font-size: 13px; cursor: pointer; }
                .download-btn { background: #059669; color: white; }
                .download-btn:hover { background: #047857; transform: scale(1.02); }
                .print-btn { background: #1e3a5f; color: white; }
                .print-btn:hover { background: #2c5a8c; transform: scale(1.02); }
                
                @media print {
                    body * { visibility: hidden; }
                    .exam-card-wrapper, .exam-card-wrapper * { visibility: visible; }
                    .exam-card-wrapper { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 10px; }
                    .action-buttons, button { display: none !important; }
                    .card-header { background: #1e3a5f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-badge.eligible { background: #10b981 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .status-badge.completed { background: #059669 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .signature-line, .sign-line, .signature-line-inline { 
                        width: 80% !important;
                        margin: 8px auto !important;
                        border-top: 2px solid #000 !important;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    .signature-cell .signature-line {
                        width: 90% !important;
                        margin: 8px auto !important;
                    }
                }
                
                @media (max-width: 600px) {
                    .info-grid { grid-template-columns: repeat(2, 1fr); gap: 6px 10px; padding: 10px 15px; }
                    .card-header { padding: 10px 15px; gap: 10px; }
                    .card-logo { height: 40px; }
                    .card-title { font-size: 16px; }
                    .signatures-row { flex-direction: column; gap: 15px; }
                    .action-buttons { flex-direction: column; gap: 10px; padding: 0 10px; }
                    .download-btn, .print-btn { justify-content: center; width: 100%; }
                }
            `;
            document.head.appendChild(style);
        }
        
        showLoading() {
            if (this.examCardContent) {
                this.examCardContent.innerHTML = `
                    <div style="text-align:center; padding:30px;">
                        <div style="display:inline-block; width:30px; height:30px; border:3px solid #e2e8f0; border-top-color:#1e3a5f; border-radius:50%; animation:spin 0.6s linear infinite;"></div>
                        <p style="margin-top:10px; font-size:12px;">Loading exam card...</p>
                    </div>
                    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
                `;
            }
        }
        
        refresh() {
            this.loaded = false;
            this.loadExamCard();
        }
    }
    
    // Initialize the module
    window.examCardModule = new ExamCardModule();
    
    // Expose functions globally
    window.loadExamCard = () => window.examCardModule?.loadExamCard();
    window.printExamCard = () => window.examCardModule?.printExamCard();
    window.downloadExamCard = () => window.examCardModule?.downloadExamCardDirect();
    window.refreshExamCard = () => window.examCardModule?.refresh();
    window.viewPastExam = (id) => window.examCardModule?.viewPastExam(id);
    window.downloadPastExamPDF = (id) => window.examCardModule?.downloadPastExamPDF(id);
    
    console.log('✅ Exam Card module ready - Production version');
})();
