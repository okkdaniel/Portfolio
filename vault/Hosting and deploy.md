---
tags: [hosting]
updated: 2026-10-05
---

# Hosting and deploy

See [[Rules]] first.

- **Repo**: github.com/okkdaniel/Portfolio. Branches: `redesign` (live art site), `main` (old site, untouched, tag `v1-original`).
- **Vercel** project `portfolio` (team `okkdaniel11`, id `prj_mvxRePqOYec5cjAXQnIZ6wPoHtI7`), built with Vite. **Production branch: `redesign`** (switched from `main` on 2026-10-01). Every push to `redesign` deploys to production.
- **Old site**: Vercel project `portfolio-classic` (production branch `main`), served at **old.danielkaliko.com**. Linked from the About fold.
- **DNS**: Cloudflare (nameservers harlan / meiling.ns.cloudflare.com). `www` is a CNAME to `5876a34011ec5c3a.vercel-dns-017.com`; the apex redirects to www. `old` is a CNAME to the same target, DNS only.
- **Rollback**: switch Vercel's production branch back to `main` in the dashboard (Settings → Environments → Production → Branch Tracking). The Vercel API available to Claude can't change this setting.
- **Checking a deploy**: the Vercel connector's `list_deployments` (project id above, slug `okkdaniel11`) shows QUEUED/BUILDING/READY; or poll the live CSS/JS bundle for a string unique to the new version. Builds take ~30–60s.
