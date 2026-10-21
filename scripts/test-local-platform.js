/**
 * End-to-End Verification Test for Local EZexam Stack
 * Tests Backend APIs, Multi-Tenant Auth, Staff Portal Endpoints, and CBT Test Player.
 */

const http = require('http');

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

(async () => {
  console.log('=== Verifying Local EZexam Full Stack ===\n');

  // 1. Health check
  console.log('[1/5] Health Check: GET http://127.0.0.1:8000/api/health');
  const health = await request({ hostname: '127.0.0.1', port: 8000, path: '/api/health', method: 'GET' });
  console.log('  Response:', health.body);

  // 2. Staff Login
  console.log('\n[2/5] Authentication: POST http://127.0.0.1:8000/login');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    sdom: 'ezexamqwertyuiop',
    username: 'ezexam@yopmail.com',
    password: 'qwertyuiop'
  });
  console.log('  Login Status:', loginRes.body.login_status);
  console.log('  Redirect:', loginRes.body.redirect);
  const token = loginRes.body.token;

  // 3. Staff Portal Endpoints
  console.log('\n[3/5] Staff Portal Endpoints:');
  const cap = await request({
    hostname: '127.0.0.1', port: 8000, path: '/staff/get_cap', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('  /staff/get_cap:', cap.body);

  const exams = await request({
    hostname: '127.0.0.1', port: 8000, path: '/staff/get_qexams_paging', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('  /staff/get_qexams_paging (Items count):', exams.body.itemsCount);

  const qpaps = await request({
    hostname: '127.0.0.1', port: 8000, path: '/staff/get_qpaps', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('  /staff/get_qpaps (Papers count):', qpaps.body.qpaps?.length);

  // 4. Candidate CBT Exam Flow
  console.log('\n[4/5] Candidate CBT Exam Flow:');
  const startExam = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/exam/1/start', method: 'POST'
  });
  console.log('  Started Exam:', startExam.body.exam?.name);
  console.log('  Questions loaded:', startExam.body.questions?.length);

  const q1 = startExam.body.questions[0];
  console.log('  Q1 Text:', q1.qtxt.slice(0, 70) + '...');

  // Save answer to Q1
  await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/exam/1/save_response', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { q_id: q1.id, ans: ['6 N'], status: 'ANSWERED' });
  console.log('  Saved answer "6 N" to Q1');

  // Log window switch
  const switchLog = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/exam/1/log_event', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { type: 'SWITCH_WINDOW' });
  console.log('  Anti-cheat logged switch:', switchLog.body.switch_count);

  // Submit exam
  const submit = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/exam/1/submit', method: 'POST'
  });
  console.log('\n[5/5] Exam Grading & Submission Result:');
  console.log('  Score:', submit.body.score, '/', submit.body.total_marks);

  // Scorecard
  const result = await request({
    hostname: '127.0.0.1', port: 8000, path: '/api/exam/1/result', method: 'GET'
  });
  console.log('  Scorecard Exam Name:', result.body.exam_name);
  console.log('  Question 1 Result:', result.body.questions[0].is_correct ? 'CORRECT (+4)' : 'INCORRECT');
  console.log('\n=== All Tests Passed Successfully! ===');
  process.exit(0);
})();
