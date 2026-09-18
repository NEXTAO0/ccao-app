"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What happens when I hit my spending limit?",
    a: "CCAO triggers the safety action you selected for that budget. For GCP, it detaches your billing account to halt paid resources. For OpenAI, it instantly revokes the API key. Everything is recorded in your audit log.",
  },
  {
    q: "How are my API keys and cloud credentials stored?",
    a: "Your keys are encrypted at rest using AES-256 before saving to the database. They are decrypted in memory only when active background workers poll billing APIs.",
  },
  {
    q: "What happens if I delete my account?",
    a: "Deletion wipes everything immediately. Your credentials, budget caps, alert logs, and spending history are permanently deleted from the database.",
  },
  {
    q: "How fast does CCAO catch overspending?",
    a: "Background jobs poll billing endpoints on your configured schedule. You can also run manual spend checks from your dashboard whenever you deploy new infrastructure.",
  },
  {
    q: "Which cloud and AI providers are supported?",
    a: "CCAO supports GCP, AWS, and OpenAI out of the box. You connect your own API keys or service account credentials in the dashboard.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-zinc-800/80 bg-zinc-950 py-20 sm:py-24">
      <div className="container-page max-w-3xl">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-orange-500">FAQ</p>
          <h2 className="mb-8 text-3xl font-bold text-zinc-100">Questions, answered</h2>
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
    <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md">
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