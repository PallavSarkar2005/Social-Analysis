# Security Documentation

> Based on: `backend/server.js`, `middleware/*`, `services/tokenService.js`, `services/csrfService.js`, `services/cookieService.js`, `utils/jwt.js`, auth controllers.

---

## Current Implementation

### JWT (Access Tokens)

| Property | Value |
|----------|-------|
| Library | `jsonwebtoken` |
| Payload | `{ id: userId }` |
| Expiry | **15 minutes** (`ACCESS_TOKEN_EXPIRY = "15m"`) |
| Secret | `JWT_SECRET` (required, **min 32 characters**) |
| Delivery | JSON body field `token`; also accepted from cookie `socialiq_access_token` |
| Client storage | **In-memory only** (`frontend/src/api/authToken.js`) — not localStorage |

### Refresh Tokens

| Property | Value |
|----------|-------|
| Format | Opaque secure random (40 bytes) |
| Storage | SHA-256 hash in `Session.tokenHash` |
| Cookie | `socialiq_refresh_token` **HttpOnly** |
| Lifetime | 7 days default; 30 days if `rememberMe` |
| Rotation | Old session revoked; new token issued on `/api/auth/refresh` |
| Limits | `enforceSessionLimit` revokes oldest sessions when over cap |

### CSRF

- Double-submit style with **server-side** `CsrfSession` (or memory fallback)
- Cookie: CSRF cookie name from `csrfService` (`XSRF-TOKEN` pattern)
- Client header: `X-XSRF-TOKEN` or `X-CSRF-TOKEN`
- Safe methods (GET/HEAD/OPTIONS) skipped
- Exempt: `POST /api/billing/webhook` (HMAC signature verified instead)
- Dev option: `CSRF_MEMORY_ONLY=true`

### Rate Limiting (`express-rate-limit`)

| Limiter | Window | Max | Scope |
|---------|--------|-----|-------|
| apiLimiter | 15m | 1000 | `/api/*` |
| strictLimiter | 15m | 250 | analyzer, compare, AI, reports, settings, users, profile, … |
| authLimiter | 15m | 30 | `/api/auth` |
| reportShareLimiter | 15m | 40 | share/revoke |
| publicShareViewLimiter | 15m | 120 | public shared views |
| reportRegenerateLimiter | 15m | 10 | regenerate |

Skipped when `NODE_ENV=test`.

### Helmet

Configured in `server.js` with CSP, HSTS (1y, includeSubDomains, preload), `X-Frame-Options: DENY`, nosniff, referrer-policy.

### CORS

Whitelist includes production Vercel origin `https://social-analysis-smoky.vercel.app` and localhost/LAN origins in development. `credentials: true`. Allowed headers include Authorization and CSRF headers.

### Password Hashing

- `bcryptjs` for password hashes
- Validation via `express-validator`: min 8 chars, upper/lower/number/symbol; common-password blocklist
- Password history field on User; change-password flows revoke other sessions

### Cookie Security

Helpers in `utils/cookies.js` / `cookieService.js`:

- Refresh: HttpOnly, Secure in production, SameSite configured via helper
- CSRF cookie: readable by JS (required for header), Secure in production

### Session Management

- Device metadata (IP, UA, browser, OS)
- List/revoke sessions via `/api/users/sessions`
- Logout / logout-all / logout-other endpoints
- TTL auto-expiry on `Session.expiresAt`

### Authorization

- `protect` middleware for authenticated routes
- `optionalAuth` for public appearance settings
- `checkPlanLimits` for AI/reports/PDF/creators
- `requireAdmin` / `requireRole` available
- Ownership checks in controllers (userId scoping)

### Validation & Sanitization

- `express-validator` route validators (`validationMiddleware.js`)
- `mongoSanitizeMiddleware` — strips NoSQL operators
- `xssSanitizer` — recursive XSS cleaning (URL fields treated carefully)
- JSON body limit **10KB**

### Login Hardening

- `LoginAttempt` model: lockout after repeated failures (5 attempts / lockout window)
- Security events via `utils/securityLogger.js`

### Secrets Management (Current)

- Secrets loaded from environment (`.env` / host env)
- Validated at boot in `config/env.js`
- **No** Vault/AWS Secrets Manager integration in-repo
- Frontend only exposes `VITE_*` public vars

### Payment Security

- Razorpay payment signature HMAC with `crypto.timingSafeEqual`
- Webhook signature verification + `WebhookEvent` idempotency

### OWASP-Aligned Controls Present

| OWASP area | Control |
|------------|---------|
| Injection | mongo-sanitize, validators |
| XSS | xss sanitizer, Helmet CSP |
| Broken auth | short JWT, hashed refresh, rotation, lockout |
| CSRF | CSRF middleware |
| Security misconfig | Helmet, CORS whitelist, payload limits |
| Rate abuse | multiple limiters |
| Sensitive data | HttpOnly refresh, in-memory access token |

---

## Missing / Recommended Production Hardening

> These are **not** fully implemented today.

1. **Dedicated health/ready endpoints** with auth-free DB checks for orchestrators  
2. **Redis-backed** rate limiting & session/CSRF store for multi-instance deploys  
3. **Secret scanning in CI** (Gitleaks) and dependency scanning (npm audit / Snyk) — workflows added under `.github/workflows/`  
4. **WAF / edge bot protection** in front of API  
5. **2FA**: `securityPreferences.twoFactorEnabled` exists in schema/UI prefs but full TOTP challenge flow should be verified before claiming production MFA  
6. **Centralized SIEM** shipping of `securityLogger` events  
7. **CSP** still allows `'unsafe-inline'` / `'unsafe-eval'` in parts of Helmet config — tighten for production HTML if API ever serves pages  
8. **mTLS** or private networking between frontend CDN and API  
9. **PII retention & DSAR automation** beyond manual data export endpoints  
10. **Regular penetration tests** and dependency update SLAs  

See also [SECURITY.md](../SECURITY.md) for vulnerability reporting.
