# UNKNOWN_BEHAVIORS.md — Unknowns, Assumptions & Architectural Hypotheses

This document records ambiguities observed during reverse engineering, competing hypotheses, experimental tests, and adopted resolutions.

---

## 1. Subdomain Resolution & Multi-Tenant Routing

- **Observation:** `POST /login` on the main domain `ezexam.in` returned HTTP 200 with JSON payload `{"login_status": "OK", "redirect": "home?seed=..."}`, but navigating to `/home` redirected to `/online-exams` with public navigation. However, visiting `https://ezexamqwertyuiop.ezexam.in/login` directly and authenticating redirected to `/staff`, revealing the internal administrator portal.
- **Hypothesis A:** The main domain is purely an authentication gateway that issues a session cookie scoped to `.ezexam.in`.
- **Hypothesis B:** Subdomains act as independent tenant clusters with their own local session cookies.
- **Experimental Verification:** Inspected `Set-Cookie` headers from both domains. Cookie `sessionid` set on `ezexamqwertyuiop.ezexam.in` carries a host-only scope.
- **Resolution:** Our local reconstruction supports both: `POST /login` accepts an optional `sdom` parameter or checks the host header, isolating tenant data in SQLite via `tenant_id`.

---

## 2. Question Paper Schema & Scoring Rules

- **Observation:** In `staff_page.html`, form `#form-add-qpap` specifies question types including `SINGLE_CORRECT`, `MULTI_CORRECT`, `NUMERICAL`, `INTEGER`, and `TRUE_FALSE`.
- **Hypothesis A:** Multi-correct questions award partial marks (`pmk`) if a candidate selects a non-empty subset of correct options without choosing any incorrect ones.
- **Hypothesis B:** Multi-correct questions are strictly all-or-nothing (full correct marks `cmk` or full penalty `imk`).
- **Resolution:** We implemented conservative all-or-nothing grading with negative penalty support in `backend/routers/cbt.py`, while preserving the `pmk` (partial marks) field in the database schema for future grading mode toggles.

---

## 3. Anti-Cheat Monitoring & Tab Switches

- **Observation:** In `staff_page.html` form `#form-add-onex`, there are checkboxes `switches` and an input `num-switches` (defaulting to 3).
- **Hypothesis A:** Client-side JavaScript detects window blur/visibility loss and immediately posts an event to `/staff/onexam/` or `/api/exam/log_event`. Once the switch limit is hit, the exam is forcibly auto-submitted.
- **Hypothesis B:** The counter merely records proctoring metadata for post-exam review without terminating the exam.
- **Resolution:** We implemented Hypothesis A with a persistent warning banner on the candidate player. When `switch_count >= num_switches`, a final submission is triggered server-side.

---

## 4. OMR Sheet Scanner Processing

- **Observation:** Production contains `/staff/scans_zip_upload`, `/staff/get_omr_resps`, and references to template types (`100q-ABCD`, `120q`, `200q NEET`).
- **Limitation:** OMR scanning on the reference server requires OpenCV / physical scanner image processing microservices.
- **Resolution:** Our backend supports the OMR API schema and data model (`is_ezomr`, `omr_set_qresp`) while prioritizing the online Computer-Based Testing (CBT) engine for local interactive execution.
