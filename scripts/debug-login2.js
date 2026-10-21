const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const CAPTURES = path.join(__dirname, '..', 'captures');

(async () => {
  const b = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox'],
  });

  const p = await b.newPage();

  // Intercept at request level to see exact POST body and response body
  await p.setRequestInterception(true);
  p.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('ezexam.in/login')) {
      console.log('POST BODY:', req.postData());
    }
    req.continue();
  });

  p.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('ezexam.in/login')) {
      const text = await res.text().catch(() => '');
      console.log('RESPONSE STATUS:', res.status());
      console.log('RESPONSE HEADERS:', JSON.stringify(res.headers()));
      // Look for error messages in HTML response
      const errMatch = text.match(/(error|invalid|incorrect|wrong|not found|password)[^<]{0,200}/gi);
      if (errMatch) console.log('ERROR HINTS:', errMatch.slice(0, 5));
      // Save full response
      fs.writeFileSync(path.join(CAPTURES, 'login_response.html'), text);
      console.log('Full response saved to captures/login_response.html');
    }
  });

  await p.goto('https://ezexam.in/login', { waitUntil: 'networkidle2' });

  // Get the CSRF token
  const csrfToken = await p.evaluate(function() {
    return document.querySelector('[name=csrfmiddlewaretoken]') ?
      document.querySelector('[name=csrfmiddlewaretoken]').value :
      document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
  });
  console.log('CSRF token:', csrfToken);

  // Try using fetch directly with the proper CSRF token
  const result = await p.evaluate(async function(csrf) {
    const body = new URLSearchParams();
    body.set('csrfmiddlewaretoken', csrf);
    body.set('sdom', 'ezexamqwertyuiop');
    body.set('username', 'ezexam@yopmail.com');
    body.set('password', 'qwertyuiop');
    body.set('next', '');

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    });
    return { status: res.status, redirected: res.redirected, url: res.url, type: res.type };
  }, csrfToken);

  console.log('Fetch result:', JSON.stringify(result));
  await b.close();
})();
