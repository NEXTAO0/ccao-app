import Link from "next/link";
import { Github } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" aria-label="CCAO home">
            <Logo />
          </Link>
          <p className="max-w-xs font-mono text-sm leading-relaxed text-slate-400">
            CCAO: by NEXTAO. Independent open-source cloud utility.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { label: "Features", href: "/#features" },
            { label: "How it works", href: "/#how-it-works" },
            { label: "Pricing", href: "/#pricing" },
            { label: "FAQ", href: "/#faq" },
          ]}
        />

        <FooterCol
          title="Resources"
          links={[
            { label: "Setup guide", href: "/SETUP_GUIDE.md" },
            { label: "Documentation", href: "/#how-it-works" },
            { label: "GitHub", href: "https://github.com/NEXTAO/ccao", external: true },
          ]}
        />

        <FooterCol
          title="Legal"
          links={[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
          ]}
        />
      </div>

      <div className="border-t border-slate-800/70">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs sm:flex-row">
          <p className="text-slate-400">
            CCAO: by NEXTAO. Independent open-source cloud utility.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/NEXTAO/ccao"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-400 transition hover:text-orange-400"
              aria-label="CCAO source code on GitHub"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
            <Link href="/privacy" className="text-zinc-400 transition hover:text-orange-400">
              Privacy
            </Link>
            <Link href="/terms" className="text-zinc-400 transition hover:text-orange-400">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-200">
        {title}
      </h3>
      <ul className="space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <a
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-slate-400 transition hover:text-slate-200"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}