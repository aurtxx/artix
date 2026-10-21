# ARTIX REALITY RECOVERY AUDIT & FUNCTIONAL REBUILD REPORT

**Date:** October 21, 2026  
**Repository:** `https://github.com/aurtxx/artix`  
**Reference Authorized Platform:** `https://ezexam.in` / `ezexamqwertyuiop.ezexam.in`  
**Audit Status:** Fully Remediated & End-to-End Verified  

---

## 1. Executive Summary

A comprehensive, forensic reality audit of the Artix codebase was initiated following reports that "practically everything is broken." Prior documentation claimed broad endpoint coverage and test pass counts, but runtime browser execution revealed critical disconnects across the UI $\rightarrow$ API $\rightarrow$ Database lifecycle.

Rather than accepting paper claims, we executed real browser automation with Chromium (`scripts/audit-real-user-flows.js`), inspected database effects in `ezexam.db`, and traced every user journey end-to-end. We identified eight root-cause defects causing broken routing, 404 errors, dead controls, cookie retention after logout, and silent candidate player crashes.

All eight root causes have been resolved, and 100% of the verification suites (29 browser journey tests, 50 Phase J feature tests, and 13 backend contract/security tests) now pass with a clean Next.js 16 production build.

---

## 2. Forensic Audit of Discovered Defect Root Causes & Fixes

### Defect 1: Staff Review 404 & Scorecard Resolution Mismatch (`backend/routers/cbt.py`)
- **Root Cause:** In the staff dashboard, clicking "Review" navigated to `/results/{attempt_id}`. However, `get_result` in `cbt.py` treated the URL parameter strictly as `exam_id` and performed `models.ExamAttempt.user_id == user.id`. Because staff (user ID 1) was reviewing a student's submission (user ID 2), the query returned 404, throwing an infinite loading state.
- **Remediation:** Rewrote `get_result` with tiered resolution:
  1. For students requesting results via exam schedule ID, return their latest submitted attempt.
  2. For staff reviewing by `attempt_id` (or direct scorecard links), lookup by `models.ExamAttempt.id == exam_id` scoped strictly within `tenant_id`.
  3. Enforce candidate isolation: candidates can only inspect their own attempts (`user_id == user.id`), while authorized staff can review any candidate attempt within their tenant.
  4. Hydrated response payload with `candidate_name` and `candidate_rollnum` metadata.
- **Verification:** Verified via Chromium in Journey 2d (`Test 8-12`) and backend test (`Test 11-13`).

### Defect 2: Missing Session Invalidation & Persistent Zombie Cookies (`backend/routers/auth.py`)
- **Root Cause:** No `/logout` endpoint existed in the backend. When users clicked "Log Out", only client-side `localStorage` was cleared. HTTP-only cookies (`sessionid` and `access_token`) remained valid, allowing unauthenticated browser requests or subsequent users to inherit the previous user's credentials.
- **Remediation:** Added `POST /logout` and `GET /logout` in `backend/routers/auth.py` to delete both cookies. Wired all logout buttons across `/staff`, `/student`, and `/results` to invoke `/logout` before clearing storage and redirecting to `/login`.
- **Verification:** Verified via Journey 2e (`Test 13-14`) and Journey 3 (`Test 29`). Post-logout navigation to `/staff` immediately bounces back to `/login`.

### Defect 3: Missing Candidate Portal Route & Redirection Trap (`src/app/student/page.tsx`, `src/app/login/page.tsx`)
- **Root Cause:** Logging in as a student redirected to hardcoded `/exam/1`. The application lacked a candidate home dashboard where students could see their profile, assigned examinations, past scorecards, and institutional notices.
- **Remediation:** 
  1. Created `GET /api/exam/student/portal` in `backend/routers/cbt.py` returning student profile, assigned cohort exams, past submissions with scores, and targeted notices.
  2. Built `src/app/student/page.tsx` adhering to the Neo-Brutalist design language (`border-2 border-slate-900`, `shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]`).
  3. Updated `src/app/login/page.tsx` to route candidates to `/student`.
- **Verification:** Verified in Journey 3 (`Test 15-18, 27-28`).

### Defect 4: Dead Question Paper Creation Trigger (`src/app/staff/page.tsx`)
- **Root Cause:** The Question Papers tab only contained an "+ Add Question" button, with no UI mechanism to create a new question paper. Staff could only attach questions to paper ID 1.
- **Remediation:** Added a "+ Create Paper" button and modal on the Question Papers tab in `src/app/staff/page.tsx`, wired to `POST /staff/add_qpap`. The modal supports paper title, included subjects, exam type, and duration.
- **Verification:** Verified in Journey 2b (`Test 5-6`).

### Defect 5: Online Exam Scheduling Crash & Cascading Deletion (`backend/routers/staff.py`, `src/app/staff/page.tsx`)
- **Root Cause:** `POST /staff/del_onex` crashed when invoked with JSON bodies because it expected form-data only. Furthermore, the schedule modal lacked dropdowns to choose the question paper, cohort, and centre.
- **Remediation:** 
  1. Updated `add_onex` to parse question paper, cohort, and campus centre from the schedule modal.
  2. Updated `del_onex` to support JSON payloads and cascade-delete child `ExamAttempt` records before deleting the schedule to preserve relational integrity.
  3. Added "Delete" actions with confirmation dialogs to every exam card in `src/app/staff/page.tsx`.
- **Verification:** Verified in Journey 2c (`Test 7`) and Phase J suite (`Test 35-37`).

### Defect 6: Missing Student Roster Deletion (`backend/routers/staff.py`, `src/app/staff/page.tsx`)
- **Root Cause:** Staff could add or import students but had no UI or API endpoint to delete invalid or test student accounts.
- **Remediation:** Added `POST /staff/del_studs` in `backend/routers/staff.py` with multi-tenant isolation and attempt cascade-cleanup. Added an "Actions" column with delete triggers to the Student Roster table in `src/app/staff/page.tsx`.
- **Verification:** Verified in backend and staff console.

### Defect 7: CBT Player Silent Token Loss & Zero-Question Crash (`src/app/exam/[id]/player-client.tsx`, `results-client.tsx`)
- **Root Cause:** Neither `player-client.tsx` nor `results-client.tsx` sent `Authorization: Bearer <token>` in fetch headers, relying exclusively on cookies. In isolated browser sessions where cookies were blocked or cross-origin, requests failed silently. Additionally, if an exam had zero questions, the player remained stuck on "INITIALIZING CBT PLAYER..." indefinitely with no error banner.
- **Remediation:** Added token propagation from `localStorage` in both client components. Added user-friendly Neo-Brutalist error banners with "Return to Candidate Portal" links when exams cannot be loaded or have zero questions.
- **Verification:** Verified in Journey 3 (`Test 19-26`).

### Defect 8: Scorecard Resolution Ambiguity Between Attempt ID and Exam ID (`backend/routers/cbt.py`)
- **Root Cause:** When `GET /api/exam/{exam_id}/result` was called with exam ID 1, lookup by attempt ID 1 matched the oldest attempt in the database (score 4.0) rather than the attempt the candidate just submitted (score 3.0).
- **Remediation:** Updated candidate scorecard resolution to first check if `exam_id` matches an `ExamSchedule`. If so, it returns the student's *latest* submitted attempt for that exam schedule. If no exam schedule matches, it resolves by attempt ID.
- **Verification:** Verified in `scripts/verify-contracts-and-security.js` (`Test 12: Score in scorecard (3) matches submitted score (3)`).

---

## 3. Comprehensive Verification Matrix

| Verification Suite | Target | Tests Executed | Passed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`scripts/audit-real-user-flows.js`** | Real Chromium browser interactions across all 3 user journeys | 29 | 29 | **100% PASS** |
| **`scripts/test-phase-j-features.js`** | Vertical slice feature APIs (CSV, Structure, Q-bank, Notices, Absentees) | 50 | 50 | **100% PASS** |
| **`scripts/verify-contracts-and-security.js`** | Security boundaries, answer key confidentiality, multi-tenancy, idempotency | 13 | 13 | **100% PASS** |
| **`npm run build`** | Next.js 16 production build & TypeScript validation | 9 routes | 9 | **100% PASS** |

### Verified User Journeys (Chromium E2E)
1. **Journey 1: Authentication Boundaries & Root Redirects**
   - Root URL `/` cleanly redirects to `/login`.
   - Invalid credentials display Neo-Brutalist error toast.
2. **Journey 2: Staff Console Full Lifecycle**
   - Authentication as Staff & redirection to `/staff`.
   - Capacity and quota metric cards rendered.
   - Question paper creation modal and persistence.
   - Online exam scheduling for student cohort.
   - Scorecard review with question-by-question reconciliation and candidate metadata.
   - Session logout and post-logout redirection to `/login`.
3. **Journey 3: Candidate Portal & CBT Assessment Engine**
   - Candidate login & redirection to `/student`.
   - Personal profile card, assigned exam schedule, and notices rendered.
   - CBT Player launch for freshly scheduled exam.
   - Timed question navigation, option selection, and mark-for-review toggle.
   - Confirmation modal & final exam submission.
   - Scorecard display with authoritative score evaluation.
   - Navigation back to Candidate Portal showing completed attempt in submission history.
   - Clean sign out and return to `/login`.

---

## 4. File Modification Inventory

- `backend/routers/auth.py`: Added `POST /logout` and `GET /logout` cookie clearing endpoints.
- `backend/routers/cbt.py`: Created `GET /api/exam/student/portal`, restructured `get_result` with tiered exam/attempt resolution, candidate isolation, and score reconciliation.
- `backend/routers/staff.py`: Added `POST /staff/del_studs`, updated `POST /staff/del_onex` to accept JSON and cascade-delete child attempts safely.
- `src/app/login/page.tsx`: Added candidate routing to `/student`, added explicit form input IDs (`#username`, `#password`).
- `src/app/student/page.tsx`: Created new candidate portal page in Neo-Brutalist design language.
- `src/app/staff/page.tsx`: Added "+ Create Paper" modal, exam deletion, student deletion, and wired `/logout`.
- `src/app/exam/[id]/player-client.tsx`: Added token propagation, error boundary with return link, and responsive submit dialog.
- `src/app/results/[id]/results-client.tsx`: Added token propagation, error handling, candidate metadata display, and navigation links.
- `scripts/audit-real-user-flows.js`: Real Chromium Playwright user journey verification suite.
