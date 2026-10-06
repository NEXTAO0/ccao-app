"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Menu, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const routes = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavButtonRef = useRef<HTMLButtonElement>(null);
  const startUrl = "/dashboard";

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        mobileNavButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  const startLabel = user ? "Go to Dashboard" : "Sign in";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md transition-all">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="CCAO home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {routes.map((route) => (
            <a
              key={route.href}
              href={route.href}
              className="font-mono text-sm text-zinc-400 transition hover:text-orange-400"
            >
              {route.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex">
            <ThemeToggle />
          </div>
          {isLoading ? (
            <div className="h-9 w-32 animate-pulse rounded-md bg-zinc-800" aria-label="Loading authentication status" />
          ) : user ? (
            <Link href={startUrl} className="btn-primary">
              {startLabel}
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-mono text-sm text-zinc-400 hover:text-orange-400">
                Sign in
              </Link>
              <Link href="/login" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
          <button
            ref={mobileNavButtonRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-transparent text-card-foreground transition hover:border-orange-500/50 hover:text-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500 lg:hidden"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-primary-nav"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

      </div>
      <nav
        id="mobile-primary-nav"
        hidden={!mobileNavOpen}
        className="border-t border-border bg-background lg:hidden"
        aria-label="Mobile main"
      >
        <div className="container-page flex flex-col py-2">
          {routes.map((route) => (
            <a
              key={route.href}
              href={route.href}
              onClick={() => setMobileNavOpen(false)}
              className="rounded-md px-3 py-3 font-mono text-sm text-foreground transition hover:bg-muted hover:text-orange-500"
            >
              {route.label}
            </a>
          ))}
          {user && (
            <Link
              href={startUrl}
              onClick={() => setMobileNavOpen(false)}
              className="rounded-md px-3 py-3 font-mono text-sm text-foreground transition hover:bg-muted hover:text-orange-500"
            >
              Dashboard
            </Link>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border px-3 py-3">
            <span className="font-mono text-sm text-foreground">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}