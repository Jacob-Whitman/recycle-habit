# How to Migrate from Lovable to GitHub Pages (Database Stays Intact)

Your app uses **Supabase** for the database. Supabase is separate from Lovable—Lovable only connects to it. When you move the frontend to GitHub Pages, you keep using the **same Supabase project** (same URL and anon key). No database migration or data export is required; the database stays exactly where it is.

---

## 1. Prerequisites

- This repo (or the `recycle-habit` app) pushed to a **GitHub repository**.
- Your Supabase project URL and anon (publishable) key from your current `.env` (or from [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API).

---

## 2. Configure the app for GitHub Pages

GitHub Pages serves project sites at `https://<username>.github.io/<repo-name>/`, so the app must use that path as its base.

**Edit `vite.config.ts`** and set `base` to your repo name (with leading and trailing slashes):

```ts
export default defineConfig(({ mode }) => ({
  base: '/recycle-habit/',   // matches https://jacob-whitman.github.io/recycle-habit/
  server: {
    // ... rest unchanged
  },
  // ...
}));
```

---

## 3. Add GitHub Secrets for Supabase

The build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at build time (Vite inlines them). Do **not** commit `.env` to the repo. Use GitHub Secrets:

1. On GitHub: repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret** for each:
   - `VITE_SUPABASE_URL` = your Supabase URL (e.g. `https://xxxx.supabase.co`).
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase anon/public key.

Use the same values you use in Lovable (or from your local `.env`) so the app keeps talking to the same database.

---

## 4. Add a GitHub Actions workflow to build and deploy

Create the workflow file:

**.github/workflows/deploy-pages.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: recycle-habit/package-lock.json

      - name: Install and build
        working-directory: recycle-habit
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
        run: |
          npm ci
          npm run build

      - name: Fix SPA routing (404 → index)
        working-directory: recycle-habit/dist
        run: cp index.html 404.html

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: recycle-habit/dist
```

**If your app lives at the repo root** (not in `recycle-habit/`), change:

- `cache-dependency-path` to `package-lock.json`
- Remove or set `working-directory: recycle-habit` only for the steps that need it
- Use `path: dist` in the upload step and run `cp index.html 404.html` from `dist` (no `recycle-habit` in the path).

The `cp index.html 404.html` step makes sure refreshes on routes like `/log` or `/stats` still load your SPA instead of GitHub’s 404 page.

---

## 5. Enable GitHub Pages

1. Repo → **Settings** → **Pages**.
2. Under **Build and deployment**:
   - **Source**: GitHub Actions.
3. Save. After the next push to `main`, the workflow will run and deploy.

The workflow’s deploy job uses the **github-pages** environment (repo **Settings** → **Environments**). GitHub creates this environment automatically when you use GitHub Actions for Pages; it’s separate from branch-based environments.

Your site will be at:  
`https://jacob-whitman.github.io/recycle-habit/`

---

## 6. Summary: Why the database stays intact

| What | Where it lives | What you do |
|------|----------------|-------------|
| **Frontend** | Lovable → GitHub Pages | Build and deploy with the workflow above; same code, different host. |
| **Database** | Supabase (unchanged) | Keep using the same Supabase project. Same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in GitHub Secrets. |
| **Auth & data** | Supabase | No change. Users and data stay in your existing Supabase project. |

You are only changing where the **static site** is served; the app still connects to the same Supabase backend, so the database remains intact.