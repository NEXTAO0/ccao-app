# CCAO — Setup Guide

This guide walks through every manual configuration step required to run **CCAO (by NEXTAO)**
end-to-end: Supabase, GCP/AWS/OpenAI provider credentials, email delivery, deployment, and cron automation.

> Every value that requires your hands is also flagged inline in the code with `[MANUAL_SETUP_REQUIRED]`.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase — Database & Auth](#2-supabase--database--auth)
3. [Provider credentials](#3-provider-credentials)
4. [Email Engine — Resend or Gmail SMTP](#4-email-engine--resend-or-gmail-smtp)
5. [Environment Variables](#5-environment-variables)
6. [Local Development](#6-local-development)
7. [Deployment (Vercel)](#7-deployment-vercel)
8. [Automated Cost Checks (Cron)](#8-automated-cost-checks-cron)
9. [Security Hardening](#9-security-hardening)
10. [FAQ / Troubleshooting](#10-faq--troubleshooting)

---

## 1. Prerequisites

- Node.js ≥ 20 (LTS)
- At least one supported provider account: Google Cloud Platform, Amazon Web Services, or OpenAI
- A [Supabase](https://supabase.com) project (free tier is fine)
- Either a [Resend](https://resend.com) account (`resend` provider) **or** any Gmail account (SMTP fallback)
- (Optional) A [Vercel](https://vercel.com) account for one-click deployment + free cron

---

## 2. Supabase — Database & Auth

### 2.1 Create the project
1. Go to [database.new](https://database.new) and create a free-tier project.
2. Note the **Project URL** and both the **anon** and **service_role** keys
   (Supabase Dashboard → Project Settings → API). You'll use them in `.env.local`.
3. Enable **Google OAuth** (or Email) under Dashboard → Authentication → Providers if you want dashboard sign-in.

### 2.2 Apply the schema
The full schema lives in [`supabase/schema.sql`](./supabase/schema.sql). Apply it in the **SQL Editor**:

- Open Dashboard → SQL Editor → New query.
- Paste the whole file → **Run**.

This creates `profiles`, `gcp_accounts`, `budgets`, `cost_logs` and `alert_logs`, all with
**Row Level Security** enabled and helpful indexes.

### 2.3 Verify RLS
Run these three queries in the SQL editor — all three *must* return nothing (users can't see other users' rows):

```sql
select * from gcp_accounts where auth.uid() <> user_id;
select * from budgets     where auth.uid() <> user_id;
select * from alert_logs  where auth.uid() <> user_id;
```

---

## 3. Provider credentials

CCAO supports Google Cloud Platform (GCP), Amazon Web Services (AWS), and OpenAI API. Link the provider you want to monitor from the dashboard, then configure the matching credentials below.

### 3.1 Service account + key (the one CCAO runs as)
1. GCP Console → **IAM & Admin → Service Accounts** → *Create Service Account*.
   Name it e.g. `ccao-controller`.
2. Grant the following **roles** to the service account:
   | Role | Purpose |
   |---|---|
   | `Billing Account Viewer` (`roles/billing.viewer`) | read billing info on the monitored project |
   | `Project Billing Manager` (`roles/billing.projectManager`) | allow CCAO to re-attach/detach billing (**required for the auto-kill hard cap**) |
   | `BigQuery Data Viewer` (`roles/bigquery.dataViewer`) | read the cost export table |
3. Create a key: select the service account → **Keys** → **Add key → Create new key → JSON**. Download it.
4. From that JSON copy:
   - `client_email` → `GCP_CLIENT_EMAIL`
   - `private_key` → `GCP_PRIVATE_KEY`

> **Warning:** These credentials can detach your billing. Keep them in your host's encrypted secret store,
> never in client code, and never in git. CCAO encrypts them at rest with `CRYPTO_SECRET` if you store
> per-account keys in the dashboard.

### 3.2 Find your billing account ID
```bash
gcloud billing projects describe <GCP_PROJECT_ID>
```
Output contains `billingAccountName: billingAccounts/XXXXXX-XXXXXX-XXXXXX`. Put that whole value
(`billingAccounts/...`) into `GCP_BILLING_ACCOUNT_ID`.

### 3.3 Export cost data to BigQuery (required for spend analytics)
CCAO reads real spend from the **standard BigQuery billing export**:

1. GCP Console → **Billing → Billing account → (Cost Management) → Exports** (or *Budget management & alerts* above → *Billing export*).
2. Create a **Standard export** of *detailed usage & cost* into a dataset, e.g. `billing_export`.
3. Note the generated table id. It looks like:
   `my-billing-project.billing_export.gcp_billing_export_v1_<8 hex chars>`
4. Set that as `GCP_BIGQUERY_TABLE`.
5. The service account also needs `BigQuery Data Viewer` on the export project — done in 3.1 if same project;
   otherwise grant it on the export project too.

> If you prefer **no BigQuery**, CCAO still works for budget enforcement via the
> `CloudBillingClient.getProjectBillingInfo` connectivity check, but live spend numbers will be unavailable.
> The BigQuery path is the recommended one.

---

## 4. Email Engine — Resend or Gmail SMTP

### Option A — Resend (recommended, free)
1. Sign up at [resend.com](https://resend.com) → **Add domain** and verify it (DNS records).
2. Create an **API key** (Resend Dashboard → API Keys) → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified address, e.g. `CCAO Alerts <alerts@yourdomain.com>`.
4. Set `EMAIL_PROVIDER=resend`.

### Option B — Nodemailer + Gmail SMTP (no extra account)
1. Enable **2-Step Verification** on your Google account.
2. Google Account → **Security → App passwords** → generate one for "Mail".
3. Set:
   - `EMAIL_PROVIDER=smtp`
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465`
   - `SMTP_USER=<your-gmail>`
   - `SMTP_PASS=<16-char app password>`

---

## 5. Environment Variables

```bash
cp .env.example .env.local
```
Fill in every `[MANUAL_SETUP_REQUIRED]` value. Then:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (server only) |
| `GCP_CLIENT_EMAIL` / `GCP_PRIVATE_KEY` | Service-account JSON downloaded in §3.1 |
| `GCP_BILLING_ACCOUNT_ID` | `gcloud billing projects describe <project>` |
| `GCP_BIGQUERY_TABLE` | Billing export table id from §3.3 |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `CRYPTO_SECRET` | `openssl rand -base64 32` |

---

## 6. Local Development

```bash
npm install
npm run dev          # -> http://localhost:3000
```

Smoke-test the core endpoint with the cron secret:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     "http://localhost:3000/api/check-spend"
```

---

## 7. Deployment (Vercel)

1. Push this repo to GitHub and import it on [vercel.com](https://vercel.com/new).
2. Dashboard → **Project → Settings → Environment Variables** → add every var from `.env.example` (mark non-`NEXT_PUBLIC_` ones as encrypted).
3. For `GCP_PRIVATE_KEY` prefer **`vercel env add GCP_PRIVATE_KEY`** (or the UI textarea) so the newlines are preserved — it accepts the full PEM block on a single line.
4. Deploy. The site now serves the landing page, dashboard, `/privacy`, `/terms`, `sitemap.xml`, `robots.txt`.

---

## 8. Automated Cost Checks (Cron)

The vulnerable endpoint is `POST/GET /api/check-spend` and **requires** header `Authorization: Bearer <CRON_SECRET>`.

### On Vercel (free Hobby Cron)
Add a `vercel.json` at repo root (already included) and redeploy:

```json
{
  "crons": [
    { "path": "/api/check-spend", "schedule": "*/60 * * * *" }
  ]
}
```
Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when the env var is set on the project.

### On any host / GitHub Actions
Cheaper than threads, use GitHub Actions (create `.github/workflows/check-spend.yml`):

```yaml
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch: {}
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sS -f -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://ccao.example.com/api/check-spend"
```

---

## 9. Security Hardening

- **Scope the service account** to the minimum: `billing.viewer`, `billing.projectManager`, `bigquery.dataViewer`.
- Never log `GCP_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `CRYPTO_SECRET`.
- The auto-kill uses the **Project Billing Manager** role. To disable the hard cap entirely just flip every
  budget's `auto_kill` to `false` (or revoke that role).
- Rotate keys quarterly; GCP IAM keys show last-used date in the console.
- Treat `CRON_SECRET` as a password — anyone with it can trigger billing checks.

---

## 10. FAQ / Troubleshooting

**Q: `GET https://cloudbilling.googleapis.com/... 403`**
IAM roles missing. Re-check §3.1 role assignments and regenerate/download a fresh key JSON.

**Q: "billingAccountName" empty / spend not updating**
Billing export not configured (§3.3) or `GCP_BIGQUERY_TABLE` is stale. The export runs ~4–6h behind; that is normal.

**Q: Emails not arriving from Resend**
Verify the domain in Resend and that `EMAIL_FROM` matches an approved address. Check the Resend dashboard → Logs.

**Q: Private key is rejected ("PEM routines")**
The key contains literal `\n` or line breaks were mangled by the env file. Paste the whole PEM (including
`-----BEGIN/END PRIVATE KEY-----` lines) on a single line into the secret store, or use `vercel env add`.

**Q: Auto-kill didn't trigger**
Confirm `auto_kill = true` on the budget, the service account has `roles/billing.projectManager`, and the
check endpoint runs (see cron logs). CCAO logs the outcome in `alert_logs`.