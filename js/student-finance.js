// ============================================================
// UPDATED STUDENT FINANCE MODULE
// Supports KRCHN (Semesters) and TVET (Terms with Years)
// ============================================================

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
    programType: 'KRCHN', // 'KRCHN' or 'TVET'
    programLevel: 'diploma', // 'certificate' or 'diploma'
    currentPeriod: null,
    semesterFee: 0,
    paidThisSemester: 0,
    currentPeriodIndex: 0
};

// ============================================================
// PROGRAM TYPE DETECTION
// ============================================================

function getProgramType(program) {
    if (!program) return 'KRCHN';
    
    // KRCHN programs
    const krchnPrograms = ['KRCHN'];
    if (krchnPrograms.includes(program.toUpperCase())) {
        return 'KRCHN';
    }
    
    // TVET programs - all others are TVET
    return 'TVET';
}

function getProgramLevel(program) {
    // Check if it's a certificate course
    const certificatePrograms = ['CCH', 'CPOTT', 'DHRIT'];
    if (certificatePrograms.includes(program)) {
        return 'certificate';
    }
    // Diploma courses
    return 'diploma';
}

function getPeriodLabel(programType) {
    return programType === 'KRCHN' ? 'Semester' : 'Term';
}

function getPeriods(programType, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        // KRCHN: 3 years × 3 semesters = 9 periods
        return [
            'Year 1 - Semester 1',
            'Year 1 - Semester 2',
            'Year 1 - Semester 3',
            'Year 2 - Semester 1',
            'Year 2 - Semester 2',
            'Year 2 - Semester 3',
            'Year 3 - Semester 1',
            'Year 3 - Semester 2',
            'Year 3 - Semester 3'
        ];
    } else {
        // TVET: Terms with year labels
        if (programLevel === 'certificate') {
            // Certificate: 1 year = 3 terms
            return [
                'Year 1 - Term 1',
                'Year 1 - Term 2',
                'Year 1 - Term 3'
            ];
        } else {
            // Diploma: 2 years = 6 terms
            return [
                'Year 1 - Term 1',
                'Year 1 - Term 2',
                'Year 1 - Term 3',
                'Year 2 - Term 1',
                'Year 2 - Term 2',
                'Year 2 - Term 3'
            ];
        }
    }
}

function getTotalFees(programType, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        return 94100 + (8 * 64100); // 606,900
    } else {
        if (programLevel === 'certificate') {
            return 57100 + (2 * 47000); // 151,100 (3 terms)
        } else {
            return 57100 + (5 * 47000); // 292,100 (6 terms)
        }
    }
}

function getFeeAmount(programType, periodIndex, programLevel = 'diploma') {
    if (programType === 'KRCHN') {
        // KRCHN: Semester 1 (index 0) = 94,100, others = 64,100
        return periodIndex === 0 ? 94100 : 64100;
    } else {
        // TVET: Term 1 (index 0) = 57,100, others = 47,000
        return periodIndex === 0 ? 57100 : 47000;
    }
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

async function loadStudentFinance() {
    try {
        console.log('💰 Loading student finance...');
        
        const user = window.currentUserProfile || window.currentUser;
        if (!user) {
            console.warn('No user found');
            showFinanceError('Please login to view your finance data.');
            return;
        }

        // Detect program type and level
        const programType = getProgramType(user.program);
        const programLevel = getProgramLevel(user.program);
        studentFinanceState.programType = programType;
        studentFinanceState.programLevel = programLevel;
        
        console.log('👤 User:', user.full_name || user.name);
        console.log('📚 Program:', user.program);
        console.log('🏷️ Program Type:', programType);
        console.log('📊 Program Level:', programLevel);
        console.log(`📋 Using ${getPeriodLabel(programType)}s for this student`);

        // Update UI with program info
        updateProgramInfo(user, programType, programLevel);

        // Show loading state
        showFinanceLoading();

        // Fetch data from Supabase
        const financeData = await fetchFinanceDataFromSupabase(user);
        
        if (financeData) {
            updateFinanceUI(financeData);
            studentFinanceState.isLoaded = true;
            studentFinanceState.lastUpdated = new Date();
            console.log('✅ Finance data loaded successfully');
        } else {
            console.log('📊 No data found, using mock data');
            const mockData = getMockFinanceData(user);
            updateFinanceUI(mockData);
        }
        
    } catch (error) {
        console.error('Error loading finance:', error);
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

function updateProgramInfo(user, programType, programLevel) {
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    
    // Update program display
    const programDisplay = document.getElementById('studentProgramDisplay');
    if (programDisplay) {
        programDisplay.textContent = user.program || 'N/A';
    }
    
    // Update period type badge
    const periodTypeBadge = document.getElementById('periodTypeBadge');
    if (periodTypeBadge) {
        if (programType === 'KRCHN') {
            periodTypeBadge.textContent = 'KRCHN';
            periodTypeBadge.style.background = 'rgba(253,185,19,0.2)';
            periodTypeBadge.style.color = '#FDB913';
        } else {
            periodTypeBadge.textContent = programLevel === 'certificate' ? 'TVET (Cert)' : 'TVET (Dip)';
            periodTypeBadge.style.background = 'rgba(59,130,246,0.2)';
            periodTypeBadge.style.color = '#3b82f6';
        }
    }
    
    // Update intake display
    const intakeDisplay = document.getElementById('studentIntakeDisplay');
    if (intakeDisplay) {
        intakeDisplay.textContent = user.intake || '2026';
    }
    
    // Update period label in balance card
    const currentPeriodLabel = document.getElementById('currentPeriodLabel');
    if (currentPeriodLabel) {
        currentPeriodLabel.textContent = `Current ${periodLabel}`;
    }
    
    // Update progress period label
    const progressPeriodLabel = document.getElementById('progressPeriodLabel');
    if (progressPeriodLabel) {
        progressPeriodLabel.textContent = `Current ${periodLabel}`;
    }
    
    // Update period filter dropdown
    updatePeriodFilter(programType, programLevel);
    
    // Update fee structure display
    renderFeeStructure(periods, programType, programLevel);
}

function updatePeriodFilter(programType, programLevel) {
    const periodFilter = document.getElementById('financePeriodFilter');
    if (!periodFilter) return;
    
    const periods = getPeriods(programType, programLevel);
    const periodLabel = getPeriodLabel(programType);
    
    // Clear existing options except "All Periods"
    while (periodFilter.options.length > 1) {
        periodFilter.remove(1);
    }
    
    // Add new period options
    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period;
        option.textContent = period;
        periodFilter.appendChild(option);
    });
}

// ============================================================
// FETCH FINANCE DATA
// ============================================================

async function fetchFinanceDataFromSupabase(user) {
    try {
        if (typeof supabase === 'undefined' || !supabase) {
            console.warn('⚠️ Supabase not available');
            return null;
        }

        const studentId = user.id;
        const program = user.program || 'KRCHN';
        const programType = getProgramType(program);
        const programLevel = getProgramLevel(program);
        const periodLabel = getPeriodLabel(programType);
        const periods = getPeriods(programType, programLevel);

        console.log('📊 Fetching data for student:', studentId);

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
            }
        } catch (e) {
            console.log('ℹ️ Payments table may not exist yet');
        }

        // 3. Determine current period from account data or user
        let currentPeriod = accountData?.current_block || periods[0];
        const currentPeriodIndex = periods.indexOf(currentPeriod);
        
        // Get semester/term fee based on program type and period
        const semesterFee = getFeeAmount(programType, currentPeriodIndex >= 0 ? currentPeriodIndex : 0, programLevel);
        
        // Calculate paid this period
        const paidThisSemester = paymentsData
            .filter(p => p.period === currentPeriod && p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);
        
        // Calculate balance for current period
        const balance = semesterFee - paidThisSemester;

        // Format payments
        const formattedPayments = paymentsData.map(p => {
            // Ensure period matches the correct format
            let period = p.period;
            if (programType === 'KRCHN' && !period.includes('Semester')) {
                // Convert to semester format if needed
                const num = period.replace(/\D/g, '');
                period = num ? `Year ${Math.ceil(num/3)} - Semester ${((num-1)%3)+1}` : periods[0];
            } else if (programType === 'TVET' && !period.includes('Term')) {
                // Convert to term format if needed
                const num = period.replace(/\D/g, '');
                period = num ? `Year ${Math.ceil(num/3)} - Term ${((num-1)%3)+1}` : periods[0];
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

        // Format fee structure
        const formattedFees = periods.map((period, index) => ({
            block: period,
            amount: getFeeAmount(programType, index, programLevel),
            description: `${period} Tuition Fees`
        }));

        return {
            balance: Math.max(balance, 0),
            totalPaid: accountData?.total_paid || paymentsData.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
            totalDue: semesterFee,
            outstanding: Math.max(balance, 0),
            paymentProgress: semesterFee > 0 ? (paidThisSemester / semesterFee * 100) : 0,
            payments: formattedPayments,
            feeStructure: formattedFees,
            programType: programType,
            programLevel: programLevel,
            periodLabel: periodLabel,
            currentPeriod: currentPeriod,
            currentPeriodIndex: currentPeriodIndex,
            semesterFee: semesterFee,
            paidThisSemester: paidThisSemester,
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

// ============================================================
// MOCK DATA
// ============================================================

function getMockFinanceData(user) {
    const programType = getProgramType(user?.program);
    const programLevel = getProgramLevel(user?.program);
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    const amount = getFeeAmount(programType, 0, programLevel);
    
    // Generate mock payments
    const mockPayments = [];
    const totalPeriods = periods.length;
    
    // Add completed payments for first period
    mockPayments.push({
        date: '2026-07-31',
        description: `${periods[0]} Fees (Full)`,
        period: periods[0],
        amount: amount,
        method: 'M-Pesa',
        reference: 'MPESA-7845',
        status: 'completed'
    });
    
    // Add partial payment for current period if more than 1 period
    if (totalPeriods > 1) {
        mockPayments.push({
            date: '2026-08-15',
            description: `${periods[1]} Fees (Partial)`,
            period: periods[1],
            amount: Math.round(amount * 0.4),
            method: 'Bank Transfer',
            reference: 'BT-5678',
            status: 'pending'
        });
    }
    
    // Calculate totals
    const totalPaid = mockPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);
    const totalDue = getTotalFees(programType, programLevel);
    
    // Determine current period
    const currentPeriod = periods[0];
    const semesterFee = getFeeAmount(programType, 0, programLevel);
    const paidThisSemester = mockPayments
        .filter(p => p.period === currentPeriod && p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

    return {
        balance: Math.max(semesterFee - paidThisSemester, 0),
        totalPaid: totalPaid,
        totalDue: semesterFee,
        outstanding: Math.max(semesterFee - paidThisSemester, 0),
        paymentProgress: semesterFee > 0 ? (paidThisSemester / semesterFee * 100) : 0,
        payments: mockPayments,
        feeStructure: periods.map((period, index) => ({
            block: period,
            amount: getFeeAmount(programType, index, programLevel),
            description: `${period} Tuition Fees`
        })),
        programType: programType,
        programLevel: programLevel,
        periodLabel: periodLabel,
        currentPeriod: currentPeriod,
        currentPeriodIndex: 0,
        semesterFee: semesterFee,
        paidThisSemester: paidThisSemester,
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

function updateFinanceUI(data) {
    if (!data) return;
    
    // Update program info
    updateProgramInfo(data.student, data.programType, data.programLevel);
    
    // Update balance
    updateBalance(data);
    
    // Update stats
    updateStats(data);
    
    // Update payment history
    renderPayments(data.payments || []);
    
    // Update fee structure
    renderFeeStructureData(data.feeStructure || []);
    
    // Update last updated
    const lastUpdated = document.getElementById('financeLastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleString();
    }
    
    // Update badge
    updateFinanceBadge(data);
}

function updateBalance(data) {
    const balance = data.balance || 0;
    const semesterFee = data.semesterFee || 0;
    const paidThisSemester = data.paidThisSemester || 0;
    const progress = data.paymentProgress || 0;
    
    // Update balance
    const balanceDisplay = document.getElementById('studentBalanceDisplay');
    if (balanceDisplay) balanceDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    const semesterFeeDisplay = document.getElementById('studentSemesterFee');
    if (semesterFeeDisplay) semesterFeeDisplay.textContent = `KES ${semesterFee.toLocaleString()}`;
    
    const paidDisplay = document.getElementById('studentPaidThisSemester');
    if (paidDisplay) paidDisplay.textContent = `KES ${paidThisSemester.toLocaleString()}`;
    
    const outstandingDisplay = document.getElementById('studentOutstanding');
    if (outstandingDisplay) outstandingDisplay.textContent = `KES ${balance.toLocaleString()}`;
    
    // Update status
    updateBalanceStatus(balance);
    
    // Update progress
    const progressPercent = Math.min(Math.round(progress), 100);
    const progressFill = document.getElementById('paymentProgressFill');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    
    const progressText = document.getElementById('paymentProgressText');
    if (progressText) progressText.textContent = `${progressPercent}%`;
}

function updateBalanceStatus(balance) {
    const statusEl = document.getElementById('balanceStatusDisplay');
    if (!statusEl) return;
    
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    if (balance === 0) {
        statusEl.style.background = 'rgba(16,185,129,0.2)';
        statusEl.style.color = '#10b981';
        if (dot) dot.style.background = '#10b981';
        if (text) text.textContent = 'Paid in Full';
    } else if (balance > 0 && balance <= 10000) {
        statusEl.style.background = 'rgba(245,158,11,0.2)';
        statusEl.style.color = '#f59e0b';
        if (dot) dot.style.background = '#f59e0b';
        if (text) text.textContent = 'Partial Payment';
    } else {
        statusEl.style.background = 'rgba(239,68,68,0.2)';
        statusEl.style.color = '#ef4444';
        if (dot) dot.style.background = '#ef4444';
        if (text) text.textContent = 'Outstanding Balance';
    }
}

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
            completed: 'background: #d1fae5; color: #059669;',
            pending: 'background: #fef3c7; color: #d97706;',
            failed: 'background: #fee2e2; color: #dc2626;',
            overdue: 'background: #fee2e2; color: #dc2626;'
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

function renderFeeStructure(periods, programType, programLevel) {
    const container = document.getElementById('studentFeeStructureDisplay');
    if (!container) return;
    
    let total = 0;
    let html = '';
    
    periods.forEach((period, index) => {
        const amount = getFeeAmount(programType, index, programLevel);
        total += amount;
        html += `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <div style="font-weight: 500; color: #0b1124;">${period}</div>
                    <div style="font-size: 12px; color: #94a3b8;">${period} Tuition Fees</div>
                </div>
                <div style="font-weight: 600; color: #4C1D95;">KES ${amount.toLocaleString()}</div>
            </div>
        `;
    });
    
    container.innerHTML = html + `
        <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0; margin-top: 8px; border-top: 2px solid #e5e7eb; font-weight: 700; font-size: 16px; color: #0A3D62;">
            <span>Total Program Fees</span>
            <span>KES ${total.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0 0 0; font-size: 13px; color: #64748b;">
            <span>Number of ${programType === 'KRCHN' ? 'Semesters' : 'Terms'}</span>
            <span>${periods.length}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0 0 0; font-size: 13px; color: #64748b;">
            <span>Duration</span>
            <span>${programType === 'KRCHN' ? '3 Years' : programLevel === 'certificate' ? '1 Year' : '2 Years'}</span>
        </div>
    `;
    
    const totalEl = document.getElementById('feeStructureTotal');
    if (totalEl) totalEl.textContent = `Total: KES ${total.toLocaleString()}`;
}

function renderFeeStructureData(fees) {
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
    `;
    
    const totalEl = document.getElementById('feeStructureTotal');
    if (totalEl) totalEl.textContent = `Total: KES ${total.toLocaleString()}`;
}

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

function filterStudentPayments() {
    const statusFilter = document.getElementById('financePaymentFilter')?.value || 'all';
    const periodFilter = document.getElementById('financePeriodFilter')?.value || 'all';
    const searchTerm = document.getElementById('financeSearch')?.value?.toLowerCase() || '';
    
    const payments = studentFinanceState.payments || [];
    
    let filtered = payments.filter(p => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (periodFilter !== 'all' && p.period !== periodFilter) return false;
        if (searchTerm) {
            const searchable = `${p.description} ${p.reference} ${p.method}`.toLowerCase();
            if (!searchable.includes(searchTerm)) return false;
        }
        return true;
    });
    
    renderPayments(filtered);
    const recordCount = document.getElementById('paymentRecordCount');
    if (recordCount) recordCount.textContent = `${filtered.length} records`;
}

// ============================================================
// ACTION FUNCTIONS
// ============================================================

function initiatePayment() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periodLabel = getPeriodLabel(programType);
    const periods = getPeriods(programType, programLevel);
    
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

function viewStudentInvoice() {
    const programType = studentFinanceState.programType || 'KRCHN';
    const programLevel = studentFinanceState.programLevel || 'diploma';
    const periods = getPeriods(programType, programLevel);
    
    let invoicesHtml = '';
    const statuses = ['✅ Paid', '⏳ Partial', '🔴 Outstanding'];
    
    periods.forEach((period, index) => {
        const status = index < 1 ? statuses[0] : (index === 1 ? statuses[1] : statuses[2]);
        const color = index < 1 ? '#059669' : (index === 1 ? '#d97706' : '#dc2626');
        const amount = getFeeAmount(programType, index, programLevel);
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
                    ${programType === 'KRCHN' ? '3 Semesters per year for 3 years' : 
                      programLevel === 'certificate' ? '3 Terms per year for 1 year' : 
                      '3 Terms per year for 2 years'}
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

function listenForFinanceUpdates() {
    window.addEventListener('storage', function(e) {
        if (e.key === 'finance_to_student') {
            try {
                const data = JSON.parse(e.newValue);
                if (data && data.data) {
                    console.log('📨 Finance update received:', data);
                    setTimeout(loadStudentFinance, 500);
                }
            } catch (e) {
                // Ignore
            }
        }
    });
    
    window.addEventListener('studentFinanceUpdate', function(e) {
        console.log('📨 Finance event received:', e.detail);
        setTimeout(loadStudentFinance, 500);
    });
}

// ============================================================
// SHOW LOADING / ERROR
// ============================================================

function showFinanceLoading() {
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

// ============================================================
// AUTO-LOAD ON TAB ACTIVATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    const financeTab = document.querySelector('a[data-tab="finance"]');
    if (financeTab) {
        financeTab.addEventListener('click', function() {
            setTimeout(loadStudentFinance, 300);
        });
    }
    
    document.addEventListener('appReady', function() {
        console.log('📱 App ready, loading student finance...');
        setTimeout(loadStudentFinance, 800);
    });
    
    const currentTab = document.querySelector('.tab-content.active');
    if (currentTab && currentTab.id === 'finance') {
        setTimeout(loadStudentFinance, 500);
    }
    
    const paymentFilter = document.getElementById('financePaymentFilter');
    if (paymentFilter) paymentFilter.addEventListener('change', filterStudentPayments);
    
    const periodFilter = document.getElementById('financePeriodFilter');
    if (periodFilter) periodFilter.addEventListener('change', filterStudentPayments);
    
    const searchInput = document.getElementById('financeSearch');
    if (searchInput) searchInput.addEventListener('keyup', filterStudentPayments);
    
    listenForFinanceUpdates();
    
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
console.log('📊 Supports KRCHN (Semesters) and TVET (Terms with Years)');
console.log('📚 TVET Certificate: 1 Year (3 Terms)');
console.log('📚 TVET Diploma: 2 Years (6 Terms)');
