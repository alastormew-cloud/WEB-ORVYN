# ORVYN — Windows Setup Guide (Next.js 16 + Supabase)

**This is an ADD-ON to your existing `orvyn-app`, not a separate Next.js project.** It replaces only the starter homepage and `/protected` demo page and adds the private ORVYN workspace. It intentionally **does not** replace your working signup, login, logout, token refresh, `proxy.ts`, Supabase client files, `package.json`, or `.env.local`.

## What is included

- `/dashboard`: actual Supabase-backed widgets and 7-day task activity chart
- `/tasks`: create, edit, complete/reopen, search/filter, and delete tasks
- `/projects`: create projects, inspect progress, delete unused projects
- `/goals`: create goals, add/toggle milestones, mark goals complete
- `/calendar`: week view, upcoming task deadlines, create/delete events
- `/focus`: focus timer, pause/reset, save session to the database
- `/notes`: create/edit/save/delete text notes
- `/analytics`: real task and focus statistics, weekly chart
- `/settings`: update display name and dark/light appearance
- Responsive navigation, mobile bottom tabs, Ctrl+K search, deadline notifications, and dark futuristic visual design

No fake progress or seeded tasks: a new account starts with empty lists and zero statistics.

## Step 0 — Confirm your current project

Your existing folder is:

`C:\ALL  VSC Project\personal web\orvyn-app`

Open that folder in VS Code. Your existing signup/login must already work. Your `.env.local` must be inside **orvyn-app**, at the same level as `package.json`, with the real Supabase **publishable** key (`sb_publishable_...`), NEVER a secret key (`sb_secret_...`). Keep `.env.local` private.

**Important:** If a secret key was previously put in a public environment variable or browser, revoke/rotate it in Supabase API Keys.

## Step 1 — Stop the website

In the terminal that is running `npm.cmd run dev`, press `Ctrl+C`. Do not start a second Next.js server while one is running. Use `Terminal > New Terminal` for other commands.

## Step 2 — Back up the starter homepage and demo page

Open a PowerShell terminal **inside the correct `orvyn-app` folder** and run:

```powershell
cd "C:\ALL  VSC Project\personal web\orvyn-app"
Copy-Item .\app\page.tsx .\app\page.tsx.before-orvyn -ErrorAction SilentlyContinue
Copy-Item .\app\protected\page.tsx .\app\protected\page.tsx.before-orvyn -ErrorAction SilentlyContinue
```

Those backups let you restore the original starter homepage and `/protected` page if needed.

## Step 3 — Copy the ZIP files into your existing project

1. Right-click `ORVYN_Dashboard_Starter_Addon.zip` and choose **Extract All**.
2. Open the **extracted folder**. You should see `app`, `components`, `lib`, `supabase`, and this instruction file.
3. Select **all** of those items and copy them into `C:\ALL  VSC Project\personal web\orvyn-app`.
4. When Windows asks to **merge folders**, choose Yes.
5. When asked to **replace** `app\page.tsx` and `app\protected\page.tsx`, choose Replace. Those two demo pages are intentionally upgraded.
6. Do **not** copy an extra nested `orvyn-app` directory into the project. `app` must remain directly under `orvyn-app`.

Your project should now contain:

```text
orvyn-app/
  app/
    page.tsx                   <-- ORVYN redirect (replaces starter landing)
    protected/page.tsx         <-- ORVYN redirect (replaces starter demo page)
    (orvyn)/layout.tsx
    (orvyn)/orvyn.css
    (orvyn)/dashboard/page.tsx
    (orvyn)/tasks/page.tsx
    (orvyn)/calendar/page.tsx
    (orvyn)/projects/page.tsx
    (orvyn)/goals/page.tsx
    (orvyn)/focus/page.tsx
    (orvyn)/notes/page.tsx
    (orvyn)/analytics/page.tsx
    (orvyn)/settings/page.tsx
    auth/...                    <-- kept from your starter
  components/orvyn/
    pages.tsx
    shell.tsx
    task-dialog.tsx
  lib/
    supabase/...                <-- kept from your starter
    orvyn/
      data-context.tsx
      types.ts
      utils.ts
  supabase/migrations/20261114_000001_initial.sql
  .env.local                    <-- kept from your starter
  package.json                  <-- kept from your starter
```

The `(orvyn)` folder is a Next.js *route group*: it does **not** appear in the browser URL. `/dashboard` and `/tasks` are the correct paths.

## Step 4 — Install the extra UI dependency

In the same PowerShell terminal:

```powershell
cd "C:\ALL  VSC Project\personal web\orvyn-app"
npm.cmd install lucide-react
```

The existing Next.js/Supabase starter already has React, Tailwind, `@supabase/supabase-js`, and `@supabase/ssr`. The add-on uses them as installed, preserving your working authentication.

## Step 5 — Create the ORVYN tables in Supabase

**Do this on a development/test project first if your Supabase project holds important data or is in a production environment.** The migration creates tables and policies. Do not run it twice or against a project where these table names already exist. Keep a database backup before changing an existing populated schema.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your ORVYN project.
2. Select **SQL Editor** (left sidebar) and click **New query**.
3. In VS Code, open `supabase/migrations/20261114_000001_initial.sql`.
4. Copy **the entire SQL file** into the Supabase SQL Editor.
5. Review the SQL and click **Run**.
6. Open **Table Editor** and confirm that `public.tasks`, `public.projects`, `public.goals`, `public.milestones`, `public.notes`, `public.calendar_events`, `public.focus_sessions`, and `public.profiles` exist.
7. This migration includes RLS policies for each user and a **backfill for existing users**, including accounts created before the tables existed. It does not change or delete your account.

**Avoid pasting the tiny `create table notes ...` sample shown by the old Supabase starter.** The full ORVYN SQL already defines its own `notes` table.

**If your database already contains the 15 tables from the earlier ORVYN architecture migration**, do not run this full migration again. You only need the one-time missing-profile backfill (consult the SQL section near the `on_auth_user_created` trigger).

## Step 6 — Start the website

```powershell
cd "C:\ALL  VSC Project\personal web\orvyn-app"
npm.cmd run dev
```

Keep this terminal open. Go to:

- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- [http://localhost:3000/tasks](http://localhost:3000/tasks)

If port 3000 is occupied by an existing Next.js server, stop that server in its terminal instead of starting duplicates.

You will be prompted to log in if you are not already authenticated. Your existing `/auth/login` and `/auth/sign-up` routes remain unchanged. The old `/protected` route now redirects to `/dashboard`.

## Step 7 — Verify database persistence

1. Sign in with your confirmed ORVYN account.
2. Open **Tasks**, create a task, refresh the browser, and verify it remains.
3. Mark the task completed and open **Dashboard**; the completion statistic should update.
4. Create a **Project**, then add a new task linked to that project.
5. Create a **Goal** with a **Milestone**, then mark the milestone done.
6. Create a **Note** and save it.
7. Try **Calendar** and **Focus Station**; manually save a focus session so it appears in Analytics.
8. Open the site at a narrow browser width and confirm the bottom navigation works.

## Troubleshooting

| Message | Explanation / fix |
|---|---|
| `relation public.tasks does not exist` / `Could not find table` | The SQL migration hasn't been applied to the **same** Supabase project your `.env.local` connects to. |
| `permission denied` / RLS error | Ensure your account is logged in, the full SQL ran successfully, and `profiles` includes your authenticated user ID. Don't disable RLS to make it work. |
| `Cannot find module 'lucide-react'` | Run `npm.cmd install lucide-react` from the `orvyn-app` folder. |
| `Cannot find module '@/lib/supabase/server'` | Check you are using the existing **with-supabase** starter and that `lib/supabase/server.ts` still exists. |
| Blank ORVYN page or stale layout | Stop the dev server, re-run `npm.cmd run dev`, then press `Ctrl+Shift+R` in Chrome. |
| `Forbidden use of secret API key in browser` | Replace the `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` value with your **publishable** key, revoke exposed secret keys, restart Next.js. |
| `Another next dev server is already running` | Use the existing dev server or stop it in its original terminal before restarting. |
| `Failed to fetch` | Check the browser Network tab, the Supabase Project URL/key in `.env.local`, and the project's health. |
| `fastfetch config.jsonc missing` | Separate PowerShell startup issue; not caused by ORVYN. |

## What was deliberately NOT implemented

- AI assistant/provider API, intelligent automatic rescheduling, push/email reminders, recurring background automations, file attachments, OAuth providers, production-grade audit logs, payments, and multi-user collaboration.
- Event drag-and-drop, calendar sync with third parties, and automated background saving of unfinished focus sessions.
- Full e2e/integration tests against your real Supabase project (no access to your local starter files or database here).

This is a substantial working **authenticated ORVYN dashboard starter**, not a deployed or fully production-tested service. For future production rollout, add policy tests, proper monitoring, database backups, and accessibility audits. No real API keys or passwords are included in this ZIP.

## Testing before deployment

```powershell
cd "C:\ALL  VSC Project\personal web\orvyn-app"
npm.cmd run build
```

Fix any build errors in your local project before deploying. Then test in a separate staging environment and add your environment variables in Vercel (never commit `.env.local`).
