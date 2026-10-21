# INTERACTION_MATRIX.md — User Interactions & State Transitions

```
User Action ──► Component Handler ──► API Request ──► Backend Processing ──► Database Update ──► UI State Transition
```

---

## 1. Authentication Flows

| Action Trigger | Component Handler | Network Request | Database Effect | UI Response |
|---|---|---|---|---|
| Click "Sign In" | `LoginPage.handleSubmit` | `POST /login` (form-data / JSON) | Query `User` matching `tenant_id` + `username`; verify salt/hash | Sets `sessionid` cookie; router pushes to `/staff` or `/exam/1` |
| Invalid Password | `LoginPage.handleSubmit` | `POST /login` | None | Displays red error banner: "Invalid username or password" |
| Switch Role Tab | `LoginPage.setTab` | None (Client state) | None | Pre-fills test credentials (`ezexam@yopmail.com` vs `student@ezexam.local`) |
| Click "Sign Out" | Header Link | `GET /login` | Clears cookie | Navigates back to login screen |

---

## 2. Staff Examination Management Flows

| Action Trigger | Component Handler | Network Request | Database Effect | UI Response |
|---|---|---|---|---|
| Load Dashboard | `StaffDashboard.useEffect` | `POST /staff/get_cap`<br>`POST /staff/get_qexams_paging`<br>`POST /staff/get_qpaps`<br>`POST /staff/get_studs_paging` | Read `Tenant`, `ExamSchedule`, `QuestionPaper`, `User` | Populates capacity cards, exam table, paper cards, and student roster |
| Click "+ Schedule New Exam" | `setShowExamModal(true)` | None | None | Opens modal with duration, anti-cheat limits, and proctoring switches |
| Submit Exam Schedule Form | `handleCreateExam` | `POST /staff/add_onex` | Inserts new `ExamSchedule` row | Closes modal, re-fetches exams, displays new exam in table |
| Click "+ Add Question" | `setShowQModal(true)` | None | None | Opens question builder modal |
| Save Question to Paper | `handleAddQuestion` | `POST /staff/add_qstn` | Inserts `Question` row linked to `qpap_id` | Closes modal, alerts confirmation, updates paper questions |
| Click "+ Add Student" | `setShowStudentModal(true)` | None | None | Opens student registration modal |
| Submit Student Form | `handleAddStudent` | `POST /staff/add_stud` | Inserts `User` with role `student` | Closes modal, re-fetches student list, appends new student row |

---

## 3. Candidate CBT Exam Player Flows

| Action Trigger | Component Handler | Network Request | Database Effect | UI Response |
|---|---|---|---|---|
| Mount Exam Player | `ExamPlayerClient.useEffect` | `POST /api/exam/{id}/start` | Retrieves `ExamSchedule` + `QuestionPaper`; creates active `ExamAttempt` row if none | Renders question 1, sets countdown timer, initializes question palette |
| Select MCQ Option | `handleOptionSelect(opt)` | `POST /api/exam/{id}/save_response` | Updates `ExamAttempt.responses_json` | Option bubble fills blue with checkmark; palette item turns Green (Answered) |
| Multi-Select Checkbox | `handleOptionSelect(opt)` | `POST /api/exam/{id}/save_response` | Appends/removes option from array in `responses_json` | Checkbox toggles; palette updates status |
| Numerical Input | `handleNumericalInput(val)` | `POST /api/exam/{id}/save_response` | Stores decimal/integer value in `responses_json` | Input value updates; palette turns Green |
| Click "Clear Response" | `handleClearResponse` | `POST /api/exam/{id}/save_response` | Clears answer array for question | Options deselected; palette turns Amber (Unanswered) |
| Click "Mark for Review" | `handleMarkForReview` | `POST /api/exam/{id}/save_response` | Sets status to `"REVIEW"` in `responses_json` | Palette item turns Purple (Marked for Review) |
| Switch Tabs / Minimize | `visibilitychange` listener | `POST /api/exam/{id}/log_event` | Increments `ExamAttempt.switch_count` | Displays amber pulsating warning banner with switch count |
| Switch Limit Exceeded | `handleVisibilityChange` | `POST /api/exam/{id}/submit` | Finalizes attempt and evaluates score | Alerts user and navigates to `/results/{id}` |
| Click "Submit Exam" | `setShowSubmitModal(true)` | None | None | Opens modal with answered, review, and unanswered counters |
| Confirm Submission | `handleSubmitExam` | `POST /api/exam/{id}/submit` | Evaluates score against answer keys; sets status to `SUBMITTED`; sets `end_time` | Router redirects to `/results/{id}` scorecard |
