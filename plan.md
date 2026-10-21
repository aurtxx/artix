# Open-Source Web Application Reconstruction Plan

> **Goal:** Clone the targeted web app's UI and reverse-engineer its backend architecture into an open-source, self-hosted system (Next.js + FastAPI + SQLite/PostgreSQL) using a live browser inspection flow with traffic/DOM recording.

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│ 1. Targeted Web App (via Controlled Edge/Chromium)     │
│    - User logs in manually (cookies/session saved)     │
│    - Puppeteer/Playwright proxy intercepts traffic     │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
   [Network Captures]           [DOM & UI Captures]
   - HAR / JSON payloads        - Computed CSS & Tokens
   - API Endpoint paths         - Rendered DOM tree
   - Auth & Session flow        - Assets (SVGs, icons)
             │                           │
             ▼                           ▼
   [FastAPI Backend]            [Next.js Frontend]
   - Recreated API routes       - Clean Tailwind components
   - Pydantic models            - Typed API client
   - Self-hosted Database       - 1:1 functional clone
```

---

## 2. Token Optimization Strategy (Jev-style Compactor)

To prevent Claude context exhaustion during long sessions:
1. **Raw Traffic Pruning:** Strip static binary assets (images, fonts, vendor JS blobs) from recorded logs before sending to the agent.
2. **Compact JSON Contracts:** Convert repetitive API arrays into minimal typed single-item schemas (e.g. 500 items $\to$ 1 sample item).
3. **Structured Handoff:** Pass summary contracts (endpoint path, query params, request shape, response schema) instead of megabyte-long raw payloads.

---

## 3. Step-by-Step Execution Phases

### Phase 1: Browser Launch & Authentication (Est: 3 mins)
1. Claude runs a local Puppeteer script launching Microsoft Edge/Chromium with a dedicated persistent profile (`--user-data-dir`).
2. The browser navigates to the target website.
3. Prompt pauses and asks the user to manually log in.
4. Active session cookies, local storage, and authentication tokens are secured locally in `./captures/session/`.

### Phase 2: Autonomous Traffic & UI Scraping (Est: 10 mins)
1. Automated crawler visits all primary app routes (Dashboard, Settings, Data views, Forms).
2. Interceptor records:
   - `network.har` (all network request/response cycles).
   - Component DOM snapshots and styling tokens.
   - Dynamic states (modals, dropdowns, form submissions).
3. Outputs saved directly to `./captures/`.

### Phase 3: Contract Extraction & Reverse Engineering (Est: 8 mins)
1. Analyze captured endpoints using REA principles:
   - Map request methods (`GET`, `POST`, `PUT`, `DELETE`).
   - Extract JSON schemas into Pydantic models.
   - Infer relational data models (User, Profile, Resource tables).
2. Generate an API contract matrix: `endpoints_spec.json`.

### Phase 4: Open-Source Frontend Rebuild (Est: 15 mins)
1. Scaffold Next.js pages corresponding to recorded views.
2. Translate captured layouts into responsive Tailwind CSS components.
3. Wire form submissions and data hooks to a local API client (`/api/v1/...`).

### Phase 5: Self-Hosted Backend Rebuild (Est: 15 mins)
1. Scaffold a FastAPI service matching the exact endpoints discovered in Phase 3.
2. Implement local database persistence (SQLAlchemy / SQLite or PostgreSQL).
3. Implement self-hosted JWT / session authentication (eliminating third-party telemetry and vendor lock-in).

---

## 4. Immediate Next Step for Claude

When starting the session, execute:
```bash
node scripts/launch-browser-recorder.js --url "<TARGET_URL>"
```
Log the user into the window, close the prompt once logged in, and begin contract compilation.
