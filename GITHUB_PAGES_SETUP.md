# BLS Cut Tracker — GitHub Pages Ready

This folder is ready to publish as a static GitHub Pages site.

## Fast setup

1. Create a new GitHub repository, for example:
   `bls-cut-tracker`

2. In Terminal, from this folder, run:

```bash
git init
git add .
git commit -m "Initial commit: BLS Cut Tracker PWA"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bls-cut-tracker.git
git push -u origin main
```

3. In GitHub:
   - Open the repo
   - Go to **Settings**
   - Go to **Pages**
   - Under **Build and deployment**, choose **Deploy from a branch**
   - Branch: `main`
   - Folder: `/root`
   - Save

4. After it deploys, open the GitHub Pages URL on your iPhone in Safari and use:
   **Share → Add to Home Screen**

## Notes

- The app is static: HTML, CSS, JS, manifest, service worker, and icons.
- Workout data is stored in your iPhone browser's local storage.
- Use the app's Export feature before clearing Safari website data, changing phones, or making major edits.
- The `.nojekyll` file tells GitHub Pages to serve the static files directly.
