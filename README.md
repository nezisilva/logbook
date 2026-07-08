# Logbook

A personal life-tracking PWA: Travel, Books, TV & Movies, Concerts, and a Home dashboard. Single-user, built on Next.js + Supabase, deployed on Vercel.

## Local development

```
npm install
npm run icons      # regenerate PWA icons (no image dependencies)
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the Supabase values. Without them the app runs in preview mode (no login, no data).

## One-time setup

### Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Authentication → Sign In / Up**, keep Email enabled and **disable "Allow new users to sign up"** — this app is single-account.
3. In **Authentication → Users**, click **Add user** and create your account (email + password).
4. Copy the Project URL and anon/public key from **Project Settings → API** into `.env.local`.

### GitHub → Vercel

1. Create a GitHub repo named `logbook` and push this folder to it.
2. At [vercel.com](https://vercel.com), **Add New → Project**, import the repo (framework auto-detects as Next.js).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel project settings.
4. Every push to `main` now deploys automatically.

### Install on your phone

Open the deployed URL in Safari (iOS) or Chrome (Android) → Share → **Add to Home Screen**. It opens standalone, full-screen.

## Notes

- The service worker caches only the app shell and hashed build assets, never data. Bump `VERSION` in `public/sw.js` to force-refresh clients.
- Every data table carries an `owner_id` so multi-user can be added later without a migration rewrite.
- Data export/import lives in the app (JSON), plus Goodreads CSV import in Books — your data stays yours.
