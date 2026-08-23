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
    AUDIT_LOGS: 'finance_audit_logs',
    STAFF: 'finance_staff',
    PAYROLL: 'finance_payroll_records'
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

function isClientReady() {
    return supabaseClient && typeof supabaseClient.from === 'function';
}

// ============================================================
// AUDIT LOGGING
// ============================================================

async function logAuditAction(action, description, metadata = {}) {
    try {
        if (!isClientReady()) return;
        const user = getCurrentFinanceUser();
        await supabaseClient
            .from(TABLES.AUDIT_LOGS)
            .insert([{
                action: action,
                description: description,
                metadata: metadata,
                user_id: user?.id || null,
                user_name: user?.name || 'System',
                user_role: user?.role || 'system',
                created_at: new Date().toISOString()
            }]);
    } catch (error) {
        console.error('Error logging audit action:', error);
    }
}

// ============================================================
// STAFF MANAGEMENT
// ============================================================

/**
 * Get all staff members with optional filters
 */
async function getStaff(params = {}) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
        }

        let query = supabaseClient
            .from(TABLES.STAFF)
            .select('*')
            .order('created_at', { ascending: false });

        if (params.department && params.department !== 'all') {
            query = query.eq('department', params.department);
        }
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        if (params.search) {
            query = query.or(`full_name.ilike.%${params.search}%,staff_id.ilike.%${params.search}%,position.ilike.%${params.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting staff:', error);
        return [];
    }
}

/**
 * Get a single staff member by ID
 */
async function getStaffMember(id) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return null;
        }

        const { data, error } = await supabaseClient
            .from(TABLES.STAFF)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting staff member:', error);
        return null;
    }
}

/**
 * Add a new staff member
 */
async function addStaff(data) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        // Validate required fields
        if (!data.full_name || !data.staff_id || !data.department || !data.position) {
            throw new Error('Full name, staff ID, department, and position are required');
        }

        const user = getCurrentFinanceUser();

        const staffData = {
            staff_id: data.staff_id,
            full_name: data.full_name,
            department: data.department,
            position: data.position,
            basic_salary: parseFloat(data.basic_salary) || 0,
            allowances: parseFloat(data.allowances) || 0,
            total_pay: (parseFloat(data.basic_salary) || 0) + (parseFloat(data.allowances) || 0),
            email: data.email || null,
            phone: data.phone || null,
            status: data.status || 'active',
            bank_name: data.bank_name || null,
            bank_account: data.bank_account || null,
            bank_branch: data.bank_branch || null,
            ksh_number: data.ksh_number || null,
            created_by_name: user?.name || 'System',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.STAFF)
            .insert([staffData])
            .select();

        if (error) throw error;

        await logAuditAction('staff_add', `Added staff member: ${data.full_name} (${data.staff_id})`);

        return result;
    } catch (error) {
        console.error('❌ Error adding staff:', error);
        throw error;
    }
}

/**
 * Update an existing staff member
 */
async function updateStaff(id, data) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        const user = getCurrentFinanceUser();

        const updateData = {
            full_name: data.full_name,
            department: data.department,
            position: data.position,
            basic_salary: parseFloat(data.basic_salary) || 0,
            allowances: parseFloat(data.allowances) || 0,
            total_pay: (parseFloat(data.basic_salary) || 0) + (parseFloat(data.allowances) || 0),
            email: data.email || null,
            phone: data.phone || null,
            status: data.status || 'active',
            bank_name: data.bank_name || null,
            bank_account: data.bank_account || null,
            bank_branch: data.bank_branch || null,
            ksh_number: data.ksh_number || null,
            updated_by_name: user?.name || 'System',
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.STAFF)
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        await logAuditAction('staff_update', `Updated staff member: ${data.full_name} (ID: ${id})`);

        return result;
    } catch (error) {
        console.error('❌ Error updating staff:', error);
        throw error;
    }
}

/**
 * Delete a staff member
 */
async function deleteStaff(id) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        // Get staff name for logging
        const staff = await getStaffMember(id);
        const name = staff?.full_name || 'Unknown';

        const { error } = await supabaseClient
            .from(TABLES.STAFF)
            .delete()
            .eq('id', id);

        if (error) throw error;

        await logAuditAction('staff_delete', `Deleted staff member: ${name} (ID: ${id})`);

        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting staff:', error);
        throw error;
    }
}

// ============================================================
// PAYROLL PROCESSING
// ============================================================

/**
 * Process payroll for a specific period
 */
async function processPayroll(params = {}) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        const period = params.period || new Date().toISOString().slice(0, 7);
        const department = params.department || 'all';

        // Get eligible staff
        let query = supabaseClient
            .from(TABLES.STAFF)
            .select('*')
            .eq('status', 'active');

        if (department !== 'all') {
            query = query.eq('department', department);
        }

        const { data: staff, error: staffError } = await query;
        if (staffError) throw staffError;

        if (!staff || staff.length === 0) {
            return { success: true, records: [], message: 'No eligible staff found' };
        }

        // Check if payroll already exists for this period
        const { data: existing, error: existingError } = await supabaseClient
            .from(TABLES.PAYROLL)
            .select('staff_id')
            .eq('period', period);

        if (existingError) throw existingError;

        const existingIds = new Set(existing?.map(p => p.staff_id) || []);

        // Create payroll records
        const user = getCurrentFinanceUser();
        const payrollRecords = staff
            .filter(s => !existingIds.has(s.id))
            .map(s => ({
                staff_id: s.id,
                staff_name: s.full_name,
                department: s.department,
                position: s.position,
                period: period,
                basic_salary: s.basic_salary,
                allowances: s.allowances,
                total_pay: s.total_pay,
                status: 'pending',
                notes: 'Auto-generated payroll',
                created_by_name: user?.name || 'System',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

        if (payrollRecords.length === 0) {
            return { success: true, records: [], message: 'Payroll already processed for this period' };
        }

        const { data: result, error } = await supabaseClient
            .from(TABLES.PAYROLL)
            .insert(payrollRecords)
            .select();

        if (error) throw error;

        await logAuditAction('payroll_process', `Processed payroll for ${payrollRecords.length} staff members for period: ${period}`);

        return { success: true, records: result, count: result?.length || 0 };
    } catch (error) {
        console.error('❌ Error processing payroll:', error);
        throw error;
    }
}

/**
 * Get payroll records with filters
 */
async function getPayrollRecords(params = {}) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return [];
        }

        let query = supabaseClient
            .from(TABLES.PAYROLL)
            .select('*')
            .order('created_at', { ascending: false });

        if (params.period) {
            query = query.eq('period', params.period);
        }
        if (params.department && params.department !== 'all') {
            query = query.eq('department', params.department);
        }
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        if (params.staff_id) {
            query = query.eq('staff_id', params.staff_id);
        }
        if (params.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting payroll records:', error);
        return [];
    }
}

/**
 * Update payroll record status (approve/reject)
 */
async function updatePayrollRecord(id, status, notes = '') {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        const user = getCurrentFinanceUser();

        const { data, error } = await supabaseClient
            .from(TABLES.PAYROLL)
            .update({
                status: status,
                notes: notes,
                approved_by_name: user?.name || 'System',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        await logAuditAction('payroll_update', `Payroll record ${id} status changed to: ${status}`);

        return data;
    } catch (error) {
        console.error('❌ Error updating payroll record:', error);
        throw error;
    }
}

/**
 * Get payroll summary statistics
 */
async function getPayrollSummary() {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
            return {
                totalStaff: 0,
                activeStaff: 0,
                monthlyTotal: 0,
                averageSalary: 0,
                pendingPayments: 0,
                thisMonthPayments: 0
            };
        }

        // Get staff counts
        const { count: totalStaff } = await supabaseClient
            .from(TABLES.STAFF)
            .select('*', { count: 'exact', head: true });

        const { count: activeStaff } = await supabaseClient
            .from(TABLES.STAFF)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Get total payroll for current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: payrollData } = await supabaseClient
            .from(TABLES.PAYROLL)
            .select('total_pay')
            .eq('period', currentMonth)
            .eq('status', 'approved');

        const monthlyTotal = payrollData ? payrollData.reduce((sum, p) => sum + (parseFloat(p.total_pay) || 0), 0) : 0;

        // Get pending payroll
        const { data: pendingData } = await supabaseClient
            .from(TABLES.PAYROLL)
            .select('total_pay')
            .eq('status', 'pending');

        const pendingTotal = pendingData ? pendingData.reduce((sum, p) => sum + (parseFloat(p.total_pay) || 0), 0) : 0;

        // Get average salary
        const { data: staffData } = await supabaseClient
            .from(TABLES.STAFF)
            .select('total_pay')
            .eq('status', 'active');

        const avgSalary = staffData && staffData.length > 0
            ? staffData.reduce((sum, s) => sum + (parseFloat(s.total_pay) || 0), 0) / staffData.length
            : 0;

        return {
            totalStaff: totalStaff || 0,
            activeStaff: activeStaff || 0,
            monthlyTotal: monthlyTotal || 0,
            averageSalary: avgSalary || 0,
            pendingPayments: pendingTotal || 0,
            thisMonthPayments: monthlyTotal || 0
        };
    } catch (error) {
        console.error('Error getting payroll summary:', error);
        return {
            totalStaff: 0,
            activeStaff: 0,
            monthlyTotal: 0,
            averageSalary: 0,
            pendingPayments: 0,
            thisMonthPayments: 0
        };
    }
}

// ============================================================
// STUDENT ACCOUNTS (Existing functions)
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
// PAYMENTS (Existing functions)
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

async function getPayment(paymentId) {
    try {
        if (!isClientReady()) {
            console.warn('⚠️ Supabase not available');
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

async function recordPayment(data) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        const user = getCurrentFinanceUser();

        const paymentData = {
            student_id: data.studentId,
            student_name: data.studentName,
            student_email: data.studentEmail || null,
            program: data.program || 'KRCHN',
            amount: parseFloat(data.amount) || 0,
            payment_method: data.method || 'M-Pesa',
            reference_number: data.reference || 'TXN-' + Date.now().toString().slice(-8),
            payment_date: data.date || new Date().toISOString().split('T')[0],
            period: data.period || 'Term 1',
            status: 'completed',
            notes: data.notes || null,
            recorded_by_name: user?.name || 'System',
            created_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.PAYMENTS)
            .insert([paymentData])
            .select();

        if (error) throw error;

        // Update student account
        await updateStudentAccount(data.studentId);

        await logAuditAction('payment_record', `Payment of ${formatCurrency(data.amount)} recorded for ${data.studentName}`);

        return result;
    } catch (error) {
        console.error('Error recording payment:', error);
        throw error;
    }
}

async function deletePayment(paymentId) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
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

        await logAuditAction('payment_delete', `Deleted payment: ${paymentId}`);

        return { success: true };
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
}

// ============================================================
// UPDATE STUDENT ACCOUNT
// ============================================================

async function updateStudentAccount(studentId) {
    try {
        if (!isClientReady()) {
            console.log('⚠️ Cannot update student account - no database connection');
            return { success: false };
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
            .order('created_at', { ascending: true });

        if (params.program) {
            query = query.eq('program', params.program);
        }
        if (params.is_active !== undefined) {
            query = query.eq('is_active', params.is_active);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting fee structure:', error);
        return [];
    }
}

async function createFeeStructure(data) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        if (!data.program) {
            throw new Error('Program name is required');
        }

        const user = getCurrentFinanceUser();

        const feeData = {
            program: data.program,
            program_code: data.program_code || '',
            level: data.level || 'Diploma',
            duration: data.duration || '',
            mode: data.mode || 'Physical/Online',
            block_term: data.block_term || 'Term 1',
            intake_year: data.intake_year || '2026',
            amount: parseFloat(data.total) || 0,
            total: parseFloat(data.total) || 0,
            hostel: parseFloat(data.hostel) || 0,
            components: data.components || [],
            terms: data.terms || [],
            payment: data.payment || {},
            description: data.description || `${data.program} - ${data.level} Fees`,
            is_active: data.is_active !== false,
            created_by_name: user?.name || 'System',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .insert([feeData])
            .select();

        if (error) throw error;

        await logAuditAction('fee_structure_create', `Created fee structure for: ${data.program}`);

        return result;
    } catch (error) {
        console.error('❌ Error creating fee structure:', error);
        throw error;
    }
}

async function updateFeeStructure(id, data) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        if (!data.program) {
            throw new Error('Program name is required');
        }

        const user = getCurrentFinanceUser();

        const updateData = {
            program: data.program,
            program_code: data.program_code || '',
            level: data.level || 'Diploma',
            duration: data.duration || '',
            mode: data.mode || 'Physical/Online',
            block_term: data.block_term || 'Term 1',
            intake_year: data.intake_year || '2026',
            amount: parseFloat(data.total) || 0,
            total: parseFloat(data.total) || 0,
            hostel: parseFloat(data.hostel) || 0,
            components: data.components || [],
            terms: data.terms || [],
            payment: data.payment || {},
            description: data.description || `${data.program} - ${data.level} Fees`,
            is_active: data.is_active !== false,
            updated_by_name: user?.name || 'System',
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;

        await logAuditAction('fee_structure_update', `Updated fee structure for: ${data.program}`);

        return result;
    } catch (error) {
        console.error('❌ Error updating fee structure:', error);
        throw error;
    }
}

async function deleteFeeStructure(id) {
    try {
        if (!isClientReady()) {
            throw new Error('Database connection not available');
        }

        const { error } = await supabaseClient
            .from(TABLES.FEE_STRUCTURE)
            .delete()
            .eq('id', id);

        if (error) throw error;

        await logAuditAction('fee_structure_delete', `Deleted fee structure ID: ${id}`);

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
// UTILITY FUNCTIONS
// ============================================================

function formatCurrency(amount) {
    return 'KES ' + Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ============================================================
// EXPORT - Make functions globally available
// ============================================================

window.financeAPI = {
    // Core
    supabaseClient,
    isClientReady,
    getCurrentFinanceUser,
    isFinanceAdmin,

    // Students
    getStudents,
    getStudentAccounts,
    updateStudentAccount,

    // Payments
    getPayments,
    getPayment,
    recordPayment,
    deletePayment,

    // Fee Structure
    getFeeStructure,
    createFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,

    // Transactions
    getTransactions,

    // Dashboard
    getDashboardStats,

    // STAFF (NEW)
    getStaff,
    getStaffMember,
    addStaff,
    updateStaff,
    deleteStaff,

    // PAYROLL (NEW)
    processPayroll,
    getPayrollRecords,
    updatePayrollRecord,
    getPayrollSummary,

    // Audit
    logAuditAction
};

window.FINANCE_TABLES = TABLES;

console.log('✅ Finance API loaded successfully');
console.log('🔗 Supabase client available:', isClientReady());
console.log('📊 Tables:', Object.keys(TABLES).join(', '));
