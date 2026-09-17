import {
  Activity,
  AlarmClock,
  BellRing,
  Database,
  Gauge,
  KeyRound,
  Lock,
  Mail,
} from "lucide-react";

const features = [
  {
    icon: Gauge,
    title: "Real-time spend tracking",
    body: "Pulls the latest available usage from GCP Billing and BigQuery, AWS Cost Explorer, or the OpenAI Usage API on an hourly, daily, or monthly schedule.",
  },
  {
    icon: AlarmClock,
    title: "Hard-cap Auto-Kill",
    body: "Cross the threshold and CCAO invokes the provider-specific hard cap: detach GCP billing, freeze AWS access, or revoke an OpenAI API key.",
  },
  {
    icon: Activity,
    title: "Anomaly spike detection",
    body: "Rolling z-score statistics compare the current hour with your historical pattern. A 10× data-job spike triggers an email within the hour.",
  },
  {
    icon: BellRing,
    title: "Email alerts you read",
    body: "Clean budget-breach and spike notifications with the spend, threshold, and action taken. Delivered free by Resend or your Gmail via SMTP.",
  },
  {
    icon: Database,
    title: "PostgreSQL, RLS-protected",
    body: "Supabase Row Level Security protects every row. Your budgets and alerts remain private, and project links are encrypted at rest.",
  },
  {
    icon: KeyRound,
    title: "Scoped, least-privilege IAM",
    body: "Use least-privilege GCP service accounts, AWS IAM identities, or OpenAI Admin API keys. You choose exactly how much power CCAO holds.",
  },
  {
    icon: Lock,
    title: "Encrypted credentials",
    body: "Cloud and AI credentials are encrypted with AES-256-GCM before storage and are never returned by the API.",
  },
  {
    icon: Mail,
    title: "No-cost notifications",
    body: "Resend's free tier gives you 3,000 emails a month. Combine it with Gmail SMTP as a fallback and pay zero for alerting.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-slate-800 bg-slate-900/60 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-title">Features</p>
          <h2 className="text-balance mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            A small tool with a sharp edge
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Everything below runs on the free tiers of the services you already trust.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="card p-5 transition hover:border-slate-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500 text-zinc-950">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}