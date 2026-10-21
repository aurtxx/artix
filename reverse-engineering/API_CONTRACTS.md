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
