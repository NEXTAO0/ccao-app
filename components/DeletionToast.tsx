"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function DeletionToast({ visible }: { visible: boolean }) {
  useEffect(() => {
    if (!visible) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("deleted");
    window.history.replaceState({}, "", url.pathname || "/");
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-md border border-emerald-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-xl" role="status">
      <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
      Your account has been deleted.
    </div>
  );
}