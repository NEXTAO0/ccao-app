import { Paddle } from "@paddle/paddle-node-sdk";

let paddleClient: Paddle | null = null;

/** Server-only Paddle Billing client. Never import from client components. */
export function getPaddle(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY ?? "";
  if (!apiKey) {
    throw new Error("Paddle is not configured. Set PADDLE_API_KEY.");
  }
  if (!paddleClient) {
    paddleClient = new Paddle(apiKey);
  }
  return paddleClient;
}

export function getPaddleEnv(): "sandbox" | "production" {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? "production"
    : "sandbox";
}

export function getPaddleClientToken(): string {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
  if (!token) {
    throw new Error(
      "Paddle client token is not configured. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN."
    );
  }
  return token;
}

/** Recurring price IDs (pri_…). Sandbox and live IDs do not cross environments. */
export function getPaddlePriceId(plan: string): string {
  const normalized = plan.toLowerCase();
  if (normalized === "annual") {
    const price = process.env.PADDLE_PRICE_ANNUAL ?? "";
    if (!price) throw new Error("Missing PADDLE_PRICE_ANNUAL for the annual plan.");
    return price;
  }
  const price = process.env.PADDLE_PRICE_MONTHLY ?? "";
  if (!price) throw new Error("Missing PADDLE_PRICE_MONTHLY for the monthly plan.");
  return price;
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
