# Quick Links

A fast, simple short-link generator built for SEO backlink tracking. Create clean short links, count clicks, and export a sitemap for indexing.

## Stack

- [TanStack Start](https://tanstack.com/start)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (database & auth)

## Local development

1. Clone the repository:

   ```sh
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:

   ```sh
   bun install
   # or: npm install
   ```

3. Copy the environment file and fill in your Supabase credentials:

   ```sh
   cp .env.example .env
   ```

4. Run the dev server:

   ```sh
   bun run dev
   # or: npm run dev
   ```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. In **Project Settings → Environment Variables**, add the variables from `.env.example`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SITE_URL` (set to your custom domain, e.g. `https://example.com`)
4. Deploy. Vercel will use the `vercel` Nitro preset automatically.

## Connect a custom domain

1. In Vercel, go to **Project Settings → Domains** and add your domain.
2. Update the `VITE_SITE_URL` environment variable to your full custom domain (e.g. `https://www.example.com`).
3. Redeploy so generated short links and the sitemap point to your custom domain.

## Useful routes

- `/` — Dashboard for creating and managing short links
- `/<code>` — Redirects to the destination URL and increments the click count
- `/sitemap.xml` — Dynamic XML sitemap of all active short links
