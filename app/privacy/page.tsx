import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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
        <p className="section-title mb-3">Privacy Policy</p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Last updated: September 8, 2026
        </p>

        <div className="prose-sm mt-10 rounded-lg border border-zinc-800 bg-zinc-900/80 p-6 text-zinc-300 sm:p-8">
          <Section title="1. Overview">
            <p>
              CCAO (&quot;by NEXTAO&quot;) is an open-source tool that helps you monitor and control
              cloud and AI spending across supported providers. This policy
              describes what information we process, why, and the choices you have. NEXTAO
              is not affiliated with Google Cloud, AWS, or OpenAI; all third-party trademarks
              belong to their owners.
            </p>
          </Section>

          <Section title="2. Data we process">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account data:</strong> Email address and profile information from
                your Supabase authentication session (Google OAuth or email magic link).
              </li>
              <li>
                <strong>Cloud and AI connection metadata:</strong> The GCP projects, AWS
                accounts, and OpenAI projects or key IDs you link, plus encrypted credentials
                when you choose to store them.
              </li>
              <li>
                <strong>Cost observations:</strong> Hourly or daily spend samples pulled from
                provider usage APIs and billing exports, stored only to power your spend history
                and anomaly detection.
              </li>
              <li>
                <strong>Alert profiles:</strong> Budget thresholds, auto-kill toggles, and
                the alert email addresses you configure.
              </li>
            </ul>
          </Section>

          <Section title="3. Credential handling">
            <p>
              Cloud and AI credentials are <strong>encrypted at rest</strong> using
              AES-256-GCM with a key ({" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-200">CRYPTO_SECRET</code> ) that
              you control, and are never written to logs, never committed to the repository,
              and never exposed through API responses. If you prefer, you can use shared
              environment credentials instead of storing keys per project.
            </p>
          </Section>

          <Section title="4. How we use data">
            <ul className="list-disc space-y-2 pl-5">
              <li>Fetching and displaying your real-time cloud and AI spend.</li>
              <li>
                Enforcing the budget cap you configure, including detaching billing from a
                project when you have enabled the auto-kill feature.
              </li>
              <li>Detecting cost anomalies and sending you the email alerts you opted into.</li>
              <li>Improving the product through aggregated, de-identified metrics.</li>
            </ul>
          </Section>

          <Section title="5. Sharing">
            <p>
              We do not sell your data. Data is shared only with the service providers that
              run CCAO: Supabase (hosted database/auth), Resend or your SMTP provider
              (email delivery), and Vercel (hosting). Each provider is bound by its own data-processing
              terms. When you self-host, <em>you</em> are the data controller.
            </p>
          </Section>

          <Section title="6. Retention & deletion">
            <p>
                Cost logs are retained while you keep them; you can delete any cloud or AI account,
              budget, or alert log from your dashboard. Deleting your account removes your
              associated records. Email alert history in third-party providers follows their
              retention policies.
            </p>
          </Section>

          <Section title="7. Your choices">
            <ul className="list-disc space-y-2 pl-5">
              <li>Turn auto-kill off at any time so CCAO never detaches billing.</li>
              <li>Use shared credentials instead of storing per-project keys.</li>
              <li>Opt out of analytics by leaving NEXT_PUBLIC_GA_MEASUREMENT_ID unset.</li>
              <li>Request export or deletion of your data at any time via the dashboard.</li>
            </ul>
          </Section>

          <Section title="8. Contact">
            <p>
              Questions about this policy or your data? Open an issue in the CCAO repository
              or contact NEXTAO at the address listed on the project page.
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