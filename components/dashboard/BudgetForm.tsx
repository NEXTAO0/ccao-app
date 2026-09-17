"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

export function BudgetForm({
  accounts,
  onSaved,
}: {
  accounts: Array<{ id: string; provider: "gcp" | "aws" | "openai"; name: string; project_id: string; api_key_id?: string | null }>;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    provider: "gcp" as "gcp" | "aws" | "openai",
    gcp_account_id: accounts[0]?.id ?? "",
    threshold_amount: "100",
    currency: "USD",
    period: "hourly",
    auto_kill: false,
    alert_emails: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const providerAccounts = accounts.filter((account) => account.provider === form.provider);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);

    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        provider: form.provider,
        gcp_account_id: form.gcp_account_id || null,
        threshold_amount: Number(form.threshold_amount),
        currency: form.currency,
        period: form.period,
        auto_kill: form.auto_kill,
        alert_emails: form.alert_emails
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not create budget.");
      return;
    }
    setDone(true);
    setForm((f) => ({
      ...f,
      name: "",
      threshold_amount: "100",
      alert_emails: "",
      period: "hourly",
    }));
    setTimeout(onSaved, 400);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-orange-400" aria-hidden="true" />
        <h3 className="text-sm font-bold text-zinc-100">New budget</h3>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">
          <Check className="h-4 w-4" aria-hidden="true" />
          Budget created. Cost checks will start sampling it.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Budget name">
          <input
            className={`${inputCls} font-mono`}
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Production GKE cluster"
          />
        </Field>

        <Field label="Provider">
          <select
            className={inputCls}
            value={form.provider}
            onChange={(e) => {
              update("provider", e.target.value as "gcp" | "aws" | "openai");
              update("gcp_account_id", "");
              if (e.target.value === "openai") update("currency", "USD");
            }}
          >
            <option value="gcp">Google Cloud (GCP)</option>
            <option value="aws">Amazon Web Services (AWS)</option>
            <option value="openai">OpenAI</option>
          </select>
        </Field>

        <Field label={form.provider === "gcp" ? "GCP project" : `${form.provider.toUpperCase()} account`}>
          <select
            className={inputCls}
            required={form.provider !== "gcp"}
            value={form.gcp_account_id}
            onChange={(e) => update("gcp_account_id", e.target.value)}
          >
            {providerAccounts.length === 0 && (
              <option value="">No linked {form.provider} account</option>
            )}
            {providerAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.api_key_id || account.project_id})
              </option>
            ))}
          </select>
        </Field>

        <Field label={form.provider === "openai" ? "OpenAI dollar budget limit ($)" : "Threshold amount"}>
          <input
            className={`${inputCls} font-mono text-zinc-200`}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.threshold_amount}
            onChange={(e) => update("threshold_amount", e.target.value)}
          />
        </Field>

        <Field label="Currency">
          <select
            className={inputCls}
            value={form.currency}
            onChange={(e) => update("currency", e.target.value)}
          >
            {["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Compare window">
          <select
            className={inputCls}
            value={form.period}
            onChange={(e) => update("period", e.target.value as "hourly" | "daily" | "monthly")}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>

        <Field label="Alert email addresses (comma-separated)">
          <input
            className={inputCls}
            type="text"
            value={form.alert_emails}
            onChange={(e) => update("alert_emails", e.target.value)}
            placeholder="eng@acme.io, oncall@acme.io"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          checked={form.auto_kill}
          onChange={(e) => update("auto_kill", e.target.checked)}
        />
        <span className="text-sm">
          <span className="font-bold text-zinc-100">Arm Auto-Kill</span>
          <span className="block text-xs text-zinc-400">
            Detach billing from the project when spend reaches the threshold. Enable this only when you want automatic enforcement.
          </span>
        </span>
      </label>

      <div className="flex justify-end">
        <button type="submit" disabled={busy || done} className="btn-primary">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Create budget
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";