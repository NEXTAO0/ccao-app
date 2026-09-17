"use client";

import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

// [MANUAL_SETUP_REQUIRED]: Set NEXT_PUBLIC_GA_MEASUREMENT_ID to a real GA4 property id
// (e.g. G-XXXXXXXXXX) to enable Google Analytics 4.
const gaId: string | undefined = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// [MANUAL_SETUP_REQUIRED]: Set NEXT_PUBLIC_VERCEL_ANALYTICS=1 to enable Vercel's
// privacy-friendly analytics.
const vercelEnabled: boolean = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "1";

/**
 * Lightweight analytics layer: loads Vercel Analytics and/or Google Analytics 4
 * depending on env flags. Renders nothing when both are disabled so a fresh
 * deployment is always privacy-clean by default.
 */
export function Analytics() {
  return (
    <>
      {vercelEnabled && <VercelAnalytics />}
      {gaId && <GoogleAnalytics id={gaId} />}
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