# ROUTE_MATRIX.md — Complete Reference & Reconstruction Route Mapping

| Reference Route | HTTP Method | Role Required | Local Path | Component / Handler | Observable Reference Behavior | Reconstructed Status |
|---|---|---|---|---|---|---|
| `ezexam.in/` | `GET` | Public | `/` | `src/app/page.tsx` | Marketing landing page; redirects to login | Implemented & Verified |
| `ezexam.in/login` | `GET` | Public | `/login` | `src/app/login/page.tsx` | Login with `sdom`, username, password, phone OTP | Implemented & Verified |
| `{sdom}.ezexam.in/login` | `GET/POST` | Public | `/login` | `src/app/login/page.tsx` | Subdomain specific branded login portal | Implemented & Verified |
| `{sdom}.ezexam.in/staff` | `GET` | Staff / Admin | `/staff` | `src/app/staff/page.tsx` | Main staff SPA containing all assessment tools | Implemented & Verified |
| `{sdom}.ezexam.in/staff#qexam-qstns` | `GET` | Staff | `/staff?tab=qpapers` | `StaffDashboard` (Tab: Question Papers) | Question bank & paper creator | Implemented & Verified |
| `{sdom}.ezexam.in/staff#qexam-share` | `GET` | Staff | `/staff?tab=exams` | `StaffDashboard` (Tab: Online Exams) | Scheduled exams grid & scheduler | Implemented & Verified |
| `{sdom}.ezexam.in/staff#qexam-atts` | `GET` | Staff | `/staff?tab=students` | `StaffDashboard` (Tab: Student Roster) | Student roster & batch manager | Implemented & Verified |
| `{sdom}.ezexam.in/staff#qexam-res` | `GET` | Staff | `/staff?tab=results` | `StaffDashboard` (Tab: Results & Submissions) | Attempt analytics & scorecard logs | Implemented & Verified |
| `{sdom}.ezexam.in/onexam/{id}` | `GET` | Candidate | `/exam/[id]` | `src/app/exam/[id]/page.tsx` | Fullscreen CBT test-taking player | Implemented & Verified |
| `{sdom}.ezexam.in/onexam-eval/{id}` | `GET` | Candidate / Staff | `/results/[id]` | `src/app/results/[id]/page.tsx` | Scorecard & detailed solution review | Implemented & Verified |
| `/api/auth/me` | `GET` | Authenticated | `/api/auth/me` | `backend/routers/auth.py` | Retrieves active user identity and tenant metadata | Implemented & Verified |
| `/api/health` | `GET` | Public | `/api/health` | `backend/main.py` | System health check and database status | Implemented & Verified |

---

## Route Boundary Specifications

### 1. `/login`
- **Initial State:** Branded login box with tenant slug (`sdom`), email/username, password, and tab toggle between Staff and Candidate.
- **Empty Fields:** Form input triggers client validation (`required`).
- **Invalid Credentials:** Backend returns `{ "login_status": "FAILED", "error": "Invalid username or password." }`; displayed in alert container.
- **Success:** Sets HTTP-only `sessionid` and `access_token` cookies, redirects staff to `/staff` and candidate to `/exam/1`.

### 2. `/staff`
- **Initial State:** Fetches capacity widget metrics (`/staff/get_cap`), paged exams (`/staff/get_qexams_paging`), question papers (`/staff/get_qpaps`), student roster (`/staff/get_studs_paging`), and submissions (`/staff/get_res`).
- **Interactive Modals:**
  - `Schedule New Exam`: Configures duration, anti-cheat limits, shuffling, and proctoring.
  - `Add Question`: Configures question text, subject, type, options, answer key, and mark weights (`+4`, `-1`).
  - `Add Student`: Registers student with roll number, batch, and credentials.
- **Empty States:** When no submissions exist, displays guidance to launch an active exam.

### 3. `/exam/[id]`
- **Initial State:** Loads questions without answer keys (`POST /api/exam/{id}/start`). Sets countdown timer based on exam duration (`mins`).
- **Timer Expiry:** Automatically submits exam when `timeLeftSeconds === 0`.
- **Anti-Cheat Signal:** Listens to `visibilitychange`. If user tabs away, logs switch (`POST /api/exam/{id}/log_event`), displays warning banner, and auto-submits if limit reached.
- **Palette Grid:** 5-column responsive grid tracking questions as Answered (Green), Marked for Review (Purple), and Unanswered (Amber/Grey).

### 4. `/results/[id]`
- **Initial State:** Displays candidate score, maximum marks, accuracy percentage, proctoring switch count, and question-by-question review.
- **Review Card:** Compares student's selected answer against authoritative answer key with positive/negative mark breakdown.
