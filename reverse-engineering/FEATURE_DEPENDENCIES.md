# FEATURE_DEPENDENCIES.md — Entity Graph & Dependency Matrix

> **Purpose:** Identifies foundational prerequisite entities and operational dependencies between feature families to govern the exact sequence of implementation.

---

## 1. Entity Dependency Graph

```
                   ┌──────────────┐
                   │    Tenant    │
                   └──────┬───────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │   Centre    │ │   Branch    │ │   Subject   │  <─── [FAM-01: Academic Structure]
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
          │               │               │
          └───────┬───────┘               ▼
                  ▼                ┌──────────────┐
           ┌─────────────┐         │QuestionPaper │
           │ User/Student│         └──────┬───────┘
           └──────┬──────┘                ▼
                  │                ┌──────────────┐
                  │                │   Question   │  <─── [FAM-04: Question Authoring]
                  │                └──────┬───────┘
                  ▼                       ▼
           ┌──────────────┐        ┌──────────────┐
           │ ExamSchedule │◄───────┤ ExamSchedule │  <─── [FAM-05: Scheduling & Windows]
           └──────┬───────┘        └──────────────┘
                  │
                  ▼
           ┌──────────────┐
           │ ExamAttempt  │                          <─── [FAM-06: Candidate CBT Player]
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │ Result Review│                          <─── [FAM-07: Grading & Scorecards]
           └──────────────┘
```

---

## 2. Dependency Matrix & Prerequisites

| Feature ID | Feature Name | Hard Prerequisites | Dependent Downstream Features |
|---|---|---|---|
| **FEAT-01 (FAM-01)** | **Academic Structure (Centres, Batches, Subjects)** | `Tenant` (Exists) | Student Bulk Import (`FEAT-03A`), Question Categorization (`FEAT-04`), Exam Scoping (`FEAT-05`) |
| **FEAT-03A (FAM-03)** | **Bulk Student CSV Ingestion** | `Tenant`, `Branch`, `Centre` | Candidate Assignment (`FEAT-05`), Absentee Tracking (`FEAT-05A`) |
| **FEAT-03B (FAM-03)** | **Roster CSV Export** | `User` (role="student") | None (Export terminal) |
| **FEAT-04A (FAM-04)** | **Question Update & In-Place Editing** | `QuestionPaper`, `Question` | Grading Re-evaluation (`FEAT-07A`) |
| **FEAT-04B (FAM-04)** | **Question Deletion** | `Question`, Check: No active attempt | None |
| **FEAT-05A (FAM-05)** | **Candidate Absentee Tracking** | `ExamSchedule`, `User`, `ExamAttempt` | Analytics Reports (`FEAT-07`) |
| **FEAT-08A (FAM-08)** | **Digital Noticeboard** | `Tenant`, `Branch` | Candidate Portal Notice Feed |

---

## 3. Implementation Sequence Rationale

1. **Academic Structure (`FEAT-01`)** is the fundamental root prerequisite: student rosters and question papers require valid branch and subject tags.
2. **Bulk Student CSV Ingestion (`FEAT-03A`) & Roster Export (`FEAT-03B`)** immediately empowers administrators to onboard real student cohorts without typing individual records manually.
3. **Question Editing & Deletion (`FEAT-04A`, `FEAT-04B`)** completes the authoring workflow, allowing faculty to correct typos, revise options, or prune unused items.
4. **Noticeboard Broadcast (`FEAT-08A`)** provides communication between faculty and candidates.
