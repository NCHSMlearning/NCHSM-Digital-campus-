/**
 * FINANCE MODULE - API COMMUNICATION LAYER
 * Handles all Supabase database operations
 * Communicates with both Super Admin and Student Dashboards
 */

// ============================================================
// SUPABASE CLIENT - USE EXISTING OR CREATE NEW
// ============================================================

// Get Supabase client from window (set in finance.html)
// DON'T redeclare with 'const' - use window reference
const supabaseClient = window.supabase || window.sb;

// If supabase client doesn't exist, create it using config
if (!supabaseClient && typeof window.FINANCE_CONFIG !== 'undefined') {
    console.log('🔧 Creating Supabase client from config...');
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(
        window.FINANCE_CONFIG.SUPABASE_URL,
        window.FINANCE_CONFIG.SUPABASE_ANON_KEY
    );
    var supabase = window.supabaseClient;
} else {
    var supabase = supabaseClient;
}

// Make available globally
window.sb = supabase;

if (!supabase) {
    console.error('❌ Supabase client not available!');
} else {
    console.log('🔗 Finance API: Supabase client available:', !!supabase);
}

// ============================================================
// TABLE NAMES
// ============================================================

const TABLES = window.FINANCE_CONFIG ? window.FINANCE_CONFIG.TABLES : {
    USER_PROFILES: 'consolidated_user_profiles_table',
    PAYMENTS: 'finance_payments',
    FEE_STRUCTURE: 'finance_fee_structure',
    STUDENT_ACCOUNTS: 'finance_student_accounts',
    TRANSACTIONS: 'finance_transactions',
    AUDIT_LOGS: 'finance_audit_logs'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get current finance user from storage
 */
function getCurrentFinanceUser() {
    try {
        let user = JSON.parse(localStorage.getItem('finance_user') || 'null');
        if (user) return user;
        user = JSON.parse(sessionStorage.getItem('finance_user') || 'null');
        if (user) return user;
        return null;
    } catch (e) {
        console.error('Error getting user:', e);
        return null;
    }
}

/**
 * Check if user has admin/finance access
 */
function isFinanceAdmin() {
    const user = getCurrentFinanceUser();
    if (!user) return false;
    const allowedRoles = ['superadmin', 'admin', 'finance_officer'];
    return allowedRoles.includes(user.role);
}

// ============================================================
// STUDENT ACCOUNTS
// ============================================================

/**
 * Get all students (Admin only)
 */
async function getStudents(params = {}) {
    try {
        if (!supabase) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockStudents();
        }

        let query = supabase
            .from(TABLES.USER_PROFILES)
            .select('*')
            .eq('role', 'student');

        if (params.program) {
            query = query.eq('program', params.program);
        }
        if (params.status) {
            query = query.eq('status', params.status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting students:', error);
        return getMockStudents();
    }
}

/**
 * Get all student accounts
 */
async function getStudentAccounts() {
    try {
        if (!supabase) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockStudentAccounts();
        }

        const { data, error } = await supabase
            .from(TABLES.STUDENT_ACCOUNTS)
            .select('*')
            .order('student_name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting student accounts:', error);
        return getMockStudentAccounts();
    }
}

/**
 * Get student account details
 */
async function getStudentAccount(studentId) {
    try {
        if (!supabase) {
            return getMockStudentAccounts().find(a => a.student_id === studentId) || null;
        }

        const { data, error } = await supabase
            .from(TABLES.STUDENT_ACCOUNTS)
            .select('*')
            .eq('student_id', studentId)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting student account:', error);
        return null;
    }
}

/**
 * Get student transactions
 */
async function getStudentTransactions(studentId, params = {}) {
    try {
        if (!supabase) {
            return getMockPayments().filter(p => p.student_id === studentId);
        }

        let query = supabase
            .from(TABLES.PAYMENTS)
            .select('*')
            .eq('student_id', studentId)
            .order('payment_date', { ascending: false });

        if (params.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting student transactions:', error);
        return [];
    }
}

/**
 * Get student balance
 */
async function getStudentBalance(studentId) {
    try {
        const account = await getStudentAccount(studentId);
        return account || { balance: 0, total_paid: 0, total_due: 0 };
    } catch (error) {
        console.error('Error getting student balance:', error);
        return { balance: 0, total_paid: 0, total_due: 0 };
    }
}

// ============================================================
// PAYMENTS
// ============================================================

/**
 * Get all payments (Admin only)
 */
async function getPayments(params = {}) {
    try {
        if (!supabase) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockPayments();
        }

        let query = supabase
            .from(TABLES.PAYMENTS)
            .select('*')
            .order('payment_date', { ascending: false });

        if (params.limit) {
            query = query.limit(params.limit);
        }
        if (params.student_id) {
            query = query.eq('student_id', params.student_id);
        }
        if (params.status) {
            query = query.eq('status', params.status);
        }
        if (params.program) {
            query = query.eq('program', params.program);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting payments:', error);
        return getMockPayments();
    }
}

/**
 * Get payment details
 */
async function getPayment(paymentId) {
    try {
        if (!supabase) {
            return getMockPayments().find(p => p.id === paymentId) || null;
        }

        const { data, error } = await supabase
            .from(TABLES.PAYMENTS)
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting payment:', error);
        return null;
    }
}

/**
 * Record payment
 */
async function recordPayment(data) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Payment recorded', data);
            return { success: true, id: 'demo-' + Date.now() };
        }

        const paymentData = {
            student_id: data.studentId,
            student_name: data.studentName,
            student_email: data.studentEmail,
            program: data.program || 'KRCHN',
            amount: data.amount,
            payment_method: data.method || 'M-Pesa',
            reference_number: data.reference || 'TXN-' + Date.now().toString().slice(-8),
            payment_date: data.date || new Date().toISOString().split('T')[0],
            period: data.period || 'Term 1',
            status: 'completed',
            notes: data.notes || null,
            recorded_by_name: getCurrentFinanceUser()?.name || 'System',
            created_at: new Date().toISOString()
        };

        const { data: result, error } = await supabase
            .from(TABLES.PAYMENTS)
            .insert([paymentData])
            .select();

        if (error) throw error;

        // Update student account
        await updateStudentAccount(data.studentId);

        return result;
    } catch (error) {
        console.error('Error recording payment:', error);
        throw error;
    }
}

/**
 * Update payment
 */
async function updatePayment(paymentId, data) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Payment updated', paymentId, data);
            return { success: true };
        }

        const { data: result, error } = await supabase
            .from(TABLES.PAYMENTS)
            .update(data)
            .eq('id', paymentId)
            .select();

        if (error) throw error;

        // If status changed, update student account
        if (data.status) {
            const payment = await getPayment(paymentId);
            if (payment) {
                await updateStudentAccount(payment.student_id);
            }
        }

        return result;
    } catch (error) {
        console.error('Error updating payment:', error);
        throw error;
    }
}

/**
 * Delete payment
 */
async function deletePayment(paymentId) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Payment deleted', paymentId);
            return { success: true };
        }

        // Get payment first to update student account
        const payment = await getPayment(paymentId);
        
        const { error } = await supabase
            .from(TABLES.PAYMENTS)
            .delete()
            .eq('id', paymentId);

        if (error) throw error;

        // Update student account
        if (payment) {
            await updateStudentAccount(payment.student_id);
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
}

// ============================================================
// FEE STRUCTURE
// ============================================================

/**
 * Get fee structure
 */
async function getFeeStructure(params = {}) {
    try {
        if (!supabase) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockFeeStructure();
        }

        let query = supabase
            .from(TABLES.FEE_STRUCTURE)
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (params.program) {
            query = query.eq('program', params.program);
        }
        if (params.intake_year) {
            query = query.eq('intake_year', params.intake_year);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting fee structure:', error);
        return getMockFeeStructure();
    }
}

/**
 * Create fee structure
 */
async function createFeeStructure(data) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Fee structure created', data);
            return { success: true };
        }

        const feeData = {
            program: data.program,
            block_term: data.blockTerm,
            intake_year: data.intakeYear,
            amount: data.amount,
            description: data.description || `${data.program} - ${data.blockTerm} Fees`,
            is_active: true,
            created_by_name: getCurrentFinanceUser()?.name || 'System',
            created_at: new Date().toISOString()
        };

        const { data: result, error } = await supabase
            .from(TABLES.FEE_STRUCTURE)
            .insert([feeData])
            .select();

        if (error) throw error;
        return result;
    } catch (error) {
        console.error('Error creating fee structure:', error);
        throw error;
    }
}

/**
 * Update fee structure
 */
async function updateFeeStructure(id, data) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Fee structure updated', id, data);
            return { success: true };
        }

        const updateData = {
            ...data,
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabase
            .from(TABLES.FEE_STRUCTURE)
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return result;
    } catch (error) {
        console.error('Error updating fee structure:', error);
        throw error;
    }
}

/**
 * Delete fee structure
 */
async function deleteFeeStructure(id) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Fee structure deleted', id);
            return { success: true };
        }

        const { error } = await supabase
            .from(TABLES.FEE_STRUCTURE)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting fee structure:', error);
        throw error;
    }
}

// ============================================================
// STUDENT ACCOUNT UPDATE
// ============================================================

/**
 * Update student account balance
 */
async function updateStudentAccount(studentId) {
    try {
        if (!supabase) {
            console.log('📝 Demo: Student account updated', studentId);
            return { success: true };
        }

        // Get total paid
        const { data: payments, error: paymentsError } = await supabase
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('student_id', studentId)
            .eq('status', 'completed');

        if (paymentsError) throw paymentsError;

        const totalPaid = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Get student program
        const { data: student, error: studentError } = await supabase
            .from(TABLES.USER_PROFILES)
            .select('program, full_name, email')
            .eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        // Get total due from fee structure
        const { data: fees, error: feesError } = await supabase
            .from(TABLES.FEE_STRUCTURE)
            .select('amount')
            .eq('program', student.program || 'KRCHN')
            .eq('is_active', true);

        if (feesError) throw feesError;

        const totalDue = fees ? fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) : 0;
        const balance = totalDue - totalPaid;

        // Get last payment date
        const { data: lastPayment, error: lastError } = await supabase
            .from(TABLES.PAYMENTS)
            .select('payment_date')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .order('payment_date', { ascending: false })
            .limit(1);

        if (lastError) throw lastError;

        // Determine payment status
        let paymentStatus = 'outstanding';
        if (balance <= 0) paymentStatus = 'paid';
        else if (balance < 10000) paymentStatus = 'partial';

        // Update or insert account
        const { error: upsertError } = await supabase
            .from(TABLES.STUDENT_ACCOUNTS)
            .upsert({
                student_id: studentId,
                student_name: student.full_name,
                student_email: student.email,
                program: student.program,
                total_fees_due: totalDue,
                total_paid: totalPaid,
                balance: balance,
                outstanding: Math.max(balance, 0),
                last_payment_date: lastPayment?.[0]?.payment_date || null,
                payment_status: paymentStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id' });

        if (upsertError) throw upsertError;

        console.log('✅ Student account updated for:', studentId);
        return { success: true };

    } catch (error) {
        console.error('❌ Error updating student account:', error);
        throw error;
    }
}

// ============================================================
// DASHBOARD STATS
// ============================================================

/**
 * Get dashboard stats
 */
async function getDashboardStats() {
    try {
        if (!supabase) {
            console.warn('⚠️ Supabase not available, using mock stats');
            return getMockStats();
        }

        // Total students
        const { count: totalStudents } = await supabase
            .from(TABLES.USER_PROFILES)
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');

        // Total collected
        const { data: payments } = await supabase
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('status', 'completed');

        const totalCollected = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Outstanding balance
        const { data: accounts } = await supabase
            .from(TABLES.STUDENT_ACCOUNTS)
            .select('balance')
            .gt('balance', 0);

        const outstanding = accounts ? accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) : 0;
        const overdueCount = accounts ? accounts.length : 0;

        // Today's payments
        const today = new Date().toISOString().split('T')[0];
        const { data: todayPayments } = await supabase
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('payment_date', today)
            .eq('status', 'completed');

        const todayTotal = todayPayments ? todayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Total transactions
        const { count: totalTransactions } = await supabase
            .from(TABLES.PAYMENTS)
            .select('*', { count: 'exact', head: true });

        return {
            totalStudents: totalStudents || 0,
            totalCollected: totalCollected,
            outstandingBalance: outstanding,
            overdueAccounts: overdueCount,
            todayPayments: todayTotal,
            totalTransactions: totalTransactions || 0
        };

    } catch (error) {
        console.error('❌ Error getting dashboard stats:', error);
        return getMockStats();
    }
}

// ============================================================
// MOCK DATA
// ============================================================

function getMockStats() {
    return {
        totalStudents: 230,
        totalCollected: 580505,
        outstandingBalance: 2450000,
        overdueAccounts: 45,
        todayPayments: 45000,
        totalTransactions: 876
    };
}

function getMockStudents() {
    return [
        { id: '1', full_name: 'Jane Doe', student_id: 'KRCHN/001', email: 'jane@example.com', program: 'KRCHN' },
        { id: '2', full_name: 'John Smith', student_id: 'DPOTT/023', email: 'john@example.com', program: 'DPOTT' },
        { id: '3', full_name: 'Mary Wanjiru', student_id: 'DCH/045', email: 'mary@example.com', program: 'DCH' },
    ];
}

function getMockStudentAccounts() {
    return [
        { student_id: '001', student_name: 'Jane Doe', program: 'KRCHN', intake_year: '2026', total_fees_due: 180000, total_paid: 135000, balance: 45000 },
        { student_id: '002', student_name: 'John Smith', program: 'DPOTT', intake_year: '2026', total_fees_due: 150000, total_paid: 150000, balance: 0 },
        { student_id: '003', student_name: 'Mary Wanjiru', program: 'DCH', intake_year: '2025', total_fees_due: 160000, total_paid: 120000, balance: 40000 },
    ];
}

function getMockPayments() {
    return [
        { id: '1', payment_date: '2026-07-31', student_name: 'Jane Doe', student_id: '001', program: 'KRCHN', amount: 45000, payment_method: 'M-Pesa', reference_number: 'MPESA-7845', period: 'Term 2', status: 'completed' },
        { id: '2', payment_date: '2026-07-31', student_name: 'John Smith', student_id: '002', program: 'DPOTT', amount: 32000, payment_method: 'Cash', reference_number: 'CASH-1234', period: 'Term 2', status: 'completed' },
        { id: '3', payment_date: '2026-07-30', student_name: 'Mary Wanjiru', student_id: '003', program: 'DCH', amount: 28000, payment_method: 'Bank Transfer', reference_number: 'BT-5678', period: 'Term 2', status: 'pending' },
    ];
}

function getMockFeeStructure() {
    return [
        { id: '1', program: 'KRCHN', block_term: 'Introductory', intake_year: '2026', amount: 60000, description: 'Tuition fees for Introductory Block' },
        { id: '2', program: 'KRCHN', block_term: 'Block 1', intake_year: '2026', amount: 60000, description: 'Tuition fees for Block 1' },
        { id: '3', program: 'DPOTT', block_term: 'Introductory', intake_year: '2026', amount: 50000, description: 'Tuition fees for Introductory Block' },
    ];
}

// ============================================================
// REPORTS
// ============================================================

/**
 * Generate report
 */
async function generateReport(params = {}) {
    try {
        const { type, program, year } = params;
        
        let data = [];
        let summary = {};

        switch(type) {
            case 'summary':
                data = await getDashboardStats();
                break;
            case 'collections':
                data = await getPayments({ limit: 100 });
                summary.total = data.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                summary.count = data.length;
                break;
            case 'outstanding':
                data = await getStudentAccounts();
                summary.total = data.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
                summary.count = data.filter(a => parseFloat(a.balance) > 0).length;
                break;
            case 'program':
                data = await getPayments({ program: program || 'KRCHN', limit: 100 });
                summary.total = data.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                summary.count = data.length;
                break;
            default:
                data = await getPayments({ limit: 100 });
                summary.total = data.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                summary.count = data.length;
        }

        return {
            data: data,
            summary: summary,
            count: data.length,
            generated_at: new Date().toISOString(),
            type: type || 'summary'
        };
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}

// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Get transactions with filters
 */
async function getTransactions(params = {}) {
    try {
        if (!supabase) {
            return getMockPayments();
        }

        let query = supabase
            .from(TABLES.PAYMENTS)
            .select('*')
            .order('payment_date', { ascending: false });

        if (params.limit) {
            query = query.limit(params.limit);
        }
        if (params.student_id) {
            query = query.eq('student_id', params.student_id);
        }
        if (params.status) {
            query = query.eq('status', params.status);
        }
        if (params.startDate) {
            query = query.gte('payment_date', params.startDate);
        }
        if (params.endDate) {
            query = query.lte('payment_date', params.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting transactions:', error);
        return getMockPayments();
    }
}

// ============================================================
// EXPORT
// ============================================================

// Make functions globally available
window.financeAPI = {
    getStudents,
    getStudentAccounts,
    getStudentAccount,
    getStudentTransactions,
    getStudentBalance,
    getPayments,
    getPayment,
    recordPayment,
    updatePayment,
    deletePayment,
    getFeeStructure,
    createFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    updateStudentAccount,
    getDashboardStats,
    generateReport,
    getTransactions,
    isFinanceAdmin,
    getCurrentFinanceUser,
    // Mock data for testing
    getMockStats,
    getMockStudents,
    getMockStudentAccounts,
    getMockPayments,
    getMockFeeStructure
};

// Also make TABLES available
window.FINANCE_TABLES = TABLES;

console.log('✅ Finance API Communication Layer loaded');
console.log('🔗 Supabase:', !!supabase);
console.log('📊 Tables:', Object.keys(TABLES).join(', '));
