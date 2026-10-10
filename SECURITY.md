# Security Policy

At **NEXTAO**, we take the security of our infrastructure and the confidentiality of your credentials seriously. **CCAO (Cloud Controller by NEXTAO)** handles sensitive API keys, cloud access parameters, and cost controls across multi-cloud environments. We are committed to addressing security vulnerabilities promptly and transparently.

---

## Supported Versions

Only the latest active version running on production ([ccao.nextao.site](https://ccao.nextao.site)) receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| Main    | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Architecture & Security Safeguards

CCAO implements strict defense-in-depth security measures to protect user assets:

* **Encryption at Rest:** Sensitive credentials (API keys, service account credentials, access tokens) are encrypted prior to database insertion using AES-256-GCM authenticated encryption (`CRYPTO_SECRET`). Plaintext secrets are never stored in raw database columns.
* **Database Isolation:** Row-Level Security (RLS) policies are strictly enforced across PostgreSQL tables (Budgets, Cloud Accounts, User Profiles) ensuring total tenant isolation.
* **Authentication:** Handled via Supabase Auth using PKCE OAuth 2.0 flows and signed JWT tokens.
* **Network & API Security:** API routes enforce strict CORS policies, server-side payload validation, and service-role isolation for destructive actions.

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public channels or issue trackers.**

If you discover a potential vulnerability, security flaw, or credential exposure in CCAO, report it privately to our security team:

* **Email:** [security@nextao.site](mailto:security@nextao.site) or [ccao@nextao.site](mailto:ccao@nextao.site)
* **Response Time:** We aim to acknowledge receipt of all security reports within **24 hours** and provide a resolution status or remediation timeline within **72 hours**.

### What to Include in Your Report

To help us investigate and patch the issue quickly, please include:

1. A descriptive title and type of issue (e.g., *Cross-Site Scripting, RLS bypass, Encryption key leak, Auth bypass*).
2. Step-by-step instructions or a minimal Proof of Concept (PoC) to reproduce the vulnerability.
3. Affected endpoints, routes, or components (e.g., `/api/accounts`, `/api/budgets`).
4. Potential impact if exploited by a malicious actor.

---

## Disclosure & Remediation Policy

* Once a report is received, we will work to verify and develop a fix in a private branch.
* A patch will be deployed to `ccao.nextao.site` immediately upon verification.
* We respectfully ask security researchers to allow us reasonable time to remediate issues before making any public disclosures.
