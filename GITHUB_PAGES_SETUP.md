# ForgeLab - GitHub Pages setup

This repository can be served as a static GitHub Pages site from the root of `main`.

## GitHub Pages

1. Open the repository settings on GitHub.
2. Go to Pages.
3. Under Build and deployment, choose Deploy from a branch.
4. Branch: `main`.
5. Folder: `/root`.
6. Save.

## Custom domain

Use `forgelab.mybranford.com` as the custom domain if you host through GitHub Pages. If ForgeLab is hosted through Sites instead, use the DNS records returned by the Sites custom-domain setup.

## Notes

- ForgeLab is static: HTML, CSS, JS, manifest, service worker, and icons.
- Workout data is stored in the browser's local storage.
- Use Export before clearing browser data, changing phones, or making major edits.
- The `.nojekyll` file tells GitHub Pages to serve the static files directly.
