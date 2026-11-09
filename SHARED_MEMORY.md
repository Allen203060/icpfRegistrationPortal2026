# 🧠 SHARED MEMORY: Multi-Agent Workspace Coordination
### ICPF Camp Registration & Management System (2026 MERN Edition)

> [!IMPORTANT]
> **ALL AGENTS MUST READ THIS FILE BEFORE TOUCHING ANY CODE IN THIS WORKSPACE.**
> This living document coordinates multiple autonomous agents working concurrently on different modules. It prevents file stomping, enforces strict file boundaries, tracks active lock leases, and guarantees contract compliance.

---

## 🚦 Quick Rules for Every Agent
1. **Check Before You Act:** Look at the **Module Registry** below. Never touch a module that is marked `IN_PROGRESS` or `BLOCKED`.
2. **Acquire a Lock:** Before modifying files in an unassigned module (`NOT_STARTED`), edit this file to set the status to `IN_PROGRESS` and record your Agent ID and timestamp in the **Active Leases** table.
3. **Respect File Boundaries:** Write **ONLY** within the directory/file scope specified for your claimed module. Editing files owned by another module is strictly prohibited.
4. **Follow Inter-Module Contracts:** Do not invent your own schema, API routes, or parameter names. You must strictly adhere to the contracts defined in [Section 3: Inter-Module Contracts](#3-inter-module-contracts).
5. **Release Your Lock:** When you finish, run tests, verify changes, set status to `COMPLETED` (or `READY_FOR_INTEGRATION`), and update [`SOUL.md`](file:///home/allen20306/allen/icpfReg/SOUL.md) and [`CHALLENGES.md`](file:///home/allen20306/allen/icpfReg/CHALLENGES.md).

---

## 1. Module Registry & Implementation Plan

| Module ID | Module Name | Scope / File Boundaries | Status | Owner / Lock | Blocked By / Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M1** | **Backend Core & Database Foundation** | `backend/config/`<br>`backend/models/`<br>`backend/server.js`<br>`backend/package.json`<br>`backend/.env.example` | `COMPLETED` | *None (Completed)* | None |
| **M2** | **Intelligent Heuristic Allocator** | `backend/services/allocatorService.js`<br>`backend/tests/allocator.test.js` | `COMPLETED` | *None (Completed)* | Verified (9/9 automated allocator tests passed) |
| **M3** | **REST API Controllers & Routes** | `backend/controllers/`<br>`backend/routes/`<br>`backend/middleware/` | `COMPLETED` | *None (Completed)* | Verified (7/7 API integration tests passed) |
| **M4** | **Document & Export Services (PDF/Excel)**| `backend/services/pdfService.js`<br>`backend/services/excelService.js`<br>`backend/routes/exportRoutes.js` | `COMPLETED` | *None (Completed)* | Verified (4/4 automated export tests passed) |
| **M5** | **Frontend Check-in Desk & Badge Printing**| `frontend/src/components/checkin/`<br>`frontend/src/components/print/`<br>`frontend/src/services/api.js` | `COMPLETED` | *None (Completed)* | Complete UI redesign with user palette, mobile ergonomics, and Three.js background verified |
| **M6** | **Frontend Admin Dashboard & Analytics** | `frontend/src/components/dashboard/`<br>`frontend/src/components/admin/`<br>`frontend/src/pages/` | `COMPLETED` | *None (Completed)* | Live analytics charts, SVG intake velocity waveform, room quotas, and financial stream verified |

*Status options: `NOT_STARTED` | `IN_PROGRESS` | `BLOCKED` | `REVIEW` | `COMPLETED`*

---

## 2. Active Agent Leases & Work Log

| Agent ID | Claimed Module | Task Description | Lock Acquired At | Target Completion |
| :--- | :--- | :--- | :--- | :--- |
| *None* | — | All modules M1 through M6 are fully COMPLETED and verified. | — | — |

*To claim a lease: Replace an empty row with your Agent ID, claimed module, task details, and current timestamp.*

---

## 3. Inter-Module Contracts & System Specifications

All agents must strictly implement and consume the following exact schemas and interfaces. **Any change must be agreed and documented here before code changes.**

### 3.1 Database Schemas (Mongoose / MongoDB)

#### `Participant` Model (`backend/models/Participant.js`)
```typescript
interface IParticipant {
  _id?: string;
  serialNo: number;             // Auto-incremented unique ID (starts at 101)
  name: string;                 // Required, trimmed
  age: number;                  // Required, positive integer
  gender: 'Male' | 'Female';    // Required enum
  church?: string;              // Optional, used for dispersion heuristic
  churchLocation?: string;      // Optional, church parish location/city
  location?: string;            // Optional, personal residence location
  staying: boolean;             // Residential (true) vs Day-scholar (false)
  phone?: string;               // Optional contact number
  assignedTeam: string;         // Name of the team (e.g., "Group A"), or empty string if pending payment
  assignedRoom?: string;        // Room designation (e.g., "Male Room 1"), or empty if pending/day scholar
  checkedInAt: Date;            // Defaults to Date.now
  notes?: string;               // Special requests or medical/dietary notes
  paymentStatus: 'Paid Online' | 'Paid Cash' | 'Waiting Payment' | 'Partial / Balance Due' | 'Exempt';
  amountPaid: number;           // Amount paid in INR
  feeTotal: number;             // Expected camp fee in INR
  balanceDue: number;           // Amount remaining to be paid
  balanceToReturn: number;      // Change to return to attendee
  paymentNotes?: string;        // Transaction ref / cash receipt notes
  groupRegistrationId?: string; // Group registration batch reference
  registeredBy?: string;        // Parent, Pastor, or group leader name
}
```

#### `CampConfig` Model (`backend/models/CampConfig.js`)
```typescript
interface ICampConfig {
  year: number;                 // e.g. 2026
  campTitle: string;            // "ICPF Camp 2026"
  active: boolean;              // Only 1 config active at a time
  teams: Array<{
    name: string;               // e.g. "Team Joshua", "Team Deborah"
    themeColor: string;         // Hex code e.g. "#4A90E2"
    targetCapacity?: number;    // Optional cap
  }>;
  rooms: Array<{
    name: string;               // e.g. "Male Room 1"
    gender: 'Male' | 'Female';  // Gender segregation
    capacity: number;           // Hard limit
    leaderName?: string;        // Room leader
  }>;
}
```

---

### 3.2 Backend Service Interfaces

#### `allocatorService.js` Contract
```javascript
/**
 * Real-time 4-tier heuristic allocation function with anti-consecutive penalty & group keep-together
 * @param {Object} candidate - { name, age, gender, church, location }
 * @param {Array} currentTeams - Current array of teams with existing member lists
 * @param {Array} currentRooms - Current array of rooms with occupancy counts
 * @param {Object} options - { lastAssignedTeam?: string, requestedTeam?: string }
 * @returns {Object} - { assignedTeam: string, assignedRoom: string }
 */
function allocateParticipant(candidate, currentTeams, currentRooms, options = {}) { ... }
```

---

### 3.3 REST API Endpoints

| Method | Route | Body | Success Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/participants/register` | `{ name, age, gender, church, location, staying, phone, paymentStatus, amountPaid, feeTotal, balanceDue, paymentNotes, notes }` | `{ success: true, data: Participant }` | Real-time counter registration + automated allocation |
| `POST` | `/api/participants/register-group` | `{ registeredBy, phone, church, location, keepTogether, paymentStatus, feeTotal, amountPaid, members: [...] }` | `{ success: true, data: { groupRegistrationId, count, members } }` | Batch group / family registration under parent or pastor |
| `PATCH`| `/api/participants/:id/notes` | `{ notes, paymentNotes, paymentStatus, amountPaid, balanceDue, balanceToReturn }` | `{ success: true, data: Participant }` | Quick inline notes and payment update |
| `GET` | `/api/participants` | Query: `?search=&team=&gender=&page=&limit=` | `{ success: true, count, total, data: [Participant] }` | Filtered attendee roster |
| `GET` | `/api/participants/:id` | None | `{ success: true, data: Participant }` | Get single participant |
| `PUT` | `/api/participants/:id` | Partial `Participant` fields (including payment & notes) | `{ success: true, data: Participant }` | Manual override or correction |
| `DELETE`| `/api/participants/:id` | None | `{ success: true, message: "Deleted" }` | Remove attendee & reclaim room slot |
| `GET` | `/api/config/active` | None | `{ success: true, data: CampConfig }` | Retrieve active 2026 camp configuration |
| `PUT` | `/api/config/teams` | `{ teams: [...] }` | `{ success: true, data: CampConfig }` | Update 2026 team names & colors |
| `PUT` | `/api/config/rooms` | `{ rooms: [...] }` | `{ success: true, data: CampConfig }` | Update room quotas & gender tags |
| `GET` | `/api/export/id-cards` | Query: `?team=&format=pdf` | Binary PDF Stream (`application/pdf`) | Printable 6-cards-per-A4 PDF |
| `GET` | `/api/export/room-lists`| Query: `?format=pdf` | Binary PDF Stream (`application/pdf`) | Room attendance sheets with sign-off |
| `POST` | `/api/export/import-excel`| Multipart Form (`file: .xlsx`) | `{ success: true, importedCount: number }` | Batch Excel upload |

---

## 4. Module Boundaries & Forbidden Actions

```
ICPF MERN Monorepo:
├── backend/
│   ├── config/              <--- Owned by M1
│   ├── models/              <--- Owned by M1
│   ├── services/
│   │   ├── allocatorService <--- Owned by M2
│   │   ├── pdfService.js    <--- Owned by M4
│   │   └── excelService.js  <--- Owned by M4
│   ├── controllers/         <--- Owned by M3
│   ├── routes/              <--- Owned by M3 (M4 owns exportRoutes.js)
│   └── server.js            <--- Scaffolded by M1, registered by M3/M4
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── checkin/     <--- Owned by M5
    │   │   ├── print/       <--- Owned by M5
    │   │   ├── dashboard/   <--- Owned by M6
    │   │   └── admin/       <--- Owned by M6
    │   └── services/api.js  <--- Contract defined; shared read
```

### Prohibited Cross-Module Violations:
1. **Never edit files in a directory not assigned to your module.**
2. **Never change API route names or parameter casing without updating Section 3 first.**
3. **Never push code without running module-specific tests.**
4. **Never hardcode 2026 team names in code**; always fetch them from `CampConfig`.

---

## 5. Event & Coordination Log

| Timestamp (ISO) | Agent / Actor | Event / Transition | Notes |
| :--- | :--- | :--- | :--- |
| 2026-11-04T10:55:00Z | Lead Architect | Multi-Agent Coordination Initialized | Modules M1–M6 defined with strict boundaries and contracts. |
| 2026-11-04T12:52:00Z | `Subagent-BackendCore-M1` | Module M1 Completed | Backend foundation, Mongoose models (Participant, CampConfig, Team, Room), config seeding, and health check verified (21/21 tests pass). |
| 2026-11-04T07:59:40Z | Codex | M2 allocator implementation ready for review | Implemented `backend/services/allocatorService.js`; module tests were not run. |
| 2026-11-04T08:02:54Z | Codex | M3 participant and configuration APIs ready for review | Implemented registration, roster CRUD, config routes, validation, and route registration; JavaScript syntax checked; API tests were not run. |
| 2026-11-04T08:05:43Z | Codex | M4 blocked pending dependency access and API review | `npm install pdfkit exceljs` stalled without registry access and was stopped; no export implementation or dependencies were committed. |
| 2026-11-04T13:34:00Z | `Antigravity` | Module M5 Completed | React (Vite + Tailwind) registration desk UI, instant 85x54mm badge preview, and `@media print` stylesheets built and verified with zero errors. |
| 2026-11-04T13:34:30Z | `Antigravity` | Module M6 Claimed | Building live metrics dashboard, gender balance charts, searchable participant roster table, and manual room/team override modals. |
| 2026-11-04T13:36:30Z | `Antigravity` | Module M6 Completed | Live metrics KPI cards, 2026 team balance graphs, searchable participant table with filters, and manual override modal built and verified. Full frontend bundle passes production build in 2.04s. |
| 2026-11-04T13:49:00Z | `Antigravity` | Review & Verification of M2 & M3 | Module M2 verified with 9/9 automated tests in `backend/tests/allocator.test.js`. Module M3 patched with standalone MongoDB transaction fallback and verified with 7/7 automated API tests in `backend/tests/api.test.js`. Both marked COMPLETED. |
| 2026-11-04T13:49:30Z | `Antigravity` | Module M4 Unblocked | Diagnosed npm network connectivity (PONG 410ms) and successfully installed `pdfkit: ^0.20.2` and `exceljs: ^4.4.0` in `backend/package.json`. M4 status changed from BLOCKED to available NOT_STARTED. |
| 2026-11-04T14:30:00Z | `Antigravity` | Module M4 Completed | PDFKit ID badges (6 per A4, 85x54mm), room rosters with signature line, Excel export, and multipart Excel upload with auto-allocation verified (4/4 tests pass). Entire MERN suite (M1–M6) is COMPLETED. |
