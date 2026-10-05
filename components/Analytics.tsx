"use client";

import Script from "next/script";

// [MANUAL_SETUP_REQUIRED]: Set NEXT_PUBLIC_GA_MEASUREMENT_ID to a real GA4 property id
// (e.g. G-XXXXXXXXXX) to enable Google Analytics 4.
const gaId: string | undefined = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads Google Analytics 4 when configured. Vercel Analytics is rendered by
 * the Next.js integration in the root layout.
 */
export function Analytics() {
  return (
    <>
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