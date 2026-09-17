"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Activity,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Settings,
  X,
  Wallet,
} from "lucide-react";
import type { DashboardData } from "@/app/dashboard/page";
import { formatCurrency } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { BudgetCard } from "@/components/dashboard/BudgetCard";
import { BudgetForm } from "@/components/dashboard/BudgetForm";
import { AccountsPanel } from "@/components/dashboard/AccountsPanel";
import { AlertLogList } from "@/components/dashboard/AlertLogList";

type Tab = "overview" | "budgets" | "projects" | "alerts";

export function DashboardClient({
  user,
  data,
}: {
  user: User;
  data: DashboardData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [signingOut, setSigningOut] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    if (!showSetupGuide) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowSetupGuide(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showSetupGuide]);

  async function signOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const armedCount = data.budgets.filter((b) => b.auto_kill).length;
  const totalSpend = data.budgets.reduce(
    (sum, b) => sum + (b.latest_spend?.amount ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="bg-transparent">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-100 sm:text-2xl">
              Cloud Cost Control
            </h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {user.email} | CCAO by NEXTAO
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSetupGuide(true)}
              className="btn-secondary"
              aria-label="Open the setup guide"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Setup guide
            </button>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="btn-secondary"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogOut className="h-4 w-4" aria-hidden="true" />
              )}
              Sign out
            </button>
          </div>
        </div>

        <nav className="container-page -mt-1 flex gap-1 overflow-x-auto thin-scroll" aria-label="Dashboard sections">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Overview
          </TabButton>
          <TabButton active={tab === "budgets"} onClick={() => setTab("budgets")}>
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Budgets
            {data.budgets.length > 0 && <CountBadge>{data.budgets.length}</CountBadge>}
          </TabButton>
          <TabButton active={tab === "projects"} onClick={() => setTab("projects")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Cloud & API Accounts
            {data.accounts.length > 0 && <CountBadge>{data.accounts.length}</CountBadge>}
          </TabButton>
          <TabButton active={tab === "alerts"} onClick={() => setTab("alerts")}>
            <Activity className="h-4 w-4" aria-hidden="true" />
            Alerts
            {data.alerts.length > 0 && <CountBadge>{data.alerts.length}</CountBadge>}
          </TabButton>
        </nav>
      </div>

      {showSetupGuide && <SetupGuideModal onClose={() => setShowSetupGuide(false)} />}

      <div className="container-page py-8">
        {tab === "overview" && (
          <section className="space-y-6" aria-label="Dashboard overview">
            <StatGrid
              totalSpend={totalSpend}
              budgets={data.budgets.length}
              armed={armedCount}
              alerts={data.alerts.filter((a) => a.severity !== "info").length}
            />

            {data.budgets.length === 0 && <EmptyDashboardState onCreate={() => { setTab("budgets"); setShowBudgetForm(true); }} />}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-zinc-100">Latest alerts</h2>
                  <button type="button" onClick={() => setTab("alerts")} className="text-sm font-semibold text-orange-400 hover:text-orange-300">
                    View all
                  </button>
                </div>
                <AlertLogList alerts={data.alerts.slice(0, 5)} compact />
              </div>

              <div className="card p-6">
                <h2 className="mb-4 text-base font-bold text-zinc-100">Budget watchlist</h2>
                <BudgetList budgets={data.budgets} onChanged={refresh} />
              </div>
            </div>
          </section>
        )}

        {tab === "budgets" && (
          <section className="space-y-6" aria-label="Budgets">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-100">Budgets</h2>
                <p className="text-sm text-zinc-400">
                  Thresholds are checked by the hourly cost check cron. Arm auto-kill to
                  detach billing on breach.
                </p>
              </div>
              <button type="button" onClick={() => setShowBudgetForm((v) => !v)} className="btn-primary">
                {showBudgetForm ? "Close form" : "New budget"}
              </button>
            </div>

            {showBudgetForm && (
              <BudgetForm accounts={data.accounts} onSaved={() => { setShowBudgetForm(false); refresh(); }} />
            )}

            <BudgetList budgets={data.budgets} onChanged={refresh} />

            {data.budgets.length === 0 && (
              <div className="card p-10 text-center">
                <Mail className="mx-auto h-8 w-8 text-zinc-400" aria-hidden="true" />
                <p className="mt-3 font-semibold text-zinc-200">No budgets yet</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Create your first budget and CCAO starts watching.
                </p>
              </div>
            )}
          </section>
        )}

        {tab === "projects" && <AccountsPanel accounts={data.accounts} onChanged={refresh} />}

        {tab === "alerts" && (
          <section aria-label="Alert history">
            <div className="mb-4">
              <h2 className="text-lg font-extrabold text-zinc-100">Alert history</h2>
              <p className="text-sm text-zinc-400">
                Budget breaches, anomaly spikes, and billing-kill events.
              </p>
            </div>
            <AlertLogList alerts={data.alerts} />
          </section>
        )}

        <p className="mt-10 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
          CCAO: by NEXTAO. Not officially affiliated with Google Cloud, AWS, or OpenAI.{" "}
          <Link href="/privacy" className="text-zinc-400 underline hover:text-zinc-200">Privacy</Link> ·{" "}
          <Link href="/terms" className="text-zinc-400 underline hover:text-zinc-200">Terms</Link>
        </p>
      </div>
    </main>
  );
}

function SetupGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/80 p-4 sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="my-auto w-full max-w-3xl rounded-lg border border-zinc-800 bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-guide-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-orange-400">setup.init()</p>
            <h2 id="setup-guide-title" className="mt-1 text-lg font-extrabold tracking-tight text-zinc-100">
              Connect a cloud or API account
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Add credentials, link the account, then create a budget monitor from the Budgets tab.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary shrink-0" aria-label="Close setup guide">
            <X className="h-4 w-4" aria-hidden="true" />
            Close
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <SetupStep
            number="01"
            title="Google Cloud Platform"
            steps={[
              "Create least-privilege credentials: a GCP service account, AWS IAM identity, or OpenAI Admin API key.",
              "Copy the project ID, client email, and private key from the service-account JSON.",
              "Choose Google Cloud Platform in Cloud & API Accounts and link the project.",
            ]}
          />
          <SetupStep
            number="02"
            title="Amazon Web Services"
            steps={[
              "Create an AWS IAM identity with Cost Explorer read access and the permissions required for your chosen auto-kill policy.",
              "Keep the AWS account identifier available for the account label.",
              "Choose Amazon Web Services in Cloud & API Accounts and link the account.",
            ]}
          />
          <SetupStep
            number="03"
            title="OpenAI API"
            steps={[
              "Create an OpenAI Admin API key with organization usage access.",
              "Copy the key ID or project ID that should be revoked if the budget is breached.",
              "Choose OpenAI API, enter the label, admin key, and target key ID, then link it.",
            ]}
          />
        </div>

        <div className="border-t border-zinc-800 bg-zinc-900/90 p-6">
          <h3 className="text-sm font-bold text-zinc-100">Create your first monitor</h3>
          <ol className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-3">
            <li><span className="font-bold text-zinc-100">1.</span> Open Budgets and choose New budget.</li>
            <li><span className="font-bold text-zinc-100">2.</span> Select the same provider and linked account.</li>
            <li><span className="font-bold text-zinc-100">3.</span> Set the dollar limit and optionally arm auto-kill.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function SetupStep({ number, title, steps }: { number: string; title: string; steps: string[] }) {
  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-900/90 p-5">
      <p className="font-mono text-xs font-extrabold tracking-wider text-orange-400">{number}</p>
      <h3 className="mt-2 text-sm font-extrabold text-zinc-100">{title}</h3>
      <ol className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="mr-1 font-bold text-zinc-100">{index + 1}.</span>{step}
          </li>
        ))}
      </ol>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition",
        active
          ? "border-b-2 border-orange-500 text-zinc-100"
          : "border-transparent text-zinc-400 hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs font-bold text-zinc-300">
      {children}
    </span>
  );
}

function StatGrid({
  totalSpend,
  budgets,
  armed,
  alerts,
}: {
  totalSpend: number;
  budgets: number;
  armed: number;
  alerts: number;
}) {
  const rows = [
    { label: "Current spend (latest samples)", value: formatCurrency(totalSpend), tone: "text-zinc-200" },
    { label: "Budgets configured", value: String(budgets) },
    { label: "Auto-Kill armed", value: String(armed), tone: armed > 0 ? "text-emerald-400" : "text-zinc-500" },
    { label: "Active alerts (30d shown)", value: String(alerts), tone: alerts > 0 ? "text-orange-400" : "text-zinc-200" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((row) => (
        <div key={row.label} className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{row.label}</p>
          <p className={cn("mt-2 font-mono text-2xl font-extrabold tracking-tight", row.tone ?? "text-zinc-100")}>
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyDashboardState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card border-orange-500/30 bg-orange-500/10 p-8 text-center">
      <h3 className="text-base font-bold text-zinc-100">You're one budget away from auto-pilot</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
        Link a GCP, AWS, or OpenAI account, then create a budget with a threshold, add alert
        emails, and arm the provider-specific hard cap.
      </p>
      <button type="button" onClick={onCreate} className="btn-primary mt-5">
        Create your first budget
      </button>
    </div>
  );
}

function BudgetList({
  budgets,
  onChanged,
}: {
  budgets: DashboardData["budgets"];
  onChanged: () => void;
}) {
  if (budgets.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-800 p-6 text-center font-mono text-sm text-zinc-400">
        No budgets to show.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {budgets.map((budget) => (
        <BudgetCard key={budget.id} budget={budget} onChanged={onChanged} />
      ))}
    </div>
  );
}