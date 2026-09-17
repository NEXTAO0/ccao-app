import { Cloud, Lock, Mail, Server } from "lucide-react";

const items = [
  {
    icon: Cloud,
    label: "GCP · AWS · OpenAI",
    sub: "Provider APIs",
  },
  {
    icon: Lock,
    label: "Supabase",
    sub: "PostgreSQL + RLS",
  },
  {
    icon: Mail,
    label: "Resend",
    sub: "Free email alerts",
  },
  {
    icon: Server,
    label: "Vercel",
    sub: "Serverless · cron",
  },
];

export function TrustBar() {
  return (
    <section aria-label="Built on trusted platforms" className="border-y border-slate-800 bg-zinc-950">
      <div className="container-page flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-center sm:gap-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Built on proven infrastructure
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {items.map((item) => (
            <span key={item.label} className="flex items-center gap-2.5 text-slate-500">
              <item.icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <span className="leading-tight">
                <span className="block text-sm font-bold text-slate-200">{item.label}</span>
                <span className="block text-[11px] text-slate-400">{item.sub}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}