import Link from "next/link";
import { Check, Server, Terminal, Zap } from "lucide-react";

const freeIncludes = [
  "Unlimited budgets & projects",
  "Auto-Kill hard cap toggle",
  "Anomaly spike detection",
  "Email alerts (Resend / SMTP)",
  "Real-time spend dashboard",
  "Community support on GitHub",
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-title">Pricing</p>
          <h2 className="text-balance mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Cloud cost control with no subscription
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            CCAO is open source and runs on the free tiers of the platforms it uses.
            There is no paid plan, and the project will remain open source.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
          <div className="card relative overflow-hidden border-orange-500/30 p-7">
            <span className="absolute right-6 top-6 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-mono text-xs font-bold text-orange-400">
              Recommended
            </span>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" aria-hidden="true" />
              <h3 className="text-lg font-extrabold text-slate-100">CCAO Cloud</h3>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Hosted on Vercel free tier with hourly cron checks, Supabase free database,
              and Resend free email.
            </p>
            <p className="mt-6">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-slate-100">$0</span>
              <span className="text-sm font-medium text-slate-500"> / month · forever</span>
            </p>
            <ul className="mt-6 space-y-3">
              {freeIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/dashboard" className="btn-primary mt-8 w-full">
              Start for free
            </Link>
          </div>

          <div className="card flex flex-col p-8">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-slate-500" aria-hidden="true" />
              <h3 className="text-lg font-extrabold text-slate-100">Self-hosted</h3>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Run CCAO on your own VPS or laptop. You control the deployment and pay only
              for the infrastructure you choose, which can be free.
            </p>
            <p className="mt-6">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-slate-100">Free</span>
              <span className="text-sm font-medium text-slate-500"> · MIT license</span>
            </p>
            <ul className="mt-6 space-y-3">
              {["Bring your own Supabase", "Bring your own email provider", "Clone & run in minutes"].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Server className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {item}
                  </li>
                )
              )}
            </ul>
            <a
              href="/SETUP_GUIDE.md"
              className="btn-secondary mt-8 w-full"
              aria-label="Open the CCAO setup guide"
            >
              Read the setup guide
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Provider free tiers may change. Check Resend, Supabase, Google Cloud, AWS, and OpenAI for
          current limits before going all-in.
        </p>
      </div>
    </section>
  );
}