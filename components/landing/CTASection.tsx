import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-lg border border-orange-500/30 bg-zinc-900 px-8 py-14 text-center sm:px-16">
          <div className="grid-bg absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative">
            <span className="chip border-orange-500/30 bg-orange-500/10 text-zinc-100">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              Free forever · Open source · NEXTAO built
            </span>
            <h2 className="text-balance mx-auto mt-6 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Arm your budget before the invoice does.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-zinc-400">
              Connect a project, set a cap, and let CCAO send alerts before spending exceeds it.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-orange-500 bg-orange-500 px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-orange-600"
              >
                Launch your dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="/SETUP_GUIDE.md"
                className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
              >
                Read the setup guide
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}