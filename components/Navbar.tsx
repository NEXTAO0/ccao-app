"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
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

  const startLabel = user ? "Go to Dashboard" : "Sign in";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-zinc-950/95 backdrop-blur-md transition-all">
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

        <div className="flex items-center gap-1 sm:gap-3">
          <ThemeToggle />
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
        </div>

      </div>
    </header>
  );
}