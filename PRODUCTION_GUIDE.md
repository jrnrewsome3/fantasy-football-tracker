# Production Readiness Guide: Vibe-Coded App to Scalable for 1000 Users

> **Project:** fantasy-football-tracker  
> **Stack:** React 19, Express 4, tRPC 11, Drizzle ORM, MySQL/TiDB, Node 22, pnpm  
> **Author:** @jrnrewsome3  
> **Created:** 2026-05-21

---

## What is the "Last 15%"?

Vibe coding gets you 85% of the way there fast. The final 15% is not about features. It is about making those features survive real users, real traffic, and real failures without you watching over it 24/7.

The 15% breaks down into these six pillars:

| # | Pillar | Issue |
|---|--------|-------|
| 1 | CI/CD Pipeline | PROD-1 |
| 2 | Branch Protection & PR Workflow | PROD-2 |
| 3 | Error Handling & Structured Logging | PROD-3 |
| 4 | API Security & Rate Limiting | PROD-4 |
| 5 | Database Performance for Scale | PROD-5 |
| 6 | Versioned Release & Environment Config | PROD-6 |

---

## Lessons Learned (From This Session)

### Lesson 1: Your repo already had the right structure
Manus scaffold gave you `client/`, `server/`, `shared/`, and `drizzle/` — a monorepo pattern that scales well. You did not need to restructure anything. The 15% is hardening, not rebuilding.

### Lesson 2: GitHub Desktop is your sync tool, browser is your workflow tool
- **GitHub Desktop** = pulls, commits, pushes, branch switching. Use it every time you make local code changes.
- **GitHub browser** = Issues, PRs, Actions, Settings, code review. This is where you manage the process.
- You need both. Neither replaces the other.

### Lesson 3: A CI pipeline is insurance, not overhead
The `.github/workflows/ci.yml` we created runs TypeScript checks, Vitest tests, and a production build on every single push. That 60 lines of YAML will save you hours of debugging a broken deploy.

### Lesson 4: Issues are your memory
Without Issues, production work becomes invisible. Each PROD-1 through PROD-6 issue is a named, tracked, documented task. When you look back in 6 months, you will know exactly what was done and why.

### Lesson 5: GitHub Desktop shows you what changed BEFORE you commit
Always look at the diff in GitHub Desktop before writing your commit message. The changed files panel on the left and the diff on the right show exactly what you are about to permanently record.

### Lesson 6: Commit messages are for future you
Bad: `fix stuff`  
Good: `fix: prevent ESPN API from being called on every page load (PROD-5)`  
The good format is called Conventional Commits: `type: description (issue reference)`.

---

## Tutorial Module: The Last 15% — Step by Step

### STEP 1: Set Up GitHub Actions CI (Done ✔)

**What you did:**
1. Created `.github/workflows/ci.yml` via GitHub browser editor
2. Configured it to run on push to `main` and on all pull requests
3. It runs: TypeScript check > Vitest tests > Production build
4. Committed directly to main with a conventional commit message
5. Verified the Action appeared immediately in the Actions tab

**Key concept - GitHub Actions triggers:**
```yaml
on:
  push:
    branches: [main]      # Runs when you push to main
  pull_request:
    branches: [main]      # Runs when anyone opens a PR targeting main
```

**What to watch for:** Go to Actions tab after any commit. A yellow dot = running. Green check = passed. Red X = failed — click it to see which step failed and read the log.

---

### STEP 2: Set Up Branch Protection (In Progress)

**What to do:**
1. Go to Settings > Rules > Rulesets > New branch ruleset
2. Name it: `Protect main branch`
3. Under Target branches: click Add target > Include default branch
4. Enable: `Require a pull request before merging`
5. Enable: `Block force pushes`
6. Enable: `Automatically request Copilot code review`
7. Click Create (requires passkey/password confirmation)

**Why it matters:**  
Once this is set, you can NEVER accidentally `git push` broken code directly to main. Every change must go through a PR. GitHub Copilot will automatically review each PR.

**New workflow after this:**
```
In GitHub Desktop:
1. Branch > New Branch > name it "feat/error-handling"
2. Make code changes in VS Code
3. GitHub Desktop shows changed files
4. Write commit message, click Commit
5. Click Push origin
6. Click Create Pull Request (opens browser)
7. Wait for CI green check + Copilot review
8. Merge PR
```

---

### STEP 3: Add Global Error Handling (Code Work)

**Where to edit:** `server/_core/index.ts`  
**What to add:** Global Express error middleware at the BOTTOM of all route registrations.

```typescript
// Add this AFTER all your routes, BEFORE app.listen
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the full error server-side (never expose to client)
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });

  // Return safe generic error to client
  res.status(500).json({
    error: 'Something went wrong',
    code: 'INTERNAL_ERROR'
  });
});
```

**React Error Boundary** — add this to `client/src/App.tsx`:
```tsx
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-center"><h2>Something went wrong.</h2><button onClick={() => this.setState({hasError: false})}>Try again</button></div>;
    }
    return this.props.children;
  }
}
// Wrap your Router with: <ErrorBoundary><Router>...</Router></ErrorBoundary>
```

---

### STEP 4: Add Rate Limiting & Security Headers (Code Work)

**Install packages:**
```bash
pnpm add helmet express-rate-limit
pnpm add -D @types/express-rate-limit
```

**Add to `server/_core/index.ts` near the top:**
```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet());

// General rate limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
});
app.use(generalLimiter);

// Stricter limit on auth routes: 10 per minute
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts', code: 'AUTH_RATE_LIMITED' }
});
app.use('/api/auth', authLimiter);
```

---

### STEP 5: Database Performance for Scale (Code Work)

**Add a health check endpoint:**
```typescript
// In server/_core/index.ts
app.get('/api/health', async (req, res) => {
  try {
    await db.execute('SELECT 1'); // Test DB connection
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
```

**Cache ESPN API calls** — add this pattern to any ESPN service file:
```typescript
const cache = new Map<string, { data: unknown; expires: number }>();

async function getCachedESPN(key: string, fetchFn: () => Promise<unknown>, ttlMs = 5 * 60 * 1000) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expires) return cached.data;
  const data = await fetchFn();
  cache.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}
```

---

### STEP 6: Create v1.0 Release (GitHub Work)

1. Go to repo > Releases > Create a new release
2. Click "Choose a tag" > type `v1.0.0` > click "Create new tag"
3. Target: `main`
4. Title: `v1.0.0 - Production Hardening Complete`
5. Describe what's in this release (all 6 PROD issues)
6. Click Publish release

---

## GitHub Desktop Workflow Reference Card

| What you want to do | GitHub Desktop action |
|---|---|
| Get latest changes from GitHub | Click "Fetch origin" then "Pull origin" |
| Create a new feature branch | Branch > New Branch |
| Save changes to Git history | Stage files (checkboxes) + write Summary + click "Commit" |
| Upload your commits to GitHub | Click "Push origin" |
| Open a PR for your branch | Click "Create Pull Request" (opens browser) |
| Switch between branches | Click the branch name dropdown at the top |
| Undo last commit (not pushed) | History tab > right-click > Undo commit |
| See what changed | Changes tab shows files; click a file to see the diff |

---

## Production Readiness Checklist

Run through this before calling the app production-ready:

- [ ] CI pipeline runs green on main
- [ ] Branch protection prevents direct pushes to main
- [ ] All PROD issues (1-6) closed
- [ ] Global error handler returns safe error messages (no stack traces)
- [ ] Rate limiting active on all API routes
- [ ] Helmet security headers installed
- [ ] `/api/health` returns 200
- [ ] ESPN API responses are cached (not called per request)
- [ ] No secrets in source code (check `.env.example` exists)
- [ ] `pnpm db:push` runs without errors
- [ ] v1.0.0 release tagged on GitHub
- [ ] README has setup + deployment instructions

---

## Scalability Summary: Why These 6 Things Handle 1000 Users

| Problem at Scale | Our Solution |
|---|---|
| Broken deploy takes down 1000 users | CI pipeline catches errors before deploy |
| Developer pushes buggy code at 11pm | Branch protection requires PR + CI green |
| Unhandled error crashes server process | Global error middleware catches + logs |
| Bots scrape/hammer the API | Rate limiting blocks abuse |
| 1000 concurrent DB queries time out | Connection pooling + query caching |
| Can't roll back a bad deploy | Tagged v1.0.0 release gives rollback target |

---

*This guide was created in a live GitHub learning session on 2026-05-21.*  
*Each section maps to a GitHub Issue in this repo tagged [PROD-1] through [PROD-6].*
