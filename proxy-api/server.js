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

// ===== GOOGLE SHEETS AUTHENTICATION =====
const credentials = {
  type: "service_account",
  project_id: "nursing-marks-system",
  private_key_id: "1ed05cb70c346df5c3bb79e06bb1bffbd26f17b2",
  private_key: process.env.GOOGLE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJCTumvxURgqLM
KJFDb+tk82Hh3ePi5Sl6vtov4ZVOWegwZZ6u9CWVErxFVGdbMOkg+EVhyx3aD+dS
ZV+ZFmT2dTOu1CLjB+bTr1sPPZ1uFlWPd7bXMfDFhBdOpWVF15Ph+K6mHWjNX/TW
DVEiwMd7x1wk+S0uEsgoXCc5fIb9SkTKUy+7ZpRCq3igyDvS/y33wpPlSNJH0wjg
BWan+9obXHdMaDUWvqnUMqYHt2KeQcrBkLXXBdDDIY3gm/kSrLrJTTpPTgQYXmcL
ujDh3Zx3t6HAncs4vdftGVClgamtsL9k0X5i6PS4RkkvHkJ0uOo6+BBudo780sGX
i7+YwBBZAgMBAAECggEABYv3wY8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q
0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q0q8q
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
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'STUDENTS!A:D',
    });
    const data = response.data.values || [];
    const students = [];
    const seen = {};
    for (let i = 1; i < data.length; i++) {
      const admission = data[i][0];
      if (admission && !seen[admission]) {
        seen[admission] = true;
        students.push(admission);
      }
    }
    return students;
  } catch (error) {
    console.error('Error getting students:', error.message);
    return [];
  }
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

// ===== API ENDPOINTS =====

app.get('/', (req, res) => {
  res.json({ message: 'Nursing Marks API is running!' });
});

app.get('/api/years', (req, res) => {
  res.json(Object.keys(SPREADSHEETS));
});

app.get('/api/blocks', (req, res) => {
  res.json(['BLOCK_0', 'BLOCK_1', 'BLOCK_2', 'BLOCK_3', 'BLOCK_4', 'BLOCK_5']);
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
    
    console.log(`[GET MARKS] Year: ${year}, block=${block}, subject=${subject}, examType=${examType}`);
    
    if (examType === 'nck') {
      let sheetName = subject;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: req.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      
      const data = response.data.values || [];
      console.log(`[NCK] ${sheetName} - Total rows: ${data.length}`);
      
      const marks = [];
      
      if (sheetName === 'XY FORMS') {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || (!row[0] && !row[1])) continue;
          
          const studentName = row[1] || row[0] || '';
          if (!studentName || studentName === 'S.NO' || studentName === 'SN NO') continue;
          
          const clinicalScores = [];
          for (let j = 2; j <= 23; j++) {
            let score = 0;
            if (j < row.length && row[j] && row[j] !== '') {
              score = parseFloat(row[j]) || 0;
              if (score > 100) score = 0;
            }
            clinicalScores.push(score);
          }
          
          const validScores = clinicalScores.filter(s => s > 0 && s <= 100);
          let finalScore = 0;
          if (validScores.length > 0) {
            finalScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
          }
          
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
        // ASSESSMENT AND CASE
        let assessmentCount = 11;
        if (year === '2024') assessmentCount = 8;
        
        console.log(`[ASSESSMENT] Year ${year} using ${assessmentCount} columns`);
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[1]) continue;
          
          const studentName = row[1] || '';
          if (!studentName || studentName === 'NAME') continue;
          
          const scores = [];
          for (let col = 2; col < 2 + assessmentCount; col++) {
            let score = 0;
            if (col < row.length && row[col] && row[col] !== '') {
              const rawValue = row[col];
              if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                score = 0;
              } else {
                score = parseFloat(rawValue) || 0;
                if (score > 100) score = 0;
              }
            }
            scores.push(score);
          }
          
          const total = scores.reduce((a, b) => a + b, 0);
          const validCount = scores.filter(s => s > 0 && s <= 100).length;
          const average = validCount > 0 ? total / validCount : 0;
          
          let gradedBy = '';
          if (row[15] && row[15] !== '') {
            gradedBy = row[15];
          }
          
          marks.push({
            row: i + 1,
            admission: row[0] || '',
            name: studentName,
            scores: scores,
            total: total,
            final: average,
            gradedBy: gradedBy
          });
        }
      }
      
      res.json(marks);
    } else {
      // Internal exams
      let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
      const sheetName = `${block}_${cleanSubject}`;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: req.spreadsheetId,
        range: `${sheetName}!A:I`,
      });
      
      const data = response.data.values || [];
      const marks = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[0]) {
          marks.push({ 
            row: i + 1, 
            admission: row[0], 
            name: row[1] || '', 
            cat1: row[2] || '', 
            cat2: row[3] || '', 
            exam: row[4] || '', 
            final: row[5] || '', 
            grade: row[6] || '',
            gradedBy: row[7] || '', 
            assessmentType: row[8] || 'full' 
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
    
    console.log(`[SAVE MARKS] Year: ${year}, block=${block}, subject=${subject}`);
    
    if (examType === 'nck') {
      let sheetName = subject;
      
      if (sheetName === 'XY FORMS') {
        for (const mark of marksData) {
          const row = mark.row;
          for (let col = 0; col < 22 && col < mark.scores.length; col++) {
            const score = mark.scores[col] || 0;
            const columnLetter = String.fromCharCode(67 + col);
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheetName}!${columnLetter}${row}`,
              valueInputOption: 'RAW',
              requestBody: { values: [[score]] }
            });
          }
        }
      } else {
        let assessmentCount = 11;
        if (year === '2024') assessmentCount = 8;
        
        for (const mark of marksData) {
          const row = mark.row;
          for (let col = 0; col < assessmentCount && col < mark.scores.length; col++) {
            const score = mark.scores[col] || 0;
            const columnLetter = String.fromCharCode(67 + col);
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheetName}!${columnLetter}${row}`,
              valueInputOption: 'RAW',
              requestBody: { values: [[score]] }
            });
          }
          
          const total = mark.scores.reduce((a, b) => a + b, 0);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!N${row}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[total]] }
          });
          
          if (mark.gradedBy) {
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheetName}!P${row}`,
              valueInputOption: 'RAW',
              requestBody: { values: [[mark.gradedBy]] }
            });
          }
        }
      }
      res.json({ success: true, message: 'NCK marks saved successfully' });
    } else {
      let cleanSubject = subject.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
      const sheetName = `${block}_${cleanSubject}`;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:I`,
      });
      const currentData = response.data.values || [];
      
      for (const mark of marksData) {
        const row = mark.row;
        const existingRow = (currentData[row - 1]) || [];
        const assessmentType = existingRow[8] || 'full';
        
        let cat1 = parseFloat(mark.cat1) || 0;
        let cat2 = parseFloat(mark.cat2) || 0;
        let exam = parseFloat(mark.exam) || 0;
        let finalScore = 0;
        
        if (assessmentType === 'full') {
          finalScore = Math.round(((Math.min(cat1, 30) + Math.min(cat2, 30)) / 60 * 30 + Math.min(exam, 70)) * 10) / 10;
        } else if (assessmentType === 'single_cat') {
          finalScore = Math.round((Math.min(cat1, 30) + Math.min(exam, 70)) * 10) / 10;
        } else {
          finalScore = Math.round(Math.min(exam, 100) * 10) / 10;
        }
        
        const grade = await calculateGrade(finalScore);
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!C${row}:H${row}`,
          valueInputOption: 'RAW',
          requestBody: { 
            values: [[mark.cat1 || '', mark.cat2 || '', mark.exam || '', finalScore, grade, lecturerName || existingRow[7] || '']] 
          }
        });
      }
      res.json({ success: true, message: 'Marks saved successfully' });
    }
  } catch (error) {
    console.error('Error saving marks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== STUDENT ENDPOINTS ==========
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
        students.push({
          admission: admission,
          name: row[1] || '',
          block: row[2] || 'BLOCK_0',
          status: row[3] || 'ACTIVE'
        });
      }
    }
    res.json(students);
  } catch (error) {
    console.error('Error in /api/students:', error);
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

// ========== LECTURER ENDPOINTS ==========
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
        res.json({
          username: row[0],
          name: row[1],
          email: row[2] || '',
          subjects: row[4] ? row[4].split(',') : []
        });
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
        const block = row[0];
        if (!units[block]) units[block] = [];
        units[block].push({ name: row[1], assessmentType: row[3] || 'full' });
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
    const nextRow = data.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: req.spreadsheetId,
      range: `CONFIG!A${nextRow}:D${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[block, name, 'YES', assessmentType]] }
    });
    res.json({ success: true, message: 'Unit added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    
    // Check admin
    const adminResponse = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: 'ADMIN!A:C' 
    });
    const admins = adminResponse.data.values || [];
    for (let i = 1; i < admins.length; i++) {
      const row = admins[i];
      if (row && row[0] === username && row[1] === password) {
        return res.json({ success: true, user: { username, name: 'Administrator', role: 'admin' } });
      }
    }
    
    // Check lecturer
    const lecturersResponse = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: 'LECTURERS!A:G' 
    });
    const lecturers = lecturersResponse.data.values || [];
    for (let i = 1; i < lecturers.length; i++) {
      const row = lecturers[i];
      if (row && row[0] === username && row[3] === password && row[5] !== 'NO') {
        return res.json({ 
          success: true, 
          user: { 
            username, 
            name: row[1], 
            role: 'lecturer', 
            subjects: row[4] ? row[4].split(',') : [] 
          } 
        });
      }
    }
    
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
