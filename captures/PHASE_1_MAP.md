# EZexam Platform Architecture & API Map (Phase 1 Deliverable)

> Reverse-engineered from live production instance: `https://ezexam.in` and `https://ezexamqwertyuiop.ezexam.in`

---

## 1. Authentication & Multi-Tenancy Architecture

### 1.1 Multi-Tenant Subdomain Model
- **Main Domain (`ezexam.in`):** Public marketing, signup, and global authentication gateway.
- **Tenant Subdomain (`{sdom}.ezexam.in`):** Each institution/coaching center receives an isolated portal (e.g. `ezexamqwertyuiop.ezexam.in`).
- **User Roles:**
  - `admin` / `staff` (Super-admin of the tenant portal)
  - `faculty` (Question paper creator, batch manager)
  - `cheads` (Centre Heads / Branch administrators)
  - `student` (Exam taker / Result viewer)

### 1.2 Authentication Protocol
- **Endpoint:** `POST https://{sdom}.ezexam.in/login`
- **Request Parameters:**
  - `csrfmiddlewaretoken`: CSRF token from cookie or form
  - `sdom`: Subdomain / Account slug (e.g. `ezexamqwertyuiop`)
  - `username`: Email / Phone / Student ID
  - `password`: User password
  - `next`: Post-login redirect path (defaults to `staff` for admin/faculty)
- **Response Format (JSON):**
  ```json
  {
    "login_status": "OK",
    "error": "",
    "redirect": "staff"
  }
  ```
- **Session Cookie:** Django-compatible `sessionid` and `csrftoken`.

---

## 2. Staff Dashboard Structure (`/staff`)

The dashboard is structured as a rich Single Page Application (SPA) with tabbed navigation:

1. **Dashboard Home / Overview (`/staff#`):**
   - Plan & Capacity Widget: Displays remaining exam attempts, active students, subscription expiry (`/staff/get_cap`).
   - Quick Action Cards: Create Exam, Add Question Paper, Upload Students, Scan OMR.
2. **Online Exams (`/staff#qexam-qstns`, `/staff#qexam-share`):**
   - Active, Scheduled, and Expired exams table (`/staff/get_qexams_paging`).
   - Modal: Create / Schedule Online Exam (`#form-add-onex`).
3. **Question Papers & Question Bank:**
   - Question paper inventory (`/staff/get_qpaps`).
   - Question builder: Supports Single Correct, Multi-Correct, Numerical Integer, True/False, Matrix Match, and Coding Test Cases (`/staff/add_qstn`, `/staff/manage_testcases`).
4. **Student & Batch Management:**
   - Student directory with paging & filter (`/staff/get_studs_paging`).
   - Bulk upload via CSV (`/staff/add_studs_csv`).
   - Parent contact and communication management (`/staff/edit_parents`).
5. **Exam Evaluation & Analytics (`/staff#qexam-res`):**
   - Submissions log, real-time attempt tracking (`/staff/get_subm_log`).
   - Batch & Student rank analytics (`/staff/gen_onex_anal`).
   - PDF & Excel report generator (`/staff/gen_report`, `/staff/download_report`).
6. **OMR Scanner & Offline Exam Support:**
   - OMR template configuration (100q-ABCD, 120q, 200q NEET/JEE).
   - Bulk ZIP scanner upload (`/staff/scans_zip_upload`).

---

## 3. Discovered Internal APIs (85 Endpoints Categorized)

### Category A: Authentication, Account & Capacity (6 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/login` | `POST` | Authenticate user into tenant portal |
| `/staff/get_cap` | `POST` | Get credits, active attempts, capacity left, subscription validity |
| `/staff/update_insti` | `POST` | Update institute name, logo, sub-brand settings |
| `/staff/get_promo_code` | `POST` | Discount/Coupon verification |
| `/staff/usage_report` | `POST` | Periodic usage analytics report |
| `/staff/replace_key_csv` | `POST` | Update exam answer keys via CSV |

### Category B: Online Exams & Scheduling (14 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/get_qexams` | `POST` | Fetch list of active and drafted exams |
| `/staff/get_qexams_paging` | `POST` | Paged & filtered exam table list |
| `/staff/get_onexs` | `POST` | Fetch all scheduled online exams |
| `/staff/add_onex` | `POST` | Create or update an online exam schedule |
| `/staff/add_onex_link` | `POST` | Generate direct candidate access link |
| `/staff/create_exam_surl` | `POST` | Create shortened URL for exam |
| `/staff/del_onex` | `POST` | Delete scheduled exam |
| `/staff/del_exam` | `POST` | Delete entire exam entity |
| `/staff/del_exam_otp` | `POST` | 2FA verification for destructive deletion |
| `/staff/onexam/` | `GET/POST` | Exam live administration monitor |
| `/staff/onexam-eval/` | `GET/POST` | Live evaluation console |
| `/staff/get_onex_studs` | `POST` | Get eligible assigned students for an exam |
| `/staff/api_get_sprocs` | `POST` | Proctored exam violation feeds |
| `/staff/api_del_sproc` | `POST` | Clear proctor violation flags |

### Category C: Question Papers & Question Bank (12 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/get_qpaps` | `POST` | Fetch list of question papers |
| `/staff/add_qpap` | `POST` | Create a new question paper |
| `/staff/del_qpap` | `POST` | Delete question paper |
| `/staff/update_qpap_status` | `POST` | Lock/Publish question paper |
| `/staff/add_qstn` | `POST` | Add question with options, marks, media |
| `/staff/update_qstn` | `POST` | Edit existing question |
| `/staff/del_qstn` | `POST` | Delete question |
| `/staff/get_txtqs` | `POST` | Retrieve raw text of questions |
| `/staff/qbank_qpap_qno` | `POST` | Link question bank question to paper |
| `/staff/manage_testcases` | `POST` | Manage coding question input/output test cases |
| `/staff/add_qpap_omr` | `POST` | Configure OMR-compatible question paper |
| `/staff/add_qpap_res` | `POST` | Attach solutions & explanations to question paper |

### Category D: Students & Batches (13 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/get_studs_paging` | `POST` | Filtered student roster with pagination |
| `/staff/add_stud` | `POST` | Register individual student |
| `/staff/add_studs_csv` | `POST` | Bulk import students from CSV |
| `/staff/del_studs` | `POST` | Delete selected students |
| `/staff/del_studs_otp` | `POST` | OTP verification for bulk student deletion |
| `/staff/download_studs` | `POST` | Export student roster to Excel/CSV |
| `/staff/get_stud_parents` | `POST` | Get guardian phone, email, and name |
| `/staff/edit_parents` | `POST` | Update student guardian records |
| `/staff/studs_select_fields` | `GET` | Field metadata for student columns |
| `/staff/omrex_assign_studs` | `POST` | Map students to physical OMR roll numbers |
| `/staff/get_notice_studs` | `POST` | Get recipients list for announcements |

### Category E: Evaluation, Results & Analytics (11 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/get_res` | `POST` | Fetch candidate exam results |
| `/staff/get_subm` | `POST` | Fetch individual submission answers |
| `/staff/get_subm_log` | `POST` | Real-time candidate activity logs (switch counts, time per Q) |
| `/staff/del_subm` | `POST` | Invalidate/Delete student attempt |
| `/staff/set_subm_nonfinal` | `POST` | Allow candidate to resume interrupted exam |
| `/staff/gen_onex_anal` | `POST` | Compute exam analytics (percentile, rank, difficulty index) |
| `/staff/gen_report` | `POST` | Generate consolidated batch performance report |
| `/staff/download_report` | `POST` | Download report spreadsheet / PDF |
| `/staff/del_anals` | `POST` | Clear generated analytics cache |
| `/staff/get_absentees` | `POST` | List students who did not attempt |
| `/staff/get_subjective` | `POST` | Review manually evaluated subjective answers |

### Category F: Faculty, Centres & Classes (13 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/get_facs` | `POST` | List faculty members |
| `/staff/add_fac` | `POST` | Add/Update faculty account & subject access |
| `/staff/del_fac` | `POST` | Delete faculty account |
| `/staff/get_cheads` | `POST` | List Centre Heads |
| `/staff/add_ch` | `POST` | Add/Update Centre Head |
| `/staff/del_ch` | `POST` | Delete Centre Head |
| `/staff/add_clbr` | `POST` | Add class or branch |
| `/staff/add_edit_centre` | `POST` | Create or update examination centre |
| `/staff/add_edit_class` | `POST` | Manage academic grades/standards |
| `/staff/add_edit_subj` | `POST` | Manage academic subjects |
| `/staff/add_edit_extype` | `POST` | Configure exam pattern (JEE, NEET, Board) |

### Category G: OMR Processing (6 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/scans_zip_upload` | `POST` | Upload scanned OMR sheet images (ZIP) |
| `/staff/get_omr_log` | `POST` | Scan processing log and OCR errors |
| `/staff/get_omr_resps` | `POST` | Optical mark responses detected per student |
| `/staff/omr_set_qresp` | `POST` | Manual correction for blurred bubbles |
| `/staff/omr_update_roll` | `POST` | Correct misread roll number |
| `/staff/set_omr_ignore` | `POST` | Exclude defective scan from grading |

### Category H: Study Materials & Communication (10 APIs)
| Endpoint | Method | Description |
|---|---|---|
| `/staff/get_notes` | `POST` | Retrieve PDF notes |
| `/staff/add_notes` | `POST` | Upload PDF notes for batch |
| `/staff/del_notes` | `POST` | Delete notes |
| `/staff/get_videos` | `POST` | List video lectures |
| `/staff/add_video` | `POST` | Add YouTube/Vimeo/S3 video lesson |
| `/staff/del_video` | `POST` | Delete video |
| `/staff/get_notices` | `POST` | List bulletin notices |
| `/staff/add_notice` | `POST` | Post announcement notice |
| `/staff/del_notice` | `POST` | Delete notice |
| `/staff/post_mess` | `POST` | Send SMS/Email broadcast to students/parents |

---

## 4. Key Exam Engine Data Models

From captured payloads and response shapes:

### 4.1 Exam Schedule Entity (`Onex` / `QExam`)
```typescript
interface ExamSchedule {
  id: number;
  name: string;
  qpap_id: number;
  stime: string;             // ISO start timestamp
  etime: string;             // ISO end timestamp
  mins: number;              // Exam duration in minutes
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED';
  shuf: boolean;             // Question shuffling
  cam: boolean;              // Web-cam proctoring enabled
  pc_only: boolean;          // Reject mobile devices
  switches: boolean;         // Tab/Window switch monitoring
  num_switches: number;      // Max allowed switches before auto-submit
  hide_qs: boolean;          // Do not reveal questions post-exam
  hide_res: boolean;         // Hide score until published
  hide_anal: boolean;        // Hide percentile/solutions
  hide_rank: boolean;        // Hide rank leaderboards
  prac: boolean;             // Practice mode (infinite attempts)
  sec_skip: boolean;         // Allow non-linear section navigation
  branches: string[];        // Target student batches (e.g. JEE-Main, NEET)
  centres: string[];         // Assigned exam centres
}
```

### 4.2 Question Entity (`Question`)
```typescript
interface Question {
  id: number;
  qpap_id: number;
  qno: number;
  type: 
    | 'SINGLE_CORRECT'       // A, B, C, D
    | 'MULTI_CORRECT'        // Any subset of A-D or A-K
    | 'NUMERICAL'            // Floating point / range
    | 'INTEGER'              // Single digit integer 0-9
    | 'TRUE_FALSE'
    | 'CODING';              // Evaluated with testcases
  qtxt: string;              // HTML / Markdown / LaTeX text
  qimg_url?: string;         // Diagram / Question image
  key: string[];             // Correct answer keys (e.g. ["A", "C"])
  cmk: number;               // Correct marks (e.g. +4)
  imk: number;               // Negative marks (e.g. -1)
  pmk?: number;              // Partial marks (for multi-correct)
  diff: 'EASY' | 'MEDIUM' | 'HARD';
  subj: string;              // Maths, Physics, Chemistry
  topic?: string;
  test_cases?: {             // For coding questions
    input: string;
    output: string;
    explanation?: string;
    visible: boolean;
    marks: number;
  }[];
}
```

---

## 5. Summary of Phase 1 Deliverables
1. **Live credentials tested:** Successfully logged into both public gateway and tenant subdomain.
2. **Visual Evidence:** 27 full-page screenshots captured in `captures/screenshots/`.
3. **DOM Models:** 35+ page DOM trees captured in `captures/dom/`.
4. **Endpoint Inventory:** 85 production API routes discovered, contextualized, and categorized in `captures/staff_api_taxonomy.json`.
5. **Architectural Specification:** Full models, schemas, and interaction flows defined in this document.
