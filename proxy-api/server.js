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

async function findColumnIndex(headers, keywords) {
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

// ============================================================
// ===== COLUMN MANAGEMENT ENDPOINTS (NEW!) =====
// ============================================================

// Get current columns for a subject
app.get('/api/columns/:block/:subject', async (req, res) => {
    try {
        const { block, subject } = req.params;
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        
        const data = response.data.values || [];
        if (data.length === 0) {
            return res.json({ columns: [], success: true });
        }
        
        const headers = data[0] || [];
        
        const columns = headers.map((header, index) => {
            const headerUpper = header ? header.toString().trim().toUpperCase() : '';
            let type = 'score';
            
            if (headerUpper === 'ADMISSION') type = 'admission';
            else if (headerUpper === 'NAME') type = 'name';
            else if (headerUpper === 'CAT1') type = 'cat1';
            else if (headerUpper === 'CAT2') type = 'cat2';
            else if (headerUpper === 'EXAM') type = 'exam';
            else if (headerUpper === 'FINAL') type = 'final';
            else if (headerUpper === 'GRADE') type = 'grade';
            else if (headerUpper === 'GRADED BY') type = 'gradedBy';
            else if (headerUpper === 'ASSESSMENT_TYPE') type = 'assessmentType';
            else if (headerUpper === 'UNIT_CODE') type = 'unitCode';
            else if (headerUpper === 'YEAR') type = 'year';
            
            return {
                id: `col_${index}`,
                index: index,
                name: header || `Column ${index + 1}`,
                type: type,
                isRequired: ['admission', 'name', 'year'].includes(type),
                isScore: type === 'score' || ['cat1', 'cat2', 'exam'].includes(type)
            };
        });
        
        res.json({ columns, success: true });
    } catch (error) {
        console.error('Error getting columns:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a column from the sheet
app.post('/api/columns/delete', async (req, res) => {
    try {
        const { block, subject, columnIndex, columnName, lecturerName } = req.body;
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        
        console.log(`🗑️ Deleting column ${columnIndex} (${columnName}) from ${block} - ${subject}`);
        
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        
        const data = response.data.values || [];
        if (data.length === 0) {
            return res.json({ success: false, message: 'No data found in sheet' });
        }
        
        // Remove the column from all rows
        const newData = data.map(row => {
            if (Array.isArray(row)) {
                row.splice(columnIndex, 1);
                return row;
            }
            return row;
        });
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'RAW',
            requestBody: { values: newData }
        });
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: lecturerName || 'System',
            action: 'delete_column',
            target: subject,
            block: block,
            details: `Deleted column "${columnName}" at position ${columnIndex + 1}`
        });
        if (markEntryLogs.length > 500) markEntryLogs = markEntryLogs.slice(0, 500);
        
        res.json({ 
            success: true, 
            message: `Column "${columnName}" deleted successfully`,
            newColumnCount: newData[0] ? newData[0].length : 0
        });
    } catch (error) {
        console.error('Error deleting column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add a new column to the sheet
app.post('/api/columns/add', async (req, res) => {
    try {
        const { block, subject, columnName, columnType, position, lecturerName } = req.body;
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        
        console.log(`➕ Adding column "${columnName}" (${columnType}) to ${block} - ${subject}`);
        
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        
        const data = response.data.values || [];
        if (data.length === 0) {
            return res.json({ success: false, message: 'No data found in sheet' });
        }
        
        const insertIndex = position !== undefined ? position : data[0].length;
        const newData = data.map(row => {
            const newRow = Array.isArray(row) ? [...row] : [];
            newRow.splice(insertIndex, 0, '');
            return newRow;
        });
        
        if (newData.length > 0 && Array.isArray(newData[0])) {
            newData[0][insertIndex] = columnName || `Column ${insertIndex + 1}`;
        }
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'RAW',
            requestBody: { values: newData }
        });
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: lecturerName || 'System',
            action: 'add_column',
            target: subject,
            block: block,
            details: `Added column "${columnName}" at position ${insertIndex + 1}`
        });
        if (markEntryLogs.length > 500) markEntryLogs = markEntryLogs.slice(0, 500);
        
        res.json({ 
            success: true, 
            message: `Column "${columnName}" added successfully`,
            newColumnCount: newData[0] ? newData[0].length : 0
        });
    } catch (error) {
        console.error('Error adding column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rename a column
app.post('/api/columns/rename', async (req, res) => {
    try {
        const { block, subject, columnIndex, newName, lecturerName } = req.body;
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        
        console.log(`✏️ Renaming column ${columnIndex} to "${newName}" in ${block} - ${subject}`);
        
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1:Z1`,
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        
        const data = response.data.values || [];
        if (data.length === 0 || !data[0]) {
            return res.json({ success: false, message: 'No data found' });
        }
        
        data[0][columnIndex] = newName;
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A1:Z1`,
            valueInputOption: 'RAW',
            requestBody: { values: [data[0]] }
        });
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: lecturerName || 'System',
            action: 'rename_column',
            target: subject,
            block: block,
            details: `Renamed column ${columnIndex + 1} to "${newName}"`
        });
        
        res.json({ success: true, message: `Column renamed to "${newName}"` });
    } catch (error) {
        console.error('Error renaming column:', error);
        res.status(500).json({ success: false, error: error.message });
    }
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

// ========== GET MARKS ENDPOINT - WITH DYNAMIC COLUMNS ==========
app.get('/api/marks/:block/:subject', async (req, res) => {
    try {
        const { block, subject } = req.params;
        const examType = req.headers['x-exam-type'] || 'internal';
        const year = req.headers['x-year'] || '2024';
        
        console.log(`[GET MARKS] ExamType: ${examType}, Year: ${year}, block=${block}, subject=${subject}`);
        
        if (examType === 'nck') {
            // ===== NCK MARKS (unchanged) =====
            let sheetName = '';
            if (subject === 'NCK_XY_FORMS' || subject.includes('XY')) {
                sheetName = 'NCK_XY_FORMS';
            } else if (subject === 'NCK_ASSESSMENT_AND_CASE' || subject.includes('ASSESSMENT')) {
                sheetName = 'NCK_ASSESSMENT_AND_CASE';
            } else {
                sheetName = 'NCK_XY_FORMS';
            }
            
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: req.spreadsheetId,
                    range: `${sheetName}!A:Z`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                
                const data = response.data.values || [];
                if (data.length === 0) {
                    return res.json([]);
                }
                
                const headers = data[0] || [];
                const admIdx = findColumnIndex(headers, ['ADMISSION']);
                const nameIdx = findColumnIndex(headers, ['NAME']);
                const gradedIdx = findColumnIndex(headers, ['GRADED BY']);
                const avgIdx = findColumnIndex(headers, ['AVERAGE']);
                const statusIdx = findColumnIndex(headers, ['STATUS']);
                const yearIdx = findColumnIndex(headers, ['YEAR']);
                
                const scoreIndices = [];
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i] ? headers[i].toString().trim().toUpperCase() : '';
                    if (i !== admIdx && i !== nameIdx && i !== yearIdx && i !== gradedIdx && i !== avgIdx && i !== statusIdx) {
                        scoreIndices.push(i);
                    }
                }
                
                const allMarks = [];
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;
                    
                    let studentYear = '';
                    if (yearIdx !== -1 && row[yearIdx]) {
                        studentYear = String(row[yearIdx]).trim();
                    }
                    if (!studentYear) studentYear = '2024';
                    
                    if (studentYear !== year) continue;
                    
                    const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].toString().trim() : 'Unknown';
                    let admission = admIdx !== -1 && row[admIdx] ? row[admIdx].toString().trim() : name.replace(/\s/g, '_').toUpperCase();
                    
                    const scores = [];
                    for (const idx of scoreIndices) {
                        const val = row[idx] ? parseFloat(row[idx]) || 0 : 0;
                        scores.push(val);
                    }
                    
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
                
                return res.json(allMarks);
            } catch (error) {
                console.error('❌ NCK error:', error);
                return res.json([]);
            }
        }
        
        // ===== INTERNAL MARKS - DYNAMIC COLUMNS =====
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: req.spreadsheetId,
            range: `${sheetName}!A:Z`,
            valueRenderOption: 'UNFORMATTED_VALUE'
        });
        
        const data = response.data.values || [];
        if (data.length === 0) {
            return res.json([]);
        }
        
        const headers = data[0] || [];
        
        // ===== DYNAMIC COLUMN DETECTION =====
        const colMap = {};
        const allColumnNames = [];
       headers.forEach((header, index) => {
    const headerUpper = header ? header.toString().trim().toUpperCase() : '';
    console.log(`[HEADER] ${index}: "${header}" → "${headerUpper}"`);  // ← DEBUG
    
    if (headerUpper === 'ADMISSION') colMap.admission = index;
    else if (headerUpper === 'NAME') colMap.name = index;
    else if (headerUpper === 'CAT1') colMap.cat1 = index;
    else if (headerUpper === 'CAT2') colMap.cat2 = index;
    else if (headerUpper === 'EXAM') colMap.exam = index;
    else if (headerUpper === 'FINAL') colMap.final = index;
    else if (headerUpper === 'GRADE') colMap.grade = index;
    else if (headerUpper === 'GRADED BY') colMap.gradedBy = index;
    else if (headerUpper === 'ASSESSMENT_TYPE') colMap.assessmentType = index;
    else if (headerUpper === 'UNIT_CODE') colMap.unitCode = index;
    else if (headerUpper === 'YEAR' || headerUpper === 'YEAR' || headerUpper === 'YEAR') colMap.year = index;
    else if (headerUpper === 'STATUS') colMap.status = index;
    else if (headerUpper === 'AVERAGE') colMap.average = index;
});

console.log('📋 colMap:', colMap);  // ← DEBUG
console.log('📋 colMap.year:', colMap.year);  // ← DEBUG
        // Get student data
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
        
        const allMarks = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            let admission = '';
            if (colMap.admission !== undefined && row[colMap.admission]) {
                admission = row[colMap.admission].toString().trim();
            } else if (row[0]) {
                admission = row[0].toString().trim();
            }
            
            if (!admission) continue;
            
            const studentBlock = studentBlockMap[admission] || '';
            if (studentBlock && studentBlock !== block) continue;
            
            let studentYear = '';
            if (colMap.year !== undefined && row[colMap.year]) {
                studentYear = row[colMap.year].toString().trim();
            }
            if (!studentYear) {
                studentYear = studentYearMap[admission] || '2024';
            }
            
            if (studentYear !== year) continue;
            
            const mark = {
                row: i + 1,
                admission: admission,
                name: studentNameMap[admission] || 
                      (colMap.name !== undefined && row[colMap.name] ? row[colMap.name].toString().trim() : `Student ${i}`),
                year: studentYear
            };
            
            // Add standard columns if they exist
            if (colMap.cat1 !== undefined) mark.cat1 = parseFloat(row[colMap.cat1]) || 0;
            if (colMap.cat2 !== undefined) mark.cat2 = parseFloat(row[colMap.cat2]) || 0;
            if (colMap.exam !== undefined) mark.exam = parseFloat(row[colMap.exam]) || 0;
            if (colMap.final !== undefined) mark.final = row[colMap.final] ? row[colMap.final].toString().trim() : '';
            if (colMap.grade !== undefined) mark.grade = row[colMap.grade] ? row[colMap.grade].toString().trim() : '';
            if (colMap.gradedBy !== undefined) mark.gradedBy = row[colMap.gradedBy] ? row[colMap.gradedBy].toString().trim() : '';
            if (colMap.assessmentType !== undefined) mark.assessmentType = row[colMap.assessmentType] ? row[colMap.assessmentType].toString().trim() : 'full';
            if (colMap.unitCode !== undefined) mark.unitCode = row[colMap.unitCode] ? row[colMap.unitCode].toString().trim() : '';
            if (colMap.status !== undefined) mark.status = row[colMap.status] ? row[colMap.status].toString().trim() : '';
            if (colMap.average !== undefined) mark.average = parseFloat(row[colMap.average]) || 0;
            
            // Store ALL columns for frontend
            mark.dynamicFields = {};
            headers.forEach((header, idx) => {
                const headerUpper = header ? header.toString().trim().toUpperCase() : '';
                if (!['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE', 'UNIT_CODE', 'YEAR', 'STATUS', 'AVERAGE'].includes(headerUpper)) {
                    if (row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
                        mark.dynamicFields[header] = row[idx];
                    }
                }
            });
            
            allMarks.push(mark);
        }
        
        console.log(`[GET INTERNAL] Found ${allMarks.length} marks for ${year}`);
        res.json(allMarks);
        
    } catch (error) {
        console.error('Error in /api/marks:', error);
        res.json([]);
    }
});

// ========== CREATE MARKSHEET WITH STUDENTS ==========
async function createMarksheetWithStudents(spreadsheetId, block, subject, assessmentType, unitCode = '', year = '2024') {
    try {
        console.log(`📝 Creating marksheet for ${block} - ${subject} (${year})`);
        console.log(`📋 Unit Code: ${unitCode || 'None'}`);
        
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
        
        // Include UNIT CODE and all standard columns
        const rows = [['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE', 'UNIT_CODE', 'YEAR']];
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
                    unitCode || '',
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
            try {
                const headerResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: spreadsheetId,
                    range: `${sheetName}!A1:K1`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                const headerData = headerResponse.data.values || [];
                if (headerData.length === 0 || headerData[0].length < 11) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: spreadsheetId,
                        range: `${sheetName}!A1:K1`,
                        valueInputOption: 'RAW',
                        requestBody: {
                            values: [['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE', 'UNIT_CODE', 'YEAR']]
                        }
                    });
                }
            } catch (e) {
                console.log('⚠️ Could not check headers, proceeding...');
            }
            
            const currentResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A:K`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            const currentData = currentResponse.data.values || [];
            const lastRow = currentData.length;
            if (rows.length > 1) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `${sheetName}!A${lastRow + 1}:K${lastRow + rows.length - 1}`,
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
            range: `${sheetName}!A1:K${rows.length}`,
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

// ========== SAVE MARKS ENDPOINT - WITH DYNAMIC COLUMNS ==========
app.post('/api/marks', async (req, res) => {
    try {
        console.log('🔍 ===== SAVE REQUEST STARTED =====');
        
        const { block, subject, marksData, lecturerName, dynamicFields } = req.body;
        const examType = req.headers['x-exam-type'] || 'internal';
        const spreadsheetId = req.spreadsheetId || MASTER_SPREADSHEET_ID;
        const year = req.headers['x-year'] || '2024';
        const userRole = req.headers['x-user-role'] || req.body.userRole || 'lecturer';
        
        console.log(`📋 Subject: ${subject}, Block: ${block}, Year: ${year}`);
        console.log(`📋 Records: ${marksData?.length || 0}`);
        
        const isAdmin = (userRole === 'admin' || lecturerName === 'Administrator');
        
        if (!isAdmin) {
            if (markEntrySettings.global && markEntrySettings.global.enabled === false) {
                return res.status(403).json({ success: false, message: '❌ Mark entry is globally closed.' });
            }
            const classKey = `${year}_all`;
            if (markEntrySettings[classKey] && markEntrySettings[classKey].enabled === false) {
                return res.status(403).json({ success: false, message: `❌ Mark entry is closed for March ${year} class.` });
            }
            if (examType === 'internal') {
                const subjectKey = `${block}_${subject}`;
                if (markEntrySettings[subjectKey] && markEntrySettings[subjectKey].enabled === false) {
                    return res.status(403).json({ success: false, message: `❌ Mark entry is closed for ${subject}.` });
                }
            }
        }
        
        if (examType === 'nck') {
            // ===== NCK SAVE (unchanged) =====
            let sheetName = '';
            if (subject === 'NCK_XY_FORMS' || subject.includes('XY')) {
                sheetName = 'NCK_XY_FORMS';
            } else if (subject === 'NCK_ASSESSMENT_AND_CASE' || subject.includes('ASSESSMENT')) {
                sheetName = 'NCK_ASSESSMENT_AND_CASE';
            } else {
                sheetName = 'NCK_XY_FORMS';
            }
            
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: req.spreadsheetId,
                    range: `${sheetName}!A:Z`,
                    valueRenderOption: 'UNFORMATTED_VALUE'
                });
                
                const data = response.data.values || [];
                const headers = data[0] || [];
                
                const admIdx = findColumnIndex(headers, ['ADMISSION']);
                const nameIdx = findColumnIndex(headers, ['NAME']);
                const yearIdx = findColumnIndex(headers, ['YEAR']);
                const gradedIdx = findColumnIndex(headers, ['GRADED BY']);
                const avgIdx = findColumnIndex(headers, ['AVERAGE']);
                const statusIdx = findColumnIndex(headers, ['STATUS']);
                
                const scoreIndices = [];
                for (let i = 0; i < headers.length; i++) {
                    const header = headers[i] ? headers[i].toString().trim().toUpperCase() : '';
                    if (i !== admIdx && i !== nameIdx && i !== yearIdx && i !== gradedIdx && i !== avgIdx && i !== statusIdx) {
                        scoreIndices.push(i);
                    }
                }
                
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
                        const rowNum = existingMap.get(admission).rowNum;
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: req.spreadsheetId,
                            range: `${sheetName}!A${rowNum}:Z${rowNum}`,
                            valueInputOption: 'RAW',
                            requestBody: { values: [rowData] }
                        });
                        updatedCount++;
                    } else {
                        await sheets.spreadsheets.values.append({
                            spreadsheetId: req.spreadsheetId,
                            range: `${sheetName}!A:Z`,
                            valueInputOption: 'RAW',
                            requestBody: { values: [rowData] }
                        });
                        insertedCount++;
                    }
                }
                
                return res.json({ success: true, message: `NCK marks saved: ${updatedCount} updated, ${insertedCount} inserted`, updated: updatedCount, inserted: insertedCount });
            } catch (error) {
                console.error('❌ NCK save error:', error);
                return res.status(500).json({ success: false, error: error.message });
            }
        }
        
        // ===== INTERNAL MARKS SAVE - DYNAMIC COLUMNS =====
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        console.log(`📋 Sheet Name: ${sheetName}`);
        
        let currentData = [];
        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:Z`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });
            currentData = response.data.values || [];
            console.log(`📋 Sheet has ${currentData.length} rows`);
        } catch (error) {
            console.log(`⚠️ Sheet ${sheetName} does not exist, creating...`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                requestBody: {
                    requests: [{ addSheet: { properties: { title: sheetName } } }]
                }
            });
            const headers = ['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE', 'UNIT_CODE', 'YEAR'];
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1:K1`,
                valueInputOption: 'RAW',
                requestBody: { values: [headers] }
            });
            currentData = [headers];
        }
        
        const headers = currentData[0] || [];
        
        // ===== DYNAMIC COLUMN MAP =====
        const colMap = {};
       headers.forEach((header, index) => {
    const headerUpper = header ? header.toString().trim().toUpperCase() : '';
    console.log(`[HEADER] ${index}: "${header}" → "${headerUpper}"`);  // ← DEBUG
    
    if (headerUpper === 'ADMISSION') colMap.admission = index;
    else if (headerUpper === 'NAME') colMap.name = index;
    else if (headerUpper === 'CAT1') colMap.cat1 = index;
    else if (headerUpper === 'CAT2') colMap.cat2 = index;
    else if (headerUpper === 'EXAM') colMap.exam = index;
    else if (headerUpper === 'FINAL') colMap.final = index;
    else if (headerUpper === 'GRADE') colMap.grade = index;
    else if (headerUpper === 'GRADED BY') colMap.gradedBy = index;
    else if (headerUpper === 'ASSESSMENT_TYPE') colMap.assessmentType = index;
    else if (headerUpper === 'UNIT_CODE') colMap.unitCode = index;
    else if (headerUpper === 'YEAR' || headerUpper === 'YEAR' || headerUpper === 'YEAR') colMap.year = index;
    else if (headerUpper === 'STATUS') colMap.status = index;
    else if (headerUpper === 'AVERAGE') colMap.average = index;
});

console.log('📋 colMap:', colMap);  // ← DEBUG
console.log('📋 colMap.year:', colMap.year);  // ← DEBUG
        
        // Build existing data map
        const existingDataMap = new Map();
        let maxRow = 1;
        
        for (let i = 1; i < currentData.length; i++) {
            const row = currentData[i];
            if (row && row[colMap.admission] !== undefined && row[colMap.admission] !== '') {
                const admission = row[colMap.admission] ? row[colMap.admission].toString().trim() : '';
                if (!admission) continue;
                
                const existing = {
                    rowNum: i + 1,
                    name: colMap.name !== undefined && row[colMap.name] ? row[colMap.name].toString().trim() : '',
                    cat1: colMap.cat1 !== undefined ? parseFloat(row[colMap.cat1]) || 0 : 0,
                    cat2: colMap.cat2 !== undefined ? parseFloat(row[colMap.cat2]) || 0 : 0,
                    exam: colMap.exam !== undefined ? parseFloat(row[colMap.exam]) || 0 : 0,
                    final: colMap.final !== undefined && row[colMap.final] ? row[colMap.final].toString().trim() : '',
                    grade: colMap.grade !== undefined && row[colMap.grade] ? row[colMap.grade].toString().trim() : '',
                    gradedBy: colMap.gradedBy !== undefined && row[colMap.gradedBy] ? row[colMap.gradedBy].toString().trim() : '',
                    assessmentType: colMap.assessmentType !== undefined && row[colMap.assessmentType] ? row[colMap.assessmentType].toString().trim() : 'full',
                    year: colMap.year !== undefined && row[colMap.year] ? row[colMap.year].toString().trim() : '2024'
                };
                
                existingDataMap.set(admission, existing);
                if (i + 1 > maxRow) maxRow = i + 1;
            }
        }
        
        console.log(`📋 Found ${existingDataMap.size} existing students in sheet`);
        
        const rowsToUpdate = [];
        const rowsToInsert = [];
        let skippedCount = 0;
        
        for (const mark of marksData) {
            const admission = mark.admission ? mark.admission.toString().trim() : '';
            if (!admission) {
                skippedCount++;
                continue;
            }
            
            let cat1 = parseFloat(mark.cat1) || 0;
            let cat2 = parseFloat(mark.cat2) || 0;
            let exam = parseFloat(mark.exam) || 0;
            let name = mark.name || '';
            
            if (existingDataMap.has(admission)) {
                const existing = existingDataMap.get(admission);
                if (!name) name = existing.name;
                
                const cat1Changed = Math.abs(existing.cat1 - cat1) > 0.01;
                const cat2Changed = Math.abs(existing.cat2 - cat2) > 0.01;
                const examChanged = Math.abs(existing.exam - exam) > 0.01;
                
                if (cat1Changed || cat2Changed || examChanged || name !== existing.name) {
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
                } else {
                    skippedCount++;
                }
            } else {
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
                    assessmentType,
                    year: year
                });
            }
        }
        
        console.log(`📋 Summary: Updates=${rowsToUpdate.length}, Inserts=${rowsToInsert.length}, Skipped=${skippedCount}`);
        
        // Update existing rows
        for (const mark of rowsToUpdate) {
            const updateValues = [];
            
            // Build row values based on actual column positions
            const rowData = [];
            headers.forEach((header, idx) => {
                const headerUpper = header ? header.toString().trim().toUpperCase() : '';
                if (headerUpper === 'ADMISSION') rowData.push(mark.admission);
                else if (headerUpper === 'NAME') rowData.push(mark.name);
                else if (headerUpper === 'CAT1') rowData.push(mark.cat1);
                else if (headerUpper === 'CAT2') rowData.push(mark.cat2);
                else if (headerUpper === 'EXAM') rowData.push(mark.exam);
                else if (headerUpper === 'FINAL') rowData.push(mark.finalScore);
                else if (headerUpper === 'GRADE') rowData.push(mark.grade);
                else if (headerUpper === 'GRADED BY') rowData.push(mark.gradedBy);
                else if (headerUpper === 'ASSESSMENT_TYPE') rowData.push(mark.assessmentType);
                else {
                    // Keep existing value for other columns
                    const existingRow = currentData[mark.rowNum - 1] || [];
                    rowData.push(existingRow[idx] || '');
                }
            });
            
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${mark.rowNum}:Z${mark.rowNum}`,
                valueInputOption: 'RAW',
                requestBody: { values: [rowData] }
            });
        }
        
        // Insert new rows
        if (rowsToInsert.length > 0) {
            const valuesToInsert = rowsToInsert.map(mark => {
                const rowData = [];
                headers.forEach((header) => {
                    const headerUpper = header ? header.toString().trim().toUpperCase() : '';
                    if (headerUpper === 'ADMISSION') rowData.push(mark.admission);
                    else if (headerUpper === 'NAME') rowData.push(mark.name);
                    else if (headerUpper === 'CAT1') rowData.push(mark.cat1);
                    else if (headerUpper === 'CAT2') rowData.push(mark.cat2);
                    else if (headerUpper === 'EXAM') rowData.push(mark.exam);
                    else if (headerUpper === 'FINAL') rowData.push(mark.finalScore);
                    else if (headerUpper === 'GRADE') rowData.push(mark.grade);
                    else if (headerUpper === 'GRADED BY') rowData.push(mark.gradedBy);
                    else if (headerUpper === 'ASSESSMENT_TYPE') rowData.push(mark.assessmentType);
                    else if (headerUpper === 'YEAR') rowData.push(mark.year);
                    else rowData.push('');
                });
                return rowData;
            });
            
            const startRow = maxRow + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${startRow}:Z${startRow + valuesToInsert.length - 1}`,
                valueInputOption: 'RAW',
                requestBody: { values: valuesToInsert }
            });
        }
        
        console.log(`✅ SAVE COMPLETE: Updated ${rowsToUpdate.length}, Inserted ${rowsToInsert.length}, Skipped ${skippedCount}`);
        
        res.json({
            success: true,
            message: `Saved ${rowsToUpdate.length} updated + ${rowsToInsert.length} new marks`,
            updated: rowsToUpdate.length,
            inserted: rowsToInsert.length,
            skipped: skippedCount
        });
        
    } catch (error) {
        console.error('❌ Error saving marks:', error);
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
                    await createMarksheetWithStudents(spreadsheetId, block, name, assessmentType, unitCode, year);
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
        
        await createMarksheetWithStudents(spreadsheetId, block, name, assessmentType, finalUnitCode, year);
        
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

// ========== LECTURER ENDPOINTS ==========
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
// ===== GLOBAL COLUMN SETTINGS =====
// Store in memory (will reset on server restart)
// For production, store in Google Sheets or a database
let globalColumnSettings = {};

// ===== GET GLOBAL COLUMN SETTINGS =====
app.get('/api/columns/settings/:block/:subject/:year', (req, res) => {
    try {
        const { block, subject, year } = req.params;
        const key = `${year}_${block}_${subject}`;
        
        console.log(`📋 Getting column settings for: ${key}`);
        
        // Check if settings exist
        if (globalColumnSettings[key]) {
            return res.json({ 
                success: true, 
                columns: globalColumnSettings[key],
                source: 'server'
            });
        }
        
        // If not found, return default settings
        const defaultColumns = [
            { id: 'sno', label: '#', visible: true, required: true },
            { id: 'admission', label: 'Admission', visible: true, required: true },
            { id: 'name', label: 'Name', visible: true, required: true },
            { id: 'cat1', label: 'CAT1 (0-30)', visible: true, required: false },
            { id: 'cat2', label: 'CAT2 (0-30)', visible: true, required: false },
            { id: 'exam', label: 'Exam', visible: true, required: false },
            { id: 'total', label: 'Total', visible: true, required: false },
            { id: 'grade', label: 'Grade', visible: true, required: false },
            { id: 'points', label: 'Points', visible: true, required: false },
            { id: 'rating', label: 'Rating', visible: true, required: false },
            { id: 'gradedBy', label: 'Graded By', visible: false, required: false }
        ];
        
        res.json({ 
            success: true, 
            columns: defaultColumns,
            source: 'default'
        });
    } catch (error) {
        console.error('Error getting column settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== SAVE GLOBAL COLUMN SETTINGS =====
app.post('/api/columns/settings', (req, res) => {
    try {
        const { block, subject, year, columns, lecturerName } = req.body;
        const key = `${year}_${block}_${subject}`;
        
        console.log(`💾 Saving global column settings for: ${key}`);
        console.log(`📋 Columns:`, columns.map(c => `${c.id}: ${c.visible ? '✓' : '✗'}`).join(', '));
        
        // Store in memory
        globalColumnSettings[key] = columns;
        
        // Log the change
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: lecturerName || 'System',
            action: 'update_columns',
            target: subject,
            block: block,
            details: `Updated column visibility settings`
        });
        if (markEntryLogs.length > 500) markEntryLogs = markEntryLogs.slice(0, 500);
        
        res.json({ 
            success: true, 
            message: 'Column settings saved globally',
            key: key,
            columnCount: columns.length
        });
    } catch (error) {
        console.error('Error saving column settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== RESET GLOBAL COLUMN SETTINGS =====
app.post('/api/columns/reset', (req, res) => {
    try {
        const { block, subject, year } = req.body;
        const key = `${year}_${block}_${subject}`;
        
        console.log(`🔄 Resetting column settings for: ${key}`);
        
        delete globalColumnSettings[key];
        
        res.json({ 
            success: true, 
            message: 'Column settings reset to default'
        });
    } catch (error) {
        console.error('Error resetting column settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET ALL GLOBAL COLUMN SETTINGS (Admin) =====
app.get('/api/columns/settings/all', (req, res) => {
    try {
        const settings = {};
        for (const [key, value] of Object.entries(globalColumnSettings)) {
            settings[key] = value;
        }
        res.json({ 
            success: true, 
            settings: settings,
            count: Object.keys(settings).length
        });
    } catch (error) {
        console.error('Error getting all column settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
