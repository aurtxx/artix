/**
 * Browser Recorder Script
 * Launches Brave / Chromium with an isolated user profile.
 * Records all API network traffic (HAR/JSON) and user session data.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const targetUrl = process.argv[2] || process.env.TARGET_URL || 'about:blank';

const CAPTURES_DIR = path.join(__dirname, '..', 'captures');
const SESSION_DIR = path.join(CAPTURES_DIR, 'session');
const NETWORK_LOG_FILE = path.join(CAPTURES_DIR, 'network_records.jsonl');

fs.mkdirSync(SESSION_DIR, { recursive: true });

const executableCandidates = [
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = executableCandidates.find(p => fs.existsSync(p));

if (!executablePath) {
  console.error('Error: Could not locate browser executable (Brave/Chrome/Edge).');
  process.exit(1);
}

console.log(`Using browser: ${executablePath}`);

(async () => {
  console.log(`[1/3] Launching Browser to: ${targetUrl}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    defaultViewport: null,
    userDataDir: SESSION_DIR,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
    ],
  });

  const page = (await browser.pages())[0] || (await browser.newPage());
  const networkStream = fs.createWriteStream(NETWORK_LOG_FILE, { flags: 'a' });

  page.on('response', async (response) => {
    try {
      const request = response.request();
      const resourceType = request.resourceType();

      if (['xhr', 'fetch', 'document'].includes(resourceType)) {
        const url = request.url();
        const method = request.method();
        const status = response.status();
        let responseBody = null;

        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json') || contentType.includes('text/plain')) {
          try {
            responseBody = await response.json();
          } catch {
            responseBody = await response.text().catch(() => null);
          }
        }

        const logEntry = {
          timestamp: new Date().toISOString(),
          method,
          url,
          status,
          postData: request.postData() || null,
          response: responseBody,
        };

        networkStream.write(JSON.stringify(logEntry) + '\n');
        console.log(`[NET] ${method} ${status} ${url}`);
      }
    } catch {}
  });

  console.log('[2/3] Browser window active. Please log into the target site.');
  if (targetUrl !== 'about:blank') {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  }

  console.log('[3/3] Session is active. When done, close the browser window.');

  browser.on('disconnected', () => {
    console.log('Recording finished. Logs saved in captures/network_records.jsonl');
    process.exit(0);
  });
})();
