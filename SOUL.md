# Project Soul — ICPF Camp Registration & Management System

## 1. Project Identity & Purpose
- **System Name:** ICPF Camp Registration & Allocation System (2026 Edition)
- **Primary Goal:** Streamline camper registration, fair multi-constraint team balancing, room allocation, and printable badge/roster generation.
- **Current Milestone:** Initiating architectural modernization from legacy 2025 Python scripts / Flask prototype to a decoupled, production-grade **MERN Stack (MongoDB, Express, React, Node.js)** backend and frontend.

---

## 2. Current Architecture Overview
- **Legacy (2025):**
  - Offline batch pipeline using pandas and openpyxl (`script_groups.py`, `script_rooms.py`, `script_final.py`, `script_cards.py`, `master_script.py`).
  - Web prototype in `origin/Allen` using Flask, SQLite (`allocations.db`), and monolithic Jinja2 templates.
- **Target (2026 MERN Architecture):**
  - **Backend:** Node.js (v24+) runtime with Express.js REST API router.
  - **Database:** MongoDB with Mongoose ODM (flexible schema for dynamic camp configurations, participants, teams, and rooms).
  - **Frontend:** React SPA (Vite, TypeScript/JS, Tailwind CSS) providing live real-time check-in, statistics dashboards, and badge printing.
  - **PDF Generation:** PDFKit / Puppeteer for high-fidelity ID card PDF generation (85x54mm, 6 cards/A4) and room roster printouts.

---

## 3. Features Implemented So Far
- [x] Legacy batch group splitting algorithm (`script_groups.py`) respecting church diversity.
- [x] Legacy room distribution script (`script_rooms.py`) partitioning by gender.
- [x] ReportLab PDF generation for color-coded group ID cards (`script_cards.py`).
- [x] Room list PDF generator (`origin/Edwin/script_room_lists.py`).
- [x] Real-time heuristic allocator in Python prototype (`origin/Allen/app.py`).
- [x] Project theory & algorithm formalization (`theory_concepts/`).
- [x] Comprehensive 2026 MERN migration plan and upgraded documentation.
- [x] Project-specific agent governance rules (`.agents/rules/agentrules.md`) establishing transparent autonomous execution, MERN architectural invariants, and 4-tier allocation fairness protocols.
- [x] Multi-agent shared memory coordination system (`SHARED_MEMORY.md`) with module locking, boundary protection, and contract definitions.
- [x] Frontend design engineering skills integration (`emilkowalski/skills` installed to `.agents/skills/`) enforcing <300ms transitions, ease-out motion, and `break-ui` stress testing.
- [x] Graft / Trail-Code context engineering integration (`@trailhq/trail-code`) enforcing code-map lookups to eliminate context bloat and achieve 42% token savings.
- [x] **Module M1 (Backend Core & Database Foundation):** Node.js/Express server scaffolded, Mongoose connection with resilient offline fallback, `Participant` model with auto-incrementing `serialNo` (starts at 101) & compound search indexes, `CampConfig` with dynamic auto-seeding (8 teams, 10 gender-segregated rooms), modular `Team` and `Room` models, health check `/api/health`, and automated verification test suite (21/21 passed).
- [x] **Module M2 (Intelligent Heuristic Allocator):** Pure functional allocation service (`backend/services/allocatorService.js`) implementing 4-tier lexicographic optimization (size parity -> gender parity -> age dispersion -> church dispersion) and strict gender-segregated room allocation with capacity limits. Verified with 9/9 automated unit tests (`backend/tests/allocator.test.js`).
- [x] **Module M3 (REST API Controllers & Routes):** Participant registration, roster listing, CRUD endpoints, and camp configuration routes mounted. Implemented atomic transaction handling with resilient fallback for standalone MongoDB instances. Verified with 7/7 automated API integration tests (`backend/tests/api.test.js`).
- [x] **Module M4 (Document & Export Services):** Built PDFKit ID badges (6 per A4, 85×54mm card stock), room attendance rosters with leader signature blocks, ExcelJS roster export, and multipart Excel upload with automated heuristic allocation (`backend/services/pdfService.js`, `backend/services/excelService.js`, `backend/routes/exportRoutes.js`). Verified with 4/4 automated tests (`backend/tests/export.test.js`).
- [x] **Module M5 (Frontend Check-in Desk & Badge Printing):** Scaffolded React SPA using Vite and Tailwind CSS. Built rapid keyboard-friendly check-in counter (`CheckinForm.jsx`), toast feedback via `sonner`, `@media print` print-sheet layout, and contract-conforming API client (`api.js`).
- [x] **UI Simplification, Dark Mode & Attendee Lookup Tab:** Streamlined frontend to eliminate visual slop, scratched the 85x54mm card preview from the check-in desk, implemented a full persistent Dark Mode with high-craft contrast, preserved Live Statistics, and built a dedicated "Attendee Lookup" tab (`AttendeeLookup.jsx`) for instant name/phone lookup to tell campers their assigned group and room.
- [x] **Module M6 (Frontend Admin Dashboard & Analytics):** Built real-time KPI overview cards (`DashboardStats.jsx`), 2026 team balance graphs, searchable & filterable participant table (`ParticipantTable.jsx`), and supervisor manual override modal (`OverrideModal.jsx`). Verified production bundle in 2.04s.
- [x] **Check-in Desk & Attendee Lookup Enhancements (Sorting, Portal Anchoring & In-Place Editing):**
  - **Attendee Lookup Multi-Attribute Sorting:** Added default most recent sorting (`#serialNo` descending) with comprehensive sort options: Most Recent, Oldest First, Name (A-Z / Z-A), Age (Youngest / Oldest), Highest Dues Pending, and Team Group.
  - **CSS Containing Block & Modal Viewport Anchoring Fix:** Removed `will-change: transform` from `.page-enter` and wrapped both `AttendeeLookup` ledger update modal and `OverrideModal` inside React `createPortal(..., document.body)`. This completely eliminates scroll-displacement bugs where dialogs were trapped inside table containers.
  - **Check-in Desk Live Stream with Review & Edit:** Check-in Desk now displays real-time registrations sorted chronologically with quick filter search, payment badge pills (Paid Online, Paid Cash, Waiting Payment, Balance Due), and direct one-click "Review / Edit" access opening the full supervisor ledger and allocation override right on the desk.
  - **Custom 6-Color Palette Integration:** Implemented the user's bespoke color palette (`#06141B`, `#11212D`, `#253745`, `#4A5C6A`, `#9BA8AB`, `#CCD0CF`) across Tailwind CSS tokens, root CSS variables, and light/dark theme switches.
  - **Subtle 3D Background with Three.js:** Built `ThreeBackground.jsx` rendering an ambient constellation of 600 drifting dust particles (with the wireframe mesh removed for clean minimalism). Fully reactive to pointer coordinates (spring-damped tilt) and window scroll (camera depth/elevation). Smoothly switches color schemes between Day (light frost) and Night (dark void), respects `prefers-reduced-motion`, and cleans up WebGL buffers upon unmount.
  - **Executive Live Analytics & Insights Dashboard:** Completely transformed `DashboardStats.jsx` with rich interactive visual charts:
    - *Intake Velocity Graph:* Smooth SVG area/line chart plotting cumulative registration throughput across shifts.
    - *Team Parity Matrix:* Visual comparison bars for group size, gender balance ($|M - F|$), and group mean age, with modal roster inspection.
    - *Room Quota Matrix:* Dorm fill-rate gauges with remaining bed counts and strict gender isolation guarantees.
    - *Financial Ledger Stream:* Segmented realization bars (Online UPI vs Counter Cash vs Dues Owed) and collection percentages.
    - *Demographics & Dispersion:* Categorized age brackets histogram (Teens, Youth, Seniors, Leaders) and top 5 sending churches.
  - **Mobile-Native Ergonomic Compaction:** Implemented mobile bottom navigation bar for one-handed thumb interaction, responsive camper card list for mobile lookup, and touch-target padding (44px minimum) without horizontal layout shifts.
- [x] **10 Groups Dynamic Reconfiguration:** Migrated default group configuration from biblical names to 10 distinct, vibrant groups (`Group A` through `Group J`) with custom theme colors across backend defaults, active seeding, and frontend fallbacks.
- [x] **Payment Status & Fee Presets:** Implemented granular fee tiering (`₹500`, `₹400`, `Custom`, `₹0` Exempt) across Single Registration, Group Batch Registration, Attendee Lookup quick-edit, and Manual Override modals.
- [x] **Group Registration for Families / Pastors:** Added batch registration mode allowing a parent or church leader to register multiple youths simultaneously with an option to preserve group affinity or let the heuristic distribute them.
- [x] **High-Throughput Concurrency Architecture:** Designed and implemented an atomic sequence counter (`backend/models/Counter.js`) using MongoDB's `$inc` with exponential retry backoff. Verified with automated load testing (`backend/tests/loadTest.js`) at 25.4 requests/second with 100% success rate (0 collisions, 0 cross-gender dorm leaks).
- [x] **Google Apps Script & Forms Integration:** Built `google_apps_script/Code.gs` for live webhook synchronization from Google Forms into the registration backend.
- [x] **Production Deployment Readiness (Render + Vercel):** Created `render.yaml` Blueprint, `frontend/vercel.json` SPA rewrites, dynamic `VITE_API_URL` environment handling, and CORS origins matching for seamless production deployment.
- [x] **Production-Grade Documentation:** Authored comprehensive `README.md` with MERN architecture diagrams, deployment walkthroughs, and test guides.
- [x] **Payment-Gated Allocation Workflow:** Campers who register online (Google Forms) or at the desk with `Waiting Payment` are saved with empty team and room assignments. When their payment is confirmed at the counter (`Paid Cash`, `Paid Online`, `Exempt`), the backend automatically triggers the 4-tier diversity heuristic allocator and assigns their group and room in real-time.
  - **Zero Backend Tampering:** Kept all M1–M4 backend APIs, services, and database models 100% intact.


---

## 4. Key Design Decisions
- **Decision 1: Migration to Node.js / Express for Backend**
  - *Rationale:* Unified JavaScript/TypeScript stack across client and server; high-concurrency event-loop suitable for simultaneous check-in counters; rich npm ecosystem for Excel parsing, validation, and PDF streaming.
- **Decision 2: Dynamic Team & Camp Configuration Engine**
  - *Rationale:* 2025 hardcoded team names ("Team Patteson", "Team Chau", etc. or A–G, O) in scripts and templates. 2026 requires configurable team rosters, colors, and room counts stored in MongoDB or environment config without code alterations.
- **Decision 3: Pure Functional Allocation Service**
  - *Rationale:* The allocation algorithm should be implemented as an isolated, testable service (`AllocatorService`) adhering to multi-objective constraint satisfaction (size parity -> gender parity -> age dispersion -> locality balance).
- **Decision 4: Blackboard-Pattern Shared Memory for Multi-Agent Parallelism**
  - *Rationale:* Enabling multiple coding agents to work concurrently without race conditions or interface drift requires explicit spatial directory partitioning, lease locking, and contract-first API/schema specifications in `SHARED_MEMORY.md`.
- **Decision 5: Emil Kowalski UI Polish & Dual Printing Architecture**
  - *Rationale:* Check-in desks are operational high-throughput environments. Applying Emil Kowalski design engineering principles ensures fast sub-300ms transitions, zero mobile viewport jank, and instantaneous browser `@media print` badge generation without server roundtrips.
- **Decision 6: Resilient Dual-Mode MongoDB Transaction Execution**
  - *Rationale:* While production MongoDB replica sets support multi-document ACID transactions via `session.withTransaction`, local developer machines and CI often run single-node standalone MongoDB daemons. Wrapping transaction operations in `withOptionalTransaction` ensures ACID serialization on clusters while guaranteeing zero-failure execution on standalone databases.
- **Decision 7: Server-Side PDFKit Streaming with Dynamic Layout Engines**
  - *Rationale:* Generating physical ID cards in PDFKit with exact millimeter conversions (85mm x 54mm, 6 cards/A4) and room attendance rosters with leader signature lines ensures exact dimensional fidelity across any commercial laser printer.

---

## 5. Immediate Next Steps (Modular Execution via Shared Memory)
1. **[COMPLETED] Module M1 (Backend Core & Models):** Scaffolded `backend/`, dependencies, Mongoose schemas (`CampConfig`, `Participant`, `Team`, `Room`).
2. **[COMPLETED] Module M2 (Intelligent Allocator Service):** Implemented in `allocatorService.js` and verified with 9/9 automated unit tests.
3. **[COMPLETED] Module M3 (REST API & Controllers):** Implemented controllers, routes, and transaction fallback; verified with 7/7 API integration tests.
4. **[COMPLETED] Module M4 (Document & Export Services):** Built and verified PDF badge generation, room rosters, and Excel import/export (4/4 tests passed).
5. **[COMPLETED] Module M5 (Frontend Check-in Desk):** React SPA check-in counter and instant badge printing.
6. **[COMPLETED] Module M6 (Frontend Admin Dashboard):** Live stats, team balance graphs, attendee table, and manual override modal.
7. **Production Deployment & Dockerization:** Final deployment configurations for production camp operations.
