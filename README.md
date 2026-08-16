# School Management System

A web-based School Management System built with **React (Vite)**, **Node.js/Express**, and **MySQL**, following the project proposal's three-tier architecture (Presentation → Application → Data) with JWT authentication and role-based access control (Admin, Teacher, Student).

## Features

- Secure login (JWT) with role-based access control
- Student management: register, search/filter, assign to class, archive, profile with attendance/results history
- Teacher management: register, assign as homeroom teacher, assign to subjects/classes, activate/deactivate
- Class & subject management, academic terms/sessions
- Attendance: daily recording per class, per-student summaries
- Results: score entry per subject/term/exam type with automatic grading
- Fees & payments: assign fees, record payments, automatic balance/status calculation, payment history
- Role-aware dashboard (counts, attendance stats, fee stats, recent activity)
- Reports: on-screen preview + CSV export for students, attendance, results, and fees

## Project Structure

```
client/    React (Vite) frontend
server/    Express REST API + MySQL schema/scripts
```

## Prerequisites

- Node.js 18+ and npm
- MySQL Server 8+ (Community Server or equivalent)

## Setup

1. **Install dependencies** (installs both `client` and `server` via npm workspaces):
   ```
   npm install
   ```

2. **Configure environment variables**:
   ```
   copy server\.env.example server\.env
   copy client\.env.example client\.env
   ```
   Edit `server/.env` with your MySQL connection details (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) and set a strong `JWT_SECRET`.

3. **Start MySQL.** If you already have a MySQL server running, just make sure `server/.env` points to it. This project also includes a portable, no-admin-rights way to run MySQL locally without installing it as a Windows service:
   ```
   npm run db:start -w server   # starts mysqld in the background, data stored in server/mysql-data
   npm run db:stop -w server    # stops it
   ```

4. **Create the schema**:
   ```
   npm run db:setup -w server
   ```

5. **Seed the initial admin account and a default academic term**:
   ```
   npm run db:seed -w server
   ```

6. **Run the app** (starts both the API and the frontend dev server):
   ```
   npm run dev
   ```
   - API: http://localhost:5000
   - App: http://localhost:5173

## Default Login

| Role  | Email | Password |
|-------|-------|----------|
| Admin | `admin@school.local` | `Admin@123` |

**Change this password after first login.** Additional accounts (teachers, students) are created by the admin from within the app — a temporary password is shown once at creation time.

## Available Scripts

Run from the project root unless noted:

- `npm run dev` — start both API and frontend in dev mode
- `npm run db:start` / `npm run db:stop` — start/stop the local MySQL instance (portable mode)
- `npm run db:setup` — apply `server/database/schema.sql`
- `npm run db:seed` — create the initial admin account + default academic term

## Roles

- **Admin** — full access: students, teachers, classes, subjects, terms, teacher-subject assignments, fees, reports, system data.
- **Teacher** — attendance and results entry for their assigned classes/subjects; read-only access to their students.
- **Student** — read-only access to their own profile, attendance, results, and fee balance.

## Notes / Future Work

- Parent/Guardian role was scoped out of v1 per the project proposal (marked optional) and can be added later.
- Auth uses a single long-lived JWT (no refresh-token rotation) for simplicity — acceptable for v1, worth revisiting for production hardening.
- Reports are exported as CSV; PDF report cards/receipts are a possible future enhancement.
