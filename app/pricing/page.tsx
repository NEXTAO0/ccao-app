import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getEntitlement, trialDaysRemaining } from "@/lib/subscription";
import type { Profile } from "@/lib/types";
import { PricingClient } from "./PricingClient";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "CCAO pricing: 30-day free trial, then a paid Paddle subscription (monthly or annual) for full dashboard access.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const defaultPlan = params.plan === "annual" ? "annual" : "monthly";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    try {
      const admin = getSupabaseAdmin();
      const { data } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = (data as Profile | null) ?? null;
    } catch {
      profile = null;
    }
  }

  const entitlement = getEntitlement(profile);
  const daysLeft = trialDaysRemaining(profile);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="container-page flex items-center justify-between py-4">
          <Link href="/" aria-label="CCAO home">
            <Logo />
          </Link>
          <Link href={user ? "/dashboard" : "/login"} className="btn-secondary">
            {user ? "Back to dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="container-page max-w-5xl py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-400">
            Pricing
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start with a 30-day free trial
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            CCAO is a closed-source SaaS product. New accounts include a 30-day free
            trial with full access. After the trial expires, a paid Paddle
            subscription is required for the dashboard and APIs. Expired-trial
            requests are redirected here.
          </p>
        </div>

        {params.canceled === "1" && (
          <p className="mx-auto mt-6 max-w-2xl rounded-md border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            Checkout was canceled. Your trial status is unchanged — pick a plan below
            to subscribe.
          </p>
        )}

        <div className="card mx-auto mt-8 max-w-2xl p-6">
          {user ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">Status</dt>
                <dd className="mt-1 font-semibold text-zinc-100">
                  {entitlement.entitled ? "Active" : "Trial expired / inactive"}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">Plan state</dt>
                <dd className="mt-1 font-mono text-xs text-zinc-300">{entitlement.status}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">Trial</dt>
                <dd className="mt-1 text-zinc-300">
                  {entitlement.trialExpired
                    ? "Expired"
                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-300">
              You are not signed in.{" "}
              <Link href="/login?next=/pricing" className="font-semibold text-orange-400 underline">
                Sign in
              </Link>{" "}
              first — checkout links your Paddle customer to your account.
            </p>
          )}
        </div>

        <div className="mt-10">
          <PricingClient defaultPlan={defaultPlan} signedIn={Boolean(user)} />
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-zinc-500">
          Billing is processed by Paddle as merchant of record, including sales tax,
          VAT, and GST where applicable. Manage renewals, cancellation, and payment
          methods in the Paddle customer portal. See the{" "}
          <Link href="/refund" className="text-orange-400 underline">
            refund policy
          </Link>
          .
        </p>
      </section>

      <Footer />
    </main>
  );
}
