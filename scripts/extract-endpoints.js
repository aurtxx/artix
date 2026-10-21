const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const b = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await b.newPage();
    await page.goto('https://ezexamqwertyuiop.ezexam.in/login');
    const cookies = await page.cookies();
    const csrf = cookies.find(c => c.name === 'csrftoken')?.value || '';

    await page.evaluate(async (token) => {
      const body = new URLSearchParams({
        csrfmiddlewaretoken: token,
        sdom: 'ezexamqwertyuiop',
        username: 'ezexam@yopmail.com',
        password: 'qwertyuiop',
        next: ''
      });
      await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': token },
        body: body.toString(),
        credentials: 'include'
      });
    }, csrf);

    await page.goto('https://ezexamqwertyuiop.ezexam.in/staff', { waitUntil: 'networkidle2' });
    const content = await page.content();
    fs.writeFileSync(path.join(__dirname, '..', 'captures', 'staff_page.html'), content);

    const regex = /['"](\/staff\/[a-zA-Z0-9_\-\/]+)['"]/g;
    const matches = new Set();
    let m;
    while ((m = regex.exec(content)) !== null) {
      matches.add(m[1]);
    }

    const scriptSrcs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
    );

    const result = {
      endpoints: Array.from(matches).sort(),
      scripts: scriptSrcs
    };

    fs.writeFileSync(path.join(__dirname, '..', 'captures', 'staff_endpoints_manifest.json'), JSON.stringify(result, null, 2));
    console.log('Endpoints found:', result.endpoints.length);
    console.log(result.endpoints);

    await b.close();
  } catch (err) {
    console.error('Extraction error:', err);
  }
})();
