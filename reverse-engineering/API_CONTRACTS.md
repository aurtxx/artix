# API_CONTRACTS.md — Full Request & Response Specifications

This document defines the authoritative API contracts reverse-engineered from production traffic and implemented in our local FastAPI backend.

---

## 1. Authentication & Session Contracts

### `POST /login`
- **Description:** Authenticates a user into a tenant portal. Supports form-data and JSON.
- **Request Body (JSON / Form-Data):**
  ```json
  {
    "sdom": "ezexamqwertyuiop",
    "username": "ezexam@yopmail.com",
    "password": "qwertyuiop",
    "next": "/staff"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "login_status": "OK",
    "error": "",
    "redirect": "staff",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "ezexamqwertyuiop",
      "email": "ezexam@yopmail.com",
      "role": "admin",
      "sdom": "ezexamqwertyuiop"
    }
  }
  ```
- **Error Response (200 OK):**
  ```json
  {
    "login_status": "FAILED",
    "error": "Invalid username or password.",
    "redirect": ""
  }
  ```

---

## 2. Staff Examination Management Contracts

### `POST /staff/get_cap`
- **Description:** Retrieves tenant capacity, active attempts, remaining student allocations, and subscription validity.
- **Headers:** `Authorization: Bearer <token>` or `sessionid` cookie
- **Response (200 OK):**
  ```json
  {
    "paid": true,
    "creds": 10000,
    "atmpts": 5000,
    "cap_left": 4500,
    "total_subm": 12,
    "omrs": 250,
    "valid_till": "2028-12-31",
    "legacy": false,
    "studs": 25
  }
  ```

### `POST /staff/get_qexams_paging`
- **Description:** Returns paginated list of scheduled examinations with anti-cheat configuration.
- **Request Body (Form-Data / JSON):** `{ "filter": "{...}" }`
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "All India Mock Test 1",
        "stime": "2026-10-21 00:00",
        "etime": "2026-10-31 23:59",
        "mins": 180,
        "status": "RUNNING",
        "crby": "ezexamqwertyuiop",
        "cron": "2026-10-21",
        "surl": "/exam/1",
        "groups": "JEE-Main",
        "cents": "All",
        "stans": "Class 12",
        "qpap": 1,
        "shuf": true,
        "cam": false,
        "pc_only": false,
        "switches": true,
        "num_switches": 3,
        "hide_qs": false,
        "hide_res": false,
        "hide_anal": false,
        "hide_rank": false,
        "prac": false,
        "sec_skip": true,
        "year": null,
        "ezomr": false
      }
    ],
    "itemsCount": 1
  }
  ```

### `POST /staff/add_onex`
- **Description:** Creates or updates a scheduled online examination.
- **Request Body (JSON):**
  ```json
  {
    "name": "JEE Mock Test 2",
    "mins": 180,
    "qpap": 1,
    "branches": "All",
    "centres": "Main",
    "shuf": true,
    "cam": false,
    "pc_only": false,
    "switches": true,
    "num_switches": 3,
    "stime": "2026-10-22 09:00",
    "etime": "2026-10-22 21:00"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "SUCCESS",
    "exam_id": 2,
    "message": "Exam scheduled successfully"
  }
  ```

### `POST /staff/get_qpaps`
- **Description:** Retrieves question papers in the institution's repository.
- **Response (200 OK):**
  ```json
  {
    "qpaps": [
      {
        "Id": 1,
        "Name": "JEE Main & Advanced Full Mock 2026",
        "Subjects": "Physics, Chemistry, Mathematics",
        "Type": "JEE-Main",
        "mins": 180,
        "status": "ACTIVE",
        "crby": "ezexamqwertyuiop",
        "Date": "2026-10-21"
      }
    ],
    "status": "SUCCESS"
  }
  ```

### `POST /staff/add_qstn`
- **Description:** Adds a question with options, answer key, and marks weighting to a question paper.
- **Request Body (JSON):**
  ```json
  {
    "qpap_id": 1,
    "qtxt": "What is the speed of light in vacuum?",
    "type": "SINGLE_CORRECT",
    "subj": "Physics",
    "options": ["3 x 10^8 m/s", "2 x 10^8 m/s", "3 x 10^6 m/s", "1 x 10^8 m/s"],
    "key": "3 x 10^8 m/s",
    "cmk": 4.0,
    "imk": -1.0,
    "diff": "EASY"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "SUCCESS",
    "question_id": 6
  }
  ```

---

## 3. Candidate CBT Exam Player Contracts

### `POST /api/exam/{id}/start`
- **Description:** Begins or resumes an exam attempt. Questions are provided **without correct answer keys** to protect assessment integrity.
- **Response (200 OK):**
  ```json
  {
    "status": "SUCCESS",
    "attempt_id": 1,
    "exam": {
      "id": 1,
      "name": "All India Mock Test 1",
      "mins": 180,
      "switches": true,
      "num_switches": 3,
      "sec_skip": true,
      "shuf": true
    },
    "questions": [
      {
        "id": 1,
        "qno": 1,
        "type": "SINGLE_CORRECT",
        "qtxt": "A block of mass 2 kg...",
        "subj": "Physics",
        "cmk": 4.0,
        "imk": -1.0,
        "diff": "MEDIUM",
        "options": ["8 N", "6 N", "0 N", "2 N"]
      }
    ],
    "saved_responses": {},
    "switch_count": 0
  }
  ```

### `POST /api/exam/{id}/save_response`
- **Description:** Real-time autosave of candidate answer for a question.
- **Request Body (JSON):**
  ```json
  {
    "q_id": "1",
    "ans": ["6 N"],
    "status": "ANSWERED"
  }
  ```
- **Response (200 OK):**
  ```json
  { "status": "SUCCESS" }
  ```

### `POST /api/exam/{id}/log_event`
- **Description:** Logs proctoring events such as browser tab switches or window blurs.
- **Request Body (JSON):**
  ```json
  { "type": "SWITCH_WINDOW" }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "SUCCESS",
    "switch_count": 1,
    "limit_reached": false
  }
  ```

### `POST /api/exam/{id}/submit`
- **Description:** Finalizes attempt, calculates authoritative scores against correct keys, marks attempt `SUBMITTED`.
- **Response (200 OK):**
  ```json
  {
    "status": "SUCCESS",
    "attempt_id": 1,
    "score": 4.0,
    "total_marks": 19.0
  }
  ```

### `GET /api/exam/{id}/result`
- **Description:** Retrieves candidate scorecard, proctoring log, and detailed solution reviews.
- **Response (200 OK):**
  ```json
  {
    "exam_name": "All India Mock Test 1",
    "score": 4.0,
    "total_marks": 19.0,
    "switch_count": 1,
    "submitted_at": "2026-10-21 15:35:55",
    "questions": [
      {
        "id": 1,
        "qno": 1,
        "qtxt": "A block of mass 2 kg...",
        "subj": "Physics",
        "candidate_ans": ["6 N"],
        "correct_key": ["6 N"],
        "is_correct": true,
        "cmk": 4.0,
        "imk": -1.0
      }
    ]
  }
  ```


---

## 4. Complete 85-Endpoint Reference Taxonomy & Implementation Coverage

The table below catalogs every endpoint extracted from the authorized production reference bundle (\e-staff.min.js\) and rigorously distinguishes its current implementation, frontend integration, and test status.

| # | Endpoint Path | Implementation Status | Frontend Integration | Test Coverage | Classification |
|---|---|---|---|---|---|
| 1 | `/staff/16031/verify` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 2 | `/staff/add_ch` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 3 | `/staff/add_clbr` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 4 | `/staff/add_edit_centre` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 5 | `/staff/add_edit_class` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 6 | `/staff/add_edit_extype` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 7 | `/staff/add_edit_subj` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 8 | `/staff/add_fac` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 9 | `/staff/add_notes` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 10 | `/staff/add_notice` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 11 | `/staff/add_onex` | Implemented in FastAPI | Bound to UI | Untested | `IMPLEMENTED_CALLABLE` |
| 12 | `/staff/add_onex_link` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 13 | `/staff/add_qpap` | Implemented in FastAPI | Unbound | Untested | `IMPLEMENTED_UNTESTED` |
| 14 | `/staff/add_qpap_omr` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 15 | `/staff/add_qpap_res` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 16 | `/staff/add_qstn` | Implemented in FastAPI | Bound to UI | Untested | `IMPLEMENTED_CALLABLE` |
| 17 | `/staff/add_stud` | Implemented in FastAPI | Bound to UI | Untested | `IMPLEMENTED_CALLABLE` |
| 18 | `/staff/add_studs_csv` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 19 | `/staff/add_video` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 20 | `/staff/api_del_sproc` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 21 | `/staff/api_get_sprocs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 22 | `/staff/check_qpap/` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 23 | `/staff/create_exam_surl` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 24 | `/staff/del_anals` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 25 | `/staff/del_ch` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 26 | `/staff/del_exam` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 27 | `/staff/del_exam_otp` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 28 | `/staff/del_fac` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 29 | `/staff/del_notes` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 30 | `/staff/del_notice` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 31 | `/staff/del_onex` | Implemented in FastAPI | Unbound | Untested | `IMPLEMENTED_UNTESTED` |
| 32 | `/staff/del_qpap` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 33 | `/staff/del_qstn` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 34 | `/staff/del_studs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 35 | `/staff/del_studs_otp` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 36 | `/staff/del_studs_otp/` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 37 | `/staff/del_subm` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 38 | `/staff/del_video` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 39 | `/staff/download_report` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 40 | `/staff/download_studs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 41 | `/staff/edit_parents` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 42 | `/staff/gen_onex_anal` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 43 | `/staff/gen_report` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 44 | `/staff/get_absentees` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 45 | `/staff/get_cap` | Fully Reconstructed in FastAPI | Bound to UI | Covered in Automated Tests | `VERIFIED` |
| 46 | `/staff/get_cheads` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 47 | `/staff/get_facs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 48 | `/staff/get_notes` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 49 | `/staff/get_notice_studs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 50 | `/staff/get_notices` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 51 | `/staff/get_omr_log` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 52 | `/staff/get_omr_resps` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 53 | `/staff/get_onex_studs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 54 | `/staff/get_onexs` | Implemented in FastAPI | Unbound | Untested | `IMPLEMENTED_UNTESTED` |
| 55 | `/staff/get_promo_code` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 56 | `/staff/get_qexams` | Fully Reconstructed in FastAPI | Bound to UI | Covered in Automated Tests | `VERIFIED` |
| 57 | `/staff/get_qexams_paging` | Fully Reconstructed in FastAPI | Bound to UI | Covered in Automated Tests | `VERIFIED` |
| 58 | `/staff/get_qpaps` | Fully Reconstructed in FastAPI | Bound to UI | Covered in Automated Tests | `VERIFIED` |
| 59 | `/staff/get_res` | Implemented in FastAPI | Bound to UI | Untested | `IMPLEMENTED_CALLABLE` |
| 60 | `/staff/get_stud_parents` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 61 | `/staff/get_studs_paging` | Implemented in FastAPI | Bound to UI | Untested | `IMPLEMENTED_CALLABLE` |
| 62 | `/staff/get_subjective` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 63 | `/staff/get_subm` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 64 | `/staff/get_subm_log` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 65 | `/staff/get_txtqs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 66 | `/staff/get_videos` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 67 | `/staff/manage_testcases` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 68 | `/staff/omr_set_qresp` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 69 | `/staff/omr_update_roll` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 70 | `/staff/omrex_assign_studs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 71 | `/staff/onexam-eval/` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 72 | `/staff/onexam/` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 73 | `/staff/post_mess` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 74 | `/staff/qbank_qpap_qno` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 75 | `/staff/replace_key_csv` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 76 | `/staff/scans_zip_upload` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 77 | `/staff/set_omr_del` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 78 | `/staff/set_omr_ignore` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 79 | `/staff/set_subm_nonfinal` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 80 | `/staff/studs_select_fields` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 81 | `/staff/update_insti` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 82 | `/staff/update_qpap_status` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 83 | `/staff/update_qstn` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 84 | `/staff/usage_report` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
| 85 | `/staff/zip_skipped_omrs` | Observed in Reference Bundle (Auxiliary Django feature) | Unbound | Untested | `OBSERVED_UNIMPLEMENTED` |
