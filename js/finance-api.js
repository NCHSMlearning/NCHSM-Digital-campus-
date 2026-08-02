/**
 * FINANCE MODULE - API COMMUNICATION LAYER
 * Handles all Supabase database operations
 * Communicates with both Super Admin and Student Dashboards
 */

// ============================================================
// SUPABASE CLIENT - SAFE INITIALIZATION (NO DUPLICATE)
// ============================================================

// ✅ Check if supabase already exists globally - USE ONLY ONE
let supabaseClient;

if (typeof window.supabase !== 'undefined' && window.supabase) {
    supabaseClient = window.supabase;
    console.log('🔗 Using existing Supabase client from window');
} else if (typeof window.sb !== 'undefined' && window.sb) {
    supabaseClient = window.sb;
    console.log('🔗 Using existing Supabase client from window.sb');
} else {
    console.error('❌ Supabase client not available!');
    // Try to create one as last resort
    try {
        const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
        if (typeof supabase_js !== 'undefined' && supabase_js) {
            supabaseClient = supabase_js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.supabase = supabaseClient;
            window.sb = supabaseClient;
            console.log('🔗 Created new Supabase client');
        }
    } catch (e) {
        console.error('❌ Failed to create Supabase client:', e);
    }
}

// ✅ Make available globally (only if not already set)
if (supabaseClient && typeof window.supabase === 'undefined') {
    window.supabase = supabaseClient;
}
if (supabaseClient && typeof window.sb === 'undefined') {
    window.sb = supabaseClient;
}

console.log('🔗 Finance API: Supabase client available:', !!supabaseClient);

// ============================================================
// TABLE NAMES
// ============================================================

const TABLES = {
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

function isFinanceAdmin() {
    const user = getCurrentFinanceUser();
    if (!user) return false;
    const allowedRoles = ['superadmin', 'admin', 'finance_officer'];
    return allowedRoles.includes(user.role);
}

// ============================================================
// MOCK DATA (for when supabase is not available)
// ============================================================

function getMockStats() {
    return {
        totalStudents: 230,
        totalCollected: 2845000,
        outstandingBalance: 1560000,
        overdueAccounts: 23,
        todayPayments: 128000,
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
// STUDENT ACCOUNTS
// ============================================================

async function getStudents(params = {}) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockStudents();
        }

        let query = supabaseClient
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

async function getStudentAccounts() {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockStudentAccounts();
        }

        const { data, error } = await supabaseClient
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

// ============================================================
// PAYMENTS
// ============================================================

async function getPayments(params = {}) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockPayments();
        }

        let query = supabaseClient
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

// ============================================================
// DASHBOARD STATS
// ============================================================

async function getDashboardStats() {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available, using mock stats');
            return getMockStats();
        }

        const { count: totalStudents } = await supabaseClient
            .from(TABLES.USER_PROFILES)
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');

        const { data: payments } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('status', 'completed');

        const totalCollected = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        const { data: accounts } = await supabaseClient
            .from(TABLES.STUDENT_ACCOUNTS)
            .select('balance')
            .gt('balance', 0);

        const outstanding = accounts ? accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) : 0;
        const overdueCount = accounts ? accounts.length : 0;

        const today = new Date().toISOString().split('T')[0];
        const { data: todayPayments } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('payment_date', today)
            .eq('status', 'completed');

        const todayTotal = todayPayments ? todayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        const { count: totalTransactions } = await supabaseClient
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
// RECORD PAYMENT
// ============================================================

async function recordPayment(data) {
    try {
        if (!supabaseClient) {
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

        const { data: result, error } = await supabaseClient
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

// ============================================================
// UPDATE STUDENT ACCOUNT
// ============================================================

async function updateStudentAccount(studentId) {
    try {
        if (!supabaseClient) {
            console.log('📝 Demo: Student account updated', studentId);
            return { success: true };
        }

        // Get total paid
        const { data: payments, error: paymentsError } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('student_id', studentId)
            .eq('status', 'completed');

        if (paymentsError) throw paymentsError;

        const totalPaid = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Get student program
        const { data: student, error: studentError } = await supabaseClient
            .from(TABLES.USER_PROFILES)
            .select('program, full_name, email')
            .eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        // Get total due from fee structure
        const { data: fees, error: feesError } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .select('amount')
            .eq('program', student.program || 'KRCHN')
            .eq('is_active', true);

        if (feesError) throw feesError;

        const totalDue = fees ? fees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) : 0;
        const balance = totalDue - totalPaid;

        // Get last payment date
        const { data: lastPayment, error: lastError } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('payment_date')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .order('payment_date', { ascending: false })
            .limit(1);

        if (lastError) throw lastError;

        let paymentStatus = 'outstanding';
        if (balance <= 0) paymentStatus = 'paid';
        else if (balance < 10000) paymentStatus = 'partial';

        const { error: upsertError } = await supabaseClient
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
// DELETE PAYMENT
// ============================================================

async function deletePayment(paymentId) {
    try {
        if (!supabaseClient) {
            console.log('📝 Demo: Payment deleted', paymentId);
            return { success: true };
        }

        const payment = await getPayment(paymentId);
        
        const { error } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .delete()
            .eq('id', paymentId);

        if (error) throw error;

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
// GET PAYMENT
// ============================================================

async function getPayment(paymentId) {
    try {
        if (!supabaseClient) {
            return getMockPayments().find(p => p.id === paymentId) || null;
        }

        const { data, error } = await supabaseClient
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

// ============================================================
// FEE STRUCTURE
// ============================================================

async function getFeeStructure(params = {}) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available, using mock data');
            return getMockFeeStructure();
        }

        let query = supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (params.program) {
            query = query.eq('program', params.program);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting fee structure:', error);
        return getMockFeeStructure();
    }
}

// ============================================================
// TRANSACTIONS
// ============================================================

async function getTransactions(params = {}) {
    try {
        if (!supabaseClient) {
            return getMockPayments();
        }

        let query = supabaseClient
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

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting transactions:', error);
        return getMockPayments();
    }
}

// ============================================================
// EXPORT - Make functions globally available
// ============================================================

window.financeAPI = {
    getStudents,
    getStudentAccounts,
    getPayments,
    getPayment,
    recordPayment,
    deletePayment,
    getFeeStructure,
    updateStudentAccount,
    getDashboardStats,
    getTransactions,
    getCurrentFinanceUser,
    isFinanceAdmin,
    // Mock data for testing
    getMockStats,
    getMockStudents,
    getMockStudentAccounts,
    getMockPayments,
    getMockFeeStructure
};

window.FINANCE_TABLES = TABLES;

console.log('✅ Finance API loaded successfully');
console.log('🔗 Supabase client available:', !!supabaseClient);
console.log('📊 Tables:', Object.keys(TABLES).join(', '));
