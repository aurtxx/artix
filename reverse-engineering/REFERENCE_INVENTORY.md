# REFERENCE_INVENTORY.md — EZexam Reference System Inventory

## 1. Reference Sources & Provenance

| Evidence Type | Reference Source | Location / Artifact Path | Verification Status |
|---|---|---|---|
| **Live Target Gateway** | `https://ezexam.in/login` | Public Domain | Verified & Accessible |
| **Tenant Portal Subdomain** | `https://ezexamqwertyuiop.ezexam.in/staff` | Subdomain Routing | Verified & Accessible |
| **Authorized Test Account** | `ezexamqwertyuiop` / `ezexam@yopmail.com` | Verified credentials (`qwertyuiop`) | Active Session Authenticated |
| **Student Test Account** | `student@ezexam.local` (`STU-2026-001`) | Verified test credentials (`password123`) | Active Local Account |
| **Captured Page Screenshots** | 80+ full-page screenshots (300dpi) | `captures/screenshots/*.png` | Preserved on disk |
| **Captured DOM Trees** | 35+ parsed DOM snapshots | `captures/dom/*.json` | Preserved on disk |
| **HTML Source Snapshot** | Production staff SPA (1.47 MB) | `captures/staff_page.html` | Preserved on disk |
| **Client JavaScript Bundles** | `ee-staff.min.js` (209 KB), `ee-base.min.js` (293 KB) | `captures/scripts/*.min.js` | Extracted & Analyzed |
| **Discovered Endpoints** | 85 `/staff/` API routes | `captures/staff_endpoints_manifest.json` | Mapped with caller contexts |
| **Network Request Log** | HAR & JSONL streaming captures | `captures/portal_network.jsonl`, `captures/portal_api_calls.json` | Recorded with response shapes |

---

## 2. Platform Architecture Summary

```
[Public Gateway: ezexam.in]
       │
       ├─► Global Login (POST /login) -> returns redirect: {sdom}/staff
       ├─► Landing & Marketing Pages (/about, /pricing, /omr-exams, /terms)
       └─► Public Registration (POST /login/signup)
       
[Tenant Subdomain: {sdom}.ezexam.in]
       │
       ├─► Tenant Auth (POST /login) -> sessionid + csrftoken cookies
       ├─► Staff Portal (/staff#) -> Single Page Application
       │     ├─ Capacity Widget (/staff/get_cap)
       │     ├─ Online Exams Grid & Table (/staff/get_qexams_paging, /staff/get_onexs)
       │     ├─ Exam Scheduler Modal (/staff/add_onex, /staff/del_onex)
       │     ├─ Question Papers & Question Bank (/staff/get_qpaps, /staff/add_qpap, /staff/add_qstn)
       │     ├─ Student Directory & Bulk Import (/staff/get_studs_paging, /staff/add_stud, /staff/add_studs_csv)
       │     ├─ Real-Time Submissions Log (/staff/get_subm_log, /staff/get_res)
       │     └─ Analytics & Report Generator (/staff/gen_onex_anal, /staff/gen_report)
       │
       └─► Candidate CBT Player (/exam/{id} or /onexam/{id})
             ├─ Pre-exam instructions & verification
             ├─ Subject/Section Tabs (Physics, Chemistry, Maths)
             ├─ Question rendering (MCQ, Multi-Correct, Numerical, Integer, True/False)
             ├─ Autosave responses (POST /api/exam/{id}/save_response)
             ├─ Anti-cheat window switch detection (POST /api/exam/{id}/log_event)
             ├─ Server-side authoritative grading (POST /api/exam/{id}/submit)
             └─ Performance Scorecard & Detailed Solution Review (/results/{id})
```

---

## 3. Discovered Behavioral Boundaries & Limitations

1. **Multi-Tenancy Isolation:** The platform requires an `sdom` identifier. If `sdom` is omitted, the main gateway rejects requests or prompts the user to supply the institution account slug.
2. **SPA vs Multi-Page:** The `/staff` route is a large unified Single Page Application (Materialize CSS based with custom modals and tab panels `#qexam-qstns`, `#qexam-share`, `#qexam-atts`, `#qexam-res`). Probing deep paths such as `/staff/reports/` directly via `page.goto` triggers Django redirect back to `/login?next=...` unless accessed through the SPA hash routing.
3. **Question Secrecy:** The candidate CBT player must **never** receive the `key_json` (correct answers) over the wire during the examination. Answer keys must only be delivered on the scorecard route `/results/{id}` after submission has been finalized.
4. **Anti-Cheat Signal vs Proof:** Window switch monitoring detects `visibilitychange` events and increments a counter. Once `switch_count >= num_switches`, the client displays a persistent warning and triggers automatic submission.
