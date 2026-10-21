/**
 * Phase J Feature Verification Test Suite
 * Covers:
 * 1. Staff Authentication & Scoped Authorization
 * 2. FEAT-002: Academic Structure (Centres, Batches, Subjects) CRUD
 * 3. FEAT-001: Student Bulk CSV Ingestion & Roster Export (RFC 4180)
 * 4. FEAT-003: Question Bank In-Place Editing, Deletion & Paper Cascade Safety
 * 5. FEAT-08A: Digital Noticeboard Broadcast Management
 */

const BASE_URL = 'http://127.0.0.1:8000';

async function run() {
  console.log('=================================================================');
  console.log('🚀 RUNNING PHASE J VERTICAL SLICE FEATURE VERIFICATION SUITE');
  console.log('=================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // STEP 1: Staff Authentication
  // -------------------------------------------------------------
  console.log('[STEP 1] Authenticating Staff User:');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sdom: 'ezexamqwertyuiop',
      username: 'ezexam@yopmail.com',
      password: 'qwertyuiop'
    })
  });
  const loginData = await loginRes.json();
  assert(loginData.login_status === 'OK', 'Staff login succeeds with status OK');
  const token = loginData.token;
  assert(typeof token === 'string' && token.length > 20, 'Bearer token acquired');

  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  // -------------------------------------------------------------
  // STEP 2: Academic Structure CRUD (FEAT-002)
  // -------------------------------------------------------------
  console.log('\n[STEP 2] FEAT-002: Academic Structure (Centres, Batches, Subjects):');
  
  // 2a. Fetch academic structure
  const acadRes = await fetch(`${BASE_URL}/staff/academic_structure`, {
    headers: authHeaders
  });
  const acadData = await acadRes.json();
  assert(acadData.status === 'SUCCESS', 'GET /staff/academic_structure returns SUCCESS');
  assert(Array.isArray(acadData.centres), 'Centres list returned');
  assert(Array.isArray(acadData.branches), 'Batches/branches list returned');
  assert(Array.isArray(acadData.subjects), 'Subjects list returned');

  // 2b. Add new centre
  const testCentreName = 'East Campus Test ' + Date.now();
  const addCentreRes = await fetch(`${BASE_URL}/staff/add_edit_centre`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testCentreName })
  });
  const addCentreData = await addCentreRes.json();
  assert(addCentreData.status === 'SUCCESS', `Added centre '${testCentreName}'`);

  const acadAfterAddCentre = await (await fetch(`${BASE_URL}/staff/academic_structure`, { headers: authHeaders })).json();
  assert(acadAfterAddCentre.centres.some(c => c.name === testCentreName), 'New centre verified in academic structure list');

  // 2c. Delete test centre
  const delCentreRes = await fetch(`${BASE_URL}/staff/add_edit_centre`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_centre: testCentreName, delete_centre: true })
  });
  const delCentreData = await delCentreRes.json();
  assert(delCentreData.status === 'SUCCESS', `Deleted centre '${testCentreName}'`);

  const acadAfterDelCentre = await (await fetch(`${BASE_URL}/staff/academic_structure`, { headers: authHeaders })).json();
  assert(!acadAfterDelCentre.centres.some(c => c.name === testCentreName), 'Deleted centre successfully removed');

  // 2d. Add and delete branch / batch
  const testBatchName = 'Olympiad-Batch-' + Date.now();
  await fetch(`${BASE_URL}/staff/add_edit_class`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testBatchName })
  });
  const acadAfterAddBatch = await (await fetch(`${BASE_URL}/staff/academic_structure`, { headers: authHeaders })).json();
  assert(acadAfterAddBatch.branches.some(b => b.name === testBatchName), 'New batch verified in academic structure list');

  await fetch(`${BASE_URL}/staff/add_edit_class`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_class: testBatchName, delete_class: true })
  });
  const acadAfterDelBatch = await (await fetch(`${BASE_URL}/staff/academic_structure`, { headers: authHeaders })).json();
  assert(!acadAfterDelBatch.branches.some(b => b.name === testBatchName), 'Deleted batch successfully removed');

  // 2e. Add and delete subject
  const testSubjName = 'Astronomy-' + Date.now();
  await fetch(`${BASE_URL}/staff/add_edit_subj`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testSubjName })
  });
  const acadAfterAddSubj = await (await fetch(`${BASE_URL}/staff/academic_structure`, { headers: authHeaders })).json();
  assert(acadAfterAddSubj.subjects.some(s => s.name === testSubjName), 'New subject verified in academic structure list');

  await fetch(`${BASE_URL}/staff/add_edit_subj`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_subj_name: testSubjName, delete_subj: true })
  });
  const acadAfterDelSubj = await (await fetch(`${BASE_URL}/staff/academic_structure`, { headers: authHeaders })).json();
  assert(!acadAfterDelSubj.subjects.some(s => s.name === testSubjName), 'Deleted subject successfully removed');

  // -------------------------------------------------------------
  // STEP 3: Student Bulk CSV Ingestion & Roster Export (FEAT-001)
  // -------------------------------------------------------------
  console.log('\n[STEP 3] FEAT-001: Student Bulk CSV Ingestion & Roster Export:');
  
  const timestamp = Date.now();
  const testStudent1Email = `candidate_test1_${timestamp}@artix.local`;
  const testStudent2Email = `candidate_test2_${timestamp}@artix.local`;
  const csvContent = [
    'Name,Roll Number,Email,Phone,Branch,Centre',
    `Alice Test,ROLL-A-${timestamp},${testStudent1Email},9876543210,JEE-Main,Main Campus`,
    `Bob Test,ROLL-B-${timestamp},${testStudent2Email},9876543211,NEET-UG,North Annex`
  ].join('\n');

  // 3a. Ingest CSV with overwrite=false
  const formData = new FormData();
  formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'students_test.csv');
  formData.append('overwrite', 'false');

  const csvImportRes = await fetch(`${BASE_URL}/staff/add_studs_csv`, {
    method: 'POST',
    headers: authHeaders,
    body: formData
  });
  const csvImportData = await csvImportRes.json();
  assert(csvImportData.status === 'SUCCESS', 'POST /staff/add_studs_csv returns SUCCESS');
  assert(csvImportData.imported_count >= 2, `Imported ${csvImportData.imported_count} new students`);

  // 3b. Ingest CSV again with overwrite=true and updated names
  const updatedCsvContent = [
    'Name,Roll Number,Email,Phone,Branch,Centre',
    `Alice Test Updated,ROLL-A-${timestamp},${testStudent1Email},9876543210,JEE-Main,Main Campus`,
    `Bob Test Updated,ROLL-B-${timestamp},${testStudent2Email},9876543211,NEET-UG,North Annex`
  ].join('\n');

  const formDataOverwrite = new FormData();
  formDataOverwrite.append('file', new Blob([updatedCsvContent], { type: 'text/csv' }), 'students_test.csv');
  formDataOverwrite.append('overwrite', 'true');

  const csvUpdateRes = await fetch(`${BASE_URL}/staff/add_studs_csv`, {
    method: 'POST',
    headers: authHeaders,
    body: formDataOverwrite
  });
  const csvUpdateData = await csvUpdateRes.json();
  assert(csvUpdateData.status === 'SUCCESS', 'Overwrite CSV import returns SUCCESS');
  assert(csvUpdateData.updated_count >= 2, `Updated ${csvUpdateData.updated_count} existing students`);

  // 3c. Export student roster CSV
  const rosterRes = await fetch(`${BASE_URL}/staff/download_studs`, {
    headers: authHeaders
  });
  assert(rosterRes.status === 200, 'GET /staff/download_studs returns 200 OK');
  const contentType = rosterRes.headers.get('content-type') || '';
  assert(contentType.includes('text/csv'), `Content-Type header is text/csv (was ${contentType})`);
  const contentDisp = rosterRes.headers.get('content-disposition') || '';
  assert(contentDisp.includes('attachment') && contentDisp.includes('.csv'), `Content-Disposition header specifies attachment (was ${contentDisp})`);

  const rosterCsv = await rosterRes.text();
  assert(rosterCsv.includes('Alice Test Updated') && rosterCsv.includes(testStudent1Email), 'Exported CSV contains updated test student A');
  assert(rosterCsv.includes('Bob Test Updated') && rosterCsv.includes(testStudent2Email), 'Exported CSV contains updated test student B');

  // -------------------------------------------------------------
  // STEP 4: Question Bank Editing, Deletion & Safety (FEAT-003)
  // -------------------------------------------------------------
  console.log('\n[STEP 4] FEAT-003: Question Editing, Deletion & Cascade Safety:');

  // 4a. Create a dedicated test paper with a question to test edit & delete safely
  const createPaperRes = await fetch(`${BASE_URL}/staff/add_qpap`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Paper For Deletion ' + timestamp,
      subjects: 'Physics',
      type: 'CBT',
      mins: 30
    })
  });
  const createPaperData = await createPaperRes.json();
  assert(createPaperData.status === 'SUCCESS' && !!createPaperData.qpap_id, 'Created temporary test question paper');
  const tempPaperId = createPaperData.qpap_id;

  // Add a test question to this paper
  const addQRes = await fetch(`${BASE_URL}/staff/add_qstn`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qpap_id: tempPaperId,
      qtxt: 'Temporary Question Alpha',
      type: 'MCQ',
      subj: 'Physics',
      cmk: 4,
      imk: -1,
      options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
      key: 'Opt B'
    })
  });
  const addQData = await addQRes.json();
  assert(addQData.status === 'SUCCESS' && !!addQData.question_id, 'Added question to test paper');
  const tempQId = addQData.question_id;

  // 4b. Fetch question papers to find our newly created paper and question
  const qpapsRes = await fetch(`${BASE_URL}/staff/get_qpaps`, {
    method: 'POST',
    headers: authHeaders
  });
  const qpapsData = await qpapsRes.json();
  const createdPaper = (qpapsData.qpaps || []).find(p => p.Id === tempPaperId);
  assert(!!createdPaper, 'Found created question paper in staff repository');
  const targetQuestion = createdPaper && createdPaper.questions ? createdPaper.questions.find(q => q.id === tempQId) : null;
  assert(!!targetQuestion, 'Found target question in paper');

  if (targetQuestion) {
    // 4c. In-place edit question
    const updatedTxt = 'Updated Question Text by Phase J ' + timestamp;
    const updateRes = await fetch(`${BASE_URL}/staff/update_qstn`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qid: targetQuestion.id,
        qtxt: updatedTxt,
        type: 'MCQ',
        subj: 'Physics',
        cmk: 5.0,
        imk: -1.5,
        options: ['New 1', 'New 2', 'New 3', 'New 4'],
        key: 'New 3'
      })
    });
    const updateData = await updateRes.json();
    assert(updateData.status === 'SUCCESS', 'POST /staff/update_qstn returned SUCCESS');

    // Verify update
    const verifyQRes = await (await fetch(`${BASE_URL}/staff/get_qpaps`, { method: 'POST', headers: authHeaders })).json();
    const refreshedPaper = (verifyQRes.qpaps || []).find(p => p.Id === createdPaper.Id);
    const refreshedQ = refreshedPaper ? refreshedPaper.questions.find(q => q.id === targetQuestion.id) : null;
    assert(refreshedQ && refreshedQ.qtxt === updatedTxt, 'Question text accurately modified in database');
    assert(refreshedQ && refreshedQ.cmk === 5.0, 'Question correct marks updated to 5.0');
    assert(refreshedQ && refreshedQ.imk === -1.5, 'Question incorrect marks updated to -1.5');
    assert(refreshedQ && refreshedQ.key === 'New 3', 'Question answer key updated to "New 3"');

    // 4d. Delete question
    const delQRes = await fetch(`${BASE_URL}/staff/del_qstn`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ qid: targetQuestion.id })
    });
    const delQData = await delQRes.json();
    assert(delQData.status === 'SUCCESS', 'POST /staff/del_qstn returned SUCCESS');

    const verifyAfterDelQ = await (await fetch(`${BASE_URL}/staff/get_qpaps`, { method: 'POST', headers: authHeaders })).json();
    const paperAfterDelQ = (verifyAfterDelQ.qpaps || []).find(p => p.Id === createdPaper.Id);
    assert(paperAfterDelQ && !paperAfterDelQ.questions.some(q => q.id === targetQuestion.id), 'Deleted question removed from question paper');
  }

  // 4e. Cascade safety: Attempt to delete paper 1 (which is linked to active exam 1)
  const safeDelRes = await fetch(`${BASE_URL}/staff/del_qpap`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ qpap_id: 1 })
  });
  const safeDelData = await safeDelRes.json();
  assert(safeDelData.status === 'FAILED', 'Active question paper deletion rejected with status FAILED');
  assert(safeDelData.error && safeDelData.error.includes('referenced by active exam'), 'Rejection error message cites active exam reference');

  // 4f. Delete the unused disposable paper
  if (createdPaper) {
    const delPaperRes = await fetch(`${BASE_URL}/staff/del_qpap`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ qpap_id: createdPaper.Id })
    });
    const delPaperData = await delPaperRes.json();
    assert(delPaperData.status === 'SUCCESS', 'Unused temporary paper deleted successfully');
  }

  // -------------------------------------------------------------
  // STEP 5: Digital Noticeboard Broadcast (FEAT-08A)
  // -------------------------------------------------------------
  console.log('\n[STEP 5] FEAT-08A: Digital Noticeboard Broadcast:');

  const noticeTitle = 'Verification Notice ' + timestamp;
  const noticeContent = 'Notice content published during Phase J test execution.';

  // 5a. Post notice
  const addNoticeRes = await fetch(`${BASE_URL}/staff/add_notice`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: noticeTitle,
      content: noticeContent,
      target_branch: 'JEE-Main',
      target_centre: 'Main Campus'
    })
  });
  const addNoticeData = await addNoticeRes.json();
  assert(addNoticeData.status === 'SUCCESS', 'POST /staff/add_notice returned SUCCESS');

  // 5b. Retrieve notices
  const noticesRes = await fetch(`${BASE_URL}/staff/get_notices`, {
    headers: authHeaders
  });
  const noticesData = await noticesRes.json();
  assert(noticesData.status === 'SUCCESS', 'GET /staff/get_notices returned SUCCESS');
  const publishedNotice = (noticesData.notices || []).find(n => n.title === noticeTitle);
  assert(!!publishedNotice, 'Published notice found in active notices feed');
  assert(publishedNotice && publishedNotice.content === noticeContent, 'Notice content matches published text');

  // 5c. Delete notice
  if (publishedNotice) {
    const delNoticeRes = await fetch(`${BASE_URL}/staff/del_notice`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notice_id: publishedNotice.id })
    });
    const delNoticeData = await delNoticeRes.json();
    assert(delNoticeData.status === 'SUCCESS', 'POST /staff/del_notice returned SUCCESS');

    const noticesAfterDel = await (await fetch(`${BASE_URL}/staff/get_notices`, { headers: authHeaders })).json();
    assert(!noticesAfterDel.notices.some(n => n.id === publishedNotice.id), 'Deleted notice removed from notices feed');
  }

  // -------------------------------------------------------------
  // STEP 6: Candidate Submissions & Absentee Tracking (FEAT-004)
  // -------------------------------------------------------------
  console.log('\n[STEP 6] FEAT-004: Candidate Submissions & Absentee Tracking:');

  // 6a. Retrieve submissions for exam 1
  const submRes = await fetch(`${BASE_URL}/staff/get_subm`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ onexid: 1 })
  });
  const submData = await submRes.json();
  assert(submData.status === 'SUCCESS', 'POST /staff/get_subm returned SUCCESS');
  assert(typeof submData.num_subm === 'number', `Submissions count returned (${submData.num_subm})`);
  assert(Array.isArray(submData.subm), 'Submissions attempt array returned');

  // 6b. Export absentees for exam 1
  const absRes = await fetch(`${BASE_URL}/staff/get_absentees`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ onexid: 1 })
  });
  assert(absRes.status === 200, 'POST /staff/get_absentees returns 200 OK');
  const absContentType = absRes.headers.get('content-type') || '';
  assert(absContentType.includes('text/csv'), `Absentee Content-Type header is text/csv (was ${absContentType})`);
  const absDisposition = absRes.headers.get('content-disposition') || '';
  assert(absDisposition.includes('attachment') && absDisposition.includes('absentees_exam_1.csv'), `Absentee Content-Disposition specifies absentees_exam_1.csv (was ${absDisposition})`);

  const absCsvText = await absRes.text();
  assert(absCsvText.startsWith('Name,Roll Number,Email,Phone,Branch,Centre'), 'Absentee CSV output begins with correct RFC 4180 header row');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(`📊 PHASE J VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('✅ ALL PHASE J FEATURE SPECIFICATIONS & CONTRACTS VERIFIED!');
  } else {
    console.error(`❌ ${totalTests - passedTests} TESTS FAILED`);
    process.exit(1);
  }
  console.log('=================================================================\n');
}

run().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
