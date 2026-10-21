# CLAUDE.md - Reverse-Engineered EZexam Platform (Autonomous Reconstruction)

> **Goal:** Open-source, self-hosted replica of EZexam.in (Online Exam & Test Management Platform) using **Next.js 15 (Frontend)** and **FastAPI + SQLite/Postgres (Backend)** without third-party vendor telemetry or tracking.

---

## 1. Status of Project Milestones

- [x] **Phase 1: Autonomous Deep Exploration & Architecture Mapping (COMPLETED)**
  - Automated login into `https://ezexam.in/login` and tenant subdomain `https://ezexamqwertyuiop.ezexam.in/staff`.
  - Discovered and categorized all **85 `/staff/` API endpoints** (see [`captures/PHASE_1_MAP.md`](captures/PHASE_1_MAP.md)).
  - Captured 27 screenshots, 35+ DOM trees, and response shapes in `captures/`.
  - Documented complete data models: `ExamSchedule`, `Question`, `Student`, `Submission`, `Capacity`.
- [ ] **Phase 2: Next.js Frontend Rebuild**
  - Scaffold App Router pages matching mapped modules (`/login`, `/staff`, `/staff/exams`, `/staff/questions`, `/exam/[id]`).
  - Implement responsive Tailwind UI for dashboard and exam player with timer, palette, and question states.
- [ ] **Phase 3: FastAPI Backend Rebuild**
  - Implement self-hosted JWT authentication.
  - Implement the core REST APIs matching the 85 discovered endpoint contracts.
  - Build local exam scoring engine with negative marks and auto-submit.

---

## 2. Tested Production Credentials (For Ongoing Verification)

- **Main Domain:** `https://ezexam.in/login`
- **Tenant Portal:** `https://ezexamqwertyuiop.ezexam.in/staff`
- **Account Name / Subdomain (`sdom`):** `ezexamqwertyuiop`
- **Username / Email:** `ezexam@yopmail.com`
- **Password:** `qwertyuiop`

---

## 3. Discovered API Endpoints Quick Reference

All 85 internal `/staff/` APIs are categorized in [`captures/PHASE_1_MAP.md`](captures/PHASE_1_MAP.md) and [`captures/staff_api_taxonomy.json`](captures/staff_api_taxonomy.json):

1. **Auth & Institute:** `/login`, `/staff/get_cap`, `/staff/update_insti`, `/staff/usage_report`
2. **Exams & Schedules:** `/staff/get_qexams_paging`, `/staff/get_onexs`, `/staff/add_onex`, `/staff/del_onex`, `/staff/create_exam_surl`
3. **Question Papers & Bank:** `/staff/get_qpaps`, `/staff/add_qpap`, `/staff/add_qstn`, `/staff/del_qstn`, `/staff/manage_testcases`
4. **Students & Batches:** `/staff/get_studs_paging`, `/staff/add_stud`, `/staff/add_studs_csv`, `/staff/del_studs`, `/staff/get_stud_parents`
5. **Results & Analytics:** `/staff/get_res`, `/staff/get_subm`, `/staff/get_subm_log`, `/staff/gen_onex_anal`, `/staff/gen_report`
6. **OMR Processing:** `/staff/scans_zip_upload`, `/staff/get_omr_resps`, `/staff/omr_set_qresp`

---

## 4. Helper Scripts

- `node scripts/crawl-portal.js`: Authenticates and crawls portal subdomain.
- `node scripts/extract-endpoints.js`: Extracts all `/staff/` endpoints and script dependencies.
- `node scripts/analyze-js.js`: Generates taxonomy and snippets for all backend calls.
