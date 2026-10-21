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

  p.on('response', async res => {
    const req = res.request();
    if (req.method() === 'POST' && !res.url().includes('google') && !res.url().includes('analytics')) {
      console.log('POST', res.status(), res.url(), 'location:', res.headers()['location'] || '-');
    }
  });

  await p.goto('https://ezexam.in/login', { waitUntil: 'networkidle2' });

  // Attempt 1: sdom=ezexamqwertyuiop, username=ezexam@yopmail.com, password=qwertyuiop
  await p.evaluate(function() {
    document.querySelector('input[name="sdom"]').value = 'ezexamqwertyuiop';
    document.querySelector('input[name="username"]').value = 'ezexam@yopmail.com';
    document.querySelector('input[name="password"]').value = 'qwertyuiop';
  });

  console.log('Attempt 1: submitting with email...');
  await Promise.all([
    p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
    p.evaluate(function() { document.querySelector('#login-form').submit(); })
  ]);

  const url1 = p.url();
  const title1 = await p.title();
  console.log('URL after attempt 1:', url1);
  console.log('Title:', title1);
  await p.screenshot({ path: path.join(CAPTURES, 'attempt1.png'), fullPage: true });

  if (url1.includes('/login')) {
    const err1 = await p.evaluate(function() {
      return document.querySelector('#login-error') ? document.querySelector('#login-error').innerText : 'no error';
    });
    console.log('Error 1:', err1);

    // Attempt 2: sdom=ezexamqwertyuiop, username=ezexamqwertyuiop, password=qwertyuiop
    await p.goto('https://ezexam.in/login', { waitUntil: 'networkidle2' });
    await p.evaluate(function() {
      document.querySelector('input[name="sdom"]').value = 'ezexamqwertyuiop';
      document.querySelector('input[name="username"]').value = 'ezexamqwertyuiop';
      document.querySelector('input[name="password"]').value = 'qwertyuiop';
    });
    console.log('Attempt 2: submitting with username as sdom...');
    await Promise.all([
      p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      p.evaluate(function() { document.querySelector('#login-form').submit(); })
    ]);
    const url2 = p.url();
    console.log('URL after attempt 2:', url2);
    console.log('Title:', await p.title());
    await p.screenshot({ path: path.join(CAPTURES, 'attempt2.png'), fullPage: true });

    if (url2.includes('/login')) {
      const err2 = await p.evaluate(function() {
        return document.querySelector('#login-error') ? document.querySelector('#login-error').innerText : 'no error';
      });
      console.log('Error 2:', err2);

      // Attempt 3: empty sdom (no institute), just email + password
      await p.goto('https://ezexam.in/login', { waitUntil: 'networkidle2' });
      await p.evaluate(function() {
        document.querySelector('input[name="sdom"]').value = '';
        document.querySelector('input[name="username"]').value = 'ezexam@yopmail.com';
        document.querySelector('input[name="password"]').value = 'qwertyuiop';
      });
      console.log('Attempt 3: empty sdom, email login...');
      await Promise.all([
        p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        p.evaluate(function() { document.querySelector('#login-form').submit(); })
      ]);
      const url3 = p.url();
      console.log('URL after attempt 3:', url3);
      console.log('Title:', await p.title());
      await p.screenshot({ path: path.join(CAPTURES, 'attempt3.png'), fullPage: true });

      const err3 = await p.evaluate(function() {
        return document.querySelector('#login-error') ? document.querySelector('#login-error').innerText : 'no error';
      });
      console.log('Error 3:', err3);
    }
  }

  // Log cookies regardless
  const cookies = await p.cookies();
  console.log('Cookies:', JSON.stringify(cookies.map(c => ({ name: c.name, value: c.value.slice(0, 30) })), null, 2));
  fs.writeFileSync(path.join(CAPTURES, 'cookies.json'), JSON.stringify(cookies, null, 2));

  await b.close();
  console.log('Done.');
})();
