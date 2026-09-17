export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Formats a number as a currency string, e.g. $12,345.67 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "USD"
): string {
  if (amount == null || Number.isNaN(amount)) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Formats an ISO timestamp for the dashboard, e.g. Jan 4, 2026 14:32. */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** "Monster" number formatting for big spend figures on the landing page. */
export function formatCompact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Percentage used of a budget, clamped to 0..100. */
export function percentUsed(spend: number, threshold: number): number {
  if (threshold <= 0) return 0;
  return Math.min(Math.round((spend / threshold) * 1000) / 10, 100);
}