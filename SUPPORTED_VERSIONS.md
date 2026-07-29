# Supported Versions

SocialIQ is released as a single product line today (`backend` / `frontend` package versions in each `package.json`).

| Version line | Supported | Notes |
|--------------|-----------|-------|
| `main` (latest) | ✅ | Receives features, fixes, and security patches |
| Previous tagged releases (`vX.Y.Z`) | ⚠️ Best effort | Critical security fixes may be backported at maintainer discretion |
| Forks / unmodified old deploys | ❌ | Upgrade to latest `main` or tagged release |

## Runtime support

| Runtime | Supported |
|---------|-----------|
| Node.js 20.x | ✅ Primary (CI and Nixpacks) |
| Node.js 22.x | ⚠️ Should work; not the CI pin |
| Node.js ≤18 | ❌ Not supported |

| Browser | Supported |
|---------|-----------|
| Last two Chrome / Edge / Firefox | ✅ |
| Safari recent | ✅ |
| IE 11 | ❌ |

## Dependency security

Report vulnerabilities per [SECURITY.md](SECURITY.md). Keep `npm audit` clean on the supported line.
