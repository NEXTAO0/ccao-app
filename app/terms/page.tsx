import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";

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
    <main className="min-h-screen bg-background text-foreground">
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
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {LEGAL_POLICY_VERSION}</p>

        <div className="mt-10 space-y-8 rounded-lg border border-border bg-card p-6 text-sm leading-relaxed text-foreground sm:p-8">
          <Section title="1. Acceptance">
            <p>
              CCAO is open-source software by NEXTAO. Before signing in, you must agree to these
              Terms and acknowledge the Privacy Policy. The app records the policy versions and
              acceptance timestamp against your account; it does not include your IP address or
              device fingerprint in that record. CCAO is not affiliated with Google Cloud, AWS, or
              OpenAI.
            </p>
          </Section>

          <Section title="2. Service description">
            <p>
              CCAO retrieves spend data from configured GCP, AWS, or OpenAI sources, stores
              samples, and can send alerts or attempt a configured provider action after a
              scheduled check detects a threshold breach. The hosted deployment is configured
              for one scheduled check per day. Self-hosted schedules may differ.
            </p>
          </Section>

          <Section title="3. Powerful features require care">
            <p>
              Provider actions can disable GCP project billing, freeze a configured AWS IAM
              user, or revoke a selected OpenAI API key. These actions can disrupt production
              workloads. You are responsible for authorization, least-privilege credentials,
              threshold selection, independent monitoring, and verifying provider-side results.
              Do not rely on CCAO as your only cost-control or incident-response system.
            </p>
          </Section>

          <Section title="4. Accuracy of data">
            <p>
              Cost figures and anomaly indicators depend on provider APIs, exports, sampling
              schedules, configuration, and provider-side delays or corrections. Alerts can be
              late, incomplete, or undelivered, and provider actions can fail or be delayed.
              CCAO is not a real-time monitoring service, financial audit, or guarantee against
              unexpected charges. Verify spend and actions with the provider.
            </p>
          </Section>

          <Section title="5. Acceptable use">
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not use CCAO to circumvent the policies of any supported provider.</li>
              <li>Use only provider accounts and credentials you are authorized to manage.</li>
              <li>Confirm you have permission to send alerts to each email recipient you add.</li>
              <li>
                Do not store other people&apos;s credentials or personal data without
                consent.
              </li>
            </ul>
          </Section>

          <Section title="6. Third-party services">
            <p>
              CCAO may connect to Google Cloud, AWS, OpenAI, Supabase, Vercel, Cloudflare,
              Google Analytics when configured and allowed, and Resend or your SMTP provider. Their services,
              availability, pricing, data handling, and terms are controlled by those providers.
              You are responsible for reviewing applicable terms and charges.
            </p>
          </Section>

          <Section title="7. Warranty & liability">
            <p>
              To the maximum extent permitted by applicable law, the software is provided
              &quot;as is&quot; and without warranties. To the same extent, NEXTAO and contributors
              are not liable for indirect or consequential losses arising from use of the
              software, including provider outages, inaccurate or delayed data, missed alerts,
              failed provider actions, or service disruption. Nothing in these Terms excludes
              liability or rights that applicable law does not allow to be excluded or limited.
            </p>
          </Section>

          <Section title="8. Changes to these terms">
            <p>
              The operator may update these Terms and publish a new policy version. After a
              version change, new sign-in attempts request agreement again and record the new
              version and timestamp. An already active session may remain signed in until it is
              signed out or expires.
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