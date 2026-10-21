# FEAT-001: Student Bulk CSV Ingestion & Roster Export

> **Feature ID:** `FEAT-001` (comprising `FEAT-03A` and `FEAT-03B`)  
> **Family:** FAM-03 Student Roster & Onboarding  
> **Status:** SPECIFIED  

---

## 1. User Problem & Intended Outcome
Administrators and academic heads managing exams for hundreds of candidates cannot register students one by one through an interactive modal. They require:
1. Fast, reliable bulk ingestion via CSV format (`Name, Roll Number, Email, Phone, Branch, Centre`).
2. An overwrite option (`overwrite=true`) to update existing student profiles without duplicating records.
3. One-click CSV export of the entire roster for verification and external record-keeping.

---

## 2. User Roles & Permissions
- **Permitted Roles:** `admin`, `faculty`, `chead`.
- **Rejected Roles:** `student` (HTTP 403 Forbidden).
- **Unauthenticated:** HTTP 401 Unauthorized.

---

## 3. Observable UI Workflow (from `captures/staff_page.html:250568`)
1. User navigates to the **Student Roster** tab (`/staff?tab=students`).
2. User clicks the **"Upload Students CSV"** button.
3. Modal dialog opens with:
   - File input accepting `.csv`.
   - "Overwrite Existing Records" checkbox toggle.
   - Example CSV format guide (`Name, Roll Number, Email, Phone, Branch, Centre`).
4. User selects file and clicks **"Upload & Import"**.
5. Client submits `multipart/form-data` to `POST /staff/add_studs_csv`.
6. On success (`{ status: "SUCCESS", count: N }`), modal closes, toast alert displays confirmation, and table automatically updates.
7. User clicks **"Download Roster CSV"** button to stream complete CSV export from `GET /staff/download_studs`.

---

## 4. API Request & Response Contracts

### Endpoint 1: `POST /staff/add_studs_csv`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `file`: CSV binary file
  - `overwrite`: Boolean (`"true"` / `"false"`)
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "status": "SUCCESS",
    "imported_count": 45,
    "updated_count": 5,
    "msg": "Successfully imported 50 students."
  }
  ```
- **Error Response (400 Bad Request):**
  ```json
  {
    "status": "FAILED",
    "error": "Invalid CSV header. Expected: Name, Roll Number, Email, Phone, Branch, Centre"
  }
  ```

### Endpoint 2: `GET /staff/download_studs`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="student_roster.csv"`
  - Body: Raw CSV text formatted with student records.

---

## 5. Database Integrity & Constraints
- All inserted or updated `User` entities must have `tenant_id == current_user.tenant_id`.
- `role` must be set to `"student"`.
- Password for newly created students defaults to `"password123"` (hashed with PBKDF2/SHA256).
- If `overwrite == true`, matching `rollnum` or `email` updates existing user rather than failing on unique constraint.

---

## 6. Acceptance Criteria & Test Requirements
- [x] Valid CSV file imports all records cleanly.
- [x] Overwrite toggle correctly updates existing student branch and contact info.
- [x] Malformed CSV without required columns is rejected with explanatory message.
- [x] Roster export generates compliant RFC 4180 CSV file.
- [x] Cross-tenant boundaries strictly preserved: students imported by tenant A cannot be downloaded or accessed by tenant B.
