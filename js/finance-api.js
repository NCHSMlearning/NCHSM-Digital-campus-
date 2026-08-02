/**
 * FINANCE MODULE - API COMMUNICATION LAYER
 * Handles all Supabase database operations
 */

// ============================================================
// SUPABASE CLIENT - PROPER INITIALIZATION
// ============================================================

// ✅ Create the Supabase client properly
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// Get createClient function from various sources
function getCreateClient() {
    if (typeof window.supabase !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
        return window.supabase.createClient;
    }
    if (typeof window.createClient === 'function') {
        return window.createClient;
    }
    if (typeof supabase_js !== 'undefined' && supabase_js && typeof supabase_js.createClient === 'function') {
        return supabase_js.createClient;
    }
    if (typeof Supabase !== 'undefined' && Supabase && typeof Supabase.createClient === 'function') {
        return Supabase.createClient;
    }
    return null;
}

const createClient = getCreateClient();
let supabaseClient = null;

if (createClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase = supabaseClient;
    window.sb = supabaseClient;
    console.log('✅ Supabase client created successfully');
    console.log('🔍 .from method:', typeof supabaseClient.from);
} else {
    console.error('❌ Could not create Supabase client');
}

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
// CHECK IF CLIENT IS READY
// ============================================================

function isClientReady() {
    return supabaseClient && typeof supabaseClient.from === 'function';
}

// ============================================================
// STUDENT ACCOUNTS
// ============================================================

async function getStudents(params = {}) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
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
        return [];
    }
}

async function getStudentAccounts() {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
        }

        const { data, error } = await supabaseClient
            .from(TABLES.STUDENT_ACCOUNTS)
            .select('*')
            .order('student_name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting student accounts:', error);
        return [];
    }
}

// ============================================================
// PAYMENTS
// ============================================================

async function getPayments(params = {}) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
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
        return [];
    }
}

// ============================================================
// DASHBOARD STATS
// ============================================================

async function getDashboardStats() {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return {
                totalStudents: 0,
                totalCollected: 0,
                outstandingBalance: 0,
                overdueAccounts: 0,
                todayPayments: 0,
                totalTransactions: 0,
                pendingPayments: 0
            };
        }

        // Get total students
        const { count: totalStudents } = await supabaseClient
            .from(TABLES.USER_PROFILES)
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');

        // Get total collected
        const { data: payments } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('status', 'completed');

        const totalCollected = payments ? payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Get outstanding balance
        const { data: accounts } = await supabaseClient
            .from(TABLES.STUDENT_ACCOUNTS)
            .select('balance')
            .gt('balance', 0);

        const outstanding = accounts ? accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) : 0;
        const overdueCount = accounts ? accounts.length : 0;

        // Get today's payments
        const today = new Date().toISOString().split('T')[0];
        const { data: todayPayments } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('amount')
            .eq('payment_date', today)
            .eq('status', 'completed');

        const todayTotal = todayPayments ? todayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) : 0;

        // Get total transactions
        const { count: totalTransactions } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('*', { count: 'exact', head: true });

        // Get pending payments
        const { count: pendingPayments } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        return {
            totalStudents: totalStudents || 0,
            totalCollected: totalCollected,
            outstandingBalance: outstanding,
            overdueAccounts: overdueCount,
            todayPayments: todayTotal,
            totalTransactions: totalTransactions || 0,
            pendingPayments: pendingPayments || 0
        };

    } catch (error) {
        console.error('❌ Error getting dashboard stats:', error);
        return {
            totalStudents: 0,
            totalCollected: 0,
            outstandingBalance: 0,
            overdueAccounts: 0,
            todayPayments: 0,
            totalTransactions: 0,
            pendingPayments: 0
        };
    }
}

// ============================================================
// RECORD PAYMENT
// ============================================================

async function recordPayment(data) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
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
        if (!isClientReady()) {
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
        if (!isClientReady()) {
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
        if (!isClientReady()) {
            return null;
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
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
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
        return [];
    }
}
// ============================================================
// FEE STRUCTURE - CREATE, UPDATE, DELETE
// ============================================================

async function createFeeStructure(data) {
    try {
        if (!isClientReady()) {
            console.log('📝 Demo: Fee structure created', data);
            return { success: true, id: 'demo-' + Date.now() };
        }

        // Validate required fields
        if (!data.program) {
            throw new Error('Program name is required');
        }

        const feeData = {
            program: data.program,
            program_code: data.program_code || '',
            level: data.level || 'Diploma',
            duration: data.duration || '',
            mode: data.mode || 'Physical/Online',
            block_term: data.block_term || 'Term 1',
            intake_year: data.intake_year || '2026',
            amount: data.total || 0,
            total: data.total || 0,
            hostel: data.hostel || 0,
            components: data.components || [],
            terms: data.terms || [],
            payment: data.payment || {},
            description: data.description || `${data.program} - ${data.level} Fees`,
            is_active: data.is_active !== false,
            created_by_name: getCurrentFinanceUser()?.name || 'System',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .insert([feeData])
            .select();

        if (error) throw error;
        return result;
    } catch (error) {
        console.error('❌ Error creating fee structure:', error);
        throw error;
    }
}

async function updateFeeStructure(id, data) {
    try {
        if (!isClientReady()) {
            console.log('📝 Demo: Fee structure updated', id, data);
            return { success: true };
        }

        // Validate required fields
        if (!data.program) {
            throw new Error('Program name is required');
        }

        const updateData = {
            program: data.program,
            program_code: data.program_code || '',
            level: data.level || 'Diploma',
            duration: data.duration || '',
            mode: data.mode || 'Physical/Online',
            block_term: data.block_term || 'Term 1',
            intake_year: data.intake_year || '2026',
            amount: data.total || 0,
            total: data.total || 0,
            hostel: data.hostel || 0,
            components: data.components || [],
            terms: data.terms || [],
            payment: data.payment || {},
            description: data.description || `${data.program} - ${data.level} Fees`,
            is_active: data.is_active !== false,
            updated_by_name: getCurrentFinanceUser()?.name || 'System',
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return result;
    } catch (error) {
        console.error('❌ Error updating fee structure:', error);
        throw error;
    }
}

async function deleteFeeStructure(id) {
    try {
        if (!isClientReady()) {
            console.log('📝 Demo: Fee structure deleted', id);
            return { success: true };
        }

        const { error } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting fee structure:', error);
        throw error;
    }
}
// ============================================================
// TRANSACTIONS
// ============================================================

async function getTransactions(params = {}) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
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
        return [];
    }
}

// ============================================================
// EXPORT - Make functions globally available
// ============================================================

window.financeAPI = {
    supabaseClient,
    getStudents,
    getStudentAccounts,
    getPayments,
    getPayment,
    recordPayment,
    deletePayment,
    getFeeStructure,
    createFeeStructure,      // ✅ ADDED
    updateFeeStructure,      // ✅ ADDED
    deleteFeeStructure,      // ✅ ADDED
    updateStudentAccount,
    getDashboardStats,
    getTransactions,
    getCurrentFinanceUser,
    isFinanceAdmin,
    isClientReady
};

window.FINANCE_TABLES = TABLES;

console.log('✅ Finance API loaded successfully');
console.log('🔗 Supabase client available:', isClientReady());
console.log('📊 Tables:', Object.keys(TABLES).join(', '));
