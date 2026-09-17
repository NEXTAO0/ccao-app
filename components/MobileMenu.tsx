"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export interface MenuLink {
  href: string;
  label: string;
  /** Set for same-page anchors like #features. */
  anchor?: boolean;
}

export function MobileMenu({
  links,
  ctaHref,
  ctaLabel,
  ctaLoading = false,
}: {
  links: MenuLink[];
  ctaHref: string;
  ctaLabel: string;
  ctaLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 transition hover:border-orange-500/40 hover:bg-zinc-800 lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition lg:hidden",
          open ? "visible" : "invisible"
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-zinc-800 bg-zinc-950 transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex items-center justify-between p-4">
            <Link href="/" aria-label="CCAO home">
              <Logo />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-orange-400"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-3 font-mono text-base text-zinc-300 transition hover:bg-zinc-900 hover:text-orange-400"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="border-t border-zinc-800 p-4">
            {ctaLoading ? (
              <div className="h-10 w-full animate-pulse rounded-md bg-zinc-800" aria-label="Loading authentication status" />
            ) : (
              <Link
                href={ctaHref}
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}