# FAQ

### What is SocialIQ?

An AI political intelligence and social analytics platform focused on YouTube (and X) creators, political dossiers, reports, and subscriptions.

### Is this TypeScript?

No. Frontend and backend are **JavaScript (ESM)**.

### Which React version?

**React 19** (`frontend/package.json`). Charts use **Recharts**, not Chart.js. Styling uses **Tailwind CSS v4**.

### Where is it deployed?

- Frontend: **Vercel**
- Backend: **Railway** (Nixpacks)
- Database: **MongoDB** (external)

### How do I run it locally?

See [Development.md](./Development.md).

### What AI models are used?

Primary **Groq `llama-3.3-70b-versatile`**, fallback **OpenAI `gpt-4o-mini`**.

### Is there vector RAG?

No vector database. Chat injects **live MongoDB metrics/context** into prompts (RAG-style grounding).

### How does auth work?

15-minute JWT access token (memory) + HttpOnly refresh cookie + CSRF header on mutations.

### What payment provider?

**Razorpay** (INR, 18% GST). Stripe/PayPal enums exist on models but Razorpay is the implemented provider.

### Plan limits?

| Plan | Creators | AI / cycle | Reports / cycle | PDF |
|------|----------|------------|-----------------|-----|
| free | 2 | 3 | 5 | No |
| professional | 15 | 100 | 100 | Yes |
| enterprise | 1000 | 10000 | 10000 | Yes |

### Where are tests?

- Backend: Jest in `backend/tests/`
- Frontend: Vitest in `frontend/src/tests/` (run via `npx vitest run`)

### Is Docker required?

No for local npm workflows. Dockerfiles and Compose are provided for production-like runs.

### Who do I contact for security issues?

See [SECURITY.md](../SECURITY.md).
