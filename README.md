# CCAO — by NEXTAO

> **Keep your cloud and AI spend under control — automatically.**
> CCAO is a free, open-source, predictive budget controller for **Google Cloud Platform (GCP), Amazon Web Services (AWS), and OpenAI**:
> real-time spend tracking, provider-specific hard caps, and anomaly/spike detection that emails you before the bill explodes.

![License](https://img.shields.io/badge/license-MIT-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Stack](https://img.shields.io/badge/50%25-cost%20control-green)

---

## Why CCAO

Dev horror story: a stray `--region=all-regions` data-processing job, a leaked API key, a runaway
replica pool — and a month's profit vanishes into a cloud invoice. Cloud providers bill **after** the
damage. CCAO watches spend **as it accrues**, and when your budget threshold is crossed it can:
**detach the project's billing** (the hard cap) and notify you instantly.

## Features

- **Real-time multi-cloud and AI spend tracking** — reads GCP Billing/BigQuery, AWS Cost Explorer, and OpenAI Usage API data and surfaces current cost vs. budget.
- **Hard-cap Auto-Kill** — one toggle; when `current spend ≥ threshold`, CCAO invokes the provider-specific hard cap for GCP, AWS, or OpenAI.
- **Anomaly / spike detection** — statistical comparison of recent hourly spend against historical patterns
  (z-score) with an email alert when spend spikes.
- **Free email notifications** — Resend (3k emails/mo free) or Nodemailer + Gmail SMTP.
- **Works with Supabase** — Postgres + Row-Level Security + built-in auth; zero self-managed infra.
- **Serverless, free-tier deployable** — runs on Vercel's hobby plan; cron-based checks mean no always-on server.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend / Dashboard | Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| Backend API | Next.js API Routes (serverless, Node runtime) |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| Cloud SDKs | Google Cloud Billing/BigQuery, AWS Cost Explorer/IAM, OpenAI Usage/Admin APIs |
| Email | Resend API / Nodemailer (Gmail SMTP) |
| Hosting | Vercel (or Render) |

## Repo Layout

```
.
├── app/
│   ├── api/                 # Backend endpoints (check-spend, budgets, accounts, alerts, auth)
│   ├── dashboard/           # User dashboard (spend vs budget, auto-kill, alert log)
│   ├── privacy/ terms/      # Legal pages
│   ├── layout.tsx page.tsx not-found.tsx sitemap.ts robots.ts
├── components/              # Landing + dashboard UI
├── lib/                     # supabase, gcpBilling, email, anomaly, crypto, utils
├── supabase/schema.sql      # Full database schema + RLS policies
├── .env.example             # Env template (every secret annotated)
├── SETUP_GUIDE.md           # Step-by-step manual setup walkthrough
└── vercel.json              # Free Vercel Cron schedule for /api/check-spend
```

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local   # fill every [MANUAL_SETUP_REQUIRED] value
#     → Follow SETUP_GUIDE.md for Supabase + provider credentials + Resend

# 3. Apply the database schema (Supabase SQL editor → paste supabase/schema.sql → Run)

# 4. Run
npm run dev                  # http://localhost:3000
```

> **Full manual walkthrough:** see [**SETUP_GUIDE.md**](./SETUP_GUIDE.md) — it covers provider credentials,
> usage APIs, Supabase tables/RLS, Resend/SMTP email, deployment and cron automation.

## Deployment

Vercel is the easiest free-tier target:

```bash
vercel login
vercel env add GCP_PRIVATE_KEY        # paste full PEM; preserve newlines
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add every remaining var from .env.example ...
vercel --prod
```

The included `vercel.json` registers a **cron job** that pings `/api/check-spend` hourly; Vercel signs
those pings with `Authorization: Bearer $CRON_SECRET` automatically.

## A note on safety

The "auto-kill" capability is **powerful**: it detaches billing from a live project. Use it deliberately.
CCAO is opinionated software, not an adversarial protection system — anyone granted IAM roles via its
service account can re-attach billing. Scope roles to the monitored project(s), keep `CRON_SECRET` and the
service-account key in your host's encrypted store, and treat alerts as an early-warning not a lock.

## License

MIT — free for personal and commercial use.

## Attribution

**Maintained by NEXTAO.** Not officially affiliated with Google Cloud, AWS, or OpenAI, or any of the third-party
services integrated here. All product names, logos, and brands are property of their respective owners.