# Contributing to SocialIQ

Thanks for contributing. This guide matches how the repository is actually structured (sibling `frontend/` and `backend/` packages).

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `staging` | Pre-production validation |
| `development` | Integration branch for ongoing work |
| `feature/<short-name>` | Features |
| `fix/<short-name>` | Bug fixes |
| `chore/<short-name>` | Tooling, docs, deps |

1. Fork or create a branch from `development` (or `main` if that is the default integration branch for your team).  
2. Keep PRs focused and small.  
3. Delete feature branches after merge.

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(analyzer): cache youtube channel summaries
fix(auth): rotate refresh token on reuse detection
docs(api): document billing webhook headers
chore(ci): add gitleaks workflow
test(reports): cover share token expiry
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`.

## Pull Request Process

1. Ensure CI is green (lint, tests, build).  
2. Update docs if you change env vars, APIs, or architecture.  
3. Do **not** commit `.env`, keys, or real credentials.  
4. Fill the PR template summary + test plan.  
5. Request review; address feedback.  
6. Squash or rebase per maintainer preference; avoid force-push to shared branches.

## Code Style

- **JavaScript ESM** only (no TypeScript requirement today).  
- Backend: controllers thin; business logic in `services/`; validate inputs with existing middleware.  
- Frontend: React function components; prefer React Query hooks in `hooks/useQueries.js` for server state.  
- Match existing ESLint configs (`backend/eslint.config.js`, `frontend/eslint.config.js`).  
- Do not store access tokens in `localStorage`.  
- Avoid drive-by refactors unrelated to the PR.

## Review Process

Reviewers check:

- Correctness vs existing patterns  
- AuthZ (userId scoping, plan limits)  
- Security (CSRF, secrets, injection)  
- Test coverage for non-trivial logic  
- Docs updates when contracts change  

## Testing Requirements

**Backend (required for API changes):**

```bash
cd backend && npm run lint && npm test
```

**Frontend (required for UI changes):**

```bash
cd frontend && npm run lint && npm run build
npx vitest run
```

Add or update tests under `backend/tests/` or `frontend/src/tests/` when fixing bugs or adding endpoints.

## Local Setup

See [docs/Development.md](docs/Development.md).

## Security Issues

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
