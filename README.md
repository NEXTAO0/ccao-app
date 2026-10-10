# CCAO — by NEXTAO

> **Monitor configured cloud and AI budgets from one dashboard.**
> CCAO is a closed-source SaaS product by NEXTAO for **Google Cloud Platform (GCP), Amazon Web Services (AWS), and OpenAI**. It stores spend samples, can send configured alerts, and can attempt provider actions on scheduled checks. Provider data delays and service availability apply.
>
> **30-day free trial included. Paid subscription via Paddle required after trial.**

![License](https://img.shields.io/badge/license-Proprietary-red) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

---

## Why CCAO

Cloud billing APIs and exports can report usage after a delay. CCAO runs configured checks and
records spend samples, alerts, and optional provider actions. The included hosted schedule is daily;
it is not real-time monitoring and should not be your only cost-control mechanism.

## Features

- **Scheduled provider spend samples** — reads configured GCP Billing/BigQuery, AWS Cost Explorer, or OpenAI Usage API data.
- **Optional provider actions** — attempts configured billing, IAM, or API-key actions after a scheduled threshold check; provider permissions and availability affect results.
- **Anomaly indicators** — compares new samples against recent stored history; sufficient samples are required and results are not guaranteed detections.
- **Configurable email alerts** — uses Resend or SMTP; provider availability and pricing apply.
- **Supabase-backed accounts** — uses PostgreSQL, Supabase Auth, and the configured row-level security policies.
- **Subscription billing** — Paddle Billing (merchant of record) with 30-day trial enforcement via Supabase entitlement flags.
- **SaaS deployment** — hosting, database, email, and provider charges depend on the SaaS plan.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend / Dashboard | Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| Backend API | Next.js API Routes (serverless, Node runtime) |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| Cloud SDKs | Google Cloud Billing/BigQuery, AWS Cost Explorer/IAM, OpenAI Usage/Admin APIs |
| Email | Resend API / Nodemailer (Gmail SMTP) |
| Hosting | Vercel SaaS deployment |
| Billing | Paddle Billing (`@paddle/paddle-js` checkout + Customer Portal + webhooks) |

## Repo Layout

```
.
├── app/\
│   ├── api/                 # Backend endpoints (check-spend, budgets, accounts, alerts, auth)
│   ├── dashboard/           # User dashboard (spend vs budget, auto-kill, alert log)
│   ├── cookie-policy/ privacy/ terms/ # Legal and privacy pages
│   ├── layout.tsx page.tsx not-found.tsx sitemap.ts robots.ts
├── components/              # Landing + dashboard UI
├── lib/                     # supabase, gcpBilling, email, anomaly, crypto, utils
├── supabase/schema.sql      # Full database schema + RLS policies
├── .env.example.copy        # Env template (every secret annotated)
├── SETUP_GUIDE.md           # Step-by-step manual setup walkthrough
└── vercel.json              # Daily Vercel Cron schedule for /api/check-spend
```

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example.copy .env.local   # fill every [MANUAL_SETUP_REQUIRED] value
#     → Follow SETUP_GUIDE.md for Supabase + provider credentials + Resend

# 3. Apply the database schema and all SQL migrations under supabase/migrations/

# 4. Run
npm run dev                  # http://localhost:3000
```

> **Full manual walkthrough:** see [**SETUP_GUIDE.md**](./SETUP_GUIDE.md) — it covers provider credentials,
> usage APIs, Supabase tables/RLS, Resend/SMTP email, deployment and cron automation.

## Deployment

Vercel is one supported hosting option; review current plan limits and pricing:

```bash
vercel login
vercel env add GCP_PRIVATE_KEY        # paste full PEM; preserve newlines
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add every remaining variable from .env.example.copy ...
vercel --prod
```

The included `vercel.json` registers a daily **cron job** for `/api/check-spend`. Confirm actual
execution frequency, plan eligibility, and authorization configuration in your deployment.

## A note on safety

The optional provider actions can disrupt production and may fail or be delayed. Test them with
non-production accounts, verify provider-side behavior, scope credentials to least privilege, protect
`CRON_SECRET` and `CRYPTO_SECRET`, and do not treat alerts or thresholds as a guarantee against charges.

## Pricing

New accounts include a **30-day free trial** with full access. After expiry, a
paid Paddle subscription (monthly or annual) is required. Expired or
unauthenticated requests to protected routes redirect to `/pricing`.
See `/refund` for the refund policy.

## License

Proprietary — All rights reserved by NEXTAO. See `LICENSE`.

## Attribution

**Maintained by NEXTAO.** Not officially affiliated with Google Cloud, AWS, or OpenAI, or any of the third-party
services integrated here. All product names, logos, and brands are property of their respective owners.