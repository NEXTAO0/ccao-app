"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

const consentStorageKey = "ccao-analytics-consent-v1";
const openSettingsEvent = "ccao:open-cookie-settings";
const gaId: string | undefined = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type AnalyticsChoice = "accepted" | "rejected" | null;

export function Analytics() {
  const [choice, setChoice] = useState<AnalyticsChoice>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    let savedChoice: string | null = null;
    try {
      savedChoice = window.localStorage.getItem(consentStorageKey);
    } catch {
      savedChoice = null;
    }

    if (savedChoice === "accepted" || savedChoice === "rejected") {
      setChoice(savedChoice);
      if (gaId) {
        const analyticsWindow = window as typeof window & Record<string, unknown>;
        analyticsWindow[`ga-disable-${gaId}`] = savedChoice === "rejected";
      }
    } else {
      setShowPreferences(true);
    }

    function openPreferences() {
      setShowPreferences(true);
    }

    window.addEventListener(openSettingsEvent, openPreferences);
    return () => window.removeEventListener(openSettingsEvent, openPreferences);
  }, []);

  function saveChoice(nextChoice: Exclude<AnalyticsChoice, null>) {
    if (gaId) {
      const analyticsWindow = window as typeof window & Record<string, unknown>;
      analyticsWindow[`ga-disable-${gaId}`] = nextChoice === "rejected";
    }
    try {
      window.localStorage.setItem(consentStorageKey, nextChoice);
    } catch {
      // Keep the preference for this session when browser storage is unavailable.
    }
    setChoice(nextChoice);
    setShowPreferences(false);
  }

  return (
    <>
      {choice === "accepted" && (
        <>
          <VercelAnalytics />
          {gaId && <GoogleAnalytics id={gaId} />}
        </>
      )}
      {showPreferences && (
        <section
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-lg border border-border bg-background p-5 text-foreground shadow-2xl"
          role="region"
          aria-label="Cookie and analytics preferences"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-sm font-bold">Privacy preferences</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Essential authentication cookies keep your account session active. Optional analytics are off unless you allow them. See our{" "}
                <Link className="font-semibold text-orange-500 underline" href="/cookie-policy">
                  Cookie Policy
                </Link>.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => saveChoice("rejected")}>
                Reject optional
              </button>
              <button type="button" className="btn-primary" onClick={() => saveChoice("accepted")}>
                Allow analytics
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function GoogleAnalytics({ id }: { id: string }) {
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <Script id="ccao-ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { 'send_page_view': false });`}
      </Script>
    </>
  );
}