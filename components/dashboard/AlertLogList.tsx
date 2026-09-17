import {
  Activity,
  AlertTriangle,
  Info,
  Mail,
  ShieldX,
  Zap,
} from "lucide-react";
import type { AlertLog } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

const typeMeta: Record<
  AlertLog["alert_type"],
  { icon: typeof Info; label: string }
> = {
  budget_breach: { icon: AlertTriangle, label: "Budget breach" },
  anomaly_spike: { icon: Activity, label: "Anomaly spike" },
  billing_disabled: { icon: ShieldX, label: "Billing disabled" },
  billing_reenabled: { icon: Zap, label: "Billing re-enabled" },
  error: { icon: Info, label: "System notice" },
};

export function AlertLogList({
  alerts,
  compact = false,
}: {
  alerts: AlertLog[];
  compact?: boolean;
}) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
        <Mail className="mx-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-zinc-400">No alerts yet.</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          The cost check logs budget breaches, spikes, and billing kills here.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn("space-y-3", compact && "space-y-2")}>
      {alerts.map((alert) => {
        const meta = typeMeta[alert.alert_type] ?? typeMeta.error;
        const Icon = meta.icon;
        const zScore =
          typeof alert.details?.zScore === "number"
            ? alert.details.zScore.toFixed(1)
            : null;

        return (
          <li
            key={alert.id}
            className={cn(
              "flex gap-3 rounded-md border p-4",
              alert.severity === "critical"
                ? "border-orange-500/30 bg-orange-500/10"
                : alert.severity === "warning"
                  ? "border-orange-500/30 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-900/90"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                alert.severity === "critical"
                  ? "bg-orange-500 text-zinc-950"
                  : alert.severity === "warning"
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-emerald-500/10 text-emerald-400"
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-zinc-100">{meta.label}</p>
                <SeverityBadge severity={alert.severity} />
                {zScore && (
                  <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-200">
                    z {zScore}σ
                  </span>
                )}
                <span className="ml-auto font-mono text-[11px] text-zinc-400">
                  {formatDateTime(alert.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-300">{alert.message}</p>
              {!compact && alert.emailed_to.length > 0 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  Emailed: {alert.emailed_to.join(", ")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SeverityBadge({ severity }: { severity: AlertLog["severity"] }) {
  const map = {
    info: "border border-zinc-800 bg-zinc-900 text-zinc-300",
    warning: "border border-orange-500/30 bg-orange-500/10 text-orange-400",
    critical: "border border-orange-500/30 bg-orange-500/10 text-orange-400",
  } as const;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", map[severity])}>
      {severity}
    </span>
  );
}