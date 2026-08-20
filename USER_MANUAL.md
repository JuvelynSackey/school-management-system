# JesManage User Manual

This guide is written for people **using** JesManage, not people building
it — no code or technical knowledge is assumed. If you're looking for the
technical/developer documentation instead, see
[`README.md`](./README.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## 1. Introduction

JesManage is a school management system that one school (or, behind the
scenes, many schools at once) uses to run its day-to-day academic and
administrative work: enrolling students, recording attendance, entering and
approving results, generating report cards, tracking fees, and letting
parents and students check on things themselves instead of having to call
the school.

Everyone who uses JesManage falls into one of five roles, and what you see
when you log in depends entirely on your role:

| Role | Who this is |
|---|---|
| **Super Admin** | The platform operator — manages the list of schools using JesManage itself, not any one school's day-to-day data |
| **School Admin** | Runs one school's account — students, staff, results approval, fees, settings |
| **Teacher** | Records attendance and enters/submits results for their assigned classes |
| **Parent** | Views their own child's (or children's) results, report cards, and fee balance |
| **Student** | Views their own results, report card, attendance, and fee balance |

## 2. Getting Started

You don't sign yourself up. Every account is created *for* you by someone
above you in the list above — a Super Admin creates a school and its first
Admin account; an Admin creates Teacher, Student, and Parent accounts from
inside the app. You'll be given a **school code**, along with your email or
phone number and a temporary password.

The first time you log in with a temporary password, JesManage will require
you to set a new one before letting you do anything else — this is not
optional and is not a bug.

## 3. Login

Every login screen (except the Super Admin's) asks for three things:

1. **School code** — identifies which school's data you're logging into
2. **Email or phone number**
3. **Password**

If you get your password wrong, or if the account doesn't exist at all,
JesManage shows the same generic error either way — this is deliberate, so
that someone probing for valid accounts can't tell the difference.

**Forgot your password?** Use the "Forgot password" link. You'll get a
reset link if the account exists (again, the confirmation message is the
same either way, for the same reason). Reset links expire and can only be
used once.

## 4. Super Admin

The Super Admin does not see any individual school's students, results, or
fees — that would defeat the point of keeping schools isolated from each
other. The Super Admin's dashboard covers the platform itself:

- **Dashboard** — how many schools are on the platform, recent activity
- **Create school** — the onboarding form: enter the new school's name and
  its first Admin's details, and JesManage creates the school and a
  ready-to-use Admin account with a temporary password, shown once
- **Manage schools** — the full list of schools, with the ability to
  suspend a school (blocking every account under it from logging in)
- **School administrators** — the platform-level user accounts with
  Super Admin access
- **Security & audit** — a platform-wide log of sensitive actions, and
  security-related settings (e.g. minimum password length)
- **Backups** — trigger and manage database backups

## 5. School Administrator

This is the main operational role for a single school. From the Admin
dashboard you can reach:

- **Dashboard** — a snapshot: student/staff counts, pending results
  awaiting approval, attendance and fee summaries, recent activity
- **Students** — enroll students, search/filter the roster, view a full
  student profile (attendance history, results, fee balance), archive a
  student who has left. From a student's profile you can upload or
  replace their photo, and from the edit form you can set their
  WAEC/BECE index number once one has been assigned — the photo is used
  by the ID Card generator below; the index number is groundwork for a
  future candidate data export, not yet used elsewhere in the app
- **Print ID Cards** — filter the student list to one class, then click
  **Print ID Cards** for an A4 PDF, 10 per sheet, ready to cut and
  laminate. Each card carries a QR code that anyone can scan to confirm
  it's genuine — it opens a public page confirming the student's name,
  admission number, and class against this school's real records,
  without needing to log in. A student with no uploaded photo still gets
  a card, with a plain placeholder in its place
- **WAEC Export** — with a class selected, click **WAEC Export** for a
  CSV of that class's candidates in the standard column layout
  (index number, surname, first name, gender, date of birth, subject
  codes). Before anything downloads, JesManage checks every candidate for
  the fields WAEC actually requires — if anyone's missing a photo, index
  number, date of birth, or gender, you'll see exactly who and what, with
  a one-click link to fix each one, instead of a spreadsheet with gaps in
  it. Subject codes come from whatever subjects are actually assigned to
  that class, in whatever code each subject has been given
- **Teachers/staff** — register teachers, assign a class teacher, activate
  or deactivate an account
- **Classes** — create classes (with stage, e.g. Primary/JHS, and section)
- **Subjects** — the subject list for the school, and which classes offer
  which subjects each term
- **Academic year & terms** — define the school's terms/years; exactly one
  term is marked "current" at a time, and that's what result entry and
  attendance default to
- **Grading scheme** — the score bands (e.g. what score range earns which
  NaCCA grade) — configurable per school, not fixed in the software
- **Result approval** — review each subject's submitted score sheet
  (scores, per student, are shown right there in the review screen) and
  approve or reject it (with a reason, if rejecting). A student's row may
  carry a ⚠️ **Review** badge — a sharp drop from their own history in
  that subject, or a large gap between their class score and exam score.
  This is advisory only: hovering it explains why, and it never blocks
  approval — it's a nudge to glance twice, not a rule you have to satisfy.
  If your school has AI configured, a one-line summary may also appear at
  the top of the review screen giving a general sense of what the flags
  look like.
- **Status Matrix** — under Results, a whole-school grid: every class down
  the side, every subject across the top, and a colored marker in each
  cell showing where that class/subject stands this term — 🟥 Not
  Started, 🟦 Draft, 🟨 Pending Review, 🟧 Rejected, 🟩 Approved. It's a
  map for spotting what still needs attention, not a place to act — you
  still review and approve from the usual per-class screen.
- **Terminal reports** — generate, lock, and publish the term's report
  cards once every subject is approved (see §7)
- **Fees** — define fee structures, record payments, review arrears
- **Announcements** — send a notice to the whole school, one class, or one
  student
- **Admissions** — review incoming applications and enroll accepted
  applicants
- **Audit log** — see who did what, and when, within your school
- **Students Who May Need Attention** — a panel on your dashboard (and on
  a teacher's, scoped to their own classes) listing students showing low
  attendance, a downward trend across terms, or multiple failing subjects
  this term. It's advisory only — a starting point for a supportive
  conversation, never a rule, and appearing on it never automatically
  triggers anything elsewhere in the app. A student's outstanding fee
  balance may be shown alongside a flag as context, but owing fees on
  its own never puts a student on this list — it isn't a sign of
  academic risk.
- **🔎 Ask JesManage** — a button in the top bar that lets you ask a
  question in plain English instead of navigating to a report. It
  currently understands three kinds of questions: who owes fees
  (optionally "in class X" or "more than GHS Y"), which subjects had the
  lowest average scores this term, and which students currently need
  attention. Anything else gets an honest "I can't answer that yet"
  rather than a guess. It's read-only — it can look things up, but it
  can never change, approve, or delete anything.
- **School settings** — school name/logo/contact details, which
  optional features are switched on for your school

## 6. Teacher

A teacher's account is scoped to exactly the classes and subjects an Admin
has assigned them — you cannot see or edit another class's results, even
by guessing a URL.

- **Dashboard** — your assigned classes and subjects, and which score
  sheets still need submitting
- **Assigned classes** — the classes/subjects you teach this term
- **Result entry** — enter class score and exam score for each student in
  a class/subject; JesManage computes the total, grade, and class position
  automatically from the school's grading scheme
- **Offline result entry** — if your connection drops mid-entry, you keep
  working — see §14 for exactly what happens
- **Submit results** — once you're done with a subject's scores, submit
  them for the Admin's review. Submitted scores become read-only to you
  until an Admin either approves them or rejects them back to you with a
  reason
- **Students Who May Need Attention** — your dashboard may show a panel
  flagging students in your own classes with low attendance, a declining
  trend, or multiple failing subjects this term (see §5 for the full
  explanation — same feature, same advisory-only rule).
- **AI Remark Assistant** — while writing a student's term remark (see §7),
  a "✨ Suggest Remark" button offers three AI-generated options based on
  that student's own average, class position, and attendance for the term.
  This depends on your school's platform operator having switched it on —
  if it isn't, the button will tell you plainly rather than failing
  silently.

## 7. Results & Terminal Reports

This is JesManage's central workflow, and it's worth understanding the
full path a score takes from entry to a parent's hands:

```text
Teacher enters scores
        ↓
Teacher submits (per subject)
        ↓
Admin reviews → Approve  or  Reject (with reason, back to Teacher)
        ↓ (once every subject for a student is approved)
Admin generates the student's Terminal Report
        ↓
Admin locks it (freezes every score for that student/term)
        ↓
Admin publishes it
        ↓
Parent / Student can now view and download it
```

Two things are worth knowing that aren't obvious from the diagram:

- **Locking is per student, not per subject.** Once a student's report is
  locked, none of their scores can be edited for that term, even if an
  individual subject's sheet was never formally "submitted."
- **A rejected score sheet goes back to Draft**, not to some limbo state —
  the teacher can immediately fix it and resubmit.

**Performance Insights.** On a student's profile — and, for parents and
students, on the results page — you may see a "Performance Insights"
panel: a trend across the student's last few terms (📈 Improving,
📉 Declining, or ➡️ Steady), plus which subjects stood out this term,
strongest and any that may need attention. It's visible only to the
student themselves, their linked parent, an assigned teacher, or an
admin — the same people who could already see the underlying results. It
only appears once there's enough history to say something meaningful (a
brand-new student won't show one yet), and if your school has AI
configured, a short written summary may accompany it. Treat it as a
starting point for a conversation, not a verdict.

**Getting help writing a remark.** When you're filling in a student's
Teacher's Remark (while the report is still Draft or Rejected), click
**✨ Suggest Remark** for three AI-written options drawn from that
student's own average score, class position, and attendance this term —
nothing else, and nothing about any other student. Click **Use** on one to
drop it into the textbox, then edit it as you like before submitting; the
AI never writes directly to a report on its own, and every suggestion
generated is logged the same way any other sensitive action in JesManage
is (visible to admins in the audit log). If you don't see the button do
anything, or it says AI isn't set up yet, that just means your school
hasn't switched this feature on — write the remark yourself as normal.

**Verifying a report card's authenticity.** Every published report card
carries a QR code. Scanning it (or visiting the verification link
directly) confirms the report card is genuine and hasn't been altered —
useful when a report card is presented outside the system, e.g. to another
school.

## 8. Attendance

Teachers record attendance per class, per day — each student marked
Present, Absent, Late, or Excused. Admins can see attendance summaries
across the whole school; parents and students can see their own child's
(or their own) attendance history.

## 9. Fees

Admins define what's owed (a fee structure — e.g. Tuition for a term, or a
one-off PTA levy) and record payments against it as they come in. A
student's fee status (Pending / Partial / Paid) updates automatically as
payments are recorded — nobody has to calculate a balance by hand. Daily
feeding charges, if your school uses them, accumulate into the same fee
record rather than becoming a pile of separate line items.

## 10. Parent Portal

A parent account is linked to one or more children by an Admin. From the
parent portal you can see, **only for your own linked children**:

- Their results, once a subject has been approved (not before)
- Their published report cards, downloadable as PDF
- Their attendance history
- Their fee balance and payment history

Trying to view another family's child — even by editing a web address
directly — is blocked by the server itself, not just hidden by the app's
menus.

## 11. Student Portal

A student sees the same categories as a parent, but only for themselves:
results (once approved), published report cards, attendance, and fee
balance. A subject that's still in Draft or Submitted (not yet approved)
simply doesn't appear — there's no "pending" placeholder showing an
unconfirmed score.

## 12. Notifications

JesManage can notify people by email when something relevant happens (e.g.
a result-sync conflict being escalated to an admin, or an announcement
being sent). **SMS and WhatsApp notifications are not yet live** — they
exist as options in the announcement composer but currently have no
connected provider, so only email actually sends. If your school hasn't
configured an email server, notifications are simply skipped rather than
failing loudly.

## 13. Audit Logs

Every sensitive action — approving a result sheet, locking or publishing a
report, escalating a sync conflict, a Super Admin action — is recorded
with who did it and when. School Admins can see their own school's log;
the Super Admin can see platform-wide events. This exists so that "who
approved this?" always has an answer.

## 14. Offline Mode

This applies specifically to the **result entry** screen, for teachers.

> Your internet connection drops while you're entering scores → JesManage
> notices immediately and keeps you working — the screen doesn't lock up
> or lose what you've typed → your saves are queued locally on your device
> instead of failing → once your connection comes back, the queue
> automatically sends itself to the school's system → **if nothing has
> changed on the server in the meantime, it just works, silently** → if
> something *did* change (say, an admin approved that subject's scores
> while you were offline), JesManage does **not** silently overwrite the
> approved result with your offline version — it flags it as a conflict,
> tells you plainly that your offline change has not overwritten anything,
> and lets you either discard your offline change or send it to an admin
> for review.

A small indicator near the top of the screen always shows your current
state: online and synced, offline with some changes waiting, or a
conflict that needs your attention.

This currently covers result entry only — other screens (attendance, fees,
etc.) require a live connection. It also only survives the connection
dropping while your browser tab stays open; closing the tab or browser
while offline is not currently supported.

## 15. Troubleshooting

**"I can't log in and I know my password is right."**
Double-check your school code — the same email can exist under a different
school code if you have accounts at more than one school, and a wrong
school code produces the same generic error as a wrong password.

**"It says my session expired."**
Logins last a limited number of hours for security. Just log back in.

**"I entered scores but they disappeared."**
Check the offline indicator near the top of the page. If it shows
"offline" or "pending," your scores are queued locally and will send once
you're back online — they haven't been lost. If it shows a conflict, open
it and follow the on-screen options (§14).

**"My submitted scores are locked and I need to fix something."**
You can't un-submit a score sheet yourself — ask your Admin to reject it
back to you (with a reason), which reopens it for editing.

**"A parent/student can't see a result I approved."**
Check whether the student's Terminal Report has been generated,
**locked**, and **published** for that term — approval of an individual
subject alone doesn't make it visible in the report card; publishing does.

**"I scanned a report card's QR code and it says invalid."**
That report card either wasn't generated by this school's JesManage
account, or its contents have been altered since it was issued — treat it
as untrustworthy and verify with the school directly.
