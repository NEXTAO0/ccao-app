"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What exactly does the Auto-Kill hard cap do?",
    a: "When an account's spend reaches the threshold you set, CCAO invokes the provider's hard-cap action: detaching GCP billing, freezing AWS access, or revoking an OpenAI API key. Services may stop, but nothing is deleted. You can restore access through the provider when you're ready.",
  },
  {
    q: "Is this really free?",
    a: "Yes. The code is MIT licensed. It runs on Vercel's Hobby plan (free), a Supabase free-tier database, and ~3,000 free emails a month via Resend (or Gmail SMTP, free). The only recurring cost in the stack is the cloud or AI usage you're already tracking.",
  },
  {
    q: "How does anomaly detection work?",
    a: "Every check, CCAO stores your current spend and compares the latest sample with your history using a rolling z-score. The default threshold is 2.5 standard deviations. If spending moves well outside your normal range, CCAO emails you. There are no machine learning models to tune.",
  },
  {
    q: "How fresh is the spend data?",
    a: "Spend freshness depends on the provider: GCP billing exports can lag by hours, AWS Cost Explorer and OpenAI Usage API data can also have reporting delays. CCAO checks the latest data available through each provider's official API.",
  },
  {
    q: "Could CCAO disable billing while I'm asleep?",
    a: "Only if you enable Auto-Kill and spending crosses the threshold. Every action is documented, logged in your alert history, and emailed to you. You can re-enable billing through the provider when you are ready.",
  },
  {
    q: "What's the relationship with the supported cloud providers?",
    a: "None official. CCAO is an independent open-source project maintained by NEXTAO. It uses official public APIs (Google Cloud, AWS Cost Explorer, OpenAI Admin API) under your own credentials.",
  },
  {
    q: "Which cloud and AI providers are supported?",
    a: "CCAO supports Google Cloud Platform (GCP), Amazon Web Services (AWS), and OpenAI API out of the box, with an extendable architecture for additional providers like Anthropic or Azure.",
  },
  {
    q: "How are my cloud keys stored?",
    a: "If you store account credentials in the dashboard, keys are AES-256-GCM encrypted with a secret only you hold, and are never returned by any public API. You can also use system-wide environment variables.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 border-y border-slate-800 bg-slate-950 py-20 sm:py-24">
      <div className="container-page max-w-3xl">
        <div className="text-center">
          <p className="section-title">FAQ</p>
          <h2 className="text-balance mt-3 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-12 space-y-3">
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
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-800/70"
      >
        <span className="text-sm font-bold text-slate-100 sm:text-base">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <div id={id} className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm leading-relaxed text-slate-300">{answer}</p>
        </div>
      </div>
    </div>
  );
}