# FEATURE_ROADMAP.md — Prioritized Feature Implementation Plan

> **Methodology:** Features are quantitatively ranked across 6 weighted dimensions (Scale 1–5):
> `Score = (User Value × 2) + (Workflow Frequency × 2) + (Dependency Impact × 1.5) + (Evidence Confidence × 1.5) - (Implementation Effort × 1) - (Operational Risk × 1.5)`

---

## 1. Quantitative Feature Prioritization Matrix

| Feature ID | Feature Name | User Value (1-5) | Frequency (1-5) | Dep. Impact (1-5) | Evidence Conf. (1-5) | Effort (1-5) | Risk (1-5) | Priority Score | Tier / Phase |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **FEAT-03A** | **Bulk Student CSV Ingestion** | 5 | 5 | 4 | 5 | 2 | 1 | **26.0** | **P1: Immediate Implementation** |
| **FEAT-03B** | **Roster CSV Export** | 4 | 4 | 3 | 5 | 1 | 1 | **25.5** | **P1: Immediate Implementation** |
| **FEAT-01A** | **Academic Structure (Centres, Batches, Subj)** | 5 | 5 | 5 | 5 | 2 | 1 | **25.5** | **P1: Immediate Implementation** |
| **FEAT-04A** | **In-Place Question Editing & Updating** | 5 | 4 | 4 | 5 | 2 | 1 | **24.0** | **P1: Immediate Implementation** |
| **FEAT-04B** | **Question & Paper Deletion** | 4 | 4 | 3 | 5 | 1 | 2 | **22.5** | **P2: Core Extension** |
| **FEAT-08A** | **Digital Noticeboard & Announcements** | 4 | 3 | 2 | 4 | 2 | 1 | **19.5** | **P2: Core Extension** |
| **FEAT-05A** | **Candidate Absentee Tracking** | 4 | 3 | 3 | 4 | 2 | 1 | **19.0** | **P2: Core Extension** |
| **FEAT-02A** | **Faculty Profile & Proctor Management** | 3 | 3 | 3 | 4 | 3 | 1 | **17.0** | **P3: Advanced Administration** |
| **FEAT-09B** | **Historical Usage & Capacity Reports** | 3 | 2 | 1 | 4 | 2 | 1 | **15.0** | **P3: Advanced Administration** |
| **FEAT-10A** | **Physical OMR Sheet Processing** | 2 | 1 | 1 | 3 | 5 | 4 | **2.5** | **Excluded (Hardware Dependent)** |
| **FEAT-PAY** | **Razorpay Subscription Gateway** | 1 | 1 | 1 | 2 | 4 | 5 | **0.0** | **Excluded (Third-Party Paid API)** |
| **FEAT-MSG** | **WhatsApp / SMS Gateway Integration** | 2 | 2 | 1 | 2 | 4 | 4 | **3.0** | **Excluded (Third-Party Paid API)** |

---

## 2. Execution Roadmap & Milestones

### Milestone 1: Core Institutional & Authoring Operations (P1 — Current Phase)
1. **Academic Structure Hub (`FEAT-01A`):**
   - Endpoints: `POST /staff/add_edit_centre`, `POST /staff/add_edit_class`, `POST /staff/add_edit_subj`, `GET /staff/academic_structure`.
   - UI: Management modal in Staff Console to define Centres, Batches, and Subjects.
2. **Student Bulk CSV Ingestion (`FEAT-03A`) & Export (`FEAT-03B`):**
   - Endpoints: `POST /staff/add_studs_csv` (parsing CSV with overwrite support), `GET /staff/download_studs` (streaming CSV download).
   - UI: Drag-and-drop CSV upload modal with validation feedback and download button in Student Roster tab.
3. **Question Bank Editing & Deletion (`FEAT-04A`, `FEAT-04B`):**
   - Endpoints: `POST /staff/update_qstn`, `POST /staff/del_qstn`, `POST /staff/del_qpap`.
   - UI: Inline question editor modal and delete confirmation trigger.

### Milestone 2: Campus Communications & Attendance (P2)
1. **Digital Noticeboard (`FEAT-08A`):** Broadcast announcements to batches.
2. **Absentee Tracking (`FEAT-05A`):** Export list of absent candidates for scheduled exams.

### Out of Scope / Excluded:
- Razorpay payments, paid SMS gateways, and physical sheet scanner hardware.
