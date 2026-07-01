const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// ===== SPREADSHEET CONFIGURATION - ALL CLASSES =====
const SPREADSHEETS = {
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

// ===== MIDDLEWARE =====
app.use((req, res, next) => {
  const year = req.headers['x-year'] || req.body.year || '2024';
  const examType = req.headers['x-exam-type'] || req.body.examType || 'internal';
  req.spreadsheetId = SPREADSHEETS[year]?.[examType] || SPREADSHEETS['2024'].internal;
  console.log(`[MIDDLEWARE] Year: ${year}, ExamType: ${examType}`);
  next();
});

// ===== HELPER FUNCTIONS =====
async function getStudentsList(spreadsheetId) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'STUDENTS!A:D',
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
  res.json(Object.keys(SPREADSHEETS));
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
        { name: 'XY FORMS', assessmentType: 'nck' },
        { name: 'ASSESSMENT AND CASE', assessmentType: 'nck' }
      ]);
    } else {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: req.spreadsheetId,
        range: 'CONFIG!A:D',
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

// ========== GET MARKS ENDPOINT - FIXED FOR 12 COLUMNS ==========
app.get('/api/marks/:block/:subject', async (req, res) => {
  try {
    const { block, subject } = req.params;
    const examType = req.headers['x-exam-type'] || 'internal';
    const year = req.headers['x-year'] || '2024';
    
    console.log(`[GET MARKS] Year: ${year}, block=${block}, subject=${subject}`);
    
    if (examType === 'nck') {
      let sheetName = subject;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: req.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      const data = response.data.values || [];
      const marks = [];
      
      if (sheetName === 'XY FORMS') {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || (!row[0] && !row[1])) continue;
          const studentName = row[1] || row[0] || '';
          if (!studentName || studentName === 'S.NO' || studentName === 'SN NO') continue;
          const clinicalScores = [];
          for (let j = 2; j <= 23 && j < row.length; j++) {
            const score = parseFloat(row[j]);
            clinicalScores.push(isNaN(score) ? 0 : score);
          }
          while (clinicalScores.length < 22) clinicalScores.push(0);
          const validScores = clinicalScores.filter(s => s > 0);
          let finalScore = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : (row[24] ? parseFloat(row[24]) : 0);
          marks.push({
            row: i + 1,
            admission: row[0] || '',
            name: studentName,
            scores: clinicalScores,
            final: Math.round(finalScore * 100) / 100,
            gradedBy: row[25] || row[26] || ''
          });
        }
      } else {
        // ===== ASSESSMENT AND CASE - FIXED: Read ALL 12 columns (C through N) =====
        // Column C = index 2 (ANC WARD) through Column N = index 13 (COMMUNITY DIAGNOSIS)
        // Total 12 assessment columns
        const assessmentStartCol = 2;  // Column C
        const assessmentEndCol = 13;   // Column N
        const assessmentCount = assessmentEndCol - assessmentStartCol + 1; // 12 columns
        
        console.log(`[ASSESSMENT] Reading ${assessmentCount} columns (${assessmentStartCol} to ${assessmentEndCol})`);
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1]) continue;
          
          const scores = [];
          // Read ALL 12 assessment columns (C through N)
          for (let col = assessmentStartCol; col <= assessmentEndCol && col < row.length; col++) {
            let score = 0;
            if (row[col] && row[col] !== '') {
              const rawValue = row[col];
              if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                score = 0;
              } else {
                score = parseFloat(rawValue) || 0;
                // DO NOT cap at 100 - case studies can have scores over 100 (e.g., 453)
                // Only cap if it's unreasonably high (over 1000)
                if (score > 1000) score = 0;
              }
            }
            scores.push(score);
          }
          
          // Ensure we have exactly 12 scores
          while (scores.length < assessmentCount) scores.push(0);
          
          const total = scores.reduce((a, b) => a + b, 0);
          const validCount = scores.filter(s => s > 0).length;
          const average = validCount > 0 ? total / validCount : 0;
          
          // Graded by is in column Q (index 16)
          let gradedBy = '';
          if (row[16] && row[16] !== '') {
            gradedBy = row[16];
          }
          
          marks.push({
            row: i + 1,
            admission: row[0] || '',
            name: row[1] || '',
            scores: scores,
            total: total,
            final: average,
            gradedBy: gradedBy
          });
        }
      }
      res.json(marks);
    } else {
      let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
      const sheetName = `${block}_${cleanSubject}`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: req.spreadsheetId,
        range: `${sheetName}!A:I`,
      });
      const data = response.data.values || [];
      const marks = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i] && data[i][0]) {
          marks.push({ 
            row: i + 1, 
            admission: data[i][0], 
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
      res.json(marks);
    }
  } catch (error) {
    console.error('Error in /api/marks:', error);
    res.json([]);
  }
});

// ========== FIXED: SAVE MARKS ENDPOINT (Supports Import) ==========
app.post('/api/marks', async (req, res) => {
  try {
    const { block, subject, marksData, lecturerName } = req.body;
    const examType = req.headers['x-exam-type'] || 'internal';
    const spreadsheetId = req.spreadsheetId;
    const year = req.headers['x-year'] || '2024';
    const userRole = req.headers['x-user-role'] || req.body.userRole;
    
    console.log(`[SAVE] User: ${lecturerName}, Role: ${userRole}, Subject: ${subject}`);
    console.log(`[SAVE] Records: ${marksData?.length || 0}`);
    
    // ===== ENTRY CHECK =====
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
      // NCK saving code (keep as is)
      res.json({ success: true, message: 'NCK marks saved successfully' });
    } else {
      let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
      const sheetName = `${block}_${cleanSubject}`;
      
      // ===== FIX 1: Check if sheet exists =====
      let sheetExists = true;
      let currentData = [];
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:I`,
        });
        currentData = response.data.values || [];
        console.log(`[SAVE] Sheet ${sheetName} exists with ${currentData.length} rows`);
      } catch (error) {
        sheetExists = false;
        console.log(`[SAVE] Sheet ${sheetName} does not exist, creating...`);
        
        // Create the sheet with headers
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            requestBody: {
              requests: [
                { addSheet: { properties: { title: sheetName } } }
              ]
            }
          });
          
          // Add headers
          const headers = ['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE'];
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:I1`,
            valueInputOption: 'RAW',
            requestBody: { values: [headers] }
          });
          
          currentData = [headers];
          console.log(`[SAVE] Created new sheet: ${sheetName}`);
        } catch (createError) {
          console.error('[SAVE] Error creating sheet:', createError);
          return res.status(500).json({ 
            success: false, 
            error: `Could not create sheet: ${createError.message}` 
          });
        }
      }
      
      // ===== FIX 2: Build map of existing admissions =====
      const existingAdmissions = new Map();
      let maxRow = 1;
      
      for (let i = 1; i < currentData.length; i++) {
        const row = currentData[i];
        if (row && row[0]) {
          const admission = row[0].toString().trim();
          existingAdmissions.set(admission, i + 1); // row number (1-indexed)
          if (i + 1 > maxRow) maxRow = i + 1;
        }
      }
      
      console.log(`[SAVE] Found ${existingAdmissions.size} existing students, max row: ${maxRow}`);
      
      // ===== FIX 3: Process marks - separate updates from inserts =====
      const rowsToUpdate = [];
      const rowsToInsert = [];
      let skippedCount = 0;
      
      for (const mark of marksData) {
        const admission = mark.admission ? mark.admission.toString().trim() : '';
        if (!admission) {
          skippedCount++;
          continue;
        }
        
        // Get scores
        let cat1 = parseFloat(mark.cat1) || 0;
        let cat2 = parseFloat(mark.cat2) || 0;
        let exam = parseFloat(mark.exam) || 0;
        
        // Determine assessment type from existing data or use full
        let assessmentType = 'full';
        if (existingAdmissions.has(admission)) {
          const rowNum = existingAdmissions.get(admission);
          if (currentData[rowNum - 1] && currentData[rowNum - 1][8]) {
            assessmentType = currentData[rowNum - 1][8];
          }
        }
        
        // Calculate final score
        let finalScore = 0;
        const hasCat1 = cat1 > 0;
        const hasCat2 = cat2 > 0;
        const hasExam = exam > 0;
        
        if (hasExam && hasCat1 && hasCat2) {
          const cappedCat1 = Math.min(cat1, 30);
          const cappedCat2 = Math.min(cat2, 30);
          const cappedExam = Math.min(exam, 70);
          finalScore = ((cappedCat1 + cappedCat2) / 60 * 30) + cappedExam;
        } else if (hasExam && hasCat1) {
          finalScore = Math.min(cat1, 30) + Math.min(exam, 70);
        } else if (hasExam) {
          finalScore = Math.min(exam, 100);
        } else if (hasCat1 && hasCat2) {
          finalScore = ((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60) * 100;
        } else if (hasCat1) {
          finalScore = (Math.min(cat1, 30) / 30) * 100;
        }
        finalScore = Math.round(finalScore * 10) / 10;
        const grade = await calculateGrade(finalScore);
        
        const rowData = {
          admission,
          name: mark.name || '',
          cat1,
          cat2,
          exam,
          finalScore,
          grade,
          gradedBy: lecturerName || '',
          assessmentType
        };
        
        // Check if student exists
        if (existingAdmissions.has(admission)) {
          rowsToUpdate.push(rowData);
        } else {
          rowsToInsert.push(rowData);
        }
      }
      
      // ===== FIX 4: Update existing rows =====
      for (const mark of rowsToUpdate) {
        const rowNum = existingAdmissions.get(mark.admission);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!C${rowNum}:H${rowNum}`,
          valueInputOption: 'RAW',
          requestBody: { 
            values: [[mark.cat1, mark.cat2, mark.exam, mark.finalScore, mark.grade, mark.gradedBy]] 
          }
        });
      }
      
      // ===== FIX 5: Insert new rows =====
      if (rowsToInsert.length > 0) {
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
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A${startRow}:I${startRow + valuesToInsert.length - 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: valuesToInsert }
        });
      }
      
      console.log(`[SAVE] Updated ${rowsToUpdate.length}, Inserted ${rowsToInsert.length}, Skipped ${skippedCount}`);
      
      res.json({ 
        success: true, 
        message: `Saved ${rowsToUpdate.length} updated + ${rowsToInsert.length} new marks`,
        updated: rowsToUpdate.length,
        inserted: rowsToInsert.length,
        skipped: skippedCount
      });
    }
  } catch (error) {
    console.error('❌ Error saving marks:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});
// ========== STUDENT ENDPOINTS (Simplified) ==========
app.get('/api/students', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'STUDENTS!A:D',
    });
    const data = response.data.values || [];
    const students = [];
    const seen = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const admission = row ? row[0] : null;
      if (admission && !seen[admission]) {
        seen[admission] = true;
        students.push({ admission, name: row[1] || '', block: row[2] || 'BLOCK_0', status: row[3] || 'ACTIVE' });
      }
    }
    res.json(students);
  } catch (error) {
    res.json([]);
  }
});

app.post('/api/add-student', async (req, res) => {
  try {
    const { admission, name, block } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'STUDENTS!A:D',
    });
    const data = response.data.values || [];
    const nextRow = data.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: req.spreadsheetId,
      range: `STUDENTS!A${nextRow}:D${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[admission, name.toUpperCase(), block, 'ACTIVE']] }
    });
    res.json({ success: true, message: 'Student added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/update-student', async (req, res) => {
  try {
    const { admission, name, block } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'STUDENTS!A:D',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === admission) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: req.spreadsheetId,
          range: `STUDENTS!B${i+1}:C${i+1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[name.toUpperCase(), block]] }
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
      range: 'STUDENTS!A:D',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === admission) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: req.spreadsheetId,
          range: `STUDENTS!D${i+1}`,
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

// ========== LECTURER ENDPOINTS (Simplified) ==========
app.get('/api/lecturers', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'LECTURERS!A:G',
    });
    const data = response.data.values || [];
    const lecturers = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] && row[5] !== 'NO') {
        lecturers.push({
          username: row[0],
          name: row[1],
          email: row[2] || '',
          subjects: row[4] ? row[4].split(',') : []
        });
      }
    }
    res.json(lecturers);
  } catch (error) {
    res.json([]);
  }
});

app.get('/api/lecturer/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'LECTURERS!A:G',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] === username) {
        res.json({ username: row[0], name: row[1], email: row[2] || '', subjects: row[4] ? row[4].split(',') : [] });
        return;
      }
    }
    res.json(null);
  } catch (error) {
    res.json(null);
  }
});

app.post('/api/add-lecturer', async (req, res) => {
  try {
    const { username, name, email, password, subjects } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'LECTURERS!A:G',
    });
    const data = response.data.values || [];
    const nextRow = data.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: req.spreadsheetId,
      range: `LECTURERS!A${nextRow}:G${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[username, name, email || '', password, subjects ? subjects.join(',') : '', 'YES', new Date().toISOString()]] }
    });
    res.json({ success: true, message: 'Lecturer added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/update-lecturer', async (req, res) => {
  try {
    const { oldUsername, username, name, email, password, subjects } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'LECTURERS!A:G',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === oldUsername) {
        const row = i + 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId: req.spreadsheetId,
          range: `LECTURERS!A${row}:E${row}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[username, name, email || '', password || data[i][3], subjects ? subjects.join(',') : '']] }
        });
        break;
      }
    }
    res.json({ success: true, message: 'Lecturer updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/delete-lecturer', async (req, res) => {
  try {
    const { username } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'LECTURERS!A:G',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === username) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: req.spreadsheetId,
          range: `LECTURERS!F${i+1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['NO']] }
        });
        break;
      }
    }
    res.json({ success: true, message: 'Lecturer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== UNIT ENDPOINTS ==========
app.get('/api/units', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
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
    
    // Check if unit already exists
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
          // Also create the marksheet with students
          await createMarksheetWithStudents(req.spreadsheetId, block, name, assessmentType);
          return res.json({ success: true, message: 'Unit reactivated successfully' });
        }
      }
    }
    
    // Add to CONFIG
    await sheets.spreadsheets.values.update({
      spreadsheetId: req.spreadsheetId,
      range: `CONFIG!A${nextRow}:D${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[block, name, 'YES', assessmentType]] }
    });
    
    // Create marksheet with students
    await createMarksheetWithStudents(req.spreadsheetId, block, name, assessmentType);
    
    res.json({ success: true, message: 'Unit added successfully' });
  } catch (error) {
    console.error('Error adding unit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to create marksheet with students
// ======================= FIXED: CREATE MARKSHEET WITH STUDENTS =======================
// ======================= FIXED: CREATE MARKSHEET WITH STUDENTS (NO DUPLICATES) =======================
async function createMarksheetWithStudents(spreadsheetId, block, subject, assessmentType) {
  try {
    console.log(`📝 Creating marksheet for ${block} - ${subject}`);
    
    // 1. Get students from STUDENTS sheet
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'STUDENTS!A:D',
    });
    const students = studentsResponse.data.values || [];
    console.log(`📊 Found ${students.length - 1} students in STUDENTS sheet`);
    
    // Clean subject name for sheet title
    let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
    const sheetName = `${block}_${cleanSubject}`;
    
    // 2. ✅ CHECK: Does the sheet already exist?
    let existingAdmissions = new Set();
    let sheetExists = false;
    
    try {
      const existingResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      const existingData = existingResponse.data.values || [];
      sheetExists = true;
      
      // Normalize existing admissions for comparison
      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i] && existingData[i][0]) {
          let admission = existingData[i][0].trim().toUpperCase();
          admission = admission.replace(/\/24(?![0-9])/g, '/2024');
          admission = admission.replace(/\/25(?![0-9])/g, '/2025');
          admission = admission.replace(/\/26(?![0-9])/g, '/2026');
          admission = admission.replace(/MAR\/24(?![0-9])/g, 'MAR/2024');
          admission = admission.replace(/MAR\/25(?![0-9])/g, 'MAR/2025');
          admission = admission.replace(/MAR\/26(?![0-9])/g, 'MAR/2026');
          existingAdmissions.add(admission);
        }
      }
      console.log(`📋 Found ${existingAdmissions.size} existing students in marksheet`);
    } catch (e) {
      console.log('📋 Sheet does not exist, will create new');
      sheetExists = false;
    }
    
    // 3. Prepare rows - HEADERS FIRST
    const rows = [['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE']];
    
    let addedCount = 0;
    let skippedCount = 0;
    
    // 4. ✅ ADD ONLY STUDENTS THAT DON'T ALREADY EXIST
    for (let i = 1; i < students.length; i++) {
      const row = students[i];
      if (row && row[0] && row[0].trim() !== '' && row[3] !== 'INACTIVE') {
        // Normalize admission for comparison
        let admission = row[0].trim().toUpperCase();
        admission = admission.replace(/\/24(?![0-9])/g, '/2024');
        admission = admission.replace(/\/25(?![0-9])/g, '/2025');
        admission = admission.replace(/\/26(?![0-9])/g, '/2026');
        admission = admission.replace(/MAR\/24(?![0-9])/g, 'MAR/2024');
        admission = admission.replace(/MAR\/25(?![0-9])/g, 'MAR/2025');
        admission = admission.replace(/MAR\/26(?![0-9])/g, 'MAR/2026');
        
        // ✅ SKIP if student already exists
        if (existingAdmissions.has(admission)) {
          skippedCount++;
          console.log(`⏭️ Skipping existing: ${row[0]}`);
          continue;
        }
        
        rows.push([
          row[0].trim(),           // ADMISSION
          row[1] || '',            // NAME
          '',                      // CAT1
          '',                      // CAT2
          '',                      // EXAM
          '',                      // FINAL
          '',                      // GRADE
          '',                      // GRADED BY
          assessmentType || 'full' // ASSESSMENT_TYPE
        ]);
        addedCount++;
        existingAdmissions.add(admission);
      }
    }
    
    console.log(`👥 Adding ${addedCount} new students, skipping ${skippedCount} existing`);
    
    // 5. If sheet exists and no new students, return
    if (sheetExists && addedCount === 0) {
      console.log(`✅ No new students to add. Sheet already has ${existingAdmissions.size} students.`);
      return { success: true, studentCount: existingAdmissions.size, newStudents: 0 };
    }
    
    // 6. If sheet exists, append new rows instead of deleting everything
    if (sheetExists) {
      // Get current data to find last row
      const currentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A:I`,
      });
      const currentData = currentResponse.data.values || [];
      const lastRow = currentData.length;
      
      // Append new students starting from next row
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
    
    // 7. Create new sheet (only if it doesn't exist)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          { addSheet: { properties: { title: sheetName } } }
        ]
      }
    });
    
    // 8. Write data to new sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:I${rows.length}`,
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
    
    console.log(`✅ Created new marksheet ${sheetName} with ${rows.length - 1} students (${addedCount} new)`);
    return { success: true, studentCount: rows.length - 1, newStudents: addedCount };
    
  } catch (error) {
    console.error('❌ Error creating marksheet:', error);
    return { success: false, error: error.message };
  }
}
app.post('/api/update-unit', async (req, res) => {
  try {
    const { block, oldName, newName, assessmentType } = req.body;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
    });
    const data = response.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === block && data[i][1] === oldName) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: req.spreadsheetId,
          range: `CONFIG!B${i+1}:D${i+1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[newName, 'YES', assessmentType]] }
        });
        res.json({ success: true, message: 'Unit updated successfully' });
        return;
      }
    }
    res.json({ success: false, message: 'Unit not found' });
  } catch (error) {
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

// ========== LOGIN & STATS ==========
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, year } = req.body;
    const spreadsheetId = SPREADSHEETS[year]?.internal || SPREADSHEETS['2024'].internal;
    
    const adminResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'ADMIN!A:C' });
    const admins = adminResponse.data.values || [];
    for (let i = 1; i < admins.length; i++) {
      const row = admins[i];
      if (row && row[0] === username && row[1] === password) {
        return res.json({ success: true, user: { username, name: 'Administrator', role: 'admin' } });
      }
    }
    
    const lecturersResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'LECTURERS!A:G' });
    const lecturers = lecturersResponse.data.values || [];
    for (let i = 1; i < lecturers.length; i++) {
      const row = lecturers[i];
      if (row && row[0] === username && row[3] === password && row[5] !== 'NO') {
        return res.json({ success: true, user: { username, name: row[1], role: 'lecturer', subjects: row[4] ? row[4].split(',') : [] } });
      }
    }
    res.json({ success: false, message: 'Invalid username or password' });
  } catch (error) {
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
// Store published scores in memory (will be persisted to a sheet in production)
let publishedScores = new Map(); // key: `${examType}_${examId}_${studentId}`

// Load published scores from a dedicated sheet
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
        // Create the sheet if it doesn't exist
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

// Save a published score to the sheet
async function savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, status, publishedBy) {
    try {
        // Check if entry exists
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
            // Update existing
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `PUBLISHED_SCORES!D${foundRow}:E${foundRow}`,
                valueInputOption: 'RAW',
                requestBody: { values: [[status, now]] }
            });
        } else {
            // Add new
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

// Get all published scores for a student (for student portal)
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

// Check if a specific score is published
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

// Publish a score (Admin only)
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
        
        // Log the action
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

// Unpublish a score (Admin only)
app.post('/api/unpublish-score', async (req, res) => {
    try {
        const { examType, examId, studentId, studentName, examName, publishedBy } = req.body;
        const spreadsheetId = req.spreadsheetId;
        const key = `${examType}_${examId}_${studentId}`;
        
        publishedScores.delete(key);
        await savePublishedScoreToSheet(spreadsheetId, examType, examId, studentId, 'HIDDEN', publishedBy);
        
        // Log the action
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

// Bulk publish scores
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

// Bulk unpublish scores
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

// Get publication logs
app.get('/api/publish-logs', (req, res) => {
    const publishLogs = markEntryLogs.filter(log => 
        log.action === 'publish' || 
        log.action === 'unpublish' || 
        log.action === 'bulk_publish' || 
        log.action === 'bulk_unpublish'
    );
    res.json(publishLogs.slice(0, 100));
});

// Initialize published scores on server start
async function initPublishedScores() {
    // Try to load from default spreadsheet
    for (const year of ['2024', '2025', '2026']) {
        const spreadsheetId = SPREADSHEETS[year]?.internal;
        if (spreadsheetId) {
            await loadPublishedScores(spreadsheetId);
            break;
        }
    }
}

// Call initialization
initPublishedScores();

// ========== STUDENT PORTAL ENDPOINTS (MISSING - ADD THESE!) ==========

// 1. Student gets their published internal marks
app.get('/api/student/marks/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const year = req.headers['x-year'] || '2026';
        const spreadsheetId = SPREADSHEETS[year]?.internal || SPREADSHEETS['2026'].internal;
        
        console.log(`📚 Student ${admission} requesting published marks`);
        
        // Get all subjects from CONFIG
        const configResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'CONFIG!A:D',
        });
        const configData = configResponse.data.values || [];
        
        const allMarks = [];
        
        // Loop through all blocks and subjects
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
                            // Check if this score is PUBLISHED
                            const examId = `${block}_${subject}`;
                            const key = `internal_${examId}_${admission}`;
                            const isPublished = publishedScores.has(key);
                            
                            if (isPublished) {
                                // Calculate final score
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

// 2. Student gets their NCK clinical scores
app.get('/api/nck-student/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const year = req.headers['x-year'] || '2026';
        const spreadsheetId = SPREADSHEETS[year]?.nck || SPREADSHEETS['2026'].nck;
        
        console.log(`🏥 Student ${admission} requesting NCK scores`);
        
        // Get XY FORMS data
        const xyResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'XY FORMS!A:Z',
        });
        
        const xyData = xyResponse.data.values || [];
        let studentScores = [];
        
        for (let i = 1; i < xyData.length; i++) {
            const row = xyData[i];
            if (row && (row[1] === admission || row[0] === admission)) {
                // Get scores from columns C-X (indices 2-23)
                for (let j = 2; j <= 23 && j < row.length; j++) {
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

// 3. Check if student exists
app.get('/api/student/:admission', async (req, res) => {
    try {
        const { admission } = req.params;
        const year = req.headers['x-year'] || '2026';
        const spreadsheetId = SPREADSHEETS[year]?.internal || SPREADSHEETS['2026'].internal;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'STUDENTS!A:D',
        });
        
        const data = response.data.values || [];
        let student = null;
        
        for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i][0] === admission) {
                student = {
                    admission: data[i][0],
                    name: data[i][1],
                    block: data[i][2],
                    status: data[i][3]
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// ========== 📄 TRANSCRIPT GENERATION ENDPOINT ==========
app.get('/api/transcript/:admission', async (req, res) => {
  try {
    const { admission } = req.params;
    const year = req.headers['x-year'] || '2026';
    const spreadsheetId = SPREADSHEETS[year]?.internal || SPREADSHEETS['2026'].internal;
    
    console.log(`📄 Generating transcript for ${admission}`);
    
    // 1. Get student details
    const studentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'STUDENTS!A:D',
    });
    const students = studentResponse.data.values || [];
    let student = null;
    
    for (let i = 1; i < students.length; i++) {
      if (students[i] && students[i][0] === admission) {
        student = {
          admission: students[i][0],
          name: students[i][1] || 'Unknown',
          block: students[i][2] || 'BLOCK_0',
          status: students[i][3] || 'ACTIVE'
        };
        break;
      }
    }
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // 2. Get all subjects from CONFIG
    const configResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'CONFIG!A:D',
    });
    const configData = configResponse.data.values || [];
    
    const subjects = [];
    let totalScore = 0;
    let subjectCount = 0;
    
    // 3. Loop through all blocks and subjects to find student's marks
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
              
              // Calculate based on assessment type
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
    
    // 4. Calculate overall average
    const overallAvg = subjectCount > 0 ? Math.round((totalScore / subjectCount) * 10) / 10 : 0;
    const status = overallAvg >= 60 ? 'PASS' : (subjectCount > 0 ? 'FAIL' : 'PENDING');
    
    // 5. Calculate grade distribution
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
    
    // 6. Generate letter grade based on overall average
    let overallGrade = 'E';
    if (overallAvg >= 80) overallGrade = 'A';
    else if (overallAvg >= 70) overallGrade = 'B';
    else if (overallAvg >= 60) overallGrade = 'C';
    else if (overallAvg >= 50) overallGrade = 'D';
    
    // 7. Build transcript response
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

// ========== 📄 BULK TRANSCRIPT GENERATION ==========
app.post('/api/transcripts/bulk', async (req, res) => {
  try {
    const { admissions } = req.body;
    const year = req.headers['x-year'] || '2026';
    const spreadsheetId = SPREADSHEETS[year]?.internal || SPREADSHEETS['2026'].internal;
    
    if (!admissions || !Array.isArray(admissions) || admissions.length === 0) {
      return res.status(400).json({ success: false, message: 'No admissions provided' });
    }
    
    console.log(`📄 Generating ${admissions.length} transcripts`);
    
    const transcripts = [];
    
    for (const admission of admissions) {
      try {
        // Use the single transcript endpoint logic (duplicated for speed)
        // Get student details
        const studentResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: 'STUDENTS!A:D',
        });
        const students = studentResponse.data.values || [];
        let student = null;
        
        for (let i = 1; i < students.length; i++) {
          if (students[i] && students[i][0] === admission) {
            student = {
              admission: students[i][0],
              name: students[i][1] || 'Unknown',
              block: students[i][2] || 'BLOCK_0',
              status: students[i][3] || 'ACTIVE'
            };
            break;
          }
        }
        
        if (!student) continue;
        
        // Get subjects and marks
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
