"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What happens when I hit my spending limit?",
    a: "After a scheduled check detects a threshold breach, CCAO attempts the configured provider action: disable GCP project billing, freeze the configured AWS IAM user, or revoke the selected OpenAI API key. Results depend on provider permissions, API availability, and reporting delays; verify actions with the provider.",
  },
  {
    q: "How are my API keys and cloud credentials stored?",
    a: "Credentials submitted through the app are encrypted server-side with AES-256-GCM before storage. They are decrypted in server memory when needed for provider API calls. Protect your CRYPTO_SECRET and use least-privilege credentials.",
  },
  {
    q: "What happens if I delete my account?",
    a: "The Delete Account action requests deletion of your Supabase auth account and associated records configured to cascade. Provider backups, operational logs, and email-provider records may have separate retention periods.",
  },
  {
    q: "How often are spend checks run?",
    a: "The SaaS deployment is configured for one scheduled check per day. Provider billing data may arrive late. CCAO is not a real-time spending guarantee.",
  },
  {
    q: "Which cloud and AI providers are supported?",
    a: "CCAO supports GCP, AWS, and OpenAI out of the box. You connect your own API keys or service account credentials in the dashboard.",
  },
  {
    q: "How does the 30-day free trial work?",
    a: "Every new account gets 30 days of full access from signup. After the trial expires, a paid subscription via Paddle is required to keep using the dashboard and APIs. Expired accounts are redirected to the pricing page.",
  },
  {
    q: "How do subscriptions and billing work?",
    a: "Subscriptions are billed via Paddle Billing (merchant of record) with monthly or annual plans. Manage upgrades, downgrades, cancellation, and payment methods in the Paddle customer portal from the pricing page. See the refund policy for refund terms.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border bg-background py-20 sm:py-24">
      <div className="container-page max-w-3xl">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-orange-500">FAQ</p>
          <h2 className="mb-8 text-3xl font-bold text-foreground">Questions, answered</h2>
        </div>

        <div>
          {faqs.map((faq) => (
            <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="glass mb-4 rounded-xl p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 text-left transition hover:text-orange-400"
      >
        <span className="mb-2 text-lg font-semibold text-zinc-100">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <div id={id} className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <p className="text-zinc-400 text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}