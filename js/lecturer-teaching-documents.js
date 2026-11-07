/* NCHSM Teaching Documents — single lecturer submission workflow.
 * Uses the existing lecturer_report_submissions table and lecturer-reports bucket.
 */
(function () {
  'use strict';
  const TABLE = 'lecturer_report_submissions';
  const ATTACHMENTS = 'lecturer_report_attachments';
  const BUCKET = 'lecturer-reports';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const db = () => window.lecturerDB?.supabase || window.supabaseClient || window.supabase || null;
  const profile = () => window.lecturerDB?.getCurrentUserProfile?.() || window.currentLecturerProfile || {};
  let state = { user:null, staffId:'', units:[], loading:false, documentRows:[] };
  const DOCUMENT_GROUPS = [["Teaching Preparation","teaching_preparation",[["Scheme of Work","scheme_of_work"],["Lesson Plan","lesson_plan"],["Course Outline","course_outline"],["Record of Work Covered","record_of_work"],["Teaching Timetable","teaching_timetable"],["Lesson Notes / Teaching Notes","lesson_notes"],["Instructional Materials / Teaching Aids","instructional_materials"],["Course Delivery Plan","course_delivery_plan"]]],["Teaching Delivery","teaching_delivery",[["Class Attendance Register","class_attendance_register"],["Clinical Teaching Attendance Register","clinical_attendance_register"],["Clinical Supervision Report","clinical_supervision_report"],["Clinical Rotation Plan","clinical_rotation_plan"],["Clinical Logbook Verification Report","clinical_logbook_verification"],["Teaching Practice / Skills Demonstration Report","skills_demonstration_report"],["Student Participation Record","student_participation_record"]]],["Assessment & Examinations","assessment_examinations",[["Assessment Plan","assessment_plan"],["CAT 1","cat_1"],["CAT 2","cat_2"],["Practical Exam 1","practical_exam_1"],["Practical Exam 2","practical_exam_2"],["Practical Exam 3","practical_exam_3"],["Examination Question Paper","examination_question_paper"],["Examination Marking Scheme","marking_scheme"],["Examination Moderation Report","examination_moderation_report"],["Marked Scripts / Assessment Evidence","marked_scripts_evidence"],["Marks Analysis Report","marks_analysis_report"],["Remedial Teaching Report","remedial_teaching_report"],["Student Academic Progress Report","student_academic_progress_report"]]],["Student Support","student_support",[["Student Academic Advising Report","academic_advising_report"],["Mentorship Record","mentorship_record"],["Remedial and Follow-up Register","remedial_followup_register"],["Student Consultation Record","student_consultation_record"],["Academic Intervention Report","academic_intervention_report"]]],["Quality Assurance","quality_assurance",[["Course Evaluation Report","course_evaluation_report"],["Student Feedback Report","student_feedback_report"],["Peer Teaching Observation Report","peer_teaching_observation"],["Lecturer Self-Evaluation Report","lecturer_self_evaluation"],["Curriculum Review Recommendation","curriculum_review_recommendation"]]],["Professional Development","professional_development",[["CPD Certificate","cpd_certificate"],["Professional Development Plan","professional_development_plan"],["Research and Publication Evidence","research_publication_evidence"]]]];
  const DOCUMENT_META = Object.fromEntries(DOCUMENT_GROUPS.flatMap(([category,key,items]) => items.map(([label,type]) => [type,{label,category,categoryKey:key}])));
  const GROUP_BY_KEY = Object.fromEntries(DOCUMENT_GROUPS.map(([category,key])=>[key,category]));

  function toast(message, error=false) {
    if (typeof window.showToast === 'function') return window.showToast(message, error);
    const node=document.createElement('div'); node.textContent=message;
    node.style.cssText='position:fixed;right:16px;bottom:16px;z-index:100000;background:'+(error?'#991b1b':'#166534')+';color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 8px 25px #0003';
    document.body.appendChild(node); setTimeout(()=>node.remove(),3500);
  }
  function yearNow(){const y=new Date().getFullYear();return y+'/'+(y+1);}
  function statusLabel(status){
    if(['submitted','under_review','resubmitted'].includes(status)) return 'Pending';
    if(status==='approved') return 'Approved';
    if(['returned','rejected'].includes(status)) return 'Revision Required';
    return String(status||'Pending').replace(/_/g,' ');
  }
  function statusColor(status){
    if(status==='approved') return '#047857';
    if(['returned','rejected'].includes(status)) return '#b45309';
    return '#2563eb';
  }
  async function resolveIdentity(){
    const client=db(); if(!client) throw new Error('Database connection is unavailable.');
    const p=profile();
    let authUser=p.user_id||p.id||null;
    if(client.auth?.getUser){const result=await client.auth.getUser();if(result.error)throw result.error;authUser=result.data?.user?.id||authUser;state.user=result.data?.user||null;}
    if(!authUser) throw new Error('Your lecturer login could not be verified. Please sign in again.');
    const name=String(p.full_name||p.name||state.user?.user_metadata?.full_name||'').trim();
    if(!name) throw new Error('Your lecturer profile name is unavailable.');
    const staffCandidate=String(p.staff_id||p.staffId||'').trim();
    const assignmentFields='id,subject_name,subject_code,block,program,academic_year,lecturer_id,lecturer_name';
    let assignmentData=[];
    if(staffCandidate){
      const byId=await client.from('lecturer_subject_assignments').select(assignmentFields).eq('lecturer_id',staffCandidate);
      if(byId.error)throw byId.error;
      assignmentData=byId.data||[];
    }
    if(!assignmentData.length){
      // Match straight and curly apostrophes consistently, then verify the normalized full name.
      const namePattern=name.replace(/[’‘']/g,'_');
      const byName=await client.from('lecturer_subject_assignments').select(assignmentFields).ilike('lecturer_name',namePattern);
      if(byName.error)throw byName.error;
      const normalize=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[’‘']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
      const target=normalize(name);
      assignmentData=(byName.data||[]).filter(row=>normalize(row.lecturer_name)===target);
    }
    state.units=assignmentData.filter(row=>row.subject_name||row.subject_code);
    const staffIds=[...new Set(state.units.map(row=>String(row.lecturer_id||'').trim()).filter(Boolean))];
    state.staffId=String(staffCandidate||staffIds[0]||'').trim();
    if(!state.units.length) throw new Error('No units are currently assigned to your lecturer profile. Contact the HOD if this is incorrect.');
    if(!state.staffId) throw new Error('Your staff ID could not be matched to the assigned units.');
    return {client,authUser,name,p};
  }
  function render(selectedType){
    const mount=$('ap-content'); if(!mount)return;
    const unitOptions=state.units.map((u,i)=>'<option value="'+i+'">'+esc((u.subject_code?u.subject_code+' — ':'')+(u.subject_name||u.subject_code))+(u.block?' · '+esc(u.block):'')+'</option>').join('');
    mount.innerHTML=`
      <style>
        #ap-content .tds-wrap{max-width:1050px;margin:0 auto;color:#172033}
        #ap-content .tds-hero{padding:24px;border-radius:18px;background:linear-gradient(125deg,#102f50,#174d72);color:#fff;margin-bottom:18px}
        #ap-content .tds-hero h2{margin:0 0 7px;font-size:23px}#ap-content .tds-hero p{margin:0;color:#dbeafe;font-size:13px}
        #ap-content .tds-card{background:#fff;border:1px solid #e2e8f0;border-radius:15px;padding:20px;margin-bottom:16px;box-shadow:0 5px 20px #0f172a08}
        #ap-content .tds-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
        #ap-content .tds-field label{display:block;font-size:12px;font-weight:800;color:#334155;margin:0 0 7px}
        #ap-content .tds-field select,#ap-content .tds-field input{width:100%;min-height:44px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#172033;font:inherit}
        #ap-content .tds-upload{border:1.5px dashed #94a3b8;border-radius:12px;padding:18px;background:#f8fafc}
        #ap-content .tds-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
        #ap-content .tds-btn{border:0;border-radius:9px;padding:11px 17px;font-weight:800;cursor:pointer}
        #ap-content .tds-primary{background:#0f4c75;color:#fff}#ap-content .tds-secondary{background:#e2e8f0;color:#334155}
        #ap-content .tds-table-wrap{overflow:auto}#ap-content .tds-table{width:100%;border-collapse:collapse;min-width:650px}
        #ap-content .tds-table th,#ap-content .tds-table td{text-align:left;padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top}
        #ap-content .tds-table th{background:#f8fafc;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
        #ap-content .tds-status{display:inline-block;padding:5px 9px;border-radius:20px;font-weight:800;font-size:10px}
        #ap-content .tds-muted{color:#64748b;font-size:12px}#ap-content .tds-message{display:none;padding:11px 13px;border-radius:9px;margin-top:13px;font-size:12px}
        #ap-content .tds-compliance-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 12px}
        #ap-content .tds-unit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:18px}
        #ap-content .tds-filterbar{display:grid;grid-template-columns:minmax(190px,2fr) repeat(3,minmax(130px,1fr)) auto;gap:9px;margin:12px 0 16px}#ap-content .tds-filterbar input,#ap-content .tds-filterbar select{width:100%;min-width:0;height:42px;border:1px solid #d4deea;border-radius:10px;padding:0 11px;background:#fff;color:#172033;font:inherit;font-size:13px}#ap-content .tds-filter-clear{border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;padding:0 13px;font-weight:700;color:#334155;cursor:pointer}#ap-content .tds-completed-folder{border:1px solid #bbdfcb;background:#f5fbf7;border-radius:15px;padding:12px;margin:12px 0 20px}#ap-content .tds-completed-toggle{width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;border:0;background:transparent;color:#166534;font-weight:800;padding:8px;cursor:pointer;text-align:left}@media(max-width:850px){#ap-content .tds-filterbar{grid-template-columns:1fr 1fr}}@media(max-width:520px){#ap-content .tds-filterbar{grid-template-columns:1fr}}

        #ap-content .tds-unit-card{background:linear-gradient(180deg,#fff,#fbfdff);border:1px solid #dbe4ef;border-radius:18px;padding:20px;box-shadow:0 8px 28px #1725540b;min-width:0;transition:transform .18s ease,box-shadow .18s ease}
        #ap-content .tds-unit-card:hover{transform:translateY(-2px);box-shadow:0 14px 34px #17255415}
        #ap-content .tds-unit-top h4{font-size:16px;line-height:1.35}
        #ap-content .tds-unit-percent{font-size:27px;letter-spacing:-1px}
        #ap-content .tds-unit-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
        #ap-content .tds-unit-meta span{font-size:10px;font-weight:700;padding:5px 9px;border-radius:30px;background:#eef2ff;color:#3730a3;border:1px solid #dbe3ff}
        #ap-content .tds-folder-btn{width:100%;margin-top:14px;padding:11px 13px;border:1px solid #d9e2ef;border-radius:10px;background:#f8fafc;color:#164e63;font-weight:800;cursor:pointer;text-align:left}
        #ap-content .tds-folder-btn:hover{background:#eff6ff;border-color:#93c5fd}
        .tds-modal-overlay{position:fixed;inset:0;z-index:100300;background:rgba(8,18,38,.68);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px}
        .tds-modal-panel{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 28px 90px #02061755}
        .tds-modal-head{padding:20px 22px;background:linear-gradient(120deg,#102f50,#1d5a7a);color:#fff;display:flex;justify-content:space-between;gap:14px;align-items:center}
        .tds-modal-head h3{margin:0;font-size:18px}
        .tds-modal-head p{margin:5px 0 0;color:#dbeafe;font-size:12px}
        .tds-modal-close{width:36px;height:36px;border:1px solid #ffffff55;border-radius:10px;background:#ffffff18;color:#fff;font-size:20px;cursor:pointer}
        .tds-modal-body{padding:20px 22px}
        .tds-modal-body #tdsFormCard{border:0;box-shadow:none;padding:0;margin:0}
        .tds-modal-body .tds-grid{grid-template-columns:1fr 1fr}
        .tds-modal-body .tds-actions{justify-content:flex-end}

        #ap-content .tds-unit-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        #ap-content .tds-unit-top h4{font-size:15px;margin:0;color:#172033}
        #ap-content .tds-unit-percent{font-size:25px;font-weight:900;color:#b91c1c;white-space:nowrap}
        #ap-content .tds-progress{height:8px;background:#e9edf3;border-radius:99px;overflow:hidden;margin:13px 0 6px}
        #ap-content .tds-progress span{display:block;height:100%;background:#078744;border-radius:99px}
        #ap-content .tds-check-row{display:grid;grid-template-columns:22px minmax(0,1fr) auto auto;gap:9px;align-items:center;padding:11px 0;border-top:1px solid #e2e8f0}
        #ap-content .tds-check-row:first-of-type{margin-top:10px}
        #ap-content .tds-check-name{font-size:13px;font-weight:700;color:#172033}
        #ap-content .tds-check-status{font-size:11px;border-radius:20px;padding:5px 9px;background:#fff4df;color:#9a5b00;white-space:nowrap}
        #ap-content .tds-check-status.approved{background:#e1f5eb;color:#047857}
        #ap-content .tds-check-status.pending{background:#eaf1ff;color:#1d4ed8}
        #ap-content .tds-check-action{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:7px 10px;color:#172554;font-weight:800;cursor:pointer}
        #ap-content .tds-check-action.add{background:#21105c;color:#fff;border-color:#21105c}
        @media(max-width:850px){#ap-content .tds-unit-grid{grid-template-columns:1fr}}
        @media(max-width:650px){#ap-content .tds-grid{grid-template-columns:1fr}#ap-content .tds-hero{padding:19px}#ap-content .tds-card{padding:14px}#ap-content .tds-check-row{grid-template-columns:20px minmax(0,1fr) auto}#ap-content .tds-check-row .tds-check-action{grid-column:2/4;justify-self:end}}
      </style>
      <div class="tds-wrap">
        <div class="tds-hero"><h2><i class="fas fa-file-arrow-up"></i> Submit Teaching Documents</h2><p>Submit teaching, assessment, student-support, quality-assurance and professional-development evidence for HOD review. Only your assigned units are available.</p></div>
        <div class="tds-compliance-head"><div><h3 style="margin:0;font-size:17px">Unit document compliance</h3><p class="tds-muted" style="margin:4px 0 0">Track required academic documents for every unit assigned to you.</p></div><span id="tdsComplianceCount" class="tds-muted">Loading unit checklist…</span></div>
        <div class="tds-filterbar"><input id="tdsUnitSearch" type="search" placeholder="Search unit code or name…"><select id="tdsUnitProgramFilter"><option value="">All programmes</option></select><select id="tdsUnitBlockFilter"><option value="">All blocks / terms</option></select><select id="tdsUnitStatusFilter"><option value="all">All units</option><option value="incomplete">In progress</option><option value="complete">Completed</option></select><button type="button" id="tdsClearFilters" class="tds-filter-clear">Clear filters</button></div><div id="tdsUnitCompliance" class="tds-unit-grid"><div class="tds-card tds-muted">Preparing your assigned unit checklists…</div></div><section id="tdsCompletedFolder" class="tds-completed-folder" hidden><button type="button" id="tdsCompletedToggle" class="tds-completed-toggle"><span>Completed units folder</span><span id="tdsCompletedCount">0 units</span><span id="tdsCompletedChevron">+</span></button><div id="tdsCompletedUnits" class="tds-unit-grid" hidden></div></section>
        <div id="tdsFormHome" style="display:none"></div><div class="tds-card" id="tdsFormCard">
          <form id="tdsForm">
            <div class="tds-grid">
              <div class="tds-field"><label for="tdsCategory">Document category</label><select id="tdsCategory" required></select></div><div class="tds-field"><label for="tdsType">Document type</label><select id="tdsType" required></select></div>
              <div class="tds-field"><label for="tdsUnit">Assigned unit</label><select id="tdsUnit" required><option value="">Loading assigned units…</option>${unitOptions}</select></div>
              <div class="tds-field"><label for="tdsYear">Academic year</label><input id="tdsYear" value="${yearNow()}" placeholder="2026/2027" required></div>
              <div class="tds-field"><label for="tdsTitle">Document title</label><input id="tdsTitle" placeholder="e.g. Scheme of Work — Block 2" required></div>
            </div>
            <div class="tds-field" style="margin-top:16px"><label for="tdsFile">Attach document</label><div class="tds-upload"><input id="tdsFile" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><div class="tds-muted" style="margin-top:7px">PDF or Word document · Maximum 20 MB</div></div></div>
            <div id="tdsMessage" class="tds-message" role="status"></div>
            <div class="tds-actions"><button id="tdsSubmit" class="tds-btn tds-primary" type="submit"><i class="fas fa-paper-plane"></i> Submit to HOD</button><button class="tds-btn tds-secondary" type="button" id="tdsRefresh"><i class="fas fa-rotate"></i> Refresh status</button></div>
          </form>
        </div>
        <div class="tds-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px"><div><h3 style="margin:0;font-size:16px">My submissions</h3><p class="tds-muted" style="margin:4px 0 0">Track decisions and read HOD feedback.</p></div><span id="tdsCount" class="tds-muted">Loading…</span></div>
          <div class="tds-table-wrap"><table class="tds-table"><thead><tr><th>Document</th><th>Unit</th><th>Academic year</th><th>Submitted</th><th>Status</th><th>HOD comments</th><th>File</th></tr></thead><tbody id="tdsRows"><tr><td colspan="7" class="tds-muted">Loading submissions…</td></tr></tbody></table></div>
        </div>
      </div>`;
    const categorySelect=$('tdsCategory'), typeSelect=$('tdsType');
    const selectedMeta=DOCUMENT_META[selectedType];
    const initialCategory=selectedMeta?.categoryKey || (GROUP_BY_KEY[selectedType] ? selectedType : 'teaching_preparation');
    categorySelect.innerHTML=DOCUMENT_GROUPS.map(([label,key])=>'<option value="'+key+'">'+esc(label)+'</option>').join('');
    categorySelect.value=initialCategory;
    function refreshDocumentTypes(preferred){
      const group=DOCUMENT_GROUPS.find(([,key])=>key===categorySelect.value);
      const selectedUnit=state.units[Number($('tdsUnit')?.value)];
      const isNursing=selectedUnit ? isNursingUnit(selectedUnit) : false;
      const tvetOnly=new Set(['cat_1','cat_2','practical_exam_1','practical_exam_2','practical_exam_3']);
      const items=(group?.[2]||[]).filter(([,type])=>!isNursing||!tvetOnly.has(type));
      typeSelect.innerHTML=items.map(([label,type])=>'<option value="'+type+'">'+esc(label)+'</option>').join('');
      if(preferred&&items.some(([,type])=>type===preferred))typeSelect.value=preferred;
    }
    refreshDocumentTypes(selectedType);
    categorySelect.addEventListener('change',()=>refreshDocumentTypes());
    const select=$('tdsUnit');
    if(select){select.innerHTML='<option value="">-- Select an assigned unit --</option>'+unitOptions;select.addEventListener('change',()=>refreshDocumentTypes());}
    $('tdsForm')?.addEventListener('submit',submit);
    $('tdsRefresh')?.addEventListener('click',loadRows);
    $('tdsFile')?.addEventListener('change',()=>{const f=$('tdsFile').files?.[0];if(f)$('tdsMessage').textContent=f.name+' · '+(f.size/1048576).toFixed(2)+' MB';});
    loadRows();
  }
  function message(text,isError=false){
    const el=$('tdsMessage');if(!el)return;el.style.display='block';el.style.background=isError?'#fef2f2':'#eff6ff';el.style.color=isError?'#991b1b':'#1d4ed8';el.textContent=text;
  }
  async function submit(event){
    event.preventDefault();if(state.loading)return;
    const client=db(),unitIndex=$('tdsUnit')?.value,file=$('tdsFile')?.files?.[0];
    if(unitIndex===''||!state.units[Number(unitIndex)])return message('Select one of your assigned units.',true);
    if(!file)return message('Attach a PDF or Word document before submitting.',true);
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(!['pdf','doc','docx'].includes(ext))return message('Only PDF, DOC and DOCX files are accepted.',true);
    if(file.size>20*1024*1024)return message('The document must be 20 MB or smaller.',true);
    const unit=state.units[Number(unitIndex)];
    const btn=$('tdsSubmit');state.loading=true;btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Submitting…';
    try{
      const identity=await resolveIdentity();
      const now=new Date(),academicYear=$('tdsYear').value.trim(),title=$('tdsTitle').value.trim();
      if(!academicYear||!title)throw new Error('Enter the academic year and document title.');
      const type=$('tdsType').value;
      const {data:row,error}=await client.from(TABLE).insert({
        lecturer_user_id:identity.authUser,lecturer_id:state.staffId,lecturer_email:identity.p.email||identity.user?.email||'',
        lecturer_name:identity.name,report_type:'TeachingLearningReport',report_category:DOCUMENT_META[type]?.category||'Teaching Preparation',
        document_type:type,title,document_title:title,summary:'Teaching document submitted for HOD review.',
        unit_name:unit.subject_name||unit.subject_code,subject_code:unit.subject_code||null,
        program:unit.program||identity.p.program||identity.p.department||'',
        block:unit.block||'all',class_block:unit.block||'all',academic_year:academicYear,
        period_start:now.toISOString().slice(0,10),period_end:now.toISOString().slice(0,10),
        recipient_role:'HOD',status:'submitted',submitted_at:now.toISOString(),updated_at:now.toISOString(),attachment_count:0
      }).select().single();
      if(error)throw error;
      const safeName=file.name.replace(/[^\w.\-]+/g,'_').slice(-150);
      const safeSegment=value=>String(value||'general').trim().replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'general';
      const programFolder=safeSegment(unit.program||identity.p.program||'general');
      const unitFolder=safeSegment(unit.subject_code||unit.subject_name||'unit');
      const yearFolder=safeSegment(academicYear);
      const blockFolder=safeSegment(unit.block||'unassigned_block');
      const typeFolder=safeSegment(type);
      const path=[identity.authUser,programFolder,unitFolder,yearFolder,blockFolder,typeFolder,row.id+'_'+Date.now()+'_'+safeName].join('/');
      const upload=await client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
      if(upload.error){await client.from(TABLE).delete().eq('id',row.id).eq('lecturer_user_id',identity.authUser);throw upload.error;}
      const meta=await client.from(ATTACHMENTS).insert({submission_id:row.id,uploaded_by:identity.authUser,file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size});
      if(meta.error)console.warn('[TeachingDocuments] Attachment metadata could not be recorded; storage path remains uploaded.',meta.error);
      const update=await client.from(TABLE).update({attachment_count:1,updated_at:new Date().toISOString()}).eq('id',row.id).eq('lecturer_user_id',identity.authUser);
      if(update.error)throw update.error;
      $('tdsForm').reset();$('tdsYear').value=yearNow();closeUploadModal();toast('Document submitted successfully to the HOD.');
      await loadRows();
    }catch(error){console.error('[TeachingDocuments] submission failed',error);message(error.message||'Submission failed. Please try again.',true);}
    finally{state.loading=false;btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit to HOD';}
  }
  const NURSING_DOCUMENTS = [
    ['Course outlines','course_outline'],['Schemes of work','scheme_of_work'],
    ['Records of work','record_of_work'],['Examination papers','examination_question_paper'],
    ['Marking schemes','marking_scheme'],['Marks sheets and examination results','marks_analysis_report'],
    ['CAT','cat_1']
  ];
  const TVET_DOCUMENTS = [
    ...NURSING_DOCUMENTS,
    ['Practical exam 1','practical_exam_1'],['Practical exam 2','practical_exam_2'],['Practical exam 3','practical_exam_3']
  ];
  function isNursingUnit(unit){return String(unit?.program||'').trim().toUpperCase()==='KRCHN';}

  function closeUploadModal(){
    const modal=$('tdsUploadModal'),card=$('tdsFormCard'),home=$('tdsFormHome');
    if(card&&home)home.appendChild(card);
    if(modal)modal.remove();
    document.body.style.overflow='';
  }
  function openUploadModal(unit,documentLabel){
    closeUploadModal();
    const modal=document.createElement('div');modal.id='tdsUploadModal';modal.className='tds-modal-overlay';
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Add academic document');
    const panel=document.createElement('section');panel.className='tds-modal-panel';
    const head=document.createElement('header');head.className='tds-modal-head';
    const heading=document.createElement('div');heading.innerHTML='<h3>Add '+esc(documentLabel||'academic document')+'</h3><p>'+esc(unit.subject_code||'')+' · '+esc(unit.subject_name||'')+' · '+esc(unit.program||'')+'</p>';
    const close=document.createElement('button');close.type='button';close.className='tds-modal-close';close.setAttribute('aria-label','Close');close.textContent='×';close.onclick=closeUploadModal;
    head.append(heading,close);
    const body=document.createElement('div');body.className='tds-modal-body';
    const card=$('tdsFormCard');if(card)body.appendChild(card);
    panel.append(head,body);modal.append(panel);
    modal.addEventListener('click',e=>{if(e.target===modal)closeUploadModal();});
    const key=e=>{if(e.key==='Escape'){closeUploadModal();document.removeEventListener('keydown',key);}};
    document.addEventListener('keydown',key);
    document.body.append(modal);document.body.style.overflow='hidden';
    setTimeout(()=>$('tdsFile')?.focus(),80);
  }
  function renderUnitCompliance(rows){
    const host=$('tdsUnitCompliance');if(!host)return;
    const units=state.units||[];
    $('tdsComplianceCount').textContent=units.length+' assigned unit(s)';
    if(!units.length){host.innerHTML='<div class="tds-card tds-muted">No assigned units were found.</div>';return;}
    const latest=(unit,type)=>rows.filter(r=>(r.subject_code||'')===(unit.subject_code||'')&&(r.unit_name||'')===(unit.subject_name||unit.subject_code||'')&&r.document_type===type).sort((a,b)=>new Date(b.submitted_at||b.created_at)-new Date(a.submitted_at||a.created_at))[0];
    host.innerHTML=units.map((unit,index)=>{
      const items=(isNursingUnit(unit)?NURSING_DOCUMENTS:TVET_DOCUMENTS).map(([label,type])=>({label,type,row:latest(unit,type)}));
      const approved=items.filter(x=>x.row?.status==='approved').length;
      const pct=Math.round(approved/items.length*100);
      const term=[unit.program,unit.block,unit.academic_year].filter(Boolean).join(' · ');
      return '<article class="tds-unit-card"><div class="tds-unit-top"><div><h4>'+esc(unit.subject_code||'UNIT')+' '+esc(unit.subject_name||'')+'</h4><div class="tds-unit-meta"><span>'+esc(unit.program||'Programme')+'</span><span>'+esc(unit.block||'Academic block/term')+'</span></div></div><div class="tds-unit-percent">'+pct+'%</div></div><div class="tds-progress"><span style="width:'+pct+'%"></span></div><div class="tds-muted">'+approved+' of '+items.length+' approved · '+(items.length-approved)+' outstanding</div>'+
      items.map(item=>{
        const row=item.row,status=row?.status||'not_submitted';
        const label=status==='approved'?'Approved':(['submitted','under_review','resubmitted'].includes(status)?'Pending':(['returned','rejected'].includes(status)?'Revision required':'Not submitted'));
        const cls=status==='approved'?'approved':(['submitted','under_review','resubmitted'].includes(status)?'pending':'');
        return '<div class="tds-check-row"><span style="font-size:18px;color:'+(status==='approved'?'#078744':'#c3ccd8')+'">'+(status==='approved'?'●':'○')+'</span><div><div class="tds-check-name">'+esc(item.label)+'</div><div class="tds-muted">'+(row?.submitted_at?'Submitted '+esc(new Date(row.submitted_at).toLocaleDateString()):'No submission yet')+'</div></div><span class="tds-check-status '+cls+'">'+label+'</span><button type="button" class="tds-check-action '+(!row?'add':'')+'" data-unit="'+index+'" data-type="'+item.type+'" data-submission="'+(row?.id||'')+'">'+(row?'Open':'Add')+'</button></div>';
      }).join('')+'<button type="button" class="tds-folder-btn" data-folder-unit="'+index+'">▰ Open '+(isNursingUnit(unit)?'Intake folder':'Course folder')+' <span style="float:right">→</span></button></article>';
    }).join('');
    host.querySelectorAll('[data-folder-unit]').forEach(button=>button.addEventListener('click',()=>{
      const unit=state.units[Number(button.dataset.folderUnit)];
      const docs=rows.filter(r=>(r.subject_code||'')===(unit.subject_code||'')&&(r.unit_name||'')===(unit.subject_name||unit.subject_code||''));
      openUnitFolder(unit,docs,isNursingUnit(unit)?'Intake folder':'Course folder');
    }));
    host.querySelectorAll('[data-unit][data-type]').forEach(button=>button.addEventListener('click',()=>{
      const unitIndex=Number(button.dataset.unit),unit=state.units[unitIndex];
      if(button.dataset.submission){openFile(button.dataset.submission);return;}
      $('tdsUnit').value=String(unitIndex);$('tdsType').value=button.dataset.type;
      const meta=DOCUMENT_META[button.dataset.type];if(meta){$('tdsCategory').value=meta.categoryKey;$('tdsType').value=button.dataset.type;}
      $('tdsTitle').value=(meta?.label||'Academic document')+' — '+(unit.subject_code||unit.subject_name);
      openUploadModal(unit,meta?.label||'Academic document');
    }));
  }
  function openUnitFolder(unit,docs,folderLabel){
    const old=$('tdsUnitFolderModal');if(old)old.remove();
    const modal=document.createElement('div');modal.id='tdsUnitFolderModal';
    modal.style.cssText='position:fixed;inset:0;z-index:100400;background:#0f172a99;display:flex;align-items:center;justify-content:center;padding:14px';
    const panel=document.createElement('section');panel.style.cssText='width:min(760px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px #0004';
    const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;gap:12px;align-items:center';
    const title=document.createElement('h3');title.textContent=folderLabel+' · '+(unit.subject_code||unit.subject_name);title.style.cssText='margin:0;font-size:18px';
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='tds-check-action';close.onclick=()=>modal.remove();head.append(title,close);
    const intro=document.createElement('p');intro.className='tds-muted';intro.textContent=(unit.program||'')+' · '+(unit.block||'')+' · '+(unit.academic_year||'')+' · '+docs.length+' document(s)';
    panel.append(head,intro);
    if(!docs.length){const empty=document.createElement('p');empty.className='tds-muted';empty.textContent='This folder is empty. Use Add beside a requirement to upload the first document.';panel.append(empty);}
    docs.forEach(doc=>{const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #e2e8f0';
      const info=document.createElement('div');const name=document.createElement('strong');name.textContent=doc.title||doc.document_title||DOCUMENT_META[doc.document_type]?.label||'Teaching document';const meta=document.createElement('div');meta.className='tds-muted';meta.textContent=statusLabel(doc.status)+' · '+(doc.submitted_at?new Date(doc.submitted_at).toLocaleDateString():'Not dated');info.append(name,meta);
      const open=document.createElement('button');open.type='button';open.className='tds-check-action';open.textContent='Open';open.onclick=()=>{modal.remove();openFile(doc.id);};row.append(info,open);panel.append(row);
    });
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});modal.append(panel);document.body.append(modal);
  }
  async function loadRows(){
    const tbody=$('tdsRows');if(!tbody)return;
    try{
      const identity=await resolveIdentity();
      const {data,error}=await identity.client.from(TABLE).select('id,title,document_title,document_type,unit_name,subject_code,program,block,academic_year,status,reviewer_comments,submitted_at,created_at,attachment_count').eq('lecturer_user_id',identity.authUser).order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      const rows=data||[];$('tdsCount').textContent=rows.length+' submission(s)';renderUnitCompliance(rows);
      if(!rows.length){tbody.innerHTML='<tr><td colspan="7" class="tds-muted">You have not submitted a teaching document yet.</td></tr>';return;}
      tbody.innerHTML=rows.map(row=>{
        const label=DOCUMENT_META[row.document_type]?.label||row.document_type||'Teaching document';
        const color=statusColor(row.status);
        return '<tr><td><strong>'+esc(row.title||row.document_title||label)+'</strong><div class="tds-muted">'+esc(label)+'</div></td><td>'+esc(row.unit_name||'—')+'</td><td>'+esc(row.academic_year||'—')+'</td><td>'+esc(row.submitted_at?new Date(row.submitted_at).toLocaleDateString():'—')+'</td><td><span class="tds-status" style="background:'+color+'18;color:'+color+'">'+esc(statusLabel(row.status))+'</span></td><td>'+esc(row.reviewer_comments||'—')+'</td><td>'+(Number(row.attachment_count)>0?'<button class="tds-btn tds-secondary" style="padding:6px 9px" type="button" data-file="'+esc(row.id)+'">Open</button>':'—')+'</td></tr>';
      }).join('');
      tbody.querySelectorAll('[data-file]').forEach(button=>button.addEventListener('click',()=>openFile(button.dataset.file)));
    }catch(error){console.error('[TeachingDocuments] load submissions failed',error);tbody.innerHTML='<tr><td colspan="7" style="color:#991b1b">Could not load submissions: '+esc(error.message||error)+'</td></tr>';$('tdsCount').textContent='Unavailable';}
  }
  function closeDocumentPreview(){
    const modal=$('tdsDocumentPreview');
    if(modal){modal.remove();document.body.style.overflow='';}
  }
  function showDocumentPreview(url,fileName){
    closeDocumentPreview();
    const ext=(String(fileName||'').split('.').pop()||'').toLowerCase();
    const isPdf=ext==='pdf';
    const modal=document.createElement('div');
    modal.id='tdsDocumentPreview';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Document preview');
    modal.style.cssText='position:fixed;inset:0;z-index:100500;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:clamp(6px,2vw,24px);';
    const panel=document.createElement('section');
    panel.style.cssText='width:min(1180px,100%);height:min(92vh,900px);background:#fff;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 25px 80px rgba(0,0,0,.35);';
    const header=document.createElement('header');
    header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap;';
    const title=document.createElement('strong');title.textContent=fileName||'Document preview';title.style.cssText='font-size:13px;color:#172033;overflow-wrap:anywhere;flex:1;min-width:120px;';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;align-items:center;';
    const download=document.createElement('a');download.href=url;download.target='_blank';download.rel='noopener';download.textContent='Download';download.style.cssText='padding:8px 12px;border-radius:8px;background:#e2e8f0;color:#334155;text-decoration:none;font-size:12px;font-weight:800;';
    const close=document.createElement('button');close.type='button';close.textContent='✕ Close';close.style.cssText='padding:8px 12px;border:0;border-radius:8px;background:#0f4c75;color:#fff;font-weight:800;cursor:pointer;';
    close.addEventListener('click',closeDocumentPreview);
    actions.append(download,close);header.append(title,actions);
    const frame=document.createElement('iframe');
    frame.title='Inline document preview';
    frame.style.cssText='display:block;width:100%;height:100%;flex:1;border:0;background:#f1f5f9;';
    frame.referrerPolicy='no-referrer';
    frame.allow='fullscreen';
    frame.src=isPdf?url:'https://docs.google.com/gview?embedded=1&url='+encodeURIComponent(url);
    const note=document.createElement('div');
    note.textContent=isPdf?'PDF preview':'Word document preview is provided by the embedded document viewer. If it does not load, use Download.';
    note.style.cssText='padding:7px 12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;background:#fff;';
    panel.append(header,frame,note);modal.append(panel);
    modal.addEventListener('click',event=>{if(event.target===modal)closeDocumentPreview();});
    const onKey=event=>{if(event.key==='Escape'){closeDocumentPreview();document.removeEventListener('keydown',onKey);}};
    document.addEventListener('keydown',onKey);
    document.body.append(modal);document.body.style.overflow='hidden';close.focus();
  }
  async function openFile(id){
    try{
      const identity=await resolveIdentity();
      const {data,error}=await identity.client.from(ATTACHMENTS).select('storage_path,file_name').eq('submission_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;
      let path=data?.storage_path||'';
      let fileName=data?.file_name||'Teaching document';
      if(!path){
        const row=await identity.client.from(TABLE).select('created_at,submitted_at,title,document_title').eq('id',id).eq('lecturer_user_id',identity.authUser).maybeSingle();
        fileName=row.data?.title||row.data?.document_title||fileName;
        const year=new Date(row.data?.created_at||row.data?.submitted_at||Date.now()).getFullYear();
        const prefixes=[identity.authUser+'/'+year+'/'+id,state.staffId+'/'+year+'/'+id].filter(Boolean);
        for(const prefix of prefixes){
          const listed=await identity.client.storage.from(BUCKET).list(prefix,{limit:30,sortBy:{column:'name',order:'desc'}});
          if(listed.error)throw listed.error;
          const item=(listed.data||[]).find(file=>file.name);
          if(item){path=prefix+'/'+item.name;fileName=item.name;break;}
        }
      }
      if(!path)throw new Error('No uploaded file was found for this submission.');
      const signed=await identity.client.storage.from(BUCKET).createSignedUrl(path,3600);
      if(signed.error)throw signed.error;
      showDocumentPreview(signed.data.signedUrl,fileName);
    }catch(error){toast(error.message||'Could not open document.',true);}
  }
  window.TeachingDocumentsSubmission={
    open:async function(type){
      const mount=$('ap-content');if(!mount)return;
      mount.innerHTML='<div style="padding:35px;text-align:center;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Loading your teaching documents…</div>';
      try{await resolveIdentity();render(type);}
      catch(error){mount.innerHTML='<div style="padding:30px;background:#fff;border:1px solid #fecaca;border-radius:14px;color:#991b1b"><strong>Teaching Documents unavailable</strong><p>'+esc(error.message||error)+'</p><button type="button" onclick="TeachingDocumentsSubmission.open()">Retry</button></div>';}
    },
    openCategory:function(categoryKey){return this.open(categoryKey);}
  };
})();
