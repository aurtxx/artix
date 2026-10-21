/**
 * Comprehensive Browser End-to-End Suite for Reconstructed EZexam Platform
 * Uses Playwright with Brave browser to verify all interactive flows and capture Neo-Brutalist visual evidence.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'captures', 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runE2ESuite() {
  console.log('===========================================================');
  console.log('🚀 STARTING PLAYWRIGHT END-TO-END VISUAL & FUNCTIONAL SUITE');
  console.log('===========================================================\n');

  const browser = await chromium.launch({
    executablePath: BRAVE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  [Browser Error]:', msg.text());
    }
  });

  try {
    // ----------------------------------------------------
    // TEST 1: Staff Authentication Flow
    // ----------------------------------------------------
    console.log('[TEST 1/4] Testing Staff Login Flow...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    const pageTitle = await page.title();
    console.log(`  Page loaded. Title: "${pageTitle}"`);

    // Screenshot Login Page
    const loginScreenshotPath = path.join(SCREENSHOTS_DIR, 'reconstructed_login.png');
    await page.screenshot({ path: loginScreenshotPath, fullPage: true });
    console.log(`  [OK] Saved screenshot: ${loginScreenshotPath}`);

    // Fill credentials explicitly
    await page.locator('input[placeholder="ezexamqwertyuiop"]').fill('ezexamqwertyuiop');
    await page.locator('input[placeholder="user@example.com"]').fill('ezexam@yopmail.com');
    await page.locator('input[type="password"]').fill('qwertyuiop');
    console.log('  Filled tenant subdomain and credentials.');

    // Click Sign In
    console.log('  Clicking submit button...');
    await Promise.all([
      page.waitForURL('**/staff', { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    console.log('  [OK] Successfully authenticated and redirected to /staff');

    // ----------------------------------------------------
    // TEST 2: Staff Dashboard & Management Views
    // ----------------------------------------------------
    console.log('\n[TEST 2/4] Testing Staff Dashboard Navigation...');
    await page.waitForSelector('text=Capacity Left', { timeout: 10000 });
    console.log('  [OK] Capacity metrics loaded.');

    // Switch to Question Papers tab
    await page.click('button:has-text("Question Papers")');
    await page.waitForTimeout(600);
    console.log('  [OK] Switched to Question Papers tab.');

    // Switch to Student Roster tab
    await page.click('button:has-text("Student Roster")');
    await page.waitForTimeout(600);
    console.log('  [OK] Switched to Student Roster tab.');

    // Switch to Submissions & Analytics tab
    await page.click('button:has-text("Submissions & Analytics")');
    await page.waitForTimeout(600);
    console.log('  [OK] Switched to Submissions & Analytics tab.');

    // Switch back to Online Exams
    await page.click('button:has-text("Online Exams")');
    await page.waitForTimeout(600);
    console.log('  [OK] Switched back to Online Exams.');

    // Screenshot Staff Console
    const staffScreenshotPath = path.join(SCREENSHOTS_DIR, 'reconstructed_staff.png');
    await page.screenshot({ path: staffScreenshotPath, fullPage: true });
    console.log(`  [OK] Saved screenshot: ${staffScreenshotPath}`);

    // ----------------------------------------------------
    // TEST 3: Candidate CBT Exam Player
    // ----------------------------------------------------
    console.log('\n[TEST 3/4] Testing Candidate CBT Exam Player (/exam/1)...');
    await page.goto('http://localhost:3000/exam/1', { waitUntil: 'networkidle' });

    await page.waitForSelector('text=EZEXAM CBT', { timeout: 10000 });
    await page.waitForSelector('text=QUESTION 1 OF', { timeout: 10000 });
    console.log('  [OK] CBT Player interface initialized.');

    // Screenshot Exam Q1
    const examQ1Path = path.join(SCREENSHOTS_DIR, 'reconstructed_exam_q1.png');
    await page.screenshot({ path: examQ1Path, fullPage: true });
    console.log(`  [OK] Saved screenshot: ${examQ1Path}`);

    // Answer Question 1: Select "6 N"
    const opt6N = page.locator('button:has-text("6 N")');
    await opt6N.click();
    console.log('  Selected answer "6 N" for Q1.');
    await page.waitForTimeout(500);

    // Save & Next -> Question 2
    await page.click('button:has-text("Save & Next")');
    await page.waitForTimeout(500);
    console.log('  Moved to Question 2.');

    // Question 2: Mark for Review
    await page.click('button:has-text("Mark for Review")');
    console.log('  Marked Question 2 for Review.');
    await page.waitForTimeout(500);

    // Jump to Question 3 via Question Palette
    const paletteBtn3 = page.locator('aside button:has-text("3")');
    await paletteBtn3.click();
    await page.waitForTimeout(500);
    console.log('  Jumped to Question 3 via Question Palette.');

    // Select first option on Question 3
    const questionOptions = page.locator('.space-y-3 button');
    const optCount = await questionOptions.count();
    if (optCount > 0) {
      await questionOptions.first().click();
      console.log('  Selected first option on Question 3.');
    } else {
      const numInput = page.locator('input[type="number"]');
      if (await numInput.count() > 0) {
        await numInput.fill('42');
        console.log('  Filled numerical answer on Question 3.');
      }
    }
    await page.waitForTimeout(500);

    // Click Submit Exam
    await page.click('button:has-text("Submit Exam")');
    await page.waitForSelector('text=Confirm Final Submission', { timeout: 5000 });
    console.log('  [OK] Confirmation modal appeared.');

    // Screenshot Submit Modal
    const submitModalPath = path.join(SCREENSHOTS_DIR, 'reconstructed_exam_submit_modal.png');
    await page.screenshot({ path: submitModalPath });
    console.log(`  [OK] Saved screenshot: ${submitModalPath}`);

    // Confirm Submission
    await Promise.all([
      page.waitForURL('**/results/**', { timeout: 15000 }),
      page.click('button:has-text("Confirm & Submit")')
    ]);
    console.log('  [OK] Submitted exam and redirected to results page.');

    // ----------------------------------------------------
    // TEST 4: Results & Scorecard Breakdown
    // ----------------------------------------------------
    console.log('\n[TEST 4/4] Testing Scorecard & Question Reconciliation...');
    await page.waitForSelector('text=Official Examination Scorecard', { timeout: 10000 });
    await page.waitForSelector('text=Detailed Question-by-Question Reconciliation', { timeout: 10000 });
    console.log('  [OK] Official scorecard loaded.');

    // Screenshot Results Page
    const resultsScreenshotPath = path.join(SCREENSHOTS_DIR, 'reconstructed_results.png');
    await page.screenshot({ path: resultsScreenshotPath, fullPage: true });
    console.log(`  [OK] Saved screenshot: ${resultsScreenshotPath}`);

    console.log('\n===========================================================');
    console.log('✨ ALL 4 END-TO-END TESTS COMPLETED SUCCESSFULLY!');
    console.log('✨ VISUAL REGRESSION ARTIFACTS SAVED IN captures/screenshots/');
    console.log('===========================================================');

  } catch (err) {
    console.error('\n❌ Test Failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2ESuite();
