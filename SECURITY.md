# Security Policy

## Supported Versions

See [SUPPORTED_VERSIONS.md](SUPPORTED_VERSIONS.md) for which release lines receive security fixes.

## Reporting a Vulnerability

Please **do not** file a public GitHub issue for security vulnerabilities.

Instead, email the maintainers with:

- Description of the issue  
- Steps to reproduce  
- Affected component (`backend` / `frontend` / deploy config)  
- Impact assessment (auth bypass, data leak, RCE, etc.)  
- Any proof-of-concept (non-destructive)

Use the repository’s GitHub **Security Advisories** / private vulnerability reporting if enabled on the project.

We aim to acknowledge reports within **72 hours** and provide a remediation timeline after triage.

## Safe Harbor

Security research that:

- Avoids privacy violations, destruction of data, and service disruption  
- Does not exploit production beyond the minimum needed to demonstrate impact  
- Reports findings promptly  

…will be treated as authorized for the purpose of this policy.

## Current Security Controls

Documented in [docs/Security.md](docs/Security.md): JWT + refresh rotation, CSRF, Helmet, CORS whitelist, rate limits, bcrypt passwords, XSS/NoSQL sanitization, Razorpay HMAC verification.

## Secrets

Never commit:

- `.env` files  
- API keys (Groq, OpenAI, YouTube, Razorpay, MongoDB, SMTP, Google)  
- Production dump files  

Rotate credentials immediately if exposure is suspected.
