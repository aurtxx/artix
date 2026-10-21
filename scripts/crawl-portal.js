/**
 * EZexam Phase 1 — Authenticated crawl on SUBDOMAIN portal
 * ezexamqwertyuiop.ezexam.in is the actual institute portal
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const PORTAL = 'https://ezexamqwertyuiop.ezexam.in';
const CAPTURES = path.join(__dirname, '..', 'captures');
const SCREENSHOTS = path.join(CAPTURES, 'screenshots');
const DOM_DIR = path.join(CAPTURES, 'dom');

fs.mkdirSync(SCREENSHOTS, { recursive: true });
fs.mkdirSync(DOM_DIR, { recursive: true });

const networkLog = [];
const discoveredRoutes = [];
const visitedUrls = new Set();

function slug(url) {
  return ('portal_' + url.replace(/https?:\/\/[^/]+/, ''))
    .replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').slice(0, 80) || 'portal_root';
}

function extractShape(val, depth) {
  depth = depth || 0;
  if (depth > 4) return '...';
  if (val === null) return 'null';
  if (Array.isArray(val)) return val.length > 0 ? [extractShape(val[0], depth + 1)] : [];
  if (typeof val === 'object') {
    var out = {};
    Object.keys(val).slice(0, 25).forEach(function(k) { out[k] = extractShape(val[k], depth + 1); });
    return out;
  }
  return typeof val;
}

function isJunk(url) {
  return url.includes('google') || url.includes('analytics') || url.includes('doubleclick') ||
    url.includes('amazonaws') || url.endsWith('.css') || url.endsWith('.woff') ||
    url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.ico');
}

async function domSnap(page) {
  return page.evaluate(function() {
    var forms = Array.from(document.querySelectorAll('form')).map(function(f) {
      return {
        id: f.id, action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(function(i) {
          return { tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, value: i.type !== 'password' ? i.value.slice(0, 50) : '***' };
        })
      };
    });
    var links = Array.from(document.querySelectorAll('a[href]'))
      .map(function(a) { return { text: (a.innerText || '').trim().slice(0, 80), href: a.href }; })
      .filter(function(a) { return a.href.startsWith('http') && a.text; });
    var tables = Array.from(document.querySelectorAll('table')).map(function(t) {
      return {
        id: t.id,
        headers: Array.from(t.querySelectorAll('th')).map(function(th) { return th.innerText.trim(); }),
        sampleRows: Array.from(t.querySelectorAll('tr')).slice(1, 4).map(function(tr) {
          return Array.from(tr.querySelectorAll('td')).map(function(td) { return td.innerText.trim().slice(0, 80); });
        }),
        rowCount: t.querySelectorAll('tr').length
      };
    });
    var buttons = Array.from(document.querySelectorAll('button,input[type=button],input[type=submit],.btn,.button'))
      .map(function(b) { return { text: ((b.innerText || b.value || '')).trim().slice(0, 80), id: b.id, cls: (b.className || '').split(' ').slice(0, 3).join(' ') }; })
      .filter(function(b) { return b.text; }).slice(0, 30);
    var headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(function(h) { return h.innerText.trim().slice(0, 100); }).filter(Boolean);
    var nav = Array.from(document.querySelectorAll('nav a,.nav a,.sidebar a,.sidenav a,.navbar a,.menu a,li > a'))
      .map(function(a) { return { text: (a.innerText || '').trim().slice(0, 60), href: a.href }; })
      .filter(function(a) { return a.text && a.href && a.href.startsWith('http'); })
      .filter(function(a, i, arr) { return arr.findIndex(function(x) { return x.href === a.href; }) === i; });
    var cards = Array.from(document.querySelectorAll('[class*="card"],[class*="stat"],[class*="widget"],[class*="count"]'))
      .map(function(el) { return el.innerText.trim().slice(0, 120); }).filter(Boolean).slice(0, 15);
    var selects = Array.from(document.querySelectorAll('select')).map(function(s) {
      return { name: s.name, id: s.id, options: Array.from(s.options).map(function(o) { return { value: o.value, text: o.text }; }).slice(0, 20) };
    });
    var text = document.body.innerText.slice(0, 5000);
    return { forms, links, tables, buttons, headings, nav, cards, selects, text };
  });
}

async function visit(page, url, label) {
  if (visitedUrls.has(url)) return null;
  visitedUrls.add(url);

  // Only stay within portal domain
  if (!url.startsWith(PORTAL) && !url.startsWith('https://ezexam.in')) return null;

  console.log('\n→ [' + label + ']\n  ' + url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(function(r) { setTimeout(r, 2000); });
    const finalUrl = page.url();
    const title = await page.title();
    console.log('  Title: "' + title + '" | ' + finalUrl);

    // Skip if bounced to login
    if (finalUrl.includes('/login') && !url.includes('/login')) {
      console.log('  [AUTH REQUIRED — skipping]');
      return null;
    }

    const ss = path.join(SCREENSHOTS, slug(finalUrl) + '.png');
    await page.screenshot({ path: ss, fullPage: true });

    const dom = await domSnap(page);
    fs.writeFileSync(path.join(DOM_DIR, slug(finalUrl) + '.json'), JSON.stringify({ url: finalUrl, title, label, ...dom }, null, 2));
    discoveredRoutes.push({ url: finalUrl, title, label });

    if (dom.headings.length) console.log('  Headings:', dom.headings.slice(0, 5));
    if (dom.tables.length) dom.tables.forEach(function(t) { console.log('  Table [' + (t.id || '?') + ']:', t.headers.join(' | ').slice(0, 120), '(' + t.rowCount + ' rows)'); });
    if (dom.cards.length) console.log('  Cards:', dom.cards.slice(0, 5));
    console.log('  Nav:', dom.nav.length, 'Buttons:', dom.buttons.length);

    return { finalUrl, dom };
  } catch(e) {
    console.log('  ERROR:', e.message);
    return null;
  }
}

(async () => {
  console.log('=== EZexam Portal Auth Crawl (' + PORTAL + ') ===\n');

  const b = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await b.newPage();

  // Capture all network traffic
  page.on('response', async function(res) {
    try {
      const req = res.request();
      if (!['xhr', 'fetch', 'document'].includes(req.resourceType())) return;
      if (isJunk(req.url())) return;

      const ct = res.headers()['content-type'] || '';
      let body = null;
      if (ct.includes('application/json') || ct.includes('text/plain')) {
        try { body = await res.json(); }
        catch { body = await res.text().catch(function() { return null; }); }
      }

      const entry = {
        ts: new Date().toISOString(),
        method: req.method(),
        url: req.url(),
        status: res.status(),
        post: req.postData() ? req.postData().slice(0, 500) : null,
        shape: body !== null ? extractShape(body) : null,
        rawSample: typeof body === 'string' ? body.slice(0, 300) : null,
      };
      networkLog.push(entry);

      if (ct.includes('json') || req.method() !== 'GET') {
        console.log('  [NET]', req.method(), res.status(), req.url().slice(0, 120));
        if (body && typeof body === 'object') {
          console.log('       →', JSON.stringify(extractShape(body)).slice(0, 200));
        }
      }
    } catch(e) {}
  });

  // ── Step 1: Get portal login page + CSRF ──────────────────────────────────
  console.log('Step 1: Loading portal login page...');
  await page.goto(PORTAL + '/login', { waitUntil: 'networkidle2', timeout: 20000 });
  console.log('  Login URL:', page.url());
  console.log('  Title:', await page.title());
  await page.screenshot({ path: path.join(SCREENSHOTS, 'portal_00_login.png'), fullPage: true });

  // Inspect form fields on subdomain login
  const loginForm = await page.evaluate(function() {
    var inputs = Array.from(document.querySelectorAll('input,button[type=submit]'));
    return inputs.map(function(i) { return { tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder }; });
  });
  console.log('  Login form fields:', JSON.stringify(loginForm));

  // Get CSRF
  const cookies = await page.cookies();
  const csrf = cookies.find(function(c) { return c.name === 'csrftoken'; })?.value || '';
  console.log('  CSRF:', csrf.slice(0, 15) + '...');

  // ── Step 2: Login via AJAX fetch (same pattern that worked on main domain) ──
  console.log('\nStep 2: Posting login credentials...');
  const loginResult = await page.evaluate(async function(data) {
    var body = new URLSearchParams({
      csrfmiddlewaretoken: data.csrf,
      sdom: data.sdom,
      username: data.username,
      password: data.password,
      next: ''
    });
    try {
      var res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': data.csrf },
        body: body.toString(),
        credentials: 'include',
      });
      var text = await res.text();
      try { return { status: res.status, data: JSON.parse(text) }; }
      catch { return { status: res.status, raw: text.slice(0, 300) }; }
    } catch(e) {
      return { error: e.message };
    }
  }, { csrf: csrf, sdom: 'ezexamqwertyuiop', username: 'ezexam@yopmail.com', password: 'qwertyuiop' });

  console.log('  Login result:', JSON.stringify(loginResult));

  // Check session cookies after login
  const postLoginCookies = await page.cookies();
  console.log('  Cookies after login:', postLoginCookies.map(function(c) { return c.name; }).join(', '));

  // ── Step 3: Navigate to the redirect URL ──────────────────────────────────
  const redirect = loginResult?.data?.redirect || loginResult?.redirect;
  const targetUrl = redirect ? (PORTAL + '/' + redirect) : (PORTAL + '/');

  console.log('\nStep 3: Navigating to post-login URL:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  const dashUrl = page.url();
  const dashTitle = await page.title();
  console.log('  Dashboard URL:', dashUrl);
  console.log('  Title:', dashTitle);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'portal_01_dashboard.png'), fullPage: true });

  const dashDom = await domSnap(page);
  fs.writeFileSync(path.join(DOM_DIR, 'portal_dashboard.json'), JSON.stringify({ url: dashUrl, title: dashTitle, ...dashDom }, null, 2));
  discoveredRoutes.push({ url: dashUrl, title: dashTitle, label: 'Portal Dashboard' });
  visitedUrls.add(dashUrl);

  console.log('  Dashboard headings:', dashDom.headings.slice(0, 6));
  console.log('  Dashboard nav:', dashDom.nav.map(function(n) { return n.text; }).join(', ').slice(0, 200));
  console.log('  Tables:', dashDom.tables.length);
  console.log('  Cards:', dashDom.cards.slice(0, 5));

  // ── Step 4: Systematic crawl of all authenticated routes ──────────────────
  console.log('\nStep 4: Crawling all portal routes...');

  const toVisit = [];

  // Nav links first (highest priority)
  dashDom.nav.forEach(function(n) {
    if (n.href && !visitedUrls.has(n.href)) toVisit.push({ url: n.href, label: 'Nav: ' + n.text });
  });

  // All internal links
  dashDom.links.forEach(function(l) {
    if (l.href && (l.href.startsWith(PORTAL) || l.href.includes('ezexam.in')) && !visitedUrls.has(l.href)) {
      toVisit.push({ url: l.href, label: 'Link: ' + l.text });
    }
  });

  // Comprehensive route probes for exam platform
  var probeRoutes = [
    '/dashboard/', '/home/', '/profile/', '/settings/',
    '/exam/', '/exam/list/', '/exam/create/', '/exam/add/',
    '/exams/', '/exams/list/', '/exams/create/',
    '/question/', '/question/bank/', '/question/list/', '/question/create/', '/question/add/',
    '/questions/', '/questions/bank/', '/questions/create/',
    '/results/', '/results/list/', '/report/', '/reports/',
    '/students/', '/student/', '/students/list/', '/students/add/',
    '/users/', '/user/', '/batches/', '/batch/',
    '/analytics/', '/analytics/exam/', '/analytics/student/',
    '/leaderboard/', '/notifications/', '/notification/',
    '/schedule/', '/schedules/', '/categories/', '/category/',
    '/packages/', '/package/', '/subscription/', '/billing/',
    '/payments/', '/payment/', '/institute/', '/staff/',
    '/admin/', '/proctoring/', '/proctor/',
    '/attempt/', '/attempts/', '/live/', '/live-exam/',
    '/certificate/', '/certificates/',
  ];

  probeRoutes.forEach(function(r) {
    var u = PORTAL + r;
    if (!visitedUrls.has(u)) toVisit.push({ url: u, label: 'Probe: ' + r });
  });

  for (var i = 0; i < toVisit.length && i < 200; i++) {
    var target = toVisit[i];
    if (visitedUrls.has(target.url)) continue;

    var res = await visit(page, target.url, target.label);
    if (res && res.dom) {
      // Queue more links from newly visited pages
      res.dom.nav.forEach(function(n) {
        if (n.href && !visitedUrls.has(n.href)) toVisit.push({ url: n.href, label: 'Nav+: ' + n.text });
      });
      res.dom.links.forEach(function(l) {
        if (l.href && (l.href.startsWith(PORTAL)) && !visitedUrls.has(l.href) && toVisit.length < 300) {
          toVisit.push({ url: l.href, label: 'Disc: ' + l.text });
        }
      });
    }
  }

  // ── Step 5: Save all output ──────────────────────────────────────────────
  console.log('\n=== Saving output...');
  fs.writeFileSync(path.join(CAPTURES, 'portal_network.jsonl'), networkLog.map(function(e) { return JSON.stringify(e); }).join('\n') + '\n');
  fs.writeFileSync(path.join(CAPTURES, 'portal_routes.json'), JSON.stringify(discoveredRoutes, null, 2));

  // Run summarizer on network log
  const apiOnly = networkLog.filter(function(e) { return e.shape !== null; });
  fs.writeFileSync(path.join(CAPTURES, 'portal_api_calls.json'), JSON.stringify(apiOnly, null, 2));

  await b.close();

  console.log('\n=== Phase 1 COMPLETE ===');
  console.log('Portal routes captured:  ' + discoveredRoutes.length);
  console.log('API calls with shapes:   ' + apiOnly.length);
  console.log('Screenshots:             ' + fs.readdirSync(SCREENSHOTS).filter(function(f) { return f.startsWith('portal_'); }).length);
})();
