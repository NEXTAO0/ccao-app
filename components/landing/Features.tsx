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
    title: "Scheduled spend monitoring",
    body: "Reads available usage from GCP Billing and BigQuery, AWS Cost Explorer, or the OpenAI Usage API. The hosted deployment is configured for daily checks; source data can be delayed.",
  },
  {
    icon: AlarmClock,
    title: "Configured threshold actions",
    body: "When a scheduled check detects a breach, CCAO attempts the configured provider action. Actions can disrupt service and depend on provider permissions and availability.",
  },
  {
    icon: Activity,
    title: "Anomaly spike detection",
    body: "A z-score comparison checks a spend sample against recent stored samples. Results need enough history and are indicators, not a guarantee that every unusual charge will be detected.",
  },
  {
    icon: BellRing,
    title: "Configurable email alerts",
    body: "Budget-breach and anomaly notifications can be sent to configured recipients through Resend or SMTP. Delivery depends on provider availability and may incur provider charges.",
  },
  {
    icon: Database,
    title: "PostgreSQL, RLS-protected",
    body: "CCAO uses Supabase Postgres and user-scoped access. Review the supplied database policies and configure service-role credentials carefully for your deployment.",
  },
  {
    icon: KeyRound,
    title: "Scoped, least-privilege IAM",
    body: "Use least-privilege GCP service accounts, AWS IAM identities, or OpenAI Admin API keys. You choose exactly how much power CCAO holds.",
  },
  {
    icon: Lock,
    title: "Encrypted credentials",
    body: "Credentials submitted through the app are encrypted server-side with AES-256-GCM before storage. Account read endpoints omit credential fields.",
  },
  {
    icon: Mail,
    title: "Bring an email provider",
    body: "Configure Resend or SMTP for notifications. Provider plans, message limits, and charges are controlled by those providers and may change.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-background py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-title">Features</p>
          <h2 className="text-balance mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            A small tool with a sharp edge
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hosting, database, provider API, and email costs depend on your deployment and provider plans.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="card p-5 transition hover:border-orange-500/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500 text-black">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}