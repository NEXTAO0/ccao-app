"use client";

import { useEffect, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Check, Loader2 } from "lucide-react";

const planIncludes = [
  "Budgets and connected accounts, subject to provider limits",
  "Auto-Kill hard cap toggle",
  "Anomaly spike detection",
  "Email alerts",
  "Spend sample dashboard",
  "Priority email support",
];

export function PricingClient({
  defaultPlan,
  signedIn,
}: {
  defaultPlan: "monthly" | "annual";
  signedIn: boolean;
}) {
  const [plan, setPlan] = useState<"monthly" | "annual">(defaultPlan);
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [paddleReady, setPaddleReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initializePaddle({
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      eventCallback(event) {
        if (event.name === "checkout.completed") {
          window.location.assign("/pricing/success");
        }
      },
    })
      .then((instance) => {
        if (!cancelled && instance) {
          setPaddle(instance);
          setPaddleReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Billing is unavailable right now. Please try again later.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout(selected: "monthly" | "annual") {
    setPlan(selected);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const body = (await response.json().catch(() => null)) as {
        transactionId?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.transactionId) {
        setError(body?.error ?? "Unable to start checkout.");
        setBusy(false);
        return;
      }
      if (!paddle) {
        setError("Checkout is still loading. Please wait a moment and try again.");
        setBusy(false);
        return;
      }
      paddle.Checkout.open({
        transactionId: body.transactionId,
        settings: { successUrl: `${window.location.origin}/pricing/success` },
      });
      setBusy(false);
    } catch {
      setError("Checkout is unavailable. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/paddle/portal", { method: "POST" });
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
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-md border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
        <div className="card relative overflow-hidden border-orange-500/30 p-7">
          <span className="absolute right-6 top-6 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-mono text-xs font-bold text-orange-400">
            Recommended
          </span>
          <h3 className="text-lg font-extrabold text-slate-100">Pro Monthly</h3>
          <p className="mt-2 text-sm text-slate-300">
            Full dashboard access billed monthly. Cancel anytime from the customer portal.
          </p>
          <ul className="mt-6 space-y-3">
            {planIncludes.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void startCheckout("monthly")}
            disabled={busy || !signedIn || !paddleReady}
            className="btn-primary mt-8 w-full"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Start 30-day trial — monthly
          </button>
        </div>

        <div className="card flex flex-col p-8">
          <h3 className="text-lg font-extrabold text-slate-100">Pro Annual</h3>
          <p className="mt-2 text-sm text-slate-300">
            Full dashboard access billed annually. Best value for continuous protection.
          </p>
          <ul className="mt-6 space-y-3">
            {planIncludes.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void startCheckout("annual")}
            disabled={busy || !signedIn || !paddleReady}
            className="btn-secondary mt-8 w-full"
            aria-label="Start annual trial checkout"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Start 30-day trial — annual
          </button>
        </div>
      </div>

      {!paddleReady && (
        <p className="text-center text-xs text-zinc-500">Loading secure Paddle checkout…</p>
      )}

      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={openPortal}
          disabled={portalBusy || !signedIn}
          className="btn-secondary w-full"
        >
          {portalBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {portalBusy ? "Opening portal…" : "Manage existing subscription"}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          Secure checkout via Paddle (merchant of record). Fulfillment is confirmed by
          webhook, not this page. Prices are localized at checkout.
        </p>
      </div>
    </div>
  );
}
