# Artix Recovery Mission: Reality Audit, Reference Extraction & Functional Rebuild Report

> **Project:** Artix (Local Reconstruction of Authorized EZexam Examination Platform)  
> **Repository:** `https://github.com/aurtxx/artix`  
> **Target Analyzed:** Authorized EZexam reference environment (`ezexam.in` / `ezexamqwertyuiop.ezexam.in`)  
> **Architecture:** Next.js 16 (App Router, Turbopack, TypeScript, Tailwind CSS) + FastAPI (Python 3.11) + SQLAlchemy + SQLite (`ezexam.db`)  
> **Design Language:** Neo-Brutalist Editorial Utility (`border-2 border-slate-900`, hard geometric drop shadows `shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]`, rectangular monospace tiles, tactile active button depression, zero generic glassmorphism)  
> **Verification Status:** 100% Green (29/29 Browser Reality Tests, 50/50 Feature Tests, 13/13 Security Tests, Clean Next.js 16 Production Build)  

---

## 1. Executive Summary

In response to the user directive noting that "practically everything is broken," we executed a comprehensive, forensic reality audit of the live runtime application. Rather than assuming previous claims were accurate, we conducted tests directly against the running stack via Chromium automation, inspected SQLite database states, and traced every user journey through UI, HTTP, API, and DB boundaries.

We diagnosed eight real-world failure root causes across routing, multi-tenancy, authentication persistence, student experience, and exam lifecycle. Every defect was remediated with high-fidelity, architecture-compliant code and verified with real automated browser workflows.

---

## 2. Discovered Real-World Defects & Resolved Root Causes

1. **Scorecard Review 404 & Mismatched Scoping (`backend/routers/cbt.py`):**
   - *Problem:* In the staff dashboard, clicking "Review" navigated to `/results/{attempt_id}`. However, `get_result` in `cbt.py` assumed the URL parameter was strictly `exam_id` and performed `models.ExamAttempt.user_id == user.id`. Staff reviewing student submissions resulted in a 404 error and infinite loading.
   - *Resolution:* Restructured `get_result` with tiered resolution. Staff can review any student attempt within their tenant by `attempt_id`, while candidates can review their own submissions. Added candidate name and roll number metadata to response payload.

2. **Session Invalidation & Zombie Cookie Retention (`backend/routers/auth.py`, frontend):**
   - *Problem:* No `/logout` endpoint existed in the backend. Clicking "Sign Out" merely cleared `localStorage`, leaving HTTP-only cookies (`sessionid` and `access_token`) active.
   - *Resolution:* Added `GET` and `POST /logout` endpoints to delete cookies. Updated headers in `/staff`, `/student`, and `/results` to invoke `/logout` on exit.

3. **Missing Candidate Portal & Redirection Trap (`src/app/student/page.tsx`, `backend/routers/cbt.py`):**
   - *Problem:* Logging in as a student redirected to hardcoded `/exam/1`. Candidates had no dashboard to view assigned exams, past scorecards, or notices.
   - *Resolution:* Created `GET /api/exam/student/portal` in `cbt.py` to return the student profile, assigned cohort exams, past submissions, and targeted announcements. Built `src/app/student/page.tsx` adhering to Neo-Brutalism and redirected student logins to `/student`.

4. **Dead Question Paper Creation in Staff Console (`src/app/staff/page.tsx`):**
   - *Problem:* No UI trigger existed to create a new question paper; only adding questions to paper 1 was possible.
   - *Resolution:* Added `+ Create Paper` button and modal on the Question Papers tab, wired to `POST /staff/add_qpap`.

5. **Online Exam Scheduling & Deletion Lifecycle (`backend/routers/staff.py`, `src/app/staff/page.tsx`):**
   - *Problem:* `POST /staff/del_onex` crashed on JSON bodies and had no UI trigger. The scheduling modal lacked question paper and cohort selectors.
   - *Resolution:* Added paper, cohort, and centre selectors to the scheduling modal. Added a "Delete" button to each exam row with confirmation prompt. Updated `del_onex` to accept JSON and cascade-delete child attempts safely.

6. **Student Record Deletion (`backend/routers/staff.py`, `src/app/staff/page.tsx`):**
   - *Problem:* Staff could not delete registered or test students.
   - *Resolution:* Added `POST /staff/del_studs` in `staff.py` to delete students and cascade-clean attempts. Added an "Actions" column with a delete button to the Student Roster table.

7. **CBT Engine Error Handling & Token Propagation (`src/app/exam/[id]/player-client.tsx`, `results-client.tsx`):**
   - *Problem:* Neither client sent `Authorization: Bearer <token>`, causing silent fallback. If an exam had zero questions, the player hung indefinitely on "INITIALIZING CBT PLAYER...".
   - *Resolution:* Added `Authorization` header propagation. Added explicit error banners and a "Return to Portal" link when exams cannot be loaded or have zero questions.

8. **Scorecard Ambiguity Between Attempt ID and Exam ID (`backend/routers/cbt.py`):**
   - *Problem:* When requesting `/api/exam/1/result` after submitting exam 1, lookup by attempt ID 1 matched an older attempt rather than the attempt just submitted.
   - *Resolution:* For candidates requesting results for an exam ID, the endpoint returns the candidate's *latest* submitted attempt for that exam schedule.

---

## 3. Verification Evidence

### A. Chromium Browser Reality Verification (`scripts/audit-real-user-flows.js`)
Executed complete real-world user journeys across Chromium headless browser:
- **Journey 1: Authentication Boundaries & Root Redirects** (Tests 1-2): Clean redirection of `/` to `/login`, failed credential rejection toasts.
- **Journey 2: Staff Console Full Lifecycle** (Tests 3-14): Capacity metrics, question paper creation, online exam cohort scheduling, submission scorecard review, question-by-question reconciliation, staff logout, and post-logout `/staff` boundary protection.
- **Journey 3: Candidate Portal & CBT Assessment Engine** (Tests 15-29): Candidate login to `/student`, active exam discovery, launching CBT Player, question palette interaction, option selection, mark for review, submission confirmation, scorecard evaluation, return to portal, submission history verification, and candidate sign out.
- **Result:** **29 / 29 PASSED (100%)**

### B. Phase J Vertical Feature Verification (`scripts/test-phase-j-features.js`)
- Academic Structure (Centres, Batches, Subjects): 12 tests passed
- Student Bulk CSV Ingestion & Roster Export: 9 tests passed
- Question Bank In-Place Editor & Cascade Safety: 14 tests passed
- Digital Noticeboard Broadcasts: 6 tests passed
- Candidate Submissions & Absentee Tracking: 9 tests passed
- **Result:** **50 / 50 PASSED (100%)**

### C. Backend Contract & Security Audit (`scripts/verify-contracts-and-security.js`)
- Answer Key Confidentiality (0 keys leaked to candidate payload)
- Authentication & JWT Token Lifecycle
- Multi-Tenant Data Scoping
- Concurrent Autosaves & State Persistence
- Idempotent Submission & Authoritative Scoring
- **Result:** **13 / 13 PASSED (100%)**

### D. Next.js 16 Production Build
- `npm run build`: Compiled with Turbopack in 1130ms, all 9 routes statically or partially prerendered with 0 TypeScript/ESLint errors.

---

## 4. Documentation & Git Artifacts

- Comprehensive forensic recovery report: [`reverse-engineering/RECOVERY_AUDIT.md`](reverse-engineering/RECOVERY_AUDIT.md)
- Complete reality user flow test script: [`scripts/audit-real-user-flows.js`](scripts/audit-real-user-flows.js)
- Candidate portal frontend implementation: [`src/app/student/page.tsx`](src/app/student/page.tsx)
- Rebuilt backend routers: [`backend/routers/cbt.py`](backend/routers/cbt.py), [`backend/routers/staff.py`](backend/routers/staff.py), [`backend/routers/auth.py`](backend/routers/auth.py)
