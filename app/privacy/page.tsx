import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How CCAO by NEXTAO handles your cloud credentials, AI keys, usage data, and alert emails.",
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
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
        <p className="section-title mb-3">Privacy Policy</p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {LEGAL_POLICY_VERSION}</p>

        <div className="prose-sm mt-10 rounded-lg border border-border bg-card p-6 text-foreground sm:p-8">
          <Section title="1. Overview">
            <p>
              CCAO (&quot;by NEXTAO&quot;) is an open-source tool that helps you monitor and control
              cloud and AI spending across supported providers. This policy explains what the
              application processes and the choices available to you. Google Cloud, AWS, OpenAI,
              Supabase, Vercel, and other third parties are independent providers; CCAO is not
              affiliated with them.
            </p>
          </Section>

          <Section title="2. Data we process">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account and consent data:</strong> Email address and Supabase user ID.
                Supabase or your OAuth provider may separately process profile metadata under
                their own policies; CCAO does not use name or avatar fields. After successful sign-in,
                CCAO stores accepted Terms and Privacy Policy version identifiers and a timestamp.
                This consent record does not include an IP address or device fingerprint.
              </li>
              <li>
                <strong>Connection data:</strong> Account labels and identifiers you provide for
                GCP, AWS, or OpenAI, and credentials you choose to submit for supported features.
                Avoid submitting unrelated personal information or credentials for accounts you
                do not control.
              </li>
              <li>
                <strong>Budget and activity data:</strong> Budget names, thresholds, currency,
                comparison window, automatic-action setting, alert recipient addresses and the
                timestamp when permission for those recipients was confirmed, spend samples, and
                alert records generated while the app runs.
              </li>
              <li>
                <strong>Session and preferences:</strong> Supabase authentication cookies and
                browser local-storage values for your theme and analytics choice. See the{" "}
                <Link href="/cookie-policy" className="font-semibold text-orange-600 underline">Cookie Policy</Link>.
              </li>
              <li>
                <strong>Abuse prevention:</strong> API rate-limit counters keyed by HMAC hashes
                of the caller&apos;s network address and, for signed-in requests, account ID.
                Counters are expired and cleaned opportunistically; raw addresses are not stored
                in the counter table. Hosting providers may maintain separate request logs under
                their own retention policies.
              </li>
            </ul>
          </Section>

          <Section title="3. Credential handling">
            <p>
              Credentials submitted through the app are encrypted server-side with AES-256-GCM
              using the deployment&apos;s configured <code>CRYPTO_SECRET</code> before storage.
              Account read endpoints are designed to omit stored secret fields. Encryption does
              not protect against a compromised deployment or mismanaged encryption key; protect
              the deployment secrets and use least-privilege provider credentials.
            </p>
          </Section>

          <Section title="4. How we use data">
            <ul className="list-disc space-y-2 pl-5">
              <li>Authenticate your account and display linked accounts, budgets, and spend samples.</li>
              <li>Run scheduled provider checks and attempt actions you explicitly enable.</li>
              <li>Generate alert records and send notifications to configured recipients.</li>
              <li>Run optional analytics only after you allow them in Cookie Settings.</li>
            </ul>
          </Section>

          <Section title="5. Sharing">
            <p>
              CCAO does not sell personal data or use it for advertising. Data is processed by
              the deployment&apos;s hosting and database providers (Vercel and Supabase in the
              hosted configuration), connected provider APIs (Google Cloud, AWS, and OpenAI), and
              configured email provider (Resend or your SMTP provider), and Cloudflare for
              CAPTCHA verification. Vercel Analytics and Google Analytics, when configured, load
              only after optional analytics consent.
              Providers process data under their own terms and retention practices. For a
              self-hosted deployment, its operator chooses these providers and is responsible for
              their configuration.
            </p>
          </Section>

          <Section title="6. Retention and deletion">
            <p>
              Account, connection, budget, spend, alert, and consent records are kept in the
              deployment database until you delete them or delete your account. The Delete Account
              action requests deletion of your Supabase auth user; related rows are removed when
              the database schema configures them to cascade. This does not delete provider-side
              billing history, delivered email, service-provider logs, or backups, which may have
              separate retention periods. Unlinking a connection removes its app record; it does
              not revoke credentials in the provider console.
            </p>
          </Section>

          <Section title="7. Your choices">
            <ul className="list-disc space-y-2 pl-5">
              <li>Unlink accounts, change budgets, or delete your account in the dashboard.</li>
              <li>Disable automatic actions and use least-privilege or shared environment credentials.</li>
              <li>Allow or reject optional analytics, and change that choice through Cookie Settings.</li>
              <li>Request privacy assistance from the deployment operator using its private contact channel.</li>
            </ul>
          </Section>

          <Section title="8. Contact">
            <p>
              Contact the operator of the CCAO deployment for privacy questions or requests.
              Operators should publish a private contact channel before offering the service and
              should not ask users to post personal information or credentials in a public issue.
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
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}