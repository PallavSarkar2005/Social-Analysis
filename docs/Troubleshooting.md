# Troubleshooting

## Backend will not start

**Symptom:** Process exits immediately.

**Checks**

1. Missing env: `MONGO_URI`, `GROQ_API_KEY`, `JWT_SECRET`, YouTube key — see boot logs from `validateEnv()`.
2. Weak `JWT_SECRET` (< 32 chars).
3. MongoDB unreachable / wrong URI / IP not allowlisted on Atlas.

## CORS / credential errors from browser

- Frontend must use `VITE_API_URL` matching the API.
- API CORS whitelist must include the frontend origin (production list is in `server.js`).
- Ensure `withCredentials: true` and HTTPS in production for Secure cookies.

## 403 on POST/PUT/PATCH/DELETE

- CSRF token missing/expired. Call `GET /api/auth/csrf` and send `X-XSRF-TOKEN`.
- After login/logout, refresh CSRF (client already does this on auth mutations).

## 401 loops

- Refresh cookie blocked (SameSite/Secure/domain mismatch).
- Clock skew unlikely with 15m JWT but check system time.
- Session revoked — re-login.

## YouTube analyze fails

- Invalid/expired `YOUTUBE_API_KEY` or quota exceeded (`ApiUsage`).
- Bad URL — must pass `validateYoutubeUrl`.
- Enable `YT_DEBUG=1` for verbose logs.

## AI endpoints fail

- Missing/invalid `GROQ_API_KEY`.
- Set `OPENAI_API_KEY` for fallback.
- Plan limit: free tier only 3 AI requests / cycle.
- HTTP 429 from provider — retry later.

## Payments not verifying

- Mismatched Razorpay key modes (test vs live) between frontend `VITE_RAZORPAY_KEY_ID` and backend secrets.
- Webhook secret wrong; check `WebhookEvent` entries.
- CSRF does not apply to webhook — signature must validate.

## Playwright / Python postinstall failures

- Backend `postinstall` installs Chromium and Python scrapers; CI/Docker images need those system deps (Nixpacks already includes Python + Playwright install).
- On Windows, prefer WSL or Docker for scraper parity.

## Duplicate cron work

- Multiple API replicas each run `node-cron`. Run a single worker or elect a leader (recommended improvement).

## Frontend blank page after deploy

- Vercel SPA rewrite missing — ensure `frontend/vercel.json` rewrites to `index.html`.
- Wrong `VITE_API_URL` baked at build time (Vite inlines env at build).

## Tests fail locally

```bash
cd backend && npm test
```

- Ensure `NODE_ENV=test` behavior (limiters/jobs skipped).
- Use Mongo memory/test URI if tests expect DB — follow patterns in existing Jest files.
