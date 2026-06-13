# BLS Cut Tracker — Private iPhone PWA

This is a self-contained progressive web app for your 12-week BLS-style cut program.

## What is included

- 12-week workout plan preloaded
- Today screen with auto-scheduled week/day
- Set-by-set workout logging
- Weight, reps, RPE, volume, estimated 1RM
- Knee pain notes and guardrails
- Body weight, waist, calories, protein, sleep tracking
- Cardio and steps tracking
- Progress charts and weekly summaries
- JSON backup/import and workout CSV export
- Offline support when hosted over HTTPS

## How to test locally

Open `index.html` in your browser to test the app. Most features will work immediately.

For service-worker/offline testing, serve it locally:

```bash
cd bls_cut_tracker_app
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## How to use on iPhone

1. Upload this folder to any HTTPS static host.
2. Open the hosted URL in Safari on your iPhone.
3. Tap Share.
4. Tap Add to Home Screen.
5. Open it from the new Home Screen icon.

## Privacy

There is no backend. Your logs are stored locally in the browser on your iPhone. Use Settings → Export JSON Backup regularly.
