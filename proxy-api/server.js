const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// ===== FORCE NO-CACHE FOR ALL RESPONSES =====
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ===== MASTER SPREADSHEET CONFIGURATION =====
const MASTER_SPREADSHEET_ID = '1btqWNKQ1HNMOvhDKDScQAFu2NijB8sbs04eH64z6pE4';

// ===== MARK ENTRY SETTINGS =====
let markEntrySettings = {
    global: { enabled: true, closedBy: null, closedAt: null }
};
let markEntryLogs = [];

// ===== GOOGLE SHEETS AUTHENTICATION =====
const credentials = {
    type: "service_account",
    project_id: "nursing-marks-system",
    private_key_id: "1ed05cb70c346df5c3bb79e06bb1bffbd26f17b2",
    private_key: `-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDJCTumvxURgqLM
KJFDb+tk82Hh3ePi5Sl6vtov4ZVOWegwZZ6u9CWVErxFVGdbMOkg+EVhyx3aD+dS
ZV+ZFmT2dTOu1CLjB+bTr1sPPZ1uFlWPd7bXMfDFhBdOpWVF15Ph+K6mHWjNX/TW
DVEiwMd7x1wk+S0uEsgoXCc5fIb9SkTKUy+7ZpRCq3igyDvS/y33wpPlSNJH0wjg
BWan+9obXHdMaDUWvqnUMqYHt2KeQcrBkLXXBdDDIY3gm/kSrLrJTTpPTgQYXmcL
ujDh3Zx3t6HAncs4vdftGVClgamtsL9k0X5i6PS4RkkvHkJ0uOo6+BBudo780sGX
i7+YwBBZAgMBAAECgf94125PJ1/dCItptIBvzLiFIzCF/cvu03bQM3Ag33hnoHZL
sDM56ABzBLHqoFkl/xNQgewFkV3Jth/s0MaH86La3QHZutd53M2YFqLiDesqX2+l
ZBRHoMxk/ONgCIPmpL4Dj3g+vEGsXxCux1J2glvA/I116FH0yVVpR6EfKULsKhAF
sSvZqnBFNkoe4cbD4nvy7Y2LQ3JXNaWBuP6xy78AHu4jVTSzrS6tLd9zBqtWOikr
6BSXpCa5ITr/JZA9l5D18HXUhDI0YurSemDrygQvHIGPcPscBjUpNZh4ccESaj6p
kTRe3U+Cbw//yKIr1pm3PxtA3La4kbKms2WMqWECgYEA+IwyfXMBCjES60TwuS37
/b2zf5vFUGVhO8OFOmSzfFPzNirFGD83/zERqIGfjs09NTnvB4FVcdwtFHBNC4GX
/wXudmb+Etp0ljKOlXGrJJQaRovc6CRdluddsjMTXMRTMh/cLviO5ZduH/FaDxfJ
lL0iI0Oeb6+CnKZtALyT8z8CgYEAzxBYpMG4PUHuty2pGb1CFqsvBvnePRAhL7x5
RWdZcZd8Wrs66FTiQoPMs0eIj0xlIFDp+Kki/8ONNkrivgw5ESfQREqBBiiW6//z
MyQszHv3BYnIZw5l5Dy4mU3D2N9MSn+YXpbcWduX/gzMiuyXJqx5vru6bYAF23l1
wr/kTmcCgYAl04BjozsHSAyvDaDtLdhp95L32scewy8XH1yJVIYUZ9pd5gh09joZ
dmhPktqrqwSjsxtzsvVEDNQ3hhfTpndxcn+mOWp1iBWyPiOBDvmS6Y9OKT8HfXFY
5AFYe3l45tAaksq5w05MFs3Fwr+ICIC/SEGHyGS2bqmcGaABOrHxlQKBgQCGTCnS
IjrmsD6t3BWTNicJINoNgj5cCHwdw/Y7x35BqGjlSA465eMiFO3NUZYGqxvjy9cU
ik7C6AhMsGFDthXFRLdVs6TfY7APPSB1iP7tWXGry+OIw9PeJmvsMn3VyW5n2z3u
C5a7SSvZgF+hszWNxcvoo0WVA7XI1YxFVcQz/QKBgDAsGt05pNt+9JFluUZaftLi
iPfNv42aRnCdCn7YpnW8SkSTcyD0y+0hSCisQZ2NBgAkw4Y1uIYV+ayC4WxXWqmJ
yuRhbjbdQnNygiTKqxi2Q/xLoQR3eG9zs4mCPwBkwzfEa7QateVKqB8SOhKr/TlZ
eET3hIw//KEIOlTU2QI/
-----END PRIVATE KEY-----`,
    client_email: "nursing-marks-bot@nursing-marks-system.iam.gserviceaccount.com",
    client_id: "116238387173068992581",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token"
};

const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// ===== MIDDLEWARE - ALWAYS USE MASTER SPREADSHEET =====
app.use((req, res, next) => {
    req.spreadsheetId = MASTER_SPREADSHEET_ID;
    const year = req.headers['x-year'] || req.body.year || '2024';
    const examType = req.headers['x-exam-type'] || req.body.examType || 'internal';
    console.log(`[MIDDLEWARE] Using MASTER spreadsheet for year: ${year}, examType: ${examType}`);
    next();
});

// ===== HELPER FUNCTIONS =====
async function getStudentsList(spreadsheetId) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'STUDENTS!A:E',
    });
    const data = response.data.values || [];
    const students = [];
    const seen = {};
    for (let i = 1; i < data.length; i++) {
        const admission = data[i]?.[0];
        if (admission && !seen[admission]) {
            seen[admission] = true;
            students.push(admission);
        }
    }
    return students;
}

async function calculateGrade(percentage) {
    if (percentage >= 80) return 'A';
    if (percentage >= 75) return 'A-';
    if (percentage >= 70) return 'B+';
    if (percentage >= 65) return 'B';
    if (percentage >= 60) return 'B-';
    if (percentage >= 55) return 'C+';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'C-';
    if (percentage >= 40) return 'D+';
    if (percentage >= 35) return 'D';
    return 'E';
}

// ===== BASIC ENDPOINTS =====
app.get('/', (req, res) => {
    res.json({ message: 'Nursing Marks API is running!' });
});

app.get('/api/years', (req, res) => {
    res.json(['2024', '2025', '2026']);
});

app.get('/api/blocks', (req, res) => {
    res.json(['BLOCK_0', 'BLOCK_1', 'BLOCK_2', 'BLOCK_3', 'BLOCK_4', 'BLOCK_5']);
});

// ===== MARK ENTRY CONTROL ENDPOINTS =====
app.get('/api/mark-entry/settings', (req, res) => {
    res.json(markEntrySettings);
});

app.get('/api/mark-entry/logs', (req, res) => {
    res.json(markEntryLogs);
});

app.post('/api/mark-entry/toggle-global', (req, res) => {
    const { lecturerName } = req.body;
    const isCurrentlyOpen = markEntrySettings.global?.enabled !== false;
    const newIsOpen = !isCurrentlyOpen;
    markEntrySettings.global = {
        enabled: newIsOpen,
        closedBy: newIsOpen === false ? lecturerName : null,
        closedAt: newIsOpen === false ? new Date().toISOString() : null
    };
    markEntryLogs.unshift({
        timestamp: new Date().toISOString(),
        lecturerName,
        action: newIsOpen === false ? 'close' : 'open',
        target: 'global',
        details: newIsOpen === false ? 'Closed all mark entry' : 'Opened all mark entry'
    });
    res.json({ success: true, message: newIsOpen === false ? 'Global mark entry closed' : 'Global mark entry opened' });
});

app.post('/api/mark-entry/toggle-class', (req, res) => {
    const { year, lecturerName } = req.body;
    const classKey = `${year}_all`;
    const isCurrentlyOpen = markEntrySettings[classKey]?.enabled !== false;
    const newIsOpen = !isCurrentlyOpen;
    markEntrySettings[classKey] = {
        enabled: newIsOpen,
        closedBy: newIsOpen === false ? lecturerName : null,
        closedAt: newIsOpen === false ? new Date().toISOString() : null
    };
    markEntryLogs.unshift({
        timestamp: new Date().toISOString(),
        lecturerName,
        action: newIsOpen === false ? 'close' : 'open',
        target: `March ${year} Class`,
        details: newIsOpen === false ? `Closed mark entry for March ${year} class` : `Opened mark entry for March ${year} class`
    });
    res.json({ success: true, message: newIsOpen === false ? `March ${year} class entry closed` : `March ${year} class entry opened` });
});

app.post('/api/mark-entry/toggle-subject', (req, res) => {
    const { block, subject, lecturerName } = req.body;
    const subjectKey = `${block}_${subject}`;
    const isCurrentlyOpen = markEntrySettings[subjectKey]?.enabled !== false;
    const newIsOpen = !isCurrentlyOpen;
    markEntrySettings[subjectKey] = {
        enabled: newIsOpen,
        closedBy: newIsOpen === false ? lecturerName : null,
        closedAt: newIsOpen === false ? new Date().toISOString() : null
    };
    markEntryLogs.unshift({
        timestamp: new Date().toISOString(),
        lecturerName,
        action: newIsOpen === false ? 'close' : 'open',
        target: subject,
        block: block,
        details: newIsOpen === false ? `Closed mark entry for ${subject}` : `Opened mark entry for ${subject}`
    });
    res.json({ success: true, message: newIsOpen === false ? `Entry closed for ${subject}` : `Entry opened for ${subject}` });
});

// ========== SUBJECTS ENDPOINT ==========
app.get('/api/subjects/:block', async (req, res) => {
    try {
        const { block } = req.params;
        const examType = req.headers['x-exam-type'] || 'internal';
        if (examType === 'nck') {
            res.json([
                { name: 'NCK_XY_FORMS', assessmentType: 'nck' },
                { name: 'NCK_ASSESSMENT_AND_CASE', assessmentType: 'nck' }
            ]);
        } else {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: req.spreadsheetId,
                range: 'CONFIG!A:E',
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const config = response.data.values || [];
            const subjects = [];
            for (let i = 1; i < config.length; i++) {
                if (config[i] && config[i][0] === block && config[i][3] === 'YES') {
                    subjects.push({
                        name: config[i][2],
                        code: config[i][1] || '',
                        assessmentType: config[i][4] || 'full'
                    });
                }
            }
            res.json(subjects);
        }
    } catch (error) {
        console.error('Error in /api/subjects:', error);
        res.json([]);
    }
});

// ========== GET MARKS ENDPOINT - WITH YEAR FILTERING ==========
app.get('/api/marks/:block/:subject', async (req, res) => {
    try {
        const { block, subject } = req.params;
        const examType = req.headers['x-exam-type'] || 'internal';
        const year = req.headers['x-year'] || '2024';
        
        console.log(`[GET MARKS] ExamType: ${examType}, Year: ${year}, block=${block}, subject=${subject}`);
        
        if (examType === 'nck') {
            // ===== NCK LOGIC - WITH YEAR FILTERING =====
            console.log(`📋 NCK request for: ${subject}, Year: ${year}`);
            
            let sheetName = '';
            if (subject === 'NCK_XY_FORMS' || subject.includes('XY')) {
                sheetName = 'NCK_XY_FORMS';
            } else if (subject === 'NCK_ASSESSMENT_AND_CASE' || subject.includes('ASSESSMENT')) {
                sheetName = 'NCK_ASSESSMENT_AND_CASE';
            } else {
                sheetName = 'NCK_XY_FORMS';
            }
            
            console.log(`📋 Using sheet: ${sheetName}`);
            
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: req.spreadsheetId,
                    range: `${sheetName}!A:Z`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                
                const data = response.data.values || [];
                console.log(`📋 NCK sheet ${sheetName} has ${data.length} rows`);
                
                if (data.length === 0) {
                    console.log(`⚠️ No data in ${sheetName}`);
                    res.json([]);
                    return;
                }
                
                const headers = data[0] || [];
                console.log(`📋 NCK headers: ${headers.slice(0, 5).join(', ')}...`);
                
                // Find column indexes
                const admIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'ADMISSION');
                const nameIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'NAME');
                const yearIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'YEAR');
                const gradedIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'GRADED BY');
                const avgIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'AVERAGE');
                const statusIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'STATUS');
                
                console.log(`📋 Year column index: ${yearIdx}`);
                console.log(`📋 Requested year: ${year}`);
                
                // Get score columns
                const scoreIndices = [];
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i] ? headers[i].toString().trim().toUpperCase() : '';
                    if (i !== admIdx && i !== nameIdx && i !== yearIdx && i !== gradedIdx && i !== avgIdx && i !== statusIdx) {
                        scoreIndices.push(i);
                    }
                }
                
                console.log(`📋 Found ${scoreIndices.length} score columns`);
                
                const allMarks = [];
                let totalRows = 0;
                let matchedRows = 0;
                let skippedNoYear = 0;
                let skippedWrongYear = 0;
                let yearsFound = {};
                
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;
                    totalRows++;
                    
                    // Get name
                    const name = row[nameIdx] ? row[nameIdx].toString().trim() : 'Unknown';
                    
                    // Get year from the row
                    let studentYear = '';
                    if (yearIdx !== -1 && row[yearIdx]) {
                        studentYear = row[yearIdx].toString().trim();
                    }
                    
                    // If no year in row, try to extract from admission
                    if (!studentYear) {
                        let admission = '';
                        if (admIdx !== -1 && row[admIdx]) {
                            admission = row[admIdx].toString().trim();
                        }
                        if (admission.includes('/2024') || admission.includes('/24')) {
                            studentYear = '2024';
                        } else if (admission.includes('/2025') || admission.includes('/25')) {
                            studentYear = '2025';
                        } else if (admission.includes('/2026') || admission.includes('/26')) {
                            studentYear = '2026';
                        } else {
                            studentYear = '2024'; // Default
                        }
                    }
                    
                    // Track years found
                    if (studentYear) {
                        yearsFound[studentYear] = (yearsFound[studentYear] || 0) + 1;
                    }
                    
                    // ✅ FILTER BY YEAR
                    if (!studentYear) {
                        skippedNoYear++;
                        continue;
                    }
                    
                    if (studentYear !== year) {
                        skippedWrongYear++;
                        continue;
                    }
                    
                    matchedRows++;
                    
                    // Get admission
                    let admission = '';
                    if (admIdx !== -1 && row[admIdx] && row[admIdx].toString().trim() !== '') {
                        admission = row[admIdx].toString().trim();
                    } else {
                        // Use name as identifier if no admission
                        admission = name.replace(/\s/g, '_').toUpperCase();
                    }
                    
                    // Get scores
                    const scores = [];
                    for (const idx of scoreIndices) {
                        const val = row[idx] ? parseFloat(row[idx]) || 0 : 0;
                        scores.push(val);
                    }
                    
                    // Calculate average if not already
                    let avg = 0;
                    if (avgIdx !== -1 && row[avgIdx]) {
                        avg = parseFloat(row[avgIdx]) || 0;
                    } else {
                        const validScores = scores.filter(s => s > 0);
                        if (validScores.length > 0) {
                            avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
                        }
                    }
                    
                    const status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].toString().trim() : (avg >= 60 ? 'PASS' : 'FAIL');
                    const gradedBy = gradedIdx !== -1 && row[gradedIdx] ? row[gradedIdx].toString().trim() : '';
                    
                    allMarks.push({
                        admission: admission,
                        name: name,
                        scores: scores,
                        final: avg,
                        status: status,
                        gradedBy: gradedBy || '',
                        year: studentYear
                    });
                }
                
                console.log(`📋 Total rows processed: ${totalRows}`);
                console.log(`📋 Years found in sheet:`, yearsFound);
                console.log(`📋 Matched year ${year}: ${matchedRows} records`);
                console.log(`📋 Skipped: ${skippedNoYear} no year, ${skippedWrongYear} wrong year`);
                console.log(`📋 Returning ${allMarks.length} records for ${year}`);
                
                res.json(allMarks);
                
            } catch (error) {
                console.error('❌ NCK error:', error);
                res.json([]);
            }
        } else {
            // ===== INTERNAL MARKS =====
            let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
            const sheetName = `${block}_${cleanSubject}`;
            
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: req.spreadsheetId,
                range: `${sheetName}!A:Z`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            
            const data = response.data.values || [];
            
            if (data.length === 0) {
                console.log(`[GET INTERNAL] No data found in sheet ${sheetName}`);
                res.json([]);
                return;
            }
            
            const headers = data[0] || [];
            
            function findColumnIndex(headers, keywords) {
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i] ? headers[i].toString().trim().toUpperCase() : '';
                    for (const keyword of keywords) {
                        const upperKeyword = keyword.toUpperCase();
                        if (header.includes(upperKeyword) || header.startsWith(upperKeyword)) {
                            return i;
                        }
                        if (upperKeyword.includes(header) && header.length > 2) {
                            return i;
                        }
                    }
                }
                return -1;
            }
            
            const admIdx = findColumnIndex(headers, ['ADMISSION', 'ADM NO', 'REG NO', 'REGISTRATION']);
            const nameIdx = findColumnIndex(headers, ['NAME', 'STUDENT NAME', 'FULL NAME']);
            const cat1Idx = findColumnIndex(headers, ['CAT1', 'CAT 1', 'CAT (0-30)']);
            const cat2Idx = findColumnIndex(headers, ['CAT2', 'CAT 2']);
            const examIdx = findColumnIndex(headers, ['EXAM', 'EXAM SCORE', 'EXAM (0-70)']);
            const finalIdx = findColumnIndex(headers, ['FINAL', 'TOTAL']);
            const gradeIdx = findColumnIndex(headers, ['GRADE']);
            const gradedIdx = findColumnIndex(headers, ['GRADED BY']);
            const typeIdx = findColumnIndex(headers, ['ASSESSMENT TYPE', 'ASSESSMENT_TYPE']);
            const yearIdx = findColumnIndex(headers, ['YEAR']);
            
            // ===== GET STUDENTS WITH YEAR INFO =====
            const studentsResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: req.spreadsheetId,
                range: 'STUDENTS!A:E',
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const studentsData = studentsResponse.data.values || [];
            
            const studentYearMap = {};
            const studentBlockMap = {};
            const studentNameMap = {};
            
            for (let i = 1; i < studentsData.length; i++) {
                const row = studentsData[i];
                if (row && row[0]) {
                    const admission = row[0].toString().trim();
                    studentYearMap[admission] = row[3] ? row[3].toString().trim() : '2024';
                    studentBlockMap[admission] = row[2] ? row[2].toString().trim() : '';
                    studentNameMap[admission] = row[1] ? row[1].toString().trim() : '';
                }
            }
            
            // ===== FILTER MARKS BY YEAR AND BLOCK =====
            const allMarks = [];
            let skippedWrongYear = 0;
            let skippedWrongBlock = 0;
            let skippedNoAdmission = 0;
            
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;
                
                let admission = '';
                if (admIdx !== -1 && row[admIdx]) {
                    admission = row[admIdx].toString().trim();
                } else if (row[0]) {
                    admission = row[0].toString().trim();
                }
                
                if (!admission) {
                    skippedNoAdmission++;
                    continue;
                }
                
                const studentBlock = studentBlockMap[admission] || '';
                if (studentBlock && studentBlock !== block) {
                    skippedWrongBlock++;
                    continue;
                }
                
                // ✅ Get the actual year from the MARKSHEET
                let studentYear = '';
                
                if (yearIdx !== -1 && row[yearIdx]) {
                    const sheetYear = row[yearIdx].toString().trim();
                    if (sheetYear) {
                        studentYear = sheetYear;
                    }
                }
                
                if (!studentYear) {
                    if (admission.includes('/2024') || admission.includes('/24')) {
                        studentYear = '2024';
                    } else if (admission.includes('/2025') || admission.includes('/25')) {
                        studentYear = '2025';
                    } else if (admission.includes('/2026') || admission.includes('/26')) {
                        studentYear = '2026';
                    } else {
                        studentYear = year;
                    }
                }
                
                if (studentYear && studentYear !== year) {
                    skippedWrongYear++;
                    continue;
                }
                
                const name = studentNameMap[admission] ||
                            (nameIdx !== -1 && row[nameIdx] ? row[nameIdx].toString().trim() : `Student ${i}`);
                const cat1 = cat1Idx !== -1 && row[cat1Idx] ? parseFloat(row[cat1Idx]) || 0 : 0;
                const cat2 = cat2Idx !== -1 && row[cat2Idx] ? parseFloat(row[cat2Idx]) || 0 : 0;
                const exam = examIdx !== -1 && row[examIdx] ? parseFloat(row[examIdx]) || 0 : 0;
                const final = finalIdx !== -1 && row[finalIdx] ? row[finalIdx].toString().trim() : '';
                const grade = gradeIdx !== -1 && row[gradeIdx] ? row[gradeIdx].toString().trim() : '';
                const gradedBy = gradedIdx !== -1 && row[gradedIdx] ? row[gradedIdx].toString().trim() : '';
                const assessmentType = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].toString().trim() : 'full';
                
                allMarks.push({
                    row: i + 1,
                    admission: admission,
                    name: name,
                    cat1: cat1,
                    cat2: cat2,
                    exam: exam,
                    final: final,
                    grade: grade,
                    gradedBy: gradedBy || '',
                    assessmentType: assessmentType,
                    year: studentYear || year
                });
            }
            
            console.log(`[GET INTERNAL] Found ${allMarks.length} marks for ${year}`);
            console.log(`[GET INTERNAL] Skipped: ${skippedWrongYear} wrong year, ${skippedWrongBlock} wrong block`);
            
            res.json(allMarks);
        }
        
    } catch (error) {
        console.error('Error in /api/marks:', error);
        res.json([]);
    }
});

// ===== CREATE MARKSHEET WITH STUDENTS =====
async function createMarksheetWithStudents(spreadsheetId, block, subject, assessmentType, year = '2024') {
    try {
        console.log(`📝 Creating marksheet for ${block} - ${subject} (${year})`);
        const studentsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'STUDENTS!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const students = studentsResponse.data.values || [];
        console.log(`📊 Found ${students.length - 1} students in STUDENTS sheet`);
        
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        let existingAdmissions = new Set();
        let sheetExists = false;
        
        try {
            const existingResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A:A`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const existingData = existingResponse.data.values || [];
            sheetExists = true;
            for (let i = 1; i < existingData.length; i++) {
                if (existingData[i] && existingData[i][0]) {
                    existingAdmissions.add(existingData[i][0].trim().toUpperCase());
                }
            }
            console.log(`📋 Found ${existingAdmissions.size} existing students in marksheet`);
        } catch (e) {
            console.log('📋 Sheet does not exist, will create new');
            sheetExists = false;
        }
        
        const rows = [['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE', 'YEAR']];
        let addedCount = 0;
        let skippedCount = 0;
        let wrongBlockCount = 0;
        let wrongYearCount = 0;
        
        for (let i = 1; i < students.length; i++) {
            const row = students[i];
            if (row && row[0] && row[0].trim() !== '' && row[4] !== 'INACTIVE') {
                const studentBlock = row[2] ? row[2].toString().trim() : '';
                if (studentBlock !== block) {
                    wrongBlockCount++;
                    continue;
                }
                const studentYear = row[3] ? row[3].toString().trim() : '2024';
                if (studentYear !== year) {
                    wrongYearCount++;
                    continue;
                }
                let admission = row[0].trim().toUpperCase();
                if (existingAdmissions.has(admission)) {
                    skippedCount++;
                    continue;
                }
                rows.push([
                    row[0].trim(),
                    row[1] || '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    assessmentType || 'full',
                    year || '2024'
                ]);
                addedCount++;
                existingAdmissions.add(admission);
            }
        }
        
        console.log(`👥 Adding ${addedCount} new students (${block}, ${year} only)`);
        console.log(`   Skipped: ${skippedCount} existing, ${wrongBlockCount} wrong block, ${wrongYearCount} wrong year`);
        
        if (sheetExists && addedCount === 0) {
            console.log(`✅ No new students to add. Sheet already has ${existingAdmissions.size} students.`);
            return { success: true, studentCount: existingAdmissions.size, newStudents: 0 };
        }
        
        if (sheetExists) {
            const currentResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A:J`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const currentData = currentResponse.data.values || [];
            const lastRow = currentData.length;
            if (rows.length > 1) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `${sheetName}!A${lastRow + 1}:J${lastRow + rows.length - 1}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: rows.slice(1) }
                });
                console.log(`✅ Added ${addedCount} new students to existing sheet`);
            }
            return { success: true, studentCount: existingAdmissions.size + addedCount, newStudents: addedCount };
        }
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requestBody: {
                requests: [{ addSheet: { properties: { title: sheetName } } }]
            }
        });
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1:J${rows.length}`,
            valueInputOption: 'RAW',
            requestBody: { values: rows }
        });
        console.log(`✅ Created new marksheet ${sheetName} with ${rows.length - 1} students`);
        return { success: true, studentCount: rows.length - 1, newStudents: addedCount };
    } catch (error) {
        console.error('❌ Error creating marksheet:', error);
        return { success: false, error: error.message };
    }
}

// ========== SAVE MARKS ENDPOINT ==========
app.post('/api/marks', async (req, res) => {
    try {
        console.log('🔍 ===== SAVE REQUEST STARTED =====');
        
        const { block, subject, marksData, lecturerName } = req.body;
        const examType = req.headers['x-exam-type'] || 'internal';
        const spreadsheetId = req.spreadsheetId;
        const year = req.headers['x-year'] || '2024';
        const userRole = req.headers['x-user-role'] || req.body.userRole;
        
        console.log(`📋 User: ${lecturerName}, Role: ${userRole}`);
        console.log(`📋 Subject: ${subject}`);
        console.log(`📋 Block: ${block}`);
        console.log(`📋 Exam Type: ${examType}`);
        console.log(`📋 Year: ${year}`);
        console.log(`📋 Spreadsheet ID: ${spreadsheetId}`);
        console.log(`📋 Records received: ${marksData?.length || 0}`);
        
        if (marksData && marksData.length > 0) {
            console.log('📋 First 3 records:');
            for (let i = 0; i < Math.min(3, marksData.length); i++) {
                console.log(`  [${i}] Admission: ${marksData[i].admission}, CAT1: ${marksData[i].cat1}, CAT2: ${marksData[i].cat2}, EXAM: ${marksData[i].exam}`);
            }
        }
        
        const isAdmin = (userRole === 'admin' || lecturerName === 'Administrator');
        console.log(`📋 Is Admin: ${isAdmin}`);
        
        if (!isAdmin) {
            if (markEntrySettings.global && markEntrySettings.global.enabled === false) {
                console.log('❌ Global entry closed');
                return res.status(403).json({ success: false, message: '❌ Mark entry is globally closed.' });
            }
            const classKey = `${year}_all`;
            if (markEntrySettings[classKey] && markEntrySettings[classKey].enabled === false) {
                console.log(`❌ Class entry closed for ${year}`);
                return res.status(403).json({ success: false, message: `❌ Mark entry is closed for March ${year} class.` });
            }
            if (examType === 'internal') {
                const subjectKey = `${block}_${subject}`;
                if (markEntrySettings[subjectKey] && markEntrySettings[subjectKey].enabled === false) {
                    console.log(`❌ Subject entry closed for ${subject}`);
                    return res.status(403).json({ success: false, message: `❌ Mark entry is closed for ${subject}.` });
                }
            }
        }
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: lecturerName,
            action: 'save',
            target: subject,
            block: block,
            examType: examType,
            details: `Saved ${marksData?.length || 0} entries`
        });
        if (markEntryLogs.length > 500) markEntryLogs = markEntryLogs.slice(0, 500);
        
        if (examType === 'nck') {
            console.log('📋 NCK save - processing...');
            // Determine sheet
            let sheetName = '';
            if (subject === 'NCK_XY_FORMS' || subject.includes('XY')) {
                sheetName = 'NCK_XY_FORMS';
            } else if (subject === 'NCK_ASSESSMENT_AND_CASE' || subject.includes('ASSESSMENT')) {
                sheetName = 'NCK_ASSESSMENT_AND_CASE';
            } else {
                sheetName = 'NCK_XY_FORMS';
            }
            
            try {
                // Get current data
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: req.spreadsheetId,
                    range: `${sheetName}!A:Z`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                
                const data = response.data.values || [];
                const headers = data[0] || [];
                
                // Find column indexes
                const admIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'ADMISSION');
                const nameIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'NAME');
                const yearIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'YEAR');
                const gradedIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'GRADED BY');
                const avgIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'AVERAGE');
                const statusIdx = headers.findIndex(h => h && h.toString().trim().toUpperCase() === 'STATUS');
                
                // Get score columns
                const scoreIndices = [];
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i] ? headers[i].toString().trim().toUpperCase() : '';
                    if (i !== admIdx && i !== nameIdx && i !== yearIdx && i !== gradedIdx && i !== avgIdx && i !== statusIdx) {
                        scoreIndices.push(i);
                    }
                }
                
                // Build map of existing students
                const existingMap = new Map();
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (row && row[admIdx]) {
                        const admission = row[admIdx].toString().trim();
                        if (admission) {
                            existingMap.set(admission, { rowNum: i + 1, data: row });
                        }
                    }
                }
                
                let updatedCount = 0;
                let insertedCount = 0;
                
                for (const mark of marksData) {
                    const admission = mark.admission ? mark.admission.toString().trim() : '';
                    if (!admission) continue;
                    
                    const scores = mark.scores || [];
                    const gradedBy = mark.gradedBy || lecturerName || '';
                    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                    const status = avg >= 60 ? 'PASS' : 'FAIL';
                    const yearVal = mark.year || year || '2024';
                    
                    const rowData = [];
                    for (let i = 0; i < headers.length; i++) {
                        const header = headers[i] || '';
                        const headerUpper = header.toString().trim().toUpperCase();
                        
                        if (headerUpper === 'ADMISSION') {
                            rowData.push(admission);
                        } else if (headerUpper === 'NAME') {
                            rowData.push(mark.name || '');
                        } else if (headerUpper === 'YEAR') {
                            rowData.push(yearVal);
                        } else if (headerUpper === 'GRADED BY') {
                            rowData.push(gradedBy);
                        } else if (headerUpper === 'AVERAGE') {
                            rowData.push(avg);
                        } else if (headerUpper === 'STATUS') {
                            rowData.push(status);
                        } else {
                            // It's a score column
                            const idx = headers.indexOf(header);
                            const scoreIdx = scoreIndices.indexOf(idx);
                            if (scoreIdx !== -1 && scores[scoreIdx] !== undefined) {
                                rowData.push(scores[scoreIdx]);
                            } else {
                                rowData.push('');
                            }
                        }
                    }
                    
                    if (existingMap.has(admission)) {
                        // Update existing
                        const rowNum = existingMap.get(admission).rowNum;
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: req.spreadsheetId,
                            range: `${sheetName}!A${rowNum}:Z${rowNum}`,
                            valueInputOption: 'RAW',
                            requestBody: { values: [rowData] }
                        });
                        updatedCount++;
                    } else {
                        // Insert new
                        const lastRow = data.length + 1;
                        await sheets.spreadsheets.values.append({
                            spreadsheetId: req.spreadsheetId,
                            range: `${sheetName}!A:Z`,
                            valueInputOption: 'RAW',
                            requestBody: { values: [rowData] }
                        });
                        insertedCount++;
                        data.push(rowData);
                    }
                }
                
                console.log(`📋 NCK save complete: ${updatedCount} updated, ${insertedCount} inserted`);
                res.json({ success: true, message: `NCK marks saved: ${updatedCount} updated, ${insertedCount} inserted`, updated: updatedCount, inserted: insertedCount });
                
            } catch (error) {
                console.error('❌ NCK save error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        } else {
            // ===== INTERNAL MARKS SAVE =====
            let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
            const sheetName = `${block}_${cleanSubject}`;
            console.log(`📋 Sheet Name: ${sheetName}`);
            
            let currentData = [];
            try {
                console.log(`📡 Reading sheet: ${sheetName}`);
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!A:J`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                currentData = response.data.values || [];
                console.log(`📋 Sheet has ${currentData.length} rows (including header)`);
            } catch (error) {
                console.log(`⚠️ Sheet ${sheetName} does not exist, creating...`);
                try {
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId: spreadsheetId,
                        requestBody: {
                            requests: [{ addSheet: { properties: { title: sheetName } } }]
                        }
                    });
                    const headers = ['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE', 'YEAR'];
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!A1:J1`,
                        valueInputOption: 'RAW',
                        requestBody: { values: [headers] }
                    });
                    currentData = [headers];
                    console.log(`✅ Created new sheet: ${sheetName}`);
                } catch (createError) {
                    console.error('❌ Error creating sheet:', createError);
                    return res.status(500).json({
                        success: false,
                        error: `Could not create sheet: ${createError.message}`
                    });
                }
            }
            
            // Find column indexes
            const headers = currentData[0] || [];
            function findColIndex(colName) {
                for (let i = 0; i < headers.length; i++) {
                    if (headers[i] && headers[i].toString().trim().toUpperCase() === colName.toUpperCase()) {
                        return i;
                    }
                }
                return -1;
            }
            
            const admIdx = findColIndex('ADMISSION');
            const nameIdx = findColIndex('NAME');
            const cat1Idx = findColIndex('CAT1');
            const cat2Idx = findColIndex('CAT2');
            const examIdx = findColIndex('EXAM');
            const finalIdx = findColIndex('FINAL');
            const gradeIdx = findColIndex('GRADE');
            const gradedIdx = findColIndex('GRADED BY');
            const typeIdx = findColIndex('ASSESSMENT_TYPE');
            const yearIdx = findColIndex('YEAR');
            
            console.log(`📋 Column indexes:`, { admIdx, nameIdx, cat1Idx, cat2Idx, examIdx, finalIdx, gradeIdx, gradedIdx, typeIdx, yearIdx });
            
            const existingDataMap = new Map();
            let maxRow = 1;
            
            console.log('📋 Building existing data map...');
            for (let i = 1; i < currentData.length; i++) {
                const row = currentData[i];
                if (row && row[admIdx] !== undefined && row[admIdx] !== '') {
                    const admission = row[admIdx] ? row[admIdx].toString().trim() : '';
                    if (!admission) continue;
                    
                    existingDataMap.set(admission, {
                        rowNum: i + 1,
                        name: row[nameIdx] ? row[nameIdx].toString().trim() : '',
                        cat1: parseFloat(row[cat1Idx]) || 0,
                        cat2: parseFloat(row[cat2Idx]) || 0,
                        exam: parseFloat(row[examIdx]) || 0,
                        final: row[finalIdx] || '',
                        grade: row[gradeIdx] || '',
                        gradedBy: row[gradedIdx] || '',
                        assessmentType: row[typeIdx] || 'full',
                        year: row[yearIdx] ? row[yearIdx].toString().trim() : '2024'
                    });
                    if (i + 1 > maxRow) maxRow = i + 1;
                }
            }
            
            console.log(`📋 Found ${existingDataMap.size} existing students in sheet`);
            
            const rowsToUpdate = [];
            const rowsToInsert = [];
            let skippedCount = 0;
            let processedCount = 0;
            
            console.log('📋 Processing marks...');
            for (const mark of marksData) {
                processedCount++;
                const admission = mark.admission ? mark.admission.toString().trim() : '';
                if (!admission) {
                    console.log(`⚠️ [${processedCount}] Skipping: No admission number`);
                    skippedCount++;
                    continue;
                }
                
                let cat1 = parseFloat(mark.cat1) || 0;
                let cat2 = parseFloat(mark.cat2) || 0;
                let exam = parseFloat(mark.exam) || 0;
                let name = mark.name || '';
                
                console.log(`📋 [${processedCount}] Processing: ${admission} - CAT1: ${cat1}, CAT2: ${cat2}, EXAM: ${exam}`);
                
                if (existingDataMap.has(admission)) {
                    const existing = existingDataMap.get(admission);
                    console.log(`📋 [${processedCount}] Found existing: ${admission}`);
                    console.log(`   Existing: CAT1=${existing.cat1}, CAT2=${existing.cat2}, EXAM=${existing.exam}`);
                    console.log(`   New:      CAT1=${cat1}, CAT2=${cat2}, EXAM=${exam}`);
                    
                    if (!name) name = existing.name;
                    
                    const cat1Changed = Math.abs(existing.cat1 - cat1) > 0.01;
                    const cat2Changed = Math.abs(existing.cat2 - cat2) > 0.01;
                    const examChanged = Math.abs(existing.exam - exam) > 0.01;
                    
                    console.log(`   Changes: CAT1=${cat1Changed}, CAT2=${cat2Changed}, EXAM=${examChanged}`);
                    
                    if (cat1Changed || cat2Changed || examChanged) {
                        console.log(`✅ [${processedCount}] Will UPDATE ${admission}`);
                        
                        let finalScore = 0;
                        const hasCat1 = cat1 > 0;
                        const hasCat2 = cat2 > 0;
                        const hasExam = exam > 0;
                        
                        let assessmentType = existing.assessmentType || 'full';
                        
                        if (assessmentType === 'full') {
                            if (hasExam && hasCat1 && hasCat2) {
                                finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60 * 30) + Math.min(exam, 70);
                            } else if (hasExam && hasCat1) {
                                finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
                            } else if (hasExam) {
                                finalScore = Math.min(exam, 100);
                            } else if (hasCat1 && hasCat2) {
                                finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60) * 100;
                            } else if (hasCat1) {
                                finalScore = (Math.min(cat1, 30) / 30) * 100;
                            }
                        } else if (assessmentType === 'single_cat') {
                            if (hasExam && hasCat1) {
                                finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
                            } else if (hasExam) {
                                finalScore = Math.min(exam, 100);
                            } else if (hasCat1) {
                                finalScore = (Math.min(cat1, 30) / 30) * 100;
                            }
                        } else {
                            if (hasExam) {
                                finalScore = Math.min(exam, 100);
                            }
                        }
                        finalScore = Math.round(finalScore * 10) / 10;
                        const grade = await calculateGrade(finalScore);
                        
                        rowsToUpdate.push({
                            admission,
                            name: name || '',
                            cat1,
                            cat2,
                            exam,
                            finalScore,
                            grade,
                            gradedBy: lecturerName || existing.gradedBy || '',
                            assessmentType,
                            rowNum: existing.rowNum
                        });
                        console.log(`   Final Score: ${finalScore}, Grade: ${grade}`);
                    } else {
                        skippedCount++;
                        console.log(`⏭️ [${processedCount}] Skipping ${admission}: No changes`);
                    }
                } else {
                    console.log(`➕ [${processedCount}] Will INSERT new student: ${admission}`);
                    
                    let finalScore = 0;
                    const hasCat1 = cat1 > 0;
                    const hasCat2 = cat2 > 0;
                    const hasExam = exam > 0;
                    
                    let assessmentType = 'full';
                    if (assessmentType === 'full') {
                        if (hasExam && hasCat1 && hasCat2) {
                            finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60 * 30) + Math.min(exam, 70);
                        } else if (hasExam && hasCat1) {
                            finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
                        } else if (hasExam) {
                            finalScore = Math.min(exam, 100);
                        } else if (hasCat1 && hasCat2) {
                            finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60) * 100;
                        } else if (hasCat1) {
                            finalScore = (Math.min(cat1, 30) / 30) * 100;
                        }
                    } else if (assessmentType === 'single_cat') {
                        if (hasExam && hasCat1) {
                            finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
                        } else if (hasExam) {
                            finalScore = Math.min(exam, 100);
                        } else if (hasCat1) {
                            finalScore = (Math.min(cat1, 30) / 30) * 100;
                        }
                    } else {
                        if (hasExam) {
                            finalScore = Math.min(exam, 100);
                        }
                    }
                    finalScore = Math.round(finalScore * 10) / 10;
                    const grade = await calculateGrade(finalScore);
                    
                    rowsToInsert.push({
                        admission,
                        name: name || '',
                        cat1,
                        cat2,
                        exam,
                        finalScore,
                        grade,
                        gradedBy: lecturerName || '',
                        assessmentType
                    });
                    console.log(`   Final Score: ${finalScore}, Grade: ${grade}`);
                }
            }
            
            console.log(`📋 Summary: Updates=${rowsToUpdate.length}, Inserts=${rowsToInsert.length}, Skipped=${skippedCount}`);
            
            console.log(`📡 Updating ${rowsToUpdate.length} rows...`);
            for (const mark of rowsToUpdate) {
                console.log(`   Updating row ${mark.rowNum} for ${mark.admission}: CAT1=${mark.cat1}, CAT2=${mark.cat2}, EXAM=${mark.exam}`);
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!B${mark.rowNum}:H${mark.rowNum}`,
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [[mark.name, mark.cat1, mark.cat2, mark.exam, mark.finalScore, mark.grade, mark.gradedBy]]
                    }
                });
            }
            
            if (rowsToInsert.length > 0) {
                console.log(`📡 Inserting ${rowsToInsert.length} new rows...`);
                const valuesToInsert = rowsToInsert.map(mark => [
                    mark.admission,
                    mark.name,
                    mark.cat1,
                    mark.cat2,
                    mark.exam,
                    mark.finalScore,
                    mark.grade,
                    mark.gradedBy,
                    mark.assessmentType
                ]);
                
                const startRow = maxRow + 1;
                console.log(`   Inserting at row ${startRow}`);
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!A${startRow}:J${startRow + valuesToInsert.length - 1}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: valuesToInsert }
                });
            }
            
            console.log(`✅ SAVE COMPLETE: Updated ${rowsToUpdate.length}, Inserted ${rowsToInsert.length}, Skipped ${skippedCount}`);
            console.log('🔍 ===== SAVE REQUEST COMPLETED =====');
            
            res.json({
                success: true,
                message: `Saved ${rowsToUpdate.length} updated + ${rowsToInsert.length} new marks`,
                updated: rowsToUpdate.length,
                inserted: rowsToInsert.length,
                skipped: skippedCount,
                debug: {
                    totalReceived: marksData?.length || 0,
                    existingStudents: existingDataMap.size,
                    processed: processedCount
                }
            });
        }
    } catch (error) {
        console.error('❌ Error saving marks:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// ========== UNIT ENDPOINTS ==========
app.get('/api/units', async (req, res) => {
    try {
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const data = response.data.values || [];
        const units = {};
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 5) continue;
            const block = row[0] || '';
            const unitCode = row[1] || '';
            const unitName = row[2] || '';
            const active = row[3] || '';
            const assessmentType = row[4] || 'full';
            if (active !== 'YES') continue;
            if (!unitName) continue;
            if (!units[block]) units[block] = [];
            units[block].push({
                name: unitName,
                code: unitCode,
                assessmentType: assessmentType
            });
        }
        res.json(units);
    } catch (error) {
        console.error('Error in /api/units:', error);
        res.json({});
    }
});

app.post('/api/add-unit', async (req, res) => {
    try {
        const { block, name, assessmentType, unitCode } = req.body;
        const year = req.headers['x-year'] || '2024';
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        
        console.log(`📅 Adding unit: ${block} - ${name} (${year})`);
        console.log(`📋 Unit Code: ${unitCode || 'Auto-generated'}`);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const data = response.data.values || [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;
            const existingBlock = row[0] || '';
            const existingName = row[2] || '';
            const existingActive = row[3] || '';
            if (existingBlock === block && existingName === name) {
                if (existingActive === 'YES') {
                    return res.json({ success: false, message: 'Unit already exists and is active' });
                } else {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: spreadsheetId,
                        range: `CONFIG!D${i+1}:E${i+1}`,
                        valueInputOption: 'RAW',
                        requestBody: { values: [['YES', assessmentType || 'full']] }
                    });
                    await createMarksheetWithStudents(spreadsheetId, block, name, assessmentType, year);
                    return res.json({ success: true, message: 'Unit reactivated successfully' });
                }
            }
        }
        
        let finalUnitCode = unitCode;
        if (!finalUnitCode) {
            const blockPrefix = block.replace('BLOCK_', 'B');
            const blockUnits = data.filter(row => row && row[0] === block && row[3] === 'YES');
            const nextNumber = blockUnits.length + 1;
            finalUnitCode = `NCHSGN ${blockPrefix}${String(nextNumber).padStart(2, '0')}`;
        }
        
        const nextRow = data.length + 1;
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `CONFIG!A${nextRow}:E${nextRow}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    block,
                    finalUnitCode,
                    name,
                    'YES',
                    assessmentType || 'full'
                ]]
            }
        });
        
        await createMarksheetWithStudents(spreadsheetId, block, name, assessmentType, year);
        
        res.json({ success: true, message: 'Unit added successfully', unitCode: finalUnitCode });
    } catch (error) {
        console.error('Error adding unit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/delete-unit', async (req, res) => {
    try {
        const { block, name } = req.body;
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const data = response.data.values || [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;
            if (row[0] === block && row[2] === name) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `CONFIG!D${i+1}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [['NO']] }
                });
                res.json({ success: true, message: 'Unit deleted successfully' });
                return;
            }
        }
        res.json({ success: false, message: 'Unit not found' });
    } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/update-unit', async (req, res) => {
    try {
        const { block, oldName, newName, assessmentType, unitCode } = req.body;
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        console.log(`📝 Updating unit: ${block} - ${oldName} → ${newName}`);
        console.log(`📋 Unit Code: ${unitCode || 'Keep existing'}`);
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const data = response.data.values || [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;
            if (row[0] === block && row[2] === oldName) {
                const rowNum = i + 1;
                const existingUnitCode = row[1] || '';
                const finalUnitCode = unitCode || existingUnitCode;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `CONFIG!B${rowNum}:E${rowNum}`,
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [[
                            finalUnitCode,
                            newName,
                            'YES',
                            assessmentType || row[4] || 'full'
                        ]]
                    }
                });
                res.json({ success: true, message: 'Unit updated successfully', unitCode: finalUnitCode });
                return;
            }
        }
        res.json({ success: false, message: 'Unit not found' });
    } catch (error) {
        console.error('Error updating unit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== STUDENT ENDPOINTS ==========
app.get('/api/students', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: req.spreadsheetId,
            range: 'STUDENTS!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const data = response.data.values || [];
        const students = [];
        const seen = {};
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const admission = row ? row[0] : null;
            if (admission && !seen[admission]) {
                seen[admission] = true;
                students.push({
                    admission,
                    name: row[1] || '',
                    block: row[2] || 'BLOCK_0',
                    year: row[3] || '',
                    status: row[4] || 'ACTIVE'
                });
            }
        }
        console.log(`[GET STUDENTS] Found ${students.length} students`);
        res.json(students);
    } catch (error) {
        console.error('Error in /api/students:', error);
        res.json([]);
    }
});

app.post('/api/add-student', async (req, res) => {
    try {
        const { admission, name, block, year } = req.body;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: req.spreadsheetId,
            range: 'STUDENTS!A:E',
        });
        const data = response.data.values || [];
        const nextRow = data.length + 1;
        await sheets.spreadsheets.values.update({
            spreadsheetId: req.spreadsheetId,
            range: `STUDENTS!A${nextRow}:E${nextRow}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[admission, name.toUpperCase(), block, year || '2026', 'ACTIVE']] }
        });
        res.json({ success: true, message: 'Student added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/update-student', async (req, res) => {
    try {
        const { admission, name, block, year } = req.body;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: req.spreadsheetId,
            range: 'STUDENTS!A:E',
        });
        const data = response.data.values || [];
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][0] === admission) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: req.spreadsheetId,
                    range: `STUDENTS!B${i+1}:D${i+1}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [[name.toUpperCase(), block, year || '2026']] }
                });
                break;
            }
        }
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/delete-student', async (req, res) => {
    try {
        const { admission } = req.body;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: req.spreadsheetId,
            range: 'STUDENTS!A:E',
        });
        const data = response.data.values || [];
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][0] === admission) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: req.spreadsheetId,
                    range: `STUDENTS!E${i+1}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [['INACTIVE']] }
                });
                break;
            }
        }
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== LOGIN ENDPOINT ==========
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        
        try {
            const adminResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'ADMIN!A:C'
            });
            const admins = adminResponse.data.values || [];
            for (let i = 1; i < admins.length; i++) {
                const row = admins[i];
                if (row && row[0] === username && row[1] === password) {
                    return res.json({
                        success: true,
                        user: {
                            username,
                            name: 'Administrator',
                            role: 'admin',
                            subjects: ['ALL']
                        }
                    });
                }
            }
        } catch (e) { /* skip */ }
        
        try {
            const lecturersResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: 'LECTURERS!A:G'
            });
            const lecturers = lecturersResponse.data.values || [];
            for (let i = 1; i < lecturers.length; i++) {
                const row = lecturers[i];
                if (row && row[0] === username && row[3] === password && row[5] !== 'NO') {
                    let subjects = row[4] ? row[4].split(',') : [];
                    return res.json({
                        success: true,
                        user: {
                            username,
                            name: row[1] || username,
                            role: 'lecturer',
                            subjects: subjects,
                            homeYear: row[6] || '2024'
                        }
                    });
                }
            }
        } catch (e) { /* skip */ }
        
        res.json({ success: false, message: 'Invalid username or password' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========== REFRESH ENDPOINT ==========
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('🔄 Refreshing data from master spreadsheet...');
        const studentsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: 'STUDENTS!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const configResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: 'CONFIG!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const lecturersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: 'LECTURERS!A:G',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const studentData = studentsResponse.data.values || [];
        const configData = configResponse.data.values || [];
        const lecturerData = lecturersResponse.data.values || [];
        console.log(`[REFRESH] Students: ${studentData.length - 1}, Config: ${configData.length - 1}, Lecturers: ${lecturerData.length - 1}`);
        res.json({
            success: true,
            message: 'Data refreshed from master spreadsheet.',
            stats: {
                students: studentData.length - 1,
                config: configData.length - 1,
                lecturers: lecturerData.length - 1
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== LECTURER ENDPOINTS =====
app.get('/api/lecturers', async (req, res) => {
    try {
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        console.log(`[GET LECTURERS] Using master spreadsheet: ${spreadsheetId}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'LECTURERS!A:G',
        });
        const data = response.data.values || [];
        const lecturers = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row && row[0] && row[5] !== 'NO') {
                lecturers.push({
                    username: row[0],
                    name: row[1] || row[0],
                    email: row[2] || '',
                    subjects: row[4] ? row[4].split(',') : [],
                    status: row[5] || 'YES'
                });
            }
        }
        console.log(`[GET LECTURERS] Found ${lecturers.length} lecturers`);
        res.json(lecturers);
    } catch (error) {
        console.error('Error fetching lecturers:', error);
        res.json([]);
    }
});

app.get('/api/lecturer/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        console.log(`[GET LECTURER] Looking for: ${username} in master spreadsheet`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'LECTURERS!A:G',
        });
        const data = response.data.values || [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (row && row[0] === username) {
                res.json({
                    username: row[0],
                    name: row[1] || row[0],
                    email: row[2] || '',
                    subjects: row[4] ? row[4].split(',') : []
                });
                return;
            }
        }
        res.json(null);
    } catch (error) {
        console.error('Error fetching lecturer:', error);
        res.json(null);
    }
});

app.post('/api/add-lecturer', async (req, res) => {
    try {
        const { username, name, email, password, subjects } = req.body;
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        console.log(`[ADD LECTURER] Adding: ${username} to master spreadsheet`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'LECTURERS!A:G',
        });
        const data = response.data.values || [];
        const nextRow = data.length + 1;
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `LECTURERS!A${nextRow}:G${nextRow}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[
                    username,
                    name,
                    email || '',
                    password || 'password123',
                    subjects ? subjects.join(',') : '',
                    'YES',
                    new Date().toISOString()
                ]]
            }
        });
        res.json({ success: true, message: 'Lecturer added successfully' });
    } catch (error) {
        console.error('Error adding lecturer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/update-lecturer', async (req, res) => {
    try {
        const { oldUsername, username, name, email, password, subjects } = req.body;
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        console.log(`[UPDATE LECTURER] Updating: ${oldUsername} in master spreadsheet`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'LECTURERS!A:G',
        });
        const data = response.data.values || [];
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][0] === oldUsername) {
                const row = i + 1;
                const subjectsStr = subjects && subjects.length > 0 ? subjects.join(',') : '';
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `LECTURERS!A${row}:F${row}`,
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [[
                            username,
                            name,
                            email || '',
                            password || data[i][3],
                            subjectsStr,
                            'YES'
                        ]]
                    }
                });
                res.json({ success: true, message: 'Lecturer updated successfully' });
                return;
            }
        }
        res.json({ success: false, message: 'Lecturer not found' });
    } catch (error) {
        console.error('Error updating lecturer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/delete-lecturer', async (req, res) => {
    try {
        const { username } = req.body;
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        console.log(`[DELETE LECTURER] Deleting: ${username} from master spreadsheet`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'LECTURERS!A:G',
        });
        const data = response.data.values || [];
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][0] === username) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `LECTURERS!F${i+1}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [['NO']] }
                });
                res.json({ success: true, message: 'Lecturer deleted successfully' });
                return;
            }
        }
        res.json({ success: false, message: 'Lecturer not found' });
    } catch (error) {
        console.error('Error deleting lecturer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== STUDENT ENDPOINT =====
app.get('/api/student/:admission', async (req, res) => {
    try {
        let { admission } = req.params;
        const spreadsheetId = MASTER_SPREADSHEET_ID;
        console.log(`🔍 Looking for student: ${admission}`);
        
        function standardizeAdm(adm) {
            if (!adm) return '';
            let a = adm.toString().trim().toUpperCase();
            a = a.replace(/MAR\/(\d{2})(?![0-9])/g, 'MAR/20$1');
            a = a.replace(/\/(\d{2})(?![0-9])/g, (match, year) => {
                if (year >= 24 && year <= 26) return `/20${year}`;
                return match;
            });
            return a;
        }
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'STUDENTS!A:E',
        });
        const data = response.data.values || [];
        let student = null;
        
        const formats = [
            admission,
            standardizeAdm(admission),
            admission.replace(/03\//g, 'MAR/'),
            admission.replace(/MAR\//g, '03/'),
            admission.replace(/\/2024/g, '/24'),
            admission.replace(/\/2025/g, '/25'),
            admission.replace(/\/2026/g, '/26'),
        ];
        const uniqueFormats = [...new Set(formats)];
        console.log(`📡 Trying formats:`, uniqueFormats);
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[0]) continue;
            const sheetAdm = row[0].toString().trim();
            const sheetAdmStd = standardizeAdm(sheetAdm);
            for (const format of uniqueFormats) {
                const formatStd = standardizeAdm(format);
                if (sheetAdm === format || sheetAdmStd === formatStd || sheetAdm === formatStd) {
                    student = {
                        admission: row[0],
                        name: row[1] || 'Unknown',
                        block: row[2] || 'BLOCK_0',
                        year: row[3] || '2024',
                        status: row[4] || 'ACTIVE'
                    };
                    console.log(`✅ Found student: ${student.name} (${student.admission})`);
                    break;
                }
            }
            if (student) break;
        }
        
        if (!student) {
            const searchAdm = admission.toUpperCase().trim();
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[0]) continue;
                const sheetAdm = row[0].toString().toUpperCase().trim();
                if (sheetAdm.includes(searchAdm) || searchAdm.includes(sheetAdm)) {
                    student = {
                        admission: row[0],
                        name: row[1] || 'Unknown',
                        block: row[2] || 'BLOCK_0',
                        year: row[3] || '2024',
                        status: row[4] || 'ACTIVE'
                    };
                    console.log(`✅ Found student by partial match: ${student.name} (${student.admission})`);
                    break;
                }
            }
        }
        
        if (student) {
            res.json({ success: true, student });
        } else {
            console.log(`❌ Student not found: ${admission}`);
            res.json({ success: false, message: 'Student not found' });
        }
    } catch (error) {
        console.error('Error in /api/student:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== STATS ENDPOINT =====
app.get('/api/stats', async (req, res) => {
    try {
        const students = await getStudentsList(req.spreadsheetId);
        res.json({ totalStudents: students.length, totalBlocks: 6, totalSubjects: 28 });
    } catch (error) {
        res.json({ totalStudents: 0, totalBlocks: 6, totalSubjects: 28 });
    }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
