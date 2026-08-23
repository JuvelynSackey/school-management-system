# JesManage

A secure, multi-tenant, offline-capable school management platform for
Ghanaian basic schools — built to centralize academic, administrative, and
financial operations behind NaCCA-aligned grading, with a single deployment
serving many independent schools.

**Stack**: React (Vite) · Node.js/Express · MongoDB/Mongoose · JWT
authentication · `AsyncLocalStorage`-based multi-tenancy.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system, tenancy,
ERD, use-case, DFD, and sequence diagrams, and
[`USER_MANUAL.md`](./USER_MANUAL.md) for a role-by-role guide to using the
app. This file is the developer/technical entry point.

## 1. What JesManage is

Most school management tools sold into this market are either single-school
desktop software or expensive, generic SaaS built for a different education
system. JesManage is purpose-built for Ghana's basic-education structure
(Creche through JHS, terms and NaCCA grade bands) and designed from the
ground up to host **many schools on one deployment**, each fully isolated
from the others, rather than requiring a separate install per school.

## 2. Problem it solves

- Score entry, approval, and report-card generation are usually manual,
  spreadsheet-driven, and error-prone, with no audit trail of who approved
  what.
- Teachers in areas with unreliable connectivity risk losing an entire
  session's work if the connection drops mid-entry.
- Parents typically have no self-service way to check a child's results or
  fee balance without contacting the school directly.
- Running one system per school is operationally expensive; JesManage runs
  one codebase and one database for every school, with tenant isolation
  enforced in code rather than by physical separation.

## 3. Key features

- Multi-tenant architecture — one deployment, many schools, enforced
  isolation (see §6)
- Role-based accounts: Super Admin, School Admin, Teacher, Parent, Student
- Results workflow with a real approval state machine (draft → submit →
  approve → lock → publish)
- Offline-capable result entry with conflict detection and resolution
  (see §9)
- Fees, payments, and daily feeding charges with automatic balance tracking
- Attendance recording per class/day
- Parent and student self-service portals
- QR-code document verification (report cards, fee receipts, and now
  student ID cards) — a public, unauthenticated `/verify/:type/...` lookup
- School-branded PDF report cards
- Full audit logging of sensitive actions
- AI Teacher Remark Assistant — suggests report-card remarks from a
  student's own on-record term data, gated behind an optional API key
  (§21); a teacher always reviews and can edit before it's ever saved
- Academic Anomaly Detection — flags a sharp score drop against a
  student's own subject history, or a large class-score/exam-score gap,
  on the admin's sheet-review screen before approval; purely advisory,
  deterministic by default with an optional AI summary layered on top
- Student Performance Insights — a multi-term trend and this term's
  strongest/needs-attention subjects on the Student Profile and My
  Results pages, deterministic by default with an optional 2-3 sentence
  AI narrative layered on top; visible only to a student's own account,
  their linked parent, an assigned teacher, or an admin
- Early-Warning Intelligence — flags students showing low attendance, a
  downward multi-term academic trend, or multiple failing subjects, on
  the Admin and Teacher dashboards; an outstanding fee balance is shown
  only as context on an already-flagged student, deliberately never a
  reason to flag one on its own (§21). Purely advisory, deterministic by
  default with an optional AI-written supportive summary layered on top
- Natural-Language Admin Assistant ("🔎 Ask JesManage", admin-only) —
  answers a small set of read-only questions about fee arrears, subject
  average scores, and at-risk students in plain English. The AI only
  classifies the question into a fixed intent and extracts a few typed
  parameters; it never writes or executes a database query itself (§21)
- Mark Entry Status Matrix — a whole-school Classes × Subjects grid
  (Results → Status Matrix, admin-only) showing at a glance which
  subjects are Not Started, in Draft, Pending Review, Rejected, or
  Approved for a given term. Read-only — it's a map, not a control
- Student photo upload and a WAEC/BECE index-number field — used by the
  ID card generator below; the foundation for a future candidate data
  exporter (§22)
- Batch Student ID Card generator (Students → Print ID Cards,
  admin-only) — an A4 PDF, 10 cards per sheet, one per active student in
  a chosen class. Each card carries a QR code that resolves publicly at
  `/verify/student/:schoolSlug/:id`, reusing the exact same verification
  pattern already built for report cards and fee receipts
- WAEC/BECE candidate data export (Students → WAEC Export, admin-only,
  CSV) — a pre-flight check runs first and blocks the download with a
  per-candidate list of missing fields rather than producing a partial
  or unusable file; subject codes come from each class's actual assigned
  subjects, not a hardcoded WAEC subject list
- Dark mode
- A 37-test automated suite covering auth, tenancy, authorization, the
  results state machine, portal isolation, and offline sync (see §14)

## 4. Technology stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (Vite), React Router, Axios, Recharts, Framer Motion, React Three Fiber |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Mongoose ODM) |
| Auth | JSON Web Tokens (JWT), bcrypt password hashing |
| Multi-tenancy | Node's `AsyncLocalStorage` + a Mongoose plugin that scopes every query |
| PDF generation | Puppeteer |
| Testing | Jest, Supertest, `mongodb-memory-server` (single-node replica set) |
| Validation | express-validator |

## 5. Architecture

JesManage is a conventional three-tier app (React SPA → REST API →
MongoDB), with the multi-tenancy and role-authorization layers doing the
real architectural work. Every `/api/*` request passes through the same
middleware chain: `helmet → cors → authenticate → tenantContext →
authorize → validate → controller → service → Mongoose`. Super-Admin
requests (`/api/super-admin/*`) use a completely separate authentication
middleware that never opens tenant context, since `School` itself is the
tenant registry and can't be scoped to a tenant.

Full diagrams (layered system view, request-flow sequence, 28-model ERD
split by domain, use-case diagram, DFDs, and 9 sequence diagrams covering
login through offline conflict resolution) are in
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## 6. Multi-tenancy

Every school's data lives in the same MongoDB collections, distinguished by
a `schoolId` field. Isolation is enforced at the **query layer**, not just
in controllers:

1. On login, the issued JWT carries the user's `schoolId` as a claim.
2. `authenticate` middleware verifies the JWT and opens an
   `AsyncLocalStorage` context carrying that `schoolId` for the lifetime of
   the request.
3. A Mongoose plugin (`tenantScopePlugin`) is attached to 26 of 28 models.
   Its pre-hooks read the `schoolId` out of that context and force it into
   every `find`/`findOne`/`updateMany`/`deleteMany`/`countDocuments`/
   `distinct` query automatically — a query run with no tenant context
   **throws** rather than silently returning unscoped data.
4. New documents are auto-stamped with the request's `schoolId` on save; a
   client-supplied `schoolId` in a request body is never trusted over the
   authenticated tenant's own context.

`School` (the tenant registry) and `PlatformSettings` (a global singleton)
are the only two models deliberately left unscoped.

## 7. Authentication & security

- Passwords are hashed with bcrypt; never stored or logged in plaintext.
- JWTs carry `{id, role, schoolId}`; a token with no `schoolId` claim
  (a pre-multi-tenant token shape) is rejected outright.
- Login and forgot-password responses are identical whether or not the
  account exists, to avoid leaking account existence.
- Password reset tokens are single-use, hashed at rest, and time-limited.
- Role authorization (`authorize('admin', 'teacher', ...)`) gates every
  route; class/subject-level authorization (`assertClassAccess`) further
  restricts a teacher to only the classes/subjects they're actually
  assigned to.
- Super Admin uses a completely separate authentication path and token
  type, isolated from every tenant's auth.
- Helmet + CORS restricted to the configured client origin.
- The AI Remark Assistant sits **behind**, not beside, the normal
  authorization chain: it never receives raw score/attendance data from the
  client, only a `reportId`, and re-derives everything it sends to the
  model from the database under the exact same tenant/role/class-assignment
  checks as editing that report directly. It has no standing database
  access of its own.

## 8. Results workflow

Two independent state machines govern results:

- **`ResultSheet`** (one per class + subject + term):
  `Draft → Submitted → Approved`, with `Rejected` as a correction loop back
  to `Draft`. Once `Submitted` or `Approved`, further score edits are
  rejected with a structured `RESULT_LOCKED` error.
- **`TerminalReport`** (one per student + term):
  `Draft → Submitted → Locked → Published`, with `Rejected` as a correction
  branch. `Locked` freezes every result for that student/term, independent
  of each subject's own `ResultSheet` status.

Grading is computed from a per-school `GradingScheme` (configurable score
bands), so grade cutoffs aren't hardcoded.

## 9. Offline functionality

Result entry (the highest-stakes, most time-pressured screen for a
teacher) works through a dropped connection:

- The class roster and reference data (classes/subjects/terms/grading
  scheme) are cached in `localStorage` on every successful load.
- If the connection drops, the page falls back to the cached roster and
  shows a "showing cached data" notice instead of erroring.
- Saves made while offline are queued locally instead of failing.
- When the connection returns, the queue automatically replays against the
  real API.
- If a queued write conflicts with what happened on the server while the
  teacher was offline (the sheet was approved, or the report was locked,
  in the meantime), it's surfaced as a **conflict**, not silently retried
  or silently dropped — the teacher sees exactly what happened and can
  discard their change or escalate it to an admin, who gets notified and
  an audit-log entry is recorded.

Sync isn't purely event-driven: alongside the immediate retry on the
browser's `online` event, a background check re-attempts any pending write
every 45 seconds while the browser reports itself online — this covers the
case where the connection is nominally "up" but the sync request itself is
failing for a transient reason (a flaky network, a captive portal, a brief
server restart), which the `online`/`offline` events alone wouldn't catch.
A sync failure is also classified into one of two distinct outcomes rather
than one generic "conflict" bucket: a genuine **conflict** (the sheet or
report changed state on the server while offline — `RESULT_LOCKED`) needs a
human decision (discard the offline change, or escalate it to an admin),
while a **failed** sync (any other server error) offers a **Retry** as
well, since it isn't necessarily a dead end the way a real conflict is.

**Why offline support stops at result entry.** The principle applied
throughout is that offline mode is for *collecting information*, not for
*performing authoritative administrative actions*. Result entry is a
teacher recording numbers into a still-editable draft — safe to queue and
replay. Approving/publishing results, confirming a fee payment, creating or
suspending a school, and any Super Admin operation are all one-way,
higher-integrity actions where a queued-and-replayed request could apply
against a world that's since moved on in a way a raw score can't
meaningfully conflict with — those deliberately stay online-only.
Attendance and student lookup are the most plausible next candidates for
offline support (low-integrity, easy to reconcile), while fee recording
would need real conflict handling of its own (a payment recorded twice is a
real accounting problem, not a UI inconvenience) before it could safely
follow the same pattern.

This is a lightweight, in-tab implementation (`navigator.onLine` +
`localStorage`) — it survives a dropped connection while the tab stays
open, not the browser being closed and reopened offline. A full installable
PWA with a service worker is a **future enhancement** (see §21).

## 10. Finance

- Fee structures are defined per school/term/category (Tuition, Feeding,
  Class Activity, PTA, Other).
- `Fee` records track amount due per student; `Payment` records against a
  fee automatically derive its status (`Pending`/`Partial`/`Paid`).
- Daily feeding charges roll into a student's feeding `Fee` rather than
  being billed as separate line items.

## 11. Attendance

Per-class, per-day attendance (`Present`/`Absent`/`Late`/`Excused`),
recorded by a teacher, visible to admins and (for their own child/self) to
parents and students.

## 12. Portals

- **Parent portal** — view only their own linked children's results, fee
  balances, and published report cards. Access to another family's data is
  denied at the API layer, not just hidden in the UI.
- **Student portal** — view only their own results (and only once a
  subject's sheet is `Approved` — a `Submitted`/`Draft` sheet is invisible
  to the student, not just visually hidden), attendance, and fee balance.

## 13. Audit logging

Sensitive actions (approvals, publishing, conflict escalations, Super Admin
actions) are recorded to an `AuditLog` collection with actor, action,
entity, and timestamp. Platform-level events (Super Admin / system actions)
log with `schoolId: null` rather than being forced into a tenant.

## 14. Testing

```
cd server
npm test
```

37 tests across 6 suites, all passing, each test file spinning up its own
isolated in-memory MongoDB replica-set instance (`mongodb-memory-server`) —
no shared state, no dependency on a real database:

| Suite | Covers |
|---|---|
| `auth.test.js` | Login, generic-failure messages, JWT edge cases, password reset, forced password change |
| `tenancy.test.js` | Cross-tenant data access is blocked; `schoolId` spoofing in a request body is ignored; unscoped queries throw |
| `authorization.test.js` | Role gating on every sensitive route; class/subject-level teacher authorization |
| `results.test.js` | The full results state machine, including the `RESULT_LOCKED` rejection and the amendment path |
| `portals.test.js` | Parent/student isolation — never able to see another family's data |
| `offline.test.js` | Queued writes replaying against an already-approved/locked result are rejected, not silently applied; conflict escalation is audit-logged |

## 15. Project structure

```
client/               React (Vite) SPA
  src/pages/           one folder per feature area (results, fees, attendance, ...)
  src/superAdmin/       Super-Admin UI, separate auth context
  src/context/          Auth, Theme, Offline React contexts
  src/utils/offlineStore.js   localStorage cache + write-queue

server/               Express REST API
  src/models/           28 Mongoose schemas
  src/controllers/      one per resource
  src/routes/            one per resource, role-gated
  src/middleware/        authenticate, tenantContext, authorize, validate
  src/plugins/tenantScope.js   the multi-tenancy enforcement plugin
  src/superAdmin/         Super-Admin auth, routes, controllers (separate from tenant code)
  src/services/           pdf, email, notifications, enrollment, personal attributes
  scripts/                 db setup/seed/backup/restore, super-admin creation, migration
  tests/                   Jest suite (see §14)

ARCHITECTURE.md        System/tenancy/ERD/use-case/DFD/sequence diagrams
USER_MANUAL.md          Role-by-role guide to using the app
```

## 16. Installation

**Prerequisites**: Node.js 18+, npm, and a MongoDB instance running as a
**replica set** (even a single-node one — the app uses multi-document
transactions during student enrollment, which MongoDB rejects on a plain
standalone instance).

```
npm install          # installs client + server via npm workspaces
```

## 17. Environment variables

`server/.env` (copy from `server/.env.example`):

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5000`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/school_management?replicaSet=rs0` |
| `JWT_SECRET` | long random string — required |
| `JWT_EXPIRES_IN` | token lifetime (default `8h`) |
| `CLIENT_ORIGIN` | allowed CORS origin, e.g. `http://localhost:5173` |
| `GEMINI_API_KEY` | optional — activates the AI Remark Assistant (§21) and friends; must start with `AIzaSy` (legacy) or `AQ.` (current default), get one from aistudio.google.com/app/apikey; left blank, everything stays gated to its deterministic fallback |
| `GEMINI_MODEL` | optional, defaults to `gemini-3.6-flash` |

`client/.env` (copy from `client/.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | e.g. `http://localhost:5000/api` |

## 18. Running the development server

```
npm run db:setup       # creates indexes/initial collections
npm run db:seed        # seeds a default academic term
npm run db:create-super-admin -w server   # creates the platform Super Admin account
npm run dev             # runs API (5000) + client (5173) together
```

A school (and its first admin account) is then created through the Super
Admin's onboarding flow, not by seeding — see
[`USER_MANUAL.md`](./USER_MANUAL.md#4-super-admin).

## 19. Running tests

```
cd server
npm test
```

See §14 for what's covered. There is currently no client-side (frontend)
automated test suite — this is a known gap, not an oversight (see §21).

## 20. Production deployment

There's no deployment pipeline (CI/CD, Docker, or hosting config) checked
into this repo yet — that's a future task, not something in place today.
In general terms, deploying JesManage means: build the client
(`npm run build -w client`) and serve the static output from any static
host or from Express itself; run the server against a real MongoDB replica
set (e.g. MongoDB Atlas, which is a replica set by default); and set
`NODE_ENV=production` with a strong, unique `JWT_SECRET`.

## 21. Known limitations

- Offline support currently covers **result entry only** — attendance,
  fees, and other data-entry screens are online-only.
- Offline mode is in-tab only (no service worker) — it does not survive
  the browser being fully closed while offline.
- SMS and WhatsApp notification channels exist in the data model
  (`Announcement.channels`) but are **not wired to a real provider** —
  only email actually sends.
- All seven **JesManage Intelligence** features are built: the
  **AI Teacher Remark Assistant**, **Smart Announcement Composer**,
  **AI Performance Summary**, **Academic Anomaly Detection**,
  **Student Performance Insights**, **Early-Warning Intelligence**, and
  the **Natural-Language Admin Assistant** — powered by Google AI Studio's Gemini API
  (default model `gemini-3.6-flash`) behind
  `GEMINI_API_KEY`. Only the Admin Assistant hard-requires the key (503 with no fallback if
  it's missing); every other feature has a deterministic template/rules
  fallback and returns `fallbackMode: true` instead of erroring when
  the key is absent or a live request fails. Add the key to
  `server/.env` to activate live generation everywhere, no code changes
  required (see §17).
- Early-Warning Intelligence deliberately does **not** treat an
  outstanding fee balance as a risk signal in its own right — a family
  owing fees says nothing about a specific child's academic risk, and
  doing so would effectively flag poverty as a problem. Balance is
  attached only as supportive context on a student already flagged for a
  genuine academic/attendance reason.
- The Natural-Language Admin Assistant is deliberately scoped to a small,
  fixed set of read-only query types (fee arrears, subject averages,
  at-risk students), each backed by an ordinary, already tenant-scoped
  database query — the AI never generates or executes a query itself, only
  classifies intent and extracts a few individually type-checked
  parameters. It's also admin-only in this pass; a Super-Admin-facing
  version (platform-wide questions) would need a separate implementation,
  since Super-Admin auth carries no tenant context to scope against.
- There is no automated frontend test suite yet — only the backend is
  covered (§14).
- Auth uses a single JWT with no refresh-token rotation.

## 22. Future enhancements

The following are proposed directions, not existing features — nothing
below should be read as already built:

- **JesManage Intelligence** — all five features are built (§21): AI
  Remark Assistant, Academic Anomaly Detection, Student Performance
  Insights, Early-Warning Intelligence, and the Natural-Language Admin
  Assistant
- Full installable PWA (service worker, offline attendance/other screens)
- Real SMS/WhatsApp provider integration
- Examination scheduling / timetabling
- Staff attendance and payroll
- The WAEC/BECE candidate data export is CSV-only — no Excel (`.xlsx`)
  output. No spreadsheet-writing library exists anywhere in this project;
  adding one is a deliberate future decision, not something to introduce
  silently for one export
- Result Quality Control / academic trend dashboards
- Data import/export tooling
