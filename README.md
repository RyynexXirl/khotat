 — Quran Memorization Management

A mobile-first, fully Arabic (RTL) web app for running Quran memorization circles (حلقات) at a high school. The Sheikh oversees all groups, supervisors grade students daily, and students follow their 30-day plan and see their debts. All data lives in a shared Netlify Database, so everyone sees the same information.

## Features

- **Login** — choose a role: الشيخ (password `1234`), مشرف (pick from a dropdown, then the password the Sheikh set), محفظ (pick from a dropdown, then the password the Sheikh set), or طالب (pick a group, search for your name, then your own password).
- **Self-registration** — students create their own account from the login page: name (auto-formatted to «X بن Y Z»), group (الأجاويد / الثبات / الارتقاء), sub-group for الأجاويد (الصناديد / الرعود / الكواسر), phone, and password. New accounts appear in the login dropdowns immediately.
- **Sheikh dashboard** — total students and students-with-debts cards (the debts card opens a list with the number of missed days), group progress, add students, open any student's plan, manage مشرف/محفظ accounts, and a "calculate debts now" button. Destructive actions (delete, rename, change group, assign محفظ) are hidden behind a "وضع التعديل" (Edit Mode) switch.
- **Supervisor dashboard** — daily grading sheet for the supervisor's group with toggleable تم الحفظ / لم يحفظ buttons, a "mark everyone done" shortcut, and an editable plan per student.
- **Muhaffiz dashboard** — same grading sheet, but only for the students the Sheikh assigned to that محفظ.
- **Student dashboard** — today's assignment, progress summary, debts count with the list of missed days, and the full plan.
- **PDF export** — a button on the student plan page opens the print dialog with a landscape weekly table (Sun–Wed): new memorization and review split into من/إلى/السورة, plus status and the student's name. "Save as PDF" produces the file.
- **Automatic debts** — a Netlify Scheduled Function runs every day at 4:00 PM (Asia/Riyadh, 13:00 UTC) and turns every ungraded day into a "دَين".
- Tables collapse into stacked cards on phones.

## Demo data

3 groups (الأجاويد، الارتقاء، الثبات). The `muhaffiz_and_auth` migration removed the old demo students and supervisors: real students self-register, and the Sheikh creates مشرف and محفظ accounts. Each student gets an empty plan on study days (Sunday–Wednesday) of the first semester 1448, filled in by hand.

## Tech stack

- TanStack Start (React 19 + Vite), TanStack Router
- Tailwind CSS 4 + shadcn/ui components, lucide icons
- Netlify Database (Postgres) with Drizzle ORM
- Netlify Functions (scheduled) for the 4 PM debt job

## Running locally

```bash
pnpm install
netlify dev
```

`netlify dev` provides the local database emulation and runs migrations. Schema changes go in `db/schema.ts`, followed by `npx drizzle-kit generate --name <change>`.

## Next steps

This is a prototype. Before real use you'd want proper credential hashing and server-side authorization (passwords are stored in plain text, and the session is kept in the browser). A Thursday/holiday calendar and notifications for parents would also help.
