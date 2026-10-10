import Link from "next/link";
import { Check, Zap, CalendarClock } from "lucide-react";

const planIncludes = [
  "Budgets and connected accounts, subject to provider limits",
  "Auto-Kill hard cap toggle",
  "Anomaly spike detection",
  "Email alerts",
  "Spend sample dashboard",
  "Priority email support",
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-title">Pricing</p>
          <h2 className="text-balance mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Start with a 30-day free trial
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            CCAO is a closed-source SaaS product by NEXTAO. Every new account includes a
            30-day free trial with full access. A paid subscription is required to keep
            using the dashboard after the trial ends.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
          <div className="card relative overflow-hidden border-orange-500/30 p-7">
            <span className="absolute right-6 top-6 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-mono text-xs font-bold text-orange-400">
              Recommended
            </span>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" aria-hidden="true" />
              <h3 className="text-lg font-extrabold text-slate-100">Pro Monthly</h3>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Full dashboard access billed monthly. Cancel anytime from the customer portal.
            </p>
            <p className="mt-6">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-slate-100">Monthly</span>
              <span className="ml-2 text-sm font-medium text-slate-500">per seat · renews automatically</span>
            </p>
            <ul className="mt-6 space-y-3">
              {planIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/subscribe?plan=monthly" className="btn-primary mt-8 w-full">
              Start 30-day trial
            </Link>
          </div>

          <div className="card flex flex-col p-8">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <h3 className="text-lg font-extrabold text-slate-100">Pro Annual</h3>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Full dashboard access billed annually. Best value for continuous protection.
            </p>
            <p className="mt-6">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-slate-100">Annual</span>
              <span className="ml-2 text-sm font-medium text-slate-500">per seat · renews automatically</span>
            </p>
            <ul className="mt-6 space-y-3">
              {planIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/subscribe?plan=annual"
              className="btn-secondary mt-8 w-full"
              aria-label="Start annual trial checkout"
            >
              Start 30-day trial
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
            Trial lasts 30 days from signup. After expiry a paid subscription is required.
            Check current provider pricing, quotas, and billing behavior before connecting production accounts.
        </p>
      </div>
    </section>
  );
}
