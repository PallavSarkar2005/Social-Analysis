# API Documentation

Base URL (local): `http://localhost:5000`  
Frontend default: `VITE_API_URL`  

**Conventions**

- JSON responses typically `{ success: boolean, message?: string, data?: object }`
- Auth: `Authorization: Bearer <accessJWT>` and cookies (`withCredentials`)
- Mutations: `X-XSRF-TOKEN: <csrf>` (after `GET /api/auth/csrf`)
- Content-Type: `application/json` unless noted

**Global status codes:** `200/201` success · `400` validation · `401` unauthenticated · `403` CSRF/forbidden · `404` missing · `429` rate limit · `500` server

---

## Health

### GET `/`

| | |
|--|--|
| Auth | No |
| Purpose | Liveness message |
| Response | `{ success: true, message: "Social Analytics API Running 🚀" }` |

> No dedicated `/health` DB probe exists today.

---

## Auth — `/api/auth`

**Limiters:** `authLimiter` (30/15m) + `strictLimiter` (250/15m)

### GET `/api/auth/csrf`

| | |
|--|--|
| Purpose | Issue CSRF session cookie + token |
| Auth | No |
| Response | Token payload for `X-XSRF-TOKEN` |

### POST `/api/auth/register`

| | |
|--|--|
| Auth | No (+ CSRF) |
| Validation | `validateRegister` — name, email, strong password |
| Body | `{ name, email, password }` |
| Success | User payload + access `token`; refresh cookie set |
| Errors | 400 validation; 409 email exists |

### POST `/api/auth/login`

| | |
|--|--|
| Body | `{ email, password, rememberMe?: boolean }` |
| Validation | `validateLogin` |
| Success | User + `token`; refresh 7d or 30d |
| Errors | 401 invalid; 429 lockout via LoginAttempt |

### POST `/api/auth/logout`

Clears refresh session cookie; revokes session.

### POST `/api/auth/refresh`

Uses `socialiq_refresh_token` cookie; rotates session; returns new access token.

### POST `/api/auth/forgot-password` / `reset-password`

Email token reset flow (`validateForgotPassword`, `validateResetPassword`).

### POST `/api/auth/google`

Google Sign-In token verification (`GOOGLE_CLIENT_ID`). Body validated by `validateGoogleSignIn`.

### GET `/api/auth/me`

| Auth | `protect` |
| Returns | Current user profile |

### POST `/api/auth/logout-all` | `logout-other` | `change-password`

| Auth | `protect` |
| Notes | Session revocation / password change with validation |

### POST `/api/auth/google/connect` | `disconnect`

Link/unlink Google account (`protect`).

**Example login**

```bash
curl -c cookies.txt -b cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $CSRF" \
  -d '{"email":"user@example.com","password":"Str0ng!Pass","rememberMe":true}'
```

---

## Billing — `/api/billing`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/webhook` | No (HMAC) | Razorpay webhooks; CSRF exempt |
| GET | `/plans` | No | Plan catalog |
| POST | `/create-order` | protect | Create Razorpay order |
| POST | `/verify-payment` | protect | Verify signature; activate plan |
| POST | `/payment-failed` | protect | Record failure |
| POST | `/apply-coupon` | protect | Price with coupon |
| POST | `/change-plan` | protect | Upgrade/downgrade |
| POST | `/cancel` | protect | Cancel at period end / cancel |
| POST | `/resume` | protect | Resume subscription |
| GET | `/subscription` | protect | Subscription details |
| GET | `/status` | protect | Plan + usage limits |
| GET | `/invoices` | protect | Invoice list |
| GET | `/invoice/:id` | protect | Invoice detail |
| GET | `/invoice/:id/pdf` | protect | PDF download |

**Create-order body (typical):** `{ plan: "professional"|"enterprise", billingCycle: "monthly"|"annual", billingDetails, couponCode? }`  
**Verify body:** `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`

**Plans (INR ex-GST):** Professional 2400/24000 · Enterprise 8200/82000 · GST 18%.

---

## Analyzer — `/api/analyzer`

| Method | Route | Auth | Validation | Purpose |
|--------|-------|------|------------|---------|
| POST | `/youtube` | protect | `validateYoutubeUrl` | Analyze YouTube channel/video URL |

**Limiter:** strictLimiter

---

## X — `/api/x`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/analyze` | protect + `validateXUrl` | Analyze X profile |

---

## Compare — `/api/compare`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/` | protect + `validateCompareAccounts` | Compare two accounts |
| POST | `/youtube` | protect | Compare YouTube creators |

---

## AI — `/api/ai`

| Method | Route | Auth | Limits | Purpose |
|--------|-------|------|--------|---------|
| POST | `/video-insights` | protect | `aiRequests` | Video AI analysis |
| POST | `/chat` | protect | `aiRequests` | SSE research chat |
| POST | `/channel-insights` | protect | — | Channel insights |

**Video insights body example:** `{ title, views, likes, comments }`  
**Chat:** Accept `text/event-stream` responses.

---

## Reports — `/api/reports`

| Method | Route | Auth | Notes |
|--------|-------|------|-------|
| POST | `/` | protect + validate + `reports` limit | Create |
| POST | `/upsert` | protect + validate | Create or update |
| GET | `/` | protect | List |
| GET | `/:id` | protect | Detail |
| PATCH | `/:id` | protect + validatePatch | Metadata |
| DELETE | `/:id` | protect | Delete |
| POST | `/:id/regenerate` | protect + regen limiter | Rebuild dossier |
| POST | `/:id/share` | protect + share limiter | Share link (`expiresInDays` optional) |
| DELETE | `/:id/share` | protect | Revoke share |
| GET | `/:id/history` | protect | History |

---

## Shared — `/api/shared`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/:token` | No | Public shared report (view limiter) |

---

## Profile — `/api/profile`

All `protect` + strictLimiter.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/:creatorId` | Overview |
| GET | `/:creatorId/timeline` | Timeline |
| GET | `/:creatorId/news` | News |
| GET | `/:creatorId/charts` | Charts |
| GET | `/:creatorId/elections` | Elections |
| GET | `/:creatorId/influence` | Influence |
| GET | `/:creatorId/ai-insights` | AI insights |
| GET | `/:creatorId/history` | History |
| GET | `/:creatorId/similar` | Similar profiles |
| POST | `/:creatorId/chat` | Profile chat (streaming) |

---

## Analytics — `/api/analytics`

`protect` + response cache ~30s.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/top-videos` | Top videos |
| GET | `/highest-engagement` | Engagement leaders |
| GET | `/dashboard-overview` | Dashboard |
| GET | `/compare` | Compare metrics |
| GET | `/compare-metrics` | Metric compare |
| GET | `/channel-summary/:accountId` | Summary |
| GET | `/series/:accountId` | Time series |
| GET | `/latest/:accountId` | Latest snapshot |
| GET | `/growth/:accountId` | Growth |
| GET | `/posting-frequency/:accountId` | Posting cadence |
| GET | `/top-content/:accountId` | Top content |
| GET | `/best-posting-time/:accountId` | Best time |
| GET | `/growth-rate/:accountId` | Growth rate |
| GET | `/forecast/:accountId` | Forecast |

Query params vary by handler (date ranges, metrics) — inspect controller for exact names when integrating.

---

## Accounts — `/api/accounts`

Cache ~20s.

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/` | protect | List accounts |
| DELETE | `/:id` | protect + mongoId | Delete |
| PATCH | `/:id/group` | protect | Update group |
| PATCH | `/:id/party-state` | protect | Update party/state |

---

## YouTube — `/api/youtube`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/sync/:accountId` | protect | Sync one |
| POST | `/sync-all` | protect | Sync all |
| POST | `/sync-content/:accountId` | protect | Sync content |

---

## Competitors — `/api/competitors`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/` | protect | List |
| POST | `/` | protect + validate | Add |
| DELETE | `/:id` | protect | Remove |

---

## Exports — `/api/exports`

| Method | Route | Auth | Limits | Purpose |
|--------|-------|------|--------|---------|
| GET | `/dashboard` | protect | `pdfExport` | Dashboard PDF/Excel |
| GET | `/competitors` | protect | `pdfExport` | Competitors export |
| GET | `/reports/:id` | protect | — | Report export |

---

## Notifications — `/api/notifications`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/` | protect | List |
| PUT | `/read-all` | protect | Mark all read |
| PUT | `/:id/read` | protect | Mark one read |

---

## Search — `/api/search`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/` | protect + `validateSearchQuery` | Global search |

---

## Users — `/api/users`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| PATCH | `/profile` | protect | Update profile |
| PATCH/PUT | `/email` | protect | Change email |
| DELETE | `/account` | protect | Delete account |
| GET | `/sessions` | protect | Active sessions |
| DELETE | `/sessions/:id` | protect | Revoke session |
| GET | `/account-stats` | protect | Stats |
| POST | `/reset-workspace` | protect | Reset workspace |

---

## Settings — `/api/settings`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/appearance` | optionalAuth | Theme prefs |
| PUT | `/appearance` | protect | Update appearance |
| GET | `/plans` | No | Plan catalog |
| GET/POST | `/email-schedule` | protect | Email digests |
| GET/POST | `/notifications` | protect | Notification prefs |
| GET/PUT | `/privacy` | protect | Privacy |
| GET/PUT | `/security` | protect | Security prefs |
| GET/PUT | `/advanced` | protect | Advanced |
| GET | `/integrations` | protect | Integrations |
| PUT | `/integrations/:id` | protect | Update integration |
| GET/POST/DELETE | `/api-keys`… | protect | API key CRUD |
| GET | `/data-export/profile` | protect | Export profile JSON |
| POST | `/profile` | protect | Update profile |
| POST | `/password` | protect | Update password |

---

## Groups — `/api/groups`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/` | protect | List groups |
| POST | `/heal-images` | protect | Repair image URLs |
| GET | `/:groupName` | protect | Creators in group |

---

## History — `/api/history`

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/` | protect | Global history |
| GET | `/:accountId` | protect | Channel history |

---

## Headers Reference

```http
Authorization: Bearer <access_token>
X-XSRF-TOKEN: <csrf_token>
Content-Type: application/json
Cookie: socialiq_refresh_token=...; XSRF-TOKEN=...
```

---

## Example Success / Error Shapes

```json
{
  "success": true,
  "data": { "token": "<jwt>", "_id": "...", "email": "a@b.com", "plan": "free" }
}
```

```json
{
  "success": false,
  "message": "Limit exceeded. Your current plan (FREE) allows a maximum of 2 tracked accounts."
}
```

---

## Recommended Improvements

- OpenAPI 3.1 generated from route validators
- Consistent error code enum (`AUTH_LOCKED`, `PLAN_LIMIT`, …)
- Versioned base path `/api/v1`
