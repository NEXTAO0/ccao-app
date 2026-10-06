import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

export const metadata = {
  title: "Cookie Policy",
  description: "How CCAO uses authentication cookies and browser storage.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="bg-transparent">
        <div className="container-page flex items-center justify-between py-4">
          <Link href="/" aria-label="CCAO home">
            <Logo />
          </Link>
          <Link href="/" className="btn-secondary">Go to App</Link>
        </div>
      </header>

      <article className="container-page max-w-3xl py-16">
        <p className="section-title mb-3">Cookie Policy</p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Cookies and browser storage
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: October 6, 2026</p>

        <div className="mt-10 space-y-8 rounded-lg border border-border bg-card p-6 text-sm leading-relaxed text-foreground sm:p-8">
          <section>
            <h2 className="text-lg font-bold">Essential authentication cookies</h2>
            <p className="mt-2">
              Supabase authentication uses first-party session cookies so signed-in users can access their accounts. These are necessary for authentication and security and cannot be disabled while using signed-in features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Browser preferences</h2>
            <p className="mt-2">
              CCAO stores your selected light or dark theme and your analytics choice in browser local storage. These are browser storage entries, not cookies. They remember your preferences and are not used for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Optional analytics</h2>
            <p className="mt-2">
              Vercel Analytics is disabled until you allow optional analytics. Google Analytics 4 may also load after you allow it, but only when the site operator has configured it. Analytics providers may process usage and technical information under their own policies. Rejecting optional analytics does not affect sign-in or core app features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Change your choice</h2>
            <p className="mt-2">
              Use <CookieSettingsButton /> in the footer to allow or reject optional analytics at any time. You can also clear CCAO site data in your browser settings. Clearing it removes the saved theme and consent choice; the choice prompt will appear again.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Self-hosted deployments</h2>
            <p className="mt-2">
              If you run your own CCAO deployment, its operator controls which analytics integrations are configured and is responsible for updating this policy and honoring applicable requirements.
            </p>
          </section>

          <p>
            For information about account and budget data, see the <Link href="/privacy" className="font-semibold text-orange-600 underline">Privacy Policy</Link>.
          </p>
        </div>
      </article>

      <Footer />
    </main>
  );
}