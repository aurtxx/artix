# DATA_MODEL.md — Relational Schema & Storage Architecture

The persistence layer uses SQLite (or PostgreSQL in production) via SQLAlchemy declarative models.

```
┌─────────────────┐       1:N       ┌─────────────────┐
│     Tenant      │────────────────►│      User       │
│  (Institution)  │                 │ (Staff/Student) │
└────────┬────────┘                 └────────┬────────┘
         │                                   │
         │ 1:N                               │
         ▼                                   │
┌─────────────────┐                          │
│  QuestionPaper  │                          │
└────────┬────────┘                          │
         │                                   │
         ├──────────────────┐ 1:N            │
         │ 1:N              ▼                │
         ▼          ┌───────────────┐        │
┌─────────────────┐ │ ExamSchedule  │        │
│    Question     │ │  (CBT Test)   │        │
└─────────────────┘ └───────┬───────┘        │
                            │                │
                            │ 1:N            │ 1:N
                            ▼                ▼
                    ┌────────────────────────┐
                    │      ExamAttempt       │
                    │ (Responses & Grading)  │
                    └────────────────────────┘
```

---

## 1. Table Definitions

### `tenants`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | Unique tenant identifier |
| `sdom` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEX | Subdomain / Account slug (e.g. `ezexamqwertyuiop`) |
| `name` | `VARCHAR(100)` | NOT NULL | Institution display name |
| `title` | `VARCHAR(100)` | NOT NULL | Custom portal title |
| `logo_url` | `VARCHAR(255)` | NULLABLE | Tenant logo path or S3 URL |
| `created_at` | `DATETIME` | DEFAULT UTC | Creation timestamp |

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | User identifier |
| `tenant_id` | `INTEGER` | FOREIGN KEY `tenants.id` | Isolation partition |
| `username` | `VARCHAR(80)` | NOT NULL, INDEX | Unique within tenant |
| `email` | `VARCHAR(120)` | NOT NULL, INDEX | Contact email address |
| `phone` | `VARCHAR(20)` | NULLABLE | Mobile phone number |
| `password_hash`| `VARCHAR(255)` | NOT NULL | Salted SHA-256 / bcrypt hash |
| `role` | `VARCHAR(20)` | NOT NULL | `admin`, `faculty`, `chead`, `student` |
| `rollnum` | `VARCHAR(50)` | NULLABLE | Student ID / Roll number |
| `branch` | `VARCHAR(50)` | DEFAULT `'General'` | Academic batch (e.g. `JEE-Main`, `NEET`) |
| `centre` | `VARCHAR(50)` | DEFAULT `'Main'` | Physical campus or exam center |
| `class_name` | `VARCHAR(50)` | DEFAULT `'Class 12'`| Grade / Standard |
| `is_active` | `BOOLEAN` | DEFAULT `TRUE` | Account status flag |

### `question_papers`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | Question paper identifier |
| `tenant_id` | `INTEGER` | FOREIGN KEY `tenants.id` | Isolation partition |
| `name` | `VARCHAR(150)`| NOT NULL | Paper title |
| `subjects` | `VARCHAR(200)`| NOT NULL | Comma-separated subject list |
| `exam_type` | `VARCHAR(50)` | DEFAULT `'JEE-Main'`| Exam curriculum |
| `duration_mins`| `INTEGER` | DEFAULT `180` | Default test duration in minutes |
| `status` | `VARCHAR(20)` | DEFAULT `'ACTIVE'` | `DRAFT`, `ACTIVE`, `ARCHIVED` |
| `created_by` | `VARCHAR(100)`| NOT NULL | Author username |

### `questions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | Question identifier |
| `qpap_id` | `INTEGER` | FOREIGN KEY `question_papers.id` | Parent paper |
| `qno` | `INTEGER` | NOT NULL | Sequential question order |
| `type` | `VARCHAR(30)` | NOT NULL | `SINGLE_CORRECT`, `MULTI_CORRECT`, `NUMERICAL`, `INTEGER`, `TRUE_FALSE` |
| `qtxt` | `TEXT` | NOT NULL | Question statement (supports markdown & LaTeX) |
| `qimg` | `VARCHAR(255)`| NULLABLE | Attached diagram image |
| `options_json` | `TEXT` | DEFAULT `'[]'` | Serialized option strings |
| `key_json` | `TEXT` | NOT NULL | Correct answer keys array |
| `cmk` | `FLOAT` | DEFAULT `4.0` | Marks awarded for correct response |
| `imk` | `FLOAT` | DEFAULT `-1.0` | Negative marks deducted for incorrect response |
| `pmk` | `FLOAT` | DEFAULT `0.0` | Partial marks (for multi-correct questions) |
| `diff` | `VARCHAR(20)` | DEFAULT `'MEDIUM'` | `EASY`, `MEDIUM`, `HARD` |
| `subj` | `VARCHAR(50)` | NOT NULL | Subject classification |

### `exam_schedules`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | Schedule identifier |
| `tenant_id` | `INTEGER` | FOREIGN KEY `tenants.id` | Isolation partition |
| `qpap_id` | `INTEGER` | FOREIGN KEY `question_papers.id` | Question paper reference |
| `name` | `VARCHAR(150)`| NOT NULL | Examination title |
| `stime` | `VARCHAR(50)` | NOT NULL | Start timestamp (`YYYY-MM-DD HH:MM`) |
| `etime` | `VARCHAR(50)` | NOT NULL | End timestamp (`YYYY-MM-DD HH:MM`) |
| `mins` | `INTEGER` | DEFAULT `180` | Time limit per candidate in minutes |
| `status` | `VARCHAR(20)` | DEFAULT `'SCHEDULED'` | `SCHEDULED`, `RUNNING`, `COMPLETED` |
| `shuf` | `BOOLEAN` | DEFAULT `TRUE` | Shuffle question order |
| `cam` | `BOOLEAN` | DEFAULT `FALSE`| Require webcam proctoring |
| `pc_only` | `BOOLEAN` | DEFAULT `FALSE`| Block mobile browsers |
| `switches` | `BOOLEAN` | DEFAULT `TRUE` | Enable window switch monitoring |
| `num_switches`| `INTEGER` | DEFAULT `3` | Max window switches allowed |
| `hide_res` | `BOOLEAN` | DEFAULT `FALSE`| Withhold results until published |

### `exam_attempts`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY | Attempt identifier |
| `exam_id` | `INTEGER` | FOREIGN KEY `exam_schedules.id` | Target exam |
| `user_id` | `INTEGER` | FOREIGN KEY `users.id` | Candidate identifier |
| `start_time` | `DATETIME` | DEFAULT UTC | Time attempt started |
| `end_time` | `DATETIME` | NULLABLE | Time attempt submitted |
| `status` | `VARCHAR(20)` | DEFAULT `'IN_PROGRESS'` | `IN_PROGRESS`, `SUBMITTED`, `TERMINATED` |
| `score` | `FLOAT` | DEFAULT `0.0` | Computed net score |
| `total_marks` | `FLOAT` | DEFAULT `0.0` | Total maximum attainable marks |
| `switch_count`| `INTEGER` | DEFAULT `0` | Number of detected tab switch events |
| `responses_json`| `TEXT` | DEFAULT `'{}'` | Keyed answers: `"{ '1': { 'ans': ['6 N'], 'status': 'ANSWERED' } }"` |
