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

// ========== GET MARKS ENDPOINT ==========
app.get('/api/marks/:block/:subject', async (req, res) => {
    try {
        const { block, subject } = req.params;
        const examType = req.headers['x-exam-type'] || 'internal';
        const year = req.headers['x-year'] || '2024';
        
        console.log(`[GET MARKS] ExamType: ${examType}, Year: ${year}, block=${block}, subject=${subject}`);
        
        if (examType === 'nck') {
            // ... NCK marks logic (keep as is) ...
            const sheetName = subject;
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: req.spreadsheetId,
                    range: `${sheetName}!A:AB`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                const data = response.data.values || [];
                const marks = [];
                // ... rest of NCK marks logic ...
                res.json(marks);
            } catch (error) {
                console.error(`[GET NCK] Error reading ${sheetName}:`, error);
                res.json([]);
            }
        } else {
            // ===== INTERNAL MARKS =====
            let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
            const sheetName = `${block}_${cleanSubject}`;
            console.log(`[GET INTERNAL] Reading sheet: ${sheetName}`);
            
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: req.spreadsheetId,
                range: `${sheetName}!A:I`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            
            const data = response.data.values || [];
            const allMarks = [];
            
            const studentsResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: req.spreadsheetId,
                range: 'STUDENTS!A:E',
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const studentsData = studentsResponse.data.values || [];
            const studentYearMap = {};
            for (let i = 1; i < studentsData.length; i++) {
                const row = studentsData[i];
                if (row && row[0]) {
                    studentYearMap[row[0].trim()] = row[3] || '2024';
                }
            }
            
            for (let i = 1; i < data.length; i++) {
                if (data[i] && data[i][0]) {
                    const admission = data[i][0].trim();
                    const studentYear = studentYearMap[admission] || '2024';
                    if (studentYear === year) {
                        allMarks.push({ 
                            row: i + 1, 
                            admission: admission, 
                            name: data[i][1], 
                            cat1: data[i][2] || '', 
                            cat2: data[i][3] || '', 
                            exam: data[i][4] || '', 
                            final: data[i][5] || '', 
                            grade: data[i][6] || '',
                            gradedBy: data[i][7] || '', 
                            assessmentType: data[i][8] || 'full' 
                        });
                    }
                }
            }
            console.log(`[GET INTERNAL] Found ${allMarks.length} marks for ${year}`);
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
                    let admission = existingData[i][0].trim().toUpperCase();
                    existingAdmissions.add(admission);
                }
            }
            console.log(`📋 Found ${existingAdmissions.size} existing students in marksheet`);
        } catch (e) {
            console.log('📋 Sheet does not exist, will create new');
            sheetExists = false;
        }
        
        const rows = [['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE']];
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
                    assessmentType || 'full'
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
                range: `${sheetName}!A:I`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const currentData = currentResponse.data.values || [];
            const lastRow = currentData.length;
            if (rows.length > 1) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `${sheetName}!A${lastRow + 1}:I${lastRow + rows.length - 1}`,
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
            range: `${sheetName}!A1:I${rows.length}`,
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
        
        // ... rest of save marks logic (keep as is) ...
        
        res.json({ success: true, message: 'Marks saved successfully' });
    } catch (error) {
        console.error('❌ Error saving marks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== UNIT ENDPOINTS - WITH UNIT CODES ==========
app.get('/api/units', async (req, res) => {
    try {
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:E',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const data = response.data.values || [];
        console.log(`[GET UNITS] Found ${data.length} rows in CONFIG`);
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
        console.log(`[GET UNITS] Returning ${Object.keys(units).length} blocks`);
        res.json(units);
    } catch (error) {
        console.error('Error in /api/units:', error);
        res.json({});
    }
});

// ========== ✅ ADD UNIT - WITH UNIT CODE (KEEP THIS ONE) ==========
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

// ========== DELETE UNIT ==========
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

// ========== UPDATE UNIT ==========
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
        // Check ADMIN sheet
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
        // Check LECTURERS sheet
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

// ========== STUDENT ENDPOINT ==========
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

// ========== STATS ENDPOINT ==========
app.get('/api/stats', async (req, res) => {
    try {
        const students = await getStudentsList(req.spreadsheetId);
        res.json({ totalStudents: students.length, totalBlocks: 6, totalSubjects: 28 });
    } catch (error) {
        res.json({ totalStudents: 0, totalBlocks: 6, totalSubjects: 28 });
    }
});

// ========== REFRESH ENDPOINT ==========
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('🔄 Refreshing data from master spreadsheet...');
        publishedScores = new Map();
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
        await loadPublishedScores(MASTER_SPREADSHEET_ID);
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
                lecturers: lecturerData.length - 1,
                published: publishedScores.size
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== PUBLISHED SCORES FUNCTIONS ==========
let publishedScores = new Map();

async function loadPublishedScores(spreadsheetId) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'PUBLISHED_SCORES!A:E',
        }).catch(() => null);
        if (response && response.data.values) {
            const data = response.data.values;
            publishedScores.clear();
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row && row[0] && row[3] === 'PUBLISHED') {
                    const key = `${row[0]}_${row[1]}_${row[2]}`;
                    publishedScores.set(key, {
                        publishedAt: row[4],
                        publishedBy: row[3]
                    });
                }
            }
            console.log(`📚 Loaded ${publishedScores.size} published scores from sheet`);
        }
    } catch (error) {
        console.log('No PUBLISHED_SCORES sheet found, creating...');
        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: 'PUBLISHED_SCORES' } } }]
                }
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'PUBLISHED_SCORES!A1:E1',
                valueInputOption: 'RAW',
                requestBody: {
                    values: [['EXAM_TYPE', 'EXAM_ID', 'STUDENT_ID', 'STATUS', 'PUBLISHED_AT']]
                }
            });
        } catch (e) { console.log('Sheet creation error:', e.message); }
    }
}

async function savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, status, publishedBy) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'PUBLISHED_SCORES!A:E',
        });
        const data = response.data.values || [];
        let foundRow = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === examType && data[i][1] === examId && data[i][2] === studentId) {
                foundRow = i + 1;
                break;
            }
        }
        const now = new Date().toISOString();
        if (foundRow !== -1) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `PUBLISHED_SCORES!D${foundRow}:E${foundRow}`,
                valueInputOption: 'RAW',
                requestBody: { values: [[status, now]] }
            });
        } else {
            const nextRow = data.length + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `PUBLISHED_SCORES!A${nextRow}:E${nextRow}`,
                valueInputOption: 'RAW',
                requestBody: { values: [[examType, examId, studentId, status, now]] }
            });
        }
    } catch (error) {
        console.error('Error saving published score:', error);
    }
}

app.get('/api/score-published/:examType/:examId/:studentId', async (req, res) => {
    try {
        const { examType, examId, studentId } = req.params;
        const key = `${examType}_${examId}_${studentId}`;
        const isPublished = publishedScores.has(key);
        res.json({ success: true, isPublished, publishedAt: isPublished ? publishedScores.get(key).publishedAt : null });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/publish-logs', (req, res) => {
    const publishLogs = markEntryLogs.filter(log => 
        log.action === 'publish' || log.action === 'unpublish' || 
        log.action === 'bulk_publish' || log.action === 'bulk_unpublish'
    );
    res.json(publishLogs.slice(0, 100));
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

// ===== INIT =====
async function initPublishedScores() {
    await loadPublishedScores(MASTER_SPREADSHEET_ID);
}
initPublishedScores();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
