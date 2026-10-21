const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const CAPTURES = path.join(__dirname, '..', 'captures');
fs.mkdirSync(CAPTURES, { recursive: true });

(async () => {
  const b = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox'],
  });

  const p = await b.newPage();

  // 1. Load the login page and grab CSRF cookie
  await p.goto('https://ezexam.in/login', { waitUntil: 'networkidle2' });

  const cookies = await p.cookies();
  const csrf = cookies.find(c => c.name === 'csrftoken')?.value || '';
  console.log('CSRF cookie:', csrf);

  // 2. Use Node's built-in https to make the raw POST with proper headers
  const https = require('https');
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const postData = new URLSearchParams({
    csrfmiddlewaretoken: csrf,
    sdom: 'ezexamqwertyuiop',
    username: 'ezexam@yopmail.com',
    password: 'qwertyuiop',
    next: ''
  }).toString();

  const respText = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'ezexam.in',
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookieHeader,
        'X-CSRFToken': csrf,
        'Referer': 'https://ezexam.in/login',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://ezexam.in',
      }
    }, res => {
      console.log('HTTP STATUS:', res.statusCode);
      console.log('LOCATION:', res.headers['location'] || 'none');
      console.log('SET-COOKIE:', res.headers['set-cookie'] || 'none');
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  fs.writeFileSync(path.join(CAPTURES, 'login_response.html'), respText);
  console.log('Response length:', respText.length);

  // Extract error hints from HTML
  const errorMatch = respText.match(/<p[^>]*id="login-error"[^>]*>([^<]*)<\/p>/);
  console.log('Login error element:', errorMatch ? errorMatch[1] : 'not found');

  // Check if there's a session cookie set
  const allText = respText.slice(0, 1000);
  console.log('Response snippet:', allText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500));

  await b.close();
})();
