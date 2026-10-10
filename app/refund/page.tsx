import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Refund Policy",
  description:
    "CCAO refund and cancellation policy: 30-day free trial, Paddle merchant-of-record billing, and how to request a refund.",
  alternates: { canonical: "/refund" },
  robots: { index: true, follow: true },
};

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="bg-transparent">
        <div className="container-page flex items-center justify-between py-4">
          <Link href="/" aria-label="CCAO home">
            <Logo />
          </Link>
          <Link href="/pricing" className="btn-secondary">
            View pricing
          </Link>
        </div>
      </header>

      <article className="container-page max-w-3xl py-16">
        <p className="section-title mb-3">Refund Policy</p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Refund Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: 2026-10-11 · Seller of record: Paddle.com Market Limited
        </p>

        <div className="mt-10 space-y-8 rounded-lg border border-border bg-card p-6 text-sm leading-relaxed text-foreground sm:p-8">
          <Section title="1. Merchant of record">
            <p>
              CCAO subscriptions are sold by Paddle.com Market Limited acting as
              merchant of record. Paddle processes your payment, handles applicable
              sales tax, VAT, and GST, and issues your invoice. Charges for CCAO
              appear under a Paddle descriptor on your statement.
            </p>
          </Section>

          <Section title="2. 30-day free trial">
            <p>
              Every new account includes a 30-day free trial with full access. No
              payment method is charged during the trial. If you do not subscribe
              before the trial ends, access to the dashboard and APIs is suspended
              until you subscribe on the{" "}
              <Link href="/pricing" className="font-semibold text-orange-600 underline">
                pricing page
              </Link>
              . The trial itself is free and therefore not refundable.
            </p>
          </Section>

          <Section title="3. Subscription billing">
            <p>
              Monthly plans renew each month and annual plans renew each year until
              canceled. You can cancel at any time from the Paddle customer portal
              (linked on the pricing page). Cancellation stops future renewals;
              your access continues until the end of the current paid period.
            </p>
          </Section>

          <Section title="4. Refund eligibility">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Duplicate charges for the same billing period are refunded in full
                once verified.
              </li>
              <li>
                Charges made after a timely cancellation (before the renewal date)
                are refunded for the unused period once verified.
              </li>
              <li>
                All other refund requests are reviewed case by case, considering
                account usage, the timing of the request, and applicable consumer
                protection law.
              </li>
            </ul>
          </Section>

          <Section title="5. How to request a refund">
            <p>
              Contact the operator of your CCAO deployment through its private
              support channel with the account email, the Paddle invoice or
              transaction id, the charge date and amount, and the reason for the
              request. Refund requests should be made within 30 days of the charge.
              Approved refunds are issued to the original payment method; processing
              times depend on your bank or card provider.
            </p>
          </Section>

          <Section title="6. Chargebacks and unpaid invoices">
            <p>
              If a payment fails or is disputed, Paddle retries collection and may
              notify you. While an invoice is past due, subscription access may be
              suspended until payment succeeds. Filing a chargeback instead of
              requesting a refund may delay resolution; please contact support
              first so the charge can be reviewed.
            </p>
          </Section>

          <Section title="7. Changes to this policy">
            <p>
              The operator may update this policy. Material changes are published
              on this page with a new revision date. Continued use of a paid
              subscription after changes take effect constitutes acceptance of the
              updated policy, subject to applicable law.
            </p>
          </Section>
        </div>

        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Questions about a charge? Start at{" "}
          <Link href="/pricing" className="text-orange-600 underline">
            pricing
          </Link>{" "}
          to manage your subscription, or contact support through the deployment
          operator&apos;s private channel. Do not post payment details publicly.
        </p>
      </article>

      <Footer />
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-zinc-100"><span className="mr-2 text-orange-500">//</span>{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
