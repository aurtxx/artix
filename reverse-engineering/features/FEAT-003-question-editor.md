# FEAT-003: Question Bank Editing, Reordering & Deletion

> **Feature ID:** `FEAT-003` (comprising `FEAT-04A`, `FEAT-04B`, `FEAT-04C`)  
> **Family:** FAM-04 Question Bank Authoring & Management  
> **Status:** SPECIFIED  

---

## 1. User Problem & Intended Outcome
Faculty frequently notice typos in question statements, incorrect options, or need to revise answer keys and mark weights after drafting a paper. Currently, once created, questions cannot be edited or pruned through the UI.
Faculty need:
1. An inline **"Edit Question"** modal to modify text, options, answer key, and marks.
2. A **"Delete Question"** control to remove invalid questions from a draft question paper.
3. A **"Delete Question Paper"** option to prune unused draft papers.

---

## 2. API Contracts
- `POST /staff/update_qstn`:
  - Request: `{ qid: int, qtxt: str, type: str, subj: str, options: list[str], key: str, cmk: float, imk: float }`
  - Response: `{ status: "SUCCESS", msg: "Question updated successfully" }`
- `POST /staff/del_qstn`:
  - Request: `{ qid: int }`
  - Response: `{ status: "SUCCESS", msg: "Question deleted successfully" }`
- `POST /staff/del_qpap`:
  - Request: `{ qpap_id: int }`
  - Response: `{ status: "SUCCESS", msg: "Question paper deleted successfully" }`
  - Failure (if active exam exists): `{ status: "FAILED", error: "Cannot delete question paper referenced by active examination" }`
