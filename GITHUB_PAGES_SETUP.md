# ForgeLab - GitHub Pages hosting

ForgeLab is served only through GitHub Pages from the root of `main`.

## GitHub Pages

1. Open the repository settings on GitHub.
2. Go to Pages.
3. Under Build and deployment, choose Deploy from a branch.
4. Branch: `main`.
5. Folder: `/root`.
6. Save.

## Custom domain

The custom domain is `forgelab.mybranford.com`.

Add this DNS record at the DNS provider for `mybranford.com`:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `forgelab` | `degrasse-mastermind.github.io` |

Do not use `custom-domains.chatgpt.site` or the old Sites validation TXT records.

## Notes

- The ForgeLab client is static: HTML, CSS, JS, manifest, service worker, and icons.
- Authentication and per-user data sync use the connected Supabase project.
- A user-scoped device cache supports fast saves and brief offline use.
- Use Export when you want a portable backup outside ForgeLab.
- The `.nojekyll` file tells GitHub Pages to serve the static files directly.
