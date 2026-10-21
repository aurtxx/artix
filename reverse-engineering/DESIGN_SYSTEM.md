# DESIGN_SYSTEM.md — Neo-Brutalist Examination Platform Design System

## 1. Philosophical Foundations: Neo-Brutalist Editorial Utility

This platform rejects generic modern AI dashboard tropes:
- ❌ No excessive pill-shaped radius (`rounded-3xl` everywhere)
- ❌ No low-contrast glassmorphism or muddy blur overlays
- ❌ No neon pastel rainbow gradients
- ❌ No oversized, decorative hero sections with useless illustrations

Instead, it adopts **Neo-Brutalist Editorial Utility** designed for high-stakes academic examinations:
- ✅ **Crisp, solid borders:** `border-2 border-slate-900` or `border-black`
- ✅ **Hard, restrained drop shadows:** `shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]` / `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- ✅ **Tactile click feedback:** Active button states that depress downward: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`
- ✅ **High-density functional tables:** Dense, bordered tabular presentation with monospaced metrics
- ✅ **Geometric status tags:** Sharp rectangular status badges with high-contrast text

---

## 2. Color Palette & Semantic Tokens

| Token | Hex / Class | Semantic Role |
|---|---|---|
| **Canvas Light** | `#F8FAFC` (`bg-slate-50`) | Primary page background |
| **Surface Pure** | `#FFFFFF` (`bg-white`) | Cards, tables, modal surfaces |
| **Ink Strong** | `#0F172A` (`text-slate-900`) | Primary body text & prominent headings |
| **Ink Muted** | `#475569` (`text-slate-600`) | Secondary metadata & captions |
| **Border Solid** | `#0F172A` (`border-slate-900`) | Primary 2px structural borders |
| **Accent Primary** | `#2563EB` (`bg-blue-600`) | Primary action buttons & active navigation tabs |
| **Safety Green** | `#16A34A` (`bg-emerald-600` / `#DCFCE7`) | Answered questions, positive marks (+4), active status |
| **Warning Amber** | `#D97706` (`bg-amber-600` / `#FEF3C7`) | Unanswered questions, anti-cheat switch warnings |
| **Review Purple** | `#9333EA` (`bg-purple-600` / `#F3E8FF`) | Questions marked for review |
| **Critical Red** | `#DC2626` (`bg-red-600` / `#FEE2E2`) | Negative mark penalties (-1), exam termination |

---

## 3. Typography Scale & Hierarchy

- **Font Family (Headings & UI):** `Geist Sans`, system sans-serif (`font-sans`)
- **Font Family (Timer, Marks & IDs):** `Geist Mono`, system monospace (`font-mono`)
- **Scale:**
  - `Display / Topbar Logo:` 20px / 1.25rem, `font-black tracking-tight`
  - `Card / Modal Title:` 16px / 1.0rem, `font-bold tracking-tight`
  - `Question Body Text:` 14px / 0.875rem, `font-medium leading-relaxed`
  - `Form Labels & Table Headers:` 11px / 0.6875rem, `font-bold uppercase tracking-wider`
  - `Timer:` 15px / 0.9375rem, `font-mono font-bold tracking-wider`

---

## 4. Component Primitives & Styling Contracts

### 4.1 Buttons
- **Primary Action (Neo-Brutalist Solid):**
  ```css
  border-2 border-slate-900 bg-blue-600 text-white font-bold px-4 py-2 text-xs
  shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-blue-700
  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all
  ```
- **Secondary / Neutral:**
  ```css
  border-2 border-slate-900 bg-white text-slate-900 font-bold px-4 py-2 text-xs
  shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100
  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all
  ```
- **Danger / Clear:**
  ```css
  border-2 border-slate-900 bg-red-100 text-red-900 font-bold px-3 py-1.5 text-xs
  shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-red-200
  ```

### 4.2 Data Tables (Staff Dashboard)
- Sharp rectangular borders, dark header background, crisp row dividers:
  ```css
  border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]
  ```
  Header cells:
  ```css
  border-b-2 border-slate-900 bg-slate-100 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-800
  ```

### 4.3 Question Palette (CBT Player)
- Dense 5-column grid. Each item has a distinct 2px border and hard drop shadow:
  - **Answered:** `border-2 border-slate-900 bg-emerald-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
  - **Marked for Review:** `border-2 border-slate-900 bg-purple-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
  - **Not Visited / Default:** `border-2 border-slate-900 bg-slate-100 text-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
  - **Current Active Question:** `ring-2 ring-blue-600 ring-offset-2 scale-105 font-black`

---

## 5. Candidate Experience vs Staff Experience

### Staff Console (High-Information Density)
- Optimized for batch scheduling, student roster scanning, question paper composition, and result inspection.
- Emphasizes tabular layouts, quick-filter bars, and instant modal dialogues.

### Candidate CBT Player (Cognitive Clarity & Zero Distractions)
- Prioritizes legibility under timed examination pressure.
- Neutral, high-contrast canvas with no competing animations or decorative noise.
- Prominent countdown timer in fixed view.
- Clear confirmation dialogues before final irreversible submission.
