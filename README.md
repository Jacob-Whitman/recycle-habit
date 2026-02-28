# Recycle with Bandit

Log your recycling habits, track your impact, and compete with friends!

**Live site:** https://jacob-whitman.github.io/recycle-habit/

## Run locally

```sh
git clone https://github.com/Jacob-Whitman/recycle-habit.git
cd recycle-habit
npm i
```

Create a `.env` with your Supabase credentials (see [HOW-TO-GITHUB-PAGES.md](HOW-TO-GITHUB-PAGES.md) for details):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Then:

```sh
npm run dev
```

## Deploy

The app deploys to GitHub Pages via GitHub Actions on push to `main`. See [HOW-TO-GITHUB-PAGES.md](HOW-TO-GITHUB-PAGES.md) for setup.

## Stack

- Vite, TypeScript, React
- shadcn-ui, Tailwind CSS
- Supabase (auth + database)
