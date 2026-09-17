import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { Logo } from "@/components/Logo";
import { LoginPanel } from "@/components/LoginPanel";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the CCAO dashboard.",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;

  let signedIn = false;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }

  if (signedIn) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="hero-glow absolute inset-0" aria-hidden="true" />
      <header className="relative z-10 flex items-center justify-between bg-transparent px-6 py-4">
        <Link href="/" aria-label="CCAO home">
          <Logo />
        </Link>
        <Link href="/" className="text-sm font-semibold text-slate-400 hover:text-slate-100">
          ← Back to home
        </Link>
      </header>

      <section className="container-page relative z-10 flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md">
          <CardShell>
            <LoginPanel next={searchParams.next ?? "/dashboard"} initialError={searchParams.error} />
          </CardShell>
        </div>
      </section>
    </main>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-8 shadow-xl shadow-blue-900/5">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-50">Welcome to CCAO</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in or sign up to manage your budgets and cloud spend.
        </p>
      </div>
      {children}
    </div>
  );
}