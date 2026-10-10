/**
 * Paddle webhook IP allowlist.
 *
 * Source of truth is https://api.paddle.com/ips (`data.ipv4_cidrs`) — never
 * hard-code the list, it can change. Results are cached in memory for one
 * hour to keep webhook deliveries fast.
 */

const PADDLE_IPS_URL = "https://api.paddle.com/ips";
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedCidrs: string[] | null = null;
let cachedAt = 0;

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const value = Number(part);
    if (value < 0 || value > 255) return null;
    n = n * 256 + value;
  }
  return n;
}

function cidrContains(cidr: string, ip: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = bitsStr === undefined ? 32 : Number(bitsStr);
  const baseInt = ipToInt(base);
  const ipInt = ipToInt(ip);
  if (
    baseInt === null ||
    ipInt === null ||
    !Number.isInteger(bits) ||
    bits < 0 ||
    bits > 32
  ) {
    return false;
  }
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return ((baseInt & mask) >>> 0) === ((ipInt & mask) >>> 0);
}

async function fetchLiveCidrs(): Promise<string[] | null> {
  if (cachedCidrs && Date.now() - cachedAt < CACHE_TTL_MS) return cachedCidrs;
  try {
    const response = await fetch(PADDLE_IPS_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const body = (await response.json()) as {
      data?: { ipv4_cidrs?: unknown };
    };
    const cidrs = body?.data?.ipv4_cidrs;
    if (!Array.isArray(cidrs) || cidrs.some((c) => typeof c !== "string")) {
      throw new Error("unexpected response shape");
    }
    cachedCidrs = cidrs as string[];
    cachedAt = Date.now();
    return cachedCidrs;
  } catch (err) {
    console.error("[paddle/ips] failed to refresh allowlist.");
    return null;
  }
}

export function getWebhookClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Returns true when `ip` is allowlisted, false when it is not, and null
 * when allowlisting could not be evaluated (unknown IP family or the
 * source-of-truth endpoint was unreachable). Callers should fail open on
 * null — signature verification remains the real authentication — and
 * reject on false.
 */
export async function isPaddleWebhookIp(ip: string): Promise<boolean | null> {
  if (ip === "unknown" || ip.includes(":")) return null;
  if (ipToInt(ip) === null) return null;
  const cidrs = await fetchLiveCidrs();
  if (!cidrs) return null;
  return cidrs.some((cidr) => cidrContains(cidr, ip));
}
