const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

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

// ========== GET MARKS ENDPOINT ==========
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
        const assessmentStartCol = 2;
        const assessmentEndCol = 13;
        const assessmentCount = assessmentEndCol - assessmentStartCol + 1;
        
        console.log(`[ASSESSMENT] Reading ${assessmentCount} columns (${assessmentStartCol} to ${assessmentEndCol})`);
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1]) continue;
          
          const scores = [];
          for (let col = assessmentStartCol; col <= assessmentEndCol && col < row.length; col++) {
            let score = 0;
            if (row[col] && row[col] !== '') {
              const rawValue = row[col];
              if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                score = 0;
              } else {
                score = parseFloat(rawValue) || 0;
                if (score > 1000) score = 0;
              }
            }
            scores.push(score);
          }
          
          while (scores.length < assessmentCount) scores.push(0);
          
          const total = scores.reduce((a, b) => a + b, 0);
          const validCount = scores.filter(s => s > 0).length;
          const average = validCount > 0 ? total / validCount : 0;
          
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

// ========== SAVE MARKS ENDPOINT ==========
app.post('/api/marks', async (req, res) => {
  try {
    const { block, subject, marksData, lecturerName } = req.body;
    const examType = req.headers['x-exam-type'] || 'internal';
    const spreadsheetId = req.spreadsheetId;
    const year = req.headers['x-year'] || '2024';
    const userRole = req.headers['x-user-role'] || req.body.userRole;
    
    console.log(`[SAVE] User: ${lecturerName}, Role: ${userRole}, Subject: ${subject}`);
    console.log(`[SAVE] Records: ${marksData?.length || 0}`);
    
    // Entry check
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
    
    // Save logic
    if (examType === 'nck') {
      res.json({ success: true, message: 'NCK marks saved successfully' });
    } else {
      let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
      const sheetName = `${block}_${cleanSubject}`;
      
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
          console.log(`[SAVE] Created new sheet: ${sheetName}`);
        } catch (createError) {
          console.error('[SAVE] Error creating sheet:', createError);
          return res.status(500).json({ 
            success: false, 
            error: `Could not create sheet: ${createError.message}` 
          });
        }
      }
      
      const existingAdmissions = new Map();
      let maxRow = 1;
      
      for (let i = 1; i < currentData.length; i++) {
        const row = currentData[i];
        if (row && row[0]) {
          const admission = row[0].toString().trim();
          existingAdmissions.set(admission, i + 1);
          if (i + 1 > maxRow) maxRow = i + 1;
        }
      }
      
      console.log(`[SAVE] Found ${existingAdmissions.size} existing students, max row: ${maxRow}`);
      
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
        
        let assessmentType = 'full';
        if (existingAdmissions.has(admission)) {
          const rowNum = existingAdmissions.get(admission);
          if (currentData[rowNum - 1] && currentData[rowNum - 1][8]) {
            assessmentType = currentData[rowNum - 1][8];
          }
        }
        
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
        
        if (existingAdmissions.has(admission)) {
          rowsToUpdate.push(rowData);
        } else {
          rowsToInsert.push(rowData);
        }
      }
      
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

// ========== STUDENT ENDPOINTS ==========
app.get('/api/students', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'STUDENTS!A:E',  // ✅ Updated to include YEAR column
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
          year: row[3] || '',  // ✅ Include year
          status: row[4] || 'ACTIVE' 
        });
      }
    }
    res.json(students);
  } catch (error) {
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

// ===== CREATE MARKSHEET WITH STUDENTS =====
async function createMarksheetWithStudents(spreadsheetId, block, subject, assessmentType) {
  try {
    console.log(`📝 Creating marksheet for ${block} - ${subject}`);
    
    const studentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'STUDENTS!A:E',
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
      });
      const existingData = existingResponse.data.values || [];
      sheetExists = true;
      
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
    
    const rows = [['ADMISSION', 'NAME', 'CAT1', 'CAT2', 'EXAM', 'FINAL', 'GRADE', 'GRADED BY', 'ASSESSMENT_TYPE']];
    let addedCount = 0;
    let skippedCount = 0;
    
    for (let i = 1; i < students.length; i++) {
      const row = students[i];
      if (row && row[0] && row[0].trim() !== '' && row[4] !== 'INACTIVE') {
        let admission = row[0].trim().toUpperCase();
        admission = admission.replace(/\/24(?![0-9])/g, '/2024');
        admission = admission.replace(/\/25(?![0-9])/g, '/2025');
        admission = admission.replace(/\/26(?![0-9])/g, '/2026');
        admission = admission.replace(/MAR\/24(?![0-9])/g, 'MAR/2024');
        admission = admission.replace(/MAR\/25(?![0-9])/g, 'MAR/2025');
        admission = admission.replace(/MAR\/26(?![0-9])/g, 'MAR/2026');
        
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
    
    console.log(`👥 Adding ${addedCount} new students, skipping ${skippedCount} existing`);
    
    if (sheetExists && addedCount === 0) {
      console.log(`✅ No new students to add. Sheet already has ${existingAdmissions.size} students.`);
      return { success: true, studentCount: existingAdmissions.size, newStudents: 0 };
    }
    
    if (sheetExists) {
      const currentResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A:I`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
