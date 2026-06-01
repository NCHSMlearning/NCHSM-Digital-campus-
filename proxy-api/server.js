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

// Google Sheets Auth
const auth = new google.auth.GoogleAuth({
  credentials: {
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
iPfNv42aRnCdCn7YpnW8SkSTcyD0y+0hSCisQZ2NBgAkw4Y1uIYV+ayC4WXxWqmJ
yuRhbjbdQnNygiTKqxi2Q/xLoQR3eG9zs4mCPwBkwzfEa7QateVKqB8SOhKr/TlZ
eET3hIw//KEIOlTU2QI/
-----END PRIVATE KEY-----
`,
    client_email: "nursing-marks-bot@nursing-marks-system.iam.gserviceaccount.com",
    client_id: "116238387173068992581",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token"
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// ===== MIDDLEWARE =====
app.use((req, res, next) => {
  const year = req.headers['x-year'] || req.body.year || '2024';
  const examType = req.headers['x-exam-type'] || req.body.examType || 'internal';
  req.spreadsheetId = SPREADSHEETS[year]?.[examType] || SPREADSHEETS['2024'].internal;
  next();
});

// ===== API ENDPOINTS =====

app.get('/', (req, res) => {
  res.json({ message: 'Nursing Marks API is running!' });
});

// Get available years
app.get('/api/years', (req, res) => {
  res.json(Object.keys(SPREADSHEETS));
});

// Get blocks
app.get('/api/blocks', (req, res) => {
  res.json(['BLOCK_0', 'BLOCK_1', 'BLOCK_2', 'BLOCK_3', 'BLOCK_4', 'BLOCK_5']);
});

// Get subjects for a block
app.get('/api/subjects/:block', async (req, res) => {
  try {
    const { block } = req.params;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
    });
    
    const config = response.data.values || [];
    const subjects = [];
    
    for (let i = 1; i < config.length; i++) {
      if (config[i][0] === block && config[i][2] === 'YES') {
        subjects.push(config[i][1]);
      }
    }
    
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get students
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
      const admission = data[i][0];
      if (admission && !seen[admission]) {
        seen[admission] = true;
        students.push({
          admission: admission,
          name: data[i][1],
          block: data[i][2] || 'BLOCK_0',
          status: data[i][3] || 'ACTIVE'
        });
      }
    }
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get marks
app.get('/api/marks/:block/:subject', async (req, res) => {
  try {
    const { block, subject } = req.params;
    const examType = req.headers['x-exam-type'] || 'internal';
    let sheetName = `${block}_${subject.replace(/\s/g, '_')}`;
    
    // For NCK, use different sheet name structure
    if (examType === 'nck') {
      sheetName = `XY FORMS`;  // NCK uses XY FORMS sheet
    }
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    
    const data = response.data.values || [];
    const marks = [];
    
    if (examType === 'nck') {
      // NCK format - get all students and their final clinical scores
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          // Calculate average of 21 clinical areas (columns C to W)
          let total = 0;
          let count = 0;
          for (let j = 2; j <= 22 && j < data[i].length; j++) {
            const score = parseFloat(data[i][j]);
            if (!isNaN(score)) {
              total += score;
              count++;
            }
          }
          const finalScore = count > 0 ? total / count : 0;
          
          marks.push({
            row: i + 1,
            admission: data[i][0],
            name: data[i][1],
            finalScore: Math.round(finalScore * 100) / 100,
            gradedBy: data[i][23] || ''
          });
        }
      }
    } else {
      // Internal exams format
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          marks.push({
            row: i + 1,
            admission: data[i][0],
            name: data[i][1],
            cat1: data[i][2] || '',
            cat2: data[i][3] || '',
            exam: data[i][4] || '',
            final: data[i][5] || '',
            gradedBy: data[i][7] || '',
            assessmentType: data[i][8] || 'full'
          });
        }
      }
    }
    
    res.json(marks);
  } catch (error) {
    res.json([]);
  }
});

// Save marks (Internal exams only - NCK is read-only)
app.post('/api/marks', async (req, res) => {
  try {
    const { block, subject, marksData, lecturerName } = req.body;
    const examType = req.headers['x-exam-type'] || 'internal';
    
    if (examType === 'nck') {
      return res.json({ success: false, message: 'NCK scores are read-only. Edit directly in Google Sheets.' });
    }
    
    const sheetName = `${block}_${subject.replace(/\s/g, '_')}`;
    
    // Get assessment type
    const configResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: req.spreadsheetId,
      range: 'CONFIG!A:D',
    });
    
    const config = configResponse.data.values || [];
    let assessmentType = 'full';
    for (let i = 1; i < config.length; i++) {
      if (config[i][0] === block && config[i][1] === subject) {
        assessmentType = config[i][3] || 'full';
        break;
      }
    }
    
    for (const mark of marksData) {
      let cat1 = parseFloat(mark.cat1) || 0;
      let cat2 = parseFloat(mark.cat2) || 0;
      let exam = parseFloat(mark.exam) || 0;
      let finalTotal = 0;
      
      if (assessmentType === 'full') {
        cat1 = Math.min(cat1, 30);
        cat2 = Math.min(cat2, 30);
        exam = Math.min(exam, 70);
        const catsTotal = ((cat1 + cat2) / 60) * 30;
        finalTotal = catsTotal + exam;
      } else if (assessmentType === 'single_cat') {
        cat1 = Math.min(cat1, 30);
        exam = Math.min(exam, 70);
        finalTotal = cat1 + exam;
      } else {
        exam = Math.min(exam, 100);
        finalTotal = exam;
      }
      
      finalTotal = Math.round(finalTotal * 10) / 10;
      const grade = finalTotal >= 70 ? 'A' : (finalTotal >= 60 ? 'B' : (finalTotal >= 50 ? 'C' : (finalTotal >= 40 ? 'D' : 'E')));
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: req.spreadsheetId,
        range: `${sheetName}!C${mark.row}:H${mark.row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[cat1, cat2, exam, finalTotal, grade, lecturerName]]
        }
      });
    }
    
    res.json({ success: true, message: 'Marks saved successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, year, examType } = req.body;
    const spreadsheetId = SPREADSHEETS[year]?.internal || SPREADSHEETS['2024'].internal;
    
    // Check ADMIN sheet
    const adminResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'ADMIN!A:C',
    });
    
    const admins = adminResponse.data.values || [];
    for (let i = 1; i < admins.length; i++) {
      if (admins[i][0] === username && admins[i][1] === password) {
        return res.json({ success: true, user: { username, name: 'Administrator', role: 'admin' } });
      }
    }
    
    // Check LECTURERS sheet
    const lecturersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'LECTURERS!A:F',
    });
    
    const lecturers = lecturersResponse.data.values || [];
    for (let i = 1; i < lecturers.length; i++) {
      if (lecturers[i][0] === username && lecturers[i][3] === password) {
        return res.json({ 
          success: true, 
          user: { 
            username, 
            name: lecturers[i][1], 
            role: 'lecturer',
            subjects: lecturers[i][4] ? lecturers[i][4].split(',') : []
          } 
        });
      }
    }
    
    res.json({ success: false, message: 'Invalid username or password' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const students = await getStudents(req.spreadsheetId);
    res.json({
      totalStudents: students.length,
      totalBlocks: 6,
      totalSubjects: 28
    });
  } catch (error) {
    res.json({ totalStudents: 0, totalBlocks: 6, totalSubjects: 28 });
  }
});

async function getStudents(spreadsheetId) {
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
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
