# ForgeLab - Account-Based iPhone PWA

ForgeLab is an iPhone-first progressive web app for a 12-week BLS-style cut program, with secure Supabase accounts and per-user cloud sync.

## What is included

- 12-week workout plan preloaded
- Today screen with auto-scheduled week/day
- Set-by-set workout logging
- Weight, reps, RPE, volume, estimated 1RM
- Knee pain guardrails
- Body weight, waist, knee pain, calories, protein, sleep tracking
- Cardio and steps tracking
- Progress charts and weekly summaries
- JSON backup/import and workout CSV export
- Email/password accounts with password recovery
- Per-user cloud sync backed by Supabase Row Level Security
- Offline support when hosted over HTTPS

## How to test locally

Serve the app locally so authentication callbacks, service workers, and module requests use an HTTP origin:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## How to use on iPhone

1. Open `https://forgelab.mybranford.com` in Safari on your iPhone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Open it from the new Home Screen icon.

## Supabase

The browser uses the project publishable key from `supabase-config.js`. Never put a Supabase secret or service-role key in this repository.

Database changes are versioned in `supabase/migrations`. The `forgelab_user_state` table stores one state document per user and enforces ownership with Row Level Security.

In Supabase Dashboard -> Authentication -> URL Configuration, set:

- Site URL: `https://forgelab.mybranford.com`
- Redirect URL: `https://forgelab.mybranford.com/`

Email/password sign-up should remain enabled. ForgeLab expects email confirmation before first sign-in.

## Hosting

ForgeLab is published from the `main` branch with GitHub Pages and uses
`forgelab.mybranford.com` as its custom domain. See `GITHUB_PAGES_SETUP.md`
for the repository and DNS settings.

## Privacy

Each signed-in user can access only their own row through Supabase Row Level Security. ForgeLab also keeps a user-scoped device cache for fast saves and brief offline use. Signing out removes the cache after a successful sync. JSON export remains available for a portable personal backup.
