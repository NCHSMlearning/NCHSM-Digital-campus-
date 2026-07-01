// ============================================
// SUPABASE CONFIGURATION
// Nursing Marks System
// ============================================

// ===== YOUR SUPABASE CREDENTIALS =====
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

// ===== CREATE SUPABASE CLIENT =====
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== MAKE IT GLOBALLY AVAILABLE =====
window.supabase = supabase;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// ============================================
// CONNECTION TEST
// ============================================

async function testSupabaseConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        console.log(`📡 URL: ${SUPABASE_URL}`);
        console.log(`🔑 Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
        
        // Try to fetch from a table
        const { data, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection failed:', error);
            console.error('❌ Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            
            // Show notification if function exists
            if (typeof showNotification === 'function') {
                showNotification('⚠️ Supabase connection failed: ' + error.message, true);
            }
            return false;
        }
        
        console.log('✅ Supabase connected successfully!');
        console.log(`📊 Sample data:`, data);
        
        // Show success notification if function exists
        if (typeof showNotification === 'function') {
            showNotification('✅ Connected to Supabase successfully!', false);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Supabase test error:', error);
        console.error('❌ Error:', error.message);
        
        if (typeof showNotification === 'function') {
            showNotification('⚠️ Supabase connection error: ' + error.message, true);
        }
        return false;
    }
}

// ============================================
// HELPER FUNCTIONS FOR SUPABASE OPERATIONS
// ============================================

/**
 * Execute a Supabase query with error handling
 */
async function supabaseQuery(table, operation, data = null, filters = {}) {
    try {
        console.log(`📡 Supabase: ${operation} on ${table}`);
        
        let query = supabase.from(table);
        
        switch(operation) {
            case 'select':
                query = query.select('*');
                // Apply filters
                Object.keys(filters).forEach(key => {
                    if (key === 'eq') {
                        Object.entries(filters[key]).forEach(([col, val]) => {
                            query = query.eq(col, val);
                        });
                    } else if (key === 'order') {
                        const order = filters[key];
                        query = query.order(order.column, { 
                            ascending: order.ascending !== false 
                        });
                    } else if (key === 'limit') {
                        query = query.limit(filters[key]);
                    } else if (key === 'range') {
                        query = query.range(filters[key][0], filters[key][1]);
                    }
                });
                break;
                
            case 'insert':
                query = query.insert(data);
                break;
                
            case 'upsert':
                query = query.upsert(data);
                break;
                
            case 'update':
                query = query.update(data);
                Object.entries(filters).forEach(([col, val]) => {
                    query = query.eq(col, val);
                });
                break;
                
            case 'delete':
                query = query.delete();
                Object.entries(filters).forEach(([col, val]) => {
                    query = query.eq(col, val);
                });
                break;
                
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        
        const result = await query;
        
        if (result.error) {
            console.error('❌ Supabase error:', result.error);
            return { 
                success: false, 
                error: result.error.message,
                details: result.error
            };
        }
        
        console.log(`✅ Supabase ${operation} successful`);
        return { 
            success: true, 
            data: result.data,
            count: result.count || result.data?.length || 0
        };
        
    } catch (error) {
        console.error('❌ Supabase query error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// TABLE-SPECIFIC HELPER FUNCTIONS
// ============================================

/**
 * Get all students for a given year
 */
async function getStudents(year = '2026') {
    return await supabaseQuery('consolidated_user_profiles_table', 'select', null, {
        eq: { role: 'student', intake_year: year },
        order: { column: 'full_name', ascending: true }
    });
}

/**
 * Get all lecturers
 */
async function getLecturers() {
    return await supabaseQuery('lecturers', 'select', null, {
        eq: { status: 'approved' },
        order: { column: 'full_name', ascending: true }
    });
}

/**
 * Get marks for a subject
 */
async function getMarks(block, subject, year = '2026', examType = 'internal') {
    const table = examType === 'nck' ? 'nck_marks' : 'student_marks';
    return await supabaseQuery(table, 'select', null, {
        eq: { 
            block: block, 
            subject_name: subject, 
            academic_year: year 
        },
        order: { column: 'admission_number', ascending: true }
    });
}

/**
 * Save marks to Supabase
 */
async function saveMarks(block, subject, marksData, lecturerName, examType = 'internal', year = '2026') {
    const table = examType === 'nck' ? 'nck_marks' : 'student_marks';
    const results = [];
    let savedCount = 0;
    let errors = [];
    
    for (const mark of marksData) {
        try {
            const admission = mark.admission || mark.admission_number;
            if (!admission) continue;
            
            // Check if record exists
            const { data: existing } = await supabase
                .from(table)
                .select('id')
                .eq('admission_number', admission)
                .eq('subject_name', subject)
                .eq('block', block)
                .eq('academic_year', year)
                .single();
            
            if (examType === 'nck') {
                // NCK marks
                const scores = mark.scores || [];
                const finalScore = mark.final || 0;
                const gradedBy = mark.gradedBy || lecturerName || 'System';
                
                if (existing) {
                    // Update
                    const { error } = await supabase
                        .from(table)
                        .update({
                            scores: scores,
                            final_score: finalScore,
                            graded_by: gradedBy,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                    
                    if (error) throw error;
                } else {
                    // Insert
                    const { error } = await supabase
                        .from(table)
                        .insert({
                            admission_number: admission,
                            student_name: mark.name || '',
                            subject_name: subject,
                            block: block,
                            assessment_type: 'clinical',
                            scores: scores,
                            final_score: finalScore,
                            graded_by: gradedBy,
                            academic_year: year,
                            status: 'completed'
                        });
                    
                    if (error) throw error;
                }
            } else {
                // Internal marks
                const cat1 = parseFloat(mark.cat1) || 0;
                const cat2 = parseFloat(mark.cat2) || 0;
                const exam = parseFloat(mark.exam) || 0;
                const assessmentType = mark.assessmentType || 'full';
                
                // Calculate final score
                let finalScore = 0;
                if (assessmentType === 'full') {
                    finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60 * 30) + Math.min(exam, 70);
                } else if (assessmentType === 'single_cat') {
                    finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
                } else {
                    finalScore = Math.min(exam, 100);
                }
                finalScore = Math.round(finalScore * 10) / 10;
                
                // Calculate grade
                let grade = 'E';
                if (finalScore >= 80) grade = 'A';
                else if (finalScore >= 75) grade = 'A-';
                else if (finalScore >= 70) grade = 'B+';
                else if (finalScore >= 65) grade = 'B';
                else if (finalScore >= 60) grade = 'B-';
                else if (finalScore >= 55) grade = 'C+';
                else if (finalScore >= 50) grade = 'C';
                else if (finalScore >= 45) grade = 'C-';
                else if (finalScore >= 40) grade = 'D+';
                else if (finalScore >= 35) grade = 'D';
                
                const gradedBy = mark.gradedBy || lecturerName || 'System';
                
                if (existing) {
                    // Update
                    const { error } = await supabase
                        .from(table)
                        .update({
                            cat1_score: cat1,
                            cat2_score: cat2,
                            exam_score: exam,
                            final_score: finalScore,
                            grade: grade,
                            graded_by: gradedBy,
                            assessment_type: assessmentType,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                    
                    if (error) throw error;
                } else {
                    // Insert
                    const { error } = await supabase
                        .from(table)
                        .insert({
                            admission_number: admission,
                            student_name: mark.name || '',
                            block: block,
                            subject_name: subject,
                            assessment_type: assessmentType,
                            cat1_score: cat1,
                            cat2_score: cat2,
                            exam_score: exam,
                            final_score: finalScore,
                            grade: grade,
                            graded_by: gradedBy,
                            academic_year: year
                        });
                    
                    if (error) throw error;
                }
            }
            
            savedCount++;
            
        } catch (error) {
            console.error('Error saving mark:', error);
            errors.push({ admission: mark.admission, error: error.message });
        }
    }
    
    return {
        success: errors.length === 0,
        saved: savedCount,
        errors: errors
    };
}

// ============================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================

window.supabaseQuery = supabaseQuery;
window.getStudents = getStudents;
window.getLecturers = getLecturers;
window.getMarks = getMarks;
window.saveMarks = saveMarks;
window.testSupabaseConnection = testSupabaseConnection;

// ============================================
// RUN CONNECTION TEST ON LOAD
// ============================================

console.log('🚀 Supabase Config Loaded!');
console.log(`📡 URL: ${SUPABASE_URL}`);

// Wait a moment for other scripts to load
setTimeout(async () => {
    const connected = await testSupabaseConnection();
    
    if (connected) {
        console.log('✅ Supabase is ready to use!');
    } else {
        console.warn('⚠️ Supabase connection failed. Check your credentials.');
    }
}, 1000);

// ============================================
// EXPORT FOR MODULE USE (if needed)
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabase,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        supabaseQuery,
        getStudents,
        getLecturers,
        getMarks,
        saveMarks,
        testSupabaseConnection
    };
}
