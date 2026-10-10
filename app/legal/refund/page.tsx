import { redirect } from "next/navigation";

export const metadata = {
  title: "Refund Policy",
  robots: { index: false, follow: true },
};

/** Canonical refund policy lives at /refund; keep /legal/refund as an alias. */
export default function LegalRefundAlias() {
  redirect("/refund");
}
