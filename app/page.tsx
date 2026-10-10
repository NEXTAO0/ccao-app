import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Terminal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ProcessStep from "@/components/ProcessStep";
import { DeletionToast } from "@/components/DeletionToast";
import { FAQ } from "@/components/landing/FAQ";

export const metadata: Metadata = {
  title: "Cloud & API Budget Circuit Breaker",
  description:
    "Automated hard-cap policy enforcement and API key revocation for GCP, AWS, and OpenAI.",
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <DeletionToast visible={params.deleted === "1"} />
      <Navbar />
      <main className="flex-1 bg-background">
        <section className="border-b border-border bg-background" aria-labelledby="hero-title">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                </span>
                [SYSTEM OPERATIONAL]
                <span className="text-zinc-600">/</span>
                Multi-Cloud Circuit Breaker
              </div>

              <h1 id="hero-title" className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-100 sm:text-6xl">
                Cloud &amp; API Budget Circuit Breaker
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
                Scheduled spend checks and configurable provider actions for GCP, AWS, and OpenAI. Provider reporting delays and API availability can affect detection and enforcement.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-md border border-orange-500 bg-orange-500 px-4 py-2.5 font-mono text-sm font-semibold text-zinc-950 shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600"
                >
                  Open control plane
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                  <Link
                    href="#features"
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 font-mono text-sm text-zinc-100 transition hover:bg-zinc-800"
                >
                  Inspect architecture
                </Link>
              </div>

              <div className="mt-7 flex items-center gap-3 font-mono text-xs text-zinc-500">
                <Terminal className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
                <span className="text-orange-400">policy.enforcement: enabled</span>
                <span className="text-zinc-700">·</span>
                <span>30-day free trial · subscription required</span>
              </div>
            </div>

            <TelemetryCard />
          </div>
        </section>

        <section id="architecture" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="architecture-title">
          <div className="mb-10 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-400">System architecture</p>
              <h2 id="architecture-title" className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                Guardrails for expensive infrastructure
              </h2>
            </div>
            <p className="max-w-sm font-mono text-xs leading-5 text-zinc-500">Three control layers. One auditable path from spend signal to enforced limit.</p>
          </div>

          <div className="grid border-t border-b border-zinc-800 md:grid-cols-3 md:divide-x md:divide-zinc-800">
            <ArchitectureColumn number="01" label="TELEMETRY">
              Continuous MTD spend calculation across multi-cloud environments.
            </ArchitectureColumn>
            <ArchitectureColumn number="02" label="CIRCUIT BREAKER">
              Automated IAM policy attachment and OpenAI key revocation upon threshold breach.
            </ArchitectureColumn>
            <ArchitectureColumn number="03" label="ZERO TRUST">
              Server-side AES-256-GCM encryption before credentials are stored.
            </ArchitectureColumn>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-background" aria-labelledby="how-it-works-title">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-400">Execution path</p>
            <h2 id="how-it-works-title" className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              From spend signal to enforced limit.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <ProcessStep number="01" title="Connect" body="Link GCP, AWS, or OpenAI credentials through the control plane." />
              <ProcessStep number="02" title="Set the cap" body="Define a provider-specific budget and choose the enforcement policy." />
              <ProcessStep number="03" title="Break the circuit" body="CCAO revokes or detaches access when the hard limit is breached." />
            </div>
          </div>
        </section>

        <FAQ />

        <section className="border-t border-border bg-background" aria-label="Start your trial call to action">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-400">Ready state</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">Add a configured spend threshold to your workloads.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-md border border-orange-500 bg-orange-500 px-4 py-2.5 font-mono text-sm font-semibold text-zinc-950 shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600">
              Initialize account
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 font-mono text-sm text-zinc-200 transition-all hover:border-orange-500/40 hover:bg-zinc-800">
                View plans
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function TelemetryCard() {
  const providers = [
    { name: "GCP", target: "sample-project", spend: "$14.20 / $100.00", status: "EXAMPLE", statusClass: "text-emerald-400" },
    { name: "AWS", target: "example-account", spend: "$48.90 / $50.00", status: "EXAMPLE", statusClass: "text-zinc-300" },
    { name: "OAI", target: "example-org", spend: "$25.00 / $25.00", status: "EXAMPLE", statusClass: "text-rose-400" },
  ];

  return (
    <div className="glass rounded-lg p-4 font-mono text-xs shadow-[0_0_0_1px_rgba(255,255,255,0.02)]" aria-label="Illustrative sample values, not live provider data">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3 text-zinc-500">
      <span>Illustrative sample · not connected</span>
      <span className="text-orange-400">example</span>
      </div>
      <div className="space-y-4">
        {providers.map((provider) => (
          <div key={provider.name} className="terminal-line grid gap-1 sm:grid-cols-[3.5rem_1fr_auto] sm:items-center sm:gap-3">
            <span className="text-zinc-100">[{provider.name}]</span>
            <span className="text-zinc-400">{provider.target}</span>
            <span className="text-zinc-300 sm:text-right">MTD: {provider.spend} <span className={provider.statusClass}>| STATUS: {provider.status}</span></span>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-zinc-800 pt-3 text-zinc-600">Sample values only. Check frequency and data freshness depend on deployment and provider.</div>
    </div>
  );
}

function ArchitectureColumn({ number, label, children }: { number: string; label: string; children: React.ReactNode }) {
  return (
    <article className="flex min-h-56 flex-col justify-between p-6 sm:p-8">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-orange-400">{number}</span>
        <span className="text-zinc-500">/ {label}</span>
      </div>
      <p className="mt-12 max-w-xs text-base leading-7 text-zinc-300">{children}</p>
    </article>
  );
}
