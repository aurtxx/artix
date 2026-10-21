/**
 * EZexam Full Authenticated Crawler — Phase 1 (Fixed)
 * Uses correct CSRF + session cookie flow.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'https://ezexam.in';
const CAPTURES = path.join(__dirname, '..', 'captures');
const SCREENSHOTS = path.join(CAPTURES, 'screenshots');
const DOM_DIR = path.join(CAPTURES, 'dom');

fs.mkdirSync(SCREENSHOTS, { recursive: true });
fs.mkdirSync(DOM_DIR, { recursive: true });

const networkLog = [];
const visitedUrls = new Set();
const discoveredRoutes = [];

function slug(url) {
  return url.replace(/https?:\/\/[^/]+/, '').replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').slice(0, 80) || 'root';
}

function extractShape(val, depth = 0) {
  if (depth > 3) return '...';
  if (val === null) return 'null';
  if (Array.isArray(val)) return val.length > 0 ? [extractShape(val[0], depth + 1)] : [];
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val).slice(0, 25)) out[k] = extractShape(val[k], depth + 1);
    return out;
  }
  return typeof val;
}

function isIgnored(url) {
  return url.includes('google-analytics') || url.includes('googleapis') ||
    url.includes('doubleclick') || url.includes('gtm') || url.includes('s3.amazonaws') ||
    url.endsWith('.css') || url.endsWith('.js') || url.endsWith('.woff') ||
    url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.svg');
}

async function domSnapshot(page) {
  return page.evaluate(function() {
    var forms = Array.from(document.querySelectorAll('form')).map(function(f) {
      return {
        id: f.id, action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(function(i) {
          return { tag: i.tagName, type: i.type || null, name: i.name || null, id: i.id || null, placeholder: i.placeholder || null };
        })
      };
    });
    var links = Array.from(document.querySelectorAll('a[href]'))
      .map(function(a) { return { text: (a.innerText || '').trim().slice(0, 60), href: a.href }; })
      .filter(function(a) { return a.href.startsWith('http') && a.text; });
    var tables = Array.from(document.querySelectorAll('table')).map(function(t) {
      return {
        headers: Array.from(t.querySelectorAll('th')).map(function(th) { return th.innerText.trim(); }),
        rowCount: t.querySelectorAll('tr').length,
      };
    });
    var buttons = Array.from(document.querySelectorAll('button,input[type=button],input[type=submit]'))
      .map(function(b) { return { text: ((b.innerText || b.value || '')).trim().slice(0, 60), type: b.type || null }; })
      .filter(function(b) { return b.text; });
    var headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(function(h) { return h.innerText.trim(); }).filter(Boolean);
    var nav = Array.from(document.querySelectorAll('nav a, .nav a, .sidebar a, .menu a, .sidenav a, li a'))
      .map(function(a) { return { text: (a.innerText || '').trim().slice(0, 60), href: a.href }; })
      .filter(function(a) { return a.text && a.href && a.href.startsWith('http'); });
    var textContent = document.body.innerText.slice(0, 2000);
    return { forms, links, tables, buttons, headings, nav, textContent };
  });
}

async function visitAndCapture(page, url, label) {
  if (visitedUrls.has(url)) return null;
  visitedUrls.add(url);

  // Only stay on ezexam.in domain
  if (!url.startsWith(BASE_URL)) return null;

  console.log('\n→ [' + label + '] ' + url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(function(r) { setTimeout(r, 1500); });

    const finalUrl = page.url();
    const title = await page.title();
    console.log('  Title: "' + title + '" | Final: ' + finalUrl);

    if (!finalUrl.startsWith(BASE_URL)) {
      console.log('  Redirected off-domain, skipping.');
      return null;
    }

    const ssFile = path.join(SCREENSHOTS, slug(finalUrl) + '.png');
    await page.screenshot({ path: ssFile, fullPage: true });
    console.log('  Screenshot: ' + ssFile);

    const dom = await domSnapshot(page);
    fs.writeFileSync(
      path.join(DOM_DIR, slug(finalUrl) + '.json'),
      JSON.stringify({ url: finalUrl, title, label, ...dom }, null, 2)
    );

    discoveredRoutes.push({ url: finalUrl, title, label });
    return { finalUrl, dom };
  } catch (err) {
    console.log('  ERROR: ' + err.message);
    return null;
  }
}

(async () => {
  console.log('=== EZexam Phase 1: Full Authenticated Crawl ===\n');

  const b = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await b.newPage();

  // Capture API network traffic
  page.on('response', async function(res) {
    try {
      const req = res.request();
      const type = req.resourceType();
      const url = req.url();
      if (!['xhr', 'fetch', 'document'].includes(type)) return;
      if (isIgnored(url)) return;

      const status = res.status();
      const ct = res.headers()['content-type'] || '';
      let body = null;
      if (ct.includes('application/json') || ct.includes('text/plain')) {
        try { body = await res.json(); } catch { body = await res.text().catch(function() { return null; }); }
      }

      networkLog.push({
        ts: new Date().toISOString(),
        method: req.method(),
        url,
        status,
        post: req.postData() || null,
        shape: body !== null ? extractShape(body) : null,
        rawSample: typeof body === 'string' ? body.slice(0, 200) : null,
      });

      if (ct.includes('application/json') || req.method() !== 'GET') {
        console.log('  [API] ' + req.method() + ' ' + status + ' ' + url.replace(BASE_URL, ''));
      }
    } catch (e) {}
  });

  // ─── Step 1: Load login page and get fresh CSRF cookie ────────────────────
  console.log('Step 1: Getting CSRF token...');
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle2' });
  const initCookies = await page.cookies();
  const csrfToken = initCookies.find(function(c) { return c.name === 'csrftoken'; })?.value || '';
  console.log('  CSRF: ' + csrfToken.slice(0, 12) + '...');

  // ─── Step 2: POST login via in-page fetch with proper session ─────────────
  console.log('Step 2: Logging in via page.evaluate fetch...');
  const loginResult = await page.evaluate(async function(csrf) {
    var body = new URLSearchParams({
      csrfmiddlewaretoken: csrf,
      sdom: 'ezexamqwertyuiop',
      username: 'ezexam@yopmail.com',
      password: 'qwertyuiop',
      next: ''
    });
    try {
      var res = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': csrf,
        },
        body: body.toString(),
        credentials: 'include',
      });
      var data = await res.json().catch(function() { return null; });
      return { status: res.status, data };
    } catch(e) {
      return { error: e.message };
    }
  }, csrfToken);

  console.log('  Login result:', JSON.stringify(loginResult));

  if (!loginResult?.data?.login_status || loginResult.data.login_status !== 'OK') {
    console.log('  Login failed. Trying username field instead of email...');
    const loginResult2 = await page.evaluate(async function(csrf) {
      var body = new URLSearchParams({
        csrfmiddlewaretoken: csrf,
        sdom: 'ezexamqwertyuiop',
        username: 'ezexamqwertyuiop',
        password: 'qwertyuiop',
        next: ''
      });
      var res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrf },
        body: body.toString(),
        credentials: 'include',
      });
      var data = await res.json().catch(function() { return null; });
      return { status: res.status, data };
    }, csrfToken);
    console.log('  Login result 2:', JSON.stringify(loginResult2));
  }

  // ─── Step 3: Navigate to redirect URL (session now set) ──────────────────
  const redirectPath = loginResult?.data?.redirect || 'home';
  const homeUrl = BASE_URL + '/' + redirectPath;
  console.log('\nStep 3: Navigating to authenticated home: ' + homeUrl);

  await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  const postLoginUrl = page.url();
  const postLoginTitle = await page.title();
  console.log('  Post-login URL: ' + postLoginUrl);
  console.log('  Title: ' + postLoginTitle);
  await page.screenshot({ path: path.join(SCREENSHOTS, '00_authenticated_home.png'), fullPage: true });

  // Save session cookies
  const sessionCookies = await page.cookies();
  fs.writeFileSync(path.join(CAPTURES, 'session_cookies.json'), JSON.stringify(sessionCookies, null, 2));
  console.log('  Session cookies: ' + sessionCookies.map(function(c) { return c.name; }).join(', '));

  // ─── Step 4: Systematically crawl all known routes ──────────────────────
  console.log('\nStep 4: Crawling known routes...');

  // First get nav links from current page
  const homeDom = await domSnapshot(page);
  fs.writeFileSync(path.join(DOM_DIR, 'authenticated_home.json'), JSON.stringify({ url: postLoginUrl, title: postLoginTitle, ...homeDom }, null, 2));
  discoveredRoutes.push({ url: postLoginUrl, title: postLoginTitle, label: 'Authenticated Home' });
  visitedUrls.add(postLoginUrl);

  console.log('  Nav links found:', homeDom.nav.length);
  console.log('  Headings:', homeDom.headings.slice(0, 8));
  console.log('  Buttons:', homeDom.buttons.map(function(b) { return b.text; }).slice(0, 10));

  // Queue: nav links + standard guesses
  const toVisit = [];

  // Add all nav links first
  for (var nl of homeDom.nav) {
    if (nl.href && nl.href.startsWith(BASE_URL)) toVisit.push({ url: nl.href, label: 'Nav: ' + nl.text });
  }

  // Add all internal links from home
  for (var ll of homeDom.links) {
    if (ll.href && ll.href.startsWith(BASE_URL) && !visitedUrls.has(ll.href)) {
      toVisit.push({ url: ll.href, label: 'Link: ' + ll.text });
    }
  }

  // Add standard guesses
  const guesses = ['dashboard', 'home', 'exam', 'exams', 'test', 'tests', 'questions',
    'results', 'reports', 'profile', 'settings', 'students', 'users',
    'analytics', 'leaderboard', 'schedule', 'categories', 'packages',
    'exam/create', 'exam/list', 'question/bank', 'question/create',
    'admin', 'institute', 'notifications', 'payments', 'subscription'];
  for (var g of guesses) {
    toVisit.push({ url: BASE_URL + '/' + g, label: 'Guess: ' + g });
  }

  // Visit all
  for (var target of toVisit) {
    if (visitedUrls.has(target.url)) continue;
    const result = await visitAndCapture(page, target.url, target.label);
    if (result) {
      // Queue newly found internal links
      for (var link of (result.dom.nav || []).concat(result.dom.links || [])) {
        if (link.href && link.href.startsWith(BASE_URL) && !visitedUrls.has(link.href)) {
          toVisit.push({ url: link.href, label: 'Discovered: ' + link.text });
        }
      }
    }
  }

  // ─── Step 5: Save all output ──────────────────────────────────────────────
  console.log('\nStep 5: Saving all output files...');
  fs.writeFileSync(path.join(CAPTURES, 'network_records.jsonl'),
    networkLog.map(function(e) { return JSON.stringify(e); }).join('\n') + '\n'
  );
  fs.writeFileSync(path.join(CAPTURES, 'discovered_routes.json'), JSON.stringify(discoveredRoutes, null, 2));
  fs.writeFileSync(path.join(CAPTURES, 'visited_urls.json'), JSON.stringify(Array.from(visitedUrls), null, 2));

  await b.close();

  console.log('\n=== Phase 1 COMPLETE ===');
  console.log('Routes captured:    ' + discoveredRoutes.length);
  console.log('API calls logged:   ' + networkLog.filter(function(n) { return n.shape !== null; }).length);
  console.log('Screenshots saved:  ' + fs.readdirSync(SCREENSHOTS).length);
  console.log('Output dir:         ' + CAPTURES);
})();
