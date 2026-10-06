"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("ccao:open-cookie-settings"))}
      className="text-zinc-400 transition hover:text-orange-400"
    >
      Cookie settings
    </button>
  );
}