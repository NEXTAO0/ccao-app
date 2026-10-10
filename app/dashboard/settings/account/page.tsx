import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getEntitlement } from "@/lib/subscription";
import type { Profile } from "@/lib/types";
import { AccountSettings } from "@/components/dashboard/AccountSettings";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

export default async function AccountSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/settings/account");

  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (!getEntitlement(profile as Profile | null).entitled) {
      redirect("/subscribe");
    }
  } catch {
    // Fail open here; Proxy + dashboard enforce the wall. Avoid locking settings.
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container-page py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="btn-secondary w-fit">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to dashboard
          </Link>
          <ThemeToggle />
        </div>
        <div className="mt-10 max-w-3xl">
          <p className="section-title">Account</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Account settings</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Review your account details and manage your CCAO data.
          </p>
          <AccountSettings user={user} />
        </div>
      </div>
    </main>
  );
}