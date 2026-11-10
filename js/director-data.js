/* Executive data gateway: all Director writes are constrained by Supabase RLS and audit triggers. */
(function(w){
'use strict';
const TABLES={
 profiles:'consolidated_user_profiles_table',marks:'student_marks',exams:'exams',cats:'cats_exams',
 attempts:'exam_attempts',proctoring:'exam_proctoring_logs',attendance:'attendance',
 attendanceLogs:'attendance_logs',submissions:'lecturer_report_submissions',courses:'courses',
 programs:'programs',units:'units_catalog',registrations:'student_unit_registrations',
 sessions:'scheduled_sessions',calendar:'calendar_events',research:'research_submissions',
 finance:'finance_student_accounts',payments:'fee_payments',resources:'resources',
 transcripts:'transcript_verification_registry',messages:'messages',notifications:'notifications',
 tickets:'support_tickets',staff:'staff_records',enrollments:'enrollments',studentCourses:'student_courses'
};
const cache={};
const EDITABLE_FIELDS={programs:['program_code','program_name','category','program_type','duration_months','total_credits','status'],courses:['course_name','description','target_program','target_semester','status','code','block','intake_year','unit_code'],units:['unit_code','unit_name','program','block','term','year','unit_type','credits','status','hours','assessment_type'],calendar:['title','description','event_date','target_block','target_intake_year','event_name','type','target_program','venue','start_time','end_time','organizer','location'],sessions:['session_type','title','session_date','program_type','intake_year','block_term','session_time','session_title','target_program','session_end_time','approval_status','status','is_active','unit_name','unit_code','course_name','block_display','target_block'],registrations:['status','completion_status','completed_at','total_score','grade'],submissions:['title','summary','status','reviewed_at'],resources:['title','program_type','intake','block','allow_download','target_program','category','description','resource_type','term','approval_status','unit_name','unit_code'],research:['title','submission_type','status','reviewed_at'],exams:['title','exam_name','target_program','intake_year','block','exam_type','exam_date'],cats:['title','exam_name','target_program','intake_year','block_term','exam_type','exam_date']};
/* Private communications remain withheld pending a dedicated executive-safe projection. */
const RLS_BLOCKED=new Set(['messages','tickets']);
/* Explicit allow-list: never select password hashes, bank details, national IDs, auth tokens,
   proctoring images, raw IP/device identifiers, transcript tokens or document storage paths. */
const SELECT_FIELDS={
 profiles:'user_id,full_name,role,department,program,program_type,admission_number,intake_year,block,current_block,status,created_at',
 marks:'id,student_id,student_name,admission_number,program,block,subject_name,assessment_type,final_score,grade,final_grade,final_status,points,approval_status,published,published_at,created_at,submitted_at',
 exams:'id,title,exam_name,target_program,intake_year,block,exam_type,exam_date,status,approval_status,is_published,created_at',
 cats:'id,title,exam_name,target_program,intake_year,block_term,exam_type,exam_date,status,created_at',
 attempts:'id,exam_id,student_id,attempt_number,status,is_retake,started_at,submitted_at,score,percentage,grade,total_marks,created_at',
 proctoring:'id,exam_id,student_id,event_type,details,timestamp,is_read,exam_name,student_name,student_reg_number,severity,student_program',
 attendanceLogs:'id,student_id,exam_id,event_type,details,timestamp,created_at',
 attendance:'id,student_id,class_id,timestamp,date,status,course_or_rotation,session_type,marked_by',
 submissions:'id,lecturer_user_id,lecturer_name,report_type,report_category,document_type,title,summary,unit_name,subject_code,program,block,academic_year,week_number,status,submitted_at,reviewed_at,approved_at',
 courses:'id,course_name,description,created_at,target_program,target_semester,status,code,block,intake_year,unit_code',
 programs:'id,program_code,program_name,category,program_type,duration_months,total_credits,status,created_at,updated_at',
 units:'id,unit_code,unit_name,program,block,term,year,unit_type,credits,status,created_at,updated_at,hours,assessment_type',
 registrations:'id,student_id,admission_number,unit_code,unit_name,program,block,reg_type,status,approval_date,submitted_date,academic_year,term,created_at,updated_at,credits,intake_year,completion_status,completed_at,total_score,grade',
 sessions:'id,session_type,title,session_date,program_type,intake_year,block_term,session_time,session_title,target_program,session_end_time,approval_status,status,is_active,unit_name,unit_code,course_name,block_display,target_block',
 calendar:'id,title,description,event_date,target_block,target_intake_year,created_at,event_name,type,target_program,venue,start_time,end_time,organizer,location',
 research:'id,student_id,research_group_id,version_number,title,submission_type,supervisor_name,status,reviewed_at,submitted_at,created_at,updated_at',
 payments:'id,student_id,amount,payment_method,reference,payment_date,period,receipt_no,created_at',
 resources:'id,file_name,title,program_type,created_at,uploaded_by_name,intake,block,allow_download,target_program,category,course_name,file_size,file_type,description,resource_type,pastpaper_year,exam_type,term,approval_status,approved_at,unit_name,unit_code',
 transcripts:'id,student_id,student_name,program,document_type,status,issued_at,transcript_number,transcript_block',
 notifications:'id,title,is_read,created_at,message_type,subject,target_program,read_at',
 staff:'id,title,first_name,other_names,department,designation,email,program,status,created_at,updated_at',
 enrollments:'id,student_id,course_id,enrolled_at,unit_catalog_id',
 studentCourses:'id,student_id,course_id,status,created_at,unit_catalog_id'
};
async function read(client,key,{limit=250,order='created_at',ascending=false,filters=[]}={}){
 const table=TABLES[key];if(!table)throw new Error('Unknown institutional dataset: '+key);
 if(RLS_BLOCKED.has(key))throw new Error(table+' is restricted from the Director workspace.');
 const fields=SELECT_FIELDS[key];if(!fields)throw new Error(table+' has no approved Director field projection.');
 limit=Math.max(1,Math.min(Number(limit)||250,1000));
 let q=client.from(table).select(fields);
 filters.forEach(f=>{if(f.op==='eq')q=q.eq(f.column,f.value);else if(f.op==='in')q=q.in(f.column,f.value);else if(f.op==='gte')q=q.gte(f.column,f.value);else if(f.op==='lte')q=q.lte(f.column,f.value);});
 if(order&&fields.split(',').includes(order))q=q.order(order,{ascending,nullsFirst:false});
 q=q.limit(limit);
 const{data,error}=await q;if(error)throw new Error(table+': '+error.message);
 cache[key]=Array.isArray(data)?data:[];return cache[key];
}
const SAFE_COUNT_FILTERS={
 profiles:new Set(['role','program','department','status']),
 exams:new Set(['status','approval_status','is_published','target_program','program_type']),
 marks:new Set(['published','approval_status','program','block','final_status']),
 submissions:new Set(['status','program','report_type','report_category','academic_year']),
 attendance:new Set(['status','date','session_type']),
 finance:new Set(['payment_status','program','program_type','account_status','intake_year']),
 cats:new Set(['status','exam_type','target_program','program_type']),
 attempts:new Set(['status','is_retake']),
 transcripts:new Set(['status','document_type','program'])
};
async function count(client,key,filters=[]){
 const table=TABLES[key];if(!table)throw new Error('Unknown dataset');
 if(RLS_BLOCKED.has(key)||!SAFE_COUNT_FILTERS[key])throw new Error(table+' has no approved Director-safe count query.');
 let q=client.from(table).select('id',{count:'exact',head:true});
 filters.forEach(f=>{if(!SAFE_COUNT_FILTERS[key].has(f.column))throw new Error('Unsupported count filter for '+table+': '+f.column);if(f.op==='eq')q=q.eq(f.column,f.value);else if(f.op==='in')q=q.in(f.column,f.value);else throw new Error('Unsupported count filter operation: '+f.op);});
 const{count,error}=await q;if(error)throw new Error(table+': '+error.message);return count||0;
}

async function financeSummary(client){const{data,error}=await client.rpc('director_finance_summary');if(error)throw new Error('Finance summary: '+error.message);return Array.isArray(data)?data[0]||null:data||null;}
async function update(client,key,row,changes){const table=TABLES[key],allowed=EDITABLE_FIELDS[key];if(!table||!allowed)throw new Error('Editing is not enabled for this dataset.');const id=row&&row.id;if(id===undefined||id===null)throw new Error('This record has no safe update identifier.');const payload={};Object.entries(changes||{}).forEach(([k,v])=>{if(!allowed.includes(k))throw new Error('Field is not editable: '+k);payload[k]=v===''?null:v;});if(!Object.keys(payload).length)throw new Error('No changes to save.');const{data,error}=await client.from(table).update(payload).eq('id',id).select(SELECT_FIELDS[key]).single();if(error)throw new Error(table+': '+error.message);return data;}
w.DirectorData={TABLES,SELECT_FIELDS,EDITABLE_FIELDS,read,count,financeSummary,update,cache,RLS_BLOCKED};
})(window);
