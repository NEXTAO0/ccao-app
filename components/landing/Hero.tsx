import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export function Hero() {
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="container-page flex flex-col items-center py-20 text-center sm:py-28">
        <a
          href="#pricing"
          className="mb-6 inline-flex items-center gap-2 rounded-md border border-emerald-800 bg-emerald-950/40 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/70"
          aria-label="Learn about pricing: CCAO is 100% free"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          system.status: free / open-source
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </a>

        <h1 className="text-balance max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-50 sm:text-5xl">
          Cloud &amp; AI Budget Circuit Breaker
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-300 sm:text-xl">
          Automated hard-cap policy enforcement and API key revocation for GCP, AWS, and OpenAI.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary px-5 py-2.5 text-sm">
            Launch your dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <kbd className="border-l border-orange-300/40 pl-2 font-mono text-[10px] text-orange-100">Ctrl K</kbd>
          </Link>
          <Link href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
            See how it works
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          No credit card | Setup in about 10 minutes | Avoid unexpected bills
        </p>

        <MockDashboardCard />
      </div>
    </section>
  );
}

function MockDashboardCard() {
  return (
    <div
      className="mt-16 w-full max-w-lg text-left"
      aria-hidden="true"
      role="img"
      aria-label="Preview of the CCAO spend dashboard showing a budget breach with auto-kill notification"
    >
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current spend · last 24h
            </p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-slate-100">
              $1,284.90
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-800 bg-rose-950/50 px-2.5 py-1 font-mono text-xs font-bold text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            124% of budget
          </span>
        </div>

        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs font-medium text-slate-400">Auto-Kill Cap</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
              Armed
            </p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs font-medium text-slate-400">Anomaly score</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600">
              <Activity className="h-4 w-4" aria-hidden="true" />
              z = 4.1 σ
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-md border border-rose-900/70 bg-rose-950/50 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-600 text-white">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-red-200">
            Threshold crossed. Billing has been <strong>detached</strong>. Alert emailed to
            eng@acme.io at 14:32.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md border border-emerald-800 bg-emerald-950/50 px-4 py-3 font-mono text-xs font-semibold text-emerald-200">
          <span><span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />monitor: active / &lt;60s</span>
          <Check className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}