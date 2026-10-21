# FEATURE_CATALOG.md — Comprehensive Reference Feature Catalog

> **Scope:** Complete feature extraction from the authorized reference examination platform (`ezexam.in` / `ezexamqwertyuiop.ezexam.in`) based on `captures/staff_page.html`, `captures/staff_endpoints_manifest.json`, `captures/staff_api_taxonomy.json`, and client bundle event handlers.

---

## 1. Feature Family Summary Matrix

| ID | Feature Family | Core Reference Endpoints | Intended Roles | Current Local Status | Local Feasibility |
|---|---|---|---|---|---|
| **FAM-01** | **Institution Configuration & Academic Structure** | `/staff/add_edit_centre`, `/staff/add_edit_class`, `/staff/add_edit_subj`, `/staff/add_clbr` | Admin | **PARTIALLY_VERIFIED** | High (Pure Software) |
| **FAM-02** | **Faculty & Class-Head Administration** | `/staff/add_fac`, `/staff/del_fac`, `/staff/get_facs`, `/staff/add_ch`, `/staff/del_ch` | Admin | **INFERRED** | High (Pure Software) |
| **FAM-03** | **Student Roster, Bulk CSV Ingestion & Export** | `/staff/add_stud`, `/staff/add_studs_csv`, `/staff/download_studs`, `/staff/del_studs` | Admin, Faculty | **PARTIALLY_VERIFIED** | High (Pure Software) |
| **FAM-04** | **Question Bank Authoring, Editing & Paper Composition** | `/staff/add_qpap`, `/staff/add_qstn`, `/staff/update_qstn`, `/staff/del_qstn`, `/staff/del_qpap` | Admin, Faculty | **PARTIALLY_VERIFIED** | High (Pure Software) |
| **FAM-05** | **Exam Scheduling, Window Controls & Candidate Assignment** | `/staff/add_onex`, `/staff/del_onex`, `/staff/get_qexams_paging`, `/staff/get_absentees` | Admin, Faculty | **VERIFIED** | High (Pure Software) |
| **FAM-06** | **Candidate CBT Exam Player & Anti-Cheat Engine** | `/api/exam/{id}/start`, `/save_response`, `/log_event`, `/submit` | Candidate | **VERIFIED** | High (Pure Software) |
| **FAM-07** | **Evaluation, Authoritative Grading & Scorecards** | `/api/exam/{id}/result`, `/staff/get_res`, `/staff/download_report`, `/staff/del_subm` | Admin, Candidate | **VERIFIED** | High (Pure Software) |
| **FAM-08** | **Digital Noticeboard & Educational Resources** | `/staff/add_notice`, `/staff/get_notices`, `/staff/add_notes`, `/staff/get_notes` | Faculty, Student | **INFERRED** | High (Pure Software) |
| **FAM-09** | **Capacity, System Quotas & Licensing** | `/staff/get_cap`, `/staff/usage_report` | Admin | **VERIFIED** | High (Pure Software) |
| **FAM-10** | **Legacy Physical OMR Sheet Processing** | `/staff/scans_zip_upload`, `/staff/get_omr_log`, `/staff/omr_update_roll` | Admin | **OBSERVED_OUT_OF_SCOPE** | Low (Hardware Dependent) |

---

## 2. In-Depth Feature Specifications

### FAM-01: Institution Configuration & Academic Structure

#### FEAT-01A: Campus Centres Management
- **Description:** Allows institution administrator to define physical or virtual exam centres (e.g., "Main Campus", "North Annex").
- **UI Entry Point:** Staff Dashboard Settings / Academic Structure modal.
- **Reference AJAX Caller:**
  ```javascript
  $.ajax({
    url: "/staff/add_edit_centre",
    type: "POST",
    data: { old_centre: old_centre, new_centre: new_centre, delete_centre: false }
  });
  ```
- **Local Implementation Plan:** Add `Centre` model linked to `Tenant`. Implement `GET/POST /staff/centres` and management UI.

#### FEAT-01B: Academic Branches & Classes
- **Description:** Categorizes student cohorts into batches (e.g., "JEE-Main-2027", "NEET-Cohort-A").
- **UI Entry Point:** Staff Dashboard Settings / Academic Structure.
- **Reference AJAX Caller:** `/staff/add_edit_class` with `old_class`, `new_class`, `delete_class`.
- **Local Implementation Plan:** Add `Branch` model linked to `Tenant`. Implement batch selectors across student and exam creation forms.

#### FEAT-01C: Academic Subject Taxonomy
- **Description:** Defines subjects evaluated in exams (e.g., "Physics", "Chemistry", "Mathematics", "Biology").
- **UI Entry Point:** Staff Dashboard Settings / Academic Structure.
- **Reference AJAX Caller:** `/staff/add_edit_subj` with `old_subj_name`, `new_subj_name`, `delete_subj`.
- **Local Implementation Plan:** Add `Subject` model linked to `Tenant`. Dynamically populate subject tags in question builders.

---

### FAM-03: Student Roster, Bulk CSV Ingestion & Export

#### FEAT-03A: Bulk Student CSV Ingestion
- **Description:** Enables administrators to upload a CSV file containing hundreds of candidates at once with columns: `Name, Roll Number, Email, Phone, Branch, Centre`. Supports overwrite mode.
- **UI Entry Point:** "+ Add Student" modal toggle or dedicated "Upload CSV" button.
- **Reference AJAX Caller (`captures/staff_page.html:250568`):**
  ```javascript
  var formData = new FormData(this);
  formData.set('overwrite', isOverwrite);
  $.ajax({
    url: '/staff/add_studs_csv',
    type: 'POST',
    data: formData,
    success: function(data) { if (data.status == 'SUCCESS') { location.reload(); } }
  });
  ```
- **State Transitions:** File selected -> Parsing CSV -> Validating columns -> Batch SQL insert/update -> Toast notification -> Roster table refresh.
- **Local Implementation Plan:** Implement `POST /staff/add_studs_csv` with Python `csv` parsing, transaction rollback on malformed data, and interactive drag-and-drop CSV upload in `src/app/staff/page.tsx`.

#### FEAT-03B: Student Roster CSV Export
- **Description:** Exports the complete student roster with registration IDs and metadata to a `.csv` file.
- **UI Entry Point:** "Export Roster" button on Student Roster tab.
- **Reference AJAX Caller:** `POST /staff/download_studs` -> returns CSV stream.
- **Local Implementation Plan:** Implement `GET /staff/download_studs` streaming CSV text response with `Content-Disposition: attachment; filename="student_roster.csv"`.

---

### FAM-04: Question Bank Authoring, Editing & Paper Composition

#### FEAT-04A: In-Place Question Editing
- **Description:** Allows staff to edit question statement, options, marking weights (`+cmk`, `-imk`), and correct answer keys after creation.
- **UI Entry Point:** "Edit" button on question cards in Question Papers tab.
- **Reference AJAX Caller (`captures/staff_page.html:1104520`):**
  ```javascript
  $.ajax({
    url: '/staff/update_qstn',
    type: 'POST',
    data: formData,
    success: function(data) { if (data.status == 'SUCCESS') { ... } }
  });
  ```
- **Local Implementation Plan:** Implement `POST /staff/update_qstn` updating `Question` entity; add modal dialog in frontend.

#### FEAT-04B: Question Deletion
- **Description:** Removes a question from a question paper with safety checks.
- **UI Entry Point:** "Delete" trash icon on question items.
- **Reference AJAX Caller (`captures/staff_page.html:1051019`):**
  ```javascript
  $.ajax({
    url: '/staff/del_qstn',
    type: 'POST',
    data: { qid: qid }
  });
  ```
- **Local Implementation Plan:** Implement `POST /staff/del_qstn`; frontend removes item and triggers confirmation modal.

#### FEAT-04C: Question Paper Deletion
- **Description:** Safely archives or deletes an unused question paper if no completed exam depends on it.
- **Reference AJAX Caller:** `/staff/del_qpap`.
- **Local Implementation Plan:** Implement `POST /staff/del_qpap` with cascade prevention if active `ExamSchedule` references it.

---

### FAM-05 & FAM-07: Exam Lifecycle, Candidate Assignment & Scorecards

#### FEAT-05A: Candidate Batch Assignment & Attendance
- **Description:** Restricts scheduled examinations to specific student cohorts/batches and tracks absentees.
- **Reference AJAX Caller (`captures/staff_page.html:1025979`):** `/staff/get_absentees` returning CSV of registered students who did not initiate an attempt.
- **Local Implementation Plan:** Compute absentee list dynamically by querying `User.role == "student"` not in `ExamAttempt` for given `exam_id`.

#### FEAT-07A: Staff Scorecard Invalidation / Re-Evaluation
- **Description:** Allows faculty to re-evaluate an attempt or invalidate a suspicious attempt for re-taking.
- **Reference AJAX Caller:** `/staff/set_subm_nonfinal` and `/staff/del_subm`.
- **Local Implementation Plan:** Reset attempt status from `SUBMITTED` back to `IN_PROGRESS` or archive attempt.

---

### FAM-08: Digital Noticeboard & Announcements

#### FEAT-08A: Institute Announcements / Notices
- **Description:** Allows staff to broadcast important examination instructions, schedules, or notifications to all students.
- **UI Entry Point:** Noticeboard tab in Staff Dashboard.
- **Reference AJAX Caller (`captures/staff_page.html:456242`):**
  ```javascript
  $.ajax({
    url: '/staff/add_notice',
    type: 'POST',
    data: formData
  });
  ```
- **Local Implementation Plan:** Add `Notice` model (`id, tenant_id, title, content, created_at, target_branch`). Implement `GET /staff/notices` and `POST /staff/add_notice`.
