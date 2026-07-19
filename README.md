# ForgeLab - Private iPhone PWA

This is a self-contained progressive web app for your 12-week BLS-style cut program.

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
- Offline support when hosted over HTTPS

## How to test locally

Open `index.html` in your browser to test the app. Most features will work immediately.

For service-worker/offline testing, serve it locally:

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

## Hosting

ForgeLab is published from the `main` branch with GitHub Pages and uses
`forgelab.mybranford.com` as its custom domain. See `GITHUB_PAGES_SETUP.md`
for the repository and DNS settings.

## Privacy

There is no backend. Your logs are stored locally in your browser. Use Settings -> Export JSON Backup regularly.
