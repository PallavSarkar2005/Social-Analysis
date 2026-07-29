# Development Guide

## Prerequisites

- **Node.js 20+**
- **npm** (lockfiles present in `frontend/` and `backend/`)
- **MongoDB** (local or Atlas)
- **Python 3** (optional but used for X scraping packages in postinstall)
- API keys: Groq, YouTube; optional OpenAI, Razorpay, Google OAuth, SMTP

## Clone & Install

```bash
git clone https://github.com/PallavSarkar2005/Social-Analysis.git
cd Social-Analysis

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Configuration

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill required backend secrets (`MONGO_URI`, `GROQ_API_KEY`, `JWT_SECRET`, YouTube key).

## Run Locally

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

- API: http://localhost:5000  
- App: http://localhost:5173  

## Scripts

### Backend

| Script | Command | Purpose |
|--------|---------|---------|
| start | `npm start` | `node server.js` |
| dev | `npm run dev` | Nodemon |
| lint | `npm run lint` | ESLint |
| test | `npm test` | Jest `--runInBand` |
| rebuild-profiles | `npm run rebuild-profiles` | Profile rebuild script |
| migrate-analytics | `npm run migrate-analytics` | Snapshot migration |

### Frontend

| Script | Command | Purpose |
|--------|---------|---------|
| dev | `npm run dev` | Vite HMR |
| build | `npm run build` | Production bundle |
| preview | `npm run preview` | Preview build |
| lint | `npm run lint` | ESLint |
| test | `npx vitest run` | Vitest (script not wired in package.json yet) |

## Project Layout

See [Architecture.md](./Architecture.md) folder section. There is **no** root `package.json`; treat frontend and backend as sibling packages.

## Coding Patterns

- Backend: ESM (`"type": "module"`), Express routers → controllers → services → models
- Frontend: functional React, React Query for server state, Context for auth/appearance
- Do not store access tokens in `localStorage` (legacy keys are cleared on purpose)

## Testing

```bash
cd backend && npm test
cd frontend && npx vitest run
```

Backend tests live in `backend/tests/*.test.js`. Frontend tests in `frontend/src/tests/`.

## Migrations / One-off Scripts

Under `backend/scripts/` (profile rebuild, analytics migration, identity validation, etc.). Run only with explicit env and backups.

## Docker Dev

```bash
docker compose up --build
```

See root `docker-compose.yml`.

## Troubleshooting

See [Troubleshooting.md](./Troubleshooting.md).
