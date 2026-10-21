/**
 * EZexam Autonomous Explorer — Phase 1
 * Logs in, crawls all authenticated routes, captures DOM + network traffic.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BROWSER_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'https://ezexam.in';
const CAPTURES = path.join(__dirname, '..', 'captures');
const SCREENSHOTS = path.join(CAPTURES, 'screenshots');
const DOM_DIR = path.join(CAPTURES, 'dom');

// Credentials from CLAUDE.md
const CREDS = {
  username: 'ezexamqwertyuiop',
  password: 'qwertyuiop',
};

const networkLog = [];
const visitedUrls = new Set();
const discoveredRoutes = [];

fs.mkdirSync(SCREENSHOTS, { recursive: true });
fs.mkdirSync(DOM_DIR, { recursive: true });

function slug(url) {
  return url.replace(/https?:\/\/[^/]+/, '').replace(/[^a-z0-9]/gi, '_').slice(0, 80) || 'root';
}

function extractShape(val, depth = 0) {
  if (depth > 3) return '...';
  if (val === null) return 'null';
  if (Array.isArray(val)) return val.length > 0 ? [extractShape(val[0], depth + 1)] : [];
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val).slice(0, 20)) out[k] = extractShape(val[k], depth + 1);
    return out;
  }
  return typeof val;
}

async function captureNetworkOnPage(page) {
  page.on('response', async (res) => {
    try {
      const req = res.request();
      const type = req.resourceType();
      if (!['xhr', 'fetch', 'document'].includes(type)) return;

      const url = req.url();
      if (url.includes('google-analytics') || url.includes('doubleclick') || url.includes('gtm')) return;

      const status = res.status();
      const ct = res.headers()['content-type'] || '';
      let body = null;

      if (ct.includes('application/json') || ct.includes('text/plain')) {
        try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
      }

      networkLog.push({
        timestamp: new Date().toISOString(),
        method: req.method(),
        url,
        status,
        postData: req.postData() || null,
        responseShape: body !== null ? extractShape(body) : null,
      });

      if (ct.includes('application/json')) {
        console.log(`  [NET] ${req.method()} ${status} ${url}`);
      }
    } catch {}
  });
}

async function visitAndCapture(page, url, label) {
  if (visitedUrls.has(url)) return;
  visitedUrls.add(url);
  console.log(`\n→ Visiting: ${label} (${url})`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 1500));

    const finalUrl = page.url();
    const title = await page.title();
    console.log(`  Title: "${title}" | Final URL: ${finalUrl}`);

    // Screenshot
    const screenshotPath = path.join(SCREENSHOTS, `${slug(finalUrl)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  Screenshot: ${screenshotPath}`);

    // DOM snapshot (text, links, forms, key elements)
    const domData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id, action: f.action, method: f.method,
        inputs: Array.from(f.querySelectorAll('input,select,textarea')).map(i => ({
          tag: i.tagName, type: i.type || null, name: i.name || null, id: i.id || null, placeholder: i.placeholder || null
        }))
      }));
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim().slice(0, 60), href: a.href }))
        .filter(a => a.href.startsWith('http') && a.text);
      const tables = Array.from(document.querySelectorAll('table')).map(t => ({
        headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim()),
        rowCount: t.querySelectorAll('tr').length,
      }));
      const buttons = Array.from(document.querySelectorAll('button,input[type=button],input[type=submit]'))
        .map(b => ({ text: (b.innerText || b.value || '').trim().slice(0, 60), type: b.type || null }))
        .filter(b => b.text);
      const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.innerText.trim()).filter(Boolean);
      const nav = Array.from(document.querySelectorAll('nav a, .nav a, .sidebar a, .menu a'))
        .map(a => ({ text: a.innerText.trim().slice(0, 60), href: a.href }))
        .filter(a => a.text && a.href);
      return { forms, links, tables, buttons, headings, nav };
    });

    fs.writeFileSync(path.join(DOM_DIR, `${slug(finalUrl)}.json`), JSON.stringify({ url: finalUrl, title, ...domData }, null, 2));

    discoveredRoutes.push({ url: finalUrl, title, label });
    return domData;
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    return null;
  }
}

(async () => {
  console.log('=== EZexam Autonomous Explorer — Phase 1 ===\n');

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  await captureNetworkOnPage(page);

  // ── Step 1: Go to login page ──────────────────────────────────────────────
  console.log('Step 1: Navigating to login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.screenshot({ path: path.join(SCREENSHOTS, '00_login_page.png'), fullPage: true });

  // Check which form is visible (login-form uses sdom + username + password)
  const formVisible = await page.evaluate(() => {
    const f = document.querySelector('#login-form');
    return f ? window.getComputedStyle(f).display : null;
  });
  console.log(`  Login form display: ${formVisible}`);

  // ── Step 2: Fill and submit login form ───────────────────────────────────
  console.log('Step 2: Filling login credentials...');

  // The form has sdom (institute code) and username fields - try username only first
  await page.evaluate(() => {
    // Clear sdom if present
    const sdomEl = document.querySelector('input[name="sdom"]');
    if (sdomEl) sdomEl.value = '';
  });

  await page.type('#username', CREDS.username, { delay: 50 });
  await page.type('#password', CREDS.password, { delay: 50 });
  await page.screenshot({ path: path.join(SCREENSHOTS, '01_login_filled.png') });

  // Submit
  console.log('Step 3: Submitting login form...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"], input[type="submit"], .login-form button').catch(() =>
      page.evaluate(() => document.querySelector('#login-form')?.submit())
    ),
  ]);

  const afterLoginUrl = page.url();
  const afterLoginTitle = await page.title();
  console.log(`  After login → URL: ${afterLoginUrl}`);
  console.log(`  After login → Title: ${afterLoginTitle}`);
  await page.screenshot({ path: path.join(SCREENSHOTS, '02_after_login.png'), fullPage: true });

  if (afterLoginUrl.includes('/login')) {
    // Login may have failed — check error message
    const errMsg = await page.evaluate(() => {
      const el = document.querySelector('.error, .alert, .message, [class*="error"], [class*="alert"]');
      return el ? el.innerText.trim() : null;
    });
    console.log(`  Login error message: ${errMsg || 'none visible'}`);

    // Try with email instead
    console.log('  Trying with email as username...');
    await page.evaluate(() => {
      const u = document.querySelector('#username');
      const p = document.querySelector('#password');
      if (u) u.value = '';
      if (p) p.value = '';
    });
    await page.type('#username', 'ezexam@yopmail.com', { delay: 50 });
    await page.type('#password', CREDS.password, { delay: 50 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
      page.evaluate(() => document.querySelector('#login-form')?.submit()),
    ]);
    console.log(`  After email login → URL: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOTS, '03_after_email_login.png'), fullPage: true });
  }

  // ── Step 4: Crawl authenticated pages ────────────────────────────────────
  const crawlTargets = [
    { url: `${BASE_URL}/`, label: 'Home / Dashboard' },
    { url: `${BASE_URL}/dashboard`, label: 'Dashboard' },
    { url: `${BASE_URL}/home`, label: 'Home' },
    { url: `${BASE_URL}/exam`, label: 'Exam List' },
    { url: `${BASE_URL}/exams`, label: 'Exams' },
    { url: `${BASE_URL}/test`, label: 'Test' },
    { url: `${BASE_URL}/tests`, label: 'Tests' },
    { url: `${BASE_URL}/questions`, label: 'Questions' },
    { url: `${BASE_URL}/results`, label: 'Results' },
    { url: `${BASE_URL}/reports`, label: 'Reports' },
    { url: `${BASE_URL}/profile`, label: 'Profile' },
    { url: `${BASE_URL}/settings`, label: 'Settings' },
    { url: `${BASE_URL}/students`, label: 'Students' },
    { url: `${BASE_URL}/users`, label: 'Users' },
    { url: `${BASE_URL}/analytics`, label: 'Analytics' },
  ];

  console.log('\nStep 4: Crawling authenticated routes...');
  for (const target of crawlTargets) {
    const dom = await visitAndCapture(page, target.url, target.label);

    // If we found navigation links, queue them too
    if (dom?.nav) {
      for (const navLink of dom.nav) {
        if (navLink.href?.startsWith(BASE_URL) && !visitedUrls.has(navLink.href)) {
          await visitAndCapture(page, navLink.href, `Nav: ${navLink.text}`);
        }
      }
    }
  }

  // ── Step 5: Discover additional links from current session ─────────────────
  console.log('\nStep 5: Deep crawling discovered internal links...');
  const allDomFiles = fs.readdirSync(DOM_DIR);
  const allLinks = new Set();
  for (const f of allDomFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(DOM_DIR, f), 'utf8'));
      for (const link of (data.links || [])) {
        if (link.href?.startsWith(BASE_URL) && !visitedUrls.has(link.href)) {
          allLinks.add(link.href);
        }
      }
    } catch {}
  }

  for (const link of allLinks) {
    await visitAndCapture(page, link, `Discovered: ${link.replace(BASE_URL, '')}`);
  }

  // ── Step 6: Save all captures ────────────────────────────────────────────
  console.log('\nStep 6: Saving all captures...');
  fs.writeFileSync(path.join(CAPTURES, 'network_records.jsonl'),
    networkLog.map(e => JSON.stringify(e)).join('\n') + '\n'
  );
  fs.writeFileSync(path.join(CAPTURES, 'discovered_routes.json'),
    JSON.stringify(discoveredRoutes, null, 2)
  );
  fs.writeFileSync(path.join(CAPTURES, 'visited_urls.json'),
    JSON.stringify(Array.from(visitedUrls), null, 2)
  );

  await browser.close();

  console.log('\n=== Phase 1 Complete ===');
  console.log(`Routes discovered: ${discoveredRoutes.length}`);
  console.log(`API calls captured: ${networkLog.length}`);
  console.log(`Screenshots saved: ${fs.readdirSync(SCREENSHOTS).length}`);
  console.log(`Captures saved to: ${CAPTURES}`);
})();
