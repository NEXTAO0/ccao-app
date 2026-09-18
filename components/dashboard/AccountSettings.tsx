"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export function AccountSettings({ user }: { user: User }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const provider = String(user.app_metadata?.provider ?? "email");
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown";

  async function deleteAccount() {
    if (confirmation !== "DELETE") return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/delete", { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "Unable to delete your account.");
        setDeleting(false);
        return;
      }
      window.location.assign("/?deleted=1");
    } catch {
      setError("The deletion request failed. Check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="card p-6" aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-lg font-bold text-zinc-100">Profile</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">Email</dt>
            <dd className="mt-1 break-all text-sm text-zinc-200">{user.email ?? "Not available"}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">Sign-in provider</dt>
            <dd className="mt-1 text-sm capitalize text-zinc-200">{provider}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">Account created</dt>
            <dd className="mt-1 text-sm text-zinc-200">{createdAt}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">User ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-zinc-400">{user.id}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-rose-900/70 bg-rose-950/10 p-6" aria-labelledby="danger-title">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
          <div>
            <h2 id="danger-title" className="text-lg font-bold text-rose-200">Danger Zone</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Permanently delete your profile, connected accounts, budgets, alerts, and spending history.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-rose-700 bg-rose-600 px-4 py-2.5 font-mono text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4" role="presentation">
          <section className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-title" className="text-xl font-bold text-zinc-100">Are you sure?</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  This will permanently delete your account, saved cloud credentials, and spending history. Type <strong className="font-mono text-zinc-200">DELETE</strong> to confirm.
                </p>
              </div>
              <button type="button" onClick={() => setShowDeleteDialog(false)} className="text-zinc-500 hover:text-zinc-200" aria-label="Close delete account dialog">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
              disabled={deleting}
              className="mt-5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-rose-500"
              autoFocus
              aria-label="Type DELETE to confirm account deletion"
            />
            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteDialog(false)} disabled={deleting} className="btn-secondary">Cancel</button>
              <button type="button" onClick={deleteAccount} disabled={deleting || confirmation !== "DELETE"} className="inline-flex items-center gap-2 rounded-md border border-rose-700 bg-rose-600 px-4 py-2.5 font-mono text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {deleting ? "Deleting..." : "Permanently delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}