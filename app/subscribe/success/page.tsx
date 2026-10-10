import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Subscription started",
  robots: { index: false, follow: false },
};

/**
 * Success page is informational only. Fulfillment happens in
 * /api/stripe/webhook (checkout.session.completed), never here.
 */
export default function SubscribeSuccessPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="container-page flex items-center justify-between py-4">
          <Link href="/" aria-label="CCAO home">
            <Logo />
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Go to dashboard
          </Link>
        </div>
      </header>
      <section className="container-page max-w-xl py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">
          Checkout complete
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Confirming your subscription…
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400">
          Stripe is confirming payment via webhook. This usually takes a few seconds.
          If your dashboard still shows the subscribe wall, wait a moment and refresh.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Open dashboard
          </Link>
          <Link href="/subscribe" className="btn-secondary">
            Back to billing
          </Link>
        </div>
      </section>
    </main>
  );
}
