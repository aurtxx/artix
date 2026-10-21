# FEAT-002: Academic Structure & Institutional Hierarchy

> **Feature ID:** `FEAT-002` (comprising `FEAT-01A`, `FEAT-01B`, `FEAT-01C`)  
> **Family:** FAM-01 Institution Configuration & Academic Structure  
> **Status:** SPECIFIED  

---

## 1. User Problem & Intended Outcome
An online examination system cannot function with hardcoded batch names ("JEE-Main") and centre locations ("Main Campus"). Administrators must be able to configure:
1. Physical / Virtual **Centres** (`add_edit_centre`).
2. Academic **Classes / Batches** (`add_edit_class`).
3. Evaluated **Subjects** (`add_edit_subj`).
These entities populate all select dropdowns across student enrolment, question authoring, and exam scheduling.

---

## 2. API Contracts
- `GET /staff/academic_structure`: Returns `{ centres: [...], classes: [...], subjects: [...] }`.
- `POST /staff/add_edit_centre`: `{ old_name: str, new_name: str, delete: bool }`.
- `POST /staff/add_edit_class`: `{ old_name: str, new_name: str, delete: bool }`.
- `POST /staff/add_edit_subj`: `{ old_name: str, new_name: str, delete: bool }`.

---

## 3. Database Schema
Models `Centre`, `Branch`, and `Subject` linked by foreign key `tenant_id` to `Tenant`.
Cascade safety: Deletion of a subject or branch with existing questions or attempts is rejected with a validation warning.
