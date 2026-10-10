"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileChallenge({
  onToken,
  onResetReady,
}: {
  onToken: (token: string) => void;
  onResetReady: (reset: () => void) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onResetReadyRef = useRef(onResetReady);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  onTokenRef.current = onToken;
  onResetReadyRef.current = onResetReady;

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "error-callback": () => onTokenRef.current(""),
      theme: "auto",
    });
    widgetIdRef.current = widgetId;
    onResetReadyRef.current(() => window.turnstile?.reset(widgetId));

    return () => {
      window.turnstile?.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [scriptReady]);

  if (!siteKey) {
    return (
      <p role="status" className="rounded-md border border-orange-700 bg-orange-50 p-3 text-sm text-orange-950 dark:bg-orange-950 dark:text-orange-100">
        Sign-in protection is not configured. Contact the site operator.
      </p>
    );
  }

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      <div ref={containerRef} aria-label="CAPTCHA challenge" />
      {scriptFailed && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300" role="alert">Sign-in protection could not load. Check your connection and reload.</p>}
      {!scriptReady && <p className="mt-2 text-xs text-muted-foreground" role="status">Loading sign-in protection…</p>}
    </div>
  );
}