# Production deploy checklist (Railway + Clerk + OpenAI)

## Accounts to create
1. Railway — https://railway.app (or Render/Fly)
2. Clerk — https://dashboard.clerk.com (Hobby free)
3. OpenAI — https://platform.openai.com (optional for draft week)

## Clerk setup
1. Create an application
2. Enable Email + Google (recommended)
3. Copy **Publishable key** → `VITE_CLERK_PUBLISHABLE_KEY`
4. Copy **Secret key** → `CLERK_SECRET_KEY`
5. In Clerk → Paths: set Sign-in `/sign-in`, Sign-up `/sign-up`
6. After you have a production URL, add it under Allowed origins / redirect URLs

## Railway setup
1. New project → Deploy from this GitHub repo
2. Add a **MySQL** plugin/service in the same project
3. Add a web service from the repo (Nixpacks or Dockerfile)
4. Set variables from `.env.example` (at minimum: `DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `JWT_SECRET`, `OPENAI_API_KEY`)
5. Important: `VITE_*` vars must be present at **build** time on Railway
6. Run migrations once: `pnpm db:push` (Railway shell / one-off) against `DATABASE_URL`
7. Health check: `GET /api/health` should return `{ status: "ok", db: "connected" }`

## Local smoke test
```bash
pnpm install
cp .env.example .env   # fill real values
pnpm db:push
pnpm dev
# open http://localhost:3000 → Sign In → Add League → Sync
```

## First ESPN sync on production
1. Sign in
2. Add League → ESPN League ID + private cookies (`espn_s2`, `SWID`)
3. Sync All Seasons
4. Later refreshes: League page → **Sync Data**

## Stack
- Auth: Clerk
- AI: OpenAI API
- Host: Railway (or any Node host) + Docker
- DB: your MySQL instance
