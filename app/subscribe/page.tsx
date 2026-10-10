import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getEntitlement, trialDaysRemaining } from "@/lib/subscription";
import type { Profile } from "@/lib/types";
import { SubscribeClient } from "./SubscribeClient";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Start your 30-day free trial or manage your CCAO subscription via Stripe.",
  robots: { index: false, follow: false },
};

export default async function SubscribePage({
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

      <section className="container-page max-w-2xl py-14">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-400">
          Subscription
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {entitlement.entitled ? "Your access is active" : "Subscribe to keep access"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          CCAO is a closed-source SaaS product. New accounts include a 30-day free
          trial. After the trial expires, a paid Stripe subscription is required for
          the dashboard and APIs. Unauthenticated or expired-trial requests are
          redirected here.
        </p>

        {params.canceled === "1" && (
          <p className="mt-6 rounded-md border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            Checkout was canceled. Your trial status is unchanged — pick a plan below
            to subscribe.
          </p>
        )}

        <div className="card mt-8 p-6">
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
              <Link href="/login?next=/subscribe" className="font-semibold text-orange-400 underline">
                Sign in
              </Link>{" "}
              first — checkout links your Stripe customer to your account.
            </p>
          )}

          <div className="mt-6 border-t border-zinc-800 pt-6">
            {user ? (
              <SubscribeClient defaultPlan={defaultPlan} />
            ) : (
              <Link href="/login?next=/subscribe" className="btn-primary w-full">
                Sign in to subscribe
              </Link>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          Billing is processed by Stripe. Manage renewals, cancellation, and payment
          methods in the Stripe customer portal. Subscription renewals, failed
          payments, and cancellations sync via webhooks.
        </p>
      </section>

      <Footer />
    </main>
  );
}
