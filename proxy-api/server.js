const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());
// ===== FORCE NO-CACHE FOR ALL RESPONSES =====
app.use((req, res, next) => {
    // Disable caching for all API responses
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// ===== ✅ MASTER SPREADSHEET CONFIGURATION =====
// ALL data is now in ONE master spreadsheet
const MASTER_SPREADSHEET_ID = '1btqWNKQ1HNMOvhDKDScQAFu2NijB8sbs04eH64z6pE4';

// Keep old IDs for reference/backup only (DO NOT use for data operations)
const OLD_SPREADSHEETS_BACKUP = {
  '2024': {
    internal: '1tQDMPoU7KWz3OIKssoJZfnX7kM5_WDbZKcpyLjtxNS0',
    nck: '1F-DsXPgZYSyqH9F3kGDP9Z4_AtTV_ZAOd6KXbYdchMo'
  },
  '2025': {
    internal: '1qX2vVuUaIut0_-Z1pvxtbJDC8u4zTyeqs6Xywk56bOM',
    nck: '1KYZPg7GhqDZ70CTw7albG9PZ72FnM4RJr14XPeIy-OU'
  },
  '2026': {
    internal: '1W7g_qwVS1r0sBpcGqTKFXr-mY4Hetw1a7-nMnkxVoGA',
    nck: '1F3R92jREt7tYFvYo0YtiQeh7HZldY_47YkwvlBiD44E'
  }
};

// ===== MARK ENTRY SETTINGS =====
let markEntrySettings = {
  global: { enabled: true, closedBy: null, closedAt: null }
};

// ===== MARK ENTRY LOGS =====
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

// ===== ✅ MIDDLEWARE - ALWAYS USE MASTER SPREADSHEET =====
app.use((req, res, next) => {
  // Always use the master spreadsheet for ALL operations
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
    range: 'STUDENTS!A:E',  // ✅ Updated to include YEAR column
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
  // ✅ All years are now in one master spreadsheet
  res.json(['2024', '2025', '2026']);
});

app.get('/api/blocks', (req, res) => {
  res.json(['BLOCK_0', 'BLOCK_1', 'BLOCK_2', 'BLOCK_3', 'BLOCK_4', 'BLOCK_5']);
});

// ========== MARK ENTRY CONTROL ENDPOINTS ==========
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
        range: 'CONFIG!A:D',
        valueRenderOption: 'UNFORMATTED_VALUE'  // ✅ ADD THIS
      });
      const config = response.data.values || [];
      const subjects = [];
      for (let i = 1; i < config.length; i++) {
        if (config[i] && config[i][0] === block && config[i][2] === 'YES') {
          subjects.push({
            name: config[i][1],
            assessmentType: config[i][3] || 'full'
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
// ========== GET MARKS ENDPOINT - WITH NCK YEAR FILTERING ==========
app.get('/api/marks/:block/:subject', async (req, res) => {
  try {
    const { block, subject } = req.params;
    const examType = req.headers['x-exam-type'] || 'internal';
    const year = req.headers['x-year'] || '2024';
    
    console.log(`[GET MARKS] ExamType: ${examType}, Year: ${year}, block=${block}, subject=${subject}`);
    
    // ===== NCK MARKS WITH YEAR FILTERING =====
    if (examType === 'nck') {
      const sheetName = subject;
      
      console.log(`[GET NCK] Reading sheet: ${sheetName} for year: ${year}`);
      
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: req.spreadsheetId,
          range: `${sheetName}!A:AB`,
          valueRenderOption: 'UNFORMATTED_VALUE'  // ✅ ADD THIS TO FORCE FRESH
        });
        
        const data = response.data.values || [];
        console.log(`[GET NCK] Raw data rows: ${data.length}`);
        
        if (data.length === 0) {
          console.log(`[GET NCK] No data found in sheet ${sheetName}`);
          res.json([]);
          return;
        }
        
        const headers = data[0] || [];
        console.log(`[GET NCK] Headers:`, headers);
        
        // ✅ FIND THE YEAR COLUMN BY HEADER NAME
        let yearColIndex = -1;
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i] ? headers[i].toString().trim().toUpperCase() : '';
          if (header === 'YEAR') {
            yearColIndex = i;
            break;
          }
        }
        
        // If YEAR not found, check the last column
        if (yearColIndex === -1) {
          const lastCol = headers.length - 1;
          const lastHeader = headers[lastCol] ? headers[lastCol].toString().trim() : '';
          if (lastHeader === 'YEAR' || lastHeader === '2024' || lastHeader === '2025' || lastHeader === '2026') {
            yearColIndex = lastCol;
            console.log(`[GET NCK] Using last column (${yearColIndex}) as YEAR`);
          }
        }
        
        console.log(`[GET NCK] Year column index: ${yearColIndex}`);
        
        const marks = [];
        const isXYForms = sheetName === 'NCK_XY_FORMS' || sheetName === 'XY FORMS';
        const isAssessment = sheetName === 'NCK_ASSESSMENT_AND_CASE' || sheetName === 'ASSESSMENT AND CASE';
        let maxScores = isXYForms ? 22 : 12;
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1]) continue; // Skip if no name
          
          // ✅ GET YEAR FROM THE YEAR COLUMN
          let studentYear = '2024';
          if (yearColIndex !== -1 && row[yearColIndex] !== undefined && row[yearColIndex] !== '') {
            const yearVal = row[yearColIndex].toString().trim();
            if (yearVal === '2024' || yearVal === '2025' || yearVal === '2026') {
              studentYear = yearVal;
            }
          }
          
          // ✅ FILTER BY YEAR - ONLY include students from the selected year
          if (studentYear !== year) {
            console.log(`⏭️ Skipping ${row[1]} (${studentYear}) - not ${year}`);
            continue;
          }
          
          // ✅ Extract scores (start at column 2, skip ADMISSION and NAME)
          const scores = [];
          for (let j = 2; j < row.length && scores.length < maxScores; j++) {
            // Skip the YEAR column
            if (j === yearColIndex) continue;
            const val = row[j];
            if (val === '2024' || val === '2025' || val === '2026' || val === 'YEAR') {
              continue;
            }
            const numVal = parseFloat(val);
            scores.push(isNaN(numVal) ? 0 : numVal);
          }
          while (scores.length < maxScores) scores.push(0);
          
          // Calculate average
          const validScores = scores.filter(s => s > 0);
          const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
          
          // Get graded by from the last column (skip YEAR)
          let gradedBy = '';
          for (let j = row.length - 1; j >= 0; j--) {
            if (j === yearColIndex) continue;
            if (row[j] && row[j] !== 'YEAR' && row[j] !== '2024' && row[j] !== '2025' && row[j] !== '2026') {
              gradedBy = row[j];
              break;
            }
          }
          
          marks.push({
            row: i + 1,
            admission: row[0] || '',
            name: row[1] || '',
            scores: scores,
            total: scores.reduce((a, b) => a + b, 0),
            final: Math.round(avg * 100) / 100,
            gradedBy: gradedBy || '',
            year: studentYear
          });
        }
        
        console.log(`[GET NCK] Found ${marks.length} records for year ${year} from ${sheetName}`);
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
        valueRenderOption: 'UNFORMATTED_VALUE'  // ✅ ADD THIS TO FORCE FRESH
      });
      
      const data = response.data.values || [];
      const allMarks = [];
      
      // Get student-year mapping from STUDENTS sheet
      const studentsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: req.spreadsheetId,
        range: 'STUDENTS!A:E',
        valueRenderOption: 'UNFORMATTED_VALUE'  // ✅ ADD THIS TO FORCE FRESH
      });
      const studentsData = studentsResponse.data.values || [];
      
      // Create map: admission → year
      const studentYearMap = {};
      for (let i = 1; i < studentsData.length; i++) {
        const row = studentsData[i];
        if (row && row[0]) {
          studentYearMap[row[0].trim()] = row[3] || '2024';
        }
      }
      
      // Filter marks by year
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
// ========== SAVE MARKS ENDPOINT - FIXED WITH NCK YEAR SUPPORT ==========
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
    
    // Log first 3 records for debugging
    if (marksData && marksData.length > 0) {
      console.log('📋 First 3 records:');
      for (let i = 0; i < Math.min(3, marksData.length); i++) {
        console.log(`  [${i}] Admission: ${marksData[i].admission}, CAT1: ${marksData[i].cat1}, CAT2: ${marksData[i].cat2}, EXAM: ${marksData[i].exam}`);
      }
    }
    
    // Entry check
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
    
    // Log the save action
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
    
    // ===== SAVE LOGIC =====
    if (examType === 'nck') {
      console.log('📋 NCK save - processing...');
      
      const sheetName = subject;
      
      // ✅ Read current data from sheet (include YEAR column)
      let currentData = [];
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:AB`,
        });
        currentData = response.data.values || [];
        console.log(`[SAVE NCK] Sheet ${sheetName} exists with ${currentData.length} rows`);
      } catch (error) {
        console.log(`[SAVE NCK] Sheet ${sheetName} does not exist, creating...`);
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requestBody: {
              requests: [
                { addSheet: { properties: { title: sheetName } } }
              ]
            }
          });
          
          // ✅ Headers with YEAR at the end
          const headers = ['ADMISSION', 'NAME', 'MED1', 'MED2', 'MED3', 'MCH1', 'MCH2', 'MCH3', 'MAT1', 'MAT2', 'MAT3', 'PEAD1', 'PEAD2', 'SURG1', 'SURG2', 'SURG3', 'OPD', 'NBU1', 'NBU2', 'THEATRE', 'PSYCHIATRY', 'RURALS', 'DISTRICT', 'SPECIAL', 'AVERAGE', 'GRADE', 'GRADED BY', 'YEAR'];
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:AB1`,
            valueInputOption: 'RAW',
            requestBody: { values: [headers] }
          });
          
          currentData = [headers];
          console.log(`[SAVE NCK] Created new sheet: ${sheetName}`);
        } catch (createError) {
          console.error('[SAVE NCK] Error creating sheet:', createError);
          return res.status(500).json({ 
            success: false, 
            error: `Could not create sheet: ${createError.message}` 
          });
        }
      }
      
      // ✅ Build map of existing student names with their row data
      const existingDataMap = new Map();
      let maxRow = 1;
      
      // Find YEAR column index
      let yearColIndex = -1;
      const headers = currentData[0] || [];
      for (let i = 0; i < headers.length; i++) {
        if (headers[i] === 'YEAR') {
          yearColIndex = i;
          break;
        }
      }
      if (yearColIndex === -1) {
        yearColIndex = headers.length - 1; // Use last column
      }
      
      console.log(`[SAVE NCK] YEAR column at index: ${yearColIndex}`);
      
      for (let i = 1; i < currentData.length; i++) {
        const row = currentData[i];
        if (row && row[1]) {
          const studentName = row[1].toString().trim();
          existingDataMap.set(studentName, {
            rowNum: i + 1,
            scores: [],
            gradedBy: row[26] || '',
            year: row[yearColIndex] || '2024'
          });
          
          // Extract scores (columns 2-23, indices 2-23)
          for (let j = 2; j <= 23 && j < row.length; j++) {
            existingDataMap.get(studentName).scores.push(parseFloat(row[j]) || 0);
          }
          while (existingDataMap.get(studentName).scores.length < 22) {
            existingDataMap.get(studentName).scores.push(0);
          }
          
          if (i + 1 > maxRow) maxRow = i + 1;
        }
      }
      
      console.log(`[SAVE NCK] Found ${existingDataMap.size} existing students`);
      
      const rowsToUpdate = [];
      const rowsToInsert = [];
      let skippedCount = 0;
      
      for (const mark of marksData) {
        const studentName = mark.name ? mark.name.toString().trim() : '';
        if (!studentName) {
          skippedCount++;
          continue;
        }
        
        const scores = mark.scores || [];
        const gradedBy = mark.gradedBy || lecturerName || '';
        const yearValue = mark.year || year || '2024';
        
        // Pad scores to 22
        while (scores.length < 22) scores.push(0);
        
        // Calculate average
        const validScores = scores.filter(s => s > 0);
        const average = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
        const grade = average >= 60 ? 'PASS' : (validScores.length > 0 ? 'FAIL' : 'PENDING');
        
        if (existingDataMap.has(studentName)) {
          const existing = existingDataMap.get(studentName);
          
          // ✅ Check if scores changed
          let changed = false;
          for (let i = 0; i < 22; i++) {
            if (existing.scores[i] !== scores[i]) {
              changed = true;
              break;
            }
          }
          
          if (changed || existing.year !== yearValue) {
            rowsToUpdate.push({
              name: studentName,
              scores: scores,
              average: average,
              grade: grade,
              gradedBy: gradedBy,
              year: yearValue,
              rowNum: existing.rowNum
            });
            console.log(`[SAVE NCK] Updating ${studentName}`);
          } else {
            skippedCount++;
            console.log(`[SAVE NCK] Skipping ${studentName}: No changes`);
          }
        } else {
          rowsToInsert.push({
            name: studentName,
            scores: scores,
            average: average,
            grade: grade,
            gradedBy: gradedBy,
            year: yearValue
          });
          console.log(`[SAVE NCK] Inserting new student: ${studentName} with year ${yearValue}`);
        }
      }
      
      // ✅ Update existing rows
      for (const mark of rowsToUpdate) {
        const rowValues = [
          '',  // ADMISSION (empty)
          mark.name,
          ...mark.scores.slice(0, 22),
          Math.round(mark.average * 100) / 100,
          mark.grade,
          mark.gradedBy,
          mark.year  // ✅ YEAR at the end
        ];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A${mark.rowNum}:AB${mark.rowNum}`,
          valueInputOption: 'RAW',
          requestBody: { values: [rowValues] }
        });
        console.log(`[SAVE NCK] Updated row ${mark.rowNum}`);
      }
      
      // ✅ Insert new rows
      if (rowsToInsert.length > 0) {
        const valuesToInsert = rowsToInsert.map(mark => [
          '',  // ADMISSION (empty)
          mark.name,
          ...mark.scores.slice(0, 22),
          Math.round(mark.average * 100) / 100,
          mark.grade,
          mark.gradedBy,
          mark.year  // ✅ YEAR at the end
        ]);
        
        const startRow = maxRow + 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A${startRow}:AB${startRow + valuesToInsert.length - 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: valuesToInsert }
        });
        console.log(`[SAVE NCK] Inserted ${valuesToInsert.length} new rows starting at ${startRow}`);
      }
      
      console.log(`[SAVE NCK] Updated ${rowsToUpdate.length}, Inserted ${rowsToInsert.length}, Skipped ${skippedCount}`);
      
      res.json({ 
        success: true, 
        message: `Saved ${rowsToUpdate.length} updated + ${rowsToInsert.length} new NCK marks`,
        updated: rowsToUpdate.length,
        inserted: rowsToInsert.length,
        skipped: skippedCount
      });
      
    } else {
      // ===== INTERNAL MARKS SAVE =====
      let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
      const sheetName = `${block}_${cleanSubject}`;
      console.log(`📋 Sheet Name: ${sheetName}`);
      
      // ✅ Get current data from sheet
      let currentData = [];
      try {
        console.log(`📡 Reading sheet: ${sheetName}`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:I`,
        });
        currentData = response.data.values || [];
        console.log(`📋 Sheet has ${currentData.length} rows (including header)`);
      } catch (error) {
        console.log(`⚠️ Sheet ${sheetName} does not exist, creating...`);
        console.log(`❌ Error: ${error.message}`);
        
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requestBody: {
              requests: [
                { addSheet: { properties: { title: sheetName } } }
              ]
            }
          });
          
          const headers = ['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE'];
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:I1`,
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
      
      // ✅ Build map of existing admissions with their current data
      const existingDataMap = new Map();
      let maxRow = 1;
      
      console.log('📋 Building existing data map...');
      for (let i = 1; i < currentData.length; i++) {
        const row = currentData[i];
        if (row && row[0]) {
          const admission = row[0].toString().trim();
          existingDataMap.set(admission, {
            rowNum: i + 1,
            name: row[1] || '',
            cat1: parseFloat(row[2]) || 0,
            cat2: parseFloat(row[3]) || 0,
            exam: parseFloat(row[4]) || 0,
            final: parseFloat(row[5]) || 0,
            grade: row[6] || '',
            gradedBy: row[7] || '',
            assessmentType: row[8] || 'full'
          });
          if (i + 1 > maxRow) maxRow = i + 1;
        }
      }
      
      console.log(`📋 Found ${existingDataMap.size} existing students in sheet`);
      
      // Log first 3 existing records for comparison
      let count = 0;
      for (const [admission, data] of existingDataMap) {
        if (count < 3) {
          console.log(`📋 Existing [${count}]: ${admission} - CAT1: ${data.cat1}, CAT2: ${data.cat2}, EXAM: ${data.exam}`);
          count++;
        } else break;
      }
      
      const rowsToUpdate = [];
      const rowsToInsert = [];
      let skippedCount = 0;
      let processedCount = 0;
      
      // ✅ Process each mark and compare with existing data
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
        
        // ✅ Check if student exists
        if (existingDataMap.has(admission)) {
          const existing = existingDataMap.get(admission);
          console.log(`📋 [${processedCount}] Found existing: ${admission}`);
          console.log(`   Existing: CAT1=${existing.cat1}, CAT2=${existing.cat2}, EXAM=${existing.exam}`);
          console.log(`   New:      CAT1=${cat1}, CAT2=${cat2}, EXAM=${exam}`);
          
          // ✅ Get name from existing if not provided
          if (!name) name = existing.name;
          
          // ✅ COMPARE VALUES - Check if anything changed
          const cat1Changed = Math.abs(existing.cat1 - cat1) > 0.01;
          const cat2Changed = Math.abs(existing.cat2 - cat2) > 0.01;
          const examChanged = Math.abs(existing.exam - exam) > 0.01;
          
          console.log(`   Changes: CAT1=${cat1Changed}, CAT2=${cat2Changed}, EXAM=${examChanged}`);
          
          if (cat1Changed || cat2Changed || examChanged) {
            console.log(`✅ [${processedCount}] Will UPDATE ${admission}`);
            
            // ✅ Calculate final score
            let finalScore = 0;
            const hasCat1 = cat1 > 0;
            const hasCat2 = cat2 > 0;
            const hasExam = exam > 0;
            
            // Determine assessment type
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
          // ✅ New student - insert
          console.log(`➕ [${processedCount}] Will INSERT new student: ${admission}`);
          
          // Calculate final score
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
      
      // ✅ Update existing rows
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
      
      // ✅ Insert new rows
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
          range: `${sheetName}!A${startRow}:I${startRow + valuesToInsert.length - 1}`,
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

// ========== STUDENT ENDPOINTS ==========
app.get('/api/students', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'STUDENTS!A:E',
      valueRenderOption: 'UNFORMATTED_VALUE'  // ✅ ADD THIS
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
    console.log(`[UPDATE LECTURER] Subjects:`, subjects);
    
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

// ========== UNIT ENDPOINTS ==========
app.get('/api/units', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
      valueRenderOption: 'UNFORMATTED_VALUE'  // ✅ ADD THIS
    });
    const data = response.data.values || [];
    const units = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] && row[1] && row[2] === 'YES') {
        if (!units[row[0]]) units[row[0]] = [];
        units[row[0]].push({ name: row[1], assessmentType: row[3] || 'full' });
      }
    }
    res.json(units);
  } catch (error) {
    console.error('Error in /api/units:', error);
    res.json({});
  }
});
app.post('/api/add-unit', async (req, res) => {
  try {
    const { block, name, assessmentType } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
    });
    const data = response.data.values || [];
    let nextRow = data.length + 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === block && data[i][1] === name) {
        if (data[i][2] === 'YES') {
          return res.json({ success: false, message: 'Unit already exists' });
        } else {
          await sheets.spreadsheets.values.update({
            spreadsheetId: req.spreadsheetId,
            range: `CONFIG!C${i+1}:D${i+1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['YES', assessmentType]] }
          });
          await createMarksheetWithStudents(req.spreadsheetId, block, name, assessmentType);
          return res.json({ success: true, message: 'Unit reactivated successfully' });
        }
      }
    }
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: req.spreadsheetId,
      range: `CONFIG!A${nextRow}:D${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[block, name, 'YES', assessmentType]] }
    });
    
    await createMarksheetWithStudents(req.spreadsheetId, block, name, assessmentType);
    
    res.json({ success: true, message: 'Unit added successfully' });
  } catch (error) {
    console.error('Error adding unit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CREATE MARKSHEET WITH STUDENTS - WITH YEAR AND BLOCK FILTERING =====
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
        // ✅ Check if student matches the block
        const studentBlock = row[2] ? row[2].toString().trim() : '';
        if (studentBlock !== block) {
          wrongBlockCount++;
          console.log(`⏭️ Skipping ${row[0]} (block: ${studentBlock}) - not ${block}`);
          continue;
        }
        
        // ✅ Check if student matches the year
        const studentYear = row[3] ? row[3].toString().trim() : '2024';
        if (studentYear !== year) {
          wrongYearCount++;
          console.log(`⏭️ Skipping ${row[0]} (year: ${studentYear}) - not ${year}`);
          continue;
        }
        
        let admission = row[0].trim().toUpperCase();
        
        if (existingAdmissions.has(admission)) {
          skippedCount++;
          console.log(`⏭️ Skipping existing: ${row[0]}`);
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
        requests: [
          { addSheet: { properties: { title: sheetName } } }
        ]
      }
    });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:I${rows.length}`,
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
    
    console.log(`✅ Created new marksheet ${sheetName} with ${rows.length - 1} students (${addedCount} new, ${block}, ${year} only)`);
    return { success: true, studentCount: rows.length - 1, newStudents: addedCount };
    
  } catch (error) {
    console.error('❌ Error creating marksheet:', error);
    return { success: false, error: error.message };
  }
}
app.post('/api/add-unit', async (req, res) => {
  try {
    const { block, name, assessmentType } = req.body;
    const year = req.headers['x-year'] || '2024';  // ✅ Get year from headers
    const spreadsheetId = req.spreadsheetId;
    
    console.log(`📅 Adding unit: ${block} - ${name} (${year})`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'CONFIG!A:D',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    const data = response.data.values || [];
    let nextRow = data.length + 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === block && data[i][1] === name) {
        if (data[i][2] === 'YES') {
          return res.json({ success: false, message: 'Unit already exists' });
        } else {
          await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `CONFIG!C${i+1}:D${i+1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['YES', assessmentType]] }
          });
          // ✅ Pass year to the function
          await createMarksheetWithStudents(spreadsheetId, block, name, assessmentType, year);
          return res.json({ success: true, message: 'Unit reactivated successfully' });
        }
      }
    }
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `CONFIG!A${nextRow}:D${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[block, name, 'YES', assessmentType]] }
    });
    
    // ✅ Pass year to the function
    await createMarksheetWithStudents(spreadsheetId, block, name, assessmentType, year);
    
    res.json({ success: true, message: 'Unit added successfully' });
  } catch (error) {
    console.error('Error adding unit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/delete-unit', async (req, res) => {
  try {
    const { block, name } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === block && data[i][1] === name) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: req.spreadsheetId,
          range: `CONFIG!C${i+1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['NO']] }
        });
        res.json({ success: true, message: 'Unit deleted successfully' });
        return;
      }
    }
    res.json({ success: false, message: 'Unit not found' });
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

app.get('/api/stats', async (req, res) => {
  try {
    const students = await getStudentsList(req.spreadsheetId);
    res.json({ totalStudents: students.length, totalBlocks: 6, totalSubjects: 28 });
  } catch (error) {
    res.json({ totalStudents: 0, totalBlocks: 6, totalSubjects: 28 });
  }
});

// ======================= SCORE PUBLISHING ENDPOINTS =======================
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

app.get('/api/student-published-scores/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const published = [];
        
        for (const [key, value] of publishedScores.entries()) {
            if (key.endsWith(`_${admission}`)) {
                const [examType, examId] = key.split('_');
                published.push({
                    examType,
                    examId,
                    studentId: admission,
                    publishedAt: value.publishedAt,
                    publishedBy: value.publishedBy
                });
            }
        }
        
        res.json({ success: true, published });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/score-published/:examType/:examId/:studentId', async (req, res) => {
    try {
        const { examType, examId, studentId } = req.params;
        const key = `${examType}_${examId}_${studentId}`;
        const isPublished = publishedScores.has(key);
        
        res.json({ 
            success: true, 
            isPublished,
            publishedAt: isPublished ? publishedScores.get(key).publishedAt : null
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/publish-score', async (req, res) => {
    try {
        const { examType, examId, studentId, studentName, examName, publishedBy } = req.body;
        const spreadsheetId = req.spreadsheetId;
        const key = `${examType}_${examId}_${studentId}`;
        
        publishedScores.set(key, {
            publishedAt: new Date().toISOString(),
            publishedBy: publishedBy
        });
        
        await savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, 'PUBLISHED', publishedBy);
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: publishedBy,
            action: 'publish',
            target: examName,
            details: `Published ${studentName}'s score for ${examName}`
        });
        
        res.json({ success: true, message: `Published ${studentName}'s score` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/unpublish-score', async (req, res) => {
    try {
        const { examType, examId, studentId, studentName, examName, publishedBy } = req.body;
        const spreadsheetId = req.spreadsheetId;
        const key = `${examType}_${examId}_${studentId}`;
        
        publishedScores.delete(key);
        await savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, 'HIDDEN', publishedBy);
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: publishedBy,
            action: 'unpublish',
            target: examName,
            details: `Unpublished ${studentName}'s score for ${examName}`
        });
        
        res.json({ success: true, message: `Unpublished ${studentName}'s score` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/bulk-publish', async (req, res) => {
    try {
        const { examType, examId, examName, studentIds, publishedBy } = req.body;
        const spreadsheetId = req.spreadsheetId;
        let count = 0;
        
        for (const studentId of studentIds) {
            const key = `${examType}_${examId}_${studentId}`;
            if (!publishedScores.has(key)) {
                publishedScores.set(key, {
                    publishedAt: new Date().toISOString(),
                    publishedBy: publishedBy
                });
                await savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, 'PUBLISHED', publishedBy);
                count++;
            }
        }
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: publishedBy,
            action: 'bulk_publish',
            target: examName,
            details: `Bulk published ${count} scores for ${examName}`
        });
        
        res.json({ success: true, message: `Published ${count} scores for ${examName}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/bulk-unpublish', async (req, res) => {
    try {
        const { examType, examId, examName, studentIds, publishedBy } = req.body;
        const spreadsheetId = req.spreadsheetId;
        let count = 0;
        
        for (const studentId of studentIds) {
            const key = `${examType}_${examId}_${studentId}`;
            if (publishedScores.has(key)) {
                publishedScores.delete(key);
                await savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, 'HIDDEN', publishedBy);
                count++;
            }
        }
        
        markEntryLogs.unshift({
            timestamp: new Date().toISOString(),
            lecturerName: publishedBy,
            action: 'bulk_unpublish',
            target: examName,
            details: `Bulk unpublished ${count} scores for ${examName}`
        });
        
        res.json({ success: true, message: `Unpublished ${count} scores for ${examName}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/publish-logs', (req, res) => {
    const publishLogs = markEntryLogs.filter(log => 
        log.action === 'publish' || 
        log.action === 'unpublish' || 
        log.action === 'bulk_publish' || 
        log.action === 'bulk_unpublish'
    );
    res.json(publishLogs.slice(0, 100));
});

// ✅ Initialize from master spreadsheet
async function initPublishedScores() {
    await loadPublishedScores(MASTER_SPREADSHEET_ID);
}

initPublishedScores();

// ========== STUDENT PORTAL ENDPOINTS ==========

app.get('/api/student/marks/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const year = req.headers['x-year'] || '2026';
        const spreadsheetId = MASTER_SPREADSHEET_ID;  // ✅ Use master
        
        console.log(`📚 Student ${admission} requesting published marks`);
        
        const configResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:D',
        });
        const configData = configResponse.data.values || [];
        
        const allMarks = [];
        
        for (let i = 1; i < configData.length; i++) {
            const row = configData[i];
            if (row && row[0] && row[2] === 'YES') {
                const block = row[0];
                const subject = row[1];
                const assessmentType = row[3] || 'full';
                
                let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
                const sheetName = `${block}_${cleanSubject}`;
                
                try {
                    const marksResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: spreadsheetId,
                        range: `${sheetName}!A:I`,
                    });
                    
                    const marksData = marksResponse.data.values || [];
                    
                    for (let j = 1; j < marksData.length; j++) {
                        const markRow = marksData[j];
                        if (markRow && markRow[0] === admission) {
                            const examId = `${block}_${subject}`;
                            const key = `internal_${examId}_${admission}`;
                            const isPublished = publishedScores.has(key);
                            
                            if (isPublished) {
                                let cat1 = parseFloat(markRow[2]) || 0;
                                let cat2 = parseFloat(markRow[3]) || 0;
                                let examScore = parseFloat(markRow[4]) || 0;
                                let finalScore = 0;
                                
                                if (assessmentType === 'full') {
                                    finalScore = ((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30) + Math.min(examScore,70);
                                } else if (assessmentType === 'single_cat') {
                                    finalScore = Math.min(cat1,30) + Math.min(examScore,70);
                                } else {
                                    finalScore = Math.min(examScore,100);
                                }
                                finalScore = Math.round(finalScore * 10) / 10;
                                
                                allMarks.push({
                                    block: block,
                                    subject: subject,
                                    assessmentType: assessmentType,
                                    cat1: markRow[2] || '',
                                    cat2: markRow[3] || '',
                                    exam: markRow[4] || '',
                                    final: finalScore,
                                    grade: markRow[6] || '',
                                    gradedBy: markRow[7] || ''
                                });
                            }
                            break;
                        }
                    }
                } catch (err) {
                    // Sheet doesn't exist, skip
                }
            }
        }
        
        console.log(`✅ Found ${allMarks.length} published marks for ${admission}`);
        res.json({ success: true, marks: allMarks });
        
    } catch (error) {
        console.error('Error in /api/student/marks:', error);
        res.status(500).json({ success: false, error: error.message, marks: [] });
    }
});

app.get('/api/nck-student/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const year = req.headers['x-year'] || '2026';
        const spreadsheetId = MASTER_SPREADSHEET_ID;  // ✅ Use master
        
        console.log(`🏥 Student ${admission} requesting NCK scores`);
        
        const xyResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'NCK_XY_FORMS!A:Z',
        });
        
        const xyData = xyResponse.data.values || [];
        let studentScores = [];
        
        for (let i = 1; i < xyData.length; i++) {
            const row = xyData[i];
            if (row && (row[1] === admission || row[0] === admission)) {
                for (let j = 3; j <= 24 && j < row.length; j++) {
                    const score = parseFloat(row[j]);
                    studentScores.push(isNaN(score) ? 0 : score);
                }
                while (studentScores.length < 22) studentScores.push(0);
                break;
            }
        }
        
        res.json({ success: true, admission, scores: studentScores });
        
    } catch (error) {
        console.error('Error in /api/nck-student:', error);
        res.status(500).json({ success: false, error: error.message, scores: [] });
    }
});

app.get('/api/student/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const year = req.headers['x-year'] || '2026';
        const spreadsheetId = MASTER_SPREADSHEET_ID;  // ✅ Use master
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'STUDENTS!A:E',
        });
        
        const data = response.data.values || [];
        let student = null;
        
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][0] === admission) {
                student = {
                    admission: data[i][0],
                    name: data[i][1],
                    block: data[i][2],
                    year: data[i][3],
                    status: data[i][4]
                };
                break;
            }
        }
        
        if (student) {
            res.json({ success: true, student });
        } else {
            res.json({ success: false, message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== TRANSCRIPT GENERATION ENDPOINTS ==========
app.get('/api/transcript/:admission', async (req, res) => {
  try {
    const { admission } = req.params;
    const year = req.headers['x-year'] || '2026';
    const spreadsheetId = MASTER_SPREADSHEET_ID;  // ✅ Use master
    
    console.log(`📄 Generating transcript for ${admission}`);
    
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'STUDENTS!A:E',
    });
    const students = studentResponse.data.values || [];
    let student = null;
    
    for (let i = 1; i < students.length; i++) {
      if (students[i] && students[i][0] === admission) {
        student = {
          admission: students[i][0],
          name: students[i][1] || 'Unknown',
          block: students[i][2] || 'BLOCK_0',
          year: students[i][3] || '2026',
          status: students[i][4] || 'ACTIVE'
        };
        break;
      }
    }
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const configResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'CONFIG!A:D',
    });
    const configData = configResponse.data.values || [];
    
    const subjects = [];
    let totalScore = 0;
    let subjectCount = 0;
    
    for (let i = 1; i < configData.length; i++) {
      const row = configData[i];
      if (row && row[0] && row[2] === 'YES') {
        const block = row[0];
        const subject = row[1];
        const assessmentType = row[3] || 'full';
        
        let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
        const sheetName = `${block}_${cleanSubject}`;
        
        try {
          const marksResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!A:I`,
          });
          
          const marksData = marksResponse.data.values || [];
          
          for (let j = 1; j < marksData.length; j++) {
            const markRow = marksData[j];
            if (markRow && markRow[0] === admission) {
              let cat1 = parseFloat(markRow[2]) || 0;
              let cat2 = parseFloat(markRow[3]) || 0;
              let exam = parseFloat(markRow[4]) || 0;
              let finalScore = 0;
              
              if (assessmentType === 'full') {
                finalScore = ((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30) + Math.min(exam,70);
              } else if (assessmentType === 'single_cat') {
                finalScore = Math.min(cat1,30) + Math.min(exam,70);
              } else {
                finalScore = Math.min(exam,100);
              }
              finalScore = Math.round(finalScore * 10) / 10;
              
              subjects.push({
                block: block,
                subject: subject,
                assessmentType: assessmentType,
                cat1: markRow[2] || '',
                cat2: markRow[3] || '',
                exam: markRow[4] || '',
                final: finalScore,
                grade: markRow[6] || '',
                gradedBy: markRow[7] || ''
              });
              
              totalScore += finalScore;
              subjectCount++;
              break;
            }
          }
        } catch (err) {
          // Sheet doesn't exist, skip
        }
      }
    }
    
    const overallAvg = subjectCount > 0 ? Math.round((totalScore / subjectCount) * 10) / 10 : 0;
    const status = overallAvg >= 60 ? 'PASS' : (subjectCount > 0 ? 'FAIL' : 'PENDING');
    
    const gradeCount = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'PASS': 0, 'FAIL': 0 };
    let passed = 0;
    let failed = 0;
    
    subjects.forEach(s => {
      if (s.grade) {
        const g = s.grade.charAt(0).toUpperCase();
        if (['A', 'B', 'C', 'D', 'E'].includes(g)) {
          gradeCount[g] = (gradeCount[g] || 0) + 1;
        }
        if (s.final >= 60) {
          gradeCount['PASS']++;
          passed++;
        } else {
          gradeCount['FAIL']++;
          failed++;
        }
      }
    });
    
    let overallGrade = 'E';
    if (overallAvg >= 80) overallGrade = 'A';
    else if (overallAvg >= 70) overallGrade = 'B';
    else if (overallAvg >= 60) overallGrade = 'C';
    else if (overallAvg >= 50) overallGrade = 'D';
    
    const transcript = {
      student: student,
      subjects: subjects,
      overallAvg: overallAvg,
      overallGrade: overallGrade,
      status: status,
      subjectCount: subjectCount,
      passed: passed,
      failed: failed,
      gradeDistribution: gradeCount,
      generatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Transcript generated for ${admission}: ${subjectCount} subjects, ${overallAvg}%`);
    res.json({ success: true, transcript: transcript });
    
  } catch (error) {
    console.error('Error generating transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/transcripts/bulk', async (req, res) => {
  try {
    const { admissions } = req.body;
    const year = req.headers['x-year'] || '2026';
    const spreadsheetId = MASTER_SPREADSHEET_ID;  // ✅ Use master
    
    if (!admissions || !Array.isArray(admissions) || admissions.length === 0) {
      return res.status(400).json({ success: false, message: 'No admissions provided' });
    }
    
    console.log(`📄 Generating ${admissions.length} transcripts`);
    
    const transcripts = [];
    
    for (const admission of admissions) {
      try {
        const studentResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: 'STUDENTS!A:E',
        });
        const students = studentResponse.data.values || [];
        let student = null;
        
        for (let i = 1; i < students.length; i++) {
          if (students[i] && students[i][0] === admission) {
            student = {
              admission: students[i][0],
              name: students[i][1] || 'Unknown',
              block: students[i][2] || 'BLOCK_0',
              year: students[i][3] || '2026',
              status: students[i][4] || 'ACTIVE'
            };
            break;
          }
        }
        
        if (!student) continue;
        
        const configResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: 'CONFIG!A:D',
        });
        const configData = configResponse.data.values || [];
        
        const subjects = [];
        let totalScore = 0;
        let subjectCount = 0;
        
        for (let i = 1; i < configData.length; i++) {
          const row = configData[i];
          if (row && row[0] && row[2] === 'YES') {
            const block = row[0];
            const subject = row[1];
            const assessmentType = row[3] || 'full';
            
            let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
            const sheetName = `${block}_${cleanSubject}`;
            
            try {
              const marksResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A:I`,
              });
              
              const marksData = marksResponse.data.values || [];
              
              for (let j = 1; j < marksData.length; j++) {
                const markRow = marksData[j];
                if (markRow && markRow[0] === admission) {
                  let cat1 = parseFloat(markRow[2]) || 0;
                  let cat2 = parseFloat(markRow[3]) || 0;
                  let exam = parseFloat(markRow[4]) || 0;
                  let finalScore = 0;
                  
                  if (assessmentType === 'full') {
                    finalScore = ((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30) + Math.min(exam,70);
                  } else if (assessmentType === 'single_cat') {
                    finalScore = Math.min(cat1,30) + Math.min(exam,70);
                  } else {
                    finalScore = Math.min(exam,100);
                  }
                  finalScore = Math.round(finalScore * 10) / 10;
                  
                  subjects.push({
                    block: block,
                    subject: subject,
                    assessmentType: assessmentType,
                    cat1: markRow[2] || '',
                    cat2: markRow[3] || '',
                    exam: markRow[4] || '',
                    final: finalScore,
                    grade: markRow[6] || '',
                    gradedBy: markRow[7] || ''
                  });
                  
                  totalScore += finalScore;
                  subjectCount++;
                  break;
                }
              }
            } catch (err) {
              // Sheet doesn't exist, skip
            }
          }
        }
        
        const overallAvg = subjectCount > 0 ? Math.round((totalScore / subjectCount) * 10) / 10 : 0;
        const status = overallAvg >= 60 ? 'PASS' : (subjectCount > 0 ? 'FAIL' : 'PENDING');
        
        transcripts.push({
          student: student,
          subjects: subjects,
          overallAvg: overallAvg,
          status: status,
          subjectCount: subjectCount
        });
        
      } catch (err) {
        console.error(`Error generating transcript for ${admission}:`, err);
        transcripts.push({
          student: { admission: admission, name: 'Error' },
          error: err.message
        });
      }
    }
    
    res.json({ success: true, transcripts: transcripts });
    
  } catch (error) {
    console.error('Error generating bulk transcripts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// =====================================================
// ===== ADD THE REFRESH ENDPOINT HERE =====
// =====================================================
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('🔄 Refreshing data from master spreadsheet...');
    
    // Clear in-memory caches
    publishedScores = new Map();
    
    // Force fresh read from STUDENTS sheet
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SPREADSHEET_ID,
      range: 'STUDENTS!A:E',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    // Force fresh read from CONFIG sheet
    const configResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SPREADSHEET_ID,
      range: 'CONFIG!A:D',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    // Force fresh read from LECTURERS sheet
    const lecturersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SPREADSHEET_ID,
      range: 'LECTURERS!A:G',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    // Reload published scores
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
