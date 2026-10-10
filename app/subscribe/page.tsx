import { redirect } from "next/navigation";

export const metadata = {
  title: "Subscribe",
  robots: { index: false, follow: false },
};

/**
 * Legacy billing URL. Canonical subscription flow lives at /pricing
 * (Paddle Billing). Preserve query params such as ?plan=monthly.
 */
export default async function SubscribeAlias({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.plan) query.set("plan", params.plan);
  if (params.canceled) query.set("canceled", params.canceled);
  const suffix = query.toString();
  redirect(suffix ? `/pricing?${suffix}` : "/pricing");
}
