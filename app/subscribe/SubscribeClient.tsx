"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function SubscribeClient({
  defaultPlan,
}: {
  defaultPlan: "monthly" | "annual";
}) {
  const [plan, setPlan] = useState<"monthly" | "annual">(defaultPlan);
  const [busy, setBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.url) {
        setError(body?.error ?? "Unable to start checkout.");
        setBusy(false);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Checkout is unavailable. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.url) {
        setError(body?.error ?? "Unable to open billing portal.");
        setPortalBusy(false);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError("Billing portal is unavailable. Try again.");
      setPortalBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Billing period">
        {(["monthly", "annual"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={plan === value}
            onClick={() => setPlan(value)}
            className={`rounded-md border px-4 py-3 text-left transition ${
              plan === value
                ? "border-orange-500 bg-orange-500/10 text-zinc-100"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <span className="block font-mono text-sm font-bold capitalize">{value}</span>
            <span className="mt-1 block text-xs">
              {value === "monthly" ? "Billed monthly · cancel anytime" : "Billed annually · best value"}
            </span>
          </button>
        ))}
      </div>

      <button type="button" onClick={startCheckout} disabled={busy} className="btn-primary w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {busy ? "Redirecting to Stripe…" : `Subscribe — ${plan}`}
      </button>

      <button
        type="button"
        onClick={openPortal}
        disabled={portalBusy}
        className="btn-secondary w-full"
      >
        {portalBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {portalBusy ? "Opening portal…" : "Manage existing subscription"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Secure checkout via Stripe. Fulfillment is confirmed by webhook, not this page.
      </p>
    </div>
  );
}
