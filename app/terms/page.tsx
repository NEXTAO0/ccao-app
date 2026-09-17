import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms governing the use of CCAO, the unified multi-cloud and AI budget controller by NEXTAO.",
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  let signedIn = false;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="bg-transparent">
        <div className="container-page flex items-center justify-between py-4">
          <Link href="/" aria-label="CCAO home">
            <Logo />
          </Link>
          <Link href={signedIn ? "/dashboard" : "/"} className="btn-secondary">
            {signedIn ? "Back to Dashboard" : "Go to App"}
          </Link>
        </div>
      </header>

      <article className="container-page max-w-3xl py-16">
        <p className="section-title mb-3">Terms of Service</p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated: September 8, 2026</p>

        <div className="mt-10 space-y-8 rounded-lg border border-zinc-800 bg-zinc-900/80 p-6 text-sm leading-relaxed text-zinc-300 sm:p-8">
          <Section title="1. Acceptance">
            <p>
              By using CCAO (&quot;Cloud Controller by NEXTAO&quot;), you agree to these terms.
              NEXTAO provides this software as an open-source project; it is not officially
              affiliated with Google Cloud, AWS, or OpenAI.
            </p>
          </Section>

          <Section title="2. Service description">
            <p>
              CCAO monitors GCP, AWS, and OpenAI spending, alerts you to budget breaches and
              cost anomalies, and invokes the provider-specific hard-cap action when you enable
              it and an account exceeds its configured threshold.
            </p>
          </Section>

          <Section title="3. Powerful features require care">
            <p>
              The auto-kill feature can disrupt production services by disabling their
              billing. You are solely responsible for enabling it, choosing thresholds, and
              monitoring its behavior. NEXTAO and the software maintainers accept no
              liability for downtime, data loss, failed charges, or service interruption
              caused directly or indirectly by CCAO, including actions taken by the
              auto-kill mechanism.
            </p>
          </Section>

          <Section title="4. Accuracy of data">
            <p>
              Cost figures are derived from provider APIs and exports, which are subject to
              each provider&apos;s delays, corrections, and currency conversions. CCAO presents
              data &quot;as is&quot; and is not a financial audit tool.
            </p>
          </Section>

          <Section title="5. Acceptable use">
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not use CCAO to circumvent the policies of any supported provider.</li>
              <li>Do not exceed the fair-use limits of free-tier providers you integrate.</li>
              <li>
                Do not store other people&apos;s credentials or personal data without
                consent.
              </li>
            </ul>
          </Section>

          <Section title="6. Third-party services">
            <p>
              CCAO integrates with Google Cloud, AWS, OpenAI, Supabase, Resend (or your SMTP
              provider), and infrastructure providers. Your use of those services remains
              subject to their respective terms.
            </p>
          </Section>

          <Section title="7. Warranty & liability">
            <p>
              The software is provided &quot;as is&quot;, without warranty of any kind,
              express or implied. In no event shall NEXTAO or contributors be liable for any
              direct, indirect, incidental, special, consequential, or punitive damages.
              Where liability cannot be excluded, it is limited to the amount you paid for
              the software (zero in the case of the free tier).
            </p>
          </Section>

          <Section title="8. Changes to these terms">
            <p>
              We may update these terms; material changes will be announced on the project
              site. Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="9. License">
            <p>
              The source code is released under the MIT License. See the repository&apos;s
              LICENSE file for details.
            </p>
          </Section>
        </div>
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