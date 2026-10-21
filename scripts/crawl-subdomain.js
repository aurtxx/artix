/**
 * Subdomain probe + authenticated crawl on ezexamqwertyuiop.ezexam.in
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SUBDOMAIN_BASE = 'https://ezexamqwertyuiop.ezexam.in';
const MAIN_BASE = 'https://ezexam.in';
const CAPTURES = path.join(__dirname, '..', 'captures');
const SCREENSHOTS = path.join(CAPTURES, 'screenshots');
const DOM_DIR = path.join(CAPTURES, 'dom');
fs.mkdirSync(SCREENSHOTS, { recursive: true });
fs.mkdirSync(DOM_DIR, { recursive: true });

const networkLog = [];
const discoveredRoutes = [];
const visitedUrls = new Set();

function slug(url) {
  return url.replace(/https?:\/\/[^/]+/, '').replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').slice(0, 80) || 'root';
}

function extractShape(val, depth) {
  depth = depth || 0;
  if (depth > 3) return '...';
  if (val === null) return 'null';
  if (Array.isArray(val)) return val.length > 0 ? [extractShape(val[0], depth + 1)] : [];
  if (typeof val === 'object') {
    var out = {};
    Object.keys(val).slice(0, 20).forEach(function(k) { out[k] = extractShape(val[k], depth + 1); });
    return out;
  }
  return typeof val;
}

async function getDomSnapshot(page) {
  return page.evaluate(function() {
    var forms = Array.from(document.querySelectorAll('form')).map(function(f) {
      return {
        id: f.id, action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(function(i) {
          return { tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder };
        })
      };
    });
    var links = Array.from(document.querySelectorAll('a[href]'))
      .map(function(a) { return { text: (a.innerText || '').trim().slice(0, 80), href: a.href }; })
      .filter(function(a) { return a.href.startsWith('http') && a.text; });
    var tables = Array.from(document.querySelectorAll('table')).map(function(t) {
      return {
        headers: Array.from(t.querySelectorAll('th')).map(function(th) { return th.innerText.trim(); }),
        rows: Array.from(t.querySelectorAll('tr')).slice(1, 4).map(function(tr) {
          return Array.from(tr.querySelectorAll('td')).map(function(td) { return td.innerText.trim().slice(0, 80); });
        }),
        rowCount: t.querySelectorAll('tr').length
      };
    });
    var buttons = Array.from(document.querySelectorAll('button,input[type=button],input[type=submit],.btn'))
      .map(function(b) { return { text: ((b.innerText || b.value || '')).trim().slice(0, 60), id: b.id, cls: b.className.slice(0, 40) }; })
      .filter(function(b) { return b.text; });
    var headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(function(h) { return h.innerText.trim(); }).filter(Boolean);
    var nav = Array.from(document.querySelectorAll('nav a,.nav a,.sidebar a,.menu a,.sidenav a,.navbar a'))
      .map(function(a) { return { text: (a.innerText || '').trim().slice(0, 60), href: a.href }; })
      .filter(function(a) { return a.text && a.href; });
    var stats = Array.from(document.querySelectorAll('[class*="stat"],[class*="count"],[class*="card"],[class*="widget"]'))
      .map(function(el) { return el.innerText.trim().slice(0, 100); }).filter(Boolean).slice(0, 10);
    var textContent = document.body.innerText.slice(0, 3000);
    return { forms, links, tables, buttons, headings, nav, stats, textContent };
  });
}

async function visitPage(page, url, label) {
  if (visitedUrls.has(url)) return null;
  visitedUrls.add(url);
  console.log('\n→ [' + label + ']\n  ' + url);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(function(r) { setTimeout(r, 1500); });
    const finalUrl = page.url();
    const title = await page.title();
    console.log('  Title: "' + title + '"');
    console.log('  Final URL: ' + finalUrl);
    const ssFile = path.join(SCREENSHOTS, 'sub_' + slug(finalUrl || url) + '.png');
    await page.screenshot({ path: ssFile, fullPage: true });
    const dom = await getDomSnapshot(page);
    console.log('  Headings:', dom.headings.slice(0, 5));
    console.log('  Nav links:', dom.nav.length, '| Tables:', dom.tables.length, '| Buttons:', dom.buttons.length);
    if (dom.tables.length) {
      dom.tables.forEach(function(t) {
        console.log('  Table headers:', t.headers.join(', ').slice(0, 100));
      });
    }
    const domFile = path.join(DOM_DIR, 'sub_' + slug(finalUrl || url) + '.json');
    fs.writeFileSync(domFile, JSON.stringify({ url: finalUrl, title, label, ...dom }, null, 2));
    discoveredRoutes.push({ url: finalUrl, title, label });
    return { finalUrl, title, dom };
  } catch(e) {
    console.log('  ERROR:', e.message);
    return null;
  }
}

(async () => {
  console.log('=== EZexam Subdomain Auth Crawl ===\n');
  const b = await puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await b.newPage();

  page.on('response', async function(res) {
    try {
      const req = res.request();
      const type = req.resourceType();
      const url = req.url();
      if (!['xhr', 'fetch', 'document'].includes(type)) return;
      if (url.includes('google') || url.includes('analytics') || url.endsWith('.js') || url.endsWith('.css')) return;
      const ct = res.headers()['content-type'] || '';
      let body = null;
      if (ct.includes('application/json') || ct.includes('text/plain')) {
        try { body = await res.json(); } catch { body = await res.text().catch(function() { return null; }); }
      }
      const entry = { ts: new Date().toISOString(), method: req.method(), url, status: res.status(), post: req.postData() || null, shape: body ? extractShape(body) : null };
      networkLog.push(entry);
      if (ct.includes('json') || req.method() !== 'GET') {
        console.log('  [NET]', req.method(), res.status(), url.slice(0, 100));
        if (body && typeof body === 'object') console.log('       Shape:', JSON.stringify(extractShape(body)).slice(0, 200));
      }
    } catch(e) {}
  });

  // ── Step 1: Login on main domain to get session ────────────────────────
  console.log('Step 1: Authenticating on main domain...');
  await page.goto(MAIN_BASE + '/login', { waitUntil: 'networkidle2' });
  const initCookies = await page.cookies();
  const csrf = initCookies.find(function(c) { return c.name === 'csrftoken'; })?.value || '';

  const loginRes = await page.evaluate(async function(csrf) {
    var body = new URLSearchParams({ csrfmiddlewaretoken: csrf, sdom: 'ezexamqwertyuiop', username: 'ezexam@yopmail.com', password: 'qwertyuiop', next: '' });
    var res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': csrf }, body: body.toString(), credentials: 'include' });
    return await res.json().catch(function() { return null; });
  }, csrf);

  console.log('  Login:', JSON.stringify(loginRes));
  const allCookies = await page.cookies();
  console.log('  Cookies:', allCookies.map(function(c) { return c.name; }).join(', '));

  // ── Step 2: Probe subdomain ───────────────────────────────────────────
  console.log('\nStep 2: Probing subdomain ' + SUBDOMAIN_BASE + '...');
  await page.goto(SUBDOMAIN_BASE, { waitUntil: 'networkidle2', timeout: 20000 }).catch(function(e) {
    console.log('  Subdomain error:', e.message);
  });
  console.log('  Subdomain URL:', page.url());
  console.log('  Title:', await page.title());
  await page.screenshot({ path: path.join(SCREENSHOTS, 'subdomain_home.png'), fullPage: true });

  // ── Step 3: Login on subdomain if redirected ────────────────────────
  const subUrl = page.url();
  if (subUrl.includes('/login') || subUrl.includes('ezexam.in/login')) {
    console.log('\nStep 3: Subdomain needs login, authenticating...');
    const subCookies = await page.cookies('https://ezexam.in');
    const subCsrf = (await page.cookies()).find(function(c) { return c.name === 'csrftoken'; })?.value || csrf;

    const subLogin = await page.evaluate(async function(data) {
      var body = new URLSearchParams({ csrfmiddlewaretoken: data.csrf, sdom: 'ezexamqwertyuiop', username: 'ezexam@yopmail.com', password: 'qwertyuiop', next: '' });
      var res = await fetch('https://ezexam.in/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': data.csrf }, body: body.toString(), credentials: 'include' });
      return await res.json().catch(function() { return null; });
    }, { csrf: subCsrf });
    console.log('  Subdomain login:', JSON.stringify(subLogin));

    if (subLogin?.redirect) {
      await page.goto(MAIN_BASE + '/' + subLogin.redirect, { waitUntil: 'networkidle2', timeout: 20000 });
      console.log('  After redirect:', page.url(), '|', await page.title());
    }
  }

  // ── Step 4: Navigate to known portal routes with seed ──────────────────
  console.log('\nStep 4: Navigating to seed URL from login...');
  const seedUrl = MAIN_BASE + '/home?seed=' + (loginRes?.redirect?.split('seed=')[1] || 'AAk2nGgdN620hN04tnw');
  await page.goto(seedUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  console.log('  Seed URL result:', page.url(), '|', await page.title());
  await page.screenshot({ path: path.join(SCREENSHOTS, 'seed_home.png'), fullPage: true });

  const seedDom = await getDomSnapshot(page);
  fs.writeFileSync(path.join(DOM_DIR, 'seed_home.json'), JSON.stringify({ url: page.url(), ...seedDom }, null, 2));

  // ── Step 5: Crawl all discovered links from the seed page ──────────────
  console.log('\nStep 5: Crawling from seed page...');
  console.log('  Headings:', seedDom.headings.slice(0, 6));
  console.log('  Nav:', seedDom.nav.map(function(n) { return n.text; }).slice(0, 15));
  console.log('  Links:', seedDom.links.length);
  console.log('  Tables:', seedDom.tables.length);

  visitedUrls.add(page.url());

  // Visit all nav links
  const toVisit = [];
  seedDom.nav.forEach(function(n) { if (n.href.startsWith('http') && !visitedUrls.has(n.href)) toVisit.push({ url: n.href, label: 'Nav: ' + n.text }); });
  seedDom.links.forEach(function(l) { if (l.href.startsWith('http') && l.href.includes('ezexam.in') && !visitedUrls.has(l.href)) toVisit.push({ url: l.href, label: 'Link: ' + l.text }); });

  // Priority exam-related routes to probe
  var authRoutes = [
    '/exam/', '/exam/list/', '/exam/create/',
    '/question/', '/question/bank/',
    '/results/', '/reports/', '/report/',
    '/dashboard/', '/profile/', '/settings/',
    '/students/', '/users/', '/batches/',
    '/analytics/', '/leaderboard/',
    '/notification/', '/notifications/',
    '/admin/', '/staff/', '/institute/',
    '/subscription/', '/billing/', '/payments/',
    '/test/', '/attempt/', '/schedule/',
  ];
  authRoutes.forEach(function(r) {
    var u = MAIN_BASE + r;
    if (!visitedUrls.has(u)) toVisit.push({ url: u, label: 'Probe: ' + r });
  });

  for (var i = 0; i < toVisit.length; i++) {
    var target = toVisit[i];
    if (visitedUrls.has(target.url)) continue;
    var res = await visitPage(page, target.url, target.label);
    if (res && res.dom) {
      // Follow nav links from newly visited pages
      res.dom.nav.forEach(function(n) {
        if (n.href && n.href.startsWith('http') && n.href.includes('ezexam.in') && !visitedUrls.has(n.href)) {
          toVisit.push({ url: n.href, label: 'Discovered Nav: ' + n.text });
        }
      });
      res.dom.links.forEach(function(l) {
        if (l.href && l.href.startsWith('http') && l.href.includes('ezexam.in') && !visitedUrls.has(l.href) && toVisit.length < 200) {
          toVisit.push({ url: l.href, label: 'Discovered: ' + l.text });
        }
      });
    }
  }

  // ── Save all ────────────────────────────────────────────────────────────
  console.log('\n=== SAVING OUTPUT ===');
  fs.writeFileSync(path.join(CAPTURES, 'network_records_sub.jsonl'), networkLog.map(function(e) { return JSON.stringify(e); }).join('\n') + '\n');
  fs.writeFileSync(path.join(CAPTURES, 'discovered_routes_sub.json'), JSON.stringify(discoveredRoutes, null, 2));
  fs.writeFileSync(path.join(CAPTURES, 'visited_urls_sub.json'), JSON.stringify(Array.from(visitedUrls), null, 2));

  await b.close();

  console.log('\n=== Phase 1 Complete ===');
  console.log('Routes: ' + discoveredRoutes.length + ' | API calls: ' + networkLog.filter(function(n) { return n.shape; }).length + ' | Screenshots: ' + fs.readdirSync(SCREENSHOTS).length);
})();
