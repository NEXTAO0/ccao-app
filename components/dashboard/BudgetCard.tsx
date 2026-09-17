"use client";

import { useState } from "react";
import {
  Loader2,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { Budget } from "@/lib/types";
import { cn, formatCurrency, formatDateTime, percentUsed } from "@/lib/utils";

export function BudgetCard({
  budget,
  onChanged,
}: {
  budget: Budget & { latest_spend?: { amount: number; currency: string; window: string; sampledAt: string } | null };
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"kill" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spend = budget.latest_spend?.amount ?? null;
  const used = spend != null ? percentUsed(spend, Number(budget.threshold_amount)) : 0;
  const breached = spend != null && spend >= Number(budget.threshold_amount);

  async function toggleAutoKill() {
    setBusy("kill");
    setError(null);
    const res = await fetch(`/api/budgets/${budget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_kill: !budget.auto_kill }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Failed to update budget.");
      return;
    }
    onChanged();
  }

  async function deleteBudget() {
    if (!window.confirm(`Delete budget "${budget.name}"? This won't change your cloud or AI account.`)) {
      return;
    }
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/budgets/${budget.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Failed to delete budget.");
      return;
    }
    onChanged();
  }

  return (
    <div className={cn("card bg-zinc-900/90 p-5", breached && "border-orange-500/30 ring-1 ring-orange-500/10")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-zinc-100">{budget.name}</h3>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {budget.period}
            </span>
            {breached && (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-800 bg-rose-950/50 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-300">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                Breached
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Threshold <span className="font-mono text-zinc-200">{formatCurrency(Number(budget.threshold_amount), budget.currency)}</span>
            {budget.latest_spend?.sampledAt && (
              <span className="font-mono"> · sampled {formatDateTime(budget.latest_spend.sampledAt)}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className={cn("relative inline-flex cursor-pointer items-center", busy === "kill" && "opacity-60")}>
            <input
              type="checkbox"
              checked={budget.auto_kill}
              onChange={toggleAutoKill}
              disabled={busy !== null}
              className="peer sr-only"
              aria-label={`Toggle auto-kill for ${budget.name}`}
            />
            <span
              className={cn(
                "h-7 w-12 rounded-full transition",
                budget.auto_kill ? "bg-emerald-500" : "bg-zinc-700"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "absolute left-1 top-1 h-5 w-5 rounded-full bg-zinc-200 shadow transition",
                budget.auto_kill && "translate-x-5"
              )}
              aria-hidden="true"
            />
          </label>
          <span className="hidden items-center gap-1 font-mono text-xs font-semibold text-zinc-400 sm:inline-flex">
            {budget.auto_kill ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
            )}
            {budget.auto_kill ? "Auto-Kill armed" : "Alert only"}
          </span>

          <button
            type="button"
            onClick={deleteBudget}
            disabled={busy !== null}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-400"
            aria-label={`Delete budget ${budget.name}`}
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
          <span>
            Current{" "}
              <strong className="font-mono text-zinc-200">
              {spend != null ? formatCurrency(spend, budget.currency) : "no sample yet"}
            </strong>
          </span>
          <span className="font-mono">{spend != null ? `${used}% of budget` : "N/A"}</span>
        </div>
        <div
          className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${used}% of ${budget.name} budget used`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              breached
                ? "bg-orange-500"
                : used >= 80
                  ? "bg-amber-400"
                  : "bg-orange-500"
            )}
            style={{ width: `${used}%` }}
          />
        </div>
      </div>

      {budget.alert_emails.length > 0 && (
        <p className="mt-3 text-[11px] text-zinc-400">
          Alerts to: {budget.alert_emails.join(", ")}
        </p>
      )}
      {error && <p className="mt-2 text-xs font-medium text-rose-400">{error}</p>}
    </div>
  );
}