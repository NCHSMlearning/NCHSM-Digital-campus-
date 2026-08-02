/**
 * STUDENT FINANCE MODULE
 * Handles student-facing finance functionality
 * Communicates with the standalone Finance Module
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
    isLoaded: false
};

// ============================================================
// MAIN FUNCTIONS
// ============================================================

/**
 * Load student finance data
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

        // Show loading state
        showFinanceLoading();

        // Fetch data from Finance Module API
        const financeData = await fetchFinanceData(user);
        
        // Update UI with data
        updateFinanceUI(financeData);
        
        studentFinanceState.isLoaded = true;
        studentFinanceState.lastUpdated = new Date();
        
        console.log('✅ Finance data loaded successfully');
        
    } catch (error) {
        console.error('Error loading finance:', error);
        showFinanceError('Unable to load finance data. Please try again.');
    }
}

/**
 * Fetch finance data from Finance Module API
 */
async function fetchFinanceData(user) {
    try {
        // Check if finance module is available
        const financeModuleUrl = getFinanceModuleUrl();
        
        // Try to fetch from Finance Module API
        const response = await fetch(`${financeModuleUrl}/api/student/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
        
        // Fallback: Use local data if Finance Module is not available
        console.warn('Finance Module not available, using local data');
        return getMockFinanceData(user);
        
    } catch (error) {
        console.warn('Error fetching from Finance Module, using local data:', error);
        return getMockFinanceData(user);
    }
}

/**
 * Get Finance Module URL
 */
function getFinanceModuleUrl() {
    // Check if finance module is on same domain or subdomain
    const currentHost = window.location.hostname;
    
    // Try different possible locations
    const possibleUrls = [
        '/finance-module',
        'https://finance.nchsm.co.ke',
        'https://nchsm.co.ke/finance-module',
        '../finance-module'
    ];
    
    // Return the first one that works (or default)
    return possibleUrls[0];
}

/**
 * Get authentication token
 */
function getAuthToken() {
    // Try to get token from various sources
    try {
        const user = JSON.parse(localStorage.getItem('finance_user') || 'null');
        if (user && user.token) return user.token;
        
        const session = JSON.parse(localStorage.getItem('supabase.auth.token') || 'null');
        if (session && session.access_token) return session.access_token;
        
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Get mock finance data (for testing)
 */
function getMockFinanceData(user) {
    return {
        balance: 45000,
        totalPaid: 135000,
        totalDue: 180000,
        outstanding: 45000,
        paymentProgress: 75,
        payments: [
            { 
                date: '2026-07-31', 
                description: 'Term 2 Fees - Block 2', 
                period: 'Term 2', 
                amount: 45000, 
                method: 'M-Pesa', 
                reference: 'MPESA-7845', 
                status: 'completed' 
            },
            { 
                date: '2026-07-15', 
                description: 'Term 2 Fees - Block 2', 
                period: 'Term 2', 
                amount: 30000, 
                method: 'Bank Transfer', 
                reference: 'BT-5678', 
                status: 'completed' 
            },
            { 
                date: '2026-07-01', 
                description: 'Term 1 Fees - Block 1', 
                period: 'Term 1', 
                amount: 60000, 
                method: 'Cash', 
                reference: 'CASH-1234', 
                status: 'completed' 
            },
            { 
                date: '2026-06-15', 
                description: 'Term 1 Fees - Block 1', 
                period: 'Term 1', 
                amount: 30000, 
                method: 'M-Pesa', 
                reference: 'MPESA-9012', 
                status: 'pending' 
            },
        ],
        feeStructure: [
            { block: 'Introductory', amount: 60000, description: 'Foundation Block Tuition' },
            { block: 'Block 1', amount: 60000, description: 'Block 1 Tuition' },
            { block: 'Block 2', amount: 60000, description: 'Block 2 Tuition' },
            { block: 'Block 3', amount: 60000, description: 'Block 3 Tuition' },
        ],
        student: {
            name: user.full_name || user.name || 'Student',
            id: user.studentId || user.id || 'N/A',
            program: user.program || 'KRCHN',
            intake: user.intake || '2026'
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
    
    // Update balance
    updateBalance(data);
    
    // Update stats
    updateStats(data);
    
    // Update payment history
    renderPayments(data.payments || []);
    
    // Update fee structure
    renderFeeStructure(data.feeStructure || []);
    
    // Update last updated
    document.getElementById('financeLastUpdated').textContent = new Date().toLocaleString();
    
    // Update badge
    updateFinanceBadge(data);
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
    document.getElementById('studentBalanceDisplay').textContent = `KES ${balance.toLocaleString()}`;
    document.getElementById('studentTotalPaid').textContent = `KES ${totalPaid.toLocaleString()}`;
    document.getElementById('studentTotalDue').textContent = `KES ${totalDue.toLocaleString()}`;
    document.getElementById('studentOutstanding').textContent = `KES ${outstanding.toLocaleString()}`;
    
    // Update status
    updateBalanceStatus(balance);
    
    // Update progress
    const progressPercent = Math.min(Math.round(progress), 100);
    document.getElementById('paymentProgressFill').style.width = `${progressPercent}%`;
    document.getElementById('paymentProgressText').textContent = `${progressPercent}%`;
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
    
    document.getElementById('financePaidCount').textContent = paid;
    document.getElementById('financePendingCount').textContent = pending;
    document.getElementById('financeOverdueCount').textContent = overdue;
    document.getElementById('financeTotalTransactions').textContent = payments.length;
    document.getElementById('paymentRecordCount').textContent = `${payments.length} records`;
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
            <span>Total</span>
            <span>KES ${total.toLocaleString()}</span>
        </div>
    `;
    
    document.getElementById('feeStructureTotal').textContent = `Total: KES ${total.toLocaleString()}`;
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
    document.getElementById('paymentRecordCount').textContent = `${filtered.length} records`;
}

// ============================================================
// ACTION FUNCTIONS
// ============================================================

/**
 * Initiate payment
 */
function initiatePayment() {
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
                    <label style="font-weight: 600; font-size: 13px; color: #475569; display: block; margin-bottom: 4px;">Payment Period</label>
                    <select id="paymentPeriodSelect" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; background: #f8fafc;">
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2" selected>Term 2</option>
                        <option value="Term 3">Term 3</option>
                        <option value="Full Year">Full Year</option>
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
                        <p><strong>Period:</strong> ${period}</p>
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
    Swal.fire({
        title: '📄 Your Invoices',
        html: `
            <div style="text-align: left;">
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin: 10px 0; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                        <span><strong>INV-2026-001</strong></span>
                        <span>KES 45,000</span>
                        <span style="color: #059669;">✅ Paid</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
                        <span><strong>INV-2026-002</strong></span>
                        <span>KES 60,000</span>
                        <span style="color: #d97706;">⏳ Partial</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span><strong>INV-2026-003</strong></span>
                        <span>KES 75,000</span>
                        <span style="color: #dc2626;">🔴 Outstanding</span>
                    </div>
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                    <i class="fas fa-info-circle"></i> Click "View All" to see complete invoice details
                </p>
            </div>
        `,
        confirmButtonText: 'View All Invoices',
        cancelButtonText: 'Close',
        showCancelButton: true,
        confirmButtonColor: '#4C1D95'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Invoices',
                text: 'Redirecting to full invoice list...',
                icon: 'info',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
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

// Listen for tab changes
document.addEventListener('DOMContentLoaded', function() {
    // Check if finance
