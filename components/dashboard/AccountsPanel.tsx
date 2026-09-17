"use client";

import { useState } from "react";
import { AlertCircle, Check, Cloud, KeyRound, Loader2, Plus } from "lucide-react";

interface Account {
  id: string;
  provider: "gcp" | "aws" | "openai";
  name: string;
  project_id: string;
  api_key_id?: string | null;
  billing_account_id: string;
  created_at: string;
}

export function AccountsPanel({
  accounts,
  onChanged,
}: {
  accounts: Account[];
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="space-y-6" aria-label="Cloud and API accounts">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-100">Linked cloud and API accounts</h2>
          <p className="text-sm text-zinc-400">
            Link cloud projects or API accounts to query spend and enforce budgets.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? "Close form" : "Link a project"}
        </button>
      </div>

      {showForm && <AddProjectForm onSaved={() => { setShowForm(false); onChanged(); }} />}

      {accounts.length === 0 ? (
        <div className="card p-10 text-center">
          <Cloud className="mx-auto h-8 w-8 text-zinc-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-zinc-200">No cloud or API accounts linked</p>
          <p className="mt-1 text-sm text-zinc-400">
            Link an account, or rely on your configured environment credentials.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <li key={account.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30">
                    <Cloud className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{account.name}</p>
                    <p className="font-mono text-xs text-zinc-400">
                      {account.provider === "openai" ? account.api_key_id : account.project_id}
                    </p>
                  </div>
                </div>
                <span className="chip">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                  active
                </span>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
                <p>
                  Provider: {account.provider.toUpperCase()}
                </p>
                <p>
                  Account ID: {" "}
                  <span className="font-mono">
                    {account.api_key_id || account.project_id || "configured by environment"}
                  </span>
                </p>
                <p>
                  Linked:{" "}
                  {new Date(account.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddProjectForm({
  onSaved,
}: {
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider: "gcp" as "gcp" | "aws" | "openai",
    name: "",
    project_id: "",
    billing_account_id: "",
    client_email: "",
    private_key: "",
    admin_api_key: "",
    api_key_id: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not link project.");
      return;
    }
    setDone(true);
    setTimeout(onSaved, 400);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-orange-400" aria-hidden="true" />
        <h3 className="text-sm font-bold text-zinc-100">Link a cloud or API account</h3>
      </div>

      {form.provider === "gcp" && <p className="rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-xs leading-relaxed text-orange-400">
        <strong>Service-account roles:</strong> Billing Account Viewer, Project Billing
        Manager (for auto-kill), BigQuery Data Viewer. Keys are encrypted at rest with your
        CRYPTO_SECRET. See the setup guide for the exact steps.
      </p>}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">
          <Check className="h-4 w-4" aria-hidden="true" />
          Project linked and credentials encrypted.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Provider">
          <select className={inputCls} value={form.provider} onChange={(e) => update("provider", e.target.value as typeof form.provider)}>
            <option value="gcp">Google Cloud Platform (GCP)</option>
            <option value="aws">Amazon Web Services (AWS)</option>
            <option value="openai">OpenAI API</option>
          </select>
        </Field>
        <Field label={form.provider === "openai" ? "Account/Key Label" : "Display name"}>
          <input className={inputCls} type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder={form.provider === "openai" ? "My OpenAI Production Key" : "Production"} />
        </Field>
        {form.provider === "openai" ? (
          <>
            <Field label="Target API Key ID / Project ID to revoke on breach">
              <input className={inputCls} type="text" required value={form.api_key_id} onChange={(e) => update("api_key_id", e.target.value)} placeholder="key_... or proj_..." />
            </Field>
            <Field label="Admin API Key">
              <input className={inputCls} type="password" autoComplete="off" required value={form.admin_api_key} onChange={(e) => update("admin_api_key", e.target.value)} placeholder="sk-admin-..." />
            </Field>
          </>
        ) : (
          <>
            <Field label={form.provider === "aws" ? "AWS account ID" : "GCP project ID"}>
              <input className={inputCls} type="text" required={form.provider === "gcp"} value={form.project_id} onChange={(e) => update("project_id", e.target.value)} placeholder={form.provider === "aws" ? "123456789012" : "my-production-project"} />
            </Field>
            {form.provider === "gcp" && <>
              <Field label="Billing account ID (optional)">
                <input className={inputCls} type="text" value={form.billing_account_id} onChange={(e) => update("billing_account_id", e.target.value)} placeholder="billingAccounts/XXXXXX-XXXXXX-XXXXXX" />
              </Field>
              <Field label="Service account email (client_email)">
                <input className={inputCls} type="text" autoComplete="off" required value={form.client_email} onChange={(e) => update("client_email", e.target.value)} placeholder="ccao-controller@…iam.gserviceaccount.com" />
              </Field>
            </>}
          </>
        )}
      </div>

      {form.provider === "gcp" && <Field label="Private key (private_key PEM)">
        <textarea
          className={`${inputCls} h-24 resize-y font-mono text-xs`}
          autoComplete="off"
          spellCheck={false}
          required
          value={form.private_key}
          onChange={(e) => update("private_key", e.target.value)}
          placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQ…&#10;-----END PRIVATE KEY-----"
        />
      </Field>}

      <div className="flex justify-end">
        <button type="submit" disabled={busy || done} className="btn-primary">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          )}
          Link account
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
  "w-full rounded-md border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono";