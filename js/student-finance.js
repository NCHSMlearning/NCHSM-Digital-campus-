/**
 * STUDENT FINANCE MODULE
 * Handles student-facing finance functionality
 * Supports both KRCHN (Semesters - 3 per year) and TVET (Terms - 3 per year)
 */

// ============================================================
// STATE
// ============================================================
const studentFinanceState = {
    balance: 0,
    totalPaid: 0,
    totalDue: 0,
    outstanding: 0,
    payments: [],
    feeStructure: [],
    paymentProgress: 0,
    lastUpdated: null,
    isLoaded: false,
    programType: 'KRCHN' // 'KRCHN' or 'TVET'
};

// ============================================================
// PROGRAM TYPE DETECTION
// ============================================================

/**
 * Detect if student is in Nursing (KRCHN) or TVET program
 */
function getProgramType(program) {
    if (!program) return 'KRCHN'; // Default
    
    // KRCHN programs
    const krchnPrograms = ['KRCHN'];
    if (krchnPrograms.includes(program.toUpperCase())) {
        return 'KRCHN';
    }
    
    // TVET programs - all others are TVET
    return 'TVET';
}

/**
 * Get the correct period label based on program type
 */
function getPeriodLabel(programType) {
    return programType === 'KRCHN' ? 'Semester' : 'Term';
}

/**
 * Get the correct period list based on program type
 * KRCHN: 3 semesters per year for 3 years = 9 semesters total
 * TVET: 3 terms per year
 */
function getPeriods(programType) {
    if (programType === 'KRCHN') {
        // Year 1 - 3 semesters
        return [
            'Year 1 - Semester 1',
            'Year 1 - Semester 2',
            'Year 1 - Semester 3',
            // Year 2 - 3 semesters
            'Year 2 - Semester 1',
            'Year 2 - Semester 2',
            'Year 2 - Semester 3',
            // Year 3 - 3 semesters
            'Year 3 - Semester 1',
            'Year 3 - Semester 2',
            'Year 3 - Semester 3'
        ];
    } else {
        // TVET: 3 terms per year
        return [
            'Term 1', 'Term 2', 'Term 3',
            'Term 4', 'Term 5', 'Term 6',
            'Term 7', 'Term 8', 'Term 9'
        ];
    }
}

/**
 * Get period display name
 */
function getPeriodDisplay(period, programType) {
    if (!period) return '-';
    return period;
}

/**
 * Get fee amount for a specific period
 */
function getFeeAmount(programType, period) {
    if (programType === 'KRCHN') {
        // Nursing: Each semester fee
        return 60000; // KES 60,000 per semester
    } else {
        // TVET: Each term fee
        return 45000; // KES 45,000 per term
    }
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Load student finance data from Supabase
 */
async function loadStudentFinance() {
    try {
        console.log('💰 Loading student finance...');
        
        const user = window.currentUserProfile || window.currentUser;
        if (!user) {
            console.warn('No user found');
            showFinanceError('Please login to view your finance data.');
            return;
        }

        // Detect program type
        const programType = getProgramType(user.program);
        studentFinanceState.programType = programType;
        
        console.log('👤 User:', user.full_name || user.name);
        console.log('📚 Program:', user.program);
        console.log('🏷️ Program Type:', programType);
        console.log(`📋 Using ${getPeriodLabel(programType)}s for this student`);

        // Show loading state
        showFinanceLoading();

        // Fetch data from Supabase
        const financeData = await fetchFinanceDataFromSupabase(user);
        
        if (financeData) {
            // Update UI with data
            updateFinanceUI(financeData);
            
            studentFinanceState.isLoaded = true;
            studentFinanceState.lastUpdated = new Date();
            
            console.log('✅ Finance data loaded successfully');
        } else {
            // If no data, show mock data for demo
            console.log('📊 No data found, using mock data');
            const mockData = getMockFinanceData(user);
            updateFinanceUI(mockData);
        }
        
    } catch (error) {
        console.error('Error loading finance:', error);
        // Use mock data as fallback
        const user = window.currentUserProfile || window.currentUser;
        if (user) {
            const mockData = getMockFinanceData(user);
            updateFinanceUI(mockData);
            showToast('Using demo data - Connect to Supabase for real data', 'info');
        } else {
            showFinanceError('Unable to load finance data. Please try again.');
        }
    }
}

/**
 * Fetch finance data from Supabase
 */
async function fetchFinanceDataFromSupabase(user) {
    try {
        // Check if supabase is available
        if (typeof supabase === 'undefined' || !supabase) {
            console.warn('⚠️ Supabase not available');
            return null;
        }

        const studentId = user.id;
        const program = user.program || 'KRCHN';
        const programType = getProgramType(program);
        const periodLabel = getPeriodLabel(programType);

        console.log('📊 Fetching data for student:', studentId);
        console.log(`📋 Using ${periodLabel}s for fee structure`);

        // 1. Get student account summary
        let accountData = null;
        try {
            const { data, error } = await supabase
                .from('finance_student_accounts')
                .select('*')
                .eq('student_id', studentId)
                .single();
            
            if (!error && data) {
                accountData = data;
                console.log('✅ Account data found:', data);
            } else {
                console.log('ℹ️ No account data found, will use defaults');
            }
        } catch (e) {
            console.log('ℹ️ Account table may not exist yet');
        }

        // 2. Get student payments
        let paymentsData = [];
        try {
            const { data, error } = await supabase
                .from('finance_payments')
                .select('*')
                .eq('student_id', studentId)
                .order('payment_date', { ascending: false });

            if (!error && data) {
                paymentsData = data;
                console.log('✅ Payments found:', data.length);
            } else {
                console.log('ℹ️ No payments found');
            }
        } catch (e) {
            console.log('ℹ️ Payments table may not exist yet');
        }

        // 3. Get fee structure for student's program
        let feeData = [];
        try {
            const { data, error } = await supabase
                .from('finance_fee_structure')
                .select('*')
                .eq('program', program)
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (!error && data) {
                feeData = data;
                console.log(`✅ Fee structure found: ${data.length} ${periodLabel}s`);
            } else {
                console.log(`ℹ️ No fee structure found for program: ${program}`);
            }
        } catch (e) {
            console.log('ℹ️ Fee structure table may not exist yet');
        }

        // Build the data object
        const totalDue = accountData?.total_fees_due || feeData.reduce((sum, f) => sum + f.amount, 0) || 0;
        const totalPaid = accountData?.total_paid || paymentsData.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0) || 0;
        const balance = totalDue - totalPaid;

        // Format payments with correct period labels
        const formattedPayments = paymentsData.map(p => {
            let period = p.period || 'Semester 1';
            // Ensure period matches program type
            if (programType === 'KRCHN' && !period.includes('Semester') && !period.includes('Year')) {
                // Convert "Term X" to "Semester X"
                const num = period.replace(/\D/g, '');
                period = num ? `Semester ${num}` : 'Semester 1';
            } else if (programType === 'TVET' && !period.includes('Term')) {
                // Convert "Semester X" to "Term X"
                const num = period.replace(/\D/g, '');
                period = num ? `Term ${num}` : 'Term 1';
            }
            
            return {
                date: p.payment_date || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                description: p.notes || `${period} Fees`,
                period: period,
                amount: p.amount || 0,
                method: p.payment_method || 'Cash',
                reference: p.reference_number || '-',
                status: p.status || 'pending'
            };
        });

        // Format fee structure with correct period labels
        const formattedFees = feeData.map(f => {
            let period = f.block_term || 'Semester 1';
            // Ensure period matches program type
            if (programType === 'KRCHN' && !period.includes('Semester') && !period.includes('Year')) {
                const num = period.replace(/\D/g, '');
                period = num ? `Semester ${num}` : 'Semester 1';
            } else if (programType === 'TVET' && !period.includes('Term')) {
                const num = period.replace(/\D/g, '');
                period = num ? `Term ${num}` : 'Term 1';
            }
            
            return {
                block: period,
                amount: f.amount || 0,
                description: f.description || `Tuition fees`
            };
        });

        // If no fee structure, create default based on program type
        if (formattedFees.length === 0) {
            const defaultPeriods = getPeriods(programType);
            const defaultAmount = getFeeAmount(programType);
            defaultPeriods.forEach(period => {
                formattedFees.push({
                    block: period,
                    amount: defaultAmount,
                    description: `${period} Tuition Fees`
                });
            });
        }

        return {
            balance: balance,
            totalPaid: totalPaid,
            totalDue: totalDue,
            outstanding: Math.max(balance, 0),
            paymentProgress: totalDue > 0 ? (totalPaid / totalDue * 100) : 100,
            payments: formattedPayments,
            feeStructure: formattedFees,
            programType: programType,
            periodLabel: periodLabel,
            student: {
                name: user.full_name || user.name || 'Student',
                id: user.studentId || user.id || 'N/A',
                program: program,
                intake: user.intake || '2026'
            }
        };

    } catch (error) {
        console.error('❌ Error fetching from Supabase:', error);
        return null;
    }
}

/**
 * Get mock finance data (for testing/fallback)
 */
function getMockFinanceData(user) {
    const programType = getProgramType(user?.program);
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType);
    const amount = getFeeAmount(programType);
    
    // Generate some mock payments (some completed, some pending)
    const mockPayments = [];
    const totalPeriods = programType === 'KRCHN' ? 9 : 9; // 3 semesters/terms per year
    
    // Add completed payments for first 4 periods
    for (let i = 0; i < Math.min(4, totalPeriods); i++) {
        const period = periods[i];
        mockPayments.push({
            date: `2026-${String(i+1).padStart(2, '0')}-15`,
            description: `${period} Fees`,
            period: period,
            amount: amount,
            method: i % 2 === 0 ? 'M-Pesa' : 'Bank Transfer',
            reference: `REF-${String(i+1).padStart(4, '0')}`,
            status: 'completed'
        });
    }
    
    // Add partial payment for current period
    if (totalPeriods > 4) {
        mockPayments.push({
            date: `2026-${String(5).padStart(2, '0')}-01`,
            description: `${periods[4]} Fees (Partial)`,
            period: periods[4],
            amount: Math.round(amount * 0.4),
            method: 'M-Pesa',
            reference: 'REF-PARTIAL',
            status: 'pending'
        });
    }
    
    // Calculate totals
    const totalPaid = mockPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
    const totalDue = amount * totalPeriods;
    
    return {
        balance: totalDue - totalPaid,
        totalPaid: totalPaid,
        totalDue: totalDue,
        outstanding: totalDue - totalPaid,
        paymentProgress: (totalPaid / totalDue) * 100,
        payments: mockPayments,
        feeStructure: periods.map(period => ({
            block: period,
            amount: amount,
            description: `${period} Tuition Fees`
        })),
        programType: programType,
        periodLabel: periodLabel,
        student: {
            name: user?.full_name || user?.name || 'Student',
            id: user?.studentId || user?.id || 'N/A',
            program: user?.program || 'KRCHN',
            intake: user?.intake || '2026'
        }
    };
}

// ============================================================
// UI UPDATE FUNCTIONS
// ============================================================

/**
 * Show loading state
 */
function showFinanceLoading() {
    // Payment history loading
    const historyBody = document.getElementById('studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px;">Loading payment history...</p>
                </td>
            </tr>
        `;
    }
    
    // Fee structure loading
    const feeStructure = document.getElementById('studentFeeStructureDisplay');
    if (feeStructure) {
        feeStructure.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #94a3b8;">
                <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 8px;">Loading fee structure...</p>
            </div>
        `;
    }
}

/**
 * Show error state
 */
function showFinanceError(message) {
    const historyBody = document.getElementById('studentPaymentHistory');
    if (historyBody) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                    <p>${message}</p>
                    <button onclick="loadStudentFinance()" style="margin-top: 10px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Update finance UI with data
 */
function updateFinanceUI(data) {
    if (!data) return;
    
    // Update program type indicator
    updateProgramTypeIndicator(data);
    
    // Update balance
    updateBalance(data);
    
    // Update stats
    updateStats(data);
    
    // Update payment history
    renderPayments(data.payments || []);
    
    // Update fee structure
    renderFeeStructure(data.feeStructure || []);
    
    // Update last updated
    const lastUpdated = document.getElementById('financeLastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString();
    }
    
    // Update badge
    updateFinanceBadge(data);
}

/**
 * Update program type indicator in UI
 */
function updateProgramTypeIndicator(data) {
    const programType = data.programType || 'KRCHN';
    const periodLabel = data.periodLabel || 'Semester';
    
    // Update the period labels in the UI
    const periodLabels = document.querySelectorAll('.period-label');
    periodLabels.forEach(el => {
        el.textContent = periodLabel;
    });
    
    // Update program info display
    const programInfo = document.getElementById('programTypeInfo');
    if (programInfo) {
        const programDisplay = programType === 'KRCHN' ? 
            'Nursing (KRCHN) - 3 Semesters per Year' : 
            'TVET - 3 Terms per Year';
        programInfo.textContent = programDisplay;
    }
    
    // Update filter dropdown
    const periodFilter = document.getElementById('financePeriodFilter');
    if (periodFilter) {
        // Keep the existing options but update display
        const options = periodFilter.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value && opt.value !== 'all') {
                // Find matching period from list
                const periods = getPeriods(programType);
                const match = periods.find(p => p === opt.value);
                if (match) {
                    opt.textContent = match;
                }
            }
        });
    }
    
    console.log(`📋 Using "${periodLabel}" terminology for this student`);
}

/**
 * Update balance display
 */
function updateBalance(data) {
    const balance = data.balance || 0;
    const totalPaid = data.totalPaid || 0;
    const totalDue = data.totalDue || 0;
    const outstanding = data.outstanding || (totalDue - totalPaid);
    const progress = data.paymentProgress || (totalDue > 0 ? (totalPaid / totalDue * 100) : 100);
    
    // Update balance
    const balanceDisplay = document.getElementById('studentBalanceDisplay');
    if (balanceDisplay) balanceDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    const totalPaidDisplay = document.getElementById('studentTotalPaid');
    if (totalPaidDisplay) totalPaidDisplay.textContent = `KES ${totalPaid.toLocaleString()}`;
    
    const totalDueDisplay = document.getElementById('studentTotalDue');
    if (totalDueDisplay) totalDueDisplay.textContent = `KES ${totalDue.toLocaleString()}`;
    
    const outstandingDisplay = document.getElementById('studentOutstanding');
    if (outstandingDisplay) outstandingDisplay.textContent = `KES ${outstanding.toLocaleString()}`;
    
    // Update status
    updateBalanceStatus(balance);
    
    // Update progress
    const progressPercent = Math.min(Math.round(progress), 100);
    const progressFill = document.getElementById('paymentProgressFill');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    
    const progressText = document.getElementById('paymentProgressText');
    if (progressText) progressText.textContent = `${progressPercent}%`;
}

/**
 * Update balance status
 */
function updateBalanceStatus(balance) {
    const statusEl = document.getElementById('balanceStatusDisplay');
    if (!statusEl) return;
    
    if (balance === 0) {
        statusEl.textContent = '✅ Paid in Full';
        statusEl.style.background = '#d1fae5';
        statusEl.style.color = '#059669';
    } else if (balance > 0 && balance <= 10000) {
        statusEl.textContent = '⚠️ Partial Payment';
        statusEl.style.background = '#fef3c7';
        statusEl.style.color = '#d97706';
    } else {
        statusEl.textContent = '🔴 Outstanding Balance';
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#dc2626';
    }
}

/**
 * Update stats
 */
function updateStats(data) {
    const payments = data.payments || [];
    
    const paid = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const overdue = payments.filter(p => p.status === 'failed' || p.status === 'overdue').length;
    
    const paidEl = document.getElementById('financePaidCount');
    if (paidEl) paidEl.textContent = paid;
    
    const pendingEl = document.getElementById('financePendingCount');
    if (pendingEl) pendingEl.textContent = pending;
    
    const overdueEl = document.getElementById('financeOverdueCount');
    if (overdueEl) overdueEl.textContent = overdue;
    
    const transactionsEl = document.getElementById('financeTotalTransactions');
    if (transactionsEl) transactionsEl.textContent = payments.length;
    
    const recordCount = document.getElementById('paymentRecordCount');
    if (recordCount) recordCount.textContent = `${payments.length} records`;
}

/**
 * Render payments table
 */
function renderPayments(payments) {
    const tbody = document.getElementById('studentPaymentHistory');
    if (!tbody) return;
    
    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fas fa-info-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    <p>No payment records found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = payments.map(p => {
        const statusColors = {
            completed: 'background:#d1fae5; color:#059669;',
            pending: 'background:#fef3c7; color:#d97706;',
            failed: 'background:#fee2e2; color:#dc2626;',
            overdue: 'background:#fee2e2; color:#dc2626;'
        };
        const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
        const statusStyle = statusColors[p.status] || statusColors.completed;
        
        return `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${p.date}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;"><strong>${p.description}</strong></td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${p.period}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;"><strong>KES ${p.amount.toLocaleString()}</strong></td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${p.method}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">${p.reference || '-'}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; ${statusStyle}">
                        ${statusLabel}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render fee structure
 */
function renderFeeStructure(fees) {
    const container = document.getElementById('studentFeeStructureDisplay');
    if (!container) return;
    
    if (!fees || fees.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8;">
                <i class="fas fa-info-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                <p>No fee structure available</p>
            </div>
        `;
        return;
    }
    
    let total = 0;
    container.innerHTML = fees.map(f => {
        total += f.amount || 0;
        return `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <div style="font-weight: 500; color: #0b1124;">${f.block}</div>
                    <div style="font-size: 12px; color: #94a3b8;">${f.description || 'Tuition fees'}</div>
                </div>
                <div style="font-weight: 600; color: #4C1D95;">KES ${(f.amount || 0).toLocaleString()}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML += `
        <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0; margin-top: 8px; border-top: 2px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #0A3D62;">
            <span>Total Program Fees</span>
            <span>KES ${total.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0 0 0; font-size: 13px; color: #64748b;">
            <span>Number of ${studentFinanceState.programType === 'KRCHN' ? 'Semesters' : 'Terms'}</span>
            <span>${fees.length}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0 0 0; font-size: 13px; color: #64748b;">
            <span>Duration</span>
            <span>${studentFinanceState.programType === 'KRCHN' ? '3 Years (9 Semesters)' : '3 Years (9 Terms)'}</span>
        </div>
    `;
    
    const totalEl = document.getElementById('feeStructureTotal');
    if (totalEl) totalEl.textContent = `Total: KES ${total.toLocaleString()}`;
}

/**
 * Update finance badge
 */
function updateFinanceBadge(data) {
    const badge = document.getElementById('financeBadge');
    const badgeCount = document.getElementById('financeBadgeCount');
    
    if (!badge || !badgeCount) return;
    
    const overdue = (data.payments || []).filter(p => p.status === 'failed' || p.status === 'overdue').length;
    const pending = (data.payments || []).filter(p => p.status === 'pending').length;
    const total = overdue + pending;
    
    if (total > 0) {
        badge.style.display = 'inline-block';
        badgeCount.textContent = total;
        badge.style.background = total > 0 ? '#ef4444' : '#f59e0b';
    } else {
        badge.style.display = 'none';
    }
}

// ============================================================
// FILTER FUNCTIONS
// ============================================================

/**
 * Filter student payments
 */
function filterStudentPayments() {
    // Get filter values
    const statusFilter = document.getElementById('financePaymentFilter')?.value || 'all';
    const periodFilter = document.getElementById('financePeriodFilter')?.value || 'all';
    const searchTerm = document.getElementById('financeSearch')?.value?.toLowerCase() || '';
    
    // Get current payments from state
    const payments = studentFinanceState.payments || [];
    
    // Apply filters
    let filtered = payments.filter(p => {
        // Status filter
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        
        // Period filter
        if (periodFilter !== 'all' && p.period !== periodFilter) return false;
        
        // Search filter
        if (searchTerm) {
            const searchable = `${p.description} ${p.reference} ${p.method}`.toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    // Re-render with filtered data
    renderPayments(filtered);
    const recordCount = document.getElementById('paymentRecordCount');
    if (recordCount) recordCount.textContent = `${filtered.length} records`;
}

// ============================================================
// ACTION FUNCTIONS
// ============================================================

/**
 * Initiate payment
 */
function initiatePayment() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType);
    
    Swal.fire({
        title: '💰 Make Payment',
        html: `
            <div style="text-align: left;">
                <p style="margin-bottom: 12px; color: #64748b;">Select your payment method and enter the amount.</p>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">Payment Method</label>
                    <select id="paymentMethodSelect" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                        <option value="M-Pesa">M-Pesa</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash (On-site)</option>
                        <option value="Card">Card Payment</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">Amount (KES)</label>
                    <input type="number" id="paymentAmountInput" placeholder="Enter amount" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">Payment ${periodLabel}</label>
                    <select id="paymentPeriodSelect" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                        ${periods.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
                
                <div style="padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac; font-size: 13px; color: #065f46;">
                    <i class="fas fa-info-circle"></i> 
                    You will be redirected to complete the payment securely.
                </div>
            </div>
        `,
        confirmButtonText: 'Proceed to Payment',
        cancelButtonText: 'Cancel',
        showCancelButton: true,
        confirmButtonColor: '#4C1D95',
        preConfirm: () => {
            const method = document.getElementById('paymentMethodSelect').value;
            const amount = document.getElementById('paymentAmountInput').value;
            const period = document.getElementById('paymentPeriodSelect').value;
            
            if (!amount || parseFloat(amount) <= 0) {
                Swal.showValidationMessage('Please enter a valid amount');
                return false;
            }
            
            if (parseFloat(amount) < 100) {
                Swal.showValidationMessage('Minimum payment is KES 100');
                return false;
            }
            
            return { method, amount: parseFloat(amount), period };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { method, amount, period } = result.value;
            Swal.fire({
                title: 'Payment Initiated',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Amount:</strong> KES ${amount.toLocaleString()}</p>
                        <p><strong>Method:</strong> ${method}</p>
                        <p><strong>${periodLabel}:</strong> ${period}</p>
                        <p style="margin-top: 12px; color: #64748b; font-size: 14px;">Please wait while we redirect you to complete the payment...</p>
                    </div>
                `,
                icon: 'info',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Simulate redirect
            setTimeout(() => {
                Swal.fire({
                    title: 'Redirecting...',
                    text: 'You will be taken to the payment portal.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }, 2000);
        }
    });
}

/**
 * Download student statement
 */
function downloadStudentStatement() {
    Swal.fire({
        title: 'Generating Statement',
        html: `
            <div style="text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
                <p>Your fee statement is being generated...</p>
                <p style="font-size: 12px; color: #94a3b8;">Please wait</p>
            </div>
        `,
        showConfirmButton: false,
        timer: 2000
    });
    
    setTimeout(() => {
        Swal.fire({
            title: '✅ Statement Ready!',
            text: 'Your fee statement has been downloaded.',
            icon: 'success',
            confirmButtonColor: '#4C1D95'
        });
    }, 2000);
}

/**
 * View student invoices
 */
function viewStudentInvoice() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const periods = getPeriods(programType);
    const amount = getFeeAmount(programType);
    
    let invoicesHtml = '';
    const statuses = ['✅ Paid', '⏳ Partial', '🔴 Outstanding'];
    
    periods.forEach((period, index) => {
        const status = index < 4 ? statuses[0] : (index === 4 ? statuses[1] : statuses[2]);
        const color = index < 4 ? '#059669' : (index === 4 ? '#d97706' : '#dc2626');
        invoicesHtml += `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: ${index < periods.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                <span><strong>${period}</strong></span>
                <span>KES ${amount.toLocaleString()}</span>
                <span style="color: ${color};">${status}</span>
            </div>
        `;
    });
    
    Swal.fire({
        title: '📄 Fee Breakdown',
        html: `
            <div style="text-align: left;">
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 10px 0; border: 1px solid #e5e7eb;">
                    ${invoicesHtml}
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                    <i class="fas fa-info-circle"></i> 
                    ${programType === 'KRCHN' ? '3 Semesters per year for 3 years' : '3 Terms per year for 3 years'}
                </p>
            </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#4C1D95',
        width: 600
    });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('financeToastContainer');
    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `finance-toast finance-toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================
// COMMUNICATION WITH FINANCE MODULE
// ============================================================

/**
 * Listen for updates from Finance Module
 */
function listenForFinanceUpdates() {
    // Listen for storage events from Finance Module
    window.addEventListener('storage', function(e) {
        if (e.key === 'finance_to_student') {
            try {
                const data = JSON.parse(e.newValue);
                if (data && data.data) {
                    console.log('📨 Finance update received:', data);
                    // Refresh finance data
                    setTimeout(loadStudentFinance, 500);
                }
            } catch (e) {
                // Ignore
            }
        }
    });
    
    // Listen for custom events from Finance Module
    window.addEventListener('studentFinanceUpdate', function(e) {
        console.log('📨 Finance event received:', e.detail);
        setTimeout(loadStudentFinance, 500);
    });
}

// ============================================================
// AUTO-LOAD ON TAB ACTIVATION
// ============================================================

// Listen for tab changes to load finance data
document.addEventListener('DOMContentLoaded', function() {
    // Check if finance tab exists and load data when shown
    const financeTab = document.querySelector('a[data-tab="finance"]');
    if (financeTab) {
        financeTab.addEventListener('click', function() {
            setTimeout(loadStudentFinance, 300);
        });
    }
    
    // Listen for app ready event
    document.addEventListener('appReady', function() {
        console.log('📱 App ready, loading student finance...');
        setTimeout(loadStudentFinance, 800);
    });
    
    // Also load if already on finance tab
    const currentTab = document.querySelector('.tab-content.active');
    if (currentTab && currentTab.id === 'finance') {
        setTimeout(loadStudentFinance, 500);
    }
    
    // Setup filter listeners
    const paymentFilter = document.getElementById('financePaymentFilter');
    if (paymentFilter) paymentFilter.addEventListener('change', filterStudentPayments);
    
    const periodFilter = document.getElementById('financePeriodFilter');
    if (periodFilter) periodFilter.addEventListener('change', filterStudentPayments);
    
    const searchInput = document.getElementById('financeSearch');
    if (searchInput) searchInput.addEventListener('keyup', filterStudentPayments);
    
    // Listen for finance updates
    listenForFinanceUpdates();
    
    // Add spin animation style if not exists
    if (!document.getElementById('financeSpinStyle')) {
        const style = document.createElement('style');
        style.id = 'financeSpinStyle';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
});

console.log('✅ Student Finance module loaded');
console.log('📊 Supports KRCHN (3 Semesters per year) and TVET (3 Terms per year)');
