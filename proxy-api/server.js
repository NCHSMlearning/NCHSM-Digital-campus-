const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());

// Your Google Sheet ID - REPLACE THIS!
const SPREADSHEET_ID = '1W7g_qwVS1r0sBpcGqTKFXr-mY4Hetw1a7-nMnkxVoGA';

// Service account auth
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

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Nursing Marks API is running!' });
});

// Get students
app.get('/api/students', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'STUDENTS!A:D',
    });
    
    const students = response.data.values || [];
    const uniqueStudents = [];
    const seen = {};
    
    for (let i = 1; i < students.length; i++) {
      const admission = students[i][0];
      if (admission && !seen[admission]) {
        seen[admission] = true;
        uniqueStudents.push({
          admission: admission,
          name: students[i][1],
          block: students[i][2] || 'BLOCK_0',
          status: students[i][3] || 'ACTIVE'
        });
      }
    }
    
    res.json(uniqueStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
      spreadsheetId: SPREADSHEET_ID,
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

// Get marks
app.get('/api/marks/:block/:subject', async (req, res) => {
  try {
    const { block, subject } = req.params;
    const sheetName = `${block}_${subject.replace(/\s/g, '_')}`;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:I`,
    });
    
    const data = response.data.values || [];
    const marks = [];
    
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
    
    res.json(marks);
  } catch (error) {
    res.json([]);
  }
});

// Save marks
app.post('/api/marks', async (req, res) => {
  try {
    const { block, subject, marksData, lecturerName } = req.body;
    const sheetName = `${block}_${subject.replace(/\s/g, '_')}`;
    
    for (const mark of marksData) {
      const cat1 = parseFloat(mark.cat1) || 0;
      const cat2 = parseFloat(mark.cat2) || 0;
      const exam = parseFloat(mark.exam) || 0;
      const final = cat1 + cat2 + exam;
      const grade = final >= 70 ? 'A' : (final >= 60 ? 'B' : (final >= 50 ? 'C' : 'D'));
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!C${mark.row}:H${mark.row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[cat1, cat2, exam, final, grade, lecturerName]]
        }
      });
    }
    
    res.json({ success: true, message: 'Marks saved!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
