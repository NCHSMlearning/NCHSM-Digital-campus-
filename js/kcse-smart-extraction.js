/* NCHSM KCSE SMART EXTRACTION — additive enhancement
 * Improves KCSE subject/grade parsing and presents an editable review table.
 * Runs after the existing admissions workflow; no existing admission fields are removed.
 */
(function () {
  'use strict';

  const GRADE_RE = /^(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|E)$/i;
  const SUBJECTS = [
    ['101', 'English', ['ENGLISH', 'ENG']],
    ['102', 'Kiswahili', ['KISWAHILI', 'KISW', 'KISW.']],
    ['121', 'Mathematics', ['MATHEMATICS', 'MATHS', 'MATH', 'MATHEMATICS ALT A', 'MATHEMATICS ALT B']],
    ['231', 'Biology', ['BIOLOGY', 'BIO']],
    ['232', 'Physics', ['PHYSICS', 'PHYS']],
    ['233', 'Chemistry', ['CHEMISTRY', 'CHEM']],
    ['311', 'History and Government', ['HISTORY AND GOVERNMENT', 'HISTORY', 'HIST']],
    ['312', 'Geography', ['GEOGRAPHY', 'GEO']],
    ['313', 'Christian Religious Education', ['CHRISTIAN RELIGIOUS EDUCATION', 'CRE']],
    ['314', 'Islamic Religious Education', ['ISLAMIC RELIGIOUS EDUCATION', 'IRE']],
    ['315', 'Hindu Religious Education', ['HINDU RELIGIOUS EDUCATION', 'HRE']],
    ['443', 'Agriculture', ['AGRICULTURE', 'AGRIC']],
    ['444', 'Home Science', ['HOME SCIENCE']],
    ['565', 'Business Studies', ['BUSINESS STUDIES', 'BUSINESS', 'BUS']],
    ['451', 'Computer Studies', ['COMPUTER STUDIES', 'COMPUTER', 'COMP']],
    ['501', 'French', ['FRENCH']],
    ['502', 'German', ['GERMAN']],
    ['503', 'Arabic', ['ARABIC']],
    ['511', 'Music', ['MUSIC']],
    ['442', 'Art and Design', ['ART AND DESIGN', 'ART']],
    ['549', 'Aviation Technology', ['AVIATION TECHNOLOGY']],
    [' Kenya', 'Kenya Sign Language', ['KENYA SIGN LANGUAGE']]
  ];

  function normaliseGrade(value) {
    let g = String(value || '').toUpperCase().replace(/[–—]/g, '-').replace(/\s/g, '');
    g = g.replace(/^A\+$/, 'A');
    return GRADE_RE.test(g) ? g : '';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[c]);
  }

  function parseKCSEData(text) {
    const raw = String(text || '').replace(/\r/g, '\n');
    const lines = raw.split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const flat = lines.join(' ');
    const data = { name:'', indexNumber:'', school:'', year:'', subjects:[], grades:{}, overallGrade:'', confidence:'review' };

    const namePatterns = [
      /(?:CANDIDATE\s+)?NAME\s*[:\-]?\s*([A-Z][A-Z .'-]{4,})(?=\s+(?:INDEX|SCHOOL|CENTRE|CENTER|YEAR|SEX|GENDER|MEAN|SUBJECT|DATE)\b)/i,
      /CANDIDATE\s*[:\-]?\s*([A-Z][A-Z .'-]{4,})(?=\s+(?:INDEX|SCHOOL|CENTRE|YEAR)\b)/i
    ];
    for (const re of namePatterns) {
      const m = flat.match(re);
      if (m) { data.name = m[1].replace(/\s+/g,' ').trim(); break; }
    }

    const indexMatch = flat.match(/(?:INDEX|CANDIDATE\s*NO|INDEX\s*NO)\s*(?:NUMBER|NO\.?|#)?\s*[:\-]?\s*(\d{8,12})/i);
    if (indexMatch) data.indexNumber = indexMatch[1];

    const yearMatch = flat.match(/(?:EXAMINATION\s+)?YEAR\s*[:\-]?\s*(20\d{2})/i) || flat.match(/\b(20\d{2})\b/);
    if (yearMatch) data.year = yearMatch[1];

    const schoolMatch = flat.match(/(?:SCHOOL|CENTRE|CENTER)\s*(?:NAME)?\s*[:\-]?\s*([A-Z0-9 &'().-]{3,}?)(?=\s+(?:INDEX|CANDIDATE|YEAR|SEX|GENDER|MEAN|SUBJECT|DATE)\b)/i);
    if (schoolMatch) data.school = schoolMatch[1].trim();

    const meanMatch = flat.match(/(?:MEAN\s+GRADE|OVERALL\s+GRADE|AGGREGATE\s+GRADE)\s*[:\-]?\s*([A-E]\s*[+\-]?)/i);
    if (meanMatch) data.overallGrade = normaliseGrade(meanMatch[1]);

    const found = new Map();
    const subjectByCode = new Map(SUBJECTS.filter(x => /^\d{3}$/.test(x[0])).map(x => [x[0], x]));
    const aliases = [];
    SUBJECTS.forEach(item => item[2].forEach(alias => aliases.push({ alias, name:item[1], code:item[0] })));
    aliases.sort((a,b) => b.alias.length-a.alias.length);

    function addSubject(name, grade, code) {
      const g = normaliseGrade(grade);
      if (!name || !g) return;
      const key = name.toLowerCase();
      if (!found.has(key)) found.set(key, { name, grade:g, code:code || '' });
    }

    for (const line of lines) {
      const upper = line.toUpperCase().replace(/[|]/g,'I');
      // Typical KCSE rows: 101 ENGLISH B+; ENGLISH  B+; 101 B+
      const codeMatch = upper.match(/\b(\d{3})\b/);
      if (codeMatch && subjectByCode.has(codeMatch[1])) {
        const item = subjectByCode.get(codeMatch[1]);
        const gradeMatch = upper.match(/\b(A\s*[+\-]?|B\s*[+\-]?|C\s*[+\-]?|D\s*[+\-]?|E)\b/);
        if (gradeMatch) addSubject(item[1], gradeMatch[1], item[0]);
      }
      for (const item of aliases) {
        const escaped = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g,'\\s+');
        const re = new RegExp('(?:^|[^A-Z])' + escaped + '(?:[^A-Z]|$)', 'i');
        if (!re.test(upper)) continue;
        const gradeMatch = upper.match(/\b(A\s*[+\-]?|B\s*[+\-]?|C\s*[+\-]?|D\s*[+\-]?|E)\b/);
        if (gradeMatch) { addSubject(item.name, gradeMatch[1], item.code); break; }
      }
    }

    // Table OCR sometimes separates subject and grade into adjacent columns.
    // Only use explicit known subject labels, never arbitrary words next to a grade.
    data.subjects = Array.from(found.values()).map(x => x.name);
    data.grades = {};
    found.forEach(x => { data.grades[x.name] = x.grade; });

    // Do not manufacture a KCSE mean grade by averaging subject grades.
    // KNEC mean grade depends on the official subject aggregation rules.
    data.subjectCount = data.subjects.length;
    data.extractionStatus = data.subjectCount >= 5 && data.overallGrade ? 'review' : 'incomplete';
    return data;
  }

  function displayKCSEData(data) {
    const container = document.getElementById('kcse_extracted_data');
    if (!container) return;
    const gradeOptions = ['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'];
    const subjectRows = (data.subjects || []).map((subject, index) => {
      const grade = data.grades && data.grades[subject] || '';
      return '<tr><td><input class="kcse-edit-subject" data-index="' + index + '" value="' + escapeHtml(subject) + '" aria-label="Subject name"></td>' +
        '<td><select class="kcse-edit-grade" data-index="' + index + '" aria-label="Grade for ' + escapeHtml(subject) + '">' +
        '<option value="">Select</option>' + gradeOptions.map(g => '<option value="' + g + '"' + (g === grade ? ' selected' : '') + '>' + g + '</option>').join('') +
        '</select></td></tr>';
    }).join('');

    container.innerHTML =
      '<div class="kcse-smart-review">' +
        '<div class="kcse-review-heading"><div><strong>Extracted KCSE results</strong><small>Check every field against the original certificate before saving.</small></div><span class="kcse-review-tag">OCR REVIEW</span></div>' +
        '<div class="kcse-meta-grid">' +
          '<label>Candidate name<input id="kcse-edit-name" value="' + escapeHtml(data.name) + '" placeholder="Not detected"></label>' +
          '<label>Index number<input id="kcse-edit-index" value="' + escapeHtml(data.indexNumber) + '" placeholder="Not detected"></label>' +
          '<label>School / examination centre<input id="kcse-edit-school" value="' + escapeHtml(data.school) + '" placeholder="Not detected"></label>' +
          '<label>Examination year<input id="kcse-edit-year" inputmode="numeric" value="' + escapeHtml(data.year) + '" placeholder="YYYY"></label>' +
          '<label class="kcse-mean-field">Official mean grade<select id="kcse-edit-mean"><option value="">Not detected — select after checking</option>' +
            gradeOptions.map(g => '<option value="' + g + '"' + (g === data.overallGrade ? ' selected' : '') + '>' + g + '</option>').join('') +
          '</select></label>' +
        '</div>' +
        '<div class="kcse-subject-table-wrap"><table class="kcse-subject-table"><thead><tr><th>SUBJECT</th><th>GRADE</th></tr></thead><tbody>' +
          (subjectRows || '<tr><td colspan="2" class="kcse-empty">No subject-grade pairs confidently detected. Please check the scan or enter results manually.</td></tr>') +
        '</tbody></table></div>' +
        '<div class="kcse-review-actions"><button type="button" class="kcse-save-edits" onclick="saveKCSEExtractionEdits()"><i class="fas fa-check"></i> Save corrected results</button><span id="kcse-edit-feedback" role="status"></span></div>' +
      '</div>';

    const styleId = 'kcse-smart-extraction-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #kcse_extracted_data .kcse-smart-review{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:10px}
        #kcse_extracted_data .kcse-review-heading{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:13px}
        #kcse_extracted_data .kcse-review-heading strong{display:block;color:#17324d;font-size:1rem}
        #kcse_extracted_data .kcse-review-heading small{display:block;color:#64748b;font-size:.74rem;margin-top:3px}
        #kcse_extracted_data .kcse-review-tag{font-size:.63rem;font-weight:800;letter-spacing:.06em;background:#fff4d6;color:#946200;border:1px solid #f4dda0;padding:5px 8px;border-radius:20px}
        #kcse_extracted_data .kcse-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        #kcse_extracted_data .kcse-meta-grid label{display:block;font-size:.72rem;font-weight:700;color:#475569}
        #kcse_extracted_data .kcse-meta-grid input,#kcse_extracted_data .kcse-meta-grid select{display:block;width:100%;margin-top:5px;min-height:40px;padding:8px 10px;border:1px solid #d8e1eb;border-radius:9px;background:#fff;color:#172b49;box-sizing:border-box}
        #kcse_extracted_data .kcse-mean-field{grid-column:1/-1}
        #kcse_extracted_data .kcse-subject-table-wrap{overflow-x:auto;margin-top:13px;background:#fff;border:1px solid #e5eaf0;border-radius:10px}
        #kcse_extracted_data .kcse-subject-table{width:100%;border-collapse:collapse;min-width:250px}
        #kcse_extracted_data .kcse-subject-table th{text-align:left;font-size:.7rem;color:#64748b;padding:10px;border-bottom:1px solid #e5eaf0}
        #kcse_extracted_data .kcse-subject-table td{padding:7px 10px;border-bottom:1px solid #f0f2f5}
        #kcse_extracted_data .kcse-subject-table input,#kcse_extracted_data .kcse-subject-table select{width:100%;min-height:38px;border:1px solid #dbe3ec;border-radius:8px;padding:7px;background:#fff;box-sizing:border-box}
        #kcse_extracted_data .kcse-subject-table td:last-child{width:100px}
        #kcse_extracted_data .kcse-empty{color:#b45309;font-size:.78rem;padding:15px!important}
        #kcse_extracted_data .kcse-review-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}
        #kcse_extracted_data .kcse-save-edits{border:0;border-radius:9px;background:#eab308;color:#fff;font-weight:800;padding:10px 14px;cursor:pointer}
        #kcse_extracted_data #kcse-edit-feedback{font-size:.75rem;color:#087443}
        @media(max-width:520px){#kcse_extracted_data .kcse-meta-grid{grid-template-columns:1fr}#kcse_extracted_data .kcse-mean-field{grid-column:auto}}
      `;
      document.head.appendChild(style);
    }
  }

  function saveKCSEExtractionEdits() {
    const data = window.kcseDataExtracted || (typeof kcseDataExtracted !== 'undefined' ? kcseDataExtracted : null);
    if (!data) return;
    data.name = document.getElementById('kcse-edit-name')?.value.trim() || '';
    data.indexNumber = document.getElementById('kcse-edit-index')?.value.trim() || '';
    data.school = document.getElementById('kcse-edit-school')?.value.trim() || '';
    data.year = document.getElementById('kcse-edit-year')?.value.trim() || '';
    data.overallGrade = document.getElementById('kcse-edit-mean')?.value || '';
    const rows = Array.from(document.querySelectorAll('#kcse_extracted_data .kcse-subject-table tbody tr'));
    const subjects = [];
    const grades = {};
    rows.forEach(row => {
      const name = row.querySelector('.kcse-edit-subject')?.value.trim();
      const grade = row.querySelector('.kcse-edit-grade')?.value;
      if (name && grade) { subjects.push(name); grades[name] = grade; }
    });
    data.subjects = subjects;
    data.grades = grades;
    data.subjectCount = subjects.length;
    data.extractionStatus = 'reviewed';
    if (typeof validateKCSEAgainstProgram === 'function') validateKCSEAgainstProgram(data);
    const feedback = document.getElementById('kcse-edit-feedback');
    if (feedback) feedback.textContent = 'Corrections saved for this application.';
    if (typeof updateSummary === 'function') updateSummary();
    if (typeof saveApplication === 'function' && typeof currentStep !== 'undefined') {
      Promise.resolve(saveApplication(currentStep)).catch(err => console.warn('KCSE correction autosave failed', err));
    }
  }

  window.parseKCSEData = parseKCSEData;
  window.displayKCSEData = displayKCSEData;
  window.saveKCSEExtractionEdits = saveKCSEExtractionEdits;
  console.info('NCHSM KCSE smart extraction enhancement loaded');
})();