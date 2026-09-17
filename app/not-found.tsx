import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="hero-glow absolute inset-0" aria-hidden="true" />
      <header className="relative z-10 flex items-center justify-between bg-transparent px-6 py-4">
        <Link href="/" aria-label="CCAO home">
          <Logo />
        </Link>
        <Link href="/login" className="btn-primary">
          Open dashboard
        </Link>
      </header>

      <section className="container-page relative z-10 flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div
          className="card mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-slate-300"
          aria-hidden="true"
        >
          <CloudOff className="h-10 w-10 text-blue-600" strokeWidth={1.75} />
        </div>
        <p className="section-title mb-3">404 · Lost in the cloud</p>
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl">
          This page drifted out of budget.
        </h1>
        <p className="mt-4 max-w-md text-balance text-lg text-slate-400">
          This page does not exist. Go back home to return to the CCAO dashboard.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}