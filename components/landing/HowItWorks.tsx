import { KeyRound, Rocket, ShieldCheck, BellRing } from "lucide-react";

const steps = [
  {
    icon: KeyRound,
    step: "01",
    title: "Connect a cloud or AI account",
    body: "Link a scoped GCP service account, AWS IAM identity, or OpenAI Admin API key in the CCAO dashboard. Credentials are encrypted at rest.",
  },
  {
    icon: ShieldCheck,
    step: "02",
    title: "Set your budget & hard cap",
    body: "Define a threshold in your currency and flip the Auto-Kill toggle on. CCAO now knows exactly when to pull the plug.",
  },
  {
    icon: BellRing,
    step: "03",
    title: "Review spend alerts",
    body: "Every hour, the scheduled check compares current spend with your history and emails you when it detects a spike or threshold breach.",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Stay in control",
    body: "See your spend vs. budget in the dashboard, review anomaly alerts, and re-attach billing with one click when you're ready.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-title">How it works</p>
          <h2 className="text-balance mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            From cloud and AI bill shock to auto-pilot in 10 minutes
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            No complex pipelines or provider-specific dashboards to maintain. Four steps,
            all reachable from one small dashboard.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.step} className="card relative p-5 transition hover:border-slate-700">
              <span
                className="absolute right-5 top-4 text-4xl font-extrabold text-slate-600"
                aria-hidden="true"
              >
                {step.step}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30">
                <step.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-100">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}