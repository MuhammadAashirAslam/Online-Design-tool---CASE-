# Supabase Setup Guide for ODT

Step-by-step instructions to connect ODT to Supabase for real database persistence.

---

## Step 1: Create a Supabase Project

1. Go to **[supabase.com](https://supabase.com)** and sign up / sign in
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `odt` (or anything you like)
   - **Database password**: Pick a strong password (save it somewhere)
   - **Region**: Choose the closest to you
4. Click **"Create new project"** — wait 1-2 minutes for it to set up

---

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **⚙️ Settings → API** (left sidebar)
2. You'll see two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long `eyJ...` string
3. Copy both

---

## Step 3: Update Your `.env` File

Open `e:\Semester 4\CEP-SDA\.env` and replace the placeholder values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...YOUR_FULL_KEY
```

> [!IMPORTANT]
> After updating `.env`, restart the dev server (`npm run dev`) for changes to take effect.

---

## Step 4: Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor** (left sidebar, database icon)
2. Click **"New query"**
3. Open the file `e:\Semester 4\CEP-SDA\supabase\schema.sql`
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see `Success. No rows returned` — that means all 8 tables were created

---

## Step 5: Enable Email Auth

1. Go to **Authentication → Providers** in Supabase dashboard
2. Make sure **Email** provider is enabled (it should be by default)
3. Optional: Under **Authentication → Settings**, you can:
   - Disable "Confirm email" to skip email verification during development
   - This makes signup instant instead of requiring email confirmation

---

## Step 6: Verify Tables Were Created

1. Go to **Table Editor** in Supabase dashboard
2. You should see these 8 tables:
   - `users`
   - `projects`
   - `project_members`
   - `diagrams`
   - `elements`
   - `connectors`
   - `exports`
   - `validation_logs`

---

## Step 7: Switch ODT to Supabase Mode

> [!NOTE]
> Right now, ODT uses **localStorage** for all data. To use Supabase instead, you would need to update `useAuth.tsx`, `Dashboard.tsx`, and `Editor.tsx` to call Supabase instead of localStorage. Let me know when you're ready and I'll make the switch!

---

## Quick Reference

| What | Where in Supabase |
|---|---|
| API URL + Keys | Settings → API |
| SQL Editor | SQL Editor (left sidebar) |
| View tables | Table Editor |
| User accounts | Authentication → Users |
| RLS Policies | Authentication → Policies |
| Logs | Logs (left sidebar) |
