"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Github, KeyRound, Loader2, Mail } from "lucide-react";
import { LEGAL_POLICY_VERSION } from "@/lib/legal";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const disposableEmailDomains = new Set([
  "10minutemail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakemail.net",
  "getnada.com",
  "guerrillamail.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
]);

function isDisposableEmail(emailAddress: string) {
  const domain = emailAddress.trim().toLowerCase().split("@").pop() ?? "";
  return (
    disposableEmailDomains.has(domain) ||
    /(^|\.)(10minutemail|disposable|fakemail|guerrillamail|mailinator|tempmail|throwaway|trashmail)(\.|$)/.test(domain)
  );
}

export function LoginPanel({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sendingMagic, setSendingMagic] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", next);
  callbackUrl.searchParams.set("legalVersion", LEGAL_POLICY_VERSION);

  async function registerLegalConsent() {
    try {
      const response = await fetch("/api/legal-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, version: LEGAL_POLICY_VERSION }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not verify policy acceptance. Please try again.");
        return false;
      }
      return true;
    } catch {
      setError("Could not verify policy acceptance. Check your connection and try again.");
      return false;
    }
  }

  async function signInWithGitHub() {
    if (!acceptedTerms) {
      setError("Agree to the Terms of Service and acknowledge the Privacy Policy to continue.");
      return;
    }
    // [MANUAL_SETUP_REQUIRED]: Enable GitHub provider in Supabase → Authentication →
    // Providers, and set the callback URL to /auth/callback (see lib/supabaseServer).
    const supabase = getSupabaseBrowserClient();
    setGithubBusy(true);
    setError(null);
    if (!(await registerLegalConsent())) {
      setGithubBusy(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
    setGithubBusy(false);
    if (error) setError(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (isDisposableEmail(email)) {
      setError("Temporary or disposable email addresses are not permitted.");
      return;
    }
    if (!acceptedTerms) {
      setError("Agree to the Terms of Service and acknowledge the Privacy Policy to continue.");
      return;
    }
    // [MANUAL_SETUP_REQUIRED]: Enable the Email magic-link provider in Supabase →
    // Authentication → Providers (Email), and customise the redirect URL if needed.
    const supabase = getSupabaseBrowserClient();
    setSendingMagic(true);
    setError(null);
    if (!(await registerLegalConsent())) {
      setSendingMagic(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });
    setSendingMagic(false);
    if (error) {
      const authError = error as { code?: string; message?: string; status?: number };
      const isRateLimited =
        authError.status === 429 ||
        authError.code?.toLowerCase() === "rate_limit" ||
        authError.message?.toLowerCase().includes("rate limit");
      setError(
        isRateLimited
          ? "Too many requests. Please wait a few minutes before trying again."
          : authError.message ?? "Unable to send a sign-in link. Please try again."
      );
    } else {
      setMagicSent(true);
      router.refresh();
    }
  }

  if (magicSent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 ring-1 ring-orange-300">
          <Mail className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-black dark:text-white">Check your inbox</h2>
        <p className="mt-2 text-sm text-black/80 dark:text-white/80">
          We emailed a magic link to <strong>{email}</strong>. Opening it signs you in.
        </p>
        <button type="button" onClick={() => setMagicSent(false)} className="btn-secondary mt-6 w-full">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-900 ring-1 ring-orange-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" aria-hidden="true" />
          {error}
        </p>
      )}

      <label className="flex items-start gap-3 text-sm leading-5 text-foreground">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
          aria-required="true"
        />
        <span>
          I agree to the <Link href="/terms" className="font-semibold text-orange-600 underline">Terms of Service</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-orange-600 underline">Privacy Policy</Link>.
        </span>
      </label>

      <button
        type="button"
        onClick={signInWithGitHub}
        disabled={githubBusy}
        className="btn-secondary w-full"
      >
        {githubBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Github className="h-4 w-4" aria-hidden="true" />
        )}
        Continue with GitHub
      </button>

      <div className="flex items-center gap-3" role="separator" aria-hidden="true">
        <span className="h-px flex-1 bg-[#7c2d12]" />
        <span className="text-xs font-medium uppercase tracking-wider text-black dark:text-white">
          or
        </span>
        <span className="h-px flex-1 bg-[#7c2d12]" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label htmlFor="email" className="block text-sm font-semibold text-black dark:text-white">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c2d12]" aria-hidden="true" />
          <input
            id="email"
            type="email"
            required
            suppressHydrationWarning
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourdomain.com"
            autoComplete="email"
            className="w-full rounded-xl border border-[#7c2d12] bg-white py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-black/60 focus:border-[#7c2d12] focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-[#111111] dark:text-white dark:placeholder:text-white/60"
          />
        </div>
        <button type="submit" disabled={sendingMagic} className="btn-primary w-full">
          {sendingMagic ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Continue with Email
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-black/70 dark:text-white/70">
        Entering your email sends a secure sign-in link.
      </p>
    </div>
  );
}
